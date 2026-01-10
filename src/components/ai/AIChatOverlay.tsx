import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Pet } from '@/lib/database';
import { askPetDegreeAI } from '@/lib/gemini';
import { processGlobalQuery, looksLikePetName, getFaqAnswer, getSmallTalkAnswer, quickBreedingMatch, getDbFaqAnswer, captureFaqDraft } from "@/lib/ai";


function shouldUseLLM(query: string): boolean {
    const q = query.trim().toLowerCase();
    // Rule 1: Length >= 3 words
    if (q.split(/\s+/).length >= 3) return true;
    // Rule 2: Keywords
    const keywords = [
        'breeding', 'breed', 'pair', 'mate', 'genetic', 'dna', 'health', 'cert', 'pedigree',
        'lineage', 'analysis', 'plan', 'why', 'how', 'should', 'what if', 'help', 'explain',
        'suggest', 'recommend', 'risk', 'consang', 'inbreed',
        'ผสมพันธุ์', 'ผสม', 'คู่ผสม', 'สายเลือด', 'พันธุกรรม', 'สุขภาพ', 'ใบเพ็ดดีกรี',
        'วางแผน', 'แนะนำ', 'วิเคราะห์', 'เสี่ยง', 'เลือดชิด'
    ];
    const extraKeywords = [
        'pregnant', 'gestation', 'heat', 'ovulation', 'estrus', 'cycle', 'nutrition', 'diet', 'care',
        'ตั้งท้อง', 'ตั้งครรภ์', 'เป็นสัด', 'วันตกไข่', 'โภชนาการ', 'อาหาร', 'ดูแล', 'สุขภาพ', 'ผสมพันธุ์', 'วางแผน'
    ];
    if ([...keywords, ...extraKeywords].some(k => q.includes(k))) return true;
    return false;
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const isAsciiWord = (value: string) => /^[a-z0-9]+$/.test(value);
const matchKeyword = (text: string, keyword: string) => {
    if (!keyword) return false;
    const lower = text.toLowerCase();
    const key = keyword.toLowerCase();
    if (key.includes(' ')) return lower.includes(key);
    if (isAsciiWord(key)) {
        return new RegExp(`\\b${escapeRegExp(key)}\\b`, 'i').test(text);
    }
    return lower.includes(key);
};
const matchesAnyKeyword = (text: string, keywords: string[]) => keywords.some((k) => matchKeyword(text, k));

const REGISTRATION_NUMBER_HINTS = [
    'registration number', 'reg number', 'reg no', 'reg #', 'license number',
    'เลขทะเบียน', 'เลขจดทะเบียน'
];

const REGISTER_VERBS = [
    'register', 'registration', 'registering', 'enroll', 'enrol', 'sign up', 'signup',
    'จดทะเบียน', 'ลงทะเบียน', 'ขึ้นทะเบียน'
];

const PET_TARGET_HINTS = [
    'pet', 'pets', 'dog', 'cat', 'puppy', 'kitten', 'animal',
    'สัตว์เลี้ยง', 'สัตว์', 'หมา', 'สุนัข', 'แมว'
];

const PET_OWNERSHIP_HINTS = [
    'my', 'mine', 'our', 'new', 'another',
    'ของฉัน', 'ของผม', 'ของเรา', 'ตัวใหม่'
];

const looksLikeNewPetRegistrationIntent = (input: string) => {
    const normalized = input.normalize('NFKC').toLowerCase();
    if (matchesAnyKeyword(normalized, REGISTRATION_NUMBER_HINTS)) return false;
    if (!matchesAnyKeyword(normalized, REGISTER_VERBS)) return false;
    return matchesAnyKeyword(normalized, PET_TARGET_HINTS) || matchesAnyKeyword(normalized, PET_OWNERSHIP_HINTS);
};

const GENERAL_KNOWLEDGE_HINTS = [
    'breeding', 'breed', 'mate', 'mating', 'pregnant', 'gestation', 'heat', 'ovulation', 'estrus', 'cycle',
    'nutrition', 'diet', 'food', 'feeding', 'care', 'health', 'vaccine', 'vaccination', 'deworm', 'rabies',
    'genetic', 'dna', 'coi', 'inbreed', 'pedigree', 'certificate', 'registration', 'register', 'microchip',
    'spay', 'neuter', 'whelp', 'litter', 'puppy', 'kitten', 'birth', 'delivery', 'due date',
    'market', 'marketplace', 'price', 'pricing', 'buy', 'sell', 'reserve', 'deposit',
    'artificial insemination', 'ai breeding', 'gdv', 'bloat', 'gastric torsion', 'vet ai',
    'ผสมพันธุ์', 'ตั้งท้อง', 'ท้อง', 'วันตกไข่', 'เป็นสัด', 'โภชนาการ', 'อาหาร', 'การดูแล', 'สุขภาพ', 'วัคซีน',
    'ถ่ายพยาธิ', 'พิษสุนัขบ้า', 'พันธุกรรม', 'ใบเพ็ด', 'ใบเพ็ดดีกรี', 'จดทะเบียน', 'ลงทะเบียน', 'ไมโครชิป',
    'ทำหมัน', 'คลอด', 'ลูกสุนัข', 'ลูกแมว', 'กำหนดคลอด', 'ตลาด', 'ราคา', 'ซื้อ', 'ขาย', 'จอง', 'มัดจำ',
    'ผสมเทียม', 'การผสมเทียม', 'กระเพาะบิด', 'บิดกระเพาะ', 'ท้องอืด', 'ปรึกษาสัตวแพทย์'
];

const PET_CONTEXT_EXCLUDE_HINTS = [
    ...REGISTRATION_NUMBER_HINTS,
    'profile', 'owner', 'link', 'share', 'family tree', 'parents', 'father', 'mother', 'offspring',
    'child', 'children', 'brother', 'sister', 'age', 'birthday', 'birth date', 'location',
    'for sale', 'available', 'photo', 'gallery', 'document', 'paper',
    'โปรไฟล์', 'เจ้าของ', 'ลิงก์', 'แชร์', 'ผังครอบครัว', 'พ่อแม่', 'พ่อ', 'แม่', 'ลูก', 'พี่น้อง',
    'อายุ', 'วันเกิด', 'สถานที่', 'รูป', 'แกลเลอรี', 'เอกสาร', 'กระดาษ', 'ใบวัคซีน'
];

const SPECIFIC_PET_REFERENCE_HINTS = [
    'this', 'this pet', 'this dog', 'this cat', 'my pet', 'my dog', 'my cat',
    'ของฉัน', 'ของผม', 'ของเรา', 'ตัวนี้', 'ตัวนั้น', 'เจ้าตัวนี้', 'หมาของฉัน', 'แมวของฉัน'
];

const GENERIC_ANSWER_BLOCKLIST = [
    'not sure', 'sorry', 'cannot', "can't", 'no data', 'no info', 'unknown',
    'ขอโทษ', 'ไม่ทราบ', 'ไม่แน่ใจ', 'ไม่มีข้อมูล', 'ไม่พบข้อมูล'
];

const inferFaqCategory = (text: string): string => {
    const lower = text.toLowerCase().normalize('NFKC');

    // Extended categories with weighted keywords (higher weight = more specific)
    const categories = [
        {
            name: 'breeding',
            weight: 3,
            keywords: [
                // English
                'breeding', 'breed', 'mate', 'mating', 'pregnant', 'pregnancy', 'gestation', 'heat', 'heat cycle',
                'ovulation', 'estrus', 'estrous', 'artificial insemination', 'ai breeding', 'stud', 'stud service',
                'whelping', 'whelp', 'litter', 'litter size', 'due date', 'fertile', 'fertility', 'conception',
                'tie', 'breeding tie', 'progesterone', 'brucellosis', 'semen', 'sperm', 'inseminate',
                // Thai
                'ผสมพันธุ์', 'ผสม', 'ตั้งท้อง', 'ท้อง', 'เป็นสัด', 'วันตกไข่', 'รอบเป็นสัด', 'กำหนดคลอด',
                'ผสมเทียม', 'การผสมเทียม', 'พ่อพันธุ์', 'แม่พันธุ์', 'คลอด', 'ลูกสุนัข', 'จำนวนลูก',
                'ตรวจท้อง', 'อัลตราซาวด์', 'โปรเจสเตอโรน', 'ติดลูก', 'ท้องว่าง'
            ]
        },
        {
            name: 'health',
            weight: 2,
            keywords: [
                // English
                'health', 'healthy', 'vaccine', 'vaccination', 'vaccinate', 'deworm', 'deworming', 'rabies',
                'distemper', 'parvo', 'parvovirus', 'diet', 'nutrition', 'food', 'feeding', 'care', 'treatment',
                'gdv', 'bloat', 'gastric torsion', 'vet', 'veterinary', 'veterinarian', 'vet ai', 'sick', 'illness',
                'disease', 'symptom', 'symptoms', 'medicine', 'medication', 'surgery', 'spay', 'neuter', 'sterilize',
                'hip dysplasia', 'elbow dysplasia', 'heart', 'cardiac', 'eye', 'skin', 'allergy', 'allergies',
                'parasite', 'flea', 'tick', 'heartworm', 'checkup', 'examination', 'diagnosis',
                // Thai
                'สุขภาพ', 'วัคซีน', 'ฉีดวัคซีน', 'โภชนาการ', 'อาหาร', 'ถ่ายพยาธิ', 'พยาธิ', 'พิษสุนัขบ้า',
                'กระเพาะบิด', 'บิดกระเพาะ', 'ท้องอืด', 'ปรึกษาสัตวแพทย์', 'หมอ', 'รักษา', 'การรักษา',
                'ป่วย', 'อาการป่วย', 'โรค', 'ยา', 'ผ่าตัด', 'ทำหมัน', 'ตรวจสุขภาพ', 'ภูมิแพ้',
                'เห็บ', 'หมัด', 'พยาธิหัวใจ', 'ตรวจ', 'วินิจฉัย', 'ดูแล', 'การดูแล'
            ]
        },
        {
            name: 'puppies',
            weight: 2,
            keywords: [
                // English
                'puppy', 'puppies', 'kitten', 'kittens', 'baby', 'babies', 'newborn', 'pup', 'pups',
                'available', 'available now', 'coming soon', 'litter', 'for sale', 'adopt', 'adoption',
                'weaning', 'wean', 'socialization', 'training', 'housebreaking', 'potty training',
                'puppy food', 'puppy care', 'first vaccine', 'first shot',
                // Thai
                'ลูกหมา', 'ลูกสุนัข', 'ลูกแมว', 'ลูกตัวใหม่', 'ลูกเกิดใหม่', 'พร้อมขาย', 'เร็วๆนี้',
                'หย่านม', 'ฝึก', 'ฝึกสอน', 'สังคม', 'อาหารลูกหมา', 'วัคซีนแรก', 'เข็มแรก',
                'ครอกใหม่', 'ครอก', 'รับเลี้ยง'
            ]
        },
        {
            name: 'genetics',
            weight: 3,
            keywords: [
                // English
                'genetic', 'genetics', 'dna', 'gene', 'genes', 'color', 'colour', 'coat', 'coat color',
                'inheritance', 'hereditary', 'dominant', 'recessive', 'carrier', 'coi', 'inbreeding',
                'inbreeding coefficient', 'linebreeding', 'line breeding', 'outcross', 'bloodline',
                'pedigree', 'ancestry', 'lineage', 'trait', 'traits', 'phenotype', 'genotype',
                'dilute', 'merle', 'brindle', 'piebald', 'sable', 'fawn', 'black', 'chocolate', 'liver',
                // Thai
                'พันธุกรรม', 'ยีน', 'สี', 'สีขน', 'สายเลือด', 'เลือดชิด', 'ค่าเลือดชิด', 'สืบสายพันธุ์',
                'ใบเพ็ด', 'ใบเพ็ดดีกรี', 'บรรพบุรุษ', 'ลักษณะ', 'ลักษณะเด่น', 'ลักษณะด้อย',
                'สีเจือจาง', 'แบล็ก', 'ช็อคโกแลต', 'ครีม', 'ขาว', 'ดำ', 'น้ำตาล'
            ]
        },
        {
            name: 'registration',
            weight: 2,
            keywords: [
                // English
                'register', 'registration', 'microchip', 'chip', 'certificate', 'certified', 'certification',
                'pedigree', 'pedigree paper', 'papers', 'document', 'documents', 'license', 'licensing',
                'kennel club', 'akc', 'ckc', 'ukc', 'fci', 'tka', 'tkc', 'transfer', 'ownership',
                // Thai
                'จดทะเบียน', 'ลงทะเบียน', 'ขึ้นทะเบียน', 'ใบเพ็ด', 'ไมโครชิป', 'ชิป', 'ใบรับรอง',
                'เอกสาร', 'ใบทะเบียน', 'เปลี่ยนเจ้าของ', 'โอนเจ้าของ', 'สมาคม', 'สโมสร'
            ]
        },
        {
            name: 'marketplace',
            weight: 1,
            keywords: [
                // English
                'price', 'pricing', 'cost', 'how much', 'for sale', 'sell', 'selling', 'buy', 'buying',
                'market', 'marketplace', 'availability', 'reserve', 'reservation', 'deposit', 'payment',
                'shipping', 'delivery', 'transport', 'pick up', 'pickup', 'contract', 'guarantee', 'warranty',
                // Thai
                'ราคา', 'ค่าตัว', 'เท่าไหร่', 'เท่าไร', 'ขาย', 'ซื้อ', 'ตลาด', 'จอง', 'มัดจำ', 'ชำระเงิน',
                'ส่ง', 'จัดส่ง', 'รับ', 'รับตัว', 'สัญญา', 'รับประกัน', 'ประกัน', 'พร้อมขาย', 'หาซื้อ'
            ]
        },
        {
            name: 'behavior',
            weight: 2,
            keywords: [
                // English
                'behavior', 'behaviour', 'temperament', 'personality', 'character', 'train', 'training',
                'obedience', 'command', 'commands', 'bark', 'barking', 'bite', 'biting', 'aggressive',
                'aggression', 'anxiety', 'anxious', 'separation', 'fear', 'fearful', 'socialize', 'socialization',
                'play', 'playful', 'energy', 'active', 'calm', 'friendly', 'protective', 'guard', 'guarding',
                // Thai
                'พฤติกรรม', 'นิสัย', 'อุปนิสัย', 'ฝึก', 'ฝึกสอน', 'เชื่อฟัง', 'คำสั่ง', 'เห่า', 'กัด',
                'ก้าวร้าว', 'วิตกกังวล', 'กลัว', 'เล่น', 'ขี้เล่น', 'พลังงาน', 'ซุกซน', 'สงบ', 'เป็นมิตร'
            ]
        },
        {
            name: 'support',
            weight: 1,
            keywords: [
                // English
                'help', 'support', 'contact', 'question', 'how to', 'how do', 'what is', 'can i', 'should i',
                'problem', 'issue', 'error', 'bug', 'fix', 'account', 'login', 'sign in', 'sign up', 'profile',
                // Thai
                'ช่วย', 'ช่วยเหลือ', 'ติดต่อ', 'คำถาม', 'ทำยังไง', 'ทำอย่างไร', 'คืออะไร', 'ได้ไหม',
                'ปัญหา', 'แก้ไข', 'บัญชี', 'เข้าสู่ระบบ', 'ลงทะเบียน', 'โปรไฟล์', 'สมัคร'
            ]
        }
    ];

    // Score each category based on keyword matches
    const scores: { name: string; score: number }[] = [];

    for (const category of categories) {
        let matchCount = 0;
        for (const keyword of category.keywords) {
            if (matchKeyword(lower, keyword)) {
                matchCount++;
            }
        }
        if (matchCount > 0) {
            // Score = number of matches × category weight
            scores.push({ name: category.name, score: matchCount * category.weight });
        }
    }

    // Return the highest scoring category
    if (scores.length === 0) return '';

    scores.sort((a, b) => b.score - a.score);
    return scores[0].name;
};

const shouldCapturePetContextFaq = (query: string, answer: string, pet?: Pet) => {
    const normalized = query.normalize('NFKC').toLowerCase().trim();
    if (normalized.length < 8 || normalized.length > 220) return false;
    if (!matchesAnyKeyword(normalized, GENERAL_KNOWLEDGE_HINTS)) return false;
    if (matchesAnyKeyword(normalized, PET_CONTEXT_EXCLUDE_HINTS)) return false;
    if (matchesAnyKeyword(normalized, SPECIFIC_PET_REFERENCE_HINTS)) return false;
    if (pet?.name && normalized.includes(pet.name.toLowerCase())) return false;
    const reg = (pet as any)?.registration_number || (pet as any)?.registrationNumber;
    if (reg && normalized.includes(String(reg).toLowerCase())) return false;
    if (/https?:\/\//i.test(normalized)) return false;

    const answerNormalized = (answer || '').toLowerCase();
    if (matchesAnyKeyword(answerNormalized, GENERIC_ANSWER_BLOCKLIST)) return false;
    if (pet?.name && answerNormalized.includes(pet.name.toLowerCase())) return false;
    if (reg && answerNormalized.includes(String(reg).toLowerCase())) return false;
    return true;
};

const CLEAR_CONTEXT_TOKENS = [
    'clear', 'reset', 'forget', 'exit', 'leave', 'switch', 'change', 'other dog', 'other cat', 'other pet', 'another dog', 'another cat',
    'not this', 'different dog', 'different cat', 'topic', 'context',
    'ออกจาก', 'ลืม', 'รีเซ็ต', 'เคลียร์', 'เปลี่ยน', 'เปลี่ยนเรื่อง', 'เปลี่ยนหัวข้อ', 'ตัวอื่น', 'หมาตัวอื่น', 'แมวตัวอื่น', 'ไม่ใช่', 'ไม่ใช่ตัวนี้', 'คนละตัว'
];

const stripTokens = (input: string, tokens: string[]) => {
    let cleaned = input;
    tokens.forEach((token) => {
        const pattern = new RegExp(escapeRegExp(token), 'gi');
        cleaned = cleaned.replace(pattern, ' ');
    });
    return cleaned.replace(/\s+/g, ' ').trim();
};

const shouldClearContext = (input: string) => {
    const lower = input.toLowerCase();
    return CLEAR_CONTEXT_TOKENS.some((token) => lower.includes(token));
};

interface Message {
    id: string;
    sender: 'user' | 'ai';
    text: string;
    type?: 'text' | 'pet_list';
    data?: any;
    intent?: 'search' | 'relationship' | 'analysis';
    query?: string;
    actions?: { label: string; type: 'link' | 'copy' | 'event'; value: string; primary?: boolean }[];
}

interface AIChatOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    initialQuery?: string;
    currentPet?: Pet;
    className?: string;
}

export const AIChatOverlay: React.FC<AIChatOverlayProps> = ({ isOpen, onClose, initialQuery, currentPet, className }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    // Context Memory: Allows the chat to "remember" which pet we are talking about even if started globally
    const [activeContextPet, setActiveContextPet] = useState<Pet | undefined>(currentPet);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (currentPet) setActiveContextPet(currentPet);
    }, [currentPet]);

    useEffect(() => {
        if (isOpen && initialQuery) {
            handleUserMessage(initialQuery);
        } else if (isOpen && messages.length === 0) {
            // Greet if no initial query
            setMessages([{
                id: 'init',
                sender: 'ai',
                text: activeContextPet
                    ? `Hi! I'm Eibpo AI assistant. Ask me anything about ${activeContextPet.name}!`
                    : `Hi! I'm Eibpo AI. I can help you search the database, analyze market trends, or answer general questions.`
            }])
        }
    }, [isOpen, initialQuery, activeContextPet]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleUserMessage = async (text: string) => {
        // Add user message
        const userMsg: Message = { id: Date.now().toString(), sender: 'user', text };
        setMessages(prev => [...prev, userMsg]);
        setLoading(true);

        try {
            const clearContext = shouldClearContext(text);
            const cleanedText = clearContext ? stripTokens(text, CLEAR_CONTEXT_TOKENS) : text;
            if (clearContext) {
                setActiveContextPet(undefined);
                if (!cleanedText) {
                    const isThai = /[\u0E01-\u0E59]/.test(text);
                    setMessages(prev => [
                        ...prev,
                        {
                            id: Date.now().toString(),
                            sender: 'ai',
                            text: isThai
                                ? 'รับทราบครับ ล้างบริบทแล้ว บอกชื่อสัตว์หรือเลขทะเบียนตัวใหม่ได้เลยครับ'
                                : 'Got it. Context cleared. Tell me the pet name or registration number you want to ask about.'
                        }
                    ]);
                    return;
                }
            }

            // Process Query
            const initialPet = clearContext ? undefined : activeContextPet;
            const response = await processQuery(cleanedText, initialPet);

            if (!initialPet && response.type === 'pet_list' && response.data?.length === 1 && response.intent === 'relationship') {
                const selectedPet = response.data[0];
                console.log("Context Switched to:", selectedPet.name);
                setActiveContextPet(selectedPet);
                const followup = await processQuery(text, selectedPet);
                setMessages(prev => [...prev, response, followup]);
                return;
            }

            // CONTEXT PROMOTION/SWITCHING:
            // If AI returned a pet list, update the active context based on results.
            // CONTEXT PROMOTION/SWITCHING:
            // If AI returned a pet list, update the active context based on results.
            if (response.type === 'pet_list' && response.data) {
                if (response.data.length === 1) {
                    // Single match: Focus on this pet
                    console.log("Context Switched to:", response.data[0].name);
                    setActiveContextPet(response.data[0]);
                } else if (response.data.length > 1 && !activeContextPet) {
                    // Multiple matches: Clear specific context only when no active context
                    console.log("Context Cleared (Multiple Results)");
                    setActiveContextPet(undefined);
                }
                // Optional: Add a system message saying "I've loaded context for..."
            }

            // AUTO-EXECUTE PRIMARY ACTIONS
            // If response contains a primary action (e.g., after YES confirmation), execute it
            console.log('[AI] Response actions:', response.actions);
            if (response.actions && response.actions.length > 0) {
                const primaryAction = response.actions.find((a: any) => a.primary);
                console.log('[AI] Primary action found:', primaryAction);
                if (primaryAction) {
                    console.log('[AI] Auto-executing primary action:', primaryAction.value);
                    // Small delay to show the confirmation message before navigating
                    setTimeout(() => {
                        handleAction(primaryAction);
                    }, 800);
                }
            }

            setMessages(prev => [...prev, response]);
        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'ai', text: "Sorry, I encountered an error processing your request." }]);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = (action: { type: string, value: string, label: string }) => {
        if (action.type === 'link') {
            if (action.value.startsWith('http')) {
                window.open(action.value, '_blank');
            } else if (action.value.startsWith('#')) {
                // Handle Internal Anchor / ID Scroll
                const element = document.getElementById(action.value.substring(1));
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth' });
                } else {
                    console.warn(`Element with id ${action.value} not found.`);
                    // Fallback for contact
                    if (action.value === '#contact') {
                        alert("Please contact the owner via the buttons on their profile.");
                    }
                }
            } else if (action.value.startsWith('/')) {
                // Internal route navigation (e.g., /vet-profile/...)
                console.log('[AI Action] Navigating to:', action.value);
                window.location.href = action.value;
            } else {
                console.warn("Unknown link type:", action.value);
            }
        } else if (action.type === 'copy') {
            navigator.clipboard.writeText(action.value);
            // Optionally add toast here
        } else if (action.type === 'event') {
            window.dispatchEvent(new Event(action.value));
        }
    };

    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

    // Helper to fetch full details of a related pet (e.g. parent)
    const fetchPetDetails = async (id: string) => {
        const { data, error } = await supabase.from('pets').select('*').eq('id', id.trim()).maybeSingle();
        if (error) {
            console.error(`Error fetching parent ${id}:`, error);
        }
        return data;
    };
    const processQuery = async (query: string, pet?: Pet): Promise<Message> => {
        const lowerQuery = query.normalize('NFKC').toLowerCase();
        const isThai = /[\u0E01-\u0E59]/.test(query);
        const lang = isThai ? 'th' : 'en';

        // --- GLOBAL MODE (No Pet) ---
        if (!pet) {
            // Check for breeding match query FIRST
            const breedingMatch = lowerQuery.match(
                /(?:หาคู่ผสมให้|หาคู่ให้|find\s*mate\s*for|breeding\s*match\s*for|match\s*for)\s*["'"]?([^"'"]+)["'"]?/i
            );

            if (breedingMatch) {
                const petName = breedingMatch[1].trim();
                const { data: foundPet } = await supabase
                    .from('pets')
                    .select('*')
                    .ilike('name', `%${petName}%`)
                    .limit(1)
                    .maybeSingle();

                if (foundPet) {
                    try {
                        const result = await quickBreedingMatch(foundPet, 5);
                        if (result.matches.length === 0) {
                            return {
                                id: Date.now().toString(),
                                sender: 'ai',
                                text: lang === 'th'
                                    ? `💔 ไม่พบคู่ผสมที่เหมาะสมสำหรับ **${foundPet.name}** ในขณะนี้ครับ`
                                    : `💔 No suitable matches found for **${foundPet.name}**`,
                                type: 'text'
                            };
                        }
                        const matchList = result.matches.slice(0, 3).map((m: any, i: number) => {
                            const coiText = m.coi ? ` (COI: ${(m.coi * 100).toFixed(1)}%)` : '';
                            return `${i + 1}. **${m.name}** (${m.breed}) - ${lang === 'th' ? 'คะแนน' : 'Score'} ${Math.round(m.matchScore)}/100${coiText}`;
                        }).join('\n');
                        return {
                            id: Date.now().toString(),
                            sender: 'ai',
                            text: lang === 'th'
                                ? `💕 **คู่ผสมสำหรับ ${foundPet.name}**\n\n${result.text.th}\n\n**แนะนำ:**\n${matchList}`
                                : `💕 **Matches for ${foundPet.name}**\n\n${result.text.en}\n\n**Recommended:**\n${matchList}`,
                            type: 'pet_list',
                            data: result.matches,
                            intent: 'relationship'
                        };
                    } catch (err) {
                        console.error('Breeding match error:', err);
                    }
                } else {
                    return {
                        id: Date.now().toString(),
                        sender: 'ai',
                        text: lang === 'th'
                            ? `ไม่พบสัตว์เลี้ยงชื่อ "${petName}" ในระบบครับ`
                            : `Could not find a pet named "${petName}"`,
                        type: 'text'
                    };
                }
            }

            const response = await processGlobalQuery(query, lang as 'th' | 'en');
            return {
                id: Date.now().toString(),
                sender: 'ai',
                text: response.text,
                type: response.type as any,
                data: (response as any).data,
                intent: (response as any).intent,
                query: (response as any).query,
                actions: (response as any).actions
            };
        }

        const smallTalk = getSmallTalkAnswer(query, lang as 'th' | 'en', { petName: pet.name });
        if (smallTalk) {
            return {
                id: Date.now().toString(),
                sender: 'ai',
                text: smallTalk,
                type: 'text'
            };
        }

        if (looksLikeNewPetRegistrationIntent(query)) {
            return {
                id: Date.now().toString(),
                sender: 'ai',
                text: lang === 'th'
                    ? 'ได้เลยครับ ผมจะเปิดหน้าลงทะเบียนสัตว์เลี้ยงให้เลย ถ้ายังไม่ได้ล็อกอิน ระบบจะพาไปหน้าเข้าสู่ระบบก่อนครับ'
                    : 'Sure — I can open the pet registration form. If you are not logged in, you will be asked to sign in first.',
                type: 'text',
                actions: [
                    {
                        label: lang === 'th' ? 'ลงทะเบียนสัตว์เลี้ยง' : 'Register a Pet',
                        type: 'event',
                        value: 'openRegisterPet',
                        primary: true
                    }
                ]
            };
        }

        const dbFaqAnswer = await getDbFaqAnswer(query, lang as 'th' | 'en', { hasPetContext: true });
        if (dbFaqAnswer) {
            return {
                id: Date.now().toString(),
                sender: 'ai',
                text: dbFaqAnswer,
                type: 'text'
            };
        }

        const faqAnswer = getFaqAnswer(query, lang as 'th' | 'en', { hasPetContext: true });
        if (faqAnswer) {
            return {
                id: Date.now().toString(),
                sender: 'ai',
                text: faqAnswer,
                type: 'text'
            };
        }

        // --- SPECIFIC PET MODE ---
        // 1. DATA NORMALIZATION
        const fatherId = pet.father_id || (pet as any).parentIds?.sire || (pet as any).pedigree?.sire_id || null;
        const motherId = pet.mother_id || (pet as any).parentIds?.dam || (pet as any).pedigree?.dam_id || null;
        const isForSale = pet.for_sale || (pet as any).available || (pet as any).status === 'available';
        const birthDate = pet.birth_date || (pet as any).birthDate || null;
        const registrationNumber = pet.registration_number || (pet as any).registrationNumber || (pet as any).regNo || null;

        // Age Calculation Helper
        let ageDisplay = '';
        if (birthDate) {
            const today = new Date();
            const birth = new Date(birthDate);
            const ageInMonths = (today.getFullYear() - birth.getFullYear()) * 12 + (today.getMonth() - birth.getMonth());
            const years = Math.floor(ageInMonths / 12);
            const months = ageInMonths % 12;
            ageDisplay = isThai
                ? (years > 0 ? `${years} ปี ${months} เดือน` : `${months} เดือน`)
                : (years > 0 ? `${years} years ${months} months` : `${months} months`);
        }

        // 2. GATHER CONTEXT
        const isMale = pet.gender === 'male';
        const parentColumn = isMale ? 'father_id' : 'mother_id';

        const [offspringRes, docsRes, fatherRes, motherRes, ownerRes, breedStatsRes] = await Promise.all([
            supabase.from('pets').select('*, owner:profiles!owner_id(full_name, avatar_url)').eq(parentColumn, pet.id),
            supabase.from('pet_documents').select('title, document_type').eq('pet_id', pet.id),
            fatherId ? fetchPetDetails(fatherId) : Promise.resolve(null),
            motherId ? fetchPetDetails(motherId) : Promise.resolve(null),
            pet.owner_id ? supabase.from('profiles').select('*').eq('id', pet.owner_id).maybeSingle() : Promise.resolve({ data: null }),
            // 4. MARKET VALUATION DATA: Fetch prices of same breed for average comparison
            supabase.from('pets').select('price').eq('breed', pet.breed).not('price', 'is', null).gt('price', 0).limit(50)
        ]);

        const offspring = offspringRes.data || [];
        const documents = docsRes.data || [];
        const parents = { father: fatherRes, mother: motherRes };
        const breedStats = breedStatsRes.data || [];

        // Market Analysis Calculation
        let marketAnalysis = '';
        if (breedStats.length > 0 && pet.price) {
            const prices = breedStats.map((p: any) => p.price);
            const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
            const diff = pet.price - avgPrice;
            const percentDiff = (Math.abs(diff) / avgPrice) * 100;

            if (lang === 'th') {
                const comparison = diff > 0 ? 'สูงกว่า' : 'ต่ำกว่า';
                marketAnalysis = `\n\n💰 **วิเคราะห์ราคา:** ราคาเฉลี่ยของ ${pet.breed} ในตลาดอยู่ที่ประมาณ ${avgPrice.toLocaleString()} บาท ราคาของ ${pet.name} ${comparison}ค่าเฉลี่ยประมาณ ${Math.round(percentDiff)}%`;
            } else {
                const comparison = diff > 0 ? 'higher' : 'lower';
                marketAnalysis = `\n\n💰 **Market Insight:** The average price for ${pet.breed} is approx ${avgPrice.toLocaleString()} THB. This pet is ${Math.round(percentDiff)}% ${comparison} than average.`;
            }
        }

        // Resolve Owner Name
        const fetchedOwner = ownerRes.data;
        const ownerName = fetchedOwner?.full_name
            || (pet.owner && typeof pet.owner === 'object' && 'full_name' in pet.owner ? (pet.owner as any).full_name : null)
            || (typeof pet.owner === 'string' ? pet.owner : null)
            || (pet as any).owner_name
            || (lang === 'th' ? 'ไม่ระบุชื่อ' : 'Unknown Owner');

        const ownerProfile = fetchedOwner || (typeof pet.owner === 'object' ? pet.owner : null);

        // 3. GATHER LEVEL 2 CONTEXT (Grandparents)
        const [pPatGF, pPatGM, pMatGF, pMatGM] = await Promise.all([
            parents.father?.father_id ? fetchPetDetails(parents.father.father_id) : Promise.resolve(null),
            parents.father?.mother_id ? fetchPetDetails(parents.father.mother_id) : Promise.resolve(null),
            parents.mother?.father_id ? fetchPetDetails(parents.mother.father_id) : Promise.resolve(null),
            parents.mother?.mother_id ? fetchPetDetails(parents.mother.mother_id) : Promise.resolve(null)
        ]);

        const grandparents = {
            patGF: pPatGF, patGM: pPatGM,
            matGF: pMatGF, matGM: pMatGM
        };
        let potentialMate: any = null;

        // --- DEBUG MODE ---
        if (query.trim() === '/debug') {
            return {
                id: Date.now().toString(),
                sender: 'ai',
                text: `🐛 DEBUG INFO (Gen 3):\n\nLang: ${lang}\nOwner Name Resolved: ${ownerName}\nRegistration: ${registrationNumber}\nPrice Stats: ${breedStats.length} records\nParents: ${!!parents.father}/${!!parents.mother}\nBreeding Sim: ${!!potentialMate ? potentialMate.name : 'N/A'}`
            };
        }

        // 4. SEARCH CONTEXT
        let searchResults: any[] = [];
        const isSearchQueryTokens = ['find', 'search', 'search for', 'looking for', 'show me', 'lookup', 'หา', 'มี'];
        const extraSearchQueryTokens = ['ค้นหา', 'หาข้อมูล', 'ค้นข้อมูล', 'ดูข้อมูล', 'ขอข้อมูล'];
        const isSearchQuery = matchesAnyKeyword(lowerQuery, [...isSearchQueryTokens, ...extraSearchQueryTokens]);

        if (isSearchQuery) {
            const searchTerms = lowerQuery
                .replace(/(find|search|search for|looking for|lookup|show me|หา|มี|ค้นหา|หาข้อมูล|ค้นข้อมูล|ดูข้อมูล|ขอข้อมูล)/g, '')
                .replace(/(^|\s)[\u0E31-\u0E3A\u0E47-\u0E4E]+/g, ' ')
                .trim();
            if (searchTerms.length > 2) {
                const { data } = await supabase
                    .from('pets')
                    .select(`*, owner:profiles!owner_id(full_name)`)
                    .or(`name.ilike.%${searchTerms}%,breed.ilike.%${searchTerms}%`)
                    .limit(5);
                searchResults = data || [];
            }
        }

        // ============================================
        // 5. DECISION GATE: USE LLM FIRST?
        // ============================================

        // Construct Market Context early (needed for both LLM and potential future logic)
        const market = (() => {
            if (!Array.isArray(breedStats) || breedStats.length === 0) return null;
            const prices = breedStats.map((p: any) => p.price).filter((x: any) => typeof x === 'number' && x > 0);
            if (prices.length === 0) return null;
            const avg = prices.reduce((a: number, b: number) => a + b, 0) / prices.length;
            return { breed: pet.breed, avgPrice: avg, samples: prices.length };
        })();

        // Try LLM if criteria met
        if (shouldUseLLM(query)) {
            try {
                const aiTextLLM = await askPetDegreeAI(
                    {
                        pet,
                        parents,
                        offspring,
                        documents,
                        owner: ownerProfile,
                        market: market || undefined,
                        searchResults
                    },
                    [],
                    query
                );

                if (shouldCapturePetContextFaq(query, aiTextLLM, pet)) {
                    void captureFaqDraft({
                        query,
                        answer: aiTextLLM,
                        lang: lang as 'th' | 'en',
                        scope: 'pet',
                        source: 'llm_pet_context',
                        category: inferFaqCategory(query) || null,
                        forceStatus: 'draft'
                    });
                }

                return {
                    id: Date.now().toString(),
                    sender: 'ai',
                    text: aiTextLLM,
                    type: 'text'
                };
            } catch (err) {
                console.error("LLM Failed, falling back to local:", err);
                // Fall through to local logic
            }
        }

        // ============================================
        // 6. LOCAL BRAIN INTENT ENGINE (Fallback / Simple Queries)
        // ============================================
        let aiText = lang === 'th' ? "ขอโทษด้วยครับ ผมยังไม่เข้าใจคำถามนี้" : "I'm not sure how to answer that yet.";
        let parsedType: 'text' | 'pet_list' = 'text';
        let parsedData: any = undefined;
        let actions: { label: string; type: 'link' | 'copy' | 'event'; value: string; primary?: boolean }[] = [];

        // Preparation Helpers
        const formatName = (p: any) => p ? `${p.name} (${p.breed})` : (lang === 'th' ? 'ไม่ทราบ' : 'Unknown');
        const shareUrl = `${window.location.origin}/pedigree/${pet.id}`;
        const buildSummaryText = () => {
            const header = lang === 'th' ? `สรุปข้อมูลของ ${pet.name}:` : `Summary for ${pet.name}:`;
            const lines: string[] = [header];
            const pushLine = (labelTh: string, labelEn: string, value?: string | null, fallbackTh = 'ไม่ระบุ', fallbackEn = 'Not recorded') => {
                if (value && String(value).trim().length > 0) {
                    lines.push(`${lang === 'th' ? labelTh : labelEn}: ${value}`);
                } else {
                    lines.push(`${lang === 'th' ? labelTh : labelEn}: ${lang === 'th' ? fallbackTh : fallbackEn}`);
                }
            };

            pushLine('สายพันธุ์', 'Breed', pet.breed);
            pushLine('เพศ', 'Gender', pet.gender || null);
            if (pet.color) pushLine('สี', 'Color', pet.color);
            pushLine(
                'วันเกิด',
                'Birth date',
                birthDate ? new Date(birthDate).toLocaleDateString(lang === 'th' ? 'th-TH' : undefined) : null
            );
            if (ageDisplay) pushLine('อายุ', 'Age', ageDisplay);
            pushLine('เลขทะเบียน', 'Registration', registrationNumber || null);
            pushLine('เจ้าของ', 'Owner', ownerName || null, 'ไม่พบข้อมูลเจ้าของ', 'Owner not recorded');
            if (pet.location) pushLine('สถานที่', 'Location', pet.location);
            pushLine('พ่อ', 'Father', parents.father ? parents.father.name : null);
            pushLine('แม่', 'Mother', parents.mother ? parents.mother.name : null);
            pushLine(
                'จำนวนลูกในระบบ',
                'Offspring recorded',
                Array.isArray(offspring) ? String(offspring.length) : '0',
                '0',
                '0'
            );
            const docNames = documents.map((d: any) => d.title).filter(Boolean);
            if (docNames.length > 0) {
                pushLine('เอกสาร', 'Documents', docNames.join(', '));
            } else {
                pushLine('เอกสาร', 'Documents', null, 'ไม่มีเอกสารสาธารณะ', 'No public documents');
            }
            if (isForSale && (pet as any).price) {
                pushLine('สถานะขาย', 'For sale', `${(pet as any).price.toLocaleString()} THB`);
            } else {
                pushLine('สถานะขาย', 'For sale', isForSale ? (lang === 'th' ? 'พร้อมขาย' : 'Available') : null, 'ไม่ระบุ/ไม่พร้อมขาย', 'Not listed');
            }
            return lines.join('\n');
        };

        const breedKeywords = ['breed with', 'mate with', 'pair with', 'mix with', 'ผสมกับ', 'จับคู่กับ', 'ทับกับ'];
        const breedMatch = breedKeywords.find(k => lowerQuery.includes(k));
        let breedingResult: any = null;

        // Intent Matching Config
        const baseIntents = [
            {
                id: 'breeding_simulation',
                keywords: breedKeywords, // Priority Match
                templates: [""]
            },
            {
                id: 'family_tree',
                keywords: ['family', 'tree', 'pedigree', 'ancestor', 'grandparent', 'grandfather', 'grandmother', 'ปู่', 'ย่า', 'ตา', 'ยาย', 'พ่อแม่', 'parents', 'father', 'mother', 'sire', 'dam'],
                templates: [
                    lang === 'th'
                        ? `นี่คือผังครอบครัว 3 รุ่นของ ${pet.name}:\n\n` +
                        `📁 **พ่อแม่**\n` +
                        `พ่อ: ${formatName(parents.father)}\n` +
                        `แม่: ${formatName(parents.mother)}\n\n` +
                        `📂 **ปู่ย่าตายาย**\n` +
                        `ปู่: ${formatName(grandparents.patGF)}\n` +
                        `ย่า: ${formatName(grandparents.patGM)}\n` +
                        `ตา: ${formatName(grandparents.matGF)}\n` +
                        `ยาย: ${formatName(grandparents.matGM)}`
                        : `Here is the 3-Generation Family Tree for ${pet.name}:\n\n` +
                        `📁 **Parents**\n` +
                        `Father: ${formatName(parents.father)}\n` +
                        `Mother: ${formatName(parents.mother)}\n\n` +
                        `📂 **Grandparents**\n` +
                        `Paternal GF: ${formatName(grandparents.patGF)}\n` +
                        `Paternal GM: ${formatName(grandparents.patGM)}\n` +
                        `Maternal GF: ${formatName(grandparents.matGF)}\n` +
                        `Maternal GM: ${formatName(grandparents.matGM)}`
                ]
            },
            {
                id: 'summary',
                keywords: ['summary', 'details', 'all info', 'all about', 'info', 'ข้อมูลทั้งหมด', 'รายละเอียด', 'ประวัติ', 'ขอข้อมูลทั้งหมด', 'ข้อมูลทั้งหมดของ'],
                templates: ['']
            },
            {
                id: 'siblings',
                keywords: ['sibling', 'siblings', 'brother', 'sister', 'พี่น้อง', 'พี่ชาย', 'พี่สาว', 'น้องชาย', 'น้องสาว'],
                templates: ['']
            },
            {
                id: 'location',
                keywords: ['location', 'where', 'อยู่ไหน', 'อยู่ที่ไหน', 'ที่ไหน', 'อยู่ที่'],
                templates: [
                    lang === 'th'
                        ? (pet.location ? `${pet.name} อยู่ที่ ${pet.location} ครับ` : `ในระบบยังไม่มีข้อมูลสถานที่ของ ${pet.name} ครับ`)
                        : (pet.location ? `${pet.name} is located in ${pet.location}.` : `I don't have a location recorded for ${pet.name}.`)
                ]
            },
            {
                id: 'genetics',
                keywords: ['color', 'gene', 'breed', 'สี', 'พันธุ์', 'กรรมพันธุ์'],
                templates: [
                    lang === 'th'
                        ? `🧬 **วิเคราะห์พันธุกรรม:**\n${pet.name} เป็นสายพันธุ์ ${pet.breed} สี ${pet.color || 'มาตรฐาน'}.\n\nหากคุณวางแผนจะผสมพันธุ์:\n- พ่อ (${formatName(parents.father)})\n- แม่ (${formatName(parents.mother)})\n\nพันธุกรรมจากบรรพบุรุษบ่งบอกถึงความแข็งแรงของสายเลือดครับ`
                        : `🧬 **Genetic Insight:**\n${pet.name} is a ${pet.color || 'standard'} ${pet.breed}.\n\nLineage Strength:\n- Sire Line: ${parents.father ? 'Documented' : 'Unknown'}\n- Dam Line: ${parents.mother ? 'Documented' : 'Unknown'}\n\nBased on the parents, this pet carries strong ${pet.breed} traits.`
                ],
                recommendedActions: [{ label: lang === 'th' ? 'ดูใบเพ็ดเต็ม' : 'View Full Pedigree', type: 'link' as const, value: shareUrl }]
            },
            {
                id: 'greeting',
                keywords: ['hi', 'hello', 'hey', 'good morning', 'sawasdee', 'หวัดดี', 'ดีครับ', 'ดีค่ะ'],
                templates: [
                    lang === 'th'
                        ? `สวัสดีครับ! ผมสามารถให้ข้อมูลเกี่ยวกับ ${pet.name} ได้ทั้งเรื่องสายเลือด, ราคา, หรือสุขภาพครับ`
                        : `Hello! I can show you the full family tree of ${pet.name}. Just ask!`
                ]
            },
            {
                id: 'birthday',
                keywords: ['birthday', 'born', 'age', 'old', 'วันเกิด', 'อายุ', 'เกิด'],
                templates: [
                    lang === 'th'
                        ? (birthDate ? `${pet.name} เกิดวันที่ ${new Date(birthDate).toLocaleDateString('th-TH')} ตอนนี้อายุประมาณ ${ageDisplay} ครับ` : `ขออภัยครับ ในระบบไม่มีข้อมูลวันเกิดของ ${pet.name}`)
                        : (birthDate ? `${pet.name} was born on ${new Date(birthDate).toLocaleDateString()}. That makes them approx ${ageDisplay} old.` : `I don't have the exact birth date recorded for ${pet.name}.`)
                ]
            },
            {
                id: 'registration',
                keywords: ['registration', 'reg no', 'number', 'license', 'เลขทะเบียน', 'ทะเบียน'],
                templates: [
                    lang === 'th'
                        ? `เลขทะเบียนของ ${pet.name} คือ ${registrationNumber || 'ยังไม่มีในระบบ'}`
                        : `${pet.name}'s registration number is ${registrationNumber || 'not recorded in our system'}.`
                ]
            },
            {
                id: 'share',
                keywords: ['share', 'link', 'url', 'copy', 'profile', 'แชร์', 'ลิงก์', 'ลิ้งค์', 'ส่งต่อ'],
                templates: [
                    lang === 'th'
                        ? `นี่คือลิงค์สำหรับแชร์โปรไฟล์ของ ${pet.name} ครับ:\n\n${shareUrl}\n\n(กดปุ่มด่านล่างเพื่อคัดลอกได้เลย!)`
                        : `Here is the shareable link for ${pet.name}'s profile:\n\n${shareUrl}\n\n(You can copy and paste this to share with friends!)`
                ],
                recommendedActions: [{ label: lang === 'th' ? 'คัดลอกลิงค์' : 'Copy Link', type: 'copy' as const, value: shareUrl, primary: true }]
            },
            {
                id: 'sale_status',
                keywords: ['price', 'sale', 'sold', 'available', 'buy', 'cost', 'how much', 'ราคา', 'ขาย', 'ซื้อ'],
                templates: [
                    lang === 'th'
                        ? `${isForSale ? 'ใช่ครับ น้องกำลังเปิดขายอยู่!' : 'ตอนนี้น้องยังไม่ได้เปิดขายครับ'} ${(isForSale && (pet as any).price) ? `ราคาค่าตัวอยู่ที่ ${(pet as any).price.toLocaleString()} บาท` : ''} ${marketAnalysis}`
                        : `${isForSale ? "Yes, this pet is currently listed for sale!" : "This pet is currently not listed for sale."} ${(isForSale && (pet as any).price) ? `Asking price: ${(pet as any).price.toLocaleString()} THB.` : ''} ${marketAnalysis}`
                ],
                recommendedActions: isForSale ? [{ label: lang === 'th' ? 'ติดต่อเจ้าของ' : 'Contact Owner', type: 'link' as const, value: '#contact', primary: true }] : []
            },
            {
                id: 'offspring',
                keywords: ['child', 'children', 'puppy', 'puppies', 'son', 'daughter', 'baby', 'ลูก', 'ทายาท'],
                templates: [
                    lang === 'th'
                        ? (offspring.length > 0 ? `มีครับ! ${pet.name} มีลูกๆ ที่ลงทะเบียนไว้ ${offspring.length} ตัว ดูรายการด้านล่างได้เลย` : `${pet.name} ยังไม่มีประวัติลูกในระบบของเราครับ`)
                        : (offspring.length > 0 ? `Yes! ${pet.name} has ${offspring.length} recorded children. I've listed them below.` : `${pet.name} doesn't have any recorded offspring yet.`)
                ]
            },
            {
                id: 'documents',
                keywords: ['paper', 'pedigree', 'cert', 'document', 'vaccine', 'file', 'ใบเพ็ด', 'เอกสาร'],
                templates: [
                    lang === 'th'
                        ? (documents.length > 0 ? `พบเอกสารดังนี้ครับ: ${documents.map((d: any) => d.title).join(', ')}` : `ยังไม่มีเอกสารสาธารณะสำหรับ ${pet.name} ครับ`)
                        : (documents.length > 0 ? `I found documents: ${documents.map((d: any) => d.title).join(', ')}.` : `No public documents found for ${pet.name}.`)
                ]
            },
            {
                id: 'owner',
                keywords: ['owner', 'who owns', 'contact', 'breeder', 'เจ้าของ', 'ติดต่อ'],
                templates: [
                    lang === 'th'
                        ? `เจ้าของปัจจุบันคือ ${ownerName} ครับ` + (ownerProfile?.phone ? ` (เบอร์โทร: ${ownerProfile.phone})` : '')
                        : `The registered owner is ${ownerName}.` + (ownerProfile?.phone ? ` (Phone: ${ownerProfile.phone})` : '')
                ]
            },
            {
                id: 'search',
                keywords: ['find', 'search', 'looking for', 'หา', 'มี', 'show me'],
                templates: [
                    lang === 'th'
                        ? (isSearchQuery ? `ผมเจอรายการที่เกี่ยวข้อง ${searchResults.length} รายการครับ` : `ผมลองค้นหาแล้วแต่ไม่พบข้อมูลที่ตรงกันครับ`)
                        : (isSearchQuery ? `I found ${searchResults.length} results.` : `I couldn't find matches.`)
                ]
            }
        ];

        const extraIntentKeywords: Record<string, string[]> = {
            family_tree: [
                'parents', 'parent', 'father', 'mother', 'sire', 'dam', 'grandparent', 'grandparents',
                'พ่อแม่', 'พ่อ', 'แม่', 'ปู่', 'ย่า', 'ตา', 'ยาย', 'สายเลือด', 'ครอบครัว', 'ผัง'
            ],
            share: [
                'share profile', 'share link', 'profile link', 'link', 'url', 'profile',
                'แชร์', 'ลิงค์', 'ลิ้งค์', 'โปรไฟล์', 'ส่งต่อ', 'ลิงก์'
            ],
            owner: [
                'who is owner', 'owner of', 'who owns', 'owner', 'contact', 'breeder',
                'เจ้าของ', 'ใครเป็นเจ้าของ', 'ผู้ครอบครอง', 'คนเลี้ยง', 'ติดต่อ'
            ],
            documents: [
                'certificate', 'papers', 'pedigree certificate', 'document', 'file', 'vaccine',
                'ใบเพ็ด', 'ใบเพ็ดเต็ม', 'เอกสาร', 'ใบรับรอง', 'วัคซีน'
            ],
            offspring: [
                'offspring', 'children', 'child', 'puppy', 'puppies', 'son', 'daughter', 'baby',
                'ลูก', 'ลูกๆ', 'ลูกกี่ตัว', 'กี่ตัว', 'จำนวนลูก'
            ],
            registration: [
                'reg', 'registration', 'reg no', 'number', 'license',
                'เลขทะเบียน', 'ทะเบียน', 'ใบทะเบียน'
            ],
            search: [
                'find', 'search', 'looking for', 'show me', 'lookup',
                'หา', 'ค้นหา', 'หาข้อมูล', 'ค้นข้อมูล', 'ดูข้อมูล'
            ]
        };

        const intents = baseIntents.map((intent) => {
            const extras = extraIntentKeywords[intent.id] || [];
            return extras.length > 0 ? { ...intent, keywords: [...intent.keywords, ...extras] } : intent;
        });

        // LOGIC EXECUTION
        if (breedMatch || breedKeywords.some(k => lowerQuery.includes(k))) {
            // ... Breeding Logic ...
            if (breedMatch) {
                const parts = lowerQuery.split(breedMatch);
                if (parts.length > 1) {
                    let rawName = parts[1].trim().replace(/(\?|ลูกจะ|เป็นไง|ออกมา|ได้ไหม|what|will|happen|puppies).*/g, '').trim();
                    if (rawName.length > 0) {
                        const { data } = await supabase.from('pets').select('*').ilike('name', `%${rawName}%`).neq('id', pet.id).limit(1).maybeSingle();
                        potentialMate = data;
                    }
                }
            }

            if (potentialMate) {
                const isSameGender = pet.gender === potentialMate.gender;
                const isSameBreed = pet.breed === potentialMate.breed;
                const hasSharedFather = pet.father_id && potentialMate.father_id && pet.father_id === potentialMate.father_id;
                const hasSharedMother = pet.mother_id && potentialMate.mother_id && pet.mother_id === potentialMate.mother_id;
                const isInbred = hasSharedFather || hasSharedMother;

                if (lang === 'th') {
                    let warning = "";
                    if (isSameGender) warning += `⚠️ **คำเตือน:** ทั้งคู่เป็นเพศ ${pet.gender} เหมือนกัน\n`;
                    if (isInbred) warning += `🚫 **อันตราย:** พบว่าทั้งคู่มีพ่อหรือแม่เดียวกัน (Inbreeding)\n`;

                    if (!isSameGender && !isInbred) {
                        aiText = `🔬 **วิเคราะห์การผสมพันธุ์กับ: ${potentialMate.name}**\n\n✅ สายพันธุ์: ${isSameBreed ? 'แท้ 100%' : 'ผสม'}\n✅ สี: ${pet.color} + ${potentialMate.color}`;
                    } else {
                        aiText = `🔬 **วิเคราะห์การผสมพันธุ์:**\n\n${warning}`;
                    }
                    if (!warning) { parsedType = 'pet_list'; parsedData = [potentialMate]; }
                } else {
                    aiText = `🔬 **Breeding Analysis:**\n\nMatch with ${potentialMate.name}: ${!isSameGender && !isInbred ? 'Good Match' : 'Risky Use'}`;
                    if (!isSameGender && !isInbred) { parsedType = 'pet_list'; parsedData = [potentialMate]; }
                }
            } else {
                aiText = lang === 'th' ? `ไม่พบคู่ผสมชื่อนั้นครับ` : `I couldn't find that mate.`;
            }
        } else {
            const matchedIntent = intents.find(i => matchesAnyKeyword(lowerQuery, i.keywords));
            if (matchedIntent) {
                if (matchedIntent.id === 'summary') {
                    aiText = buildSummaryText();
                } else if (matchedIntent.id === 'siblings') {
                    if (!fatherId && !motherId) {
                        aiText = lang === 'th'
                            ? `ในระบบยังไม่มีข้อมูลพ่อแม่ของ ${pet.name} จึงหาพี่น้องไม่ได้ครับ`
                            : `I don't have parent data for ${pet.name}, so I can't find siblings yet.`;
                    } else {
                        const siblingFilters: string[] = [];
                        if (fatherId) siblingFilters.push(`father_id.eq.${fatherId}`);
                        if (motherId) siblingFilters.push(`mother_id.eq.${motherId}`);
                        const { data } = await supabase
                            .from('pets')
                            .select(`*, owner:profiles!owner_id(full_name)`)
                            .or(siblingFilters.join(','))
                            .neq('id', pet.id)
                            .limit(10);
                        const siblings = data || [];
                        aiText = lang === 'th'
                            ? (siblings.length > 0
                                ? `พบพี่น้องของ ${pet.name} ${siblings.length} ตัวครับ`
                                : `ยังไม่พบข้อมูลพี่น้องของ ${pet.name} ในระบบครับ`)
                            : (siblings.length > 0
                                ? `I found ${siblings.length} siblings for ${pet.name}.`
                                : `No siblings are recorded for ${pet.name}.`);
                        if (siblings.length > 0) {
                            parsedType = 'pet_list';
                            parsedData = siblings;
                        }
                    }
                } else {
                    aiText = matchedIntent.templates[Math.floor(Math.random() * matchedIntent.templates.length)];
                    if ('recommendedActions' in matchedIntent) actions = matchedIntent.recommendedActions as any;
                }
            } else if (looksLikePetName(query)) {
                // AUTO-SWITCH CONTEXT
                const { data } = await supabase.from('pets').select(`*, owner:profiles!owner_id(full_name)`).or(`name.ilike.%${query}%,registration_number.ilike.%${query}%`).limit(5);
                if (data && data.length > 0) {
                    aiText = lang === 'th' ? `พบรายการที่แมตช์ครับ` : `I found these matches.`;
                    parsedType = 'pet_list';
                    parsedData = data;
                }
            }
        }

        // Attach Data Logic for List
        if (!breedMatch) {
            if (intents.find(i => i.id === 'search')?.keywords.some(k => lowerQuery.includes(k)) && searchResults.length > 0) {
                parsedType = 'pet_list';
                parsedData = searchResults;
            } else if (intents.find(i => i.id === 'offspring')?.keywords.some(k => lowerQuery.includes(k)) && offspring.length > 0) {
                const available = offspring.filter((p: any) => p.for_sale || p.status === 'available');
                const others = offspring.filter((p: any) => !p.for_sale && p.status !== 'available');
                parsedType = 'pet_list';
                parsedData = [...available, ...others];
            }
        }

        const localResult: Message = {
            id: Date.now().toString(),
            sender: 'ai',
            text: aiText,
            type: parsedType,
            data: parsedData,
            actions: actions
        };

        return localResult;
    };

    const handleSend = () => {
        if (!input.trim()) return;
        handleUserMessage(input);
        setInput('');
    };

    if (!isOpen) return null;

    const containerClass = className || "absolute bottom-20 right-6 w-96 h-[500px] bg-[#1A1A1A] rounded-2xl shadow-2xl flex flex-col border border-[#C5A059]/20 z-[100] animate-in slide-in-from-bottom-10 fade-in duration-300";

    return (
        <div className={containerClass}>
            {/* Header - Black & Gold */}
            <div className="p-4 bg-[#0D0D0D] text-white rounded-t-2xl flex items-center justify-between shadow-md border-b border-[#C5A059]/20">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#C5A059] to-[#8B7355] flex items-center justify-center">
                        <svg className="w-4 h-4 text-[#0A0A0A]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    </div>
                    <div>
                        <h3 className="font-['Playfair_Display'] font-bold text-sm text-[#F5F5F0]">Eibpo AI</h3>
                        <span className="text-[10px] text-[#C5A059] flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                            Online
                        </span>
                    </div>
                </div>
                <button onClick={onClose} className="p-1 hover:bg-[#C5A059]/20 rounded-lg transition-colors text-[#B8B8B8] hover:text-[#F5F5F0]">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>

            {/* Messages - Dark Theme */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#1A1A1A]">
                {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${msg.sender === 'user'
                            ? 'bg-[#C5A059] text-[#0A0A0A] rounded-br-none shadow-md'
                            : 'bg-[#0D0D0D] text-[#F5F5F0] rounded-bl-none border border-[#C5A059]/10 shadow-sm'
                            }`}>
                            <p className="whitespace-pre-wrap">{msg.text}</p>

                            {/* Action Buttons */}
                            {msg.actions && msg.actions.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {msg.actions.map((action, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => handleAction(action)}
                                            className={`text-xs px-3 py-1.5 rounded-full font-bold transition-all ${action.primary
                                                ? 'bg-[#C5A059] text-[#0A0A0A] hover:bg-[#D4C4B5]'
                                                : 'bg-[#1A1A1A] text-[#C5A059] border border-[#C5A059]/30 hover:bg-[#C5A059]/10'
                                                }`}
                                        >
                                            {action.label}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Pet List */}
                            {msg.type === 'pet_list' && msg.data && (
                                <div className="mt-3 space-y-2">
                                    {msg.data.map((p: any) => (
                                        <div key={p.id} className="flex items-center gap-3 p-2 rounded-xl bg-[#1A1A1A] border border-[#C5A059]/10 hover:border-[#C5A059]/30 transition-colors cursor-pointer group" onClick={() => window.dispatchEvent(new CustomEvent('openPetDetails', { detail: { pet: p } }))}>
                                            <img src={p.image_url || p.image || '/placeholder-pet.png'} className="w-10 h-10 rounded-lg object-cover bg-[#0D0D0D]" />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between">
                                                    <p className="font-bold text-xs text-[#F5F5F0] truncate">{p.name}</p>
                                                    {(p.for_sale || p.status === 'available') && (
                                                        <span className="text-[8px] font-bold bg-[#C5A059] text-[#0A0A0A] px-1.5 py-0.5 rounded-full uppercase tracking-wider">For Sale</span>
                                                    )}
                                                </div>
                                                <p className="text-[10px] text-[#B8B8B8]/60 truncate">{p.breed}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex justify-start">
                        <div className="bg-[#0D0D0D] rounded-2xl rounded-bl-none px-4 py-3 border border-[#C5A059]/10 shadow-sm flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-[#C5A059] rounded-full animate-bounce"></span>
                            <span className="w-1.5 h-1.5 bg-[#C5A059] rounded-full animate-bounce delay-75"></span>
                            <span className="w-1.5 h-1.5 bg-[#C5A059] rounded-full animate-bounce delay-150"></span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input - Dark Theme */}
            <div className="p-3 bg-[#0D0D0D] border-t border-[#C5A059]/10 rounded-b-2xl">
                <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={activeContextPet ? `Ask about ${activeContextPet.name}...` : "Ask Eibpo AI..."}
                        className="flex-1 px-4 py-2 bg-[#1A1A1A] border border-white/5 rounded-xl text-sm text-[#F5F5F0] placeholder:text-[#B8B8B8]/30 focus:outline-none focus:border-white/10 focus:shadow-[0_0_15px_rgba(197,160,89,0.1)] caret-[#C5A059] focus-visible:!shadow-none transition-all"
                    />
                    <button type="submit" disabled={!input.trim() || loading} className="p-2 bg-[#C5A059] text-[#0A0A0A] rounded-xl hover:bg-[#D4C4B5] transition-colors disabled:opacity-50">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                    </button>
                </form>
            </div>
        </div>
    );
};
