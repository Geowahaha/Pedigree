
import { Pet } from '@/data/petData';

interface MatchResult {
    score: number;
    label: 'Perfect Match' | 'Excellent' | 'Good' | 'Fair' | 'Risk' | 'Incompatible';
    breakdown: {
        genetic_risk: number; // 0-100 (100 is safe, 0 is high risk)
        breed_score: number;
        health_score: number;
        color_score: number;
        age_score: number;
    };
    breeding: {
        type: 'outcross' | 'linebreeding' | 'inbreeding';
        level: 'low' | 'moderate' | 'high';
        warnings: string[];
        pros: string[];
        cons: string[];
        summary: string;
    };
    advice: string;
}

const normalizeValue = (value?: string | null) => (value || '').toLowerCase().trim();

const getParentIdSet = (pet: Pet) => {
    const rawIds = [
        pet.mother_id,
        pet.father_id,
        pet.parentIds?.sire,
        pet.parentIds?.dam
    ];
    const idSet = new Set<string>();
    rawIds.forEach((id) => {
        if (id && id !== 'unknown') idSet.add(id);
    });
    return idSet;
};

const getAgeYears = (birthDate?: string) => {
    if (!birthDate) return 0;
    const dob = new Date(birthDate);
    if (Number.isNaN(dob.getTime())) return 0;
    return new Date().getFullYear() - dob.getFullYear();
};

const getHealthCertified = (pet: Pet) => {
    const legacyValue = (pet as any).health_certified;
    return Boolean(pet.healthCertified ?? legacyValue);
};

export function calculateCompatibilityScore(source: Pet, target: Pet): MatchResult {
    const warnings: string[] = [];
    const pros: string[] = [];
    const cons: string[] = [];
    let summary = 'Outcross. Higher genetic diversity.';
    const sourceHealthCertified = getHealthCertified(source);
    const targetHealthCertified = getHealthCertified(target);

    // 1. Basic Incompatibility (Species)
    if (source.type !== target.type) {
        return {
            score: 0,
            label: 'Incompatible',
            breakdown: { genetic_risk: 0, breed_score: 0, health_score: 0, color_score: 0, age_score: 0 },
            breeding: {
                type: 'outcross',
                level: 'high',
                warnings: ['Different species cannot breed.'],
                pros: [],
                cons: [],
                summary: 'Different species cannot breed.'
            },
            advice: 'Different species cannot breed.'
        };
    }

    // 2. Gender Check (Must be opposite)
    if (source.gender.toLowerCase() === target.gender.toLowerCase()) {
        return {
            score: 0,
            label: 'Incompatible',
            breakdown: { genetic_risk: 100, breed_score: 0, health_score: 0, color_score: 0, age_score: 0 },
            breeding: {
                type: 'outcross',
                level: 'high',
                warnings: ['Same gender. Cannot breed naturally.'],
                pros: [],
                cons: [],
                summary: 'Same gender. Cannot breed naturally.'
            },
            advice: 'Same gender. Cannot breed naturally.'
        };
    }

    // 3. Genetic Risk (Inbreeding Check)
    // Check parents (1st Generation)
    const sourceParents = getParentIdSet(source);
    const targetParents = getParentIdSet(target);

    let geneticRisk = 100;
    let advice = "Genetically diverse match.";
    let breedingType: MatchResult['breeding']['type'] = 'outcross';
    let breedingLevel: MatchResult['breeding']['level'] = 'low';

    // Direct Parent/Child
    if (sourceParents.has(target.id) || targetParents.has(source.id)) {
        geneticRisk = 0;
        advice = "CRITICAL: Parent/Child relationship. Do not breed.";
        summary = 'Inbreeding. Very high genetic risk.';
        breedingType = 'inbreeding';
        breedingLevel = 'high';
        warnings.push('Parent/child relationship. Do not breed.');
        pros.push('Strongly preserves specific traits.');
        cons.push('High risk of inherited disorders.');
        cons.push('Lower genetic diversity.');
    }
    // Siblings (Share at least one parent)
    else {
        // Check if full siblings (share both) or half
        let sharedCount = 0;
        sourceParents.forEach((parentId) => {
            if (targetParents.has(parentId)) sharedCount += 1;
        });

        if (sharedCount >= 2) {
            geneticRisk = 10;
            advice = "HIGH RISK: Full siblings. Avoid inbreeding.";
            summary = 'Inbreeding. High genetic risk.';
            breedingType = 'inbreeding';
            breedingLevel = 'high';
            warnings.push('Full siblings share both parents.');
            pros.push('Predictable traits.');
            cons.push('High risk of recessive defects.');
            cons.push('Lower fertility and litter health.');
        } else if (sharedCount === 1) {
            geneticRisk = 40;
            advice = "MODERATE RISK: Half siblings. Line breeding requires expert knowledge.";
            summary = 'Linebreeding. Moderate genetic risk.';
            breedingType = 'linebreeding';
            breedingLevel = 'moderate';
            warnings.push('Shared parent detected. Review lineage carefully.');
            pros.push('Retains desired family traits.');
            cons.push('Moderate risk of inherited issues.');
        } else {
            breedingType = 'outcross';
            breedingLevel = 'low';
            pros.push('Higher genetic diversity.');
            pros.push('Lower inherited risk.');
            cons.push('Traits may be less predictable.');
        }
    }

    const hasUnknownPedigree = sourceParents.size === 0 || targetParents.size === 0;
    if (hasUnknownPedigree) {
        warnings.push('Limited pedigree data. Confirm lineage if possible.');
        if (geneticRisk === 100) {
            geneticRisk = 70;
            advice = 'Pedigree data is limited. Treat genetic risk as unknown.';
            summary = 'Pedigree unknown. Genetic risk is uncertain.';
        }
    }

    // 4. Breed Compatibility
    let breedScore = 0;
    const sourceBreed = normalizeValue(source.breed);
    const targetBreed = normalizeValue(target.breed);
    if (sourceBreed && sourceBreed === targetBreed) {
        breedScore = 100;
    } else if (sourceBreed && targetBreed && (sourceBreed.includes(targetBreed) || targetBreed.includes(sourceBreed))) {
        breedScore = 70;
    } else {
        // Cross-breeding penalty/feature
        breedScore = 20;
        if (sourceBreed && targetBreed) {
            warnings.push('Cross-breeding will produce mixed breed offspring.');
        }
    }

    // 5. Health Score
    let healthScore = 50; // Baseline
    if (sourceHealthCertified) healthScore += 25;
    if (targetHealthCertified) healthScore += 25;
    if (!sourceHealthCertified || !targetHealthCertified) {
        warnings.push('Health screening recommended for both parents.');
    }

    // 6. Color Strategy (Simplified)
    // "Good" matches are often subjective, but we can score based on genetic data if we had it.
    // For now: Reward different colors slightly (diversity) or specific knowledge (Blue+Blue = sometimes bad in certain breeds like Frenchies/Merle).
    // Safe default: 100.
    let colorScore = 90;

    // 7. Age Score (Prime breeding years: 2-6)
    const age1 = getAgeYears(source.birthDate || (source as any).birth_date);
    const age2 = getAgeYears(target.birthDate || (target as any).birth_date);

    let ageScore = 80;
    if (age1 >= 2 && age1 <= 6 && age2 >= 2 && age2 <= 6) {
        ageScore = 100;
    } else if (age1 < 1 || age2 < 1) {
        ageScore = 0;
        advice = "One or both pets are too young to breed.";
        warnings.push('Breeding age is below recommended minimum.');
    } else if (age1 > 8 || age2 > 8) {
        ageScore = 50;
        advice += " Consider age-related risks.";
        warnings.push('Older breeding age increases health risks.');
    }

    // WEIGHTED TOTAL
    // Genetics: 50%, Health: 25%, Breed: 12%, Age: 8%, Color: 5%
    let totalScore = 0;

    if (geneticRisk === 0) {
        totalScore = 0;
        return {
            score: 0,
            label: 'Risk',
            breakdown: { genetic_risk: 0, breed_score: breedScore, health_score: healthScore, color_score: colorScore, age_score: ageScore },
            breeding: {
                type: breedingType,
                level: breedingLevel,
                warnings,
                pros,
                cons,
                summary
            },
            advice
        };
    }

    totalScore = (geneticRisk * 0.5) + (healthScore * 0.25) + (breedScore * 0.12) + (ageScore * 0.08) + (colorScore * 0.05);

    if (breedingType === 'inbreeding') {
        totalScore -= 30;
    } else if (breedingType === 'linebreeding') {
        totalScore -= 12;
    }

    if (hasUnknownPedigree) {
        totalScore -= 6;
    }

    totalScore = Math.max(0, Math.min(100, totalScore));

    let label: MatchResult['label'] = 'Fair';
    if (totalScore >= 90) label = 'Perfect Match';
    else if (totalScore >= 80) label = 'Excellent';
    else if (totalScore >= 60) label = 'Good';
    else if (totalScore >= 40) label = 'Fair';
    else label = geneticRisk < 40 ? 'Risk' : 'Incompatible'; // Functionally low score

    return {
        score: Math.round(totalScore),
        label,
        breakdown: {
            genetic_risk: geneticRisk,
            breed_score: breedScore,
            health_score: healthScore,
            color_score: colorScore,
            age_score: ageScore
        },
        breeding: {
            type: breedingType,
            level: breedingLevel,
            warnings,
            pros,
            cons,
            summary
        },
        advice
    };
}
