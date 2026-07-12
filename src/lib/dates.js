const DAY_MS = 24 * 60 * 60 * 1000;

export function toISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseISODate(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso, days) {
  const d = parseISODate(iso);
  return toISODate(new Date(d.getTime() + days * DAY_MS));
}

export function diffDays(isoFrom, isoTo) {
  return Math.round((parseISODate(isoTo).getTime() - parseISODate(isoFrom).getTime()) / DAY_MS);
}

export function compareISODate(a, b) {
  return a < b ? -1 : a > b ? 1 : 0;
}

const WEEKDAYS_PL = ["Niedziela", "Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota"];
const MONTHS_PL = [
  "stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca",
  "lipca", "sierpnia", "września", "października", "listopada", "grudnia",
];

export function formatLongDatePL(iso) {
  const d = parseISODate(iso);
  return `${WEEKDAYS_PL[d.getDay()]}, ${d.getDate()} ${MONTHS_PL[d.getMonth()]}`;
}

export function formatShortDatePL(iso) {
  const d = parseISODate(iso);
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}

const WEEKDAYS_SHORT_PL = ["Nd", "Pn", "Wt", "Śr", "Cz", "Pt", "Sb"];

export function formatWeekdayShortPL(iso) {
  return WEEKDAYS_SHORT_PL[parseISODate(iso).getDay()];
}

// Zamienia "naiwną" datę/godzinę (np. z wypisu, bez strefy czasowej) na poprawny
// znacznik UTC, traktując ją jako czas ścienny w Warszawie — obsługuje przejścia
// czasu letniego/zimowego, więc nie można tu użyć stałego przesunięcia +1/+2.
export function warsawLocalToUtcISOString(naiveDateTimeStr) {
  const [datePart, timePart = "00:00:00"] = naiveDateTimeStr.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute, second = "0"] = timePart.split(":");
  const targetUTCMs = Date.UTC(year, month - 1, day, Number(hour), Number(minute), Number(second));

  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Warsaw",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  let guessMs = targetUTCMs;
  for (let i = 0; i < 2; i++) {
    const parts = Object.fromEntries(fmt.formatToParts(new Date(guessMs)).map((p) => [p.type, p.value]));
    const guessAsWarsawWallClockUTC = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour) === 24 ? 0 : Number(parts.hour),
      Number(parts.minute),
      Number(parts.second)
    );
    guessMs += targetUTCMs - guessAsWarsawWallClockUTC;
  }
  return new Date(guessMs).toISOString();
}
