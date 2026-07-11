import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAppData } from "../../src/lib/store";
import { seedData } from "../../src/lib/seed";
import { diffDays, formatLongDatePL, toISODate } from "../../src/lib/dates";
import { generateDayPlan } from "../../src/lib/schedule";
import { CAP_COLORS, useTheme } from "../../src/theme";

function useNow(intervalMs = 30000) {
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

export default function DzisScreen() {
  const theme = useTheme();
  const { data, ready, applySeed, markDoseTaken, unmarkDose, getDoseTakenAt } = useAppData();
  const now = useNow();
  const today = toISODate(now);

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

  const styles = makeStyles(theme);

  if (!ready) return null;

  if (data.medications.length === 0) {
    return (
      <View style={[styles.screen, styles.emptyWrap]}>
        <Text style={styles.emptyTitle}>Zaczynamy</Text>
        <Text style={styles.emptyBody}>
          Nie masz jeszcze dodanych leków. Możesz wczytać przykładowe dane z wypisu (Przykładowy pacjent) albo dodać leki
          ręcznie w zakładce „Leki”.
        </Text>
        <Pressable style={styles.primaryBtn} onPress={() => applySeed(seedData())}>
          <Text style={styles.primaryBtnLabel}>Wczytaj dane z wypisu</Text>
        </Pressable>
      </View>
    );
  }

  const dayNumber = data.patient?.surgeryDate ? diffDays(data.patient.surgeryDate, today) : null;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        {dayNumber !== null && <Text style={styles.dayCount}>{dayNumber}. dzień po zabiegu</Text>}
        <Text style={styles.dateTitle}>{formatLongDatePL(today)}</Text>
      </View>

      <View style={styles.bannerRow}>
        {nextControl && (
          <View style={[styles.banner, styles.bannerControl]}>
            <Text style={styles.bannerLabel}>{nextControl.label}</Text>
            <Text style={styles.bannerBody}>
              {new Date(nextControl.datetime).toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit" })} ·{" "}
              {new Date(nextControl.datetime).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}
              {nextControl.location ? ` · ${nextControl.location}` : ""}
            </Text>
          </View>
        )}
        <View style={[styles.banner, styles.bannerSpacing]}>
          <Text style={styles.bannerLabel}>Odstęp</Text>
          <Text style={styles.bannerBody}>min. 5 min między kroplami</Text>
        </View>
      </View>

      {slotsWithDoses.length === 0 && (
        <Text style={styles.emptyBody}>Dziś nie ma zaplanowanych kropli.</Text>
      )}

      {slotStates.map(({ slot, done, overdue, isNext, dt }) => (
        <View
          key={slot.slotIndex}
          style={[
            styles.slot,
            done && styles.slotDone,
            (isNext || overdue) && styles.slotNext,
          ]}
        >
          <View style={styles.slotTop}>
            <Text style={styles.slotTime}>{slot.time}</Text>
            <Text
              style={[
                styles.slotStatus,
                done && styles.statusDone,
                overdue && styles.statusOverdue,
                isNext && !overdue && styles.statusNext,
              ]}
            >
              {done ? "PODANO" : overdue ? "ZALEGŁE" : isNext ? "NASTĘPNA" : "OCZEKUJE"}
            </Text>
          </View>

          <View style={styles.doseRow}>
            {slot.doses.map((d, i) => (
              <View key={d.medicationId} style={styles.doseItem}>
                {i > 0 && <Text style={styles.arrow}>→</Text>}
                <View style={styles.pill}>
                  <View style={[styles.dot, { backgroundColor: CAP_COLORS[d.capColor] || theme.borderSoft }]} />
                  <Text style={styles.pillLabel}>{d.medicationName}</Text>
                </View>
              </View>
            ))}
          </View>

          {slot.skipped.length > 0 && (
            <Text style={styles.skipNote}>Pomijamy o tej porze: {slot.skipped.join(", ")}</Text>
          )}

          <View style={styles.slotFooter}>
            {done ? (
              <Pressable
                onPress={() => slot.doses.forEach((d) => unmarkDose(today, slot.slotIndex, d.medicationId))}
              >
                <Text style={styles.undoLink}>✓ podano · cofnij</Text>
              </Pressable>
            ) : (
              <>
                {isNext && !overdue && <Text style={styles.countdown}>{formatCountdown(dt - now)}</Text>}
                <Pressable
                  style={[styles.markBtn, !isNext && !overdue && styles.markBtnGhost]}
                  onPress={() => {
                    const whenISO = new Date().toISOString();
                    slot.doses.forEach((d) => markDoseTaken(today, slot.slotIndex, d.medicationId, whenISO));
                  }}
                >
                  <Text
                    style={[styles.markBtnLabel, !isNext && !overdue && styles.markBtnLabelGhost]}
                  >
                    Oznacz jako podane
                  </Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

function makeStyles(theme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.bg },
    scrollContent: { padding: 18, paddingBottom: 40 },
    emptyWrap: { justifyContent: "center", alignItems: "center", gap: 14, padding: 32 },
    emptyTitle: { fontFamily: "serif", fontSize: 24, color: theme.ink },
    emptyBody: { fontSize: 15, color: theme.inkSoft, textAlign: "center", lineHeight: 22 },
    primaryBtn: { backgroundColor: theme.accent, paddingVertical: 14, paddingHorizontal: 22, borderRadius: 14, marginTop: 8 },
    primaryBtnLabel: { color: theme.accentInk, fontWeight: "700", fontSize: 15 },

    header: { marginBottom: 14 },
    dayCount: { fontSize: 12, letterSpacing: 0.8, textTransform: "uppercase", color: theme.accent, fontWeight: "700" },
    dateTitle: { fontFamily: "serif", fontSize: 24, color: theme.ink, marginTop: 4 },

    bannerRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
    banner: { flex: 1, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.borderSoft, borderRadius: 14, padding: 11 },
    bannerControl: { borderLeftWidth: 3, borderLeftColor: theme.accent },
    bannerSpacing: { borderLeftWidth: 3, borderLeftColor: theme.inkFaint },
    bannerLabel: { fontSize: 12, fontWeight: "700", color: theme.ink, marginBottom: 2 },
    bannerBody: { fontSize: 11.5, color: theme.inkSoft, lineHeight: 16 },

    slot: { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.borderSoft, borderRadius: 18, padding: 14, marginBottom: 12 },
    slotDone: { opacity: 0.65 },
    slotNext: { borderColor: theme.amber, backgroundColor: theme.amberSoft },
    slotTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", marginBottom: 9 },
    slotTime: { fontFamily: "serif", fontSize: 20, color: theme.ink },
    slotStatus: { fontSize: 11, fontWeight: "700", letterSpacing: 0.4, color: theme.inkFaint },
    statusDone: { color: theme.green },
    statusOverdue: { color: theme.amber },
    statusNext: { color: theme.amber },

    doseRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", marginBottom: 8 },
    doseItem: { flexDirection: "row", alignItems: "center" },
    arrow: { color: theme.inkFaint, marginHorizontal: 4 },
    pill: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: theme.surfaceSoft, borderWidth: 1, borderColor: theme.borderSoft, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 10, marginBottom: 6 },
    dot: { width: 12, height: 12, borderRadius: 6 },
    pillLabel: { fontSize: 12.5, fontWeight: "600", color: theme.ink },

    skipNote: { fontSize: 11, color: theme.inkFaint, marginBottom: 8 },

    slotFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    undoLink: { fontSize: 12, color: theme.green, fontWeight: "600" },
    countdown: { fontSize: 11, color: theme.amber, fontWeight: "700" },
    markBtn: { backgroundColor: theme.accent, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14 },
    markBtnGhost: { backgroundColor: "transparent", borderWidth: 1, borderColor: theme.border },
    markBtnLabel: { color: theme.accentInk, fontWeight: "700", fontSize: 12.5 },
    markBtnLabelGhost: { color: theme.inkSoft },
  });
}
