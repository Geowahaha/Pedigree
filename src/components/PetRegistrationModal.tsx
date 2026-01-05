import React, { useState, useRef, useEffect } from 'react';
import { createWorker } from 'tesseract.js';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createPet, createNotification } from '@/lib/database';
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

    const fileInputRef = useRef<HTMLInputElement>(null);
    const profileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState({
        name: '',
        breed: '',
        type: 'dog' as 'dog' | 'cat',
        gender: 'male' as 'male' | 'female',
        birthDate: '',
        color: '',
        registrationNumber: '',
    });
    const [ownerName, setOwnerName] = useState('');
    const [sireName, setSireName] = useState('');
    const [damName, setDamName] = useState('');

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

    // IMAGE PREPROCESSING FOR BETTER OCR
    const preprocessImage = (imageFile: File): Promise<string> => {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = URL.createObjectURL(imageFile);
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d')!;

                // 1. Resize for better DPI (2x)
                canvas.width = img.width * 1.5;
                canvas.height = img.height * 1.5;
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                // 2. Get pixel data
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;

                // 3. Grayscale & Binarization (Thresholding)
                // This turns the image into pure Black & White, removing watermark colors
                for (let i = 0; i < data.length; i += 4) {
                    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;

                    // Threshold: If pixel is light gray (> 160), make it WHITE. Otherwise BLACK.
                    // This creates high contrast text and removes many gray watermarks/backgrounds.
                    const threshold = 160;
                    const color = avg > threshold ? 255 : 0;

                    data[i] = color;     // R
                    data[i + 1] = color; // G
                    data[i + 2] = color; // B
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

        // RESET STATE for new scan
        setFormData({
            name: '',
            breed: '',
            type: 'dog',
            gender: 'male',
            birthDate: '',
            color: '',
            registrationNumber: '',
        });
        setOwnerName('');
        setSireName('');
        setDamName('');

        try {
            // STEP 1: Preprocess the image (Clean background, enhance text)
            // This is crucial for "100%" accuracy on stamps/watermarks
            setProgress(10);
            const processedImageSrc = await preprocessImage(imageFile);

            const worker = await createWorker('eng', 1, {
                logger: m => {
                    if (m.status === 'recognizing text') {
                        // Rescale progress to fit after preprocessing (10-100%)
                        setProgress(10 + Math.floor(m.progress * 90));
                    }
                }
            });

            // STEP 2: Recognize text from the CLEAN image
            const { data: { text } } = await worker.recognize(processedImageSrc);
            await worker.terminate();

            console.log("OCR Result:", text);
            // Debug Alert
            alert(`OCR Scanned Text (First 200 chars):\n${text.substring(0, 200)}...`);

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

        // Helper to clean captured text
        const cleanText = (str: string) => {
            return str
                .replace(/[:]/g, '')
                .replace(/\b(un|bs|wore|it|ria|het|vg|Dest|wi|lat|iY|meso|fi|nnn|Kui|Dy)\b/gi, '') // Added meso, fi, nnn, Kui, Dy noise
                .replace(/\s+/g, ' ')
                .trim();
        };

        // Helper to remove leading noise like "Hs ", "Co ", ".." from names
        const cleanParentName = (name: string) => {
            let n = cleanText(name);
            return n.replace(/^(Hs|Co|Dani|K\s|Be\s|Th\s|_)\s+/i, '').replace(/^[^A-Za-z]+/, '');
        };

        // 1. Name
        // Strategy 1: Label Search
        let nameFound = '';
        const nameMatch = text.match(/(?:Name|Registered Name|NAME|Nase|Nane)[:\s.]+(.*?)(?=\s*(?:Breed|BREED|Bo|Date|DATE|Sex|SEX|un\s+FEMALE|FEMALE|MALE|wi\s+FEMALE))/i);
        if (nameMatch && nameMatch[1]) nameFound = cleanText(nameMatch[1]);

        // Strategy 2: Top line with CAPS (heuristic)
        // If name is "SORNRUK" and OCR says "¥ 42" SORNRUK", take the CAPS word.
        if ((!nameFound || nameFound.length < 3) && text.length > 0) {
            const lines = text.split('\n').slice(0, 5); // Look at top 5 lines
            for (const line of lines) {
                // Ignore lines with KCTH
                if (line.includes("KCTH")) continue;
                // Find line with significant uppercase letters
                const upperMatch = line.match(/[A-Z]{3,}/g);
                if (upperMatch && upperMatch.join(' ').length > 4) {
                    nameFound = cleanText(line).replace(/[^A-Za-z\s]/g, '').trim(); // Strip noise
                    break;
                }
            }
        }
        if (nameFound) update.name = nameFound;


        // 2. Breed
        const breedMatch = text.match(/(?:Breed|BREED|Bo)[:\s.]+(.*?)(?=\s*(?:Date|DATE|Sex|SEX|Color|COLOR))/i);
        if (breedMatch && breedMatch[1]) {
            update.breed = cleanText(breedMatch[1]);
        } else if (text.match(/RIDGEBACK/i)) {
            update.breed = "Thai Ridgeback Dog";
        }

        // 3. Gender
        if (text.match(/\b(Female|Bitch)\b/i)) update.gender = 'female';
        else if (text.match(/\b(Male|Dog)\b/i)) update.gender = 'male';

        // 4. Color
        // First try label-based
        const colorMatch = text.match(/(?:Color|Colour|COLOR)[:\s.]+(.*?)(?=\s*(?:Microchip|MICROCHIP|Sex|SEX|Reg))/i);
        if (colorMatch && colorMatch[1]) {
            update.color = cleanText(colorMatch[1]);
        } else {
            // Fallback: common TRD colors (+ ISABELLA)
            const colorFallback = text.match(/\b(RED|BLUE|FAWN|BLACK|BROWN|SILVER|ISABELLA|LIVER)\b/i);
            if (colorFallback) update.color = cleanText(colorFallback[1]);
        }

        // 5. Reg No
        const kcthMatch = text.match(/(KCTH\s*[A-Z0-9]+)/i);
        if (kcthMatch && kcthMatch[1]) {
            update.registrationNumber = cleanText(kcthMatch[1]);
        } else {
            const regMatch = text.match(/(?:Reg\.? No\.?|Registration No\.?|REG\. NO\.|KCTH)[:\s.]*([A-Za-z0-9\-\s]+)/i);
            if (regMatch && regMatch[1]) {
                update.registrationNumber = cleanText(regMatch[1]);
            }
        }

        // 6. Date - Fixed Timezone Issue by manual formatting
        // Standardize Month map
        const months: { [key: string]: string } = {
            'JAN': '01', 'JANUARY': '01', 'FEB': '02', 'FEBRUARY': '02', 'MAR': '03', 'MARCH': '03',
            'APR': '04', 'APRIL': '04', 'MAY': '05', 'JUN': '06', 'JUNE': '06',
            'JUL': '07', 'JULY': '07', 'AUG': '08', 'AUGUST': '08', 'SEP': '09', 'SEPTEMBER': '09',
            'OCT': '10', 'OCTOBER': '10', 'NOV': '11', 'NOVEMBER': '11', 'DEC': '12', 'DECEMBER': '12'
        };

        // Regex updated to handle "July 15.2007" (dots)
        const monthDateMatch = text.match(/(?:JAN|JANUARY|FEB|FEBRUARY|MAR|MARCH|APR|APRIL|MAY|JUN|JUNE|JUL|JULY|AUG|AUGUST|SEP|SEPTEMBER|OCT|OCTOBER|NOV|NOVEMBER|DEC|DECEMBER)[A-Z]*\s+(\d{1,2})[,\s.]+(\d{4})\b/i);
        if (monthDateMatch) {
            // Re-run match to capture groups reliably
            const robustMatch = text.match(/([A-Z]*)(JAN|JANUARY|FEB|FEBRUARY|MAR|MARCH|APR|APRIL|MAY|JUN|JUNE|JUL|JULY|AUG|AUGUST|SEP|SEPTEMBER|OCT|OCTOBER|NOV|NOVEMBER|DEC|DECEMBER)[A-Z]*\s+(\d{1,2})[,\s.]+(\d{4})\b/i);

            if (robustMatch) {
                const monthStr = robustMatch[2].toUpperCase();
                const day = robustMatch[3].padStart(2, '0');
                const year = robustMatch[4];
                const month = months[monthStr] || '01';

                // Set directly as YYYY-MM-DD to avoid timezone shifts
                update.birthDate = `${year}-${month}-${day}`;
            }
        }

        if (!update.birthDate) {
            // Fallback to label search
            const dateMatch = text.match(/(?:Date|Born|Whelped|DATE WH)[:\s.]*([A-Za-z0-9\s,./]+)/i);
            if (dateMatch && dateMatch[1]) {
                const yearMatch = dateMatch[1].match(/\b(19|20)\d{2}\b/);
                if (yearMatch) {
                    const dateStr = dateMatch[1].replace(/[^A-Za-z0-9\s,./-]/g, '');
                    const d = new Date(dateStr);
                    if (!isNaN(d.getTime())) {
                        update.birthDate = d.toISOString().split('T')[0];
                    }
                }
            }
        }

        // 7. Sire & Dam 
        let sireFound = '';
        const sireMatch = text.match(/(?:Sire|SIRE)[:\s.]+(.*?)(?=\n|Dam|DAM|KCTH|Reg)/i);
        if (sireMatch && sireMatch[1]) sireFound = cleanText(sireMatch[1]);

        // Strategy 2: Line ABOVE "Sire"
        // If we found a Sire label like "Be", or matching line above a KCTH code
        if (!sireFound || sireFound.length < 3) {
            // Look for a line starting with KCTH (but NOT the main reg number), then grab line above.
            const lines = text.split('\n');
            for (let i = 1; i < lines.length; i++) {
                // If line is KCTH and we don't have Sire yet
                if (lines[i].includes("KCTH") && !lines[i].includes(update.registrationNumber)) {
                    // The line above is likely the Sire Name
                    // Check if it's not "Name" label
                    const candidate = cleanText(lines[i - 1]);
                    if (candidate.length > 3 && !candidate.match(/Name|Breed/i)) {
                        sireFound = candidate;
                        break; // Assume first KCTH block (after main) is Sire
                    }
                }
            }
        }
        if (sireFound) setSireName(cleanParentName(sireFound));


        let damFound = '';

        // Strategy 1: Metadata Lookahead (Heuristic for "Name \n RegNo Date Color")
        // This is most robust because names are unique but the "Date/Color" pattern is consistent.
        // And we skip the Sire we just found.
        const lines = text.split('\n');
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            // Check for Date (dd/mm/yyyy OR mm/dd/yyyy) and Color
            if (/\d{1,2}\/\d{1,2}\/\d{4}/.test(line) && /RED|BLUE|BLACK|FAWN/.test(line.toUpperCase())) {
                const candidate = cleanText(lines[i - 1]);
                // Validity checks
                // Ensure it's not the Sire matches we already found
                if (candidate.length > 3 &&
                    !candidate.includes("RED }") &&
                    (!sireFound || !cleanText(sireFound).includes(cleanText(candidate)))) {

                    damFound = candidate;
                    break;
                }
            }
        }

        // Strategy 2: Label Search fallback
        if (!damFound || damFound.length < 3) {
            const damMatch = text.match(/(?:Dam|DAM|Dani K|Co Jaisek)[:\s.]+(.*?)(?=\n|Breeder|BREEDER|KCTH|Reg)/i);
            if (damMatch && damMatch[1]) damFound = cleanText(damMatch[1]);
        }

        if (damFound) setDamName(cleanParentName(damFound));

        // 8. Owner
        // Strategy 1: Label
        const ownerMatch = text.match(/(?:Owner|OWNER)[:\s.]+(.*?)(?=\n|$)/i);
        if (ownerMatch && ownerMatch[1]) {
            let owner = cleanText(ownerMatch[1]);
            owner = owner.replace(/\s+\d+$/, '');
            setOwnerName(owner);
        } else {
            // Strategy 2: Look for MR. / MRS.
            const mrMatch = text.match(/(?:Mr\.|MR\.|Mrs\.|MRS\.|Miss|MISS)\s+[A-Za-z\s]+/i);
            if (mrMatch) {
                // Check if it's not the breeder (often same line)
                // But text stream usually separates them.
                let owner = cleanText(mrMatch[0]);
                setOwnerName(owner);
            }
        }

        setFormData(prev => ({ ...prev, ...update }));
    };

    const convertToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });
    };

    const handleSubmit = async () => {
        console.log("Starting Submission...");
        if (!formData.name || !formData.breed) {
            alert("Please fill in Name and Breed.");
            return;
        }

        setStatus('uploading');
        try {
            console.log("Processing images...");
            let finalImageUrl = null;
            if (profileImage) {
                console.log("Uploading profile photo to cloud...");
                finalImageUrl = await uploadPetImage(profileImage);
            } else if (imageFile) {
                console.log("Uploading scanned doc to cloud...");
                finalImageUrl = await uploadPetImage(imageFile);
            }

            // Construct Description with extra fields
            let desc = `Registered via OCR.`;
            if (ownerName) desc += `\nOwner: ${ownerName}`;
            if (sireName) desc += `\nSire: ${sireName}`;
            if (damName) desc += `\nDam: ${damName}`;

            console.log("Creating pet with data:", { ...formData, description: desc });
            setStatus('saving');

            // Create Pet in DB
            const newPet = await createPet({
                name: formData.name,
                type: formData.type,
                breed: formData.breed,
                gender: formData.gender,
                birth_date: formData.birthDate || new Date().toISOString(),
                color: formData.color,
                registration_number: formData.registrationNumber, // Pass custom Reg No
                image_url: finalImageUrl,
                description: desc,
            });

            console.log("Pet created:", newPet);

            // Notify Admin
            await createNotification({
                type: 'new_pet',
                title: 'New Pet Registered via App',
                message: `${newPet.name} (${newPet.breed}) added by user.`,
                reference_id: newPet.id
            });

            // Notify User
            const { createUserNotification } = await import('@/lib/database');
            if (user) {
                await createUserNotification({
                    user_id: user.id,
                    type: 'verification',
                    title: 'Registration Pending ⏳',
                    message: `We've received your registration for ${newPet.name}. Our team will verify it shortly.`,
                    payload: { pet_id: newPet.id }
                });
            }

            console.log("Success! Closing modal.");
            onSuccess();
            onClose();
        } catch (error) {
            console.error("Submission error details:", error);
            alert(`Failed to register pet: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setStatus('idle');
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md bg-white rounded-3xl p-0 overflow-hidden">
                <div className="p-6 bg-[#F5F1E8] border-b border-[#8B9D83]/10">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold text-[#2C2C2C]">Register Your Pet</DialogTitle>
                        <p className="text-[#2C2C2C]/60 text-sm">Step {step} of 2</p>
                    </DialogHeader>
                </div>

                <div className="p-6">
                    {step === 1 ? (
                        <div className="space-y-6">
                            <div
                                className="border-2 border-dashed border-[#8B9D83]/30 rounded-2xl h-64 flex flex-col items-center justify-center bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors relative"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {image ? (
                                    <img src={image} className="w-full h-full object-contain rounded-2xl" />
                                ) : (
                                    <>
                                        <div className="w-16 h-16 bg-[#8B9D83]/10 rounded-full flex items-center justify-center mb-4">
                                            <svg className="w-8 h-8 text-[#8B9D83]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                        </div>
                                        <p className="text-sm font-bold text-[#2C2C2C]">Tap to upload Pedigree / Photo</p>
                                        <p className="text-xs text-[#2C2C2C]/50 mt-2">We'll auto-fill details from the certificate</p>
                                    </>
                                )}
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileChange} />
                            </div>

                            {processing && (
                                <div className="space-y-2">
                                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-[#8B9D83] transition-all duration-300" style={{ width: `${progress}%` }}></div>
                                    </div>
                                    <p className="text-center text-xs text-[#8B9D83]">Analyzing document... {progress}%</p>
                                </div>
                            )}

                            <Button
                                disabled={!image || processing}
                                onClick={processImage}
                                className="w-full py-6 text-lg font-bold bg-[#8B9D83] hover:bg-[#7A8C73] text-white rounded-xl shadow-lg shadow-[#8B9D83]/20"
                            >
                                {processing ? 'Scanning...' : 'Make Magic Happen ✨'}
                            </Button>
                            <Button variant="ghost" className="w-full" onClick={() => setStep(2)}>Skip and fill manually</Button>
                        </div>
                    ) : (
                        <div className="space-y-4 max-h-[60vh] overflow-y-auto px-1">
                            {/* Profile Image Upload */}
                            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                                <div
                                    className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden cursor-pointer hover:opacity-80 transition-opacity border-2 border-white shadow-sm"
                                    onClick={() => profileInputRef.current?.click()}
                                >
                                    {profileImagePreview ? (
                                        <img src={profileImagePreview} className="w-full h-full object-cover" />
                                    ) : (
                                        <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-bold text-[#2C2C2C]">Profile Photo</p>
                                    <p className="text-xs text-[#2C2C2C]/50 mb-2">Upload a clear photo of the pet</p>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => profileInputRef.current?.click()}
                                        className="text-xs h-8"
                                    >
                                        Choose Photo
                                    </Button>
                                    <input
                                        type="file"
                                        ref={profileInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleProfileImageChange}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Pet Name *</Label>
                                    <Input
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g., Apollo"
                                        className="bg-gray-50 border-gray-200"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Pet Type *</Label>
                                    <Select value={formData.type} onValueChange={(val: any) => setFormData({ ...formData, type: val })}>
                                        <SelectTrigger className="bg-gray-50 border-gray-200"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="dog">Dog</SelectItem>
                                            <SelectItem value="cat">Cat</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Breed *</Label>
                                <Input
                                    value={formData.breed}
                                    onChange={e => setFormData({ ...formData, breed: e.target.value })}
                                    className="bg-gray-50 border-gray-200"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Gender *</Label>
                                    <Select value={formData.gender} onValueChange={(val: any) => setFormData({ ...formData, gender: val })}>
                                        <SelectTrigger className="bg-gray-50 border-gray-200"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="male">Male</SelectItem>
                                            <SelectItem value="female">Female</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Birth Date</Label>
                                    <Input
                                        type="date"
                                        value={formData.birthDate}
                                        onChange={e => setFormData({ ...formData, birthDate: e.target.value })}
                                        className="bg-gray-50 border-gray-200"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Color / Markings</Label>
                                <Input
                                    value={formData.color}
                                    onChange={e => setFormData({ ...formData, color: e.target.value })}
                                    placeholder="e.g. Golden"
                                    className="bg-gray-50 border-gray-200"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Registration No. (Optional)</Label>
                                <Input
                                    value={formData.registrationNumber}
                                    onChange={e => setFormData({ ...formData, registrationNumber: e.target.value })}
                                    className="bg-gray-50 border-gray-200 font-mono text-xs"
                                />
                            </div>

                            <div className="space-y-2 pt-2 border-t border-gray-100">
                                <Label className="text-[#8B9D83] font-bold">Extra Pedigree Details</Label>
                                <div className="space-y-3">
                                    <div>
                                        <Label className="text-xs text-gray-500">Owner Name</Label>
                                        <Input value={ownerName} onChange={e => setOwnerName(e.target.value)} placeholder="e.g. Mr. Somchai" className="bg-gray-50 border-gray-200 h-9" />
                                    </div>
                                    <div>
                                        <Label className="text-xs text-gray-500">Sire (Father)</Label>
                                        <Input value={sireName} onChange={e => setSireName(e.target.value)} placeholder="Sire Name" className="bg-gray-50 border-gray-200 h-9" />
                                    </div>
                                    <div>
                                        <Label className="text-xs text-gray-500">Dam (Mother)</Label>
                                        <Input value={damName} onChange={e => setDamName(e.target.value)} placeholder="Dam Name" className="bg-gray-50 border-gray-200 h-9" />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Back</Button>
                                <Button
                                    className="flex-[2] bg-[#C97064] hover:bg-[#B86054] text-white font-bold"
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
