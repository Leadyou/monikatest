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
