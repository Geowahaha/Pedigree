import React from 'react';
import { MarketplaceListing } from './MarketplaceFeed';
import { formatDistanceToNow } from 'date-fns';

interface ListingCardProps {
    listing: MarketplaceListing;
    onClick?: () => void;
}

const ListingCard: React.FC<ListingCardProps> = ({ listing, onClick }) => {
    return (
        <div
            onClick={onClick}
            className="group cursor-pointer flex flex-col gap-2"
        >
            <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 relative">
                {listing.images && listing.images.length > 0 ? (
                    <img
                        src={listing.images[0]}
                        alt={listing.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <span className="text-4xl">📷</span>
                    </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
            </div>

            <div className="px-1">
                <div className="flex items-baseline gap-1">
                    <span className="text-lg font-bold text-[#050505]">
                        {listing.currency === 'THB' ? '฿' : '$'}
                        {listing.price.toLocaleString()}
                    </span>
                </div>

                <h3 className="text-[17px] font-semibold text-[#050505] leading-snug line-clamp-2 group-hover:underline decoration-1">
                    {listing.title}
                </h3>

                <div className="flex items-center justify-between mt-1 text-[13px] text-gray-500">
                    <span className="truncate max-w-[70%]">{listing.location || 'Bangkok'}</span>
                    <span>{formatDistanceToNow(new Date(listing.created_at), { addSuffix: true })}</span>
                </div>
            </div>
        </div>
    );
};

export default ListingCard;
