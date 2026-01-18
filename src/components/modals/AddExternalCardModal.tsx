import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { uploadPetImage } from '@/lib/storage'; // Import storage helper

interface AddExternalCardModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (data: { link: string; caption: string; mediaType: 'image' | 'video'; autoPostFb?: boolean }) => void;
    onRegisterPet?: () => void;
}

export const AddExternalCardModal: React.FC<AddExternalCardModalProps> = ({ isOpen, onClose, onAdd, onRegisterPet }) => {
    const [mode, setMode] = useState<'link' | 'upload'>('link');
    const [link, setLink] = useState('');
    const [caption, setCaption] = useState('');
    const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
    const [isManualOverride, setIsManualOverride] = useState(false);

    const [autoPostFb, setAutoPostFb] = useState(false);

    // Upload State
    const [uploading, setUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const checkLinkType = (url: string): 'image' | 'video' => {
        if (!url) return 'image';
        if (url.match(/(youtube|youtu\.be|instagram|tiktok|facebook|fb\.watch|vimeo|pinterest|shorts)/i)) return 'video';
        if (url.match(/\.(mp4|webm|mov|ogg|m4v)(\?|$)/i)) return 'video';
        return 'image';
    };

    const handleLinkChange = (val: string) => {
        setLink(val);
        setPreviewUrl(val); // For link mode, preview is the link
        if (!isManualOverride) {
            setMediaType(checkLinkType(val));
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setSelectedFile(file);

            // Create local preview
            const localUrl = URL.createObjectURL(file);
            setPreviewUrl(localUrl);

            // Auto-detect type
            if (file.type.startsWith('video/')) setMediaType('video');
            else setMediaType('image');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        let finalLink = link;

        if (mode === 'upload') {
            if (!selectedFile) return;
            setUploading(true);
            try {
                // Reuse existing uploadPetImage for simplicity, or create specific one
                finalLink = await uploadPetImage(selectedFile);
            } catch (err) {
                console.error(err);
                console.error(err);
                toast.error('Upload Failed', { description: 'Could not upload file. Try using Link mode instead.' });
                setUploading(false);
                return;
            }
            setUploading(false);
        }

        onAdd({ link: finalLink, caption, mediaType, autoPostFb });
        toast.success('Magic Card Created!', { description: autoPostFb ? 'Also scheduled for Facebook.' : 'Added to your collection.' });
        resetForm();
        onClose();
    };

    const resetForm = () => {
        setLink('');
        setCaption('');
        setMediaType('image');
        setIsManualOverride(false);
        setMode('link');
        setSelectedFile(null);
        setPreviewUrl(null);
        setUploading(false);
        setAutoPostFb(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) resetForm(); onClose(); }}>
            <DialogContent className="bg-[#1A1A1A] border-[#C5A059] text-[#F5F5F0] max-w-md rounded-2xl max-sm:fixed max-sm:inset-0 max-sm:w-full max-sm:h-full max-sm:max-w-none max-sm:max-h-none max-sm:rounded-none max-sm:overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-[#C5A059] flex items-center gap-2">
                        Create Magic Card
                    </DialogTitle>
                    <DialogDescription className="text-xs text-[#B8B8B8]">
                        Share a link or upload your own moments.
                    </DialogDescription>
                </DialogHeader>

                {/* Tabs */}
                <div className="flex border-b border-[#C5A059]/20 mb-4">
                    <button
                        className={`flex-1 pb-2 text-sm font-bold ${mode === 'link' ? 'text-[#C5A059] border-b-2 border-[#C5A059]' : 'text-gray-500'}`}
                        onClick={() => setMode('link')}
                    >
                        Link
                    </button>
                    <button
                        className={`flex-1 pb-2 text-sm font-bold ${mode === 'upload' ? 'text-[#C5A059] border-b-2 border-[#C5A059]' : 'text-gray-500'}`}
                        onClick={() => setMode('upload')}
                    >
                        Upload
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">

                    {mode === 'link' ? (
                        <div>
                            <label className="text-[10px] uppercase tracking-wider text-[#C5A059]/60 font-bold">Paste URL</label>
                            <input
                                value={link}
                                onChange={e => handleLinkChange(e.target.value)}
                                placeholder="https://..."
                                className="w-full bg-[#0A0A0A] border border-[#C5A059]/20 rounded-xl p-3 text-sm mt-1 focus:border-[#C5A059] outline-none text-[#F5F5F0]"
                                autoFocus
                            />
                        </div>
                    ) : (
                        <div>
                            <label className="text-[10px] uppercase tracking-wider text-[#C5A059]/60 font-bold">Select File</label>
                            <input
                                type="file"
                                accept="image/*,video/*"
                                onChange={handleFileSelect}
                                className="w-full bg-[#0A0A0A] border border-[#C5A059]/20 rounded-xl p-3 text-sm mt-1 focus:border-[#C5A059] text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-[#C5A059] file:text-black hover:file:bg-[#d4c4b5]"
                            />
                        </div>
                    )}



                    {/* Auto Post to Facebook (Mock Feature) */}
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-[#C5A059]/10 border border-[#C5A059]/20">
                        <input
                            type="checkbox"
                            className="rounded border-[#C5A059] text-[#C5A059] focus:ring-[#C5A059]"
                            id="autoPostFb"
                            checked={autoPostFb}
                            onChange={(e) => setAutoPostFb(e.target.checked)}
                        />
                        <label htmlFor="autoPostFb" className="text-xs text-[#F5F5F0] cursor-pointer select-none">
                            Auto-post to <span className="text-blue-400 font-bold">Facebook Page</span> (+ Comment Link)
                        </label>
                    </div>

                    {/* Manual Type Toggle */}
                    <div className="flex bg-[#0D0D0D] p-1 rounded-lg border border-[#C5A059]/20">
                        <button
                            type="button"
                            onClick={() => { setMediaType('image'); setIsManualOverride(true); }}
                            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${mediaType === 'image' ? 'bg-[#C5A059] text-[#0A0A0A]' : 'text-[#B8B8B8] hover:text-[#F5F5F0]'}`}
                        >
                            Image
                        </button>
                        <button
                            type="button"
                            onClick={() => { setMediaType('video'); setIsManualOverride(true); }}
                            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${mediaType === 'video' ? 'bg-[#C5A059] text-[#0A0A0A]' : 'text-[#B8B8B8] hover:text-[#F5F5F0]'}`}
                        >
                            Video
                        </button>
                    </div>

                    {previewUrl && (
                        <div className="rounded-xl overflow-hidden bg-black border border-[#C5A059]/10 h-40 flex items-center justify-center relative group">
                            {mediaType === 'video' ? (
                                <video
                                    src={previewUrl}
                                    className="h-full w-full object-contain"
                                    autoPlay
                                    muted
                                    loop
                                    playsInline
                                    onError={() => { /* Optional error handling */ }}
                                />
                            ) : (
                                <img
                                    src={previewUrl}
                                    alt="Preview"
                                    className="h-full w-full object-cover"
                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                />
                            )}
                        </div>
                    )}

                    <div>
                        <label className="text-[10px] uppercase tracking-wider text-[#C5A059]/60 font-bold">Caption</label>
                        <input
                            value={caption}
                            onChange={e => setCaption(e.target.value)}
                            placeholder="e.g. Look at this cute puppy!"
                            className="w-full bg-[#0A0A0A] border border-[#C5A059]/20 rounded-xl p-3 text-sm mt-1 focus:border-[#C5A059] outline-none text-[#F5F5F0]"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={(mode === 'link' && !link) || (mode === 'upload' && !selectedFile) || uploading}
                        className="w-full py-3 bg-[#C5A059] text-black font-bold rounded-xl hover:bg-[#D4C4B5] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {uploading ? (
                            <>Uploading...</>
                        ) : (
                            <>Make Magic</>
                        )}
                    </button>
                    {onRegisterPet && (
                        <button
                            type="button"
                            onClick={() => {
                                resetForm();
                                onClose();
                                onRegisterPet();
                            }}
                            className="w-full py-3 border border-[#C5A059]/40 text-[#F5F5F0] font-semibold rounded-xl hover:border-[#C5A059] hover:text-white transition-colors"
                        >
                            Register Pet Instead
                        </button>
                    )}
                </form>
            </DialogContent >
        </Dialog >
    );
};
