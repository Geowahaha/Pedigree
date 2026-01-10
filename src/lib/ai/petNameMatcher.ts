/**
 * Pet Name Entity Matcher
 * 
 * "Simplicity is the ultimate sophistication." - Leonardo da Vinci
 * 
 * This module provides smart entity extraction by matching user input
 * against known pet names in our database. Instead of keyword stripping,
 * we scan the query for any pet name that exists in our system.
 */

import { supabase } from '@/lib/supabase';

// =============================================================================
// TYPES
// =============================================================================

interface PetNameEntry {
    id: string;
    name: string;
    nameLower: string;
    breed?: string;
}

// =============================================================================
// PET NAME CACHE
// =============================================================================

let petNameCache: PetNameEntry[] = [];
let cacheTimestamp: number = 0;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Initialize or refresh the pet name cache from database
 */
export async function refreshPetNameCache(): Promise<void> {
    try {
        const { data, error } = await supabase
            .from('pets')
            .select('id, name, breed')
            .limit(2000);

        if (error) {
            console.error('[PetNameMatcher] Cache refresh error:', error);
            return;
        }

        if (data && data.length > 0) {
            petNameCache = data.map((pet: any) => ({
                id: pet.id,
                name: pet.name || '',
                nameLower: (pet.name || '').normalize('NFKC').toLowerCase(),
                breed: pet.breed
            })).filter(p => p.name.length > 0);

            cacheTimestamp = Date.now();
            console.log(`[PetNameMatcher] Cached ${petNameCache.length} pet names`);

            // Debug: show first 5 names to verify cache
            const sample = petNameCache.slice(0, 5).map(p => p.name);
            console.log(`[PetNameMatcher] Sample names:`, sample);
        }
    } catch (error) {
        console.error('[PetNameMatcher] Cache refresh failed:', error);
    }
}

/**
 * Ensure cache is fresh
 */
async function ensureCacheReady(): Promise<void> {
    if (petNameCache.length === 0 || Date.now() - cacheTimestamp > CACHE_TTL_MS) {
        await refreshPetNameCache();
    }
}

// =============================================================================
// ENTITY EXTRACTION
// =============================================================================

/**
 * Find pet names mentioned in a query string
 * 
 * This scans the query for any substring that matches a pet name in our database.
 * Handles multi-part names like "บุญทุ่ม Boonthum" by checking each part.
 * Returns matches sorted by name length (longest first) to prefer specific matches.
 * 
 * @example
 * // Query: "อยากรู้ว่าบุญทุ่มมีลูกกี่ตัว"
 * // DB has "บุญทุ่ม Boonthum", returns match because "บุญทุ่ม" part is found
 */
export async function findPetNamesInQuery(query: string): Promise<PetNameEntry[]> {
    await ensureCacheReady();

    const queryLower = query.normalize('NFKC').toLowerCase();
    const matches: PetNameEntry[] = [];

    console.log(`[PetNameMatcher] Checking query: "${queryLower}" against ${petNameCache.length} names`);

    // Check each pet name against the query
    for (const pet of petNameCache) {
        if (pet.nameLower.length < 2) continue; // Skip single-char names

        // Split name into parts (handles "บุญทุ่ม Boonthum" style names)
        const nameParts = pet.nameLower.split(/\s+/).filter(part => part.length >= 2);

        // Check if ANY significant part of the name appears in query
        let matched = false;
        for (const part of nameParts) {
            if (queryLower.includes(part)) {
                matched = true;
                break;
            }
        }

        // Also check if full name is contained (for exact matches)
        if (!matched && queryLower.includes(pet.nameLower)) {
            matched = true;
        }

        if (matched) {
            matches.push(pet);
        }
    }

    // Sort by name length descending (prefer longer, more specific names)
    matches.sort((a, b) => b.nameLower.length - a.nameLower.length);

    // Deduplicate by ID
    const seen = new Set<string>();
    const deduped = matches.filter(m => {
        if (seen.has(m.id)) return false;
        seen.add(m.id);
        return true;
    });

    console.log(`[PetNameMatcher] Found ${deduped.length} matches:`, deduped.map(m => m.name));

    return deduped;
}

/**
 * Get the best matching pet name from a query
 * Returns the longest matching name (most specific)
 */
export async function extractBestPetName(query: string): Promise<PetNameEntry | null> {
    const matches = await findPetNamesInQuery(query);
    return matches.length > 0 ? matches[0] : null;
}

/**
 * Check if a specific pet name exists in our database
 */
export async function petNameExists(name: string): Promise<boolean> {
    await ensureCacheReady();
    const nameLower = name.normalize('NFKC').toLowerCase();
    return petNameCache.some(p => p.nameLower === nameLower);
}

/**
 * Get pet names that partially match a query (for autocomplete)
 */
export async function getSuggestedNames(partialQuery: string, limit: number = 5): Promise<PetNameEntry[]> {
    await ensureCacheReady();
    const queryLower = partialQuery.normalize('NFKC').toLowerCase();

    return petNameCache
        .filter(p => p.nameLower.includes(queryLower))
        .slice(0, limit);
}

// =============================================================================
// EXPORTS
// =============================================================================

export const petNameMatcher = {
    refresh: refreshPetNameCache,
    findInQuery: findPetNamesInQuery,
    extractBest: extractBestPetName,
    exists: petNameExists,
    suggest: getSuggestedNames
};

export default petNameMatcher;
