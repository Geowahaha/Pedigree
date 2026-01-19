import React from 'react';

interface QuickActionsProps {
    petId: string;
    petName?: string;
    onLike: () => void;
    onShare: () => void;
    onAddToCollection: () => void;
    isLiked: boolean;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
    petId,
    petName,
    onLike,
    onShare,
    onAddToCollection,
    isLiked,
}) => {
    const handleShare = async () => {
        // Generate pet-specific share URL
        const shareUrl = `${window.location.origin}/pet/${petId}`;
        const shareTitle = petName ? `Check out ${petName}!` : 'Check out this pet!';

        if (navigator.share) {
            try {
                await navigator.share({
                    title: shareTitle,
                    url: shareUrl,
                });
            } catch (err) {
                // User cancelled
            }
        } else {
            // Fallback: Copy to clipboard
            navigator.clipboard.writeText(shareUrl);
            alert('Link copied to clipboard!');
        }
        onShare();
    };

    return (
        <div
            className="absolute bottom-3 left-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:translate-y-0 translate-y-2"
            onClick={(e) => e.stopPropagation()}
        >
            {/* Quick Like */}
            <button
                onClick={onLike}
                className={`flex-1 py-2 px-3 rounded-lg font-medium text-xs flex items-center justify-center gap-1.5 transition-all ${isLiked
                    ? 'bg-[#ea4c89] text-white shadow-lg'
                    : 'bg-white/90 backdrop-blur-sm text-gray-700 hover:bg-white'
                    }`}
            >
                <svg className="w-3.5 h-3.5" fill={isLiked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                {isLiked ? 'Liked' : 'Like'}
            </button>

            {/* Quick Share */}
            <button
                onClick={handleShare}
                className="flex-1 py-2 px-3 rounded-lg font-medium text-xs flex items-center justify-center gap-1.5 bg-white/90 backdrop-blur-sm text-gray-700 hover:bg-white transition-all"
            >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Share
            </button>

            {/* Add to Collection */}
            <button
                onClick={onAddToCollection}
                className="px-3 py-2 rounded-lg bg-white/90 backdrop-blur-sm text-gray-700 hover:bg-white transition-all"
            >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
            </button>
        </div>
    );
};
