import { useMemo, useState } from "react";
import { checkWypisFile, parseWypisPdf, draftFromResult, validateDraft, draftToData } from "../lib/wypis";
import { computePhases, scheduleHorizon } from "../lib/schedule";
import { formatShortDatePL } from "../lib/dates";
import WypisReviewFields from "../components/WypisReviewFields.jsx";
import { PrintScheduleView } from "../components/PrintSchedule.jsx";

const STEP_LABELS = {
  upload: "Krok 1 z 3 — wgraj wypis",
  review: "Krok 2 z 3 — sprawdź dane",
  result: "Krok 3 z 3 — harmonogram gotowy",
};

// Publiczny kreator "wypis → wydruk": działa bez logowania, wszystkie dane
// żyją tylko w pamięci przeglądarki i znikają po zamknięciu karty. Jedyny
// ruch sieciowy to wysłanie PDF-a do odczytania zaleceń.
export default function KreatorPage({ onLoginClick }) {
  const [step, setStep] = useState("choice"); // choice | upload | loading | review | result
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

  function handleShowSchedule() {
    const validationError = validateDraft(draft);
    if (validationError) return setError(validationError);
    setError("");
    setStep("result");
    window.scrollTo(0, 0);
  }

  const data = useMemo(() => (step === "result" && draft ? draftToData(draft) : null), [step, draft]);
  const phases = useMemo(() => {
    if (!data || data.rules.length === 0) return [];
    const horizon = scheduleHorizon(data.rules);
    return computePhases(data.medications, data.rules, horizon.from, horizon.to);
  }, [data]);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <h1 className="app-title">Krople po zaćmie</h1>
          <button className="btn" style={{ padding: "10px 18px", fontSize: 16, flexShrink: 0 }} onClick={onLoginClick}>
            Zaloguj się
          </button>
        </div>
        <p className="app-subtitle">Pomoc w podawaniu kropli po operacji zaćmy</p>
      </header>

      <main className="page">
        {step === "choice" && (
          <>
            <p className="import-intro" style={{ marginTop: 6 }}>
              Co chcesz zrobić?
            </p>

            <button type="button" className="choice-card" onClick={() => { setError(""); setStep("upload"); }}>
              <h2 className="choice-title">🖨 Wydrukować harmonogram na papierze</h2>
              <p className="choice-desc">
                Wgrywasz wypis ze szpitala, a my zamieniamy go na czytelną tabelę z kratkami do odhaczania —
                do powieszenia np. na lodówce. Bez zakładania konta.
              </p>
              <span className="choice-go">Zacznij tutaj →</span>
            </button>

            <button type="button" className="choice-card" onClick={onLoginClick}>
              <h2 className="choice-title">📱 Aplikację, która pilnuje dawek</h2>
              <p className="choice-desc">
                Codzienna lista kropli do odhaczania na telefonie i komputerze, wspólna dla całej rodziny.
                Logowanie e-mailem — bez hasła.
              </p>
              <span className="choice-go">Zaloguj się →</span>
            </button>
          </>
        )}

        {step !== "choice" && step !== "loading" && (
          <p style={{ fontSize: 15, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 12 }}>
            {STEP_LABELS[step]}
          </p>
        )}

        {step === "upload" && (
          <>
            <p className="import-intro">
              Wgraj wypis ze szpitala (PDF), sprawdź odczytane zalecenia i wydrukuj gotowy harmonogram — z
              kratkami do odhaczania, kolorami nakrętek i miejscem na podpis.
            </p>
            <label className="import-file-label">
              Wybierz plik PDF z wypisem
              <input type="file" accept="application/pdf" onChange={handleFile} />
            </label>
            <p style={{ fontSize: 15, color: "var(--ink-faint)", marginTop: 12, lineHeight: 1.5 }}>
              Dokument służy wyłącznie do odczytania zaleceń — nie zapisujemy go ani żadnych danych na serwerze.
            </p>
            {error && <p className="error-text import-error" style={{ marginTop: 14 }}>{error}</p>}
            <button className="link-btn" style={{ marginTop: 16 }} onClick={() => setStep("choice")}>
              ← Wróć do wyboru
            </button>
          </>
        )}

        {step === "loading" && (
          <div className="import-loading">
            <div className="import-spinner" />
            <p className="import-loading-text">
              Analizuję dokument…
              <br />
              To może potrwać nawet minutę. Nie zamykaj tej strony.
            </p>
          </div>
        )}

        {step === "review" && draft && (
          <>
            <p className="import-intro" style={{ marginBottom: 6 }}>
              Sprawdź, czy wszystko się zgadza z wypisem. Każde pole można poprawić.
            </p>
            <WypisReviewFields draft={draft} setDraft={setDraft} />
            {error && <p className="error-text import-error" style={{ marginTop: 14 }}>{error}</p>}
            <button className="btn full" style={{ marginTop: 22, fontSize: 18, padding: "16px" }} onClick={handleShowSchedule}>
              Pokaż harmonogram
            </button>
          </>
        )}

        {step === "result" && data && (
          <>
            <p className="import-intro">
              Harmonogram obejmuje {phases.length === 1 ? "1 fazę" : `${phases.length} fazy`} leczenia. Wydrukuj go
              albo zapisz jako PDF (w oknie drukowania wybierz „Zapisz jako PDF”).
            </p>

            {phases.map((phase, i) => (
              <div key={i} className="card">
                <div style={{ fontSize: 14.5, fontWeight: 700, color: "var(--ink-faint)" }}>
                  {formatShortDatePL(phase.startDate)} – {formatShortDatePL(phase.endDate)}
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>Faza {i + 1}</div>
                <div style={{ fontSize: 16, color: "var(--ink-soft)", marginTop: 2 }}>{phase.summary}</div>
              </div>
            ))}

            <button className="btn full" style={{ marginTop: 10, fontSize: 18, padding: "16px" }} onClick={() => window.print()}>
              Drukuj harmonogram (PDF)
            </button>
            <button className="btn ghost full" style={{ marginTop: 10 }} onClick={() => { setStep("review"); setError(""); }}>
              Wróć do poprawek
            </button>

            <div className="card" style={{ marginTop: 24, borderLeft: "3px solid var(--accent)", padding: "18px 18px 16px" }}>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Chcesz, żeby aplikacja pilnowała dawek?</div>
              <p style={{ fontSize: 16, color: "var(--ink-soft)", margin: "0 0 14px", lineHeight: 1.5 }}>
                Po zalogowaniu dostaniesz codzienną listę dawek do odhaczania, wspólną na komputerze i telefonie.
                Wystarczy adres e-mail — bez hasła.
              </p>
              <button className="btn" onClick={onLoginClick}>Załóż konto / zaloguj się</button>
            </div>

            <p style={{ fontSize: 15, color: "var(--ink-faint)", marginTop: 18, lineHeight: 1.5 }}>
              Harmonogram powstał na podstawie odczytu wypisu przez AI — przed użyciem porównaj go z oryginalnymi
              zaleceniami lekarza. W razie wątpliwości skontaktuj się z przychodnią.
            </p>
          </>
        )}
      </main>

      {data && <PrintScheduleView data={data} />}
    </div>
  );
}
