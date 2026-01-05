import React, { useEffect, useState } from 'react';
import { UserReview, getUserReviews, addUserReview } from '@/lib/professional_features';

interface OwnerReputationProps {
    ownerId: string;
    ownerName: string;
}

export const OwnerReputation: React.FC<OwnerReputationProps> = ({ ownerId, ownerName }) => {
    const [reviews, setReviews] = useState<UserReview[]>([]);
    const [showAll, setShowAll] = useState(false);
    const [average, setAverage] = useState(0);

    useEffect(() => {
        getUserReviews(ownerId).then(data => {
            setReviews(data);
            const avg = data.reduce((acc, r) => acc + r.rating, 0) / (data.length || 1);
            setAverage(avg);
        });
    }, [ownerId]);

    if (reviews.length === 0) return null; // Or show "No reviews yet"

    const displayReviews = showAll ? reviews : reviews.slice(0, 1);

    return (
        <div className="mt-4 p-4 rounded-xl bg-gradient-to-br from-[#F5F1E8] to-white border border-[#8B9D83]/10">
            <div className="flex items-center justify-between mb-3">
                <div>
                    <h4 className="font-semibold text-[#2C2C2C] text-sm">Owner Reputation</h4>
                    <div className="flex items-center gap-1">
                        <span className="text-lg font-bold text-[#2C2C2C]">{average.toFixed(1)}</span>
                        <div className="flex text-yellow-400 text-sm">
                            {[...Array(5)].map((_, i) => (
                                <span key={i}>{i < Math.round(average) ? '★' : '☆'}</span>
                            ))}
                        </div>
                        <span className="text-xs text-[#2C2C2C]/40">({reviews.length} reviews)</span>
                    </div>
                </div>
            </div>

            <div className="space-y-3">
                {displayReviews.map(review => (
                    <div key={review.id} className="bg-white/50 p-3 rounded-lg text-sm">
                        <div className="flex justify-between items-start mb-1">
                            <span className="font-semibold text-[#2C2C2C] text-xs">{review.reviewer?.full_name || 'User'}</span>
                            <span className="text-[10px] text-[#2C2C2C]/30">{new Date(review.created_at).toLocaleDateString()}</span>
                        </div>
                        <p className="text-[#2C2C2C]/70 italic">"{review.comment}"</p>
                    </div>
                ))}
            </div>

            {reviews.length > 1 && (
                <button
                    onClick={() => setShowAll(!showAll)}
                    className="w-full mt-3 py-1.5 text-xs font-semibold text-[#8B9D83] hover:text-[#7A8C72] transition-colors"
                >
                    {showAll ? 'Show Less' : `View All ${reviews.length} Reviews`}
                </button>
            )}
        </div>
    );
};
