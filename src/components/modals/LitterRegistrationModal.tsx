import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { createPet } from '@/lib/database';
import { supabase } from '@/lib/supabase';

interface LitterRegistrationModalProps {
    isOpen: boolean;
    onClose: () => void;
    sire: any; // Using any for flexibility with database types
    dam: any;
    matchDate: string;
}

export const LitterRegistrationModal: React.FC<LitterRegistrationModalProps> = ({
    isOpen,
    onClose,
    sire,
    dam,
}) => {
    const [puppyCount, setPuppyCount] = useState<number>(1);
    const [step, setStep] = useState<'count' | 'details'>('count');
    const [puppies, setPuppies] = useState<Array<{ name: string; gender: 'male' | 'female'; color: string; image: File | null; preview: string }>>([]);
    const [loading, setLoading] = useState(false);
    const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

    const handleNext = () => {
        // Initialize puppy array
        const newPuppies = Array(puppyCount).fill(null).map(() => ({
            name: '', // User can leave empty to auto-generate identifiers if we wanted, but let's ask for name
            gender: 'male' as const, // Default
            color: '',
            image: null,
            preview: ''
        }));
        setPuppies(newPuppies);
        setStep('details');
    };

    const handleUpdatePuppy = (index: number, field: string, value: any) => {
        const updated = [...puppies];
        updated[index] = { ...updated[index], [field]: value };
        setPuppies(updated);
    };

    const handleImageChange = (index: number, file: File) => {
        if (file) {
            const preview = URL.createObjectURL(file);
            const updated = [...puppies];
            updated[index] = { ...updated[index], image: file, preview };
            setPuppies(updated);
        }
    };

    const uploadImage = async (file: File): Promise<string | null> => {
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `puppies/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('pet-images')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from('pet-images').getPublicUrl(filePath);
            return data.publicUrl;
        } catch (e) {
            console.error('Upload failed', e);
            return null;
        }
    };

    const handleSaveAll = async () => {
        setLoading(true);
        try {
            const birthDate = new Date().toISOString().split('T')[0]; // Today

            for (let i = 0; i < puppies.length; i++) {
                setUploadingIndex(i);
                const p = puppies[i];

                let imageUrl = null;
                if (p.image) {
                    imageUrl = await uploadImage(p.image);
                }

                const name = p.name.trim() || `${sire?.breed || 'Puppy'} ${i + 1} of ${sire?.name || 'Sire'}`;

                await createPet({
                    name: name,
                    type: 'dog', // Assuming dog for now based on context
                    breed: sire?.breed || dam?.breed || 'Mixed',
                    gender: p.gender,
                    birth_date: birthDate,
                    color: p.color || undefined,
                    father_id: sire?.id,
                    mother_id: dam?.id,
                    image_url: imageUrl || undefined,
                    description: `Puppy from litter of ${sire?.name} x ${dam?.name}. Born on ${birthDate}.`,
                    location: sire?.location || 'Unknown'
                });
            }

            alert(`Success! ${puppies.length} puppies registered.`);
            onClose();
        } catch (e) {
            console.error(e);
            alert('Failed to register some puppies. Please check console.');
        } finally {
            setLoading(false);
            setUploadingIndex(null);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-3xl sm:max-h-[80vh] overflow-y-auto bg-white border-none shadow-2xl sm:rounded-[32px]">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black text-[#0d0c22]">Register Litter</DialogTitle>
                    <DialogDescription className="text-gray-500">
                        Add details for the new puppies from {sire?.name} x {dam?.name}.
                    </DialogDescription>
                </DialogHeader>

                {step === 'count' ? (
                    <div className="py-12 text-center space-y-8">
                        <div>
                            <span className="text-4xl block mb-4">🎉</span>
                            <h3 className="text-xl font-bold text-[#0d0c22]">How many puppies were born?</h3>
                        </div>
                        <div className="flex justify-center items-center gap-6">
                            <button
                                onClick={() => setPuppyCount(Math.max(1, puppyCount - 1))}
                                className="w-14 h-14 rounded-full border-2 border-gray-100 flex items-center justify-center text-2xl text-gray-400 hover:border-[#ea4c89] hover:text-[#ea4c89] transition-all"
                            >-</button>
                            <span className="text-6xl font-black text-[#0d0c22] w-24 tracking-tighter">{puppyCount}</span>
                            <button
                                onClick={() => setPuppyCount(puppyCount + 1)}
                                className="w-14 h-14 rounded-full bg-[#ea4c89] text-white flex items-center justify-center text-2xl hover:bg-pink-600 shadow-lg shadow-pink-200 transition-all"
                            >+</button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6 py-4">
                        <div className="grid gap-6 md:grid-cols-2">
                            {puppies.map((puppy, i) => (
                                <div key={i} className="p-5 rounded-2xl bg-white border border-gray-100 shadow-sm space-y-4 hover:shadow-md transition-shadow">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-bold text-[#0d0c22] text-sm uppercase tracking-wider">Puppy #{i + 1}</h4>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleUpdatePuppy(i, 'gender', 'male')}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${puppy.gender === 'male' ? 'bg-blue-500 text-white shadow-md shadow-blue-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                                            >Male</button>
                                            <button
                                                onClick={() => handleUpdatePuppy(i, 'gender', 'female')}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${puppy.gender === 'female' ? 'bg-pink-500 text-white shadow-md shadow-pink-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                                            >Female</button>
                                        </div>
                                    </div>

                                    <input
                                        placeholder="Puppy Name (Optional)"
                                        className="w-full bg-gray-50 border border-transparent rounded-xl px-4 py-3 text-sm text-[#0d0c22] placeholder-gray-400 focus:bg-white focus:border-[#ea4c89] outline-none transition-all font-medium"
                                        value={puppy.name}
                                        onChange={(e) => handleUpdatePuppy(i, 'name', e.target.value)}
                                    />

                                    <input
                                        placeholder="Color (e.g. Red, Black)"
                                        className="w-full bg-gray-50 border border-transparent rounded-xl px-4 py-3 text-sm text-[#0d0c22] placeholder-gray-400 focus:bg-white focus:border-[#ea4c89] outline-none transition-all font-medium"
                                        value={puppy.color}
                                        onChange={(e) => handleUpdatePuppy(i, 'color', e.target.value)}
                                    />

                                    <div className="relative">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            id={`file-${i}`}
                                            onChange={(e) => e.target.files && handleImageChange(i, e.target.files[0])}
                                        />
                                        <label htmlFor={`file-${i}`} className={`block w-full h-32 rounded-xl border-2 border-dashed ${puppy.preview ? 'border-transparent' : 'border-gray-200 hover:border-[#ea4c89] hover:bg-pink-50'} flex flex-col items-center justify-center cursor-pointer overflow-hidden transition-all bg-gray-50`}>
                                            {puppy.preview ? (
                                                <img src={puppy.preview} alt="Preview" className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-xs text-gray-400 font-bold">+ Add Photo</span>
                                            )}
                                        </label>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <DialogFooter className="mt-8 flex justify-between sm:justify-between w-full border-t border-gray-100 pt-6">
                    {step === 'details' ? (
                        <button
                            onClick={() => setStep('count')}
                            className="px-6 py-3 rounded-xl text-sm font-bold text-gray-500 hover:text-[#0d0c22] hover:bg-gray-50 transition-colors"
                        >Back</button>
                    ) : <div />}

                    {step === 'count' ? (
                        <button
                            onClick={handleNext}
                            className="px-8 py-3 rounded-full bg-[#0d0c22] text-white font-bold hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1"
                        >
                            Next Step →
                        </button>
                    ) : (
                        <button
                            onClick={handleSaveAll}
                            disabled={loading}
                            className="px-8 py-3 rounded-full bg-[#ea4c89] text-white font-bold hover:bg-pink-600 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 disabled:opacity-50 disabled:translate-y-0"
                        >
                            {loading ? (uploadingIndex !== null ? `Saving Puppy ${uploadingIndex + 1}...` : 'Saving...') : `Register ${puppyCount} Puppies`}
                        </button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
