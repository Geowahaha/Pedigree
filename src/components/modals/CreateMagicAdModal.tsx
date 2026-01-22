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

const PROMPT_PRESETS = [
    'Cute moment, playful energy, 10-12s',
    'Problem and solution, warm ending',
    'Cozy, calm, family-friendly vibe'
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
    const [products, setProducts] = useState<MagicAdProduct[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
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

    const [showAdvanced, setShowAdvanced] = useState(false);
    const [promptText, setPromptText] = useState('');
    const isAdmin = user?.profile?.role === 'admin';
    const canUseAnyAffiliate = Boolean(isAdmin || user?.profile?.verified_breeder);
    const canGenerateVideo = Boolean(isAdmin || user?.profile?.verified_breeder);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const selectionStep: 'pet' | 'product' | 'ready' = selectedPet ? (selectedProduct ? 'ready' : 'product') : 'pet';
    const searchPlaceholder = selectionStep === 'pet'
        ? 'Search pets or paste a pet link'
        : selectionStep === 'product'
            ? 'Search products or paste an affiliate link'
            : 'Search pets/products or paste a link';
    const suggestedLabel = selectionStep === 'pet' ? 'Pet picks' : selectionStep === 'product' ? 'Product picks' : 'Suggested for you';
    const stepHint = selectionStep === 'pet'
        ? 'Step 1: choose a pet'
        : selectionStep === 'product'
            ? 'Step 2: choose a product'
            : 'Ready to generate';
    const searchStatusLabel = selectionStep === 'pet'
        ? 'Searching pets...'
        : selectionStep === 'product'
            ? 'Searching products...'
            : 'Searching pets and products...';
    const permissionHint = !user
        ? 'Sign in to use AI video generation.'
        : !canGenerateVideo
            ? 'AI video generation is available for Pro/Admin accounts only.'
            : null;
    const actionHint = permissionHint ?? (!selectedPet
        ? 'Select a pet to continue.'
        : !selectedProduct
            ? 'Select a product to continue.'
            : 'Ready to generate.');

    useEffect(() => {
        if (isOpen) fetchProducts();
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) {
            setSelectedPet(null);
            setSelectedProduct(null);
            setIsGenerating(false);
            setResultVideoUrl(null);
            setGenerationError(null);
            setSearchQuery('');
            setLastDetection(null);
            setRemotePetResults([]);
            setRemoteProductResults([]);
            setIsSearching(false);
            setSearchError(null);
            setShowAdvanced(false);
            setPromptText('');
            setAudioMode('auto');
            setSunoLink('');
            setAudioFile(null);
            setAudioStatus('idle');
            generationTokenRef.current += 1;
        }
    }, [isOpen]);

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

    useEffect(() => {
        if (selectionStep === 'product') {
            searchInputRef.current?.focus();
        }
    }, [selectionStep]);

    const fetchProducts = async () => {
        const { data, error } = await supabase.from('marketplace_listings').select('*').limit(30);
        if (error) {
            console.error('Error fetching products:', error);
            return;
        }
        if (data) setProducts(data as MagicAdProduct[]);
    };

    const allPets = useMemo(() => [...localPets, ...userPets], [localPets, userPets]);
    useEffect(() => {
        const mixed: SuggestionItem[] = [
            ...allPets.map((pet) => ({ type: 'pet', pet })),
            ...products.map((product) => ({ type: 'product', product }))
        ];
        setSuggestions(shuffleArray(mixed).slice(0, 6));
    }, [allPets, products, suggestionSeed]);

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
                    searchMarketplaceProducts(query)
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
    }, [searchQuery]);

    const localPetMatches = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return [] as Pet[];
        return allPets.filter((pet) =>
            [pet.name, pet.breed, pet.location].some((val) => val?.toLowerCase().includes(query))
        );
    }, [searchQuery, allPets]);

    const localProductMatches = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return [] as MagicAdProduct[];
        return products.filter((product) =>
            [product.title, product.description, product.category].some((val) => val?.toLowerCase().includes(query))
        );
    }, [searchQuery, products]);

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
        localProductMatches.slice(0, 6).forEach(addProduct);
        remoteProductResults.forEach(addProduct);

        return Array.from(map.values()).slice(0, 12);
    }, [searchQuery, localPetMatches, localProductMatches, remotePetResults, remoteProductResults]);

    const filteredSuggestions = useMemo(() => {
        if (selectionStep === 'pet') return suggestions.filter((item) => item.type === 'pet');
        if (selectionStep === 'product') return suggestions.filter((item) => item.type === 'product');
        return suggestions;
    }, [suggestions, selectionStep]);

    const filteredSearchResults = useMemo(() => {
        if (selectionStep === 'pet') return searchResults.filter((item) => item.type === 'pet');
        if (selectionStep === 'product') return searchResults.filter((item) => item.type === 'product');
        return searchResults;
    }, [searchResults, selectionStep]);

    const handleSelectPet = (pet: Pet) => {
        setSelectedPet(pet);
        setSearchQuery('');
    };

    const handleSelectProduct = (product: MagicAdProduct) => {
        setSelectedProduct(product);
        setSearchQuery('');
    };

    const handleDetectedUrl = (url: URL, forcedType?: UrlType) => {
        const type = forcedType ?? classifyUrl(url);

        if (type === 'audio') {
            setAudioMode('suno');
            setSunoLink(url.href);
            setSearchQuery('');
        } else if (type === 'pet') {
            const newPet = buildPetFromUrl(url.href, isVideoLink(url) ? 'video' : 'image');
            setLocalPets((prev) => [newPet, ...prev]);
            handleSelectPet(newPet);
        } else {
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
        const previewUrl = URL.createObjectURL(file);
        const isVideo = file.type.startsWith('video/');
        const newPet: Pet = {
            id: `new-${Date.now()}`,
            name: 'New Pet',
            breed: 'Unknown',
            type: 'dog',
            gender: 'male',
            image: isVideo ? undefined : previewUrl,
            media_type: isVideo ? 'video' : 'image',
            video_url: isVideo ? previewUrl : undefined,
            location: 'Bangkok',
            owner_id: 'current-user'
        };
        setLocalPets((prev) => [newPet, ...prev]);
        setSelectedPet(newPet);
        e.target.value = '';
    };

    const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setAudioMode('upload');
        setAudioFile(file);
        e.target.value = '';
    };

    const handleGenerate = async () => {
        if (!selectedPet || !selectedProduct) return;
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

        const fallbackPrompt = promptText.trim().length > 0
            ? promptText.trim()
            : `Short 10-12s vertical ad featuring ${selectedPet.name} with ${selectedProduct.title}.`;

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
    };

    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = resultVideoUrl || '';
        link.download = `MagicAd-${selectedPet?.name || 'Pet'}.mp4`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleShare = async () => {
        if (!resultVideoUrl) return;
        try {
            await navigator.clipboard?.writeText(resultVideoUrl);
        } catch (error) {
            console.error('Unable to copy link:', error);
        }
    };

    if (resultVideoUrl) {
        return (
            <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
                <DialogContent className="sm:max-w-md bg-transparent border-none shadow-none p-0 flex flex-col items-center justify-center focus:outline-none">
                    <div className="bg-[#0D0D0D] border border-purple-500/50 rounded-3xl overflow-hidden shadow-2xl shadow-purple-500/20 w-full relative animate-in zoom-in-95 duration-300">
                        <div className="absolute top-4 right-4 z-20 bg-green-500/90 text-black text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                            Sponsored live
                        </div>

                        <div className="aspect-[9/16] w-full bg-black relative">
                            <video
                                src={resultVideoUrl}
                                className="w-full h-full object-cover"
                                autoPlay
                                loop
                                muted
                                playsInline
                            />
                            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-6 pt-20 text-center">
                                <h3 className="text-2xl font-bold text-white mb-1">Magic Ad Ready</h3>
                                <p className="text-gray-300 text-sm">Your sponsored card is live on the feed.</p>
                            </div>
                        </div>

                        <div className="p-4 bg-[#1A1A1A] flex gap-3">
                            <button onClick={handleDownload} className="flex-1 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors">
                                <Upload className="rotate-180" size={18} /> Download
                            </button>
                            <button onClick={handleShare} className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-purple-600/20">
                                Copy Link
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
            <DialogContent className="sm:max-w-5xl bg-[#0D0D0D] border border-purple-500/20 text-white p-0 shadow-2xl z-[60]">
                <div className="relative max-h-[90vh] overflow-y-auto">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

                <DialogHeader className="px-6 pt-6">
                    <DialogTitle className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-sm font-bold">AI</span>
                        Magic Ad Creator
                    </DialogTitle>
                    <p className="text-gray-400 mt-2">Pick a pet, pick a product, and generate a 10-12s sponsored video.</p>
                </DialogHeader>

                <div className="relative px-6 pb-8 mt-6">
                    <div className="absolute left-6 right-6 -top-4 z-20">
                        <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-3 shadow-lg backdrop-blur">
                            <Search className="h-4 w-4 text-gray-400" />
                            <input
                                ref={searchInputRef}
                                value={searchQuery}
                                onChange={(e) => handleSearchChange(e.target.value)}
                                onPaste={handleSearchPaste}
                                onKeyDown={handleSearchKeyDown}
                                placeholder={searchPlaceholder}
                                className="flex-1 bg-transparent text-sm text-white placeholder:text-gray-500 focus:outline-none"
                            />
                            <button
                                type="button"
                                onClick={() => setSuggestionSeed((prev) => prev + 1)}
                                className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-gray-200 hover:bg-white/20 transition-colors"
                            >
                                <Shuffle className="h-3 w-3" />
                                Shuffle
                            </button>
                        </div>

                        {lastDetection && (
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-400">
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
                                        <button
                                            type="button"
                                            onClick={() => handleManualRoute('audio')}
                                            className="px-2 py-1 rounded-full border border-white/10 hover:border-white/30 text-white/80"
                                        >
                                            Use as audio
                                        </button>
                                    </>
                                )}
                            </div>
                        )}

                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                            <div className={`flex items-center justify-between rounded-xl border px-3 py-2 ${selectedPet ? 'border-purple-500/60 bg-purple-500/10' : 'border-white/10 bg-white/5 text-gray-400'}`}>
                                <div>
                                    <div className="text-[10px] uppercase tracking-widest text-gray-500">Pet</div>
                                    <div className="text-sm font-semibold text-white">{selectedPet ? selectedPet.name : 'Choose a pet'}</div>
                                </div>
                                {selectedPet ? (
                                    <button
                                        type="button"
                                        onClick={() => setSelectedPet(null)}
                                        className="text-[10px] uppercase tracking-widest text-gray-300 hover:text-white"
                                    >
                                        Change
                                    </button>
                                ) : (
                                    <span className="text-[10px] text-gray-500">Step 1</span>
                                )}
                            </div>
                            <div className={`flex items-center justify-between rounded-xl border px-3 py-2 ${selectedProduct ? 'border-pink-500/60 bg-pink-500/10' : 'border-white/10 bg-white/5 text-gray-400'} ${!selectedPet && !selectedProduct ? 'opacity-70' : ''}`}>
                                <div>
                                    <div className="text-[10px] uppercase tracking-widest text-gray-500">Product</div>
                                    <div className="text-sm font-semibold text-white">
                                        {selectedProduct ? selectedProduct.title : selectedPet ? 'Choose a product' : 'Select a pet first'}
                                    </div>
                                </div>
                                {selectedProduct ? (
                                    <button
                                        type="button"
                                        onClick={() => setSelectedProduct(null)}
                                        className="text-[10px] uppercase tracking-widest text-gray-300 hover:text-white"
                                    >
                                        Change
                                    </button>
                                ) : (
                                    <span className="text-[10px] text-gray-500">{selectedPet ? 'Step 2' : 'Locked'}</span>
                                )}
                            </div>
                        </div>
                        <div className="mt-2 text-xs text-gray-500">{stepHint}</div>
                    </div>

                    <div className={`pt-24 transition ${searchQuery ? 'opacity-40' : 'opacity-100'}`}>
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs uppercase tracking-widest text-gray-500">{suggestedLabel}</span>
                            <span className="text-[10px] text-gray-500">{selectionStep === 'pet' ? 'Pets' : selectionStep === 'product' ? 'Products' : 'Mixed'}</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {filteredSuggestions.map((item, index) => (
                                item.type === 'pet' ? (
                                    <button
                                        key={`pet-${item.pet.id}-${index}`}
                                        type="button"
                                        onClick={() => handleSelectPet(item.pet)}
                                        className={`group rounded-2xl border bg-[#121212] p-2 text-left transition-all ${selectedPet?.id === item.pet.id ? 'border-purple-500/70 ring-2 ring-purple-500/40' : 'border-white/10 hover:border-white/30 hover:-translate-y-0.5'} shadow-[0_8px_24px_-18px_rgba(0,0,0,0.9)]`}
                                    >
                                        <div className="aspect-square rounded-lg bg-black/40 overflow-hidden">
                                            <SmartImage src={item.pet.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                        </div>
                                        <div className="mt-2 text-xs font-semibold text-white line-clamp-1">{item.pet.name}</div>
                                        <div className="text-[10px] uppercase tracking-widest text-gray-500">{item.pet.breed || 'Pet'}</div>
                                    </button>
                                ) : (
                                    <button
                                        key={`product-${item.product.id}-${index}`}
                                        type="button"
                                        onClick={() => handleSelectProduct(item.product)}
                                        className={`group rounded-2xl border bg-[#121212] p-2 text-left transition-all ${selectedProduct?.id === item.product.id ? 'border-pink-500/70 ring-2 ring-pink-500/40' : 'border-white/10 hover:border-white/30 hover:-translate-y-0.5'} shadow-[0_8px_24px_-18px_rgba(0,0,0,0.9)]`}
                                    >
                                        <div className="aspect-square rounded-lg bg-black/40 overflow-hidden">
                                            {getProductImage(item.product) ? (
                                                <img src={getProductImage(item.product)} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">No image</div>
                                            )}
                                        </div>
                                        <div className="mt-2 text-xs font-semibold text-white line-clamp-1">{item.product.title}</div>
                                        <div className="text-[10px] uppercase tracking-widest text-gray-500">
                                            {item.product.price > 0 ? `${item.product.currency} ${item.product.price}` : 'Affiliate'}
                                        </div>
                                    </button>
                                )
                            ))}
                        </div>
                    </div>

                    {searchQuery && (
                        <div className="absolute left-6 right-6 top-20 z-30">
                            <div className="rounded-2xl border border-white/10 bg-[#111111] p-3 shadow-2xl">
                                {isSearching && (
                                    <div className="px-4 py-2 text-xs text-gray-500">
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
                                                    className={`group rounded-2xl border bg-[#121212] p-2 text-left transition-all ${selectedPet?.id === item.pet.id ? 'border-purple-500/70 ring-2 ring-purple-500/40' : 'border-white/10 hover:border-white/30 hover:-translate-y-0.5'} shadow-[0_8px_24px_-18px_rgba(0,0,0,0.9)]`}
                                                >
                                                    <div className="aspect-square rounded-lg bg-black/40 overflow-hidden">
                                                        <SmartImage src={item.pet.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                                    </div>
                                                    <div className="mt-2 text-xs font-semibold text-white line-clamp-1">{item.pet.name}</div>
                                                    <div className="text-[10px] uppercase tracking-widest text-gray-500">{item.pet.breed || 'Pet'}</div>
                                                </button>
                                            ) : (
                                                <button
                                                    key={`result-product-${item.product.id}-${index}`}
                                                    type="button"
                                                    onClick={() => handleSelectProduct(item.product)}
                                                    className={`group rounded-2xl border bg-[#121212] p-2 text-left transition-all ${selectedProduct?.id === item.product.id ? 'border-pink-500/70 ring-2 ring-pink-500/40' : 'border-white/10 hover:border-white/30 hover:-translate-y-0.5'} shadow-[0_8px_24px_-18px_rgba(0,0,0,0.9)]`}
                                                >
                                                    <div className="aspect-square rounded-lg bg-black/40 overflow-hidden">
                                                        {getProductImage(item.product) ? (
                                                            <img src={getProductImage(item.product)} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">No image</div>
                                                        )}
                                                    </div>
                                                    <div className="mt-2 text-xs font-semibold text-white line-clamp-1">{item.product.title}</div>
                                                    <div className="text-[10px] uppercase tracking-widest text-gray-500">
                                                        {item.product.price > 0 ? `${item.product.currency} ${item.product.price}` : 'Affiliate'}
                                                    </div>
                                                </button>
                                            )
                                        ))}
                                    </div>
                                ) : (
                                    !isSearching && (
                                        <div className="px-4 py-6 text-center text-sm text-gray-400">
                                            No matches yet. Paste a link or try another keyword.
                                        </div>
                                    )
                                )}
                            </div>
                        </div>
                    )}
                </div>
                <div className="px-6 pb-24 grid gap-6">
                    <div className="grid md:grid-cols-[1fr_auto_1fr] gap-4 items-stretch">
                        <div className={`rounded-2xl border bg-[#121212] p-4 shadow-[0_12px_30px_-24px_rgba(0,0,0,0.9)] ${selectedPet ? 'border-purple-500/70 ring-1 ring-purple-500/40' : 'border-white/10'}`}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-xs uppercase tracking-widest text-gray-500">Pet</div>
                                    <div className="text-sm font-semibold">Select your star</div>
                                </div>
                                {selectedPet ? (
                                    <button
                                        type="button"
                                        onClick={() => setSelectedPet(null)}
                                        className="text-xs text-gray-400 hover:text-white"
                                    >
                                        Clear
                                    </button>
                                ) : (
                                    <label className="text-xs font-semibold uppercase text-purple-300 hover:text-purple-200 cursor-pointer">
                                        <Upload className="inline-block mr-1" size={12} />
                                        Upload
                                        <input type="file" className="hidden" accept="image/*,video/*" onChange={handlePetUpload} />
                                    </label>
                                )}
                            </div>

                            {selectedPet ? (
                                <div className="mt-4 flex items-center gap-3">
                                    <div className="h-16 w-16 rounded-xl overflow-hidden bg-black/40">
                                        <SmartImage src={selectedPet.image || selectedPet.video_url} className="w-full h-full object-cover" />
                                    </div>
                                    <div>
                                        <div className="text-lg font-semibold">{selectedPet.name}</div>
                                        <div className="text-xs text-gray-400">{selectedPet.breed || 'Unknown breed'}</div>
                                        {selectedPet.media_type === 'video' && (
                                            <div className="text-[10px] uppercase tracking-widest text-purple-300 mt-1">Video</div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="mt-4 text-sm text-gray-400">
                                    Use search or upload a new pet photo.
                                </div>
                            )}

                            {!selectedPet && allPets.length > 0 && (
                                <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                                    {allPets.slice(0, 6).map((pet) => (
                                        <button
                                            key={`quick-pet-${pet.id}`}
                                            type="button"
                                            onClick={() => handleSelectPet(pet)}
                                            className="h-12 w-12 rounded-xl overflow-hidden border border-white/10 hover:border-purple-500 transition-colors flex-shrink-0"
                                        >
                                            <SmartImage src={pet.image} className="w-full h-full object-cover" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="hidden md:flex items-center justify-center">
                            <Plus className="text-white/20" size={28} />
                        </div>

                        <div className={`rounded-2xl border bg-[#121212] p-4 shadow-[0_12px_30px_-24px_rgba(0,0,0,0.9)] ${selectedProduct ? 'border-pink-500/70 ring-1 ring-pink-500/40' : 'border-white/10'}`}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-xs uppercase tracking-widest text-gray-500">Product</div>
                                    <div className="text-sm font-semibold">Select a product</div>
                                </div>
                                {selectedProduct ? (
                                    <button
                                        type="button"
                                        onClick={() => setSelectedProduct(null)}
                                        className="text-xs text-gray-400 hover:text-white"
                                    >
                                        Clear
                                    </button>
                                ) : (
                                    <span className="text-xs text-gray-400">
                                        {canUseAnyAffiliate ? 'Paste any affiliate link or search' : 'Paste Shopee/Lazada/Clickbank link or search'}
                                    </span>
                                )}
                            </div>

                            {selectedProduct ? (
                                <div className="mt-4 flex items-center gap-3">
                                    <div className="h-16 w-16 rounded-xl overflow-hidden bg-black/40">
                                        {getProductImage(selectedProduct) ? (
                                            <img src={getProductImage(selectedProduct)} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">No image</div>
                                        )}
                                    </div>
                                    <div>
                                        <div className="text-lg font-semibold line-clamp-1">{selectedProduct.title}</div>
                                        <div className="text-xs text-gray-400">
                                            {selectedProduct.price > 0 ? `${selectedProduct.currency} ${selectedProduct.price}` : 'Affiliate link ready'}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="mt-4 text-sm text-gray-400">
                                    Pick a product to promote with your pet video.
                                </div>
                            )}

                            {!selectedProduct && products.length > 0 && (
                                <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                                    {products.slice(0, 6).map((product) => (
                                        <button
                                            key={`quick-product-${product.id}`}
                                            type="button"
                                            onClick={() => handleSelectProduct(product)}
                                            className="h-12 w-12 rounded-xl overflow-hidden border border-white/10 hover:border-pink-500 transition-colors flex-shrink-0"
                                        >
                                            {getProductImage(product) ? (
                                                <img src={getProductImage(product)} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-500">No</div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-xs uppercase tracking-widest text-gray-500">Audio</div>
                                    <div className="text-sm font-semibold">Music and sound</div>
                                </div>
                                <span className="text-[10px] uppercase text-gray-500">Auto default</span>
                            </div>

                            <div className="mt-3 flex flex-wrap gap-2">
                                {['auto', 'suno', 'upload', 'none'].map((mode) => (
                                    <button
                                        key={mode}
                                        type="button"
                                        onClick={() => setAudioMode(mode as typeof audioMode)}
                                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${audioMode === mode ? 'bg-purple-600 border-purple-500 text-white' : 'bg-white/5 border-white/10 text-gray-300 hover:border-white/30'}`}
                                    >
                                        {mode === 'auto' && 'Auto-match'}
                                        {mode === 'suno' && 'Suno link'}
                                        {mode === 'upload' && 'Upload'}
                                        {mode === 'none' && 'No music'}
                                    </button>
                                ))}
                            </div>

                            {audioMode === 'auto' && (
                                <p className="mt-3 text-xs text-gray-400">
                                    Auto-match a royalty-free track and sound effects.
                                </p>
                            )}

                            {audioMode === 'suno' && (
                                <div className="mt-3 space-y-2">
                                    <input
                                        value={sunoLink}
                                        onChange={(e) => setSunoLink(e.target.value)}
                                        placeholder="Paste Suno or audio link"
                                        className="w-full h-9 rounded-lg bg-black/40 border border-white/10 px-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500"
                                    />
                                    <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
                                        <a
                                            href={SUNO_AFFILIATE_URL}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="px-2 py-1 rounded-full border border-white/10 hover:border-white/30 text-white/80"
                                        >
                                            Create with Suno
                                        </a>
                                        {audioStatus === 'fetching' && <span>Auto-fetching audio...</span>}
                                        {audioStatus === 'ready' && <span>Audio ready to use.</span>}
                                        {audioStatus === 'idle' && <span>Paste a link to auto-fetch.</span>}
                                    </div>
                                    <p className="text-[10px] text-gray-500">
                                        If fetch fails, open Suno and upload the track.
                                    </p>
                                </div>
                            )}

                            {audioMode === 'upload' && (
                                <div className="mt-3">
                                    <label className="inline-flex items-center gap-2 text-xs font-semibold uppercase text-purple-300 hover:text-purple-200 cursor-pointer">
                                        <Upload className="inline-block" size={12} />
                                        Upload audio
                                        <input type="file" className="hidden" accept="audio/*" onChange={handleAudioUpload} />
                                    </label>
                                    {audioFile && <div className="mt-2 text-xs text-gray-400">Selected: {audioFile.name}</div>}
                                </div>
                            )}

                            {audioMode === 'none' && (
                                <p className="mt-3 text-xs text-gray-400">Muted ad, no background music.</p>
                            )}
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-xs uppercase tracking-widest text-gray-500">Advanced</div>
                                    <div className="text-sm font-semibold">Prompt (optional)</div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowAdvanced((prev) => !prev)}
                                    className="text-xs text-gray-400 hover:text-white"
                                >
                                    {showAdvanced ? 'Hide' : 'Show'}
                                </button>
                            </div>

                            {showAdvanced && (
                                <div className="mt-3 space-y-3">
                                    <textarea
                                        value={promptText}
                                        onChange={(e) => setPromptText(e.target.value)}
                                        placeholder="Example: playful puppy tries new chew toy, cozy vibe, 12s"
                                        maxLength={240}
                                        className="w-full min-h-[90px] rounded-xl bg-black/40 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-purple-500"
                                    />
                                    <div className="flex flex-wrap gap-2">
                                        {PROMPT_PRESETS.map((preset) => (
                                            <button
                                                key={preset}
                                                type="button"
                                                onClick={() => setPromptText(preset)}
                                                className="px-3 py-1.5 rounded-full text-xs border border-white/10 text-gray-300 hover:border-white/30"
                                            >
                                                {preset}
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-[10px] text-gray-500">Max 240 characters.</p>
                                </div>
                            )}
                        </div>
                    </div>

                </div>
                <div className="sticky bottom-0 z-30 border-t border-white/10 bg-[#0D0D0D]/95 backdrop-blur px-6 py-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="text-xs text-gray-400">
                            9:16 | 10-12s | Auto-publishes as Sponsored
                        </div>
                        <div className="flex flex-col items-start sm:items-end gap-1">
                            <button
                                disabled={!selectedPet || !selectedProduct || isGenerating || !canGenerateVideo}
                                onClick={handleGenerate}
                                className="w-full sm:w-auto px-10 py-3 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full font-bold text-sm sm:text-base shadow-lg hover:shadow-purple-500/25 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-3"
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="animate-spin" />
                                        Creating video...
                                    </>
                                ) : (
                                    <>
                                        Let's see the magic
                                    </>
                                )}
                            </button>
                            <span className="text-[10px] text-gray-500">{actionHint}</span>
                            {generationError && (
                                <span className="text-[10px] text-red-400">{generationError}</span>
                            )}
                            {isGenerating && <span className="text-[10px] text-gray-500 animate-pulse">AI is building your ad...</span>}
                        </div>
                    </div>
                </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default CreateMagicAdModal;
