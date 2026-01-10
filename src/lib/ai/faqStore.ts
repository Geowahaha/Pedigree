import { supabase } from '@/lib/supabase';
import { LocalVectorStore, tokenize } from './localVectorStore';

export type FaqEntryDb = {
  id: string;
  scope?: 'any' | 'global' | 'pet' | string | null;
  keywords?: string[] | null;
  exclude?: string[] | null;
  question_th?: string | null;
  question_en?: string | null;
  answer_th?: string | null;
  answer_en?: string | null;
  priority?: number | null;
  lang?: string | null;
  category?: string | null;
};

type FaqMatchOptions = {
  hasPetContext?: boolean;
};

const ENABLE_FAQ_DB =
  String(import.meta.env.VITE_ENABLE_FAQ_DB ?? 'true').toLowerCase() === 'true';
const FAQ_CACHE_TTL_MS = Number(import.meta.env.VITE_FAQ_CACHE_TTL_MS ?? 300000);
const FAQ_MAX_ENTRIES = Number(import.meta.env.VITE_FAQ_MAX_ENTRIES ?? 400);
const FAQ_MIN_SCORE = Number(import.meta.env.VITE_FAQ_MIN_SCORE ?? 0.48);
const FAQ_CAPTURE_MODE = String(import.meta.env.VITE_FAQ_CAPTURE_MODE ?? 'draft').toLowerCase();
const FAQ_CAPTURE_KEYWORDS_LIMIT = 12;

type FaqCache = {
  entries: FaqEntryDb[];
  entryMap: Map<string, FaqEntryDb>;
  store: LocalVectorStore;
  loadedAt: number;
};

let faqCache: FaqCache | null = null;
let inflight: Promise<FaqEntryDb[]> | null = null;

const cleanText = (value: string) =>
  value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const isAsciiWord = (value: string) => /^[a-z0-9]+$/.test(value);
const includesKeyword = (text: string, keyword: string) => {
  if (!keyword) return false;
  const normalized = keyword.toLowerCase().trim();
  if (!normalized) return false;
  if (normalized.includes(' ')) return text.includes(normalized);
  if (isAsciiWord(normalized)) {
    return new RegExp(`\\b${escapeRegExp(normalized)}\\b`, 'i').test(text);
  }
  return text.includes(normalized);
};

const shouldSkipScope = (entry: FaqEntryDb, hasPetContext: boolean) => {
  const scope = entry.scope || 'any';
  if (scope === 'any') return false;
  if (scope === 'global' && hasPetContext) return true;
  if (scope === 'pet' && !hasPetContext) return true;
  return false;
};

const pickAnswer = (entry: FaqEntryDb, lang: 'th' | 'en') => {
  if (lang === 'th') return entry.answer_th || entry.answer_en || null;
  return entry.answer_en || entry.answer_th || null;
};

const buildFaqStore = (entries: FaqEntryDb[]) => {
  const store = new LocalVectorStore();
  entries.forEach((entry) => {
    const content = [
      entry.question_th,
      entry.question_en,
      ...(entry.keywords || [])
    ]
      .filter(Boolean)
      .join(' ');
    if (content) {
      store.addDocument(entry.id, content, { scope: entry.scope, lang: entry.lang });
    }
  });
  return store;
};

const matchesByKeywords = (text: string, entry: FaqEntryDb) => {
  if (entry.exclude && entry.exclude.some((term) => includesKeyword(text, term))) return 0;
  const keywords = [
    ...(entry.keywords || []),
    entry.question_th || '',
    entry.question_en || ''
  ].filter(Boolean);
  let score = 0;
  for (const keyword of keywords) {
    if (includesKeyword(text, keyword)) {
      score += keyword.includes(' ') ? 2 : 1;
    }
  }
  return score;
};

const findKeywordMatch = (
  text: string,
  entries: FaqEntryDb[],
  options?: FaqMatchOptions
) => {
  let best: { entry: FaqEntryDb; weight: number } | null = null;
  const hasPetContext = Boolean(options?.hasPetContext);
  for (const entry of entries) {
    if (shouldSkipScope(entry, hasPetContext)) continue;
    if (!pickAnswer(entry, 'en') && !pickAnswer(entry, 'th')) continue;
    const score = matchesByKeywords(text, entry);
    if (score <= 0) continue;
    const priority = entry.priority || 0;
    const weight = score * 10 + priority;
    if (!best || weight > best.weight) {
      best = { entry, weight };
    }
  }
  return best?.entry || null;
};

const ensureFaqCache = async (): Promise<FaqCache | null> => {
  if (!ENABLE_FAQ_DB) return null;
  const now = Date.now();
  if (faqCache && now - faqCache.loadedAt < FAQ_CACHE_TTL_MS) return faqCache;
  if (inflight) {
    const entries = await inflight;
    return entries.length ? faqCache : null;
  }
  inflight = (async () => {
    try {
      const { data, error } = await supabase
        .from('ai_faq_entries')
        .select(
          'id, scope, keywords, exclude, question_th, question_en, answer_th, answer_en, priority, lang, category'
        )
        .eq('status', 'approved')
        .eq('is_active', true)
        .order('priority', { ascending: false })
        .limit(FAQ_MAX_ENTRIES);

      if (error || !data) {
        console.debug('ai_faq_entries select failed', error);
        return [];
      }

      const entryMap = new Map<string, FaqEntryDb>();
      data.forEach((entry) => entryMap.set(entry.id, entry));
      faqCache = {
        entries: data,
        entryMap,
        store: buildFaqStore(data),
        loadedAt: Date.now()
      };
      return data;
    } catch (error) {
      console.debug('ai_faq_entries select failed', error);
      return [];
    } finally {
      inflight = null;
    }
  })();
  const entries = await inflight;
  return entries.length ? faqCache : null;
};

export const getDbFaqAnswer = async (
  query: string,
  lang: 'th' | 'en',
  options?: FaqMatchOptions
): Promise<string | null> => {
  const text = cleanText(query);
  if (!text) return null;
  const cache = await ensureFaqCache();
  if (!cache) return null;

  const keywordEntry = findKeywordMatch(text, cache.entries, options);
  if (keywordEntry) {
    return pickAnswer(keywordEntry, lang);
  }

  const hasPetContext = Boolean(options?.hasPetContext);
  const matches = cache.store.search(text, 5);
  for (const match of matches) {
    if (match.score < FAQ_MIN_SCORE) continue;
    const entry = cache.entryMap.get(match.id);
    if (!entry) continue;
    if (shouldSkipScope(entry, hasPetContext)) continue;
    const answer = pickAnswer(entry, lang);
    if (answer) return answer;
  }

  return null;
};

export const captureFaqDraft = async (payload: {
  query: string;
  answer: string;
  lang: 'th' | 'en';
  scope?: 'any' | 'global' | 'pet';
  source?: string;
  sourceQueryId?: string | null;
  category?: string | null;
  keywords?: string[];
  forceStatus?: 'draft' | 'approved' | 'archived';
}) => {
  if (!ENABLE_FAQ_DB) return;
  if (FAQ_CAPTURE_MODE === 'off') return;
  const question = payload.query.normalize('NFKC').trim();
  if (question.length < 6 || question.length > 240) return;

  const normalized = cleanText(question);
  if (faqCache?.entries.some((entry) => {
    const existing = entry.question_th || entry.question_en || '';
    return cleanText(existing) === normalized;
  })) {
    return;
  }

  const keywords = payload.keywords && payload.keywords.length > 0
    ? payload.keywords
    : Array.from(new Set(tokenize(question))).slice(0, FAQ_CAPTURE_KEYWORDS_LIMIT);

  const status = payload.forceStatus || (FAQ_CAPTURE_MODE === 'approved' ? 'approved' : 'draft');
  const insertPayload = {
    status,
    is_active: true,
    scope: payload.scope || 'any',
    category: payload.category || null,
    question_th: payload.lang === 'th' ? question : null,
    question_en: payload.lang === 'en' ? question : null,
    answer_th: payload.lang === 'th' ? payload.answer : null,
    answer_en: payload.lang === 'en' ? payload.answer : null,
    keywords,
    source: payload.source || 'llm',
    source_query_id: payload.sourceQueryId || null,
    source_query: question
  };

  try {
    const { error } = await supabase.from('ai_faq_entries').insert(insertPayload);
    if (error) {
      console.debug('ai_faq_entries insert failed', error);
    } else if (status === 'approved') {
      faqCache = null;
    }
  } catch (error) {
    console.debug('ai_faq_entries insert failed', error);
  }
};
