/**
 * Airtable ↔ Supabase Sync Service
 * Handles data synchronization between Airtable and Supabase
 */

import { airtableClient, AirtablePet } from './airtable';
import { supabase } from './supabase';
import { Pet } from '@/data/petData';

export interface SyncResult {
    success: boolean;
    imported: number;
    exported: number;
    errors: string[];
}

/**
 * Map Airtable record to Supabase Pet format
 */
function mapAirtableToPet(airtableRecord: AirtablePet): Partial<Pet> {
    const fields = airtableRecord.fields;

    return {
        name: fields.Name || 'Unknown',
        breed: fields.Breed || 'Unknown',
        gender: fields['Gender เพศ']?.toLowerCase() as 'male' | 'female' || 'male',
        age: fields.Birthday ? calculateAge(fields.Birthday) : 0,
        weight: fields.Weight || 0,
        color: fields.Color || '',
        location: fields.Location || 'Thailand',
        registrationNumber: fields['Registration Number'] || undefined,
        image: fields.Image?.[0]?.url || '/placeholder-pet.jpg',
        description: `Imported from Airtable on ${new Date().toLocaleDateString()}`,
        price: 0, // Default value
        available: true,
        // Store original Airtable ID for syncing
        airtableId: airtableRecord.id,
    };
}

/**
 * Map Supabase Pet to Airtable format
 */
function mapPetToAirtable(pet: Pet): Record<string, any> {
    return {
        'Name': pet.name,
        'Breed': pet.breed,
        'Gender เพศ': pet.gender === 'male' ? 'Male' : 'Female',
        'Weight': pet.weight,
        'Color': pet.color,
        'Location': pet.location,
        'Registration Number': pet.registrationNumber || '',
        // Add other fields as needed
    };
}

/**
 * Calculate age from birthday
 */
function calculateAge(birthday: string): number {
    const birthDate = new Date(birthday);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    return age > 0 ? age : 0;
}

/**
 * Import all pets from Airtable to Supabase
 */
export async function importFromAirtable(): Promise<SyncResult> {
    const result: SyncResult = {
        success: false,
        imported: 0,
        exported: 0,
        errors: [],
    };

    try {
        console.log('🔽 Starting import from Airtable...');

        // Fetch records from Airtable
        const airtableRecords = await airtableClient.fetchRecords();
        console.log(`Found ${airtableRecords.length} records in Airtable`);

        // Import each record to Supabase
        for (const record of airtableRecords) {
            try {
                const petData = mapAirtableToPet(record);

                // Check if already exists (by airtableId)
                const { data: existing } = await supabase
                    .from('pets')
                    .select('id')
                    .eq('airtableId', record.id)
                    .single();

                if (existing) {
                    // Update existing record
                    const { error } = await supabase
                        .from('pets')
                        .update(petData)
                        .eq('id', existing.id);

                    if (error) throw error;
                } else {
                    // Insert new record
                    const { error } = await supabase
                        .from('pets')
                        .insert([petData]);

                    if (error) throw error;
                }

                result.imported++;
            } catch (error: any) {
                result.errors.push(`Failed to import ${record.fields.Name}: ${error.message}`);
            }
        }

        result.success = result.errors.length === 0;
        console.log(`✅ Import complete: ${result.imported} pets imported`);

        return result;
    } catch (error: any) {
        result.errors.push(`Import failed: ${error.message}`);
        return result;
    }
}

/**
 * Export all pets from Supabase to Airtable
 */
export async function exportToAirtable(): Promise<SyncResult> {
    const result: SyncResult = {
        success: false,
        imported: 0,
        exported: 0,
        errors: [],
    };

    try {
        console.log('🔼 Starting export to Airtable...');

        // Fetch pets from Supabase
        const { data: pets, error } = await supabase
            .from('pets')
            .select('*');

        if (error) throw error;
        if (!pets) {
            result.errors.push('No pets found in Supabase');
            return result;
        }

        console.log(`Found ${pets.length} pets in Supabase`);

        // Export each pet to Airtable
        for (const pet of pets) {
            try {
                const airtableFields = mapPetToAirtable(pet as Pet);

                if (pet.airtableId) {
                    // Update existing record in Airtable
                    await airtableClient.updateRecord(pet.airtableId, airtableFields);
                } else {
                    // Create new record in Airtable
                    const newRecord = await airtableClient.createRecord(airtableFields);

                    // Update Supabase with new Airtable ID
                    await supabase
                        .from('pets')
                        .update({ airtableId: newRecord.id })
                        .eq('id', pet.id);
                }

                result.exported++;
            } catch (error: any) {
                result.errors.push(`Failed to export ${pet.name}: ${error.message}`);
            }
        }

        result.success = result.errors.length === 0;
        console.log(`✅ Export complete: ${result.exported} pets exported`);

        return result;
    } catch (error: any) {
        result.errors.push(`Export failed: ${error.message}`);
        return result;
    }
}

/**
 * Bi-directional sync: Import from Airtable, then Export to Airtable
 */
export async function syncBidirectional(): Promise<SyncResult> {
    console.log('🔄 Starting bidirectional sync...');

    // First, import from Airtable
    const importResult = await importFromAirtable();

    // Then, export to Airtable
    const exportResult = await exportToAirtable();

    return {
        success: importResult.success && exportResult.success,
        imported: importResult.imported,
        exported: exportResult.exported,
        errors: [...importResult.errors, ...exportResult.errors],
    };
}
