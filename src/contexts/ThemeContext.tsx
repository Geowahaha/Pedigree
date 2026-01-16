import React, { createContext, useContext, useState, useEffect } from 'react';

type ThemeMode = 'cute' | 'professional' | 'luxury';

interface ThemeContextType {
    theme: ThemeMode;
    setTheme: (theme: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) throw new Error('useTheme must be used within ThemeProvider');
    return context;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [theme, setThemeState] = useState<ThemeMode>(() => {
        const saved = localStorage.getItem('petdegree-theme');
        return (saved as ThemeMode) || 'cute';
    });

    const setTheme = (newTheme: ThemeMode) => {
        setThemeState(newTheme);
        localStorage.setItem('petdegree-theme', newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
    };

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

// Theme Tokens
export const themeTokens = {
    cute: {
        primary: '#ea4c89',
        bg: '#f9f8fd',
        cardBg: '#ffffff',
        cardBorder: 'rgba(234, 76, 137, 0.1)',
        cardRadius: '28px',
        cardShadow: '0 2px 12px rgba(0,0,0,0.04)',
        cardHoverShadow: '0 20px 40px -15px rgba(0,0,0,0.1)',
        fontPrimary: 'Inter',
        fontHeading: 'Playfair Display',
    },
    professional: {
        primary: '#2563eb',
        bg: '#f5f5f5',
        cardBg: '#ffffff',
        cardBorder: 'rgba(0,0,0,0.08)',
        cardRadius: '12px',
        cardShadow: '0 1px 3px rgba(0,0,0,0.08)',
        cardHoverShadow: '0 8px 16px rgba(0,0,0,0.12)',
        fontPrimary: 'system-ui',
        fontHeading: 'system-ui',
    },
    luxury: {
        primary: '#c5a059',
        bg: '#0d0c22',
        cardBg: '#1a1a1a',
        cardBorder: 'rgba(197, 160, 89, 0.2)',
        cardRadius: '16px',
        cardShadow: '0 4px 24px rgba(197, 160, 89, 0.15)',
        cardHoverShadow: '0 12px 40px rgba(197, 160, 89, 0.25)',
        fontPrimary: 'Inter',
        fontHeading: 'Playfair Display',
    },
};
