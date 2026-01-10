/**
 * Zen Section Layout Components
 * 
 * "The broader one's understanding of the human experience,
 * the better design we will have."
 * - Steve Jobs
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { useParallax } from '@/hooks/useParallax';
import { useScrollReveal } from '@/hooks/useScrollReveal';

interface ZenSectionProps extends React.HTMLAttributes<HTMLElement> {
    /** Section size (padding) */
    size?: 'sm' | 'md' | 'lg' | 'xl';
    /** Background variant */
    background?: 'transparent' | 'muted' | 'primary' | 'gradient';
    /** Enable parallax on background */
    parallax?: boolean;
    /** Enable scroll reveal */
    reveal?: boolean;
    /** Container width */
    container?: 'none' | 'default' | 'narrow' | 'wide';
    /** Custom ID for navigation */
    id?: string;
}

const sizeClasses = {
    sm: 'py-12 md:py-16',
    md: 'py-16 md:py-24',
    lg: 'py-20 md:py-32',
    xl: 'py-24 md:py-40',
};

const backgroundClasses = {
    transparent: '',
    muted: 'bg-muted/30',
    primary: 'bg-primary/5',
    gradient: 'bg-gradient-to-b from-background via-muted/20 to-background',
};

const containerClasses = {
    none: '',
    default: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
    narrow: 'max-w-4xl mx-auto px-4 sm:px-6 lg:px-8',
    wide: 'max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8',
};

export const ZenSection: React.FC<ZenSectionProps> = ({
    children,
    className,
    size = 'md',
    background = 'transparent',
    parallax = false,
    reveal = false,
    container = 'default',
    ...props
}) => {
    const parallaxResult = useParallax({ speed: 0.15, disableOnMobile: true });
    const revealResult = useScrollReveal({ threshold: 0.1 });

    return (
        <section
            ref={reveal ? revealResult.ref : undefined}
            className={cn(
                'relative',
                sizeClasses[size],
                backgroundClasses[background],
                reveal && 'scroll-reveal',
                reveal && revealResult.isRevealed && 'revealed',
                className
            )}
            {...props}
        >
            {/* Optional parallax background layer */}
            {parallax && (
                <div
                    ref={parallaxResult.ref}
                    className="absolute inset-0 pointer-events-none"
                    style={parallaxResult.style}
                >
                    <div className="absolute inset-0 opacity-30">
                        {/* Decorative elements */}
                        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
                        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
                    </div>
                </div>
            )}

            {/* Content container */}
            <div className={cn('relative z-10', containerClasses[container])}>
                {children}
            </div>
        </section>
    );
};

/**
 * ZenContainer - Simple container wrapper
 */
export const ZenContainer: React.FC<{
    children: React.ReactNode;
    size?: 'default' | 'narrow' | 'wide' | 'full';
    className?: string;
}> = ({ children, size = 'default', className }) => {
    const sizeMap = {
        default: 'max-w-7xl',
        narrow: 'max-w-4xl',
        wide: 'max-w-[1400px]',
        full: 'max-w-full',
    };

    return (
        <div className={cn(sizeMap[size], 'mx-auto px-4 sm:px-6 lg:px-8', className)}>
            {children}
        </div>
    );
};

/**
 * ZenGrid - Responsive grid layout
 */
export const ZenGrid: React.FC<{
    children: React.ReactNode;
    cols?: 1 | 2 | 3 | 4 | 6;
    gap?: 'sm' | 'md' | 'lg';
    className?: string;
}> = ({ children, cols = 3, gap = 'md', className }) => {
    const colClasses = {
        1: 'grid-cols-1',
        2: 'grid-cols-1 sm:grid-cols-2',
        3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
        4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
        6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
    };

    const gapClasses = {
        sm: 'gap-4',
        md: 'gap-6',
        lg: 'gap-8',
    };

    return (
        <div className={cn('grid', colClasses[cols], gapClasses[gap], className)}>
            {children}
        </div>
    );
};

/**
 * ZenStack - Vertical stack with consistent spacing
 */
export const ZenStack: React.FC<{
    children: React.ReactNode;
    gap?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    align?: 'start' | 'center' | 'end' | 'stretch';
    className?: string;
}> = ({ children, gap = 'md', align = 'stretch', className }) => {
    const gapClasses = {
        xs: 'gap-1',
        sm: 'gap-2',
        md: 'gap-4',
        lg: 'gap-6',
        xl: 'gap-8',
    };

    const alignClasses = {
        start: 'items-start',
        center: 'items-center',
        end: 'items-end',
        stretch: 'items-stretch',
    };

    return (
        <div className={cn('flex flex-col', gapClasses[gap], alignClasses[align], className)}>
            {children}
        </div>
    );
};

/**
 * ZenRow - Horizontal row with consistent spacing
 */
export const ZenRow: React.FC<{
    children: React.ReactNode;
    gap?: 'xs' | 'sm' | 'md' | 'lg';
    align?: 'start' | 'center' | 'end' | 'baseline';
    justify?: 'start' | 'center' | 'end' | 'between' | 'around';
    wrap?: boolean;
    className?: string;
}> = ({ children, gap = 'md', align = 'center', justify = 'start', wrap = false, className }) => {
    const gapClasses = {
        xs: 'gap-1',
        sm: 'gap-2',
        md: 'gap-4',
        lg: 'gap-6',
    };

    const alignClasses = {
        start: 'items-start',
        center: 'items-center',
        end: 'items-end',
        baseline: 'items-baseline',
    };

    const justifyClasses = {
        start: 'justify-start',
        center: 'justify-center',
        end: 'justify-end',
        between: 'justify-between',
        around: 'justify-around',
    };

    return (
        <div
            className={cn(
                'flex',
                gapClasses[gap],
                alignClasses[align],
                justifyClasses[justify],
                wrap && 'flex-wrap',
                className
            )}
        >
            {children}
        </div>
    );
};

/**
 * ZenDivider - Horizontal divider
 */
export const ZenDivider: React.FC<{
    className?: string;
    spacing?: 'sm' | 'md' | 'lg';
}> = ({ className, spacing = 'md' }) => {
    const spacingClasses = {
        sm: 'my-4',
        md: 'my-8',
        lg: 'my-12',
    };

    return (
        <hr
            className={cn(
                'border-0 h-px bg-gradient-to-r from-transparent via-foreground/10 to-transparent',
                spacingClasses[spacing],
                className
            )}
        />
    );
};

/**
 * ZenSpacer - Vertical spacer
 */
export const ZenSpacer: React.FC<{
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
}> = ({ size = 'md' }) => {
    const sizeClasses = {
        xs: 'h-2',
        sm: 'h-4',
        md: 'h-8',
        lg: 'h-12',
        xl: 'h-16',
        '2xl': 'h-24',
    };

    return <div className={sizeClasses[size]} aria-hidden="true" />;
};

export default ZenSection;
