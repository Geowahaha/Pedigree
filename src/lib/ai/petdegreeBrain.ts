/**
 * Petdegree Brain - Independent AI Engine
 * 
 * "The people who are crazy enough to think they can change the world
 * are the ones who do." - Steve Jobs
 * 
 * This engine is designed to be:
 * 1. FAST - No API calls for common queries
 * 2. OFFLINE-CAPABLE - Works without external LLM for 80% of queries
 * 3. CONTEXT-AWARE - Knows about the current pet, user, and session
 * 4. PREDICTIVE - Anticipates what users want before they ask
 */

import { supabase } from '@/lib/supabase';
import { quickBreedingMatch, analyzeBreedingPair } from './breedingMatch';
import { extractBestPetName } from './petNameMatcher';

// =============================================================================
// TYPES
// =============================================================================

export type Intent =
    | 'greeting'
    | 'search_pet'
    | 'view_pedigree'
    | 'breeding_advice'
    | 'health_query'
    | 'market_analysis'
    | 'document_request'
    | 'owner_lookup'
    | 'registration_help'
    | 'general_knowledge'
    | 'small_talk'
    | 'unknown';

export type EntityType = 'pet_name' | 'breed' | 'color' | 'location' | 'owner' | 'price' | 'date';

export interface Entity {
    type: EntityType;
    value: string;
    confidence: number;
    start: number;
    end: number;
}

export interface BrainContext {
    /** Current pet being discussed */
    currentPet?: any;
    /** User's session history */
    conversationHistory: Array<{ role: 'user' | 'ai'; text: string }>;
    /** Detected language */
    language: 'th' | 'en';
    /** User's profile if logged in */
    userProfile?: any;
    /** Recently viewed pets */
    recentPets?: any[];
    /** Current page context */
    pageContext?: 'home' | 'marketplace' | 'pedigree' | 'profile';
}

export interface BrainResponse {
    text: string;
    intent: Intent;
    confidence: number;
    entities: Entity[];
    suggestions?: string[];
    actions?: Array<{
        type: 'navigate' | 'show_pet' | 'show_pedigree' | 'open_modal' | 'copy';
        label: string;
        value: string;
        primary?: boolean;
    }>;
    data?: any;
    /** Type of response for UI rendering (e.g., 'pet_selection_list', 'pet_card') */
    responseType?: 'pet_card' | 'pet_selection_list' | 'text';
    source: 'local' | 'rag' | 'llm';
}

// =============================================================================
// INTENT CLASSIFICATION
// =============================================================================

interface IntentPattern {
    intent: Intent;
    patterns: RegExp[];
    keywords: string[];
    priority: number;
}

const INTENT_PATTERNS: IntentPattern[] = [
    // Greetings
    {
        intent: 'greeting',
        patterns: [/^(hi|hello|hey|good\s*(morning|afternoon|evening)|สวัสดี|หวัดดี|ดีครับ|ดีค่ะ)$/i],
        keywords: ['hi', 'hello', 'hey', 'สวัสดี', 'หวัดดี', 'ดี'],
        priority: 10
    },
    // Search
    {
        intent: 'search_pet',
        patterns: [/(?:find|search|look(?:ing)?\s*for|หา|ค้นหา|ขอดู|มี)/i],
        keywords: ['find', 'search', 'looking', 'หา', 'ค้นหา', 'ขอดู', 'มี'],
        priority: 8
    },
    // Pedigree
    {
        intent: 'view_pedigree',
        patterns: [/(?:pedigree|family\s*tree|lineage|สายเลือด|ผังครอบครัว|ใบเพ็ด|พ่อแม่)/i],
        keywords: ['pedigree', 'family', 'tree', 'lineage', 'parent', 'father', 'mother',
            'สายเลือด', 'ผัง', 'ครอบครัว', 'ใบเพ็ด', 'พ่อ', 'แม่'],
        priority: 9
    },
    // Breeding
    {
        intent: 'breeding_advice',
        patterns: [/(?:breed|mate|pair|match|ผสม|จับคู่|คู่ผสม|ทับ|หาคู่)/i],
        keywords: ['breed', 'breeding', 'mate', 'pair', 'match', 'ผสม', 'จับคู่', 'คู่ผสม', 'ทับ', 'หาคู่', 'คู่ผสมให้', 'find mate'],
        priority: 9
    },
    // Health
    {
        intent: 'health_query',
        patterns: [/(?:health|sick|disease|vaccine|สุขภาพ|ป่วย|โรค|วัคซีน)/i],
        keywords: ['health', 'sick', 'disease', 'vaccine', 'checkup', 'สุขภาพ', 'ป่วย', 'โรค', 'วัคซีน'],
        priority: 8
    },
    // Market
    {
        intent: 'market_analysis',
        patterns: [/(?:price|market|cost|value|ราคา|ตลาด|เท่าไหร่|ขาย)/i],
        keywords: ['price', 'market', 'cost', 'value', 'average', 'ราคา', 'ตลาด', 'เท่าไหร่', 'ขาย', 'ซื้อ'],
        priority: 8
    },
    // Documents
    {
        intent: 'document_request',
        patterns: [/(?:certificate|document|paper|เอกสาร|ใบรับรอง)/i],
        keywords: ['certificate', 'document', 'paper', 'เอกสาร', 'ใบรับรอง', 'ใบเพ็ด'],
        priority: 7
    },
    // Owner
    {
        intent: 'owner_lookup',
        patterns: [/(?:owner|who\s*own|contact|เจ้าของ|ใครเป็น|ติดต่อ)/i],
        keywords: ['owner', 'contact', 'breeder', 'เจ้าของ', 'ติดต่อ', 'ใคร'],
        priority: 7
    },
    // Registration
    {
        intent: 'registration_help',
        patterns: [/(?:register|จดทะเบียน|ลงทะเบียน|ขึ้นทะเบียน)/i],
        keywords: ['register', 'registration', 'signup', 'จดทะเบียน', 'ลงทะเบียน', 'ขึ้นทะเบียน'],
        priority: 6
    },
    // Small talk
    {
        intent: 'small_talk',
        patterns: [/^(ok|okay|thanks|thank|อากาศ|weather|ขอบคุณ|โอเค)$/i],
        keywords: ['ok', 'thanks', 'weather', 'อากาศ', 'ขอบคุณ', 'โอเค'],
        priority: 3
    }
];

/**
 * Classify user intent from query
 */
export function classifyIntent(query: string, context?: BrainContext): { intent: Intent; confidence: number } {
    const normalizedQuery = query.normalize('NFKC').toLowerCase().trim();

    if (!normalizedQuery) {
        return { intent: 'unknown', confidence: 0 };
    }

    let bestMatch: { intent: Intent; confidence: number } = { intent: 'unknown', confidence: 0 };

    for (const pattern of INTENT_PATTERNS) {
        // Check regex patterns
        for (const regex of pattern.patterns) {
            if (regex.test(normalizedQuery)) {
                const confidence = 0.9 * (pattern.priority / 10);
                if (confidence > bestMatch.confidence) {
                    bestMatch = { intent: pattern.intent, confidence };
                }
            }
        }

        // Check keywords
        const keywordMatches = pattern.keywords.filter(kw =>
            normalizedQuery.includes(kw.toLowerCase())
        ).length;

        if (keywordMatches > 0) {
            const confidence = Math.min(0.95, 0.3 + (keywordMatches * 0.15)) * (pattern.priority / 10);
            if (confidence > bestMatch.confidence) {
                bestMatch = { intent: pattern.intent, confidence };
            }
        }
    }

    // Context-based boosting or direct search detection
    if (bestMatch.intent === 'unknown' || bestMatch.intent === 'general_knowledge') {
        const wordCount = normalizedQuery.split(/\s+/).length;
        // If it's a short query (1-3 words) and doesn't match greeting/small talk,
        // it's VERY likely a direct search for a name or breed (e.g., "บุญทุ่ม" or "Golden")
        if (wordCount <= 3 && !normalizedQuery.match(/^(สวัสดี|ขอบคุณ|โอเค|ok|hi|bye)/)) {
            return { intent: 'search_pet', confidence: 0.6 };
        }

        if (context?.currentPet && wordCount <= 3) {
            return { intent: 'general_knowledge', confidence: 0.5 };
        }
    }

    return bestMatch.confidence > 0.3 ? bestMatch : { intent: 'general_knowledge', confidence: 0.4 };
}

// =============================================================================
// ENTITY EXTRACTION
// =============================================================================

const BREED_PATTERNS = [
    'thai ridgeback', 'ridgeback', 'golden retriever', 'labrador', 'poodle',
    'chihuahua', 'shiba', 'corgi', 'husky', 'pomeranian', 'french bulldog',
    'german shepherd', 'beagle', 'rottweiler', 'doberman',
    'ไทยหลังอาน', 'โกลเด้น', 'ลาบราดอร์', 'พุดเดิ้ล', 'ชิวาวา',
    'ชิบะ', 'คอร์กี้', 'ฮัสกี้', 'ปอม', 'เฟรนช์บูลด็อก'
];

const COLOR_PATTERNS = [
    'black', 'white', 'brown', 'gold', 'red', 'blue', 'fawn', 'brindle',
    'ดำ', 'ขาว', 'น้ำตาล', 'ทอง', 'แดง', 'น้ำเงิน', 'ลาย'
];

/**
 * Extract entities from query
 */
export function extractEntities(query: string): Entity[] {
    const entities: Entity[] = [];
    const normalizedQuery = query.normalize('NFKC').toLowerCase();

    // Extract breeds
    for (const breed of BREED_PATTERNS) {
        const index = normalizedQuery.indexOf(breed.toLowerCase());
        if (index >= 0) {
            entities.push({
                type: 'breed',
                value: breed,
                confidence: 0.9,
                start: index,
                end: index + breed.length
            });
        }
    }

    // Extract colors
    for (const color of COLOR_PATTERNS) {
        const index = normalizedQuery.indexOf(color.toLowerCase());
        if (index >= 0) {
            entities.push({
                type: 'color',
                value: color,
                confidence: 0.85,
                start: index,
                end: index + color.length
            });
        }
    }

    // Extract prices
    const priceMatch = query.match(/(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\s*(?:บาท|thb|฿)?/i);
    if (priceMatch) {
        entities.push({
            type: 'price',
            value: priceMatch[1].replace(/,/g, ''),
            confidence: 0.9,
            start: priceMatch.index!,
            end: priceMatch.index! + priceMatch[0].length
        });
    }

    return entities;
}

// =============================================================================
// KNOWLEDGE BASE (Pre-built responses)
// =============================================================================

interface KnowledgeEntry {
    patterns: RegExp[];
    response: { th: string; en: string };
    intent: Intent;
    actions?: BrainResponse['actions'];
}

const KNOWLEDGE_BASE: KnowledgeEntry[] = [
    // Greetings
    {
        patterns: [/^(hi|hello|hey)$/i, /^(สวัสดี|หวัดดี|ดีครับ|ดีค่ะ)$/i],
        response: {
            th: 'สวัสดีครับ! ผมคือ Eibpo AI พร้อมช่วยเหลือเรื่องสายพันธุ์สัตว์เลี้ยงของคุณครับ ถามอะไรได้เลย 🐾',
            en: 'Hello! I\'m Eibpo AI, here to help with your pet\'s pedigree and breeding needs. How can I assist you? 🐾'
        },
        intent: 'greeting'
    },
    // Good morning
    {
        patterns: [/good\s*morning/i, /อรุณสวัสดิ์/i],
        response: {
            th: 'อรุณสวัสดิ์ครับ! ☀️ วันนี้มีอะไรให้ช่วยเกี่ยวกับน้องหมาน้องแมวไหมครับ?',
            en: 'Good morning! ☀️ How can I help you with your pets today?'
        },
        intent: 'greeting'
    },
    // Dog gestation
    {
        patterns: [/(?:dog|สุนัข|หมา).*(?:pregnant|ตั้งท้อง|ท้อง|gestation)/i,
            /(?:pregnant|ตั้งท้อง|ท้อง|gestation).*(?:dog|สุนัข|หมา)/i],
        response: {
            th: '🐕 **สุนัขตั้งท้อง**\n\n' +
                '• ระยะเวลาตั้งท้องเฉลี่ย: **63 วัน** (58-68 วัน)\n' +
                '• ควรอัลตราซาวด์ยืนยันท้องที่ 25-30 วัน\n' +
                '• ควรเอ็กซ์เรย์นับลูกที่ 45+ วัน\n' +
                '• เพิ่มอาหารช่วง 5 สัปดาห์สุดท้าย\n\n' +
                'ต้องการคำนวณวันคลอดไหมครับ? บอกวันผสมมาได้เลย',
            en: '🐕 **Dog Pregnancy**\n\n' +
                '• Average gestation: **63 days** (58-68 days)\n' +
                '• Ultrasound confirmation at 25-30 days\n' +
                '• X-ray for puppy count at 45+ days\n' +
                '• Increase food in last 5 weeks\n\n' +
                'Want me to calculate the due date? Share the mating date.'
        },
        intent: 'health_query'
    },
    // Cat gestation
    {
        patterns: [/(?:cat|แมว).*(?:pregnant|ตั้งท้อง|ท้อง|gestation)/i,
            /(?:pregnant|ตั้งท้อง|ท้อง|gestation).*(?:cat|แมว)/i],
        response: {
            th: '🐱 **แมวตั้งท้อง**\n\n' +
                '• ระยะเวลาตั้งท้องเฉลี่ย: **63-65 วัน** (ประมาณ 9 สัปดาห์)\n' +
                '• อัลตราซาวด์ยืนยันได้ที่ 15-20 วัน\n' +
                '• เพิ่มโปรตีนและแคลเซียมช่วงท้าย\n\n' +
                'บอกวันผสมมาได้เลยถ้าต้องการคำนวณวันคลอด',
            en: '🐱 **Cat Pregnancy**\n\n' +
                '• Average gestation: **63-65 days** (about 9 weeks)\n' +
                '• Ultrasound confirmation at 15-20 days\n' +
                '• Increase protein and calcium in late pregnancy\n\n' +
                'Share the mating date if you want a due date estimate.'
        },
        intent: 'health_query'
    },
    // How to register
    {
        patterns: [/(?:how|วิธี).*(?:register|จดทะเบียน|ลงทะเบียน)/i],
        response: {
            th: '📝 **วิธีลงทะเบียนสัตว์เลี้ยง**\n\n' +
                '1. คลิกปุ่ม "Register Pet" หรือ "ลงทะเบียน"\n' +
                '2. กรอกข้อมูลพื้นฐาน (ชื่อ, สายพันธุ์, วันเกิด)\n' +
                '3. อัพโหลดรูปภาพ\n' +
                '4. เพิ่มข้อมูลพ่อแม่ (ถ้ามี)\n' +
                '5. ยืนยันและบันทึก\n\n' +
                'ต้องการให้เปิดหน้าลงทะเบียนไหมครับ?',
            en: '📝 **How to Register Your Pet**\n\n' +
                '1. Click "Register Pet" button\n' +
                '2. Fill in basic info (name, breed, birthdate)\n' +
                '3. Upload photos\n' +
                '4. Add parent info (if available)\n' +
                '5. Confirm and save\n\n' +
                'Want me to open the registration form?'
        },
        intent: 'registration_help',
        actions: [
            { type: 'open_modal', label: 'ลงทะเบียนเลย', value: 'openRegisterPet', primary: true }
        ]
    },
    // Inbreeding
    {
        patterns: [/(?:inbreed|เลือดชิด|ผสมชิด|coi)/i],
        response: {
            th: '🧬 **เรื่องเลือดชิด (Inbreeding)**\n\n' +
                '• ควรหลีกเลี่ยงการผสม พ่อ-ลูก หรือ พี่-น้อง\n' +
                '• ตรวจสายเลือดย้อนหลัง 3-5 รุ่น\n' +
                '• ค่า COI ไม่ควรเกิน 6.25% (ลูกพี่ลูกน้อง)\n' +
                '• ยิ่ง COI สูง ยิ่งเสี่ยงโรคทางพันธุกรรม\n\n' +
                'ต้องการให้ช่วยตรวจสอบสายเลือดของคู่ผสมไหมครับ?',
            en: '🧬 **About Inbreeding**\n\n' +
                '• Avoid parent-offspring or sibling pairings\n' +
                '• Check lineage for 3-5 generations\n' +
                '• COI should not exceed 6.25% (first cousins)\n' +
                '• Higher COI = higher genetic disease risk\n\n' +
                'Want me to check the lineage of a potential pairing?'
        },
        intent: 'breeding_advice'
    },
    // Thai Ridgeback
    {
        patterns: [/(?:thai\s*ridgeback|ไทย\s*หลังอาน|หลังอาน)/i],
        response: {
            th: '🐕 **หมาไทยหลังอาน**\n\n' +
                '• สายพันธุ์ดั้งเดิมของไทย มีมานานกว่า 400 ปี\n' +
                '• เอกลักษณ์: ขน "ridge" บนหลังขึ้นสวนทาง\n' +
                '• นิสัย: ฉลาด ซื่อสัตย์ ระวังคนแปลกหน้า\n' +
                '• สี: แดง, ดำ, น้ำเงิน, ลาย\n' +
                '• อายุเฉลี่ย: 12-14 ปี\n\n' +
                'ต้องการดู Thai Ridgeback ที่มีในระบบไหมครับ?',
            en: '🐕 **Thai Ridgeback**\n\n' +
                '• Ancient Thai breed, 400+ years old\n' +
                '• Signature: "ridge" of hair growing opposite direction\n' +
                '• Temperament: Intelligent, loyal, alert\n' +
                '• Colors: Red, Black, Blue, Fawn\n' +
                '• Lifespan: 12-14 years\n\n' +
                'Want to see Thai Ridgebacks in our database?'
        },
        intent: 'general_knowledge',
        actions: [
            { type: 'navigate', label: 'ดู Thai Ridgeback', value: '#search?breed=thai+ridgeback', primary: true }
        ]
    },
    // Thanks
    {
        patterns: [/^(thanks|thank\s*you|thx|ขอบคุณ|ขอบใจ)$/i],
        response: {
            th: 'ยินดีครับ! 🙏 ถ้ามีอะไรให้ช่วยเพิ่มเติม บอกได้เลยนะครับ',
            en: 'You\'re welcome! 🙏 Let me know if you need anything else.'
        },
        intent: 'small_talk'
    },
    // Weather/small talk
    {
        patterns: [/(?:weather|อากาศ)/i],
        response: {
            th: 'อากาศดีจริงครับ 😊 แต่ผมเก่งเรื่องสัตว์เลี้ยงมากกว่าเรื่องอากาศนะครับ ถ้ามีคำถามเกี่ยวกับหมาหรือแมว บอกได้เลย!',
            en: 'Nice weather! 😊 But I\'m better with pets than weather. If you have any dog or cat questions, I\'m here!'
        },
        intent: 'small_talk'
    },
    // Find breeding match query
    {
        patterns: [/(?:หาคู่ผสม|หาคู่ให้|find\s*mate|breeding\s*match)/i],
        response: {
            th: '💕 **หาคู่ผสม**\n\nกรุณาบอกชื่อสัตว์เลี้ยงที่ต้องการหาคู่ผสมให้ครับ\nตัวอย่าง: "หาคู่ผสมให้ KAKAO"',
            en: '💕 **Find Breeding Match**\n\nPlease tell me the pet name you want to find a match for.\nExample: "find mate for KAKAO"'
        },
        intent: 'breeding_advice'
    }
];

/**
 * Find matching knowledge base entry
 */
export function findKnowledgeMatch(query: string): KnowledgeEntry | null {
    const normalizedQuery = query.normalize('NFKC').toLowerCase().trim();

    for (const entry of KNOWLEDGE_BASE) {
        for (const pattern of entry.patterns) {
            if (pattern.test(normalizedQuery)) {
                return entry;
            }
        }
    }

    return null;
}

// =============================================================================
// RAG ENGINE (Retrieval-Augmented Generation)
// =============================================================================

export interface RAGContext {
    pets?: any[];
    breeds?: any[];
    marketData?: any;
    documents?: any[];
}

/**
 * Retrieve relevant context from database
 */
export async function retrieveContext(
    query: string,
    intent: Intent,
    entities: Entity[]
): Promise<RAGContext> {
    const context: RAGContext = {};

    try {
        // Search for pets based on entities
        if (intent === 'search_pet' || intent === 'view_pedigree' || intent === 'owner_lookup') {
            const breedEntity = entities.find(e => e.type === 'breed');
            const colorEntity = entities.find(e => e.type === 'color');

            let petQuery = supabase
                .from('pets')
                .select(`
                    *,
                    owner:profiles!owner_id(full_name),
                    father:pets!father_id(id, name, breed),
                    mother:pets!mother_id(id, name, breed)
                `)
                .limit(10);

            // Apply filters based on entities
            if (breedEntity) {
                petQuery = petQuery.ilike('breed', `%${breedEntity.value}%`);
            }
            if (colorEntity) {
                petQuery = petQuery.ilike('color', `%${colorEntity.value}%`);
            }

            // =====================================================
            // SMART ENTITY MATCHING (Database-driven)
            // Try to find pet names mentioned in the query first
            // =====================================================
            let searchTerm: string | null = null;

            if (!breedEntity && !colorEntity) {
                // Method 1: Smart match - scan query for known pet names
                const matchedPet = await extractBestPetName(query);

                if (matchedPet) {
                    console.log(`[RetrieveContext] Smart match found: "${matchedPet.name}"`);
                    searchTerm = matchedPet.name;
                } else {
                    // Method 2: Fallback - use keyword extraction
                    searchTerm = extractSearchTerm(query);
                    console.log(`[RetrieveContext] Fallback extraction: "${searchTerm}"`);
                }

                if (searchTerm && searchTerm.length >= 2) {
                    // Use wildcard for spaces to handle Thai name variations
                    const wildcardTerm = searchTerm.replace(/\s+/g, '%');
                    petQuery = petQuery.or(`name.ilike.%${wildcardTerm}%,registration_number.ilike.%${wildcardTerm}%`);
                }
            }

            const { data, error } = await petQuery;
            if (error) console.error('[RetrieveContext] Pet query error:', error);

            // Fetch parent data separately (Supabase self-referential JOINs don't work correctly)
            if (data && data.length > 0) {
                for (const pet of data) {
                    // Fetch father
                    if (pet.father_id) {
                        const { data: fatherData } = await supabase
                            .from('pets')
                            .select('id, name, breed')
                            .eq('id', pet.father_id)
                            .single();
                        pet.father = fatherData;
                    }

                    // Fetch mother
                    if (pet.mother_id) {
                        const { data: motherData } = await supabase
                            .from('pets')
                            .select('id, name, breed')
                            .eq('id', pet.mother_id)
                            .single();
                        pet.mother = motherData;
                    }

                    console.log(`[RetrieveContext] Pet: "${pet.name}", Father: ${pet.father?.name || 'null'}, Mother: ${pet.mother?.name || 'null'}`);
                }
            }

            context.pets = data || [];

            // If still no results, log for future semantic search
            if (context.pets.length === 0 && searchTerm) {
                console.log(`[RetrieveContext] No pets found for: "${searchTerm}"`);
            }
        }

        // Get market data
        if (intent === 'market_analysis') {
            const { data } = await supabase
                .from('pets')
                .select('breed, price')
                .not('price', 'is', null)
                .gt('price', 0)
                .limit(100);

            if (data && data.length > 0) {
                const prices = data.map((p: any) => p.price);
                context.marketData = {
                    avgPrice: prices.reduce((a: number, b: number) => a + b, 0) / prices.length,
                    minPrice: Math.min(...prices),
                    maxPrice: Math.max(...prices),
                    sampleSize: prices.length,
                    byBreed: groupByBreed(data)
                };
            }
        }

    } catch (error) {
        console.error('RAG retrieval error:', error);
    }

    return context;
}

function extractSearchTerm(query: string): string {
    // Remove common command words and fluff
    const cleanupTokens = [
        'looking for', 'show me', 'search for', 'find info', 'ขอดูข้อมูล', 'ขอข้อมูลของ',
        'find', 'search', 'show', 'where', 'info', 'query', 'about',
        'ค้นหา', 'หาข้อมูล', 'ข้อมูล', 'ขอดู', 'ขอเลข', 'มีข้อมุล', 'ขอดูรูป',
        'น้อง', 'ตัวที่', 'ชื่อว่า', 'ชื่อ', 'เกี่ยวกับ', 'ของ', 'มี', 'หา'
    ];

    // Important: Sort by length descending to match longest tokens first (e.g., 'ค้นหา' before 'หา')
    const sortedTokens = [...cleanupTokens].sort((a, b) => b.length - a.length);

    let cleaned = query.normalize('NFKC').toLowerCase();

    // Use simple string split/join for Thai (regex can have issues with Thai chars)
    for (const token of sortedTokens) {
        // Split by the token and rejoin with space - safer for Thai
        cleaned = cleaned.split(token.toLowerCase()).join(' ');
    }

    // Remove Thai vowels/marks that might be left hanging at start of words after stripping
    cleaned = cleaned.replace(/(^|\s)[\u0E31-\u0E3A\u0E47-\u0E4E]+/g, ' ');

    return cleaned.replace(/\s+/g, ' ').trim();
}

function groupByBreed(data: any[]): Record<string, { avg: number; count: number }> {
    const groups: Record<string, number[]> = {};

    for (const item of data) {
        if (!item.breed) continue;
        if (!groups[item.breed]) groups[item.breed] = [];
        groups[item.breed].push(item.price);
    }

    const result: Record<string, { avg: number; count: number }> = {};
    for (const [breed, prices] of Object.entries(groups)) {
        result[breed] = {
            avg: prices.reduce((a, b) => a + b, 0) / prices.length,
            count: prices.length
        };
    }

    return result;
}

// =============================================================================
// RESPONSE GENERATOR
// =============================================================================

/**
 * Generate response based on intent and context
 */
export async function generateResponse(
    query: string,
    intent: Intent,
    entities: Entity[],
    ragContext: RAGContext,
    brainContext: BrainContext
): Promise<BrainResponse> {
    const lang = brainContext.language;

    // =====================================================
    // CHECK PENDING ACTION (YES/NO confirmation)
    // =====================================================
    const { processPendingResponse, hasPendingAction } = await import('./pendingActionManager');

    if (hasPendingAction()) {
        const pendingResult = processPendingResponse(query);

        if (pendingResult) {
            if (pendingResult.confirmed && pendingResult.action) {
                console.log(`[generateResponse] Pending action CONFIRMED: ${pendingResult.action.value}`);

                // Direct navigation after short delay
                if (typeof window !== 'undefined' && pendingResult.action.type === 'link') {
                    setTimeout(() => {
                        console.log(`[generateResponse] Navigating to: ${pendingResult.action!.value}`);
                        window.location.href = pendingResult.action!.value;
                    }, 800);
                }

                return {
                    text: lang === 'th'
                        ? `ได้เลยครับ กำลังเปิด ${pendingResult.action.label}...`
                        : `Sure! Opening ${pendingResult.action.label}...`,
                    intent: 'search_pet',
                    confidence: 1.0,
                    entities: [],
                    actions: [{
                        type: pendingResult.action.type as any,
                        label: pendingResult.action.label,
                        value: pendingResult.action.value,
                        primary: true
                    }],
                    source: 'local'
                };
            } else {
                console.log('[generateResponse] Pending action REJECTED');
                return {
                    text: lang === 'th'
                        ? 'ได้ครับ 😊 มีอะไรให้ช่วยอีกไหมครับ?'
                        : 'No problem! 😊 Is there anything else I can help with?',
                    intent: 'small_talk',
                    confidence: 0.9,
                    entities: [],
                    source: 'local'
                };
            }
        }
    }

    // =====================================================
    // PRIORITY: If we found pets in RAG context, show them!
    // But first check if there's a specific TOPIC (vet, pedigree, etc.)
    // =====================================================
    if (ragContext.pets && ragContext.pets.length > 0) {
        const pet = ragContext.pets[0];

        // Check for topic-specific response using Context Extractor
        const { extractContext, getSuggestedAction } = await import('./contextExtractor');
        const context = await extractContext(query);

        console.log(`[generateResponse] Context: pet="${context.petName}", topic="${context.topic}", intent="${context.intent.type}"`);

        // If we have a specific topic (vet, pedigree, breeding), provide targeted response
        if (context.topic !== 'general' && pet.id) {
            // Override context with actual pet ID from RAG
            const enrichedContext = { ...context, petId: pet.id, petName: pet.name };
            const suggestion = getSuggestedAction(enrichedContext, lang);

            if (suggestion && suggestion.action) {
                console.log(`[generateResponse] Topic-specific response for: ${context.topic}`);

                // Save pending action for YES/NO confirmation
                const { setPendingAction } = await import('./pendingActionManager');
                setPendingAction({
                    type: suggestion.action.type,
                    value: suggestion.action.value,
                    label: suggestion.action.label,
                    petId: pet.id,
                    petName: pet.name,
                    topic: context.topic
                });

                return {
                    text: suggestion.text,
                    intent: 'search_pet',
                    confidence: 0.9,
                    entities,
                    data: pet,
                    source: 'rag'
                };
            }
        }

        // Default: show pet search response
        console.log(`[generateResponse] Found ${ragContext.pets.length} pets, generating search response`);
        return generateSearchResponse(ragContext, lang, entities);
    }

    // 1. First, check knowledge base for pre-built responses
    const knowledgeMatch = findKnowledgeMatch(query);
    if (knowledgeMatch) {
        return {
            text: lang === 'th' ? knowledgeMatch.response.th : knowledgeMatch.response.en,
            intent: knowledgeMatch.intent,
            confidence: 0.95,
            entities,
            actions: knowledgeMatch.actions,
            source: 'local'
        };
    }

    // 2. Handle specific intents with RAG context
    switch (intent) {
        case 'search_pet':
            return generateSearchResponse(ragContext, lang, entities);

        case 'breeding_advice':
            return await generateBreedingResponse(query, ragContext, brainContext, entities);

        case 'market_analysis':
            return generateMarketResponse(ragContext, lang);

        case 'greeting':
            return generateGreetingResponse(lang);

        case 'small_talk':
            return generateSmallTalkResponse(query, lang);

        default:
            // 3. If we have a current pet context, generate contextual response
            if (brainContext.currentPet) {
                return generatePetContextResponse(brainContext.currentPet, query, lang);
            }

            // 4. Fallback to general response
            return {
                text: lang === 'th'
                    ? 'ลองบอกชื่อสัตว์เลี้ยงหรือสิ่งที่ต้องการหาครับ ผมจะช่วยค้นหาให้'
                    : 'Try telling me a pet name or what you\'re looking for. I\'ll help you find it.',
                intent,
                confidence: 0.5,
                entities,
                source: 'local'
            };
    }
}

function generateSearchResponse(
    ragContext: RAGContext,
    lang: 'th' | 'en',
    entities: Entity[]
): BrainResponse {
    const pets = ragContext.pets || [];

    if (pets.length === 0) {
        return {
            text: lang === 'th'
                ? 'ในฐานะที่ผมดูแลระบบสายเลือด ผมลองค้นหาข้อมูลในคลังแล้วยังไม่พบชื่อที่ใกล้เคียงครับ ลองตรวจสอบตัวสะกด หรือบอกเลขทะเบียน/ไมโครชิปให้ผมช่วยค้นหาอีกทีดีไหมครับ?'
                : 'As your breeding expert, I’ve scanned our lineage database but couldn’t find a matching name. Could you double-check the spelling or provide a registration/microchip number?',
            intent: 'search_pet',
            confidence: 0.8,
            entities,
            source: 'rag'
        };
    }

    if (pets.length === 1) {
        const pet = pets[0];
        const birthDate = pet.birthday || pet.birth_date || pet.birthDate;
        let petAge = pet.age;
        let birthDateFormatted = '';

        if (birthDate) {
            const date = new Date(birthDate);
            birthDateFormatted = date.toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            if (!petAge) {
                const today = new Date();
                const ageInMonths = (today.getFullYear() - date.getFullYear()) * 12 + (today.getMonth() - date.getMonth());
                const years = Math.floor(ageInMonths / 12);
                const months = ageInMonths % 12;
                if (lang === 'th') {
                    petAge = years > 0 ? `${years} ปี ${months} เดือน` : `${months} เดือน`;
                } else {
                    petAge = years > 0 ? `${years}y ${months}m` : `${months}m`;
                }
            }
        }

        // --- EXPERT HERITAGE LOGIC ---
        const sireName = pet.father?.name || pet.father_name || (lang === 'th' ? 'ไม่ระบุ' : 'Unknown');
        const damName = pet.mother?.name || pet.mother_name || (lang === 'th' ? 'ไม่ระบุ' : 'Unknown');

        // Custom lineage for Boonthum or Bunping Farm pets
        let heritageDesc = '';
        const isBoonthum = pet.name && (pet.name.includes('บุญทุ่ม') || pet.name.toLowerCase().includes('boonthum'));
        const isThaiRidgeback = pet.breed && (pet.breed.includes('Thai Ridgeback') || pet.breed.includes('หลังอาน'));

        if (lang === 'th') {
            if (isBoonthum) {
                heritageDesc = `\nเป็นลูกของ พ่อ:${sireName} + แม่ ${damName} และ${pet.name}เป็นเหลนยายทวดบุญพิง`;
            } else if (isThaiRidgeback && pet.owner_name === 'Bunping Farm') {
                heritageDesc = `\nเป็นสายเลือดต้นทางจาก Bunping Farm (บุญพิง)`;
            } else if (pet.father_id || pet.mother_id) {
                heritageDesc = `\nเป็นลูกของ พ่อ:${sireName} + แม่ ${damName}`;
            }
        } else {
            if (isBoonthum) {
                heritageDesc = `\nOffspring of Sire:${sireName} + Dam:${damName}, and ${pet.name} is the great-grandchild of the legendary Bunping heritage.`;
            } else if (pet.father_id || pet.mother_id) {
                heritageDesc = `\nOffspring of Sire:${sireName} + Dam:${damName}`;
            }
        }

        return {
            text: lang === 'th'
                ? `พบ **${pet.name}** (${pet.breed})${birthDateFormatted ? ` เกิดวันที่ ${birthDateFormatted}` : ''} อายุ ${petAge || 'ไม่ระบุ'}${heritageDesc}\n` +
                `📍 ${pet.location || 'Thailand'}\n` +
                `👤 เจ้าของ: ${pet.owner?.full_name || pet.owner_name || 'ไม่ระบุ'}`
                : `Found **${pet.name}** (${pet.breed})${birthDateFormatted ? ` born on ${birthDateFormatted}` : ''} Age: ${petAge || 'Unknown'}${heritageDesc}\n` +
                `📍 ${pet.location || 'Thailand'}\n` +
                `👤 Owner: ${pet.owner?.full_name || pet.owner_name || 'Unknown'}`,
            intent: 'search_pet',
            confidence: 0.9,
            entities,
            data: {
                ...pet,
                image_url: pet.image_url || pet.imageUrl || pet.photo_url || null
            },
            actions: [
                { type: 'show_pet', label: lang === 'th' ? 'ดูรายละเอียด' : 'View Details', value: pet.id, primary: true },
                { type: 'show_pedigree', label: lang === 'th' ? 'ดูสายเลือด' : 'View Pedigree', value: pet.id }
            ],
            source: 'rag'
        };
    }

    // Multiple results - show selection list
    const petList = pets.slice(0, 5).map((p: any, i: number) => ({
        id: p.id,
        index: i + 1,
        name: p.name,
        breed: p.breed,
        location: p.location || 'Thailand',
        image_url: p.image_url || p.imageUrl || p.photo_url || null,
        owner_name: p.owner?.full_name || p.owner_name || null
    }));

    const petListText = petList.map((p: any) =>
        `${p.index}. **${p.name}** (${p.breed}) - ${p.owner_name || 'ไม่ระบุเจ้าของ'}`
    ).join('\n');

    return {
        text: lang === 'th'
            ? `พบ ${pets.length} รายการที่ตรงกัน:\n\n${petListText}\n\n` +
            `กดเลือกตัวที่ต้องการดูรายละเอียดได้เลยครับ`
            : `Found ${pets.length} matches:\n\n${petListText}\n\n` +
            `Click to select which one you'd like to view.`,
        intent: 'search_pet',
        confidence: 0.85,
        entities,
        data: petList,
        responseType: 'pet_selection_list',
        source: 'rag'
    };
}

function generateMarketResponse(ragContext: RAGContext, lang: 'th' | 'en'): BrainResponse {
    const market = ragContext.marketData;

    if (!market) {
        return {
            text: lang === 'th'
                ? 'ขณะนี้ยังไม่มีข้อมูลตลาดเพียงพอสำหรับการวิเคราะห์ครับ'
                : 'Not enough market data available for analysis.',
            intent: 'market_analysis',
            confidence: 0.7,
            entities: [],
            source: 'rag'
        };
    }

    const formatPrice = (price: number) => price.toLocaleString('th-TH');

    // Find top breeds by average price
    const breedEntries = Object.entries(market.byBreed || {}) as [string, { avg: number; count: number }][];
    const topBreeds = breedEntries
        .sort((a, b) => b[1].avg - a[1].avg)
        .slice(0, 3);

    const breedsText = topBreeds.length > 0
        ? topBreeds.map(([breed, data], i) =>
            `${i + 1}. ${breed}: ~${formatPrice(data.avg)} บาท (${data.count} ตัว)`
        ).join('\n')
        : '';

    return {
        text: lang === 'th'
            ? `📊 **สรุปตลาด**\n\n` +
            `• ราคาเฉลี่ย: **${formatPrice(market.avgPrice)} บาท**\n` +
            `• ช่วงราคา: ${formatPrice(market.minPrice)} - ${formatPrice(market.maxPrice)} บาท\n` +
            `• จำนวนตัวอย่าง: ${market.sampleSize} รายการ\n\n` +
            (breedsText ? `🏆 **ราคาเฉลี่ยตามสายพันธุ์**\n${breedsText}` : '')
            : `📊 **Market Summary**\n\n` +
            `• Average Price: **${formatPrice(market.avgPrice)} THB**\n` +
            `• Range: ${formatPrice(market.minPrice)} - ${formatPrice(market.maxPrice)} THB\n` +
            `• Sample Size: ${market.sampleSize} listings\n\n` +
            (breedsText ? `🏆 **Top Breeds by Price**\n${breedsText}` : ''),
        intent: 'market_analysis',
        confidence: 0.9,
        entities: [],
        data: market,
        source: 'rag'
    };
}

function generateGreetingResponse(lang: 'th' | 'en'): BrainResponse {
    const greetings = {
        th: [
            'สวัสดีครับ! ผมคือ Eibpo AI พร้อมช่วยเหลือเรื่องสายพันธุ์สัตว์เลี้ยงครับ 🐾',
            'ยินดีต้อนรับครับ! วันนี้มีอะไรให้ช่วยเกี่ยวกับน้องหมาน้องแมวไหมครับ? 🐕🐱',
            'สวัสดีครับ! พร้อมช่วยหาข้อมูลสายเลือด วางแผนผสมพันธุ์ หรือวิเคราะห์ตลาดครับ 🧬'
        ],
        en: [
            'Hello! I\'m Eibpo AI, here to help with pedigrees and breeding. 🐾',
            'Welcome! How can I help with your pets today? 🐕🐱',
            'Hi there! Ready to help with lineage, breeding plans, or market analysis. 🧬'
        ]
    };

    const options = greetings[lang];
    const text = options[Math.floor(Math.random() * options.length)];

    return {
        text,
        intent: 'greeting',
        confidence: 0.95,
        entities: [],
        suggestions: lang === 'th'
            ? ['หาหมา Thai Ridgeback', 'ราคาตลาด', 'วิธีลงทะเบียน']
            : ['Find Thai Ridgeback', 'Market prices', 'How to register'],
        source: 'local'
    };
}

function generateSmallTalkResponse(query: string, lang: 'th' | 'en'): BrainResponse {
    return {
        text: lang === 'th'
            ? 'รับทราบครับ 😊 ถ้ามีคำถามเกี่ยวกับสัตว์เลี้ยง บอกได้เลยนะครับ'
            : 'Got it! 😊 If you have any pet questions, just ask.',
        intent: 'small_talk',
        confidence: 0.8,
        entities: [],
        source: 'local'
    };
}

/**
 * Generate breeding match response
 */
async function generateBreedingResponse(
    query: string,
    ragContext: RAGContext,
    brainContext: BrainContext,
    entities: Entity[]
): Promise<BrainResponse> {
    const lang = brainContext.language;

    // Extract pet name from query
    const petNameMatch = query.match(
        /(?:หาคู่ผสมให้|หาคู่ให้|find\s*mate\s*for|breeding\s*match\s*for|match\s*for)\s*[\"\'"]?([^\"\'']+)[\"\'"]?/i
    );

    let targetPet = brainContext.currentPet;

    if (petNameMatch) {
        const petName = petNameMatch[1].trim();
        // Search for the pet
        const { data } = await supabase
            .from('pets')
            .select('*')
            .ilike('name', `%${petName}%`)
            .limit(1)
            .single();

        if (data) {
            targetPet = data;
        }
    }

    // If no pet found, prompt user
    if (!targetPet) {
        // Check if there's a pet in RAG context
        if (ragContext.pets && ragContext.pets.length > 0) {
            targetPet = ragContext.pets[0];
        } else {
            return {
                text: lang === 'th'
                    ? '💕 **หาคู่ผสม**\n\nกรุณาบอกชื่อสัตว์เลี้ยงที่ต้องการหาคู่ผสมให้ครับ\n\nตัวอย่าง: "หาคู่ผสมให้ KAKAO"'
                    : '💕 **Breeding Match**\n\nPlease tell me which pet you want to find a mate for.\n\nExample: "find mate for KAKAO"',
                intent: 'breeding_advice',
                confidence: 0.7,
                entities,
                source: 'local'
            };
        }
    }

    // Now we have a target pet - find breeding matches
    try {
        const result = await quickBreedingMatch(targetPet, 5);

        if (result.matches.length === 0) {
            return {
                text: lang === 'th'
                    ? `💔 ไม่พบคู่ผสมที่เหมาะสมสำหรับ **${targetPet.name}** ในขณะนี้ครับ\n\nอาจเป็นเพราะยังไม่มีสัตว์เลี้ยงเพศตรงข้ามสายพันธุ์เดียวกันในระบบ`
                    : `💔 No suitable matches found for **${targetPet.name}** at this time.\n\nThis may be because there are no opposite-gender pets of the same breed in our system.`,
                intent: 'breeding_advice',
                confidence: 0.8,
                entities,
                data: targetPet,
                source: 'rag'
            };
        }

        // Format matches for display
        const matchList = result.matches.slice(0, 3).map((m: any, i: number) => {
            const coiText = m.coi ? `COI: ${(m.coi * 100).toFixed(1)}%` : '';
            return lang === 'th'
                ? `${i + 1}. **${m.name}** (${m.breed}) - คะแนน ${Math.round(m.matchScore)}/100 ${coiText}`
                : `${i + 1}. **${m.name}** (${m.breed}) - Score ${Math.round(m.matchScore)}/100 ${coiText}`;
        }).join('\n');

        return {
            text: lang === 'th'
                ? `💕 **คู่ผsมสำหรับ ${targetPet.name}**\n\n${result.text.th}\n\n**แนะนำ:**\n${matchList}\n\n_กดที่ชื่อเพื่อดูรายละเอียดเพิ่มเติม_`
                : `💕 **Matches for ${targetPet.name}**\n\n${result.text.en}\n\n**Recommended:**\n${matchList}\n\n_Click a name to see more details_`,
            intent: 'breeding_advice',
            confidence: 0.9,
            entities,
            data: {
                targetPet,
                matches: result.matches
            },
            actions: [
                {
                    type: 'open_modal',
                    label: lang === 'th' ? '🔍 ดูทั้งหมด' : '🔍 View All',
                    value: `breedingMatch:${targetPet.id}`,
                    primary: true
                }
            ],
            source: 'rag'
        };
    } catch (error) {
        console.error('Breeding match error:', error);
        return {
            text: lang === 'th'
                ? 'ขออภัยครับ เกิดข้อผิดพลาดในการค้นหาคู่ผสม กรุณาลองใหม่อีกครั้ง'
                : 'Sorry, there was an error finding breeding matches. Please try again.',
            intent: 'breeding_advice',
            confidence: 0.5,
            entities,
            source: 'local'
        };
    }
}

function generatePetContextResponse(pet: any, query: string, lang: 'th' | 'en'): BrainResponse {
    return {
        text: lang === 'th'
            ? `กำลังดูข้อมูลของ **${pet.name}** อยู่ใช่ไหมครับ?\n\n` +
            `ถ้าต้องการดูสายเลือด พิมพ์ "pedigree" หรือ "สายเลือด"\n` +
            `ถ้าต้องการหาคู่ผสม พิมพ์ "หาคู่ผสม"`
            : `Looking at **${pet.name}**?\n\n` +
            `Type "pedigree" to see family tree\n` +
            `Type "find mate" for breeding matches`,
        intent: 'general_knowledge',
        confidence: 0.7,
        entities: [],
        data: pet,
        source: 'local'
    };
}

// =============================================================================
// MAIN BRAIN FUNCTION
// =============================================================================

/**
 * Main entry point for the Petdegree Brain
 */
export async function think(
    query: string,
    context: Partial<BrainContext> = {}
): Promise<BrainResponse> {
    // Initialize context
    const brainContext: BrainContext = {
        conversationHistory: context.conversationHistory || [],
        language: detectLanguage(query),
        currentPet: context.currentPet,
        userProfile: context.userProfile,
        recentPets: context.recentPets,
        pageContext: context.pageContext
    };

    // 1. Classify intent
    const { intent, confidence: intentConfidence } = classifyIntent(query, brainContext);

    // 2. Extract entities
    const entities = extractEntities(query);

    // 3. Retrieve relevant context (RAG)
    const ragContext = await retrieveContext(query, intent, entities);

    // 4. Generate response
    const response = await generateResponse(query, intent, entities, ragContext, brainContext);

    return response;
}

/**
 * Detect language from query
 */
function detectLanguage(query: string): 'th' | 'en' {
    return /[\u0E01-\u0E59]/.test(query) ? 'th' : 'en';
}

// Export for testing
export const __brainTestExports = {
    classifyIntent,
    extractEntities,
    findKnowledgeMatch,
    detectLanguage
};
