import { createClient } from '@supabase/supabase-js';


// Initialize database client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.warn('Missing Supabase environment variables. Please check .env or .env.local');
}

const supabase = createClient(supabaseUrl, supabaseKey);


export { supabase };