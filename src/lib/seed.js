// Dane startowe odtworzone z wypisu ze szpitala (operacja zaćmy 29.06.2026).
// Można je w każdej chwili edytować lub usunąć w zakładce "Leki".
export function seedData() {
  const medications = [
    { id: "med_oftaquix", name: "Oftaquix", capColor: "tan", order: 1 },
    { id: "med_lotemax", name: "Lotemax", capColor: "pink", order: 2 },
    { id: "med_yellox", name: "Yellox", capColor: "grey", order: 3 },
    { id: "med_hyaldrop", name: "Hyal-Drop 4S", capColor: "blue", order: 4 },
  ];

  const rules = [
    {
      id: "rule_oftaquix",
      medicationId: "med_oftaquix",
      startDate: "2026-06-30",
      frequencyPerDay: 4,
      end: { type: "days", days: 7 },
    },
    {
      id: "rule_lotemax_a",
      medicationId: "med_lotemax",
      startDate: "2026-06-30",
      frequencyPerDay: 4,
      end: { type: "date", date: "2026-07-13" },
    },
    {
      id: "rule_lotemax_b",
      medicationId: "med_lotemax",
      startDate: "2026-07-14",
      frequencyPerDay: 3,
      end: { type: "date", date: "2026-07-27" },
    },
    {
      id: "rule_yellox",
      medicationId: "med_yellox",
      startDate: "2026-06-30",
      frequencyPerDay: 2,
      end: { type: "days", days: 42 },
    },
    {
      id: "rule_hyaldrop",
      medicationId: "med_hyaldrop",
      startDate: "2026-07-10",
      frequencyPerDay: 4,
      end: { type: "manual", endDate: "2026-08-10" },
    },
  ];

  const controls = [
    { id: "ctrl_1", label: "1. kontrola", datetime: "2026-06-30T10:10:00", location: "gabinet C46" },
    { id: "ctrl_2", label: "2. kontrola", datetime: "2026-07-20T11:20:00", location: "gabinet C45 · kod: 6473" },
  ];

  const patient = {
    name: "Przykładowy pacjent",
    surgeryDate: "2026-06-29",
    eye: "lewe",
  };

  return { patient, medications, rules, controls };
}
