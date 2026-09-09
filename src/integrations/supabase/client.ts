import { createClient } from "@supabase/supabase-js";

// Banco de dados oficial da empresa (Alternativa Hidráulica).
const supabaseUrl = "https://mpwnrcxyyeqftrejwmmx.supabase.co";
const supabasePublishableKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wd25yY3h5eWVxZnRyZWp3bW14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY3NDQ5NzIsImV4cCI6MjEwMjMyMDk3Mn0._sokfiP0yjRomA6f4hDTOgBAUgKaNkst8OPdPockh9Y";


const memory = new Map<string, string>();
const resilientStorage = {
  getItem(key: string) {
    try { return window.localStorage.getItem(key); } catch { return memory.get(key) ?? null; }
  },
  setItem(key: string, value: string) {
    try { window.localStorage.setItem(key, value); } catch { memory.set(key, value); }
  },
  removeItem(key: string) {
    try { window.localStorage.removeItem(key); } catch { memory.delete(key); }
  },
};

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage: resilientStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
