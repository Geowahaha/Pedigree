/**
 * Claude-Inspired Layout for Eibpo Pedigree
 * 
 * Faithfully inspired by Claude.ai's elegant dark theme:
 * - Deep charcoal background
 * - Icon-only sidebar
 * - Centered, breathing content
 * - Warm terracotta accent
 * - Serif headline with emoji
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Pet, Product, products } from '@/data/petData';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getPetById } from '@/lib/petsService';

// Import modals and sections
import PetRegistrationModal from '../PetRegistrationModal';
import PedigreeModal from '../modals/PedigreeModal';
import CartModal from '../modals/CartModal';
import AuthModal from '../modals/AuthModal';
import ProductModal from '../modals/ProductModal';
import PetDetailsModal from '../modals/PetDetailsModal';
import BreederDashboard from '../BreederDashboard';
import AdminPanel from '../AdminPanel';
import BreederProfileModal from '../modals/BreederProfileModal';
import ChatManager from '../ChatManager';
import { AIChatOverlay } from '../ai/AIChatOverlay';
import { EibpoMark } from '@/components/branding/EibpoLogo';

// Sidebar icons
const SidebarIcon: React.FC<{
    icon: React.ReactNode;
    active?: boolean;
    highlight?: boolean;
    tooltip?: string;
    onClick?: () => void;
}> = ({ icon, active, highlight, tooltip, onClick }) => (
    <button
        onClick={onClick}
        className={`
      relative group w-10 h-10 rounded-lg flex items-center justify-center
      transition-all duration-200
      ${active ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/80 hover:bg-white/5'}
      ${highlight ? 'bg-[#D4A574]/20 text-[#D4A574] hover:bg-[#D4A574]/30' : ''}
    `}
    >
        {icon}
        {tooltip && (
            <div className="absolute left-full ml-3 px-3 py-1.5 bg-[#3D3D3D] text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-xl">
                {tooltip}
            </div>
        )}
    </button>
);

interface CartItem {
    product: Product;
    quantity: number;
}

const ClaudeLayout: React.FC = () => {
    const { user, savedCart, syncCart, signOut } = useAuth();
    const { t, language, setLanguage } = useLanguage();

    // State
    const [activeView, setActiveView] = useState<'home' | 'search' | 'register' | 'breeding' | 'products'>('home');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [refreshPets, setRefreshPets] = useState(0);
    const [searchValue, setSearchValue] = useState('');

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
    const [isGlobalAIOpen, setIsGlobalAIOpen] = useState(false);
    const [globalAIQuery, setGlobalAIQuery] = useState<string | undefined>(undefined);

    // Selected items
    const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

    // Event Listeners
    useEffect(() => {
        const handleOpenBreeder = (e: any) => {
            const userId = e.detail?.ownerId;
            if (userId) {
                setCurrentBreederId(userId);
                setBreederProfileOpen(true);
            }
        };

        const handleOpenPetDetails = (e: any) => {
            const pet = e.detail?.pet;
            if (pet) {
                setSelectedPet(pet);
                setPetDetailsModalOpen(true);
            }
        };

        const handleOpenRegister = () => {
            if (!user) {
                setAuthModalOpen(true);
            } else {
                setRegisterModalOpen(true);
            }
        };

        const handleOpenGlobalAI = (e: any) => {
            if (e.detail?.query) {
                setGlobalAIQuery(e.detail.query);
            }
            setIsGlobalAIOpen(true);
        };

        window.addEventListener('openBreederProfile', handleOpenBreeder);
        window.addEventListener('openPetDetails', handleOpenPetDetails);
        window.addEventListener('openRegisterPet', handleOpenRegister);
        window.addEventListener('openGlobalAI', handleOpenGlobalAI);

        return () => {
            window.removeEventListener('openBreederProfile', handleOpenBreeder);
            window.removeEventListener('openPetDetails', handleOpenPetDetails);
            window.removeEventListener('openRegisterPet', handleOpenRegister);
            window.removeEventListener('openGlobalAI', handleOpenGlobalAI);
        };
    }, [user]);

    // Load saved cart
    useEffect(() => {
        if (user && savedCart.length > 0) {
            const loadedCart: CartItem[] = savedCart
                .map(item => {
                    const product = products.find(p => p.id === item.productId);
                    if (product) return { product, quantity: item.quantity };
                    return null;
                })
                .filter((item): item is CartItem => item !== null);
            setCart(loadedCart);
        }
    }, [user, savedCart]);

    // Check for shared pet link
    useEffect(() => {
        async function handleSharedLink() {
            const params = new URLSearchParams(window.location.search);
            const sharedPetId = params.get('petId');
            if (sharedPetId) {
                try {
                    const foundPet = await getPetById(sharedPetId);
                    if (foundPet) {
                        setSelectedPet(foundPet);
                        setPedigreeModalOpen(true);
                    }
                } catch (error) {
                    console.error('Failed to load shared pet:', error);
                }
            }
        }
        handleSharedLink();
    }, []);

    // Cart sync
    const syncCartToDb = useCallback(async (cartItems: CartItem[]) => {
        if (user) {
            const cartData = cartItems.map(item => ({
                productId: item.product.id,
                quantity: item.quantity
            }));
            await syncCart(cartData);
        }
    }, [user, syncCart]);

    // Cart functions
    const addToCart = (product: Product, quantity: number = 1) => {
        setCart(prev => {
            const existing = prev.find(item => item.product.id === product.id);
            let newCart: CartItem[];
            if (existing) {
                newCart = prev.map(item =>
                    item.product.id === product.id ? { ...item, quantity: item.quantity + quantity } : item
                );
            } else {
                newCart = [...prev, { product, quantity }];
            }
            syncCartToDb(newCart);
            return newCart;
        });
    };

    const updateCartQuantity = (productId: string, quantity: number) => {
        if (quantity <= 0) {
            removeFromCart(productId);
            return;
        }
        setCart(prev => {
            const newCart = prev.map(item =>
                item.product.id === productId ? { ...item, quantity } : item
            );
            syncCartToDb(newCart);
            return newCart;
        });
    };

    const removeFromCart = (productId: string) => {
        setCart(prev => {
            const newCart = prev.filter(item => item.product.id !== productId);
            syncCartToDb(newCart);
            return newCart;
        });
    };

    const clearCart = () => {
        setCart([]);
        syncCartToDb([]);
    };

    // Handlers
    const handleViewPedigree = (pet: Pet) => {
        setSelectedPet(pet);
        setPedigreeModalOpen(true);
    };

    const handleViewPetDetails = (pet: Pet) => {
        setSelectedPet(pet);
        setPetDetailsModalOpen(true);
    };

    const handleAddToCart = (product: Product) => addToCart(product);
    const handleQuickView = (product: Product) => {
        setSelectedProduct(product);
        setProductModalOpen(true);
    };

    const handleAddToCartWithQuantity = (product: Product, quantity: number) => addToCart(product, quantity);

    const handleRegisterClick = () => {
        if (!user) setAuthModalOpen(true);
        else setRegisterModalOpen(true);
    };

    const handlePetRegistered = () => setRefreshPets(prev => prev + 1);

    // Submit search
    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchValue.trim()) {
            setGlobalAIQuery(searchValue.trim());
            setIsGlobalAIOpen(true);
        }
    };

    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    // Greeting based on time
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return language === 'th' ? '☀️ สวัสดียามเช้า' : '☀️ Good morning';
        if (hour < 18) return language === 'th' ? '🌤️ สวัสดียามบ่าย' : '🌤️ Good afternoon';
        return language === 'th' ? '🌙 สวัสดียามค่ำ' : '🌙 Good evening';
    };

    return (
        <div className="min-h-screen bg-[#2D2D2D] text-white flex">
            {/* Icon-Only Sidebar */}
            <aside className="w-14 bg-[#2D2D2D] border-r border-white/5 flex flex-col items-center py-4 gap-2">
                {/* Logo */}
                <div className="w-10 h-10 rounded-lg bg-[#3D3D3D] flex items-center justify-center mb-4 border border-white/10">
                    <EibpoMark className="w-5 h-5 text-[#D4A574]" />
                </div>

                {/* New Chat / Home */}
                <SidebarIcon
                    icon={
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                        </svg>
                    }
                    highlight
                    tooltip={language === 'th' ? 'ลงทะเบียนสัตว์เลี้ยง' : 'Register Pet'}
                    onClick={handleRegisterClick}
                />

                {/* Search */}
                <SidebarIcon
                    icon={
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    }
                    active={activeView === 'search'}
                    tooltip={language === 'th' ? 'ค้นหาสัตว์เลี้ยง' : 'Search Pets'}
                    onClick={() => setActiveView('search')}
                />

                {/* Projects / Breeding */}
                <SidebarIcon
                    icon={
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                    }
                    tooltip={language === 'th' ? 'ลูกหมาใกล้คลอด' : 'Puppy Coming Soon'}
                    onClick={() => setActiveView('breeding')}
                />

                {/* Apps / Features */}
                <SidebarIcon
                    icon={
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                        </svg>
                    }
                    tooltip={language === 'th' ? 'คู่ผสมพันธุ์' : 'Breeding Match'}
                    onClick={() => {
                        setGlobalAIQuery('Find breeding match');
                        setIsGlobalAIOpen(true);
                    }}
                />

                {/* API / Products */}
                <SidebarIcon
                    icon={
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                        </svg>
                    }
                    tooltip={language === 'th' ? 'สินค้าพรีเมียม' : 'Premium Products'}
                    onClick={() => setActiveView('products')}
                />

                {/* Spacer */}
                <div className="flex-1" />

                {/* User Profile at bottom */}
                <SidebarIcon
                    icon={
                        user ? (
                            <div className="w-7 h-7 rounded-full bg-[#D4A574] flex items-center justify-center text-[#2D2D2D] text-xs font-bold">
                                {user.profile?.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                            </div>
                        ) : (
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        )
                    }
                    tooltip={user ? (user.profile?.full_name || user.email) : (language === 'th' ? 'เข้าสู่ระบบ' : 'Sign In')}
                    onClick={() => {
                        if (user) {
                            setCurrentBreederId(user.id);
                            setBreederProfileOpen(true);
                        } else {
                            setAuthModalOpen(true);
                        }
                    }}
                />
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col">
                {/* Top Bar */}
                <header className="flex items-center justify-center py-4 relative">
                    {/* Plan Badge */}
                    <div className="px-4 py-1.5 rounded-full bg-[#3D3D3D] border border-white/10 text-sm text-white/70">
                        <span>{language === 'th' ? 'ฟรี' : 'Free plan'}</span>
                        <span className="mx-2 text-white/30">·</span>
                        <span className="text-white/90 hover:text-[#D4A574] cursor-pointer transition-colors">
                            {language === 'th' ? 'อัพเกรด' : 'Upgrade'}
                        </span>
                    </div>

                    {/* Right side - Account */}
                    <div className="absolute right-6 flex items-center gap-3">
                        {/* Language */}
                        <select
                            value={language}
                            onChange={(e) => setLanguage(e.target.value as any)}
                            className="bg-transparent text-sm text-white/60 border-none focus:ring-0 cursor-pointer hover:text-white transition-colors"
                        >
                            <option value="en" className="bg-[#2D2D2D]">EN</option>
                            <option value="th" className="bg-[#2D2D2D]">TH</option>
                        </select>

                        {/* Cart Icon */}
                        <button
                            onClick={() => setCartModalOpen(true)}
                            className="relative p-2 rounded-lg hover:bg-white/5 transition-colors"
                        >
                            <svg className="w-5 h-5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                            </svg>
                            {cartCount > 0 && (
                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#D4A574] text-[#2D2D2D] text-[10px] font-bold rounded-full flex items-center justify-center">
                                    {cartCount}
                                </span>
                            )}
                        </button>

                        {/* Account Icon */}
                        <button
                            onClick={() => user ? setBreederProfileOpen(true) : setAuthModalOpen(true)}
                            className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                        >
                            <svg className="w-5 h-5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </button>
                    </div>
                </header>

                {/* Centered Content */}
                <div className="flex-1 flex flex-col items-center justify-center px-6 -mt-20">
                    {/* Greeting Headline */}
                    <h1 className="text-4xl sm:text-5xl font-serif text-center mb-12 text-white/90">
                        <span className="text-[#D4A574]">🐾</span> {language === 'th' ? 'พร้อมค้นหาคู่ผสมพันธุ์?' : 'Ready to find a match?'}
                    </h1>

                    {/* Search Input */}
                    <form onSubmit={handleSearchSubmit} className="w-full max-w-2xl">
                        <div className="relative bg-[#3D3D3D] rounded-2xl border border-white/10 hover:border-white/20 transition-colors shadow-xl">
                            {/* Input */}
                            <input
                                type="text"
                                value={searchValue}
                                onChange={(e) => setSearchValue(e.target.value)}
                                placeholder={language === 'th' ? 'ฉันช่วยอะไรคุณได้บ้าง?' : 'How can I help you today?'}
                                className="w-full bg-transparent px-5 py-4 pr-32 text-white placeholder:text-white/40 outline-none text-lg"
                            />

                            {/* Bottom Actions */}
                            <div className="flex items-center justify-between px-4 py-3 border-t border-white/5">
                                <div className="flex items-center gap-2">
                                    {/* Attach */}
                                    <button
                                        type="button"
                                        className="p-2 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                                        </svg>
                                    </button>
                                    {/* History */}
                                    <button
                                        type="button"
                                        className="p-2 rounded-lg text-[#5B9BD5] hover:bg-white/5 transition-colors"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </button>
                                </div>

                                <div className="flex items-center gap-3">
                                    {/* Model Selector */}
                                    <button
                                        type="button"
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white/60 hover:bg-white/5 transition-colors text-sm"
                                    >
                                        <span>Eibpo AI</span>
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>

                                    {/* Send Button */}
                                    <button
                                        type="submit"
                                        className="w-9 h-9 rounded-lg bg-[#C4836A] hover:bg-[#B5745B] transition-colors flex items-center justify-center"
                                    >
                                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </form>

                    {/* Quick Action Cards */}
                    <div className="flex flex-wrap justify-center gap-3 mt-10 max-w-2xl">
                        <button
                            onClick={handleRegisterClick}
                            className="px-4 py-2.5 rounded-xl bg-[#3D3D3D] border border-white/10 text-white/70 hover:text-white hover:border-white/20 transition-all text-sm flex items-center gap-2"
                        >
                            <svg className="w-4 h-4 text-[#D4A574]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            {language === 'th' ? 'ลงทะเบียนสัตว์เลี้ยง' : 'Register Your Pet'}
                        </button>

                        <button
                            onClick={() => {
                                setGlobalAIQuery('หาคู่ผสมให้สุนัข');
                                setIsGlobalAIOpen(true);
                            }}
                            className="px-4 py-2.5 rounded-xl bg-[#3D3D3D] border border-white/10 text-white/70 hover:text-white hover:border-white/20 transition-all text-sm flex items-center gap-2"
                        >
                            <svg className="w-4 h-4 text-[#D4A574]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                            {language === 'th' ? 'หาคู่ผสมพันธุ์' : 'Find Breeding Match'}
                        </button>

                        <button
                            onClick={() => setActiveView('search')}
                            className="px-4 py-2.5 rounded-xl bg-[#3D3D3D] border border-white/10 text-white/70 hover:text-white hover:border-white/20 transition-all text-sm flex items-center gap-2"
                        >
                            <svg className="w-4 h-4 text-[#D4A574]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            {language === 'th' ? 'ค้นหาสายพันธุ์' : 'Search Breeds'}
                        </button>

                        <button
                            onClick={() => setActiveView('products')}
                            className="px-4 py-2.5 rounded-xl bg-[#3D3D3D] border border-white/10 text-white/70 hover:text-white hover:border-white/20 transition-all text-sm flex items-center gap-2"
                        >
                            <svg className="w-4 h-4 text-[#D4A574]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                            </svg>
                            {language === 'th' ? 'สินค้าพรีเมียม' : 'Premium Products'}
                        </button>
                    </div>

                    {/* Stats Cards */}
                    <div className="flex gap-6 mt-16">
                        <div className="text-center">
                            <p className="text-3xl font-bold text-white">1,247</p>
                            <p className="text-xs text-white/40 uppercase tracking-wider mt-1">
                                {language === 'th' ? 'สัตว์เลี้ยงลงทะเบียน' : 'Registered Pets'}
                            </p>
                        </div>
                        <div className="w-px bg-white/10" />
                        <div className="text-center">
                            <p className="text-3xl font-bold text-[#D4A574]">89</p>
                            <p className="text-xs text-white/40 uppercase tracking-wider mt-1">
                                {language === 'th' ? 'ลูกหมาใกล้คลอด' : 'Puppies Coming'}
                            </p>
                        </div>
                    </div>
                </div>
            </main>

            {/* Dashboard Overlay */}
            {dashboardOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-[#2D2D2D]/95 backdrop-blur-sm animate-in fade-in duration-300">
                    <BreederDashboard onClose={() => setDashboardOpen(false)} />
                </div>
            )}

            {/* Modals */}
            <PetRegistrationModal
                isOpen={registerModalOpen}
                onClose={() => setRegisterModalOpen(false)}
                onSuccess={handlePetRegistered}
            />

            <PedigreeModal
                isOpen={pedigreeModalOpen}
                onClose={() => setPedigreeModalOpen(false)}
                pet={selectedPet}
                onPetClick={handleViewPedigree}
            />

            <CartModal
                isOpen={cartModalOpen}
                onClose={() => setCartModalOpen(false)}
                items={cart}
                onUpdateQuantity={updateCartQuantity}
                onRemoveItem={removeFromCart}
                onClearCart={clearCart}
            />

            <AuthModal
                isOpen={authModalOpen}
                onClose={() => setAuthModalOpen(false)}
            />

            <ProductModal
                isOpen={productModalOpen}
                onClose={() => setProductModalOpen(false)}
                product={selectedProduct}
                onAddToCart={handleAddToCartWithQuantity}
            />

            <PetDetailsModal
                isOpen={petDetailsModalOpen}
                onClose={() => setPetDetailsModalOpen(false)}
                pet={selectedPet}
                onViewPedigree={handleViewPedigree}
            />

            <AdminPanel
                isOpen={adminPanelOpen}
                onClose={() => setAdminPanelOpen(false)}
            />

            <AIChatOverlay
                isOpen={isGlobalAIOpen}
                onClose={() => setIsGlobalAIOpen(false)}
                currentPet={undefined}
                initialQuery={globalAIQuery}
            />

            <BreederProfileModal
                isOpen={breederProfileOpen}
                onClose={() => setBreederProfileOpen(false)}
                userId={currentBreederId}
                currentUserId={user?.id}
            />

            <ChatManager />
        </div>
    );
};

export default ClaudeLayout;
