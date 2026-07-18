import { useMemo } from "react";
import { useAppData } from "../lib/store.jsx";
import { diffDays, formatShortDatePL, toISODate } from "../lib/dates";
import { computePhases, generateDayPlan, scheduleHorizon } from "../lib/schedule";
import { printWithDatedFilename } from "../lib/print";

function nextDay(iso) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + 1);
  return toISODate(d);
}

function Stat({ val, lab }) {
  return (
    <div className="card" style={{ flex: 1, textAlign: "center", marginBottom: 0 }}>
      <div style={{ fontFamily: "var(--font-display)", fontSize: 18 }}>{val}</div>
      <div style={{ fontSize: 9.5, color: "var(--ink-faint)", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 2 }}>{lab}</div>
    </div>
  );
}

export default function PrzebiegPage() {
  const { data, ready, getDoseTakenAt } = useAppData();
  const today = toISODate(new Date());

  const horizon = useMemo(() => scheduleHorizon(data.rules), [data.rules]);
  const phases = useMemo(
    () => (ready && data.rules.length > 0 ? computePhases(data.medications, data.rules, horizon.from, horizon.to) : []),
    [ready, data.medications, data.rules, horizon]
  );

  const stats = useMemo(() => {
    if (!ready || data.rules.length === 0) return null;
    let scheduled = 0;
    let done = 0;
    let cursor = horizon.from;
    while (cursor <= today) {
      const plan = generateDayPlan(cursor, data.medications, data.rules, data.slotTimes);
      for (const slot of plan.slots) {
        for (const dose of slot.doses) {
          scheduled += 1;
          if (getDoseTakenAt(cursor, slot.slotIndex, dose.medicationId)) done += 1;
        }
      }
      cursor = nextDay(cursor);
    }
    const currentPhaseIdx = phases.findIndex((p) => p.startDate <= today && today <= p.endDate);
    return {
      scheduled,
      done,
      phaseLabel: currentPhaseIdx >= 0 ? `${currentPhaseIdx + 1} z ${phases.length}` : "—",
      daysLeft: Math.max(0, diffDays(today, horizon.to)),
    };
  }, [ready, data, horizon, today, phases, getDoseTakenAt]);

  if (!ready) return null;

  if (data.rules.length === 0) {
    return <p className="empty-state">Dodaj leki, żeby zobaczyć przebieg leczenia.</p>;
  }

  return (
    <div>
      <button className="btn full" style={{ marginBottom: 14 }} onClick={() => printWithDatedFilename()}>
        Drukuj harmonogram (PDF)
      </button>

      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        <Stat val={`${stats.done}/${stats.scheduled}`} lab="dawek" />
        <Stat val={stats.phaseLabel} lab="faza" />
        <Stat val={`${stats.daysLeft} dni`} lab="do końca" />
      </div>

      {phases.map((phase, i) => {
        const isCurrent = phase.startDate <= today && today <= phase.endDate;
        const isDone = phase.endDate < today;
        return (
          <div key={i} style={{ display: "flex", gap: 12, marginBottom: 14 }}>
            <div
              style={{
                width: 13,
                height: 13,
                borderRadius: "50%",
                border: `2px solid ${isCurrent ? "var(--accent)" : isDone ? "var(--green)" : "var(--ink-faint)"}`,
                background: isCurrent ? "var(--accent)" : isDone ? "var(--green)" : "var(--surface)",
                marginTop: 4,
                flexShrink: 0,
              }}
            />
            <div className={`card${isCurrent ? "" : ""}`} style={{ flex: 1, marginBottom: 0, borderColor: isCurrent ? "var(--accent)" : undefined }}>
              <div style={{ fontSize: 10.5, color: "var(--ink-faint)", fontWeight: 700, letterSpacing: "0.03em", textTransform: "uppercase" }}>
                {formatShortDatePL(phase.startDate)} – {formatShortDatePL(phase.endDate)}
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, margin: "3px 0 4px" }}>
                Faza {i + 1}
                {isCurrent && (
                  <span style={{ fontSize: 9.5, fontWeight: 700, color: "var(--accent)", marginLeft: 6 }}>TERAZ</span>
                )}
              </div>
              <div style={{ fontSize: 12, color: "var(--ink-soft)", lineHeight: 1.4 }}>{phase.summary}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
