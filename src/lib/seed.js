// Dane startowe odtworzone z wypisu ze szpitala (operacja zaćmy 29.06.2026).
// Można je w każdej chwili edytować lub usunąć w zakładce "Leki".
// `key` służy tylko do powiązania reguł z lekami przy zapisie do bazy —
// baza nadaje własne, prawdziwe identyfikatory (UUID) przy wstawianiu.
export function seedData() {
  const medications = [
    { key: "oftaquix", name: "Oftaquix", capColor: "tan", order: 1 },
    { key: "lotemax", name: "Lotemax", capColor: "pink", order: 2 },
    { key: "yellox", name: "Yellox", capColor: "grey", order: 3 },
    { key: "hyaldrop", name: "Hyal-Drop 4S", capColor: "blue", order: 4 },
  ];

  const rules = [
    {
      medicationKey: "oftaquix",
      startDate: "2026-06-30",
      frequencyPerDay: 4,
      end: { type: "days", days: 7 },
    },
    {
      medicationKey: "lotemax",
      startDate: "2026-06-30",
      frequencyPerDay: 4,
      end: { type: "date", date: "2026-07-13" },
    },
    {
      medicationKey: "lotemax",
      startDate: "2026-07-14",
      frequencyPerDay: 3,
      end: { type: "date", date: "2026-07-27" },
    },
    {
      medicationKey: "yellox",
      startDate: "2026-06-30",
      frequencyPerDay: 2,
      end: { type: "days", days: 42 },
    },
    {
      medicationKey: "hyaldrop",
      startDate: "2026-07-10",
      frequencyPerDay: 4,
      end: { type: "manual", endDate: "2026-08-10" },
    },
  ];

  const controls = [
    { label: "1. kontrola", datetime: "2026-06-30T10:10:00", location: "gabinet C46" },
    { label: "2. kontrola", datetime: "2026-07-20T11:20:00", location: "gabinet C45 · kod: 6473" },
  ];

  const patient = {
    name: "Przykładowy pacjent",
    surgeryDate: "2026-06-29",
    eye: "lewe",
  };

  return { patient, medications, rules, controls };
}
