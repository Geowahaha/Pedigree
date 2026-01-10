/**
 * Zen Card Component
 * 
 * "Details matter, it's worth waiting to get it right."
 * - Steve Jobs
 */

import React from 'react';
import { cn } from '@/lib/utils';

interface ZenCardProps extends React.HTMLAttributes<HTMLDivElement> {
    /** Card visual variant */
    variant?: 'default' | 'elevated' | 'flat' | 'glass';
    /** Enable hover lift effect */
    hoverable?: boolean;
    /** Enable image zoom on hover */
    imageZoom?: boolean;
    /** Enable shine sweep effect on hover */
    shine?: boolean;
    /** Card padding preset */
    padding?: 'none' | 'sm' | 'md' | 'lg';
    /** Children elements */
    children: React.ReactNode;
}

const paddingClasses = {
    none: '',
    sm: 'p-3 sm:p-4',
    md: 'p-4 sm:p-6',
    lg: 'p-6 sm:p-8',
};

const variantClasses = {
    default: 'zen-card',
    elevated: 'zen-card-elevated',
    flat: 'zen-card-flat',
    glass: 'bg-white/30 backdrop-blur-xl border border-white/40 rounded-2xl',
};

export const ZenCard = React.forwardRef<HTMLDivElement, ZenCardProps>(
    (
        {
            className,
            variant = 'default',
            hoverable = true,
            imageZoom = false,
            shine = false,
            padding = 'md',
            children,
            ...props
        },
        ref
    ) => {
        return (
            <div
                ref={ref}
                className={cn(
                    variantClasses[variant],
                    paddingClasses[padding],
                    hoverable && 'hover-lift',
                    imageZoom && 'hover-img-zoom',
                    shine && 'hover-shine',
                    'transition-all duration-300',
                    className
                )}
                {...props}
            >
                {children}
            </div>
        );
    }
);

ZenCard.displayName = 'ZenCard';

/**
 * ZenCardImage - Image container for cards
 */
interface ZenCardImageProps extends React.HTMLAttributes<HTMLDivElement> {
    src: string;
    alt: string;
    aspectRatio?: 'square' | 'video' | '4/3' | '3/2' | 'auto';
    overlay?: boolean;
}

const aspectClasses = {
    square: 'aspect-square',
    video: 'aspect-video',
    '4/3': 'aspect-[4/3]',
    '3/2': 'aspect-[3/2]',
    auto: '',
};

export const ZenCardImage: React.FC<ZenCardImageProps> = ({
    src,
    alt,
    aspectRatio = '4/3',
    overlay = false,
    className,
    ...props
}) => {
    return (
        <div
            className={cn(
                'relative overflow-hidden rounded-t-2xl',
                aspectClasses[aspectRatio],
                className
            )}
            {...props}
        >
            <img
                src={src}
                alt={alt}
                className="w-full h-full object-cover img-container transition-transform duration-500"
                loading="lazy"
            />
            {overlay && (
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
            )}
        </div>
    );
};

/**
 * ZenCardContent - Content wrapper for cards
 */
export const ZenCardContent: React.FC<{
    children: React.ReactNode;
    className?: string;
}> = ({ children, className }) => {
    return (
        <div className={cn('relative', className)}>
            {children}
        </div>
    );
};

/**
 * ZenCardTitle - Title for cards
 */
export const ZenCardTitle: React.FC<{
    children: React.ReactNode;
    className?: string;
    as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}> = ({ children, className, as: Component = 'h3' }) => {
    return (
        <Component className={cn('zen-h5 text-foreground', className)}>
            {children}
        </Component>
    );
};

/**
 * ZenCardDescription - Description text for cards
 */
export const ZenCardDescription: React.FC<{
    children: React.ReactNode;
    className?: string;
}> = ({ children, className }) => {
    return (
        <p className={cn('zen-body-sm text-foreground/60 mt-1', className)}>
            {children}
        </p>
    );
};

/**
 * ZenCardFooter - Footer area for cards
 */
export const ZenCardFooter: React.FC<{
    children: React.ReactNode;
    className?: string;
}> = ({ children, className }) => {
    return (
        <div className={cn('flex items-center gap-2 mt-4 pt-4 border-t border-foreground/5', className)}>
            {children}
        </div>
    );
};

/**
 * ZenCardBadge - Badge overlay for cards
 */
export const ZenCardBadge: React.FC<{
    children: React.ReactNode;
    variant?: 'primary' | 'accent' | 'success' | 'warning';
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    className?: string;
}> = ({ children, variant = 'primary', position = 'top-left', className }) => {
    const positionClasses = {
        'top-left': 'top-3 left-3',
        'top-right': 'top-3 right-3',
        'bottom-left': 'bottom-3 left-3',
        'bottom-right': 'bottom-3 right-3',
    };

    const variantClasses = {
        primary: 'bg-primary/90 text-white',
        accent: 'bg-accent/90 text-white',
        success: 'bg-emerald-500/90 text-white',
        warning: 'bg-amber-500/90 text-white',
    };

    return (
        <span
            className={cn(
                'absolute px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-sm',
                positionClasses[position],
                variantClasses[variant],
                className
            )}
        >
            {children}
        </span>
    );
};

export default ZenCard;
