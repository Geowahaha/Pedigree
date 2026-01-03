
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const airtableDataPath = path.join(__dirname, 'src/data/airtable_pets.json');
const outputPath = path.join(__dirname, 'src/data/importedPets.ts');
const validationReportPath = path.join(__dirname, 'airtable_validation_report.json');

/**
 * Validate a single pet record
 */
function validatePetRecord(record, index) {
    const errors = [];
    const warnings = [];
    const fields = record.fields;

    // Required fields check
    if (!fields['Name'] || fields['Name'].trim() === '') {
        errors.push(`Record ${index}: Missing or empty 'Name' field`);
    }

    // Gender validation
    if (fields['Gender เพศ']) {
        const gender = fields['Gender เพศ'].toLowerCase();
        if (!gender.includes('male') && !gender.includes('female') &&
            !gender.includes('ผู้') && !gender.includes('เมีย')) {
            warnings.push(`Record ${index}: Unexpected gender value: ${fields['Gender เพศ']}`);
        }
    }

    // Birthday validation
    if (fields['Birthday']) {
        const date = new Date(fields['Birthday']);
        if (isNaN(date.getTime())) {
            errors.push(`Record ${index}: Invalid birthday format: ${fields['Birthday']}`);
        } else if (date > new Date()) {
            warnings.push(`Record ${index}: Birthday is in the future`);
        }
    }

    // Image validation
    if (!fields['รูปและไฟล์'] || fields['รูปและไฟล์'].length === 0) {
        warnings.push(`Record ${index}: No image attached`);
    }

    // Type validation
    if (fields['Type ชนิด'] && fields['Type ชนิด'].length > 0) {
        const type = fields['Type ชนิด'][0].toLowerCase();
        if (!['dog', 'cat', 'horse', 'สุนัข', 'แมว'].includes(type)) {
            warnings.push(`Record ${index}: Unexpected type: ${fields['Type ชนิด'][0]}`);
        }
    }

    return { valid: errors.length === 0, errors, warnings };
}

/**
 * Process and transform pet record
 */
function processPetRecord(record, index) {
    const fields = record.fields;

    // Find best image
    let imageUrl = 'https://images.unsplash.com/photo-1558929996-da4c0c813511?q=80&w=600'; // Default
    if (fields['รูปและไฟล์'] && fields['รูปและไฟล์'].length > 0) {
        imageUrl = fields['รูปและไฟล์'][0].url;
    }

    // Clean up breed name
    let breed = fields['Breed'] || 'Thai Ridgeback';
    if (typeof breed === 'string') {
        breed = breed.replace('Dog Thai Ridgeback Dogs  หมาไทยหลังอาน ', 'Thai Ridgeback').trim();
    }

    // Determine type
    let type = 'dog';
    if (fields['Type ชนิด'] && fields['Type ชนิด'].length > 0) {
        const typeValue = fields['Type ชนิด'][0].toLowerCase();
        if (typeValue.includes('cat') || typeValue.includes('แมว')) {
            type = 'cat';
        } else if (typeValue.includes('horse')) {
            type = 'horse';
        }
    }

    // Normalize gender
    let gender = (fields['Gender เพศ'] || 'male').toLowerCase();
    if (gender.includes('female') || gender.includes('เมีย')) {
        gender = 'female';
    } else {
        gender = 'male';
    }

    // Validate and normalize birthday
    let birthDate = '2020-01-01'; // Default
    if (fields['Birthday']) {
        const date = new Date(fields['Birthday']);
        if (!isNaN(date.getTime())) {
            birthDate = date.toISOString().split('T')[0];
        }
    }

    return {
        id: record.id,
        name: (fields['Name'] || 'Unnamed').trim(),
        breed: breed,
        type: type,
        birthDate: birthDate,
        gender: gender,
        color: fields['Color'] || 'Red',
        price: fields['Price'] || 15000,
        location: fields['Location'] || 'Thailand',
        image: imageUrl,
        description: fields['Description'] || `A verified ${breed} from our pedigree database.`,
        healthCertified: fields['Health Certified'] === true || fields['Health Certified'] === 'Yes',
        registrationNumber: fields['หมายเลข ID'] ? `TRD-${fields['หมายเลข ID']}` : undefined,
        parentIds: {
            sire: (fields['Father พ่อ'] && fields['Father พ่อ'].length > 0) ? fields['Father พ่อ'][0] : undefined,
            dam: (fields['Mother แม่'] && fields['Mother แม่'].length > 0) ? fields['Mother แม่'][0] : undefined,
            sireStatus: 'verified',
            damStatus: 'verified'
        },
        isOwnerVerified: true
    };
}

try {
    console.log('🚀 Starting Airtable data processing...\n');

    // Check if input file exists
    if (!fs.existsSync(airtableDataPath)) {
        throw new Error(`Input file not found: ${airtableDataPath}`);
    }

    const rawData = fs.readFileSync(airtableDataPath, 'utf8');
    const airtableData = JSON.parse(rawData);

    if (!airtableData.records || !Array.isArray(airtableData.records)) {
        throw new Error('Invalid Airtable data format: missing or invalid "records" array');
    }

    console.log(`📊 Found ${airtableData.records.length} records to process\n`);

    // Validation phase
    console.log('🔍 Validating records...');
    const validationResults = airtableData.records.map((record, index) => ({
        recordId: record.id,
        index: index + 1,
        ...validatePetRecord(record, index + 1)
    }));

    const validRecords = validationResults.filter(r => r.valid);
    const invalidRecords = validationResults.filter(r => !r.valid);
    const recordsWithWarnings = validationResults.filter(r => r.warnings.length > 0);

    console.log(`✓ Valid records: ${validRecords.length}`);
    console.log(`✗ Invalid records: ${invalidRecords.length}`);
    console.log(`⚠ Records with warnings: ${recordsWithWarnings.length}\n`);

    // Display errors
    if (invalidRecords.length > 0) {
        console.log('❌ Errors found:');
        invalidRecords.forEach(record => {
            record.errors.forEach(error => console.log(`  - ${error}`));
        });
        console.log('');
    }

    // Display warnings
    if (recordsWithWarnings.length > 0) {
        console.log('⚠️  Warnings:');
        recordsWithWarnings.slice(0, 5).forEach(record => {
            record.warnings.forEach(warning => console.log(`  - ${warning}`));
        });
        if (recordsWithWarnings.length > 5) {
            console.log(`  ... and ${recordsWithWarnings.length - 5} more warnings\n`);
        } else {
            console.log('');
        }
    }

    // Process valid records only
    console.log('⚙️  Processing valid records...');
    const pets = airtableData.records
        .filter((record, index) => validationResults[index].valid)
        .map((record, index) => processPetRecord(record, index + 1));

    console.log(`✓ Successfully processed ${pets.length} pets\n`);

    // Generate statistics
    const stats = {
        total: airtableData.records.length,
        valid: validRecords.length,
        invalid: invalidRecords.length,
        warnings: recordsWithWarnings.length,
        typeBreakdown: {
            dog: pets.filter(p => p.type === 'dog').length,
            cat: pets.filter(p => p.type === 'cat').length,
            horse: pets.filter(p => p.type === 'horse').length
        },
        genderBreakdown: {
            male: pets.filter(p => p.gender === 'male').length,
            female: pets.filter(p => p.gender === 'female').length
        },
        withImages: pets.filter(p => p.image && !p.image.includes('unsplash')).length,
        withPedigree: pets.filter(p => p.parentIds.sire || p.parentIds.dam).length,
        healthCertified: pets.filter(p => p.healthCertified).length
    };

    console.log('📈 Import Statistics:');
    console.log(`   Types: ${stats.typeBreakdown.dog} dogs, ${stats.typeBreakdown.cat} cats, ${stats.typeBreakdown.horse} horses`);
    console.log(`   Gender: ${stats.genderBreakdown.male} males, ${stats.genderBreakdown.female} females`);
    console.log(`   ${stats.withImages} have custom images`);
    console.log(`   ${stats.withPedigree} have pedigree information`);
    console.log(`   ${stats.healthCertified} are health certified\n`);

    // Write output file
    const fileContent = `import { Pet } from './petData';

export const importedPets: Pet[] = ${JSON.stringify(pets, null, 2)};
`;

    fs.writeFileSync(outputPath, fileContent);
    console.log(`✅ Successfully exported to ${outputPath}`);

    // Write validation report
    const validationReport = {
        timestamp: new Date().toISOString(),
        stats,
        validationResults: validationResults.map(r => ({
            recordId: r.recordId,
            index: r.index,
            valid: r.valid,
            errorCount: r.errors.length,
            warningCount: r.warnings.length,
            errors: r.errors,
            warnings: r.warnings
        }))
    };

    fs.writeFileSync(validationReportPath, JSON.stringify(validationReport, null, 2));
    console.log(`📄 Validation report saved to ${validationReportPath}`);

    console.log('\n🎉 Processing complete!');

    // Exit with error code if there are invalid records
    if (invalidRecords.length > 0) {
        console.log('\n⚠️  Warning: Some records were skipped due to validation errors');
        process.exit(1);
    }

} catch (error) {
    console.error('\n💥 Error processing data:', error.message);
    console.error(error.stack);
    process.exit(1);
}
