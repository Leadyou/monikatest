import { useEffect, useRef } from "react";
import { toISODate } from "./dates";
import { generateDayPlan } from "./schedule";

export function notificationsSupported() {
  return typeof window !== "undefined" && "Notification" in window;
}

export function notificationPermission() {
  return notificationsSupported() ? Notification.permission : "unsupported";
}

export async function requestNotificationPermission() {
  if (!notificationsSupported()) return "unsupported";
  return Notification.requestPermission();
}

function playBeep() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.9);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.9);
  } catch {
    // Cicha awaria — dźwięk to tylko dodatek, powiadomienie i tak się pojawi.
  }
}

// Sprawdza co chwilę, czy nadeszła pora podania i pilnuje, żeby to samo
// przypomnienie nie odpaliło się kilka razy. Działa tylko, gdy ta karta
// przeglądarki jest otwarta — zgodnie z ustaleniem, że to wystarczy.
export function useDoseReminders(medications, rules, slotTimes) {
  const firedRef = useRef(new Set());

  useEffect(() => {
    if (medications.length === 0) return undefined;

    const check = () => {
      const now = new Date();
      const today = toISODate(now);
      const plan = generateDayPlan(today, medications, rules, slotTimes);

      for (const slot of plan.slots) {
        if (slot.doses.length === 0) continue;
        const key = `${today}|${slot.slotIndex}`;
        if (firedRef.current.has(key)) continue;

        const [h, m] = slot.time.split(":").map(Number);
        const slotDate = new Date(now);
        slotDate.setHours(h, m, 0, 0);
        const diffMs = now.getTime() - slotDate.getTime();

        if (diffMs >= 0 && diffMs < 60_000) {
          firedRef.current.add(key);
          const names = slot.doses.map((d) => d.medicationName).join(" → ");
          if (notificationsSupported() && Notification.permission === "granted") {
            new Notification(`Pora na krople (${slot.time})`, { body: names, tag: key });
          }
          playBeep();
        }
      }
    };

    check();
    const interval = setInterval(check, 20_000);
    return () => clearInterval(interval);
  }, [medications, rules, slotTimes]);
}
