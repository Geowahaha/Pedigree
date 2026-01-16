import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pet } from '@/data/petData';

interface PetCardProps {
    pet: Pet;
    isLiked?: boolean;
    isOwner?: boolean;
    onClick: () => void;
    onPedigreeClick: () => void;
    onChatClick: () => void;
    onLikeClick: () => void;
    onCommentClick?: () => void;
    onEditClick?: () => void;
    onBoostClick?: () => void;
    onDeleteClick?: () => void;
    className?: string;
}

const PetCard: React.FC<PetCardProps> = ({ pet, isLiked = false, isOwner = false, onClick, onPedigreeClick, onChatClick, onLikeClick, onCommentClick, onEditClick, onBoostClick, onDeleteClick, className }) => {
    const navigate = useNavigate();
    const [imageLoaded, setImageLoaded] = useState(false);
    const [showActions, setShowActions] = useState(false);
    const [imageError, setImageError] = useState(false);
    const [videoError, setVideoError] = useState(false);

    // Random height for masonry effect (Memoized to prevent re-render resizing)
    // Pinterest style: Taller cards (approx 300px - 500px)
    const randomHeight = React.useMemo(() => {
        const heights = ['h-80', 'h-96', 'h-[26rem]', 'h-[28rem]', 'h-[32rem]'];
        return heights[Math.floor(Math.random() * heights.length)];
    }, []); // Empty dependency array ensures it runs only once per mount

    const handleLike = (e: React.MouseEvent) => {
        e.stopPropagation();
        onLikeClick();
    };

    const handleComment = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        if (onCommentClick) {
            onCommentClick();
            return;
        }
        onClick();
    };

    const handleEdit = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        if (onEditClick) {
            onEditClick();
            return;
        }
        onClick();
    };

    const canOpenOwnerProfile = Boolean(pet.owner_id);
    const handleOwnerProfileClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        if (!pet.owner_id) return;
        navigate(`/profile/${pet.owner_id}`);
    };

    const isVideo = pet.media_type === 'video';

    return (
        <div
            className={`relative group cursor-pointer break-inside-avoid mb-8 ${className || ''}`}
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => setShowActions(false)}
            onClick={onClick}
        >
            {/* Card Container - Pinterest Long Cards */}
            <div className={`relative ${isVideo ? 'h-[34rem]' : (pet.image && !imageError ? randomHeight : 'h-80')} rounded-[28px] overflow-hidden bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)] group-hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] transition-all duration-500 ease-out border border-gray-100`}>

                {/* Media Content */}
                <div className="w-full h-full relative bg-gray-50 flex items-center justify-center bg-black">
                    {isVideo && pet.video_url ? (
                        (() => {
                            const url = pet.video_url || '';

                            // 1. YouTube & Shorts
                            // Regex to match video ID (11 chars) from various Youtube URL formats, ignoring query params like ?si=
                            const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
                            if (ytMatch && ytMatch[1]) {
                                return (
                                    <iframe
                                        src={`https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&mute=1&controls=0&loop=1&playlist=${ytMatch[1]}&playsinline=1`}
                                        title={pet.name}
                                        className="w-full h-full object-cover pointer-events-none"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                    />
                                );
                            }

                            // 2. Instagram (Reels & Posts)
                            if (url.includes('instagram.com')) {
                                let cleanUrl = url.split('?')[0].replace(/\/$/, '');
                                if (!cleanUrl.endsWith('/embed')) {
                                    cleanUrl += '/embed';
                                }
                                return (
                                    <iframe
                                        src={cleanUrl}
                                        className="w-full h-full object-cover bg-black"
                                        frameBorder="0"
                                        scrolling="no"
                                        allow="encrypted-media"
                                        title="Instagram"
                                    />
                                );
                            }

                            // 3. Facebook (Reels & Watch)
                            if (url.includes('facebook.com') || url.includes('fb.watch')) {
                                // Clean URL for plugin compatibility
                                let cleanUrl = url;
                                if (url.includes('fb.watch')) {
                                    // fb.watch links usually work directly with video.php but sometimes need expanding.
                                    // Trusting the plugin to handle it for now, but ensure HTTPS.
                                    if (!url.startsWith('http')) cleanUrl = `https://${url}`;
                                } else {
                                    // Replace web/m/mobile subdomains with www to prevent layout issues
                                    cleanUrl = url.replace(/:\/\/(web|m|mobile)\.facebook\.com/, '://www.facebook.com');
                                }

                                const encodedUrl = encodeURIComponent(cleanUrl);

                                // Use post.php for share links which are often not direct video permalinks
                                const pluginType = (cleanUrl.includes('share/r/') || cleanUrl.includes('share/v/')) ? 'post.php' : 'video.php';

                                return (
                                    <iframe
                                        src={`https://www.facebook.com/plugins/${pluginType}?href=${encodedUrl}&show_text=0&autoplay=1&mute=1&width=500`}
                                        className="w-full h-full object-cover bg-black"
                                        style={{ border: 'none', overflow: 'hidden' }}
                                        scrolling="no"
                                        frameBorder="0"
                                        allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                                        allowFullScreen={true}
                                        title="Facebook"
                                    />
                                );
                            }

                            // 4. TikTok
                            if (url.includes('tiktok.com')) {
                                const videoIdMatch = url.match(/video\/(\d+)/);
                                if (videoIdMatch && videoIdMatch[1]) {
                                    return (
                                        <iframe
                                            src={`https://www.tiktok.com/embed/v2/${videoIdMatch[1]}`}
                                            className="w-full h-full object-cover bg-black"
                                            frameBorder="0"
                                            allow="encrypted-media; fullscreen"
                                            title="TikTok"
                                        />
                                    );
                                }
                            }

                            if (videoError) {
                                return (
                                    <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 p-4 text-center text-gray-400">
                                        <span className="text-2xl mb-2">📹</span>
                                        <p className="text-xs">Unavailable</p>
                                    </div>
                                );
                            }

                            // 5. Standard Direct Video
                            return (
                                <video
                                    src={url}
                                    className="w-full h-full object-cover"
                                    loop
                                    muted
                                    playsInline
                                    autoPlay
                                    onError={() => setVideoError(true)}
                                />
                            );
                        })()
                    ) : pet.image && !imageError ? (
                        <img
                            src={pet.image}
                            alt={pet.name}
                            className={`w-full h-full object-cover transition-opacity duration-500 bg-gray-100 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                            onLoad={() => setImageLoaded(true)}
                            onError={() => setImageError(true)}
                        />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 text-gray-300">
                            <span className="text-4xl opacity-30">🐕</span>
                        </div>
                    )}

                    {/* Dark Gradient Overlay - Only on hover for text readability */}
                    <div className={`absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent transition-opacity duration-300 ${showActions ? 'opacity-100' : 'opacity-0'} pointer-events-none`} />

                    {(pet.ownership_status === 'waiting_owner' || pet.ownership_status === 'pending_claim' || pet.ownership_status === 'disputed') && (
                        <div className="absolute top-3 left-3 px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-white/90 text-gray-900 shadow-sm">
                            {pet.ownership_status === 'waiting_owner' && 'Waiting Owner'}
                            {pet.ownership_status === 'pending_claim' && 'Claim In Review'}
                            {pet.ownership_status === 'disputed' && 'Ownership Disputed'}
                        </div>
                    )}

                    {/* Floating Actions - Appear on Hover */}
                    <div
                        className={`absolute top-3 right-3 flex flex-col items-end gap-2 transition-all duration-300 ${showActions ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'} z-20`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleComment}
                                className="h-9 px-3 rounded-full bg-white/95 backdrop-blur-sm flex items-center gap-1.5 text-gray-700 text-xs font-semibold shadow-sm hover:bg-white transition-all"
                                title="Comments"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                                Comment
                            </button>
                            {isOwner && (
                                <button
                                    onClick={handleEdit}
                                    className="h-9 px-3 rounded-full bg-white/95 backdrop-blur-sm flex items-center gap-1.5 text-gray-700 text-xs font-semibold shadow-sm hover:bg-white transition-all"
                                    title="Edit"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-5M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z" />
                                    </svg>
                                    Edit
                                </button>
                            )}
                        </div>
                        <div className="flex flex-col gap-2 items-end">
                            {!isOwner && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onChatClick(); }}
                                    className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-gray-600 hover:text-[#ea4c89] hover:bg-white shadow-sm transition-all"
                                    title="Chat"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                                </button>
                            )}
                            <button
                                onClick={(e) => { e.stopPropagation(); onPedigreeClick(); }}
                                className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-gray-600 hover:text-[#ea4c89] hover:bg-white shadow-sm transition-all"
                                title="Pedigree"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            </button>
                            <button
                                onClick={handleLike}
                                className={`w-10 h-10 rounded-full backdrop-blur-sm flex items-center justify-center shadow-sm transition-all ${isLiked ? 'bg-[#ea4c89] text-white' : 'bg-white/90 text-gray-600 hover:text-[#ea4c89] hover:bg-white'}`}
                            >
                                <svg className="w-4 h-4" fill={isLiked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                            </button>
                            {isOwner && onDeleteClick && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onDeleteClick(); }}
                                    className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-gray-600 hover:text-red-500 hover:bg-white shadow-sm transition-all"
                                    title="Delete"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Badges - Top Left */}
                    <div className="absolute top-3 left-3 flex flex-col gap-1 z-10 pointer-events-none">
                        {pet.is_sponsored && (
                            <span className="px-2 py-1 bg-white/90 backdrop-blur text-black text-[9px] font-bold rounded-md shadow-sm uppercase tracking-wide">
                                Sponsored
                            </span>
                        )}
                    </div>

                    {/* Info Text - Bottom Overlaid */}
                    <div className={`absolute bottom-0 left-0 right-0 p-4 transform transition-transform duration-300 ${showActions ? 'translate-y-0' : 'translate-y-2 opacity-0'} pointer-events-none`}>
                        <h3 className="text-white font-bold text-lg leading-tight truncate drop-shadow-md">{pet.name}</h3>
                        <p className="text-white/80 text-xs truncate drop-shadow-md">{pet.breed}</p>
                    </div>

                </div>
            </div>

            {/* Info Below Card (Always Visible) - Cleaner Look */}
            <div className="pt-3 px-1">
                <div className="flex justify-between items-center">
                    <button
                        type="button"
                        onClick={handleOwnerProfileClick}
                        disabled={!canOpenOwnerProfile}
                        className="flex items-center gap-2 disabled:cursor-default"
                        title={canOpenOwnerProfile ? 'View profile' : undefined}
                        aria-label={canOpenOwnerProfile ? `View profile for ${pet.owner || 'owner'}` : undefined}
                    >
                        <div className="w-5 h-5 rounded-full bg-gray-100 overflow-hidden">
                            {/* Placeholder Avatar */}
                            <div className="w-full h-full bg-gradient-to-tr from-gray-200 to-gray-300" />
                        </div>
                        <span className="text-xs font-medium text-[#0d0c22] truncate max-w-[100px]">{pet.owner || 'User'}</span>
                        {canOpenOwnerProfile && (
                            <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h.01M12 12h.01M15 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                        )}
                    </button>
                    <div className="flex items-center gap-2 text-gray-400 text-[10px] font-medium">
                        <span className="flex items-center gap-0.5">❤️ {pet.likes || 0}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PetCard;
