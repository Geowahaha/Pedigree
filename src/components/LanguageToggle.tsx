import React, { useCallback, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

interface LanguageToggleProps {
    className?: string;
    compact?: boolean;
}

/**
 * Smooth Language Toggle Component with Smart Memory
 * 
 * Features:
 * - Animated sliding toggle (EN ↔ TH)
 * - Instant UI update without page reload
 * - CSS transitions for smooth switching
 * - Keyboard accessible
 * - Shows "remembered" indicator when preference is saved
 * - Saves preference to localStorage & syncs to profile
 */
const LanguageToggle: React.FC<LanguageToggleProps> = ({ className = '', compact = false }) => {
    const { language, setLanguage, isRemembered } = useLanguage();
    const toggleRef = useRef<HTMLButtonElement>(null);
    const [showTooltip, setShowTooltip] = useState(false);
    const [justSaved, setJustSaved] = useState(false);

    const toggleLanguage = useCallback(() => {
        const newLang = language === 'en' ? 'th' : 'en';
        setLanguage(newLang);

        // Show "saved" feedback
        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 2000);

        // Announce change for screen readers
        if (typeof window !== 'undefined') {
            const announcement = newLang === 'th' ? 'เปลี่ยนเป็นภาษาไทย' : 'Changed to English';
            const ariaLive = document.getElementById('language-announcement');
            if (ariaLive) {
                ariaLive.textContent = announcement;
            }
        }
    }, [language, setLanguage]);

    // Handle keyboard navigation
    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleLanguage();
        }
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            e.preventDefault();
            toggleLanguage();
        }
    }, [toggleLanguage]);

    return (
        <>
            {/* Screen reader announcement */}
            <div
                id="language-announcement"
                role="status"
                aria-live="polite"
                className="sr-only"
            />

            <div
                className="relative"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
            >
                <button
                    ref={toggleRef}
                    onClick={toggleLanguage}
                    onKeyDown={handleKeyDown}
                    className={`
                        relative flex items-center 
                        ${compact ? 'h-7 w-14' : 'h-8 w-16'}
                        rounded-full 
                        bg-[#1A1A1A] 
                        border border-[#C5A059]/30
                        hover:border-[#C5A059]/60
                        transition-all duration-300
                        cursor-pointer
                        focus:outline-none focus:ring-2 focus:ring-[#C5A059]/50 focus:ring-offset-2 focus:ring-offset-[#0A0A0A]
                        ${className}
                    `}
                    role="switch"
                    aria-checked={language === 'th'}
                    aria-label={`Language: ${language === 'en' ? 'English' : 'Thai'}. Click to switch.`}
                    title={language === 'en' ? 'Switch to Thai' : 'Switch to English'}
                >
                    {/* Background labels */}
                    <span
                        className={`
                            absolute left-1.5 
                            ${compact ? 'text-[9px]' : 'text-[10px]'}
                            font-bold tracking-wider uppercase
                            transition-all duration-300
                            ${language === 'en' ? 'text-[#0A0A0A]' : 'text-[#6B6B6B]'}
                        `}
                    >
                        EN
                    </span>
                    <span
                        className={`
                            absolute right-1.5 
                            ${compact ? 'text-[9px]' : 'text-[10px]'}
                            font-bold tracking-wider uppercase
                            transition-all duration-300
                            ${language === 'th' ? 'text-[#0A0A0A]' : 'text-[#6B6B6B]'}
                        `}
                    >
                        TH
                    </span>

                    {/* Sliding indicator */}
                    <span
                        className={`
                            absolute top-0.5
                            ${compact ? 'w-6 h-6' : 'w-7 h-7'}
                            rounded-full
                            bg-gradient-to-br from-[#C5A059] to-[#9A7B3F]
                            shadow-lg shadow-[#C5A059]/30
                            transition-all duration-300 ease-out
                            ${language === 'th'
                                ? (compact ? 'left-[calc(100%-1.625rem)]' : 'left-[calc(100%-1.875rem)]')
                                : 'left-0.5'
                            }
                        `}
                        aria-hidden="true"
                    >
                        {/* Flag indicator inside the slider */}
                        <span className="absolute inset-0 flex items-center justify-center text-xs">
                            {language === 'en' ? '🇺🇸' : '🇹🇭'}
                        </span>
                    </span>

                    {/* Saved/Remembered indicator - small green dot */}
                    {isRemembered && (
                        <span
                            className={`
                                absolute -top-0.5 -right-0.5
                                w-2 h-2 rounded-full
                                bg-green-500
                                border border-white
                                transition-all duration-300
                                ${justSaved ? 'scale-150 animate-ping' : 'scale-100'}
                            `}
                            title={language === 'th' ? 'จำการตั้งค่าแล้ว' : 'Preference saved'}
                        />
                    )}
                </button>

                {/* Tooltip - shows on hover */}
                {showTooltip && (
                    <div
                        className={`
                            absolute bottom-full mb-2 left-1/2 -translate-x-1/2
                            px-3 py-1.5 rounded-lg
                            bg-gray-900 text-white text-xs font-medium
                            whitespace-nowrap
                            shadow-lg
                            animate-in fade-in slide-in-from-bottom-1 duration-200
                            z-50
                        `}
                    >
                        {justSaved ? (
                            <span className="flex items-center gap-1.5">
                                <svg className="w-3 h-3 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                {language === 'th' ? 'บันทึกแล้ว!' : 'Saved!'}
                            </span>
                        ) : isRemembered ? (
                            <span className="flex items-center gap-1.5">
                                <svg className="w-3 h-3 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                {language === 'th' ? 'จำการตั้งค่าแล้ว' : 'We remembered your preference'}
                            </span>
                        ) : (
                            language === 'th' ? 'คลิกเพื่อเปลี่ยนภาษา' : 'Click to switch language'
                        )}
                        {/* Tooltip arrow */}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                    </div>
                )}
            </div>
        </>
    );
};

export default LanguageToggle;
