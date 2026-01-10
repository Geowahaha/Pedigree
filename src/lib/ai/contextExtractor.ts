/**
 * Context Extractor - Petdegree AI
 * 
 * "The best way to predict the future is to create it." - Peter Drucker
 * 
 * This module extracts semantic context from user queries:
 * - WHO: Pet name (using petNameMatcher)
 * - WHAT: Topic (vet, breeding, market, pedigree, general)
 * - HOW: Intent (question, lookup, action)
 */

// =============================================================================
// TOPIC PATTERNS
// =============================================================================

interface TopicPattern {
    id: string;
    keywords: string[];
    priority: number;
    route?: string;
}

const TOPIC_PATTERNS: TopicPattern[] = [
    {
        id: 'vet',
        keywords: [
            // English
            'vet', 'veterinary', 'health', 'sick', 'ill', 'disease', 'vaccine', 'vaccination',
            'surgery', 'operation', 'medicine', 'treatment', 'diagnosis', 'symptom',
            'allergy', 'injury', 'pain', 'died', 'death', 'passed away', 'deceased',
            'spay', 'neuter', 'checkup', 'examination',
            // Thai
            'สัตว์แพทย์', 'หมอ', 'สุขภาพ', 'ป่วย', 'เจ็บ', 'โรค', 'วัคซีน', 'ฉีดยา',
            'ผ่าตัด', 'ยา', 'รักษา', 'อาการ', 'แพ้', 'บาดเจ็บ', 'เจ็บปวด',
            'เสียชีวิต', 'ตาย', 'จากไป', 'ทำหมัน', 'ตรวจสุขภาพ'
        ],
        priority: 10,
        route: '/vet-profile'
    },
    {
        id: 'breeding',
        keywords: [
            // English
            'breed', 'breeding', 'mate', 'mating', 'pregnant', 'pregnancy', 'puppy', 'puppies',
            'kitten', 'kittens', 'litter', 'heat', 'estrus', 'ovulation', 'gestation',
            'stud', 'dam', 'sire', 'inbreeding', 'lineage', 'offspring', 'genetics',
            // Thai
            'ผสมพันธุ์', 'ผสม', 'คู่ผสม', 'ตั้งท้อง', 'ลูก', 'ลูกหมา', 'ลูกแมว',
            'เป็นสัด', 'ตกไข่', 'ตั้งครรภ์', 'พ่อพันธุ์', 'แม่พันธุ์', 'เลือดชิด',
            'สายเลือด', 'พันธุกรรม', 'ยีน'
        ],
        priority: 8,
        route: '/breeding'
    },
    {
        id: 'pedigree',
        keywords: [
            // English
            'pedigree', 'family', 'tree', 'ancestry', 'ancestor', 'parent', 'parents',
            'father', 'mother', 'grandparent', 'lineage', 'heritage', 'bloodline',
            'certificate', 'registration', 'registration number',
            // Thai
            'เพ็ดดีกรี', 'ผัง', 'ครอบครัว', 'สายเลือด', 'บรรพบุรุษ', 'พ่อแม่',
            'พ่อ', 'แม่', 'ปู่ย่า', 'ตายาย', 'ใบเพ็ด', 'ใบรับรอง', 'ทะเบียน'
        ],
        priority: 7,
        route: '/pedigree'
    },
    {
        id: 'market',
        keywords: [
            // English
            'price', 'cost', 'buy', 'sell', 'sale', 'for sale', 'available', 'market',
            'listing', 'adopt', 'adoption', 'offer', 'deal',
            // Thai
            'ราคา', 'ซื้อ', 'ขาย', 'หาซื้อ', 'ขายอยู่', 'ตลาด', 'ประกาศ', 'เปิดขาย'
        ],
        priority: 6,
        route: '/marketplace'
    },
    {
        id: 'owner',
        keywords: [
            // English
            'owner', 'contact', 'breeder', 'who owns', 'belong to', 'whose',
            // Thai
            'เจ้าของ', 'ติดต่อ', 'นักเพาะพันธุ์', 'ของใคร', 'เป็นของ'
        ],
        priority: 5
    }
];

// =============================================================================
// INTENT PATTERNS
// =============================================================================

interface IntentMatch {
    type: 'question' | 'lookup' | 'action' | 'unknown';
    subtype?: string;
}

const QUESTION_PATTERNS = [
    // English
    /^(what|who|where|when|why|how|is|are|does|did|can|could|will|would)/i,
    /\?$/,
    // Thai
    /^(อะไร|ใคร|ที่ไหน|เมื่อไหร่|ทำไม|อย่างไร|ยังไง|หรือเปล่า|ไหม|มั้ย|รึเปล่า)/,
    /(อะไร|ใคร|ที่ไหน|เมื่อไหร่|ทำไม|ยังไง|ไหม|มั้ย|รึเปล่า|\?)\s*$/
];

const ACTION_PATTERNS = [
    // English
    /^(show|find|search|get|give|tell|help|open|view|see)/i,
    // Thai
    /^(หา|ค้นหา|ดู|ขอ|ช่วย|เปิด|แสดง|บอก)/
];

// =============================================================================
// CONTEXT EXTRACTION
// =============================================================================

export interface ExtractedContext {
    petName: string | null;
    petId: string | null;
    topic: string;
    topicRoute: string | null;
    intent: IntentMatch;
    confidence: number;
    rawQuery: string;
}

/**
 * Extract semantic context from a user query
 */
export async function extractContext(query: string): Promise<ExtractedContext> {
    const queryLower = query.normalize('NFKC').toLowerCase();

    // 1. Extract pet name using petNameMatcher
    const { extractBestPetName } = await import('./petNameMatcher');
    const matchedPet = await extractBestPetName(query);

    // 2. Detect topic
    let bestTopic = { id: 'general', priority: 0, route: null as string | null };

    for (const pattern of TOPIC_PATTERNS) {
        for (const keyword of pattern.keywords) {
            if (queryLower.includes(keyword.toLowerCase())) {
                if (pattern.priority > bestTopic.priority) {
                    bestTopic = { id: pattern.id, priority: pattern.priority, route: pattern.route || null };
                }
                break;
            }
        }
    }

    // 3. Detect intent
    let intent: IntentMatch = { type: 'unknown' };

    for (const pattern of QUESTION_PATTERNS) {
        if (pattern.test(query)) {
            intent = { type: 'question' };
            break;
        }
    }

    if (intent.type === 'unknown') {
        for (const pattern of ACTION_PATTERNS) {
            if (pattern.test(query)) {
                intent = { type: 'action' };
                break;
            }
        }
    }

    if (intent.type === 'unknown' && matchedPet) {
        intent = { type: 'lookup' };
    }

    // 4. Calculate confidence
    let confidence = 0.3; // base
    if (matchedPet) confidence += 0.3;
    if (bestTopic.id !== 'general') confidence += 0.2;
    if (intent.type !== 'unknown') confidence += 0.2;

    return {
        petName: matchedPet?.name || null,
        petId: matchedPet?.id || null,
        topic: bestTopic.id,
        topicRoute: bestTopic.route,
        intent,
        confidence: Math.min(confidence, 1.0),
        rawQuery: query
    };
}

/**
 * Get suggested action based on extracted context
 */
export function getSuggestedAction(context: ExtractedContext, lang: 'th' | 'en'): {
    text: string;
    action?: { type: 'link' | 'copy' | 'event'; value: string; label: string; primary?: boolean };
} | null {
    if (!context.petId) return null;

    if (context.topic === 'vet') {
        return {
            text: lang === 'th'
                ? `ผมพบข้อมูลสุขภาพของ ${context.petName} อยู่ในระบบ Vet AI Profile ต้องการดูไหมครับ?`
                : `I found health records for ${context.petName} in our Vet AI Profile. Would you like to view them?`,
            action: {
                type: 'link',
                value: `/vet-profile/${context.petId}`,
                label: lang === 'th' ? 'ดู Vet AI Profile' : 'View Vet Profile',
                primary: true
            }
        };
    }

    if (context.topic === 'pedigree') {
        return {
            text: lang === 'th'
                ? `นี่คือสายเลือดของ ${context.petName} ครับ`
                : `Here's the pedigree for ${context.petName}.`,
            action: {
                type: 'link',
                value: `/pedigree/${context.petId}`,
                label: lang === 'th' ? 'ดูสายเลือด' : 'View Pedigree',
                primary: true
            }
        };
    }

    return null;
}

// =============================================================================
// EXPORTS
// =============================================================================

export const contextExtractor = {
    extract: extractContext,
    getSuggestedAction
};

export default contextExtractor;
