
import { createClient } from '@supabase/supabase-js';

// --- CONFIGURATION ---
const SUPABASE_URL = 'https://zfyhqexkpotdsuhhxsaz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmeWhxZXhrcG90ZHN1aGh4c2F6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0MzAzMTMsImV4cCI6MjA4MzAwNjMxM30.16lo7pQMCeCSdWhEXDLIc1YAzj06GQmKN53EhR4moU0';
const AIRTABLE_API_KEY = 'pat8VZYhxJlcrAS8M.a1c14d5a4977806a6a23014906eefb5089466f01a62b62b301b41809970eb10d';
const AIRTABLE_BASE_ID = 'appGbPuuwf4dlT2Rr';
const AIRTABLE_PETS_TABLE = 'PetName';
const AIRTABLE_HOUSE_TABLE = 'บ้าน'; // Try exact Thai name first

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
    console.log('🚀 Starting Metadata Migration V2 (Fixing Record IDs)...');

    // 1. Fetch House/Breeder Names Mapping
    console.log('🏠 Fetching House/Breeder names from Airtable...');
    const houseMap = await fetchHouseMap();
    console.log(`   Mapped ${Object.keys(houseMap).length} houses.`);

    // 2. Fetch Supabase Pets
    const { data: supabasePets, error } = await supabase.from('pets').select('id, name, owner_name');
    if (error) { console.error('Supabase Error:', error); return; }
    console.log(`📦 Found ${supabasePets.length} pets in Supabase.`);

    // 3. Fetch Airtable Records
    console.log('☁️  Fetching Pet data from Airtable...');
    const airtableRecords = await fetchAllAirtableRecords(AIRTABLE_PETS_TABLE);

    // 4. Process Updates
    let updatedCount = 0;

    for (const pet of supabasePets) {
        const match = airtableRecords.find(r => r.fields['A Name'] === pet.name || r.fields['Name'] === pet.name);

        if (match) {
            // Get "บ้าน" field (which is an array of Record IDs)
            const houseIds = match.fields['บ้าน'];

            if (houseIds && Array.isArray(houseIds) && houseIds.length > 0) {
                // Map ID to Real Name
                const houseId = houseIds[0];
                const realHouseName = houseMap[houseId] || houseId; // Fallback to ID if name not found

                // Update if different
                if (realHouseName && realHouseName !== pet.owner_name) {
                    const { error: updateError } = await supabase
                        .from('pets')
                        .update({ owner_name: realHouseName })
                        .eq('id', pet.id);

                    if (updateError) {
                        console.error(`   ❌ Failed to update ${pet.name}: ${updateError.message}`);
                    } else {
                        console.log(`   ✅ FIXED: ${pet.name} -> ${realHouseName}`);
                        updatedCount++;
                    }
                }
            }
        }
    }

    console.log(`\n✅ Migration Complete. Fixed ${updatedCount} owner names.`);
}

// Map Record ID -> Name
async function fetchHouseMap() {
    const map: Record<string, string> = {};
    try {
        const records = await fetchAllAirtableRecords(AIRTABLE_HOUSE_TABLE);
        records.forEach(r => {
            // Assume the primary field is 'Name' or 'ชื่อบ้าน' or similar. 
            // We inspect the fields to find the most likely name.
            let name = r.fields['Name'] || r.fields['name'] || r.fields['ชื่อ'] || r.fields['House'] || Object.values(r.fields)[0];
            if (typeof name === 'string') {
                map[r.id] = name;
            }
        });
    } catch (e) {
        console.error("   ⚠️ Could not fetch 'บ้าน' table. Is the name correct?");
        console.error("   Error:", e.message);
    }
    return map;
}

async function fetchAllAirtableRecords(tableName: string) {
    let allRecords: any[] = [];
    let offset = '';
    do {
        const url: string = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(tableName)}?pageSize=100${offset ? `&offset=${offset}` : ''}`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` } });
        if (!res.ok) throw new Error(`Airtable Error (${tableName}): ${res.statusText}`);
        const data = await res.json();
        allRecords = [...allRecords, ...data.records];
        offset = data.offset;
    } while (offset);
    return allRecords;
}

main();
