import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

// Logowanie 6-cyfrowym kodem z e-maila (zamiast klikania w link).
// Link z maila otwierał się w innej przeglądarce niż ta, w której senior
// używa aplikacji (np. wewnątrz Gmaila), przez co sesja lądowała nie tam,
// gdzie trzeba. Kod przepisany w tym samym oknie nie ma tego problemu.

function polishAuthError(message) {
  if (!message) return "Coś poszło nie tak. Spróbuj ponownie.";
  if (/expired|invalid|not found/i.test(message)) {
    return "Kod jest nieprawidłowy albo wygasł. Sprawdź, czy wpisane cyfry zgadzają się z e-mailem, albo wyślij nowy kod.";
  }
  if (/security purposes|once every|rate limit/i.test(message)) {
    return "Nowy kod można wysłać dopiero po chwili. Odczekaj minutę i spróbuj ponownie.";
  }
  return message;
}

export default function LoginScreen({ onBack }) {
  const [step, setStep] = useState("email"); // email | code
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  async function sendCode() {
    setError("");
    setBusy(true);
    const { error: authError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      // Link w mailu zostaje jako droga zapasowa, gdyby ktoś wolał kliknąć.
      options: { emailRedirectTo: window.location.href.split("#")[0] },
    });
    setBusy(false);
    if (authError) {
      setError(polishAuthError(authError.message));
      return false;
    }
    return true;
  }

  async function handleSendEmail(e) {
    e.preventDefault();
    setInfo("");
    if (await sendCode()) {
      setCode("");
      setStep("code");
    }
  }

  async function handleResend() {
    setInfo("");
    if (await sendCode()) {
      setCode("");
      setInfo("Wysłaliśmy nowy kod. Poprzedni kod przestał działać.");
    }
  }

  async function handleVerify(e) {
    e.preventDefault();
    setError("");
    setInfo("");
    // Długość kodu zależy od ustawień projektu Supabase (6–10 cyfr),
    // więc nie zakładamy konkretnej liczby — sprawdzamy tylko minimum.
    const token = code.replace(/\D/g, "");
    if (token.length < 6) {
      setError("Kod jest za krótki — sprawdź, czy przepisane są wszystkie cyfry z e-maila.");
      return;
    }
    setBusy(true);
    const { error: authError } = await supabase.auth.verifyOtp({ email: email.trim(), token, type: "email" });
    setBusy(false);
    if (authError) setError(polishAuthError(authError.message));
    // Po udanej weryfikacji AuthGate sam przełączy widok na aplikację.
  }

  return (
    <div className="app-shell">
      <div className="page" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100%" }}>
        <div className="card" style={{ width: "100%", maxWidth: 430, padding: "22px 22px 26px" }}>
          {step === "email" && onBack && (
            <button className="link-btn" style={{ marginBottom: 12 }} onClick={onBack}>
              ← Wróć
            </button>
          )}
          {step === "code" && (
            <button className="link-btn" style={{ marginBottom: 12 }} onClick={() => { setStep("email"); setError(""); setInfo(""); }}>
              ← Zmień adres e-mail
            </button>
          )}
          <h1 className="app-title" style={{ marginBottom: 4 }}>Krople po zaćmie</h1>

          {step === "email" && (
            <>
              <p style={{ fontSize: 16.5, color: "var(--ink-soft)", marginBottom: 18, lineHeight: 1.5 }}>
                Podaj swój adres e-mail — wyślemy Ci 6-cyfrowy kod, którym zalogujesz się bez hasła.
              </p>
              <form onSubmit={handleSendEmail}>
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
                <button className="btn full" style={{ marginTop: 14 }} type="submit" disabled={busy}>
                  {busy ? "Wysyłam…" : "Wyślij kod"}
                </button>
              </form>
            </>
          )}

          {step === "code" && (
            <>
              <p style={{ fontSize: 16.5, color: "var(--ink-soft)", marginBottom: 18, lineHeight: 1.55 }}>
                Wysłaliśmy 6-cyfrowy kod na adres <strong>{email}</strong>. Kod jest w tytule wiadomości — przepisz
                go poniżej. Masz na to godzinę, nie musisz się spieszyć.
              </p>
              <form onSubmit={handleVerify}>
                <label className="field-label">Kod z e-maila</label>
                <input
                  className="text-input"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={13}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="123456"
                  style={{ fontSize: 30, letterSpacing: 8, textAlign: "center", fontVariantNumeric: "tabular-nums" }}
                />
                {error && <p className="error-text" style={{ marginTop: 10 }}>{error}</p>}
                {info && <p style={{ fontSize: 15, color: "var(--green)", marginTop: 10 }}>{info}</p>}
                <button className="btn full" style={{ marginTop: 14 }} type="submit" disabled={busy}>
                  {busy ? "Sprawdzam…" : "Zaloguj się"}
                </button>
              </form>
              <button className="link-btn" style={{ marginTop: 16 }} onClick={handleResend} disabled={busy}>
                Nie przyszedł e-mail? Wyślij nowy kod
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
