/**
 * WorkspaceLayout - "Doraemon's Pocket" Concept v2
 * 
 * 🎯 Revolutionary workspace where:
 * - Search box = Doraemon's magical pocket (fixed bottom)
 * - All content displays in the WORKSPACE area above
 * - NO popup AI chat - everything inline in workspace
 * - Dramatic animations for card transitions
 * 
 * ✨ Features:
 * - Card shake/vibration before sweep animation
 * - Dramatic rotation transitions (3D effects)
 * - Inline AI responses with rich media
 * - Family tree visualization
 * - Breeding recommendations
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Pet, Product, products } from '@/data/petData';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getPetById } from '@/lib/petsService';
import { getPublicPets, Pet as DbPet, searchPets } from '@/lib/database';

// Import modals & components (preserved)
import PetRegistrationModal from '../PetRegistrationModal';
import PedigreeModal from '../modals/PedigreeModal';
import CartModal from '../modals/CartModal';
import AuthModal from '../modals/AuthModal';
import ProductModal from '../modals/ProductModal';
import PetDetailsModal from '../modals/PetDetailsModal';
import BreederDashboard from '../BreederDashboard';
import AdminPanel from '../AdminPanel';
import BreederProfileModal from '../modals/BreederProfileModal';
import ChatManager from '../ChatManager';
import SearchSection from '../SearchSection';
import MarketplaceSection from '../MarketplaceSection';
import PuppyComingSoonSection from '../PuppyComingSoonSection';
import { EibpoMark } from '@/components/branding/EibpoLogo';
import LanguageToggle from '@/components/LanguageToggle';

// AI Brain integration - import the 'think' function
import { think as aiThink } from '@/lib/ai/petdegreeBrain';

// ============ TYPES ============
interface CartItem {
    product: Product;
    quantity: number;
}

type WorkspaceView = 'idle' | 'searching' | 'results' | 'ai-response' | 'home' | 'breeding' | 'products' | 'pedigree' | 'puppies' | 'family-tree';

interface PriorityCard {
    id: string;
    type: 'featured' | 'register' | 'puppy' | 'pet' | 'product' | 'stats' | 'success' | 'announcement' | 'ai-tip' | 'family-tree' | 'breeding';
    title: string;
    subtitle?: string;
    image?: string;
    badge?: string;
    badgeColor?: string;
    action?: () => void;
}

interface AIMessage {
    id: string;
    type: 'user' | 'ai';
    text: string;
    data?: any;
    actions?: Array<{ label: string; action: () => void }>;
    timestamp: Date;
}

const ADMIN_ALLOWLIST = new Set(['geowahaha@gmail.com', 'truesaveus@hotmail.com']);

// ============ CSS KEYFRAMES (Inline Styles) ============
const shakeKeyframes = `
@keyframes shake {
  0%, 100% { transform: translateX(0) rotate(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-3px) rotate(-1deg); }
  20%, 40%, 60%, 80% { transform: translateX(3px) rotate(1deg); }
}
@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 0 0 rgba(212, 165, 116, 0); }
  50% { box-shadow: 0 0 30px 8px rgba(212, 165, 116, 0.4); }
}
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-12px); }
}
@keyframes card-entrance {
  0% { 
    opacity: 0; 
    transform: scale(0.5) rotateY(-30deg) rotateX(15deg) translateY(50px); 
    filter: blur(10px);
  }
  50% {
    filter: blur(2px);
  }
  100% { 
    opacity: 1; 
    transform: scale(1) rotateY(0) rotateX(0) translateY(0); 
    filter: blur(0);
  }
}
@keyframes typing-dots {
  0%, 20% { opacity: 0.3; }
  50% { opacity: 1; }
  80%, 100% { opacity: 0.3; }
}
@keyframes spiral-out {
  0% { 
    transform: scale(1) rotate(0deg) translateY(0);
    opacity: 1;
  }
  100% { 
    transform: scale(0) rotate(360deg) translateY(-200px);
    opacity: 0;
  }
}
@keyframes card-wobble {
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(-2deg) scale(0.98); }
  50% { transform: rotate(2deg) scale(1.02); }
  75% { transform: rotate(-1deg) scale(0.99); }
}
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
@keyframes bounce-in {
  0% { transform: scale(0); opacity: 0; }
  50% { transform: scale(1.1); }
  70% { transform: scale(0.95); }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes ripple {
  0% { transform: scale(0); opacity: 0.6; }
  100% { transform: scale(4); opacity: 0; }
}
@keyframes parallax-float {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  25% { transform: translateY(-5px) rotate(1deg); }
  50% { transform: translateY(-8px) rotate(0deg); }
  75% { transform: translateY(-3px) rotate(-1deg); }
}
@keyframes card-pop {
  0% { transform: scale(1); }
  50% { transform: scale(1.08); }
  100% { transform: scale(1); }
}
@keyframes sparkle-burst {
  0% { transform: scale(0) rotate(0deg); opacity: 1; }
  50% { transform: scale(1.5) rotate(180deg); opacity: 0.8; }
  100% { transform: scale(0) rotate(360deg); opacity: 0; }
}
@keyframes particle-float {
  0% { transform: translateY(0) translateX(0) scale(1); opacity: 1; }
  25% { transform: translateY(-20px) translateX(10px) scale(0.8); opacity: 0.8; }
  50% { transform: translateY(-40px) translateX(-5px) scale(0.6); opacity: 0.5; }
  75% { transform: translateY(-60px) translateX(5px) scale(0.4); opacity: 0.3; }
  100% { transform: translateY(-80px) translateX(0) scale(0.2); opacity: 0; }
}
@keyframes confetti-fall {
  0% { transform: translateY(-100%) rotate(0deg); opacity: 1; }
  100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
}
@keyframes glow-pulse {
  0%, 100% { box-shadow: 0 0 5px rgba(91, 188, 196, 0.3); }
  50% { box-shadow: 0 0 25px rgba(91, 188, 196, 0.6), 0 0 50px rgba(139, 149, 109, 0.3); }
}
@keyframes star-twinkle {
  0%, 100% { opacity: 0.3; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.2); }
}
`;

// ============ TABLE CARD (Vertical Portrait Card with Micro-interactions) ============
const TableCard: React.FC<{
    card: PriorityCard;
    style?: React.CSSProperties;
    className?: string;
    isStacked?: boolean;
    zIndex?: number;
    onAction?: () => void;
}> = ({ card, style, className = '', isStacked = false, zIndex = 1, onAction }) => {
    const [ripple, setRipple] = useState<{ x: number; y: number } | null>(null);
    const [isHovered, setIsHovered] = useState(false);

    const getCardIcon = () => {
        switch (card.type) {
            case 'register': return '➕';
            case 'puppy': return '🐕';
            case 'pet': return '🐾';
            case 'product': return '💎';
            case 'stats': return '📊';
            case 'success': return '🏆';
            case 'announcement': return '📢';
            case 'ai-tip': return '🤖';
            case 'family-tree': return '🌳';
            case 'breeding': return '❤️';
            default: return '🎯';
        }
    };

    // LUXURY THEME: Black & Gold color palette
    const getCardBgColor = () => {
        switch (card.type) {
            case 'register': return 'bg-gradient-to-b from-[#C5A059] to-[#A88945] border-[#8B7355]'; // Gold
            case 'puppy': return 'bg-gradient-to-b from-[#2A2A2A] to-[#1A1A1A] border-[#C5A059]/30'; // Dark with gold border
            case 'pet': return 'bg-gradient-to-b from-[#2A2A2A] to-[#1A1A1A] border-[#C5A059]/20'; // Dark
            case 'product': return 'bg-gradient-to-b from-[#3A3A3A] to-[#2A2A2A] border-[#C5A059]/25'; // Medium dark
            case 'stats': return 'bg-gradient-to-b from-[#C5A059]/20 to-[#1A1A1A] border-[#C5A059]/40'; // Gold tint
            case 'success': return 'bg-gradient-to-b from-[#2A2A2A] to-[#1A1A1A] border-[#C5A059]/30'; // Dark
            case 'announcement': return 'bg-gradient-to-b from-[#C5A059] to-[#8B7355] border-[#D4C4B5]'; // Gold
            case 'ai-tip': return 'bg-gradient-to-b from-[#3A3A3A] to-[#2A2A2A] border-[#C5A059]/30'; // Dark
            case 'family-tree': return 'bg-gradient-to-b from-[#2A2A2A] to-[#1A1A1A] border-[#C5A059]/25'; // Dark
            case 'breeding': return 'bg-gradient-to-b from-[#C5A059]/30 to-[#1A1A1A] border-[#C5A059]/50'; // Gold tint
            default: return 'bg-gradient-to-b from-[#2A2A2A] to-[#1A1A1A] border-[#C5A059]/15'; // Default dark
        }
    };

    // Text color - use gold for dark cards, dark for gold cards
    const getTextColor = () => {
        if (card.type === 'register' || card.type === 'announcement') {
            return 'text-[#0A0A0A] drop-shadow-sm'; // Dark text on gold cards
        }
        return 'text-[#F5F5F0]'; // Light text on dark cards
    };

    // Handle click with ripple effect
    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();

        // Create ripple at click position
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setRipple({ x, y });

        // Clear ripple after animation
        setTimeout(() => setRipple(null), 600);

        onAction?.();
    };

    return (
        <div
            onClick={handleClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
                ...style,
                zIndex: isHovered ? 50 : zIndex,
                width: isStacked ? '90px' : '160px',
                height: isStacked ? '130px' : '220px',
            }}
            className={`
                absolute cursor-pointer select-none
                ${getCardBgColor()}
                shadow-xl
                transform transition-all duration-300 ease-out
                hover:scale-105 hover:-translate-y-2
                hover:shadow-2xl hover:shadow-[#C5A059]/20
                border-2
                active:scale-95 active:shadow-md
                motion-reduce:transition-none motion-reduce:hover:transform-none
                ${isHovered && !isStacked ? 'animate-[parallax-float_2s_ease-in-out_infinite]' : ''}
                ${className}
            `}
        >
            {/* Ripple Effect */}
            {ripple && (
                <span
                    className="absolute rounded-full bg-white/40 animate-[ripple_0.6s_ease-out] pointer-events-none"
                    style={{
                        left: ripple.x,
                        top: ripple.y,
                        width: 20,
                        height: 20,
                        marginLeft: -10,
                        marginTop: -10,
                    }}
                />
            )}

            {/* Sparkle Particles on Hover */}
            {isHovered && !isStacked && (
                <>
                    {[...Array(6)].map((_, i) => (
                        <span
                            key={i}
                            className="absolute pointer-events-none animate-[particle-float_1s_ease-out_forwards]"
                            style={{
                                left: `${20 + Math.random() * 60}%`,
                                bottom: `${10 + Math.random() * 30}%`,
                                animationDelay: `${i * 100}ms`,
                            }}
                        >
                            ✨
                        </span>
                    ))}
                </>
            )}

            {/* Glow Effect on Hover */}
            {isHovered && !isStacked && (
                <div className="absolute inset-0 rounded-xl animate-[glow-pulse_1.5s_ease-in-out_infinite] pointer-events-none" />
            )}
            {/* Card Face */}
            <div className="w-full h-full flex flex-col items-center justify-center p-2 relative overflow-hidden">
                {/* Badge */}
                {card.badge && !isStacked && (
                    <span className={`absolute top-2 right-2 px-2 py-0.5 ${card.badgeColor || 'bg-white/90'} text-[8px] font-bold uppercase rounded-full shadow-lg text-gray-800`}>
                        {card.badge}
                    </span>
                )}

                {/* Image or Icon */}
                {card.image && !isStacked ? (
                    <div className="w-full h-28 mb-2 rounded-lg overflow-hidden shadow-inner">
                        <img
                            src={card.image}
                            alt={card.title}
                            className="w-full h-full object-cover"
                        />
                    </div>
                ) : (
                    <div className={`${isStacked ? 'text-3xl' : 'text-4xl'} mb-2`}>
                        {getCardIcon()}
                    </div>
                )}

                {/* Title */}
                {!isStacked && (
                    <>
                        <h4 className={`font-bold text-center text-sm leading-tight drop-shadow-sm ${getTextColor()}`}>
                            {card.title}
                        </h4>
                        {card.subtitle && (
                            <p className={`text-xs text-center mt-1 line-clamp-2 ${getTextColor()} opacity-70`}>
                                {card.subtitle}
                            </p>
                        )}
                    </>
                )}
            </div>

            {/* Card texture/shine effect */}
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 via-transparent to-black/10 pointer-events-none" />
        </div>
    );
};

// ============ STACKED DECK (Top Row - Fanned Cards) ============
const StackedDeck: React.FC<{
    cards: PriorityCard[];
    onCardClick: (card: PriorityCard) => void;
}> = ({ cards, onCardClick }) => {
    // Create positions for fanned deck (like cards spread on table)
    const getStackedPosition = (index: number, total: number) => {
        const centerX = 50; // Center percentage
        const spreadWidth = Math.min(70, total * 3); // Spread width based on card count
        const startX = centerX - spreadWidth / 2;
        const xOffset = (spreadWidth / Math.max(total - 1, 1)) * index;

        // Slight arc effect
        const arcHeight = 5;
        const normalizedPos = (index / (total - 1)) - 0.5;
        const yOffset = Math.abs(normalizedPos) * arcHeight * 2;

        // Random slight rotation for natural feel
        const baseRotation = (index - total / 2) * 2;
        const randomRotation = (Math.sin(index * 17) * 3);

        return {
            left: `${startX + xOffset}%`,
            top: `${30 + yOffset}%`,
            transform: `translateX(-50%) rotate(${baseRotation + randomRotation}deg)`,
        };
    };

    return (
        <div className="relative w-full h-48 mb-8">
            {/* Deck label */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 text-white/40 text-xs font-medium tracking-wider z-10">
                📚 {cards.length} CARDS
            </div>

            {/* Stacked cards */}
            {cards.map((card, index) => (
                <TableCard
                    key={card.id}
                    card={card}
                    isStacked={true}
                    zIndex={index + 1}
                    style={getStackedPosition(index, cards.length)}
                    onAction={() => onCardClick(card)}
                />
            ))}
        </div>
    );
};

// ============ FEATURED CARDS (Bottom Row - 5 Cards Organic Layout) ============
const FeaturedCards: React.FC<{
    cards: PriorityCard[];
    animationState: 'idle' | 'shaking' | 'exiting' | 'entering';
    onCardClick: (card: PriorityCard) => void;
}> = ({ cards, animationState, onCardClick }) => {
    // Fixed positions for 5 cards with organic, natural feel (like cards laid on table)
    const cardPositions = [
        { left: '5%', bottom: '8%', rotation: -12, zIndex: 5 },
        { left: '22%', bottom: '15%', rotation: 5, zIndex: 4 },
        { left: '40%', bottom: '6%', rotation: -3, zIndex: 3 },
        { left: '58%', bottom: '12%', rotation: 7, zIndex: 2 },
        { left: '76%', bottom: '4%', rotation: -8, zIndex: 1 },
    ];

    const getAnimationStyle = (index: number) => {
        switch (animationState) {
            case 'shaking':
                return {
                    animation: `shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) ${index * 40}ms`,
                };
            case 'exiting':
                const exitAngle = (index % 2 === 0 ? 1 : -1) * (25 + index * 12);
                const exitX = (index - 2) * 120;
                return {
                    transform: `rotate(${exitAngle}deg) translateX(${exitX}px) translateY(-400px) scale(0.3)`,
                    opacity: 0,
                    transition: `all 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55) ${index * 80}ms`,
                };
            case 'entering':
                return {
                    animation: `card-entrance 0.7s cubic-bezier(0.34, 1.56, 0.64, 1) ${index * 100}ms forwards`,
                    opacity: 0,
                };
            default:
                return {};
        }
    };

    return (
        <div className="relative w-full h-72 mt-4">
            {/* Table surface hint with teal gradient */}
            <div className="absolute inset-x-4 bottom-0 h-2 bg-gradient-to-r from-transparent via-[#5BBCC4]/20 to-transparent rounded-full" />

            {/* Featured cards with organic positioning - 5 cards */}
            {cards.slice(0, 5).map((card, index) => {
                const pos = cardPositions[index];
                return (
                    <div
                        key={card.id}
                        style={{
                            position: 'absolute',
                            left: pos.left,
                            bottom: pos.bottom,
                            transform: `rotate(${pos.rotation}deg)`,
                            zIndex: pos.zIndex + (animationState === 'idle' ? 0 : 10),
                            ...getAnimationStyle(index),
                        }}
                    >
                        <TableCard
                            card={card}
                            isStacked={false}
                            zIndex={pos.zIndex}
                            onAction={() => onCardClick(card)}
                            className="hover:!rotate-0"
                        />
                    </div>
                );
            })}
        </div>
    );
};

// ============ CARD TABLE LAYOUT (Main Component) ============
const CardTableLayout: React.FC<{
    allCards: PriorityCard[];
    featuredCards: PriorityCard[];
    animationState: 'idle' | 'shaking' | 'exiting' | 'entering';
    onCardAction: (card: PriorityCard) => void;
}> = ({ allCards, featuredCards, animationState, onCardAction }) => {
    return (
        <div className="px-4 py-6">
            {/* Keyframe styles */}
            <style dangerouslySetInnerHTML={{ __html: shakeKeyframes }} />

            {/* Stacked Deck (Top - all cards from system) */}
            <StackedDeck
                cards={allCards}
                onCardClick={onCardAction}
            />

            {/* Featured Cards (Bottom - 4 cards with animations) */}
            <FeaturedCards
                cards={featuredCards}
                animationState={animationState}
                onCardClick={onCardAction}
            />
        </div>
    );
};

// ============ AI RESPONSE COMPONENT (Inline in Workspace) ============
const AIResponseView: React.FC<{
    messages: AIMessage[];
    isTyping: boolean;
    onAction?: (action: string) => void;
    onViewPet?: (pet: Pet) => void;
    searchResults?: Pet[];
}> = ({ messages, isTyping, onAction, onViewPet, searchResults }) => {
    const { language } = useLanguage();

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Messages */}
            {messages.map((msg, index) => (
                <div
                    key={msg.id}
                    className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
                    style={{ animationDelay: `${index * 100}ms` }}
                >
                    <div
                        className={`max-w-2xl rounded-2xl p-4 ${msg.type === 'user'
                            ? 'bg-[#D4A574] text-[#1E1E1E]'
                            : 'bg-[#2D2D2D] border border-white/10 text-white/90'
                            }`}
                    >
                        <p className="whitespace-pre-wrap">{msg.text}</p>

                        {/* Actions */}
                        {msg.actions && msg.actions.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-4">
                                {msg.actions.map((action, i) => (
                                    <button
                                        key={i}
                                        onClick={action.action}
                                        className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-sm font-medium transition-colors"
                                    >
                                        {action.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
                <div className="flex justify-start">
                    <div className="bg-[#2D2D2D] border border-white/10 rounded-2xl p-4 flex items-center gap-2">
                        <span className="text-2xl">🐾</span>
                        <div className="flex gap-1">
                            <div className="w-2 h-2 bg-[#D4A574] rounded-full animate-[typing-dots_1.4s_ease-in-out_infinite]" style={{ animationDelay: '0ms' }} />
                            <div className="w-2 h-2 bg-[#D4A574] rounded-full animate-[typing-dots_1.4s_ease-in-out_infinite]" style={{ animationDelay: '200ms' }} />
                            <div className="w-2 h-2 bg-[#D4A574] rounded-full animate-[typing-dots_1.4s_ease-in-out_infinite]" style={{ animationDelay: '400ms' }} />
                        </div>
                    </div>
                </div>
            )}

            {/* Search Results Grid */}
            {searchResults && searchResults.length > 0 && (
                <div className="mt-8">
                    <h3 className="text-lg font-bold text-white/90 mb-4 flex items-center gap-2">
                        🔍 {language === 'th' ? 'ผลการค้นหา' : 'Search Results'}
                        <span className="text-sm font-normal text-white/50">({searchResults.length})</span>
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {searchResults.map((pet, index) => (
                            <div
                                key={pet.id}
                                onClick={() => onViewPet?.(pet)}
                                className="group bg-[#2D2D2D] rounded-xl overflow-hidden border border-white/10 hover:border-[#D4A574]/50 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                {pet.image && (
                                    <div className="aspect-square overflow-hidden">
                                        <img
                                            src={pet.image}
                                            alt={pet.name}
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                        />
                                    </div>
                                )}
                                <div className="p-3">
                                    <h4 className="font-bold text-white/90 truncate">{pet.name}</h4>
                                    <p className="text-xs text-white/50">{pet.breed}</p>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className={`text-xs ${pet.gender === 'male' ? 'text-blue-400' : 'text-pink-400'}`}>
                                            {pet.gender === 'male' ? '♂' : '♀'}
                                        </span>
                                        {pet.healthCertified && (
                                            <span className="text-xs text-green-400">✓ Health</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// ============ MAIN WORKSPACE LAYOUT ============
const WorkspaceLayout: React.FC = () => {
    const { user, savedCart, syncCart } = useAuth();
    const { language, setLanguage } = useLanguage();
    const isAdminUser = Boolean(user && (user.profile?.role === 'admin' || ADMIN_ALLOWLIST.has(user.email)));

    // ========== STATE ==========
    const [workspaceView, setWorkspaceView] = useState<WorkspaceView>('idle');
    const [animationState, setAnimationState] = useState<'idle' | 'shaking' | 'exiting' | 'entering'>('idle');
    const [searchValue, setSearchValue] = useState('');
    const [currentCardSet, setCurrentCardSet] = useState(0);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [refreshPets, setRefreshPets] = useState(0);
    const [allPets, setAllPets] = useState<Pet[]>([]);

    // AI Response state
    const [aiMessages, setAiMessages] = useState<AIMessage[]>([]);
    const [isAiTyping, setIsAiTyping] = useState(false);
    const [searchResults, setSearchResults] = useState<Pet[]>([]);

    // Modal states (preserved)
    const [registerModalOpen, setRegisterModalOpen] = useState(false);
    const [pedigreeModalOpen, setPedigreeModalOpen] = useState(false);
    const [cartModalOpen, setCartModalOpen] = useState(false);
    const [authModalOpen, setAuthModalOpen] = useState(false);
    const [productModalOpen, setProductModalOpen] = useState(false);
    const [petDetailsModalOpen, setPetDetailsModalOpen] = useState(false);
    const [dashboardOpen, setDashboardOpen] = useState(false);
    const [adminPanelOpen, setAdminPanelOpen] = useState(false);
    const [breederProfileOpen, setBreederProfileOpen] = useState(false);
    const [currentBreederId, setCurrentBreederId] = useState<string | null>(null);

    // Selected items
    const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

    // Refs
    const rotationTimer = useRef<NodeJS.Timeout | null>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // ========== INJECT CSS KEYFRAMES ==========
    useEffect(() => {
        const styleEl = document.createElement('style');
        styleEl.textContent = shakeKeyframes;
        document.head.appendChild(styleEl);
        return () => { document.head.removeChild(styleEl); };
    }, []);

    // ========== CONVERT DB PET ==========
    const convertDbPet = (dbPet: DbPet): Pet => ({
        id: dbPet.id,
        name: dbPet.name,
        breed: dbPet.breed,
        type: dbPet.type || 'dog',
        birthDate: dbPet.birth_date,
        gender: dbPet.gender,
        image: dbPet.image_url || '',
        color: dbPet.color || '',
        registrationNumber: dbPet.registration_number || undefined,
        healthCertified: dbPet.health_certified,
        location: dbPet.location || '',
        owner: dbPet.owner?.full_name || dbPet.owner_name || 'Unknown',
        owner_id: dbPet.owner_id,
        ownership_status: dbPet.ownership_status,
        claimed_by: dbPet.claimed_by,
        claim_date: dbPet.claim_date,
        verification_evidence: dbPet.verification_evidence,
        parentIds: dbPet.pedigree ? {
            sire: dbPet.pedigree.sire_id || undefined,
            dam: dbPet.pedigree.dam_id || undefined
        } : undefined
    });

    // ========== LOAD PETS ==========
    useEffect(() => {
        const loadPets = async () => {
            try {
                const dbPets = await getPublicPets();
                setAllPets(dbPets.slice(0, 12).map(convertDbPet));
            } catch (error) {
                console.error('Failed to load pets:', error);
            }
        };
        loadPets();
    }, [refreshPets]);

    // ========== GENERATE ALL CARDS (For Stacked Deck + Featured Display) ==========
    const generateAllCards = useCallback((): { allCards: PriorityCard[], featuredCards: PriorityCard[] } => {
        // Base feature cards with new theme colors
        const featureCards: PriorityCard[] = [
            { id: '1', type: 'featured', title: language === 'th' ? '✨ ยินดีต้อนรับ!' : '✨ Welcome!', subtitle: language === 'th' ? 'ระบบจัดการสายพันธุ์ AI' : 'AI-Powered Pedigree', badge: 'NEW', badgeColor: 'bg-[#5BBCC4]' },
            { id: '2', type: 'register', title: language === 'th' ? 'ลงทะเบียน' : 'Register Pet', subtitle: language === 'th' ? 'เพิ่มสัตว์เลี้ยงใหม่' : 'Add your pet to registry', action: () => handleRegisterClick() },
            { id: '3', type: 'stats', title: '1,247', subtitle: language === 'th' ? 'สัตว์เลี้ยงลงทะเบียน' : 'Pets Registered' },
            { id: '4', type: 'puppy', title: language === 'th' ? 'ลูกหมาใกล้คลอด' : 'Puppies Coming', subtitle: '89 litters', badge: 'HOT', badgeColor: 'bg-[#D4A574]', action: () => transitionToView('puppies') },
            { id: '5', type: 'ai-tip', title: language === 'th' ? 'AI แนะนำ' : 'AI Tip', subtitle: language === 'th' ? 'ถามได้ทุกเรื่องสัตว์เลี้ยง' : 'Ask anything about pets' },
            { id: '6', type: 'family-tree', title: language === 'th' ? 'สายพันธุ์' : 'Family Tree', subtitle: language === 'th' ? 'ดูแผนผังบรรพบุรุษ' : 'View ancestry charts', action: () => transitionToView('family-tree') },
            { id: 'announcement', type: 'announcement', title: language === 'th' ? 'อัพเดทใหม่!' : 'New Update!', subtitle: language === 'th' ? 'AI Breeding Match พร้อมใช้งาน' : 'AI Breeding Match available', badge: 'NEW', badgeColor: 'bg-[#8B956D]' },
            { id: 'success-1', type: 'success', title: language === 'th' ? '156 คู่สำเร็จ' : '156 Matches', subtitle: language === 'th' ? 'คู่ผสมพันธุ์ที่สำเร็จ' : 'Successful pairings' },
            // NEW: Breeding recommendations card
            { id: 'breeding-rec', type: 'breeding', title: language === 'th' ? 'คู่แนะนำ' : 'Breeding Rec', subtitle: language === 'th' ? 'AI ช่วยหาคู่ที่เหมาะสม' : 'AI-powered matching', badge: 'AI', badgeColor: 'bg-[#5BBCC4]', action: () => transitionToView('breeding') },
            { id: 'products-menu', type: 'product', title: language === 'th' ? 'สินค้า' : 'Products', subtitle: language === 'th' ? 'อาหารและอุปกรณ์' : 'Food & supplies', action: () => transitionToView('products') },
        ];

        // Pet cards from database
        const petCards: PriorityCard[] = allPets.map((pet) => ({
            id: `pet-${pet.id}`,
            type: 'pet' as const,
            title: pet.name,
            subtitle: `${pet.breed} • ${pet.gender === 'male' ? '♂' : '♀'}`,
            image: pet.image,
            action: () => handleViewPetDetails(pet)
        }));

        // Product cards
        const productCards: PriorityCard[] = products.slice(0, 4).map((product, i) => ({
            id: `product-${i}`,
            type: 'product' as const,
            title: product.name.substring(0, 20),
            subtitle: `฿${product.price.toLocaleString()}`,
            image: product.image,
            action: () => handleQuickView(product)
        }));

        // All cards for stacked deck (combine all types)
        const allCards = [...featureCards, ...petCards, ...productCards];

        // Featured cards: rotate through sets of 5 (changed from 4)
        const totalCards = allCards.length;
        const startIndex = (currentCardSet * 5) % totalCards;
        const featuredCards = [
            allCards[startIndex % totalCards],
            allCards[(startIndex + 1) % totalCards],
            allCards[(startIndex + 2) % totalCards],
            allCards[(startIndex + 3) % totalCards],
            allCards[(startIndex + 4) % totalCards],
        ];

        return { allCards, featuredCards };
    }, [currentCardSet, language, allPets, products]);

    // ========== CARD ROTATION (20 seconds) with DRAMATIC ANIMATION ==========
    useEffect(() => {
        if (workspaceView === 'idle' && animationState === 'idle') {
            rotationTimer.current = setInterval(() => {
                // Step 1: Shake
                setAnimationState('shaking');

                setTimeout(() => {
                    // Step 2: Exit (sweep away)
                    setAnimationState('exiting');

                    setTimeout(() => {
                        // Step 3: Change cards
                        setCurrentCardSet(prev => prev + 1);
                        // Step 4: Enter (dramatic entrance)
                        setAnimationState('entering');

                        setTimeout(() => {
                            setAnimationState('idle');
                        }, 800);
                    }, 800);
                }, 500);
            }, 20000);

            return () => {
                if (rotationTimer.current) clearInterval(rotationTimer.current);
            };
        }
    }, [workspaceView, animationState]);

    // ========== TRANSITION TO VIEW with DRAMATIC ANIMATION ==========
    const transitionToView = useCallback((newView: WorkspaceView) => {
        if (workspaceView === newView) return;

        // Shake first
        setAnimationState('shaking');

        setTimeout(() => {
            // Then sweep away
            setAnimationState('exiting');

            setTimeout(() => {
                setWorkspaceView(newView);
                setAnimationState('entering');

                setTimeout(() => {
                    setAnimationState('idle');
                }, 600);
            }, 600);
        }, 400);
    }, [workspaceView]);

    // ========== SEARCH HANDLER (AI in Workspace) ==========
    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchValue.trim()) return;

        const query = searchValue.trim();

        // Add user message
        const userMessage: AIMessage = {
            id: Date.now().toString(),
            type: 'user',
            text: query,
            timestamp: new Date(),
        };
        setAiMessages([userMessage]);
        setSearchValue('');

        // Shake → Sweep → Show AI response
        setAnimationState('shaking');

        setTimeout(async () => {
            setAnimationState('exiting');

            setTimeout(async () => {
                setWorkspaceView('ai-response');
                setAnimationState('idle');
                setIsAiTyping(true);

                try {
                    // Use the Eibpo Brain to process query
                    const response = await aiThink(query);

                    // Also search for pets if applicable
                    let pets: Pet[] = [];
                    if (query.length >= 2) {
                        try {
                            const dbPets = await searchPets(query);
                            pets = dbPets.slice(0, 8).map(convertDbPet);
                            setSearchResults(pets);
                        } catch (err) {
                            console.error('Search error:', err);
                        }
                    }

                    setIsAiTyping(false);

                    const aiMessage: AIMessage = {
                        id: (Date.now() + 1).toString(),
                        type: 'ai',
                        text: response.text,
                        data: response.data,
                        actions: [
                            { label: language === 'th' ? '🏠 กลับหน้าหลัก' : '🏠 Back Home', action: () => transitionToView('idle') },
                            { label: language === 'th' ? '🔍 ค้นหาเพิ่มเติม' : '🔍 Search More', action: () => searchInputRef.current?.focus() },
                        ],
                        timestamp: new Date(),
                    };

                    setAiMessages(prev => [...prev, aiMessage]);
                } catch (error) {
                    setIsAiTyping(false);
                    const errorMessage: AIMessage = {
                        id: (Date.now() + 1).toString(),
                        type: 'ai',
                        text: language === 'th' ? 'ขออภัย เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง' : 'Sorry, an error occurred. Please try again.',
                        timestamp: new Date(),
                    };
                    setAiMessages(prev => [...prev, errorMessage]);
                }
            }, 600);
        }, 400);
    };

    // ========== EVENT LISTENERS ==========
    useEffect(() => {
        const handleOpenBreeder = (e: any) => {
            const userId = e.detail?.ownerId;
            if (userId) {
                setCurrentBreederId(userId);
                setBreederProfileOpen(true);
            }
        };

        const handleOpenPetDetails = (e: any) => {
            const pet = e.detail?.pet;
            if (pet) {
                setSelectedPet(pet);
                setPetDetailsModalOpen(true);
            }
        };

        const handleOpenRegister = () => {
            if (!user) setAuthModalOpen(true);
            else setRegisterModalOpen(true);
        };

        window.addEventListener('openBreederProfile', handleOpenBreeder);
        window.addEventListener('openPetDetails', handleOpenPetDetails);
        window.addEventListener('openRegisterPet', handleOpenRegister);

        return () => {
            window.removeEventListener('openBreederProfile', handleOpenBreeder);
            window.removeEventListener('openPetDetails', handleOpenPetDetails);
            window.removeEventListener('openRegisterPet', handleOpenRegister);
        };
    }, [user]);

    // ========== CART FUNCTIONS ==========
    useEffect(() => {
        if (user && savedCart.length > 0) {
            const loadedCart: CartItem[] = savedCart
                .map(item => {
                    const product = products.find(p => p.id === item.productId);
                    if (product) return { product, quantity: item.quantity };
                    return null;
                })
                .filter((item): item is CartItem => item !== null);
            setCart(loadedCart);
        }
    }, [user, savedCart]);

    const syncCartToDb = useCallback(async (cartItems: CartItem[]) => {
        if (user) {
            const cartData = cartItems.map(item => ({ productId: item.product.id, quantity: item.quantity }));
            await syncCart(cartData);
        }
    }, [user, syncCart]);

    const addToCart = (product: Product, quantity: number = 1) => {
        setCart(prev => {
            const existing = prev.find(item => item.product.id === product.id);
            let newCart: CartItem[];
            if (existing) {
                newCart = prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + quantity } : item);
            } else {
                newCart = [...prev, { product, quantity }];
            }
            syncCartToDb(newCart);
            return newCart;
        });
    };

    const updateCartQuantity = (productId: string, quantity: number) => {
        if (quantity <= 0) return removeFromCart(productId);
        setCart(prev => {
            const newCart = prev.map(item => item.product.id === productId ? { ...item, quantity } : item);
            syncCartToDb(newCart);
            return newCart;
        });
    };

    const removeFromCart = (productId: string) => {
        setCart(prev => {
            const newCart = prev.filter(item => item.product.id !== productId);
            syncCartToDb(newCart);
            return newCart;
        });
    };

    const clearCart = () => {
        setCart([]);
        syncCartToDb([]);
    };

    // ========== HANDLERS ==========
    const handleViewPedigree = (pet: Pet) => {
        setSelectedPet(pet);
        setPedigreeModalOpen(true);
    };

    const handleViewPetDetails = (pet: Pet) => {
        setSelectedPet(pet);
        setPetDetailsModalOpen(true);
    };

    const handleQuickView = (product: Product) => {
        setSelectedProduct(product);
        setProductModalOpen(true);
    };

    const handleRegisterClick = () => {
        if (!user) setAuthModalOpen(true);
        else setRegisterModalOpen(true);
    };

    const handlePetRegistered = () => setRefreshPets(prev => prev + 1);

    const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

    // ========== RENDER WORKSPACE CONTENT ==========
    const renderWorkspaceContent = () => {
        const { allCards, featuredCards } = generateAllCards();

        switch (workspaceView) {
            case 'idle':
                return (
                    <CardTableLayout
                        allCards={allCards}
                        featuredCards={featuredCards}
                        animationState={animationState}
                        onCardAction={(card) => card.action?.()}
                    />
                );

            case 'ai-response':
                return (
                    <AIResponseView
                        messages={aiMessages}
                        isTyping={isAiTyping}
                        searchResults={searchResults}
                        onViewPet={handleViewPetDetails}
                    />
                );

            case 'puppies':
                return (
                    <div className={`p-6 ${animationState === 'exiting' ? 'opacity-0 transform scale-95' : 'animate-in fade-in duration-500'} transition-all`}>
                        <button onClick={() => transitionToView('idle')} className="mb-4 text-white/50 hover:text-white flex items-center gap-2 transition-colors group">
                            <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            {language === 'th' ? 'กลับ' : 'Back'}
                        </button>
                        <PuppyComingSoonSection onViewDetails={handleViewPetDetails} onRequireAuth={() => setAuthModalOpen(true)} />
                    </div>
                );

            case 'products':
                return (
                    <div className={`p-6 ${animationState === 'exiting' ? 'opacity-0 transform scale-95' : 'animate-in fade-in duration-500'} transition-all`}>
                        <button onClick={() => transitionToView('idle')} className="mb-4 text-white/50 hover:text-white flex items-center gap-2 transition-colors group">
                            <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            {language === 'th' ? 'กลับ' : 'Back'}
                        </button>
                        <MarketplaceSection onAddToCart={addToCart} onQuickView={handleQuickView} />
                    </div>
                );

            case 'breeding':
                return (
                    <div className={`p-6 ${animationState === 'exiting' ? 'opacity-0 transform scale-95' : 'animate-in fade-in duration-500'} transition-all`}>
                        <button onClick={() => transitionToView('idle')} className="mb-4 text-white/50 hover:text-white flex items-center gap-2 transition-colors group">
                            <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            {language === 'th' ? 'กลับ' : 'Back'}
                        </button>
                        <SearchSection onViewPedigree={handleViewPedigree} onViewDetails={handleViewPetDetails} onRequireAuth={() => setAuthModalOpen(true)} />
                    </div>
                );

            default:
                return null;
        }
    };

    // ========== MAIN RENDER ==========
    return (
        <div className="min-h-screen bg-[#0A0A0A] text-[#F5F5F0] flex">
            {/* ===== SIDEBAR (Icon-Only) - Luxury Black ===== */}
            <aside className="hidden md:flex w-14 bg-gradient-to-b from-[#1A1A1A] to-[#0D0D0D] border-r border-[#C5A059]/10 flex-col items-center py-4 gap-2 fixed left-0 top-0 bottom-0 z-40 shadow-lg">
                {/* Logo - Gold Accent */}
                <div className="w-10 h-10 border border-[#C5A059]/40 flex items-center justify-center mb-4 relative">
                    <div className="absolute inset-0 border border-[#C5A059]/20 rotate-45" />
                    <EibpoMark className="w-5 h-5 text-[#C5A059]" />
                </div>

                <SidebarIconButton icon={<HomeIcon />} active={workspaceView === 'idle'} tooltip={language === 'th' ? 'หน้าแรก' : 'Home'} onClick={() => transitionToView('idle')} />
                <SidebarIconButton icon={<PlusIcon />} highlight tooltip={language === 'th' ? 'ลงทะเบียน' : 'Register'} onClick={handleRegisterClick} />
                <SidebarIconButton icon={<SearchIcon />} active={workspaceView === 'breeding'} tooltip={language === 'th' ? 'ค้นหา' : 'Search'} onClick={() => transitionToView('breeding')} />
                <SidebarIconButton icon={<ClockIcon />} active={workspaceView === 'puppies'} tooltip={language === 'th' ? 'ลูกหมา' : 'Puppies'} onClick={() => transitionToView('puppies')} />
                <SidebarIconButton icon={<ShopIcon />} active={workspaceView === 'products'} tooltip={language === 'th' ? 'สินค้า' : 'Products'} onClick={() => transitionToView('products')} />

                <div className="flex-1" />

                <SidebarIconButton
                    icon={<CartIconWithBadge count={cartCount} />}
                    tooltip={language === 'th' ? 'ตะกร้า' : 'Cart'}
                    onClick={() => setCartModalOpen(true)}
                />
                {isAdminUser && (
                    <SidebarIconButton
                        icon={<AdminIcon />}
                        active={adminPanelOpen}
                        tooltip="Admin Panel"
                        onClick={() => setAdminPanelOpen(true)}
                    />
                )}
                <SidebarIconButton
                    icon={user ? <UserAvatar name={user.profile?.full_name || user.email} /> : <UserIcon />}
                    tooltip={user ? user.profile?.full_name || user.email : (language === 'th' ? 'เข้าสู่ระบบ' : 'Sign In')}
                    onClick={() => {
                        if (user) {
                            setCurrentBreederId(user.id);
                            setBreederProfileOpen(true);
                        } else {
                            setAuthModalOpen(true);
                        }
                    }}
                />
            </aside>

            {/* ===== MAIN WORKSPACE ===== */}
            <main className="flex-1 md:ml-14 flex flex-col min-h-screen">
                {/* Top Bar - Luxury Dark */}
                <header className="relative border-b border-[#C5A059]/10">
                    <div className="hidden md:flex items-center justify-center py-4">
                        <div className="px-4 py-1.5 border border-[#C5A059]/20 text-[10px] tracking-[0.15em] uppercase text-[#B8B8B8]">
                            <span>{language === 'th' ? '???' : 'Free'}</span>
                            <span className="mx-2 text-[#C5A059]/40">ú</span>
                            <span className="text-[#C5A059] hover:text-[#D4C4B5] cursor-pointer transition-colors font-medium">
                                {language === 'th' ? '???????' : 'Upgrade'}
                            </span>
                        </div>

                        <div className="absolute right-6 flex items-center gap-3">
                            <LanguageToggle compact />
                        </div>
                    </div>
                    <div className="md:hidden px-4 py-3 flex items-center gap-3 safe-area-top">
                        <button
                            type="button"
                            onClick={() => transitionToView('idle')}
                            className="w-10 h-10 rounded-full bg-[#1A1A1A] border border-[#C5A059]/20 flex items-center justify-center"
                        >
                            <EibpoMark className="w-5 h-5 text-[#C5A059]" />
                        </button>
                        <form onSubmit={handleSearch} className="flex-1">
                            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#1A1A1A] border border-[#C5A059]/20">
                                <SearchIcon />
                                <input
                                    type="text"
                                    value={searchValue}
                                    onChange={(e) => setSearchValue(e.target.value)}
                                    placeholder={language === 'th' ? 'ค้นหา...' : 'Search...'}
                                    className="flex-1 bg-transparent text-sm text-[#F5F5F0] placeholder:text-[#B8B8B8]/40 outline-none"
                                />
                            </div>
                        </form>
                        <LanguageToggle compact />
                    </div>
                </header>

                {/* Workspace Content Area */}
                <div className="flex-1 overflow-y-auto pb-24 md:pb-36">
                    {/* Welcome Header */}
                    {workspaceView === 'idle' && (
                        <div className="text-center py-16 px-6">
                            <span className="inline-block text-[9px] tracking-[0.3em] uppercase text-[#C5A059]/60 mb-4">Premium Registry</span>
                            <h1 className="font-['Playfair_Display',_Georgia,_serif] text-4xl sm:text-5xl font-normal text-[#F5F5F0] mb-4">
                                {language === 'th' ? 'สวัสดี' : 'Welcome'}
                                <span className="text-[#C5A059]">.</span>
                            </h1>
                            <p className="text-[#B8B8B8]/60 text-base max-w-xl mx-auto tracking-wide">
                                {language === 'th' ? 'พิมพ์คำถามหรือเลือกการ์ดด้านล่าง' : 'Ask anything or select a card below'}
                            </p>
                        </div>
                    )}

                    {/* Dynamic Content */}
                    {renderWorkspaceContent()}
                </div>

                {/* ===== FIXED BOTTOM SEARCH BOX - Luxury Style ===== */}
                <div className="hidden md:block fixed bottom-0 left-0 md:left-14 right-0 p-4 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A]/95 to-transparent pointer-events-none">
                    <form onSubmit={handleSearch} className="max-w-3xl mx-auto pointer-events-auto">
                        <div className="relative bg-[#1A1A1A] border border-[#C5A059]/20 hover:border-[#C5A059]/40 transition-all duration-300 shadow-2xl">
                            {/* Input Row */}
                            <div className="flex items-center px-5">
                                <span className="text-[#C5A059] mr-3">◆</span>
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    value={searchValue}
                                    onChange={(e) => setSearchValue(e.target.value)}
                                    placeholder={language === 'th' ? 'ถาม AI อะไรก็ได้...' : 'Ask AI anything...'}
                                    className="flex-1 bg-transparent py-4 text-[#F5F5F0] placeholder:text-[#B8B8B8]/40 outline-none text-base tracking-wide focus:outline-none"
                                />
                            </div>

                            {/* Bottom Actions */}
                            <div className="flex items-center justify-between px-4 py-3 border-t border-[#C5A059]/10">
                                <div className="flex items-center gap-1">
                                    <button type="button" className="p-2 text-[#C5A059]/40 hover:text-[#C5A059] transition-all">
                                        <PlusIcon />
                                    </button>
                                    <button type="button" className="p-2 text-[#C5A059]/40 hover:text-[#C5A059] transition-all">
                                        <ClockIcon />
                                    </button>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] tracking-[0.1em] uppercase text-[#C5A059]/60 border border-[#C5A059]/20">
                                        <span>Eibpo AI</span>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={!searchValue.trim()}
                                        className={`w-10 h-10 flex items-center justify-center transition-all duration-300 ${searchValue.trim()
                                            ? 'bg-[#C5A059] text-[#0A0A0A] hover:bg-[#D4C4B5]'
                                            : 'border border-[#C5A059]/20 text-[#C5A059]/30 cursor-not-allowed'
                                            }`}
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            </main>

            <nav className="fixed bottom-0 left-0 right-0 md:hidden z-40 bg-[#0A0A0A]/95 border-t border-[#C5A059]/10 safe-area-bottom">
                <div className="flex items-center justify-around px-4 py-2">
                    <button
                        type="button"
                        onClick={() => transitionToView('idle')}
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${workspaceView === 'idle' ? 'bg-[#C5A059] text-[#0A0A0A]' : 'text-[#B8B8B8]'}`}
                    >
                        <HomeIcon />
                    </button>
                    <button
                        type="button"
                        onClick={() => transitionToView('breeding')}
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${workspaceView === 'breeding' ? 'bg-[#C5A059] text-[#0A0A0A]' : 'text-[#B8B8B8]'}`}
                    >
                        <SearchIcon />
                    </button>
                    <button
                        type="button"
                        onClick={handleRegisterClick}
                        className="w-12 h-12 rounded-full flex items-center justify-center bg-[#EA4C89] text-white shadow-lg"
                    >
                        <PlusIcon />
                    </button>
                    <button
                        type="button"
                        onClick={() => setCartModalOpen(true)}
                        className="w-12 h-12 rounded-full flex items-center justify-center text-[#B8B8B8]"
                    >
                        <CartIconWithBadge count={cartCount} />
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            if (user) {
                                setCurrentBreederId(user.id);
                                setBreederProfileOpen(true);
                            } else {
                                setAuthModalOpen(true);
                            }
                        }}
                        className="w-12 h-12 rounded-full flex items-center justify-center text-[#B8B8B8]"
                    >
                        {user ? <UserAvatar name={user.profile?.full_name || user.email} /> : <UserIcon />}
                    </button>
                </div>
            </nav>

            {/* ===== MODALS (Preserved) ===== */}
            {dashboardOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-[#1E1E1E]/95 backdrop-blur-sm">
                    <BreederDashboard onClose={() => setDashboardOpen(false)} />
                </div>
            )}

            <PetRegistrationModal isOpen={registerModalOpen} onClose={() => setRegisterModalOpen(false)} onSuccess={handlePetRegistered} />
            <PedigreeModal isOpen={pedigreeModalOpen} onClose={() => setPedigreeModalOpen(false)} pet={selectedPet} onPetClick={handleViewPedigree} />
            <CartModal isOpen={cartModalOpen} onClose={() => setCartModalOpen(false)} items={cart} onUpdateQuantity={updateCartQuantity} onRemoveItem={removeFromCart} onClearCart={clearCart} />
            <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
            <ProductModal isOpen={productModalOpen} onClose={() => setProductModalOpen(false)} product={selectedProduct} onAddToCart={(p, q) => addToCart(p, q)} />
            <PetDetailsModal isOpen={petDetailsModalOpen} onClose={() => setPetDetailsModalOpen(false)} pet={selectedPet} onViewPedigree={handleViewPedigree} />
            <AdminPanel isOpen={adminPanelOpen} onClose={() => setAdminPanelOpen(false)} />
            <BreederProfileModal isOpen={breederProfileOpen} onClose={() => setBreederProfileOpen(false)} userId={currentBreederId} currentUserId={user?.id} />
            <ChatManager />
        </div>
    );
};

// ===== ICON COMPONENTS =====
const HomeIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
const PlusIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" /></svg>;
const SearchIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;
const ClockIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const ShopIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>;
const UserIcon = () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
const AdminIcon = () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4l7 3v5c0 4.418-3 6.5-7 8-4-1.5-7-3.582-7-8V7l7-3z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.5 12l1.75 1.75L14.5 10.5" />
    </svg>
);

const CartIconWithBadge: React.FC<{ count: number }> = ({ count }) => (
    <div className="relative">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
        {count > 0 && (
            <span className="absolute -top-2 -right-2 w-4 h-4 bg-gradient-to-r from-[#D4A574] to-[#C4836A] text-[#1E1E1E] text-[9px] font-bold rounded-full flex items-center justify-center shadow-lg">
                {count}
            </span>
        )}
    </div>
);

const UserAvatar: React.FC<{ name: string }> = ({ name }) => (
    <div className="w-7 h-7 rounded-full bg-gradient-to-r from-[#D4A574] to-[#C4836A] flex items-center justify-center text-[#1E1E1E] text-xs font-bold shadow-lg">
        {name.charAt(0).toUpperCase()}
    </div>
);

const SidebarIconButton: React.FC<{
    icon: React.ReactNode;
    active?: boolean;
    highlight?: boolean;
    tooltip?: string;
    onClick?: () => void;
}> = ({ icon, active, highlight, tooltip, onClick }) => (
    <button
        onClick={onClick}
        className={`
      relative group w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300
      ${active
                ? 'bg-gradient-to-br from-white/15 to-white/5 text-white shadow-lg shadow-white/10 scale-105'
                : 'text-white/50 hover:text-white hover:bg-white/10 hover:scale-110'}
      ${highlight
                ? 'bg-gradient-to-r from-[#D4A574]/30 to-[#C4836A]/20 text-[#D4A574] hover:from-[#D4A574]/40 hover:to-[#C4836A]/30 hover:shadow-lg hover:shadow-[#D4A574]/20'
                : ''}
      hover:-translate-y-0.5
    `}
        style={{
            transform: active ? 'scale(1.05)' : undefined,
        }}
    >
        <span className="transition-transform duration-200 group-hover:scale-110">
            {icon}
        </span>

        {/* Glow effect on active */}
        {active && (
            <span className="absolute inset-0 rounded-xl bg-white/10 animate-pulse" />
        )}

        {/* Enhanced Tooltip */}
        {tooltip && (
            <div className="
                absolute left-full ml-4 px-4 py-2.5
                bg-gradient-to-r from-[#3D3D3D] to-[#2D2D2D]
                text-white text-sm font-medium rounded-xl
                opacity-0 invisible group-hover:opacity-100 group-hover:visible
                transition-all duration-300 ease-out
                whitespace-nowrap z-50
                shadow-2xl shadow-black/30
                border border-white/10
                transform translate-x-2 group-hover:translate-x-0
                pointer-events-none
            ">
                {/* Arrow */}
                <span className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-[#3D3D3D] rotate-45 border-l border-b border-white/10" />
                <span className="relative z-10">{tooltip}</span>
            </div>
        )}
    </button>
);

export default WorkspaceLayout;
