/**
 * useScrollReveal - Zen Scroll Reveal Hook
 * Reveals elements as they enter the viewport
 * 
 * "Simple can be harder than complex... but it's worth it in the end."
 * - Steve Jobs
 */

import { useEffect, useRef, useState, useCallback } from 'react';

interface ScrollRevealOptions {
    /** Threshold for intersection (0-1) */
    threshold?: number;
    /** Root margin for earlier/later trigger */
    rootMargin?: string;
    /** Whether to only animate once */
    once?: boolean;
    /** Delay before animation starts (ms) */
    delay?: number;
    /** Index for staggered animations */
    staggerIndex?: number;
    /** Stagger delay multiplier (ms) */
    staggerDelay?: number;
}

export const useScrollReveal = (options: ScrollRevealOptions = {}) => {
    const {
        threshold = 0.1,
        rootMargin = '0px 0px -50px 0px',
        once = true,
        delay = 0,
        staggerIndex = 0,
        staggerDelay = 100,
    } = options;

    const elementRef = useRef<HTMLDivElement>(null);
    const [isRevealed, setIsRevealed] = useState(false);
    const [hasAnimated, setHasAnimated] = useState(false);

    useEffect(() => {
        const element = elementRef.current;
        if (!element) return;

        // Calculate total delay including stagger
        const totalDelay = delay + (staggerIndex * staggerDelay);

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setTimeout(() => {
                            setIsRevealed(true);
                            setHasAnimated(true);
                        }, totalDelay);

                        if (once) {
                            observer.unobserve(element);
                        }
                    } else if (!once && hasAnimated) {
                        setIsRevealed(false);
                    }
                });
            },
            {
                threshold,
                rootMargin,
            }
        );

        observer.observe(element);

        return () => {
            observer.disconnect();
        };
    }, [threshold, rootMargin, once, delay, staggerIndex, staggerDelay, hasAnimated]);

    return {
        ref: elementRef,
        isRevealed,
        className: isRevealed ? 'revealed' : '',
    };
};

/**
 * useScrollRevealGroup - For multiple elements with staggered animations
 */
export const useScrollRevealGroup = (
    count: number,
    options: Omit<ScrollRevealOptions, 'staggerIndex'> = {}
) => {
    const reveals = Array.from({ length: count }, (_, index) =>
        useScrollReveal({ ...options, staggerIndex: index })
    );

    return reveals;
};

/**
 * ScrollReveal Component - For wrapping elements
 */
export const ScrollReveal: React.FC<{
    children: React.ReactNode;
    className?: string;
    animation?: 'fade-up' | 'fade-down' | 'fade-left' | 'fade-right' | 'scale' | 'fade';
    delay?: number;
    staggerIndex?: number;
    once?: boolean;
}> = ({
    children,
    className = '',
    animation = 'fade-up',
    delay = 0,
    staggerIndex = 0,
    once = true,
}) => {
        const { ref, isRevealed } = useScrollReveal({
            delay,
            staggerIndex,
            once,
        });

        const animationClasses = {
            'fade-up': 'scroll-reveal',
            'fade-down': 'scroll-reveal-down',
            'fade-left': 'scroll-reveal-left',
            'fade-right': 'scroll-reveal-right',
            scale: 'scroll-reveal-scale',
            fade: 'scroll-reveal-fade',
        };

        return (
            <div
                ref={ref}
                className={`${animationClasses[animation]} ${isRevealed ? 'revealed' : ''} ${className}`}
            >
                {children}
            </div>
        );
    };

export default useScrollReveal;
