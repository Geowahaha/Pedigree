export const __gemini_exports_guard = true;
// Client-side AI helpers. IMPORTANT: never put API keys in the browser.
// This module calls the serverless proxy at /api/ai/chat.

export type ChatRole = "user" | "model";

export interface ChatHistoryItem {
    role: ChatRole;
    parts: { text: string }[];
}

export type Lang = "th" | "en";
type AnyObj = Record<string, any>;

const ENABLE_MOCK =
    String(import.meta.env.VITE_ENABLE_AI_MOCK || "").toLowerCase() === "true";

// --------------------
// Lightweight fallback
// --------------------
const getMockResponse = (query: string, lang: Lang): string => {
    const q = (query || "").toLowerCase();
    if (
        q.includes("certificate") ||
        q.includes("pedigree") ||
        q.includes("ใบเพ็ด") ||
        q.includes("ใบรับรอง")
    ) {
        return lang === "th"
            ? "ตอนนี้ระบบ AI ติดต่อไม่ได้ชั่วคราวครับ แต่ผมช่วยไกด์ได้: บอกชื่อสัตว์/เลขทะเบียน/ไมโครชิป แล้วผมจะค้นหาเอกสารให้ได้ทันทีเมื่อออนไลน์"
            : "AI is temporarily unavailable. Share pet name / registration / microchip and I’ll help locate certificates when online.";
    }
    if (
        q.includes("breed") ||
        q.includes("breeding") ||
        q.includes("ผสม") ||
        q.includes("เลือดชิด") ||
        q.includes("coi")
    ) {
        return lang === "th"
            ? "ตอนนี้ระบบ AI ติดต่อไม่ได้ชั่วคราวครับ แต่หลักการเบื้องต้นคือ: ตรวจสุขภาพ+ยีน, เช็คสายเลือด/เลือดชิด, ตั้งเป้าหมายชัด แล้วค่อยเลือกคู่ผสม"
            : "AI is temporarily unavailable. Basics: health/genetic tests, check pedigree/inbreeding, set breeding goal, then pick a match.";
    }
    return lang === "th"
        ? "ตอนนี้ระบบ AI ติดต่อไม่ได้ชั่วคราวครับ ลองใหม่อีกครั้ง หรือพิมพ์ข้อมูลเพิ่ม (ชื่อ/เลขทะเบียน/สายพันธุ์) แล้วผมจะช่วยต่อได้"
        : "AI is temporarily unavailable. Try again or provide more details (name/reg/breed) and I’ll help.";
};

// --------------------
// Data normalization
// --------------------
const pick = <T>(...vals: T[]) => vals.find((v) => v !== undefined && v !== null);

export const sanitizePet = (pet: any) => {
    if (!pet) return null;

    const birth_date = pick(pet.birth_date, pet.birthDate, pet.birthday, pet.birth_day, null);
    const registration_number = pick(
        pet.registration_number,
        pet.registrationNumber,
        pet.reg_no,
        pet.regNo,
        null
    );
    const owner_name =
        pet.owner && typeof pet.owner === "object"
            ? pick(pet.owner.full_name, pet.owner.name, null)
            : pick(pet.owner_name, pet.owner, null);

    return {
        name: pet.name,
        type: pet.type,
        breed: pet.breed,
        color: pet.color,
        gender: pet.gender,
        location: pet.location,
        price: pet.price,
        for_sale: pick(pet.for_sale, pet.forSale, pet.available, null),
        birth_date,
        registration_number,
        owner_name,

        // minimal doc hint
        documents: Array.isArray(pet.documents)
            ? pet.documents.map((d: any) => ({
                title: d?.title,
                document_type: d?.document_type ?? d?.type,
                file_url: d?.file_url ?? d?.url,
            }))
            : undefined,
    };
};

// --------------------
// Serverless call
// --------------------
async function callServerlessChat(payload: {
    prompt: string;
    history?: ChatHistoryItem[];
    model?: string;
    temperature?: number;
    maxOutputTokens?: number;
}) {
    if (ENABLE_MOCK) {
        const preview = payload.prompt.slice(0, 800);
        return `⚠️ [MOCK MODE ENABLED]\n\n${preview}${payload.prompt.length > 800 ? "\n..." : ""}`;
    }

    const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            prompt: payload.prompt,
            history: payload.history || [],
            model: payload.model || "gemini-2.0-flash",
            temperature: typeof payload.temperature === "number" ? payload.temperature : 0.35,
            maxOutputTokens: typeof payload.maxOutputTokens === "number" ? payload.maxOutputTokens : 900,
        }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const msg = errorData?.error ? String(errorData.error) : `AI Error (HTTP ${response.status})`;
        throw new Error(msg);
    }

    const data = await response.json().catch(() => ({}));
    return String(data.text ?? "");
}

// --------------------
// Prompt builders
// --------------------
function buildPetPrompt(args: { lang: Lang; message: string; safeContext: AnyObj }) {
    const { lang, message, safeContext } = args;

    const systemTH = `
คุณคือ "PetDegree AI" ผู้ช่วยบรีดเดอร์ระดับโปร (ฉลาด วิเคราะห์เป็นระบบ)
กติกา:
- ใช้ข้อมูล APP DATA เป็นความจริง (ห้ามเดาข้อมูลทะเบียน/ผลตรวจ/เอกสารถ้าไม่มี)
- ห้ามแสดง UUID/ID ภายในระบบ เว้นแต่ผู้ใช้ถามตรงๆ
- ห้ามตอบเป็น JSON ตรงๆ ให้สรุปเป็นภาษาคนอ่านง่าย
- ถ้าข้อมูลไม่พอ: บอกว่า "ขาดอะไร" และถามคำถามสั้นๆ เพื่อขอข้อมูลที่ต้องใช้
- ถ้ามีรายการสัตว์หลายตัวที่ชื่อคล้ายกัน: ให้เสนอ "ตัวเลือก" แบบสั้น (ชื่อ | เลขทะเบียน | เจ้าของ) แล้วขอให้ผู้ใช้ตอบกลับด้วยเลขทะเบียน
- ถ้าถามเรื่องผสมพันธุ์: ตอบเป็นหัวข้อ
  1) เป้าหมาย
  2) ข้อจำกัด (อายุ สุขภาพ ยีน เอกสาร)
  3) ความเสี่ยง (เลือดชิด/โรค)
  4) แผนจับคู่ที่เหมาะ + เหตุผล
  5) Next actions ที่ต้องทำในระบบ
- ถ้าถามเรื่อง certificate/ใบเพ็ด: ระบุว่า "มีเอกสารอะไรใน documents" และแนะนำขั้นตอนเปิด/ขอเอกสาร
`.trim();

    const systemEN = `
You are "PetDegree AI", an elite breeder assistant with structured reasoning.
Rules:
- Treat APP DATA as ground truth. Never invent certificates/health results/registration numbers.
- Do not output internal IDs/UUIDs unless the user explicitly asks.
- Do not dump raw JSON; summarize clearly in plain text.
- If data is missing: state what's missing and ask short follow-up questions.
- If multiple similar pets exist: show a compact pick-list (name | reg | owner) and ask the user to reply with registration number.
- For breeding questions, structure:
  1) Goal
  2) Constraints
  3) Risks (inbreeding/health)
  4) Recommended pairing strategy + reasons
  5) Next actions inside the app
- For certificate/pedigree: list available docs from documents and guide next steps.
`.trim();

    return `
${lang === "th" ? systemTH : systemEN}

APP DATA (JSON):
${JSON.stringify(safeContext, null, 2)}

USER QUESTION:
${message}
`.trim();
}

function buildGlobalPrompt(args: {
    lang: Lang;
    message: string;
    safeSearchResults: AnyObj[];
    market?: AnyObj;
}) {
    const { lang, message, safeSearchResults, market } = args;

    const hasMatches = safeSearchResults.length > 0;
    const manyMatches = safeSearchResults.length > 1;

    const systemTH = `
คุณคือ "PetDegree Advisor" ผู้ช่วยอัจฉริยะของแพลตฟอร์ม PetDegree
งานของคุณ:
- ถ้า DATABASE_MATCHES มีหลายตัว: ให้สรุปตัวเลือกแบบสั้น (ชื่อ | เลขทะเบียน | เจ้าของ) แล้วขอให้ผู้ใช้ตอบกลับด้วยเลขทะเบียน (ไม่ต้องให้ผู้ใช้ยืนยันประโยคยาวๆ)
- ห้ามแสดง UUID/ID ภายในระบบ เว้นแต่ผู้ใช้ถามตรงๆ
- ห้ามตอบเป็น JSON ตรงๆ ให้สรุปเป็นภาษาคนอ่านง่าย
- ถ้า DATABASE_MATCHES ว่าง: ตอบได้ด้วยความรู้ทั่วไป/คำแนะนำได้ (แต่ห้ามอ้างว่าเป็นข้อมูลใน DB)
- ถ้า MARKET_DATA มีอยู่ และคำถามเกี่ยวกับ "ราคา/แนวโน้มตลาด": ให้ตอบแบบนักวิเคราะห์ตลาด (สรุปราคาเฉลี่ย/ช่วงราคา/แนวโน้ม) จาก MARKET_DATA โดยตรง
ห้ามพูดว่า "ไม่มีข้อมูลราคา" ถ้ามี MARKET_DATA ให้ใช้มัน
`.trim();

    const systemEN = `
You are "PetDegree Advisor" for the PetDegree platform.
Tasks:
- If DATABASE_MATCHES has multiple pets: present a compact pick-list (name | reg | owner) and ask the user to reply with registration number (no long confirmations).
- Do not output internal IDs/UUIDs unless the user explicitly asks.
- Do not dump raw JSON; summarize clearly in plain text.
- If DATABASE_MATCHES is empty: you may answer with general knowledge/advice (but do not claim DB facts).
- If MARKET_DATA exists and the question is about prices/market trends: answer as a market analyst using MARKET_DATA (avg/range/recent listings).
Never say "no price info" when MARKET_DATA is provided.
`.trim();

    const guidance = manyMatches
        ? lang === "th"
            ? `หมายเหตุ: พบหลายรายการที่เกี่ยวข้อง กรุณาเลือก 1 รายการโดยตอบกลับด้วย "เลขทะเบียน".`
            : `Note: Multiple matches found. Reply with the registration number to pick one.`
        : "";

    return `
${lang === "th" ? systemTH : systemEN}

USER_MESSAGE: "${message}"

DATABASE_MATCHES_JSON: ${hasMatches ? JSON.stringify(safeSearchResults) : "[]"}

MARKET_DATA_JSON: ${market ? JSON.stringify(market) : "null"}

${guidance}
`.trim();
}

// --------------------
// Public APIs
// --------------------
export async function askPetDegreeAI(
    context: {
        pet: any;
        offspring: any[];
        parents: any;
        owner: any;
        documents: any[];
        searchResults?: any[];
        market?: any;
    },
    history: { role: "user" | "model"; parts: string }[] | ChatHistoryItem[] = [],
    message: string
) {
    try {
        const lang: Lang = /[\u0E01-\u0E59]/.test(message) ? "th" : "en";

        const safeContext = {
            pet: sanitizePet(context.pet),
            parents: {
                father: sanitizePet(context.parents?.father),
                mother: sanitizePet(context.parents?.mother),
            },
            offspringCount: Array.isArray(context.offspring) ? context.offspring.length : 0,
            offspringSample: Array.isArray(context.offspring)
                ? context.offspring.slice(0, 6).map((p: any) => sanitizePet(p))
                : [],
            owner: context.owner
                ? {
                    name: pick(context.owner.full_name, context.owner.name, null),
                    phone: context.owner.phone ?? null,
                    facebook: context.owner.facebook ?? null,
                    line_id: context.owner.line_id ?? null,
                }
                : null,
            documents: Array.isArray(context.documents)
                ? context.documents.slice(0, 12).map((d: any) => ({
                    title: d?.title,
                    document_type: d?.document_type ?? d?.type,
                    file_url: d?.file_url ?? d?.url,
                }))
                : [],
            market: context.market ?? null,
            searchResults: Array.isArray(context.searchResults)
                ? context.searchResults.slice(0, 10).map((p: any) => sanitizePet(p))
                : [],
        };

        const prompt = buildPetPrompt({ lang, message, safeContext });

        const safeHistory: ChatHistoryItem[] = Array.isArray(history)
            ? (history as any[]).slice(-20).map((h: any) => {
                if (h?.parts && Array.isArray(h.parts) && typeof h.parts[0]?.text === "string") return h;
                if (typeof h?.parts === "string") {
                    return { role: h.role === "model" ? "model" : "user", parts: [{ text: String(h.parts) }] };
                }
                return { role: h?.role === "model" ? "model" : "user", parts: [{ text: String(h?.message ?? "") }] };
            })
            : [];

        return await callServerlessChat({
            prompt,
            history: safeHistory,
            model: "gemini-2.0-flash",
            temperature: 0.35,
            maxOutputTokens: 900,
        });
    } catch (error) {
        const lang: Lang = /[\u0E01-\u0E59]/.test(message) ? "th" : "en";
        console.warn("askPetDegreeAI failed:", error);
        return getMockResponse(message, lang);
    }
}

export async function askGlobalAdvisor(
    message: string,
    context?: { searchResults?: any[]; lang?: Lang; market?: any }
) {
    const lang: Lang = context?.lang || (/[\u0E01-\u0E59]/.test(message) ? "th" : "en");

    try {
        const safeSearchResults = (context?.searchResults || [])
            .slice(0, 10)
            .map((p) => sanitizePet(p))
            .filter(Boolean);

        const prompt = buildGlobalPrompt({
            lang,
            message,
            safeSearchResults,
            market: context?.market ?? null,
        });

        return await callServerlessChat({
            prompt,
            model: "gemini-2.0-flash",
            temperature: 0.35,
            maxOutputTokens: 800,
        });
    } catch (error) {
        console.warn("askGlobalAdvisor failed:", error);
        return getMockResponse(message, lang);
    }
}

export async function generateEmbedding(text: string): Promise<number[] | null> {
    if (ENABLE_MOCK) return Array(768).fill(0.1);

    try {
        const response = await fetch('/api/ai/embedding', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });

        if (!response.ok) return null;
        const data = await response.json();
        return data.embedding || null;
    } catch (error) {
        console.error("Error generating embedding:", error);
        return null;
    }
}
