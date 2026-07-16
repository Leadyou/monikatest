import { useState } from "react";
import { useAppData } from "./lib/store.jsx";
import { useDoseReminders } from "./lib/reminders";
import { supabase } from "./lib/supabaseClient";
import DzisPage from "./pages/DzisPage.jsx";
import LekiPage from "./pages/LekiPage.jsx";
import PrzebiegPage from "./pages/PrzebiegPage.jsx";
import PrintSchedule from "./components/PrintSchedule.jsx";

const TABS = [
  { key: "dzis", label: "Dziś" },
  { key: "leki", label: "Leki" },
  { key: "przebieg", label: "Przebieg" },
];

export default function App() {
  const { data, ready } = useAppData();
  const [tab, setTab] = useState("dzis");

  useDoseReminders(data.medications, data.rules, data.slotTimes);

  if (!ready) {
    return (
      <div className="app-shell">
        <div className="page" />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <h1 className="app-title">Krople po zaćmie</h1>
          <button className="link-btn" style={{ color: "var(--ink-faint)", marginTop: 4 }} onClick={() => supabase.auth.signOut()}>
            Wyloguj
          </button>
        </div>
        <p className="app-subtitle">
          {data.patient?.name ? data.patient.name : "Aplikacja do podawania kropli po operacji zaćmy"}
        </p>
      </header>

      <nav className="tab-bar">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`tab-btn${tab === t.key ? " active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main className="page">
        {tab === "dzis" && <DzisPage onGoToLeki={() => setTab("leki")} />}
        {tab === "leki" && <LekiPage />}
        {tab === "przebieg" && <PrzebiegPage />}
      </main>

      <PrintSchedule />
    </div>
  );
}
