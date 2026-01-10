/**
 * AI Chat Integration Layer
 * 
 * "Innovation distinguishes between a leader and a follower."
 * - Steve Jobs
 * 
 * This layer integrates the new Petdegree Brain with the existing AIChatOverlay.
 * It provides a unified interface that tries local AI first, then falls back to LLM.
 */

import { think, BrainResponse, BrainContext } from './petdegreeBrain';
import { predictSuggestions, getQuickChatSuggestions, Suggestion } from './predictiveSuggestions';
import { initializePetVectorStore, getVectorStore } from './localVectorStore';
import { Pet } from '@/lib/database';

// =============================================================================
// TYPES
// =============================================================================

export interface ChatMessage {
    id: string;
    sender: 'user' | 'ai';
    text: string;
    type?: 'text' | 'pet_list' | 'suggestion_list' | 'breeding_analysis';
    data?: any;
    intent?: string;
    actions?: Array<{
        type: 'navigate' | 'show_pet' | 'show_pedigree' | 'open_modal' | 'copy' | 'link' | 'event' | 'chat';
        label: string;
        value: string;
        primary?: boolean;
    }>;
    suggestions?: string[];
    source?: 'brain' | 'llm' | 'cache';
}

export interface ChatContext {
    currentPet?: Pet;
    conversationHistory: ChatMessage[];
    userProfile?: any;
    pageContext?: string;
}

// =============================================================================
// CACHE
// =============================================================================

const responseCache = new Map<string, { response: ChatMessage; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCacheKey(query: string, petId?: string): string {
    return `${query.toLowerCase().trim()}_${petId || 'global'}`;
}

function getCachedResponse(query: string, petId?: string): ChatMessage | null {
    const key = getCacheKey(query, petId);
    const cached = responseCache.get(key);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return { ...cached.response, source: 'cache' };
    }

    // Clean up expired
    if (cached) {
        responseCache.delete(key);
    }

    return null;
}

function setCachedResponse(query: string, response: ChatMessage, petId?: string): void {
    const key = getCacheKey(query, petId);
    responseCache.set(key, { response, timestamp: Date.now() });

    // Limit cache size
    if (responseCache.size > 100) {
        const firstKey = responseCache.keys().next().value;
        if (firstKey) responseCache.delete(firstKey);
    }
}

// =============================================================================
// INITIALIZATION
// =============================================================================

let isInitialized = false;

/**
 * Initialize the AI system
 */
export async function initializeAISystem(): Promise<void> {
    if (isInitialized) return;

    try {
        // Initialize vector store with pet data
        await initializePetVectorStore();

        // Initialize pet name cache for smart entity matching
        const { refreshPetNameCache } = await import('./petNameMatcher');
        await refreshPetNameCache();

        isInitialized = true;
        console.log('[AI System] Initialized successfully');
    } catch (error) {
        console.error('[AI System] Initialization error:', error);
    }
}

// =============================================================================
// MAIN INTEGRATION FUNCTION
// =============================================================================

/**
 * Process a chat message using the integrated AI system
 * 
 * Flow:
 * 1. Check cache
 * 2. Try Petdegree Brain (local, fast)
 * 3. If confidence is low, try LLM fallback
 * 4. Return response with suggestions
 */
export async function processWithBrain(
    query: string,
    context: ChatContext
): Promise<ChatMessage> {
    // Ensure system is initialized
    if (!isInitialized) {
        await initializeAISystem();
    }

    // 1. Check cache first
    const cached = getCachedResponse(query, context.currentPet?.id);
    if (cached) {
        console.log('[AI] Cache hit');
        return cached;
    }

    // 2. Prepare brain context
    const brainContext: Partial<BrainContext> = {
        currentPet: context.currentPet,
        conversationHistory: context.conversationHistory.map(m => ({
            role: m.sender === 'user' ? 'user' : 'ai',
            text: m.text
        })),
        userProfile: context.userProfile,
        pageContext: context.pageContext as any
    };

    // 3. Think with Petdegree Brain
    const brainResponse = await think(query, brainContext);

    // 4. Convert to ChatMessage
    const chatMessage = convertBrainResponse(brainResponse, query);

    // 5. Add quick suggestions
    const lang = /[\u0E01-\u0E59]/.test(query) ? 'th' : 'en';
    chatMessage.suggestions = getQuickChatSuggestions(context.currentPet, lang);

    // 6. Cache the response (if it's a good match)
    if (brainResponse.confidence > 0.7) {
        setCachedResponse(query, chatMessage, context.currentPet?.id);
    }

    return chatMessage;
}

/**
 * Convert BrainResponse to ChatMessage format
 */
function convertBrainResponse(response: BrainResponse, query: string): ChatMessage {
    const actions = response.actions?.map(a => ({
        type: a.type as any,
        label: a.label,
        value: a.value,
        primary: a.primary
    }));

    // Determine message type based on response
    let type: ChatMessage['type'] = 'text';
    let data = response.data;

    if (response.data) {
        if (Array.isArray(response.data)) {
            // Already an array (multiple pets)
            type = 'pet_list';
        } else if (response.data.id && response.intent === 'search_pet') {
            // Single pet object - wrap in array for consistent UI display
            type = 'pet_list';
            data = [response.data];
        }
    }

    return {
        id: Date.now().toString(),
        sender: 'ai',
        text: response.text,
        type,
        data,
        intent: response.intent,
        actions,
        source: response.source === 'llm' ? 'llm' : 'brain'
    };
}

// =============================================================================
// PREDICTIVE SUGGESTIONS
// =============================================================================

/**
 * Get smart suggestions based on current context
 */
export function getSmartSuggestions(context: {
    currentPet?: Pet;
    userProfile?: any;
    pageContext?: string;
    ownedPets?: any[];
}): Suggestion[] {
    return predictSuggestions({
        currentPet: context.currentPet,
        userProfile: context.userProfile,
        pageContext: context.pageContext,
        ownedPets: context.ownedPets
    });
}

// =============================================================================
// SEMANTIC SEARCH
// =============================================================================

/**
 * Search using vector store
 */
export function semanticSearch(query: string, limit: number = 5) {
    const store = getVectorStore();
    return store.search(query, limit);
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
    think as thinkWithBrain,
    predictSuggestions,
    getQuickChatSuggestions
};
