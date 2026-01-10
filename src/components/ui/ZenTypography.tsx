/**
 * Zen Typography Components
 * 
 * "Quality is more important than quantity. One home run is much better than two doubles."
 * - Steve Jobs
 */

import React from 'react';
import { cn } from '@/lib/utils';

type HeadingLevel = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
type TextVariant = 'display' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'body-lg' | 'body' | 'body-sm' | 'caption' | 'label';

const variantClasses: Record<TextVariant, string> = {
    display: 'zen-display',
    h1: 'zen-h1',
    h2: 'zen-h2',
    h3: 'zen-h3',
    h4: 'zen-h4',
    h5: 'zen-h5',
    h6: 'zen-h6',
    'body-lg': 'zen-body-lg',
    body: 'zen-body',
    'body-sm': 'zen-body-sm',
    caption: 'zen-caption',
    label: 'zen-label',
};

const variantToElement: Record<TextVariant, keyof JSX.IntrinsicElements> = {
    display: 'h1',
    h1: 'h1',
    h2: 'h2',
    h3: 'h3',
    h4: 'h4',
    h5: 'h5',
    h6: 'h6',
    'body-lg': 'p',
    body: 'p',
    'body-sm': 'p',
    caption: 'span',
    label: 'span',
};

interface ZenTextProps {
    /** Typography variant */
    variant?: TextVariant;
    /** Override the HTML element */
    as?: keyof JSX.IntrinsicElements;
    /** Text color */
    color?: 'default' | 'muted' | 'primary' | 'accent' | 'inherit';
    /** Text alignment */
    align?: 'left' | 'center' | 'right';
    /** Enable text gradient */
    gradient?: boolean;
    /** Enable text animation */
    animate?: boolean;
    /** Maximum width (for readability) */
    maxWidth?: 'prose' | 'none';
    /** Additional class names */
    className?: string;
    /** Children */
    children: React.ReactNode;
}

const colorClasses = {
    default: 'text-foreground',
    muted: 'text-foreground/60',
    primary: 'text-primary',
    accent: 'text-accent',
    inherit: '',
};

const alignClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
};

export const ZenText: React.FC<ZenTextProps> = ({
    variant = 'body',
    as,
    color = 'default',
    align,
    gradient = false,
    animate = false,
    maxWidth,
    className,
    children,
}) => {
    const Component = as || variantToElement[variant];

    return (
        <Component
            className={cn(
                variantClasses[variant],
                !gradient && colorClasses[color],
                align && alignClasses[align],
                gradient && 'text-transparent bg-clip-text bg-gradient-to-r from-primary via-secondary to-accent',
                gradient && animate && 'animate-gradient bg-[length:200%_200%]',
                maxWidth === 'prose' && 'max-w-prose',
                className
            )}
        >
            {children}
        </Component>
    );
};

/**
 * Heading component shortcuts
 */
export const ZenHeading: React.FC<{
    level: 1 | 2 | 3 | 4 | 5 | 6;
    children: React.ReactNode;
    className?: string;
    gradient?: boolean;
}> = ({ level, children, className, gradient }) => {
    const variant = `h${level}` as TextVariant;
    return (
        <ZenText variant={variant} gradient={gradient} className={className}>
            {children}
        </ZenText>
    );
};

/**
 * Display heading for heroes
 */
export const ZenDisplay: React.FC<{
    children: React.ReactNode;
    className?: string;
    gradient?: boolean;
    animate?: boolean;
}> = ({ children, className, gradient, animate }) => {
    return (
        <ZenText variant="display" gradient={gradient} animate={animate} className={className}>
            {children}
        </ZenText>
    );
};

/**
 * Paragraph component
 */
export const ZenParagraph: React.FC<{
    children: React.ReactNode;
    className?: string;
    size?: 'lg' | 'md' | 'sm';
    muted?: boolean;
    maxWidth?: 'prose' | 'none';
}> = ({ children, className, size = 'md', muted = false, maxWidth = 'none' }) => {
    const sizeToVariant = {
        lg: 'body-lg',
        md: 'body',
        sm: 'body-sm',
    } as const;

    return (
        <ZenText
            variant={sizeToVariant[size]}
            color={muted ? 'muted' : 'default'}
            maxWidth={maxWidth}
            className={className}
        >
            {children}
        </ZenText>
    );
};

/**
 * Caption/Label component
 */
export const ZenCaption: React.FC<{
    children: React.ReactNode;
    className?: string;
    uppercase?: boolean;
}> = ({ children, className, uppercase = true }) => {
    return (
        <ZenText
            variant="caption"
            color="muted"
            className={cn(uppercase && 'uppercase', className)}
        >
            {children}
        </ZenText>
    );
};

/**
 * Section title with optional badge
 */
export const ZenSectionTitle: React.FC<{
    badge?: string;
    title: string;
    description?: string;
    align?: 'left' | 'center' | 'right';
    className?: string;
}> = ({ badge, title, description, align = 'center', className }) => {
    return (
        <div className={cn('zen-section-header', alignClasses[align], className)}>
            {badge && (
                <span className="zen-badge animate-zen-fade-in">
                    {badge}
                </span>
            )}
            <ZenHeading level={2} className="animate-zen-slide-up mb-4">
                {title}
            </ZenHeading>
            {description && (
                <ZenParagraph
                    size="lg"
                    muted
                    maxWidth="prose"
                    className={cn('animate-zen-slide-up', align === 'center' && 'mx-auto')}
                >
                    {description}
                </ZenParagraph>
            )}
        </div>
    );
};

export default ZenText;
