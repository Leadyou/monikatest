import { useState } from "react";
import { useAppData } from "../lib/store.jsx";
import { supabase } from "../lib/supabaseClient";
import { CAP_COLORS, CAP_LABELS } from "../lib/capColors";
import { Modal, CapSwatches, FrequencySeg, EndTypeRadios } from "../pages/LekiPage.jsx";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15 MB — większe skany potrafią zawiesić słabszy telefon

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1] || "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function withTimeout(promise, ms, message) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function emptyEndFields(rule) {
  return {
    endType: rule.endType,
    endDays: rule.endDays != null ? String(rule.endDays) : "",
    endDate: rule.endDate || "",
  };
}

export default function WypisImportModal({ onClose }) {
  const { data, importWypis, deleteControl } = useAppData();
  const [step, setStep] = useState("upload"); // upload | loading | review | saving
  const [error, setError] = useState("");
  const [draft, setDraft] = useState(null);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    if (file.size > MAX_FILE_BYTES) {
      setError(
        `Plik jest za duży (${(file.size / (1024 * 1024)).toFixed(1)} MB, limit to 15 MB) — na telefonie może zawiesić przeglądarkę. Zeskanuj dokument w niższej jakości albo zrób zwykłe zdjęcie zamiast wielostronicowego skanu.`
      );
      e.target.value = "";
      return;
    }
    setStep("loading");
    try {
      const pdfBase64 = await withTimeout(fileToBase64(file), 30_000, "Nie udało się odczytać pliku. Spróbuj ponownie.");
      const { data: result, error: fnError } = await withTimeout(
        supabase.functions.invoke("parse-wypis", { body: { pdfBase64 } }),
        90_000,
        "Połączenie trwało zbyt długo. Sprawdź internet (najlepiej Wi-Fi) i spróbuj ponownie."
      );
      if (fnError) {
        const body = await fnError.context?.json?.().catch(() => null);
        throw new Error(body?.error || fnError.message);
      }
      if (result?.error) throw new Error(result.error);

      setDraft({
        patient: result.patient || { name: "", surgeryDate: "", eye: "" },
        medications: (result.medications || []).map((m) => ({ ...m, removed: false })),
        rules: (result.rules || []).map((r) => ({ ...r, ...emptyEndFields(r), removed: false })),
        controls: (result.controls || []).map((c) => ({ ...c, removed: false })),
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

  function updateControl(index, patch) {
    setDraft((d) => ({ ...d, controls: d.controls.map((c, i) => (i === index ? { ...c, ...patch } : c)) }));
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

    for (const c of draft.controls) {
      if (c.removed) continue;
      if (!c.label.trim()) return setError("Podaj opis dla każdej wizyty kontrolnej (albo ją usuń).");
      if (!c.datetime) return setError("Podaj datę i godzinę dla każdej wizyty kontrolnej (albo ją usuń).");
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
    <Modal title="Wczytaj leki z wypisu" onClose={onClose} wide>
      {step === "upload" && (
        <>
          <p className="import-intro">
            Wgraj skan lub PDF wypisu ze szpitala. AI spróbuje odczytać leki i dawkowanie — na następnym ekranie
            będzie można wszystko sprawdzić i poprawić przed zapisaniem.
          </p>
          <label className="import-file-label">
            Wybierz plik PDF z wypisem
            <input type="file" accept="application/pdf" onChange={handleFile} />
          </label>
          {error && <p className="error-text import-error" style={{ marginTop: 14 }}>{error}</p>}
        </>
      )}

      {step === "loading" && (
        <div className="import-loading">
          <div className="import-spinner" />
          <p className="import-loading-text">
            Analizuję dokument…
            <br />
            To może potrwać nawet minutę. Nie zamykaj tego okna.
          </p>
        </div>
      )}

      {step === "review" && draft && (
        <>
          <p className="import-intro" style={{ marginBottom: 6 }}>
            Sprawdź, czy wszystko się zgadza z wypisem. Każde pole można poprawić przed zapisaniem.
          </p>

          <h3 className="import-section">Dane pacjenta</h3>
          <label className="import-label">Imię</label>
          <input
            className="text-input import-input"
            value={draft.patient.name || ""}
            onChange={(e) => updatePatient({ name: e.target.value })}
            placeholder="Imię"
          />
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 180 }}>
              <label className="import-label">Data zabiegu</label>
              <input
                className="text-input import-input"
                value={draft.patient.surgeryDate || ""}
                onChange={(e) => updatePatient({ surgeryDate: e.target.value })}
                placeholder="RRRR-MM-DD"
              />
            </div>
            <div style={{ flex: 1, minWidth: 180 }}>
              <label className="import-label">Operowane oko</label>
              <input
                className="text-input import-input"
                value={draft.patient.eye || ""}
                onChange={(e) => updatePatient({ eye: e.target.value })}
                placeholder="lewe / prawe / oba"
              />
            </div>
          </div>

          {draft.notes && (
            <p style={{ fontSize: 15, lineHeight: 1.5, color: "var(--amber)", marginTop: 14 }}>
              ⚠ Uwaga AI: {draft.notes}
            </p>
          )}

          <h3 className="import-section">Leki i dawkowanie</h3>
          {draft.medications.map((m) => (
            <div key={m.key} className="card" style={{ padding: "18px 18px 16px", opacity: m.removed ? 0.4 : 1 }}>
              <label className="import-label" style={{ marginTop: 0 }}>Nazwa leku</label>
              <input
                className="text-input import-input"
                style={{ marginBottom: 12 }}
                value={m.name}
                onChange={(e) => updateMed(m.key, { name: e.target.value })}
              />
              <label className="import-label">Kolor nakrętki</label>
              <CapSwatches value={m.capColorGuess} onChange={(v) => updateMed(m.key, { capColorGuess: v })} />
              <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 14, color: "var(--ink-soft)" }}>{CAP_LABELS[m.capColorGuess]}</span>
                <button className="link-btn" style={{ fontSize: 14, color: "var(--ink-faint)" }} onClick={() => updateMed(m.key, { removed: !m.removed })}>
                  {m.removed ? "Cofnij usunięcie" : "Usuń lek"}
                </button>
              </div>

              {draft.rules
                .map((r, i) => ({ ...r, _index: i }))
                .filter((r) => r.medicationKey === m.key)
                .map((r) => (
                  <div key={r._index} className="card" style={{ background: "var(--surface-soft)", padding: "16px", marginTop: 12, marginBottom: 0, opacity: r.removed ? 0.4 : 1 }}>
                    <label className="import-label" style={{ marginTop: 0 }}>Ile razy dziennie</label>
                    <FrequencySeg value={r.frequencyPerDay} onChange={(v) => updateRule(r._index, { frequencyPerDay: v })} />
                    <label className="import-label">Data rozpoczęcia</label>
                    <input
                      className="text-input import-input"
                      value={r.startDate}
                      onChange={(e) => updateRule(r._index, { startDate: e.target.value })}
                      placeholder="RRRR-MM-DD"
                    />
                    <label className="import-label">Zakończenie</label>
                    <EndTypeRadios
                      endType={r.endType}
                      setEndType={(v) => updateRule(r._index, { endType: v })}
                      endDays={r.endDays}
                      setEndDays={(v) => updateRule(r._index, { endDays: v })}
                      endDate={r.endDate}
                      setEndDate={(v) => updateRule(r._index, { endDate: v })}
                      allowEmptyManualDate
                    />
                    <button
                      className="link-btn"
                      style={{ fontSize: 14, color: "var(--ink-faint)", marginTop: 12 }}
                      onClick={() => updateRule(r._index, { removed: !r.removed })}
                    >
                      {r.removed ? "Cofnij usunięcie etapu" : "Usuń ten etap"}
                    </button>
                  </div>
                ))}
            </div>
          ))}

          {data.controls.length > 0 && (
            <>
              <h3 className="import-section">Obecne wizyty w aplikacji</h3>
              <p className="import-section-hint">
                Import nie podmienia automatycznie starych wizyt — jeśli któraś jest nieaktualna, usuń ją ręcznie.
              </p>
              {data.controls.map((c) => (
                <div key={c.id} className="card" style={{ padding: "16px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>{c.label}</div>
                    <div style={{ fontSize: 14.5, color: "var(--ink-soft)", marginTop: 2 }}>
                      {new Date(c.datetime).toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric" })} ·{" "}
                      {new Date(c.datetime).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })}
                      {c.location ? ` · ${c.location}` : ""}
                    </div>
                  </div>
                  <button
                    className="link-btn"
                    style={{ fontSize: 14, color: "var(--ink-faint)", flexShrink: 0 }}
                    onClick={() => {
                      if (window.confirm(`Usunąć wizytę „${c.label}”?`)) deleteControl(c.id);
                    }}
                  >
                    Usuń
                  </button>
                </div>
              ))}
            </>
          )}

          {draft.controls.length > 0 && (
            <>
              <h3 className="import-section">Nowe wizyty z wypisu</h3>
              {draft.controls.map((c, i) => (
                <div key={i} className="card" style={{ padding: "18px 18px 16px", opacity: c.removed ? 0.4 : 1 }}>
                  <label className="import-label" style={{ marginTop: 0 }}>Opis wizyty</label>
                  <input
                    className="text-input import-input"
                    value={c.label}
                    onChange={(e) => updateControl(i, { label: e.target.value })}
                    placeholder="np. Kontrola po tygodniu"
                  />
                  <label className="import-label">Data i godzina</label>
                  <input
                    className="text-input import-input"
                    type="datetime-local"
                    value={c.datetime ? c.datetime.slice(0, 16) : ""}
                    onChange={(e) => updateControl(i, { datetime: e.target.value })}
                  />
                  <label className="import-label">Placówka (opcjonalnie)</label>
                  <input
                    className="text-input import-input"
                    value={c.location || ""}
                    onChange={(e) => updateControl(i, { location: e.target.value })}
                    placeholder="np. Poradnia okulistyczna"
                  />
                  <div style={{ marginTop: 12, textAlign: "right" }}>
                    <button className="link-btn" style={{ fontSize: 14, color: "var(--ink-faint)" }} onClick={() => updateControl(i, { removed: !c.removed })}>
                      {c.removed ? "Cofnij usunięcie" : "Usuń wizytę"}
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}

          {error && <p className="error-text import-error" style={{ marginTop: 14 }}>{error}</p>}
          <button className="btn full" style={{ marginTop: 22, fontSize: 17, padding: "15px 16px" }} onClick={handleConfirm}>
            Zapisz do aplikacji
          </button>
        </>
      )}

      {step === "saving" && (
        <div className="import-loading">
          <div className="import-spinner" />
          <p className="import-loading-text">Zapisuję…</p>
        </div>
      )}
    </Modal>
  );
}
