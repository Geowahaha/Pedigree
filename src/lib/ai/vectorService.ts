import { supabase } from '@/lib/supabase';
import { generateEmbedding } from "@/lib";

export interface SemanticSearchResult {
    id: string;
    name: string;
    breed: string;
    description: string;
    similarity: number;
}

// 1. Indexing Function: Call this when creating/updating a pet
// Generates embedding for the pet and saves it to Supabase
export async function indexPet(petId: string, textData: string) {
    console.log(`Indexing pet ${petId}...`);
    const embedding = await generateEmbedding(textData);

    if (embedding) {
        const { error } = await supabase
            .from('pets')
            .update({ description_embedding: embedding })
            .eq('id', petId);

        if (error) console.error('Error saving embedding:', error);
        else console.log(`Pet ${petId} indexed successfully.`);
    } else {
        console.error('Failed to generate embedding.');
    }
}

// 2. Search Function: Performs semantic search
export async function semanticSearch(query: string, threshold = 0.5, limit = 5): Promise<SemanticSearchResult[]> {
    const queryEmbedding = await generateEmbedding(query);

    if (!queryEmbedding) return [];

    const { data, error } = await supabase.rpc('match_pets', {
        query_embedding: queryEmbedding,
        match_threshold: threshold,
        match_count: limit,
    });

    if (error) {
        console.error('Error in semantic search:', error);
        return [];
    }

    return data || [];
}

// 3. Batch Indexing (Utility for Admin)
export async function reindexAllPets() {
    const { data: pets } = await supabase.from('pets').select('id, name, breed, description, color, behavior, gender');
    if (!pets) return;

    let count = 0;
    for (const pet of pets) {
        // Construct a rich text representation for the AI to "read"
        const text = generatePetDescription(pet);

        await indexPet(pet.id, text);
        count++;
    }
    return count;
}

export function generatePetDescription(pet: any): string {
    return `
        Name: ${pet.name}.
        Breed: ${pet.breed}.
        Gender: ${pet.gender}.
        Color: ${pet.color}.
        Description: ${pet.description || 'No description'}.
        Behavior: ${pet.behavior || ''}.
        Location: ${pet.location || ''}.
    `.trim();
}

