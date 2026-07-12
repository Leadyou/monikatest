import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import LoginScreen from "./LoginScreen.jsx";
import KreatorPage from "../pages/KreatorPage.jsx";

export default function AuthGate({ children }) {
  const [session, setSession] = useState(undefined); // undefined = ładowanie, null = wylogowany
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return (
      <div className="app-shell">
        <div className="page" />
      </div>
    );
  }

  if (!session) {
    // Bez logowania: publiczny kreator "wypis → wydruk"; logowanie na życzenie.
    return showLogin ? (
      <LoginScreen onBack={() => setShowLogin(false)} />
    ) : (
      <KreatorPage onLoginClick={() => setShowLogin(true)} />
    );
  }

  return children;
}
