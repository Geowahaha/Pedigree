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
const parseVideoUrl = (url: string): { platform: 'youtube' | 'tiktok' | 'instagram' | 'direct' | 'unknown'; videoId: string | null; embedUrl: string | null } => {
    if (!url) return { platform: 'unknown', videoId: null, embedUrl: null };

    // YouTube (regular, shorts, embed)
    const ytRegex = /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const ytMatch = url.match(ytRegex);
    if (ytMatch) {
        return {
            platform: 'youtube',
            videoId: ytMatch[1],
            embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&mute=1&loop=1&playlist=${ytMatch[1]}&controls=0&modestbranding=1&playsinline=1`
        };
    }

    // TikTok
    const tiktokRegex = /tiktok\.com\/@[^/]+\/video\/(\d+)/;
    const tiktokMatch = url.match(tiktokRegex);
    if (tiktokMatch) {
        return {
            platform: 'tiktok',
            videoId: tiktokMatch[1],
            embedUrl: `https://www.tiktok.com/embed/v2/${tiktokMatch[1]}`
        };
    }

    // Instagram Reels
    const instaRegex = /instagram\.com\/(?:reel|reels|p)\/([a-zA-Z0-9_-]+)/;
    const instaMatch = url.match(instaRegex);
    if (instaMatch) {
        return {
            platform: 'instagram',
            videoId: instaMatch[1],
            embedUrl: `https://www.instagram.com/p/${instaMatch[1]}/embed`
        };
    }

    // Direct video file
    if (url.match(/\.(mp4|webm|ogg|mov)(\?|$)/i) || url.includes('supabase') || url.includes('storage')) {
        return {
            platform: 'direct',
            videoId: null,
            embedUrl: url
        };
    }

    return { platform: 'unknown', videoId: null, embedUrl: url };
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
    const [showPoster, setShowPoster] = useState(!autoPlay);
    const videoRef = useRef<HTMLVideoElement>(null);

    const { platform, embedUrl } = parseVideoUrl(src);

    useEffect(() => {
        if (videoRef.current) {
            if (isPlaying) {
                videoRef.current.play().catch(() => { });
            } else {
                videoRef.current.pause();
            }
        }
    }, [isPlaying]);

    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.muted = isMuted;
        }
    }, [isMuted]);

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
        if (onClick) {
            onClick();
        } else {
            handlePlay(e);
        }
    };

    // For embedded videos (YouTube, TikTok, Instagram)
    if (platform !== 'direct' && platform !== 'unknown' && embedUrl) {
        return (
            <div className={`relative bg-black ${className}`} onClick={onClick}>
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
                    <iframe
                        src={embedUrl}
                        className="w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    />
                )}
            </div>
        );
    }

    // For direct video files
    return (
        <div className={`relative bg-black group ${className}`} onClick={handleVideoClick}>
            {showPoster && poster && !isPlaying ? (
                <div className="relative w-full h-full">
                    <img src={poster} alt="" className="w-full h-full object-cover" />
                    <button
                        onClick={handlePlay}
                        className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors"
                    >
                        <div className="w-14 h-14 bg-white/90 rounded-full flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                            <Play className="w-6 h-6 text-gray-900 ml-1" fill="currentColor" />
                        </div>
                    </button>
                </div>
            ) : (
                <>
                    <video
                        ref={videoRef}
                        src={src}
                        poster={poster}
                        className="w-full h-full object-cover"
                        loop={loop}
                        muted={isMuted}
                        playsInline
                        autoPlay={autoPlay}
                        onLoadedData={() => setIsLoaded(true)}
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                    />

                    {/* Controls Overlay */}
                    {showControls && isLoaded && (
                        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity">
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
