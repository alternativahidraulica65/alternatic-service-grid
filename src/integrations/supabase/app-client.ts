import { createClient } from "@supabase/supabase-js";

// BANCO ÚNICO E OFICIAL DO PROJETO.
// Regra permanente: este é o único banco de dados do sistema Alternativa
// Hidráulica. Nenhum outro banco pode ser criado ou utilizado.
export const SUPABASE_URL = "https://mpwnrcxyyeqftrejwmmx.supabase.co";

// Chave publicável (anon) — pode ficar no código, é pública por definição.
const SUPABASE_PUBLISHABLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1wd25yY3h5eWVxZnRyZWp3bW14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY3NDQ5NzIsImV4cCI6MjEwMjMyMDk3Mn0._sokfiP0yjRomA6f4hDTOgBAUgKaNkst8OPdPockh9Y";

const memory = new Map<string, string>();
const resilientStorage = {
  getItem(key: string) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return memory.get(key) ?? null;
    }
  },
  setItem(key: string, value: string) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      memory.set(key, value);
    }
  },
  removeItem(key: string) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      memory.delete(key);
    }
  },
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: resilientStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
