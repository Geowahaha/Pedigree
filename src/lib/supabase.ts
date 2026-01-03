import { createClient } from '@supabase/supabase-js';


// Initialize database client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
    console.warn('Missing Supabase environment variables. Please check .env.local');
}

const supabase = createClient(supabaseUrl, supabaseKey);


export { supabase };