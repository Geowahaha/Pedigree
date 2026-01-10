import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface AddExternalCardModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (data: { link: string; caption: string; mediaType: 'image' | 'video' }) => void;
}

export const AddExternalCardModal: React.FC<AddExternalCardModalProps> = ({ isOpen, onClose, onAdd }) => {
    const [link, setLink] = useState('');
    const [caption, setCaption] = useState('');
    const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
    const [isManualOverride, setIsManualOverride] = useState(false);

    const checkLinkType = (url: string): 'image' | 'video' => {
        if (!url) return 'image';
        // Social Media & Video Platforms
        if (url.match(/(youtube|youtu\.be|instagram|tiktok|facebook|vimeo|pinterest)/i)) return 'video';
        // Video Files
        if (url.match(/\.(mp4|webm|mov|ogg|m4v)(\?|$)/i)) return 'video';
        // Default to image for other files or unknown
        return 'image';
    };

    const handleLinkChange = (val: string) => {
        setLink(val);
        if (!isManualOverride) {
            setMediaType(checkLinkType(val));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onAdd({ link, caption, mediaType });
        onClose();
        setLink('');
        setCaption('');
        // Reset type
        setMediaType('image');
        setIsManualOverride(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-[#1A1A1A] border border-[#C5A059] text-[#F5F5F0] max-w-md rounded-2xl">
                <DialogHeader>
                    <DialogTitle className="text-[#C5A059] flex items-center gap-2">
                        ✨ Create Magic Card
                    </DialogTitle>
                    <DialogDescription className="text-xs text-[#B8B8B8]">
                        Paste a link to an image or video, add a caption, and we'll magically create a card for it.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-2">

                    <div>
                        <label className="text-[10px] uppercase tracking-wider text-[#C5A059]/60 font-bold">Link (Image/Video)</label>
                        <input
                            value={link}
                            onChange={e => handleLinkChange(e.target.value)}
                            placeholder="https://..."
                            className="w-full bg-[#0A0A0A] border border-[#C5A059]/20 rounded-xl p-3 text-sm mt-1 focus:border-[#C5A059] outline-none text-[#F5F5F0]"
                            autoFocus
                        />
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

                    {link && (
                        <div className="rounded-xl overflow-hidden bg-black border border-[#C5A059]/10 h-40 flex items-center justify-center relative group">
                            {mediaType === 'video' ? (
                                <video
                                    src={link}
                                    className="h-full w-full object-contain"
                                    autoPlay
                                    muted
                                    loop
                                    playsInline
                                    onError={() => { /* Optional error handling visuals */ }}
                                />
                            ) : (
                                <img
                                    src={link}
                                    alt="Preview"
                                    className="h-full w-full object-cover"
                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                />
                            )}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                <span className="text-xs font-medium text-white">Preview based on selected type</span>
                            </div>
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

                    <button type="submit" disabled={!link} className="w-full py-3 bg-[#C5A059] text-black font-bold rounded-xl hover:bg-[#D4C4B5] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                        <span>✨</span> Make Magic
                    </button>
                </form>
            </DialogContent>
        </Dialog>
    );
};
