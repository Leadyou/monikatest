import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useAppData } from "../../src/lib/store";
import { CAP_COLORS, CAP_COLOR_LABELS, useTheme } from "../../src/theme";

const CAP_KEYS = ["tan", "pink", "grey", "blue"];
const END_TYPES = [
  { key: "manual", label: "Do końca opakowania (zamknę ręcznie później)" },
  { key: "days", label: "Po ustalonej liczbie dni" },
  { key: "date", label: "Konkretna data" },
];

export default function NowyLekScreen() {
  const theme = useTheme();
  const styles = makeStyles(theme);
  const router = useRouter();
  const { addMedication, addRule } = useAppData();

  const [name, setName] = useState("");
  const [capColor, setCapColor] = useState("tan");
  const [frequency, setFrequency] = useState(4);
  const [startDate, setStartDate] = useState("");
  const [endType, setEndType] = useState("manual");
  const [endDays, setEndDays] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState("");

  const dateRe = /^\d{4}-\d{2}-\d{2}$/;

  function handleSave() {
    if (!name.trim()) return setError("Podaj nazwę leku.");
    if (!dateRe.test(startDate)) return setError("Data rozpoczęcia w formacie RRRR-MM-DD, np. 2026-07-14.");
    if (endType === "days" && !(Number(endDays) > 0)) return setError("Podaj liczbę dni większą od zera.");
    if (endType === "date" && !dateRe.test(endDate)) return setError("Data zakończenia w formacie RRRR-MM-DD.");

    const end =
      endType === "days"
        ? { type: "days", days: Number(endDays) }
        : endType === "date"
          ? { type: "date", date: endDate }
          : { type: "manual", endDate: null };

    const med = addMedication({ name: name.trim(), capColor });
    addRule({ medicationId: med.id, startDate, frequencyPerDay: frequency, end });
    router.back();
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Field label="Nazwa leku">
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="np. Hyal-Drop 4S"
          placeholderTextColor={theme.inkFaint}
        />
      </Field>

      <Field label="Kolor nakrętki">
        <View style={styles.swatchRow}>
          {CAP_KEYS.map((key) => (
            <Pressable key={key} onPress={() => setCapColor(key)} accessibilityLabel={CAP_COLOR_LABELS[key]}>
              <View
                style={[
                  styles.swatch,
                  { backgroundColor: CAP_COLORS[key] },
                  capColor === key && { borderWidth: 2, borderColor: theme.accent },
                ]}
              />
            </Pressable>
          ))}
        </View>
      </Field>

      <Field label="Dawka dzienna">
        <View style={styles.seg}>
          {[1, 2, 3, 4].map((n) => (
            <Pressable
              key={n}
              style={[styles.segItem, frequency === n && styles.segItemActive]}
              onPress={() => setFrequency(n)}
            >
              <Text style={[styles.segLabel, frequency === n && styles.segLabelActive]}>{n}×</Text>
            </Pressable>
          ))}
        </View>
      </Field>

      <Field label="Data rozpoczęcia (RRRR-MM-DD)">
        <TextInput
          style={styles.input}
          value={startDate}
          onChangeText={setStartDate}
          placeholder="2026-07-14"
          placeholderTextColor={theme.inkFaint}
        />
      </Field>

      <Field label="Zakończenie">
        <View style={styles.radioList}>
          {END_TYPES.map((opt) => (
            <Pressable
              key={opt.key}
              style={[styles.radioItem, endType === opt.key && styles.radioItemActive]}
              onPress={() => setEndType(opt.key)}
            >
              <View style={[styles.radioDot, endType === opt.key && styles.radioDotActive]} />
              <Text style={[styles.radioLabel, endType === opt.key && styles.radioLabelActive]}>{opt.label}</Text>
            </Pressable>
          ))}
        </View>
      </Field>

      {endType === "days" && (
        <Field label="Liczba dni">
          <TextInput
            style={styles.input}
            value={endDays}
            onChangeText={setEndDays}
            keyboardType="number-pad"
            placeholder="np. 7"
            placeholderTextColor={theme.inkFaint}
          />
        </Field>
      )}
      {endType === "date" && (
        <Field label="Data zakończenia (RRRR-MM-DD)">
          <TextInput
            style={styles.input}
            value={endDate}
            onChangeText={setEndDate}
            placeholder="2026-07-27"
            placeholderTextColor={theme.inkFaint}
          />
        </Field>
      )}

      {error !== "" && <Text style={styles.error}>{error}</Text>}

      <Pressable style={styles.saveBtn} onPress={handleSave}>
        <Text style={styles.saveBtnLabel}>Zapisz lek</Text>
      </Pressable>
    </ScrollView>
  );
}

function Field({ label, children }) {
  return (
    <View style={{ marginBottom: 18 }}>
      <FieldLabel>{label}</FieldLabel>
      {children}
    </View>
  );
}

function FieldLabel({ children }) {
  const theme = useTheme();
  return (
    <Text style={{ fontSize: 11.5, letterSpacing: 0.5, textTransform: "uppercase", color: theme.inkFaint, fontWeight: "700", marginBottom: 7 }}>
      {children}
    </Text>
  );
}

function makeStyles(theme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.bg },
    content: { padding: 20, paddingBottom: 48 },
    input: {
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      paddingVertical: 11,
      paddingHorizontal: 13,
      fontSize: 15,
      fontWeight: "600",
      color: theme.ink,
    },
    swatchRow: { flexDirection: "row", gap: 14 },
    swatch: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: "rgba(0,0,0,0.12)" },
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
