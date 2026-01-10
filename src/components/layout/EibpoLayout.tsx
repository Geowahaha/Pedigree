/**
 * Eibpo Layout - Claude.ai Inspired Layout
 * 
 * "Design is not just what it looks like. Design is how it works."
 * - Steve Jobs
 * 
 * A modern, unified layout with:
 * - Collapsible sidebar navigation
 * - Large, centered AI search input
 * - Clean, minimal header
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Pet, Product, products } from '@/data/petData';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getPetById } from '@/lib/petsService';
import Sidebar from './Sidebar';
import HeroSection from '../HeroSection';
import FeaturesSection from '../FeaturesSection';
import PedigreeSection from '../PedigreeSection';
import SearchSection from '../SearchSection';
import MarketplaceSection from '../MarketplaceSection';
import Footer from '../Footer';
import PetRegistrationModal from '../PetRegistrationModal';
import PedigreeModal from '../modals/PedigreeModal';
import CartModal from '../modals/CartModal';
import AuthModal from '../modals/AuthModal';
import ProductModal from '../modals/ProductModal';
import PetDetailsModal from '../modals/PetDetailsModal';
import BreederDashboard from '../BreederDashboard';
import AdminPanel from '../AdminPanel';
import BreederProfileModal from '../modals/BreederProfileModal';
import BackToTop from '../BackToTop';
import TestimonialsSection from '../TestimonialsSection';
import CTASection from '../CTASection';
import ChatManager from '../ChatManager';
import { AIChatOverlay } from '../ai/AIChatOverlay';
import PuppyComingSoonSection from '../PuppyComingSoonSection';

interface CartItem {
    product: Product;
    quantity: number;
}

const EibpoLayout: React.FC = () => {
    const { user, savedCart, syncCart, signOut } = useAuth();
    const { t, language, setLanguage } = useLanguage();

    // Layout state
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [activeSection, setActiveSection] = useState('home');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [refreshPets, setRefreshPets] = useState(0);
    const [showAISearch, setShowAISearch] = useState(true);

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
    const [breedingMatchOpen, setBreedingMatchOpen] = useState(false);
    const [provenPairOpen, setProvenPairOpen] = useState(false);

    // Selected items
    const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

    // AI Search input
    const [aiSearchValue, setAiSearchValue] = useState('');

    // Event Listeners for Custom Events
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
            } else {
                setGlobalAIQuery(undefined);
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

    // Load saved cart when user logs in
    useEffect(() => {
        if (user && savedCart.length > 0) {
            const loadedCart: CartItem[] = savedCart
                .map(item => {
                    const product = products.find(p => p.id === item.productId);
                    if (product) {
                        return { product, quantity: item.quantity };
                    }
                    return null;
                })
                .filter((item): item is CartItem => item !== null);
            setCart(loadedCart);
        }
    }, [user, savedCart]);

    // Check for shared pet link on mount
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

    // Track scroll for header behavior
    useEffect(() => {
        const handleScroll = () => {
            const sections = ['home', 'pedigree', 'search', 'marketplace'];
            const scrollPosition = window.scrollY + 100;

            for (const section of sections) {
                const element = document.getElementById(section);
                if (element) {
                    const { offsetTop, offsetHeight } = element;
                    if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
                        setActiveSection(section);
                        break;
                    }
                }
            }

            // Hide AI search when scrolled down
            setShowAISearch(window.scrollY < 100);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Sync cart to database
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
                    item.product.id === product.id
                        ? { ...item, quantity: item.quantity + quantity }
                        : item
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

    // Navigation
    const handleNavigate = (section: string) => {
        setActiveSection(section);
        const element = document.getElementById(section);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    // Pet handlers
    const handleViewPedigree = (pet: Pet) => {
        setSelectedPet(pet);
        setPedigreeModalOpen(true);
    };

    const handleViewPetDetails = (pet: Pet) => {
        setSelectedPet(pet);
        setPetDetailsModalOpen(true);
    };

    // Product handlers
    const handleAddToCart = (product: Product) => {
        addToCart(product);
    };

    const handleQuickView = (product: Product) => {
        setSelectedProduct(product);
        setProductModalOpen(true);
    };

    const handleAddToCartWithQuantity = (product: Product, quantity: number) => {
        addToCart(product, quantity);
    };

    // Register handlers
    const handleRegisterClick = () => {
        if (!user) {
            setAuthModalOpen(true);
        } else {
            setRegisterModalOpen(true);
        }
    };

    const handlePetRegistered = () => {
        setRefreshPets(prev => prev + 1);
    };

    // AI Search submit
    const handleAISearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (aiSearchValue.trim()) {
            setGlobalAIQuery(aiSearchValue.trim());
            setIsGlobalAIOpen(true);
            setAiSearchValue('');
        }
    };

    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    return (
        <div className="min-h-screen bg-background text-foreground relative">
            {/* Sidebar */}
            <Sidebar
                isOpen={sidebarOpen}
                onToggle={() => setSidebarOpen(!sidebarOpen)}
                onNavigate={handleNavigate}
                onOpenRegister={handleRegisterClick}
                onOpenBreedingMatch={() => {
                    setGlobalAIQuery('Find breeding match');
                    setIsGlobalAIOpen(true);
                }}
                onOpenProvenPair={() => handleNavigate('search')}
                onOpenMarketplace={() => handleNavigate('marketplace')}
                onOpenPuppyComingSoon={() => handleNavigate('puppy-coming')}
                activeSection={activeSection}
            />

            {/* Main Content */}
            <div
                className={`
          transition-all duration-300 ease-out
          ${sidebarOpen ? 'lg:ml-72' : 'lg:ml-16'}
        `}
            >
                {/* Top Header Bar */}
                <header className={`
          fixed top-0 right-0 z-40
          h-16 lg:h-20
          bg-background/80 backdrop-blur-xl
          border-b border-primary/10
          flex items-center justify-between
          px-4 lg:px-8
          transition-all duration-300
          ${sidebarOpen ? 'left-0 lg:left-72' : 'left-0 lg:left-16'}
        `}>
                    {/* Mobile Menu Toggle */}
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="lg:hidden p-2 rounded-xl hover:bg-primary/5 transition-colors"
                    >
                        <svg className="w-6 h-6 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>

                    {/* Center: Brand on mobile / Empty on desktop */}
                    <div className="lg:hidden flex items-center gap-2">
                        <span className="text-lg font-bold">
                            Eibpo<span className="text-emerald-500"> Pedigree</span>
                        </span>
                    </div>

                    {/* Right Actions */}
                    <div className="flex items-center gap-3 ml-auto">
                        {/* Language Selector */}
                        <select
                            value={language}
                            onChange={(e) => setLanguage(e.target.value as any)}
                            className="bg-transparent text-sm font-medium text-foreground/70 border-none focus:ring-0 cursor-pointer hover:text-foreground transition-colors"
                        >
                            <option value="en">EN</option>
                            <option value="th">TH</option>
                        </select>

                        {/* Cart */}
                        <button
                            onClick={() => setCartModalOpen(true)}
                            className="relative p-2.5 rounded-full bg-white/50 hover:bg-white border border-primary/10 transition-all hover:shadow-md"
                        >
                            <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                            </svg>
                            {cartCount > 0 && (
                                <span className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                                    {cartCount}
                                </span>
                            )}
                        </button>

                        {/* User Menu */}
                        {user ? (
                            <button
                                onClick={() => {
                                    setCurrentBreederId(user.id);
                                    setBreederProfileOpen(true);
                                }}
                                className="flex items-center gap-2 px-3 py-2 rounded-full bg-white/50 hover:bg-white border border-primary/10 transition-all hover:shadow-md"
                            >
                                <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white font-medium">
                                    {user.profile?.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                                </div>
                                <span className="hidden sm:block text-sm font-medium text-foreground max-w-[100px] truncate">
                                    {user.profile?.full_name || user.email.split('@')[0]}
                                </span>
                            </button>
                        ) : (
                            <button
                                onClick={() => setAuthModalOpen(true)}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-foreground text-background text-sm font-bold hover:bg-foreground/90 transition-all shadow-lg"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                {t('nav.signIn')}
                            </button>
                        )}
                    </div>
                </header>

                {/* Main Content Area */}
                <main className="pt-16 lg:pt-20">
                    {/* Hero with Large AI Search */}
                    <section id="home" className="relative min-h-[80vh] flex flex-col items-center justify-center px-4 py-20 bg-gradient-to-b from-background via-emerald-50/30 to-background">
                        {/* Background decorations */}
                        <div className="absolute inset-0 overflow-hidden pointer-events-none">
                            <div className="absolute top-20 left-1/4 w-96 h-96 bg-emerald-200/20 rounded-full blur-3xl animate-pulse" />
                            <div className="absolute bottom-20 right-1/4 w-80 h-80 bg-teal-200/20 rounded-full blur-3xl animate-pulse delay-1000" />
                        </div>

                        {/* Content */}
                        <div className="relative z-10 max-w-3xl mx-auto text-center space-y-8">
                            {/* Headline */}
                            <div className="space-y-4">
                                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground">
                                    <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
                                        Eibpo Pedigree
                                    </span>
                                </h1>
                                <p className="text-lg sm:text-xl text-foreground/60 max-w-xl mx-auto leading-relaxed">
                                    {language === 'th'
                                        ? 'ระบบจัดการสายพันธุ์สัตว์เลี้ยงอัจฉริยะ พร้อม AI ช่วยค้นหาคู่ผสมที่เหมาะสม'
                                        : 'Intelligent pet pedigree management with AI-powered breeding match assistance'
                                    }
                                </p>
                            </div>

                            {/* Large AI Search Bar */}
                            <form onSubmit={handleAISearchSubmit} className="relative max-w-2xl mx-auto">
                                <div className="relative group">
                                    <input
                                        type="text"
                                        value={aiSearchValue}
                                        onChange={(e) => setAiSearchValue(e.target.value)}
                                        placeholder={language === 'th'
                                            ? 'ถาม AI เช่น "หาคู่ผสมให้ KAKAO" หรือ "ค้นหาสุนัขพันธุ์ไทยหลังอาน"'
                                            : 'Ask AI: "Find mate for KAKAO" or "Search Thai Ridgeback dogs"'
                                        }
                                        className="
                      w-full h-20 px-6 pr-16
                      text-lg
                      bg-white/80 backdrop-blur-sm
                      border-2 border-emerald-100/50
                      rounded-2xl
                      shadow-xl shadow-emerald-100/30
                      focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100
                      placeholder:text-foreground/40
                      transition-all duration-300
                      group-hover:shadow-2xl group-hover:shadow-emerald-100/40
                    "
                                    />
                                    {/* AI Badge */}
                                    <div className="absolute left-6 -top-3 px-3 py-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold uppercase tracking-wider rounded-full shadow-lg">
                                        AI Powered
                                    </div>
                                    {/* Submit Button */}
                                    <button
                                        type="submit"
                                        className="
                      absolute right-4 top-1/2 -translate-y-1/2
                      w-12 h-12
                      bg-gradient-to-r from-emerald-500 to-teal-500
                      rounded-xl
                      flex items-center justify-center
                      text-white
                      shadow-lg shadow-emerald-500/30
                      hover:scale-105 hover:shadow-xl
                      transition-all duration-200
                    "
                                    >
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                        </svg>
                                    </button>
                                </div>
                            </form>

                            {/* Quick Actions */}
                            <div className="flex flex-wrap justify-center gap-3">
                                <button
                                    onClick={handleRegisterClick}
                                    className="
                    inline-flex items-center gap-2 px-6 py-3
                    bg-foreground text-background
                    rounded-full font-medium
                    hover:bg-foreground/90 hover:-translate-y-0.5
                    transition-all duration-200
                    shadow-lg
                  "
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                    </svg>
                                    {language === 'th' ? 'ลงทะเบียนสัตว์เลี้ยง' : 'Register Your Pet'}
                                </button>
                                <button
                                    onClick={() => handleNavigate('search')}
                                    className="
                    inline-flex items-center gap-2 px-6 py-3
                    bg-white/80 text-foreground
                    border border-primary/10
                    rounded-full font-medium
                    hover:bg-white hover:-translate-y-0.5
                    transition-all duration-200
                    shadow-md
                  "
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                    {language === 'th' ? 'ค้นหาสัตว์เลี้ยง' : 'Search Pets'}
                                </button>
                            </div>
                        </div>
                    </section>

                    {/* Rest of the content sections */}
                    <PedigreeSection
                        onRegisterClick={handleRegisterClick}
                        onViewPedigree={handleViewPedigree}
                        onViewDetails={handleViewPetDetails}
                        key={`pedigree-${refreshPets}`}
                    />

                    <SearchSection
                        onViewPedigree={handleViewPedigree}
                        onViewDetails={handleViewPetDetails}
                        onRequireAuth={() => setAuthModalOpen(true)}
                        key={`search-${refreshPets}`}
                    />

                    <div id="puppy-coming">
                        <PuppyComingSoonSection />
                    </div>

                    <MarketplaceSection
                        onAddToCart={handleAddToCart}
                        onQuickView={handleQuickView}
                    />

                    <CTASection onGetStarted={handleRegisterClick} />

                    <FeaturesSection />

                    <TestimonialsSection />
                </main>

                {/* Footer */}
                <Footer />
            </div>

            {/* Dashboard Overlay */}
            {dashboardOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-background/95 backdrop-blur-sm animate-in fade-in duration-300">
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
            <BackToTop />
        </div>
    );
};

export default EibpoLayout;
