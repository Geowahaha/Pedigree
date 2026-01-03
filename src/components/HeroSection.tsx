import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { pets, products, Pet, Product } from '@/data/petData';

interface HeroSectionProps {
  onRegisterClick: () => void;
  onSearchClick: () => void;
  onViewPedigree?: (pet: Pet) => void;
  onViewPetDetails?: (pet: Pet) => void;
  onQuickView?: (product: Product) => void;
}

type SuggestionCard = {
  id: string;
  type: 'register' | 'pet' | 'product' | 'pedigree';
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
  onQuickView
}) => {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SuggestionCard[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Live search - update results as user types
  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      const query = searchQuery.toLowerCase();
      const results: SearchResult[] = [];

      // Search pets
      pets.forEach(pet => {
        if (
          pet.name.toLowerCase().includes(query) ||
          pet.breed.toLowerCase().includes(query) ||
          pet.location.toLowerCase().includes(query) ||
          pet.registrationNumber?.toLowerCase().includes(query)
        ) {
          results.push({
            id: `pet-${pet.id}`,
            type: pet.parentIds?.sire || pet.parentIds?.dam ? 'pedigree' : 'pet',
            name: pet.name,
            subtitle: `${pet.breed} • ${pet.location}`,
            image: pet.image,
            data: pet
          });
        }
      });

      // Search products
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

      setSearchResults(results.slice(0, 6)); // Limit to 6 results
      setShowDropdown(true);
    } else {
      setSearchResults([]);
      setShowDropdown(false);
    }
  }, [searchQuery]);

  // Generate random suggestions on mount and every 30 seconds
  useEffect(() => {
    const generateSuggestions = () => {
      const cards: SuggestionCard[] = [];

      // Add 3 random pets (increased from 2)
      const randomPets = [...pets].sort(() => 0.5 - Math.random()).slice(0, 3);
      randomPets.forEach(pet => {
        cards.push({
          id: `pet-${pet.id}`,
          type: 'pet',
          title: pet.name,
          subtitle: `${pet.breed} • ${pet.location}`,
          image: pet.image,
          data: pet
        });
      });

      // Add 2 random products
      const randomProducts = [...products].sort(() => 0.5 - Math.random()).slice(0, 2);
      randomProducts.forEach(product => {
        cards.push({
          id: `product-${product.id}`,
          type: 'product',
          title: product.name,
          subtitle: `฿${product.price.toFixed(2)}`,
          image: product.image,
          data: product
        });
      });

      // Add 1 pedigree example (pet with parents)
      const pedigreeExamples = pets.filter(p => p.parentIds?.sire || p.parentIds?.dam);
      if (pedigreeExamples.length > 0) {
        const randomPedigree = pedigreeExamples[Math.floor(Math.random() * pedigreeExamples.length)];
        cards.push({
          id: `pedigree-${randomPedigree.id}`,
          type: 'pedigree',
          title: `${randomPedigree.name}'s Family Tree`,
          subtitle: 'View complete pedigree',
          image: randomPedigree.image,
          data: randomPedigree
        });
      }

      // Shuffle cards
      setSuggestions(cards.sort(() => 0.5 - Math.random()));
    };

    generateSuggestions();
    const interval = setInterval(generateSuggestions, 30000); // Refresh every 30 seconds (increased from 10)

    return () => clearInterval(interval);
  }, []);

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
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearchClick();
    }
  };

  return (
    <section id="home" className="relative min-h-[70vh] flex flex-col items-center justify-center pt-16 pb-12 px-4">
      {/* Background with subtle gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#F5F1E8] via-background to-[#E8F1E8] -z-10" />

      {/* Floating decorative elements */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-primary/5 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-pulse delay-1000" />

      {/* Main Content */}
      <div className="relative z-10 max-w-4xl w-full mx-auto text-center mb-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Main Headline - Adjusted for mobile visibility */}
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-foreground mb-4 mt-4 px-4 leading-tight">
          {t('hero.headline')}
        </h2>
        <p className="text-lg sm:text-xl text-foreground/60 mb-8 max-w-2xl mx-auto px-4">
          {t('hero.subtext')}
        </p>

        {/* Search Bar - ChatGPT/Google Style */}
        <div ref={searchRef} className="relative max-w-3xl mx-auto mb-4">
          <form onSubmit={handleSearchSubmit}>
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative flex items-center bg-white rounded-full shadow-lg hover:shadow-2xl transition-all duration-300 border border-foreground/10 hover:border-foreground/20">
                {/* Search Icon */}
                <div className="pl-6 text-foreground/40">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>

                {/* Input - NO FOCUS BORDER */}
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => searchQuery.length >= 2 && setShowDropdown(true)}
                  placeholder={t('hero.searchPlaceholder')}
                  className="flex-1 px-4 py-5 bg-transparent outline-none text-foreground placeholder:text-foreground/40 text-lg border-none focus:ring-0 focus:outline-none"
                  style={{ boxShadow: 'none' }}
                />

                {/* Voice/AI Icon */}
                <button
                  type="button"
                  className="p-2 mr-2 rounded-full hover:bg-foreground/5 transition-colors"
                  title="Voice search"
                >
                  <svg className="w-6 h-6 text-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </button>

                {/* Camera Icon */}
                <button
                  type="button"
                  className="p-2 mr-4 rounded-full hover:bg-foreground/5 transition-colors"
                  title="Image search"
                >
                  <svg className="w-6 h-6 text-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              </div>
            </div>
          </form>

          {/* Live Search Dropdown */}
          {showDropdown && searchResults.length > 0 && (
            <div className="absolute top-full mt-2 w-full bg-white rounded-2xl shadow-2xl border border-foreground/10 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-50">
              <div className="p-2">
                <p className="text-xs text-foreground/50 px-4 py-2 font-medium">
                  {searchResults.length} {t('hero.resultsFound')}
                </p>
                {searchResults.map((result) => (
                  <button
                    key={result.id}
                    onClick={() => {
                      if (result.type === 'product') {
                        onQuickView?.(result.data as Product);
                      } else if (result.type === 'pedigree') {
                        onViewPedigree?.(result.data as Pet);
                      } else {
                        onViewPetDetails?.(result.data as Pet);
                      }
                      setShowDropdown(false);
                      setSearchQuery('');
                    }}
                    className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-foreground/5 transition-colors text-left group"
                  >
                    {/* Result Image */}
                    <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-muted">
                      <img
                        src={result.image}
                        alt={result.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                      />
                    </div>

                    {/* Result Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-foreground truncate">{result.name}</h4>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium flex-shrink-0">
                          {result.type === 'pet' && t('hero.badges.pet')}
                          {result.type === 'product' && t('hero.badges.shop')}
                          {result.type === 'pedigree' && t('hero.badges.tree')}
                        </span>
                      </div>
                      <p className="text-sm text-foreground/60 truncate">{result.subtitle}</p>
                    </div>

                    {/* Arrow Icon */}
                    <svg className="w-5 h-5 text-foreground/30 group-hover:text-primary group-hover:translate-x-1 transition-all flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick action buttons below search */}
          <div className="flex justify-center gap-3 mt-4">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-full bg-foreground/5 hover:bg-foreground/10 text-foreground/70 font-medium transition-all hover:shadow-md"
            >
              {t('hero.searchBtn')}
            </button>
            <button
              type="button"
              onClick={onRegisterClick}
              className="px-6 py-2.5 rounded-full bg-accent hover:bg-accent/90 text-white font-medium transition-all hover:shadow-md"
            >
              {t('hero.registerBtn')}
            </button>
          </div>
        </div>
      </div>

      {/* Suggestion Cards - Google Style */}
      <div className={`relative z-10 max-w-7xl w-full mx-auto px-4 transition-all duration-500 ease-in-out ${showDropdown && searchResults.length > 0 ? 'mt-80' : 'mt-0'
        }`}>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
          {suggestions.map((card, index) => (
            <button
              key={card.id}
              onClick={() => handleCardClick(card)}
              className="group relative bg-white rounded-3xl p-4 hover:shadow-xl transition-all duration-300 border border-foreground/10 hover:border-primary/30 hover:-translate-y-2 overflow-hidden"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Card Image or Icon */}
              {card.image ? (
                <div className="aspect-square rounded-2xl overflow-hidden mb-3 bg-muted">
                  <img
                    src={card.image}
                    alt={card.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                </div>
              ) : (
                <div className="aspect-square rounded-2xl flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10 mb-3 text-primary group-hover:scale-110 transition-transform duration-300">
                  {card.icon}
                </div>
              )}

              {/* Card Badge */}
              <div className="absolute top-2 right-2">
                <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/90 backdrop-blur-sm shadow-sm">
                  {card.type === 'register' && t('hero.badges.action')}
                  {card.type === 'pet' && t('hero.badges.pet')}
                  {card.type === 'product' && t('hero.badges.shop')}
                  {card.type === 'pedigree' && t('hero.badges.tree')}
                </span>
              </div>

              {/* Card Content */}
              <div className="text-left">
                <h3 className="font-bold text-sm text-foreground mb-1 line-clamp-2 group-hover:text-primary transition-colors">
                  {card.title}
                </h3>
                {card.subtitle && (
                  <p className="text-xs text-foreground/50 line-clamp-1">
                    {/* Don't translate subtitle if it contains specific data */}
                    {card.type === 'pedigree' ? t('common.viewPedigree') : card.subtitle}
                  </p>
                )}
              </div>

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl pointer-events-none" />
            </button>
          ))}
        </div>

        {/* Refresh hint */}
        <p className="text-center text-xs text-foreground/40 mt-6 flex items-center justify-center gap-2">
          <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {t('hero.refreshHint')}
        </p>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 animate-bounce">
        <div className="flex flex-col items-center gap-2 text-foreground/30">
          <span className="text-[10px] font-bold uppercase tracking-wider">{t('hero.exploreMore')}</span>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
