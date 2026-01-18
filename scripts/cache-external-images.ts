/**
 * Background Image Cache Script
 * Scans all pets with external (Facebook CDN) images and caches them to Supabase Storage
 * 
 * Run: npx ts-node scripts/cache-external-images.ts
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

// Load env vars
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const isExternalImage = (url: string | null): boolean => {
    if (!url) return false;
    try {
        const parsed = new URL(url);
        return parsed.hostname.toLowerCase().endsWith('fbcdn.net');
    } catch {
        return false;
    }
};

const isSupabaseUrl = (url: string | null): boolean => {
    if (!url || !SUPABASE_URL) return false;
    return url.includes(new URL(SUPABASE_URL).hostname);
};

async function cacheImage(petId: string, imageUrl: string): Promise<{ success: boolean; newUrl?: string }> {
    try {
        // Use the local API endpoint (you need to run the dev server or deploy this)
        const apiUrl = process.env.API_BASE_URL || 'http://localhost:3002';

        const response = await fetch(`${apiUrl}/api/image-cache`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: imageUrl, petId })
        });

        if (!response.ok) {
            console.warn(`  ⚠️ API returned ${response.status}`);
            return { success: false };
        }

        const result = await response.json() as { url: string; cached: boolean };

        if (result.cached && result.url) {
            return { success: true, newUrl: result.url };
        }

        return { success: false };
    } catch (error) {
        console.warn(`  ❌ Error: ${(error as Error).message}`);
        return { success: false };
    }
}

async function main() {
    console.log('🔍 Scanning for uncached external images...\n');

    // Get all pets
    const { data: pets, error } = await supabase
        .from('pets')
        .select('id, name, image_url')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Failed to fetch pets:', error.message);
        process.exit(1);
    }

    // Filter pets with external URLs that aren't already cached
    const uncachedPets = (pets || []).filter(pet =>
        isExternalImage(pet.image_url) && !isSupabaseUrl(pet.image_url)
    );

    console.log(`📊 Found ${pets?.length || 0} total pets`);
    console.log(`🔗 Found ${uncachedPets.length} pets with uncached external images\n`);

    if (uncachedPets.length === 0) {
        console.log('✅ All images are already cached or local!');
        return;
    }

    let successCount = 0;
    let failCount = 0;

    for (const pet of uncachedPets) {
        console.log(`📷 Caching: ${pet.name || pet.id}`);
        console.log(`   URL: ${pet.image_url?.substring(0, 60)}...`);

        const result = await cacheImage(pet.id, pet.image_url!);

        if (result.success) {
            console.log(`   ✅ Cached to Supabase`);
            successCount++;
        } else {
            console.log(`   ❌ Failed to cache`);
            failCount++;
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('\n========================================');
    console.log(`✅ Successfully cached: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log('========================================');
}

main().catch(console.error);
