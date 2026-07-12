import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function LoginScreen({ onBack }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSending(true);
    const { error: authError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.href.split("#")[0] },
    });
    setSending(false);
    if (authError) setError(authError.message);
    else setSent(true);
  }

  return (
    <div className="app-shell">
      <div className="page" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100%" }}>
        <div className="card" style={{ width: "100%", maxWidth: 360 }}>
          {onBack && (
            <button className="link-btn" style={{ marginBottom: 10 }} onClick={onBack}>
              ← Wróć do kreatora
            </button>
          )}
          <h1 className="app-title" style={{ marginBottom: 4 }}>Krople po zaćmie</h1>
          <p style={{ fontSize: 13, color: "var(--ink-soft)", marginBottom: 16 }}>
            Zaloguj się, żeby zobaczyć swój harmonogram.
          </p>
          {sent ? (
            <p style={{ fontSize: 14 }}>
              Wysłaliśmy link logowania na adres <strong>{email}</strong>. Sprawdź skrzynkę (także folder spam) i
              kliknij link, żeby się zalogować.
            </p>
          ) : (
            <form onSubmit={handleSubmit}>
              <label className="field-label">Adres e-mail</label>
              <input
                className="text-input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ty@przyklad.pl"
              />
              {error && <p className="error-text" style={{ marginTop: 10 }}>{error}</p>}
              <button className="btn full" style={{ marginTop: 14 }} type="submit" disabled={sending}>
                {sending ? "Wysyłam…" : "Wyślij link logowania"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
