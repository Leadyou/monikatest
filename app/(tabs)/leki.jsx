import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAppData } from "../../src/lib/store";
import { formatShortDatePL } from "../../src/lib/dates";
import { ruleEndDate } from "../../src/lib/schedule";
import { CAP_COLORS, useTheme } from "../../src/theme";

export default function LekiScreen() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const router = useRouter();
  const { data, moveMedication } = useAppData();

  const meds = data.medications.slice().sort((a, b) => a.order - b.order);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Pressable style={styles.addBtn} onPress={() => router.push("/lek/nowy")}>
        <Ionicons name="add" size={18} color={theme.accentInk} />
        <Text style={styles.addBtnLabel}>Dodaj lek</Text>
      </Pressable>

      {meds.length === 0 && (
        <Text style={styles.emptyText}>Brak leków. Dodaj pierwszy przyciskiem powyżej.</Text>
      )}

      {meds.map((med, i) => {
        const rules = data.rules
          .filter((r) => r.medicationId === med.id)
          .sort((a, b) => (a.startDate < b.startDate ? -1 : 1));
        return (
          <Pressable key={med.id} style={styles.card} onPress={() => router.push(`/lek/${med.id}`)}>
            <View style={styles.cardTop}>
              <View style={styles.cardTitleRow}>
                <View style={[styles.dot, { backgroundColor: CAP_COLORS[med.capColor] || theme.borderSoft }]} />
                <Text style={styles.medName}>{med.name}</Text>
              </View>
              <View style={styles.reorderRow}>
                <Pressable
                  hitSlop={8}
                  disabled={i === 0}
                  onPress={(e) => {
                    e.stopPropagation?.();
                    moveMedication(med.id, -1);
                  }}
                >
                  <Ionicons name="chevron-up" size={18} color={i === 0 ? theme.borderSoft : theme.inkSoft} />
                </Pressable>
                <Pressable
                  hitSlop={8}
                  disabled={i === meds.length - 1}
                  onPress={(e) => {
                    e.stopPropagation?.();
                    moveMedication(med.id, 1);
                  }}
                >
                  <Ionicons
                    name="chevron-down"
                    size={18}
                    color={i === meds.length - 1 ? theme.borderSoft : theme.inkSoft}
                  />
                </Pressable>
              </View>
            </View>

            {rules.length === 0 ? (
              <Text style={styles.noRules}>Brak ustalonego dawkowania</Text>
            ) : (
              <View style={styles.chipRow}>
                {rules.map((r) => {
                  const end = ruleEndDate(r);
                  return (
                    <View key={r.id} style={styles.chip}>
                      <Text style={styles.chipText}>
                        {formatShortDatePL(r.startDate)}
                        {" – "}
                        {end ? formatShortDatePL(end) : "?"} · {r.frequencyPerDay}×
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function makeStyles(theme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.bg },
    content: { padding: 18, paddingBottom: 40, gap: 12 },
    addBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      backgroundColor: theme.accent,
      borderRadius: 14,
      paddingVertical: 13,
      marginBottom: 4,
    },
    addBtnLabel: { color: theme.accentInk, fontWeight: "700", fontSize: 15 },
    emptyText: { color: theme.inkSoft, fontSize: 14, textAlign: "center", marginTop: 12 },
    card: { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.borderSoft, borderRadius: 16, padding: 14 },
    cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
    cardTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 1, borderColor: "rgba(0,0,0,0.1)" },
    medName: { fontSize: 16, fontWeight: "700", color: theme.ink },
    reorderRow: { flexDirection: "row", gap: 10 },
    noRules: { fontSize: 12.5, color: theme.inkFaint },
    chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    chip: { backgroundColor: theme.surfaceSoft, borderWidth: 1, borderColor: theme.borderSoft, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 10 },
    chipText: { fontSize: 11.5, color: theme.inkSoft, fontVariant: ["tabular-nums"] },
  });
}
