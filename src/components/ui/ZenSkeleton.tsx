/**
 * Zen Skeleton Components
 * 
 * "Have the courage to follow your heart and intuition."
 * - Steve Jobs
 */

import React from 'react';
import { cn } from '@/lib/utils';

interface ZenSkeletonProps {
    /** Additional class names */
    className?: string;
    /** Width (CSS value) */
    width?: string | number;
    /** Height (CSS value) */
    height?: string | number;
    /** Border radius */
    radius?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
    /** Animation style */
    animation?: 'pulse' | 'shimmer' | 'wave';
}

const radiusClasses = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl',
    full: 'rounded-full',
};

export const ZenSkeleton: React.FC<ZenSkeletonProps> = ({
    className,
    width,
    height,
    radius = 'lg',
    animation = 'shimmer',
}) => {
    const style: React.CSSProperties = {
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
    };

    return (
        <div
            className={cn(
                'relative overflow-hidden',
                'bg-gradient-to-r from-foreground/5 via-foreground/8 to-foreground/5',
                radiusClasses[radius],
                animation === 'pulse' && 'animate-pulse',
                animation === 'shimmer' && 'zen-skeleton-shimmer',
                animation === 'wave' && 'zen-skeleton-wave',
                className
            )}
            style={style}
        >
            {/* Shimmer overlay */}
            {animation === 'shimmer' && (
                <div
                    className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite]"
                    style={{
                        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
                    }}
                />
            )}
        </div>
    );
};

/**
 * Skeleton Text Line
 */
export const ZenSkeletonText: React.FC<{
    lines?: number;
    className?: string;
    lastLineWidth?: string;
}> = ({ lines = 1, className, lastLineWidth = '75%' }) => {
    return (
        <div className={cn('space-y-2', className)}>
            {Array.from({ length: lines }).map((_, i) => (
                <ZenSkeleton
                    key={i}
                    height={14}
                    width={i === lines - 1 && lines > 1 ? lastLineWidth : '100%'}
                    radius="md"
                />
            ))}
        </div>
    );
};

/**
 * Skeleton Circle (for avatars)
 */
export const ZenSkeletonCircle: React.FC<{
    size?: number | string;
    className?: string;
}> = ({ size = 48, className }) => {
    const sizeValue = typeof size === 'number' ? `${size}px` : size;

    return (
        <ZenSkeleton
            width={sizeValue}
            height={sizeValue}
            radius="full"
            className={className}
        />
    );
};

/**
 * Skeleton Card - Complete card placeholder
 */
export const ZenSkeletonCard: React.FC<{
    hasImage?: boolean;
    imageAspect?: 'square' | 'video' | '4/3';
    className?: string;
}> = ({ hasImage = true, imageAspect = 'square', className }) => {
    const aspectClasses = {
        square: 'aspect-square',
        video: 'aspect-video',
        '4/3': 'aspect-[4/3]',
    };

    return (
        <div
            className={cn(
                'bg-white/60 backdrop-blur-sm rounded-2xl overflow-hidden',
                'border border-foreground/5',
                className
            )}
        >
            {/* Image */}
            {hasImage && (
                <ZenSkeleton
                    className={cn('w-full', aspectClasses[imageAspect])}
                    radius="none"
                />
            )}

            {/* Content */}
            <div className="p-4 space-y-3">
                {/* Title */}
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-2">
                        <ZenSkeleton height={20} width="70%" radius="md" />
                        <ZenSkeleton height={14} width="50%" radius="md" />
                    </div>
                    <ZenSkeleton height={24} width={40} radius="full" />
                </div>

                {/* Meta */}
                <div className="flex gap-4">
                    <ZenSkeleton height={12} width={60} radius="md" />
                    <ZenSkeleton height={12} width={80} radius="md" />
                </div>

                {/* Footer */}
                <div className="pt-3 border-t border-foreground/5">
                    <ZenSkeleton height={12} width={100} radius="md" />
                </div>
            </div>
        </div>
    );
};

/**
 * Skeleton Grid - Multiple cards
 */
export const ZenSkeletonGrid: React.FC<{
    count?: number;
    cols?: 1 | 2 | 3 | 4;
    className?: string;
}> = ({ count = 6, cols = 3, className }) => {
    const colClasses = {
        1: 'grid-cols-1',
        2: 'grid-cols-1 sm:grid-cols-2',
        3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
        4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    };

    return (
        <div className={cn('grid gap-6', colClasses[cols], className)}>
            {Array.from({ length: count }).map((_, i) => (
                <ZenSkeletonCard key={i} />
            ))}
        </div>
    );
};

/**
 * Skeleton Table Row
 */
export const ZenSkeletonTableRow: React.FC<{
    cols?: number;
    className?: string;
}> = ({ cols = 4, className }) => {
    return (
        <div className={cn('flex items-center gap-4 py-3', className)}>
            {Array.from({ length: cols }).map((_, i) => (
                <ZenSkeleton
                    key={i}
                    height={16}
                    className="flex-1"
                    radius="md"
                />
            ))}
        </div>
    );
};

/**
 * Skeleton Profile
 */
export const ZenSkeletonProfile: React.FC<{
    className?: string;
}> = ({ className }) => {
    return (
        <div className={cn('flex items-center gap-3', className)}>
            <ZenSkeletonCircle size={40} />
            <div className="flex-1 space-y-1.5">
                <ZenSkeleton height={16} width="60%" radius="md" />
                <ZenSkeleton height={12} width="40%" radius="md" />
            </div>
        </div>
    );
};

// Add shimmer keyframe to CSS (already in zen-design-system.css)
// This is just for reference
const shimmerKeyframe = `
@keyframes shimmer {
  100% {
    transform: translateX(100%);
  }
}
`;

export default ZenSkeleton;
