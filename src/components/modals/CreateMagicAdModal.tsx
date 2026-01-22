import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Pet } from '@/data/petData';
import SmartImage from '@/components/ui/SmartImage';
import { supabase } from '@/lib/supabase';
import { MarketplaceListing } from '../marketplace/MarketplaceFeed';
import { Loader2, Upload, Plus } from 'lucide-react';

interface CreateMagicAdModalProps {
    isOpen: boolean;
    onClose: () => void;
    userPets: Pet[];
    onAdGenerated?: (adData: any) => void;
}

const CreateMagicAdModal: React.FC<CreateMagicAdModalProps> = ({ isOpen, onClose, userPets, onAdGenerated }) => {
    const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
    const [selectedProduct, setSelectedProduct] = useState<MarketplaceListing | null>(null);
    const [products, setProducts] = useState<MarketplaceListing[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);

    // Selecting Mode
    const [isSelectingPet, setIsSelectingPet] = useState(false);
    const [isSelectingProduct, setIsSelectingProduct] = useState(false);

    useEffect(() => {
        if (isOpen) fetchProducts();
    }, [isOpen]);

    const fetchProducts = async () => {
        const { data } = await supabase.from('marketplace_listings').select('*').limit(20);
        if (data) setProducts(data);
    };

    const handleGenerate = async () => {
        if (!selectedPet || !selectedProduct) return;
        setIsGenerating(true);

        // Mock Generation
        setTimeout(() => {
            const mockUrl = "https://replicate.delivery/pbxt/MockVideoResult.mp4";
            setResultVideoUrl(mockUrl); // Set content for the Result Popup
            const mockResult = {
                id: Math.random().toString(),
                pet: selectedPet,
                product: selectedProduct,
                videoUrl: mockUrl,
                timestamp: new Date().toISOString()
            };

            // Auto-Post / Callback (but we stay open)
            if (onAdGenerated) onAdGenerated(mockResult);

            setIsGenerating(false);
            // onClose(); // <-- REMOVED auto-close. Result Popup rendered by returned logic.
        }, 3000);
    };

    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = resultVideoUrl || "";
        link.download = `MagicAd-${selectedPet?.name}.mp4`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Mock: Auto-add to "My Pets"
            const newPet: Pet = {
                id: `new-${Date.now()}`,
                name: "New Pet", // Prompt for name in real app
                breed: "Unknown",
                type: "dog",
                gender: "male",
                image: URL.createObjectURL(file),
                location: "Bangkok",
                owner_id: "current-user",
            };
            // In real app: await uploadToSupabase(file) -> await insertPet(newPet)
            setSelectedPet(newPet);
            setIsSelectingPet(false);
        }
    };

    // Sub-Screen: Pet Selector
    if (isSelectingPet) {
        return (
            <Dialog open={isOpen} onOpenChange={() => setIsSelectingPet(false)}>
                <DialogContent className="max-w-2xl bg-[#0D0D0D] text-white border-purple-500/20 h-[80vh] flex flex-col">
                    <DialogHeader><DialogTitle>Select Your Star</DialogTitle></DialogHeader>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 overflow-y-auto flex-1 p-1">
                        <label className="aspect-square rounded-xl border-2 border-dashed border-white/20 flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-colors">
                            <Upload className="mb-2 text-purple-400" />
                            <span className="text-xs text-center text-gray-400">Upload New</span>
                            <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                        </label>
                        {userPets.map(pet => (
                            <div key={pet.id} onClick={() => { setSelectedPet(pet); setIsSelectingPet(false); }}
                                className="aspect-square rounded-xl overflow-hidden cursor-pointer border-2 border-white/10 hover:border-purple-500 relative group">
                                <SmartImage src={pet.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                                <div className="absolute bottom-0 inset-x-0 bg-black/60 p-1 text-xs truncate text-center">{pet.name}</div>
                            </div>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    // Sub-Screen: Product Selector
    if (isSelectingProduct) {
        return (
            <Dialog open={isOpen} onOpenChange={() => setIsSelectingProduct(false)}>
                <DialogContent className="max-w-2xl bg-[#0D0D0D] text-white border-purple-500/20 h-[80vh] flex flex-col">
                    <DialogHeader><DialogTitle>Select Product</DialogTitle></DialogHeader>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 overflow-y-auto flex-1 p-1">
                        {products.map(prod => (
                            <div key={prod.id} onClick={() => { setSelectedProduct(prod); setIsSelectingProduct(false); }}
                                className="p-3 rounded-xl border border-white/10 bg-white/5 hover:border-purple-500 cursor-pointer flex flex-col gap-2">
                                <div className="aspect-square bg-white rounded-lg overflow-hidden">
                                    {prod.image_url ? <img src={prod.image_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl">📦</div>}
                                </div>
                                <div className="text-xs font-bold line-clamp-1">{prod.title}</div>
                                <div className="text-[10px] text-green-400 font-bold">+50 TRD Reward</div>
                            </div>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    // Sub-Screen: Result View (Floating Popup)
    if (resultVideoUrl) {
        return (
            <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
                <DialogContent className="sm:max-w-md bg-transparent border-none shadow-none p-0 flex flex-col items-center justify-center focus:outline-none">
                    {/* Floating Card */}
                    <div className="bg-[#0D0D0D] border border-purple-500/50 rounded-3xl overflow-hidden shadow-2xl shadow-purple-500/20 w-full relative animate-in zoom-in-95 duration-300">
                        {/* Success Badge */}
                        <div className="absolute top-4 right-4 z-20 bg-green-500/90 text-black text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-lg animate-bounce">
                            <span>🚀</span> Posted to Feed
                        </div>

                        {/* Video */}
                        <div className="aspect-[9/16] w-full bg-black relative">
                            {/* In a real app we would play the video here */}
                            <video
                                src={resultVideoUrl}
                                className="w-full h-full object-cover"
                                autoPlay
                                loop
                                muted
                                playsInline
                            />
                            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-6 pt-20 text-center">
                                <h3 className="text-2xl font-bold text-white mb-1">✨ Magic Ad Ready!</h3>
                                <p className="text-gray-300 text-sm">Everyone is watching {selectedPet?.name}!</p>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="p-4 bg-[#1A1A1A] flex gap-3">
                            <button onClick={handleDownload} className="flex-1 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors">
                                <Upload className="rotate-180" size={18} /> Download
                            </button>
                            <button className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-purple-600/20">
                                <span>🔗</span> Share Link
                            </button>
                        </div>

                        <button onClick={onClose} className="absolute top-4 left-4 z-20 bg-black/50 hover:bg-black/70 p-2 rounded-full text-white/70 hover:text-white transition-colors">
                            ✕
                        </button>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    // Main Dashboard
    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-3xl bg-[#0D0D0D] border border-purple-500/20 text-white p-0 overflow-hidden shadow-2xl">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

                <div className="p-8 flex flex-col items-center">
                    <DialogHeader className="mb-8 text-center">
                        <DialogTitle className="text-3xl font-bold flex items-center justify-center gap-3">
                            <span className="text-4xl">✨</span>
                            <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                                Magic Ad Creator
                            </span>
                        </DialogTitle>
                        <p className="text-gray-400 mt-2">Create viral ads in one click. Auto-posts to feed.</p>
                    </DialogHeader>

                    {/* Split View */}
                    <div className="flex flex-col sm:flex-row gap-6 w-full mb-8">
                        {/* Left: Pet */}
                        <div
                            onClick={() => setIsSelectingPet(true)}
                            className={`flex-1 aspect-[4/5] sm:aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all group relative overflow-hidden ${selectedPet ? 'border-purple-500 bg-purple-500/10' : 'border-white/20 hover:border-white/40 hover:bg-white/5'}`}
                        >
                            {selectedPet ? (
                                <>
                                    <SmartImage src={selectedPet.image} className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-70 transition-opacity" />
                                    <div className="relative z-10 text-center">
                                        <div className="text-2xl font-bold drop-shadow-lg">{selectedPet.name}</div>
                                        <div className="text-xs text-purple-200 uppercase tracking-widest mt-1">Star</div>
                                    </div>
                                    <div className="absolute bottom-3 right-3 bg-black/50 p-2 rounded-full hover:bg-black/70"><Upload size={14} /></div>
                                </>
                            ) : (
                                <>
                                    <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                        <span className="text-3xl">🐶</span>
                                    </div>
                                    <span className="font-bold text-lg">Select Pet</span>
                                    <span className="text-xs text-gray-500 mt-1">or upload new photo</span>
                                </>
                            )}
                        </div>

                        {/* Center: Plus Icon */}
                        <div className="hidden sm:flex items-center justify-center">
                            <Plus className="text-white/20" size={32} />
                        </div>

                        {/* Right: Product */}
                        <div
                            onClick={() => setIsSelectingProduct(true)}
                            className={`flex-1 aspect-[4/5] sm:aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all group relative overflow-hidden ${selectedProduct ? 'border-pink-500 bg-pink-500/10' : 'border-white/20 hover:border-white/40 hover:bg-white/5'}`}
                        >
                            {selectedProduct ? (
                                <>
                                    {selectedProduct.image_url && <img src={selectedProduct.image_url} className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-70 transition-opacity" />}
                                    <div className="relative z-10 text-center px-4">
                                        <div className="text-xl font-bold drop-shadow-lg line-clamp-2">{selectedProduct.title}</div>
                                        <div className="text-xs text-pink-200 uppercase tracking-widest mt-1">Product</div>
                                    </div>
                                    <div className="absolute bottom-3 right-3 bg-black/50 p-2 rounded-full hover:bg-black/70"><Upload size={14} /></div>
                                </>
                            ) : (
                                <>
                                    <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                        <span className="text-3xl">📦</span>
                                    </div>
                                    <span className="font-bold text-lg">Select Product</span>
                                    <span className="text-xs text-gray-500 mt-1">to promote</span>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Generate Button */}
                    <button
                        disabled={!selectedPet || !selectedProduct || isGenerating}
                        onClick={handleGenerate}
                        className="w-full sm:w-auto px-12 py-4 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full font-bold text-lg shadow-lg hover:shadow-purple-500/25 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-3"
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 className="animate-spin" />
                                Creating Magic...
                            </>
                        ) : (
                            <>
                                <span>✨</span> Generate Magic Ad
                            </>
                        )}
                    </button>

                    {isGenerating && <p className="text-xs text-gray-500 mt-4 animate-pulse">AI is dreaming up your video...</p>}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default CreateMagicAdModal;
