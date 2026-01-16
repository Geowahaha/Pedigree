/**
 * Airtable API Client for My Pet Bot Database
 * Handles all interactions with PetName and บ้าน tables
 */

const AIRTABLE_API_KEY = import.meta.env.VITE_AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = import.meta.env.VITE_AIRTABLE_BASE_ID;

const AIRTABLE_API_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}`;
const PET_TABLE = 'PetName';
const HOME_TABLE = 'บ้าน';

export interface AirtablePet {
    id: string;
    fields: {
        Name?: string;
        'Gender เพศ'?: string;
        Breed?: string;
        Weight?: number;
        Birthday?: string;
        'For Sale?'?: boolean;
        'รูปและไฟล์'?: Array<{
            id: string;
            url: string;
            filename: string;
            size: number;
            type: string;
        }>;
        'Mother แม่'?: string[]; // Array of record IDs
        'Father พ่อ'?: string[]; // Array of record IDs
        'บ้าน'?: string[]; // Linked to Home table
        contact?: string;
        'Medical History'?: string;
        หมายเหตุ?: string;
        'หมายเลข ID'?: string | number; // Can be string or number
        Note?: string;
        'Type ชนิด'?: string;
        'Last modified time'?: string;
    };
    createdTime: string;
}

export interface AirtableHome {
    id: string;
    fields: {
        Name?: string;
        Notes?: string;
        Photo?: Array<{ url: string }>;
        'LINE ID'?: string;
        โทร?: string;
        'Facebook/Page'?: string;
    };
}

class AirtableClient {
    private headers: HeadersInit;

    constructor() {
        if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
            console.warn('Airtable credentials missing - Service disabled');
        }

        this.headers = {
            'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
            'Content-Type': 'application/json',
        };
    }

    /**
     * Search pets by name or breed (Client-side filtering)
     */
    async searchPets(query: string, maxRecords: number = 20): Promise<AirtablePet[]> {
        try {
            // Handle empty query
            if (!query || query.trim() === '') {
                return this.getRandomPets(maxRecords);
            }

            // Fetch all pets and filter in JavaScript (avoids Airtable formula issues)
            const response = await fetch(`${AIRTABLE_API_URL}/${PET_TABLE}?maxRecords=100`, {
                headers: this.headers,
            });

            if (!response.ok) throw new Error(`API Error: ${response.status}`);

            const data = await response.json();
            const allPets = data.records as AirtablePet[];

            // Filter by name or breed (case-insensitive)
            const lowerQuery = query.toLowerCase();
            const filtered = allPets.filter(pet => {
                const name = pet.fields.Name?.toLowerCase() || '';
                const breed = pet.fields.Breed?.toLowerCase() || '';
                return name.includes(lowerQuery) || breed.includes(lowerQuery);
            });

            return filtered.slice(0, maxRecords);
        } catch (error) {
            console.error('Search error:', error);
            throw error;
        }
    }

    /**
     * Get random pets (for suggestion cards)
     */
    async getRandomPets(count: number = 6): Promise<AirtablePet[]> {
        try {
            // Fetch more records and randomly select
            const response = await fetch(`${AIRTABLE_API_URL}/${PET_TABLE}?maxRecords=50`, {
                headers: this.headers,
            });

            if (!response.ok) throw new Error(`API Error: ${response.status}`);

            const data = await response.json();
            const records = data.records as AirtablePet[];

            // Shuffle and take first 'count' items
            return records
                .sort(() => Math.random() - 0.5)
                .slice(0, count);
        } catch (error) {
            console.error('Random pets error:', error);
            throw error;
        }
    }

    /**
     * Get specific pet by ID (including parents for family tree)
     */
    async getPetById(recordId: string): Promise<AirtablePet | null> {
        try {
            const response = await fetch(`${AIRTABLE_API_URL}/${PET_TABLE}/${recordId}`, {
                headers: this.headers,
            });

            if (!response.ok) {
                if (response.status === 404) return null;
                throw new Error(`API Error: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Get pet error:', error);
            throw error;
        }
    }

    /**
     * Get multiple pets by IDs (for fetching parents)
     */
    async getPetsByIds(recordIds: string[]): Promise<AirtablePet[]> {
        try {
            const promises = recordIds.map(id => this.getPetById(id));
            const results = await Promise.all(promises);
            return results.filter(Boolean) as AirtablePet[];
        } catch (error) {
            console.error('Get pets by IDs error:', error);
            throw error;
        }
    }

    /**
     * Create new pet record
     */
    async createPet(fields: Partial<AirtablePet['fields']>): Promise<AirtablePet> {
        try {
            const response = await fetch(`${AIRTABLE_API_URL}/${PET_TABLE}`, {
                method: 'POST',
                headers: this.headers,
                body: JSON.stringify({ fields }),
            });

            if (!response.ok) throw new Error(`API Error: ${response.status}`);

            return await response.json();
        } catch (error) {
            console.error('Create pet error:', error);
            throw error;
        }
    }

    /**
     * Get home/owner information
     */
    async getHomeById(recordId: string): Promise<AirtableHome | null> {
        try {
            const response = await fetch(`${AIRTABLE_API_URL}/${HOME_TABLE}/${recordId}`, {
                headers: this.headers,
            });

            if (!response.ok) {
                if (response.status === 404) return null;
                throw new Error(`API Error: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Get home error:', error);
            throw error;
        }
    }
}

export const airtableClient = new AirtableClient();
