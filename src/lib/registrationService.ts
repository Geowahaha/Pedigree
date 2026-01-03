/**
 * Pet Registration Service
 * Auto-generates registration numbers and handles new pet registration
 * Format: [Mother-2]+[Father-2]+G[Gen]+[Num]
 * Example: LU-AP-G2-005 (Luna + Apollo, Generation 2, Number 5)
 */

import { airtableClient, AirtablePet } from './airtable';

/**
 * Generate abbreviation from name (first 2 letters, uppercase)
 */
function getNameAbbreviation(name: string): string {
    if (!name || name.length < 2) return 'XX';
    return name.substring(0, 2).toUpperCase();
}

/**
 * Calculate generation number based on parents
 */
async function calculateGeneration(motherId?: string, fatherId?: string): Promise<number> {
    if (!motherId && !fatherId) return 1; // No parents = Generation 1

    try {
        const parents: AirtablePet[] = [];

        if (motherId) {
            const mother = await airtableClient.getPetById(motherId);
            if (mother) parents.push(mother);
        }

        if (fatherId) {
            const father = await airtableClient.getPetById(fatherId);
            if (father) parents.push(father);
        }

        if (parents.length === 0) return 1;

        // Find max generation from parents and add 1
        const parentGenerations = parents.map(parent => {
            const regNum = parent.fields['หมายเลข ID'];
            if (!regNum) return 1;

            // Extract generation from registration number (e.g., "LU-AP-G2-005" -> 2)
            const match = regNum.match(/G(\d+)/);
            return match ? parseInt(match[1], 10) : 1;
        });

        return Math.max(...parentGenerations) + 1;
    } catch (error) {
        console.error('Error calculating generation:', error);
        return 1;
    }
}

/**
 * Get next available number for a specific mother-father-generation combination
 */
async function getNextNumber(motherAbbr: string, fatherAbbr: string, generation: number): Promise<string> {
    try {
        // Search for existing pets with same mother-father-generation
        const prefix = `${motherAbbr}-${fatherAbbr}-G${generation}`;

        // Fetch all pets to find matching registration numbers
        const allPets = await airtableClient.searchPets('', 100); // Get recent pets

        const matchingPets = allPets.filter(pet => {
            const regNum = pet.fields['หมายเลข ID'];
            return regNum && regNum.startsWith(prefix);
        });

        if (matchingPets.length === 0) {
            return '001'; // First pet with this combination
        }

        // Find highest number
        const numbers = matchingPets.map(pet => {
            const regNum = pet.fields['หมายเลข ID'];
            if (!regNum) return 0;

            // Extract number (e.g., "LU-AP-G2-005" -> 5)
            const match = regNum.match(/-(\d{3})$/);
            return match ? parseInt(match[1], 10) : 0;
        });

        const maxNumber = Math.max(...numbers);
        const nextNumber = maxNumber + 1;

        return nextNumber.toString().padStart(3, '0'); // Format as 001, 002, etc.
    } catch (error) {
        console.error('Error getting next number:', error);
        return '001';
    }
}

/**
 * Generate complete registration number
 * Format: [Mother-2]+[Father-2]+G[Gen]+[Num]
 */
export async function generateRegistrationNumber(
    motherName?: string,
    fatherName?: string,
    motherId?: string,
    fatherId?: string
): Promise<string> {
    try {
        // Get abbreviations
        const motherAbbr = motherName ? getNameAbbreviation(motherName) : 'UN'; // UN = Unknown
        const fatherAbbr = fatherName ? getNameAbbreviation(fatherName) : 'UN';

        // Calculate generation
        const generation = await calculateGeneration(motherId, fatherId);

        // Get next number
        const number = await getNextNumber(motherAbbr, fatherAbbr, generation);

        // Construct registration number
        return `${motherAbbr}-${fatherAbbr}-G${generation}-${number}`;
    } catch (error) {
        console.error('Error generating registration number:', error);
        // Fallback to timestamp-based ID
        const timestamp = Date.now().toString().slice(-6);
        return `XX-XX-G1-${timestamp}`;
    }
}

/**
 * Register a new pet
 */
export interface RegisterPetInput {
    name: string;
    breed: string;
    gender: 'Male' | 'Female';
    birthday?: string;
    weight?: number;
    motherId?: string;
    motherName?: string;
    fatherId?: string;
    fatherName?: string;
    homeId?: string;
    contact?: string;
    medicalHistory?: string;
    forSale?: boolean;
    type?: string;
    notes?: string;
}

export async function registerNewPet(input: RegisterPetInput): Promise<AirtablePet> {
    try {
        // Generate registration number
        const registrationNumber = await generateRegistrationNumber(
            input.motherName,
            input.fatherName,
            input.motherId,
            input.fatherId
        );

        console.log(`Generated Registration Number: ${registrationNumber}`);

        // Prepare fields for Airtable
        const fields: Partial<AirtablePet['fields']> = {
            'Name': input.name,
            'Breed': input.breed,
            'Gender เพศ': input.gender,
            'หมายเลข ID': registrationNumber,
            'Type ชนิด': input.type || 'Dog',
        };

        // Optional fields
        if (input.birthday) fields.Birthday = input.birthday;
        if (input.weight) fields.Weight = input.weight;
        if (input.contact) fields.contact = input.contact;
        if (input.medicalHistory) fields['Medical History'] = input.medicalHistory;
        if (input.forSale !== undefined) fields['For Sale?'] = input.forSale;
        if (input.notes) fields.Note = input.notes;

        // Linked records (parents and home)
        if (input.motherId) fields['Mother แม่'] = [input.motherId];
        if (input.fatherId) fields['Father พ่อ'] = [input.fatherId];
        if (input.homeId) fields['บ้าน'] = [input.homeId];

        // Create record in Airtable
        const newPet = await airtableClient.createPet(fields);

        console.log(`✅ Pet registered successfully: ${newPet.id}`);
        return newPet;
    } catch (error) {
        console.error('Error registering pet:', error);
        throw error;
    }
}
