import React from 'react';

interface SkeletonCardProps {
    type?: 'pet' | 'product';
}

const SkeletonCard: React.FC<SkeletonCardProps> = ({ type = 'pet' }) => {
    return (
        <div className="group rounded-3xl bg-white/50 backdrop-blur-sm border border-primary/10 overflow-hidden animate-pulse">
            {/* Image skeleton */}
            <div className="aspect-square bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"
                    style={{ animation: 'shimmer 2s infinite' }} />
            </div>

            {/* Content skeleton */}
            <div className="p-6 space-y-3">
                {/* Title */}
                <div className="h-6 bg-primary/10 rounded-full w-3/4" />

                {/* Subtitle */}
                <div className="h-4 bg-primary/5 rounded-full w-1/2" />

                {/* Details */}
                <div className="space-y-2 pt-2">
                    <div className="h-3 bg-primary/5 rounded-full w-full" />
                    <div className="h-3 bg-primary/5 rounded-full w-5/6" />
                </div>

                {/* Button */}
                <div className="pt-4">
                    <div className="h-12 bg-primary/10 rounded-full" />
                </div>
            </div>
        </div>
    );
};

export default SkeletonCard;
