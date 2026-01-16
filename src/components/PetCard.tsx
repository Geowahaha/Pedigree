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
    <div className="group bg-white rounded-2xl overflow-hidden border border-[#8B9D83]/15 hover:border-[#8B9D83]/30 transition-all duration-300 hover:shadow-xl hover:shadow-[#8B9D83]/10 hover:-translate-y-1">
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
          <div className="w-full h-full bg-[#F5F1E8] flex flex-col items-center justify-center p-4 text-center">
            <span className="text-4xl mb-2 opacity-30">📷</span>
            <span className="text-sm font-medium text-foreground/40 font-mono">waiting owner update</span>
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

        {/* Click to view indicator */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="bg-white/95 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg">
            <span className="text-sm font-semibold text-[#2C2C2C] flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Click to view details
            </span>
          </div>
        </div>

        {/* Type Badge */}
        <div className="absolute top-3 left-3 z-10">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${pet.type === 'dog'
            ? 'bg-[#C97064]/90 text-white'
            : 'bg-[#8B9D83]/90 text-white'
            }`}>
            {pet.type === 'dog' ? 'Dog' : 'Cat'}
          </span>
        </div>

        {/* Health Badge */}
        {pet.healthCertified && (
          <div className="absolute top-3 right-3 z-10">
            <div className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center" title="Health Certified">
              <svg className="w-4 h-4 text-[#8B9D83]" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        )}

        {/* Overlay Actions */}
        <div
          className={`absolute ${pet.healthCertified ? 'top-14' : 'top-3'} right-3 z-10 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300`}
        >
          <button
            onClick={handleCommentClick}
            className="h-9 px-3 rounded-full bg-white/95 backdrop-blur-sm flex items-center gap-1.5 text-[#2C2C2C] text-xs font-semibold shadow-md hover:bg-white transition-colors"
            title="Comment"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Comment
          </button>
          {isOwner && (
            <button
              onClick={handleEditClick}
              className="h-9 px-3 rounded-full bg-white/95 backdrop-blur-sm flex items-center gap-1.5 text-[#2C2C2C] text-xs font-semibold shadow-md hover:bg-white transition-colors"
              title="Edit"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-5M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Edit
            </button>
          )}
        </div>

        {/* Quick Actions */}
        <div className="absolute bottom-3 left-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails(pet);
            }}
            className="flex-1 py-2 px-3 rounded-lg bg-white/95 text-[#2C2C2C] text-xs font-medium hover:bg-white transition-colors shadow-md"
          >
            View Details
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewPedigree(pet);
            }}
            className="py-2 px-3 rounded-lg bg-[#2C2C2C]/90 text-white text-xs font-medium hover:bg-[#2C2C2C] transition-colors shadow-md"
          >
            Pedigree
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="font-semibold text-[#2C2C2C] text-lg">{pet.name}</h3>
            <p className="text-sm text-[#2C2C2C]/60">{pet.breed}</p>
          </div>
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${pet.gender === 'male'
            ? 'bg-blue-100 text-blue-700'
            : 'bg-pink-100 text-pink-700'
            }`}>
            {pet.gender === 'male' ? 'Male' : 'Female'}
          </span>
        </div>

        <div className="flex items-center gap-4 text-xs text-[#2C2C2C]/50 mb-3">
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {calculateAge(pet.birthDate)}
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {pet.location.split(',')[0]}
          </span>
        </div>

        {pet.registrationNumber && (
          <div className="pt-3 border-t border-[#8B9D83]/10">
            <span className="text-xs text-[#8B9D83] font-mono">{pet.registrationNumber}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default PetCard;
