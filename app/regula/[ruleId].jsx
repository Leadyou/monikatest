import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useAppData } from "../../src/lib/store";
import { useTheme } from "../../src/theme";

const END_TYPES = [
  { key: "manual", label: "Do końca opakowania (zamknę ręcznie później)" },
  { key: "days", label: "Po ustalonej liczbie dni" },
  { key: "date", label: "Konkretna data" },
];

export default function EdytujRegulaScreen() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const router = useRouter();
  const { ruleId } = useLocalSearchParams();
  const { data, updateRule } = useAppData();
  const rule = data.rules.find((r) => r.id === ruleId);
  const med = rule ? data.medications.find((m) => m.id === rule.medicationId) : null;

  const [frequency, setFrequency] = useState(rule?.frequencyPerDay ?? 4);
  const [startDate, setStartDate] = useState(rule?.startDate ?? "");
  const [endType, setEndType] = useState(rule?.end.type ?? "manual");
  const [endDays, setEndDays] = useState(rule?.end.type === "days" ? String(rule.end.days) : "");
  const [endDate, setEndDate] = useState(
    rule?.end.type === "date" ? rule.end.date : rule?.end.type === "manual" ? rule.end.endDate || "" : ""
  );
  const [error, setError] = useState("");

  if (!rule) {
    return (
      <View style={styles.screen}>
        <Text style={styles.subtitle}>Nie znaleziono etapu dawkowania.</Text>
      </View>
    );
  }

  const dateRe = /^\d{4}-\d{2}-\d{2}$/;

  function handleSave() {
    if (!dateRe.test(startDate)) return setError("Data rozpoczęcia w formacie RRRR-MM-DD.");
    if (endType === "days" && !(Number(endDays) > 0)) return setError("Podaj liczbę dni większą od zera.");
    if (endType === "date" && !dateRe.test(endDate)) return setError("Data zakończenia w formacie RRRR-MM-DD.");
    if (endType === "manual" && endDate && !dateRe.test(endDate)) return setError("Data w formacie RRRR-MM-DD albo zostaw puste.");

    const end =
      endType === "days"
        ? { type: "days", days: Number(endDays) }
        : endType === "date"
          ? { type: "date", date: endDate }
          : { type: "manual", endDate: endDate || null };

    updateRule(rule.id, { startDate, frequencyPerDay: frequency, end });
    router.back();
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {med && <Text style={styles.subtitle}>{med.name}</Text>}

      <Text style={styles.fieldLabel}>Dawka dzienna</Text>
      <View style={styles.seg}>
        {[1, 2, 3, 4].map((n) => (
          <Pressable key={n} style={[styles.segItem, frequency === n && styles.segItemActive]} onPress={() => setFrequency(n)}>
            <Text style={[styles.segLabel, frequency === n && styles.segLabelActive]}>{n}×</Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.fieldLabel, { marginTop: 18 }]}>Data rozpoczęcia (RRRR-MM-DD)</Text>
      <TextInput style={styles.input} value={startDate} onChangeText={setStartDate} placeholderTextColor={theme.inkFaint} />

      <Text style={[styles.fieldLabel, { marginTop: 18 }]}>Zakończenie</Text>
      <View style={styles.radioList}>
        {END_TYPES.map((opt) => (
          <Pressable key={opt.key} style={[styles.radioItem, endType === opt.key && styles.radioItemActive]} onPress={() => setEndType(opt.key)}>
            <View style={[styles.radioDot, endType === opt.key && styles.radioDotActive]} />
            <Text style={[styles.radioLabel, endType === opt.key && styles.radioLabelActive]}>{opt.label}</Text>
          </Pressable>
        ))}
      </View>

      {endType === "days" && (
        <>
          <Text style={[styles.fieldLabel, { marginTop: 18 }]}>Liczba dni</Text>
          <TextInput style={styles.input} value={endDays} onChangeText={setEndDays} keyboardType="number-pad" placeholderTextColor={theme.inkFaint} />
        </>
      )}
      {(endType === "date" || endType === "manual") && (
        <>
          <Text style={[styles.fieldLabel, { marginTop: 18 }]}>
            {endType === "date" ? "Data zakończenia (RRRR-MM-DD)" : "Ustalona data końca (opcjonalnie)"}
          </Text>
          <TextInput style={styles.input} value={endDate} onChangeText={setEndDate} placeholder="2026-08-10" placeholderTextColor={theme.inkFaint} />
        </>
      )}

      {error !== "" && <Text style={styles.error}>{error}</Text>}

      <Pressable style={styles.saveBtn} onPress={handleSave}>
        <Text style={styles.saveBtnLabel}>Zapisz zmiany</Text>
      </Pressable>
    </ScrollView>
  );
}

function makeStyles(theme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.bg },
    content: { padding: 20, paddingBottom: 48 },
    subtitle: { fontSize: 15, fontWeight: "700", color: theme.ink, marginBottom: 18 },
    fieldLabel: { fontSize: 11.5, letterSpacing: 0.5, textTransform: "uppercase", color: theme.inkFaint, fontWeight: "700", marginBottom: 7 },
    input: { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 13, fontSize: 15, fontWeight: "600", color: theme.ink },
    seg: { flexDirection: "row", backgroundColor: theme.surfaceSoft, borderWidth: 1, borderColor: theme.border, borderRadius: 12, padding: 3, gap: 3 },
    segItem: { flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: 9 },
    segItemActive: { backgroundColor: theme.accent },
    segLabel: { fontSize: 14, fontWeight: "700", color: theme.inkSoft },
    segLabelActive: { color: theme.accentInk },
    radioList: { gap: 9 },
    radioItem: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.borderSoft, borderRadius: 12, padding: 12 },
    radioItemActive: { borderColor: theme.accent, backgroundColor: theme.accentSoft },
    radioDot: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, borderColor: theme.inkFaint },
    radioDotActive: { borderColor: theme.accent, backgroundColor: theme.accent },
    radioLabel: { fontSize: 13, color: theme.inkSoft, flexShrink: 1 },
    radioLabelActive: { color: theme.ink, fontWeight: "600" },
    error: { color: theme.amber, fontSize: 13, marginBottom: 12, fontWeight: "600" },
    saveBtn: { backgroundColor: theme.accent, borderRadius: 14, paddingVertical: 15, alignItems: "center", marginTop: 8 },
    saveBtnLabel: { color: theme.accentInk, fontWeight: "700", fontSize: 15.5 },
  });
}
