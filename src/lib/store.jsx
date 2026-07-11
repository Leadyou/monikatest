import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";

const EMPTY_STATE = {
  patient: null,
  medications: [],
  rules: [],
  doseLogs: {},
  controls: [],
  slotTimes: ["08:00", "12:00", "16:00", "20:00"],
};

function mapMedication(row) {
  return { id: row.id, name: row.name, capColor: row.cap_color, order: row.sort_order };
}

function mapRule(row) {
  const end =
    row.end_type === "days"
      ? { type: "days", days: row.end_days }
      : row.end_type === "date"
        ? { type: "date", date: row.end_date }
        : { type: "manual", endDate: row.end_date };
  return { id: row.id, medicationId: row.medication_id, startDate: row.start_date, frequencyPerDay: row.frequency_per_day, end };
}

function mapControl(row) {
  return { id: row.id, label: row.label, datetime: row.at, location: row.location };
}

function mapPatient(row) {
  if (!row) return null;
  return { id: row.id, name: row.name, surgeryDate: row.surgery_date, eye: row.eye };
}

function ruleToRow(rule) {
  const row = {
    medication_id: rule.medicationId,
    start_date: rule.startDate,
    frequency_per_day: rule.frequencyPerDay,
    end_type: rule.end.type,
    end_days: rule.end.type === "days" ? rule.end.days : null,
    end_date: rule.end.type === "date" ? rule.end.date : rule.end.type === "manual" ? rule.end.endDate : null,
  };
  return row;
}

const AppDataContext = createContext(null);

export function AppDataProvider({ children }) {
  const [data, setData] = useState(EMPTY_STATE);
  const [ready, setReady] = useState(false);

  const fetchAll = useCallback(async () => {
    const [patientRes, medsRes, rulesRes, logsRes, controlsRes] = await Promise.all([
      supabase.from("cd_patient").select("*").limit(1).maybeSingle(),
      supabase.from("cd_medications").select("*").order("sort_order"),
      supabase.from("cd_dosage_rules").select("*"),
      supabase.from("cd_dose_logs").select("*"),
      supabase.from("cd_controls").select("*").order("at"),
    ]);

    const doseLogs = {};
    for (const row of logsRes.data || []) {
      doseLogs[`${row.dose_date}|${row.slot_index}|${row.medication_id}`] = row.taken_at;
    }

    setData({
      patient: mapPatient(patientRes.data),
      medications: (medsRes.data || []).map(mapMedication),
      rules: (rulesRes.data || []).map(mapRule),
      doseLogs,
      controls: (controlsRes.data || []).map(mapControl),
      slotTimes: patientRes.data?.slot_times || EMPTY_STATE.slotTimes,
    });
    setReady(true);
  }, []);

  useEffect(() => {
    fetchAll();
    const channel = supabase
      .channel("cd-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "cd_patient" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "cd_medications" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "cd_dosage_rules" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "cd_dose_logs" }, fetchAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "cd_controls" }, fetchAll)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAll]);

  const setPatient = useCallback(async (patient) => {
    if (data.patient?.id) {
      await supabase
        .from("cd_patient")
        .update({ name: patient.name, surgery_date: patient.surgeryDate, eye: patient.eye })
        .eq("id", data.patient.id);
    } else {
      await supabase
        .from("cd_patient")
        .insert({ name: patient.name, surgery_date: patient.surgeryDate, eye: patient.eye });
    }
    await fetchAll();
  }, [data.patient, fetchAll]);

  const addMedication = useCallback(async (med) => {
    const order = data.medications.length + 1;
    const { data: inserted } = await supabase
      .from("cd_medications")
      .insert({ name: med.name, cap_color: med.capColor, sort_order: order })
      .select()
      .single();
    await fetchAll();
    return mapMedication(inserted);
  }, [data.medications, fetchAll]);

  const updateMedication = useCallback(async (id, patch) => {
    const row = {};
    if (patch.name !== undefined) row.name = patch.name;
    if (patch.capColor !== undefined) row.cap_color = patch.capColor;
    if (patch.order !== undefined) row.sort_order = patch.order;
    await supabase.from("cd_medications").update(row).eq("id", id);
    await fetchAll();
  }, [fetchAll]);

  const deleteMedication = useCallback(async (id) => {
    await supabase.from("cd_medications").delete().eq("id", id);
    await fetchAll();
  }, [fetchAll]);

  const moveMedication = useCallback(async (id, direction) => {
    const sorted = data.medications.slice().sort((a, b) => a.order - b.order);
    const idx = sorted.findIndex((m) => m.id === id);
    const swapWith = idx + direction;
    if (idx === -1 || swapWith < 0 || swapWith >= sorted.length) return;
    const a = sorted[idx];
    const b = sorted[swapWith];
    await Promise.all([
      supabase.from("cd_medications").update({ sort_order: b.order }).eq("id", a.id),
      supabase.from("cd_medications").update({ sort_order: a.order }).eq("id", b.id),
    ]);
    await fetchAll();
  }, [data.medications, fetchAll]);

  const addRule = useCallback(async (rule) => {
    const { data: inserted } = await supabase.from("cd_dosage_rules").insert(ruleToRow(rule)).select().single();
    await fetchAll();
    return mapRule(inserted);
  }, [fetchAll]);

  const updateRule = useCallback(async (id, patch) => {
    const merged = { ...data.rules.find((r) => r.id === id), ...patch };
    await supabase.from("cd_dosage_rules").update(ruleToRow(merged)).eq("id", id);
    await fetchAll();
  }, [data.rules, fetchAll]);

  const deleteRule = useCallback(async (id) => {
    await supabase.from("cd_dosage_rules").delete().eq("id", id);
    await fetchAll();
  }, [fetchAll]);

  const markDoseTaken = useCallback(async (date, slotIndex, medicationId, whenISO) => {
    await supabase
      .from("cd_dose_logs")
      .upsert(
        { dose_date: date, slot_index: slotIndex, medication_id: medicationId, taken_at: whenISO },
        { onConflict: "dose_date,slot_index,medication_id" }
      );
    await fetchAll();
  }, [fetchAll]);

  const unmarkDose = useCallback(async (date, slotIndex, medicationId) => {
    await supabase
      .from("cd_dose_logs")
      .delete()
      .eq("dose_date", date)
      .eq("slot_index", slotIndex)
      .eq("medication_id", medicationId);
    await fetchAll();
  }, [fetchAll]);

  const getDoseTakenAt = useCallback(
    (date, slotIndex, medicationId) => data.doseLogs[`${date}|${slotIndex}|${medicationId}`] || null,
    [data.doseLogs]
  );

  const addControl = useCallback(async (control) => {
    const { data: inserted } = await supabase
      .from("cd_controls")
      .insert({ label: control.label, at: control.datetime, location: control.location })
      .select()
      .single();
    await fetchAll();
    return mapControl(inserted);
  }, [fetchAll]);

  const deleteControl = useCallback(async (id) => {
    await supabase.from("cd_controls").delete().eq("id", id);
    await fetchAll();
  }, [fetchAll]);

  const applySeed = useCallback(async (seed) => {
    const { data: insertedMeds } = await supabase
      .from("cd_medications")
      .insert(seed.medications.map((m) => ({ name: m.name, cap_color: m.capColor, sort_order: m.order })))
      .select();

    const idByKey = {};
    seed.medications.forEach((m, i) => {
      idByKey[m.key] = insertedMeds[i].id;
    });

    await supabase.from("cd_dosage_rules").insert(
      seed.rules.map((r) => ruleToRow({ ...r, medicationId: idByKey[r.medicationKey] }))
    );

    await supabase.from("cd_controls").insert(
      seed.controls.map((c) => ({ label: c.label, at: c.datetime, location: c.location }))
    );

    await supabase.from("cd_patient").insert({
      name: seed.patient.name,
      surgery_date: seed.patient.surgeryDate,
      eye: seed.patient.eye,
    });

    await fetchAll();
  }, [fetchAll]);

  const value = useMemo(
    () => ({
      data,
      ready,
      applySeed,
      setPatient,
      addMedication,
      updateMedication,
      deleteMedication,
      moveMedication,
      addRule,
      updateRule,
      deleteRule,
      markDoseTaken,
      unmarkDose,
      getDoseTakenAt,
      addControl,
      deleteControl,
    }),
    [
      data,
      ready,
      applySeed,
      setPatient,
      addMedication,
      updateMedication,
      deleteMedication,
      moveMedication,
      addRule,
      updateRule,
      deleteRule,
      markDoseTaken,
      unmarkDose,
      getDoseTakenAt,
      addControl,
      deleteControl,
    ]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used inside AppDataProvider");
  return ctx;
}
