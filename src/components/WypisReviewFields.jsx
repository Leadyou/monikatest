import { CAP_LABELS } from "../lib/capColors";
import { CapSwatches, FrequencySeg, EndTypeRadios } from "../pages/LekiPage.jsx";

// Edytowalny przegląd danych odczytanych z wypisu. Operuje wyłącznie na
// lokalnym szkicu (draft/setDraft) — zapis to decyzja komponentu-rodzica,
// dzięki czemu ten sam formularz służy kreatorowi bez logowania i importowi
// do konta. `children` wstawia sekcję rodzica (np. listę już zapisanych
// wizyt) pomiędzy leki a nowe wizyty z wypisu.
export default function WypisReviewFields({ draft, setDraft, children }) {
  function updatePatient(patch) {
    setDraft((d) => ({ ...d, patient: { ...d.patient, ...patch } }));
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

  return (
    <>
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

      {children}

      {draft.controls.length > 0 && (
        <>
          <h3 className="import-section">Wizyty kontrolne z wypisu</h3>
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
    </>
  );
}
