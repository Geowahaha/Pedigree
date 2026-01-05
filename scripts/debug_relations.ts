
import { createClient } from '@supabase/supabase-js';

// --- CONFIG ---
const SUPABASE_URL = 'https://zfyhqexkpotdsuhhxsaz.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmeWhxZXhrcG90ZHN1aGh4c2F6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0MzAzMTMsImV4cCI6MjA4MzAwNjMxM30.16lo7pQMCeCSdWhEXDLIc1YAzj06GQmKN53EhR4moU0';
const AIRTABLE_API_KEY = 'pat8VZYhxJlcrAS8M.a1c14d5a4977806a6a23014906eefb5089466f01a62b62b301b41809970eb10d';
const AIRTABLE_BASE_ID = 'appGbPuuwf4dlT2Rr';
const AIRTABLE_TABLE_NAME = 'PetName';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function linkParents() {
    console.log('🔗 Linking Parents (Migration Step)...');

    // 1. Fetch Supabase Pets (ID maps)
    const { data: pets, error } = await supabase.from('pets').select('id, name');
    if (error) return console.error(error);

    // Create Name -> ID Map
    const nameToId: Record<string, string> = {};
    pets.forEach(p => nameToId[p.name] = p.id);

    console.log(`   Indexed ${Object.keys(nameToId).length} pets in DB.`);

    // 2. Fetch Airtable Data (to get Father Name / Mother Name)
    console.log('☁️  Fetching Parent info from Airtable...');
    const records = await fetchAllAirtableRecords();

    let linkedCount = 0;

    for (const record of records) {
        const petName = record.fields['A Name'] || record.fields['Name'];
        const petId = nameToId[petName];

        if (!petId) continue; // Pet not in DB

        // Get Parents from Airtable (Assuming they are Linked Records or Strings)
        // Adjust field names based on your screenshot/schema
        const fatherField = record.fields['Father พ่อ'] || record.fields['Father'];
        const motherField = record.fields['Mother แม่'] || record.fields['Mother'];

        let fatherName = '';
        let motherName = '';

        // Handle Linked Records (Array of IDs) - We can't use ID directly, we need to lookup name from that ID if possible
        // BUT! Usually Airtable API returns the Linked Record ID, not the name string directly unless we use lookup fields.
        // However, if the user used simple text for parents, it's easier.

        // Let's assume for now they might be Names or IDs.
        // NOTE: Based on previous tasks, 'บ้าน' was a linked record ID. 'Father' likely is too.
        // If it is an ID, we need to map AirtableRecordID -> Name first.

        // Wait, let's look at what we have in Airtable from previous steps. 
        // We didn't fetch parents before.

        // STRATEGY: 
        // If fatherField is Array (Linked Record), we need to resolve it.
        // Since we don't have a full map of Airtable ID -> Name, we might struggle.
        // BUT, we can check if we can fetch the "Name" column from the Linked Record directly?
        // No, standard API gives IDs.

        // ALTERNATIVE:
        // We already have a list of all records. We can build a map of AirtableID -> Name from the SAME table.
        // (Assuming Father/Mother are in the same 'PetName' table)
    }
}

// Helper to fully map Airtable ID -> Name
async function linkParentsRobust() {
    console.log('🔗 Linking Parents (Robust Mode)...');

    // 1. Fetch ALL Airtable Records first to build ID->Name Map
    // (Assuming Father/Mother are also in 'PetName' table)
    const records = await fetchAllAirtableRecords();
    const airtableIdToName: Record<string, string> = {};

    records.forEach(r => {
        const name = r.fields['A Name'] || r.fields['Name'];
        if (name) airtableIdToName[r.id] = name;
    });

    console.log(`   Mapped ${Object.keys(airtableIdToName).length} Airtable IDs.`);

    // 2. Fetch Supabase Pets (Name -> UUID)
    const { data: pets } = await supabase.from('pets').select('id, name');
    const nameToSupabaseId: Record<string, string> = {};
    pets?.forEach(p => nameToSupabaseId[p.name] = p.id);

    let updates = 0;

    for (const record of records) {
        const petName = record.fields['A Name'] || record.fields['Name'];
        const childUUID = nameToSupabaseId[petName];

        if (!childUUID) continue;

        const fatherVal = record.fields['Father พ่อ']; // Array of IDs usually
        const motherVal = record.fields['Mother แม่'];

        let fatherUUID = null;
        let motherUUID = null;

        // Resolve Father
        if (Array.isArray(fatherVal) && fatherVal.length > 0) {
            const fatherAirtableId = fatherVal[0];
            const fatherName = airtableIdToName[fatherAirtableId];
            if (fatherName) fatherUUID = nameToSupabaseId[fatherName];
        }

        // Resolve Mother
        if (Array.isArray(motherVal) && motherVal.length > 0) {
            const motherAirtableId = motherVal[0];
            const motherName = airtableIdToName[motherAirtableId];
            if (motherName) motherUUID = nameToSupabaseId[motherName];
        }

        if (fatherUUID || motherUUID) {
            // console.log(`   Linking ${petName}: Dad=${fatherUUID ? '✅' : '-'} Mom=${motherUUID ? '✅' : '-'}`);

            const { error } = await supabase
                .from('pets')
                .update({
                    father_id: fatherUUID,
                    mother_id: motherUUID
                })
                .eq('id', childUUID);

            if (!error) updates++;
        }
    }

    console.log(`✅ Linked parents for ${updates} descriptors.`);
}


async function fetchAllAirtableRecords() {
    let allRecords: any[] = [];
    let offset = '';
    do {
        const url: string = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME)}?pageSize=100${offset ? `&offset=${offset}` : ''}`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` } });
        const data = await res.json();
        allRecords = [...allRecords, ...data.records];
        offset = data.offset;
    } while (offset);
    return allRecords;
}

linkParentsRobust();
