/**
 * useParallax - Zen Parallax Effect Hook
 * Creates smooth, natural parallax scrolling effect
 * 
 * "Design is not just what it looks like... design is how it works."
 * - Steve Jobs
 */

import { useEffect, useRef, useState, useCallback } from 'react';

interface ParallaxOptions {
    /** Speed multiplier (0.1 = slow, 0.5 = medium, 1 = same as scroll) */
    speed?: number;
    /** Direction of parallax movement */
    direction?: 'up' | 'down';
    /** Whether to disable on mobile for performance */
    disableOnMobile?: boolean;
    /** Start offset from viewport top (0-1) */
    startOffset?: number;
    /** End offset from viewport bottom (0-1) */
    endOffset?: number;
}

export const useParallax = (options: ParallaxOptions = {}) => {
    const {
        speed = 0.3,
        direction = 'up',
        disableOnMobile = true,
        startOffset = 0,
        endOffset = 1,
    } = options;

    const elementRef = useRef<HTMLDivElement>(null);
    const [offset, setOffset] = useState(0);
    const [isMobile, setIsMobile] = useState(false);
    const rafRef = useRef<number | null>(null);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const updatePosition = useCallback(() => {
        if (!elementRef.current) return;
        if (disableOnMobile && isMobile) {
            setOffset(0);
            return;
        }

        const rect = elementRef.current.getBoundingClientRect();
        const windowHeight = window.innerHeight;

        // Calculate how far through the viewport the element is
        const elementTop = rect.top;
        const elementHeight = rect.height;

        // Start when element enters viewport, end when it leaves
        const start = windowHeight * (1 - startOffset);
        const end = -elementHeight * endOffset;

        // Progress from 0 (element just entered) to 1 (element just left)
        const progress = 1 - (elementTop - end) / (start - end);
        const clampedProgress = Math.max(0, Math.min(1, progress));

        // Calculate parallax offset
        const maxOffset = elementHeight * speed;
        const multiplier = direction === 'up' ? -1 : 1;
        const newOffset = (clampedProgress - 0.5) * maxOffset * multiplier;

        setOffset(newOffset);
    }, [speed, direction, disableOnMobile, isMobile, startOffset, endOffset]);

    useEffect(() => {
        const handleScroll = () => {
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
            }
            rafRef.current = requestAnimationFrame(updatePosition);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        updatePosition(); // Initial calculation

        return () => {
            window.removeEventListener('scroll', handleScroll);
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
            }
        };
    }, [updatePosition]);

    return {
        ref: elementRef,
        style: {
            transform: `translateY(${offset}px)`,
            willChange: 'transform',
        },
        offset,
    };
};

export default useParallax;
