// Supabase connection settings (safe to be public)
const SUPABASE_URL = "https://vqstfkyipljdhpkzbwpv.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_hJ2Vc6iX3B1ONvCaSPrKvA_qly8glgz";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
