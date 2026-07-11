import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useAppData } from "../../src/lib/store";
import { diffDays, formatShortDatePL, toISODate } from "../../src/lib/dates";
import { computePhases, generateDayPlan, scheduleHorizon } from "../../src/lib/schedule";
import { useTheme } from "../../src/theme";

export default function PrzebiegScreen() {
  const theme = useTheme();
  const styles = makeStyles(theme);
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

  function nextDay(iso) {
    const d = new Date(iso + "T00:00:00");
    d.setDate(d.getDate() + 1);
    return toISODate(d);
  }

  if (!ready) return null;

  if (data.rules.length === 0) {
    return (
      <View style={[styles.screen, styles.emptyWrap]}>
        <Text style={styles.emptyText}>Dodaj leki, żeby zobaczyć przebieg leczenia.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {data.patient?.name && <Text style={styles.patientName}>{data.patient.name}</Text>}

      <View style={styles.statsRow}>
        <Stat theme={theme} val={`${stats.done}/${stats.scheduled}`} lab="dawek" />
        <Stat theme={theme} val={stats.phaseLabel} lab="faza" />
        <Stat theme={theme} val={`${stats.daysLeft} dni`} lab="do końca" />
      </View>

      <View style={styles.phaseList}>
        {phases.map((phase, i) => {
          const isCurrent = phase.startDate <= today && today <= phase.endDate;
          const isDone = phase.endDate < today;
          return (
            <View key={i} style={styles.phaseRow}>
              <View
                style={[
                  styles.phaseDot,
                  isCurrent && styles.phaseDotCurrent,
                  isDone && styles.phaseDotDone,
                ]}
              />
              <View style={[styles.phaseCard, isCurrent && styles.phaseCardCurrent]}>
                <Text style={styles.phaseDates}>
                  {formatShortDatePL(phase.startDate)} – {formatShortDatePL(phase.endDate)}
                </Text>
                <Text style={styles.phaseTitle}>
                  Faza {i + 1}
                  {isCurrent && <Text style={styles.nowTag}> TERAZ</Text>}
                </Text>
                <Text style={styles.phaseDesc}>{phase.summary}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

function Stat({ theme, val, lab }) {
  return (
    <View style={{ flex: 1, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.borderSoft, borderRadius: 14, paddingVertical: 10, alignItems: "center" }}>
      <Text style={{ fontFamily: "serif", fontSize: 18, color: theme.ink, fontVariant: ["tabular-nums"] }}>{val}</Text>
      <Text style={{ fontSize: 9.5, color: theme.inkFaint, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 2 }}>{lab}</Text>
    </View>
  );
}

function makeStyles(theme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.bg },
    content: { padding: 18, paddingBottom: 40 },
    emptyWrap: { justifyContent: "center", alignItems: "center", padding: 32 },
    emptyText: { color: theme.inkSoft, fontSize: 15, textAlign: "center" },
    patientName: { fontSize: 12, color: theme.accent, fontWeight: "700", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 4 },
    statsRow: { flexDirection: "row", gap: 8, marginBottom: 20, marginTop: 4 },
    phaseList: { paddingLeft: 4 },
    phaseRow: { flexDirection: "row", gap: 12, marginBottom: 14 },
    phaseDot: { width: 13, height: 13, borderRadius: 7, borderWidth: 2, borderColor: theme.inkFaint, backgroundColor: theme.surface, marginTop: 3 },
    phaseDotCurrent: { borderColor: theme.accent, backgroundColor: theme.accent },
    phaseDotDone: { borderColor: theme.green, backgroundColor: theme.green },
    phaseCard: { flex: 1, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.borderSoft, borderRadius: 14, padding: 12 },
    phaseCardCurrent: { borderColor: theme.accent },
    phaseDates: { fontSize: 10.5, color: theme.inkFaint, fontWeight: "700", letterSpacing: 0.3, textTransform: "uppercase" },
    phaseTitle: { fontSize: 14, fontWeight: "700", color: theme.ink, marginTop: 3, marginBottom: 4 },
    phaseDesc: { fontSize: 12, color: theme.inkSoft, lineHeight: 17 },
    nowTag: { fontSize: 9.5, fontWeight: "700", color: theme.accent },
  });
}
