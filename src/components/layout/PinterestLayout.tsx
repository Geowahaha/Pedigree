/**
 * EibpoLayout - Luxury Black & Gold with Pinterest + ChatGPT UX
 * 
 * Features:
 * - Pinterest-style masonry grid for pets
 * - Left sidebar with navigation icons  
 * - Bottom-fixed ChatGPT-style search/chat bar
 * - Dark luxury theme throughout
 * - AI-powered search with LLM integration
 * 
 * RENAMED: Petdegree → Eibpo
 */

import React, { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Pet, Product, products } from '@/data/petData';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getPublicPets, Pet as DbPet, searchPets, initChat, createPet, createUserNotification } from '@/lib/database';
import { think as aiThink } from '@/lib/ai/petdegreeBrain';
import { supabase } from '@/lib/supabase';
import { triggerSocialAutomation } from '@/lib/socialAutomation';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
// import { useRealtimePets } from '@/hooks/useRealtimePets'; // DISABLED - circular dependency

// Import modals
import { ExpandablePetCard } from '../ui/ExpandablePetCard';
import SearchSection from '../SearchSection';
import MarketplaceSection from '../MarketplaceSection';
import PuppyComingSoonSection from '../PuppyComingSoonSection';
import NotificationPanel from '../NotificationPanel';
import { boostPet, BOOST_COST } from '@/lib/wallet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
// import { SmartFilterBar } from '../ui/SmartFilterBar'; // DISABLED - circular dependency
import { ThemeSwitcher } from '../ui/ThemeSwitcher';
import { EibpoMark } from '@/components/branding/EibpoLogo';
import LanguageToggle from '@/components/LanguageToggle';
import SmartImage from '@/components/ui/SmartImage';

const PetRegistrationModal = lazy(() => import('../PetRegistrationModal'));
const PedigreeModal = lazy(() => import('../modals/PedigreeModal'));
const CartModal = lazy(() => import('../modals/CartModal'));
const AuthModal = lazy(() => import('../modals/AuthModal'));
const ProductModal = lazy(() => import('../modals/ProductModal'));
const EnhancedPinterestModal = lazy(() =>
    import('../ui/EnhancedPinterestModal').then((module) => ({ default: module.EnhancedPinterestModal }))
);
const BreedingMatchModal = lazy(() => import('../modals/BreedingMatchModal'));
const BreederDashboard = lazy(() => import('../BreederDashboard'));
const AdminPanel = lazy(() => import('../AdminPanel'));
const BreederProfileModal = lazy(() => import('../modals/BreederProfileModal'));
const ChatWindow = lazy(() => import('../chat/ChatWindow'));
const WalletModal = lazy(() => import('../modals/WalletModal'));
const AddExternalCardModal = lazy(() =>
    import('../modals/AddExternalCardModal').then((module) => ({ default: module.AddExternalCardModal }))
);
const DeletePetModal = lazy(() =>
    import('../modals/DeletePetModal').then((module) => ({ default: module.DeletePetModal }))
);

// Types
interface CartItem {
    product: Product;
    quantity: number;
}

type ActiveView = 'home' | 'search' | 'products' | 'puppies' | 'breeding' | 'messages' | 'notifications' | 'chat' | 'myspace' | 'favorites';
type MobileCategoryKey = 'all' | 'dogs' | 'cats' | 'horses' | 'cattle' | 'exotic' | 'available';
type MobileTabKey = 'all' | 'dogs' | 'cats' | 'puppy-available' | 'puppy-soon' | 'horses' | 'cattle' | 'exotic';

interface SearchSuggestion {
    id: string;
    type: 'recent' | 'popular' | 'breed' | 'action';
    text: string;
    image?: string;
    action?: () => void;
}

interface MessageThread {
    roomId: string;
    targetUserId: string;
    targetUserName: string;
    avatarUrl?: string | null;
    lastMessage?: string;
    lastMessageAt?: string | null;
    lastMessageType?: 'text' | 'pet_card' | 'image';
    lastMessageMeta?: any;
    unreadCount: number;
}

interface NotificationItem {
    id: string;
    type: string;
    title: string;
    message: string;
    is_read: boolean;
    created_at: string;
    payload?: Record<string, any>;
}

interface MessageSuggestion {
    id: string;
    title: string;
    description: string;
    action: () => void;
}


interface ChatRoom {
    roomId: string;
    targetUserName: string;
    targetUserId: string;
    initialMessage?: string;
    petInfo?: { id: string; name: string; breed: string; image: string };
}

interface PinterestLayoutProps {
    initialPetId?: string; // For shared links - auto-open this pet's modal
}

const LazyModalFallback = () => (
    <div
        className="fixed bottom-6 right-6 z-[1100] flex items-center gap-2 rounded-full border border-[#C5A059]/20 bg-[#0A0A0A]/90 px-3 py-2 text-xs text-[#C5A059] shadow-lg"
        role="status"
        aria-live="polite"
    >
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-[#C5A059]/30 border-t-[#C5A059]" />
        Loading panel...
    </div>
);

// ============ EIBPO LAYOUT (Pinterest + ChatGPT) ============
const EibpoLayout: React.FC<PinterestLayoutProps> = ({ initialPetId }) => {
    const { user, savedCart, syncCart } = useAuth();
    const { language, setLanguage } = useLanguage();
    const navigate = useNavigate();
    const location = useLocation();

    // State
    const [activeView, setActiveView] = useState<ActiveView>('home');
    const [activeCategory, setActiveCategory] = useState<MobileCategoryKey>('all');
    const [activeMobileTab, setActiveMobileTab] = useState<MobileTabKey>('all');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [breedingMatchPet, setBreedingMatchPet] = useState<Pet | null>(null);
    const [allPets, setAllPets] = useState<Pet[]>([]);
    const [filteredPets, setFilteredPets] = useState<Pet[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
    const [isAiTyping, setIsAiTyping] = useState(false);
    const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'ai'; text: string; pets?: Pet[] }>>([]);
    const [isSearchMode, setIsSearchMode] = useState(false);
    const [unreadNotifications, setUnreadNotifications] = useState(0);
    const [unreadChatCount, setUnreadChatCount] = useState(0);
    const [messagePanelOpen, setMessagePanelOpen] = useState(false);
    const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);
    const [messageThreads, setMessageThreads] = useState<MessageThread[]>([]);
    const [messageLoading, setMessageLoading] = useState(false);
    const [messageError, setMessageError] = useState('');
    const [notificationItems, setNotificationItems] = useState<NotificationItem[]>([]);
    const [notificationLoading, setNotificationLoading] = useState(false);
    const [showBottomBar, setShowBottomBar] = useState(true);
    const [showMySpaceMenu, setShowMySpaceMenu] = useState(false);
    const mySpaceMenuTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [favorites, setFavorites] = useState<string[]>([]);
    const [puppyFocus, setPuppyFocus] = useState<'available' | 'coming' | null>(null);
    const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
    const [expandedCard, setExpandedCard] = useState<Pet | null>(null);
    const [mobileCreateOpen, setMobileCreateOpen] = useState(false);
    // Mobile header scroll detection - hide on scroll down, show on scroll up
    const [showMobileHeader, setShowMobileHeader] = useState(true);
    const [forceMobileHeader, setForceMobileHeader] = useState(false);
    const lastScrollTopRef = useRef(0);


    // Chat state
    const [activeChats, setActiveChats] = useState<ChatRoom[]>([]);

    // NEW: Infinite scroll for performance
    const { visibleItems: visiblePets, loadMore, hasMore } = useInfiniteScroll(filteredPets, 20);

    // NEW: Real-time pet updates (TEMPORARILY DISABLED - fixing circular dependency)
    // useRealtimePets();

    // Modal states
    const [registerModalOpen, setRegisterModalOpen] = useState(false);
    const [pedigreeModalOpen, setPedigreeModalOpen] = useState(false);
    const [cartModalOpen, setCartModalOpen] = useState(false);
    const [authModalOpen, setAuthModalOpen] = useState(false);
    const [productModalOpen, setProductModalOpen] = useState(false);
    const [petDetailsModalOpen, setPetDetailsModalOpen] = useState(false);
    const [petDetailsFocus, setPetDetailsFocus] = useState<'comments' | 'edit' | null>(null);
    const [dashboardOpen, setDashboardOpen] = useState(false);
    const [adminPanelOpen, setAdminPanelOpen] = useState(false);
    const [breederProfileOpen, setBreederProfileOpen] = useState(false);
    const [currentBreederId, setCurrentBreederId] = useState<string | null>(null);
    const [expandedMessages, setExpandedMessages] = useState(false);

    // Selected items
    const enableDesignExplorer = false;
    const [isImmersiveSearch, setIsImmersiveSearch] = useState(false);
    const [immersiveAnimation, setImmersiveAnimation] = useState<'hidden' | 'entering' | 'active' | 'exiting'>('hidden');

    // Handle Immersive Search Transition
    useEffect(() => {
        if (isImmersiveSearch) {
            setImmersiveAnimation('entering');
            setTimeout(() => setImmersiveAnimation('active'), 100);
        } else {
            if (immersiveAnimation === 'active') {
                setImmersiveAnimation('exiting');
                setTimeout(() => setImmersiveAnimation('hidden'), 500);
            }
        }
    }, [isImmersiveSearch]);
    const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

    // Wallet State
    const [walletModalOpen, setWalletModalOpen] = useState(false);
    const [addCardModalOpen, setAddCardModalOpen] = useState(false);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [petToDelete, setPetToDelete] = useState<Pet | null>(null);
    const [boostConfirmPet, setBoostConfirmPet] = useState<Pet | null>(null);
    const [isBoosting, setIsBoosting] = useState(false);

    // Pinch-to-Zoom State for Mobile
    const [zoomLevel, setZoomLevel] = useState(1);
    const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
    const initialPinchDistanceRef = useRef<number | null>(null);
    const initialZoomRef = useRef<number>(1);
    const lastPanRef = useRef({ x: 0, y: 0 });

    // Refs
    const searchInputRef = useRef<HTMLInputElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const touchStartRef = useRef<{ x: number; y: number } | null>(null);
    const touchStartTimeRef = useRef<number>(0);

    // Mobile header scroll detection - show on scroll up, hide on scroll down
    useEffect(() => {
        const handleScroll = () => {
            const container = chatContainerRef.current;
            const currentScrollTop = container
                ? container.scrollTop
                : (window.scrollY || document.documentElement.scrollTop || 0);
            const delta = currentScrollTop - lastScrollTopRef.current;

            if (forceMobileHeader) {
                setShowMobileHeader(true);
                if (currentScrollTop <= 4) {
                    setForceMobileHeader(false);
                }
                lastScrollTopRef.current = currentScrollTop;
                return;
            }

            if (delta < 0) {
                setShowMobileHeader(true);
            } else if (delta > 4 && currentScrollTop > 24) {
                setShowMobileHeader(false);
            }

            if (currentScrollTop <= 4) {
                setShowMobileHeader(true);
            }

            lastScrollTopRef.current = currentScrollTop;
        };

        const container = chatContainerRef.current;
        container?.addEventListener('scroll', handleScroll, { passive: true });
        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();
        return () => {
            container?.removeEventListener('scroll', handleScroll);
            window.removeEventListener('scroll', handleScroll);
        };
    }, [forceMobileHeader]);

    // Convert DB Pet
    const convertDbPet = (dbPet: DbPet): Pet => {
        // PRIORITY 1: Read from database columns directly (new columns)
        let mediaType = (dbPet.media_type && dbPet.media_type.trim()) || 'image';
        let videoUrl = (dbPet.video_url && dbPet.video_url.trim()) || '';
        let source = '';
        let externalLink = '';
        let descriptionText = dbPet.description || '';

        // PRIORITY 2: Fallback - parse description for metadata if columns are empty
        if ((!videoUrl || !mediaType || mediaType === 'image') && dbPet.description && dbPet.description.startsWith('{')) {
            try {
                const meta = JSON.parse(dbPet.description);
                if (typeof meta.description === 'string') descriptionText = meta.description;
                if (!mediaType || mediaType === 'image') mediaType = meta.media_type || mediaType;
                if (!videoUrl) videoUrl = meta.video_url || '';
                if (meta.source) source = meta.source;
                if (meta.external_link) externalLink = meta.external_link;
            } catch (e) {
                // Not JSON, ignore
            }
        }

        // PRIORITY 3: Fallback - Check for Regex based metadata (Legacy support)
        if (!videoUrl && dbPet.description) {
            const videoMatch = dbPet.description.match(/Video URL: (.*)/);
            if (videoMatch) videoUrl = videoMatch[1].trim();

            const mediaTypeMatch = dbPet.description.match(/Media Type: (.*)/);
            if (mediaTypeMatch) mediaType = mediaTypeMatch[1].trim();
        }

        // Auto-detect media type from video_url
        if (videoUrl && (!mediaType || mediaType === 'image')) {
            mediaType = 'video';
        }

        return {
            id: dbPet.id,
            name: dbPet.name,
            breed: dbPet.breed,
            type: dbPet.type || 'dog',
            birthDate: dbPet.birth_date,
            gender: dbPet.gender,
            image: dbPet.image_url || '',
            color: dbPet.color || '',
            registrationNumber: dbPet.registration_number || undefined,
            healthCertified: dbPet.health_certified,
            location: dbPet.location || '',
            owner: dbPet.owner?.full_name || dbPet.owner_name || 'Unknown',
            owner_id: dbPet.owner_id,
            ownership_status: dbPet.ownership_status,
            claimed_by: dbPet.claimed_by,
            claim_date: dbPet.claim_date,
            verification_evidence: dbPet.verification_evidence,
            parentIds: dbPet.pedigree ? {
                sire: dbPet.pedigree.sire_id || undefined,
                dam: dbPet.pedigree.dam_id || undefined
            } : undefined,
            boosted_until: dbPet.boosted_until,
            created_at: dbPet.created_at,
            media_type: mediaType as 'image' | 'video',
            video_url: videoUrl,
            source: source as 'internal' | 'instagram' | 'pinterest' | 'youtube' | undefined,
            external_link: externalLink,
            description: descriptionText,
        };
    };

    const applyCategoryFilter = (pets: Pet[], category: MobileCategoryKey): Pet[] => {
        if (category === 'all') return pets;
        if (category === 'available') return pets.filter((pet) => pet.available);
        if (category === 'dogs') return pets.filter((pet) => (pet.type || 'dog') === 'dog');
        if (category === 'cats') return pets.filter((pet) => pet.type === 'cat');
        if (category === 'horses') return pets.filter((pet) => pet.type === 'horse');
        if (category === 'cattle') return pets.filter((pet) => (pet as any).type === 'cattle');
        return pets.filter((pet) => pet.type === 'exotic');
    };

    const formatRelativeTime = (value?: string | null) => {
        if (!value) return '';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '';
        const diff = Date.now() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m`;
        if (hours < 24) return `${hours}h`;
        if (days < 7) return `${days}d`;
        return date.toLocaleDateString();
    };

    const formatMessagePreview = (thread: MessageThread) => {
        if (!thread.lastMessage) {
            return language === 'th' ? 'เริ่มต้นการสนทนา' : 'Start the conversation';
        }
        if (thread.lastMessageType === 'pet_card') {
            const petName = thread.lastMessageMeta?.petName || thread.lastMessageMeta?.pet_name;
            if (petName) {
                return language === 'th' ? `สนใจ ${petName}` : `Pet inquiry: ${petName}`;
            }
            return language === 'th' ? 'ส่งคำถามเกี่ยวกับสัตว์เลี้ยง' : 'Sent a pet inquiry';
        }
        return thread.lastMessage;
    };

    const handleBoostRequest = (pet: Pet) => {
        setBoostConfirmPet(pet);
    };

    const handleConfirmBoost = async () => {
        if (!user || !boostConfirmPet) return;
        setIsBoosting(true);
        try {
            await boostPet(user.id, boostConfirmPet.id);
            // Optimistic update
            const updatedPets = allPets.map(p => {
                if (p.id === boostConfirmPet.id) {
                    const expiry = new Date();
                    expiry.setHours(expiry.getHours() + 24);
                    return { ...p, boosted_until: expiry.toISOString() };
                }
                return p;
            });

            // RE-SORT IMMEDIATELY
            const sorted = [...updatedPets].sort((a, b) => {
                const now = new Date();
                const aBoost = a.boosted_until && new Date(a.boosted_until) > now ? 1 : 0;
                const bBoost = b.boosted_until && new Date(b.boosted_until) > now ? 1 : 0;

                if (aBoost !== bBoost) return bBoost - aBoost;
                // Fallback to Newest First
                const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
                const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
                return dateB - dateA;
            });

            setAllPets(sorted);
            setFilteredPets(sorted);
            setBoostConfirmPet(null);
            alert("Success! Your pet is now boosted 🚀");
        } catch (error: any) {
            alert(error.message || "Failed to boost");
        } finally {
            setIsBoosting(false);
        }
    };

    // External Card Handler
    const handleAddExternalCard = async (data: { link: string; caption: string; mediaType: 'image' | 'video'; autoPostFb?: boolean }) => {
        let newCard: any;

        if (!user) {
            alert("Guest Mode: Card will generally fade after refresh. Log in to save forever!");
            // Fallback to local
            newCard = {
                id: `ext-${Date.now()}`,
                name: data.caption || 'Magic Card',
                breed: 'External Import',
                type: 'dog',
                gender: 'male',
                birthDate: '2024-01-01', created_at: new Date().toISOString(),
                image: data.link,
                image_url: data.link,
                video_url: data.mediaType === 'video' ? data.link : undefined,
                media_type: data.mediaType,
                source: 'internal',
                is_public: true,
                owner_id: 'guest',
                owner: 'Guest User'
            };
            // Prepend to feed
            setAllPets(prev => [newCard, ...prev]);
            setFilteredPets(prev => [newCard, ...prev]);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        // PERMISSION CHECK: Pro (Verified) or Trial ( < 1 month account age)
        const isPro = user.profile?.verified_breeder || false;
        const joinedDate = user.profile?.created_at ? new Date(user.profile.created_at) : new Date();
        const trialEndDate = new Date(joinedDate);
        trialEndDate.setMonth(trialEndDate.getMonth() + 1);
        const isTrial = new Date() < trialEndDate;

        if (!isPro && !isTrial) {
            alert("🔒 Pro Feature Only\n\nMagic Cards are exclusive to Pro Members. Your 1-month trial has ended.\n\nPlease upgrade to continue adding Magic Cards!");
            return;
        }

        try {
            // Determine source roughly
            let source = 'internal';
            if (data.link.includes('instagram')) source = 'instagram';
            else if (data.link.includes('youtube') || data.link.includes('youtu.be')) source = 'youtube';
            else if (data.link.includes('pinterest')) source = 'pinterest';

            const savedPet = await createPet({
                name: data.caption || 'Magic Card',
                type: 'dog',
                breed: 'External Import',
                gender: 'male',
                birth_date: new Date().toISOString().split('T')[0],
                image_url: data.mediaType === 'image' ? data.link : 'https://placehold.co/600x400/1a1a1a/c5a059?text=Video', // Placeholder if video
                media_type: data.mediaType,
                video_url: data.mediaType === 'video' ? data.link : undefined,
                external_link: data.link,
                source: source as any,
                is_sponsored: false
            });
            newCard = convertDbPet(savedPet);

            // IMMEDIATE IMAGE BACKUP: Copy external image to Supabase Storage
            // Fire-and-forget - doesn't block UI, but ensures image is permanently cached
            if (data.mediaType === 'image' && data.link) {
                fetch('/api/image-cache', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ url: data.link, petId: savedPet.id })
                }).then(res => res.json())
                    .then(result => console.log('Image cached:', result.cached ? 'Supabase' : 'Proxy'))
                    .catch(err => console.warn('Image cache failed:', err));
            }

            // AUTO POST TO FACEBOOK
            if (data.autoPostFb) {
                // Determine target link
                const petLink = `${window.location.protocol}//${window.location.host}/pets/${savedPet.id}`; // Simple deep link using current host

                triggerSocialAutomation({
                    petId: savedPet.id,
                    mediaUrl: data.link,
                    description: data.caption,
                    targetPlatform: 'facebook',
                    linkBackUrl: petLink
                }).then(res => {
                    console.log("Social Post Result:", res);
                    // Optionally notify user
                    createUserNotification({
                        user_id: user.id,
                        type: 'system',
                        title: '🚀 Facebook Post Scheduled',
                        message: 'Your Magic Card is being posted to our Facebook Page!',
                        payload: { action: 'view_pet', petId: savedPet.id }
                    });
                });
            }

            // NOTIFICATION: Nudge to complete info
            await createUserNotification({
                user_id: user.id,
                type: 'system',
                title: '✨ Magic Card Added!',
                message: `Success! Now, please add full details for "${data.caption || 'your pet'}" to get the best breeding matches.`,
                payload: { action: 'edit_pet', petId: savedPet.id }
            });

            // Refresh notifications
            setTimeout(() => {
                loadNotificationCounts();
                loadNotificationItems();
            }, 1000);

        } catch (err) {
            console.error("Failed to save magic card", err);
            alert(`Failed to save to database: ${(err as Error).message || JSON.stringify(err)}. Adding locally.`);
            // Fallback to local
            newCard = {
                id: `ext-${Date.now()}`,
                name: data.caption || 'Magic Card',
                breed: 'External Import',
                type: 'dog',
                gender: 'male',
                birthDate: '2024-01-01', created_at: new Date().toISOString(),
                image: data.link,
                video_url: data.mediaType === 'video' ? data.link : undefined,
                media_type: data.mediaType,
                source: 'internal',
                is_public: true,
                owner_id: user.id,
                owner: user.profile?.full_name || 'Me'
            };
        }

        // Prepend to feed
        setAllPets(prev => [newCard, ...prev]);
        setFilteredPets(prev => [newCard, ...prev]);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Initial Load & Sort
    useEffect(() => {
        getPublicPets().then(dbPets => {
            const converted = dbPets.map(convertDbPet); // Removed slice limit for now or keep consistency?
            const sorted = [...converted].sort((a, b) => {
                const now = new Date();
                const aBoost = a.boosted_until && new Date(a.boosted_until) > now ? 1 : 0;
                const bBoost = b.boosted_until && new Date(b.boosted_until) > now ? 1 : 0;

                // 1. Boosted Status
                if (aBoost !== bBoost) return bBoost - aBoost;

                // 2. Popularity (Likes) - assuming property exists or is derived
                const aLikes = a.likes || 0;
                const bLikes = b.likes || 0;
                if (aLikes !== bLikes) return bLikes - aLikes;

                // 3. Newest First
                const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
                const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
                return dateB - dateA;
            });

            // Set pets directly without mock data (mocks removed for production)
            setAllPets(sorted);
            setFilteredPets(sorted);
        });
    }, []);

    // Auto-open pet modal from shared link
    useEffect(() => {
        if (initialPetId && allPets.length > 0) {
            const pet = allPets.find(p => p.id === initialPetId);
            if (pet) {
                handleViewPetDetails(pet);
            }
        }
    }, [initialPetId, allPets]);

    const loadMessageThreads = useCallback(async () => {
        if (!user) {
            setMessageThreads([]);
            setMessageError('');
            return;
        }
        setMessageLoading(true);
        setMessageError('');
        try {
            const { data: rooms, error: roomsError } = await supabase
                .from('chat_participants')
                .select('room_id')
                .eq('user_id', user.id);

            if (roomsError) throw roomsError;
            const roomIds = (rooms || []).map(room => room.room_id);
            if (roomIds.length === 0) {
                setMessageThreads([]);
                return;
            }

            const { data: otherParticipants, error: participantsError } = await supabase
                .from('chat_participants')
                .select('room_id, user_id')
                .in('room_id', roomIds)
                .neq('user_id', user.id);

            if (participantsError) throw participantsError;
            const otherMap = new Map<string, string>();
            const otherUserIds: string[] = [];
            (otherParticipants || []).forEach(item => {
                otherMap.set(item.room_id, item.user_id);
                if (!otherUserIds.includes(item.user_id)) {
                    otherUserIds.push(item.user_id);
                }
            });

            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, full_name, avatar_url')
                .in('id', otherUserIds);

            const profileMap = new Map<string, { full_name?: string | null; avatar_url?: string | null }>();
            (profiles || []).forEach(profile => {
                profileMap.set(profile.id, profile);
            });

            const { data: messages } = await supabase
                .from('chat_messages')
                .select('room_id, content, created_at, sender_id, message_type, metadata, is_read')
                .in('room_id', roomIds)
                .order('created_at', { ascending: false })
                .limit(200);

            const lastMessageByRoom = new Map<string, any>();
            const unreadCounts = new Map<string, number>();
            (messages || []).forEach(message => {
                if (!lastMessageByRoom.has(message.room_id)) {
                    lastMessageByRoom.set(message.room_id, message);
                }
                if (!message.is_read && message.sender_id !== user.id) {
                    unreadCounts.set(message.room_id, (unreadCounts.get(message.room_id) || 0) + 1);
                }
            });

            const threads = roomIds
                .map(roomId => {
                    const targetUserId = otherMap.get(roomId);
                    if (!targetUserId) return null;
                    const profile = profileMap.get(targetUserId);
                    const lastMessage = lastMessageByRoom.get(roomId);
                    return {
                        roomId,
                        targetUserId,
                        targetUserName: profile?.full_name || 'Member',
                        avatarUrl: profile?.avatar_url || null,
                        lastMessage: lastMessage?.content,
                        lastMessageAt: lastMessage?.created_at || null,
                        lastMessageType: lastMessage?.message_type || 'text',
                        lastMessageMeta: lastMessage?.metadata,
                        unreadCount: unreadCounts.get(roomId) || 0
                    } as MessageThread;
                })
                .filter((thread): thread is MessageThread => Boolean(thread))
                .sort((a, b) => {
                    const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
                    const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
                    return bTime - aTime;
                });

            setMessageThreads(threads);
        } catch (error) {
            console.error('Failed to load messages:', error);
            setMessageError(language === 'th' ? 'โหลดข้อความไม่สำเร็จ' : 'Failed to load messages.');
        } finally {
            setMessageLoading(false);
        }
    }, [language, user]);

    const loadNotificationItems = useCallback(async () => {
        if (!user) {
            setNotificationItems([]);
            return;
        }
        setNotificationLoading(true);
        try {
            const { data, error } = await supabase
                .from('user_notifications')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(30);

            if (error) throw error;
            setNotificationItems(data || []);
        } catch (error) {
            console.error('Failed to load notifications:', error);
        } finally {
            setNotificationLoading(false);
        }
    }, [user]);

    const renderNotificationIcon = (type: string) => {
        switch (type) {
            case 'chat_message':
                return '💬';
            case 'puppy':
                return '🐾';
            case 'breeding':
                return '🧬';
            case 'promo':
                return '🎁';
            default:
                return '🔔';
        }
    };

    const markAllNotificationsRead = async () => {
        if (!user) return;
        await supabase
            .from('user_notifications')
            .update({ is_read: true })
            .eq('user_id', user.id)
            .eq('is_read', false);
        setNotificationItems(prev => prev.map(item => ({ ...item, is_read: true })));
        loadNotificationCounts();
    };

    const closePanels = () => {
        setMessagePanelOpen(false);
        setNotificationPanelOpen(false);
    };

    const handleOpenPuppySection = (focus: 'available' | 'coming') => {
        setActiveView('puppies');
        setPuppyFocus(focus);
        closePanels();
        window.setTimeout(() => setPuppyFocus(null), 800);
    };

    const messageSuggestions: MessageSuggestion[] = [
        {
            id: 'puppy-available',
            title: language === 'th' ? 'ลูกหมาพร้อมจองตอนนี้' : 'Puppy available now',
            description: language === 'th' ? 'ดูคู่ผสมที่คลอดแล้วและติดต่อได้ทันที' : 'See litters ready to reserve now.',
            action: () => handleOpenPuppySection('available')
        },
        {
            id: 'puppy-coming',
            title: language === 'th' ? 'ลูกหมากำลังจะมา' : 'Puppy coming soon',
            description: language === 'th' ? 'ติดตามคู่ผสมที่กำลังตั้งท้อง' : 'Follow upcoming litters and due dates.',
            action: () => handleOpenPuppySection('coming')
        },
        {
            id: 'new-pets',
            title: language === 'th' ? 'สัตว์เลี้ยงมาใหม่' : 'New Pets Added',
            description: language === 'th' ? 'ดูสัตว์เลี้ยงที่เพิ่งลงประกาศล่าสุด' : 'Check out the newest listings.',
            action: () => { closePanels(); setActiveView('home'); }
        }
    ];

    const loadNotificationCounts = useCallback(async () => {
        if (!user) {
            setUnreadNotifications(0);
            setUnreadChatCount(0);
            return;
        }
        try {
            const [allUnread, chatUnread] = await Promise.all([
                supabase
                    .from('user_notifications')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', user.id)
                    .eq('is_read', false),
                supabase
                    .from('user_notifications')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', user.id)
                    .eq('type', 'chat_message')
                    .eq('is_read', false)
            ]);

            if (!allUnread.error && allUnread.count !== null) {
                setUnreadNotifications(allUnread.count);
            }
            if (!chatUnread.error && chatUnread.count !== null) {
                setUnreadChatCount(chatUnread.count);
            }
        } catch (e) {
            console.error('Failed to load notification counts:', e);
        }
    }, [user]);

    // Load unread notification count
    useEffect(() => {
        loadNotificationCounts();
    }, [loadNotificationCounts]);

    useEffect(() => {
        if (!user) return;
        const channel = supabase
            .channel(`user_notifications:${user.id}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'user_notifications', filter: `user_id=eq.${user.id}` },
                () => loadNotificationCounts()
            )
            .subscribe();

        return () => {
            channel.unsubscribe();
        };
    }, [user, loadNotificationCounts]);

    useEffect(() => {
        if (messagePanelOpen) {
            loadMessageThreads();
        }
    }, [messagePanelOpen, loadMessageThreads]);

    useEffect(() => {
        if (notificationPanelOpen) {
            loadNotificationItems();
        }
    }, [notificationPanelOpen, loadNotificationItems]);

    // Listen for openChat event from notifications
    useEffect(() => {
        const handleOpenChat = async (e: CustomEvent) => {
            const { roomId, targetUserId, targetUserName } = e.detail || {};
            if (!roomId) return;

            let resolvedTargetId = targetUserId as string | undefined;
            let resolvedTargetName = targetUserName as string | undefined;

            if (!resolvedTargetId && user) {
                const { data: participants } = await supabase
                    .from('chat_participants')
                    .select('user_id')
                    .eq('room_id', roomId)
                    .neq('user_id', user.id)
                    .limit(1);
                resolvedTargetId = participants?.[0]?.user_id;
            }

            if (resolvedTargetId && !resolvedTargetName) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('full_name')
                    .eq('id', resolvedTargetId)
                    .single();
                resolvedTargetName = profile?.full_name || 'User';
            }

            if (!resolvedTargetId) return;

            if (user) {
                await supabase
                    .from('user_notifications')
                    .update({ is_read: true })
                    .eq('user_id', user.id)
                    .eq('type', 'chat_message')
                    .eq('payload->room_id', roomId)
                    .eq('is_read', false);
                loadNotificationCounts();
            }

            setActiveChats(prev => {
                const existingChat = prev.find(c => c.roomId === roomId);
                if (existingChat) return prev;
                const newChat: ChatRoom = {
                    roomId,
                    targetUserName: resolvedTargetName || 'User',
                    targetUserId: resolvedTargetId
                };
                return [...prev.slice(-2), newChat];
            });
            setActiveView('home');
            setMessagePanelOpen(false);
            setNotificationPanelOpen(false);
        };

        window.addEventListener('openChat', handleOpenChat as EventListener);
        return () => window.removeEventListener('openChat', handleOpenChat as EventListener);
    }, [user, loadNotificationCounts]);

    useEffect(() => {
        const loadPets = async () => {
            try {
                const dbPets = await getPublicPets();
                const converted = dbPets.slice(0, 50).map(convertDbPet);
                setAllPets(converted);
                setFilteredPets(converted);
            } catch (error) {
                console.error('Failed to load pets:', error);
            }
        };
        loadPets();
    }, []);

    // Smart search suggestions
    const getSearchSuggestions = (): SearchSuggestion[] => {
        // Find เจ้าขุน or first Thai Ridgeback from database
        const jaoKhun = allPets.find(p => p.name?.includes('เจ้าขุน') || p.name?.toLowerCase().includes('khun'));
        const thaiRidgeback = allPets.find(p => p.breed?.toLowerCase().includes('thai ridgeback') || p.breed?.toLowerCase().includes('หลังอาน'));
        const goldenRetriever = allPets.find(p => p.breed?.toLowerCase().includes('golden retriever'));

        const suggestions: SearchSuggestion[] = [
            {
                id: '1',
                type: 'recent',
                text: 'Thai Ridgeback',
                image: jaoKhun?.image || thaiRidgeback?.image || 'https://images.unsplash.com/photo-1596205809930-b593282b86ab?w=100',
                action: () => executeSmartSearch('Thai Ridgeback')
            },
            {
                id: '2',
                type: 'recent',
                text: 'Golden Retriever',
                image: goldenRetriever?.image || 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=100',
                action: () => executeSmartSearch('Golden Retriever')
            },
            {
                id: '3',
                type: 'action',
                text: 'Breeding matches',
                action: () => setActiveView('breeding')
            },
            {
                id: '4',
                type: 'action',
                text: 'Puppies available',
                action: () => setActiveView('puppies')
            },
            {
                id: '5',
                type: 'popular',
                text: 'Pomeranian',
                action: () => executeSmartSearch('Pomeranian')
            },
            {
                id: '6',
                type: 'popular',
                text: 'Shiba Inu',
                action: () => executeSmartSearch('Shiba Inu')
            },
        ];
        return suggestions;
    };

    // Cart functions
    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    const addToCart = (product: Product, quantity: number = 1) => {
        setCart(prev => {
            const existing = prev.find(item => item.product.id === product.id);
            if (existing) {
                return prev.map(item =>
                    item.product.id === product.id
                        ? { ...item, quantity: item.quantity + quantity }
                        : item
                );
            }
            return [...prev, { product, quantity }];
        });
    };

    const updateCartQuantity = (productId: string, quantity: number) => {
        if (quantity <= 0) {
            setCart(prev => prev.filter(item => item.product.id !== productId));
        } else {
            setCart(prev => prev.map(item =>
                item.product.id === productId ? { ...item, quantity } : item
            ));
        }
    };

    const removeFromCart = (productId: string) => {
        setCart(prev => prev.filter(item => item.product.id !== productId));
    };

    const clearCart = () => setCart([]);

    // Favorites handling
    const handleAddToFavorites = (petId: string) => {
        setFavorites(prev => {
            const newFavorites = prev.includes(petId)
                ? prev.filter(id => id !== petId)
                : [...prev, petId];
            // Persist to localStorage
            localStorage.setItem('eibpo_favorites', JSON.stringify(newFavorites));
            return newFavorites;
        });
    };

    // Load favorites from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('eibpo_favorites');
        if (saved) {
            try {
                setFavorites(JSON.parse(saved));
            } catch (e) {
                console.error('Failed to load favorites:', e);
            }
        }
    }, []);

    useEffect(() => {
        if (isSearchMode) return;
        const next = applyCategoryFilter(allPets, activeCategory);
        setFilteredPets(next);
    }, [allPets, activeCategory, isSearchMode]);

    useEffect(() => {
        if (activeView === 'puppies') {
            setActiveMobileTab(puppyFocus === 'coming' ? 'puppy-soon' : 'puppy-available');
            return;
        }
        if (activeView === 'home') {
            const map: Record<MobileCategoryKey, MobileTabKey> = {
                all: 'all',
                dogs: 'dogs',
                cats: 'cats',
                horses: 'horses',
                cattle: 'cattle',
                exotic: 'exotic',
                available: 'puppy-available',
            };
            setActiveMobileTab(map[activeCategory] || 'all');
        }
    }, [activeView, activeCategory, puppyFocus]);

    // Handlers
    const handleRegisterClick = () => {
        if (!user) {
            setAuthModalOpen(true);
            return;
        }
        setAddCardModalOpen(true);
    };

    const handleViewPetDetails = (pet: Pet, focus?: 'comments' | 'edit' | null) => {
        setSelectedPet(pet);
        setPetDetailsFocus(focus || null);
        setPetDetailsModalOpen(true);
    };

    const handleViewPedigree = (pet: Pet) => {
        setSelectedPet(pet);
        // If called from family tree (pedigree modal is open), close it and open pet details
        if (pedigreeModalOpen) {
            setPedigreeModalOpen(false);
            // Small delay to allow modal close animation
            setTimeout(() => {
                setPetDetailsModalOpen(true);
            }, 150);
        } else {
            // If called from pet details, open pedigree modal
            setPedigreeModalOpen(true);
        }
    };

    const handleQuickView = (product: Product) => {
        setSelectedProduct(product);
        setProductModalOpen(true);
    };

    // Handle delete pet - open confirmation modal
    const handleDeleteClick = (pet: Pet) => {
        setPetToDelete(pet);
        setDeleteModalOpen(true);
    };

    // Perform actual deletion
    const handleConfirmDelete = async () => {
        if (!petToDelete) return;

        try {
            const { deletePet } = await import('@/lib/database');
            await deletePet(petToDelete.id);

            // Remove from local state
            setAllPets(prev => prev.filter(p => p.id !== petToDelete.id));
            setFilteredPets(prev => prev.filter(p => p.id !== petToDelete.id));

            // Close any open modals showing this pet
            if (selectedPet?.id === petToDelete.id) {
                setPetDetailsModalOpen(false);
                setSelectedPet(null);
            }
            if (expandedCard?.id === petToDelete.id) {
                setExpandedCard(null);
            }

            // Success - just close the modal
            setPetToDelete(null);
            setDeleteModalOpen(false);
        } catch (err: any) {
            // Re-throw with cleaner message for the modal to display
            throw new Error(err?.message || 'Failed to delete pet');
        }
    };

    const handlePetRegistered = () => {
        getPublicPets().then(dbPets => {
            const convertedPets = dbPets.slice(0, 50).map(convertDbPet);
            setAllPets(convertedPets);

            // Initial Sort: Boosted First, then Newest
            const sorted = [...convertedPets].sort((a, b) => {
                const now = new Date();
                const aBoost = a.boosted_until && new Date(a.boosted_until) > now ? 1 : 0;
                const bBoost = b.boosted_until && new Date(b.boosted_until) > now ? 1 : 0;

                if (aBoost !== bBoost) return bBoost - aBoost; // Active boosts first
                return 0; // Keep original created_at order
            });
            setFilteredPets(sorted);
        });
    };

    // Open chat with pet owner
    const handleChatWithOwner = async (pet: Pet) => {
        if (!user) {
            setAuthModalOpen(true);
            return;
        }

        if (!pet.owner_id || pet.owner_id === user.id) {
            return; // Can't chat with yourself
        }

        try {
            const roomId = await initChat(pet.owner_id);

            // Fetch owner name
            const { data: profile } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', pet.owner_id)
                .single();

            const newChat: ChatRoom = {
                roomId,
                targetUserName: profile?.full_name || pet.owner || 'Owner',
                targetUserId: pet.owner_id,
                initialMessage: language === 'th'
                    ? `สวัสดีครับ/ค่ะ ฉันสนใจสุนัขของคุณชื่อ "${pet.name}" (${pet.breed || 'ไม่ระบุสายพันธุ์'}) ครับ/ค่ะ`
                    : `Hi! I'm interested in your pet "${pet.name}" (${pet.breed || 'No breed specified'}). Is it still available?`,
                petInfo: { id: pet.id, name: pet.name, breed: pet.breed, image: pet.image }
            };

            // Check if chat already open
            if (!activeChats.find(c => c.roomId === roomId)) {
                setActiveChats(prev => [...prev, newChat]);
            }
        } catch (error) {
            console.error('Failed to open chat:', error);
        }
    };

    const handleMessageShortcut = () => {
        if (!user) {
            setAuthModalOpen(true);
            return;
        }
        setMessagePanelOpen(prev => !prev);
        setNotificationPanelOpen(false);
    };

    const handleNotificationShortcut = () => {
        if (!user) {
            setAuthModalOpen(true);
            return;
        }
        setNotificationPanelOpen(prev => !prev);
        setMessagePanelOpen(false);
    };

    const handleThreadOpen = async (thread: MessageThread) => {
        if (!user) {
            setAuthModalOpen(true);
            return;
        }
        window.dispatchEvent(new CustomEvent('openChat', {
            detail: {
                roomId: thread.roomId,
                targetUserName: thread.targetUserName,
                targetUserId: thread.targetUserId
            }
        }));
        setMessagePanelOpen(false);
    };

    const handleNotificationItemClick = async (notification: NotificationItem) => {
        if (!user) {
            setAuthModalOpen(true);
            return;
        }
        if (!notification.is_read) {
            await supabase
                .from('user_notifications')
                .update({ is_read: true })
                .eq('id', notification.id);
            setNotificationItems(prev =>
                prev.map(item => item.id === notification.id ? { ...item, is_read: true } : item)
            );
            loadNotificationCounts();
        }

        // Handle chat message notifications → Open chat
        if (notification.type === 'chat_message' && notification.payload?.room_id) {
            window.dispatchEvent(new CustomEvent('openChat', {
                detail: {
                    roomId: notification.payload.room_id,
                    targetUserName: notification.title || 'User'
                }
            }));
            setNotificationPanelOpen(false);
            return;
        }

        // Handle puppy notifications → Go to puppy section
        if (notification.type === 'puppy') {
            handleOpenPuppySection('available');
            return;
        }

        // Handle breeding notifications → Go to breeding view
        if (notification.type === 'breeding') {
            setActiveView('breeding');
            closePanels();
            return;
        }

        // Handle verification notifications → Open pedigree modal
        if (notification.type === 'verification') {
            const petId = notification.payload?.petId || notification.payload?.pet_id;
            if (petId) {
                const targetPet = allPets.find(p => p.id === petId);
                if (targetPet) {
                    setSelectedPet(targetPet);
                    setPedigreeModalOpen(true);
                    setNotificationPanelOpen(false);
                    return;
                }
            }
        }

        // Handle duplicate notifications → Open the referenced/original pet for comparison
        if (notification.payload?.referenceId) {
            const refId = notification.payload.referenceId;
            try {
                const { data: refPetData } = await supabase
                    .from('pets')
                    .select('*')
                    .eq('id', refId)
                    .single();
                if (refPetData) {
                    const convertedPet = convertDbPet(refPetData);
                    setExpandedCard(convertedPet);
                    setNotificationPanelOpen(false);
                    return;
                }
            } catch (err) {
                console.error('Failed to fetch reference pet:', err);
            }
        }

        // Handle ownership/claim notifications → Open pet for verification
        if (notification.payload?.action === 'claim' || notification.payload?.action === 'ownership') {
            const petId = notification.payload?.petId || notification.payload?.pet_id;
            if (petId) {
                await openPetById(petId);
                return;
            }
        }

        // Handle promo notifications → Navigate to relevant section
        if (notification.type === 'promo') {
            // Check for specific promo actions
            if (notification.payload?.section === 'products') {
                setActiveView('products');
            } else if (notification.payload?.section === 'puppies') {
                handleOpenPuppySection('available');
            } else {
                setActiveView('discover');
            }
            closePanels();
            return;
        }

        // Handle generic pet notifications with petId → Open pet card
        const petId = notification.payload?.petId || notification.payload?.pet_id;
        if (petId) {
            await openPetById(petId);
            return;
        }

        // Close panel for other notification types without specific actions
        setNotificationPanelOpen(false);
    };

    // Helper function to open a pet by ID
    const openPetById = async (petId: string) => {
        const targetPet = allPets.find(p => p.id === petId);
        if (targetPet) {
            setExpandedCard(targetPet);
            setNotificationPanelOpen(false);
            const petElement = document.getElementById(`pet-card-${petId}`);
            if (petElement) {
                petElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        } else {
            try {
                const { data: petData } = await supabase
                    .from('pets')
                    .select('*')
                    .eq('id', petId)
                    .single();
                if (petData) {
                    const convertedPet = convertDbPet(petData);
                    setExpandedCard(convertedPet);
                    setNotificationPanelOpen(false);
                }
            } catch (err) {
                console.error('Failed to fetch pet for notification:', err);
            }
        }
    };

    const closeChat = (roomId: string) => {
        setActiveChats(prev => prev.filter(c => c.roomId !== roomId));
    };

    // Smart Search - Filter home grid inline (PM requirement: stay on home page)
    const [activeSearchQuery, setActiveSearchQuery] = useState('');
    const [searchAiResponse, setSearchAiResponse] = useState<string | null>(null);
    const [searchAiSuggestions, setSearchAiSuggestions] = useState<string[]>([]);
    const [searchAiSource, setSearchAiSource] = useState<'local' | 'rag' | 'llm' | null>(null);

    const executeSmartSearch = async (query: string) => {
        if (!query.trim()) return;

        setShowSearchSuggestions(false);
        setActiveSearchQuery(query); // Track active search for "Clear Search" UI
        setSearchQuery('');
        setActiveView('home'); // Stay on home page
        setSearchAiResponse(null);
        setSearchAiSuggestions([]);
        setSearchAiSource(null);
        setChatHistory(prev => [...prev, { role: 'user', text: query }]);
        setIsAiTyping(true);

        try {
            // Search pets using database search (handles more than just local 50 pets)
            let searchResults: Pet[] = [];
            try {
                const dbResults = await searchPets(query);
                searchResults = dbResults.map(convertDbPet);
            } catch (err) {
                console.error('DB search failed, falling back to local:', err);
                // Comprehensive local search: name, breed, registration_number, owner, location
                const q = query.toLowerCase();
                searchResults = allPets.filter(pet => {
                    const name = (pet.name || '').toLowerCase();
                    const breed = (pet.breed || '').toLowerCase();
                    const regNum = (pet.registrationNumber || (pet as any).registration_number || '').toLowerCase();
                    const owner = (pet.owner || '').toLowerCase();
                    const location = (pet.location || '').toLowerCase();
                    return name.includes(q) || breed.includes(q) || regNum.includes(q) || owner.includes(q) || location.includes(q);
                });
            }

            // Get AI response
            const response = await aiThink(query, {
                conversationHistory: [...chatHistory, { role: 'user', text: query }].slice(-6),
                userProfile: user ? { id: user.id, full_name: user.profile?.full_name } : undefined,
                pageContext: 'home'
            });

            // Add AI response with search results
            let finalPets = searchResults;

            // Use AI-found pets if available (smarter matching than dumb DB search)
            if (response.data) {
                if (Array.isArray(response.data)) {
                    // Map simplified Brain pets to full Pet interface
                    finalPets = response.data.map((p: any) => ({
                        ...p, // Spread first to allow overrides
                        id: p.id,
                        name: p.name,
                        breed: p.breed,
                        type: 'dog', // Default to dog if missing
                        gender: 'male', // Default valid gender
                        birth_date: new Date().toISOString(), // Default
                        image: p.image_url || p.imageUrl || '',
                        location: p.location || '',
                        owner: typeof p.owner === 'object' ? (p.owner.full_name || 'Unknown') : (p.owner || p.owner_name || 'Unknown'),
                        owner_id: p.owner_id || (typeof p.owner === 'object' ? p.owner.id : ''),
                        healthCertified: false,
                        created_at: new Date().toISOString()
                    }));
                } else if (response.data.id) {
                    // Single pet response
                    const p = response.data;
                    finalPets = [{
                        ...p, // Spread first
                        id: p.id,
                        name: p.name,
                        breed: p.breed,
                        type: p.type || 'dog',
                        gender: p.gender || 'male',
                        birth_date: p.birthday || p.birth_date || new Date().toISOString(),
                        image: p.image_url || p.imageUrl || '',
                        location: p.location || '',
                        owner: typeof p.owner === 'object' ? (p.owner.full_name || 'Unknown') : (p.owner || p.owner_name || 'Unknown'),
                        owner_id: p.owner_id || p.owner?.id || '',
                        healthCertified: p.verified || false,
                        created_at: p.created_at || new Date().toISOString()
                    }];
                }
            }

            setSearchAiResponse(response.text);
            setSearchAiSuggestions(response.suggestions || []);
            setSearchAiSource(response.source || null);
            setChatHistory(prev => [...prev, {
                role: 'ai',
                text: response.text,
                pets: finalPets.slice(0, 12)
            }]);

            // Update filtered pets (show empty state if none)
            setFilteredPets(finalPets);
        } catch (error) {
            const fallbackText = language === 'th'
                ? 'ขอโทษค่ะ ไม่สามารถประมวลผลคำค้นหานี้ได้ในขณะนี้'
                : 'Sorry, I could not process your search at this time.';
            setSearchAiResponse(fallbackText);
            setSearchAiSuggestions([]);
            setSearchAiSource(null);
            setChatHistory(prev => [...prev, {
                role: 'ai',
                text: fallbackText
            }]);
            setFilteredPets([]);
        } finally {
            setIsAiTyping(false);
        }

        // Scroll to top to see results
        setTimeout(() => {
            if (chatContainerRef.current) {
                chatContainerRef.current.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            }
        }, 300);
    };

    // Clear search and restore full home feed
    const clearSearch = useCallback(() => {
        setActiveSearchQuery('');
        setSearchAiResponse(null);
        setSearchAiSuggestions([]);
        setSearchAiSource(null);
        setChatHistory([]);
        setFilteredPets(allPets);
    }, [allPets]);

    useEffect(() => {
        if (activeView !== 'home' && activeSearchQuery) {
            clearSearch();
        }
    }, [activeView, activeSearchQuery, clearSearch]);

    // Handle form submit
    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        executeSmartSearch(searchQuery.trim());
    };

    // Exit search mode
    const exitSearchMode = () => {
        setIsSearchMode(false);
        setChatHistory([]);
        setFilteredPets(allPets);
    };

    const mobileTabs: Array<{
        key: MobileTabKey;
        label: string;
        view: ActiveView;
        category?: MobileCategoryKey;
        puppyFocus?: 'available' | 'coming';
    }> = [
            { key: 'all', label: 'All', view: 'home', category: 'all' },
            { key: 'dogs', label: 'Dogs', view: 'home', category: 'dogs' },
            { key: 'cats', label: 'Cats', view: 'home', category: 'cats' },
            { key: 'puppy-available', label: 'Puppy Available', view: 'puppies', puppyFocus: 'available' },
            { key: 'puppy-soon', label: 'Puppy Soon', view: 'puppies', puppyFocus: 'coming' },
            { key: 'horses', label: 'Horses', view: 'home', category: 'horses' },
            { key: 'cattle', label: 'Cattle', view: 'home', category: 'cattle' },
            { key: 'exotic', label: 'Exotic', view: 'home', category: 'exotic' },
        ];

    const handleMobileTabSelect = (tabKey: MobileTabKey) => {
        const tab = mobileTabs.find((item) => item.key === tabKey);
        if (!tab) return;

        setActiveMobileTab(tab.key);
        if (tab.view === 'puppies') {
            setActiveView('puppies');
            setPuppyFocus(tab.puppyFocus || null);
        } else {
            setActiveView('home');
            setPuppyFocus(null);
            setActiveCategory(tab.category || 'all');
        }

        if (isSearchMode) {
            exitSearchMode();
        }
    };

    const handleContentTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
        if (typeof window !== 'undefined' && window.innerWidth >= 768) return;
        if (isImmersiveSearch) return;

        // Single touch - for swipe
        if (e.touches.length === 1) {
            touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            touchStartTimeRef.current = Date.now();
            lastPanRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }

        // Two finger pinch - for zoom
        if (e.touches.length === 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            initialPinchDistanceRef.current = Math.sqrt(dx * dx + dy * dy);
            initialZoomRef.current = zoomLevel;
        }
    };

    const handleContentTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
        if (typeof window !== 'undefined' && window.innerWidth >= 768) return;

        // Two finger pinch zoom
        if (e.touches.length === 2 && initialPinchDistanceRef.current !== null) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const currentDistance = Math.sqrt(dx * dx + dy * dy);
            const scale = currentDistance / initialPinchDistanceRef.current;
            const newZoom = Math.min(Math.max(initialZoomRef.current * scale, 0.5), 3);
            setZoomLevel(newZoom);
        }

        // Single finger pan when zoomed in
        if (e.touches.length === 1 && zoomLevel > 1) {
            const dx = e.touches[0].clientX - lastPanRef.current.x;
            const dy = e.touches[0].clientY - lastPanRef.current.y;
            setPanOffset(prev => ({
                x: prev.x + dx,
                y: prev.y + dy
            }));
            lastPanRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
    };

    const handleContentTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
        if (typeof window !== 'undefined' && window.innerWidth >= 768) return;

        // Reset pinch tracking
        if (e.touches.length < 2) {
            initialPinchDistanceRef.current = null;
        }

        // Double tap to reset zoom
        if (e.changedTouches.length === 1) {
            const now = Date.now();
            if (now - touchStartTimeRef.current < 300) {
                // Quick tap - check for double tap
                // Reset zoom if already zoomed
                if (zoomLevel !== 1) {
                    setZoomLevel(1);
                    setPanOffset({ x: 0, y: 0 });
                }
            }
        }

        if (!touchStartRef.current) return;
        if (isImmersiveSearch) return;
        if (zoomLevel !== 1) return; // Don't swipe tabs when zoomed

        const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
        const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
        const dt = Date.now() - touchStartTimeRef.current;
        touchStartRef.current = null;

        if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) || dt > 800) return;
        if (activeView !== 'home' && activeView !== 'puppies') return;

        const currentIndex = mobileTabs.findIndex((item) => item.key === activeMobileTab);
        if (currentIndex === -1) return;
        const nextIndex = dx < 0
            ? Math.min(currentIndex + 1, mobileTabs.length - 1)
            : Math.max(currentIndex - 1, 0);
        if (nextIndex === currentIndex) return;
        handleMobileTabSelect(mobileTabs[nextIndex].key);
    };

    // Reset zoom when changing views
    useEffect(() => {
        setZoomLevel(1);
        setPanOffset({ x: 0, y: 0 });
    }, [activeView, activeMobileTab]);

    // Toggle like
    const handleLike = async (petId: string) => {
        if (!user) {
            setAuthModalOpen(true);
            return;
        }
        // TODO: Implement like functionality with database
        console.log('Liked pet:', petId);
    };

    // Render main content
    const renderMainContent = () => {
        // Search Mode - ChatGPT style (Light Theme)
        if (isSearchMode) {
            return (
                <div className="p-4 md:p-6">
                    <button
                        onClick={exitSearchMode}
                        className="mb-8 text-gray-400 hover:text-[#0d0c22] flex items-center gap-2 text-sm font-medium transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        {language === 'th' ? 'กลับหน้าหลัก' : 'Back to Home'}
                    </button>

                    {/* Chat History */}
                    <div className="max-w-4xl mx-auto space-y-8">
                        {chatHistory.map((msg, i) => (
                            <div key={i}>
                                {/* Message */}
                                <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] px-6 py-4 rounded-[24px] shadow-sm ${msg.role === 'user'
                                        ? 'bg-[#ea4c89] text-white rounded-br-none'
                                        : 'bg-white text-[#0d0c22] border border-gray-100 rounded-bl-none'
                                        }`}>
                                        <p className="text-sm leading-relaxed whitespace-pre-wrap font-medium">{msg.text}</p>
                                    </div>
                                </div>

                                {/* Search Results - Pinterest Grid */}
                                {msg.role === 'ai' && msg.pets && msg.pets.length > 0 && (
                                    <div className="mt-8 pl-4 border-l-2 border-[#ea4c89]/20 ml-4">
                                        <p className="text-xs text-[#ea4c89] font-bold uppercase tracking-wider mb-6">
                                            {language === 'th' ? 'ผลการค้นหา' : 'Found results'} ({msg.pets.length})
                                        </p>
                                        <div className="columns-2 md:columns-3 lg:columns-4 gap-6 space-y-6">
                                            {msg.pets.map(pet => (
                                                <ExpandablePetCard
                                                    key={pet.id}
                                                    pet={pet}
                                                    isExpanded={false} // Never expand inline
                                                    onToggle={() => handleViewPetDetails(pet)} // Open Pinterest modal!
                                                    onPedigreeClick={() => handleViewPedigree(pet)}
                                                    onChatClick={() => handleChatWithOwner(pet)}
                                                    onLikeClick={() => handleLike(pet.id)}
                                                    onCommentClick={() => handleViewPetDetails(pet, 'comments')}
                                                    onEditClick={() => handleViewPetDetails(pet, 'edit')}
                                                    onMatchClick={() => navigate(`/breeding/${pet.id}`)}
                                                    onVetClick={() => navigate(`/vet-profile/${pet.id}`)}
                                                    onMagicCardClick={() => setAddCardModalOpen(true)}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}

                        {isAiTyping && (
                            <div className="flex justify-start">
                                <div className="bg-white border border-gray-100 px-6 py-4 rounded-[24px] rounded-bl-none flex items-center gap-2 shadow-sm">
                                    <div className="flex gap-1.5">
                                        <span className="w-2 h-2 bg-[#ea4c89] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <span className="w-2 h-2 bg-[#ea4c89] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <span className="w-2 h-2 bg-[#ea4c89] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        // Normal views
        switch (activeView) {
            case 'products':
                return (
                    <div className="p-4 md:p-6">
                        <button onClick={() => setActiveView('home')} className="mb-6 text-gray-400 hover:text-[#0d0c22] flex items-center gap-2 text-sm font-medium transition-colors">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                            Back
                        </button>
                        <MarketplaceSection onAddToCart={addToCart} onQuickView={handleQuickView} />
                    </div>
                );

            case 'puppies':
                return (
                    <div className="p-4 md:p-6">
                        <button onClick={() => setActiveView('home')} className="mb-6 text-gray-400 hover:text-[#0d0c22] flex items-center gap-2 text-sm font-medium transition-colors">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                            Back
                        </button>
                        <PuppyComingSoonSection
                            onRequireAuth={() => setAuthModalOpen(true)}
                            onViewDetails={handleViewPetDetails}
                            focusSection={puppyFocus}
                        />
                    </div>
                );

            case 'breeding':
                return (
                    <div className="p-4 md:p-6">
                        <button onClick={() => setActiveView('home')} className="mb-6 text-gray-400 hover:text-[#0d0c22] flex items-center gap-2 text-sm font-medium transition-colors">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                            Back
                        </button>
                        <SearchSection onViewPedigree={handleViewPedigree} onViewDetails={handleViewPetDetails} onRequireAuth={() => setAuthModalOpen(true)} />
                    </div>
                );

            case 'notifications':
                return (
                    <div className="p-4 md:p-6">
                        <button onClick={() => setActiveView('home')} className="mb-6 text-gray-400 hover:text-[#0d0c22] flex items-center gap-2 text-sm font-medium transition-colors">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                            Back
                        </button>
                        <NotificationPanel />
                    </div>
                );

            case 'favorites':
                return (
                    <div className="p-4 md:p-6">
                        <button onClick={() => setActiveView('home')} className="mb-6 text-gray-400 hover:text-[#0d0c22] flex items-center gap-2 text-sm font-medium transition-colors">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                            {language === 'th' ? 'กลับ' : 'Back'}
                        </button>

                        <h1 className="font-['Playfair_Display'] text-3xl text-[#0d0c22] mb-2 font-bold italic">
                            {language === 'th' ? 'รายการโปรด' : 'Favorites'}
                        </h1>
                        <p className="text-gray-500 mb-8 font-medium">{favorites.length} {language === 'th' ? 'รายการ' : 'items'}</p>

                        {favorites.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                                {allPets.filter(pet => favorites.includes(pet.id)).map(pet => (
                                    <div
                                        key={pet.id}
                                        className="bg-white rounded-[20px] overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg cursor-pointer transition-all group"
                                        onClick={() => handleViewPetDetails(pet)}
                                    >
                                        <div className="h-48 overflow-hidden relative">
                                            <SmartImage
                                                src={pet.image}
                                                petId={pet.id}
                                                alt={pet.name}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                        </div>
                                        <div className="p-4">
                                            <p className="font-bold text-[#0d0c22] truncate text-lg">{pet.name}</p>
                                            <p className="text-sm text-gray-500 truncate font-medium">{pet.breed}</p>
                                            <p className="text-xs text-[#ea4c89] mt-2 font-bold flex items-center gap-1">
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                {pet.location}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 dashed">
                                <span className="text-5xl mb-4 block opacity-50">❤️</span>
                                <p className="text-gray-400 font-medium">{language === 'th' ? 'ยังไม่มีรายการโปรด' : 'No favorites yet'}</p>
                            </div>
                        )}
                    </div>
                );

            case 'myspace':
                return (
                    <div className="p-4 md:p-6">
                        <button onClick={() => setActiveView('home')} className="mb-6 text-gray-400 hover:text-[#0d0c22] flex items-center gap-2 text-sm font-medium transition-colors">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                            {language === 'th' ? 'กลับ' : 'Back'}
                        </button>

                        {/* My Space Header */}
                        <div className="mb-10 text-center md:text-left">
                            <h1 className="font-['Playfair_Display'] text-4xl text-[#0d0c22] mb-3 font-black italic">
                                {language === 'th' ? 'พื้นที่ของฉัน' : 'My Space'}
                            </h1>
                            <p className="text-gray-500 font-medium text-lg">
                                {language === 'th' ? 'จัดการสัตว์เลี้ยง สินค้า และรายการโปรดของคุณ' : 'Manage your pets, products and favorites'}
                            </p>
                        </div>

                        {!user ? (
                            <div className="bg-white rounded-[32px] p-12 text-center border border-gray-100 shadow-xl shadow-gray-100/50 max-w-2xl mx-auto">
                                <div className="w-20 h-20 bg-[#ea4c89]/10 rounded-2xl flex items-center justify-center mx-auto mb-6 transform rotate-3">
                                    <svg className="w-10 h-10 text-[#ea4c89]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                </div>
                                <h3 className="text-2xl font-bold text-[#0d0c22] mb-3">
                                    {language === 'th' ? 'เข้าสู่ระบบเพื่อเข้าถึงพื้นที่ของคุณ' : 'Sign in to access your space'}
                                </h3>
                                <p className="text-gray-500 mb-8 max-w-md mx-auto">
                                    {language === 'th' ? 'จัดการสัตว์เลี้ยง ดูรายการโปรด และอื่นๆ' : 'Manage your pets, view favorites, and more'}
                                </p>
                                <button
                                    onClick={() => setAuthModalOpen(true)}
                                    className="px-10 py-4 bg-[#0d0c22] text-white font-bold rounded-xl hover:bg-[#ea4c89] transition-all shadow-lg hover:shadow-[#ea4c89]/30 hover:-translate-y-1"
                                >
                                    {language === 'th' ? 'เข้าสู่ระบบ' : 'Sign In'}
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* My Pets */}
                                <div className="bg-white rounded-[32px] p-8 border border-gray-100 hover:border-[#ea4c89]/20 shadow-sm hover:shadow-xl hover:shadow-[#ea4c89]/5 transition-all group cursor-pointer relative overflow-hidden"
                                    onClick={() => { setCurrentBreederId(user.id); setBreederProfileOpen(true); }}>
                                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500">
                                        <span className="text-9xl">🐕</span>
                                    </div>
                                    <div className="flex items-center gap-6 mb-6 relative z-10">
                                        <div className="w-16 h-16 bg-[#ea4c89]/10 rounded-2xl flex items-center justify-center group-hover:bg-[#ea4c89] group-hover:text-white transition-all duration-300 shadow-sm">
                                            <span className="text-3xl">🐕</span>
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-[#0d0c22] group-hover:text-[#ea4c89] transition-colors">{language === 'th' ? 'สัตว์เลี้ยงของฉัน' : 'My Pets'}</h3>
                                            <p className="text-sm text-gray-500 font-medium">{language === 'th' ? 'จัดการและดูสัตว์เลี้ยงที่ลงทะเบียน' : 'Manage your registered pets'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between mt-8">
                                        <span className="text-4xl font-black text-[#0d0c22] group-hover:text-[#ea4c89] transition-colors pixel-nums">
                                            {allPets.filter(p => (p as any).owner_id === user.id).length}
                                        </span>
                                        <div className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center group-hover:border-[#ea4c89] group-hover:bg-[#ea4c89] group-hover:text-white transition-all">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>

                                {/* My Puppies */}
                                <div className="bg-white rounded-[32px] p-8 border border-gray-100 hover:border-[#ea4c89]/20 shadow-sm hover:shadow-xl hover:shadow-[#ea4c89]/5 transition-all group cursor-pointer relative overflow-hidden"
                                    onClick={() => setActiveView('puppies')}>
                                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500">
                                        <span className="text-9xl">🐾</span>
                                    </div>
                                    <div className="flex items-center gap-6 mb-6 relative z-10">
                                        <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center group-hover:bg-blue-500 group-hover:text-white transition-all duration-300 shadow-sm">
                                            <span className="text-3xl">🐾</span>
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-[#0d0c22] group-hover:text-blue-500 transition-colors">{language === 'th' ? 'ลูกหมาของฉัน' : 'My Puppies'}</h3>
                                            <p className="text-sm text-gray-500 font-medium">{language === 'th' ? 'ดูลูกหมาที่กำลังจะเกิด' : 'View upcoming litters'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between mt-8">
                                        <span className="text-sm font-bold text-gray-400 uppercase tracking-wider group-hover:text-blue-500 transition-colors">{language === 'th' ? 'ดูทั้งหมด' : 'View All'}</span>
                                        <div className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center group-hover:border-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-all">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>

                                {/* My Products */}
                                <div className="bg-white rounded-[32px] p-8 border border-gray-100 hover:border-[#ea4c89]/20 shadow-sm hover:shadow-xl hover:shadow-[#ea4c89]/5 transition-all group cursor-pointer relative overflow-hidden"
                                    onClick={() => setActiveView('products')}>
                                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500">
                                        <span className="text-9xl">🛍️</span>
                                    </div>
                                    <div className="flex items-center gap-6 mb-6 relative z-10">
                                        <div className="w-16 h-16 bg-purple-50 text-purple-500 rounded-2xl flex items-center justify-center group-hover:bg-purple-500 group-hover:text-white transition-all duration-300 shadow-sm">
                                            <span className="text-3xl">🛍️</span>
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-[#0d0c22] group-hover:text-purple-500 transition-colors">{language === 'th' ? 'สินค้าของฉัน' : 'My Products'}</h3>
                                            <p className="text-sm text-gray-500 font-medium">{language === 'th' ? 'จัดการสินค้าที่ขาย' : 'Manage your listings'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between mt-8">
                                        <span className="text-sm font-bold text-gray-400 uppercase tracking-wider group-hover:text-purple-500 transition-colors">{language === 'th' ? 'ดูทั้งหมด' : 'View All'}</span>
                                        <div className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center group-hover:border-purple-500 group-hover:bg-purple-500 group-hover:text-white transition-all">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                            </svg>
                                        </div>
                                    </div>
                                </div>

                                {/* Favorites */}
                                <div className="bg-white rounded-[32px] p-8 border border-gray-100 hover:border-[#ea4c89]/20 shadow-sm hover:shadow-xl hover:shadow-[#ea4c89]/5 transition-all group col-span-1 md:col-span-2 relative overflow-hidden">
                                    <div className="flex items-center gap-6 mb-8 relative z-10">
                                        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center group-hover:bg-red-500 group-hover:text-white transition-all duration-300 shadow-sm">
                                            <span className="text-3xl">❤️</span>
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-[#0d0c22] group-hover:text-red-500 transition-colors">{language === 'th' ? 'รายการโปรด' : 'Favorites'}</h3>
                                            <p className="text-sm text-gray-500 font-medium">{language === 'th' ? 'สัตว์เลี้ยงที่คุณถูกใจ' : 'Pets you\'ve liked'} ({favorites.length})</p>
                                        </div>
                                    </div>

                                    {/* Favorite Pet Cards */}
                                    {favorites.length > 0 ? (
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                            {allPets.filter(pet => favorites.includes(pet.id)).slice(0, 4).map(pet => (
                                                <div
                                                    key={pet.id}
                                                    className="bg-gray-50 rounded-2xl overflow-hidden border border-gray-100 hover:shadow-lg cursor-pointer transition-all group/card"
                                                    onClick={() => handleViewPetDetails(pet)}
                                                >
                                                    <div className="h-28 overflow-hidden">
                                                        <SmartImage
                                                            src={pet.image}
                                                            petId={pet.id}
                                                            alt={pet.name}
                                                            className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-500"
                                                        />
                                                    </div>
                                                    <div className="p-3">
                                                        <p className="text-sm font-bold text-[#0d0c22] truncate">{pet.name}</p>
                                                        <p className="text-[10px] text-gray-500 truncate font-medium">{pet.breed}</p>
                                                    </div>
                                                </div>
                                            ))}
                                            {favorites.length > 4 && (
                                                <div className="flex items-center justify-center bg-gray-50 rounded-2xl border border-gray-100 text-gray-400 font-bold hover:bg-[#ea4c89] hover:text-white transition-colors cursor-pointer" onClick={() => setActiveView('favorites')}>
                                                    +{favorites.length - 4}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-400 text-center py-8 italic">{language === 'th' ? 'ยังไม่มีรายการโปรด' : 'No favorites yet'}</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                );

            default:
                // Home - Pinterest-style masonry grid
                return (
                    <div className="p-0 md:p-6">
                        {/* Smart Filter Bar - TEMPORARILY DISABLED
                        <SmartFilterBar
                            allPets={allPets}
                            onFilterChange={(filtered) => setFilteredPets(filtered)}
                        />
                        */}

                        {/* Search Results Header - inline on home page */}
                        {activeSearchQuery && (
                            <div className="flex items-center justify-between mb-[clamp(8px,2vw,16px)] p-[clamp(10px,2vw,16px)] bg-white rounded-2xl border border-gray-100 shadow-sm">
                                <div className="relative top-1 flex items-center gap-2">
                                    <span className="text-[#ea4c89]">🔍</span>
                                    <span className="text-sm text-gray-600">
                                        {language === 'th' ? 'ผลการค้นหา:' : 'Results for:'}
                                    </span>
                                    <span className="text-sm font-bold text-[#0d0c22]">"{activeSearchQuery}"</span>
                                    <span className="text-xs text-gray-400">({filteredPets.length} found)</span>
                                </div>
                                <button
                                    onClick={clearSearch}
                                    className="px-4 py-1.5 text-sm font-semibold text-[#ea4c89] bg-[#ea4c89]/10 rounded-full hover:bg-[#ea4c89]/20 transition-colors flex items-center gap-1"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    {language === 'th' ? 'เคลียร์' : 'Clear'}
                                </button>
                            </div>
                        )}


                        {activeSearchQuery && searchAiResponse && (
                            <div className="mb-[clamp(8px,2vw,16px)] p-[clamp(12px,2vw,18px)] bg-white rounded-2xl border border-gray-100 shadow-sm">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-gray-500">
                                        <span className="text-[#ea4c89]">✨</span>
                                        <span>{language === 'th' ? 'สรุปจาก AI' : 'AI Summary'}</span>
                                    </div>
                                    {searchAiSource && (
                                        <span className="text-[10px] text-gray-400 uppercase">{searchAiSource}</span>
                                    )}
                                </div>
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">{searchAiResponse}</p>
                                {searchAiSuggestions.length > 0 && (
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {searchAiSuggestions.map((suggestion) => (
                                            <button
                                                key={suggestion}
                                                onClick={() => executeSmartSearch(suggestion)}
                                                className="px-3 py-1.5 rounded-full bg-[#ea4c89]/10 text-[#ea4c89] text-xs font-semibold hover:bg-[#ea4c89]/20 transition-colors"
                                            >
                                                {suggestion}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Masonry Grid - Click Opens Pinterest Modal */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-[clamp(8px,2vw,12px)] sm:gap-4 md:gap-6">
                            {visiblePets.map((pet) => (
                                <ExpandablePetCard
                                    key={pet.id}
                                    pet={pet}
                                    isExpanded={false} // Never expand inline
                                    onToggle={() => handleViewPetDetails(pet)} // Open Pinterest modal!
                                    isLiked={favorites.includes(pet.id)}
                                    isOwner={user?.id === (pet as any).owner_id}
                                    isAdmin={Boolean(user && (user.email === 'geowahaha@gmail.com' || user.email === 'truesaveus@hotmail.com' || user.profile?.is_admin))}
                                    allPets={allPets}
                                    onUpdateParents={async (sireId, damId) => {
                                        // Update in database (implement this)
                                        console.log('Updating parents:', { petId: pet.id, sireId, damId });
                                        // TODO: Call Supabase API to update
                                    }}
                                    onPedigreeClick={() => handleViewPedigree(pet)}
                                    onChatClick={() => handleChatWithOwner(pet)}
                                    onLikeClick={() => handleAddToFavorites(pet.id)}
                                    onCommentClick={() => handleViewPetDetails(pet, 'comments')}
                                    onEditClick={() => handleViewPetDetails(pet, 'edit')}
                                    onMatchClick={() => navigate(`/breeding/${pet.id}`)}
                                    onVetClick={() => navigate(`/vet-profile/${pet.id}`)}
                                    onMagicCardClick={() => setAddCardModalOpen(true)}
                                    onDeleteClick={() => handleDeleteClick(pet)}
                                />
                            ))}
                        </div>

                        {/* Load more */}
                        {hasMore && (
                            <div className="text-center mt-16 mb-12">
                                <button
                                    onClick={loadMore}
                                    className="px-10 py-4 border-2 border-gray-100 bg-white text-[#0d0c22] text-sm font-bold tracking-widest uppercase hover:bg-[#0d0c22] hover:text-white hover:border-[#0d0c22] transition-all rounded-full shadow-sm hover:shadow-lg transform hover:-translate-y-1"
                                >
                                    Load More {hasMore && `(${filteredPets.length - visiblePets.length} more)`}
                                </button>
                            </div>
                        )}
                    </div>
                );
        }
    };

    const unreadNotificationItems = notificationItems.filter(item => !item.is_read);
    const seenNotificationItems = notificationItems.filter(item => item.is_read);

    return (
        <div className="flex min-h-[100dvh] w-full bg-[#f9f8fd] font-sans text-[#0d0c22] overflow-hidden selection:bg-[#ea4c89]/20">
            {/* Ambient Background - Subtle Gradient Mesh */}
            <div className="fixed inset-0 pointer-events-none z-0 opacity-40">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-200 rounded-full blur-[120px] mix-blend-multiply filter animate-blob"></div>
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-pink-100 rounded-full blur-[120px] mix-blend-multiply filter animate-blob animation-delay-2000"></div>
                <div className="absolute bottom-[-10%] left-[20%] w-[50%] h-[50%] bg-blue-100 rounded-full blur-[120px] mix-blend-multiply filter animate-blob animation-delay-4000"></div>
            </div>

            {/* ===== LEFT SIDEBAR - Clean White ===== */}
            <aside className="hidden md:flex w-16 lg:w-20 fixed left-0 top-0 bottom-0 z-50 flex flex-col items-center py-6 bg-white border-r border-gray-100 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
                {/* Logo - Eibpo */}
                <div className="mb-8">
                    <div className="w-10 h-10 rounded-xl bg-[#0d0c22] flex items-center justify-center shadow-lg shadow-black/20 cursor-pointer hover:scale-105 transition-transform">
                        <EibpoMark className="w-6 h-6 text-white" />
                    </div>
                </div>

                {/* Navigation Icons */}
                <nav className="flex-1 flex flex-col items-center gap-4">
                    <SidebarIcon
                        icon={<HomeIcon />}
                        label={language === 'th' ? 'หน้าแรก' : 'Home'}
                        active={activeView === 'home' && !isSearchMode}
                        onClick={() => { setActiveView('home'); exitSearchMode(); }}
                    />
                    {/* My Space with Dropdown */}
                    <div
                        className="relative group"
                        onMouseEnter={() => {
                            if (mySpaceMenuTimeoutRef.current) {
                                clearTimeout(mySpaceMenuTimeoutRef.current);
                                mySpaceMenuTimeoutRef.current = null;
                            }
                            setShowMySpaceMenu(true);
                        }}
                        onMouseLeave={() => {
                            mySpaceMenuTimeoutRef.current = setTimeout(() => {
                                setShowMySpaceMenu(false);
                            }, 300);
                        }}
                    >
                        <button
                            onClick={() => setActiveView('myspace')}
                            className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${activeView === 'myspace'
                                ? 'bg-[#ea4c89] text-white shadow-[#ea4c89]/30 shadow-lg'
                                : 'bg-gray-50 text-gray-400 hover:text-[#0d0c22] hover:bg-gray-100'
                                }`}
                        >
                            <MySpaceIcon />
                        </button>

                        {/* Dropdown Menu - Light Theme */}
                        <div className={`
                            absolute left-14 top-0 ml-4 w-60 bg-white rounded-2xl border border-gray-100 shadow-[0_10px_40px_rgba(0,0,0,0.08)] p-2 z-[60] 
                            transition-all duration-300 origin-left
                            ${showMySpaceMenu ? 'opacity-100 translate-x-0 scale-100' : 'opacity-0 -translate-x-4 scale-95 pointer-events-none'}
                        `}>
                            <div className="p-3 border-b border-gray-100 mb-2 bg-gradient-to-r from-gray-50 to-white rounded-xl">
                                <h3 className="font-['Playfair_Display'] text-lg font-bold text-[#0d0c22]">My Space</h3>
                                <p className="text-xs text-[#6e6d7a]">Manage your kennel</p>
                            </div>
                            <button
                                onClick={() => { setActiveView('myspace'); setShowMySpaceMenu(false); if (user) { setCurrentBreederId(user.id); setBreederProfileOpen(true); } }}
                                className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-gray-50 rounded-lg transition-colors text-left group/item"
                            >
                                <span className="text-lg group-hover/item:scale-110 transition-transform">🐕</span>
                                <span className="text-sm font-medium text-gray-600 group-hover/item:text-[#0d0c22]">{language === 'th' ? 'สัตว์เลี้ยงของฉัน' : 'My Pets'}</span>
                            </button>
                            <button
                                onClick={() => { setActiveView('puppies'); setShowMySpaceMenu(false); }}
                                className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-gray-50 rounded-lg transition-colors text-left group/item"
                            >
                                <span className="text-lg group-hover/item:scale-110 transition-transform">🐾</span>
                                <span className="text-sm font-medium text-gray-600 group-hover/item:text-[#0d0c22]">{language === 'th' ? 'ลูกหมาของฉัน' : 'My Puppies'}</span>
                            </button>
                            <button
                                onClick={() => { setActiveView('products'); setShowMySpaceMenu(false); }}
                                className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-gray-50 rounded-lg transition-colors text-left group/item"
                            >
                                <span className="text-lg group-hover/item:scale-110 transition-transform">🛍️</span>
                                <span className="text-sm font-medium text-gray-600 group-hover/item:text-[#0d0c22]">{language === 'th' ? 'สินค้าของฉัน' : 'My Products'}</span>
                            </button>

                            {/* Theme Switcher */}
                            <div className="mt-2 pt-2 border-t border-gray-100">
                                <p className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Theme</p>
                                <ThemeSwitcher />
                            </div>

                            <button
                                onClick={() => { setActiveView('favorites'); setShowMySpaceMenu(false); }}
                                className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-gray-50 rounded-lg transition-colors text-left group/item"
                            >
                                <span className="text-lg group-hover/item:scale-110 transition-transform">❤️</span>
                                <div className="flex-1 flex items-center justify-between">
                                    <span className="text-sm font-medium text-gray-600 group-hover/item:text-[#0d0c22]">{language === 'th' ? 'รายการโปรด' : 'Favorites'}</span>
                                    <span className="text-xs bg-[#ea4c89] text-white px-1.5 py-0.5 rounded-full font-bold">{favorites.length}</span>
                                </div>
                            </button>
                        </div>
                    </div>
                    <SidebarIcon
                        icon={<MagicCardIcon />}
                        label="Magic Card"
                        highlight
                        onClick={handleRegisterClick}
                    />
                    <SidebarIcon
                        icon={<PuppyIcon />}
                        label={language === 'th' ? 'ลูกหมา' : 'Puppies'}
                        active={activeView === 'puppies'}
                        onClick={() => setActiveView('puppies')}
                    />
                    <SidebarIcon
                        icon={<ShopIcon />}
                        label={language === 'th' ? 'สินค้า' : 'Shop'}
                        active={activeView === 'products'}
                        onClick={() => setActiveView('products')}
                    />

                    <div className="h-px w-8 bg-gray-200 my-4" />

                    <SidebarIcon
                        icon={<NotificationIcon count={unreadNotifications} />}
                        label={language === 'th' ? 'แจ้งเตือน' : 'Notifications'}
                        active={notificationPanelOpen}
                        onClick={handleNotificationShortcut}
                    />
                    <SidebarIcon
                        icon={<MessageIcon count={unreadChatCount} />}
                        label={language === 'th' ? 'ข้อความ' : 'Messages'}
                        active={messagePanelOpen}
                        onClick={handleMessageShortcut}
                    />
                </nav >

                {/* Bottom icons */}
                < div className="mt-auto flex flex-col items-center gap-2" >
                    <SidebarIcon
                        icon={<CartIconSidebar count={cartCount} />}
                        label={language === 'th' ? 'ตะกร้า' : 'Cart'}
                        onClick={() => setCartModalOpen(true)}
                    />
                    <SidebarIcon
                        icon={
                            <div className="relative">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                {user?.profile?.trd_balance && user.profile.trd_balance > 0 && (
                                    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C5A059] opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#C5A059]"></span>
                                    </span>
                                )}
                            </div>
                        }
                        label={language === 'th' ? 'กระเป๋า' : 'Wallet'}
                        onClick={() => setWalletModalOpen(true)}
                    />
                    <SidebarIcon
                        icon={user ? <UserAvatar name={user.profile?.full_name || user.email} /> : <UserIcon />}
                        label={user ? (user.profile?.full_name || user.email) : (language === 'th' ? 'เข้าสู่ระบบ' : 'Sign In')}
                        onClick={() => {
                            if (user) {
                                setCurrentBreederId(user.id);
                                setBreederProfileOpen(true);
                            } else {
                                setAuthModalOpen(true);
                            }
                        }}
                    />
                    <SidebarIcon
                        icon={<SettingsIcon />}
                        label={language === 'th' ? 'ตั้งค่า' : 'Settings'}
                        onClick={() => { }}
                    />
                </div >
            </aside >

            {/* ===== MAIN CONTENT (Fades out when searching) ===== */}
            < div className={`transition-all duration-700 ease-in-out transform ${isImmersiveSearch ? 'opacity-0 scale-95 filter blur-lg pointer-events-none' : 'opacity-100 scale-100'}`}>
                <main className="flex-1 ml-0 md:ml-16 lg:ml-20 flex flex-col min-h-[100dvh] bg-[#F9F8FD]">
                    {/* Mobile Header - Pinterest Style - Hide on scroll down, show on scroll up */}
                    <header className={`sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 md:hidden transition-transform duration-300 ${(showMobileHeader || forceMobileHeader) ? 'translate-y-0' : '-translate-y-full'}`}>
                        <div className="px-[clamp(10px,3vw,16px)] pt-[max(0.75rem,env(safe-area-inset-top))] pb-[clamp(6px,2vw,10px)]">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => { setActiveView('home'); exitSearchMode(); }}
                                    className="w-9 h-9 rounded-xl bg-[#0d0c22] flex items-center justify-center shadow-md"
                                    aria-label="Home"
                                >
                                    <EibpoMark className="w-5 h-5 text-white" />
                                </button>

                                <div className="flex-1 relative">
                                    <input
                                        ref={searchInputRef}
                                        type="text"
                                        value={searchQuery}
                                        onFocus={() => {
                                            if (searchQuery.trim().length > 0) setShowSearchSuggestions(true);
                                        }}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            setSearchQuery(value);
                                            setShowSearchSuggestions(value.trim().length > 0);
                                        }}
                                        onBlur={() => setTimeout(() => setShowSearchSuggestions(false), 200)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleSearch(e as any);
                                                setShowSearchSuggestions(false);
                                            }
                                        }}
                                        placeholder={language === 'th' ? 'ค้นหาหรือถาม AI...' : 'Search or ask AI...'}
                                        className="w-full h-10 rounded-full bg-gray-100 px-4 pr-10 text-sm font-medium text-[#0d0c22] placeholder:text-gray-400 focus:ring-2 focus:ring-[#ea4c89]/30 focus:outline-none"
                                    />
                                    {isAiTyping && (
                                        <div className="absolute right-10 top-1/2 -translate-y-1/2">
                                            <div className="flex gap-1">
                                                <div className="w-1.5 h-1.5 bg-[#ea4c89] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                                <div className="w-1.5 h-1.5 bg-[#ea4c89] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                                <div className="w-1.5 h-1.5 bg-[#ea4c89] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                            </div>
                                        </div>
                                    )}
                                    <button
                                        onClick={() => {
                                            if (searchQuery.trim()) handleSearch({ preventDefault: () => { } } as any);
                                        }}
                                        className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full text-[#ea4c89] hover:bg-white transition-colors"
                                        aria-label="Search"
                                    >
                                        <SearchIconNav />
                                    </button>
                                </div>

                                <div className="relative top-2 flex items-center gap-2">
                                    {user && (user.email === 'geowahaha@gmail.com' || user.email === 'truesaveus@hotmail.com' || user.profile?.is_admin) && (
                                        <button
                                            onClick={() => setAdminPanelOpen(true)}
                                            className="w-9 h-9 rounded-full bg-gray-900 text-yellow-400 flex items-center justify-center shadow-md"
                                            aria-label="Admin"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.350 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                        </button>
                                    )}
                                    <button
                                        onClick={() => {
                                            if (user) {
                                                setCurrentBreederId(user.id);
                                                setBreederProfileOpen(true);
                                            } else {
                                                setAuthModalOpen(true);
                                            }
                                        }}
                                        className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shadow-sm border border-gray-200"
                                        aria-label="Profile"
                                    >
                                        {user ? <UserAvatar name={user.profile?.full_name || user.email} /> : <UserIcon />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {showSearchSuggestions && searchQuery.trim().length > 0 && (
                            <div className="px-[clamp(10px,3vw,16px)] pb-[clamp(6px,2vw,10px)]">
                                <div className="bg-white border border-gray-100 rounded-2xl shadow-[0_16px_40px_rgba(0,0,0,0.12)] overflow-hidden">
                                    <div className="p-3">
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="text-[10px] text-[#ea4c89] font-bold uppercase tracking-wider">
                                                {language === 'th' ? 'แนะนำสำหรับคุณ' : 'Suggested'}
                                            </p>
                                            <button
                                                onClick={() => setShowSearchSuggestions(false)}
                                                className="text-gray-300 hover:text-gray-500"
                                                aria-label="Close"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-1 gap-2">
                                            {getSearchSuggestions().slice(0, 4).map((s) => (
                                                <button
                                                    key={s.id}
                                                    onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        setShowSearchSuggestions(false);
                                                        if (s.action) s.action();
                                                    }}
                                                    className="flex items-center gap-3 px-3 py-2 bg-gray-50 border border-gray-100 hover:border-[#ea4c89]/50 hover:bg-white rounded-xl transition-all text-left"
                                                >
                                                    <span className="text-base bg-white w-8 h-8 flex items-center justify-center rounded-lg shadow-sm">
                                                        {s.type === 'recent' ? 'R' : s.type === 'popular' ? 'P' : 'T'}
                                                    </span>
                                                    <span className="text-sm font-medium text-gray-600">{s.text}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="px-[clamp(10px,3vw,16px)] pb-[clamp(6px,2vw,12px)]">
                            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                                {mobileTabs.map((tab) => (
                                    <button
                                        key={tab.key}
                                        onClick={() => handleMobileTabSelect(tab.key)}
                                        className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${activeMobileTab === tab.key ? 'bg-[#0d0c22] text-white' : 'bg-white text-gray-500 border border-gray-100'}`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </header>

                    {/* Top Sticky Header - White */}
                    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-100 transition-all duration-300 hidden md:block">
                        <div className="max-w-[1800px] mx-auto px-6 py-4">
                            <div className="flex items-center justify-between gap-4">
                                {/* Title + Search Box Inline */}
                                <div className="flex items-center gap-4 flex-1">
                                    <h1 className="font-['Playfair_Display'] text-2xl text-[#0d0c22] font-black italic tracking-tight whitespace-nowrap">
                                        {activeView === 'home' ? 'Discover' :
                                            activeView === 'myspace' ? 'My Space' :
                                                activeView === 'favorites' ? 'Favorites' :
                                                    activeView === 'products' ? 'Marketplace' : 'Eibpo'}
                                    </h1>

                                    {/* Inline Search Box - Pinterest Style */}
                                    <div className="flex-1 max-w-xl relative">
                                        <div className="flex items-center bg-gray-100 rounded-full px-4 py-2.5 border border-transparent hover:border-gray-200 focus-within:border-[#ea4c89] focus-within:bg-white focus-within:shadow-md transition-all">
                                            <span className="text-lg mr-2">🐾</span>
                                            <input
                                                type="text"
                                                value={searchQuery}
                                                onChange={(e) => {
                                                    setSearchQuery(e.target.value);
                                                    if (e.target.value.trim().length > 0) setShowSearchSuggestions(true);
                                                }}
                                                onFocus={() => {
                                                    if (searchQuery.trim().length > 0) setShowSearchSuggestions(true);
                                                }}
                                                onBlur={() => setTimeout(() => setShowSearchSuggestions(false), 200)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        handleSearch(e as any);
                                                        setShowSearchSuggestions(false);
                                                    }
                                                }}
                                                placeholder={language === 'th' ? 'ค้นหาหรือถาม AI...' : 'Search or ask AI...'}
                                                className="flex-1 bg-transparent border-none outline-none text-sm font-medium text-[#0d0c22] placeholder:text-gray-400"
                                            />
                                            <button
                                                onClick={() => {
                                                    if (searchQuery.trim()) handleSearch({ preventDefault: () => { } } as any);
                                                }}
                                                className="p-1.5 rounded-full hover:bg-[#ea4c89]/10 text-[#ea4c89] transition-colors"
                                            >
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                            </button>
                                            <button
                                                onClick={() => setActiveView('favorites')}
                                                className="p-1.5 rounded-full hover:bg-gray-200 text-gray-400 hover:text-[#ea4c89] transition-colors ml-1"
                                            >
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Header Actions */}
                                <div className="flex items-center gap-2">
                                    {/* Admin Button - Only for admins */}
                                    {user && (user.email === 'geowahaha@gmail.com' || user.email === 'truesaveus@hotmail.com' || user.profile?.is_admin) && (
                                        <button
                                            onClick={() => setAdminPanelOpen(true)}
                                            className="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-900 hover:bg-gray-800 transition-colors"
                                        >
                                            <svg className="w-4 h-4 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.350 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                            <span className="text-yellow-400 font-bold text-sm">{language === 'th' ? 'แอดมิน' : 'Admin'}</span>
                                        </button>
                                    )}

                                    {/* Language Toggle - Smooth Animated */}
                                    <LanguageToggle compact />
                                </div>
                            </div>

                            {/* Filter Tags - Clean Dribbble Pills */}
                            <div className="flex items-center gap-3 mt-4 overflow-x-auto no-scrollbar pb-2">
                                <button
                                    onClick={() => setActiveView('home')}
                                    className={`px-5 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all shadow-sm ${activeView === 'home' ? 'bg-[#0d0c22] text-white' : 'bg-white text-gray-500 hover:text-[#0d0c22] hover:shadow-md'}`}
                                >
                                    All
                                </button>
                                {[
                                    { key: 'dogs', label: '🐕 Dogs', icon: '🐕' },
                                    { key: 'cats', label: '🐱 Cats', icon: '🐱' },
                                    { key: 'birds', label: '🐦 Birds', icon: '🐦' },
                                    { key: 'horses', label: '🐴 Horses', icon: '🐴' },
                                    { key: 'livestock', label: '🐄 Livestock', icon: '🐄' },
                                    { key: 'exotics', label: '🦎 Exotics', icon: '🦎' },
                                ].map(filter => (
                                    <button
                                        key={filter.key}
                                        onClick={() => {
                                            // TODO: Implement category filter
                                        }}
                                        className="px-5 py-2 rounded-full text-sm font-bold bg-white text-gray-500 border border-transparent shadow-sm hover:shadow-md hover:text-[#ea4c89] whitespace-nowrap transition-all"
                                    >
                                        {filter.label}
                                    </button>
                                ))}
                                {/* Smart Suggestion Chips - Pink Accent */}
                                {getSearchSuggestions().filter(s => s.type === 'popular').map(s => (
                                    <button
                                        key={s.id}
                                        onClick={() => {
                                            if (s.action) s.action();
                                        }}
                                        className="px-5 py-2 rounded-full text-sm font-bold bg-white text-gray-500 hover:text-[#ea4c89] hover:shadow-md border border-transparent whitespace-nowrap transition-all flex items-center gap-2"
                                    >
                                        <span className="text-xs">🔥</span> {s.text}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </header>

                    {/* Scrollable Content */}
                    <div
                        ref={chatContainerRef}
                        className="flex-1 overflow-y-auto w-full px-[clamp(8px,3vw,16px)] sm:px-[clamp(12px,2.5vw,20px)] md:px-[clamp(16px,2vw,32px)] py-[clamp(10px,2.5vw,20px)] md:py-[clamp(16px,2vw,24px)] pb-[calc(env(safe-area-inset-bottom)+5.5rem)] md:pb-32"
                        onTouchStart={handleContentTouchStart}
                        onTouchMove={handleContentTouchMove}
                        onTouchEnd={handleContentTouchEnd}
                        style={{
                            touchAction: zoomLevel === 1 ? 'auto' : 'none',
                        }}
                    >
                        <div
                            className="max-w-[1800px] mx-auto transition-transform duration-100 ease-out md:transform-none"
                            style={{
                                transform: typeof window !== 'undefined' && window.innerWidth < 768
                                    ? `scale(${zoomLevel}) translate(${panOffset.x / zoomLevel}px, ${panOffset.y / zoomLevel}px)`
                                    : 'none',
                                transformOrigin: 'center center',
                            }}
                        >
                            {renderMainContent()}
                        </div>
                    </div>

                    {/* Zoom Indicator - Mobile Only */}
                    {zoomLevel !== 1 && (
                        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full text-sm font-bold z-50 md:hidden flex items-center gap-2 animate-in fade-in duration-200">
                            <span>🔍</span>
                            <span>{Math.round(zoomLevel * 100)}%</span>
                            <button
                                onClick={() => { setZoomLevel(1); setPanOffset({ x: 0, y: 0 }); }}
                                className="ml-2 bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded text-xs"
                            >
                                Reset
                            </button>
                        </div>
                    )}
                </main>
            </div >

            {/* Fixed Bottom Smart Bar (Moved outside main wrapper to fix 'fixed' positioning) */}
            {
                !isImmersiveSearch && (
                    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 w-[90%] max-w-2xl z-40 animate-slide-up hidden md:flex flex-col justify-end">

                        {/* Smart Suggestions Popup - White Theme */}
                        {showSearchSuggestions && (
                            <div className="w-full bg-white border border-gray-100 rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.12)] mb-3 overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
                                <div className="p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <p className="text-xs text-[#ea4c89] font-bold ml-1 uppercase tracking-wider">
                                            {language === 'th' ? 'แนะนำสำหรับคุณ' : 'Suggested for you'}
                                        </p>
                                        <button
                                            onClick={() => setShowSearchSuggestions(false)}
                                            className="text-gray-300 hover:text-gray-500"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {getSearchSuggestions().slice(0, 4).map(s => (
                                            <button
                                                key={s.id}
                                                onMouseDown={(e) => {
                                                    e.preventDefault();
                                                    setShowSearchSuggestions(false);
                                                    if (s.action) s.action();
                                                }}
                                                className="flex items-center gap-3 px-3 py-2 bg-gray-50 border border-gray-100 hover:border-[#ea4c89]/50 hover:bg-white rounded-xl transition-all group text-left"
                                            >
                                                <span className="text-lg bg-white w-8 h-8 flex items-center justify-center rounded-lg shadow-sm group-hover:shadow group-hover:bg-[#ea4c89]/10 transition-colors">
                                                    {s.type === 'recent' ? '🕒' : s.type === 'popular' ? '🔥' : '🐕'}
                                                </span>
                                                <span className="text-sm font-medium text-gray-600 group-hover:text-[#0d0c22]">{s.text}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Search Input - Glass White */}
                        <div className="w-full bg-white/95 backdrop-blur-xl border border-white/50 rounded-full p-2 flex items-center shadow-[0_8px_30px_rgb(0,0,0,0.12)] ring-1 ring-black/5">
                            {/* Magic Card Button - Pink Gradient */}
                            <button
                                onClick={() => setAddCardModalOpen(true)}
                                className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#ea4c89] to-[#ff8fab] flex items-center justify-center text-white shadow-lg shadow-[#ea4c89]/30 hover:scale-110 transition-transform flex-shrink-0"
                                title="Create Magic Card"
                            >
                                <MagicCardIcon />
                            </button>

                            {/* Smart Search Input */}
                            <div className="flex-1 mx-3 relative">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onFocus={() => {
                                        if (enableDesignExplorer) setIsImmersiveSearch(true);
                                        if (searchQuery.trim().length > 0) setShowSearchSuggestions(true);
                                    }}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        if (e.target.value.trim().length > 0) setShowSearchSuggestions(true);
                                    }}
                                    onBlur={() => setTimeout(() => setShowSearchSuggestions(false), 200)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleSearch(e as any);
                                            setShowSearchSuggestions(false);
                                        }
                                    }}
                                    placeholder={language === 'th' ? 'ค้นหาหรือถาม AI...' : 'Search or ask AI...'}
                                    className="w-full bg-transparent border-none text-[#0d0c22] placeholder:text-gray-400 focus:ring-0 text-sm font-medium"
                                />
                                {isAiTyping && (
                                    <div className="absolute right-0 top-1/2 transform -translate-y-1/2">
                                        <div className="flex gap-1">
                                            <div className="w-1.5 h-1.5 bg-[#ea4c89] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                            <div className="w-1.5 h-1.5 bg-[#ea4c89] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                            <div className="w-1.5 h-1.5 bg-[#ea4c89] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => {
                                        if (searchQuery.trim()) handleSearch({ preventDefault: () => { } } as any);
                                    }}
                                    className="p-2 rounded-full hover:bg-gray-100 text-[#ea4c89] transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                </button>
                                <div className="w-px h-6 bg-gray-100 mx-1"></div>
                                <button
                                    onClick={() => setActiveView('favorites')}
                                    className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-[#ea4c89] transition-colors relative"
                                    title={language === 'th' ? 'รายการโปรด' : 'Favorites'}
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Mobile Bottom Navigation */}
            {
                !isImmersiveSearch && (
                    <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 border-t border-gray-100 backdrop-blur-md md:hidden">
                        <div className="flex items-center justify-between px-[clamp(12px,3vw,20px)] pt-[clamp(6px,2vw,10px)] pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
                            <button
                                onClick={() => {
                                    setActiveView('home');
                                    setActiveCategory('all');
                                    setActiveMobileTab('all');
                                    setPuppyFocus(null);
                                    exitSearchMode();
                                }}
                                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${activeView === 'home' && !isSearchMode ? 'text-[#ea4c89] bg-[#ea4c89]/10' : 'text-gray-400 hover:text-[#0d0c22]'}`}
                                aria-label="Home"
                            >
                                <HomeIcon />
                            </button>
                            <button
                                onClick={() => {
                                    setActiveView('home');
                                    setActiveCategory('all');
                                    setActiveMobileTab('all');
                                    exitSearchMode();
                                    setForceMobileHeader(true);
                                    setShowMobileHeader(true);
                                    chatContainerRef.current?.scrollTo({ top: 0, behavior: 'auto' });
                                    window.scrollTo({ top: 0, behavior: 'auto' });
                                    setTimeout(() => searchInputRef.current?.focus(), 50);
                                }}
                                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${isSearchMode ? 'text-[#ea4c89] bg-[#ea4c89]/10' : 'text-gray-400 hover:text-[#0d0c22]'}`}
                                aria-label="Search"
                            >
                                <SearchIconNav />
                            </button>
                            <button
                                onClick={() => setAddCardModalOpen(true)}
                                className="w-12 h-12 rounded-2xl flex items-center justify-center bg-[#ea4c89] text-white shadow-lg shadow-[#ea4c89]/30"
                                aria-label="Create"
                            >
                                <MagicCardIcon />
                            </button>
                            <button
                                onClick={handleMessageShortcut}
                                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${messagePanelOpen ? 'text-[#ea4c89] bg-[#ea4c89]/10' : 'text-gray-400 hover:text-[#0d0c22]'}`}
                                aria-label="Messages"
                            >
                                <MessageIcon count={unreadChatCount} />
                            </button>
                            <button
                                onClick={() => {
                                    if (user) {
                                        setCurrentBreederId(user.id);
                                        setBreederProfileOpen(true);
                                    } else {
                                        setAuthModalOpen(true);
                                    }
                                }}
                                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${breederProfileOpen ? 'text-[#ea4c89] bg-[#ea4c89]/10' : 'text-gray-400 hover:text-[#0d0c22]'}`}
                                aria-label="Profile"
                            >
                                {user ? <UserAvatar name={user.profile?.full_name || user.email} /> : <UserIcon />}
                            </button>
                        </div>
                    </div>
                )
            }

            {/* ===== IMMERSIVE SEARCH OVERLAY (The 'Thanos' New World) ===== */}
            {
                enableDesignExplorer && immersiveAnimation !== 'hidden' && (
                    <div className={`fixed inset-0 z-[60] bg-[#FDFBF7] transition-all duration-700 ease-in-out flex flex-col ${immersiveAnimation === 'active' ? 'opacity-100' : 'opacity-0'}`}>
                        {/* Header for Immersive Mode */}
                        <div className="flex items-center justify-between px-8 py-6">
                            <h1 className="font-['Playfair_Display'] text-3xl text-[#333] font-black tracking-tight flex items-center gap-2">
                                Eibpo <span className="bg-[#EA4C89] text-white text-[10px] px-2 py-1 rounded-full tracking-widest font-sans font-bold uppercase shadow-md transform -rotate-6">Design</span>
                            </h1>
                            <button
                                onClick={() => {
                                    setIsImmersiveSearch(false);
                                    setSearchQuery('');
                                }}
                                className="w-10 h-10 rounded-full bg-[#EEE] hover:bg-[#DDD] flex items-center justify-center text-[#555] transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>

                        {/* Content Container */}
                        <div className="flex-1 overflow-y-auto px-4 md:px-20 pb-40">
                            <div className="max-w-7xl mx-auto w-full">

                                {/* 1. Hero Search Section */}
                                <div className="text-center py-16 md:py-24">
                                    <h2 className="text-4xl md:text-6xl font-['Playfair_Display'] font-black text-[#0D0C22] mb-6 leading-tight">
                                        Discover the World's<br />
                                        <span className="text-[#EA4C89]">Top Breeding Lines</span>
                                    </h2>
                                    <p className="text-lg md:text-xl text-[#6e6d7a] mb-12 max-w-2xl mx-auto leading-relaxed">
                                        Explore work from the most talented breeders and accomplished kennels ready to take on your next improvement.
                                    </p>

                                    <div className="max-w-2xl mx-auto relative z-20 group">
                                        {/* Soft Glow */}
                                        <div className="absolute inset-0 bg-pink-200 blur-3xl opacity-20 rounded-full transform translate-y-4 scale-90 group-hover:opacity-30 transition-opacity duration-500"></div>

                                        {/* Magic Bar Container */}
                                        <div className="bg-white rounded-full shadow-[0_8px_40px_rgba(0,0,0,0.08)] p-2 pr-6 flex items-center gap-3 border border-pink-50/50 backdrop-blur-xl transition-all duration-300 hover:shadow-[0_12px_50px_rgba(234,76,137,0.12)] hover:-translate-y-1">

                                            {/* Magic Button (Left) */}
                                            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#ea4c89] to-[#ff8da1] flex items-center justify-center text-white shadow-lg shadow-pink-500/30 flex-shrink-0 cursor-pointer animate-pulse-slow group/btn hover:scale-105 transition-transform">
                                                <svg className="w-6 h-6 group-hover/btn:rotate-12 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                                </svg>
                                            </div>

                                            {/* Input */}
                                            <input
                                                autoFocus
                                                type="text"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        handleSearch(e);
                                                        setIsImmersiveSearch(false);
                                                    }
                                                }}
                                                placeholder={language === 'th' ? "ค้นหาสายพันธุ์ หรือถาม AI..." : "Search or ask AI..."}
                                                className="flex-1 bg-transparent border-none outline-none text-[#0d0c22] placeholder-gray-400 font-medium text-lg h-12 px-2"
                                            />

                                            {/* Right Icons */}
                                            <div className="flex items-center gap-5 pl-5 border-l border-gray-100">
                                                <button
                                                    onClick={(e) => { handleSearch(e as any); setIsImmersiveSearch(false); }}
                                                    className="text-[#ea4c89] hover:scale-110 transition-transform"
                                                    title="Search"
                                                >
                                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    className="text-gray-300 hover:text-red-500 transition-colors"
                                                    title="Favorites"
                                                    onClick={() => setActiveView('favorites')}
                                                >
                                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Popular Tags */}
                                    <div className="flex flex-wrap justify-center gap-3 mt-8">
                                        <span className="text-[#9e9ea7] font-medium mr-2">Popular:</span>
                                        {['Thai Ridgeback', 'Pomeranian', 'French Bulldog', 'Golden Retriever'].map(tag => (
                                            <button key={tag} onClick={() => { setSearchQuery(tag); setIsImmersiveSearch(false); executeSmartSearch(tag); }} className="border border-gray-200 bg-white text-[#6e6d7a] px-4 py-1.5 rounded-full text-sm font-medium hover:border-[#EA4C89] hover:text-[#EA4C89] transition-colors shadow-sm">
                                                {tag}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* 2. Video Timeline Inspiration (Ken Burns simulated) */}
                                <div className="mb-20">
                                    <div className="flex items-center justify-between mb-8">
                                        <h3 className="text-2xl font-bold text-[#0D0C22]">Inspiration for you</h3>
                                        <div className="flex gap-2">
                                            <button className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>
                                            <button className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                                        {/* Generate 4 mock video cards from existing pets */}
                                        {allPets.slice(0, 4).map((pet, i) => (
                                            <div key={pet.id} className="group relative">
                                                <div className="aspect-[3/4] rounded-[32px] overflow-hidden bg-gray-100 relative shadow-md group-hover:shadow-2xl transition-all duration-500 translate-y-0 group-hover:-translate-y-2">
                                                    {/* Image with Ken Burns Effect on Hover */}
                                                    <img
                                                        src={pet.image}
                                                        alt={pet.name}
                                                        className="w-full h-full object-cover transform scale-100 group-hover:scale-110 transition-transform duration-kenburns ease-out"
                                                    />
                                                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/60 opacity-60 group-hover:opacity-80 transition-opacity"></div>

                                                    {/* Play Button Mock */}
                                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                        <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/50">
                                                            <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                                        </div>
                                                    </div>

                                                    {/* Meta Info */}
                                                    <div className="absolute bottom-6 left-6 right-6 text-white transform translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <div className="w-6 h-6 rounded-full bg-white/20 overflow-hidden">
                                                                <div className="w-full h-full bg-gradient-to-tr from-pink-500 to-orange-400"></div>
                                                            </div>
                                                            <span className="text-sm font-medium text-white/90">{pet.owner}</span>
                                                        </div>
                                                        <p className="font-bold text-lg leading-tight mb-1">{pet.name}</p>
                                                        <p className="text-xs text-white/70 line-clamp-1">{pet.breed}</p>
                                                    </div>

                                                    {/* Badge */}
                                                    <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold text-white border border-white/10 uppercase tracking-widest">
                                                        Timeline
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>
                )
            }


            {/* ===== MESSAGE / NOTIFICATION POPUPS ===== */}

            {/* Boost Confirmation Modal */}
            <Dialog open={!!boostConfirmPet} onOpenChange={(open) => !open && setBoostConfirmPet(null)}>
                <DialogContent className="bg-[#111111] border-0 sm:border sm:border-[#C5A059] text-white sm:rounded-3xl">
                    <DialogHeader>
                        <DialogTitle className="text-[#C5A059] flex items-center gap-2">
                            🚀 Boost Listing
                        </DialogTitle>
                        <DialogDescription className="text-[#B8B8B8]">
                            Promote <strong>{boostConfirmPet?.name}</strong> to the top of the feed for 24 hours?
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 text-center">
                        <p className="text-4xl font-bold text-white mb-2">{BOOST_COST}</p>
                        <p className="text-[#C5A059] uppercase tracking-widest text-xs">TRD COINS</p>
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <button
                            onClick={() => setBoostConfirmPet(null)}
                            className="px-4 py-2 rounded-lg bg-[#1A1A1A] text-[#B8B8B8] hover:bg-[#2A2A2A] transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirmBoost}
                            disabled={isBoosting}
                            className="px-4 py-2 rounded-lg bg-[#C5A059] text-black font-bold hover:bg-[#D4C4B5] transition-colors flex items-center justify-center gap-2"
                        >
                            {isBoosting ? 'Processing...' : 'Confirm Boost'}
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ===== MESSAGE / NOTIFICATION POPUPS ===== */}
            {
                messagePanelOpen && (
                    <div className="fixed inset-0 z-[70]" onClick={closePanels}>
                        <div
                            className="absolute left-4 right-4 top-4 bottom-4 md:left-20 md:right-auto md:top-6 md:bottom-6 md:w-[360px] bg-[#111111] border border-[#C5A059]/15 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-4 border-b border-[#C5A059]/15 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] uppercase tracking-[0.2em] text-[#C5A059]/60">Messages</p>
                                    <h3 className="text-lg font-['Playfair_Display'] text-[#F5F5F0]">Inbox</h3>
                                </div>
                                <button
                                    onClick={closePanels}
                                    className="w-8 h-8 rounded-full border border-[#C5A059]/20 text-[#B8B8B8] hover:text-[#F5F5F0] hover:border-[#C5A059]/40 transition-colors"
                                >
                                    ✕
                                </button>
                            </div>

                            {!user ? (
                                <div className="p-6 text-center">
                                    <p className="text-sm text-[#B8B8B8]/70 mb-4">
                                        {language === 'th' ? 'เข้าสู่ระบบเพื่อดูข้อความ' : 'Sign in to view messages.'}
                                    </p>
                                    <button
                                        onClick={() => { closePanels(); setAuthModalOpen(true); }}
                                        className="px-6 py-2 rounded-full bg-[#C5A059] text-[#0A0A0A] text-xs font-bold hover:bg-[#D4C4B5] transition-colors"
                                    >
                                        {language === 'th' ? 'เข้าสู่ระบบ' : 'Sign In'}
                                    </button>
                                </div>
                            ) : (
                                <div className="flex-1 overflow-y-auto">
                                    <div className="px-4 pt-4">
                                        <button
                                            onClick={() => { closePanels(); setActiveView('home'); }}
                                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-[#0A0A0A] border border-[#C5A059]/20 text-[#F5F5F0] hover:border-[#C5A059]/50 transition-colors"
                                        >
                                            <span className="w-9 h-9 rounded-full bg-[#C5A059] text-[#0A0A0A] flex items-center justify-center text-lg font-bold">＋</span>
                                            <span className="text-sm font-semibold">{language === 'th' ? 'ส่งข้อความใหม่' : 'New message'}</span>
                                        </button>
                                    </div>

                                    <div className="px-4 pt-5 pb-2">
                                        <p className="text-[10px] uppercase tracking-[0.2em] text-[#C5A059]/60">
                                            {language === 'th' ? 'ข้อความล่าสุด' : 'Messages'}
                                        </p>
                                    </div>

                                    {messageLoading ? (
                                        <div className="px-4 py-6 text-center text-xs text-[#B8B8B8]/60">Loading...</div>
                                    ) : messageError ? (
                                        <div className="px-4 py-6 text-center text-xs text-red-400">{messageError}</div>
                                    ) : messageThreads.length === 0 ? (
                                        <div className="px-4 py-6 text-center text-xs text-[#B8B8B8]/60">
                                            {language === 'th' ? 'ยังไม่มีข้อความ' : 'No messages yet.'}
                                        </div>
                                    ) : (
                                        <div className="space-y-1 px-2">
                                            {(expandedMessages ? messageThreads : messageThreads.slice(0, 4)).map((thread) => (
                                                <button
                                                    key={thread.roomId}
                                                    onClick={() => handleThreadOpen(thread)}
                                                    className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[#1A1A1A] transition-colors"
                                                >
                                                    <div className="w-10 h-10 rounded-full bg-[#C5A059]/10 overflow-hidden flex items-center justify-center text-sm font-bold text-[#C5A059]">
                                                        {thread.avatarUrl ? (
                                                            <img src={thread.avatarUrl} alt={thread.targetUserName} className="w-full h-full object-cover" />
                                                        ) : (
                                                            thread.targetUserName.charAt(0).toUpperCase()
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0 text-left">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <p className="text-sm font-semibold text-[#F5F5F0] truncate">{thread.targetUserName}</p>
                                                            <span className="text-[10px] text-[#B8B8B8]/60">{formatRelativeTime(thread.lastMessageAt)}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            {thread.unreadCount > 0 && (
                                                                <span className="text-[9px] uppercase tracking-wide bg-[#C5A059] text-[#0A0A0A] px-2 py-0.5 rounded-full">
                                                                    New
                                                                </span>
                                                            )}
                                                            <p className="text-xs text-[#B8B8B8]/70 truncate">{formatMessagePreview(thread)}</p>
                                                        </div>
                                                    </div>
                                                    {thread.unreadCount > 0 && (
                                                        <span className="ml-2 w-5 h-5 rounded-full bg-[#C5A059] text-[#0A0A0A] text-[10px] font-bold flex items-center justify-center">
                                                            {thread.unreadCount > 9 ? '9+' : thread.unreadCount}
                                                        </span>
                                                    )}
                                                </button>
                                            ))}
                                            {messageThreads.length > 4 && (
                                                <button
                                                    onClick={() => setExpandedMessages(!expandedMessages)}
                                                    className="w-full py-2 text-xs text-[#C5A059] hover:text-[#D4C4B5] transition-colors flex items-center justify-center gap-1 font-medium mt-2"
                                                >
                                                    {expandedMessages ? (
                                                        <>{language === 'th' ? 'แสดงน้อยลง' : 'Show Less'} <span className="transform rotate-180">▼</span></>
                                                    ) : (
                                                        <>{language === 'th' ? 'ดูข้อความทั้งหมด' : 'Show All Messages'} ({messageThreads.length - 4}) ▼</>
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    <div className="px-4 pt-6 pb-6">
                                        <p className="text-[10px] uppercase tracking-[0.2em] text-[#C5A059]/60 mb-3">
                                            {language === 'th' ? 'แนะนำ' : 'Suggested'}
                                        </p>
                                        <div className="space-y-2">
                                            {messageSuggestions.map((suggestion) => (
                                                <button
                                                    key={suggestion.id}
                                                    onClick={suggestion.action}
                                                    className="w-full text-left px-4 py-3 rounded-xl bg-[#0A0A0A] border border-[#C5A059]/15 hover:border-[#C5A059]/40 transition-colors"
                                                >
                                                    <p className="text-sm font-semibold text-[#F5F5F0]">{suggestion.title}</p>
                                                    <p className="text-xs text-[#B8B8B8]/60 mt-1">{suggestion.description}</p>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )
            }

            {
                notificationPanelOpen && (
                    <div className="fixed inset-0 z-[70]" onClick={closePanels}>
                        <div
                            className="absolute left-4 right-4 top-4 bottom-4 md:left-20 md:right-auto md:top-6 md:bottom-6 md:w-[360px] bg-[#111111] border border-[#C5A059]/15 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="p-4 border-b border-[#C5A059]/15 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] uppercase tracking-[0.2em] text-[#C5A059]/60">Updates</p>
                                    <h3 className="text-lg font-['Playfair_Display'] text-[#F5F5F0]">Notifications</h3>
                                </div>
                                <div className="flex items-center gap-2">
                                    {notificationItems.some(item => !item.is_read) && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                markAllNotificationsRead();
                                            }}
                                            className="text-[10px] uppercase tracking-[0.2em] text-[#C5A059] hover:text-[#D4C4B5]"
                                        >
                                            Mark all
                                        </button>
                                    )}
                                    <button
                                        onClick={closePanels}
                                        className="w-8 h-8 rounded-full border border-[#C5A059]/20 text-[#B8B8B8] hover:text-[#F5F5F0] hover:border-[#C5A059]/40 transition-colors"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>

                            {!user ? (
                                <div className="p-6 text-center">
                                    <p className="text-sm text-[#B8B8B8]/70 mb-4">
                                        {language === 'th' ? 'เข้าสู่ระบบเพื่อดูการแจ้งเตือน' : 'Sign in to view notifications.'}
                                    </p>
                                    <button
                                        onClick={() => { closePanels(); setAuthModalOpen(true); }}
                                        className="px-6 py-2 rounded-full bg-[#C5A059] text-[#0A0A0A] text-xs font-bold hover:bg-[#D4C4B5] transition-colors"
                                    >
                                        {language === 'th' ? 'เข้าสู่ระบบ' : 'Sign In'}
                                    </button>
                                </div>
                            ) : (
                                <div className="flex-1 overflow-y-auto px-2 py-4">
                                    {notificationLoading ? (
                                        <div className="px-4 py-6 text-center text-xs text-[#B8B8B8]/60">Loading...</div>
                                    ) : notificationItems.length === 0 ? (
                                        <div className="px-4 py-6 text-center text-xs text-[#B8B8B8]/60">
                                            {language === 'th' ? 'ยังไม่มีการแจ้งเตือน' : 'No updates yet.'}
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            {unreadNotificationItems.length > 0 && (
                                                <div>
                                                    <p className="px-4 pb-2 text-[10px] uppercase tracking-[0.2em] text-[#C5A059]/60">
                                                        {language === 'th' ? 'ใหม่' : 'New'}
                                                    </p>
                                                    <div className="space-y-1">
                                                        {unreadNotificationItems.map((item) => (
                                                            <button
                                                                key={item.id}
                                                                onClick={() => handleNotificationItemClick(item)}
                                                                className="w-full flex items-start gap-3 px-3 py-3 rounded-xl bg-[#1A1A1A] border border-[#C5A059]/20 transition-colors"
                                                            >
                                                                <div className="w-9 h-9 rounded-full bg-[#0A0A0A] border border-[#C5A059]/20 flex items-center justify-center text-lg">
                                                                    {renderNotificationIcon(item.type)}
                                                                </div>
                                                                <div className="flex-1 min-w-0 text-left">
                                                                    <div className="flex items-center justify-between gap-2">
                                                                        <p className="text-sm font-semibold text-[#F5F5F0]">
                                                                            {item.title}
                                                                        </p>
                                                                        <span className="text-[10px] text-[#B8B8B8]/60">{formatRelativeTime(item.created_at)}</span>
                                                                    </div>
                                                                    <p className="text-xs text-[#B8B8B8]/70 mt-1 line-clamp-2">{item.message}</p>
                                                                </div>
                                                                <span className="mt-2 w-2 h-2 rounded-full bg-[#C5A059]" />
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {seenNotificationItems.length > 0 && (
                                                <div>
                                                    <p className="px-4 pb-2 text-[10px] uppercase tracking-[0.2em] text-[#C5A059]/60">
                                                        {language === 'th' ? 'เห็นแล้ว' : 'Seen'}
                                                    </p>
                                                    <div className="space-y-1">
                                                        {seenNotificationItems.map((item) => (
                                                            <button
                                                                key={item.id}
                                                                onClick={() => handleNotificationItemClick(item)}
                                                                className="w-full flex items-start gap-3 px-3 py-3 rounded-xl hover:bg-[#1A1A1A] transition-colors"
                                                            >
                                                                <div className="w-9 h-9 rounded-full bg-[#0A0A0A] border border-[#C5A059]/10 flex items-center justify-center text-lg">
                                                                    {renderNotificationIcon(item.type)}
                                                                </div>
                                                                <div className="flex-1 min-w-0 text-left">
                                                                    <div className="flex items-center justify-between gap-2">
                                                                        <p className="text-sm font-semibold text-[#B8B8B8]">
                                                                            {item.title}
                                                                        </p>
                                                                        <span className="text-[10px] text-[#B8B8B8]/60">{formatRelativeTime(item.created_at)}</span>
                                                                    </div>
                                                                    <p className="text-xs text-[#B8B8B8]/60 mt-1 line-clamp-2">{item.message}</p>
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )
            }

            <Suspense fallback={<LazyModalFallback />}>
                {/* ===== ACTIVE CHAT WINDOWS ===== */}
                {
                    activeChats.map((chat, index) => (
                        <div
                            key={chat.roomId}
                            style={{
                                position: 'fixed',
                                bottom: '1rem',
                                right: `${1 + (index * 25)}rem`,
                                zIndex: 1000 + index
                            }}
                        >
                            <ChatWindow
                                roomId={chat.roomId}
                                targetUserName={chat.targetUserName}
                                initialMessage={chat.initialMessage}
                                petInfo={chat.petInfo}
                                onClose={() => closeChat(chat.roomId)}
                            />
                        </div>
                    ))
                }

                {/* ===== MODALS ===== */}
                {
                    dashboardOpen && (
                        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#0A0A0A]/95 backdrop-blur-sm">
                            <BreederDashboard onClose={() => setDashboardOpen(false)} />
                        </div>
                    )
                }

                <PetRegistrationModal isOpen={registerModalOpen} onClose={() => setRegisterModalOpen(false)} onSuccess={handlePetRegistered} />
                <PedigreeModal isOpen={pedigreeModalOpen} onClose={() => setPedigreeModalOpen(false)} pet={selectedPet} onPetClick={handleViewPedigree} />
                <CartModal isOpen={cartModalOpen} onClose={() => setCartModalOpen(false)} items={cart} onUpdateQuantity={updateCartQuantity} onRemoveItem={removeFromCart} onClearCart={clearCart} />
                <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
                <ProductModal isOpen={productModalOpen} onClose={() => setProductModalOpen(false)} product={selectedProduct} onAddToCart={(p, q) => addToCart(p, q)} />
                {/* Enhanced Pinterest-Style Pet Modal v2 */}
                <EnhancedPinterestModal
                    isOpen={petDetailsModalOpen}
                    onClose={() => {
                        setPetDetailsModalOpen(false);
                        setPetDetailsFocus(null);
                        if (location.pathname.startsWith('/pet/')) {
                            navigate('/', { replace: true });
                        }
                    }}
                    pet={selectedPet!}
                    onViewPedigree={handleViewPedigree}
                    onFindMate={(pet) => {
                        setPetDetailsModalOpen(false);
                        setPetDetailsFocus(null);
                        navigate(`/breeding/${pet.id}`);
                    }}
                    isOwner={selectedPet?.owner_id === user?.id || Boolean(user && (user.email === 'geowahaha@gmail.com' || user.email === 'truesaveus@hotmail.com' || user.profile?.is_admin))}
                    isAdmin={Boolean(user && (user.email === 'geowahaha@gmail.com' || user.email === 'truesaveus@hotmail.com' || user.profile?.is_admin))}
                    currentUserId={user?.id}
                    canManageHealthProfile={Boolean(user && (user.profile?.role === 'admin' || selectedPet?.owner_id === user.id))}
                    initialSection={petDetailsFocus}
                />
                <BreedingMatchModal
                    isOpen={!!breedingMatchPet}
                    onClose={() => setBreedingMatchPet(null)}
                    sourcePet={breedingMatchPet}
                />
                <AdminPanel isOpen={adminPanelOpen} onClose={() => setAdminPanelOpen(false)} />
                <BreederProfileModal
                    isOpen={breederProfileOpen}
                    onClose={() => setBreederProfileOpen(false)}
                    userId={currentBreederId || user?.id}
                    currentUserId={user?.id}
                    onViewPet={handleViewPetDetails}
                />
                {/* Wallet Modal */}
                <WalletModal
                    isOpen={walletModalOpen}
                    onClose={() => setWalletModalOpen(false)}
                />
                <AddExternalCardModal
                    isOpen={addCardModalOpen}
                    onClose={() => setAddCardModalOpen(false)}
                    onAdd={handleAddExternalCard}
                    onRegisterPet={() => setRegisterModalOpen(true)}
                />
                {petToDelete && (
                    <DeletePetModal
                        isOpen={deleteModalOpen}
                        onClose={() => { setDeleteModalOpen(false); setPetToDelete(null); }}
                        onConfirm={handleConfirmDelete}
                        petName={petToDelete.name}
                        isMagicCard={petToDelete.breed === 'External Import'}
                    />
                )}
            </Suspense>
        </div >
    );
};

// PetCard component moved to src/components/ui/PetCard.tsx

// ============ SIDEBAR ICON ============
const SidebarIcon: React.FC<{
    icon: React.ReactNode;
    label: string;
    active?: boolean;
    highlight?: boolean;
    onClick: () => void;
}> = ({ icon, label, active, highlight, onClick }) => (
    <button
        onClick={onClick}
        className={`
      relative group w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300
      ${active ? 'bg-[#ea4c89] text-white shadow-lg shadow-[#ea4c89]/20' : 'text-gray-400 hover:text-[#0d0c22] hover:bg-gray-100'}
      ${highlight ? 'bg-[#ea4c89] text-white hover:bg-[#d63f7a] shadow-lg shadow-[#ea4c89]/20' : ''}
    `}
    >
        {icon}

        {/* Tooltip */}
        <span className="absolute left-full ml-3 px-3 py-1.5 bg-[#0d0c22] text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 shadow-xl font-medium">
            {label}
        </span>
    </button>
);

// ============ ICONS ============
const HomeIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
const SearchIconNav = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;
const MagicCardIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <rect x="4" y="6" width="16" height="12" rx="2" strokeWidth={1.5} />
        <path d="M12 8l.6 1.4 1.5.1-1.1.9.4 1.4-1.4-.8-1.4.8.4-1.4-1.1-.9 1.5-.1L12 8z" fill="currentColor" stroke="none" />
    </svg>
);
const PuppyIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const ShopIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>;
const SettingsIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const UserIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
const MySpaceIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>;

const NotificationIcon: React.FC<{ count?: number }> = ({ count }) => (
    <div className="relative">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {count && count > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {count > 9 ? '9+' : count}
            </span>
        )}
    </div>
);

const MessageIcon: React.FC<{ count?: number }> = ({ count }) => (
    <div className="relative">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        {count && count > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                {count}
            </span>
        )}
    </div>
);

const CartIconSidebar: React.FC<{ count: number }> = ({ count }) => (
    <div className="relative">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        {count > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                {count}
            </span>
        )}
    </div>
);

const UserAvatar: React.FC<{ name: string }> = ({ name }) => (
    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 text-xs font-bold border border-white shadow-sm">
        {name?.charAt(0).toUpperCase() || 'U'}
    </div>
);

export default EibpoLayout;
