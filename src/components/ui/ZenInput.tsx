/**
 * Zen Input Components
 * 
 * "We're here to put a dent in the universe."
 * - Steve Jobs
 */

import React, { useState, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface ZenInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    /** Left icon or element */
    leftElement?: React.ReactNode;
    /** Right icon or element */
    rightElement?: React.ReactNode;
    /** Input size */
    size?: 'sm' | 'md' | 'lg';
    /** Visual variant */
    variant?: 'default' | 'glass' | 'minimal';
    /** Error state */
    error?: boolean;
    /** Error message */
    errorMessage?: string;
}

const sizeClasses = {
    sm: 'py-2 px-3 text-sm',
    md: 'py-3 px-4 text-base',
    lg: 'py-4 px-5 text-lg',
};

const variantClasses = {
    default: cn(
        'bg-white/80 border border-foreground/10',
        'hover:border-primary/30',
        'focus:border-primary/50 focus:bg-white focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.1)]'
    ),
    glass: cn(
        'bg-white/40 backdrop-blur-lg border border-white/30',
        'hover:bg-white/50 hover:border-white/40',
        'focus:bg-white/60 focus:border-primary/30 focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.1)]'
    ),
    minimal: cn(
        'bg-transparent border-b-2 border-foreground/10 rounded-none',
        'hover:border-foreground/20',
        'focus:border-primary focus:shadow-none'
    ),
};

export const ZenInput = forwardRef<HTMLInputElement, ZenInputProps>(
    (
        {
            className,
            leftElement,
            rightElement,
            size = 'md',
            variant = 'default',
            error = false,
            errorMessage,
            disabled,
            ...props
        },
        ref
    ) => {
        const [isFocused, setIsFocused] = useState(false);

        const leftPadding = leftElement ? (size === 'lg' ? 'pl-12' : size === 'sm' ? 'pl-9' : 'pl-10') : '';
        const rightPadding = rightElement ? (size === 'lg' ? 'pr-12' : size === 'sm' ? 'pr-9' : 'pr-10') : '';

        return (
            <div className="relative">
                {/* Left Element */}
                {leftElement && (
                    <div
                        className={cn(
                            'absolute left-0 top-0 bottom-0 flex items-center justify-center',
                            size === 'lg' ? 'w-12' : size === 'sm' ? 'w-9' : 'w-10',
                            'text-foreground/40',
                            isFocused && 'text-primary/70',
                            'transition-colors duration-300'
                        )}
                    >
                        {leftElement}
                    </div>
                )}

                {/* Input */}
                <input
                    ref={ref}
                    disabled={disabled}
                    onFocus={(e) => {
                        setIsFocused(true);
                        props.onFocus?.(e);
                    }}
                    onBlur={(e) => {
                        setIsFocused(false);
                        props.onBlur?.(e);
                    }}
                    className={cn(
                        // Base
                        'w-full rounded-xl outline-none',
                        'transition-all duration-300 ease-zen',
                        'placeholder:text-foreground/30',
                        // Size
                        sizeClasses[size],
                        // Variant
                        variantClasses[variant],
                        // Left/Right padding
                        leftPadding,
                        rightPadding,
                        // Error
                        error && 'border-red-400 focus:border-red-500 focus:shadow-[0_0_0_3px_rgb(248,113,113,0.2)]',
                        // Disabled
                        disabled && 'opacity-50 cursor-not-allowed',
                        className
                    )}
                    {...props}
                />

                {/* Right Element */}
                {rightElement && (
                    <div
                        className={cn(
                            'absolute right-0 top-0 bottom-0 flex items-center justify-center',
                            size === 'lg' ? 'w-12' : size === 'sm' ? 'w-9' : 'w-10',
                            'text-foreground/40',
                            isFocused && 'text-primary/70',
                            'transition-colors duration-300'
                        )}
                    >
                        {rightElement}
                    </div>
                )}

                {/* Error Message */}
                {error && errorMessage && (
                    <p className="mt-1.5 text-xs text-red-500 animate-zen-slide-up">
                        {errorMessage}
                    </p>
                )}
            </div>
        );
    }
);

ZenInput.displayName = 'ZenInput';

/**
 * Zen Search Input - Specialized for search
 */
interface ZenSearchInputProps extends Omit<ZenInputProps, 'leftElement' | 'rightElement'> {
    /** Show loading spinner */
    isLoading?: boolean;
    /** Clear button click handler */
    onClear?: () => void;
    /** AI mode button click handler */
    onAIMode?: () => void;
    /** Show AI mode button */
    showAIMode?: boolean;
}

export const ZenSearchInput = forwardRef<HTMLInputElement, ZenSearchInputProps>(
    ({ isLoading, onClear, onAIMode, showAIMode = false, value, ...props }, ref) => {
        const hasValue = Boolean(value && String(value).length > 0);

        return (
            <div className="relative group">
                {/* Search Icon */}
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/40 group-focus-within:text-primary transition-colors duration-300">
                    {isLoading ? (
                        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                    ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    )}
                </div>

                {/* Input */}
                <input
                    ref={ref}
                    type="search"
                    value={value}
                    className={cn(
                        'w-full py-4 pl-12 pr-24',
                        'bg-white/60 backdrop-blur-lg',
                        'border border-foreground/10 rounded-2xl',
                        'text-base text-foreground',
                        'placeholder:text-foreground/30',
                        'outline-none',
                        'transition-all duration-300 ease-zen',
                        'hover:border-primary/20 hover:bg-white/70',
                        'focus:border-primary/40 focus:bg-white/80 focus:shadow-[0_0_0_4px_hsl(var(--primary)/0.08)]',
                        props.className
                    )}
                    {...props}
                />

                {/* Right Actions */}
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {/* Clear Button */}
                    {hasValue && onClear && (
                        <button
                            type="button"
                            onClick={onClear}
                            className={cn(
                                'p-2 rounded-lg',
                                'text-foreground/40 hover:text-foreground/60',
                                'hover:bg-foreground/5',
                                'transition-all duration-200'
                            )}
                            aria-label="Clear search"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}

                    {/* AI Mode Button */}
                    {showAIMode && onAIMode && (
                        <button
                            type="button"
                            onClick={onAIMode}
                            className={cn(
                                'px-3 py-1.5 rounded-xl',
                                'bg-gradient-to-r from-primary to-secondary',
                                'text-white text-xs font-semibold',
                                'shadow-sm hover:shadow-md',
                                'transition-all duration-300',
                                'hover:-translate-y-0.5'
                            )}
                        >
                            ✨ AI
                        </button>
                    )}
                </div>
            </div>
        );
    }
);

ZenSearchInput.displayName = 'ZenSearchInput';

/**
 * Zen Textarea
 */
interface ZenTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    /** Visual variant */
    variant?: 'default' | 'glass';
    /** Error state */
    error?: boolean;
    /** Error message */
    errorMessage?: string;
}

export const ZenTextarea = forwardRef<HTMLTextAreaElement, ZenTextareaProps>(
    ({ className, variant = 'default', error, errorMessage, ...props }, ref) => {
        return (
            <div>
                <textarea
                    ref={ref}
                    className={cn(
                        'w-full min-h-[120px] py-3 px-4 rounded-xl',
                        'outline-none resize-y',
                        'transition-all duration-300 ease-zen',
                        'placeholder:text-foreground/30',
                        variant === 'default' && cn(
                            'bg-white/80 border border-foreground/10',
                            'hover:border-primary/30',
                            'focus:border-primary/50 focus:bg-white focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.1)]'
                        ),
                        variant === 'glass' && cn(
                            'bg-white/40 backdrop-blur-lg border border-white/30',
                            'hover:bg-white/50 hover:border-white/40',
                            'focus:bg-white/60 focus:border-primary/30'
                        ),
                        error && 'border-red-400 focus:border-red-500',
                        className
                    )}
                    {...props}
                />
                {error && errorMessage && (
                    <p className="mt-1.5 text-xs text-red-500 animate-zen-slide-up">
                        {errorMessage}
                    </p>
                )}
            </div>
        );
    }
);

ZenTextarea.displayName = 'ZenTextarea';

export default ZenInput;
