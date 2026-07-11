import { addDays, compareISODate, toISODate } from "./dates";

// Domyślne stałe pory podawania kropli w ciągu dnia.
export const DEFAULT_SLOT_TIMES = ["08:00", "12:00", "16:00", "20:00"];

// Które sloty (indeksy w DEFAULT_SLOT_TIMES) zajmuje lek w zależności od
// dziennej częstotliwości. Odwzorowuje realny schemat ze szpitala: przy 3x/dz
// pomijany jest slot 16:00, a nie 12:00 (patrz Faza 4 harmonogramu Lotemaxu).
export const FREQUENCY_SLOTS = {
  1: [0],
  2: [0, 3],
  3: [0, 1, 3],
  4: [0, 1, 2, 3],
};

// Zwraca datę zakończenia reguły (ISO) albo null, jeśli reguła nie ma
// jeszcze ustalonego końca (typ "manual" bez ręcznie zamkniętej daty).
export function ruleEndDate(rule) {
  if (rule.end.type === "days") return addDays(rule.startDate, rule.end.days - 1);
  if (rule.end.type === "date") return rule.end.date;
  if (rule.end.type === "manual") return rule.end.endDate || null;
  return null;
}

export function isRuleActiveOnDate(rule, dateISO) {
  if (compareISODate(dateISO, rule.startDate) < 0) return false;
  const end = ruleEndDate(rule);
  if (end && compareISODate(dateISO, end) > 0) return false;
  return true;
}

// Kolejność podania w slocie jest własnością leku (medication.order), nie
// pojedynczej reguły — dzięki temu Lotemax zostaje na 2. miejscu niezależnie
// od tego, czy akurat obowiązuje faza 4x czy 3x dziennie.
function activeRulesOnDate(rules, dateISO, medById) {
  return rules
    .filter((r) => isRuleActiveOnDate(r, dateISO) && medById[r.medicationId])
    .slice()
    .sort((a, b) => medById[a.medicationId].order - medById[b.medicationId].order);
}

// Rozpisuje jeden dzień na sloty czasowe z listą dawek w kolejności podania
// oraz informacją, które leki są dziś aktywne, ale pomijane o danej porze.
export function generateDayPlan(dateISO, medications, rules, slotTimes = DEFAULT_SLOT_TIMES) {
  const medById = Object.fromEntries(medications.map((m) => [m.id, m]));
  const active = activeRulesOnDate(rules, dateISO, medById);

  const slots = slotTimes.map((time, slotIndex) => {
    const doses = [];
    const skipped = [];
    for (const rule of active) {
      const med = medById[rule.medicationId];
      const slotIndices = FREQUENCY_SLOTS[rule.frequencyPerDay] || [];
      if (slotIndices.includes(slotIndex)) {
        doses.push({ medicationId: med.id, medicationName: med.name, capColor: med.capColor, order: med.order });
      } else {
        skipped.push(med.name);
      }
    }
    doses.sort((a, b) => a.order - b.order);
    return { slotIndex, time, doses, skipped };
  });

  return { date: dateISO, slots };
}

// Sygnatura dnia = zestaw aktywnych leków wraz z częstotliwością. Dwa dni
// o tej samej sygnaturze należą do tej samej "fazy" leczenia.
function daySignature(rules, dateISO, medById) {
  return activeRulesOnDate(rules, dateISO, medById)
    .map((r) => `${r.medicationId}:${r.frequencyPerDay}`)
    .sort()
    .join("|");
}

// Automatycznie wyznacza fazy leczenia (odpowiednik ręcznie rysowanych
// "Faza 1..5" w arkuszu) na podstawie zmian w aktywnych regułach dawkowania.
export function computePhases(medications, rules, fromDateISO, toDateISO) {
  const medById = Object.fromEntries(medications.map((m) => [m.id, m]));
  const phases = [];
  let cursor = fromDateISO;
  let currentSignature = null;
  let phaseStart = null;
  let phaseRules = [];

  while (compareISODate(cursor, toDateISO) <= 0) {
    const sig = daySignature(rules, cursor, medById);
    if (sig !== currentSignature) {
      if (phaseStart !== null) {
        phases.push(buildPhase(phaseStart, addDays(cursor, -1), phaseRules, medById));
      }
      currentSignature = sig;
      phaseStart = cursor;
      phaseRules = activeRulesOnDate(rules, cursor, medById);
    }
    cursor = addDays(cursor, 1);
  }
  if (phaseStart !== null) {
    phases.push(buildPhase(phaseStart, addDays(cursor, -1), phaseRules, medById));
  }
  return phases.filter((p) => p.rules.length > 0 || phases.length === 1);
}

function buildPhase(startDate, endDate, rules, medById) {
  const summary = rules
    .slice()
    .sort((a, b) => medById[a.medicationId].order - medById[b.medicationId].order)
    .map((r) => `${medById[r.medicationId]?.name ?? "?"} ${r.frequencyPerDay}×`)
    .join(" · ");
  return { startDate, endDate, rules, summary: summary || "Brak aktywnych leków" };
}

// Horyzont harmonogramu: od najwcześniejszego startu reguły do najdalszego
// znanego końca. Reguły otwarte (typ "manual" bez ustalonej daty końca)
// dostają miękki, jawnie nazwany limit — nie jest to realne ograniczenie
// medyczne, tylko granica do której z góry generujemy plan i powiadomienia.
const OPEN_ENDED_HORIZON_DAYS = 45;

export function scheduleHorizon(rules) {
  if (rules.length === 0) {
    const today = toISODate(new Date());
    return { from: today, to: today };
  }
  let from = rules[0].startDate;
  let to = null;
  for (const rule of rules) {
    if (compareISODate(rule.startDate, from) < 0) from = rule.startDate;
    const end = ruleEndDate(rule) || addDays(rule.startDate, OPEN_ENDED_HORIZON_DAYS);
    if (to === null || compareISODate(end, to) > 0) to = end;
  }
  return { from, to };
}
