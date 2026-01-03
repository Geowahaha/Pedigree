/**
 * One-Time Migration: Airtable → Supabase
 * Import all pets from Airtable to Supabase
 * Run this ONCE only
 */

import { airtableClient } from './airtable';
import { supabase } from './supabase';

export interface MigrationResult {
    success: boolean;
    imported: number;
    failed: number;
    errors: string[];
}

/**
 * Map Airtable pet to Supabase format
 */
function mapAirtableToSupabase(airtablePet: any) {
    const fields = airtablePet.fields;

    return {
        name: fields.Name || 'Unknown',
        breed: fields.Breed || 'Unknown',
        gender: fields['Gender เพศ']?.toLowerCase() || null,
        birthday: fields.Birthday || null,
        weight: fields.Weight || null,
        image_url: fields['รูปและไฟล์']?.[0]?.url || null,
        medical_history: fields['Medical History'] || null,
        notes: fields.Note || fields.หมายเหตุ || null,
        for_sale: fields['For Sale?'] || false,
        airtable_id: airtablePet.id,
        // Parents will be linked in second pass
    };
}

/**
 * Migration Step 1: Import all pets without relationships
 */
async function importPetsFirstPass(): Promise<Map<string, string>> {
    console.log('📥 Step 1: Importing pets...');

    const airtableIdToSupabaseId = new Map<string, string>();

    try {
        // Fetch all pets from Airtable
        const airtablePets = await airtableClient.getRandomPets(1000);
        console.log(`Found ${airtablePets.length} pets in Airtable`);

        for (const airtablePet of airtablePets) {
            try {
                const petData = mapAirtableToSupabase(airtablePet);

                // Insert into Supabase
                const { data, error } = await supabase
                    .from('pets')
                    .insert([petData])
                    .select('id, airtable_id')
                    .single();

                if (error) throw error;

                if (data) {
                    airtableIdToSupabaseId.set(airtablePet.id, data.id);
                    console.log(`✅ Imported: ${petData.name}`);
                }
            } catch (error: any) {
                console.error(`❌ Failed to import ${airtablePet.fields.Name}:`, error.message);
            }
        }

        console.log(`✅ Step 1 Complete: ${airtableIdToSupabaseId.size} pets imported`);
        return airtableIdToSupabaseId;
    } catch (error) {
        console.error('Step 1 failed:', error);
        throw error;
    }
}

/**
 * Migration Step 2: Link parent relationships
 */
async function linkParentRelationships(mapping: Map<string, string>): Promise<number> {
    console.log('🔗 Step 2: Linking parent relationships...');

    let linked = 0;

    try {
        // Get all pets from Airtable with parent info
        const airtablePets = await airtableClient.getRandomPets(1000);

        for (const airtablePet of airtablePets) {
            const fields = airtablePet.fields;
            const supabaseId = mapping.get(airtablePet.id);

            if (!supabaseId) continue;

            const motherId = fields['Mother แม่']?.[0];
            const fatherId = fields['Father พ่อ']?.[0];

            if (motherId || fatherId) {
                const updates: any = {};

                if (motherId && mapping.has(motherId)) {
                    updates.mother_id = mapping.get(motherId);
                }

                if (fatherId && mapping.has(fatherId)) {
                    updates.father_id = mapping.get(fatherId);
                }

                if (Object.keys(updates).length > 0) {
                    const { error } = await supabase
                        .from('pets')
                        .update(updates)
                        .eq('id', supabaseId);

                    if (error) {
                        console.error(`Failed to link parents for ${fields.Name}:`, error);
                    } else {
                        linked++;
                        console.log(`✅ Linked: ${fields.Name}`);
                    }
                }
            }
        }

        console.log(`✅ Step 2 Complete: ${linked} parent relationships linked`);
        return linked;
    } catch (error) {
        console.error('Step 2 failed:', error);
        throw error;
    }
}

/**
 * Main migration function
 */
export async function migrateFromAirtableToSupabase(): Promise<MigrationResult> {
    const result: MigrationResult = {
        success: false,
        imported: 0,
        failed: 0,
        errors: [],
    };

    try {
        console.log('🚀 Starting Airtable → Supabase Migration...');
        console.log('================================================');

        // Step 1: Import pets
        const mapping = await importPetsFirstPass();
        result.imported = mapping.size;

        // Step 2: Link relationships
        const linked = await linkParentRelationships(mapping);

        console.log('================================================');
        console.log('✅ Migration Complete!');
        console.log(`   Imported: ${result.imported} pets`);
        console.log(`   Linked: ${linked} parent relationships`);

        result.success = true;
        return result;
    } catch (error: any) {
        result.errors.push(error.message);
        console.error('❌ Migration failed:', error);
        return result;
    }
}

/**
 * Verify migration
 */
export async function verifyMigration() {
    console.log('🔍 Verifying migration...');

    const { data: pets, error } = await supabase
        .from('pets')
        .select('id, name, mother_id, father_id')
        .limit(10);

    if (error) {
        console.error('Verification failed:', error);
        return;
    }

    console.log('Sample pets in Supabase:', pets);
    console.log('✅ Verification complete');
}
