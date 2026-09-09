import { createClient } from "@supabase/supabase-js";
import { brokeredPreviewStorage } from "./previewAuthStorage";

const supabaseUrl =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ??
  (typeof process !== "undefined" ? process.env?.["SUPABASE_URL"] : undefined) ??
  "";
const supabasePublishableKey =
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined) ??
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
