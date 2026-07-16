import { useEffect, useMemo, useState } from "react";
import { useAppData } from "../lib/store.jsx";
import { diffDays, formatLongDatePL, toISODate } from "../lib/dates";
import { generateDayPlan } from "../lib/schedule";
import { notificationPermission, notificationsSupported, requestNotificationPermission } from "../lib/reminders";
import { CAP_COLORS } from "../lib/capColors";

function useNow(intervalMs = 20000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

function slotDateTime(dateISO, time) {
  const [h, m] = time.split(":").map(Number);
  const d = new Date(dateISO + "T00:00:00");
  d.setHours(h, m, 0, 0);
  return d;
}

function formatCountdown(ms) {
  const totalMin = Math.max(0, Math.round(ms / 60000));
  if (totalMin < 60) return `za ${totalMin} min`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `za ${h} godz. ${m} min`;
}

export default function DzisPage({ onGoToLeki }) {
  const { data, ready, markDoseTaken, unmarkDose, getDoseTakenAt } = useAppData();
  const now = useNow();
  const today = toISODate(now);
  const [permission, setPermission] = useState(notificationPermission());

  const plan = useMemo(() => {
    if (!ready || data.medications.length === 0) return null;
    return generateDayPlan(today, data.medications, data.rules, data.slotTimes);
  }, [ready, data.medications, data.rules, data.slotTimes, today]);

  const slotsWithDoses = (plan?.slots || []).filter((s) => s.doses.length > 0);

  const slotStates = useMemo(() => {
    const states = slotsWithDoses.map((slot) => {
      const done = slot.doses.every((d) => getDoseTakenAt(today, slot.slotIndex, d.medicationId));
      const dt = slotDateTime(today, slot.time);
      const overdue = !done && dt.getTime() < now.getTime();
      return { slot, done, overdue, dt };
    });
    const firstUpcomingIdx = states.findIndex((s) => !s.done && !s.overdue);
    return states.map((s, i) => ({ ...s, isNext: i === firstUpcomingIdx }));
  }, [slotsWithDoses, today, now, getDoseTakenAt]);

  const nextControl = useMemo(() => {
    const upcoming = data.controls
      .filter((c) => new Date(c.datetime).getTime() >= now.getTime())
      .sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
    return upcoming[0] || null;
  }, [data.controls, now]);

  async function handleEnableNotifications() {
    const result = await requestNotificationPermission();
    setPermission(result);
  }

  if (!ready) return null;

  if (data.medications.length === 0) {
    return (
      <div className="empty-state">
        <p>
          Nie masz jeszcze dodanych leków. Przejdź do zakładki „Leki” i wgraj swój wypis ze szpitala (PDF) — odczytamy
          z niego zalecenia. Leki można też dodać ręcznie.
        </p>
        <button className="btn" onClick={onGoToLeki}>
          Przejdź do zakładki „Leki”
        </button>
      </div>
    );
  }

  const dayNumber = data.patient?.surgeryDate ? diffDays(data.patient.surgeryDate, today) : null;

  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        {dayNumber !== null && (
          <div style={{ fontSize: 12, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--accent)", fontWeight: 700 }}>
            {dayNumber}. dzień po zabiegu
          </div>
        )}
        <div style={{ fontFamily: "var(--font-display)", fontSize: 22, marginTop: 4 }}>{formatLongDatePL(today)}</div>
      </div>

      {notificationsSupported() && permission !== "granted" && (
        <div className="card" style={{ borderLeft: "3px solid var(--accent)" }}>
          <div style={{ fontSize: 13, marginBottom: 8, color: "var(--ink-soft)" }}>
            Włącz powiadomienia dźwiękowe, żeby nie przegapić pory podania (działają, gdy ta karta jest otwarta).
          </div>
          <button className="btn ghost" onClick={handleEnableNotifications}>
            Włącz przypomnienia
          </button>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {nextControl && (
          <div className="card" style={{ flex: 1, borderLeft: "3px solid var(--accent)", marginBottom: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 2 }}>{nextControl.label}</div>
            <div style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>
              {new Date(nextControl.datetime).toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit" })} ·{" "}
              {new Date(nextControl.datetime).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}
              {nextControl.location ? ` · ${nextControl.location}` : ""}
            </div>
          </div>
        )}
        <div className="card" style={{ flex: 1, borderLeft: "3px solid var(--ink-faint)", marginBottom: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 2 }}>Odstęp</div>
          <div style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>min. 5 min między kroplami</div>
        </div>
      </div>

      {slotsWithDoses.length === 0 && <p className="empty-state">Dziś nie ma zaplanowanych kropli.</p>}

      {slotStates.map(({ slot, done, overdue, isNext, dt }) => (
        <div
          key={slot.slotIndex}
          className="card"
          style={{
            opacity: done ? 0.65 : 1,
            borderColor: isNext || overdue ? "var(--amber)" : undefined,
            background: isNext || overdue ? "var(--amber-soft)" : undefined,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 9 }}>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 20 }}>{slot.time}</span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.03em",
                color: done ? "var(--green)" : overdue || isNext ? "var(--amber)" : "var(--ink-faint)",
              }}
            >
              {done ? "PODANO" : overdue ? "ZALEGŁE" : isNext ? "NASTĘPNA" : "OCZEKUJE"}
            </span>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8, alignItems: "center" }}>
            {slot.doses.map((d, i) => (
              <span key={d.medicationId} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {i > 0 && <span style={{ color: "var(--ink-faint)" }}>→</span>}
                <span className="pill">
                  <span className="dot" style={{ background: CAP_COLORS[d.capColor] || "var(--border-soft)" }} />
                  {d.medicationName}
                </span>
              </span>
            ))}
          </div>

          {slot.skipped.length > 0 && (
            <div style={{ fontSize: 11, color: "var(--ink-faint)", marginBottom: 8 }}>
              Pomijamy o tej porze: {slot.skipped.join(", ")}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            {done ? (
              <button
                className="link-btn"
                style={{ color: "var(--green)" }}
                onClick={() => slot.doses.forEach((d) => unmarkDose(today, slot.slotIndex, d.medicationId))}
              >
                ✓ podano · cofnij
              </button>
            ) : (
              <>
                {isNext && !overdue && (
                  <span style={{ fontSize: 11, color: "var(--amber)", fontWeight: 700 }}>{formatCountdown(dt - now)}</span>
                )}
                <button
                  className={isNext || overdue ? "btn" : "btn ghost"}
                  onClick={() => {
                    const whenISO = new Date().toISOString();
                    slot.doses.forEach((d) => markDoseTaken(today, slot.slotIndex, d.medicationId, whenISO));
                  }}
                >
                  Oznacz jako podane
                </button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
