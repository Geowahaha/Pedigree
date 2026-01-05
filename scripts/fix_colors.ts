
import { createClient } from '@supabase/supabase-js';

// Hardcoded configs
const SUPABASE_URL = 'https://zfyhqexkpotdsuhhxsaz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmeWhxZXhrcG90ZHN1aGh4c2F6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0MzAzMTMsImV4cCI6MjA4MzAwNjMxM30.16lo7pQMCeCSdWhEXDLIc1YAzj06GQmKN53EhR4moU0';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Standard colors
const VALID_COLORS = ['Red', 'Dark Red', 'Black', 'Blue', 'Gray', 'Silver Pink', 'Fawn', 'White', 'Cream', 'Brindle'];
// Note: User said specific Thai Ridgeback colors are: Red, Dark Red, Black, Gray, Silver Pink.
// We will force anything NOT in this strict list to 'Dark Red'.

const STRICT_VALID_COLORS = ['Red', 'Dark Red', 'Black', 'Gray', 'Silver Pink'];

async function fixColorsToDarkRed() {
    console.log('🎨 Batch updating colors to "Dark Red"...');

    // 1. Get all pets
    const { data: pets, error } = await supabase.from('pets').select('id, name, color');
    if (error) return console.error(error);

    let updatedCount = 0;

    for (const pet of pets) {
        let shouldUpdate = false;

        // Check if color is missing OR invalid (e.g. Blue, Fawn, null)
        if (!pet.color || !STRICT_VALID_COLORS.includes(pet.color)) {
            shouldUpdate = true;
        }

        if (shouldUpdate) {
            // console.log(`   Fixing ${pet.name}: ${pet.color || 'null'} -> Dark Red`);

            const { error: updateError } = await supabase
                .from('pets')
                .update({ color: 'Dark Red' })
                .eq('id', pet.id);

            if (!updateError) updatedCount++;
        }
    }

    console.log(`✅ Updated ${updatedCount} pets to "Dark Red".`);
}

fixColorsToDarkRed();
