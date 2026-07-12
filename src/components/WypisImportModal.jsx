import { useState } from "react";
import { useAppData } from "../lib/store.jsx";
import { supabase } from "../lib/supabaseClient";
import { CAP_COLORS, CAP_LABELS } from "../lib/capColors";
import { Modal, CapSwatches, FrequencySeg, EndTypeRadios } from "../pages/LekiPage.jsx";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1] || "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function emptyEndFields(rule) {
  return {
    endType: rule.endType,
    endDays: rule.endDays != null ? String(rule.endDays) : "",
    endDate: rule.endDate || "",
  };
}

export default function WypisImportModal({ onClose }) {
  const { importWypis } = useAppData();
  const [step, setStep] = useState("upload"); // upload | loading | review | saving
  const [error, setError] = useState("");
  const [draft, setDraft] = useState(null);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setStep("loading");
    try {
      const pdfBase64 = await fileToBase64(file);
      const { data: result, error: fnError } = await supabase.functions.invoke("parse-wypis", {
        body: { pdfBase64 },
      });
      if (fnError) throw fnError;
      if (result?.error) throw new Error(result.error);

      setDraft({
        patient: result.patient || { name: "", surgeryDate: "", eye: "" },
        medications: (result.medications || []).map((m) => ({ ...m, removed: false })),
        rules: (result.rules || []).map((r) => ({ ...r, ...emptyEndFields(r), removed: false })),
        notes: result.notes || "",
      });
      setStep("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się przetworzyć pliku.");
      setStep("upload");
    }
  }

  function updateMed(key, patch) {
    setDraft((d) => ({ ...d, medications: d.medications.map((m) => (m.key === key ? { ...m, ...patch } : m)) }));
  }

  function updateRule(index, patch) {
    setDraft((d) => ({ ...d, rules: d.rules.map((r, i) => (i === index ? { ...r, ...patch } : r)) }));
  }

  function updatePatient(patch) {
    setDraft((d) => ({ ...d, patient: { ...d.patient, ...patch } }));
  }

  async function handleConfirm() {
    setError("");
    const activeMeds = draft.medications.filter((m) => !m.removed && m.name.trim());
    if (activeMeds.length === 0) return setError("Brak leków do zapisania.");

    for (const r of draft.rules) {
      if (r.removed) continue;
      if (!activeMeds.some((m) => m.key === r.medicationKey)) continue;
      if (!DATE_RE.test(r.startDate)) return setError(`Popraw datę rozpoczęcia dla reguły leku "${r.medicationKey}".`);
      if (r.endType === "days" && !(Number(r.endDays) > 0)) return setError("Podaj liczbę dni większą od zera dla każdej reguły z typem 'dni'.");
      if (r.endType === "date" && !DATE_RE.test(r.endDate)) return setError("Popraw datę zakończenia (RRRR-MM-DD) w regułach.");
    }

    setStep("saving");
    try {
      await importWypis(draft);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się zapisać danych.");
      setStep("review");
    }
  }

  return (
    <Modal title="Wczytaj leki z wypisu" onClose={onClose}>
      {step === "upload" && (
        <>
          <p style={{ fontSize: 13, color: "var(--ink-soft)", marginBottom: 14 }}>
            Wgraj skan lub PDF wypisu ze szpitala. AI spróbuje odczytać leki i dawkowanie — na następnym ekranie
            będzie można wszystko sprawdzić i poprawić przed zapisaniem.
          </p>
          <input type="file" accept="application/pdf" onChange={handleFile} />
          {error && <p className="error-text" style={{ marginTop: 14 }}>{error}</p>}
        </>
      )}

      {step === "loading" && <p style={{ fontSize: 14 }}>Analizuję dokument…</p>}

      {step === "review" && draft && (
        <>
          <p className="field-label">Dane pacjenta</p>
          <input
            className="text-input"
            style={{ marginBottom: 8 }}
            value={draft.patient.name || ""}
            onChange={(e) => updatePatient({ name: e.target.value })}
            placeholder="Imię i nazwisko"
          />
          <div style={{ display: "flex", gap: 8 }}>
            <input
              className="text-input"
              value={draft.patient.surgeryDate || ""}
              onChange={(e) => updatePatient({ surgeryDate: e.target.value })}
              placeholder="Data zabiegu RRRR-MM-DD"
            />
            <input
              className="text-input"
              value={draft.patient.eye || ""}
              onChange={(e) => updatePatient({ eye: e.target.value })}
              placeholder="lewe / prawe / oba"
            />
          </div>

          {draft.notes && (
            <p style={{ fontSize: 12.5, color: "var(--amber)", marginTop: 12 }}>Uwaga AI: {draft.notes}</p>
          )}

          <p className="field-label" style={{ marginTop: 20 }}>Leki</p>
          {draft.medications.map((m) => (
            <div key={m.key} className="card" style={{ opacity: m.removed ? 0.4 : 1 }}>
              <input
                className="text-input"
                style={{ marginBottom: 8 }}
                value={m.name}
                onChange={(e) => updateMed(m.key, { name: e.target.value })}
              />
              <CapSwatches value={m.capColorGuess} onChange={(v) => updateMed(m.key, { capColorGuess: v })} />
              <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "var(--ink-faint)" }}>{CAP_LABELS[m.capColorGuess]}</span>
                <button className="link-btn" style={{ color: "var(--ink-faint)" }} onClick={() => updateMed(m.key, { removed: !m.removed })}>
                  {m.removed ? "Cofnij usunięcie" : "Usuń"}
                </button>
              </div>

              {draft.rules
                .map((r, i) => ({ ...r, _index: i }))
                .filter((r) => r.medicationKey === m.key)
                .map((r) => (
                  <div key={r._index} className="card" style={{ background: "var(--surface-soft)", marginTop: 10, opacity: r.removed ? 0.4 : 1 }}>
                    <FrequencySeg value={r.frequencyPerDay} onChange={(v) => updateRule(r._index, { frequencyPerDay: v })} />
                    <label className="field-label" style={{ marginTop: 12 }}>Data rozpoczęcia</label>
                    <input
                      className="text-input"
                      value={r.startDate}
                      onChange={(e) => updateRule(r._index, { startDate: e.target.value })}
                      placeholder="RRRR-MM-DD"
                    />
                    <div style={{ marginTop: 12 }}>
                      <EndTypeRadios
                        endType={r.endType}
                        setEndType={(v) => updateRule(r._index, { endType: v })}
                        endDays={r.endDays}
                        setEndDays={(v) => updateRule(r._index, { endDays: v })}
                        endDate={r.endDate}
                        setEndDate={(v) => updateRule(r._index, { endDate: v })}
                        allowEmptyManualDate
                      />
                    </div>
                    <button
                      className="link-btn"
                      style={{ color: "var(--ink-faint)", marginTop: 10 }}
                      onClick={() => updateRule(r._index, { removed: !r.removed })}
                    >
                      {r.removed ? "Cofnij usunięcie etapu" : "Usuń ten etap"}
                    </button>
                  </div>
                ))}
            </div>
          ))}

          {error && <p className="error-text" style={{ marginTop: 14 }}>{error}</p>}
          <button className="btn full" style={{ marginTop: 18 }} onClick={handleConfirm}>
            Zapisz do aplikacji
          </button>
        </>
      )}

      {step === "saving" && <p style={{ fontSize: 14 }}>Zapisuję…</p>}
    </Modal>
  );
}
