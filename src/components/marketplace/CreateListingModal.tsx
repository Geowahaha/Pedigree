import React, { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { uploadPetImage } from '@/lib/storage'; // Reusing existing image upload util

interface CreateListingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const CATEGORIES = [
    { id: 'vehicles', label: 'Vehicles' },
    { id: 'property', label: 'Property' },
    { id: 'apparel', label: 'Apparel' },
    { id: 'electronics', label: 'Electronics' },
    { id: 'pet_supplies', label: 'Pet Supplies' },
    { id: 'family', label: 'Family' },
    { id: 'home', label: 'Home Goods' },
    { id: 'hobbies', label: 'Hobbies' },
    { id: 'gardening', label: 'Gardening' },
    { id: 'entertainment', label: 'Entertainment' },
    { id: 'free', label: 'Free Stuff' },
];

const CONDITION_TYPES = [
    { id: 'new', label: 'New' },
    { id: 'used_like_new', label: 'Used - Like New' },
    { id: 'used_good', label: 'Used - Good' },
    { id: 'used_fair', label: 'Used - Fair' },
];

const CreateListingModal: React.FC<CreateListingModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [images, setImages] = useState<string[]>([]);
    const [imageUploading, setImageUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [form, setForm] = useState({
        title: '',
        price: '',
        category: 'pet_supplies',
        condition: 'new',
        description: '',
        location: user?.user_metadata?.location || '',
    });

    if (!isOpen) return null;

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setImageUploading(true);
        try {
            const newImages: string[] = [];
            for (let i = 0; i < files.length; i++) {
                const url = await uploadPetImage(files[i]);
                newImages.push(url);
            }
            setImages(prev => [...prev, ...newImages]);
        } catch (error) {
            console.error('Upload failed:', error);
            alert('Failed to upload image');
        } finally {
            setImageUploading(false);
        }
    };

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setLoading(true);

        try {
            const { error } = await supabase.from('marketplace_listings').insert({
                title: form.title,
                price: parseFloat(form.price),
                category: form.category,
                condition: form.condition,
                description: form.description,
                location: form.location,
                images: images,
                seller_id: user.id,
                status: 'active'
            });

            if (error) throw error;
            onSuccess();
        } catch (error) {
            console.error('Error creating listing:', error);
            alert('Failed to create listing. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
                <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-xl font-bold text-center flex-1">Create New Listing</h2>
                    <button
                        onClick={onClose}
                        className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"
                    >
                        ✕
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
                    <form id="create-listing-form" onSubmit={handleSubmit} className="space-y-6">
                        {/* Image Upload */}
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-gray-700">Photos • {images.length}/10</label>
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                {images.map((img, idx) => (
                                    <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border">
                                        <img src={img} alt="" className="w-full h-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => removeImage(idx)}
                                            className="absolute top-1 right-1 w-6 h-6 bg-black/50 text-white rounded-full flex items-center justify-center text-xs hover:bg-black/70"
                                        >✕</button>
                                    </div>
                                ))}
                                {images.length < 10 && (
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={imageUploading}
                                        className="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-500 hover:bg-gray-50 hover:border-gray-400 transition-colors"
                                    >
                                        <span className="text-2xl mb-1">{imageUploading ? '⏳' : '📷'}</span>
                                        <span className="text-xs font-medium">{imageUploading ? 'Uploading...' : 'Add Photo'}</span>
                                    </button>
                                )}
                            </div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleImageUpload}
                                accept="image/*"
                                multiple
                                className="hidden"
                            />
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Title</label>
                                <input
                                    required
                                    type="text"
                                    value={form.title}
                                    onChange={e => setForm({ ...form, title: e.target.value })}
                                    className="w-full h-12 px-4 rounded-lg bg-gray-100 border-none outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="What are you selling?"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Price</label>
                                <input
                                    required
                                    type="number"
                                    value={form.price}
                                    onChange={e => setForm({ ...form, price: e.target.value })}
                                    className="w-full h-12 px-4 rounded-lg bg-gray-100 border-none outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="0.00"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Category</label>
                                    <select
                                        value={form.category}
                                        onChange={e => setForm({ ...form, category: e.target.value })}
                                        className="w-full h-12 px-4 rounded-lg bg-gray-100 border-none outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                                    >
                                        {CATEGORIES.map(c => (
                                            <option key={c.id} value={c.id}>{c.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Condition</label>
                                    <select
                                        value={form.condition}
                                        onChange={e => setForm({ ...form, condition: e.target.value })}
                                        className="w-full h-12 px-4 rounded-lg bg-gray-100 border-none outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                                    >
                                        {CONDITION_TYPES.map(c => (
                                            <option key={c.id} value={c.id}>{c.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Description</label>
                                <textarea
                                    required
                                    rows={4}
                                    value={form.description}
                                    onChange={e => setForm({ ...form, description: e.target.value })}
                                    className="w-full p-4 rounded-lg bg-gray-100 border-none outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                    placeholder="Describe your item..."
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Location</label>
                                <input
                                    required
                                    type="text"
                                    value={form.location}
                                    onChange={e => setForm({ ...form, location: e.target.value })}
                                    className="w-full h-12 px-4 rounded-lg bg-gray-100 border-none outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="City, Neighborhood, or Zip Code"
                                />
                            </div>
                        </div>
                    </form>
                </div>

                <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2.5 rounded-lg font-semibold text-gray-600 hover:bg-gray-200"
                    >
                        Cancel
                    </button>
                    <button
                        form="create-listing-form"
                        type="submit"
                        disabled={loading || imageUploading}
                        className="px-8 py-2.5 rounded-lg bg-[#1877F2] text-white font-semibold hover:bg-[#166FE5] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Publishing...' : 'Publish'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateListingModal;
