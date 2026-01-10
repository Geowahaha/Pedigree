/**
 * Local Vector Store - Petdegree AI
 * 
 * "The way to get started is to quit talking and begin doing."
 * - Steve Jobs (well, actually Walt Disney, but Steve would approve)
 * 
 * This is a lightweight vector store for semantic search without external APIs.
 * Uses TF-IDF for now, can be upgraded to proper embeddings later.
 */

// =============================================================================
// TYPES
// =============================================================================

export interface VectorDocument {
    id: string;
    content: string;
    vector: number[];
    metadata: Record<string, any>;
    timestamp: number;
}

export interface SearchResult {
    id: string;
    score: number;
    content: string;
    metadata: Record<string, any>;
}

// =============================================================================
// TEXT PROCESSING
// =============================================================================

// Thai word segmentation (simplified)
const THAI_COMMON_PARTICLES = [
    'ของ', 'ที่', 'ใน', 'และ', 'หรือ', 'จะ', 'ได้', 'มี', 'ให้', 'กับ',
    'เป็น', 'จาก', 'แต่', 'ถ้า', 'เมื่อ', 'คือ', 'โดย', 'ซึ่ง', 'ก็', 'นี้'
];

const ENGLISH_STOPWORDS = [
    'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
    'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
    'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these',
    'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what', 'which',
    'who', 'when', 'where', 'why', 'how', 'all', 'each', 'every', 'both',
    'few', 'more', 'most', 'other', 'some', 'such', 'no', 'not', 'only'
];

/**
 * Tokenize text into words
 */
export function tokenize(text: string): string[] {
    const normalized = text.normalize('NFKC').toLowerCase();

    // Split by whitespace and common delimiters
    let tokens = normalized.split(/[\s\-_.,;:!?()[\]{}'"]+/).filter(Boolean);

    // For Thai, also split by common particles
    const expandedTokens: string[] = [];
    for (const token of tokens) {
        if (/[\u0E01-\u0E59]/.test(token)) {
            // Simple Thai segmentation - split around common particles
            let remaining = token;
            for (const particle of THAI_COMMON_PARTICLES) {
                if (remaining.includes(particle) && remaining.length > particle.length) {
                    const parts = remaining.split(particle).filter(Boolean);
                    expandedTokens.push(...parts);
                    remaining = '';
                    break;
                }
            }
            if (remaining) {
                expandedTokens.push(remaining);
            }
        } else {
            expandedTokens.push(token);
        }
    }

    // Remove stopwords
    return expandedTokens.filter(token =>
        token.length > 1 &&
        !ENGLISH_STOPWORDS.includes(token) &&
        !THAI_COMMON_PARTICLES.includes(token)
    );
}

/**
 * Calculate term frequency
 */
export function termFrequency(tokens: string[]): Record<string, number> {
    const freq: Record<string, number> = {};
    for (const token of tokens) {
        freq[token] = (freq[token] || 0) + 1;
    }
    // Normalize by document length
    const maxFreq = Math.max(...Object.values(freq));
    for (const token of Object.keys(freq)) {
        freq[token] = freq[token] / maxFreq;
    }
    return freq;
}

// =============================================================================
// VECTOR STORE
// =============================================================================

export class LocalVectorStore {
    private documents: Map<string, VectorDocument> = new Map();
    private vocabulary: Set<string> = new Set();
    private idfCache: Map<string, number> = new Map();

    constructor() { }

    /**
     * Add document to the store
     */
    addDocument(id: string, content: string, metadata: Record<string, any> = {}): void {
        const tokens = tokenize(content);

        // Update vocabulary
        for (const token of tokens) {
            this.vocabulary.add(token);
        }

        // Calculate TF vector
        const tf = termFrequency(tokens);
        const vector = this.toVector(tf);

        this.documents.set(id, {
            id,
            content,
            vector,
            metadata,
            timestamp: Date.now()
        });

        // Invalidate IDF cache
        this.idfCache.clear();
    }

    /**
     * Add multiple documents
     */
    addDocuments(docs: Array<{ id: string; content: string; metadata?: Record<string, any> }>): void {
        for (const doc of docs) {
            this.addDocument(doc.id, doc.content, doc.metadata || {});
        }
    }

    /**
     * Remove document from store
     */
    removeDocument(id: string): boolean {
        const deleted = this.documents.delete(id);
        if (deleted) {
            this.idfCache.clear();
        }
        return deleted;
    }

    /**
     * Search for similar documents
     */
    search(query: string, topK: number = 5): SearchResult[] {
        if (this.documents.size === 0) {
            return [];
        }

        const queryTokens = tokenize(query);
        const queryTf = termFrequency(queryTokens);
        const queryVector = this.toVector(queryTf);

        // Calculate similarity with all documents
        const results: SearchResult[] = [];

        for (const [id, doc] of this.documents) {
            const score = this.cosineSimilarity(queryVector, doc.vector);
            if (score > 0) {
                results.push({
                    id,
                    score,
                    content: doc.content,
                    metadata: doc.metadata
                });
            }
        }

        // Sort by score and return top K
        return results
            .sort((a, b) => b.score - a.score)
            .slice(0, topK);
    }

    /**
     * Get document by ID
     */
    getDocument(id: string): VectorDocument | undefined {
        return this.documents.get(id);
    }

    /**
     * Get all documents
     */
    getAllDocuments(): VectorDocument[] {
        return Array.from(this.documents.values());
    }

    /**
     * Clear all documents
     */
    clear(): void {
        this.documents.clear();
        this.vocabulary.clear();
        this.idfCache.clear();
    }

    /**
     * Get store size
     */
    get size(): number {
        return this.documents.size;
    }

    // =========================================================================
    // PRIVATE METHODS
    // =========================================================================

    /**
     * Convert TF to vector in vocabulary space
     */
    private toVector(tf: Record<string, number>): number[] {
        const vocabArray = Array.from(this.vocabulary);
        return vocabArray.map(term => {
            const termFreq = tf[term] || 0;
            const idf = this.getIDF(term);
            return termFreq * idf; // TF-IDF
        });
    }

    /**
     * Calculate Inverse Document Frequency
     */
    private getIDF(term: string): number {
        if (this.idfCache.has(term)) {
            return this.idfCache.get(term)!;
        }

        let docCount = 0;
        for (const doc of this.documents.values()) {
            if (doc.content.toLowerCase().includes(term)) {
                docCount++;
            }
        }

        const idf = docCount > 0
            ? Math.log(this.documents.size / docCount) + 1
            : 0;

        this.idfCache.set(term, idf);
        return idf;
    }

    /**
     * Calculate cosine similarity between two vectors
     */
    private cosineSimilarity(a: number[], b: number[]): number {
        if (a.length !== b.length) {
            // Pad shorter vector with zeros
            const maxLen = Math.max(a.length, b.length);
            while (a.length < maxLen) a.push(0);
            while (b.length < maxLen) b.push(0);
        }

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }

        if (normA === 0 || normB === 0) return 0;

        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    /**
     * Serialize store to JSON
     */
    toJSON(): string {
        return JSON.stringify({
            documents: Array.from(this.documents.entries()),
            vocabulary: Array.from(this.vocabulary)
        });
    }

    /**
     * Load from JSON
     */
    static fromJSON(json: string): LocalVectorStore {
        const data = JSON.parse(json);
        const store = new LocalVectorStore();

        store.vocabulary = new Set(data.vocabulary);
        for (const [id, doc] of data.documents) {
            store.documents.set(id, doc);
        }

        return store;
    }
}

// =============================================================================
// GLOBAL INSTANCE
// =============================================================================

let globalStore: LocalVectorStore | null = null;

/**
 * Get or create the global vector store
 */
export function getVectorStore(): LocalVectorStore {
    if (!globalStore) {
        globalStore = new LocalVectorStore();
    }
    return globalStore;
}

/**
 * Initialize store with pet data
 */
export async function initializePetVectorStore(): Promise<LocalVectorStore> {
    const store = getVectorStore();

    // Don't re-initialize if we already have documents
    if (store.size > 0) {
        return store;
    }

    try {
        // Import supabase dynamically to avoid circular deps
        const { supabase } = await import('@/lib/supabase');

        // Fetch pets for indexing
        const { data: pets } = await supabase
            .from('pets')
            .select('id, name, breed, color, location, gender, registration_number')
            .limit(500);

        if (pets && pets.length > 0) {
            const docs = pets.map((pet: any) => ({
                id: pet.id,
                content: [
                    pet.name,
                    pet.breed,
                    pet.color,
                    pet.location,
                    pet.gender,
                    pet.registration_number
                ].filter(Boolean).join(' '),
                metadata: {
                    name: pet.name,
                    breed: pet.breed,
                    type: 'pet'
                }
            }));

            store.addDocuments(docs);
            console.log(`[VectorStore] Indexed ${docs.length} pets`);
        }

        // Add knowledge base entries
        const knowledgeEntries = [
            { id: 'kb-gestation-dog', content: 'dog pregnancy gestation period 63 days สุนัขตั้งท้อง ตั้งครรภ์ หมาท้อง', metadata: { type: 'knowledge' } },
            { id: 'kb-gestation-cat', content: 'cat pregnancy gestation period 65 days แมวตั้งท้อง ตั้งครรภ์ แมวท้อง', metadata: { type: 'knowledge' } },
            { id: 'kb-inbreeding', content: 'inbreeding COI coefficient lineage เลือดชิด ผสมชิด สายเลือด การผสมพันธุ์', metadata: { type: 'knowledge' } },
            { id: 'kb-ridgeback', content: 'thai ridgeback dog breed หมาไทยหลังอาน สายพันธุ์ไทย ridge หลังขน', metadata: { type: 'knowledge' } },
            { id: 'kb-registration', content: 'register registration pet pedigree จดทะเบียน ลงทะเบียน ขึ้นทะเบียน สัตว์เลี้ยง', metadata: { type: 'knowledge' } }
        ];

        store.addDocuments(knowledgeEntries);

    } catch (error) {
        console.error('[VectorStore] Initialization error:', error);
    }

    return store;
}

// Export for testing
export const __vectorStoreTestExports = {
    tokenize,
    termFrequency
};
