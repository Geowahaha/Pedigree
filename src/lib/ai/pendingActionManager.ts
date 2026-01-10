/**
 * Pending Action Manager
 * 
 * Manages pending actions that await user confirmation.
 * When AI suggests an action (e.g., "Want to view Vet Profile?"),
 * this module stores it and waits for user confirmation.
 */

// =============================================================================
// TYPES
// =============================================================================

export interface PendingAction {
    type: 'link' | 'event' | 'copy';
    value: string;
    label: string;
    petId?: string;
    petName?: string;
    topic?: string;
    timestamp: number;
}

// =============================================================================
// CONFIRMATION PATTERNS
// =============================================================================

const YES_PATTERNS = [
    // English
    /^(yes|yeah|yep|yup|sure|ok|okay|alright|go|show|open|view|please|let'?s go|do it)$/i,
    /^(y|ye|yea|yas)$/i,
    // Thai
    /^(ใช่|ครับ|ค่ะ|ได้|โอเค|โอ|ดี|ตกลง|เอา|เปิด|ดู|แสดง|ขอ|เลย|ได้เลย|ไปเลย|อยาก|ต้องการ)$/i,
    // Short confirmations
    /^(1|ok|ок)$/i
];

const NO_PATTERNS = [
    // English
    /^(no|nope|nah|not now|later|cancel|skip|never mind|not? ?really)$/i,
    /^(n|naw)$/i,
    // Thai
    /^(ไม่|ไม่ใช่|ไม่เอา|ไม่ต้อง|เดี๋ยวก่อน|ยกเลิก|ข้าม|ไม่อยาก|ไม่ครับ|ไม่ค่ะ|ไม่ดี)$/i,
    // Short rejections
    /^(0)$/i
];

// =============================================================================
// STATE
// =============================================================================

let pendingAction: PendingAction | null = null;
const PENDING_TTL_MS = 60 * 1000; // 1 minute timeout

// =============================================================================
// FUNCTIONS
// =============================================================================

/**
 * Set a pending action awaiting confirmation
 */
export function setPendingAction(action: Omit<PendingAction, 'timestamp'>): void {
    pendingAction = {
        ...action,
        timestamp: Date.now()
    };
    console.log(`[PendingAction] Set: ${action.type} → ${action.value}`);
}

/**
 * Check if there's a valid pending action
 */
export function hasPendingAction(): boolean {
    if (!pendingAction) return false;

    // Check if expired
    if (Date.now() - pendingAction.timestamp > PENDING_TTL_MS) {
        console.log('[PendingAction] Expired, clearing');
        pendingAction = null;
        return false;
    }

    return true;
}

/**
 * Get the current pending action
 */
export function getPendingAction(): PendingAction | null {
    if (!hasPendingAction()) return null;
    return pendingAction;
}

/**
 * Clear pending action
 */
export function clearPendingAction(): void {
    pendingAction = null;
}

/**
 * Check if query is a confirmation (YES)
 */
export function isConfirmation(query: string): boolean {
    const cleaned = query.normalize('NFKC').trim();
    const cleanedLower = cleaned.toLowerCase();

    // Check English patterns (case-insensitive)
    const englishYes = ['yes', 'yeah', 'yep', 'yup', 'sure', 'ok', 'okay', 'alright', 'go', 'show', 'open', 'view', 'please', 'y', 'ye', 'yea', '1'];
    if (englishYes.includes(cleanedLower)) {
        console.log(`[PendingAction] "${cleaned}" matched English YES`);
        return true;
    }

    // Check Thai patterns (exact match or contains)
    const thaiYes = ['ใช่', 'ครับ', 'ค่ะ', 'ได้', 'โอเค', 'โอ', 'ดี', 'ตกลง', 'เอา', 'เปิด', 'ดู', 'แสดง', 'ขอ', 'เลย', 'ได้เลย', 'ไปเลย', 'อยาก', 'ต้องการ'];
    for (const word of thaiYes) {
        if (cleaned === word || cleaned.includes(word)) {
            console.log(`[PendingAction] "${cleaned}" matched Thai YES: "${word}"`);
            return true;
        }
    }

    console.log(`[PendingAction] "${cleaned}" did NOT match any YES pattern`);
    return false;
}

/**
 * Check if query is a rejection (NO)
 */
export function isRejection(query: string): boolean {
    const cleaned = query.normalize('NFKC').trim();
    const cleanedLower = cleaned.toLowerCase();

    // Check English patterns
    const englishNo = ['no', 'nope', 'nah', 'not now', 'later', 'cancel', 'skip', 'n', '0'];
    if (englishNo.includes(cleanedLower)) {
        console.log(`[PendingAction] "${cleaned}" matched English NO`);
        return true;
    }

    // Check Thai patterns
    const thaiNo = ['ไม่', 'ไม่ใช่', 'ไม่เอา', 'ไม่ต้อง', 'เดี๋ยวก่อน', 'ยกเลิก', 'ข้าม', 'ไม่อยาก', 'ไม่ครับ', 'ไม่ค่ะ', 'ไม่ดี'];
    for (const word of thaiNo) {
        if (cleaned === word || cleaned.includes(word)) {
            console.log(`[PendingAction] "${cleaned}" matched Thai NO: "${word}"`);
            return true;
        }
    }

    return false;
}

/**
 * Process user response to pending action
 * Returns: 
 * - { confirmed: true, action: PendingAction } if confirmed
 * - { confirmed: false } if rejected
 * - null if not a confirmation/rejection response
 */
export function processPendingResponse(query: string): {
    confirmed: boolean;
    action?: PendingAction;
} | null {
    if (!hasPendingAction()) return null;

    if (isConfirmation(query)) {
        console.log('[PendingAction] Confirmed!');
        const action = pendingAction!;
        clearPendingAction();
        return { confirmed: true, action };
    }

    if (isRejection(query)) {
        console.log('[PendingAction] Rejected');
        clearPendingAction();
        return { confirmed: false };
    }

    // Not a yes/no response - clear and continue with normal flow
    console.log('[PendingAction] Not a yes/no response, clearing');
    clearPendingAction();
    return null;
}

// =============================================================================
// EXPORTS
// =============================================================================

export const pendingActionManager = {
    set: setPendingAction,
    has: hasPendingAction,
    get: getPendingAction,
    clear: clearPendingAction,
    isConfirmation,
    isRejection,
    process: processPendingResponse
};

export default pendingActionManager;
