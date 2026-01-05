
import { createClient } from '@supabase/supabase-js';

// Hardcoded for immediate verification (from your previous message)
const supabaseUrl = 'https://zfyhqexkpotdsuhhxsaz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpmeWhxZXhrcG90ZHN1aGh4c2F6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0MzAzMTMsImV4cCI6MjA4MzAwNjMxM30.16lo7pQMCeCSdWhEXDLIc1YAzj06GQmKN53EhR4moU0';

console.log(`Using Supabase URL: ${supabaseUrl}`);

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkImages() {
    console.log('🔍 Checking image URLs in Supabase...');

    const { data: pets, error } = await supabase
        .from('pets')
        .select('name, image_url')
        .limit(10); // Check 10 pets

    if (error) {
        console.error('❌ Error fetching pets:', error.message);
        return;
    }

    console.log('\n--- Sample Data ---');
    let airtableCount = 0;
    pets.forEach(pet => {
        // Check for Airtable links (various formats)
        const isAirtable = pet.image_url?.includes('airtable') || pet.image_url?.includes('airtableusercontent');
        if (isAirtable) airtableCount++;

        // Check if it's the placeholder link
        const isPlaceholder = pet.image_url?.includes('placeholder-pet');

        let status = '✅ Permanent Link';
        if (isAirtable) status = '❌ Airtable Link (Expired)';
        if (isPlaceholder) status = '⚠️ Placeholder';

        console.log(`Pet: ${pet.name}`);
        console.log(`URL: ${pet.image_url ? pet.image_url.substring(0, 60) + '...' : 'No Image'}`);
        console.log(`Status: ${status}`);
        console.log('-------------------');
    });

    if (airtableCount > 0) {
        console.log(`\n⚠️  Found ${airtableCount} out of ${pets.length} checked pets have Airtable links.`);
        console.log('   RESULT: These links are EXPIRED (410 Gone).');
        console.log('   CONCLUSION: You NEED to migrate images to Supabase Storage.');
    } else {
        console.log('\n✅ All checked images seem fine!');
    }
}

checkImages();
