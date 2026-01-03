
import fetch from 'node-fetch';
import fs from 'fs';

const BASE_ID = 'appGbPuuwf4dlT2Rr';
const TABLE_NAME = 'PetName';
const TOKEN = 'patTvh6zVYJxC3g4p.141ab6d7874981d391e33f4866bbd4f51936577ac99b49c17509e91d006326ce';

async function fetchAirtable() {
    console.log(`Fetching from https://api.airtable.com/v0/${BASE_ID}/${TABLE_NAME} with token prefix ${TOKEN.substring(0, 5)}...`);
    try {
        const response = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_NAME}`, {
            headers: {
                'Authorization': `Bearer ${TOKEN}`
            }
        });

        if (!response.ok) {
            console.error(`Error: ${response.status} ${response.statusText}`);
            const text = await response.text();
            console.error('Response body:', text);
            return;
        }

        const data = await response.json();
        console.log(`Success! Fetched ${data.records.length} records.`);

        // Log the first record to see structure
        if (data.records.length > 0) {
            console.log('First record structure:', JSON.stringify(data.records[0].fields, null, 2));
        }

        fs.writeFileSync('src/data/airtable_pets.json', JSON.stringify(data, null, 2));
        console.log('Saved to src/data/airtable_pets.json');
    } catch (error) {
        console.error('Fetch failed:', error);
    }
}

fetchAirtable();
