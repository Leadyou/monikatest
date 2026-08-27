import { useMemo } from "react";
import { useAppData } from "../lib/store.jsx";
import { formatShortDatePL, formatWeekdayShortPL } from "../lib/dates";
import { buildPrintableSchedule, scheduleHorizon } from "../lib/schedule";
import { CAP_COLORS } from "../lib/capColors";

// Czysty widok wydruku — dostaje dane wprost, więc działa też w publicznym
// kreatorze, gdzie harmonogram istnieje tylko lokalnie (bez konta i bazy).
export function PrintScheduleView({ data }) {
  const phases = useMemo(() => {
    if (data.rules.length === 0) return [];
    const horizon = scheduleHorizon(data.rules);
    return buildPrintableSchedule(data.medications, data.rules, data.slotTimes, horizon);
  }, [data.medications, data.rules, data.slotTimes]);

  if (phases.length === 0) return null;

  return (
    <div id="print-root">
      <h1 className="print-title">Harmonogram podawania kropli do oka</h1>
      {data.patient?.name && (
        <p className="print-subtitle">
          {data.patient.name}
          {data.patient.eye ? ` — operacja oka ${data.patient.eye}` : ""}
          {data.patient.surgeryDate ? `, zabieg ${formatShortDatePL(data.patient.surgeryDate)}` : ""}
        </p>
      )}

      {data.controls.length > 0 && (
        <div className="print-controls">
          {data.controls.map((c) => (
            <div key={c.id}>
              <strong>{c.label}:</strong> {formatShortDatePL(c.datetime.slice(0, 10))} godz.{" "}
              {new Date(c.datetime).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}
              {c.location ? ` — ${c.location}` : ""}
            </div>
          ))}
        </div>
      )}

      {phases.map((phase, i) => (
        <div className="print-phase" key={i}>
          <div className="print-phase-header">
            Faza {i + 1}: {formatShortDatePL(phase.startDate)} – {formatShortDatePL(phase.endDate)} — {phase.summary}
          </div>
          <table className="print-table">
            <thead>
              <tr>
                <th rowSpan={2}>Data</th>
                <th rowSpan={2}>Godz.</th>
                <th rowSpan={2}>Leki do podania (kolejność, min. 5 min odstępu)</th>
                <th colSpan={phase.activeMeds.length} className="print-legend-row">
                  Kolor nakrętki
                </th>
                <th rowSpan={2}>Podp.</th>
              </tr>
              <tr>
                {phase.activeMeds.map((med) => (
                  <th key={med.id} style={{ background: CAP_COLORS[med.capColor] }}>
                    {med.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {phase.days.map((day) =>
                day.slots.map((slot, si) => {
                  const doseByMedId = Object.fromEntries(slot.doses.map((d) => [d.medicationId, d]));
                  return (
                    <tr key={`${day.date}-${slot.slotIndex}`} className={si === 0 ? "print-day-start" : undefined}>
                      {si === 0 && (
                        <td rowSpan={day.slots.length} className="print-date-cell">
                          {formatWeekdayShortPL(day.date)} {formatShortDatePL(day.date).slice(0, 5)}
                        </td>
                      )}
                      <td className="print-time-cell">{slot.time}</td>
                      <td>
                        {slot.doses.map((d, di) => (
                          <span key={d.medicationId}>
                            {di > 0 && " → "}
                            {d.medicationName}
                          </span>
                        ))}
                      </td>
                      {phase.activeMeds.map((med) => {
                        const given = Boolean(doseByMedId[med.id]);
                        return (
                          <td
                            key={med.id}
                            className={`print-dose-cell${given ? "" : " print-skip-cell"}`}
                            style={{ backgroundColor: given ? CAP_COLORS[med.capColor] : "#ececeb" }}
                          >
                            {given ? (
                              <input type="checkbox" className="print-checkbox" readOnly />
                            ) : (
                              <span className="print-skip-mark">×</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="print-sign-cell"></td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      ))}

      <p className="print-footnote">
        Pusty kwadrat = podaj lek i zaznacz. „x” = tego leku nie podajemy o tej porze. Kolor komórki = kolor nakrętki
        butelki. Podp. = podpis/inicjały osoby podającej. Zachowaj min. 5 minut odstępu między kolejnymi kroplami.
      </p>
    </div>
  );
}

export default function PrintSchedule() {
  const { data, ready } = useAppData();
  if (!ready) return null;
  return <PrintScheduleView data={data} />;
}
