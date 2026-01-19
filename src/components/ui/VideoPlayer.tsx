/**
 * Universal Video Player Component
 * Supports: YouTube, YouTube Shorts, TikTok, Instagram Reels, Direct video files
 */

import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';

interface VideoPlayerProps {
    src: string; // Video URL (YouTube, TikTok, Instagram, direct file)
    poster?: string; // Fallback image
    className?: string;
    autoPlay?: boolean;
    muted?: boolean;
    loop?: boolean;
    showControls?: boolean;
    onClick?: () => void;
}

// Extract video ID and platform from URL
const parseVideoUrl = (url: string): { platform: 'youtube' | 'tiktok' | 'instagram' | 'direct' | 'unknown'; videoId: string | null; embedUrl: string | null; originalUrl: string } => {
    if (!url) return { platform: 'unknown', videoId: null, embedUrl: null, originalUrl: url };

    const cleanUrl = url.trim();

    // YouTube (regular, shorts, embed)
    const ytRegex = /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const ytMatch = cleanUrl.match(ytRegex);
    if (ytMatch) {
        return {
            platform: 'youtube',
            videoId: ytMatch[1],
            embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&mute=1&loop=1&playlist=${ytMatch[1]}&controls=0&modestbranding=1&playsinline=1`,
            originalUrl: cleanUrl
        };
    }

    // TikTok - multiple formats
    // Format 1: https://www.tiktok.com/@username/video/123456789
    // Format 2: https://vt.tiktok.com/ZS... (short link)
    // Format 3: https://vm.tiktok.com/... (mobile share)
    const tiktokFullRegex = /tiktok\.com\/@[^/]+\/video\/(\d+)/;
    const tiktokShortRegex = /(?:vt|vm)\.tiktok\.com\/([a-zA-Z0-9]+)/;
    const tiktokEmbedRegex = /tiktok\.com\/embed\/v2\/(\d+)/;

    const tiktokMatch = cleanUrl.match(tiktokFullRegex);
    if (tiktokMatch) {
        return {
            platform: 'tiktok',
            videoId: tiktokMatch[1],
            embedUrl: `https://www.tiktok.com/embed/v2/${tiktokMatch[1]}`,
            originalUrl: cleanUrl
        };
    }

    // TikTok short links - we'll show poster with external link
    const tiktokShortMatch = cleanUrl.match(tiktokShortRegex);
    if (tiktokShortMatch) {
        return {
            platform: 'tiktok',
            videoId: tiktokShortMatch[1],
            embedUrl: null, // Cannot embed short links directly
            originalUrl: cleanUrl
        };
    }

    // TikTok embed URL
    const tiktokEmbedMatch = cleanUrl.match(tiktokEmbedRegex);
    if (tiktokEmbedMatch) {
        return {
            platform: 'tiktok',
            videoId: tiktokEmbedMatch[1],
            embedUrl: cleanUrl,
            originalUrl: cleanUrl
        };
    }

    // Instagram Reels
    const instaRegex = /instagram\.com\/(?:reel|reels|p)\/([a-zA-Z0-9_-]+)/;
    const instaMatch = cleanUrl.match(instaRegex);
    if (instaMatch) {
        return {
            platform: 'instagram',
            videoId: instaMatch[1],
            embedUrl: `https://www.instagram.com/p/${instaMatch[1]}/embed`,
            originalUrl: cleanUrl
        };
    }

    // Direct video file - check extensions and storage URLs
    const isDirectVideo =
        cleanUrl.match(/\.(mp4|webm|ogg|mov|m4v)(\?|$)/i) ||
        cleanUrl.includes('supabase') ||
        cleanUrl.includes('storage') ||
        cleanUrl.includes('blob') ||
        cleanUrl.includes('cloudinary') ||
        cleanUrl.includes('amazonaws') ||
        cleanUrl.includes('assets.mixkit');

    if (isDirectVideo) {
        return {
            platform: 'direct',
            videoId: null,
            embedUrl: cleanUrl,
            originalUrl: cleanUrl
        };
    }

    // Unknown - treat as direct if it looks like a video URL
    return { platform: 'direct', videoId: null, embedUrl: cleanUrl, originalUrl: cleanUrl };
};

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
    src,
    poster,
    className = '',
    autoPlay = false,
    muted = true,
    loop = true,
    showControls = true,
    onClick
}) => {
    const [isPlaying, setIsPlaying] = useState(autoPlay);
    const [isMuted, setIsMuted] = useState(muted);
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [showPoster, setShowPoster] = useState(!autoPlay);
    const videoRef = useRef<HTMLVideoElement>(null);

    const { platform, embedUrl, originalUrl } = parseVideoUrl(src);

    // Debug log
    useEffect(() => {
        console.log('VideoPlayer:', { src, platform, embedUrl, autoPlay });
    }, [src, platform, embedUrl, autoPlay]);

    // Control video playback
    useEffect(() => {
        if (videoRef.current && platform === 'direct') {
            if (isPlaying && !showPoster) {
                videoRef.current.play().catch((err) => {
                    console.log('Video play failed:', err);
                    // Try playing muted if unmuted play failed
                    if (videoRef.current) {
                        videoRef.current.muted = true;
                        videoRef.current.play().catch(() => { });
                    }
                });
            } else {
                videoRef.current.pause();
            }
        }
    }, [isPlaying, showPoster, platform]);

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.muted = isMuted;
        }
    }, [isMuted]);

    // Auto-play when autoPlay prop is true
    useEffect(() => {
        if (autoPlay && videoRef.current && platform === 'direct') {
            setShowPoster(false);
            setIsPlaying(true);
            videoRef.current.muted = true; // Always muted for autoplay
            videoRef.current.play().catch(() => { });
        }
    }, [autoPlay, platform]);

    const handlePlay = (e: React.MouseEvent) => {
        e.stopPropagation();
        setShowPoster(false);
        setIsPlaying(!isPlaying);
    };

    const handleMute = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsMuted(!isMuted);
    };

    const handleVideoClick = (e: React.MouseEvent) => {
        // If user clicks, always toggle play
        e.stopPropagation();
        if (showPoster) {
            setShowPoster(false);
            setIsPlaying(true);
        } else {
            setIsPlaying(!isPlaying);
        }
        // Also call parent onClick if provided
        if (onClick) {
            onClick();
        }
    };

    const handleOpenExternal = (e: React.MouseEvent) => {
        e.stopPropagation();
        window.open(originalUrl, '_blank');
    };

    // For TikTok short links that can't be embedded - show poster with external link
    if (platform === 'tiktok' && !embedUrl) {
        return (
            <div className={`relative bg-black ${className}`} onClick={onClick}>
                {poster ? (
                    <img src={poster} alt="" className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-900">
                        <span className="text-6xl">🎵</span>
                    </div>
                )}
                <button
                    onClick={handleOpenExternal}
                    className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/50 transition-colors"
                >
                    <div className="text-center">
                        <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center shadow-lg mb-2 mx-auto">
                            <Play className="w-8 h-8 text-gray-900 ml-1" fill="currentColor" />
                        </div>
                        <span className="text-white text-sm font-medium">Watch on TikTok</span>
                    </div>
                </button>
                {/* Platform badge */}
                <div className="absolute top-3 left-3 px-2 py-1 bg-black rounded text-white text-xs font-medium flex items-center gap-1">
                    <span>♪</span> TikTok
                </div>
            </div>
        );
    }

    // For embedded videos (YouTube, TikTok with full URL, Instagram)
    if ((platform === 'youtube' || platform === 'instagram' || (platform === 'tiktok' && embedUrl)) && embedUrl) {
        return (
            <div className={`relative bg-black ${className}`}>
                {showPoster && poster ? (
                    <div className="relative w-full h-full">
                        <img src={poster} alt="" className="w-full h-full object-cover" />
                        <button
                            onClick={(e) => { e.stopPropagation(); setShowPoster(false); setIsPlaying(true); }}
                            className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors"
                        >
                            <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center shadow-lg">
                                <Play className="w-8 h-8 text-gray-900 ml-1" fill="currentColor" />
                            </div>
                        </button>
                        {/* Platform badge */}
                        <div className="absolute top-3 left-3 px-2 py-1 bg-black/60 rounded text-white text-xs font-medium">
                            {platform === 'youtube' && '▶ YouTube'}
                            {platform === 'tiktok' && '♪ TikTok'}
                            {platform === 'instagram' && '📷 Instagram'}
                        </div>
                    </div>
                ) : (
                    <>
                        <iframe
                            src={embedUrl}
                            className="w-full h-full border-0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        />
                        {/* Platform badge */}
                        <div className="absolute top-3 left-3 px-2 py-1 bg-black/60 rounded text-white text-xs font-medium z-10">
                            {platform === 'youtube' && '▶ YouTube'}
                            {platform === 'tiktok' && '♪ TikTok'}
                            {platform === 'instagram' && '📷 Instagram'}
                        </div>
                    </>
                )}
            </div>
        );
    }

    // Error state
    if (hasError) {
        return (
            <div className={`relative bg-gray-900 ${className}`} onClick={onClick}>
                {poster ? (
                    <img src={poster} alt="" className="w-full h-full object-cover opacity-50" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <span className="text-4xl opacity-30">🎬</span>
                    </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-white">
                        <span className="text-3xl mb-2 block">⚠️</span>
                        <span className="text-sm">Video unavailable</span>
                    </div>
                </div>
            </div>
        );
    }

    // For direct video files
    return (
        <div className={`relative bg-black group ${className}`}>
            {showPoster && poster ? (
                <div className="relative w-full h-full" onClick={handleVideoClick}>
                    <img src={poster} alt="" className="w-full h-full object-cover" />
                    <button
                        onClick={handlePlay}
                        className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors"
                    >
                        <div className="w-14 h-14 bg-white/90 rounded-full flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                            <Play className="w-6 h-6 text-gray-900 ml-1" fill="currentColor" />
                        </div>
                    </button>
                    {/* Video badge */}
                    <div className="absolute top-3 left-3 px-2 py-1 bg-black/60 rounded text-white text-xs font-medium flex items-center gap-1">
                        <Play className="w-3 h-3" fill="currentColor" />
                        Video
                    </div>
                </div>
            ) : (
                <>
                    <video
                        ref={videoRef}
                        src={src}
                        poster={poster}
                        className="w-full h-full object-cover cursor-pointer"
                        loop={loop}
                        muted={isMuted}
                        playsInline
                        autoPlay={autoPlay}
                        onLoadedData={() => setIsLoaded(true)}
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                        onError={() => setHasError(true)}
                        onClick={handleVideoClick}
                    />

                    {/* Controls Overlay */}
                    {showControls && isLoaded && (
                        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto">
                            <button
                                onClick={handlePlay}
                                className="w-10 h-10 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/80 transition-colors"
                            >
                                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                            </button>
                            <button
                                onClick={handleMute}
                                className="w-10 h-10 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-black/80 transition-colors"
                            >
                                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                            </button>
                        </div>
                    )}

                    {/* Play overlay when paused */}
                    {!isPlaying && isLoaded && (
                        <div
                            className="absolute inset-0 flex items-center justify-center cursor-pointer"
                            onClick={handleVideoClick}
                        >
                            <div className="w-14 h-14 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center">
                                <Play className="w-7 h-7 text-white ml-1" fill="currentColor" />
                            </div>
                        </div>
                    )}

                    {/* Video indicator */}
                    <div className="absolute top-3 left-3 px-2 py-1 bg-black/60 rounded text-white text-xs font-medium flex items-center gap-1">
                        <Play className="w-3 h-3" fill="currentColor" />
                        Video
                    </div>
                </>
            )}
        </div>
    );
};

export default VideoPlayer;
