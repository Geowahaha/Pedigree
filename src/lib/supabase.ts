import { createClient } from '@supabase/supabase-js';


// Initialize database client
const supabaseUrl = 'https://rbrdxctnobuohzdxxsua.databasepad.com';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6Ijc0NGIyODQ2LWU4YjctNGFkMC1hYmY4LTE2NTQ0ZTIzNzQwNyJ9.eyJwcm9qZWN0SWQiOiJyYnJkeGN0bm9idW9oemR4eHN1YSIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzY3Mjc1NzM4LCJleHAiOjIwODI2MzU3MzgsImlzcyI6ImZhbW91cy5kYXRhYmFzZXBhZCIsImF1ZCI6ImZhbW91cy5jbGllbnRzIn0.3lIF-LyTZdtvfi7kFfudmvgBh4JgEN3vcLblsfSyCe0';
const supabase = createClient(supabaseUrl, supabaseKey);


export { supabase };