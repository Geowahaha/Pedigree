import React from 'react';

interface CTASectionProps {
    onGetStarted: () => void;
}

const CTASection: React.FC<CTASectionProps> = ({ onGetStarted }) => {
    return (
        <section className="py-16 sm:py-20 md:py-24 lg:py-32 relative overflow-hidden">
            {/* Background with Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary via-secondary to-primary/80 opacity-95" />

            {/* Decorative Elements */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-0 right-0 w-[300px] sm:w-[400px] md:w-[600px] h-[300px] sm:h-[400px] md:h-[600px] bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 animate-zen-breathe" />
                <div className="absolute bottom-0 left-0 w-[300px] sm:w-[400px] md:w-[600px] h-[300px] sm:h-[400px] md:h-[600px] bg-white/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 animate-zen-breathe" style={{ animationDelay: '2s' }} />

                {/* Pattern Overlay */}
                <div className="absolute inset-0 opacity-5">
                    <svg width="100%" height="100%">
                        <defs>
                            <pattern id="dots" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                                <circle cx="2" cy="2" r="1" fill="white" />
                            </pattern>
                        </defs>
                        <rect x="0" y="0" width="100%" height="100%" fill="url(#dots)" />
                    </svg>
                </div>
            </div>

            <div className="zen-container max-w-5xl px-4 sm:px-6 lg:px-8 relative z-10">
                <div className="text-center">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 mb-6 sm:mb-10 animate-in fade-in zoom-in duration-700">
                        <span className="w-1.5 sm:w-2 h-1.5 sm:h-2 rounded-full bg-white animate-pulse" />
                        <span className="text-xs sm:text-sm font-medium text-white/90 tracking-wide">Join Today</span>
                    </div>

                    {/* Headline */}
                    <h2 className="zen-display text-2xl sm:text-4xl md:text-5xl lg:text-6xl text-white mb-4 sm:mb-6 md:mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100 leading-tight">
                        Ready to Preserve Your
                        <span className="block mt-1 sm:mt-2 md:mt-3">Pet's Legacy?</span>
                    </h2>

                    {/* Description */}
                    <p className="zen-body-lg text-sm sm:text-base lg:text-lg text-white/70 max-w-2xl mx-auto mb-8 sm:mb-10 md:mb-12 leading-relaxed animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200 px-2 sm:px-0">
                        Join thousands of breeders worldwide who trust Eibpo to manage their breeding programs, track pedigrees, and connect with fellow enthusiasts.
                    </p>

                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-5 justify-center items-center animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300 px-4 sm:px-0">
                        <button
                            onClick={onGetStarted}
                            className="group w-full sm:w-auto flex items-center justify-center gap-2 sm:gap-3 px-6 sm:px-10 py-4 sm:py-5 rounded-xl sm:rounded-2xl bg-white text-primary font-semibold text-base sm:text-lg hover:bg-white/95 transition-all duration-500 shadow-2xl hover:shadow-[0_25px_60px_rgba(0,0,0,0.25)] hover:-translate-y-1 active:translate-y-0 active:scale-[0.98] touch-manipulation min-h-[48px]"
                        >
                            Get Started Free
                            <svg className="w-4 sm:w-5 h-4 sm:h-5 group-hover:translate-x-1.5 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </svg>
                        </button>
                        <button
                            onClick={() => {
                                const element = document.getElementById('search');
                                if (element) element.scrollIntoView({ behavior: 'smooth' });
                            }}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 sm:gap-3 px-6 sm:px-10 py-4 sm:py-5 rounded-xl sm:rounded-2xl bg-white/5 backdrop-blur-sm text-white font-semibold text-base sm:text-lg border border-white/20 hover:bg-white/10 hover:border-white/40 transition-all duration-500 hover:-translate-y-1 active:translate-y-0 active:scale-[0.98] touch-manipulation min-h-[48px]"
                        >
                            Explore Pedigrees
                            <svg className="w-4 sm:w-5 h-4 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </button>
                    </div>

                    {/* Features List */}
                    <div className="mt-8 sm:mt-10 md:mt-12 flex flex-col sm:flex-row flex-wrap justify-center gap-4 sm:gap-6 md:gap-8 lg:gap-12 text-white/80 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-400">
                        <div className="flex items-center justify-center gap-2">
                            <svg className="w-4 sm:w-5 h-4 sm:h-5 text-white flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span className="text-xs sm:text-sm font-medium">Free to Start</span>
                        </div>
                        <div className="flex items-center justify-center gap-2">
                            <svg className="w-4 sm:w-5 h-4 sm:h-5 text-white flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span className="text-xs sm:text-sm font-medium">No Credit Card Required</span>
                        </div>
                        <div className="flex items-center justify-center gap-2">
                            <svg className="w-4 sm:w-5 h-4 sm:h-5 text-white flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            <span className="text-xs sm:text-sm font-medium">Setup in Minutes</span>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default CTASection;
