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
        <div className="card" style={{ width: "100%", maxWidth: 430, padding: "22px 22px 26px" }}>
          {onBack && (
            <button className="link-btn" style={{ marginBottom: 12 }} onClick={onBack}>
              ← Wróć
            </button>
          )}
          <h1 className="app-title" style={{ marginBottom: 4 }}>Krople po zaćmie</h1>
          <p style={{ fontSize: 16.5, color: "var(--ink-soft)", marginBottom: 18, lineHeight: 1.5 }}>
            Podaj swój adres e-mail — wyślemy Ci link, którym zalogujesz się bez hasła.
          </p>
          {sent ? (
            <p style={{ fontSize: 17, lineHeight: 1.55 }}>
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
