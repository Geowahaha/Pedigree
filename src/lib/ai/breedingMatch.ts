/**
 * Breeding Match Algorithm
 * 
 * "Details matter, it's worth waiting to get it right."
 * - Steve Jobs
 * 
 * This algorithm finds the best breeding matches based on:
 * 1. Genetic compatibility (COI - Coefficient of Inbreeding)
 * 2. Health history
 * 3. Breed standards
 * 4. Color genetics (simplified Mendelian)
 * 5. Location proximity
 */

import { supabase } from '@/lib/supabase';

// =============================================================================
// TYPES
// =============================================================================

export interface BreedingCandidate {
    pet: any;
    score: number;
    breakdown: {
        geneticScore: number;
        healthScore: number;
        breedScore: number;
        colorScore: number;
        locationScore: number;
        availabilityScore: number;
    };
    warnings: BreedingWarning[];
    coi: number;
    colorPrediction: ColorPrediction[];
    relationship?: string;
}

export interface BreedingWarning {
    type: 'critical' | 'warning' | 'info';
    code: string;
    message: {
        th: string;
        en: string;
    };
}

export interface ColorPrediction {
    color: string;
    probability: number;
}

export interface BreedingAnalysis {
    status: 'excellent' | 'good' | 'acceptable' | 'risky' | 'not_recommended';
    candidates: BreedingCandidate[];
    summary: {
        th: string;
        en: string;
    };
}

// =============================================================================
// CONSTANTS
// =============================================================================

/** Maximum acceptable COI for healthy breeding */
const MAX_SAFE_COI = 0.0625; // 6.25% (first cousins)

/** COI thresholds */
const COI_THRESHOLDS = {
    PARENT_OFFSPRING: 0.25, // 25%
    FULL_SIBLINGS: 0.25,    // 25%
    HALF_SIBLINGS: 0.125,   // 12.5%
    FIRST_COUSINS: 0.0625,  // 6.25%
    SECOND_COUSINS: 0.0156, // 1.56%
};

/** Thai Ridgeback standard colors */
const TRD_STANDARD_COLORS = ['red', 'black', 'blue', 'fawn', 'แดง', 'ดำ', 'น้ำเงิน', 'ลาย'];

/** Color inheritance (simplified dominant/recessive) */
const COLOR_GENETICS: Record<string, { dominant: boolean; alleles: string[] }> = {
    'black': { dominant: true, alleles: ['B', 'B'] },
    'red': { dominant: false, alleles: ['b', 'b'] },
    'blue': { dominant: false, alleles: ['d', 'd'] }, // Dilution gene
    'fawn': { dominant: false, alleles: ['b', 'd'] },
    'ดำ': { dominant: true, alleles: ['B', 'B'] },
    'แดง': { dominant: false, alleles: ['b', 'b'] },
    'น้ำเงิน': { dominant: false, alleles: ['d', 'd'] },
    'ลาย': { dominant: false, alleles: ['b', 'd'] },
};

// =============================================================================
// CORE ALGORITHM
// =============================================================================

/**
 * Find the best breeding matches for a pet
 */
export async function findBreedingMatches(
    pet: any,
    options: {
        limit?: number;
        includeRelated?: boolean;
        maxCOI?: number;
        sameBreedOnly?: boolean;
        maxDistance?: number; // km
    } = {}
): Promise<BreedingAnalysis> {
    const {
        limit = 10,
        includeRelated = false,
        maxCOI = MAX_SAFE_COI,
        sameBreedOnly = true,
        maxDistance = 500
    } = options;

    // Determine opposite gender
    const targetGender = pet.gender === 'male' ? 'female' : 'male';

    // Fetch candidates
    let query = supabase
        .from('pets')
        .select(`
      *,
      owner:profiles!owner_id(full_name, phone, location),
      father:pets!father_id(id, name, breed, color),
      mother:pets!mother_id(id, name, breed, color)
    `)
        .eq('gender', targetGender)
        .neq('id', pet.id);

    if (sameBreedOnly && pet.breed) {
        query = query.eq('breed', pet.breed);
    }

    const { data: candidates, error } = await query.limit(100);

    if (error || !candidates) {
        console.error('Error fetching candidates:', error);
        return {
            status: 'not_recommended',
            candidates: [],
            summary: {
                th: 'เกิดข้อผิดพลาดในการค้นหาคู่ผสม',
                en: 'Error finding breeding matches'
            }
        };
    }

    // Score each candidate
    const scoredCandidates: BreedingCandidate[] = [];

    for (const candidate of candidates) {
        const result = await evaluateMatch(pet, candidate, maxCOI);
        if (result.score > 0 || includeRelated) {
            scoredCandidates.push(result);
        }
    }

    // Sort by score (highest first)
    scoredCandidates.sort((a, b) => b.score - a.score);

    // Take top N
    const topCandidates = scoredCandidates.slice(0, limit);

    // Determine overall status
    const status = determineStatus(topCandidates);

    // Generate summary
    const summary = generateSummary(pet, topCandidates, status);

    return {
        status,
        candidates: topCandidates,
        summary
    };
}

/**
 * Evaluate a single breeding match
 */
async function evaluateMatch(pet: any, candidate: any, maxCOI: number): Promise<BreedingCandidate> {
    const warnings: BreedingWarning[] = [];

    // 1. Calculate COI (Coefficient of Inbreeding)
    const { coi, relationship } = await calculateCOI(pet, candidate);

    // 2. Genetic Score (based on COI)
    let geneticScore = 100;
    if (coi >= COI_THRESHOLDS.PARENT_OFFSPRING) {
        geneticScore = 0;
        warnings.push({
            type: 'critical',
            code: 'PARENT_OFFSPRING',
            message: {
                th: '🚫 ความสัมพันธ์ใกล้ชิดเกินไป (พ่อแม่-ลูก หรือ พี่น้องแท้)',
                en: '🚫 Too closely related (parent-offspring or full siblings)'
            }
        });
    } else if (coi >= COI_THRESHOLDS.HALF_SIBLINGS) {
        geneticScore = 30;
        warnings.push({
            type: 'warning',
            code: 'HALF_SIBLINGS',
            message: {
                th: '⚠️ พบความสัมพันธ์พี่น้องต่างพ่อ/แม่',
                en: '⚠️ Half-sibling relationship detected'
            }
        });
    } else if (coi >= maxCOI) {
        geneticScore = 50;
        warnings.push({
            type: 'warning',
            code: 'HIGH_COI',
            message: {
                th: `⚠️ ค่า COI สูง (${(coi * 100).toFixed(2)}%) > ${(maxCOI * 100)}%`,
                en: `⚠️ High COI (${(coi * 100).toFixed(2)}%) > ${(maxCOI * 100)}%`
            }
        });
    } else if (coi > 0) {
        geneticScore = 80 - (coi * 100 * 5); // Slight penalty for any relation
    }

    // 3. Health Score
    let healthScore = 70; // Default if no health data
    if (candidate.health_certified) {
        healthScore = 100;
    }
    if (candidate.health_issues) {
        healthScore = 40;
        warnings.push({
            type: 'warning',
            code: 'HEALTH_ISSUES',
            message: {
                th: '⚠️ มีประวัติปัญหาสุขภาพ',
                en: '⚠️ Has health issue history'
            }
        });
    }

    // 4. Breed Score
    let breedScore = 100;
    if (pet.breed !== candidate.breed) {
        breedScore = 50; // Mixed breeding penalty
        warnings.push({
            type: 'info',
            code: 'MIXED_BREED',
            message: {
                th: `ℹ️ คนละสายพันธุ์ (${pet.breed} × ${candidate.breed})`,
                en: `ℹ️ Different breeds (${pet.breed} × ${candidate.breed})`
            }
        });
    }

    // 5. Color Score & Prediction
    const { colorScore, predictions } = predictColorOutcome(pet, candidate);

    // 6. Availability Score
    let availabilityScore = 50;
    if (candidate.available_for_breeding || candidate.for_sale) {
        availabilityScore = 100;
    }
    if (candidate.is_breeding) {
        availabilityScore = 30;
        warnings.push({
            type: 'info',
            code: 'CURRENTLY_BREEDING',
            message: {
                th: 'ℹ️ กำลังอยู่ในช่วงผสมพันธุ์กับตัวอื่น',
                en: 'ℹ️ Currently in breeding with another pet'
            }
        });
    }

    // 7. Location Score (simplified - same province = 100, same region = 75, else 50)
    let locationScore = 50;
    if (pet.location && candidate.location) {
        if (pet.location === candidate.location) {
            locationScore = 100;
        } else if (sameRegion(pet.location, candidate.location)) {
            locationScore = 75;
        }
    }

    // Calculate overall score (weighted)
    const score = (
        geneticScore * 0.35 +
        healthScore * 0.20 +
        breedScore * 0.15 +
        colorScore * 0.10 +
        availabilityScore * 0.10 +
        locationScore * 0.10
    );

    return {
        pet: candidate,
        score,
        breakdown: {
            geneticScore,
            healthScore,
            breedScore,
            colorScore,
            availabilityScore,
            locationScore
        },
        warnings,
        coi,
        colorPrediction: predictions,
        relationship
    };
}

// =============================================================================
// COI CALCULATION
// =============================================================================

interface AncestorMap {
    [id: string]: number; // id -> generation count
}

/**
 * Calculate Coefficient of Inbreeding between two pets
 * 
 * Using simplified Wright's method:
 * F = Σ (0.5)^(n1 + n2 + 1) × (1 + Fa)
 * 
 * Where:
 * - n1 = generations from pet1 to common ancestor
 * - n2 = generations from pet2 to common ancestor
 * - Fa = inbreeding coefficient of ancestor
 */
async function calculateCOI(pet1: any, pet2: any): Promise<{ coi: number; relationship?: string }> {
    // Quick check: Same parent?
    if (pet1.father_id && pet1.father_id === pet2.father_id) {
        return {
            coi: COI_THRESHOLDS.HALF_SIBLINGS,
            relationship: 'half-siblings (same father)'
        };
    }
    if (pet1.mother_id && pet1.mother_id === pet2.mother_id) {
        return {
            coi: COI_THRESHOLDS.HALF_SIBLINGS,
            relationship: 'half-siblings (same mother)'
        };
    }
    if (pet1.father_id && pet1.mother_id &&
        pet1.father_id === pet2.father_id &&
        pet1.mother_id === pet2.mother_id) {
        return {
            coi: COI_THRESHOLDS.FULL_SIBLINGS,
            relationship: 'full siblings'
        };
    }

    // Parent-offspring check
    if (pet1.id === pet2.father_id || pet1.id === pet2.mother_id ||
        pet2.id === pet1.father_id || pet2.id === pet1.mother_id) {
        return {
            coi: COI_THRESHOLDS.PARENT_OFFSPRING,
            relationship: 'parent-offspring'
        };
    }

    // Build ancestor trees (3 generations for simplicity)
    const ancestors1 = await getAncestors(pet1.id, 3);
    const ancestors2 = await getAncestors(pet2.id, 3);

    // Find common ancestors
    const commonAncestors: Array<{ id: string; gen1: number; gen2: number }> = [];

    for (const [id, gen1] of Object.entries(ancestors1)) {
        if (id in ancestors2) {
            commonAncestors.push({ id, gen1, gen2: ancestors2[id] });
        }
    }

    if (commonAncestors.length === 0) {
        return { coi: 0 };
    }

    // Calculate COI
    let coi = 0;
    for (const { gen1, gen2 } of commonAncestors) {
        coi += Math.pow(0.5, gen1 + gen2 + 1);
    }

    // Determine relationship name
    let relationship: string | undefined;
    if (coi >= COI_THRESHOLDS.FIRST_COUSINS) {
        relationship = 'first cousins or closer';
    } else if (coi >= COI_THRESHOLDS.SECOND_COUSINS) {
        relationship = 'second cousins';
    } else if (coi > 0) {
        relationship = 'distant relatives';
    }

    return { coi, relationship };
}

/**
 * Get ancestors up to N generations
 */
async function getAncestors(petId: string, generations: number): Promise<AncestorMap> {
    const ancestors: AncestorMap = {};
    const queue: Array<{ id: string; gen: number }> = [{ id: petId, gen: 0 }];

    while (queue.length > 0) {
        const { id, gen } = queue.shift()!;

        if (gen >= generations) continue;

        // Fetch parent IDs
        const { data } = await supabase
            .from('pets')
            .select('father_id, mother_id')
            .eq('id', id)
            .single();

        if (data) {
            if (data.father_id) {
                ancestors[data.father_id] = gen + 1;
                queue.push({ id: data.father_id, gen: gen + 1 });
            }
            if (data.mother_id) {
                ancestors[data.mother_id] = gen + 1;
                queue.push({ id: data.mother_id, gen: gen + 1 });
            }
        }
    }

    return ancestors;
}

// =============================================================================
// COLOR PREDICTION
// =============================================================================

/**
 * Predict color outcomes for offspring (simplified Mendelian)
 */
function predictColorOutcome(pet1: any, pet2: any): { colorScore: number; predictions: ColorPrediction[] } {
    const color1 = (pet1.color || '').toLowerCase();
    const color2 = (pet2.color || '').toLowerCase();

    // If no color data, return neutral
    if (!color1 || !color2) {
        return {
            colorScore: 70,
            predictions: [{ color: 'Unknown', probability: 1.0 }]
        };
    }

    const alleles1 = COLOR_GENETICS[color1]?.alleles || ['?', '?'];
    const alleles2 = COLOR_GENETICS[color2]?.alleles || ['?', '?'];

    // Simplified Punnett square
    const predictions: ColorPrediction[] = [];

    if (color1 === color2) {
        // Same color = high probability of same
        predictions.push({ color: color1, probability: 0.9 });
        predictions.push({ color: 'Mixed', probability: 0.1 });
    } else {
        // Different colors = each has chance
        predictions.push({ color: color1, probability: 0.35 });
        predictions.push({ color: color2, probability: 0.35 });
        predictions.push({ color: 'Mixed/Other', probability: 0.30 });
    }

    // Score based on whether colors are "standard" for breed
    const bothStandard = TRD_STANDARD_COLORS.includes(color1) && TRD_STANDARD_COLORS.includes(color2);
    const colorScore = bothStandard ? 100 : 60;

    return { colorScore, predictions };
}

// =============================================================================
// HELPERS
// =============================================================================

function sameRegion(loc1: string, loc2: string): boolean {
    // Thai regions mapping (simplified)
    const regions: Record<string, string[]> = {
        central: ['Bangkok', 'กรุงเทพ', 'นนทบุรี', 'ปทุมธานี', 'สมุทรปราการ', 'อยุธยา'],
        north: ['เชียงใหม่', 'เชียงราย', 'ลำปาง', 'พะเยา'],
        northeast: ['ขอนแก่น', 'อุดรธานี', 'นครราชสีมา', 'อุบลราชธานี', 'สกลนคร'],
        south: ['ภูเก็ต', 'สงขลา', 'นครศรีธรรมราช', 'สุราษฎร์ธานี'],
        east: ['ชลบุรี', 'ระยอง', 'จันทบุรี']
    };

    let region1: string | null = null;
    let region2: string | null = null;

    for (const [region, provinces] of Object.entries(regions)) {
        if (provinces.some(p => loc1.includes(p))) region1 = region;
        if (provinces.some(p => loc2.includes(p))) region2 = region;
    }

    return region1 !== null && region1 === region2;
}

function determineStatus(candidates: BreedingCandidate[]): BreedingAnalysis['status'] {
    if (candidates.length === 0) {
        return 'not_recommended';
    }

    const topScore = candidates[0]?.score || 0;
    const hasCritical = candidates[0]?.warnings.some(w => w.type === 'critical');

    if (hasCritical) return 'not_recommended';
    if (topScore >= 85) return 'excellent';
    if (topScore >= 70) return 'good';
    if (topScore >= 50) return 'acceptable';
    return 'risky';
}

function generateSummary(
    pet: any,
    candidates: BreedingCandidate[],
    status: BreedingAnalysis['status']
): { th: string; en: string } {
    if (candidates.length === 0) {
        return {
            th: `ไม่พบคู่ผสมที่เหมาะสมสำหรับ ${pet.name} ในขณะนี้`,
            en: `No suitable breeding matches found for ${pet.name} at this time`
        };
    }

    const top = candidates[0];
    const statusText = {
        excellent: { th: 'ยอดเยี่ยม', en: 'Excellent' },
        good: { th: 'ดี', en: 'Good' },
        acceptable: { th: 'พอรับได้', en: 'Acceptable' },
        risky: { th: 'เสี่ยง', en: 'Risky' },
        not_recommended: { th: 'ไม่แนะนำ', en: 'Not Recommended' }
    };

    return {
        th: `พบ ${candidates.length} คู่ผสมที่เป็นไปได้\n` +
            `🏆 แนะนำ: ${top.pet.name} (คะแนน ${Math.round(top.score)}/100)\n` +
            `📊 ค่า COI: ${(top.coi * 100).toFixed(2)}%\n` +
            `🎯 สถานะ: ${statusText[status].th}`,
        en: `Found ${candidates.length} possible matches\n` +
            `🏆 Recommended: ${top.pet.name} (Score ${Math.round(top.score)}/100)\n` +
            `📊 COI: ${(top.coi * 100).toFixed(2)}%\n` +
            `🎯 Status: ${statusText[status].en}`
    };
}

// =============================================================================
// QUICK MATCH (Simplified version for chat)
// =============================================================================

/**
 * Quick match for chat responses
 */
export async function quickBreedingMatch(
    pet: any,
    limit: number = 3
): Promise<{
    text: { th: string; en: string };
    matches: any[];
}> {
    const analysis = await findBreedingMatches(pet, { limit });

    return {
        text: analysis.summary,
        matches: analysis.candidates.map(c => ({
            ...c.pet,
            matchScore: c.score,
            coi: c.coi,
            warnings: c.warnings
        }))
    };
}

/**
 * Analyze a specific pairing
 */
export async function analyzeBreedingPair(
    pet1: any,
    pet2: any
): Promise<{
    compatible: boolean;
    analysis: BreedingCandidate;
    recommendation: { th: string; en: string };
}> {
    if (pet1.gender === pet2.gender) {
        return {
            compatible: false,
            analysis: {
                pet: pet2,
                score: 0,
                breakdown: { geneticScore: 0, healthScore: 0, breedScore: 0, colorScore: 0, availabilityScore: 0, locationScore: 0 },
                warnings: [{
                    type: 'critical',
                    code: 'SAME_GENDER',
                    message: {
                        th: '🚫 ไม่สามารถผสมพันธุ์ได้ เนื่องจากเป็นเพศเดียวกัน',
                        en: '🚫 Cannot breed - same gender'
                    }
                }],
                coi: 0,
                colorPrediction: []
            },
            recommendation: {
                th: `❌ ไม่แนะนำ: ${pet1.name} และ ${pet2.name} เป็นเพศเดียวกัน`,
                en: `❌ Not Recommended: ${pet1.name} and ${pet2.name} are the same gender`
            }
        };
    }

    const analysis = await evaluateMatch(pet1, pet2, MAX_SAFE_COI);
    const compatible = analysis.score >= 50 && !analysis.warnings.some(w => w.type === 'critical');

    let recommendation: { th: string; en: string };
    if (analysis.score >= 80) {
        recommendation = {
            th: `✅ แนะนำอย่างยิ่ง! คะแนน ${Math.round(analysis.score)}/100`,
            en: `✅ Highly Recommended! Score ${Math.round(analysis.score)}/100`
        };
    } else if (analysis.score >= 60) {
        recommendation = {
            th: `👍 เข้าคู่กันดี คะแนน ${Math.round(analysis.score)}/100`,
            en: `👍 Good Match! Score ${Math.round(analysis.score)}/100`
        };
    } else if (compatible) {
        recommendation = {
            th: `⚠️ พอรับได้ แต่มีข้อควรระวัง (${Math.round(analysis.score)}/100)`,
            en: `⚠️ Acceptable but with cautions (${Math.round(analysis.score)}/100)`
        };
    } else {
        recommendation = {
            th: `❌ ไม่แนะนำ เนื่องจากความเสี่ยงทางพันธุกรรม`,
            en: `❌ Not Recommended due to genetic risks`
        };
    }

    return { compatible, analysis, recommendation };
}
