
import React from 'react';
import { motion } from 'framer-motion';

interface MagicAdCardProps {
    onClick: () => void;
}

const MagicAdCard: React.FC<MagicAdCardProps> = ({ onClick }) => {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.02 }}
            className="relative overflow-hidden rounded-[24px] cursor-pointer group break-inside-avoid mb-4"
            onClick={onClick}
        >
            {/* Animated Gradient Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 animate-gradient-xy"></div>

            {/* Shimmer Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer"></div>

            <div className="relative p-6 h-[280px] flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center mb-4 shadow-lg border border-white/30 group-hover:scale-110 transition-transform duration-300">
                    <span className="text-3xl">✨</span>
                </div>

                <h3 className="text-2xl font-bold text-white mb-2 font-['Playfair_Display']">
                    Magic Photo
                </h3>

                <p className="text-white/90 text-sm font-medium leading-relaxed max-w-[200px]">
                    Turn your pet's photo into a magical commercial instantly with AI.
                </p>

                <div className="mt-6 px-4 py-2 bg-white text-purple-600 rounded-full text-xs font-bold shadow-lg flex items-center gap-1 group-hover:bg-purple-50 transition-colors">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Try It Now
                </div>
            </div>
        </motion.div>
    );
};

export default MagicAdCard;
