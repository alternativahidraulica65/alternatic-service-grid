import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Cliente privilegiado (somente servidor). Nunca importar em código de navegador.
const SUPABASE_URL = process.env['SUPABASE_URL']!;
const SUPABASE_SERVICE_ROLE_KEY = process.env['EXTERNAL_SUPABASE_SECRET_KEY']!;

export const supabaseAdmin = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
