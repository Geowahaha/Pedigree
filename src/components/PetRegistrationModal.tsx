/**
 * PetRegistrationModal - Dark Luxury Theme (Black & Gold)
 * 
 * OCR-powered pet registration with:
 * - Image scanning & auto-fill
 * - Manual form entry
 * - Parent selection dropdowns
 */

import React, { useState, useRef, useEffect } from 'react';
import { createWorker } from 'tesseract.js';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addPetPhoto, createPet, createNotification, getPublicPets, Pet } from '@/lib/database';
import { uploadPetImage } from '@/lib/storage';

interface PetRegistrationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const PetRegistrationModal: React.FC<PetRegistrationModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [step, setStep] = useState(1);
    const [image, setImage] = useState<string | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [status, setStatus] = useState<'idle' | 'processing' | 'uploading' | 'saving'>('idle');
    const processing = status !== 'idle';
    const [progress, setProgress] = useState(0);

    const [profileImage, setProfileImage] = useState<File | null>(null);
    const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);
    const [availablePets, setAvailablePets] = useState<any[]>([]);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const profileInputRef = useRef<HTMLInputElement>(null);
    const galleryInputRef = useRef<HTMLInputElement>(null);

    const [galleryItems, setGalleryItems] = useState<{ file: File; preview: string }[]>([]);
    const [videoUrl, setVideoUrl] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        breed: '',
        type: 'dog' as 'dog' | 'cat',
        gender: 'male' as 'male' | 'female',
        birthDate: '',
        color: '',
        registrationNumber: '',
        sireId: '',
        damId: '',
    });
    const [ownerName, setOwnerName] = useState('');

    useEffect(() => {
        if (isOpen) {
            getPublicPets().then(pets => {
                setAvailablePets(pets);
            }).catch(console.error);
        }
    }, [isOpen]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
            setImage(URL.createObjectURL(file));
        }
    };

    const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setProfileImage(file);
            setProfileImagePreview(URL.createObjectURL(file));
        }
    };

    const handleGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (!files.length) return;
        const nextItems = files.map((file) => ({
            file,
            preview: URL.createObjectURL(file),
        }));
        setGalleryItems(prev => [...prev, ...nextItems]);
        e.target.value = '';
    };

    const handleRemoveGalleryItem = (index: number) => {
        setGalleryItems(prev => {
            const next = [...prev];
            const [removed] = next.splice(index, 1);
            if (removed) {
                URL.revokeObjectURL(removed.preview);
            }
            return next;
        });
    };

    const preprocessImage = (imageFile: File): Promise<string> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = URL.createObjectURL(imageFile);
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d')!;
                canvas.width = img.width * 1.5;
                canvas.height = img.height * 1.5;
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                for (let i = 0; i < data.length; i += 4) {
                    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
                    const threshold = 160;
                    const color = avg > threshold ? 255 : 0;
                    data[i] = color;
                    data[i + 1] = color;
                    data[i + 2] = color;
                }
                ctx.putImageData(imageData, 0, 0);
                resolve(canvas.toDataURL('image/jpeg'));
            };
        });
    };

    const processImage = async () => {
        if (!imageFile) return;
        setStatus('processing');
        setProgress(0);
        setFormData({
            name: '', breed: '', type: 'dog', gender: 'male',
            birthDate: '', color: '', registrationNumber: '',
            sireId: '', damId: '',
        });
        setOwnerName('');

        try {
            setProgress(10);
            const processedImageSrc = await preprocessImage(imageFile);
            const worker = await createWorker('eng', 1, {
                logger: m => {
                    if (m.status === 'recognizing text') {
                        setProgress(10 + Math.floor(m.progress * 90));
                    }
                }
            });
            const { data: { text } } = await worker.recognize(processedImageSrc);
            await worker.terminate();
            parseOCRText(text);
            setStep(2);
        } catch (error) {
            console.error("OCR Error:", error);
            alert("Could not process image. Please fill details manually.");
            setStep(2);
        } finally {
            setStatus('idle');
        }
    };

    const parseOCRText = (text: string) => {
        const update: any = {};
        const cleanText = (str: string) => str.replace(/[:]/g, '').replace(/\s+/g, ' ').trim();
        const nameMatch = text.match(/(?:Name|Registered Name|NAME)[:\s.]+(.*?)(?=\s*(?:Breed|BREED|Date|DATE|Sex|SEX))/i);
        if (nameMatch?.[1]) update.name = cleanText(nameMatch[1]);
        const breedMatch = text.match(/(?:Breed|BREED)[:\s.]+(.*?)(?=\s*(?:Date|DATE|Sex|SEX|Color|COLOR))/i);
        if (breedMatch?.[1]) update.breed = cleanText(breedMatch[1]);
        else if (text.match(/RIDGEBACK/i)) update.breed = "Thai Ridgeback Dog";
        if (text.match(/\b(Female|Bitch)\b/i)) update.gender = 'female';
        else if (text.match(/\b(Male|Dog)\b/i)) update.gender = 'male';
        const colorMatch = text.match(/(?:Color|Colour)[:\s.]+(.*?)(?=\s*(?:Microchip|Sex|Reg))/i);
        if (colorMatch?.[1]) update.color = cleanText(colorMatch[1]);
        const kcthMatch = text.match(/(KCTH\s*[A-Z0-9]+)/i);
        if (kcthMatch?.[1]) update.registrationNumber = cleanText(kcthMatch[1]);
        const ownerMatch = text.match(/(?:Owner|OWNER)[:\s.]+(.*?)(?=\n|$)/i);
        if (ownerMatch?.[1]) setOwnerName(cleanText(ownerMatch[1]));
        setFormData(prev => ({ ...prev, ...update }));
    };

    const resolveBirthDateValue = (value?: string | null) => {
        if (!value) return null;
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) return null;
        return parsed;
    };

    const getParentAgeWarning = (parent: any, label: string) => {
        if (!parent) return null;
        if (!formData.birthDate) {
            return `${label} selected. Add the pet birth date to validate lineage.`;
        }
        const parentBirth = parent.birth_date || parent.birthday || parent.birthDate;
        const parentDate = resolveBirthDateValue(parentBirth);
        if (!parentDate) {
            return `${label} birth date is missing.`;
        }
        const childDate = resolveBirthDateValue(formData.birthDate);
        if (!childDate) return null;
        const diffDays = (childDate.getTime() - parentDate.getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays < 0) {
            return `${label} birth date is after the child.`;
        }
        if (diffDays < 365) {
            return `${label} should be at least 1 year older than the child.`;
        }
        return null;
    };

    const selectedSire = availablePets.find(p => p.id === formData.sireId);
    const selectedDam = availablePets.find(p => p.id === formData.damId);
    const sireAgeWarning = getParentAgeWarning(selectedSire, 'Sire');
    const damAgeWarning = getParentAgeWarning(selectedDam, 'Dam');

    const handleSubmit = async () => {
        if (!formData.name || !formData.breed) {
            alert("Please fill in Name and Breed.");
            return;
        }
        setStatus('uploading');
        try {
            let finalImageUrl = null;
            let coverFromGalleryIndex = -1;
            const trimmedVideoUrl = videoUrl.trim();
            if (profileImage) {
                finalImageUrl = await uploadPetImage(profileImage);
            } else if (imageFile) {
                finalImageUrl = await uploadPetImage(imageFile);
            } else if (galleryItems[0]) {
                finalImageUrl = await uploadPetImage(galleryItems[0].file);
                coverFromGalleryIndex = 0;
            }
            let desc = `Registered via OCR.`;
            if (ownerName) desc += `\nOwner: ${ownerName}`;
            setStatus('saving');

            const newPet = await createPet({
                name: formData.name,
                type: formData.type,
                breed: formData.breed,
                gender: formData.gender,
                birth_date: formData.birthDate || null,
                color: formData.color,
                registration_number: formData.registrationNumber,
                image_url: finalImageUrl,
                description: desc,
                father_id: (formData.sireId && formData.sireId !== 'unknown') ? formData.sireId : undefined,
                mother_id: (formData.damId && formData.damId !== 'unknown') ? formData.damId : undefined,
                media_type: trimmedVideoUrl ? 'video' : 'image',
                video_url: trimmedVideoUrl || undefined,
            });

            if (galleryItems.length > 0) {
                for (let index = 0; index < galleryItems.length; index += 1) {
                    const item = galleryItems[index];
                    const url = (index === coverFromGalleryIndex && finalImageUrl)
                        ? finalImageUrl
                        : await uploadPetImage(item.file);
                    await addPetPhoto({
                        pet_id: newPet.id,
                        image_url: url,
                        caption: item.file.name,
                    });
                }
            }

            await createNotification({
                type: 'new_pet',
                title: 'New Pet Registered via App',
                message: `${newPet.name} (${newPet.breed}) added by user.`,
                reference_id: newPet.id
            });

            galleryItems.forEach(item => URL.revokeObjectURL(item.preview));
            setGalleryItems([]);
            setVideoUrl('');
            onSuccess();
            onClose();
        } catch (error) {
            console.error("Submission error:", error);
            alert(`Failed to register pet: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setStatus('idle');
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md bg-[#1A1A1A] sm:rounded-2xl p-0 overflow-hidden border-0 sm:border sm:border-[#C5A059]/20">
                {/* Header */}
                <div className="p-6 bg-[#0D0D0D] border-b border-[#C5A059]/10">
                    <DialogHeader>
                        <DialogTitle className="font-['Playfair_Display'] text-2xl text-[#F5F5F0]">
                            Register Your Pet
                        </DialogTitle>
                        <p className="text-[#C5A059]/60 text-sm">Step {step} of 2</p>
                    </DialogHeader>
                </div>

                <div className="p-6">
                    {step === 1 ? (
                        <div className="space-y-6">
                            {/* Upload Area */}
                            <div
                                className="border-2 border-dashed border-[#C5A059]/30 rounded-xl h-64 flex flex-col items-center justify-center bg-[#0D0D0D] cursor-pointer hover:border-[#C5A059]/50 transition-colors relative"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {image ? (
                                    <img src={image} className="w-full h-full object-contain rounded-xl" />
                                ) : (
                                    <>
                                        <div className="w-16 h-16 bg-[#C5A059]/10 rounded-full flex items-center justify-center mb-4">
                                            <svg className="w-8 h-8 text-[#C5A059]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                        </div>
                                        <p className="text-sm font-medium text-[#F5F5F0]">Tap to upload Pedigree / Photo</p>
                                        <p className="text-xs text-[#B8B8B8]/50 mt-2">We'll auto-fill details from the certificate</p>
                                    </>
                                )}
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                            </div>

                            {/* Progress */}
                            {processing && (
                                <div className="space-y-2">
                                    <div className="h-2 bg-[#0D0D0D] rounded-full overflow-hidden border border-[#C5A059]/20">
                                        <div className="h-full bg-gradient-to-r from-[#C5A059] to-[#D4C4B5] transition-all duration-300" style={{ width: `${progress}%` }}></div>
                                    </div>
                                    <p className="text-center text-xs text-[#C5A059]">Analyzing document... {progress}%</p>
                                </div>
                            )}

                            <Button
                                disabled={!image || processing}
                                onClick={processImage}
                                className="w-full py-6 text-lg font-bold bg-[#C5A059] hover:bg-[#D4C4B5] text-[#0A0A0A] rounded-xl"
                            >
                                {processing ? 'Scanning...' : 'Make Magic Happen ✨'}
                            </Button>
                            <Button
                                variant="outline"
                                className="w-full border-[#C5A059]/30 text-[#C5A059] hover:bg-[#C5A059]/10"
                                onClick={() => setStep(2)}
                            >
                                Skip and fill manually
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-4 max-h-[60vh] overflow-y-auto px-1">
                            {/* Profile Image Upload */}
                            <div className="flex items-center gap-4 p-4 bg-[#0D0D0D] rounded-xl border border-[#C5A059]/10">
                                <div
                                    className="w-20 h-20 bg-[#1A1A1A] rounded-full flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-80 transition-opacity border-2 border-[#C5A059]/20"
                                    onClick={() => profileInputRef.current?.click()}
                                >
                                    {profileImagePreview ? (
                                        <img src={profileImagePreview} className="w-full h-full object-cover" />
                                    ) : (
                                        <svg className="w-8 h-8 text-[#C5A059]/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-[#F5F5F0]">Profile Photo</p>
                                    <p className="text-xs text-[#B8B8B8]/50 mb-2">Upload a clear photo of the pet</p>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => profileInputRef.current?.click()}
                                        className="text-xs h-8 border-[#C5A059]/30 text-[#C5A059] hover:bg-[#C5A059]/10"
                                    >
                                        Choose Photo
                                    </Button>
                                    <input type="file" ref={profileInputRef} className="hidden" accept="image/*" onChange={handleProfileImageChange} />
                                </div>
                            </div>

                            {/* Media Manager */}
                            <div className="space-y-4 p-4 bg-[#0D0D0D] rounded-xl border border-[#C5A059]/10">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-[#F5F5F0]">Media Manager</p>
                                        <p className="text-xs text-[#B8B8B8]/50">Gallery + video link</p>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => galleryInputRef.current?.click()}
                                        className="text-xs h-8 border-[#C5A059]/30 text-[#C5A059] hover:bg-[#C5A059]/10"
                                    >
                                        Add photos
                                    </Button>
                                </div>

                                {galleryItems.length === 0 ? (
                                    <p className="text-xs text-[#B8B8B8]/50">No gallery photos yet.</p>
                                ) : (
                                    <div className="grid grid-cols-4 gap-2">
                                        {galleryItems.map((item, index) => (
                                            <div key={item.preview} className="relative">
                                                <img src={item.preview} className="w-full h-16 object-cover rounded-lg border border-[#C5A059]/20" />
                                                <button
                                                    onClick={() => handleRemoveGalleryItem(index)}
                                                    className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[#C5A059] text-[#0A0A0A] text-[10px] font-bold"
                                                >
                                                    x
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <input
                                    type="file"
                                    ref={galleryInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    multiple
                                    onChange={handleGalleryChange}
                                />

                                <div className="space-y-2">
                                    <Label className="text-[#F5F5F0]">Primary Video URL (Optional)</Label>
                                    <Input
                                        value={videoUrl}
                                        onChange={e => setVideoUrl(e.target.value)}
                                        placeholder="Direct MP4 link or hosted video URL"
                                        className="bg-[#0D0D0D] border-[#C5A059]/20 text-[#F5F5F0] placeholder:text-[#B8B8B8]/30"
                                    />
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs text-[#B8B8B8]/50">Direct MP4 links work best for playback.</p>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            disabled
                                            className="text-[11px] h-7 border-[#C5A059]/20 text-[#B8B8B8]/50 cursor-not-allowed"
                                        >
                                            AI video (coming soon)
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            {/* Form Fields */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[#F5F5F0]">Pet Name *</Label>
                                    <Input
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g., Apollo"
                                        className="bg-[#0D0D0D] border-[#C5A059]/20 text-[#F5F5F0] placeholder:text-[#B8B8B8]/30"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[#F5F5F0]">Pet Type *</Label>
                                    <Select value={formData.type} onValueChange={(val: any) => setFormData({ ...formData, type: val })}>
                                        <SelectTrigger className="bg-[#0D0D0D] border-[#C5A059]/20 text-[#F5F5F0]"><SelectValue /></SelectTrigger>
                                        <SelectContent className="bg-[#1A1A1A] border-[#C5A059]/20">
                                            <SelectItem value="dog">Dog</SelectItem>
                                            <SelectItem value="cat">Cat</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[#F5F5F0]">Breed *</Label>
                                <Input
                                    value={formData.breed}
                                    onChange={e => setFormData({ ...formData, breed: e.target.value })}
                                    className="bg-[#0D0D0D] border-[#C5A059]/20 text-[#F5F5F0] placeholder:text-[#B8B8B8]/30"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[#F5F5F0]">Gender *</Label>
                                    <Select value={formData.gender} onValueChange={(val: any) => setFormData({ ...formData, gender: val })}>
                                        <SelectTrigger className="bg-[#0D0D0D] border-[#C5A059]/20 text-[#F5F5F0]"><SelectValue /></SelectTrigger>
                                        <SelectContent className="bg-[#1A1A1A] border-[#C5A059]/20">
                                            <SelectItem value="male">Male</SelectItem>
                                            <SelectItem value="female">Female</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[#F5F5F0]">Birth Date (optional)</Label>
                                    <Input
                                        type="date"
                                        value={formData.birthDate}
                                        onChange={e => setFormData({ ...formData, birthDate: e.target.value })}
                                        className="bg-[#0D0D0D] border-[#C5A059]/20 text-[#F5F5F0]"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[#F5F5F0]">Color / Markings</Label>
                                <Input
                                    value={formData.color}
                                    onChange={e => setFormData({ ...formData, color: e.target.value })}
                                    placeholder="e.g. Golden"
                                    className="bg-[#0D0D0D] border-[#C5A059]/20 text-[#F5F5F0] placeholder:text-[#B8B8B8]/30"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[#F5F5F0]">Registration No. (Optional)</Label>
                                <Input
                                    value={formData.registrationNumber}
                                    onChange={e => setFormData({ ...formData, registrationNumber: e.target.value })}
                                    className="bg-[#0D0D0D] border-[#C5A059]/20 text-[#F5F5F0] font-mono text-xs"
                                />
                            </div>

                            {/* Pedigree Details */}
                            <div className="space-y-2 pt-4 border-t border-[#C5A059]/10">
                                <Label className="text-[#C5A059] font-medium">Pedigree Details</Label>
                                <div className="space-y-3">
                                    <div>
                                        <Label className="text-xs text-[#B8B8B8]/60">Owner Name</Label>
                                        <Input
                                            value={ownerName}
                                            onChange={e => setOwnerName(e.target.value)}
                                            placeholder="e.g. Mr. Somchai"
                                            className="bg-[#0D0D0D] border-[#C5A059]/20 text-[#F5F5F0] h-9"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <Label className="text-xs text-[#B8B8B8]/60">Sire (Father)</Label>
                                            <Select value={formData.sireId} onValueChange={(val) => setFormData(prev => ({ ...prev, sireId: val }))}>
                                                <SelectTrigger className="bg-[#0D0D0D] border-[#C5A059]/20 text-[#F5F5F0] h-9 text-xs">
                                                    <SelectValue placeholder="Select Sire..." />
                                                </SelectTrigger>
                                                <SelectContent className="bg-[#1A1A1A] border-[#C5A059]/20 max-h-48">
                                                    <SelectItem value="unknown">Unknown/None</SelectItem>
                                                    {availablePets.filter(p => p.gender === 'male' || p.gender === 'Male').map(p => (
                                                        <SelectItem key={p.id} value={p.id}>
                                                            {p.name} {p.registration_number ? `(${p.registration_number})` : ''}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {sireAgeWarning && (
                                                <p className="text-[11px] text-[#D9A441] mt-1">{sireAgeWarning}</p>
                                            )}
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs text-[#B8B8B8]/60">Dam (Mother)</Label>
                                            <Select value={formData.damId} onValueChange={(val) => setFormData(prev => ({ ...prev, damId: val }))}>
                                                <SelectTrigger className="bg-[#0D0D0D] border-[#C5A059]/20 text-[#F5F5F0] h-9 text-xs">
                                                    <SelectValue placeholder="Select Dam..." />
                                                </SelectTrigger>
                                                <SelectContent className="bg-[#1A1A1A] border-[#C5A059]/20 max-h-48">
                                                    <SelectItem value="unknown">Unknown/None</SelectItem>
                                                    {availablePets.filter(p => p.gender === 'female' || p.gender === 'Female').map(p => (
                                                        <SelectItem key={p.id} value={p.id}>
                                                            {p.name} {p.registration_number ? `(${p.registration_number})` : ''}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {damAgeWarning && (
                                                <p className="text-[11px] text-[#D9A441] mt-1">{damAgeWarning}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="pt-4 flex gap-3">
                                <Button
                                    variant="outline"
                                    className="flex-1 border-[#C5A059]/30 text-[#C5A059] hover:bg-[#C5A059]/10"
                                    onClick={() => setStep(1)}
                                >
                                    Back
                                </Button>
                                <Button
                                    className="flex-[2] bg-[#C5A059] hover:bg-[#D4C4B5] text-[#0A0A0A] font-bold"
                                    onClick={handleSubmit}
                                    disabled={processing}
                                >
                                    {status === 'uploading' ? 'Uploading Image...' :
                                        status === 'saving' ? 'Creating Record...' :
                                            status === 'processing' ? 'Processing...' :
                                                'Finish Registration'}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default PetRegistrationModal;
