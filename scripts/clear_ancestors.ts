
import { createClient } from '@supabase/supabase-js';

// --- CONFIG ---
const SUPABASE_URL = 'https://zfyhqexkpotdsuhhxsaz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmeWhxZXhrcG90ZHN1aGh4c2F6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0MzAzMTMsImV4cCI6MjA4MzAwNjMxM30.16lo7pQMCeCSdWhEXDLIc1YAzj06GQmKN53EhR4moU0';
const ROOT_PET_NAME = 'บุญพิง';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
    console.log('🧹 Clearing Ancestor Registration Numbers...');

    // 1. Fetch Root
    let { data: roots } = await supabase.from('pets').select('*').ilike('name', `%${ROOT_PET_NAME}%`);
    if (!roots || roots.length === 0) { console.error(`Root "${ROOT_PET_NAME}" not found!`); return; }
    const root = roots[0];
    console.log(`✅ Root Found: ${root.name} (${root.id})`);

    // 2. Fetch ALL pets (Method: In-memory graph is safest)
    const { data: allPets } = await supabase.from('pets').select('id, name, father_id, mother_id, registration_number');
    if (!allPets) return;

    const petMap = new Map(allPets.map(p => [p.id, p]));
    const ancestors = new Set<string>();

    // Recursive function to go UP
    function findAncestors(petId: string) {
        const pet = petMap.get(petId);
        if (!pet) return;

        if (pet.father_id) {
            ancestors.add(pet.father_id);
            findAncestors(pet.father_id);
        }
        if (pet.mother_id) {
            ancestors.add(pet.mother_id);
            findAncestors(pet.mother_id);
        }
    }

    // Start checking from Root's parents
    if (root.father_id) findAncestors(root.father_id);
    if (root.mother_id) findAncestors(root.mother_id);

    console.log(`🔍 Found ${ancestors.size} ancestors to clear.`);

    let clearedCount = 0;
    for (const ancestorId of ancestors) {
        const p = petMap.get(ancestorId);
        if (p && p.registration_number) { // Only clear if it has a number
            // console.log(`   Clearing REG for: ${p.name} (${p.registration_number})`);

            await supabase
                .from('pets')
                .update({ registration_number: null }) // Set to NULL (UI will show 'Waiting Update')
                .eq('id', ancestorId);

            clearedCount++;
        }
    }

    console.log(`✅ Cleared ${clearedCount} ancestors.`);
}

main();
