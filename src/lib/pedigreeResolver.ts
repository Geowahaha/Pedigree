/**
 * Pedigree Resolver - Infinite Family Tree Generator
 * Recursively fetches all ancestors from Airtable
 * Compatible with existing PedigreeTree component
 */

import { airtableClient, AirtablePet } from './airtable';
import { Pet } from '@/data/petData';

export interface PedigreeNode {
    id: string;
    name: string;
    breed: string;
    gender: 'male' | 'female';
    image: string;
    registrationNumber?: string;
    birthday?: string;
    weight?: number;
    color?: string;
    location?: string;
    parentIds?: {
        sire?: string;  // Father
        dam?: string;   // Mother
    };
    airtableId: string;
    raw?: AirtablePet; // Keep original data if needed
}

/**
 * Map Airtable pet to Pedigree Node format
 */
function mapAirtableToPedigreeNode(airtablePet: AirtablePet): PedigreeNode {
    const fields = airtablePet.fields;

    // Extract image URL from Airtable attachments
    const imageUrl = fields['รูปและไฟล์']?.[0]?.url || '/placeholder-pet.jpg';

    // Extract parent IDs
    const motherId = fields['Mother แม่']?.[0];
    const fatherId = fields['Father พ่อ']?.[0];

    return {
        id: airtablePet.id,
        name: fields.Name || 'Unknown',
        breed: fields.Breed || 'Unknown',
        gender: fields['Gender เพศ']?.toLowerCase() === 'female' ? 'female' : 'male',
        image: imageUrl,
        registrationNumber: fields['หมายเลข ID'],
        birthday: fields.Birthday,
        weight: fields.Weight,
        color: '', // Not in Airtable schema, set default
        location: fields['บ้าน']?.[0] || 'Unknown', // Will need to fetch home details if needed
        airtableId: airtablePet.id,
        parentIds: {
            sire: fatherId,
            dam: motherId,
        },
        raw: airtablePet,
    };
}

/**
 * Build complete pedigree tree with infinite depth
 * Recursively fetches all ancestors
 */
export async function buildPedigreeTree(
    rootPetId: string,
    maxDepth: number = 10, // Safety limit to prevent infinite loops
    currentDepth: number = 0,
    cache: Map<string, PedigreeNode> = new Map()
): Promise<PedigreeNode | null> {
    // Check depth limit
    if (currentDepth > maxDepth) {
        console.warn('Max pedigree depth reached');
        return null;
    }

    // Check cache
    if (cache.has(rootPetId)) {
        return cache.get(rootPetId)!;
    }

    try {
        // Fetch current pet
        const airtablePet = await airtableClient.getPetById(rootPetId);
        if (!airtablePet) {
            console.warn(`Pet not found: ${rootPetId}`);
            return null;
        }

        // Map to pedigree node
        const node = mapAirtableToPedigreeNode(airtablePet);

        // Cache this node
        cache.set(rootPetId, node);

        // Recursively fetch parents
        const motherId = node.parentIds?.dam;
        const fatherId = node.parentIds?.sire;

        if (motherId || fatherId) {
            const [mother, father] = await Promise.all([
                motherId ? buildPedigreeTree(motherId, maxDepth, currentDepth + 1, cache) : null,
                fatherId ? buildPedigreeTree(fatherId, maxDepth, currentDepth + 1, cache) : null,
            ]);

            // Attach parents to node (not modifying original structure)
            // The PedigreeTree component will fetch them using parentIds
        }

        return node;
    } catch (error) {
        console.error(`Error building pedigree tree for ${rootPetId}:`, error);
        return null;
    }
}

/**
 * Get complete family tree as flat array (for display)
 * Includes all ancestors up to specified depth
 */
export async function getFamilyTreeArray(
    rootPetId: string,
    maxDepth: number = 10
): Promise<PedigreeNode[]> {
    const tree: PedigreeNode[] = [];
    const cache = new Map<string, PedigreeNode>();

    async function traverse(petId: string, depth: number) {
        if (depth > maxDepth) return;

        const node = await buildPedigreeTree(petId, maxDepth, depth, cache);
        if (!node) return;

        tree.push(node);

        // Traverse parents
        if (node.parentIds?.dam) {
            await traverse(node.parentIds.dam, depth + 1);
        }
        if (node.parentIds?.sire) {
            await traverse(node.parentIds.sire, depth + 1);
        }
    }

    await traverse(rootPetId, 0);
    return tree;
}

/**
 * Convert Airtable pet to Pet format (for existing components)
 */
export function convertAirtableToPet(airtablePet: AirtablePet): Pet {
    const fields = airtablePet.fields;

    return {
        id: airtablePet.id,
        name: fields.Name || 'Unknown',
        breed: fields.Breed || 'Unknown',
        age: calculateAge(fields.Birthday),
        gender: fields['Gender เพศ']?.toLowerCase() === 'female' ? 'female' : 'male',
        weight: fields.Weight || 0,
        color: '', // Not in schema
        location: 'Thailand', // Default
        price: 0, // For Sale field could map here
        available: fields['For Sale?'] || false,
        image: fields['รูปและไฟล์']?.[0]?.url || '/placeholder-pet.jpg',
        description: fields.Note || fields.หมายเหตุ || '',
        registrationNumber: fields['หมายเลข ID'],
        verified: true,
        parentIds: {
            sire: fields['Father พ่อ']?.[0],
            dam: fields['Mother แม่']?.[0],
        },
        medicalHistory: fields['Medical History'],
        // Keep Airtable ID for syncing
        airtableId: airtablePet.id,
    };
}

/**
 * Calculate age from birthday
 */
function calculateAge(birthday?: string): number {
    if (!birthday) return 0;

    try {
        const birthDate = new Date(birthday);
        const today = new Date();
        const ageInYears = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();

        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            return Math.max(0, ageInYears - 1);
        }

        return Math.max(0, ageInYears);
    } catch {
        return 0;
    }
}

/**
 * Batch convert multiple Airtable pets to Pet format
 */
export function convertAirtablePetsToPets(airtablePets: AirtablePet[]): Pet[] {
    return airtablePets.map(convertAirtableToPet);
}
