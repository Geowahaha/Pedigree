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
    <section id="marketplace" className="py-20 lg:py-28 bg-gradient-to-b from-background to-muted/30 relative">
      <div className="zen-container px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-14">
          <span className="inline-block px-5 py-2 rounded-2xl bg-primary/10 text-primary text-sm font-semibold mb-5 animate-in fade-in zoom-in duration-500">
            Curated Marketplace
          </span>
          <h2 className="zen-h1 text-3xl sm:text-4xl lg:text-5xl text-foreground mb-5">
            Premium Pet Products
          </h2>
          <p className="zen-body-lg text-foreground/50 max-w-2xl mx-auto">
            Discover handpicked products from verified sellers. Quality nutrition, toys, and accessories for your beloved companions.
          </p>
        </div>

        {/* Category Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id as typeof category)}
              className={`p-5 lg:p-6 rounded-2xl border transition-all duration-500 flex flex-col items-center gap-3 ${category === cat.id
                ? 'bg-foreground border-foreground text-background shadow-2xl scale-[1.02]'
                : 'bg-white/70 backdrop-blur-sm border-foreground/5 text-foreground hover:border-primary/20 hover:shadow-lg hover:-translate-y-1'
                }`}
            >
              <div className={`p-3.5 rounded-2xl transition-all duration-300 ${category === cat.id ? 'bg-white/20' : 'bg-primary/10 text-primary'}`}>
                {cat.icon}
              </div>
              <span className="font-semibold text-sm lg:text-base">{cat.label}</span>
            </button>
          ))}
        </div>

        {/* Filters Bar */}
        <div className="bg-muted/30 backdrop-blur-md rounded-3xl p-4 lg:p-6 mb-8 border border-white/50 shadow-sm">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col lg:flex-row gap-4 items-center">
              {/* Pet Type Filter */}
              <div className="flex gap-2">
                {['all', 'dog', 'cat'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setPetType(type as typeof petType)}
                    className={`px-4 py-3 rounded-xl text-sm font-bold transition-all ${petType === type
                      ? 'bg-primary text-white shadow-md'
                      : 'bg-white/80 text-foreground/70 hover:bg-primary/10'
                      }`}
                  >
                    {type === 'all' ? 'All Pets' : type === 'dog' ? 'Dogs' : 'Cats'}
                  </button>
                ))}
              </div>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="px-4 py-3 rounded-xl border border-primary/20 focus:border-primary outline-none text-foreground bg-white/80 text-sm font-medium"
              >
                <option value="featured">Featured</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="rating">Highest Rated</option>
              </select>

              <button
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                className={`px-6 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${showFavoritesOnly
                  ? 'bg-pink-500 text-white shadow-md'
                  : 'bg-white/80 text-foreground/70 hover:bg-pink-50'
                  }`}
              >
                <svg className="w-5 h-5" fill={showFavoritesOnly ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                Favorites {favorites.length > 0 && `(${favorites.length})`}
              </button>
            </div>

            {/* Price Range Filter */}
            <div className="flex flex-col lg:flex-row gap-4 pt-2 border-t border-primary/10">
              <div className="flex-1">
                <label className="text-sm font-bold text-foreground/70 mb-2 block">
                  Price Range: ฿{priceRange[0]} - ฿{priceRange[1]}
                </label>
                <div className="flex gap-4 items-center">
                  <input
                    type="range"
                    min="0"
                    max="5000"
                    step="100"
                    value={priceRange[0]}
                    onChange={(e) => setPriceRange([parseInt(e.target.value), priceRange[1]])}
                    className="flex-1"
                  />
                  <input
                    type="range"
                    min="0"
                    max="5000"
                    step="100"
                    value={priceRange[1]}
                    onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-[#2C2C2C]/60">
            Showing <span className="font-semibold text-[#2C2C2C]">{filteredProducts.length}</span> products
          </p>
        </div>

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <div className="bg-[#F5F1E8] rounded-2xl p-12 text-center">
            <svg className="w-16 h-16 mx-auto text-[#8B9D83]/30 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <h3 className="text-xl font-semibold text-[#2C2C2C] mb-2">No products found</h3>
            <p className="text-[#2C2C2C]/60">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <div key={product.id} className="relative">
                <button
                  onClick={() => toggleFavorite(product.id)}
                  className="absolute top-4 right-4 z-10 p-2 bg-white rounded-full shadow-lg hover:scale-110 transition-transform"
                >
                  <svg className="w-5 h-5" fill={favorites.includes(product.id) ? '#ec4899' : 'none'} stroke={favorites.includes(product.id) ? '#ec4899' : 'currentColor'} viewBox="0 0 24 24">
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
        )}
      </div>
    </section>
  );
};

export default MarketplaceSection;
