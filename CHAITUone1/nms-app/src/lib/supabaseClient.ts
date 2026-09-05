import { createClient, SupabaseClient } from "@supabase/supabase-js";

export const createServerClient = (): SupabaseClient =>
  createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export const createBrowserClient = (): SupabaseClient =>
  createClient(
    // prefer VITE_ variables for Vite builds; fallback to SUPABASE_URL
    (import.meta.env.VITE_SUPABASE_URL as string) || (process.env.SUPABASE_URL as string),
    (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || (process.env.SUPABASE_ANON_KEY as string)
  );
