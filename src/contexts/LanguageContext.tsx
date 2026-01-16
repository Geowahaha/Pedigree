import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode, useMemo } from 'react';
import { translations, Language } from '../data/translations';
import { useAuth } from './AuthContext';
import { supabase } from '@/lib/supabase';

interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string, fallback?: string) => string;
    isRTL: boolean;
    isLoading: boolean;
    isRemembered: boolean; // New: indicates if language was remembered
    welcomeMessage: string | null; // New: personalized welcome message
    dismissWelcome: () => void; // New: dismiss the welcome toast
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Storage keys for persistence
const STORAGE_KEY = 'eibpo_language';
const FIRST_VISIT_KEY = 'eibpo_first_visit';
const LANGUAGE_SET_BY_USER_KEY = 'eibpo_language_user_set';

// Detect browser language intelligently
const detectBrowserLanguage = (): Language => {
    if (typeof window === 'undefined') return 'en';

    const browserLang = navigator.language.toLowerCase();
    const supportedThaiLocales = ['th', 'th-th'];

    if (supportedThaiLocales.some(locale => browserLang.startsWith(locale))) {
        return 'th';
    }
    return 'en';
};

// Check if this is a returning user
const isReturningUser = (): boolean => {
    if (typeof window === 'undefined') return false;

    try {
        return localStorage.getItem(FIRST_VISIT_KEY) === 'false';
    } catch {
        return false;
    }
};

// Check if language was explicitly set by user
const wasLanguageSetByUser = (): boolean => {
    if (typeof window === 'undefined') return false;

    try {
        return localStorage.getItem(LANGUAGE_SET_BY_USER_KEY) === 'true';
    } catch {
        return false;
    }
};

// Get initial language from storage or browser
const getInitialLanguage = (): Language => {
    if (typeof window === 'undefined') return 'en';

    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved === 'en' || saved === 'th') {
            return saved;
        }
    } catch (e) {
        // localStorage might not be available
    }

    return detectBrowserLanguage();
};

// Generate personalized welcome message
const generateWelcomeMessage = (language: Language, isReturning: boolean, userName?: string): string | null => {
    if (!isReturning) return null;

    const hour = new Date().getHours();
    const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';

    if (language === 'th') {
        const greetings: Record<string, string> = {
            morning: 'สวัสดีตอนเช้า',
            afternoon: 'สวัสดีตอนบ่าย',
            evening: 'สวัสดีตอนเย็น'
        };
        const name = userName ? ` คุณ${userName.split(' ')[0]}` : '';
        return `${greetings[timeOfDay]}${name} 🐕 ยินดีต้อนรับกลับมา`;
    } else {
        const greetings: Record<string, string> = {
            morning: 'Good morning',
            afternoon: 'Good afternoon',
            evening: 'Good evening'
        };
        const name = userName ? `, ${userName.split(' ')[0]}` : '';
        return `${greetings[timeOfDay]}${name}! 🐕 Welcome back`;
    }
};

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [language, setLanguageState] = useState<Language>(getInitialLanguage);
    const [isLoading, setIsLoading] = useState(false);
    const [isRemembered, setIsRemembered] = useState(false);
    const [welcomeMessage, setWelcomeMessage] = useState<string | null>(null);
    const [hasShownWelcome, setHasShownWelcome] = useState(false);

    // Get auth context (may be null during initial render)
    let user: any = null;
    try {
        const authContext = useAuth();
        user = authContext?.user;
    } catch {
        // AuthContext not available yet
    }

    // Mark first visit and set up remembered state
    useEffect(() => {
        if (typeof window === 'undefined') return;

        try {
            const isFirstVisit = localStorage.getItem(FIRST_VISIT_KEY) !== 'false';
            const userSetLanguage = wasLanguageSetByUser();

            if (isFirstVisit) {
                // First visit - mark it
                localStorage.setItem(FIRST_VISIT_KEY, 'false');
                setIsRemembered(false);
            } else if (userSetLanguage) {
                // Returning user who set their language
                setIsRemembered(true);

                // Show welcome message only once per session
                if (!hasShownWelcome && !sessionStorage.getItem('eibpo_welcome_shown')) {
                    const userName = user?.profile?.full_name || user?.email?.split('@')[0];
                    const message = generateWelcomeMessage(language, true, userName);
                    setWelcomeMessage(message);
                    setHasShownWelcome(true);
                    sessionStorage.setItem('eibpo_welcome_shown', 'true');

                    // Auto-dismiss after 4 seconds
                    if (message) {
                        setTimeout(() => {
                            setWelcomeMessage(null);
                        }, 4000);
                    }
                }
            }
        } catch (e) {
            // Handle storage errors gracefully
        }
    }, [language, hasShownWelcome, user]);

    // Sync language preference with Supabase for logged-in users
    useEffect(() => {
        const syncLanguageWithProfile = async () => {
            if (!user?.id) return;

            try {
                // First, check if user has a saved language preference in profile
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('language_preference')
                    .eq('id', user.id)
                    .single();

                if (profile?.language_preference) {
                    // User has a saved preference - use it if different
                    if (profile.language_preference !== language && !wasLanguageSetByUser()) {
                        setLanguageState(profile.language_preference as Language);
                        localStorage.setItem(STORAGE_KEY, profile.language_preference);
                        setIsRemembered(true);
                    }
                }
            } catch (error) {
                // Profile might not have language_preference column yet
                console.log('Language preference sync not available');
            }
        };

        syncLanguageWithProfile();
    }, [user?.id]);

    // Update HTML lang attribute for SEO and accessibility
    useEffect(() => {
        if (typeof document !== 'undefined') {
            document.documentElement.lang = language;
            document.documentElement.dir = 'ltr'; // Both EN and TH are LTR
        }
    }, [language]);

    // Smooth language transition with persistence
    const setLanguage = useCallback(async (lang: Language) => {
        if (lang === language) return;

        setIsLoading(true);

        // Add transition class to body for smooth text changes
        if (typeof document !== 'undefined') {
            document.body.classList.add('language-transitioning');
        }

        // Small delay for exit animation
        requestAnimationFrame(() => {
            setLanguageState(lang);

            try {
                // Save to localStorage
                localStorage.setItem(STORAGE_KEY, lang);
                // Mark that user explicitly set their language
                localStorage.setItem(LANGUAGE_SET_BY_USER_KEY, 'true');
            } catch (e) {
                // localStorage might not be available
            }

            // Remove transition class after animation
            requestAnimationFrame(() => {
                if (typeof document !== 'undefined') {
                    document.body.classList.remove('language-transitioning');
                }
                setIsLoading(false);
                setIsRemembered(true);
            });
        });

        // Sync to Supabase profile if user is logged in
        if (user?.id) {
            try {
                await supabase
                    .from('profiles')
                    .update({ language_preference: lang })
                    .eq('id', user.id);
            } catch (error) {
                // Column might not exist yet - that's ok
                console.log('Could not save language preference to profile');
            }
        }
    }, [language, user?.id]);

    // Dismiss welcome message
    const dismissWelcome = useCallback(() => {
        setWelcomeMessage(null);
    }, []);

    // Optimized translation function with memoization
    const t = useCallback((path: string, fallback?: string): string => {
        const keys = path.split('.');
        let current: any = translations[language];

        for (const key of keys) {
            if (current === undefined || current === null) {
                console.warn(`Translation key not found: ${path}`);
                return fallback || path;
            }
            if (current[key] === undefined) {
                // Try English as fallback
                let fallbackCurrent: any = translations.en;
                for (const fbKey of keys) {
                    if (fallbackCurrent?.[fbKey] !== undefined) {
                        fallbackCurrent = fallbackCurrent[fbKey];
                    } else {
                        console.warn(`Translation key not found: ${path}`);
                        return fallback || path;
                    }
                }
                return typeof fallbackCurrent === 'string' ? fallbackCurrent : (fallback || path);
            }
            current = current[key];
        }

        return typeof current === 'string' ? current : (fallback || path);
    }, [language]);

    // Memoize context value to prevent unnecessary re-renders
    const contextValue = useMemo(() => ({
        language,
        setLanguage,
        t,
        isRTL: false, // Both EN and TH are LTR
        isLoading,
        isRemembered,
        welcomeMessage,
        dismissWelcome
    }), [language, setLanguage, t, isLoading, isRemembered, welcomeMessage, dismissWelcome]);

    return (
        <LanguageContext.Provider value={contextValue}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};

// Hook for components that only need certain translations
export const useTranslation = (namespace?: string) => {
    const { t, language } = useLanguage();

    const scopedT = useCallback((key: string, fallback?: string) => {
        const fullKey = namespace ? `${namespace}.${key}` : key;
        return t(fullKey, fallback);
    }, [t, namespace]);

    return { t: scopedT, language };
};
