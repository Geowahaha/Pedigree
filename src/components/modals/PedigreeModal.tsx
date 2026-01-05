
import React, { useState, useEffect } from 'react';
import { Pet } from '@/data/petData';
import { getPedigreeTree, getPetOffspring } from '@/lib/petsService';
import PedigreeTree from '../PedigreeTree';

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

  const calculateAge = (birthDate?: string) => {
    if (!birthDate) return 'Unknown';
    const birth = new Date(birthDate);
    const now = new Date();
    const years = now.getFullYear() - birth.getFullYear();
    const months = now.getMonth() - birth.getMonth();
    if (years === 0) return `${months} months`;
    if (years === 1 && months < 0) return `${12 + months} months`;
    return `${years} year${years > 1 ? 's' : ''}`;
  };

  const handleExportCertificate = () => {
    const certificateContent = `
OFFICIAL PEDIGREE CERTIFICATE
════════════════════════════════

Name: ${pet.name || 'N/A'}
Breed: ${pet.breed || 'N/A'}
Type: ${pet.type?.toUpperCase() || 'DOG'}
Gender: ${pet.gender || 'N/A'}
Birth Date: ${pet.birthDate || 'N/A'}
Color: ${pet.color || 'N/A'}
${pet.registrationNumber ? `Registration: ${pet.registrationNumber}` : 'Registration: Waiting Update'}
Health Certified: ${pet.healthCertified ? 'YES ✓' : 'NO'}
Location: ${pet.location || 'N/A'}
Owner: ${pet.owner || 'N/A'}

════════════════════════════════
Generated on: ${new Date().toLocaleDateString()}
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
    const profileUrl = `${baseUrl}/pedigree/${pet.id}`;
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />

      {showToast && (
        <div className="fixed top-4 right-4 z-[100] bg-primary text-white px-6 py-3 rounded-xl shadow-2xl animate-in slide-in-from-top-2 duration-300 flex items-center gap-3">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {toastMessage}
        </div>
      )}

      <div className="relative bg-background rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-300 overflow-hidden">
        {/* Header */}
        <div className="flex-none flex items-center justify-between p-6 border-b border-primary/10 bg-white/95 backdrop-blur-sm z-20">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Family Tree</h2>
            <p className="text-sm text-foreground/60 mt-1">Pedigree for <span className="font-semibold text-primary">{pet.name}</span></p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-muted transition-colors text-foreground/60 hover:text-foreground">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-muted/5 scroll-smooth">

          {/* Pet Info Card */}
          <div className="bg-white rounded-2xl p-6 mb-8 shadow-sm border border-primary/10">
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="relative group">
                <img src={pet.image} alt={pet.name} className="w-32 h-32 rounded-2xl object-cover shadow-lg group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-black/10" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <h3 className="text-3xl font-extrabold text-foreground tracking-tight">{pet.name}</h3>
                  {pet.type && (
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${pet.type === 'dog' ? 'bg-accent/10 text-accent' : 'bg-primary/10 text-primary'}`}>
                      {pet.type === 'dog' ? 'Dog' : 'Cat'}
                    </span>
                  )}
                  {pet.healthCertified && (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 flex items-center gap-1 border border-green-200">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                      Verified Health
                    </span>
                  )}
                </div>
                <p className="text-foreground/70 mb-6 font-medium">
                  {pet.breed}
                  {(!pet.image || pet.image.includes('placeholder') || pet.image.includes('unsplash')) ? (
                    <> • {pet.color || <span className="text-muted-foreground italic">waiting owner update</span>}</>
                  ) : null}
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 p-4 bg-muted/20 rounded-xl">
                  <div>
                    <span className="text-xs uppercase tracking-wider text-foreground/50 font-semibold">Age</span>
                    <p className="font-bold text-foreground">{calculateAge(pet.birthDate)}</p>
                  </div>
                  <div>
                    <span className="text-xs uppercase tracking-wider text-foreground/50 font-semibold">Gender</span>
                    <p className="font-bold text-foreground capitalize">{pet.gender}</p>
                  </div>
                  <div>
                    <span className="text-xs uppercase tracking-wider text-foreground/50 font-semibold">Location</span>
                    <p className="font-bold text-foreground">{pet.location}</p>
                  </div>
                  <div>
                    <span className="text-xs uppercase tracking-wider text-foreground/50 font-semibold">Owner</span>
                    <p className="font-bold text-foreground">{pet.owner}</p>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  {pet.registrationNumber ? (
                    <span className="text-xs font-bold text-primary px-2 py-1 bg-primary/10 rounded">REG: {pet.registrationNumber}</span>
                  ) : (
                    <span className="text-xs font-bold text-gray-400 px-2 py-1 bg-gray-100 rounded">REG: Waiting Update</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Bloodline Tree */}
          <div
            className={`transition-all duration-300 ${isFullScreen
              ? "fixed inset-0 z-[60] bg-white w-full h-full p-0 flex flex-col overflow-hidden"
              : "bg-white rounded-3xl p-1 sm:p-4 shadow-sm border border-primary/10 overflow-hidden mb-8"}`}
            onDoubleClick={() => setIsFullScreen(!isFullScreen)}
          >
            {/* Header - Floating in Fullscreen, Block in Normal */}
            <div className={`transition-all duration-300 ${isFullScreen
              ? 'absolute top-4 left-4 z-10 flex flex-col items-start pointer-events-none'
              : 'px-4 pt-4 flex items-center justify-between'}`}
            >
              <div className={isFullScreen ? "bg-white/40 backdrop-blur-md p-2 rounded-xl border border-white/20 shadow-sm" : ""}>
                <h3 className={`font-bold text-foreground flex items-center gap-2 ${isFullScreen ? 'text-lg' : 'text-xl'}`}>
                  Detailed Bloodline
                  {isFullScreen && <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full uppercase tracking-wider">Fullscreen</span>}
                </h3>
                <p className={`text-foreground/60 ${isFullScreen ? 'text-xs' : 'text-sm'}`}>Verified Ancestry & Genetic History</p>
              </div>

              {/* Toggle Button - Hidden in Header for Fullscreen to be positioned separately, or kept here if Normal */}
              {!isFullScreen && (
                <button
                  onClick={(e) => { e.stopPropagation(); setIsFullScreen(!isFullScreen); }}
                  className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
                  title="Enter Fullscreen"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                </button>
              )}
            </div>

            {/* Floating Exit Button for Fullscreen */}
            {isFullScreen && (
              <button
                onClick={(e) => { e.stopPropagation(); setIsFullScreen(false); }}
                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/50 hover:bg-white backdrop-blur-md text-gray-700 shadow-sm border border-black/5 transition-all"
                title="Exit Fullscreen"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}

            <div className={`mt-4 ${isFullScreen ? 'mt-0 flex-1 w-full h-full' : ''}`}>
              {loading ? (
                <div className="flex justify-center items-center py-12 h-full">
                  <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
                </div>
              ) : pedigreeTree ? (
                <div className={isFullScreen ? "w-full h-full" : ""}>
                  <PedigreeTree
                    pet={pedigreeTree}
                    onPetClick={(p) => onPetClick && onPetClick(p)}
                    className={isFullScreen ? "h-full rounded-none border-0" : "h-[60vh] min-h-[500px]"}
                  />
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">No pedigree data available</div>
              )}
            </div>

            {!isFullScreen && (
              <div className="mt-4 pb-4 flex justify-center gap-6 text-xs text-foreground/60">
                <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500 shadow-sm" /> Verified Parent</div>
                <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-amber-400 shadow-sm" /> Verification Pending</div>
                <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500 shadow-sm" /> Rejected/Disputed</div>
              </div>
            )}
          </div>

          {/* Offspring / Progeny Section */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-primary/10 overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-foreground">Progeny Record</h3>
                <p className="text-sm text-foreground/60">Registered Offspring</p>
              </div>
              <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full">
                {offspring.length} Offspring
              </span>
            </div>

            {offspring.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {offspring.map(child => (
                  <div
                    key={child.id}
                    onClick={() => onPetClick && onPetClick(child)}
                    className="flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 cursor-pointer transition-all group"
                  >
                    <img src={child.image} alt={child.name} className="w-12 h-12 rounded-lg object-cover bg-gray-100" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm truncate group-hover:text-primary transition-colors">{child.name}</h4>
                      <p className="text-xs text-muted-foreground truncate">{child.registrationNumber || 'Waiting Update'}</p>
                    </div>
                    <svg className="w-4 h-4 text-muted-foreground group-hover:text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground bg-muted/20 rounded-xl border border-dashed border-border">
                No registered offspring found
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="flex-none flex flex-col sm:flex-row items-center justify-between gap-4 p-6 border-t border-primary/10 bg-white/95 backdrop-blur-sm z-20">
          <button onClick={onClose} className="w-full sm:w-auto px-6 py-2.5 rounded-full border border-foreground/10 text-foreground font-bold hover:bg-muted transition-colors">Close</button>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <button onClick={handleExportCertificate} className="px-6 py-2.5 rounded-full bg-white border border-primary/20 text-foreground font-bold hover:bg-primary/5 transition-colors flex items-center justify-center gap-2 shadow-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Export Certificate
            </button>
            <button onClick={handleShareProfile} className="px-6 py-2.5 rounded-full bg-primary text-white font-bold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-primary/25">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
              Share Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PedigreeModal;
