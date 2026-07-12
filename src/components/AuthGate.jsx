import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import LoginScreen from "./LoginScreen.jsx";

export default function AuthGate({ children }) {
  const [session, setSession] = useState(undefined); // undefined = ładowanie, null = wylogowany

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

  if (!session) return <LoginScreen />;

  return children;
}
