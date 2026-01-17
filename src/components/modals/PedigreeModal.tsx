/**
 * PedigreeModal - Black & Gold Luxury Theme
 * Family Tree / Pedigree Viewer
 */

import React, { useState, useEffect } from 'react';
import { Pet } from '@/data/petData';
import { getPedigreeTree, getPetOffspring } from '@/lib/petsService';
import PedigreeTree from '../PedigreeTree';
import { PedigreeAnalytics } from '../PedigreeAnalytics';

interface PedigreeModalProps {
  isOpen: boolean;
  onClose: () => void;
  pet: Pet | null;
  onPetClick?: (pet: Pet) => void;
}

const PedigreeModal: React.FC<PedigreeModalProps> = ({ isOpen, onClose, pet, onPetClick }) => {
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [pedigreeTree, setPedigreeTree] = useState<any>(null);
  const [offspring, setOffspring] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Fetch pedigree tree and offspring when pet changes
  useEffect(() => {
    async function fetchData() {
      if (pet?.id) {
        // Guard against ephemeral IDs
        if (pet.id.startsWith('ext-') || pet.id.startsWith('mock-')) {
          setPedigreeTree(null);
          setOffspring([]);
          return;
        }

        setLoading(true);
        try {
          const [tree, children] = await Promise.all([
            getPedigreeTree(pet.id, 3),
            getPetOffspring(pet.id)
          ]);
          setPedigreeTree(tree);
          setOffspring(children);
        } catch (error) {
          console.error('Failed to fetch pedigree/offspring:', error);
          setPedigreeTree(null);
        } finally {
          setLoading(false);
        }
      }
    }
    fetchData();
  }, [pet?.id]);

  if (!isOpen || !pet) return null;

  const formatBirthDate = (birthDate?: string) => {
    if (!birthDate) return 'Unknown';
    const parsed = new Date(birthDate);
    if (Number.isNaN(parsed.getTime())) return 'Unknown';
    return parsed.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const resolveOwnerName = (petData: any) => {
    if (!petData) return 'Unknown';
    if (typeof petData.owner === 'string') return petData.owner;
    if (typeof petData.owner === 'object' && petData.owner !== null) {
      return petData.owner.full_name || petData.owner.name || petData.owner.username || 'Unknown';
    }
    if (typeof petData.owner_name === 'string' && petData.owner_name.trim()) return petData.owner_name;
    return 'Unknown';
  };

  const resolvedImage = pet.image || (pet as any).image_url || '';
  const resolvedBirthDate = pet.birthDate || (pet as any).birth_date || (pet as any).birthday || '';
  const resolvedRegistrationNumber = pet.registrationNumber || (pet as any).registration_number || '';
  const resolvedOwnerName = resolveOwnerName(pet);

  const handleExportCertificate = () => {
    const certificateContent = `
OFFICIAL PEDIGREE CERTIFICATE
════════════════════════════════

Name: ${pet.name || 'N/A'}
Breed: ${pet.breed || 'N/A'}
Type: ${pet.type?.toUpperCase() || 'DOG'}
Gender: ${pet.gender || 'N/A'}
Birth Date: ${resolvedBirthDate || 'N/A'}
Color: ${pet.color || 'N/A'}
${resolvedRegistrationNumber ? `Registration: ${resolvedRegistrationNumber}` : 'Registration: Waiting Update'}
Health Certified: ${pet.healthCertified ? 'YES ✓' : 'NO'}
Location: ${pet.location || 'N/A'}
Owner: ${resolvedOwnerName || 'N/A'}

════════════════════════════════
Generated on: ${new Date().toLocaleDateString()}
Powered by Eibpo
    `;

    const blob = new Blob([certificateContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${pet.name}-Pedigree-Certificate.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setToastMessage('Certificate downloaded successfully!');
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleShareProfile = async () => {
    const baseUrl = window.location.origin;
    // Use registration number if available, fallback to id
    const slug = resolvedRegistrationNumber || pet.id;
    const profileUrl = `${baseUrl}/pet/${encodeURIComponent(slug)}`;
    const shareText = `Check out ${pet.name}'s pedigree - ${pet.breed} from ${pet.location}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${pet.name}'s Pedigree`,
          text: shareText,
          url: profileUrl,
        });
        setToastMessage('Profile shared successfully!');
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      try {
        await navigator.clipboard.writeText(profileUrl);
        setToastMessage('Profile link copied to clipboard!');
      } catch (err) {
        setToastMessage('Failed to copy link');
      }
    }
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-stretch md:items-center justify-center p-0 md:p-4 animate-in fade-in duration-300">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />

      {/* Toast */}
      {showToast && (
        <div className="fixed top-4 right-4 z-[100] bg-[#C5A059] text-[#0A0A0A] px-6 py-3 rounded-xl shadow-2xl animate-in slide-in-from-top-2 duration-300 flex items-center gap-3 font-bold">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {toastMessage}
        </div>
      )}

      {/* Modal Content */}
      <div className="relative bg-[#1A1A1A] rounded-none md:rounded-2xl shadow-2xl w-full h-full md:h-auto max-w-none md:max-w-6xl max-h-full md:max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-300 overflow-hidden border-0 md:border md:border-[#C5A059]/20">

        {/* Header */}
        <div className="flex-none flex items-center justify-between p-4 md:p-6 border-b border-[#C5A059]/20 bg-[#0D0D0D]">
          <div>
            <h2 className="text-2xl font-['Playfair_Display'] font-bold text-[#F5F5F0]">Family Tree</h2>
            <p className="text-sm text-[#B8B8B8] mt-1">
              Pedigree for <span className="font-semibold text-[#C5A059]">{pet.name}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[#C5A059]/10 transition-colors text-[#B8B8B8] hover:text-[#F5F5F0]"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#1A1A1A]">

          {/* Pet Info Card */}
          <div className="bg-[#0D0D0D] rounded-xl p-6 mb-6 border border-[#C5A059]/10">
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="relative group">
                {resolvedImage ? (
                  <img
                    src={resolvedImage}
                    alt={pet.name}
                    className="w-12 h-12 rounded-xl object-cover shadow-lg group-hover:scale-105 transition-transform duration-500 border border-[#C5A059]/20"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-[#1A1A1A] flex items-center justify-center border border-[#C5A059]/20">
                    <span className="text-2xl opacity-30">🐾</span>
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <h3 className="text-3xl font-['Playfair_Display'] font-bold text-[#F5F5F0]">{pet.name}</h3>
                  {pet.type && (
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${pet.type === 'dog'
                      ? 'bg-[#C5A059]/10 text-[#C5A059] border border-[#C5A059]/30'
                      : 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                      }`}>
                      {pet.type === 'dog' ? 'Dog' : 'Cat'}
                    </span>
                  )}
                  {pet.healthCertified && (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-500/10 text-green-400 flex items-center gap-1 border border-green-500/30">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Verified
                    </span>
                  )}
                </div>
                <p className="text-[#B8B8B8] mb-4 font-medium">
                  {pet.breed}
                  {pet.color && <span className="text-[#C5A059]"> • {pet.color}</span>}
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-[#1A1A1A] rounded-xl border border-[#C5A059]/10">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-[#B8B8B8]/60 font-semibold">Birth Date</span>
                    <p className="font-bold text-[#F5F5F0] text-sm">{formatBirthDate(resolvedBirthDate)}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-[#B8B8B8]/60 font-semibold">Gender</span>
                    <p className={`font-bold text-sm capitalize ${pet.gender === 'male' ? 'text-blue-400' : 'text-pink-400'}`}>
                      {pet.gender === 'male' ? '♂' : '♀'} {pet.gender}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-[#B8B8B8]/60 font-semibold">Location</span>
                    <p className="font-bold text-[#F5F5F0] text-sm">{pet.location || 'Unknown'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-[#B8B8B8]/60 font-semibold">Owner</span>
                    <p className="font-bold text-[#F5F5F0] text-sm truncate">{resolvedOwnerName}</p>
                  </div>
                </div>

                {resolvedRegistrationNumber && (
                  <div className="mt-3">
                    <span className="text-xs font-bold text-[#C5A059] px-3 py-1 bg-[#C5A059]/10 rounded-lg border border-[#C5A059]/30">
                      REG: {resolvedRegistrationNumber}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bloodline Tree */}
          <div
            className={`transition-all duration-300 ${isFullScreen
              ? "fixed inset-0 z-[60] bg-[#0D0D0D] w-full h-full p-0 flex flex-col overflow-hidden"
              : "bg-[#0D0D0D] rounded-xl p-4 border border-[#C5A059]/10 overflow-hidden mb-6"}`}
            onDoubleClick={() => setIsFullScreen(!isFullScreen)}
          >
            {/* Header */}
            <div className={`transition-all duration-300 ${isFullScreen
              ? 'absolute top-4 left-4 z-10 flex flex-col items-start pointer-events-none'
              : 'flex items-center justify-between mb-4'}`}
            >
              <div className={isFullScreen ? "bg-[#0D0D0D]/80 backdrop-blur-md p-3 rounded-xl border border-[#C5A059]/20" : ""}>
                <h3 className={`font-bold text-[#F5F5F0] flex items-center gap-2 ${isFullScreen ? 'text-lg' : 'text-xl'}`}>
                  <span className="text-[#C5A059]">🌳</span> Bloodline
                  {isFullScreen && <span className="text-[10px] bg-[#C5A059]/20 text-[#C5A059] px-2 py-0.5 rounded-full uppercase tracking-wider">Fullscreen</span>}
                </h3>
                <p className={`text-[#B8B8B8]/60 ${isFullScreen ? 'text-xs' : 'text-sm'}`}>Verified Ancestry & Genetic History</p>
              </div>

              {/* Expand hint */}
              {!isFullScreen && (
                <button
                  onClick={(e) => { e.stopPropagation(); setIsFullScreen(true); }}
                  className="flex items-center gap-2 px-3 py-1.5 bg-[#C5A059]/10 text-[#C5A059] rounded-full text-xs font-medium border border-[#C5A059]/20 hover:bg-[#C5A059]/20 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                  Expand
                </button>
              )}
            </div>

            {/* Exit Fullscreen */}
            {isFullScreen && (
              <button
                onClick={(e) => { e.stopPropagation(); setIsFullScreen(false); }}
                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-[#1A1A1A] hover:bg-[#C5A059]/20 text-[#B8B8B8] hover:text-[#F5F5F0] border border-[#C5A059]/20 transition-all"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}

            <div className={`${isFullScreen ? 'flex-1 w-full h-full' : ''}`}>
              {loading ? (
                <div className="flex justify-center items-center py-12 h-full">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#C5A059] border-t-transparent"></div>
                </div>
              ) : pedigreeTree ? (
                <div className={isFullScreen ? "w-full h-full" : ""}>
                  <PedigreeTree
                    pet={pedigreeTree}
                    onPetClick={(p) => onPetClick && onPetClick(p)}
                    className={isFullScreen ? "h-full rounded-none border-0" : "h-[50vh] min-h-[400px]"}
                  />
                </div>
              ) : (
                <div className="text-center py-12 text-[#B8B8B8]/60">No pedigree data available</div>
              )}
            </div>

            {!isFullScreen && (
              <div className="mt-4 flex justify-center gap-6 text-xs text-[#B8B8B8]/60">
                <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500" /> Verified</div>
                <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#C5A059]" /> Pending</div>
                <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500" /> Disputed</div>
              </div>
            )}
          </div>

          {/* Analytics Dashboard */}
          {!isFullScreen && (
            <div className="bg-[#0D0D0D] rounded-xl p-6 border border-[#C5A059]/10 mb-6 transition-all hover:border-[#C5A059]/30">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-[#F5F5F0]">Pedigree Analytics</h3>
                  <p className="text-sm text-[#B8B8B8]/60">Genetic Profile & Influence</p>
                </div>
              </div>
              <PedigreeAnalytics pet={pet} tree={pedigreeTree} />
            </div>
          )}

          {/* Offspring / Progeny Section */}
          <div className="bg-[#0D0D0D] rounded-xl p-6 border border-[#C5A059]/10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-[#F5F5F0]">Progeny Record</h3>
                <p className="text-sm text-[#B8B8B8]/60">Registered Offspring</p>
              </div>
              <span className="px-3 py-1 bg-[#C5A059]/10 text-[#C5A059] text-xs font-bold rounded-full border border-[#C5A059]/30">
                {offspring.length} Offspring
              </span>
            </div>

            {offspring.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {offspring.map(child => (
                  <div
                    key={child.id}
                    onClick={() => onPetClick && onPetClick(child)}
                    className="flex items-center gap-3 p-3 rounded-xl border border-[#C5A059]/10 hover:border-[#C5A059]/30 hover:bg-[#C5A059]/5 cursor-pointer transition-all group"
                  >
                    <img
                      src={child.image}
                      alt={child.name}
                      className="w-12 h-12 rounded-lg object-cover bg-[#1A1A1A]"
                      onError={(e) => { (e.target as HTMLImageElement).src = ''; }}
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm text-[#F5F5F0] truncate group-hover:text-[#C5A059] transition-colors">{child.name}</h4>
                      <p className="text-xs text-[#B8B8B8]/60 truncate">{child.registrationNumber || 'Pending'}</p>
                    </div>
                    <svg className="w-4 h-4 text-[#B8B8B8]/40 group-hover:text-[#C5A059]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-[#B8B8B8]/40 bg-[#1A1A1A] rounded-xl border border-dashed border-[#C5A059]/10">
                No registered offspring found
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="flex-none flex flex-col sm:flex-row items-center justify-between gap-4 p-6 border-t border-[#C5A059]/20 bg-[#0D0D0D]">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl border border-[#C5A059]/30 text-[#B8B8B8] font-bold hover:bg-[#C5A059]/10 hover:text-[#F5F5F0] transition-colors"
          >
            Close
          </button>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <button
              onClick={handleExportCertificate}
              className="px-6 py-2.5 rounded-xl bg-[#1A1A1A] border border-[#C5A059]/20 text-[#F5F5F0] font-bold hover:bg-[#C5A059]/10 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export Certificate
            </button>
            <button
              onClick={handleShareProfile}
              className="px-6 py-2.5 rounded-xl bg-[#C5A059] text-[#0A0A0A] font-bold hover:bg-[#D4C4B5] transition-colors flex items-center justify-center gap-2 shadow-lg shadow-[#C5A059]/25"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Share Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PedigreeModal;
