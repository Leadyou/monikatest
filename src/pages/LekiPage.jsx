import { useState } from "react";
import { useAppData } from "../lib/store.jsx";
import { formatShortDatePL } from "../lib/dates";
import { ruleEndDate } from "../lib/schedule";

const CAP_KEYS = ["tan", "pink", "grey", "blue"];
const CAP_VAR = { tan: "var(--cap-tan)", pink: "var(--cap-pink)", grey: "var(--cap-grey)", blue: "var(--cap-blue)" };
const CAP_LABELS = { tan: "Beżowa", pink: "Różowa", grey: "Szara / biała", blue: "Błękitna" };
const END_TYPES = [
  { key: "manual", label: "Do końca opakowania (zamknę ręcznie później)" },
  { key: "days", label: "Po ustalonej liczbie dni" },
  { key: "date", label: "Konkretna data" },
];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function Modal({ title, onClose, children }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button className="close-btn" onClick={onClose} aria-label="Zamknij">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function CapSwatches({ value, onChange }) {
  return (
    <div className="swatch-row">
      {CAP_KEYS.map((key) => (
        <button
          key={key}
          type="button"
          className={`swatch${value === key ? " selected" : ""}`}
          style={{ background: CAP_VAR[key] }}
          title={CAP_LABELS[key]}
          onClick={() => onChange(key)}
        />
      ))}
    </div>
  );
}

function FrequencySeg({ value, onChange }) {
  return (
    <div className="seg">
      {[1, 2, 3, 4].map((n) => (
        <button key={n} type="button" className={value === n ? "active" : ""} onClick={() => onChange(n)}>
          {n}×
        </button>
      ))}
    </div>
  );
}

function EndTypeRadios({ endType, setEndType, endDays, setEndDays, endDate, setEndDate, allowEmptyManualDate }) {
  return (
    <>
      <div className="radio-list">
        {END_TYPES.map((opt) => (
          <button
            key={opt.key}
            type="button"
            className={`radio-item${endType === opt.key ? " active" : ""}`}
            onClick={() => setEndType(opt.key)}
          >
            <span className="radio-dot" />
            {opt.label}
          </button>
        ))}
      </div>
      {endType === "days" && (
        <div style={{ marginTop: 14 }}>
          <label className="field-label">Liczba dni</label>
          <input className="text-input" value={endDays} onChange={(e) => setEndDays(e.target.value)} placeholder="np. 7" inputMode="numeric" />
        </div>
      )}
      {(endType === "date" || (endType === "manual" && allowEmptyManualDate)) && (
        <div style={{ marginTop: 14 }}>
          <label className="field-label">{endType === "date" ? "Data zakończenia (RRRR-MM-DD)" : "Ustalona data końca (opcjonalnie)"}</label>
          <input className="text-input" value={endDate} onChange={(e) => setEndDate(e.target.value)} placeholder="2026-08-10" />
        </div>
      )}
    </>
  );
}

function NewMedicationModal({ onClose }) {
  const { addMedication, addRule } = useAppData();
  const [name, setName] = useState("");
  const [capColor, setCapColor] = useState("tan");
  const [frequency, setFrequency] = useState(4);
  const [startDate, setStartDate] = useState("");
  const [endType, setEndType] = useState("manual");
  const [endDays, setEndDays] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) return setError("Podaj nazwę leku.");
    if (!DATE_RE.test(startDate)) return setError("Data rozpoczęcia w formacie RRRR-MM-DD, np. 2026-07-14.");
    if (endType === "days" && !(Number(endDays) > 0)) return setError("Podaj liczbę dni większą od zera.");
    if (endType === "date" && !DATE_RE.test(endDate)) return setError("Data zakończenia w formacie RRRR-MM-DD.");

    const end =
      endType === "days" ? { type: "days", days: Number(endDays) } : endType === "date" ? { type: "date", date: endDate } : { type: "manual", endDate: null };

    setSaving(true);
    const med = await addMedication({ name: name.trim(), capColor });
    await addRule({ medicationId: med.id, startDate, frequencyPerDay: frequency, end });
    setSaving(false);
    onClose();
  }

  return (
    <Modal title="Nowy lek" onClose={onClose}>
      <label className="field-label">Nazwa leku</label>
      <input className="text-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="np. Hyal-Drop 4S" />

      <label className="field-label" style={{ marginTop: 16 }}>Kolor nakrętki</label>
      <CapSwatches value={capColor} onChange={setCapColor} />

      <label className="field-label" style={{ marginTop: 16 }}>Dawka dzienna</label>
      <FrequencySeg value={frequency} onChange={setFrequency} />

      <label className="field-label" style={{ marginTop: 16 }}>Data rozpoczęcia (RRRR-MM-DD)</label>
      <input className="text-input" value={startDate} onChange={(e) => setStartDate(e.target.value)} placeholder="2026-07-14" />

      <div style={{ marginTop: 16 }}>
        <label className="field-label">Zakończenie</label>
        <EndTypeRadios endType={endType} setEndType={setEndType} endDays={endDays} setEndDays={setEndDays} endDate={endDate} setEndDate={setEndDate} />
      </div>

      {error && <p className="error-text" style={{ marginTop: 14 }}>{error}</p>}
      <button className="btn full" style={{ marginTop: 18 }} onClick={handleSave} disabled={saving}>
        {saving ? "Zapisuję…" : "Zapisz lek"}
      </button>
    </Modal>
  );
}

function RuleModal({ medicationId, rule, onClose }) {
  const { addRule, updateRule } = useAppData();
  const [frequency, setFrequency] = useState(rule?.frequencyPerDay ?? 4);
  const [startDate, setStartDate] = useState(rule?.startDate ?? "");
  const [endType, setEndType] = useState(rule?.end.type ?? "manual");
  const [endDays, setEndDays] = useState(rule?.end.type === "days" ? String(rule.end.days) : "");
  const [endDate, setEndDate] = useState(rule?.end.type === "date" ? rule.end.date : rule?.end.type === "manual" ? rule.end.endDate || "" : "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!DATE_RE.test(startDate)) return setError("Data rozpoczęcia w formacie RRRR-MM-DD.");
    if (endType === "days" && !(Number(endDays) > 0)) return setError("Podaj liczbę dni większą od zera.");
    if (endType === "date" && !DATE_RE.test(endDate)) return setError("Data zakończenia w formacie RRRR-MM-DD.");

    const end =
      endType === "days"
        ? { type: "days", days: Number(endDays) }
        : endType === "date"
          ? { type: "date", date: endDate }
          : { type: "manual", endDate: endDate || null };

    setSaving(true);
    if (rule) {
      await updateRule(rule.id, { startDate, frequencyPerDay: frequency, end });
    } else {
      await addRule({ medicationId, startDate, frequencyPerDay: frequency, end });
    }
    setSaving(false);
    onClose();
  }

  return (
    <Modal title={rule ? "Edytuj etap dawkowania" : "Nowy etap dawkowania"} onClose={onClose}>
      <label className="field-label">Dawka dzienna</label>
      <FrequencySeg value={frequency} onChange={setFrequency} />

      <label className="field-label" style={{ marginTop: 16 }}>Data rozpoczęcia (RRRR-MM-DD)</label>
      <input className="text-input" value={startDate} onChange={(e) => setStartDate(e.target.value)} placeholder="2026-07-14" />

      <div style={{ marginTop: 16 }}>
        <label className="field-label">Zakończenie</label>
        <EndTypeRadios endType={endType} setEndType={setEndType} endDays={endDays} setEndDays={setEndDays} endDate={endDate} setEndDate={setEndDate} allowEmptyManualDate />
      </div>

      {error && <p className="error-text" style={{ marginTop: 14 }}>{error}</p>}
      <button className="btn full" style={{ marginTop: 18 }} onClick={handleSave} disabled={saving}>
        {saving ? "Zapisuję…" : "Zapisz etap"}
      </button>
    </Modal>
  );
}

function MedicationDetailModal({ medicationId, onClose }) {
  const { data, updateMedication, deleteMedication, deleteRule } = useAppData();
  const medication = data.medications.find((m) => m.id === medicationId);
  const [name, setName] = useState(medication?.name ?? "");
  const [ruleModal, setRuleModal] = useState(null); // null | "new" | rule object

  if (!medication) {
    return (
      <Modal title="Edytuj lek" onClose={onClose}>
        <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>Ten lek został usunięty.</p>
      </Modal>
    );
  }

  const rules = data.rules.filter((r) => r.medicationId === medication.id).sort((a, b) => (a.startDate < b.startDate ? -1 : 1));

  async function handleDeleteMedication() {
    if (!window.confirm(`Usunąć ${medication.name} i całe jego dawkowanie?`)) return;
    await deleteMedication(medication.id);
    onClose();
  }

  return (
    <Modal title="Edytuj lek" onClose={onClose}>
      <label className="field-label">Nazwa leku</label>
      <input
        className="text-input"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => name.trim() && updateMedication(medication.id, { name: name.trim() })}
      />

      <label className="field-label" style={{ marginTop: 16 }}>Kolor nakrętki</label>
      <CapSwatches value={medication.capColor} onChange={(key) => updateMedication(medication.id, { capColor: key })} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 22, marginBottom: 8 }}>
        <label className="field-label" style={{ margin: 0 }}>Etapy dawkowania</label>
        <button className="link-btn" onClick={() => setRuleModal("new")}>+ dodaj etap</button>
      </div>

      {rules.length === 0 && <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>Brak etapów — dodaj pierwszy powyżej.</p>}

      {rules.map((r) => {
        const end = ruleEndDate(r);
        return (
          <div key={r.id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button className="link-btn" style={{ color: "var(--ink)", fontWeight: 600, textAlign: "left" }} onClick={() => setRuleModal(r)}>
              <div style={{ fontSize: 13.5 }}>
                {formatShortDatePL(r.startDate)} – {end ? formatShortDatePL(end) : "otwarte"}
              </div>
              <div style={{ fontSize: 12, color: "var(--ink-soft)", fontWeight: 400 }}>{r.frequencyPerDay}× dziennie</div>
            </button>
            <button
              className="link-btn"
              style={{ color: "var(--ink-faint)" }}
              onClick={() => {
                if (window.confirm("Usunąć ten etap dawkowania?")) deleteRule(r.id);
              }}
            >
              Usuń
            </button>
          </div>
        );
      })}

      <button className="btn danger" style={{ marginTop: 20 }} onClick={handleDeleteMedication}>
        Usuń lek całkowicie
      </button>

      {ruleModal === "new" && <RuleModal medicationId={medication.id} rule={null} onClose={() => setRuleModal(null)} />}
      {ruleModal && ruleModal !== "new" && <RuleModal medicationId={medication.id} rule={ruleModal} onClose={() => setRuleModal(null)} />}
    </Modal>
  );
}

export default function LekiPage() {
  const { data, moveMedication } = useAppData();
  const [showNew, setShowNew] = useState(false);
  const [selectedMedId, setSelectedMedId] = useState(null);

  const meds = data.medications.slice().sort((a, b) => a.order - b.order);

  return (
    <div>
      <button className="btn full" style={{ marginBottom: 14 }} onClick={() => setShowNew(true)}>
        + Dodaj lek
      </button>

      {meds.length === 0 && <p className="empty-state">Brak leków. Dodaj pierwszy przyciskiem powyżej.</p>}

      {meds.map((med, i) => {
        const rules = data.rules.filter((r) => r.medicationId === med.id).sort((a, b) => (a.startDate < b.startDate ? -1 : 1));
        return (
          <div key={med.id} className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <button className="link-btn" style={{ color: "var(--ink)", display: "flex", alignItems: "center", gap: 8 }} onClick={() => setSelectedMedId(med.id)}>
                <span className="dot" style={{ width: 16, height: 16, background: CAP_VAR[med.capColor] }} />
                <span style={{ fontSize: 16, fontWeight: 700 }}>{med.name}</span>
              </button>
              <div style={{ display: "flex", gap: 6 }}>
                <button className="link-btn" style={{ color: i === 0 ? "var(--border)" : "var(--ink-soft)" }} disabled={i === 0} onClick={() => moveMedication(med.id, -1)}>
                  ↑
                </button>
                <button
                  className="link-btn"
                  style={{ color: i === meds.length - 1 ? "var(--border)" : "var(--ink-soft)" }}
                  disabled={i === meds.length - 1}
                  onClick={() => moveMedication(med.id, 1)}
                >
                  ↓
                </button>
              </div>
            </div>
            {rules.length === 0 ? (
              <span style={{ fontSize: 12.5, color: "var(--ink-faint)" }}>Brak ustalonego dawkowania</span>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {rules.map((r) => {
                  const end = ruleEndDate(r);
                  return (
                    <span key={r.id} className="pill">
                      {formatShortDatePL(r.startDate)} – {end ? formatShortDatePL(end) : "?"} · {r.frequencyPerDay}×
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {showNew && <NewMedicationModal onClose={() => setShowNew(false)} />}
      {selectedMedId && <MedicationDetailModal medicationId={selectedMedId} onClose={() => setSelectedMedId(null)} />}
    </div>
  );
}
