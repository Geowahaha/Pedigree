
import { createClient } from '@supabase/supabase-js';

// --- CONFIG ---
const SUPABASE_URL = 'https://zfyhqexkpotdsuhhxsaz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmeWhxZXhrcG90ZHN1aGh4c2F6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0MzAzMTMsImV4cCI6MjA4MzAwNjMxM30.16lo7pQMCeCSdWhEXDLIc1YAzj06GQmKN53EhR4moU0';
const ROOT_PET_NAME = 'บุญพิง';
const LINEAGE_CODE = 'BOONPING';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
    try {
        console.log('🧬 Starting Smart Lineage Generation (Final V2)...');

        // 0. RESET ALL REGISTRATION NUMBERS
        console.log(`   🧹 Resetting registration numbers...`);
        await supabase.from('pets').update({ registration_number: null }).neq('id', '00000000-0000-0000-0000-000000000000'); // Update all
        console.log(`   ✅ Reset complete.`);


        // 1. Fetch Root
        let { data: roots } = await supabase.from('pets').select('*').ilike('name', `%${ROOT_PET_NAME}%`);
        if (!roots || roots.length === 0) { console.error(`Root "${ROOT_PET_NAME}" not found!`); return; }
        const root = roots[0];
        console.log(`✅ Root Found: ${root.name}`);

        // 2. Fetch ALL pets
        const { data: allPets } = await supabase.from('pets').select('id, name, father_id, mother_id, birthday');
        if (!allPets) return;

        // 3. Build Graph
        const childrenMap: Record<string, typeof allPets> = {};
        allPets.forEach(p => {
            // Add to Father's list
            if (p.father_id) {
                if (!childrenMap[p.father_id]) childrenMap[p.father_id] = [];
                childrenMap[p.father_id].push(p);
            }
            // Add to Mother's list
            if (p.mother_id) {
                if (!childrenMap[p.mother_id]) childrenMap[p.mother_id] = [];
                childrenMap[p.mother_id].push(p);
            }
        });

        // 4. Traverse
        let updateCount = 0;
        const padGen = (n: number) => n.toString().padStart(2, '0');
        const padRun = (n: number) => n.toString().padStart(3, '0');

        // Track processed IDs to avoid duplicates (One pet can have both Dad and Mom in the tree)
        const processedIds = new Set<string>();

        // Also track running numbers PER GENERATION
        // Gen 2: 1, 2, 3...
        const genCounter: Record<number, number> = {};

        async function traverse(currentPetId: string, generation: number) {
            // Find children
            let children = childrenMap[currentPetId] || [];

            // Filter out already processed children!
            children = children.filter(c => !processedIds.has(c.id));

            // Remove duplicates within the current list (in case same parent ID listed twice?)
            // (Unlikely from DB logic, but good safety)
            children = [...new Map(children.map(item => [item.id, item])).values()];

            // Sort by Age
            children.sort((a, b) => {
                const dateA = new Date(a.birthday || '2025-01-01').getTime();
                const dateB = new Date(b.birthday || '2025-01-01').getTime();
                return dateA - dateB;
            });

            for (const child of children) {
                if (processedIds.has(child.id)) continue; // Double check

                const nextGen = generation + 1;

                // Initialize counter for this gen if needed
                if (!genCounter[nextGen]) genCounter[nextGen] = 1;

                const runningNum = genCounter[nextGen];
                const regNum = `TRD-${LINEAGE_CODE}-${padGen(nextGen)}-${padRun(runningNum)}`;

                console.log(`   🔸 Gen ${nextGen}: ${child.name} -> ${regNum}`);

                const { error: upErr } = await supabase
                    .from('pets')
                    .update({ registration_number: regNum })
                    .eq('id', child.id);

                if (upErr) {
                    console.error(`      ❌ Update Error for ${child.name}: ${upErr.message}`);
                } else {
                    updateCount++;
                    processedIds.add(child.id); // Mark as done!
                }

                // Increment for next sibling in this gen
                genCounter[nextGen]++;

                // Recurse
                await traverse(child.id, nextGen);
            }
        }

        // Set Root ID
        console.log(`   🔹 Gen 0: ${root.name} -> TRD-${LINEAGE_CODE}-00-001 (ROOT)`);
        await supabase.from('pets').update({ registration_number: `TRD-${LINEAGE_CODE}-00-001` }).eq('id', root.id);
        processedIds.add(root.id);

        await traverse(root.id, 0);

        console.log(`\n✅ Lineage Generation Complete. Updated ${updateCount} pets.`);
    } catch (err: any) {
        console.error('💥 CRASHED:', err.message);
    }
}

main();
