import React from 'react';

interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    text?: string;
    fullScreen?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
    size = 'md',
    text = 'Loading...',
    fullScreen = false
}) => {
    const sizeClasses = {
        sm: 'w-8 h-8',
        md: 'w-12 h-12',
        lg: 'w-16 h-16'
    };

    const containerClass = fullScreen
        ? 'fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50'
        : 'flex items-center justify-center py-12';

    return (
        <div className={containerClass}>
            <div className="flex flex-col items-center gap-4">
                <div className="relative">
                    {/* Outer ring */}
                    <div className={`${sizeClasses[size]} rounded-full border-4 border-primary/20 absolute inset-0`} />
                    {/* Spinning ring */}
                    <div className={`${sizeClasses[size]} rounded-full border-4 border-transparent border-t-primary border-r-primary animate-spin`} />
                    {/* Inner pulsing dot */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    </div>
                </div>
                {text && (
                    <p className="text-sm font-medium text-foreground/60 animate-pulse">{text}</p>
                )}
            </div>
        </div>
    );
};

export default LoadingSpinner;
