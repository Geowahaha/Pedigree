import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { products, Pet, Product } from '@/data/petData';
import { getRandomPets, searchPets } from '@/lib/petsService';
import { processGlobalQuery, AIResponse } from '@/lib/ai/globalBrain';
import { AIChatOverlay } from './ai/AIChatOverlay';

interface HeroSectionProps {
  onRegisterClick: () => void;
  onSearchClick: () => void;
  onViewPedigree?: (pet: Pet) => void;
  onViewPetDetails?: (pet: Pet) => void;
  onQuickView?: (product: Product) => void;
  onOpenAI?: () => void;
}

type SuggestionCard = {
  id: string;
  type: 'register' | 'pet' | 'product' | 'pedigree' | 'puppy';
  title: string;
  subtitle?: string;
  image?: string;
  icon?: React.ReactNode;
  data?: Pet | Product;
};

type SearchResult = {
  id: string;
  type: 'pet' | 'product' | 'pedigree';
  name: string;
  subtitle: string;
  image: string;
  data: Pet | Product;
};

const HeroSection: React.FC<HeroSectionProps> = ({
  onRegisterClick,
  onSearchClick,
  onViewPedigree,
  onViewPetDetails,
  onQuickView,
  onOpenAI
}) => {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SuggestionCard[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [supabasePets, setSupabasePets] = useState<Pet[]>([]);
  const [aiResult, setAiResult] = useState<AIResponse | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showAiChat, setShowAiChat] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const dropdownTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch random pets from Supabase on mount
  useEffect(() => {
    async function fetchPets() {
      try {
        const randomPets = await getRandomPets(6);
        setSupabasePets(randomPets);
      } catch (error) {
        console.error('Failed to fetch pets:', error);
      }
    }
    fetchPets();
  }, []);

  // Close dropdown when clicking outside - with 10s delay
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        if (dropdownTimeoutRef.current) {
          clearTimeout(dropdownTimeoutRef.current);
        }
        dropdownTimeoutRef.current = setTimeout(() => {
          setShowDropdown(false);
        }, 10000); // 10 second delay
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (dropdownTimeoutRef.current) {
        clearTimeout(dropdownTimeoutRef.current);
      }
    };
  }, []);

  // Live search
  useEffect(() => {
    async function performSearch() {
      if (searchQuery.trim().length >= 2) {
        const query = searchQuery.toLowerCase();
        const results: SearchResult[] = [];

        try {
          const foundPets = await searchPets(query, 6);
          foundPets.forEach(pet => {
            results.push({
              id: `pet-${pet.id}`,
              type: pet.parentIds?.sire || pet.parentIds?.dam ? 'pedigree' : 'pet',
              name: pet.name,
              subtitle: `${pet.breed} • ${pet.location}`,
              image: pet.image,
              data: pet
            });
          });
        } catch (error) {
          console.error('Search error:', error);
        }

        products.forEach(product => {
          if (
            product.name.toLowerCase().includes(query) ||
            product.category.toLowerCase().includes(query)
          ) {
            results.push({
              id: `product-${product.id}`,
              type: 'product',
              name: product.name,
              subtitle: `฿${product.price.toFixed(2)} • ${product.category}`,
              image: product.image,
              data: product
            });
          }
        });

        if (searchResults.length === 0 && results.length === 0 && query.length > 3) {
          setIsAiLoading(true);
          processGlobalQuery(query, 'th').then(response => {
            setAiResult(response);
            setIsAiLoading(false);
          });
        } else {
          setAiResult(null);
        }

        setSearchResults(results.slice(0, 6));
        setShowDropdown(true);
      } else {
        setSearchResults([]);
        setAiResult(null);
        setShowDropdown(false);
      }
    }
    performSearch();
  }, [searchQuery]);

  // Generate suggestions
  useEffect(() => {
    const generateSuggestions = () => {
      const cards: SuggestionCard[] = [];

      const registerCard: SuggestionCard = {
        id: 'register-card',
        type: 'register',
        title: t('hero.registerPet') || 'Register Your Pet',
        subtitle: t('hero.registerSubtitle') || 'Start verified breeding journey',
        icon: (
          <svg className="w-8 h-8 text-[#C5A059]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        )
      };
      cards.push(registerCard);

      const puppyCard: SuggestionCard = {
        id: 'puppy-coming-soon',
        type: 'puppy',
        title: 'Puppy Coming Soon',
        subtitle: 'Reserve your queue now',
        image: 'https://images.unsplash.com/photo-1591160690555-5debfba289f0?auto=format&fit=crop&q=80&w=400',
        data: null as any
      };
      cards.push(puppyCard);

      const mixedCards: SuggestionCard[] = [];
      const validPets = supabasePets.filter(p => p.image && p.image.trim() !== '');
      const availablePets = [...validPets].sort(() => 0.5 - Math.random()).slice(0, 3);
      availablePets.forEach(pet => {
        mixedCards.push({
          id: `pet-${pet.id}`,
          type: 'pet',
          title: pet.name,
          subtitle: `${pet.breed}`,
          image: pet.image,
          data: pet
        });
      });

      const availableProducts = [...products].sort(() => 0.5 - Math.random()).slice(0, 1);
      availableProducts.forEach(product => {
        mixedCards.push({
          id: `product-${product.id}`,
          type: 'product',
          title: product.name,
          subtitle: `฿${product.price.toFixed(2)}`,
          image: product.image,
          data: product
        });
      });

      const shuffledMixed = mixedCards.sort(() => 0.5 - Math.random());
      const finalCards = [...cards, ...shuffledMixed].slice(0, 6);
      setSuggestions(finalCards);
    };

    if (supabasePets.length > 0) {
      generateSuggestions();
      const interval = setInterval(generateSuggestions, 30000);
      return () => clearInterval(interval);
    }
  }, [t, supabasePets]);

  const handleCardClick = (card: SuggestionCard) => {
    switch (card.type) {
      case 'register':
        onRegisterClick();
        break;
      case 'pet':
        if (card.data && onViewPetDetails) {
          onViewPetDetails(card.data as Pet);
        }
        break;
      case 'product':
        if (card.data && onQuickView) {
          onQuickView(card.data as Product);
        }
        break;
      case 'pedigree':
        if (card.data && onViewPedigree) {
          onViewPedigree(card.data as Pet);
        }
        break;
      case 'puppy': {
        const section = document.getElementById('puppy-coming-soon');
        if (section) {
          section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        break;
      }
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearchClick();
    }
  };

  return (
    <section id="home" className="relative min-h-screen flex flex-col items-center justify-center pt-28 pb-20 px-6 overflow-hidden">
      {/* Luxury Dark Background with subtle gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0A] via-[#0D0D0D] to-[#0A0A0A] -z-10" />

      {/* Subtle gold radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-[#C5A059]/5 rounded-full blur-[150px] -z-5" />

      {/* Noise texture overlay */}
      <div className="absolute inset-0 opacity-[0.02] -z-5" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`
      }} />

      {/* Main Content - Luxury Typography */}
      <div className="relative z-10 max-w-5xl w-full mx-auto text-center mb-16">

        {/* Caption - Above headline */}
        <div className={`transition-all duration-1000 ${showAiChat ? '-translate-y-[400px] opacity-0' : ''}`}>
          <span className="inline-block mb-8 text-[10px] tracking-[0.3em] uppercase text-[#C5A059] font-medium">
            Premium Pedigree Registry
          </span>

          {/* Main Headline - Playfair Display */}
          <h1 className="font-['Playfair_Display',_Georgia,_serif] text-4xl sm:text-5xl lg:text-6xl xl:text-7xl text-[#F5F5F0] mb-8 leading-[1.05] tracking-[-0.02em]">
            <span className="block">Preserve Your Pet's</span>
            <span className="block mt-2">
              <span className="text-[#C5A059]">Legacy</span> Forever
            </span>
          </h1>

          {/* Subtitle */}
          <p className="font-['Cormorant_Garamond',_Georgia,_serif] text-lg sm:text-xl text-[#B8B8B8]/80 mb-12 max-w-2xl mx-auto leading-relaxed tracking-wide">
            {t('hero.subtext') || 'The definitive platform for verified bloodlines, trusted breeding, and comprehensive pet records.'}
          </p>
        </div>

        {/* Luxury Search Bar */}
        <div ref={searchRef} className="relative max-w-2xl mx-auto mb-12">
          <form onSubmit={handleSearchSubmit}>
            <div className="relative group">
              {/* Search container - Luxury dark style */}
              <div className="relative flex items-center bg-[#1A1A1A] border border-[#C5A059]/20 group-hover:border-[#C5A059]/40 group-focus-within:border-[#C5A059]/60 transition-all duration-500">

                {/* Search Icon */}
                <div className="pl-6 text-[#C5A059]/60 group-focus-within:text-[#C5A059] transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>

                {/* Input */}
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => searchQuery.length >= 2 && setShowDropdown(true)}
                  placeholder={t('hero.searchPlaceholder') || 'Search pets, breeds, breeders...'}
                  className="flex-1 px-5 py-5 bg-transparent outline-none text-[#F5F5F0] placeholder:text-[#B8B8B8]/40 text-base font-light tracking-wide"
                  style={{ boxShadow: 'none' }}
                />

                {/* AI Mode Button */}
                <button
                  type="button"
                  onClick={() => {
                    setShowAiChat(true);
                    setShowDropdown(false);
                  }}
                  className="hidden md:flex items-center gap-2 px-6 py-3 mr-2 bg-transparent border border-[#C5A059]/40 text-[#C5A059] text-[10px] tracking-[0.15em] uppercase font-medium hover:bg-[#C5A059] hover:text-[#0A0A0A] transition-all duration-300"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  AI
                </button>
              </div>
            </div>
          </form>

          {/* AI Chat Overlay */}
          {showAiChat && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm">
              <AIChatOverlay
                isOpen={true}
                onClose={() => setShowAiChat(false)}
                initialQuery={searchQuery}
                className="w-[90%] max-w-lg h-[600px] bg-[#1A1A1A] shadow-2xl flex flex-col border border-[#C5A059]/20 overflow-hidden"
              />
            </div>
          )}

          {/* Search Dropdown - Luxury Dark */}
          {showDropdown && searchResults.length > 0 && (
            <div className="absolute top-full mt-2 w-full bg-[#1A1A1A] border border-[#C5A059]/20 shadow-2xl z-50">
              <div className="p-2">
                <p className="text-[10px] tracking-[0.1em] uppercase text-[#C5A059]/60 px-4 py-2">
                  {searchResults.length} Results
                </p>
                {searchResults.map((result) => (
                  <button
                    key={result.id}
                    onClick={() => {
                      if (result.type === 'product') {
                        onQuickView?.(result.data as Product);
                      } else {
                        if (onViewPetDetails) {
                          onViewPetDetails(result.data as Pet);
                        }
                      }
                      setShowDropdown(false);
                      setSearchQuery('');
                    }}
                    className="w-full flex items-center gap-4 p-3 hover:bg-[#C5A059]/10 transition-colors text-left group"
                  >
                    <div className="w-12 h-12 overflow-hidden flex-shrink-0 bg-[#2A2A2A]">
                      <img
                        src={result.image}
                        alt={result.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-[#F5F5F0] text-sm truncate">{result.name}</h4>
                      <p className="text-xs text-[#B8B8B8]/60 truncate">{result.subtitle}</p>
                    </div>
                    <span className="text-[9px] tracking-wider uppercase text-[#C5A059]/60 px-2 py-1 border border-[#C5A059]/20">
                      {result.type === 'pet' && 'Pet'}
                      {result.type === 'product' && 'Shop'}
                      {result.type === 'pedigree' && 'Tree'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* CTA Buttons - Luxury Style */}
        <div className={`flex justify-center gap-6 transition-all duration-700 ${showAiChat ? 'opacity-0' : ''}`}>
          <button
            onClick={onSearchClick}
            className="px-8 py-4 bg-transparent border border-[#B8B8B8]/30 text-[#B8B8B8] text-[11px] tracking-[0.2em] uppercase font-medium hover:border-[#C5A059] hover:text-[#C5A059] transition-all duration-300"
          >
            {t('hero.searchBtn') || 'Explore'}
          </button>
          <button
            onClick={onRegisterClick}
            className="px-8 py-4 bg-[#C5A059] border border-[#C5A059] text-[#0A0A0A] text-[11px] tracking-[0.2em] uppercase font-semibold hover:bg-[#D4C4B5] hover:border-[#D4C4B5] transition-all duration-300"
          >
            {t('hero.registerBtn') || 'Register Pet'}
          </button>
        </div>
      </div>

      {/* Featured Cards - Luxury Grid */}
      <div className={`relative z-10 max-w-6xl w-full mx-auto px-4 transition-all duration-1000 ${showAiChat ? 'translate-y-[400px] opacity-0' : showDropdown && searchResults.length > 0 ? 'mt-60' : 'mt-0'
        }`}>

        {/* Section Label */}
        <div className="text-center mb-8">
          <span className="text-[10px] tracking-[0.3em] uppercase text-[#C5A059]/60">Featured Collection</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {suggestions.map((card, index) => (
            <LuxuryCard
              key={card.id}
              card={card}
              index={index}
              onClick={handleCardClick}
            />
          ))}
        </div>
      </div>

      {/* Scroll Indicator - Luxury */}
      <div className={`absolute bottom-12 left-1/2 -translate-x-1/2 z-10 transition-opacity duration-500 ${showAiChat ? 'opacity-0' : 'opacity-100'}`}>
        <div className="flex flex-col items-center gap-3 text-[#C5A059]/40 animate-bounce">
          <span className="text-[9px] tracking-[0.2em] uppercase">Explore</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </div>
    </section>
  );
};


// Luxury Card Component
interface LuxuryCardProps {
  card: SuggestionCard;
  index: number;
  onClick: (card: SuggestionCard) => void;
}

const LuxuryCard: React.FC<LuxuryCardProps> = ({ card, index, onClick }) => {
  const [imageError, setImageError] = useState(false);
  const isImageCard = card.type !== 'register' && card.image;
  const showPlaceholder = (isImageCard && imageError) || (card.type !== 'register' && !card.image);

  return (
    <button
      onClick={() => onClick(card)}
      className="group relative bg-[#1A1A1A] border border-[#C5A059]/10 hover:border-[#C5A059]/40 transition-all duration-500 overflow-hidden hover:-translate-y-2"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* Card Image or Icon */}
      {card.type === 'register' ? (
        <div className="aspect-square flex items-center justify-center bg-gradient-to-br from-[#1A1A1A] to-[#2A2A2A] text-[#C5A059] group-hover:scale-105 transition-transform duration-500">
          {card.icon}
        </div>
      ) : showPlaceholder ? (
        <div className="aspect-square bg-[#2A2A2A] flex flex-col items-center justify-center p-4 text-center">
          <span className="text-[#C5A059]/20 text-2xl mb-2">◇</span>
          <span className="text-[9px] text-[#B8B8B8]/30 uppercase tracking-wider">Awaiting</span>
        </div>
      ) : (
        <div className="aspect-square overflow-hidden bg-[#2A2A2A]">
          <img
            src={card.image}
            alt={card.title}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
            onError={() => setImageError(true)}
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A]/80 via-transparent to-transparent" />
        </div>
      )}

      {/* Card Badge - Top Right */}
      <div className="absolute top-3 right-3">
        <span className="px-2 py-1 text-[8px] tracking-[0.1em] uppercase font-medium border border-[#C5A059]/30 text-[#C5A059] bg-[#0A0A0A]/80 backdrop-blur-sm">
          {card.type === 'register' && 'New'}
          {card.type === 'pet' && 'Pet'}
          {card.type === 'product' && 'Shop'}
          {card.type === 'pedigree' && 'Tree'}
          {card.type === 'puppy' && 'Soon'}
        </span>
      </div>

      {/* Card Content - Bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#0A0A0A] to-transparent">
        <h3 className="font-['Playfair_Display'] text-sm text-[#F5F5F0] mb-1 line-clamp-1 group-hover:text-[#C5A059] transition-colors">
          {card.title}
        </h3>
        {card.subtitle && (
          <p className="text-[10px] text-[#B8B8B8]/60 line-clamp-1 tracking-wide">
            {card.subtitle}
          </p>
        )}
      </div>
    </button>
  );
};

export default HeroSection;
