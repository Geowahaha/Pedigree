import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Pet } from '@/data/petData';
import SmartImage from '@/components/ui/SmartImage';
import { searchPets } from '@/lib/database';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { MarketplaceListing } from '../marketplace/MarketplaceFeed';
import { Loader2, Plus, Search, Shuffle, Upload, X } from 'lucide-react';

interface CreateMagicAdModalProps {
    isOpen: boolean;
    onClose: () => void;
    userPets: Pet[];
    onAdGenerated?: (adData: MagicAdResult) => void;
}

type MagicAdProduct = MarketplaceListing & { image_url?: string };
type UrlType = 'audio' | 'product' | 'pet' | 'unknown';
type AudioMode = 'auto' | 'suno' | 'upload' | 'none';
type SuggestionItem =
    | { type: 'pet'; pet: Pet }
    | { type: 'product'; product: MagicAdProduct };
type ReferenceImage = {
    id: string;
    url: string;
    name: string;
    source: 'upload' | 'link';
};
type PromptTemplate = {
    id: string;
    label: string;
    prompt: string;
};

interface MagicAdResult {
    id: string;
    pet: Pet;
    product: MagicAdProduct;
    videoUrl: string;
    prompt: string | null;
    audio: {
        mode: AudioMode;
        sunoLink: string | null;
        fileName: string | null;
    };
    adSpec: {
        format: string;
        duration: string;
        fps: number;
    };
    timestamp: string;
}

const SUNO_AFFILIATE_URL = 'https://suno.com/invite/@vivifyingwhistle723';

const MAX_IDENTITY_IMAGES = 6;
const MAX_SCENE_IMAGES = 4;
const DEFAULT_IMAGE_PROMPT = 'Natural editorial portrait of {subject}, 4:5 vertical, professional photography, sharp focus, realistic fur detail, soft studio lighting, clean background, high resolution.';
const IDENTITY_LOCK_PROMPT = [
    'STRICT IDENTITY LOCK: The animal must be the exact same {subject} as the reference images. Preserve unique markings, fur patterns, eye color, eye shape, muzzle length, ear shape, and proportions.',
    'Do not change the pet identity. No breed change, no redesign, no stylization that alters anatomy.',
    'Prioritize identity consistency over scene or styling references.',
    'Keep the expression natural and true to the reference.'
].join('\n');
const PROMPT_TEMPLATES: PromptTemplate[] = [
    {
        id: 'thai_ridgeback_editorial',
        label: 'Thai Ridgeback Editorial',
        prompt: 'Editorial studio portrait of a Thai Ridgeback, 4:5 vertical, crisp fur detail, softbox key light, clean background, premium magazine cover, ultra realistic.'
    },
    {
        id: 'hero_poster',
        label: 'Hero Poster',
        prompt: 'Hero poster of {subject}, dramatic rim light, rain bokeh, neon city glow, cinematic contrast, 4:5 vertical, ultra detailed.'
    },
    {
        id: 'streetwear_glow',
        label: 'Streetwear Glow Up',
        prompt: 'High-fashion streetwear portrait of {subject}, bold attitude, glossy eyes, textured background, soft rim light, editorial vibe.'
    },
    {
        id: 'cozy_cafe',
        label: 'Cozy Cafe',
        prompt: 'Cozy cafe morning scene with {subject} by a window, warm light, candid moment, gentle film grain, shallow depth of field.'
    },
    {
        id: 'sunset_backlight',
        label: 'Sunset Backlight',
        prompt: 'Golden hour backlit portrait of {subject}, warm rim light, natural bokeh, cinematic sunset atmosphere, 4:5 vertical.'
    },
    {
        id: 'fashion_studio_flash',
        label: 'Fashion Studio Flash',
        prompt: 'High-fashion studio flash portrait of {subject}, crisp shadows, glossy highlights, clean backdrop, editorial magazine look.'
    },
    {
        id: 'sticker_pack',
        label: 'Sticker Pack',
        prompt: 'Sticker pack of {subject}, bold outlines, vibrant colors, clean white background, 6 different poses, playful style.'
    },
    {
        id: 'fantasy_guardian',
        label: 'Fantasy Guardian',
        prompt: '{subject} as an ancient guardian, ornate armor accents, glowing runes, misty ruins, epic cinematic lighting.'
    }
];

const THAI_PROMPT_TEMPLATES: PromptTemplate[] = [
    {
        id: 'thai_tiny_finger',
        label: 'ย่อส่วนบนปลายนิ้ว',
        prompt: 'ภาพมาโครโคลสอัป {subject} ย่อส่วนอยู่บนปลายนิ้วคนจริงๆ สเกลสมจริง ผิวหนังละเอียด แสงธรรมชาติ โฟกัสตื้น'
    },
    {
        id: 'thai_mountain_hike',
        label: 'เดินป่าบนเขา',
        prompt: '{subject} อยู่บนทางเดินป่าบนเขา หมอกบางยามเช้า แสงอาทิตย์ลอดต้นไม้ สีธรรมชาติ สมจริงแบบภาพถ่ายสารคดี'
    },
    {
        id: 'thai_sunset_backlight',
        label: 'ย้อนแสงพระอาทิตย์ตก',
        prompt: 'พอร์ตเทรต {subject} ย้อนแสงพระอาทิตย์ตก แสงทองริมเส้น ขนเปล่งประกาย โบเก้ละลาย โทนอุ่นแบบภาพยนตร์'
    },
    {
        id: 'thai_fashion_flash',
        label: 'สตูดิโอแฟลชแฟชั่น',
        prompt: '{subject} ถ่ายสตูดิโอแฟลชแฟชั่น แสงแฟลชคม เงาคมเป็นรูปทรง ฉากหลังเรียบหรู สไตล์นิตยสารแฟชั่น'
    }
];

const TREND_PROMPT_TEMPLATES: PromptTemplate[] = [
    {
        id: 'thai_street_flash',
        label: 'สตรีทแฟลช',
        prompt: 'แฟลชสตรีทพอร์ตเทรตของ {subject} ฉากถนนกลางคืน พื้นเปียกสะท้อนแสง แฟลชคมชัด รายละเอียดขนชัดมาก'
    },
    {
        id: 'thai_prism_glow',
        label: 'แสงพริซึมว้าว',
        prompt: 'พอร์ตเทรต {subject} แสงพริซึมและเลนส์แฟลร์นุ่มๆ โบเก้ละลาย ฉากหลังใช้ภาพสถานที่อ้างอิงอย่างเป็นธรรมชาติ'
    },
    {
        id: 'thai_mini_diorama',
        label: 'ดิโอราม่าโลกจิ๋ว',
        prompt: '{subject} ในฉากดิโอราม่าโลกจิ๋วสมจริง รายละเอียดสิ่งของรอบตัวคมชัด มุมมองเหมือนช่างภาพถ่ายโมเดลระดับโลก'
    }
];
// Legacy video prompt (kept for later video revival).
const TEMPLATE_PROMPT = [
    'PROMPT:',
    '8s ultra-photoreal vertical 9:16 smartphone POV, single continuous shot, no cuts, daylight at an open side door of a vintage VW van.',
    "STRICT IDENTITY LOCK: The dog must be the exact same Thai Ridgeback as the reference image, no reinterpretation. Preserve the dog's stern/serious/alert facial expression exactly like the reference. Preserve upright pointed ears (ears up, rigid, alert), identical ear size and ear angle, identical head proportions, identical brow ridge and forehead wrinkle pattern, identical eye shape and eye spacing, identical muzzle length and nose size.",
    'Do not change emotion: keep the same confident, focused, slightly intense look-not sad, not gentle-smiling, not submissive.',
    '',
    'Anti-jitter continuity rule: maintain consistent facial geometry frame-to-frame; no morphing, no wobble, no drifting proportions; smooth natural motion only.',
    '',
    'Timeline (no cuts):',
    '0-1s dog holds eye contact; tiny ear twitch.',
    '1-3s slow careful step down from van.',
    '3-4.2s 1-2 steps closer, sits facing owner.',
    '4.2-6.2s owner hands enter; dog places one paw slowly onto hand, hold contact.',
    '6.2-7.2s dog stares into camera (\\u0e08\\u0e49\\u0e2d\\u0e07\\u0e21\\u0e32\\u0e17\\u0e35\\u0e48\\u0e01\\u0e25\\u0e49\\u0e2d\\u0e07), blinks exactly once.',
    '7.2-8s simple soft dissolve fade-out (no particles, no glow, no glitch), hands remain trembling.',
    '',
    'Smartphone realism: subtle handheld micro-shake, mild autofocus breathing once, natural daylight shadows, realistic fur detail, no dramatic grading, no text.',
    '',
    'NEGATIVE:',
    'sad, droopy ears, ears down, floppy ears, submissive eyes, different wrinkles, fewer wrinkles, different head shape, different muzzle, identity drift, morphing, jitter, wobble, inconsistent anatomy, CGI, cartoon, glitch, particles, magic.'
].join('\n');

const TEMPLATE_STYLES = [
    {
        id: 'ancient_guardian',
        name: 'Ancient Guardian',
        description: 'Mystical, powerful, protecting ancient ruins.',
        prompt: 'Epic cinematic shot, ancient temple guardian dog, golden armor parts, glowing runes background, mystical atmosphere, 8k resolution, unreal engine 5 render style, hyper-realistic fur.',
        icon: '🏛️',
        mockImage: 'https://images.unsplash.com/photo-1552053831-71594a27632d?q=80&w=1000&auto=format&fit=crop' // Placeholder: Dog in nature
    },
    {
        id: 'royal_portrait',
        name: 'Royal Portrait',
        description: 'Victorian era royalty oil painting.',
        prompt: 'Oil painting style, victorian royal dog portrait, wearing ornate velvet robe and golden crown, dramatic lighting, rich textures, classic art style.',
        icon: '👑',
        mockImage: 'https://images.unsplash.com/photo-1541364983171-a8ba01e95cfc?q=80&w=1000&auto=format&fit=crop' // Placeholder: Serious dog
    },
    {
        id: 'cyberpunk',
        name: 'Cyberpunk 2077',
        description: 'Neon-lit futuristic city vibe.',
        prompt: 'Cyberpunk style, neon city background, futuristic dog armor, glowing collar, rain slicked streets, pink and blue lighting, high contrast.',
        icon: '🤖',
        mockImage: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?q=80&w=1000&auto=format&fit=crop' // Placeholder: Dog with attitude
    },
    {
        id: 'pixar',
        name: 'Pixar 3D',
        description: 'Cute, expressive, animated movie style.',
        prompt: 'Pixar 3D animation style, big expressive eyes, soft fur texture, bright cheerful lighting, simple clean background, cute and lovable.',
        icon: '🎬',
        mockImage: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?q=80&w=1000&auto=format&fit=crop' // Placeholder: Cute dog
    },
    {
        id: 'glow_up',
        name: 'Studio Glow Up',
        description: 'Professional magazine cover shoot.',
        prompt: 'Professional studio photography, fashion magazine cover style, perfect lighting, bokeh background, sharp focus, glamour shot.',
        icon: '✨',
        mockImage: 'https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?q=80&w=1000&auto=format&fit=crop' // Placeholder: Studio dog
    }
];

const shuffleArray = <T,>(items: T[]): T[] => {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
};

const normalizeUrl = (value: string): URL | null => {
    const trimmed = value.trim();
    if (!trimmed || trimmed.includes(' ')) return null;
    const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    try {
        const url = new URL(candidate);
        if (!url.hostname.includes('.')) return null;
        return url;
    } catch {
        return null;
    }
};

const isAudioFile = (path: string) => /\.(mp3|wav|ogg|m4a)$/i.test(path);
const isVideoFile = (path: string) => /\.(mp4|mov|webm|m4v|avi)$/i.test(path);
const isImageFile = (path: string) => /\.(jpg|jpeg|png|webp|gif)$/i.test(path);

const isVideoHost = (host: string) => (
    host.includes('youtube') ||
    host.includes('youtu.be') ||
    host.includes('tiktok.com') ||
    host.includes('instagram.com') ||
    host.includes('facebook.com') ||
    host.includes('fb.watch') ||
    host.includes('vimeo.com')
);

const isVideoLink = (url: URL) => isVideoHost(url.hostname.toLowerCase()) || isVideoFile(url.pathname);

const classifyUrl = (url: URL): UrlType => {
    const host = url.hostname.toLowerCase();
    if (host.includes('suno')) return 'audio';
    if (isAudioFile(url.pathname)) return 'audio';
    if (host.includes('shopee') || host.includes('lazada') || host.includes('clickbank')) return 'product';
    if (isVideoLink(url)) return 'pet';
    if (isImageFile(url.pathname)) return 'pet';
    return 'unknown';
};

const buildExternalProduct = (url: URL): MagicAdProduct => {
    const host = url.hostname.replace('www.', '');
    const parts = url.pathname.split('/').filter(Boolean);
    const rawTitle = parts[parts.length - 1] || host;
    const title =
        decodeURIComponent(rawTitle)
            .replace(/[-_]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim() || `Product from ${host}`;

    const source = host.includes('shopee')
        ? 'shopee'
        : host.includes('lazada')
            ? 'lazada'
            : 'other';

    return {
        id: `external-${Date.now()}`,
        title,
        description: `External link from ${host}`,
        price: 0,
        currency: 'THB',
        category: 'pet_supplies',
        condition: 'new',
        images: [],
        location: host,
        seller_id: 'external',
        status: 'active',
        created_at: new Date().toISOString(),
        external_link: url.href,
        source,
        is_promoted: true
    };
};

const buildPetFromUrl = (url: string, mediaType: 'image' | 'video'): Pet => ({
    id: `pet-link-${Date.now()}`,
    name: 'New Pet',
    breed: 'Unknown',
    type: 'dog',
    gender: 'male',
    image: mediaType === 'image' ? url : undefined,
    media_type: mediaType,
    video_url: mediaType === 'video' ? url : undefined,
    location: 'Unknown',
    owner_id: 'current-user'
});

const getProductImage = (product: MagicAdProduct) => product.image_url || product.images?.[0];
const getPetImage = (pet: Pet) => pet.image_url || pet.image || null;

const isBlobUrl = (url: string) => url.startsWith('blob:');

const blobToDataUrl = (blob: Blob) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(blob);
});

const normalizeImageForReplicate = async (url: string) => {
    if (!isBlobUrl(url)) return url;
    const response = await fetch(url);
    const blob = await response.blob();
    return blobToDataUrl(blob);
};

const pickOutputUrl = (output: unknown): string | null => {
    if (!output) return null;
    if (typeof output === 'string') return output;
    if (Array.isArray(output)) {
        const first = output.find((item) => typeof item === 'string');
        return first ?? null;
    }
    if (typeof output === 'object') {
        const maybe = output as Record<string, unknown>;
        const candidate =
            (typeof maybe.video === 'string' && maybe.video) ||
            (typeof maybe.url === 'string' && maybe.url) ||
            (typeof maybe.output === 'string' && maybe.output);
        return candidate || null;
    }
    return null;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const searchMarketplaceProducts = async (query: string) => {
    const { data, error } = await supabase
        .from('marketplace_listings')
        .select('*')
        .eq('status', 'active')
        .or(`title.ilike.%${query}%,description.ilike.%${query}%,category.ilike.%${query}%`)
        .order('created_at', { ascending: false })
        .limit(20);
    if (error) throw error;
    return (data || []) as MagicAdProduct[];
};

const CreateMagicAdModal: React.FC<CreateMagicAdModalProps> = ({ isOpen, onClose, userPets, onAdGenerated }) => {
    const { user } = useAuth();
    const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
    const [selectedProduct, setSelectedProduct] = useState<MagicAdProduct | null>(null);
    const [selectedStyle, setSelectedStyle] = useState<typeof TEMPLATE_STYLES[0] | null>(null);
    const [identityImages, setIdentityImages] = useState<ReferenceImage[]>([]);
    const [sceneImages, setSceneImages] = useState<ReferenceImage[]>([]);
    const [subjectText, setSubjectText] = useState('');
    const [identityLock, setIdentityLock] = useState(true);
    const [products, setProducts] = useState<MagicAdProduct[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [resultImageUrl, setResultImageUrl] = useState<string | null>(null); // Changed from videoUrl
    const [resultVideoUrl, setResultVideoUrl] = useState<string | null>(null);
    const [generationError, setGenerationError] = useState<string | null>(null);
    const generationTokenRef = useRef(0);

    const [localPets, setLocalPets] = useState<Pet[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [suggestionSeed, setSuggestionSeed] = useState(0);
    const [lastDetection, setLastDetection] = useState<{ type: UrlType; url: string; label: string } | null>(null);
    const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
    const [remotePetResults, setRemotePetResults] = useState<Pet[]>([]);
    const [remoteProductResults, setRemoteProductResults] = useState<MagicAdProduct[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);

    const [audioMode, setAudioMode] = useState<AudioMode>('auto');
    const [sunoLink, setSunoLink] = useState('');
    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [audioStatus, setAudioStatus] = useState<'idle' | 'fetching' | 'ready' | 'error'>('idle');

    const [showAdvanced, setShowAdvanced] = useState(true);
    const [promptText, setPromptText] = useState(DEFAULT_IMAGE_PROMPT);
    const [selectedPromptTemplateId, setSelectedPromptTemplateId] = useState('default');
    // Video flow is paused while we focus on image generation.
    const enableVideoFlow = false;
    const isAdmin = user?.profile?.role === 'admin';
    const canUseAnyAffiliate = Boolean(isAdmin || user?.profile?.verified_breeder);
    const canGenerateVideo = Boolean(isAdmin || user?.profile?.verified_breeder);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const searchPlaceholder = 'Search pets or paste a pet image link';
    const suggestedLabel = 'Pet picks';
    const hasIdentityImages = identityImages.length > 0;
    const stepHint = !hasIdentityImages
        ? 'Step 1: Add at least 1 identity photo.'
        : !selectedStyle
            ? 'Step 2: Choose a style.'
            : 'Ready to generate.';
    const searchStatusLabel = enableVideoFlow ? 'Searching pets and products...' : 'Searching pets...';
    const permissionHint = enableVideoFlow
        ? !user
            ? 'Sign in to use AI video generation.'
            : !canGenerateVideo
                ? 'AI video generation is available for Pro/Admin accounts only.'
                : null
        : null;
    const actionHint = permissionHint ?? (!hasIdentityImages
        ? 'Add at least 1 identity photo.'
        : !selectedStyle
            ? 'Select a style to continue.'
            : 'Ready to generate.');
    const canGenerateImage = Boolean(selectedStyle && hasIdentityImages);

    useEffect(() => {
        if (isOpen && enableVideoFlow) fetchProducts();
    }, [isOpen, enableVideoFlow]);

    useEffect(() => {
        if (!isOpen) {
            setSelectedPet(null);
            setSelectedProduct(null);
            setSelectedStyle(null);
            setIsGenerating(false);
            setResultVideoUrl(null);
            setResultImageUrl(null);
            setGenerationError(null);
            setSearchQuery('');
            setLastDetection(null);
            setRemotePetResults([]);
            setRemoteProductResults([]);
            setIsSearching(false);
            setSearchError(null);
            setShowAdvanced(true);
            setPromptText(DEFAULT_IMAGE_PROMPT);
            setSubjectText('');
            setIdentityLock(true);
            setSelectedPromptTemplateId('default');
            setIdentityImages((prev) => {
                prev.forEach((image) => {
                    if (image.source === 'upload') URL.revokeObjectURL(image.url);
                });
                return [];
            });
            setSceneImages((prev) => {
                prev.forEach((image) => {
                    if (image.source === 'upload') URL.revokeObjectURL(image.url);
                });
                return [];
            });
            setAudioMode('auto');
            setSunoLink('');
            setAudioFile(null);
            setAudioStatus('idle');
            generationTokenRef.current += 1;
        }
    }, [isOpen]);

    useEffect(() => {
        if (!selectedPet) {
            setSubjectText('');
            return;
        }
        setSubjectText(selectedPet.breed || selectedPet.name || selectedPet.type || 'pet');
    }, [selectedPet]);

    useEffect(() => {
        if (audioMode !== 'upload') setAudioFile(null);
        if (audioMode !== 'suno') setSunoLink('');
    }, [audioMode]);

    useEffect(() => {
        if (audioMode !== 'suno' || !sunoLink) {
            setAudioStatus('idle');
            return;
        }
        setAudioStatus('fetching');
        const timer = setTimeout(() => setAudioStatus('ready'), 800);
        return () => clearTimeout(timer);
    }, [audioMode, sunoLink]);

    const fetchProducts = async () => {
        const { data, error } = await supabase.from('marketplace_listings').select('*').limit(30);
        if (error) {
            console.error('Error fetching products:', error);
            return;
        }
        if (data) setProducts(data as MagicAdProduct[]);
    };

    const allPets = useMemo(() => [...localPets, ...userPets], [localPets, userPets]);
    const promptTokens = useMemo(() => {
        const subject = subjectText.trim() || selectedPet?.breed || selectedPet?.name || selectedPet?.type || 'pet';
        return {
            subject,
            petName: selectedPet?.name || subject,
            breed: selectedPet?.breed || subject,
            animal: selectedPet?.type || 'pet'
        };
    }, [subjectText, selectedPet]);
    const applyPromptTemplate = (template: string) => (
        template.replace(/\{(subject|petName|breed|animal)\}/g, (match, token) => {
            const replacement = promptTokens[token as keyof typeof promptTokens];
            return replacement || match;
        })
    );

    useEffect(() => {
        const mixed: SuggestionItem[] = [
            ...allPets.map((pet) => ({ type: 'pet', pet })),
            ...(enableVideoFlow ? products.map((product) => ({ type: 'product', product })) : [])
        ];
        setSuggestions(shuffleArray(mixed).slice(0, 6));
    }, [allPets, products, suggestionSeed, enableVideoFlow]);

    useEffect(() => {
        const query = searchQuery.trim();
        const url = normalizeUrl(query);
        if (!query || query.length < 2 || url) {
            setRemotePetResults([]);
            setRemoteProductResults([]);
            setSearchError(null);
            setIsSearching(false);
            return;
        }

        let active = true;
        setIsSearching(true);
        setSearchError(null);

        const timeoutId = window.setTimeout(async () => {
            try {
                const [petsResult, productsResult] = await Promise.all([
                    searchPets(query),
                    enableVideoFlow ? searchMarketplaceProducts(query) : Promise.resolve([])
                ]);
                if (!active) return;
                setRemotePetResults(petsResult);
                setRemoteProductResults(productsResult);
            } catch (error) {
                if (!active) return;
                console.error('Search error:', error);
                setSearchError('Search failed. Please try again.');
            } finally {
                if (active) setIsSearching(false);
            }
        }, 350);

        return () => {
            active = false;
            window.clearTimeout(timeoutId);
        };
    }, [searchQuery, enableVideoFlow]);

    const localPetMatches = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return [] as Pet[];
        return allPets.filter((pet) =>
            [pet.name, pet.breed, pet.location].some((val) => val?.toLowerCase().includes(query))
        );
    }, [searchQuery, allPets]);

    const localProductMatches = useMemo(() => {
        if (!enableVideoFlow) return [] as MagicAdProduct[];
        const query = searchQuery.trim().toLowerCase();
        if (!query) return [] as MagicAdProduct[];
        return products.filter((product) =>
            [product.title, product.description, product.category].some((val) => val?.toLowerCase().includes(query))
        );
    }, [searchQuery, products, enableVideoFlow]);

    const searchResults = useMemo(() => {
        const query = searchQuery.trim();
        if (!query) return [];

        const map = new Map<string, SuggestionItem>();
        const addPet = (pet: Pet) => {
            map.set(`pet-${pet.id}`, { type: 'pet', pet });
        };
        const addProduct = (product: MagicAdProduct) => {
            map.set(`product-${product.id}`, { type: 'product', product });
        };

        localPetMatches.slice(0, 6).forEach(addPet);
        remotePetResults.forEach(addPet);
        if (enableVideoFlow) {
            localProductMatches.slice(0, 6).forEach(addProduct);
            remoteProductResults.forEach(addProduct);
        }

        return Array.from(map.values()).slice(0, 12);
    }, [searchQuery, localPetMatches, localProductMatches, remotePetResults, remoteProductResults, enableVideoFlow]);

    const filteredSuggestions = useMemo(() => {
        if (!enableVideoFlow) return suggestions.filter((item) => item.type === 'pet');
        return suggestions;
    }, [suggestions, enableVideoFlow]);

    const filteredSearchResults = useMemo(() => {
        if (!enableVideoFlow) return searchResults.filter((item) => item.type === 'pet');
        return searchResults;
    }, [searchResults, enableVideoFlow]);

    const handleSelectPet = (pet: Pet) => {
        setSelectedPet(pet);
        setSearchQuery('');
        const petImage = getPetImage(pet);
        if (!petImage) {
            setGenerationError('Selected pet has no photo. Add at least 1 identity image.');
            return;
        }
        setGenerationError(null);
        const source: ReferenceImage['source'] = isBlobUrl(petImage) ? 'upload' : 'link';
        addIdentityImage(petImage, `${pet.name || 'Pet'} photo`, source);
    };

    const handleSelectProduct = (product: MagicAdProduct) => {
        setSelectedProduct(product);
        setSearchQuery('');
    };

    const handleDetectedUrl = (url: URL, forcedType?: UrlType) => {
        const type = forcedType ?? classifyUrl(url);
        const isVideoLinkDetected = isVideoLink(url);

        if (!enableVideoFlow && (type === 'audio' || type === 'product')) {
            setLastDetection({
                type,
                url: url.href,
                label: 'Video tools are paused. Link ignored.'
            });
            setSearchQuery('');
            window.setTimeout(() => setLastDetection(null), 2500);
            return;
        }

        if (type === 'audio') {
            setAudioMode('suno');
            setSunoLink(url.href);
            setSearchQuery('');
        } else if (type === 'pet') {
            if (!enableVideoFlow && isVideoLinkDetected) {
                setLastDetection({
                    type,
                    url: url.href,
                    label: 'Video links are paused for now.'
                });
                setSearchQuery('');
                window.setTimeout(() => setLastDetection(null), 2500);
                return;
            }

            if (identityImages.length < MAX_IDENTITY_IMAGES) {
                addIdentityImage(url.href, 'Identity link', 'link');
                setLastDetection({
                    type,
                    url: url.href,
                    label: 'Identity image added.'
                });
            } else if (sceneImages.length < MAX_SCENE_IMAGES) {
                addSceneImage(url.href, 'Scene link', 'link');
                setLastDetection({
                    type,
                    url: url.href,
                    label: 'Scene image added.'
                });
            } else {
                setLastDetection({
                    type,
                    url: url.href,
                    label: 'Image slots full.'
                });
            }
            setSearchQuery('');
            window.setTimeout(() => setLastDetection(null), 2500);
            return;
        } else {
            if (!enableVideoFlow) {
                setLastDetection({
                    type,
                    url: url.href,
                    label: 'Unsupported link. Paste an image URL instead.'
                });
                setSearchQuery('');
                window.setTimeout(() => setLastDetection(null), 2500);
                return;
            }
            if (type === 'unknown' && !canUseAnyAffiliate) {
                setLastDetection({
                    type,
                    url: url.href,
                    label: 'Pro/Admin required for external affiliate links.'
                });
                setSearchQuery('');
                window.setTimeout(() => setLastDetection(null), 2500);
                return;
            }
            const externalProduct = buildExternalProduct(url);
            handleSelectProduct(externalProduct);
        }

        const label = type === 'audio'
            ? 'Audio added from link'
            : type === 'pet'
                ? 'Pet added from link'
                : type === 'product'
                    ? 'Product added from link'
                    : 'Link added as product';

        setLastDetection({ type, url: url.href, label });
        window.setTimeout(() => setLastDetection(null), 2500);
    };

    const handleManualRoute = (type: Exclude<UrlType, 'unknown'>) => {
        if (!lastDetection) return;
        const url = normalizeUrl(lastDetection.url);
        if (!url) return;
        handleDetectedUrl(url, type);
    };

    const handleSearchChange = (value: string) => {
        setSearchQuery(value);
        const url = normalizeUrl(value);
        if (url) handleDetectedUrl(url);
    };

    const handleSearchPaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
        const text = event.clipboardData.getData('text');
        const url = normalizeUrl(text);
        if (!url) return;
        event.preventDefault();
        handleDetectedUrl(url);
    };

    const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key !== 'Enter') return;
        const url = normalizeUrl(searchQuery);
        if (!url) return;
        event.preventDefault();
        handleDetectedUrl(url);
    };

    const handlePetUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.type.startsWith('video/')) {
            setGenerationError('Video uploads are paused for now.');
            e.target.value = '';
            return;
        }
        const previewUrl = URL.createObjectURL(file);
        const newPet: Pet = {
            id: `new-${Date.now()}`,
            name: 'New Pet',
            breed: 'Unknown',
            type: 'dog',
            gender: 'male',
            image: previewUrl,
            media_type: 'image',
            video_url: undefined,
            location: 'Bangkok',
            owner_id: 'current-user'
        };
        setLocalPets((prev) => [newPet, ...prev]);
        handleSelectPet(newPet);
        e.target.value = '';
    };

    const buildImageEntry = (url: string, name: string, source: ReferenceImage['source']) => ({
        id: `ref-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        url,
        name,
        source
    });

    const addIdentityImage = (url: string, name: string, source: ReferenceImage['source']) => {
        setIdentityImages((prev) => {
            if (prev.some((item) => item.url === url)) return prev;
            if (prev.length >= MAX_IDENTITY_IMAGES) {
                setGenerationError(`Up to ${MAX_IDENTITY_IMAGES} identity images.`);
                return prev;
            }
            return [...prev, buildImageEntry(url, name, source)];
        });
    };

    const addSceneImage = (url: string, name: string, source: ReferenceImage['source']) => {
        setSceneImages((prev) => {
            if (prev.some((item) => item.url === url)) return prev;
            if (prev.length >= MAX_SCENE_IMAGES) {
                setGenerationError(`Up to ${MAX_SCENE_IMAGES} scene images.`);
                return prev;
            }
            return [...prev, buildImageEntry(url, name, source)];
        });
    };

    const handleIdentityUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? []);
        if (!files.length) return;
        setIdentityImages((prev) => {
            const remaining = MAX_IDENTITY_IMAGES - prev.length;
            if (remaining <= 0) {
                setGenerationError(`Up to ${MAX_IDENTITY_IMAGES} identity images.`);
                return prev;
            }
            const additions = files.slice(0, remaining).map((file) => ({
                id: `ref-${Date.now()}-${Math.random().toString(16).slice(2)}`,
                url: URL.createObjectURL(file),
                name: file.name,
                source: 'upload' as const
            }));
            if (files.length > remaining) {
                setGenerationError(`Only ${MAX_IDENTITY_IMAGES} identity images were added.`);
            }
            return [...prev, ...additions];
        });
        e.target.value = '';
    };

    const handleSceneUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? []);
        if (!files.length) return;
        setSceneImages((prev) => {
            const remaining = MAX_SCENE_IMAGES - prev.length;
            if (remaining <= 0) {
                setGenerationError(`Up to ${MAX_SCENE_IMAGES} scene images.`);
                return prev;
            }
            const additions = files.slice(0, remaining).map((file) => ({
                id: `ref-${Date.now()}-${Math.random().toString(16).slice(2)}`,
                url: URL.createObjectURL(file),
                name: file.name,
                source: 'upload' as const
            }));
            if (files.length > remaining) {
                setGenerationError(`Only ${MAX_SCENE_IMAGES} scene images were added.`);
            }
            return [...prev, ...additions];
        });
        e.target.value = '';
    };

    const handleRemoveIdentity = (id: string) => {
        setIdentityImages((prev) => {
            const target = prev.find((item) => item.id === id);
            if (target?.source === 'upload') URL.revokeObjectURL(target.url);
            return prev.filter((item) => item.id !== id);
        });
    };

    const handleRemoveScene = (id: string) => {
        setSceneImages((prev) => {
            const target = prev.find((item) => item.id === id);
            if (target?.source === 'upload') URL.revokeObjectURL(target.url);
            return prev.filter((item) => item.id !== id);
        });
    };

    const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setAudioMode('upload');
        setAudioFile(file);
        e.target.value = '';
    };

    const handleGenerate = async () => {
        if (!selectedStyle || !hasIdentityImages) {
            setGenerationError(!selectedStyle ? 'Select a style to continue.' : 'Add at least 1 identity photo.');
            return;
        }
        const generationToken = generationTokenRef.current + 1;
        generationTokenRef.current = generationToken;

        setIsGenerating(true);
        setGenerationError(null);
        setResultVideoUrl(null);
        setResultImageUrl(null);

        const pollPrediction = async (predictionId: string) => {
            const maxAttempts = 40;
            for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
                if (generationTokenRef.current !== generationToken) {
                    throw new Error('Generation canceled.');
                }
                const response = await fetch(`/api/ai/image?id=${encodeURIComponent(predictionId)}`);
                const data = await response.json().catch(() => ({}));
                if (!response.ok) {
                    const message = data?.error ? String(data.error) : `Image error (HTTP ${response.status})`;
                    throw new Error(message);
                }

                if (data.status === 'succeeded') {
                    return data.output;
                }
                if (data.status === 'failed' || data.status === 'canceled') {
                    throw new Error(data?.error ? String(data.error) : 'Image generation failed.');
                }
                await sleep(1500);
            }

            throw new Error('Image generation timed out. Please try again.');
        };

        try {
            const basePrompt = promptText.trim() || DEFAULT_IMAGE_PROMPT;
            const resolvedPrompt = applyPromptTemplate(basePrompt);
            const identityPrompt = identityLock ? applyPromptTemplate(IDENTITY_LOCK_PROMPT) : '';
            const identityReferenceCount = identityImages.length;
            const identityHint = identityReferenceCount > 0
                ? `Use the first ${identityReferenceCount} reference images strictly for pet identity.`
                : '';
            const sceneHint = sceneImages.length > 0
                ? `Use the last ${sceneImages.length} reference images only for owner, location, or props. Allow creative variation in composition. Do not change the pet.`
                : '';
            const promptParts = [
                resolvedPrompt,
                selectedStyle?.prompt,
                identityPrompt,
                identityHint,
                sceneHint
            ].filter(Boolean);
            const prompt = promptParts.join('\n');

            const identitySources = identityImages.map((image) => image.url);
            const sceneSources = sceneImages.map((image) => image.url);
            const baseImages = [...identitySources, ...sceneSources];

            const normalizedImages = await Promise.all(
                baseImages.map((imageUrl) => normalizeImageForReplicate(imageUrl))
            );
            const uniqueImages = Array.from(new Set(normalizedImages.filter(Boolean)));

            const response = await fetch('/api/ai/image', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    prompt,
                    referenceImages: uniqueImages.length > 0 ? uniqueImages : undefined
                })
            });

            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                const message = data?.error ? String(data.error) : `Image error (HTTP ${response.status})`;
                throw new Error(message);
            }

            const predictionId = data?.id;
            if (!predictionId) {
                throw new Error('Image generation did not return a prediction id.');
            }

            const output = data.output ?? await pollPrediction(predictionId);
            const imageUrl = pickOutputUrl(output);
            if (!imageUrl) {
                throw new Error('Image generation finished without an image.');
            }

            if (generationTokenRef.current !== generationToken) return;
            setResultImageUrl(imageUrl);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Image generation failed.';
            setGenerationError(message);
        } finally {
            if (generationTokenRef.current === generationToken) {
                setIsGenerating(false);
            }
        }
        return;

    // Legacy Video Generation Code (Disabled for now)
    /*
    if (!canGenerateVideo) {
        setGenerationError(permissionHint || 'AI video generation is available for Pro/Admin accounts only.');
        return;
    }
    const petImage = getPetImage(selectedPet);
    if (!petImage) {
        setGenerationError('Please choose a pet with a photo to generate the video.');
        return;
    }
    const productImage = getProductImage(selectedProduct);
    
    const generationToken = generationTokenRef.current + 1;
    generationTokenRef.current = generationToken;
    setIsGenerating(true);
    setResultVideoUrl(null);
    setGenerationError(null);
    
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    if (!accessToken) {
        setIsGenerating(false);
        setGenerationError('Please sign in again to generate the video.');
        return;
    }
    
    const trimmedPrompt = promptText.trim();
    const fallbackPrompt = trimmedPrompt.length > 0
        ? trimmedPrompt
        : TEMPLATE_PROMPT;
    
    const pollPrediction = async (predictionId: string) => {
        const maxAttempts = 40;
        for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
            if (generationTokenRef.current !== generationToken) {
                throw new Error('Generation canceled.');
            }
            const response = await fetch(`/api/ai/video?id=${encodeURIComponent(predictionId)}`, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                const message = data?.error ? String(data.error) : `Video error (HTTP ${response.status})`;
                throw new Error(message);
            }
    
            if (data.status === 'succeeded') {
                return data.output;
            }
            if (data.status === 'failed' || data.status === 'canceled') {
                throw new Error(data?.error ? String(data.error) : 'Video generation failed.');
            }
            await sleep(2000);
        }
    
        throw new Error('Video generation timed out. Please try again.');
    };
    
    try {
        const resolvedImage = await normalizeImageForReplicate(petImage);
        const referenceImages: string[] = [resolvedImage];
        if (productImage) {
            try {
                const normalizedProduct = await normalizeImageForReplicate(productImage);
                if (normalizedProduct) referenceImages.push(normalizedProduct);
            } catch (error) {
                console.warn('Unable to attach product image reference.', error);
            }
        }
        const uniqueReferences = Array.from(new Set(referenceImages));
        const response = await fetch('/api/ai/video', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`
            },
            body: JSON.stringify({
                referenceImages: uniqueReferences,
                prompt: fallbackPrompt,
                petName: selectedPet.name,
                productTitle: selectedProduct.title,
                aspectRatio: '9:16',
                durationSeconds: 12
            })
        });
    
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            const message = data?.error ? String(data.error) : `Video error (HTTP ${response.status})`;
            throw new Error(message);
        }
    
        const predictionId = data?.id;
        if (!predictionId) {
            throw new Error('Video generation did not return a prediction id.');
        }
    
        const output = data.output ?? await pollPrediction(predictionId);
        const videoUrl = pickOutputUrl(output);
        if (!videoUrl) {
            throw new Error('Video generation finished without a playable video.');
        }
    
        setResultVideoUrl(videoUrl);
        const resultPayload = {
            id: predictionId,
            pet: selectedPet,
            product: selectedProduct,
            videoUrl,
            prompt: fallbackPrompt || null,
            audio: {
                mode: audioMode,
                sunoLink: sunoLink || null,
                fileName: audioFile?.name || null
            },
            adSpec: {
                format: '9:16',
                duration: '10-12s',
                fps: 30
            },
            timestamp: new Date().toISOString()
        };
    
        if (onAdGenerated) onAdGenerated(resultPayload);
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Video generation failed.';
        setGenerationError(message);
    } finally {
        if (generationTokenRef.current === generationToken) {
            setIsGenerating(false);
        }
    }
    */
    };
    
    const handleDownload = () => {
        const fileUrl = resultImageUrl || resultVideoUrl;
        if (!fileUrl) return;
        const link = document.createElement('a');
        link.href = fileUrl;
        link.download = resultImageUrl
            ? `MagicImage-${selectedPet?.name || subjectText || 'Pet'}.jpg`
            : `MagicAd-${selectedPet?.name || 'Pet'}.mp4`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleShare = async () => {
        const shareUrl = resultImageUrl || resultVideoUrl;
        if (!shareUrl) return;
        try {
            await navigator.clipboard?.writeText(shareUrl);
        } catch (error) {
            console.error('Unable to copy link:', error);
        }
    };
    
    if (resultImageUrl || resultVideoUrl) {
    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md bg-transparent border-none shadow-none p-0 flex flex-col items-center justify-center focus:outline-none">
                <div className="bg-[#101210] border border-white/10 rounded-3xl overflow-hidden shadow-2xl shadow-black/40 w-full relative animate-in zoom-in-95 duration-300">
                    <div className="absolute top-4 right-4 z-20 bg-[#A7C4B0] text-[#0F1110] text-xs font-semibold px-3 py-1 rounded-full">
                        {resultImageUrl ? 'Image Ready' : 'Render Ready'}
                    </div>
    
                    <div className={`w-full bg-black relative ${resultImageUrl ? 'aspect-[4/5]' : 'aspect-[9/16]'}`}>
                        {resultImageUrl ? (
                            <img 
                                src={resultImageUrl} 
                                className="w-full h-full object-cover" 
                                alt="Generated Magic Art"
                            />
                        ) : (
                            <video
                                src={resultVideoUrl!}
                                className="w-full h-full object-cover"
                                autoPlay
                                loop
                                muted
                                playsInline
                            />
                        )}
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-6 pt-20 text-center">
                            <h3 className="text-2xl font-semibold text-white mb-1">
                                {resultImageUrl ? selectedStyle?.name : 'Magic Render Ready'}
                            </h3>
                            <p className="text-white/70 text-sm">
                                {resultImageUrl ? 'Your portrait is ready to share.' : 'Your render is ready.'}
                            </p>
                        </div>
                    </div>

                    <div className="p-4 bg-[#151815] flex gap-3">
                        <button onClick={handleDownload} className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors">
                            <Upload className="rotate-180" size={18} /> Save
                        </button>
                        <button onClick={handleShare} className="flex-1 py-3 bg-[#A7C4B0] hover:bg-[#B8D3C2] text-[#0F1110] rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors">
                            Share
                        </button>
                    </div>

                    <button onClick={onClose} className="absolute top-4 left-4 z-20 bg-black/50 hover:bg-black/70 p-2 rounded-full text-white/70 hover:text-white transition-colors">
                        <X size={16} />
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
    }
    
    return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-5xl bg-[#101210] border border-white/10 text-white/90 p-0 shadow-2xl z-[60]">
            <div className="relative max-h-[90vh] overflow-y-auto">
                <div className="absolute top-0 left-0 w-full h-px bg-white/10" />

            <DialogHeader className="px-4 pt-5 sm:px-6">
                <DialogTitle className="text-2xl sm:text-3xl font-semibold flex items-center gap-3">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#A7C4B0] text-[#0F1110] text-xs font-semibold">AI</span>
                    Magic Image Studio
                </DialogTitle>
                <p className="text-white/60 mt-2">Calm, mobile-first studio for viral pet portraits.</p>
            </DialogHeader>

            <div className="px-4 pb-6 sm:px-6 mt-4 space-y-4">
                <div className="space-y-3">
                    <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#151815] px-4 py-3">
                        <Search className="h-4 w-4 text-white/40" />
                        <input
                            ref={searchInputRef}
                            value={searchQuery}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            onPaste={handleSearchPaste}
                            onKeyDown={handleSearchKeyDown}
                            placeholder={searchPlaceholder}
                            className="flex-1 bg-transparent text-sm text-white/90 placeholder:text-white/40 focus:outline-none"
                        />
                        <button
                            type="button"
                            onClick={() => setSuggestionSeed((prev) => prev + 1)}
                            className="flex items-center gap-1 rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-white/70 hover:bg-white/10 transition-colors"
                        >
                            <Shuffle className="h-3 w-3" />
                            Shuffle
                        </button>
                    </div>
    
                    {lastDetection && (
                        <div className="flex flex-wrap items-center gap-2 text-xs text-white/60">
                            <span>{lastDetection.label}</span>
                            {lastDetection.type === 'unknown' && (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => handleManualRoute('pet')}
                                        className="px-2 py-1 rounded-full border border-white/10 hover:border-white/30 text-white/80"
                                    >
                                        Use as pet
                                    </button>
                                    {enableVideoFlow && (
                                        <button
                                            type="button"
                                            onClick={() => handleManualRoute('audio')}
                                            className="px-2 py-1 rounded-full border border-white/10 hover:border-white/30 text-white/80"
                                        >
                                            Use as audio
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    )}
    
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        <div className={`flex items-center justify-between rounded-xl border px-3 py-2 ${selectedPet ? 'border-[#A7C4B0]/60 bg-[#1A1F1B]' : 'border-white/10 bg-[#151815] text-white/50'}`}>
                            <div>
                                <div className="text-[10px] uppercase tracking-widest text-white/50">Pet</div>
                                <div className="text-sm font-semibold text-white/90">{selectedPet ? selectedPet.name : 'Choose a pet'}</div>
                            </div>
                            {selectedPet && <div className="h-2 w-2 rounded-full bg-[#A7C4B0]" />}
                        </div>
                        <div className={`flex items-center justify-between rounded-xl border px-3 py-2 ${selectedStyle ? 'border-[#A7C4B0]/60 bg-[#1A1F1B]' : 'border-white/10 bg-[#151815] text-white/50'}`}>
                            <div>
                                <div className="text-[10px] uppercase tracking-widest text-white/50">Style</div>
                                <div className="text-sm font-semibold text-white/90">{selectedStyle ? selectedStyle.name : 'Choose a style'}</div>
                            </div>
                            {selectedStyle && <div className="text-lg">{selectedStyle.icon}</div>}
                        </div>
                    </div>
                    <div className="text-xs text-white/50">{stepHint}</div>
                </div>
    
                {searchQuery && (
                    <div className="rounded-2xl border border-white/10 bg-[#151815] p-3 shadow-lg shadow-black/40">
                        {isSearching && (
                            <div className="px-4 py-2 text-xs text-white/50">
                                {searchStatusLabel}
                            </div>
                        )}
                        {searchError && (
                            <div className="px-4 py-2 text-xs text-red-300">
                                {searchError}
                            </div>
                        )}
                        {filteredSearchResults.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {filteredSearchResults.map((item, index) => (
                                    item.type === 'pet' ? (
                                        <button
                                            key={`result-pet-${item.pet.id}-${index}`}
                                            type="button"
                                            onClick={() => handleSelectPet(item.pet)}
                                            className={`group rounded-2xl border bg-[#151815] p-2 text-left transition-all ${selectedPet?.id === item.pet.id ? 'border-[#A7C4B0]/70 ring-1 ring-[#A7C4B0]/30' : 'border-white/10 hover:border-white/30'} shadow-sm shadow-black/30`}
                                        >
                                            <div className="aspect-square rounded-lg bg-black/30 overflow-hidden">
                                                <SmartImage src={item.pet.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                            </div>
                                            <div className="mt-2 text-xs font-semibold text-white/90 line-clamp-1">{item.pet.name}</div>
                                            <div className="text-[10px] uppercase tracking-widest text-white/50">{item.pet.breed || 'Pet'}</div>
                                        </button>
                                    ) : (
                                        <button
                                            key={`result-product-${item.product.id}-${index}`}
                                            type="button"
                                            onClick={() => handleSelectProduct(item.product)}
                                            className={`group rounded-2xl border bg-[#151815] p-2 text-left transition-all ${selectedProduct?.id === item.product.id ? 'border-[#A7C4B0]/70 ring-1 ring-[#A7C4B0]/30' : 'border-white/10 hover:border-white/30'} shadow-sm shadow-black/30`}
                                        >
                                            <div className="aspect-square rounded-lg bg-black/30 overflow-hidden">
                                                {getProductImage(item.product) ? (
                                                    <img src={getProductImage(item.product)} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-xs text-white/50">No image</div>
                                                )}
                                            </div>
                                            <div className="mt-2 text-xs font-semibold text-white/90 line-clamp-1">{item.product.title}</div>
                                            <div className="text-[10px] uppercase tracking-widest text-white/50">
                                                {item.product.price > 0 ? `${item.product.currency} ${item.product.price}` : 'Affiliate'}
                                            </div>
                                        </button>
                                    )
                                ))}
                            </div>
                        ) : (
                            !isSearching && (
                                <div className="px-4 py-6 text-center text-sm text-white/50">
                                    No matches yet. Paste a pet image link or try another keyword.
                                </div>
                            )
                        )}
                    </div>
                )}

                <div className={`transition ${searchQuery ? 'opacity-40' : 'opacity-100'}`}>
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-xs uppercase tracking-widest text-white/50">{suggestedLabel}</span>
                        <span className="text-[10px] text-white/50">Pets</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {filteredSuggestions.map((item, index) => (
                            item.type === 'pet' ? (
                                <button
                                    key={`pet-${item.pet.id}-${index}`}
                                    type="button"
                                    onClick={() => handleSelectPet(item.pet)}
                                    className={`group rounded-2xl border bg-[#151815] p-2 text-left transition-all ${selectedPet?.id === item.pet.id ? 'border-[#A7C4B0]/70 ring-1 ring-[#A7C4B0]/30' : 'border-white/10 hover:border-white/30'} shadow-sm shadow-black/30`}
                                >
                                    <div className="aspect-square rounded-lg bg-black/30 overflow-hidden">
                                        <SmartImage src={item.pet.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                    </div>
                                    <div className="mt-2 text-xs font-semibold text-white/90 line-clamp-1">{item.pet.name}</div>
                                    <div className="text-[10px] uppercase tracking-widest text-white/50">{item.pet.breed || 'Pet'}</div>
                                </button>
                            ) : (
                                <button
                                    key={`product-${item.product.id}-${index}`}
                                    type="button"
                                    onClick={() => handleSelectProduct(item.product)}
                                    className={`group rounded-2xl border bg-[#151815] p-2 text-left transition-all ${selectedProduct?.id === item.product.id ? 'border-[#A7C4B0]/70 ring-1 ring-[#A7C4B0]/30' : 'border-white/10 hover:border-white/30'} shadow-sm shadow-black/30`}
                                >
                                    <div className="aspect-square rounded-lg bg-black/30 overflow-hidden">
                                        {getProductImage(item.product) ? (
                                            <img src={getProductImage(item.product)} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-xs text-white/50">No image</div>
                                        )}
                                    </div>
                                    <div className="mt-2 text-xs font-semibold text-white/90 line-clamp-1">{item.product.title}</div>
                                    <div className="text-[10px] uppercase tracking-widest text-white/50">
                                        {item.product.price > 0 ? `${item.product.currency} ${item.product.price}` : 'Affiliate'}
                                    </div>
                                </button>
                            )
                        ))}
                    </div>
                </div>
            </div>

            <div className="px-4 pb-20 sm:px-6 grid gap-6">
                <div className="grid md:grid-cols-[1fr_auto_1fr] gap-4 items-stretch">
                    <div className={`rounded-2xl border bg-[#151815] p-4 ${selectedPet ? 'border-[#A7C4B0]/70 ring-1 ring-[#A7C4B0]/30' : 'border-white/10'}`}>
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-xs uppercase tracking-widest text-white/50">Pet</div>
                                <div className="text-sm font-semibold text-white/90">Select your star</div>
                            </div>
                            {selectedPet ? (
                                <button
                                    type="button"
                                    onClick={() => setSelectedPet(null)}
                                    className="text-xs text-white/60 hover:text-white"
                                >
                                    Clear
                                </button>
                            ) : (
                                <label className="text-xs font-semibold uppercase text-[#A7C4B0] hover:text-[#B8D3C2] cursor-pointer">
                                    <Upload className="inline-block mr-1" size={12} />
                                    Upload
                                    <input type="file" className="hidden" accept="image/*" onChange={handlePetUpload} />
                                </label>
                            )}
                        </div>
    
                        {selectedPet ? (
                            <div className="mt-4 flex items-center gap-3">
                                <div className="h-16 w-16 rounded-xl overflow-hidden bg-black/30">
                                    <SmartImage src={selectedPet.image || selectedPet.video_url} className="w-full h-full object-cover" />
                                </div>
                                <div>
                                    <div className="text-lg font-semibold text-white/90">{selectedPet.name}</div>
                                    <div className="text-xs text-white/60">{selectedPet.breed || 'Unknown breed'}</div>
                                    {selectedPet.media_type === 'video' && (
                                        <div className="text-[10px] uppercase tracking-widest text-white/50 mt-1">Video</div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="mt-4 text-sm text-white/60">
                                Use search or upload a pet photo. It will appear in Identity.
                            </div>
                        )}
    
                        {!selectedPet && allPets.length > 0 && (
                            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                                {allPets.slice(0, 6).map((pet) => (
                                    <button
                                        key={`quick-pet-${pet.id}`}
                                        type="button"
                                        onClick={() => handleSelectPet(pet)}
                                        className="h-12 w-12 rounded-xl overflow-hidden border border-white/10 hover:border-[#A7C4B0] transition-colors flex-shrink-0"
                                    >
                                        <SmartImage src={pet.image} className="w-full h-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="hidden md:flex items-center justify-center">
                        <Plus className="text-white/15" size={24} />
                    </div>

                    <div className="space-y-3">
                        <div className={`rounded-2xl border bg-[#151815] p-4 ${identityImages.length > 0 ? 'border-[#A7C4B0]/70 ring-1 ring-[#A7C4B0]/30' : 'border-white/10'}`}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-xs uppercase tracking-widest text-white/50">Identity (Pet)</div>
                                    <div className="flex items-center gap-2">
                                        <div className="text-sm font-semibold text-white/90">Cloning accuracy</div>
                                        <span className="text-[10px] uppercase tracking-widest text-[#A7C4B0]">Required</span>
                                    </div>
                                </div>
                                <label className="text-xs font-semibold uppercase text-[#A7C4B0] hover:text-[#B8D3C2] cursor-pointer">
                                    <Upload className="inline-block mr-1" size={12} />
                                    Add
                                    <input type="file" className="hidden" accept="image/*" multiple onChange={handleIdentityUpload} />
                                </label>
                            </div>
        
                            {identityImages.length > 0 ? (
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {identityImages.map((image) => (
                                        <div key={image.id} className="relative h-14 w-14 rounded-xl overflow-hidden border border-white/10 bg-black/30">
                                            <img src={image.url} alt={image.name} className="w-full h-full object-cover" />
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveIdentity(image.id)}
                                                className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-black/70 text-white/70 hover:text-white flex items-center justify-center"
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="mt-4 text-sm text-white/60">
                                    Add at least 1 pet photo (required). More angles = stronger identity lock.
                                </div>
                            )}
        
                            <p className="mt-3 text-[10px] text-white/50">
                                {identityImages.length}/{MAX_IDENTITY_IMAGES} identity images
                            </p>
                        </div>

                        <div className={`rounded-2xl border bg-[#151815] p-4 ${sceneImages.length > 0 ? 'border-[#A7C4B0]/70 ring-1 ring-[#A7C4B0]/30' : 'border-white/10'}`}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-xs uppercase tracking-widest text-white/50">Scene (Owner/Location)</div>
                                    <div className="text-sm font-semibold text-white/90">Background + props</div>
                                </div>
                                <label className="text-xs font-semibold uppercase text-[#A7C4B0] hover:text-[#B8D3C2] cursor-pointer">
                                    <Upload className="inline-block mr-1" size={12} />
                                    Add
                                    <input type="file" className="hidden" accept="image/*" multiple onChange={handleSceneUpload} />
                                </label>
                            </div>
        
                            {sceneImages.length > 0 ? (
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {sceneImages.map((image) => (
                                        <div key={image.id} className="relative h-14 w-14 rounded-xl overflow-hidden border border-white/10 bg-black/30">
                                            <img src={image.url} alt={image.name} className="w-full h-full object-cover" />
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveScene(image.id)}
                                                className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-black/70 text-white/70 hover:text-white flex items-center justify-center"
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="mt-4 text-sm text-white/60">
                                    Add owner or location photos to guide the scene only.
                                </div>
                            )}
        
                            <p className="mt-3 text-[10px] text-white/50">
                                {sceneImages.length}/{MAX_SCENE_IMAGES} scene images
                            </p>
                        </div>
                    </div>
                </div>
    
                <div className="grid md:grid-cols-2 gap-4">
                    <div className="rounded-2xl border border-white/10 bg-[#151815] p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-xs uppercase tracking-widest text-white/50">Style</div>
                                <div className="text-sm font-semibold text-white/90">Pick a viral look</div>
                            </div>
                            <span className="text-[10px] uppercase text-white/50">Tap to select</span>
                        </div>
    
                        <div className="mt-3 grid grid-cols-2 gap-3">
                            {TEMPLATE_STYLES.map((style) => {
                                const isSelected = selectedStyle?.id === style.id;
                                return (
                                    <button
                                        key={style.id}
                                        type="button"
                                        onClick={() => setSelectedStyle(style)}
                                        className={`rounded-xl border p-3 text-left transition-all ${isSelected ? 'border-[#A7C4B0]/70 bg-[#1A1F1B] ring-1 ring-[#A7C4B0]/30' : 'border-white/10 hover:border-white/30'}`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-base">{style.icon}</span>
                                            {isSelected && <span className="text-[10px] uppercase text-[#A7C4B0]">Selected</span>}
                                        </div>
                                        <div className="mt-2 text-sm font-semibold text-white/90">{style.name}</div>
                                        <div className="text-[10px] text-white/50 line-clamp-2">{style.description}</div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
    
                    <div className="rounded-2xl border border-white/10 bg-[#151815] p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-xs uppercase tracking-widest text-white/50">Prompt</div>
                                    <div className="text-sm font-semibold text-white/90">Describe the moment</div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowAdvanced((prev) => !prev)}
                                    className="text-xs text-white/60 hover:text-white"
                                >
                                    {showAdvanced ? 'Hide' : 'Show'}
                                </button>
                            </div>
    
                        {showAdvanced && (
                            <div className="mt-3 space-y-3">
                                <div className="flex flex-wrap items-center gap-2 text-xs text-white/60">
                                    <button
                                        type="button"
                                        onClick={() => setIdentityLock((prev) => !prev)}
                                        className={`px-3 py-1 rounded-full border text-xs font-semibold transition-colors ${identityLock ? 'border-[#A7C4B0] bg-[#1A1F1B] text-[#A7C4B0]' : 'border-white/10 text-white/60 hover:border-white/30'}`}
                                    >
                                        Identity Lock: {identityLock ? 'High' : 'Off'}
                                    </button>
                                    <span>Use 1-{MAX_IDENTITY_IMAGES} pet photos (required) for cloning-level accuracy.</span>
                                </div>
                                <div>
                                    <div className="text-[10px] uppercase tracking-widest text-white/50">Subject</div>
                                    <input
                                        value={subjectText}
                                        onChange={(e) => setSubjectText(e.target.value)}
                                        placeholder="Thai Ridgeback, Bengal cat, macaw..."
                                        className="mt-1 w-full h-9 rounded-lg bg-[#101210] border border-white/10 px-3 text-sm text-white/90 placeholder:text-white/40 focus:outline-none focus:border-[#A7C4B0]"
                                    />
                                </div>
                                <div>
                                    <div className="text-[10px] uppercase tracking-widest text-white/50">Preset</div>
                                    <select
                                        value={selectedPromptTemplateId}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            setSelectedPromptTemplateId(value);
                                            if (value === 'custom') return;
                                            if (value === 'default') {
                                                setPromptText(applyPromptTemplate(DEFAULT_IMAGE_PROMPT));
                                                return;
                                            }
                                            const allPresets = [...THAI_PROMPT_TEMPLATES, ...TREND_PROMPT_TEMPLATES, ...PROMPT_TEMPLATES];
                                            const selected = allPresets.find((preset) => preset.id === value);
                                            if (selected) setPromptText(applyPromptTemplate(selected.prompt));
                                        }}
                                        className="mt-1 w-full h-10 rounded-lg bg-[#101210] border border-white/10 px-3 text-sm text-white/90 focus:outline-none focus:border-[#A7C4B0]"
                                    >
                                        <option value="default">Default (Clean Studio)</option>
                                        <option value="custom">Custom</option>
                                        <optgroup label="Thai Presets">
                                            {THAI_PROMPT_TEMPLATES.map((template) => (
                                                <option key={template.id} value={template.id}>{template.label}</option>
                                            ))}
                                        </optgroup>
                                        <optgroup label="Trend Presets">
                                            {TREND_PROMPT_TEMPLATES.map((template) => (
                                                <option key={template.id} value={template.id}>{template.label}</option>
                                            ))}
                                        </optgroup>
                                        <optgroup label="Classic Presets">
                                            {PROMPT_TEMPLATES.map((template) => (
                                                <option key={template.id} value={template.id}>{template.label}</option>
                                            ))}
                                        </optgroup>
                                    </select>
                                </div>
                                <textarea
                                    value={promptText}
                                    onChange={(e) => {
                                        setPromptText(e.target.value);
                                        setSelectedPromptTemplateId('custom');
                                    }}
                                    placeholder="Example: cinematic portrait, soft rim light, cozy studio, 4:5 vertical"
                                    maxLength={240}
                                    className="w-full min-h-[90px] rounded-xl bg-[#101210] border border-white/10 px-3 py-2 text-sm text-white/90 placeholder:text-white/40 focus:outline-none focus:border-[#A7C4B0]"
                                />
                                <div className="flex items-center justify-between text-[10px] text-white/50">
                                    <span>Max 240 characters.</span>
                                    {selectedStyle && <span>Style: {selectedStyle.name}</span>}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
    

        
                </div>
    
            {/* Magic Studio Footer */}
            <div className="sticky bottom-0 z-30 border-t border-white/10 bg-[#101210]/95 px-4 sm:px-6 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-white/50">
                4:5 Portrait | HD | Share-ready
            </div>
            <div className="flex flex-col items-start sm:items-end gap-1">
                <button
                    disabled={!canGenerateImage || isGenerating}
                    onClick={handleGenerate}
                    className="w-full sm:w-auto px-10 py-3 bg-[#A7C4B0] text-[#0F1110] rounded-full font-semibold text-sm sm:text-base hover:bg-[#B8D3C2] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-3"
                >
                    {isGenerating ? (
                        <>
                            <Loader2 className="animate-spin" />
                            Painting...
                        </>
                    ) : (
                        <>
                            Generate Image
                        </>
                    )}
                </button>
                <span className="text-[10px] text-white/50">{actionHint}</span>
                {generationError && (
                    <span className="text-[10px] text-red-400">{generationError}</span>
                )}
            </div>
        </div>
    </div>
        </div>
    </DialogContent>
</Dialog>
);
};

export default CreateMagicAdModal;
