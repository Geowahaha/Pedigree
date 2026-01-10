import React, { useState } from 'react';
import { Pet } from '@/data/petData';

interface PetCardProps {
    pet: Pet;
    isLiked?: boolean;
    isOwner?: boolean;
    onClick: () => void;
    onPedigreeClick: () => void;
    onChatClick: () => void;
    onLikeClick: () => void;
    onBoostClick?: () => void;
    className?: string;
}

const PetCard: React.FC<PetCardProps> = ({ pet, isLiked = false, isOwner = false, onClick, onPedigreeClick, onChatClick, onLikeClick, onBoostClick, className }) => {
    const [imageLoaded, setImageLoaded] = useState(false);
    const [showActions, setShowActions] = useState(false);
    const [imageError, setImageError] = useState(false);
    const [videoError, setVideoError] = useState(false);

    // Random height for masonry effect (keep consistent if possible, or random)
    // To avoid hydration mismatch if used in SSR, random might be tricky.
    // Client-side mainly.
    const heights = ['h-48', 'h-56', 'h-64', 'h-72', 'h-80'];
    const randomHeight = heights[Math.floor(Math.random() * heights.length)];

    const handleLike = (e: React.MouseEvent) => {
        e.stopPropagation();
        onLikeClick();
    };

    return (
        <div
            className={`relative group cursor-pointer break-inside-avoid mb-4 ${className || ''}`}
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => setShowActions(false)}
            onClick={onClick}
        >
            {/* Image Container */}
            <div className={`relative ${pet.media_type === 'video' ? 'h-96' : (pet.image && !imageError ? randomHeight : 'h-48')} rounded-xl overflow-hidden bg-[#1A1A1A]`}>
                {pet.media_type === 'video' && pet.video_url ? (
                    <div className="w-full h-full relative bg-black">
                        {(() => {
                            // Support standard, embed, shorts, and youtu.be
                            const ytId = pet.video_url?.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)?.[1];

                            if (ytId) {
                                return (
                                    <iframe
                                        src={`https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${ytId}&playsinline=1`}
                                        title={pet.name}
                                        className="w-full h-full object-cover pointer-events-none"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                    />
                                );
                            }

                            // Instagram Support
                            if (pet.video_url?.includes('instagram.com')) {
                                const cleanUrl = pet.video_url.split('?')[0].replace(/\/$/, '');
                                const embedUrl = cleanUrl.endsWith('/embed') ? cleanUrl : `${cleanUrl}/embed`;
                                return (
                                    <iframe
                                        src={embedUrl}
                                        className="w-full h-full object-cover pointer-events-none"
                                        frameBorder="0"
                                        scrolling="no"
                                    />
                                );
                            }

                            // Other Platforms: Show Branded Fallback
                            const isTikTok = pet.video_url?.includes('tiktok.com');
                            const isFB = pet.video_url?.includes('facebook.com');
                            const isPin = pet.video_url?.includes('pinterest.com');

                            if (isTikTok || isFB || isPin) {
                                const bgClass = isTikTok ? 'bg-black' : isFB ? 'bg-[#1877F2]' : 'bg-[#E60023]';
                                const label = isTikTok ? 'TikTok' : isFB ? 'Facebook' : 'Pinterest';
                                return (
                                    <div className={`w-full h-full flex flex-col items-center justify-center ${bgClass} p-4 text-center text-white`}>
                                        <span className="text-2xl mb-2">▶</span>
                                        <p className="text-xs font-bold mb-2">View on {label}</p>
                                    </div>
                                );
                            }

                            if (videoError) {
                                return (
                                    <div className="w-full h-full flex flex-col items-center justify-center bg-[#0D0D0D] p-4 text-center">
                                        <span className="text-2xl mb-2">📹</span>
                                        <p className="text-xs text-[#B8B8B8] mb-2">Video playback unavailable</p>
                                        <a
                                            href={pet.video_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="px-3 py-1 bg-[#C5A059]/10 text-[#C5A059] text-xs rounded-full hover:bg-[#C5A059] hover:text-[#0A0A0A] transition-colors"
                                        >
                                            Open External Link
                                        </a>
                                    </div>
                                );
                            }

                            return (
                                <video
                                    src={pet.video_url}
                                    className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-105`}
                                    loop
                                    muted
                                    playsInline
                                    autoPlay
                                    onError={() => setVideoError(true)}
                                />
                            );
                        })()}
                        {/* Play Icon Indicator */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                                <span className="text-white text-xl">▶</span>
                            </div>
                        </div>
                    </div>
                ) : pet.image && !imageError ? (
                    <img
                        src={pet.image}
                        alt={pet.name}
                        className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-105 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                        onLoad={() => setImageLoaded(true)}
                        onError={() => setImageError(true)}
                    />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#1A1A1A] to-[#0D0D0D]">
                        <span className="text-5xl opacity-30">🐾</span>
                        <span className="text-xs text-[#B8B8B8]/40 mt-2">No photo</span>
                    </div>
                )}

                {/* Overlay on hover */}
                <div className={`absolute inset-0 bg-gradient-to-t from-[#0A0A0A]/90 via-transparent to-transparent transition-opacity duration-300 ${showActions ? 'opacity-100' : 'opacity-0'}`} />

                {/* Action buttons - TOP RIGHT */}
                <div className={`absolute top-3 right-3 flex gap-2 transition-all duration-300 ${showActions ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
                    {/* Chat with Owner (Hidden for Owner) */}
                    {!isOwner && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onChatClick(); }}
                            className="w-8 h-8 rounded-full bg-[#0A0A0A]/80 backdrop-blur-sm flex items-center justify-center text-[#C5A059] hover:bg-[#C5A059] hover:text-[#0A0A0A] transition-all"
                            title="Chat with Owner"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                        </button>
                    )}

                    {/* Pedigree/Family Tree */}
                    <button
                        onClick={(e) => { e.stopPropagation(); onPedigreeClick(); }}
                        className="w-8 h-8 rounded-full bg-[#0A0A0A]/80 backdrop-blur-sm flex items-center justify-center text-[#C5A059] hover:bg-[#C5A059] hover:text-[#0A0A0A] transition-all"
                        title="Family Tree"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </button>

                    {/* Like/Heart */}
                    <button
                        onClick={handleLike}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isLiked
                            ? 'bg-red-500 text-white'
                            : 'bg-[#C5A059] text-[#0A0A0A] hover:bg-[#D4C4B5]'
                            }`}
                        title="Like"
                    >
                        <svg className="w-4 h-4" fill={isLiked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                    </button>
                </div>

                {/* Badges - TOP LEFT */}
                <div className="absolute top-3 left-3 flex flex-col gap-1 z-10">
                    {pet.is_sponsored && (
                        <span className="px-2 py-1 bg-white/90 text-black text-[10px] font-bold rounded-full shadow-sm">
                            Sponsored
                        </span>
                    )}
                    {pet.source === 'instagram' && (
                        <span className="px-2 py-1 bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 text-white text-[10px] font-bold rounded-full shadow-sm flex items-center gap-1">
                            📸 Instagram
                        </span>
                    )}
                    {pet.source === 'pinterest' && (
                        <span className="px-2 py-1 bg-red-600 text-white text-[10px] font-bold rounded-full shadow-sm flex items-center gap-1">
                            📌 Pinterest
                        </span>
                    )}
                    {pet.healthCertified && (
                        <span className="px-2 py-1 bg-[#4A7C59] text-white text-[10px] font-medium rounded-full backdrop-blur-md shadow-sm">
                            ✓ Verified
                        </span>
                    )}
                    {pet.boosted_until && new Date(pet.boosted_until) > new Date() && (
                        <span className="px-2 py-1 bg-gradient-to-r from-[#C5A059] to-[#8B7355] text-white text-[10px] font-bold rounded-full shadow-lg border border-white/20 animate-pulse">
                            🚀 Promoted
                        </span>
                    )}
                    {pet.parentIds?.sire && pet.parentIds?.dam && (
                        <span className="px-2 py-1 bg-[#C5A059] text-[#0A0A0A] text-[10px] font-medium rounded-full">
                            Pedigree
                        </span>
                    )}
                </div>
                {/* Boost Button - BOTTOM RIGHT (Separate from Chat/Heart) */}
                {isOwner && (
                    <div className={`absolute bottom-3 right-3 transition-all duration-300 ${showActions ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
                        <button
                            onClick={(e) => { e.stopPropagation(); onBoostClick?.(); }}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#C5A059] text-[#0A0A0A] font-bold shadow-lg hover:bg-[#D4C4B5] transition-all"
                            title="Boost Listing (50 TRD)"
                        >
                            <span className="text-sm">🚀</span>
                            <span className="text-[10px] uppercase tracking-wide">Boost</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="p-3">
                <h3 className="font-medium text-[#F5F5F0] text-sm truncate">{pet.name}</h3>
                <p className="text-xs text-[#B8B8B8]/70 truncate">{pet.breed}</p>
                <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs ${pet.gender === 'male' ? 'text-blue-400' : 'text-pink-400'}`}>
                        {pet.gender === 'male' ? '♂' : '♀'}
                    </span>
                    {pet.location && (
                        <span className="text-xs text-[#B8B8B8]/50">{pet.location}</span>
                    )}
                </div>
            </div>
        </div >
    );
};

export default PetCard;
