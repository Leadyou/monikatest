import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useAppData } from "../../src/lib/store";
import { formatShortDatePL } from "../../src/lib/dates";
import { ruleEndDate } from "../../src/lib/schedule";
import { CAP_COLORS, CAP_COLOR_LABELS, useTheme } from "../../src/theme";

const CAP_KEYS = ["tan", "pink", "grey", "blue"];

export default function LekDetailScreen() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { data, updateMedication, deleteMedication, deleteRule } = useAppData();

  const med = data.medications.find((m) => m.id === id);
  const [name, setName] = useState(med?.name ?? "");

  if (!med) {
    return (
      <View style={styles.screen}>
        <Text style={styles.missing}>Nie znaleziono leku.</Text>
      </View>
    );
  }

  const rules = data.rules
    .filter((r) => r.medicationId === med.id)
    .sort((a, b) => (a.startDate < b.startDate ? -1 : 1));

  function confirmDeleteMedication() {
    Alert.alert("Usunąć lek?", `${med.name} i całe jego dawkowanie zostaną usunięte.`, [
      { text: "Anuluj", style: "cancel" },
      {
        text: "Usuń",
        style: "destructive",
        onPress: () => {
          deleteMedication(med.id);
          router.back();
        },
      },
    ]);
  }

  function confirmDeleteRule(rule) {
    Alert.alert("Usunąć ten etap dawkowania?", null, [
      { text: "Anuluj", style: "cancel" },
      { text: "Usuń", style: "destructive", onPress: () => deleteRule(rule.id) },
    ]);
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.fieldLabel}>Nazwa leku</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        onBlur={() => name.trim() && updateMedication(med.id, { name: name.trim() })}
      />

      <Text style={[styles.fieldLabel, { marginTop: 18 }]}>Kolor nakrętki</Text>
      <View style={styles.swatchRow}>
        {CAP_KEYS.map((key) => (
          <Pressable key={key} onPress={() => updateMedication(med.id, { capColor: key })} accessibilityLabel={CAP_COLOR_LABELS[key]}>
            <View
              style={[
                styles.swatch,
                { backgroundColor: CAP_COLORS[key] },
                med.capColor === key && { borderWidth: 2, borderColor: theme.accent },
              ]}
            />
          </Pressable>
        ))}
      </View>

      <View style={styles.rulesHeader}>
        <Text style={styles.fieldLabel}>Etapy dawkowania</Text>
        <Pressable onPress={() => router.push(`/regula/nowy?medId=${med.id}`)}>
          <Text style={styles.addRuleLink}>+ dodaj etap</Text>
        </Pressable>
      </View>

      {rules.length === 0 && <Text style={styles.missing}>Brak etapów — dodaj pierwszy powyżej.</Text>}

      {rules.map((r) => {
        const end = ruleEndDate(r);
        return (
          <Pressable key={r.id} style={styles.ruleRow} onPress={() => router.push(`/regula/${r.id}`)}>
            <View>
              <Text style={styles.ruleText}>
                {formatShortDatePL(r.startDate)} – {end ? formatShortDatePL(end) : "otwarte"}
              </Text>
              <Text style={styles.ruleFreq}>{r.frequencyPerDay}× dziennie</Text>
            </View>
            <Pressable hitSlop={10} onPress={() => confirmDeleteRule(r)}>
              <Ionicons name="trash-outline" size={18} color={theme.inkFaint} />
            </Pressable>
          </Pressable>
        );
      })}

      <Pressable style={styles.deleteBtn} onPress={confirmDeleteMedication}>
        <Text style={styles.deleteBtnLabel}>Usuń lek całkowicie</Text>
      </Pressable>
    </ScrollView>
  );
}

function makeStyles(theme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.bg },
    content: { padding: 20, paddingBottom: 48 },
    missing: { color: theme.inkSoft, fontSize: 14 },
    fieldLabel: { fontSize: 11.5, letterSpacing: 0.5, textTransform: "uppercase", color: theme.inkFaint, fontWeight: "700", marginBottom: 7 },
    input: { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 13, fontSize: 15, fontWeight: "600", color: theme.ink },
    swatchRow: { flexDirection: "row", gap: 14 },
    swatch: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: "rgba(0,0,0,0.12)" },
    rulesHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 24, marginBottom: 8 },
    addRuleLink: { color: theme.accent, fontWeight: "700", fontSize: 13 },
    ruleRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.borderSoft,
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
    },
    ruleText: { fontSize: 13.5, fontWeight: "600", color: theme.ink, fontVariant: ["tabular-nums"] },
    ruleFreq: { fontSize: 12, color: theme.inkSoft, marginTop: 2 },
    deleteBtn: { marginTop: 28, alignItems: "center", paddingVertical: 12 },
    deleteBtnLabel: { color: theme.amber, fontWeight: "700", fontSize: 13.5 },
  });
}
