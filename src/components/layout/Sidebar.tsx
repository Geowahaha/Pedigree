/**
 * Eibpo Pedigree - Sidebar Component
 * 
 * Claude.ai-inspired collapsible sidebar with Zen design principles.
 * "Simplicity is the ultimate sophistication." - Leonardo da Vinci
 */

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

interface MenuItem {
    id: string;
    label: { en: string; th: string };
    icon: React.ReactNode;
    action: 'navigate' | 'modal' | 'external';
    target?: string;
    badge?: string;
    highlight?: boolean;
}

interface SidebarProps {
    isOpen: boolean;
    onToggle: () => void;
    onNavigate: (section: string) => void;
    onOpenRegister: () => void;
    onOpenBreedingMatch: () => void;
    onOpenProvenPair: () => void;
    onOpenMarketplace: () => void;
    onOpenPuppyComingSoon: () => void;
    activeSection?: string;
}

const Sidebar: React.FC<SidebarProps> = ({
    isOpen,
    onToggle,
    onNavigate,
    onOpenRegister,
    onOpenBreedingMatch,
    onOpenProvenPair,
    onOpenMarketplace,
    onOpenPuppyComingSoon,
    activeSection = 'home'
}) => {
    const { user } = useAuth();
    const { language } = useLanguage();
    const [hoveredItem, setHoveredItem] = useState<string | null>(null);

    const menuItems: MenuItem[] = [
        {
            id: 'register',
            label: { en: 'Register Your Pet', th: 'ลงทะเบียนสัตว์เลี้ยง' },
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                </svg>
            ),
            action: 'modal',
            target: 'register',
            highlight: true
        },
        {
            id: 'puppy-coming',
            label: { en: 'Puppy Coming Soon', th: 'ลูกหมาใกล้คลอด' },
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
            action: 'navigate',
            target: 'puppy-coming',
            badge: 'NEW'
        },
        {
            id: 'breeding-match',
            label: { en: 'Breeding Match', th: 'จับคู่ผสมพันธุ์' },
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
            ),
            action: 'modal',
            target: 'breeding-match'
        },
        {
            id: 'proven-pair',
            label: { en: 'PROVEN PAIR - Thai Ridgeback Dog Match', th: 'คู่พิสูจน์แล้ว - ไทยหลังอาน' },
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
            ),
            action: 'modal',
            target: 'proven-pair',
            badge: 'PRO'
        },
        {
            id: 'products',
            label: { en: 'Premium Pet Products', th: 'สินค้าพรีเมียม' },
            icon: (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
            ),
            action: 'navigate',
            target: 'marketplace'
        }
    ];

    const handleItemClick = (item: MenuItem) => {
        switch (item.id) {
            case 'register':
                onOpenRegister();
                break;
            case 'breeding-match':
                onOpenBreedingMatch();
                break;
            case 'proven-pair':
                onOpenProvenPair();
                break;
            case 'products':
                onOpenMarketplace();
                break;
            case 'puppy-coming':
                onOpenPuppyComingSoon();
                break;
            default:
                if (item.target) onNavigate(item.target);
        }
    };

    return (
        <>
            {/* Backdrop for mobile */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
                    onClick={onToggle}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
          fixed top-0 left-0 h-full z-50
          bg-[#1a1a1a] text-white/90
          transition-all duration-300 ease-out
          ${isOpen ? 'w-72' : 'w-0 lg:w-16'}
          overflow-hidden
          shadow-2xl shadow-black/30
          border-r border-white/5
        `}
            >
                {/* Header with Logo */}
                <div className="h-16 lg:h-20 flex items-center justify-between px-4 border-b border-white/10">
                    {isOpen ? (
                        <div className="flex items-center gap-3">
                            {/* Eibpo Logo */}
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                </svg>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-lg font-bold tracking-tight">
                                    Eibpo<span className="text-emerald-400"> Pedigree</span>
                                </span>
                                <span className="text-[10px] text-white/40 uppercase tracking-widest">Pet Registry</span>
                            </div>
                        </div>
                    ) : (
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                        </div>
                    )}
                </div>

                {/* Menu Items */}
                <nav className="p-3 space-y-1.5">
                    {menuItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => handleItemClick(item)}
                            onMouseEnter={() => setHoveredItem(item.id)}
                            onMouseLeave={() => setHoveredItem(null)}
                            className={`
                w-full flex items-center gap-3 px-3 py-3 rounded-xl
                transition-all duration-200 ease-out
                group relative
                ${item.highlight
                                    ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-400 hover:from-emerald-500/30 hover:to-teal-500/30'
                                    : 'hover:bg-white/5 text-white/70 hover:text-white'
                                }
                ${activeSection === item.target ? 'bg-white/10 text-white' : ''}
              `}
                        >
                            {/* Icon */}
                            <span className={`
                flex-shrink-0 
                ${item.highlight ? 'text-emerald-400' : 'text-white/50 group-hover:text-white/90'}
                transition-colors duration-200
              `}>
                                {item.icon}
                            </span>

                            {/* Label */}
                            {isOpen && (
                                <span className="flex-1 text-sm font-medium text-left truncate">
                                    {item.label[language as 'en' | 'th']}
                                </span>
                            )}

                            {/* Badge */}
                            {isOpen && item.badge && (
                                <span className={`
                  px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded-full
                  ${item.badge === 'NEW' ? 'bg-amber-500/20 text-amber-400' : ''}
                  ${item.badge === 'PRO' ? 'bg-purple-500/20 text-purple-400' : ''}
                `}>
                                    {item.badge}
                                </span>
                            )}

                            {/* Tooltip for collapsed state */}
                            {!isOpen && hoveredItem === item.id && (
                                <div className="
                  absolute left-full ml-2 px-3 py-2 
                  bg-[#2a2a2a] rounded-lg shadow-xl
                  text-sm text-white whitespace-nowrap
                  border border-white/10
                  z-50
                ">
                                    {item.label[language as 'en' | 'th']}
                                    {item.badge && (
                                        <span className={`
                      ml-2 px-1.5 py-0.5 text-[9px] font-bold uppercase rounded
                      ${item.badge === 'NEW' ? 'bg-amber-500/20 text-amber-400' : ''}
                      ${item.badge === 'PRO' ? 'bg-purple-500/20 text-purple-400' : ''}
                    `}>
                                            {item.badge}
                                        </span>
                                    )}
                                </div>
                            )}
                        </button>
                    ))}
                </nav>

                {/* Divider */}
                <div className="mx-4 my-4 border-t border-white/10" />

                {/* Quick Stats (shown when open) */}
                {isOpen && (
                    <div className="px-4 space-y-3">
                        <p className="text-[10px] uppercase tracking-widest text-white/40 font-medium">
                            {language === 'th' ? 'สถิติ' : 'Quick Stats'}
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                                <p className="text-2xl font-bold text-white">1,247</p>
                                <p className="text-[10px] text-white/50 uppercase tracking-wide">
                                    {language === 'th' ? 'สัตว์เลี้ยง' : 'Pets'}
                                </p>
                            </div>
                            <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                                <p className="text-2xl font-bold text-emerald-400">89</p>
                                <p className="text-[10px] text-white/50 uppercase tracking-wide">
                                    {language === 'th' ? 'ใกล้คลอด' : 'Coming'}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Toggle Button */}
                <button
                    onClick={onToggle}
                    className="
            absolute bottom-4 right-0 translate-x-1/2
            w-6 h-12 rounded-full 
            bg-[#2a2a2a] border border-white/10
            flex items-center justify-center
            hover:bg-white/10 transition-colors
            shadow-lg
          "
                >
                    <svg
                        className={`w-4 h-4 text-white/60 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            </aside>
        </>
    );
};

export default Sidebar;
