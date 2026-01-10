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

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Pet, Product, products } from '@/data/petData';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getPublicPets, Pet as DbPet, searchPets, initChat, createPet } from '@/lib/database';
import { think as aiThink } from '@/lib/ai/petdegreeBrain';
import { supabase } from '@/lib/supabase';

// Import modals
import PetRegistrationModal from '../PetRegistrationModal';
import PedigreeModal from '../modals/PedigreeModal';
import CartModal from '../modals/CartModal';
import AuthModal from '../modals/AuthModal';
import ProductModal from '../modals/ProductModal';
import PetDetailsModal from '../modals/PetDetailsModal';
import PetCard from '../ui/PetCard';
import BreedingMatchModal from '../modals/BreedingMatchModal';
import BreederDashboard from '../BreederDashboard';
import AdminPanel from '../AdminPanel';
import BreederProfileModal from '../modals/BreederProfileModal';
import ChatWindow from '../chat/ChatWindow';
import SearchSection from '../SearchSection';
import MarketplaceSection from '../MarketplaceSection';
import PuppyComingSoonSection from '../PuppyComingSoonSection';
import NotificationPanel from '../NotificationPanel';

import WalletModal from '../modals/WalletModal';
import { AddExternalCardModal } from '../modals/AddExternalCardModal';
import { boostPet, BOOST_COST } from '@/lib/wallet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

// Types
interface CartItem {
    product: Product;
    quantity: number;
}

type ActiveView = 'home' | 'search' | 'products' | 'puppies' | 'breeding' | 'messages' | 'notifications' | 'chat' | 'myspace' | 'favorites';

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

// ============ EIBPO LAYOUT (Pinterest + ChatGPT) ============
const EibpoLayout: React.FC = () => {
    const { user, savedCart, syncCart } = useAuth();
    const { language, setLanguage } = useLanguage();

    // State
    const [activeView, setActiveView] = useState<ActiveView>('home');
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

    // Chat state
    const [activeChats, setActiveChats] = useState<ChatRoom[]>([]);

    // Modal states
    const [registerModalOpen, setRegisterModalOpen] = useState(false);
    const [pedigreeModalOpen, setPedigreeModalOpen] = useState(false);
    const [cartModalOpen, setCartModalOpen] = useState(false);
    const [authModalOpen, setAuthModalOpen] = useState(false);
    const [productModalOpen, setProductModalOpen] = useState(false);
    const [petDetailsModalOpen, setPetDetailsModalOpen] = useState(false);
    const [dashboardOpen, setDashboardOpen] = useState(false);
    const [adminPanelOpen, setAdminPanelOpen] = useState(false);
    const [breederProfileOpen, setBreederProfileOpen] = useState(false);
    const [currentBreederId, setCurrentBreederId] = useState<string | null>(null);
    const [expandedMessages, setExpandedMessages] = useState(false);

    // Selected items
    const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

    // Wallet State
    const [walletModalOpen, setWalletModalOpen] = useState(false);
    const [addCardModalOpen, setAddCardModalOpen] = useState(false);
    const [boostConfirmPet, setBoostConfirmPet] = useState<Pet | null>(null);
    const [isBoosting, setIsBoosting] = useState(false);

    // Refs
    const searchInputRef = useRef<HTMLInputElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    // Convert DB Pet
    const convertDbPet = (dbPet: DbPet): Pet => ({
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
        parentIds: dbPet.pedigree ? {
            sire: dbPet.pedigree.sire_id || undefined,
            dam: dbPet.pedigree.dam_id || undefined
        } : undefined,
        boosted_until: dbPet.boosted_until,
        created_at: dbPet.created_at
    });

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
    const handleAddExternalCard = async (data: { link: string; caption: string; mediaType: 'image' | 'video' }) => {
        let newCard: any;

        if (user) {
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
                newCard = savedPet;
            } catch (err) {
                console.error("Failed to save magic card", err);
                alert("Failed to save to database. Adding locally.");
                // Fallback to local
                newCard = {
                    id: `ext-${Date.now()}`,
                    name: data.caption || 'Magic Card',
                    breed: 'External Import',
                    type: 'dog',
                    gender: 'male',
                    birth_date: '2024-01-01', created_at: new Date().toISOString(), updated_at: '',
                    image: data.link,
                    video_url: data.mediaType === 'video' ? data.link : undefined,
                    media_type: data.mediaType,
                    source: 'internal',
                    is_public: true,
                    owner_id: user.id,
                    owner: user.profile || { full_name: 'Me', email: '', verified_breeder: false }
                };
            }
        } else {
            alert("Guest Mode: Card will generally fade after refresh. Log in to save forever!");
            newCard = {
                id: `ext-${Date.now()}`,
                name: data.caption || 'Magic Card',
                breed: 'External Import',
                type: 'dog',
                gender: 'male',
                birth_date: '2024-01-01', created_at: new Date().toISOString(), updated_at: '',
                image: data.link,
                image_url: data.link,
                video_url: data.mediaType === 'video' ? data.link : undefined,
                media_type: data.mediaType,
                source: 'internal',
                is_public: true,
                owner_id: 'guest',
                owner: { full_name: 'Guest User', email: '', verified_breeder: false }
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

                if (aBoost !== bBoost) return bBoost - aBoost;
                // Fallback to Newest First
                const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
                const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
                return dateB - dateA;
            });

            // Mock Video & External Cards
            const mockExt: Pet[] = [
                {
                    id: 'mock-vid-1',
                    name: 'Funny Dog Compilation',
                    breed: 'Golden Retriever',
                    type: 'dog',
                    gender: 'male',
                    birth_date: '2023-01-01', created_at: new Date().toISOString(), updated_at: '',
                    image_url: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1',
                    image: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1',
                    video_url: 'https://assets.mixkit.co/videos/preview/mixkit-dog-catching-a-ball-in-slow-motion-1271-large.mp4',
                    media_type: 'video',
                    location: 'Viral',
                    health_certified: false,
                    is_public: true,
                    owner_id: 'mock',
                    owner: { full_name: 'DogLovers', email: '', verified_breeder: false }
                },
                {
                    id: 'mock-ext-1',
                    name: 'Top 10 Grooming Tips',
                    breed: 'Poodle',
                    type: 'dog',
                    gender: 'female',
                    birth_date: '2023-01-01', created_at: new Date().toISOString(), updated_at: '',
                    image_url: 'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7',
                    image: 'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7',
                    source: 'instagram',
                    location: 'Instagram',
                    health_certified: false,
                    is_public: true,
                    owner_id: 'mock',
                    owner: { full_name: 'PetStyle', email: '', verified_breeder: false }
                },
                {
                    id: 'mock-ext-2',
                    name: 'Luxury Dog House Ideas',
                    breed: 'Mixed',
                    type: 'dog',
                    gender: 'male',
                    birth_date: '2023-01-01', created_at: new Date().toISOString(), updated_at: '',
                    image_url: 'https://images.unsplash.com/photo-1541599540903-216a46ca1dc0',
                    image: 'https://images.unsplash.com/photo-1541599540903-216a46ca1dc0',
                    source: 'pinterest',
                    is_sponsored: true,
                    location: 'Pinterest',
                    health_certified: false,
                    is_public: true,
                    owner_id: 'mock',
                    owner: { full_name: 'DesignWeekly', email: '', verified_breeder: false }
                }
            ];

            const finalPets = [...mockExt, ...sorted];
            console.log("DEBUG: Injecting Mocks", mockExt.length, finalPets.length);
            setAllPets(finalPets);
            setFilteredPets(finalPets);
        });
    }, []);

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

    // Handlers
    const handleRegisterClick = () => {
        if (!user) {
            setAuthModalOpen(true);
        } else {
            setRegisterModalOpen(true);
        }
    };

    const handleViewPetDetails = (pet: Pet) => {
        setSelectedPet(pet);
        setPetDetailsModalOpen(true);
    };

    const handleViewPedigree = (pet: Pet) => {
        setSelectedPet(pet);
        setPedigreeModalOpen(true);
    };

    const handleQuickView = (product: Product) => {
        setSelectedProduct(product);
        setProductModalOpen(true);
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
        if (notification.type === 'puppy') {
            handleOpenPuppySection('available');
            return;
        }
        if (notification.type === 'breeding') {
            setActiveView('breeding');
            closePanels();
            return;
        }
    };

    const closeChat = (roomId: string) => {
        setActiveChats(prev => prev.filter(c => c.roomId !== roomId));
    };

    // Smart Search - Execute immediately
    const executeSmartSearch = async (query: string) => {
        if (!query.trim()) return;

        setShowSearchSuggestions(false);
        setIsSearchMode(true);
        setSearchQuery('');

        // Add user message
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
                searchResults = allPets.filter(pet =>
                    pet.name.toLowerCase().includes(query.toLowerCase()) ||
                    pet.breed.toLowerCase().includes(query.toLowerCase()) ||
                    pet.location?.toLowerCase().includes(query.toLowerCase())
                );
            }

            // Get AI response
            const response = await aiThink(query, {
                language: language as 'th' | 'en',
                userProfile: user ? { id: user.id, full_name: user.profile?.full_name } : undefined
            });

            // Add AI response with search results
            setChatHistory(prev => [...prev, {
                role: 'ai',
                text: response.text,
                pets: searchResults.slice(0, 12)
            }]);

            // Update filtered pets
            if (searchResults.length > 0) {
                setFilteredPets(searchResults);
            }

        } catch (error) {
            setChatHistory(prev => [...prev, {
                role: 'ai',
                text: language === 'th'
                    ? 'ขออภัย ไม่สามารถประมวลผลคำค้นหาได้ในขณะนี้'
                    : 'Sorry, I could not process your search at this time.'
            }]);
        } finally {
            setIsAiTyping(false);
        }

        // Scroll to bottom after content is rendered
        setTimeout(() => {
            if (chatContainerRef.current) {
                chatContainerRef.current.scrollTo({
                    top: chatContainerRef.current.scrollHeight,
                    behavior: 'smooth'
                });
            }
        }, 300);
    };

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
        // Search Mode - ChatGPT style
        if (isSearchMode) {
            return (
                <div className="p-6">
                    <button
                        onClick={exitSearchMode}
                        className="mb-6 text-[#C5A059] hover:text-[#D4C4B5] flex items-center gap-2 text-sm"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        {language === 'th' ? 'กลับหน้าหลัก' : 'Back to Home'}
                    </button>

                    {/* Chat History - ChatGPT Style */}
                    <div className="max-w-4xl mx-auto space-y-6">
                        {chatHistory.map((msg, i) => (
                            <div key={i}>
                                {/* Message */}
                                <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[80%] px-4 py-3 rounded-2xl ${msg.role === 'user'
                                        ? 'bg-[#C5A059] text-[#0A0A0A]'
                                        : 'bg-[#1A1A1A] text-[#F5F5F0] border border-[#C5A059]/10'
                                        }`}>
                                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                                    </div>
                                </div>

                                {/* Search Results - Pinterest Grid */}
                                {msg.role === 'ai' && msg.pets && msg.pets.length > 0 && (
                                    <div className="mt-6">
                                        <p className="text-xs text-[#C5A059]/60 uppercase tracking-wider mb-4">
                                            {language === 'th' ? 'ผลการค้นหา' : 'Search Results'} ({msg.pets.length})
                                        </p>
                                        <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
                                            {msg.pets.map(pet => (
                                                <PetCard
                                                    key={pet.id}
                                                    pet={pet}
                                                    onClick={() => handleViewPetDetails(pet)}
                                                    onPedigreeClick={() => handleViewPedigree(pet)}
                                                    onChatClick={() => handleChatWithOwner(pet)}
                                                    onLikeClick={() => handleLike(pet.id)}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}

                        {isAiTyping && (
                            <div className="flex justify-start">
                                <div className="bg-[#1A1A1A] border border-[#C5A059]/10 px-4 py-3 rounded-2xl flex items-center gap-2">
                                    <div className="flex gap-1">
                                        <span className="w-2 h-2 bg-[#C5A059] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <span className="w-2 h-2 bg-[#C5A059] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <span className="w-2 h-2 bg-[#C5A059] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
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
                    <div className="p-6">
                        <button onClick={() => setActiveView('home')} className="mb-6 text-[#C5A059] hover:text-[#D4C4B5] flex items-center gap-2 text-sm">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                            Back
                        </button>
                        <MarketplaceSection onAddToCart={addToCart} onQuickView={handleQuickView} />
                    </div>
                );

            case 'puppies':
                return (
                    <div className="p-6">
                        <button onClick={() => setActiveView('home')} className="mb-6 text-[#C5A059] hover:text-[#D4C4B5] flex items-center gap-2 text-sm">
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
                    <div className="p-6">
                        <button onClick={() => setActiveView('home')} className="mb-6 text-[#C5A059] hover:text-[#D4C4B5] flex items-center gap-2 text-sm">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                            Back
                        </button>
                        <SearchSection onViewPedigree={handleViewPedigree} onViewDetails={handleViewPetDetails} onRequireAuth={() => setAuthModalOpen(true)} />
                    </div>
                );

            case 'notifications':
                return (
                    <div className="p-6">
                        <button onClick={() => setActiveView('home')} className="mb-6 text-[#C5A059] hover:text-[#D4C4B5] flex items-center gap-2 text-sm">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                            Back
                        </button>
                        <NotificationPanel />
                    </div>
                );

            case 'favorites':
                return (
                    <div className="p-6">
                        <button onClick={() => setActiveView('home')} className="mb-6 text-[#C5A059] hover:text-[#D4C4B5] flex items-center gap-2 text-sm">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                            {language === 'th' ? 'กลับ' : 'Back'}
                        </button>

                        <h1 className="font-['Playfair_Display'] text-3xl text-[#F5F5F0] mb-2">
                            {language === 'th' ? 'รายการโปรด' : 'Favorites'}
                        </h1>
                        <p className="text-[#B8B8B8]/60 mb-6">{favorites.length} {language === 'th' ? 'รายการ' : 'items'}</p>

                        {favorites.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                {allPets.filter(pet => favorites.includes(pet.id)).map(pet => (
                                    <div
                                        key={pet.id}
                                        className="bg-[#1A1A1A] rounded-xl overflow-hidden border border-[#C5A059]/10 hover:border-[#C5A059]/30 cursor-pointer transition-all group"
                                        onClick={() => handleViewPetDetails(pet)}
                                    >
                                        <div className="h-40 overflow-hidden">
                                            <img src={pet.image} alt={pet.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                        </div>
                                        <div className="p-3">
                                            <p className="font-bold text-[#F5F5F0] truncate">{pet.name}</p>
                                            <p className="text-sm text-[#B8B8B8]/60 truncate">{pet.breed}</p>
                                            <p className="text-xs text-[#C5A059]/60 mt-1">{pet.location}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <span className="text-4xl mb-4 block">❤️</span>
                                <p className="text-[#B8B8B8]/40">{language === 'th' ? 'ยังไม่มีรายการโปรด' : 'No favorites yet'}</p>
                            </div>
                        )}
                    </div>
                );

            case 'myspace':
                return (
                    <div className="p-6">
                        <button onClick={() => setActiveView('home')} className="mb-6 text-[#C5A059] hover:text-[#D4C4B5] flex items-center gap-2 text-sm">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                            {language === 'th' ? 'กลับ' : 'Back'}
                        </button>

                        {/* My Space Header */}
                        <div className="mb-8">
                            <h1 className="font-['Playfair_Display'] text-3xl text-[#F5F5F0] mb-2">
                                {language === 'th' ? 'พื้นที่ของฉัน' : 'My Space'}
                            </h1>
                            <p className="text-[#B8B8B8]/60">
                                {language === 'th' ? 'จัดการสัตว์เลี้ยง สินค้า และรายการโปรดของคุณ' : 'Manage your pets, products and favorites'}
                            </p>
                        </div>

                        {!user ? (
                            <div className="bg-[#1A1A1A] rounded-2xl p-8 text-center border border-[#C5A059]/10">
                                <div className="w-16 h-16 bg-[#C5A059]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-8 h-8 text-[#C5A059]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-bold text-[#F5F5F0] mb-2">
                                    {language === 'th' ? 'เข้าสู่ระบบเพื่อเข้าถึงพื้นที่ของคุณ' : 'Sign in to access your space'}
                                </h3>
                                <p className="text-[#B8B8B8]/60 mb-6">
                                    {language === 'th' ? 'จัดการสัตว์เลี้ยง ดูรายการโปรด และอื่นๆ' : 'Manage your pets, view favorites, and more'}
                                </p>
                                <button
                                    onClick={() => setAuthModalOpen(true)}
                                    className="px-8 py-3 bg-[#C5A059] text-[#0A0A0A] font-bold rounded-xl hover:bg-[#D4C4B5] transition-colors"
                                >
                                    {language === 'th' ? 'เข้าสู่ระบบ' : 'Sign In'}
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* My Pets */}
                                <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#C5A059]/10 hover:border-[#C5A059]/30 transition-colors group cursor-pointer"
                                    onClick={() => { setCurrentBreederId(user.id); setBreederProfileOpen(true); }}>
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-12 h-12 bg-[#C5A059]/10 rounded-xl flex items-center justify-center group-hover:bg-[#C5A059]/20 transition-colors">
                                            <span className="text-2xl">🐕</span>
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-[#F5F5F0]">{language === 'th' ? 'สัตว์เลี้ยงของฉัน' : 'My Pets'}</h3>
                                            <p className="text-xs text-[#B8B8B8]/60">{language === 'th' ? 'จัดการและดูสัตว์เลี้ยงที่ลงทะเบียน' : 'Manage your registered pets'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-2xl font-bold text-[#C5A059]">
                                            {allPets.filter(p => (p as any).owner_id === user.id).length}
                                        </span>
                                        <svg className="w-5 h-5 text-[#B8B8B8]/40 group-hover:text-[#C5A059] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                </div>

                                {/* My Puppies */}
                                <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#C5A059]/10 hover:border-[#C5A059]/30 transition-colors group cursor-pointer"
                                    onClick={() => setActiveView('puppies')}>
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-12 h-12 bg-[#C5A059]/10 rounded-xl flex items-center justify-center group-hover:bg-[#C5A059]/20 transition-colors">
                                            <span className="text-2xl">🐾</span>
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-[#F5F5F0]">{language === 'th' ? 'ลูกหมาของฉัน' : 'My Puppies'}</h3>
                                            <p className="text-xs text-[#B8B8B8]/60">{language === 'th' ? 'ดูลูกหมาที่กำลังจะเกิด' : 'View upcoming litters'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-[#C5A059]">{language === 'th' ? 'ดูทั้งหมด' : 'View All'}</span>
                                        <svg className="w-5 h-5 text-[#B8B8B8]/40 group-hover:text-[#C5A059] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                </div>

                                {/* My Products */}
                                <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#C5A059]/10 hover:border-[#C5A059]/30 transition-colors group cursor-pointer"
                                    onClick={() => setActiveView('products')}>
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-12 h-12 bg-[#C5A059]/10 rounded-xl flex items-center justify-center group-hover:bg-[#C5A059]/20 transition-colors">
                                            <span className="text-2xl">🛍️</span>
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-[#F5F5F0]">{language === 'th' ? 'สินค้าของฉัน' : 'My Products'}</h3>
                                            <p className="text-xs text-[#B8B8B8]/60">{language === 'th' ? 'จัดการสินค้าที่ขาย' : 'Manage your listings'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-[#C5A059]">{language === 'th' ? 'ดูทั้งหมด' : 'View All'}</span>
                                        <svg className="w-5 h-5 text-[#B8B8B8]/40 group-hover:text-[#C5A059] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                </div>

                                {/* Favorites */}
                                <div className="bg-[#1A1A1A] rounded-2xl p-6 border border-[#C5A059]/10 hover:border-[#C5A059]/30 transition-colors group col-span-2">
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-12 h-12 bg-[#C5A059]/10 rounded-xl flex items-center justify-center group-hover:bg-[#C5A059]/20 transition-colors">
                                            <span className="text-2xl">❤️</span>
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-[#F5F5F0]">{language === 'th' ? 'รายการโปรด' : 'Favorites'}</h3>
                                            <p className="text-xs text-[#B8B8B8]/60">{language === 'th' ? 'สัตว์เลี้ยงที่คุณถูกใจ' : 'Pets you\'ve liked'} ({favorites.length})</p>
                                        </div>
                                    </div>

                                    {/* Favorite Pet Cards */}
                                    {favorites.length > 0 ? (
                                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                            {allPets.filter(pet => favorites.includes(pet.id)).slice(0, 8).map(pet => (
                                                <div
                                                    key={pet.id}
                                                    className="bg-[#0D0D0D] rounded-xl overflow-hidden border border-[#C5A059]/10 hover:border-[#C5A059]/30 cursor-pointer transition-all group"
                                                    onClick={() => handleViewPetDetails(pet)}
                                                >
                                                    <div className="h-24 overflow-hidden">
                                                        <img src={pet.image} alt={pet.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                                    </div>
                                                    <div className="p-2">
                                                        <p className="text-sm font-bold text-[#F5F5F0] truncate">{pet.name}</p>
                                                        <p className="text-[10px] text-[#B8B8B8]/60 truncate">{pet.breed}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-[#B8B8B8]/40 text-center py-4">{language === 'th' ? 'ยังไม่มีรายการโปรด' : 'No favorites yet'}</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                );

            default:
                // Home - Pinterest-style masonry grid
                return (
                    <div className="p-4">
                        {/* Masonry Grid */}
                        <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4 space-y-4">
                            {filteredPets.map((pet) => (
                                <PetCard
                                    key={pet.id}
                                    pet={pet}
                                    isLiked={favorites.includes(pet.id)}
                                    isOwner={user?.id === (pet as any).owner_id}
                                    onClick={() => handleViewPetDetails(pet)}
                                    onPedigreeClick={() => handleViewPedigree(pet)}
                                    onChatClick={() => handleChatWithOwner(pet)}
                                    onLikeClick={() => handleAddToFavorites(pet.id)}
                                    onBoostClick={() => handleBoostRequest(pet)}
                                />
                            ))}
                        </div>

                        {/* Load more */}
                        {filteredPets.length > 0 && (
                            <div className="text-center mt-12">
                                <button className="px-8 py-3 border border-[#C5A059]/30 text-[#C5A059] text-xs tracking-wider uppercase hover:bg-[#C5A059]/10 transition-all">
                                    Load More
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
        <div className="min-h-screen bg-[#0A0A0A] text-[#F5F5F0] flex">
            {/* ===== LEFT SIDEBAR - Pinterest Style ===== */}
            <aside className="w-16 bg-[#0D0D0D] border-r border-[#C5A059]/10 flex flex-col items-center py-6 fixed left-0 top-0 bottom-0 z-40">
                {/* Logo - Eibpo */}
                <div className="mb-8">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#C5A059] to-[#8B7355] flex items-center justify-center">
                        <span className="text-[#0A0A0A] font-bold text-lg">E</span>
                    </div>
                </div>

                {/* Navigation Icons */}
                <nav className="flex-1 flex flex-col items-center gap-2">
                    <SidebarIcon
                        icon={<HomeIcon />}
                        label={language === 'th' ? 'หน้าแรก' : 'Home'}
                        active={activeView === 'home' && !isSearchMode}
                        onClick={() => { setActiveView('home'); exitSearchMode(); }}
                    />
                    {/* My Space with Dropdown */}
                    <div
                        className="relative"
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
                            }, 1000);
                        }}
                    >
                        <button
                            onClick={() => setActiveView('myspace')}
                            className={`relative group w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${activeView === 'myspace'
                                ? 'bg-[#C5A059]/20 text-[#C5A059]'
                                : 'text-[#B8B8B8]/60 hover:text-[#F5F5F0] hover:bg-[#C5A059]/10'
                                }`}
                        >
                            <MySpaceIcon />
                        </button>

                        {/* Dropdown Menu */}
                        {showMySpaceMenu && (
                            <div className="absolute left-full ml-2 top-0 w-48 bg-[#1A1A1A] border border-[#C5A059]/20 rounded-xl shadow-2xl overflow-hidden z-50 animate-in slide-in-from-left-2 fade-in duration-200">
                                <div className="px-3 py-2 border-b border-[#C5A059]/10">
                                    <p className="text-[10px] text-[#C5A059]/60 uppercase tracking-wider">{language === 'th' ? 'พื้นที่ของฉัน' : 'My Space'}</p>
                                </div>
                                <button
                                    onClick={() => { setActiveView('myspace'); setShowMySpaceMenu(false); if (user) { setCurrentBreederId(user.id); setBreederProfileOpen(true); } }}
                                    className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-[#C5A059]/10 transition-colors text-left"
                                >
                                    <span className="text-lg">🐕</span>
                                    <span className="text-sm text-[#F5F5F0]">{language === 'th' ? 'สัตว์เลี้ยงของฉัน' : 'My Pets'}</span>
                                </button>
                                <button
                                    onClick={() => { setActiveView('puppies'); setShowMySpaceMenu(false); }}
                                    className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-[#C5A059]/10 transition-colors text-left"
                                >
                                    <span className="text-lg">🐾</span>
                                    <span className="text-sm text-[#F5F5F0]">{language === 'th' ? 'ลูกหมาของฉัน' : 'My Puppies'}</span>
                                </button>
                                <button
                                    onClick={() => { setActiveView('products'); setShowMySpaceMenu(false); }}
                                    className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-[#C5A059]/10 transition-colors text-left"
                                >
                                    <span className="text-lg">🛍️</span>
                                    <span className="text-sm text-[#F5F5F0]">{language === 'th' ? 'สินค้าของฉัน' : 'My Products'}</span>
                                </button>
                                <button
                                    onClick={() => { setActiveView('favorites'); setShowMySpaceMenu(false); }}
                                    className="w-full px-3 py-2.5 flex items-center gap-3 hover:bg-[#C5A059]/10 transition-colors text-left border-t border-[#C5A059]/10"
                                >
                                    <span className="text-lg">❤️</span>
                                    <div className="flex-1 flex items-center justify-between">
                                        <span className="text-sm text-[#F5F5F0]">{language === 'th' ? 'รายการโปรด' : 'Favorites'}</span>
                                        <span className="text-xs text-[#C5A059] font-bold">{favorites.length}</span>
                                    </div>
                                </button>
                            </div>
                        )}
                    </div>
                    <SidebarIcon
                        icon={<RegisterIcon />}
                        label={language === 'th' ? 'ลงทะเบียน' : 'Register'}
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

                    <div className="h-px w-8 bg-[#C5A059]/20 my-4" />

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
                </nav>

                {/* Bottom icons */}
                <div className="mt-auto flex flex-col items-center gap-2">
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
                </div>
            </aside>

            {/* ===== MAIN CONTENT ===== */}
            <main className="flex-1 ml-16 flex flex-col min-h-screen">
                {/* Top Bar with Filter Menu - Fixed */}
                <header className="sticky top-0 z-30 bg-[#0A0A0A]">
                    {/* Logo Row */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-[#C5A059]/10">
                        <h1 className="font-['Playfair_Display'] text-xl text-[#F5F5F0]">
                            Eib<span className="text-[#C5A059]">po</span>
                        </h1>

                        <div className="flex items-center gap-4 mr-8">
                            <select
                                value={language}
                                onChange={(e) => setLanguage(e.target.value as any)}
                                className="bg-transparent text-xs tracking-wider text-[#B8B8B8] border-none focus:ring-0 cursor-pointer hover:text-[#C5A059]"
                            >
                                <option value="en" className="bg-[#1A1A1A]">EN</option>
                                <option value="th" className="bg-[#1A1A1A]">TH</option>
                            </select>

                            {user?.profile?.role === 'admin' && (
                                <button
                                    onClick={() => setAdminPanelOpen(true)}
                                    className="px-3 py-1.5 text-[#C5A059] text-xs tracking-wider border border-[#C5A059]/30 hover:bg-[#C5A059]/10 transition-colors"
                                >
                                    Admin
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Filter Menu Row - Fixed below Eibpo */}
                    {activeView === 'home' && !isSearchMode && (
                        <div className="px-6 py-3 bg-[#0A0A0A] border-b border-[#C5A059]/10">
                            <div className="flex items-center gap-4 flex-wrap text-xs tracking-wider uppercase">
                                <button className="text-[#C5A059] font-semibold hover:text-[#F5F5F0] transition-colors">All</button>
                                {['Dogs', 'Cats', 'Horses', 'Cattle', 'Exotic', 'Males', 'Females', 'Verified', 'With Pedigree'].map(filter => (
                                    <button key={filter} className="text-[#B8B8B8]/70 hover:text-[#C5A059] transition-colors">
                                        {filter}
                                    </button>
                                ))}
                                <button
                                    onClick={() => executeSmartSearch(language === 'th' ? 'ปรึกษาหมอ AI' : 'Vet AI consultation')}
                                    className="text-[#D4A574] hover:text-[#F5F5F0] transition-colors font-medium"
                                >
                                    {language === 'th' ? 'ปรึกษาหมอ AI' : 'Vet AI'}
                                </button>
                            </div>
                        </div>
                    )}
                </header>

                {/* Scrollable Content */}
                <div ref={chatContainerRef} className="flex-1 overflow-y-auto pb-32">
                    {renderMainContent()}
                </div>

                {/* ===== BOTTOM CHAT BAR - ChatGPT Style with Auto-Hide ===== */}
                {/* Hover trigger area - invisible zone at bottom */}
                <div
                    className="fixed bottom-0 left-16 right-0 h-20 z-30"
                    onMouseEnter={() => setShowBottomBar(true)}
                />

                <div
                    className={`fixed left-16 right-0 p-4 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A] to-transparent transition-all duration-500 ease-out z-40 ${(showBottomBar || isSearchMode) ? 'bottom-0 opacity-100' : '-bottom-24 opacity-0'
                        }`}
                    onMouseEnter={() => setShowBottomBar(true)}
                    onMouseLeave={() => !isSearchMode && setTimeout(() => setShowBottomBar(false), 2000)}
                >
                    <div
                        className="max-w-3xl mx-auto relative"
                        onMouseEnter={() => setShowSearchSuggestions(true)}
                        onMouseLeave={() => setTimeout(() => setShowSearchSuggestions(false), 1000)}
                    >
                        {/* Search Suggestions Popup */}
                        {showSearchSuggestions && (
                            <div className="absolute bottom-full mb-2 left-0 right-0 bg-[#1A1A1A] border border-[#C5A059]/20 rounded-2xl overflow-hidden shadow-2xl max-h-[70vh] overflow-y-auto animate-fade-in">
                                {/* Recent Searches */}
                                <div className="p-4">
                                    <p className="text-xs text-[#C5A059]/60 uppercase tracking-wider mb-3">
                                        {language === 'th' ? 'ค้นหาล่าสุด' : 'Recent Searches'}
                                    </p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {getSearchSuggestions().filter(s => s.type === 'recent').map(s => (
                                            <button
                                                key={s.id}
                                                onClick={() => {
                                                    setShowSearchSuggestions(false);
                                                    if (s.action) s.action();
                                                }}
                                                className="flex items-center gap-3 p-2 hover:bg-[#C5A059]/10 rounded-lg transition-colors text-left"
                                            >
                                                {s.image && <img src={s.image} className="w-10 h-10 rounded-lg object-cover" alt="" />}
                                                <span className="text-sm text-[#F5F5F0]">{s.text}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Pets For You */}
                                <div className="p-4 border-t border-[#C5A059]/10">
                                    <p className="text-xs text-[#C5A059]/60 uppercase tracking-wider mb-3">
                                        🐾 {language === 'th' ? 'แนะนำสำหรับคุณ' : 'Pets For You'}
                                    </p>
                                    <div className="grid grid-cols-4 gap-2 mb-3">
                                        {allPets.slice(0, 4).map(pet => (
                                            <button
                                                key={pet.id}
                                                onClick={() => {
                                                    setShowSearchSuggestions(false);
                                                    handleViewPetDetails(pet);
                                                }}
                                                className="flex flex-col items-center p-2 hover:bg-[#C5A059]/10 rounded-lg transition-colors text-center group"
                                            >
                                                <img src={pet.image} className="w-10 h-10 rounded-full object-cover mb-1 group-hover:ring-2 ring-[#C5A059] transition-all" alt="" />
                                                <span className="text-[10px] text-[#F5F5F0] truncate w-full">{pet.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => { setShowSearchSuggestions(false); setActiveView('puppies'); }}
                                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[#C5A059]/10 hover:bg-[#C5A059]/20 rounded-full transition-colors"
                                        >
                                            <span>🐶</span>
                                            <span className="text-xs text-[#F5F5F0]">{language === 'th' ? 'ลูกหมาเร็วๆนี้' : 'Coming Soon'}</span>
                                        </button>
                                        <button
                                            onClick={() => { setShowSearchSuggestions(false); setActiveView('breeding'); }}
                                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-pink-500/10 hover:bg-pink-500/20 rounded-full transition-colors"
                                        >
                                            <span>💕</span>
                                            <span className="text-xs text-pink-400">{language === 'th' ? 'หาคู่ผสม' : 'Breeding'}</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Popular Searches */}
                                <div className="p-4 border-t border-[#C5A059]/10">
                                    <p className="text-xs text-[#C5A059]/60 uppercase tracking-wider mb-3">
                                        🔥 {language === 'th' ? 'ยอดนิยม' : 'Popular'}
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {getSearchSuggestions().filter(s => s.type === 'popular').map(s => (
                                            <button
                                                key={s.id}
                                                onClick={() => {
                                                    setShowSearchSuggestions(false);
                                                    if (s.action) s.action();
                                                }}
                                                className="flex items-center gap-2 px-3 py-2 bg-[#C5A059]/10 hover:bg-[#C5A059]/20 rounded-full transition-colors"
                                            >
                                                <span className="text-sm text-[#F5F5F0]">{s.text}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Chat Input */}
                        <form onSubmit={handleSearch} className="relative group">
                            <div className="flex items-center bg-[#1A1A1A] rounded-full px-4 transition-all duration-300 border border-white/5 focus-within:border-white/10 focus-within:shadow-[0_0_20px_rgba(197,160,89,0.1)] focus-within:bg-[#1E1E1E]">
                                <button
                                    type="button"
                                    onClick={() => setAddCardModalOpen(true)}
                                    className="p-2 text-[#C5A059]/40 hover:text-[#C5A059] transition-colors"
                                    title="Add Magic Card"
                                >
                                    <span className="text-lg">✨</span>
                                </button>

                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onFocus={() => setShowSearchSuggestions(false)}
                                    onBlur={() => { }}
                                    placeholder={language === 'th' ? 'ค้นหาหรือถาม AI อะไรก็ได้...' : 'Search or ask AI anything...'}
                                    className="flex-1 bg-transparent py-4 px-3 text-[#F5F5F0] placeholder:text-[#B8B8B8]/30 outline-none text-sm caret-[#C5A059] focus-visible:!shadow-none"
                                />

                                <button
                                    type="submit"
                                    disabled={!searchQuery.trim()}
                                    className={`p-2 rounded-full transition-all ${searchQuery.trim()
                                        ? 'bg-[#C5A059] text-[#0A0A0A] hover:bg-[#D4C4B5]'
                                        : 'text-[#C5A059]/30'
                                        }`}
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                                    </svg>
                                </button>
                            </div>
                        </form>

                        <p className="text-center text-[10px] text-[#B8B8B8]/40 mt-2">
                            Eibpo AI • Powered by Gemini
                        </p>
                    </div>
                </div>
            </main>

            {/* ===== MESSAGE / NOTIFICATION POPUPS ===== */}

            {/* Boost Confirmation Modal */}
            <Dialog open={!!boostConfirmPet} onOpenChange={(open) => !open && setBoostConfirmPet(null)}>
                <DialogContent className="bg-[#111111] border border-[#C5A059] text-white rounded-3xl">
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
            {messagePanelOpen && (
                <div className="fixed inset-0 z-[70]" onClick={closePanels}>
                    <div
                        className="absolute left-20 top-6 bottom-6 w-[360px] bg-[#111111] border border-[#C5A059]/15 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
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
            )}

            {notificationPanelOpen && (
                <div className="fixed inset-0 z-[70]" onClick={closePanels}>
                    <div
                        className="absolute left-20 top-6 bottom-6 w-[360px] bg-[#111111] border border-[#C5A059]/15 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
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
            )}

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
            <PetDetailsModal
                isOpen={petDetailsModalOpen}
                onClose={() => setPetDetailsModalOpen(false)}
                pet={selectedPet}
                onViewPedigree={handleViewPedigree}
                onChatWithOwner={handleChatWithOwner}
                onFindMate={(pet) => {
                    setPetDetailsModalOpen(false);
                    setBreedingMatchPet(pet);
                }}
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
            />
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
      ${active ? 'bg-[#C5A059]/20 text-[#C5A059]' : 'text-[#B8B8B8]/60 hover:text-[#F5F5F0] hover:bg-[#C5A059]/10'}
      ${highlight ? 'bg-[#C5A059] text-[#0A0A0A] hover:bg-[#D4C4B5]' : ''}
    `}
    >
        {icon}

        {/* Tooltip */}
        <span className="absolute left-full ml-3 px-3 py-1.5 bg-[#1A1A1A] text-[#F5F5F0] text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap border border-[#C5A059]/20 z-50">
            {label}
        </span>
    </button>
);

// ============ ICONS ============
const HomeIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
const SearchIconNav = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;
const RegisterIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" /></svg>;
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
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#C5A059] text-[#0A0A0A] text-[10px] font-bold rounded-full flex items-center justify-center">
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
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#C5A059] text-[#0A0A0A] text-[10px] font-bold rounded-full flex items-center justify-center">
                {count}
            </span>
        )}
    </div>
);

const UserAvatar: React.FC<{ name: string }> = ({ name }) => (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#C5A059] to-[#8B7355] flex items-center justify-center text-[#0A0A0A] text-xs font-bold">
        {name?.charAt(0).toUpperCase() || 'U'}
    </div>
);

export default EibpoLayout;
