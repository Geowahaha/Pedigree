import React, { useState, useEffect, useCallback } from 'react';
import { Pet, Product, products } from '@/data/petData';
import { useAuth } from '@/contexts/AuthContext';
import { getPetById } from '@/lib/petsService';
import Header from './Header';
import HeroSection from './HeroSection';
import FeaturesSection from './FeaturesSection';
import PedigreeSection from './PedigreeSection';
import SearchSection from './SearchSection';
import MarketplaceSection from './MarketplaceSection';
import Footer from './Footer';
import RegisterPetModal from './modals/RegisterPetModal';
import PetRegistrationModal from './PetRegistrationModal'; // Using OCR version as primary
import PedigreeModal from './modals/PedigreeModal';
import CartModal from './modals/CartModal';
import AuthModal from './modals/AuthModal';
import ProductModal from './modals/ProductModal';
import PetDetailsModal from './modals/PetDetailsModal';
import BreederDashboard from './BreederDashboard';
import AdminPanel from './AdminPanel';
import BreederProfileModal from './modals/BreederProfileModal';
import BackToTop from './BackToTop';
import TestimonialsSection from './TestimonialsSection';
import CTASection from './CTASection';
import ChatManager from './ChatManager';
import { AIChatOverlay } from './ai/AIChatOverlay';

interface CartItem {
  product: Product;
  quantity: number;
}

const AppLayout: React.FC = () => {
  const { user, savedCart, syncCart } = useAuth();

  // State
  const [activeSection, setActiveSection] = useState('home');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [refreshPets, setRefreshPets] = useState(0);

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
      // Convert saved cart items to full cart items with product data
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

  // Check for shared pet link on mount - FETCH FROM SUPABASE
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

            // Clean up URL without refresh (keeps URL clean)
            // window.history.replaceState({}, '', window.location.pathname);
          }
        } catch (error) {
          console.error('Failed to load shared pet:', error);
        }
      }
    }
    handleSharedLink();
  }, []);

  // Track active section on scroll
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
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Sync cart to database when it changes
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
        item.product.id === productId
          ? { ...item, quantity }
          : item
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

  const handleSearchClick = () => {
    const element = document.getElementById('search');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handlePetRegistered = () => {
    // Trigger refresh of pet lists
    setRefreshPets(prev => prev + 1);
  };

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      {/* Header */}
      <Header
        cartCount={cartCount}
        onCartClick={() => setCartModalOpen(true)}
        activeSection={activeSection}
        onNavigate={handleNavigate}
        onAuthClick={() => setAuthModalOpen(true)}
        onDashboardClick={() => setDashboardOpen(true)}
        onAdminClick={() => setAdminPanelOpen(true)}
        onMyPetsClick={() => {
          if (user) {
            setCurrentBreederId(user.id);
            setBreederProfileOpen(true);
          } else {
            setAuthModalOpen(true);
          }
        }}
      />

      {dashboardOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-background/95 backdrop-blur-sm animate-in fade-in duration-300">
          <BreederDashboard onClose={() => setDashboardOpen(false)} />
        </div>
      )}

      {/* Main Content */}
      <main>
        {/* Hero Section */}
        <HeroSection
          onRegisterClick={handleRegisterClick}
          onSearchClick={handleSearchClick}
          onViewPedigree={handleViewPedigree}
          onViewPetDetails={handleViewPetDetails}
          onQuickView={handleQuickView}
          onOpenAI={() => setIsGlobalAIOpen(true)}
        />

        {/* Pedigree Section */}
        <PedigreeSection
          onRegisterClick={handleRegisterClick}
          onViewPedigree={handleViewPedigree}
          onViewDetails={handleViewPetDetails}
          key={`pedigree-${refreshPets}`}
        />

        {/* Search Section */}
        <SearchSection
          onViewPedigree={handleViewPedigree}
          onViewDetails={handleViewPetDetails}
          onRequireAuth={() => setAuthModalOpen(true)}
          key={`search-${refreshPets}`}
        />

        {/* Marketplace Section */}
        <MarketplaceSection
          onAddToCart={handleAddToCart}
          onQuickView={handleQuickView}
        />

        {/* CTA Section */}
        <CTASection onGetStarted={handleRegisterClick} />

        {/* Features Section (Why Choose Us) - Moved to bottom */}
        <FeaturesSection />

        {/* Testimonials Section */}
        <TestimonialsSection />
      </main>

      {/* Footer */}
      <Footer />

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

      {/* Global AI Chat Overlay */}
      <AIChatOverlay
        isOpen={isGlobalAIOpen}
        onClose={() => setIsGlobalAIOpen(false)}
        currentPet={undefined} // Undefined triggers Global Advisor Mode
        initialQuery={globalAIQuery}
      />

      <BreederProfileModal
        isOpen={breederProfileOpen}
        onClose={() => setBreederProfileOpen(false)}
        userId={currentBreederId}
        currentUserId={user?.id}
      />

      {/* Chat Manager - Handles notification-triggered chats */}
      <ChatManager />

      {/* Back to Top Button */}
      <BackToTop />
    </div>
  );
};

export default AppLayout;
