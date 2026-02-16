import { createClient, SupabaseClient } from "@supabase/supabase-js";

let supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
    if (!supabase) {
        if (
            !process.env.SUPABASE_URL ||
            !process.env.SUPABASE_SERVICE_ROLE_KEY
        ) {
            throw new Error("Supabase credentials are required");
        }
        supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY,
        );
    }
    return supabase;
}
