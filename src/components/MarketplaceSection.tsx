import React, { useState, useMemo } from 'react';
import { products, Product } from '@/data/petData';
import ProductCard from './ProductCard';

interface MarketplaceSectionProps {
  onAddToCart: (product: Product) => void;
  onQuickView: (product: Product) => void;
}

const MarketplaceSection: React.FC<MarketplaceSectionProps> = ({ onAddToCart, onQuickView }) => {
  const [category, setCategory] = useState<'all' | 'food' | 'toys' | 'accessories'>('all');
  const [petType, setPetType] = useState<'all' | 'dog' | 'cat'>('all');
  const [sortBy, setSortBy] = useState<'featured' | 'price-low' | 'price-high' | 'rating'>('featured');
  const [searchQuery, setSearchQuery] = useState('');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 5000]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const filteredProducts = useMemo(() => {
    let filtered = products.filter(product => {
      const matchesCategory = category === 'all' || product.category === category;
      const matchesPetType = petType === 'all' || product.petType === 'all' || product.petType === petType;
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.seller.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPriceRange = product.price >= priceRange[0] && product.price <= priceRange[1];
      const matchesFavorites = !showFavoritesOnly || favorites.includes(product.id);
      return matchesCategory && matchesPetType && matchesSearch && matchesPriceRange && matchesFavorites;
    });

    // Sort
    switch (sortBy) {
      case 'price-low':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      default:
        // Featured - keep original order
        break;
    }

    return filtered;
  }, [category, petType, sortBy, searchQuery, priceRange, showFavoritesOnly, favorites]);

  const toggleFavorite = (productId: string) => {
    setFavorites(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const categories = [
    {
      id: 'all', label: 'All Products', icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      )
    },
    {
      id: 'food', label: 'Food', icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    {
      id: 'toys', label: 'Toys', icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      id: 'accessories', label: 'Accessories', icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
      )
    }
  ];

  return (
    <div className="max-w-[1800px] mx-auto px-4 sm:px-6">
      {/* Header */}
      <div className="mb-6 sm:mb-8 md:mb-10 text-center">
        <h2 className="font-['Playfair_Display'] text-2xl sm:text-3xl md:text-4xl font-bold text-[#0d0c22] mb-2 sm:mb-3">
          Marketplace
        </h2>
        <p className="text-gray-500 max-w-2xl mx-auto text-sm sm:text-base lg:text-lg px-2 sm:px-0">
          Discover handpicked products from verified sellers. Quality nutrition, toys, and accessories for your beloved companions.
        </p>
      </div>

      {/* Category Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 md:gap-5 mb-6 sm:mb-8 md:mb-10">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategory(cat.id as typeof category)}
            className={`p-3 sm:p-4 md:p-5 lg:p-6 rounded-xl sm:rounded-2xl border transition-all duration-300 flex flex-col items-center gap-2 sm:gap-3 min-h-[80px] sm:min-h-[100px] touch-manipulation ${category === cat.id
              ? 'bg-[#ea4c89] border-[#ea4c89] text-white shadow-lg shadow-[#ea4c89]/30 transform scale-105'
              : 'bg-white border-gray-100 text-gray-500 hover:border-[#ea4c89]/30 hover:text-[#0d0c22] hover:shadow-lg hover:-translate-y-1 active:scale-95'
              }`}
          >
            <div className={`p-2 sm:p-2.5 md:p-3.5 rounded-xl sm:rounded-2xl transition-all duration-300 ${category === cat.id ? 'bg-white/20 text-white' : 'bg-gray-50 text-gray-400 group-hover:text-[#ea4c89]'}`}>
              {cat.icon}
            </div>
            <span className="font-bold text-xs sm:text-sm lg:text-base">{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 mb-6 sm:mb-8 border border-gray-100 shadow-sm">
        <div className="flex flex-col gap-4 sm:gap-6">
          <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 items-stretch lg:items-center justify-between">
            {/* Pet Type Filter */}
            <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-2 lg:pb-0 -mx-4 px-4 sm:mx-0 sm:px-0">
              {['all', 'dog', 'cat'].map((type) => (
                <button
                  key={type}
                  onClick={() => setPetType(type as typeof petType)}
                  className={`flex-shrink-0 px-4 sm:px-6 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all border min-h-[40px] sm:min-h-[44px] touch-manipulation ${petType === type
                    ? 'bg-[#0d0c22] text-white border-[#0d0c22] shadow-md'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-[#0d0c22] hover:text-[#0d0c22] active:scale-95'
                    }`}
                >
                  {type === 'all' ? 'All Pets' : type === 'dog' ? 'Dogs' : 'Cats'}
                </button>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-stretch sm:items-center w-full lg:w-auto">
              {/* Sort */}
              <div className="relative flex-1 sm:flex-initial">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="w-full sm:w-auto appearance-none px-4 sm:px-6 py-2.5 pr-10 rounded-full border border-gray-200 focus:border-[#ea4c89] outline-none text-[#0d0c22] bg-white text-xs sm:text-sm font-bold cursor-pointer hover:border-gray-300 transition-colors min-h-[44px] touch-manipulation"
                >
                  <option value="featured">Featured</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="rating">Highest Rated</option>
                </select>
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none text-gray-400">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>

              <button
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                className={`flex-1 sm:flex-initial px-4 sm:px-6 py-2.5 rounded-full text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 border min-h-[44px] touch-manipulation ${showFavoritesOnly
                  ? 'bg-red-50 text-red-500 border-red-200 shadow-sm'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-red-200 hover:text-red-500 active:scale-95'
                  }`}
              >
                <svg className="w-4 sm:w-5 h-4 sm:h-5" fill={showFavoritesOnly ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                <span className="hidden xs:inline">Favorites</span>
                <span className="xs:hidden">♡</span>
                {favorites.length > 0 && <span>({favorites.length})</span>}
              </button>
            </div>
          </div>

          {/* Price Range Filter */}
          <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 pt-4 sm:pt-6 border-t border-gray-100">
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3 sm:mb-4">
                <label className="text-xs sm:text-sm font-bold text-[#0d0c22]">Price Range</label>
                <span className="text-xs sm:text-sm font-medium text-[#ea4c89] bg-[#ea4c89]/10 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full">
                  ฿{priceRange[0].toLocaleString()} - ฿{priceRange[1].toLocaleString()}
                </span>
              </div>
              <div className="flex gap-3 sm:gap-4 items-center">
                <input
                  type="range"
                  min="0"
                  max="5000"
                  step="100"
                  value={priceRange[0]}
                  onChange={(e) => setPriceRange([parseInt(e.target.value), priceRange[1]])}
                  className="flex-1 h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-[#ea4c89] touch-manipulation"
                />
                <input
                  type="range"
                  min="0"
                  max="5000"
                  step="100"
                  value={priceRange[1]}
                  onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                  className="flex-1 h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-[#ea4c89] touch-manipulation"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="mb-4 sm:mb-6 flex items-center justify-between text-xs sm:text-sm text-gray-500 font-medium px-1 sm:px-2">
        <span>Showing {filteredProducts.length} results</span>
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="text-[#ea4c89] hover:text-[#d63f7a] touch-manipulation min-h-[40px] flex items-center">
            Clear Search
          </button>
        )}
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
        {filteredProducts.map(product => (
          <div key={product.id} className="relative group">
            <button
              onClick={() => toggleFavorite(product.id)}
              className="absolute top-2 sm:top-4 right-2 sm:right-4 z-10 p-1.5 sm:p-2 bg-white rounded-full shadow-lg hover:scale-110 active:scale-95 transition-transform border border-gray-100 text-gray-400 hover:text-red-500 touch-manipulation min-w-[32px] min-h-[32px] sm:min-w-[40px] sm:min-h-[40px] flex items-center justify-center"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill={favorites.includes(product.id) ? '#ef4444' : 'none'} stroke={favorites.includes(product.id) ? '#ef4444' : 'currentColor'} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>
            <ProductCard
              product={product}
              onAddToCart={onAddToCart}
              onQuickView={onQuickView}
            />
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredProducts.length === 0 && (
        <div className="text-center py-12 sm:py-16 md:py-20 bg-white rounded-2xl sm:rounded-3xl border border-dashed border-gray-200">
          <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
            <span className="text-2xl sm:text-3xl md:text-4xl opacity-50">🛍️</span>
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-[#0d0c22] mb-2">No products found</h3>
          <p className="text-sm sm:text-base text-gray-500 mb-4 sm:mb-6 px-4">Try adjusting your filters or search terms</p>
          <button
            onClick={() => {
              setCategory('all');
              setPetType('all');
              setSearchQuery('');
              setPriceRange([0, 5000]);
            }}
            className="px-6 sm:px-8 py-2.5 sm:py-3 bg-[#ea4c89] text-white rounded-xl font-bold shadow-lg shadow-[#ea4c89]/20 hover:bg-[#d63f7a] active:scale-95 transition-all touch-manipulation min-h-[48px]"
          >
            Reset Filters
          </button>
        </div>
      )}
    </div>
  );
};

export default MarketplaceSection;
