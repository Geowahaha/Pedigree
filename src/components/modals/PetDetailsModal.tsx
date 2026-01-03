import React from 'react';
import { Pet } from '@/data/petData';

interface PetDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  pet: Pet | null;
  onViewPedigree: (pet: Pet) => void;
}

const PetDetailsModal: React.FC<PetDetailsModalProps> = ({ isOpen, onClose, pet, onViewPedigree }) => {
  if (!isOpen || !pet) return null;

  const calculateAge = (birthDate: string) => {
    const birth = new Date(birthDate);
    const now = new Date();
    const years = now.getFullYear() - birth.getFullYear();
    const months = now.getMonth() - birth.getMonth();

    if (years === 0) return `${months} months`;
    if (years === 1 && months < 0) return `${12 + months} months`;
    return `${years} year${years > 1 ? 's' : ''} old`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Hero Image */}
        <div className="relative h-64 sm:h-80">
          <img
            src={pet.image}
            alt={pet.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl bg-white/80 hover:bg-white transition-colors"
          >
            <svg className="w-6 h-6 text-[#2C2C2C]/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Badges */}
          <div className="absolute top-4 left-4 flex gap-2">
            <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${pet.type === 'dog'
                ? 'bg-[#C97064] text-white'
                : 'bg-[#8B9D83] text-white'
              }`}>
              {pet.type === 'dog' ? 'Dog' : 'Cat'}
            </span>
            {pet.healthCertified && (
              <span className="px-3 py-1.5 rounded-full text-sm font-medium bg-green-500 text-white flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Certified
              </span>
            )}
          </div>

          {/* Name Overlay & Main Actions */}
          <div className="absolute bottom-4 left-4 right-4">
            <h2 className="text-3xl font-bold text-white mb-1">{pet.name}</h2>
            <div className="flex items-center justify-between">
              <p className="text-white/90 font-medium">{pet.breed}</p>

              {/* Prominent Pedigree Button */}
              <button
                onClick={() => {
                  onClose();
                  onViewPedigree(pet);
                }}
                className="px-4 py-2 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 text-white text-sm font-bold hover:bg-white/30 transition-all flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Family Tree
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[50vh]">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="p-4 rounded-xl bg-[#F5F1E8]">
              <span className="text-xs text-[#2C2C2C]/50 uppercase tracking-wider">Age</span>
              <p className="font-semibold text-[#2C2C2C] mt-1">{calculateAge(pet.birthDate)}</p>
            </div>
            <div className="p-4 rounded-xl bg-[#F5F1E8]">
              <span className="text-xs text-[#2C2C2C]/50 uppercase tracking-wider">Gender</span>
              <p className="font-semibold text-[#2C2C2C] mt-1 capitalize">{pet.gender}</p>
            </div>
            <div className="p-4 rounded-xl bg-[#F5F1E8]">
              <span className="text-xs text-[#2C2C2C]/50 uppercase tracking-wider">Color</span>
              <p className="font-semibold text-[#2C2C2C] mt-1">{pet.color}</p>
            </div>
            <div className="p-4 rounded-xl bg-[#F5F1E8]">
              <span className="text-xs text-[#2C2C2C]/50 uppercase tracking-wider">Location</span>
              <p className="font-semibold text-[#2C2C2C] mt-1">{pet.location.split(',')[0]}</p>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-[#8B9D83]/10">
              <span className="text-[#2C2C2C]/60">Birth Date</span>
              <span className="font-medium text-[#2C2C2C]">{formatDate(pet.birthDate)}</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-[#8B9D83]/10">
              <span className="text-[#2C2C2C]/60">Full Location</span>
              <span className="font-medium text-[#2C2C2C]">{pet.location}</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-[#8B9D83]/10">
              <span className="text-[#2C2C2C]/60">Owner</span>
              <span className="font-medium text-[#2C2C2C]">{pet.owner}</span>
            </div>
            {pet.registrationNumber && (
              <div className="flex items-center justify-between py-3 border-b border-[#8B9D83]/10">
                <span className="text-[#2C2C2C]/60">Registration #</span>
                <span className="font-mono font-medium text-[#8B9D83]">{pet.registrationNumber}</span>
              </div>
            )}
            <div className="flex items-center justify-between py-3 border-b border-[#8B9D83]/10">
              <span className="text-[#2C2C2C]/60">Health Status</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${pet.healthCertified
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-600'
                }`}>
                {pet.healthCertified ? 'Certified' : 'Not Certified'}
              </span>
            </div>
          </div>

          {/* Contact Owner */}
          <div className="mt-6 p-4 rounded-xl bg-[#8B9D83]/10 border border-[#8B9D83]/20">
            <h4 className="font-semibold text-[#2C2C2C] mb-2">Interested in this pet?</h4>
            <p className="text-sm text-[#2C2C2C]/60 mb-3">
              Contact the owner to learn more about {pet.name}'s background, health records, and availability.
            </p>
            <button className="w-full py-3 rounded-xl bg-[#8B9D83] text-white font-medium hover:bg-[#7A8C72] transition-colors flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Contact Owner
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-[#8B9D83]/10 bg-[#F5F1E8]/50">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 rounded-xl border border-[#8B9D83]/30 text-[#2C2C2C] font-medium hover:bg-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default PetDetailsModal;
