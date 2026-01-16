import React from 'react';
import { useTheme } from '@/contexts/ThemeContext';

export const ThemeSwitcher: React.FC = () => {
    const { theme, setTheme } = useTheme();

    const themes = [
        { id: 'cute' as const, label: '🎀 Cute', color: '#ea4c89' },
        { id: 'professional' as const, label: '💼 Pro', color: '#2563eb' },
        { id: 'luxury' as const, label: '👑 Luxury', color: '#c5a059' },
    ];

    return (
        <div className="flex flex-col gap-2 p-3 bg-white rounded-xl shadow-lg border border-gray-100">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Theme</p>
            {themes.map((t) => (
                <button
                    key={t.id}
                    onClick={() => setTheme(t.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${theme === t.id
                            ? 'bg-gray-100 text-gray-900 shadow-sm'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                >
                    <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: t.color }}
                    />
                    {t.label}
                </button>
            ))}
        </div>
    );
};
