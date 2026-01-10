/**
 * Zen Button Component
 * 
 * "Innovation distinguishes between a leader and a follower."
 * - Steve Jobs
 */

import React from 'react';
import { cn } from '@/lib/utils';

interface ZenButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    /** Button visual variant */
    variant?: 'primary' | 'secondary' | 'ghost' | 'destructive' | 'success';
    /** Button size */
    size?: 'sm' | 'md' | 'lg' | 'icon';
    /** Enable shine effect on hover */
    shine?: boolean;
    /** Enable glow effect on hover */
    glow?: boolean;
    /** Loading state */
    isLoading?: boolean;
    /** Left icon */
    leftIcon?: React.ReactNode;
    /** Right icon */
    rightIcon?: React.ReactNode;
    /** Full width */
    fullWidth?: boolean;
    /** Children elements */
    children?: React.ReactNode;
}

const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm gap-1.5',
    md: 'px-5 py-2.5 text-base gap-2',
    lg: 'px-7 py-3.5 text-lg gap-2.5',
    icon: 'p-2.5',
};

const variantClasses = {
    primary: `
    bg-gradient-to-r from-primary to-secondary text-white
    shadow-[0_2px_8px_hsl(var(--primary)/0.3)]
    hover:shadow-[0_4px_16px_hsl(var(--primary)/0.4)]
    hover:-translate-y-0.5
    active:translate-y-0
  `,
    secondary: `
    bg-foreground/5 text-foreground
    border border-foreground/10
    hover:bg-foreground/8 hover:border-foreground/15
    active:bg-foreground/10
  `,
    ghost: `
    bg-transparent text-foreground/70
    hover:bg-foreground/5 hover:text-foreground
    active:bg-foreground/8
  `,
    destructive: `
    bg-gradient-to-r from-red-500 to-red-600 text-white
    shadow-[0_2px_8px_rgb(239_68_68/0.3)]
    hover:shadow-[0_4px_16px_rgb(239_68_68/0.4)]
    hover:-translate-y-0.5
    active:translate-y-0
  `,
    success: `
    bg-gradient-to-r from-emerald-500 to-emerald-600 text-white
    shadow-[0_2px_8px_rgb(16_185_129/0.3)]
    hover:shadow-[0_4px_16px_rgb(16_185_129/0.4)]
    hover:-translate-y-0.5
    active:translate-y-0
  `,
};

export const ZenButton = React.forwardRef<HTMLButtonElement, ZenButtonProps>(
    (
        {
            className,
            variant = 'primary',
            size = 'md',
            shine = false,
            glow = false,
            isLoading = false,
            leftIcon,
            rightIcon,
            fullWidth = false,
            disabled,
            children,
            ...props
        },
        ref
    ) => {
        return (
            <button
                ref={ref}
                disabled={disabled || isLoading}
                className={cn(
                    // Base styles
                    'relative inline-flex items-center justify-center font-semibold',
                    'rounded-full transition-all duration-300',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2',
                    'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none',
                    'active:scale-[0.98] active:duration-75',
                    // Size
                    sizeClasses[size],
                    // Variant
                    variantClasses[variant],
                    // Optionals
                    shine && 'hover-shine overflow-hidden',
                    glow && 'hover-glow',
                    fullWidth && 'w-full',
                    className
                )}
                {...props}
            >
                {/* Loading spinner */}
                {isLoading && (
                    <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                    >
                        <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                        />
                        <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                    </svg>
                )}

                {/* Left icon */}
                {leftIcon && !isLoading && (
                    <span className="flex-shrink-0">{leftIcon}</span>
                )}

                {/* Text content */}
                {children && <span className="relative">{children}</span>}

                {/* Right icon */}
                {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}

                {/* Shine overlay */}
                {shine && (
                    <span
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none"
                        aria-hidden="true"
                    />
                )}
            </button>
        );
    }
);

ZenButton.displayName = 'ZenButton';

/**
 * ZenIconButton - Icon-only button variant
 */
interface ZenIconButtonProps extends Omit<ZenButtonProps, 'leftIcon' | 'rightIcon' | 'children' | 'size'> {
    /** Icon element */
    icon: React.ReactNode;
    /** Button size */
    size?: 'sm' | 'md' | 'lg';
    /** Accessible label */
    'aria-label': string;
}

const iconSizeClasses = {
    sm: 'p-2',
    md: 'p-2.5',
    lg: 'p-3',
};

export const ZenIconButton = React.forwardRef<HTMLButtonElement, ZenIconButtonProps>(
    ({ className, variant = 'ghost', size = 'md', icon, ...props }, ref) => {
        return (
            <button
                ref={ref}
                className={cn(
                    'inline-flex items-center justify-center rounded-full',
                    'transition-all duration-300',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    'active:scale-95',
                    iconSizeClasses[size],
                    variant === 'ghost' && 'bg-white/80 border border-primary/10 hover:bg-white hover:shadow-md hover:-translate-y-0.5',
                    variant === 'primary' && 'bg-primary text-white hover:bg-primary/90',
                    variant === 'secondary' && 'bg-foreground/5 text-foreground hover:bg-foreground/10',
                    className
                )}
                {...props}
            >
                {icon}
            </button>
        );
    }
);

ZenIconButton.displayName = 'ZenIconButton';

/**
 * ZenButtonGroup - Group of related buttons
 */
export const ZenButtonGroup: React.FC<{
    children: React.ReactNode;
    className?: string;
}> = ({ children, className }) => {
    return (
        <div className={cn('inline-flex items-center gap-2', className)}>
            {children}
        </div>
    );
};

export default ZenButton;
