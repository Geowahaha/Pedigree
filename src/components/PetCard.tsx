import React from 'react';
import { Pet } from '@/data/petData';

interface PetCardProps {
  pet: Pet;
  onViewPedigree: (pet: Pet) => void;
  onViewDetails: (pet: Pet) => void;
  isOwner?: boolean;
  onCommentClick?: (pet: Pet) => void;
  onEditClick?: (pet: Pet) => void;
}

const PetCard: React.FC<PetCardProps> = ({ pet, onViewPedigree, onViewDetails, isOwner = false, onCommentClick, onEditClick }) => {
  const calculateAge = (birthDate: string) => {
    const birth = new Date(birthDate);
    const now = new Date();
    const years = now.getFullYear() - birth.getFullYear();
    const months = now.getMonth() - birth.getMonth();

    if (years === 0) {
      return `${months} months`;
    } else if (years === 1 && months < 0) {
      return `${12 + months} months`;
    }
    return `${years} year${years > 1 ? 's' : ''}`;
  };

  const [imageError, setImageError] = React.useState(false);

  // Check if we should show the placeholder (no image or error loading)
  const showPlaceholder = !pet.image || imageError;

  const handleCommentClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (onCommentClick) {
      onCommentClick(pet);
      return;
    }
    onViewDetails(pet);
  };

  const handleEditClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!isOwner) return;
    if (onEditClick) {
      onEditClick(pet);
      return;
    }
    onViewDetails(pet);
  };

  return (
    <div className="group bg-white rounded-xl sm:rounded-2xl overflow-hidden border border-[#8B9D83]/15 hover:border-[#8B9D83]/30 active:border-[#8B9D83]/40 transition-all duration-300 hover:shadow-xl hover:shadow-[#8B9D83]/10 hover:-translate-y-1 active:scale-[0.98]">
      {/* Image - Clickable to view details */}
      <div
        className="relative aspect-square overflow-hidden cursor-pointer"
        onClick={() => onViewDetails(pet)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onViewDetails(pet);
          }
        }}
        aria-label={`View details for ${pet.name}`}
      >
        {showPlaceholder ? (
          <div className="w-full h-full bg-[#F5F1E8] flex flex-col items-center justify-center p-3 sm:p-4 text-center">
            <span className="text-3xl sm:text-4xl mb-2 opacity-30">📷</span>
            <span className="text-xs sm:text-sm font-medium text-foreground/40 font-mono">waiting owner update</span>
          </div>
        ) : (
          <img
            src={pet.image}
            alt={pet.name}
            loading="eager"
            decoding="async"
            fetchpriority="high"
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            onError={() => setImageError(true)}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Click to view indicator - hidden on mobile for cleaner UX */}
        <div className="absolute inset-0 items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 hidden sm:flex">
          <div className="bg-white/95 backdrop-blur-sm px-3 sm:px-4 py-1.5 sm:py-2 rounded-full shadow-lg">
            <span className="text-xs sm:text-sm font-semibold text-[#2C2C2C] flex items-center gap-1.5 sm:gap-2">
              <svg className="w-3.5 sm:w-4 h-3.5 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span className="hidden sm:inline">Click to view details</span>
              <span className="sm:hidden">View</span>
            </span>
          </div>
        </div>

        {/* Type Badge */}
        <div className="absolute top-2 sm:top-3 left-2 sm:left-3 z-10">
          <span className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium ${pet.type === 'dog'
            ? 'bg-[#C97064]/90 text-white'
            : 'bg-[#8B9D83]/90 text-white'
            }`}>
            {pet.type === 'dog' ? 'Dog' : 'Cat'}
          </span>
        </div>

        {/* Health Badge */}
        {pet.healthCertified && (
          <div className="absolute top-2 sm:top-3 right-2 sm:right-3 z-10">
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-white/90 flex items-center justify-center" title="Health Certified">
              <svg className="w-3 h-3 sm:w-4 sm:h-4 text-[#8B9D83]" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        )}

        {/* Overlay Actions - always visible on mobile, hover on desktop */}
        <div
          className={`absolute ${pet.healthCertified ? 'top-10 sm:top-14' : 'top-2 sm:top-3'} right-2 sm:right-3 z-10 flex items-center gap-1 sm:gap-2 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-300`}
        >
          <button
            onClick={handleCommentClick}
            className="min-h-[36px] sm:h-9 px-2 sm:px-3 rounded-full bg-white/95 backdrop-blur-sm flex items-center gap-1 sm:gap-1.5 text-[#2C2C2C] text-[10px] sm:text-xs font-semibold shadow-md hover:bg-white active:bg-white/90 transition-colors touch-manipulation"
            title="Comment"
          >
            <svg className="w-3 sm:w-3.5 h-3 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="hidden xs:inline">Comment</span>
          </button>
          {isOwner && (
            <button
              onClick={handleEditClick}
              className="min-h-[36px] sm:h-9 px-2 sm:px-3 rounded-full bg-white/95 backdrop-blur-sm flex items-center gap-1 sm:gap-1.5 text-[#2C2C2C] text-[10px] sm:text-xs font-semibold shadow-md hover:bg-white active:bg-white/90 transition-colors touch-manipulation"
              title="Edit"
            >
              <svg className="w-3 sm:w-3.5 h-3 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-5M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              <span className="hidden xs:inline">Edit</span>
            </button>
          )}
        </div>

        {/* Quick Actions - always visible on mobile */}
        <div className="absolute bottom-2 sm:bottom-3 left-2 sm:left-3 right-2 sm:right-3 flex gap-1.5 sm:gap-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300 z-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails(pet);
            }}
            className="flex-1 min-h-[40px] sm:py-2 px-2 sm:px-3 rounded-lg bg-white/95 text-[#2C2C2C] text-[11px] sm:text-xs font-medium hover:bg-white active:bg-white/90 transition-colors shadow-md touch-manipulation"
          >
            View Details
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewPedigree(pet);
            }}
            className="min-h-[40px] sm:py-2 px-2 sm:px-3 rounded-lg bg-[#2C2C2C]/90 text-white text-[11px] sm:text-xs font-medium hover:bg-[#2C2C2C] active:bg-[#2C2C2C]/80 transition-colors shadow-md touch-manipulation"
          >
            Pedigree
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 sm:p-4">
        <div className="flex items-start justify-between mb-1.5 sm:mb-2">
          <div className="min-w-0 flex-1 mr-2">
            <h3 className="font-semibold text-[#2C2C2C] text-base sm:text-lg truncate">{pet.name}</h3>
            <p className="text-xs sm:text-sm text-[#2C2C2C]/60 truncate">{pet.breed}</p>
          </div>
          <span className={`flex-shrink-0 px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-xs font-medium ${pet.gender === 'male'
            ? 'bg-blue-100 text-blue-700'
            : 'bg-pink-100 text-pink-700'
            }`}>
            {pet.gender === 'male' ? 'M' : 'F'}
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 text-[10px] sm:text-xs text-[#2C2C2C]/50 mb-2 sm:mb-3">
          <span className="flex items-center gap-0.5 sm:gap-1">
            <svg className="w-3 sm:w-3.5 h-3 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {calculateAge(pet.birthDate)}
          </span>
          <span className="flex items-center gap-0.5 sm:gap-1 truncate">
            <svg className="w-3 sm:w-3.5 h-3 sm:h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="truncate">{pet.location.split(',')[0]}</span>
          </span>
        </div>

        {pet.registrationNumber && (
          <div className="pt-2 sm:pt-3 border-t border-[#8B9D83]/10">
            <span className="text-[10px] sm:text-xs text-[#8B9D83] font-mono truncate block">{pet.registrationNumber}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default PetCard;
