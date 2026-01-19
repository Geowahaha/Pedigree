/**
 * WelcomeToast - A caring, personalized welcome greeting
 * 
 * Features:
 * - Centered rounded modal with smooth fade animation
 * - Personalized content based on user's viewing history
 * - Smart recommendations (new puppies, new members, etc.)
 * - Dismisses on outside click after 10 seconds
 * - Clickable links to relevant content
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';

// Types for recommendations
interface Recommendation {
    type: 'recently_viewed' | 'new_puppy' | 'new_member' | 'breeding_update';
    title: string;
    subtitle: string;
    emoji: string;
    link?: string;
    petId?: string;
    imageUrl?: string;
}

// Storage key for recently viewed pets
const RECENTLY_VIEWED_KEY = 'eibpo_recently_viewed';
const WELCOME_SHOWN_KEY = 'eibpo_welcome_shown_session';

const WelcomeToast: React.FC = () => {
    const { welcomeMessage, dismissWelcome, language } = useLanguage();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [isVisible, setIsVisible] = useState(false);
    const [isExiting, setIsExiting] = useState(false);
    const [canDismissOnClick, setCanDismissOnClick] = useState(false);
    const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
    const [isLoadingRecs, setIsLoadingRecs] = useState(true);

    // Load recommendations
    useEffect(() => {
        const loadRecommendations = async () => {
            if (!welcomeMessage) return;

            setIsLoadingRecs(true);
            const recs: Recommendation[] = [];

            try {
                // 1. Check recently viewed pets from localStorage
                const recentlyViewed = JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY) || '[]');
                if (recentlyViewed.length > 0) {
                    // Get the most recent pet info
                    const { data: recentPet } = await supabase
                        .from('pets')
                        .select('id, name, image_url, video_url')
                        .eq('id', recentlyViewed[0])
                        .single();

                    if (recentPet) {
                        recs.push({
                            type: 'recently_viewed',
                            title: language === 'th' ? `ดู ${recentPet.name} ต่อ` : `Continue viewing ${recentPet.name}`,
                            subtitle: language === 'th' ? 'คุณดูน้องหมาตัวนี้ล่าสุด' : 'Your recently viewed pet',
                            emoji: '👀',
                            link: `/pet/${recentPet.id}`,
                            petId: recentPet.id,
                            imageUrl: recentPet.image_url || recentPet.video_url
                        });
                    }
                }

                // 2. Check for new puppies (born within last 30 days)
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

                const { data: newPuppies, count: puppyCount } = await supabase
                    .from('pets')
                    .select('id, name, image_url, video_url', { count: 'exact' })
                    .gte('birthday', thirtyDaysAgo.toISOString().split('T')[0])
                    .limit(1);

                if (puppyCount && puppyCount > 0) {
                    recs.push({
                        type: 'new_puppy',
                        title: language === 'th'
                            ? `🎉 มีน้องหมาใหม่ ${puppyCount} ตัว!`
                            : `🎉 ${puppyCount} New Puppies Available!`,
                        subtitle: language === 'th'
                            ? 'ลูกหมาน้อยน่ารักรอคุณอยู่'
                            : 'Adorable puppies waiting for you',
                        emoji: '🐶',
                        link: '/?filter=new',
                        imageUrl: newPuppies?.[0]?.image_url || newPuppies?.[0]?.video_url
                    });
                }

                // 3. Check for upcoming puppies (breeding registered)
                const { data: upcomingBreedings, count: breedingCount } = await supabase
                    .from('pets')
                    .select('*', { count: 'exact' })
                    .ilike('notes', '%pregnant%')
                    .limit(1);

                if (breedingCount && breedingCount > 0) {
                    recs.push({
                        type: 'breeding_update',
                        title: language === 'th'
                            ? '🍼 มีลูกหมากำลังจะเกิด!'
                            : '🍼 Puppies Coming Soon!',
                        subtitle: language === 'th'
                            ? 'ติดตามข่าวสารลูกหมาใหม่'
                            : 'Follow for breeding updates',
                        emoji: '🍼',
                        link: '/?filter=pregnant'
                    });
                }

                // 4. Check for new members (registered within last 7 days)
                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

                const { count: newMemberCount } = await supabase
                    .from('pets')
                    .select('*', { count: 'exact' })
                    .gte('created_at', sevenDaysAgo.toISOString());

                if (newMemberCount && newMemberCount > 0) {
                    recs.push({
                        type: 'new_member',
                        title: language === 'th'
                            ? `✨ สมาชิกใหม่ ${newMemberCount} ตัว!`
                            : `✨ ${newMemberCount} New Members!`,
                        subtitle: language === 'th'
                            ? 'มาดูน้องหมาใหม่กันเถอะ'
                            : 'Check out our newest additions',
                        emoji: '🌟',
                        link: '/?sort=newest'
                    });
                }

                // If no recommendations, add a default one
                if (recs.length === 0) {
                    recs.push({
                        type: 'new_member',
                        title: language === 'th'
                            ? '🐕 สำรวจน้องหมาของเรา'
                            : '🐕 Explore Our Pets',
                        subtitle: language === 'th'
                            ? 'ค้นหาน้องหมาที่ใช่สำหรับคุณ'
                            : 'Find your perfect companion',
                        emoji: '🔍',
                        link: '/'
                    });
                }

            } catch (error) {
                console.log('Could not load recommendations:', error);
                // Add fallback recommendation
                recs.push({
                    type: 'new_member',
                    title: language === 'th' ? '🐕 สำรวจน้องหมาของเรา' : '🐕 Explore Our Pets',
                    subtitle: language === 'th' ? 'ค้นหาน้องหมาที่ใช่สำหรับคุณ' : 'Find your perfect companion',
                    emoji: '🔍',
                    link: '/'
                });
            }

            setRecommendations(recs.slice(0, 2)); // Max 2 recommendations
            setIsLoadingRecs(false);
        };

        loadRecommendations();
    }, [welcomeMessage, language]);

    // Show animation and allow dismiss after 10 seconds
    useEffect(() => {
        if (welcomeMessage) {
            // Delay entrance for smoother page load
            const showTimer = setTimeout(() => {
                setIsVisible(true);
            }, 800);

            // Allow dismiss on outside click after 10 seconds
            const dismissTimer = setTimeout(() => {
                setCanDismissOnClick(true);
            }, 10000);

            // Auto-dismiss after 15 seconds if user doesn't interact
            const autoCloseTimer = setTimeout(() => {
                handleDismiss();
            }, 15000);

            return () => {
                clearTimeout(showTimer);
                clearTimeout(dismissTimer);
                clearTimeout(autoCloseTimer);
            };
        }
    }, [welcomeMessage]);

    const handleDismiss = useCallback(() => {
        setIsExiting(true);
        setTimeout(() => {
            dismissWelcome();
            setIsVisible(false);
            setIsExiting(false);
        }, 500);
    }, [dismissWelcome]);

    const handleBackdropClick = useCallback(() => {
        if (canDismissOnClick) {
            handleDismiss();
        }
    }, [canDismissOnClick, handleDismiss]);

    const handleRecommendationClick = useCallback((link: string) => {
        handleDismiss();
        setTimeout(() => {
            navigate(link);
        }, 300);
    }, [handleDismiss, navigate]);

    if (!welcomeMessage || !isVisible) return null;

    // Get time-based emoji
    const hour = new Date().getHours();
    const timeEmoji = hour < 12 ? '🌅' : hour < 17 ? '☀️' : '🌙';

    return (
        <>
            {/* Backdrop with blur - click to dismiss after 10s */}
            <div
                className={`
                    fixed inset-0 z-[9998]
                    bg-black/30 backdrop-blur-sm
                    transition-all duration-500
                    ${isExiting ? 'opacity-0' : 'opacity-100'}
                    ${canDismissOnClick ? 'cursor-pointer' : 'cursor-wait'}
                `}
                onClick={handleBackdropClick}
            />

            {/* Centered Welcome Card */}
            <div
                className={`
                    fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999]
                    w-[90%] max-w-md
                    transition-all duration-500 ease-out
                    ${isExiting
                        ? 'opacity-0 scale-95 translate-y-[-45%]'
                        : 'opacity-100 scale-100 translate-y-[-50%]'
                    }
                `}
            >
                <div className="
                    relative overflow-hidden
                    bg-gradient-to-br from-white via-white to-purple-50
                    rounded-3xl
                    shadow-[0_25px_80px_rgba(0,0,0,0.25)]
                    border border-white/50
                    backdrop-blur-xl
                ">
                    {/* Top gradient accent */}
                    <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400" />

                    {/* Close button */}
                    <button
                        onClick={handleDismiss}
                        className="
                            absolute top-4 right-4 z-10
                            w-8 h-8
                            flex items-center justify-center
                            rounded-full
                            bg-gray-100 hover:bg-gray-200
                            text-gray-500 hover:text-gray-700
                            transition-all duration-200
                            hover:scale-110
                        "
                        aria-label="Close"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    {/* Content */}
                    <div className="p-8 pt-10 text-center">
                        {/* Time-based emoji */}
                        <div className="
                            w-20 h-20 mx-auto mb-6
                            bg-gradient-to-br from-pink-100 via-purple-100 to-indigo-100
                            rounded-full
                            flex items-center justify-center
                            shadow-lg shadow-purple-200/50
                            animate-bounce
                        ">
                            <span className="text-4xl">{timeEmoji}</span>
                        </div>

                        {/* Greeting */}
                        <h2 className="text-2xl font-bold text-gray-800 mb-2">
                            {welcomeMessage}
                        </h2>

                        {/* Personalized subtitle */}
                        <p className="text-gray-500 text-sm mb-6">
                            {language === 'th'
                                ? 'ยินดีที่ได้พบคุณอีกครั้ง มาดูว่ามีอะไรใหม่บ้าง'
                                : "Great to see you again! Here's what's new"}
                        </p>

                        {/* Recommendations */}
                        {isLoadingRecs ? (
                            <div className="flex justify-center py-4">
                                <div className="w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : (
                            <div className="space-y-3 mb-6">
                                {recommendations.map((rec, index) => (
                                    <button
                                        key={index}
                                        onClick={() => rec.link && handleRecommendationClick(rec.link)}
                                        className="
                                            w-full p-4
                                            bg-gradient-to-r from-gray-50 to-white
                                            hover:from-purple-50 hover:to-pink-50
                                            border border-gray-100 hover:border-purple-200
                                            rounded-2xl
                                            flex items-center gap-4
                                            transition-all duration-300
                                            hover:scale-[1.02] hover:shadow-md
                                            group
                                        "
                                    >
                                        {/* Image or Emoji */}
                                        <div className="
                                            w-14 h-14 flex-shrink-0
                                            bg-gradient-to-br from-purple-100 to-pink-100
                                            rounded-xl
                                            flex items-center justify-center
                                            overflow-hidden
                                            group-hover:scale-110
                                            transition-transform duration-300
                                        ">
                                            {rec.imageUrl ? (
                                                <img
                                                    src={rec.imageUrl}
                                                    alt=""
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                        e.currentTarget.style.display = 'none';
                                                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                                    }}
                                                />
                                            ) : null}
                                            <span className={`text-2xl ${rec.imageUrl ? 'hidden' : ''}`}>
                                                {rec.emoji}
                                            </span>
                                        </div>

                                        {/* Text */}
                                        <div className="flex-1 text-left">
                                            <p className="font-semibold text-gray-800 group-hover:text-purple-700 transition-colors">
                                                {rec.title}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {rec.subtitle}
                                            </p>
                                        </div>

                                        {/* Arrow */}
                                        <svg
                                            className="w-5 h-5 text-gray-300 group-hover:text-purple-500 group-hover:translate-x-1 transition-all"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Skip button */}
                        <button
                            onClick={handleDismiss}
                            className="
                                text-gray-400 hover:text-gray-600
                                text-sm font-medium
                                transition-colors duration-200
                                underline-offset-4 hover:underline
                            "
                        >
                            {language === 'th' ? 'ข้ามไปก่อน' : 'Skip for now'}
                        </button>

                        {/* Dismiss hint */}
                        {!canDismissOnClick && (
                            <p className="text-[10px] text-gray-300 mt-4 animate-pulse">
                                {language === 'th'
                                    ? '⏳ สามารถคลิกข้างนอกเพื่อปิดได้ใน 10 วินาที...'
                                    : '⏳ Click outside to dismiss in 10 seconds...'}
                            </p>
                        )}
                    </div>

                    {/* Bottom decorative wave */}
                    <div className="absolute bottom-0 left-0 right-0 h-16 overflow-hidden pointer-events-none">
                        <svg
                            viewBox="0 0 400 60"
                            preserveAspectRatio="none"
                            className="absolute bottom-0 w-full h-16 text-purple-100/50"
                        >
                            <path
                                d="M0,30 Q100,50 200,30 T400,30 L400,60 L0,60 Z"
                                fill="currentColor"
                            />
                        </svg>
                    </div>
                </div>
            </div>
        </>
    );
};

export default WelcomeToast;

// Helper: Track recently viewed pets (call this when viewing a pet)
export const trackRecentlyViewedPet = (petId: string) => {
    if (typeof window === 'undefined') return;

    try {
        const recent = JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY) || '[]');
        // Remove if exists, add to front
        const filtered = recent.filter((id: string) => id !== petId);
        filtered.unshift(petId);
        // Keep only last 5
        localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(filtered.slice(0, 5)));
    } catch (e) {
        console.log('Could not track recently viewed pet');
    }
};
