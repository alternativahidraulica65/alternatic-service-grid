import { createClient } from "@supabase/supabase-js";

// Banco de dados oficial da empresa (Alternativa Hidráulica).
const supabaseUrl = "https://mpwnrcxyyeqftrejwmmx.supabase.co";
const supabasePublishableKey = "sb_publishable_H3jMZYabk8lKGsmmBGo-fg_DbkPUkGD";


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
