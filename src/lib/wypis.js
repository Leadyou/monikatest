import { supabase } from "./supabaseClient";
import { DEFAULT_SLOT_TIMES } from "./schedule";

// Wspólna logika przetwarzania wypisu, używana w dwóch miejscach:
// publicznym kreatorze (bez logowania, dane tylko lokalnie) oraz
// imporcie do konta (WypisImportModal, zapis do Supabase).

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_FILE_BYTES = 15 * 1024 * 1024; // większe skany potrafią zawiesić słabszy telefon

export function checkWypisFile(file) {
  if (file.size > MAX_FILE_BYTES) {
    return `Plik jest za duży (${(file.size / (1024 * 1024)).toFixed(1)} MB, limit to 15 MB) — na telefonie może zawiesić przeglądarkę. Zeskanuj dokument w niższej jakości albo zrób zwykłe zdjęcie zamiast wielostronicowego skanu.`;
  }
  return "";
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1] || "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function withTimeout(promise, ms, message) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export async function parseWypisPdf(file) {
  const pdfBase64 = await withTimeout(fileToBase64(file), 30_000, "Nie udało się odczytać pliku. Spróbuj ponownie.");
  const { data: result, error: fnError } = await withTimeout(
    supabase.functions.invoke("parse-wypis", { body: { pdfBase64 } }),
    90_000,
    "Połączenie trwało zbyt długo. Sprawdź internet (najlepiej Wi-Fi) i spróbuj ponownie."
  );
  if (fnError) {
    const body = await fnError.context?.json?.().catch(() => null);
    throw new Error(body?.error || fnError.message);
  }
  if (result?.error) throw new Error(result.error);
  return result;
}

// Znane krople i faktyczne kolory ich nakrętek — pewniejsze niż zgadywanie
// przez AI, więc nadpisują jego propozycję. Dopasowanie po fragmencie nazwy,
// żeby złapać warianty zapisu (np. "Hyal-Drop Ultra 4S", "Hyal Drop 4S").
const KNOWN_CAP_COLORS = [
  { match: "oftaquix", color: "tan" },
  { match: "lotemax", color: "pink" },
  { match: "yellox", color: "grey" },
  { match: "hyal-drop", color: "blue" },
  { match: "hyal drop", color: "blue" },
];

function knownCapColor(name) {
  const normalized = (name || "").toLowerCase();
  const hit = KNOWN_CAP_COLORS.find((k) => normalized.includes(k.match));
  return hit ? hit.color : null;
}

export function draftFromResult(result) {
  return {
    patient: result.patient || { name: "", surgeryDate: "", eye: "" },
    medications: (result.medications || []).map((m) => ({
      ...m,
      capColorGuess: knownCapColor(m.name) || m.capColorGuess || "grey",
      removed: false,
    })),
    rules: (result.rules || []).map((r) => ({
      ...r,
      endDays: r.endDays != null ? String(r.endDays) : "",
      endDate: r.endDate || "",
      removed: false,
    })),
    controls: (result.controls || []).map((c) => ({ ...c, removed: false })),
    notes: result.notes || "",
  };
}

// Zwraca komunikat błędu albo pusty string, gdy szkic jest kompletny.
export function validateDraft(draft) {
  const activeMeds = draft.medications.filter((m) => !m.removed && m.name.trim());
  if (activeMeds.length === 0) return "Dodaj przynajmniej jeden lek.";

  const nameByKey = Object.fromEntries(activeMeds.map((m) => [m.key, m.name.trim()]));
  for (const r of draft.rules) {
    if (r.removed || !nameByKey[r.medicationKey]) continue;
    const medName = nameByKey[r.medicationKey];
    if (!DATE_RE.test(r.startDate)) return `Popraw datę rozpoczęcia (RRRR-MM-DD) dla leku „${medName}”.`;
    if (r.endType === "days" && !(Number(r.endDays) > 0)) return `Podaj liczbę dni większą od zera dla leku „${medName}”.`;
    if (r.endType === "date" && !DATE_RE.test(r.endDate)) return `Popraw datę zakończenia (RRRR-MM-DD) dla leku „${medName}”.`;
  }

  for (const c of draft.controls) {
    if (c.removed) continue;
    if (!c.label.trim()) return "Podaj opis dla każdej wizyty kontrolnej (albo ją usuń).";
    if (!c.datetime) return "Podaj datę i godzinę dla każdej wizyty kontrolnej (albo ją usuń).";
  }

  return "";
}

function ruleEnd(r) {
  return r.endType === "days"
    ? { type: "days", days: Number(r.endDays) }
    : r.endType === "date"
      ? { type: "date", date: r.endDate }
      : { type: "manual", endDate: r.endDate || null };
}

// Przekształca szkic z przeglądu na kształt danych, którego oczekuje silnik
// harmonogramu i widok wydruku — bez zapisywania czegokolwiek na serwerze.
export function draftToData(draft) {
  const activeMeds = draft.medications.filter((m) => !m.removed && m.name.trim());
  const medications = activeMeds.map((m, i) => ({ id: m.key, name: m.name.trim(), capColor: m.capColorGuess, order: i + 1 }));
  const medIds = new Set(medications.map((m) => m.id));

  const rules = draft.rules
    .filter((r) => !r.removed && medIds.has(r.medicationKey))
    .map((r, i) => ({
      id: `rule-${i}`,
      medicationId: r.medicationKey,
      startDate: r.startDate,
      frequencyPerDay: r.frequencyPerDay,
      end: ruleEnd(r),
    }));

  const controls = (draft.controls || [])
    .filter((c) => !c.removed && c.label.trim() && c.datetime)
    .map((c, i) => ({ id: `control-${i}`, label: c.label.trim(), datetime: c.datetime, location: c.location || null }));

  return {
    patient: draft.patient,
    medications,
    rules,
    controls,
    doseLogs: {},
    slotTimes: DEFAULT_SLOT_TIMES,
  };
}
