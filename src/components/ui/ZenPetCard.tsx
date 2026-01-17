/**
 * Zen Pet Card Component
 * 
 * "People don't know what they want until you show it to them."
 * - Steve Jobs
 * 
 * Enhanced version of PetCard with Zen Design System
 */

import React, { useState } from 'react';
import { Pet } from '@/data/petData';
import { cn } from '@/lib/utils';
import SmartImage from '@/components/ui/SmartImage';

interface ZenPetCardProps {
    pet: Pet;
    onViewPedigree: (pet: Pet) => void;
    onViewDetails: (pet: Pet) => void;
    /** Enable parallax tilt effect on hover */
    tilt?: boolean;
    /** Animation delay for staggered animations */
    delay?: number;
}

const ZenPetCard: React.FC<ZenPetCardProps> = ({
    pet,
    onViewPedigree,
    onViewDetails,
    tilt = false,
    delay = 0
}) => {
    const [imageError, setImageError] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [tiltStyle, setTiltStyle] = useState({ transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg)' });

    const showPlaceholder = !pet.image || imageError;

    const calculateAge = (birthDate: string) => {
        const birth = new Date(birthDate);
        const now = new Date();
        const years = now.getFullYear() - birth.getFullYear();
        const months = now.getMonth() - birth.getMonth();

        if (years === 0) {
            return `${months} months`;
        } else if (years === 1 && months < 0) {
            return `${12 + months} months`;
        }
        return `${years} year${years > 1 ? 's' : ''}`;
    };

    // Magnetic tilt effect
    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!tilt) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = ((y - centerY) / centerY) * -5;
        const rotateY = ((x - centerX) / centerX) * 5;

        setTiltStyle({
            transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.02)`
        });
    };

    const handleMouseLeave = () => {
        setIsHovered(false);
        setTiltStyle({
            transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)'
        });
    };

    return (
        <div
            className={cn(
                // Base styles
                "group relative overflow-hidden",
                "bg-white/90 backdrop-blur-sm",
                "rounded-2xl",
                "border border-foreground/5",
                // Zen shadow - subtle and elegant
                "shadow-[0_2px_8px_rgba(0,0,0,0.04)]",
                // Hover state - smooth and sophisticated
                "hover:shadow-[0_12px_28px_rgba(139,157,131,0.12)]",
                "hover:border-primary/20",
                // Transitions
                "transition-all duration-500 ease-zen"
            )}
            style={{
                ...tiltStyle,
                animationDelay: `${delay}ms`,
                willChange: 'transform, box-shadow'
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
            {/* Image Container */}
            <div
                className="relative aspect-square overflow-hidden cursor-pointer"
                onClick={() => onViewDetails(pet)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onViewDetails(pet);
                    }
                }}
                aria-label={`View details for ${pet.name}`}
            >
                {/* Image */}
                {showPlaceholder ? (
                    <div className="w-full h-full bg-gradient-to-br from-muted/50 to-muted flex flex-col items-center justify-center p-4">
                        <div className="w-16 h-16 rounded-full bg-foreground/5 flex items-center justify-center mb-3">
                            <svg className="w-8 h-8 text-foreground/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        <span className="text-xs font-medium text-foreground/30">No photo yet</span>
                    </div>
                ) : (
                    <SmartImage
                        src={pet.image}
                        petId={pet.id}
                        alt={pet.name}
                        loading="lazy"
                        decoding="async"
                        className={cn(
                            "w-full h-full object-cover",
                            "transition-transform duration-700 ease-zen",
                            isHovered && "scale-105"
                        )}
                        onError={() => setImageError(true)}
                    />
                )}

                {/* Gradient Overlay */}
                <div
                    className={cn(
                        "absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent",
                        "transition-opacity duration-500",
                        isHovered ? "opacity-100" : "opacity-0"
                    )}
                />

                {/* Type Badge - Top Left */}
                <div className="absolute top-3 left-3 z-10">
                    <span
                        className={cn(
                            "px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                            "backdrop-blur-md shadow-sm",
                            "transition-all duration-300",
                            pet.type === 'dog'
                                ? 'bg-accent/90 text-white'
                                : 'bg-primary/90 text-white'
                        )}
                    >
                        {pet.type}
                    </span>
                </div>

                {/* Health Badge - Top Right */}
                {pet.healthCertified && (
                    <div className="absolute top-3 right-3 z-10">
                        <div
                            className={cn(
                                "w-8 h-8 rounded-full",
                                "bg-white/90 backdrop-blur-sm",
                                "flex items-center justify-center",
                                "shadow-sm",
                                "transition-transform duration-300",
                                isHovered && "scale-110"
                            )}
                            title="Health Certified"
                        >
                            <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                        </div>
                    </div>
                )}

                {/* View Indicator */}
                <div
                    className={cn(
                        "absolute inset-0 flex items-center justify-center",
                        "transition-all duration-500",
                        isHovered ? "opacity-100" : "opacity-0 translate-y-2"
                    )}
                >
                    <div className="bg-white/95 backdrop-blur-md px-5 py-2.5 rounded-full shadow-lg">
                        <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View Profile
                        </span>
                    </div>
                </div>

                {/* Quick Actions Bar */}
                <div
                    className={cn(
                        "absolute bottom-0 left-0 right-0 p-3",
                        "flex gap-2",
                        "transition-all duration-500",
                        isHovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                    )}
                >
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onViewDetails(pet);
                        }}
                        className={cn(
                            "flex-1 py-2.5 px-4 rounded-xl",
                            "bg-white/95 backdrop-blur-md",
                            "text-foreground text-sm font-semibold",
                            "shadow-md",
                            "transition-all duration-300",
                            "hover:bg-white hover:shadow-lg hover:-translate-y-0.5"
                        )}
                    >
                        Details
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onViewPedigree(pet);
                        }}
                        className={cn(
                            "py-2.5 px-4 rounded-xl",
                            "bg-foreground/90 backdrop-blur-md",
                            "text-white text-sm font-semibold",
                            "shadow-md",
                            "transition-all duration-300",
                            "hover:bg-foreground hover:shadow-lg hover:-translate-y-0.5"
                        )}
                    >
                        Pedigree
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="p-4">
                {/* Header Row */}
                <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                        <h3 className={cn(
                            "font-semibold text-foreground text-lg truncate",
                            "transition-colors duration-300",
                            isHovered && "text-primary"
                        )}>
                            {pet.name}
                        </h3>
                        <p className="text-sm text-foreground/50 truncate">{pet.breed}</p>
                    </div>

                    {/* Gender Badge */}
                    <span className={cn(
                        "px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 ml-2",
                        pet.gender === 'male'
                            ? 'bg-blue-50 text-blue-600'
                            : 'bg-pink-50 text-pink-600'
                    )}>
                        {pet.gender === 'male' ? '♂' : '♀'}
                    </span>
                </div>

                {/* Meta Info */}
                <div className="flex items-center gap-4 text-xs text-foreground/40 mb-3">
                    <span className="flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {calculateAge(pet.birthDate)}
                    </span>
                    <span className="flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {pet.location?.split(',')[0] || 'Unknown'}
                    </span>
                </div>

                {/* Registration Number */}
                {pet.registrationNumber && (
                    <div className="pt-3 border-t border-foreground/5">
                        <span className="text-xs text-primary/70 font-mono tracking-wide">
                            {pet.registrationNumber}
                        </span>
                    </div>
                )}
            </div>

            {/* Subtle shine effect */}
            <div
                className={cn(
                    "absolute inset-0 pointer-events-none",
                    "bg-gradient-to-br from-white/10 via-transparent to-transparent",
                    "opacity-0 transition-opacity duration-500",
                    isHovered && "opacity-100"
                )}
            />
        </div>
    );
};

export default ZenPetCard;
