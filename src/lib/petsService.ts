/**
 * Supabase Pets Service
 * Full CRUD operations for pets using Supabase
 * Replaces Airtable as primary database
 */

import { supabase } from './supabase';
import { Pet } from '@/data/petData';

export interface CreatePetInput {
    name: string;
    breed: string;
    gender?: 'male' | 'female';
    birthday?: string;
    weight?: number;
    color?: string;
    location?: string;
    image_url?: string;
    mother_id?: string;
    father_id?: string;
    owner_id?: string;
    medical_history?: string;
    notes?: string;
    description?: string;
    price?: number;
    for_sale?: boolean;
}

/**
 * Create a new pet
 */
export async function createPet(input: CreatePetInput): Promise<Pet> {
    const { data, error } = await supabase
        .from('pets')
        .insert([input])
        .select('*')
        .single();

    if (error) throw new Error(`Failed to create pet: ${error.message}`);
    return mapSupabasePetToPet(data);
}

/**
 * Get pet by ID with parent information
 */
export async function getPetById(id: string): Promise<Pet | null> {
    const { data, error } = await supabase
        .from('pets_with_parents')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw new Error(`Failed to get pet: ${error.message}`);
    }

    return mapSupabasePetToPet(data);
}

/**
 * Search pets by name or breed
 */
export async function searchPets(query: string, limit: number = 20): Promise<Pet[]> {
    if (!query || query.trim() === '') {
        return getRandomPets(limit);
    }

    const { data, error } = await supabase
        .from('pets')
        .select('*, owner:profiles!owner_id(full_name, email, verified_breeder)')
        .or(`name.ilike.%${query}%,breed.ilike.%${query}%`)
        .limit(limit);

    if (error) throw new Error(`Search failed: ${error.message}`);
    return data.map(mapSupabasePetToPet);
}

/**
 * Get random pets
 */
export async function getRandomPets(limit: number = 6): Promise<Pet[]> {
    const { data, error } = await supabase
        .from('pets')
        .select('*, owner:profiles!owner_id(full_name, email, verified_breeder)')
        .limit(limit)
        .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to get pets: ${error.message}`);
    return data.map(mapSupabasePetToPet);
}

/**
 * Get pets for sale
 */
export async function getPetsForSale(limit: number = 20): Promise<Pet[]> {
    const { data, error } = await supabase
        .from('pets')
        .select('*, owner:profiles!owner_id(full_name, email, verified_breeder)')
        .eq('for_sale', true)
        .eq('available', true)
        .limit(limit)
        .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to get pets for sale: ${error.message}`);
    return data.map(mapSupabasePetToPet);
}

/**
 * Update pet
 */
export async function updatePet(id: string, updates: Partial<CreatePetInput>): Promise<Pet> {
    const { data, error } = await supabase
        .from('pets')
        .update(updates)
        .eq('id', id)
        .select('*')
        .single();

    if (error) throw new Error(`Failed to update pet: ${error.message}`);
    return mapSupabasePetToPet(data);
}

/**
 * Delete pet
 */
export async function deletePet(id: string): Promise<void> {
    const { error } = await supabase
        .from('pets')
        .delete()
        .eq('id', id);

    if (error) throw new Error(`Failed to delete pet: ${error.message}`);
}

export async function getPedigreeTree(petId: string, maxDepth: number = 5): Promise<any> {
    async function fetchTree(id: string, depth: number): Promise<any> {
        // Only depth limit - allow same pet in multiple branches
        if (depth > maxDepth) {
            return null;
        }

        // Query pets table directly to get mother_id and father_id
        const { data, error } = await supabase
            .from('pets')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !data) {
            return null;
        }

        const tree: any = mapSupabasePetToPet(data);

        // Recursively fetch parents
        if (data.mother_id) {
            tree.mother = await fetchTree(data.mother_id, depth + 1);
        }

        if (data.father_id) {
            tree.father = await fetchTree(data.father_id, depth + 1);
        }

        return tree;
    }

    return await fetchTree(petId, 0);
}

/**
 * Generate registration number using Supabase function
 */
export async function generateRegistrationNumber(
    motherName?: string,
    fatherName?: string,
    motherId?: string,
    fatherId?: string
): Promise<string> {
    const { data, error } = await supabase.rpc('generate_registration_number', {
        p_mother_name: motherName || null,
        p_father_name: fatherName || null,
        p_mother_id: motherId || null,
        p_father_id: fatherId || null,
    });

    if (error) {
        console.error('Failed to generate registration number:', error);
        // Fallback
        const m = motherName ? motherName.substring(0, 2).toUpperCase() : 'UN';
        const f = fatherName ? fatherName.substring(0, 2).toUpperCase() : 'UN';
        return `${m}-${f}-G1-001`;
    }

    return data;
}

/**
 * Map Supabase pet to Pet interface
 */
function mapSupabasePetToPet(data: any): Pet {
    // Sanitize type based on breed
    const breedLower = (data.breed || '').toLowerCase();
    let finalType: 'dog' | 'cat' = data.type || 'dog';

    if (breedLower.includes('dog') || breedLower.includes('hura') || breedLower.includes('หมา') || breedLower.includes('สุนัข') || breedLower.includes('retriever') || breedLower.includes('shepherd') || breedLower.includes('terrier')) {
        finalType = 'dog';
    } else if (breedLower.includes('cat') || breedLower.includes('แมว') || breedLower.includes('persian') || breedLower.includes('shorthair') || breedLower.includes('maine coon')) {
        finalType = 'cat';
    }

    return {
        id: data.id,
        name: data.name,
        breed: data.breed,
        type: finalType,
        gender: data.gender || 'male',
        birthDate: data.birthday,
        age: calculateAge(data.birthday),
        weight: data.weight || 0,
        color: data.color || '',
        location: data.location || 'Thailand',
        registrationNumber: data.registration_number,
        image: data.image_url || '', // Empty string if missing, let UI handle fallback
        // Prioritize: 1. Profile Name (if joined) 2. Legacy Airtable Name 3. ID 4. Unknown
        owner: data.owner?.full_name || data.owner_name || 'Unknown',
        owner_id: data.owner_id, // Important for chat!
        price: data.price || 0,
        available: data.available ?? true,
        for_sale: data.for_sale ?? false,
        verified: data.verified ?? false,
        description: data.description || '',
        medicalHistory: data.medical_history,
        healthCertified: data.verified,
        parentIds: {
            dam: data.mother_id,
            sire: data.father_id,
        },
        isOwnerVerified: data.verified,
    };
}

/**
 * Calculate age from birthday
 */
function calculateAge(birthday?: string): number {
    if (!birthday) return 0;
    const birthDate = new Date(birthday);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    return Math.max(0, age);
}

/**
 * Get direct children (offspring) of a pet
 */
export async function getPetOffspring(petId: string): Promise<Pet[]> {
    const { data, error } = await supabase
        .from('pets')
        .select('*')
        .or(`father_id.eq.${petId},mother_id.eq.${petId}`)
        .order('birthday', { ascending: false });

    if (error) {
        console.error('Error fetching offspring:', error);
        return [];
    }

    return (data || []).map(mapSupabasePetToPet);
}
