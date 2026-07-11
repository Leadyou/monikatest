import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_SLOT_TIMES } from "./schedule";

const STORAGE_KEY = "krople.v1";

function makeId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

const EMPTY_STATE = {
  patient: null,
  medications: [],
  rules: [],
  doseLogs: {},
  controls: [],
  slotTimes: DEFAULT_SLOT_TIMES,
};

const AppDataContext = createContext(null);

export function AppDataProvider({ children }) {
  const [data, setData] = useState(EMPTY_STATE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setData({ ...EMPTY_STATE, ...JSON.parse(raw) });
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const persist = useCallback((next) => {
    setData(next);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  }, []);

  const setPatient = useCallback(
    (patient) => persist({ ...data, patient }),
    [data, persist]
  );

  const addMedication = useCallback(
    (med) => {
      const record = { id: makeId("med"), order: data.medications.length + 1, ...med };
      persist({ ...data, medications: [...data.medications, record] });
      return record;
    },
    [data, persist]
  );

  const moveMedication = useCallback(
    (id, direction) => {
      const sorted = data.medications.slice().sort((a, b) => a.order - b.order);
      const idx = sorted.findIndex((m) => m.id === id);
      const swapWith = idx + direction;
      if (idx === -1 || swapWith < 0 || swapWith >= sorted.length) return;
      const a = sorted[idx];
      const b = sorted[swapWith];
      persist({
        ...data,
        medications: data.medications.map((m) => {
          if (m.id === a.id) return { ...m, order: b.order };
          if (m.id === b.id) return { ...m, order: a.order };
          return m;
        }),
      });
    },
    [data, persist]
  );

  const updateMedication = useCallback(
    (id, patch) => {
      persist({
        ...data,
        medications: data.medications.map((m) => (m.id === id ? { ...m, ...patch } : m)),
      });
    },
    [data, persist]
  );

  const deleteMedication = useCallback(
    (id) => {
      persist({
        ...data,
        medications: data.medications.filter((m) => m.id !== id),
        rules: data.rules.filter((r) => r.medicationId !== id),
      });
    },
    [data, persist]
  );

  const addRule = useCallback(
    (rule) => {
      const record = { id: makeId("rule"), ...rule };
      persist({ ...data, rules: [...data.rules, record] });
      return record;
    },
    [data, persist]
  );

  const updateRule = useCallback(
    (id, patch) => {
      persist({ ...data, rules: data.rules.map((r) => (r.id === id ? { ...r, ...patch } : r)) });
    },
    [data, persist]
  );

  const deleteRule = useCallback(
    (id) => {
      persist({ ...data, rules: data.rules.filter((r) => r.id !== id) });
    },
    [data, persist]
  );

  const doseKey = (date, slotIndex, medicationId) => `${date}|${slotIndex}|${medicationId}`;

  const markDoseTaken = useCallback(
    (date, slotIndex, medicationId, whenISO) => {
      const key = doseKey(date, slotIndex, medicationId);
      persist({ ...data, doseLogs: { ...data.doseLogs, [key]: whenISO } });
    },
    [data, persist]
  );

  const unmarkDose = useCallback(
    (date, slotIndex, medicationId) => {
      const key = doseKey(date, slotIndex, medicationId);
      const next = { ...data.doseLogs };
      delete next[key];
      persist({ ...data, doseLogs: next });
    },
    [data, persist]
  );

  const getDoseTakenAt = useCallback(
    (date, slotIndex, medicationId) => data.doseLogs[doseKey(date, slotIndex, medicationId)] || null,
    [data]
  );

  const addControl = useCallback(
    (control) => {
      const record = { id: makeId("ctrl"), ...control };
      persist({ ...data, controls: [...data.controls, record] });
      return record;
    },
    [data, persist]
  );

  const deleteControl = useCallback(
    (id) => persist({ ...data, controls: data.controls.filter((c) => c.id !== id) }),
    [data, persist]
  );

  const applySeed = useCallback(
    (seed) => {
      persist({
        ...data,
        patient: seed.patient,
        medications: seed.medications,
        rules: seed.rules,
        controls: seed.controls,
      });
    },
    [data, persist]
  );

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
