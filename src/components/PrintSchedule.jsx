import { useMemo } from "react";
import { useAppData } from "../lib/store.jsx";
import { formatShortDatePL, formatWeekdayShortPL } from "../lib/dates";
import { buildPrintableSchedule, scheduleHorizon } from "../lib/schedule";
import { CAP_COLORS } from "../lib/capColors";

export default function PrintSchedule() {
  const { data, ready } = useAppData();

  const phases = useMemo(() => {
    if (!ready || data.rules.length === 0) return [];
    const horizon = scheduleHorizon(data.rules);
    return buildPrintableSchedule(data.medications, data.rules, data.slotTimes, horizon);
  }, [ready, data.medications, data.rules, data.slotTimes]);

  if (!ready || phases.length === 0) return null;

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

      <div className="print-legend">
        <strong>Kolor nakrętki:</strong>{" "}
        {data.medications
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((m) => (
            <span key={m.id} className="print-legend-item">
              <span className="print-dot" style={{ background: CAP_COLORS[m.capColor] }} />
              {m.name}
            </span>
          ))}
      </div>

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
                <th>Data</th>
                <th>Godz.</th>
                <th>Leki do podania (kolejność, min. 5 min odstępu)</th>
                <th>Podp.</th>
              </tr>
            </thead>
            <tbody>
              {phase.days.map((day) =>
                day.slots.map((slot, si) => (
                  <tr key={`${day.date}-${slot.slotIndex}`}>
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
                          <span className="print-dot" style={{ background: CAP_COLORS[d.capColor] }} />
                          {d.medicationName}
                        </span>
                      ))}
                      {slot.skipped.length > 0 && (
                        <span className="print-skip"> (pomija: {slot.skipped.join(", ")})</span>
                      )}
                    </td>
                    <td className="print-sign-cell"></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ))}

      <p className="print-footnote">
        Puste pole w kolumnie "Podp." = podaj lek i podpisz. Kolorowa kropka = kolor nakrętki butelki. Zachowaj min. 5
        minut odstępu między kolejnymi kroplami.
      </p>
    </div>
  );
}
