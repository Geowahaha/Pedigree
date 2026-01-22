import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Pet } from '@/data/petData';
import SmartImage from '@/components/ui/SmartImage';
import { supabase } from '@/lib/supabase';
import { MarketplaceListing } from '../marketplace/MarketplaceFeed';

interface CreateMagicAdModalProps {
    isOpen: boolean;
    onClose: () => void;
    userPets: Pet[];
}

const CreateMagicAdModal: React.FC<CreateMagicAdModalProps> = ({ isOpen, onClose, userPets }) => {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
    const [uploadedImage, setUploadedImage] = useState<string | null>(null); // Kept as it was in original, not explicitly removed
    const [selectedProduct, setSelectedProduct] = useState<MarketplaceListing | null>(null);
    const [products, setProducts] = useState<MarketplaceListing[]>([]);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [resultVideoUrl, setResultVideoUrl] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        if (isOpen && step === 2) {
            fetchProducts();
        }
    }, [isOpen, step]);

    const fetchProducts = async () => {
        setLoadingProducts(true);
        const { data, error } = await supabase
            .from('marketplace_listings')
            .select('*')
            .limit(20);

        if (data) {
            setProducts(data);
        }
        if (error) {
            console.error("Error fetching marketplace listings:", error);
        }
        setLoadingProducts(false);
    };

    const handleGenerate = async () => {
        setIsGenerating(true);
        setStep(3);

        // TODO: Call actual Replicate API (via Edge Function)
        // For now, mock success after 4 seconds
        setTimeout(() => {
            setResultVideoUrl("https://replicate.delivery/pbxt/MockVideoResult.mp4");
            setIsGenerating(false);
        }, 4000);
    };

    // Filter pets based on search
    const filteredPets = userPets.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.breed?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-2xl bg-[#0D0D0D] border border-purple-500/20 text-white p-0 overflow-hidden h-[80vh] sm:h-auto flex flex-col">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

                <div className="p-6 flex-1 overflow-y-auto">
                    <DialogHeader className="mb-6">
                        <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                            <span className="text-3xl">✨</span>
                            <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                                Magic Ad Creator
                            </span>
                        </DialogTitle>
                        <p className="text-gray-400 text-sm">
                            Turn '{selectedPet?.name || 'your pet'}' into a superstar.
                        </p>
                    </DialogHeader>

                    {/* Step 1: Select Pet */}
                    {step === 1 && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-sm font-bold uppercase tracking-wider text-purple-400">1. Choose your Star</h3>
                                <input
                                    type="text"
                                    placeholder="Search pets..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-xs focus:border-purple-500 outline-none w-40"
                                />
                            </div>

                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                                {filteredPets.map(pet => (
                                    <div
                                        key={pet.id}
                                        className={`relative aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${selectedPet?.id === pet.id ? 'border-purple-500 ring-2 ring-purple-500/30' : 'border-white/10 hover:border-white/30'}`}
                                        onClick={() => setSelectedPet(pet)}
                                    >
                                        <SmartImage src={pet.image} className="w-full h-full object-cover" />
                                        <div className="absolute bottom-0 inset-x-0 bg-black/60 p-2 text-xs font-bold truncate">
                                            {pet.name}
                                        </div>
                                    </div>
                                ))}
                                {/* Upload Option */}
                                <div className="aspect-square rounded-xl border-2 border-dashed border-white/20 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 hover:border-purple-500/50 transition-colors">
                                    <span className="text-2xl mb-2">📸</span>
                                    <span className="text-xs text-center text-gray-400 px-2">Upload Photo</span>
                                </div>
                            </div>

                            <button
                                disabled={!selectedPet && !uploadedImage}
                                onClick={() => setStep(2)}
                                className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-bold mt-4 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                            >
                                Next: Choose Product
                            </button>
                        </div>
                    )}

                    {/* Step 2: Select Product */}
                    {step === 2 && (
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-purple-400">2. Choose Product to Promote</h3>

                            {loadingProducts ? (
                                <div className="py-10 text-center text-gray-400">Loading products...</div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto pr-1">
                                    {products.map((prod) => (
                                        <div
                                            key={prod.id}
                                            className={`p-3 rounded-xl border bg-white/5 cursor-pointer transition-all flex flex-col ${selectedProduct?.id === prod.id ? 'border-purple-500 bg-purple-500/10' : 'border-white/10 hover:border-white/20'}`}
                                            onClick={() => setSelectedProduct(prod)}
                                        >
                                            <div className="aspect-square bg-white rounded-lg mb-2 overflow-hidden relative">
                                                {prod.image_url ? (
                                                    <img src={prod.image_url} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-2xl bg-gray-800">📦</div>
                                                )}
                                                {selectedProduct?.id === prod.id && (
                                                    <div className="absolute inset-0 bg-purple-500/20 flex items-center justify-center">
                                                        <div className="bg-purple-500 text-white rounded-full p-1">
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <p className="text-xs font-bold text-gray-200 line-clamp-2 mb-1">{prod.title}</p>
                                            <div className="mt-auto flex justify-between items-center">
                                                <span className="text-[10px] text-gray-400">฿{prod.price}</span>
                                                <span className="text-[10px] text-green-400 font-bold">+50 TRD</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="flex gap-3 mt-4 pt-4 border-t border-white/10">
                                <button onClick={() => setStep(1)} className="px-4 py-3 bg-white/10 rounded-xl text-sm font-bold hover:bg-white/20">Back</button>
                                <button
                                    disabled={!selectedProduct}
                                    onClick={handleGenerate}
                                    className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-bold disabled:opacity-50 hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                                >
                                    <span>🎥</span> Generate Magic Ad
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Generating / Result */}
                    {step === 3 && (
                        <div className="text-center py-10 flex flex-col items-center justify-center h-full">
                            {isGenerating ? (
                                <div className="flex flex-col items-center">
                                    <div className="relative w-24 h-24 mb-8">
                                        <div className="absolute inset-0 border-4 border-purple-500/30 rounded-full"></div>
                                        <div className="absolute inset-0 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <span className="text-2xl animate-bounce">✨</span>
                                        </div>
                                    </div>
                                    <h3 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent animate-pulse mb-2">
                                        Creating Magic...
                                    </h3>
                                    <p className="text-gray-400 text-sm max-w-xs mx-auto">
                                        AI is analyzing <b>{selectedPet?.name}</b> and animating them with <b>{selectedProduct?.title}</b>...
                                    </p>
                                    <div className="mt-8 text-xs text-gray-500">Estimated time: ~2 minutes</div>
                                </div>
                            ) : (
                                <div className="space-y-6 w-full max-w-md">
                                    <h3 className="text-2xl font-bold text-white">Your Ad is Ready! 🎉</h3>
                                    <div className="aspect-video bg-black rounded-xl overflow-hidden relative group shadow-2xl shadow-purple-500/20 border border-purple-500/30">
                                        {/* Placeholder Video Result */}
                                        <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                                            {/* In real app, use <video> here */}
                                            <span className="text-6xl">▶️</span>
                                        </div>
                                        <p className="absolute bottom-4 left-0 right-0 text-center text-xs text-white/70">Mock Video Result</p>
                                    </div>

                                    <div className="flex gap-3">
                                        <button className="flex-1 py-3 bg-gray-800 rounded-xl text-sm font-bold hover:bg-gray-700 transition-colors">Download</button>
                                        <button className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl text-sm font-bold hover:shadow-lg shadow-green-500/20 transition-all flex items-center justify-center gap-2">
                                            <span>🚀</span> Post (+100 TRD)
                                        </button>
                                    </div>
                                    <button onClick={() => setStep(1)} className="text-xs text-gray-500 underline hover:text-white">Create Another</button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default CreateMagicAdModal;
