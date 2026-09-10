import { createClient } from "@supabase/supabase-js";

// Banco único do app (Lovable Cloud) — mesma fonte exibida no painel de banco de dados.
const supabaseUrl = import.meta.env['VITE_SUPABASE_URL'] as string;
const supabasePublishableKey = import.meta.env['VITE_SUPABASE_PUBLISHABLE_KEY'] as string;


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
