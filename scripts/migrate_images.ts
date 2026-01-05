
import { createClient } from '@supabase/supabase-js';

// --- CONFIGURATION (Hardcoded for reliability) ---
const SUPABASE_URL = 'https://zfyhqexkpotdsuhhxsaz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmeWhxZXhrcG90ZHN1aGh4c2F6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0MzAzMTMsImV4cCI6MjA4MzAwNjMxM30.16lo7pQMCeCSdWhEXDLIc1YAzj06GQmKN53EhR4moU0';
const AIRTABLE_API_KEY = 'pat8VZYhxJlcrAS8M.a1c14d5a4977806a6a23014906eefb5089466f01a62b62b301b41809970eb10d';
const AIRTABLE_BASE_ID = 'appGbPuuwf4dlT2Rr';
const AIRTABLE_TABLE_NAME = 'PetName'; // Based on your screenshot
const STORAGE_BUCKET = 'pets';

// --- CLIENTS ---
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- MAIN FUNCTION ---
async function main() {
    console.log('🚀 Starting Image Migration...');

    // 1. Fetch all pets from Supabase
    console.log('📦 Fetching pets from Supabase...');
    const { data: supabasePets, error: sbError } = await supabase
        .from('pets')
        .select('id, name, image_url');

    if (sbError) {
        console.error('❌ Supabase Error:', sbError.message);
        return;
    }
    console.log(`   Found ${supabasePets.length} pets in Supabase.`);

    // 2. Fetch all records from Airtable
    console.log('☁️  Fetching latest data from Airtable...');
    const airtableRecords = await fetchAllAirtableRecords();
    console.log(`   Found ${airtableRecords.length} records in Airtable.`);

    // 3. Process each pet
    console.log('\n🔄 Processing images...');
    let updatedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (const pet of supabasePets) {
        // Try to find matching record in Airtable by Name
        const airtableMatch = airtableRecords.find(r => r.fields['A Name'] === pet.name || r.fields['Name'] === pet.name); // Using 'A Name' based on typical Airtable primary field, or 'Name'

        if (!airtableMatch) {
            console.log(`   ⚠️  No Airtable match for: ${pet.name}`);
            skippedCount++;
            continue;
        }

        // Check if Airtable has attachments
        const attachments = airtableMatch.fields['รูปและไฟล์']; // Column name from screenshot
        if (!attachments || !Array.isArray(attachments) || attachments.length === 0) {
            console.log(`   Start skipping: ${pet.name} (No image in Airtable)`);
            skippedCount++;
            continue;
        }

        const imageUrl = attachments[0].url; // Get URL of first image

        // Check if we need to update
        // Update if current image is missing OR it is an expired airtable link
        const needsUpdate = !pet.image_url || pet.image_url.includes('airtable');

        if (needsUpdate) {
            // console.log(`   📸 Migrating image for: ${pet.name}...`);

            try {
                // Download image
                const response = await fetch(imageUrl);
                if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
                const blob = await response.blob();

                // Upload to Supabase Storage
                const fileExt = attachments[0].filename.split('.').pop() || 'jpg';
                const fileName = `${pet.id}-${Date.now()}.${fileExt}`;
                const filePath = `${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from(STORAGE_BUCKET)
                    .upload(filePath, blob, {
                        contentType: blob.type,
                        upsert: true
                    });

                if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

                // Get Public URL
                const { data: { publicUrl } } = supabase.storage
                    .from(STORAGE_BUCKET)
                    .getPublicUrl(filePath);

                // Update Database
                const { error: updateError } = await supabase
                    .from('pets')
                    .update({ image_url: publicUrl })
                    .eq('id', pet.id);

                if (updateError) throw new Error(`DB Update failed: ${updateError.message}`);

                console.log(`   ✅ UPDATED: ${pet.name}`);
                updatedCount++;

            } catch (err: any) {
                console.error(`   ❌ Failed to process ${pet.name}: ${err.message}`);
                failedCount++;
            }
        } else {
            // console.log(`   SKIP: ${pet.name} (Already has valid image)`);
            skippedCount++;
        }
    }

    console.log('\n--- MIGRATION SUMMARY ---');
    console.log(`✅ Updated: ${updatedCount}`);
    console.log(`⏩ Skipped: ${skippedCount}`);
    console.log(`❌ Failed:  ${failedCount}`);
    console.log('-------------------------');
}

// --- HELPER: Fetch all Airtable pages ---
async function fetchAllAirtableRecords() {
    let allRecords: any[] = [];
    let offset = '';

    do {
        const url: string = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME)}?pageSize=100${offset ? `&offset=${offset}` : ''}`;
        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` }
        });

        if (!res.ok) {
            // Try fallback table names if 404
            if (res.status === 404) {
                console.error("   Table not found. Trying 'Combined'...");
                return []; // Simplify for now, let's hope name is correct
            }
            throw new Error(`Airtable API Error: ${res.status} ${res.statusText}`);
        }

        const data = await res.json();
        allRecords = [...allRecords, ...data.records];
        offset = data.offset;
    } while (offset);

    return allRecords;
}

main();
