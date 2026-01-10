/**
 * Predictive Suggestions Engine
 * 
 * "People don't know what they want until you show it to them."
 * - Steve Jobs
 * 
 * This engine anticipates user needs based on:
 * - Current context (page, pet, time)
 * - Behavioral patterns
 * - Seasonal/temporal factors
 * - User journey stage
 */

import { supabase } from '@/lib/supabase';

// =============================================================================
// TYPES
// =============================================================================

export interface Suggestion {
    id: string;
    type: 'action' | 'question' | 'insight' | 'reminder';
    title: string;
    description?: string;
    icon?: string;
    priority: number;
    action?: {
        type: 'navigate' | 'search' | 'chat' | 'modal';
        value: string;
    };
    relevance: number;
}

export interface PredictionContext {
    currentPet?: any;
    userProfile?: any;
    pageContext?: string;
    timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
    dayOfWeek?: number;
    recentActions?: string[];
    searchHistory?: string[];
    ownedPets?: any[];
}

// =============================================================================
// TIME-BASED HELPERS
// =============================================================================

function getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
}

function getCurrentMonth(): number {
    return new Date().getMonth() + 1; // 1-12
}

// =============================================================================
// SUGGESTION GENERATORS
// =============================================================================

/**
 * Generate contextual suggestions based on current pet
 */
function generatePetContextSuggestions(pet: any, lang: 'th' | 'en'): Suggestion[] {
    const suggestions: Suggestion[] = [];

    if (!pet) return suggestions;

    // Always suggest viewing pedigree
    suggestions.push({
        id: 'view-pedigree',
        type: 'action',
        title: lang === 'th' ? `ดูสายเลือดของ ${pet.name}` : `View ${pet.name}'s Pedigree`,
        description: lang === 'th' ? 'ดูผังครอบครัว 5 รุ่น' : 'See 5-generation family tree',
        icon: '🧬',
        priority: 10,
        action: { type: 'modal', value: 'pedigree' },
        relevance: 0.95
    });

    // If pet is female and in breeding age, suggest breeding matches
    if (pet.gender === 'female') {
        const age = calculatePetAge(pet.birthDate);
        if (age >= 2 && age <= 7) {
            suggestions.push({
                id: 'find-mate',
                type: 'action',
                title: lang === 'th' ? 'หาคู่ผสมที่เหมาะสม' : 'Find Suitable Mate',
                description: lang === 'th' ? 'วิเคราะห์สายเลือดหาคู่ที่ดีที่สุด' : 'Analyze lineage for best match',
                icon: '💕',
                priority: 8,
                action: { type: 'search', value: `breed:${pet.breed} gender:male` },
                relevance: 0.85
            });
        }
    }

    // If pet has documents, remind about certificates
    if (!pet.documents || pet.documents.length === 0) {
        suggestions.push({
            id: 'upload-docs',
            type: 'reminder',
            title: lang === 'th' ? 'อัพโหลดเอกสาร' : 'Upload Documents',
            description: lang === 'th' ? 'เพิ่มใบรับรองสุขภาพหรือใบเพ็ด' : 'Add health certificates or pedigree papers',
            icon: '📄',
            priority: 5,
            action: { type: 'modal', value: 'uploadDocument' },
            relevance: 0.7
        });
    }

    // Market insight if pet has price
    if (pet.price) {
        suggestions.push({
            id: 'market-insight',
            type: 'insight',
            title: lang === 'th' ? 'วิเคราะห์ราคาตลาด' : 'Market Price Analysis',
            description: lang === 'th' ? `เปรียบเทียบราคา ${pet.breed}` : `Compare ${pet.breed} prices`,
            icon: '📊',
            priority: 6,
            action: { type: 'chat', value: `ราคาเฉลี่ย ${pet.breed}` },
            relevance: 0.75
        });
    }

    return suggestions;
}

/**
 * Generate time-sensitive suggestions
 */
function generateTimeBasedSuggestions(context: PredictionContext, lang: 'th' | 'en'): Suggestion[] {
    const suggestions: Suggestion[] = [];
    const timeOfDay = context.timeOfDay || getTimeOfDay();
    const month = getCurrentMonth();

    // Morning greetings with tips
    if (timeOfDay === 'morning') {
        suggestions.push({
            id: 'morning-tip',
            type: 'insight',
            title: lang === 'th' ? 'เคล็ดลับตอนเช้า' : 'Morning Tip',
            description: lang === 'th'
                ? 'หมาควรออกกำลังกายตอนเช้าก่อนอากาศร้อน'
                : 'Dogs should exercise in the morning before it gets hot',
            icon: '🌅',
            priority: 3,
            relevance: 0.5
        });
    }

    // Breeding season reminders (varies by breed)
    if (month >= 9 && month <= 12) {
        suggestions.push({
            id: 'breeding-season',
            type: 'reminder',
            title: lang === 'th' ? 'ช่วงผสมพันธุ์ยอดนิยม' : 'Popular Breeding Season',
            description: lang === 'th'
                ? 'ช่วงปลายปีคนนิยมหาลูกหมาลูกแมว'
                : 'End of year is popular for finding puppies/kittens',
            icon: '📅',
            priority: 4,
            action: { type: 'navigate', value: '#marketplace' },
            relevance: 0.6
        });
    }

    // Vaccine reminders (general)
    if (month === 1 || month === 7) {
        suggestions.push({
            id: 'vaccine-reminder',
            type: 'reminder',
            title: lang === 'th' ? 'เช็ควัคซีนประจำปี' : 'Annual Vaccine Check',
            description: lang === 'th'
                ? 'ควรตรวจสอบวัคซีนสัตว์เลี้ยงทุก 6 เดือน'
                : 'Check your pet\'s vaccinations every 6 months',
            icon: '💉',
            priority: 5,
            relevance: 0.65
        });
    }

    return suggestions;
}

/**
 * Generate suggestions based on user journey
 */
function generateJourneySuggestions(context: PredictionContext, lang: 'th' | 'en'): Suggestion[] {
    const suggestions: Suggestion[] = [];

    // New user without pets
    if (!context.ownedPets || context.ownedPets.length === 0) {
        suggestions.push({
            id: 'register-first-pet',
            type: 'action',
            title: lang === 'th' ? 'ลงทะเบียนสัตว์เลี้ยงตัวแรก' : 'Register Your First Pet',
            description: lang === 'th'
                ? 'เริ่มบันทึกประวัติสายพันธุ์ของน้อง'
                : 'Start recording your pet\'s lineage history',
            icon: '🐾',
            priority: 10,
            action: { type: 'modal', value: 'registerPet' },
            relevance: 0.95
        });

        suggestions.push({
            id: 'browse-marketplace',
            type: 'action',
            title: lang === 'th' ? 'ดูสัตว์เลี้ยงในระบบ' : 'Browse Available Pets',
            description: lang === 'th'
                ? 'ค้นหาหมาหรือแมวที่สนใจ'
                : 'Find dogs or cats you\'re interested in',
            icon: '🔍',
            priority: 8,
            action: { type: 'navigate', value: '#search' },
            relevance: 0.85
        });
    }

    // User with pets but no recent activity
    if (context.ownedPets && context.ownedPets.length > 0) {
        suggestions.push({
            id: 'update-pet-info',
            type: 'reminder',
            title: lang === 'th' ? 'อัพเดทข้อมูลสัตว์เลี้ยง' : 'Update Pet Information',
            description: lang === 'th'
                ? 'เพิ่มรูปภาพหรือข้อมูลใหม่'
                : 'Add new photos or information',
            icon: '✏️',
            priority: 4,
            action: { type: 'navigate', value: '#my-pets' },
            relevance: 0.6
        });
    }

    return suggestions;
}

/**
 * Generate page-specific suggestions
 */
function generatePageSuggestions(pageContext: string, lang: 'th' | 'en'): Suggestion[] {
    const suggestions: Suggestion[] = [];

    switch (pageContext) {
        case 'home':
            suggestions.push({
                id: 'explore-pedigrees',
                type: 'question',
                title: lang === 'th' ? 'ค้นหาสายพันธุ์' : 'Search Pedigrees',
                description: lang === 'th' ? 'หาหมาหรือแมวที่สนใจ' : 'Find dogs or cats you love',
                icon: '🔎',
                priority: 7,
                action: { type: 'chat', value: '' },
                relevance: 0.8
            });
            break;

        case 'marketplace':
            suggestions.push({
                id: 'price-comparison',
                type: 'insight',
                title: lang === 'th' ? 'เปรียบเทียบราคา' : 'Compare Prices',
                description: lang === 'th' ? 'ดูราคาเฉลี่ยตามสายพันธุ์' : 'See average prices by breed',
                icon: '💰',
                priority: 8,
                action: { type: 'chat', value: 'ราคาตลาด' },
                relevance: 0.85
            });
            break;

        case 'pedigree':
            suggestions.push({
                id: 'explain-lineage',
                type: 'question',
                title: lang === 'th' ? 'อธิบายสายเลือดนี้' : 'Explain This Lineage',
                description: lang === 'th' ? 'ให้ AI วิเคราะห์ผังครอบครัว' : 'Let AI analyze the family tree',
                icon: '🧠',
                priority: 9,
                action: { type: 'chat', value: 'วิเคราะห์สายเลือดนี้' },
                relevance: 0.9
            });
            break;
    }

    return suggestions;
}

// =============================================================================
// HELPERS
// =============================================================================

function calculatePetAge(birthDate: string): number {
    if (!birthDate) return 0;
    const birth = new Date(birthDate);
    const now = new Date();
    return (now.getTime() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
}

function detectLanguage(context: PredictionContext): 'th' | 'en' {
    // Default to Thai for Thai users
    return 'th';
}

// =============================================================================
// MAIN PREDICTION FUNCTION
// =============================================================================

/**
 * Generate personalized suggestions for the current context
 */
export function predictSuggestions(context: PredictionContext = {}): Suggestion[] {
    const lang = detectLanguage(context);
    let allSuggestions: Suggestion[] = [];

    // 1. Pet-specific suggestions (highest priority)
    if (context.currentPet) {
        allSuggestions.push(...generatePetContextSuggestions(context.currentPet, lang));
    }

    // 2. Journey-based suggestions
    allSuggestions.push(...generateJourneySuggestions(context, lang));

    // 3. Page-specific suggestions
    if (context.pageContext) {
        allSuggestions.push(...generatePageSuggestions(context.pageContext, lang));
    }

    // 4. Time-based suggestions (lowest priority)
    allSuggestions.push(...generateTimeBasedSuggestions(context, lang));

    // Sort by priority and relevance
    allSuggestions.sort((a, b) => {
        const scoreA = a.priority * 0.7 + a.relevance * 10 * 0.3;
        const scoreB = b.priority * 0.7 + b.relevance * 10 * 0.3;
        return scoreB - scoreA;
    });

    // Remove duplicates and limit
    const uniqueSuggestions = allSuggestions.filter((suggestion, index, self) =>
        index === self.findIndex((s) => s.id === suggestion.id)
    );

    return uniqueSuggestions.slice(0, 5);
}

/**
 * Get quick action suggestions for chat input
 */
export function getQuickChatSuggestions(
    currentPet?: any,
    lang: 'th' | 'en' = 'th'
): string[] {
    const suggestions: string[] = [];

    if (currentPet) {
        suggestions.push(
            lang === 'th' ? `สายเลือดของ ${currentPet.name}` : `${currentPet.name}'s pedigree`,
            lang === 'th' ? `หาคู่ผสมให้ ${currentPet.name}` : `Find mate for ${currentPet.name}`,
            lang === 'th' ? `ประวัติ ${currentPet.name}` : `${currentPet.name}'s history`
        );
    } else {
        suggestions.push(
            lang === 'th' ? 'หา Thai Ridgeback' : 'Find Thai Ridgeback',
            lang === 'th' ? 'ราคาตลาดหมา' : 'Dog market prices',
            lang === 'th' ? 'วิธีลงทะเบียน' : 'How to register',
            lang === 'th' ? 'หมาท้องกี่วัน' : 'Dog pregnancy duration'
        );
    }

    return suggestions;
}

/**
 * Generate "You might also like" suggestions based on current pet
 */
export async function getSimilarPetSuggestions(pet: any, limit: number = 4): Promise<any[]> {
    if (!pet?.breed) return [];

    try {
        const { data } = await supabase
            .from('pets')
            .select('id, name, breed, image, gender, location')
            .eq('breed', pet.breed)
            .neq('id', pet.id)
            .limit(limit);

        return data || [];
    } catch (error) {
        console.error('Error fetching similar pets:', error);
        return [];
    }
}
