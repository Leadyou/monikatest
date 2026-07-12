import { useState } from "react";
import { useAppData } from "../lib/store.jsx";
import { checkWypisFile, parseWypisPdf, draftFromResult, validateDraft } from "../lib/wypis";
import { Modal } from "../pages/LekiPage.jsx";
import WypisReviewFields from "./WypisReviewFields.jsx";

export default function WypisImportModal({ onClose }) {
  const { data, importWypis, deleteControl } = useAppData();
  const [step, setStep] = useState("upload"); // upload | loading | review | saving
  const [error, setError] = useState("");
  const [draft, setDraft] = useState(null);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    const sizeError = checkWypisFile(file);
    if (sizeError) {
      setError(sizeError);
      e.target.value = "";
      return;
    }
    setStep("loading");
    try {
      const result = await parseWypisPdf(file);
      setDraft(draftFromResult(result));
      setStep("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się przetworzyć pliku.");
      setStep("upload");
    }
  }

  async function handleConfirm() {
    const validationError = validateDraft(draft);
    if (validationError) return setError(validationError);
    setError("");
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

          <WypisReviewFields draft={draft} setDraft={setDraft}>
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
          </WypisReviewFields>

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
