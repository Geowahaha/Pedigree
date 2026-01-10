import { supabase } from '@/lib/supabase';
import { askGlobalAdvisor } from '@/lib/gemini';
import { getDbFaqAnswer, captureFaqDraft } from './faqStore';

/* =========================================================
   BASIC HELPERS
========================================================= */

const isThaiText = (s: string) => /[\u0E01-\u0E59]/.test(s);
const cleanQuery = (q: string) => (q || '').normalize('NFKC').trim().replace(/\s+/g, ' ');
const ENABLE_QUERY_POOL =
  String(import.meta.env.VITE_ENABLE_QUERY_POOL || '').toLowerCase() === 'true';

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const isAsciiWord = (value: string) => /^[a-z0-9]+$/.test(value);
const includesKeyword = (text: string, keyword: string) => {
  if (!keyword) return false;
  if (keyword.includes(' ')) return text.includes(keyword);
  if (isAsciiWord(keyword)) {
    return new RegExp(`\\b${escapeRegExp(keyword)}\\b`, 'i').test(text);
  }
  return text.includes(keyword);
};
const matchesAny = (text: string, keywords: string[]) => keywords.some((k) => includesKeyword(text, k));

export type AIResponse = {
  text: string;
  type: 'text' | 'pet_list';
  data?: any;
  actions?: { label: string; type: 'link' | 'copy' | 'event'; value: string; primary?: boolean }[];
  intent?: 'search' | 'relationship' | 'analysis';
  query?: string;
};

/* =========================================================
   FIX2 — PET NAME HEURISTIC (REQUIRED BY UI)
========================================================= */
export const looksLikePetName = (query: string): boolean => {
  const q = cleanQuery(query);
  if (!q) return false;

  // Too long → not a name
  if (q.length > 40) return false;
  if (!/[a-z\u0E01-\u0E59]/i.test(q)) return false;
  if (/^\d+$/i.test(q)) return false;

  const lower = q.toLowerCase();
  const words = q.split(/\s+/).filter(Boolean);
  if (/^(?:555+|lol+|lmao+|haha+|ha+)$/i.test(lower)) return false;

  // Intent / command words → not a name
  const intentWords = [
    'price', 'market', 'trend', 'certificate', 'pedigree', 'find', 'search', 'show',
    'how', 'why', 'plan', 'should', 'what', 'help', 'analysis',
    'ราคา', 'ตลาด', 'แนวโน้ม', 'ใบเพ็ด', 'ใบรับรอง', 'หา', 'ค้นหา', 'วางแผน', 'ผสม', 'สุขภาพ',
    'ข้อมูล', 'พ่อแม่', 'พ่อ', 'แม่', 'ลูก', 'ผสมพันธุ์', 'คู่ผสม', 'พันธุกรรม', 'วิเคราะห์', 'แนะนำ', 'เสี่ยง', 'สายเลือด'
  ];
  const extraIntentWords = [
    'owner', 'profile', 'share', 'link', 'url', 'copy', 'contact', 'who', 'whose', 'where', 'when', 'how many', 'how much',
    'parent', 'parents', 'father', 'mother', 'offspring', 'child', 'children', 'puppy', 'puppies', 'family', 'tree', 'lineage',
    'born', 'birth', 'birthday', 'age', 'pregnant', 'gestation', 'heat', 'ovulation', 'registration', 'reg', 'register', 'registering', 'document', 'paper',
    'buy', 'sell', 'available', 'price', 'market', 'trend', 'analysis', 'plan', 'recommend', 'suggest', 'switch', 'change', 'other pet', 'other dog', 'other cat',
    'ใคร', 'ใครเป็น', 'ใครคือ', 'เจ้าของ', 'โปรไฟล์', 'แชร์', 'ลิงค์', 'ลิ้งค์', 'ใบเพ็ด', 'เอกสาร', 'ใบรับรอง',
    'พ่อแม่', 'พ่อ', 'แม่', 'ลูก', 'ลูกๆ', 'ลูกกี่', 'กี่ตัว', 'กี่เดือน', 'กี่วัน', 'เท่าไหร่',
    'ตั้งท้อง', 'ตั้งครรภ์', 'เป็นสัด', 'วันตกไข่', 'ผสมพันธุ์', 'วางแผน', 'สุขภาพ', 'อาหาร', 'วัคซีน',
    'ราคา', 'ตลาด', 'แนวโน้ม', 'วิเคราะห์', 'ติดต่อ', 'ซื้อ', 'ขาย', 'พร้อมขาย',
    'ok', 'okay', 'thanks', 'thank you', 'lol', 'haha', 'hahaha', '555', 'weather', 'today', 'ทั้งหมด', 'ข้อมูลทั้งหมด', 'รายละเอียด', 'ประวัติ', 'อากาศ', 'วันนี้', 'โอเค', 'อเค', 'โอ้ว', 'อ้าว', 'ว้าว', 'ฮ่า', 'ฮ่าๆ', 'ขอบคุณ', 'ครับ', 'ค่ะ', 'คะ', 'นะ', 'หน่อย', 'สิ'
  ];
  if ([...intentWords, ...extraIntentWords].some(k => lower.includes(k))) return false;

  // Typical pet name = 1–3 words
  if (words.length >= 1 && words.length <= 3) return true;

  return false;
};

/* =========================================================
   INTENT DETECTORS
========================================================= */

const isGreeting = (q: string) => {
  const l = q.toLowerCase();
  return matchesAny(l, [
    'hi', 'hello', 'hey', 'good morning', 'good evening',
    'สวัสดี', 'หวัดดี', 'ดีครับ', 'ดีค่ะ'
  ]);
};

const looksLikeMarketQuery = (q: string) => {
  const l = q.toLowerCase();
  return matchesAny(l, [
    'price', 'market', 'trend', 'average', 'value',
    'ราคา', 'ตลาด', 'แนวโน้ม', 'ค่าเฉลี่ย', 'ประเมิน'
  ]);
};

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

const looksLikePetRegistrationIntent = (q: string) => {
  const l = q.toLowerCase();
  if (matchesAny(l, REGISTRATION_NUMBER_HINTS)) return false;
  if (!matchesAny(l, REGISTER_VERBS)) return false;
  return matchesAny(l, PET_TARGET_HINTS) || matchesAny(l, PET_OWNERSHIP_HINTS);
};

const PUPPY_DOG_HINTS = ['puppy', 'puppies', 'ลูกหมา', 'ลูกสุนัข'];
const PUPPY_CAT_HINTS = ['kitten', 'kittens', 'ลูกแมว'];
const PUPPY_MARKET_HINTS = [
  ...PUPPY_DOG_HINTS,
  ...PUPPY_CAT_HINTS,
  'ลูกสัตว์', 'baby dog', 'baby cat', 'want a puppy', 'looking for puppy',
  'ซื้อหมา', 'หาลูกหมา', 'รับลูกหมา', 'รับลูกสุนัข', 'หาบ้าน', 'พร้อมย้ายบ้าน',
  'มีลูกหมาไหม', 'มีลูกแมวไหม', 'ลูกหมาขายไหม', 'ลูกแมวขายไหม', 'puppy for sale', 'kitten for sale'
];

const looksLikePuppyMarketQuery = (q: string) => {
  const l = q.toLowerCase();
  return matchesAny(l, PUPPY_MARKET_HINTS);
};

const BREEDING_MATCH_HINTS = [
  'breeding match', 'planned litter', 'planned breeding', 'due date', 'pregnant', 'expected litter',
  'ผสมพันธุ์', 'คู่ผสม', 'ลงทะเบียนผสมพันธุ์', 'คู่ไหนลงทะเบียนผสมพันธุ์', 'คำนวณวันคลอด', 'กำหนดคลอด', 'ลูกจะคลอดเมื่อไหร่',
  'ลูกหมาที่กำลังจะคลอด', 'ลูกแมวที่กำลังจะคลอด', 'ลูกหมาเกิดเมื่อไหร่', 'ลูกแมวเกิดเมื่อไหร่'
];

const looksLikeBreedingMatchQuery = (q: string) => {
  const l = q.toLowerCase();
  return matchesAny(l, BREEDING_MATCH_HINTS);
};

const shouldCaptureFaqDraft = (q: string) => {
  const normalized = cleanQuery(q).toLowerCase();
  if (normalized.length < 6 || normalized.length > 220) return false;
  if (looksLikePetName(normalized)) return false;
  if (looksLikeSearchQuery(normalized)) return false;
  if (hasRelationIntent(normalized)) return false;
  if (looksLikeMarketQuery(normalized)) return false;
  if (looksLikePuppyMarketQuery(normalized)) return false;
  if (looksLikeBreedingMatchQuery(normalized)) return false;
  if (looksLikePetRegistrationIntent(normalized)) return false;
  if (/https?:\/\//i.test(normalized)) return false;
  if (/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(normalized)) return false;
  return true;
};

const formatDateShort = (value?: string | null) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const addDays = (value: string, days: number) => {
  const base = new Date(value);
  if (Number.isNaN(base.getTime())) return null;
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next.toISOString().split('T')[0];
};

const BASE_SEARCH_HINTS = [
  'find', 'search', 'looking for', 'show me',
  'หา', 'ค้นหา', 'หาข้อมูล', 'ข้อมูล', 'ดูข้อมูล', 'ขอข้อมูล'
];

const EXTRA_SEARCH_HINTS = [
  'search for', 'searching', 'lookup', 'find info', 'find information', 'look for', 'seacrh',
  'หา', 'ค้นหา', 'หาข้อมูล', 'ค้นข้อมูล', 'ดูข้อมูล', 'ขอข้อมูล', 'ช่วยหา', 'ถามถึง', 'ถามเรื่อง', 'เกี่ยวกับ',
  'help me find', 'help me search', 'please find', 'please search', 'หาหน่อย'
];

const SEARCH_HINTS = [...BASE_SEARCH_HINTS, ...EXTRA_SEARCH_HINTS];

const BASE_RELATION_HINTS = [
  'family', 'tree', 'pedigree', 'lineage', 'parent', 'parents', 'father', 'mother', 'offspring', 'child', 'children', 'puppy', 'puppies',
  'พ่อแม่', 'พ่อ', 'แม่', 'ลูก', 'ลูกๆ', 'ลูกของ', 'สายเลือด', 'ผังครอบครัว', 'ตระกูล'
];

const EXTRA_RELATION_HINTS = [
  'owner', 'profile', 'share', 'link', 'url', 'copy', 'contact', 'certificate', 'document', 'paper', 'registration', 'reg',
  'เจ้าของ', 'โปรไฟล์', 'แชร์', 'ลิงค์', 'ลิ้งค์', 'ใบเพ็ด', 'เอกสาร', 'ใบรับรอง', 'พ่อแม่', 'พ่อ', 'แม่', 'ลูก', 'ลูกๆ',
  'สายเลือด', 'ครอบครัว', 'ผัง', 'จำนวนลูก', 'ลูกกี่ตัว'
];

const RELATION_HINTS = [...BASE_RELATION_HINTS, ...EXTRA_RELATION_HINTS];

const BASE_CLEANUP_TOKENS = [
  ...SEARCH_HINTS,
  ...RELATION_HINTS,
  'ของ', 'เกี่ยวกับ', 'หน่อย', 'ช่วย', 'ขอ', 'ดู', 'ข้อมูลของ'
];

const EXTRA_CLEANUP_TOKENS = [
  'who is', 'who owns', 'owner of', 'profile of', 'share', 'share profile', 'link', 'url', 'copy',
  'please', 'can you', 'could you', 'help me', 'for', 'of', 'the', 'switch', 'change', 'other', 'another',
  'exit', 'leave', 'reset', 'clear', 'forget', 'not this',
  'ใคร', 'ใครเป็น', 'ใครคือ', 'คือใคร', 'เป็นใคร', 'ของ', 'ของใคร', 'ขอ', 'ช่วย', 'หน่อย', 'ครับ', 'ค่ะ', 'คะ', 'ไง', 'ถามถึง', 'ถามเรื่อง', 'เกี่ยวกับ',
  'ออกจาก', 'ลืม', 'รีเซ็ต', 'เคลียร์', 'เปลี่ยน', 'ตัวอื่น', 'หมาตัวอื่น', 'แมวตัวอื่น', 'ไม่ใช่ตัวนี้',
  'pls', 'plz', 'ok', 'okay', 'thanks', 'thank you', 'lol', 'haha', 'hahaha', '555', 'สิ', 'นะ', 'โอเค', 'อเค', 'โอ้ว', 'อ้าว', 'ว้าว', 'ฮ่า', 'ฮ่าๆ', 'ขอบคุณ', 'ขอบใจ',
  'ทั้งหมด', 'ข้อมูลทั้งหมด', 'รายละเอียด', 'ประวัติ', 'ขอข้อมูลทั้งหมด'
];

const CLEANUP_TOKENS = [...BASE_CLEANUP_TOKENS, ...EXTRA_CLEANUP_TOKENS];

const looksLikeSearchQuery = (q: string) => {
  const l = q.toLowerCase();
  return matchesAny(l, SEARCH_HINTS);
};

const hasRelationIntent = (q: string) => {
  const l = q.toLowerCase();
  return matchesAny(l, RELATION_HINTS);
};

const extractSearchTerms = (q: string) => {
  let cleaned = cleanQuery(q).toLowerCase();

  // Sort tokens by length descending to match longest first
  const sortedTokens = [...CLEANUP_TOKENS, 'น้อง'].sort((a, b) => b.length - a.length);

  sortedTokens.forEach((token) => {
    cleaned = cleaned.split(token).join(' ');
  });
  cleaned = cleaned.replace(/[^a-z0-9\u0E01-\u0E59\s\-]/gi, ' ');
  cleaned = cleaned.replace(/(^|\s)[\u0E31-\u0E3A\u0E47-\u0E4E]+/g, ' ');
  return cleanQuery(cleaned);
};

const logQueryPool = async (payload: {
  query: string;
  normalized_query?: string | null;
  lang?: string;
  source?: string;
  intent?: string;
  result?: string;
  context_pet_id?: string | null;
  context_pet_name?: string | null;
}) => {
  if (!ENABLE_QUERY_POOL) return;
  try {
    const { error } = await supabase.from('ai_query_pool').insert(payload);
    if (error) {
      console.debug('ai_query_pool insert failed', error);
    }
  } catch (error) {
    console.debug('ai_query_pool insert failed', error);
  }
};


export const getSmallTalkAnswer = (
  rawQuery: string,
  lang: 'th' | 'en',
  options?: { petName?: string }
): string | null => {
  const query = cleanQuery(rawQuery).toLowerCase();
  if (!query) return null;

  const laughRegex = /^(?:555+|lol+|lmao+|haha+|ha+|ฮ่า+|ฮ่าๆ+)$/i;
  if (laughRegex.test(query)) {
    return lang === 'th'
      ? 'ฮ่าๆ ได้เลยครับ ถ้ามีคำถามเรื่องสัตว์เลี้ยงหรือสายเลือด บอกได้เลยนะครับ'
      : '😄 Sure! If you have any pet or pedigree questions, I can help.';
  }

  const ackExact = [
    'ok', 'okay', 'k', 'yes', 'yep', 'yeah', 'thanks', 'thank you', 'thx', 'ty',
    'โอเค', 'อเค', 'ขอบคุณ', 'ขอบใจ', 'ครับ', 'ค่ะ', 'คะ', 'ได้เลย', 'โอ้', 'ว้าว', 'อ้าว', 'โอ้ว'
  ];
  if (ackExact.includes(query)) {
    const suffix = options?.petName
      ? (lang === 'th'
        ? ` ถ้าต้องการถามเรื่อง ${options.petName} ต่อ พิมพ์ได้เลยครับ`
        : ` If you want to ask about ${options.petName}, just say it.`)
      : (lang === 'th'
        ? ' ถ้ามีคำถามเกี่ยวกับสัตว์เลี้ยง บอกได้เลยครับ'
        : ' If you have any pet questions, just ask.');
    return lang === 'th' ? `รับทราบครับ${suffix}` : `Got it.${suffix}`;
  }

  if (query.includes('อากาศ') || query.includes('weather')) {
    return lang === 'th'
      ? 'อากาศดีจริงครับ 😊 ถ้ามีคำถามเรื่องสัตว์เลี้ยงหรือการผสมพันธุ์ บอกได้เลยนะครับ'
      : 'Sounds nice! If you have any pet or breeding questions, I can help.';
  }

  return null;
};

type FaqEntry = {
  id: string;
  keywords: string[];
  exclude?: string[];
  scope?: 'any' | 'global';
  answer: { th: string; en: string };
};

const FAQ_ENTRIES: FaqEntry[] = [
  {
    id: 'dog_gestation',
    scope: 'any',
    keywords: [
      'dog pregnant', 'dog pregnancy', 'dog gestation', 'pregnant dog', 'gestation', 'pregnancy length',
      'หมาตั้งท้อง', 'สุนัขตั้งท้อง', 'ตั้งท้องกี่เดือน', 'ท้องกี่เดือน', 'ท้องกี่วัน', 'คลอดกี่วัน', 'ตั้งครรภ์'
    ],
    exclude: ['cat', 'แมว', 'แมวท้อง', 'ท้องแมว'],
    answer: {
      th: 'สุนัขตั้งท้องเฉลี่ยประมาณ 63 วัน (ช่วงปกติ 58–68 วัน) นับจากวันผสม/ตกไข่ครับ ถ้าต้องการคำนวณวันคลอดโดยประมาณ บอกวันที่ผสมได้เลย และควรยืนยันกับสัตวแพทย์อีกครั้ง',
      en: 'Dog gestation averages about 63 days (roughly 58–68 days) from ovulation/mating. If you want an estimated due date, share the mating date and confirm with your vet.'
    }
  },
  {
    id: 'cat_gestation',
    scope: 'any',
    keywords: [
      'cat pregnant', 'cat pregnancy', 'cat gestation', 'pregnant cat',
      'แมวตั้งท้อง', 'แมวท้อง', 'ท้องแมว', 'ตั้งครรภ์แมว'
    ],
    answer: {
      th: 'แมวตั้งท้องเฉลี่ยประมาณ 63–65 วัน (ราว 9 สัปดาห์) นับจากวันผสมครับ หากต้องการความแม่นยำควรปรึกษาสัตวแพทย์',
      en: 'Cat pregnancy averages about 63–65 days (around 9 weeks) from mating. For precise timing, confirm with a vet.'
    }
  },
  {
    id: 'heat_ovulation',
    scope: 'any',
    keywords: [
      'heat', 'estrus', 'ovulation', 'progesterone', 'fertile window',
      'เป็นสัด', 'วันตกไข่', 'ตรวจฮอร์โมน', 'รอบสัด', 'ฮีท'
    ],
    answer: {
      th: 'การเป็นสัดของสุนัขมักกินเวลา 2–4 สัปดาห์ และช่วงผสมที่เหมาะมักอยู่ราว 2–3 วันหลังตกไข่ วิธีที่แม่นคือการตรวจฮอร์โมนโปรเจสเตอโรนหรือเซลล์วิทยาช่องคลอดครับ',
      en: 'A dog’s heat typically lasts 2–4 weeks; optimal mating is often ~2–3 days after ovulation. The most accurate timing uses progesterone tests or vaginal cytology.'
    }
  },
  {
    id: 'pedigree_certificate',
    scope: 'global',
    keywords: [
      'pedigree', 'certificate', 'pedigree certificate', 'paper',
      'ใบเพ็ด', 'ใบเพ็ดเต็ม', 'ใบรับรองสายเลือด', 'เอกสารสายเลือด'
    ],
    answer: {
      th: 'ใบเพ็ดคือเอกสารสายเลือดที่ออกโดยสมาคม/องค์กรรับรองสายพันธุ์ โดยทั่วไปต้องใช้ข้อมูลพ่อแม่ เลขทะเบียน และผู้เพาะเลี้ยง หากต้องการตรวจสอบหรือออกใบเพ็ด แนะนำระบุชื่อ/เลขทะเบียนและสมาคมที่เกี่ยวข้องครับ',
      en: 'A pedigree certificate documents lineage and is issued by a recognized kennel/cat club. It typically requires parent info, registration numbers, and breeder details. Share the name/reg and club if you want help.'
    }
  },
  {
    id: 'registration_steps',
    scope: 'any',
    keywords: [
      'register', 'registration', 'registering', 'registration process',
      'จดทะเบียน', 'ขึ้นทะเบียน', 'ลงทะเบียน', 'ใบทะเบียน'
    ],
    exclude: ['registration number', 'เลขทะเบียน', 'reg no', 'reg number'],
    answer: {
      th: 'ขั้นตอนจดทะเบียนโดยทั่วไป: 1) ไมโครชิป 2) ข้อมูลพ่อแม่/สายเลือด 3) รูปและข้อมูลเจ้าของ 4) ติดต่อสมาคมหรือ kennel club ที่ต้องการ 5) ส่งแบบฟอร์ม/ค่าธรรมเนียม หากบอกประเทศหรือสมาคมที่ต้องการ ผมช่วยแนะนำขั้นตอนเฉพาะให้ได้ครับ',
      en: 'General registration steps: 1) Microchip 2) Parent/pedigree info 3) Photos + owner details 4) Contact your kennel/cat club 5) Submit forms/fees. Tell me your country/club and I can tailor the steps.'
    }
  },
  {
    id: 'inbreeding',
    scope: 'any',
    keywords: [
      'inbreed', 'inbreeding', 'coi', 'consang',
      'เลือดชิด', 'ผสมชิด', 'สายเลือดชิด'
    ],
    answer: {
      th: 'ควรหลีกเลี่ยงการผสมพ่อ-ลูก หรือพี่-น้อง และตรวจสายเลือดย้อนหลังอย่างน้อย 3–5 รุ่นเพื่อลดความเสี่ยงโรคทางพันธุกรรม หากมีข้อมูล COI จะช่วยประเมินความเสี่ยงได้ดีครับ',
      en: 'Avoid close-relative pairings (parent-offspring or siblings) and review at least 3–5 generations. If you have COI data, it helps assess genetic risk.'
    }
  },
  {
    id: 'marketplace_buy',
    scope: 'global',
    keywords: [
      'marketplace', 'market', 'for sale', 'buy', 'purchase', 'shop', 'adoption',
      'ตลาด', 'ซื้อ', 'ขาย', 'ประกาศขาย', 'หาบ้าน', 'ตลาดสัตว์เลี้ยง', 'ตลาดซื้อขาย'
    ],
    answer: {
      th: 'โหมดตลาดช่วยให้คุณดูสัตว์ที่ลงขายหรือพร้อมย้ายบ้านได้ครับ แนะนำให้กรองตามสายพันธุ์/พื้นที่ ตรวจสอบโปรไฟล์ผู้เพาะพันธุ์ และดูเอกสารสุขภาพก่อนตัดสินใจ',
      en: 'Marketplace lets you browse pets for sale or ready to rehome. Filter by breed/location, review breeder profiles, and check health documents before deciding.'
    }
  },
  {
    id: 'marketplace_reserve',
    scope: 'global',
    keywords: [
      'reserve', 'waitlist', 'deposit', 'queue',
      'จอง', 'มัดจำ', 'รอคิว', 'ขึ้นคิว'
    ],
    answer: {
      th: 'ถ้าต้องการจองลูกสุนัข/ลูกแมว ให้ติดต่อเจ้าของผ่านโปรไฟล์และตกลงเงื่อนไขมัดจำ/คิวให้ชัดเจน หากต้องการ ผมช่วยแนะนำคำถามที่ควรถามได้ครับ',
      en: 'To reserve a puppy/kitten, contact the owner via their profile and confirm deposit/queue terms. I can suggest questions to ask if you want.'
    }
  }

];

export const getFaqAnswer = (
  rawQuery: string,
  lang: 'th' | 'en',
  options?: { hasPetContext?: boolean }
): string | null => {
  const query = cleanQuery(rawQuery).toLowerCase();
  const hasPetContext = Boolean(options?.hasPetContext);
  for (const entry of FAQ_ENTRIES) {
    if (hasPetContext && entry.scope === 'global') continue;
    if (entry.exclude && entry.exclude.some(k => query.includes(k))) continue;
    if (entry.keywords.some(k => query.includes(k))) {
      return lang === 'th' ? entry.answer.th : entry.answer.en;
    }
  }
  return null;
};

/* =========================================================
   MARKET SNAPSHOT (SAFE VERSION)
========================================================= */

const getMarketSnapshot = async () => {
  const { data, error } = await supabase
    .from('pets')
    .select('*')
    .not('price', 'is', null)
    .gt('price', 0)
    .limit(50);

  if (error || !data || data.length === 0) return null;

  const prices = data
    .map((p: any) => p.price)
    .filter((p: any) => typeof p === 'number' && p > 0);

  if (prices.length === 0) return null;

  const avgPrice = prices.reduce((a: number, b: number) => a + b, 0) / prices.length;

  return {
    avgPrice,
    samples: prices.length,
    recent_listings_sample: data.slice(0, 5).map((p: any) => ({
      id: p.id,
      name: p.name,
      breed: p.breed,
      price: p.price
    }))
  };
};

const getPuppyListings = async (query: string, lang: 'th' | 'en'): Promise<AIResponse> => {
  const lower = query.toLowerCase();
  const isCat = matchesAny(lower, PUPPY_CAT_HINTS);
  const isDog = matchesAny(lower, PUPPY_DOG_HINTS);
  const petType = isCat ? 'cat' : isDog ? 'dog' : null;
  const label = lang === 'th'
    ? (isCat ? 'ลูกแมว' : isDog ? 'ลูกหมา' : 'สัตว์เลี้ยง')
    : (isCat ? 'kittens' : isDog ? 'puppies' : 'pets');

  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 12);
  const cutoffDate = cutoff.toISOString().split('T')[0];

  const actions = [
    {
      label: lang === 'th' ? 'ดูตลาด' : 'Open Marketplace',
      type: 'link' as const,
      value: '#marketplace',
      primary: true
    }
  ];

  let baseQuery = supabase
    .from('pets')
    .select('*, owner:profiles!owner_id(full_name)')
    .eq('for_sale', true)
    .eq('available', true);

  if (petType) baseQuery = baseQuery.eq('type', petType);

  let { data, error } = await baseQuery
    .gte('birthday', cutoffDate)
    .order('created_at', { ascending: false })
    .limit(8);

  if (error || !data || data.length === 0) {
    let fallbackQuery = supabase
      .from('pets')
      .select('*, owner:profiles!owner_id(full_name)')
      .eq('for_sale', true)
      .eq('available', true);
    if (petType) fallbackQuery = fallbackQuery.eq('type', petType);
    const fallback = await fallbackQuery.order('created_at', { ascending: false }).limit(8);
    data = fallback.data || [];
  }

  if (data.length > 0) {
    return {
      text: lang === 'th'
        ? `ตอนนี้มี${label}ที่ลงขาย ${data.length} รายการ ดูรายการด้านล่างได้เลยครับ`
        : `I found ${data.length} ${label} for sale. See the list below.`,
      type: 'pet_list',
      data,
      actions,
      intent: 'search'
    };
  }

  return {
    text: lang === 'th'
      ? `ตอนนี้ยังไม่พบ${label}ที่ลงขายครับ ลองดูในตลาดหรือบอกสายพันธุ์ที่ต้องการได้เลย`
      : `I couldn't find ${label} for sale right now. Try the marketplace or tell me the breed you want.`,
    type: 'text',
    actions,
    intent: 'search'
  };
};

const getBreedingMatchesSummary = async (lang: 'th' | 'en'): Promise<AIResponse> => {
  const { data, error } = await supabase
    .from('breeding_matches')
    .select('id, sire_id, dam_id, match_date, due_date, status, description, approval_status')
    .in('status', ['planned', 'mated', 'confirmed'])
    .or('approval_status.eq.approved,approval_status.is.null')
    .order('match_date', { ascending: false })
    .limit(5);

  if (error || !data || data.length === 0) {
    return {
      text: lang === 'th'
        ? 'ตอนนี้ยังไม่มีคู่ผสมพันธุ์ที่ลงทะเบียนไว้ครับ หากต้องการเพิ่มรายการ ให้แจ้งชื่อพ่อและแม่ แล้วผมช่วยแนะนำขั้นตอนต่อได้'
        : 'There are no registered breeding matches yet. If you want to add one, share the sire and dam names and I can guide you.',
      type: 'text',
      intent: 'analysis'
    };
  }

  const petIds = Array.from(new Set(data.flatMap((m: any) => [m.sire_id, m.dam_id]).filter(Boolean)));
  const { data: pets } = await supabase
    .from('pets')
    .select('id, name, breed, birthday, registration_number, owner_name, owner:profiles!owner_id(full_name)')
    .in('id', petIds);

  const petById = new Map<string, any>();
  (pets || []).forEach((pet: any) => petById.set(pet.id, pet));

  const parentCounts = new Map<string, number>();
  await Promise.all(petIds.map(async (id) => {
    const { count } = await supabase
      .from('pets')
      .select('id', { count: 'exact', head: true })
      .or(`father_id.eq.${id},mother_id.eq.${id}`);
    if (typeof count === 'number') parentCounts.set(id, count);
  }));

  const statusLabel = (status: string) => {
    if (lang === 'th') {
      if (status === 'planned') return 'วางแผน';
      if (status === 'mated') return 'ผสมแล้ว';
      if (status === 'confirmed') return 'ยืนยันแล้ว';
      return 'ไม่ทราบสถานะ';
    }
    if (status === 'planned') return 'Planned';
    if (status === 'mated') return 'Mated';
    if (status === 'confirmed') return 'Confirmed';
    return 'Unknown';
  };

  const lines = data.map((match: any, index: number) => {
    const sire = match.sire_id ? petById.get(match.sire_id) : null;
    const dam = match.dam_id ? petById.get(match.dam_id) : null;
    const breed = sire?.breed || dam?.breed || (lang === 'th' ? 'ไม่ทราบสายพันธุ์' : 'Unknown breed');
    const dueDateRaw = match.due_date || (match.match_date ? addDays(match.match_date, 63) : null);
    const dueLabel = formatDateShort(dueDateRaw) || (lang === 'th' ? 'ไม่ทราบ' : 'TBD');
    const sireCount = match.sire_id ? parentCounts.get(match.sire_id) : null;
    const damCount = match.dam_id ? parentCounts.get(match.dam_id) : null;
    const offspringNote = (sireCount != null || damCount != null)
      ? (lang === 'th'
        ? ` พ่อมีลูกที่บันทึกไว้ ${sireCount ?? 0} ตัว, แม่มีลูกที่บันทึกไว้ ${damCount ?? 0} ตัว`
        : ` Sire has ${sireCount ?? 0} recorded offspring; Dam has ${damCount ?? 0}.`)
      : '';
    return lang === 'th'
      ? `${index + 1}) พ่อ ${sire?.name || 'ไม่ทราบ'} × แม่ ${dam?.name || 'ไม่ทราบ'} (${breed}) สถานะ: ${statusLabel(match.status)} คาดคลอด: ${dueLabel}.${offspringNote}`
      : `${index + 1}) Sire ${sire?.name || 'Unknown'} × Dam ${dam?.name || 'Unknown'} (${breed}) Status: ${statusLabel(match.status)}. Due: ${dueLabel}.${offspringNote}`;
  });

  return {
    text: lang === 'th'
      ? `พบคู่ผสมพันธุ์ที่ลงทะเบียนไว้ ${data.length} คู่:\n\n${lines.join('\n')}`
      : `I found ${data.length} registered breeding matches:\n\n${lines.join('\n')}`,
    type: 'text',
    intent: 'analysis',
    actions: [
      {
        label: lang === 'th' ? 'ดูตลาด' : 'Open Marketplace',
        type: 'link',
        value: '#marketplace',
        primary: true
      }
    ]
  };
};

/* =========================================================
   MAIN GLOBAL BRAIN
========================================================= */

export const processGlobalQuery = async (
  rawQuery: string,
  lang: 'th' | 'en' = 'en'
): Promise<AIResponse> => {
  const query = cleanQuery(rawQuery);
  const isThai = lang === 'th' || isThaiText(query);

  console.log(`[GlobalBrain] processGlobalQuery called with: "${query}"`);

  /* ---------- CHECK PENDING ACTION (YES/NO confirmation) ---------- */
  const { processPendingResponse, hasPendingAction } = await import('./pendingActionManager');

  console.log(`[GlobalBrain] hasPendingAction: ${hasPendingAction()}`);

  if (hasPendingAction()) {
    const pendingResult = processPendingResponse(query);

    if (pendingResult) {
      if (pendingResult.confirmed && pendingResult.action) {
        console.log(`[GlobalBrain] Pending action CONFIRMED: ${pendingResult.action.value}`);
        return {
          text: isThai
            ? `ได้เลยครับ กำลังเปิด ${pendingResult.action.label}...`
            : `Sure! Opening ${pendingResult.action.label}...`,
          type: 'text',
          intent: 'analysis',
          actions: [{
            type: pendingResult.action.type,
            label: pendingResult.action.label,
            value: pendingResult.action.value,
            primary: true
          }]
        };
      } else {
        console.log('[GlobalBrain] Pending action REJECTED');
        return {
          text: isThai
            ? 'ได้ครับ 😊 มีอะไรให้ช่วยอีกไหมครับ?'
            : 'No problem! 😊 Is there anything else I can help with?',
          type: 'text',
          intent: 'analysis'
        };
      }
    }
  }

  /* ---------- GREETING ---------- */
  if (isGreeting(query)) {
    return {
      text: isThai
        ? 'สวัสดีครับ 😊 ผมช่วยค้นหาข้อมูล วางแผนผสมพันธุ์ หรือวิเคราะห์ตลาดให้ได้ครับ'
        : 'Hello! I can help you search pets, analyze the market, or plan breeding.',
      type: 'text'
    };
  }

  const smallTalk = getSmallTalkAnswer(query, lang);
  if (smallTalk) {
    return {
      text: smallTalk,
      type: 'text',
      intent: 'analysis'
    };
  }

  /* ---------- CONTEXT EXTRACTION ---------- */
  // Extract semantic context: WHO (pet), WHAT (topic), HOW (intent)
  const { extractContext, getSuggestedAction } = await import('./contextExtractor');
  const context = await extractContext(query);

  console.log(`[GlobalBrain] Context: pet="${context.petName}", topic="${context.topic}", intent="${context.intent.type}"`);

  // If we have a specific topic + pet, provide targeted response
  if (context.petId && context.topic !== 'general') {
    const suggestion = getSuggestedAction(context, lang);
    if (suggestion && suggestion.action) {
      // Save pending action for YES/NO confirmation
      const { setPendingAction } = await import('./pendingActionManager');
      setPendingAction({
        type: suggestion.action.type,
        value: suggestion.action.value,
        label: suggestion.action.label,
        petId: context.petId,
        petName: context.petName || undefined,
        topic: context.topic
      });

      return {
        text: suggestion.text,
        type: 'text',
        intent: 'analysis'
      };
    }
  }

  if (looksLikePetRegistrationIntent(query)) {
    void logQueryPool({
      query,
      normalized_query: extractSearchTerms(query) || null,
      lang,
      source: 'global',
      intent: 'analysis',
      result: 'register_pet'
    });
    return {
      text: isThai
        ? 'ได้เลยครับ ผมจะเปิดหน้าลงทะเบียนสัตว์เลี้ยงให้เลย ถ้ายังไม่ได้ล็อกอิน ระบบจะพาไปหน้าเข้าสู่ระบบก่อนครับ'
        : 'Sure — I can open the pet registration form. If you are not logged in, you will be asked to sign in first.',
      type: 'text',
      intent: 'analysis',
      actions: [
        {
          label: isThai ? 'ลงทะเบียนสัตว์เลี้ยง' : 'Register a Pet',
          type: 'event',
          value: 'openRegisterPet',
          primary: true
        }
      ]
    };
  }

  if (looksLikeBreedingMatchQuery(query)) {
    return await getBreedingMatchesSummary(lang);
  }

  if (looksLikePuppyMarketQuery(query)) {
    return await getPuppyListings(query, lang);
  }

  /* ---------- MARKET ---------- */
  if (looksLikeMarketQuery(query)) {
    const market = await getMarketSnapshot();

    return {
      text: await askGlobalAdvisor(query, {
        lang,
        market
      }),
      type: 'text',
      intent: 'analysis'
    };
  }

  /* ---------- SEARCH ---------- */
  // Try Smart Pet Name Matcher first
  const { extractBestPetName } = await import('./petNameMatcher');
  const matchedPet = await extractBestPetName(query);

  let searchTarget = '';
  if (matchedPet) {
    console.log(`[GlobalBrain] Smart match found: "${matchedPet.name}"`);
    searchTarget = matchedPet.name;
  } else {
    // Fallback to keyword extraction
    const searchTerms = extractSearchTerms(query);
    searchTarget = searchTerms.length >= 2 ? searchTerms : query;
  }

  const relationIntent = hasRelationIntent(query);
  const shouldSearch =
    matchedPet ||
    looksLikeSearchQuery(query) ||
    looksLikePetName(query) ||
    (relationIntent && searchTarget.length >= 2) ||
    (searchTarget.length >= 2 && searchTarget !== query.toLowerCase());

  if (shouldSearch && searchTarget.length >= 2) {
    const { data, error } = await supabase
      .from('pets')
      .select(`*, owner:profiles!owner_id(full_name)`)
      .or(`name.ilike.%${searchTarget}%,breed.ilike.%${searchTarget}%,registration_number.ilike.%${searchTarget}%`)
      .limit(5);

    if (error) console.error('[GlobalBrain] Search error:', error);

    if (data && data.length > 0) {
      // Fetch parent data for each pet
      for (const pet of data) {
        if (pet.father_id) {
          const { data: fatherData } = await supabase
            .from('pets')
            .select('id, name, breed')
            .eq('id', pet.father_id)
            .single();
          pet.father = fatherData;
        }
        if (pet.mother_id) {
          const { data: motherData } = await supabase
            .from('pets')
            .select('id, name, breed')
            .eq('id', pet.mother_id)
            .single();
          pet.mother = motherData;
        }
      }

      return {
        text: isThai
          ? `พบข้อมูลที่ตรงกับ "${searchTarget}" ${data.length} รายการ`
          : `I found ${data.length} matching results.`,
        type: 'pet_list',
        data,
        intent: relationIntent ? 'relationship' : 'search',
        query: searchTarget
      };
    }

    void logQueryPool({
      query,
      normalized_query: searchTarget,
      lang,
      source: 'global',
      intent: relationIntent ? 'relationship' : 'search',
      result: 'no_match'
    });

    return {
      text: isThai
        ? `ไม่พบข้อมูลที่ตรงกับ "${searchTarget}"`
        : `No results found for "${searchTarget}".`,
      type: 'text',
      intent: relationIntent ? 'relationship' : 'search',
      query: searchTarget
    };
  }

  const dbFaqAnswer = await getDbFaqAnswer(query, lang);
  if (dbFaqAnswer) {
    void logQueryPool({
      query,
      normalized_query: searchTarget || null,
      lang,
      source: 'global',
      intent: 'analysis',
      result: 'faq_db'
    });
    return {
      text: dbFaqAnswer,
      type: 'text',
      intent: 'analysis'
    };
  }

  const faqAnswer = getFaqAnswer(query, lang);
  if (faqAnswer) {
    void logQueryPool({
      query,
      normalized_query: searchTarget || null,
      lang,
      source: 'global',
      intent: 'analysis',
      result: 'faq_static'
    });
    return {
      text: faqAnswer,
      type: 'text',
      intent: 'analysis'
    };
  }

  if (relationIntent && searchTarget.length < 2) {
    void logQueryPool({
      query,
      normalized_query: searchTarget || null,
      lang,
      source: 'global',
      intent: 'relationship',
      result: 'missing_pet'
    });
    return {
      text: isThai
        ? 'ระบุชื่อสัตว์หรือเลขทะเบียนด้วยครับ เพื่อดึงข้อมูลสายเลือดให้ถูกต้อง'
        : 'Please provide a pet name or registration number so I can fetch the pedigree.',
      type: 'text',
      intent: 'relationship'
    };
  }

  /* ---------- FALLBACK → LLM ---------- */
  void logQueryPool({
    query,
    normalized_query: searchTarget || null,
    lang,
    source: 'global',
    intent: 'analysis',
    result: 'llm_fallback'
  });
  const llmAnswer = await askGlobalAdvisor(query, { lang });
  if (shouldCaptureFaqDraft(query)) {
    void captureFaqDraft({
      query,
      answer: llmAnswer,
      lang,
      scope: 'global',
      source: 'llm_fallback'
    });
  }
  return {
    text: llmAnswer,
    type: 'text',
    intent: 'analysis'
  };
};

/* =========================================================
   EXPORT GUARD (ANTI-BLANK-PAGE)
========================================================= */
export const __globalBrain_exports_guard = true;
