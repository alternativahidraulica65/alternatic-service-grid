import { createClient } from "@supabase/supabase-js";
import { brokeredPreviewStorage } from "./previewAuthStorage";

const env = import.meta.env as Record<string, string | undefined>;

const supabaseUrl =
  env['VITE_SUPABASE_URL'] ??
  (typeof process !== "undefined" ? process.env?.["SUPABASE_URL"] : undefined) ??
  "";
const supabasePublishableKey =
  env['VITE_SUPABASE_PUBLISHABLE_KEY'] ??
  (typeof process !== "undefined" ? process.env?.["SUPABASE_PUBLISHABLE_KEY"] : undefined) ??
  "";

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage: brokeredPreviewStorage(),
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
