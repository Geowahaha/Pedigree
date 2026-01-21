import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import ListingCard from './ListingCard';
import CreateListingModal from './CreateListingModal';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

export interface MarketplaceListing {
    id: string;
    title: string;
    description: string;
    price: number;
    currency: string;
    category: string;
    condition: string;
    images: string[];
    location: string;
    seller_id: string;
    status: 'active' | 'sold' | 'pending' | 'archived';
    created_at: string;
    seller?: {
        full_name: string;
        avatar_url: string;
    };
}

const CATEGORIES = [
    { id: 'all', label: 'All', icon: '🏪' },
    { id: 'vehicles', label: 'Vehicles', icon: '🚗' },
    { id: 'property', label: 'Property', icon: '🏠' },
    { id: 'apparel', label: 'Apparel', icon: '👕' },
    { id: 'electronics', label: 'Electronics', icon: '📱' },
    { id: 'pet_supplies', label: 'Pet Supplies', icon: '🐾' },
    { id: 'family', label: 'Family', icon: '👨‍👩‍👧' },
    { id: 'home', label: 'Home Goods', icon: '🛋️' },
    { id: 'hobbies', label: 'Hobbies', icon: '🎨' },
    { id: 'gardening', label: 'Gardening', icon: '🌱' },
    { id: 'entertainment', label: 'Entertainment', icon: '🎮' },
    { id: 'free', label: 'Free Stuff', icon: '🎁' },
];

const MarketplaceFeed: React.FC = () => {
    const { user } = useAuth();
    const { t } = useLanguage();
    const [listings, setListings] = useState<MarketplaceListing[]>([]);
    const [loading, setLoading] = useState(true);
    const [category, setCategory] = useState('all');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchListings();
    }, [category]);

    const fetchListings = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('marketplace_listings')
                .select('*, seller:seller_id(full_name, avatar_url)')
                .eq('status', 'active')
                .order('created_at', { ascending: false });

            if (category !== 'all') {
                query = query.eq('category', category);
            }

            const { data, error } = await query;

            if (error) throw error;
            setListings(data || []);
        } catch (error) {
            console.error('Error fetching listings:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        // Implement client-side filtering or DB search
        // For simplicity, client-side first
    };

    const filteredListings = listings.filter(item =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.location?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex h-full min-h-screen bg-[#F0F2F5]">
            {/* Sidebar - Desktop */}
            <aside className="hidden lg:flex w-[360px] flex-col p-4 fixed top-20 bottom-0 overflow-y-auto border-r border-gray-200 bg-white z-10">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-[#050505]">Marketplace</h2>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                    >
                        <span className="text-xl">➕</span>
                    </button>
                </div>

                <div className="relative mb-6">
                    <input
                        type="text"
                        placeholder="Search Marketplace"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-10 rounded-full bg-[#F0F2F5] px-10 text-[15px] outline-none focus:ring-1 focus:ring-[#1877F2]"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">🔍</span>
                </div>

                <div className="space-y-1">
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="w-full flex items-center gap-3 px-2 py-3 rounded-lg bg-[#EBF5FF] text-[#0064D1] font-semibold hover:bg-[#E1F0FF] transition-colors text-left"
                    >
                        <span className="w-9 h-9 rounded-full bg-[#1877F2] text-white flex items-center justify-center text-xl">+</span>
                        Create New Listing
                    </button>

                    <div className="pt-4 pb-2">
                        <h3 className="text-[17px] font-semibold text-[#050505] px-2">Categories</h3>
                    </div>

                    {CATEGORIES.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setCategory(cat.id)}
                            className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg transition-colors text-left group ${category === cat.id ? 'bg-[#F0F2F5]' : 'hover:bg-[#F2F2F2]'}`}
                        >
                            <span className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-lg">{cat.icon}</span>
                            <span className="text-[15px] font-medium text-[#050505]">{cat.label}</span>
                        </button>
                    ))}
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 lg:pl-[360px] w-full">
                <div className="p-4 md:p-8 max-w-[1600px] mx-auto">
                    {/* Header - Mobile */}
                    <div className="lg:hidden mb-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-2xl font-bold text-[#050505]">Marketplace</h2>
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="px-4 py-2 bg-[#EBF5FF] text-[#0064D1] rounded-full font-semibold text-sm"
                            >
                                Sell
                            </button>
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                            {CATEGORIES.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => setCategory(cat.id)}
                                    className={`flex-shrink-0 px-4 py-2 rounded-full font-semibold text-sm whitespace-nowrap ${category === cat.id ? 'bg-[#1877F2] text-white' : 'bg-[#E4E6EB] text-[#050505]'}`}
                                >
                                    {cat.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-bold text-[#050505]">{category === 'all' ? "Today's Picks" : CATEGORIES.find(c => c.id === category)?.label}</h3>
                        <span className="text-sm text-gray-500">{listings.length} miles • {user?.user_metadata?.location || 'Bangkok'}</span>
                    </div>

                    {loading ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                                <div key={i} className="aspect-square bg-gray-200 rounded-lg animate-pulse"></div>
                            ))}
                        </div>
                    ) : (
                        listings.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                                {filteredListings.map(item => (
                                    <ListingCard key={item.id} listing={item} />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-20">
                                <span className="text-6xl block mb-4">🏪</span>
                                <h3 className="text-xl font-bold text-gray-800">No items found</h3>
                                <p className="text-gray-500 mt-2">Be the first to list something in this category!</p>
                                <button
                                    onClick={() => setShowCreateModal(true)}
                                    className="mt-6 px-6 py-3 bg-[#1877F2] text-white rounded-lg font-semibold hover:bg-[#166FE5]"
                                >
                                    Create New Listing
                                </button>
                            </div>
                        )
                    )}
                </div>
            </main>

            <CreateListingModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onSuccess={() => {
                    fetchListings();
                    setShowCreateModal(false);
                }}
            />
        </div>
    );
};

export default MarketplaceFeed;
