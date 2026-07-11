import { createClient } from "@supabase/supabase-js";

// Klucz "publishable" jest bezpieczny do umieszczenia w kodzie klienta —
// dostęp do danych kontroluje Row Level Security w bazie, nie tajność klucza.
const SUPABASE_URL = "https://rhmbjqqyixruymdkflox.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_MzkPtRf3NUBZixdBs0NX1A_k4CGYvGf";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
