
import React, { useState } from 'react';
import { Pet, pets } from '@/data/petData';
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

  if (!isOpen || !pet) return null;

  const calculateAge = (birthDate: string) => {
    const birth = new Date(birthDate);
    const now = new Date();
    const years = now.getFullYear() - birth.getFullYear();
    const months = now.getMonth() - birth.getMonth();

    if (years === 0) return `${months} months`;
    if (years === 1 && months < 0) return `${12 + months} months`;
    return `${years} year${years > 1 ? 's' : ''}`;
  };

  const handleExportCertificate = () => {
    // Create a simple certificate content
    const certificateContent = `
OFFICIAL PEDIGREE CERTIFICATE
════════════════════════════════

Name: ${pet.name}
Breed: ${pet.breed}
Type: ${pet.type.toUpperCase()}
Gender: ${pet.gender}
Birth Date: ${pet.birthDate}
Color: ${pet.color}
${pet.registrationNumber ? `Registration: ${pet.registrationNumber}` : ''}
Health Certified: ${pet.healthCertified ? 'YES ✓' : 'NO'}
Location: ${pet.location}
Owner: ${pet.owner}

════════════════════════════════
Generated on: ${new Date().toLocaleDateString()}
    `;

    // Create a Blob and download
    const blob = new Blob([certificateContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${pet.name}-Pedigree-Certificate.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Show toast
    setToastMessage('Certificate downloaded successfully!');
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleShareProfile = async () => {
    // Generate distinct URL with query param
    const baseUrl = window.location.href.split('?')[0];
    const profileUrl = `${baseUrl}?petId=${pet.id}`;
    const shareText = `Check out ${pet.name}'s pedigree - ${pet.breed} from ${pet.location}`;

    // Try native share API first (mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${pet.name}'s Pedigree`,
          text: shareText,
          url: profileUrl,
        });
        setToastMessage('Profile shared successfully!');
      } catch (err) {
        // User cancelled or error
        console.log('Share cancelled');
        return;
      }
    } else {
      // Fallback: Copy to clipboard
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
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-4 right-4 z-[100] bg-primary text-white px-6 py-3 rounded-xl shadow-2xl animate-in slide-in-from-top-2 duration-300 flex items-center gap-3">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {toastMessage}
        </div>
      )}

      {/* Modal */}
      <div className="relative bg-background rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-300 overflow-hidden">
        {/* Header - Sticky */}
        <div className="flex-none flex items-center justify-between p-6 border-b border-primary/10 bg-white/95 backdrop-blur-sm z-20">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Family Tree</h2>
            <p className="text-sm text-foreground/60 mt-1">Pedigree for <span className="font-semibold text-primary">{pet.name}</span></p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-muted transition-colors text-foreground/60 hover:text-foreground"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 bg-muted/5 scroll-smooth">
          {/* Pet Info Card */}
          <div className="bg-white rounded-2xl p-6 mb-8 shadow-sm border border-primary/10">
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="relative group">
                <img
                  src={pet.image}
                  alt={pet.name}
                  className="w-32 h-32 rounded-2xl object-cover shadow-lg group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-black/10" />
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <h3 className="text-3xl font-extrabold text-foreground tracking-tight">{pet.name}</h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${pet.type === 'dog' ? 'bg-accent/10 text-accent' : 'bg-primary/10 text-primary'
                    }`}>
                    {pet.type === 'dog' ? 'Dog' : 'Cat'}
                  </span>
                  {pet.healthCertified && (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 flex items-center gap-1 border border-green-200">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Verified Health
                    </span>
                  )}
                </div>
                <p className="text-foreground/70 mb-6 font-medium">{pet.breed} • {pet.color}</p>
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
                {pet.registrationNumber && (
                  <div className="mt-4 flex items-center gap-2">
                    <span className="text-xs font-bold text-primary px-2 py-1 bg-primary/10 rounded">REG: {pet.registrationNumber}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Pedigree Tree Component */}
          <div className="bg-white rounded-3xl p-1 sm:p-4 shadow-sm border border-primary/10 overflow-hidden mb-8">
            <div className="px-4 pt-4">
              <h3 className="text-xl font-bold text-foreground">Detailed Bloodline</h3>
              <p className="text-sm text-foreground/60">Verified Ancestry & Genetic History</p>
            </div>
            <div className="mt-4">
              <PedigreeTree
                pet={pet}
                allPets={pets}
                onPetClick={(p) => {
                  // Open clicked pet in tree
                  if (onPetClick) onPetClick(p);
                }}
              />
            </div>
            <div className="mt-4 pb-4 flex justify-center gap-6 text-xs text-foreground/60">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 shadow-sm" />
                Verified Parent
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 shadow-sm" />
                Verification Pending
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 shadow-sm" />
                Rejected/Disputed
              </div>
            </div>
          </div>

          {/* Legacy & Offspring Section - Added for "Whole Family" View */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-6 px-4">
              <div>
                <h4 className="text-lg font-bold text-foreground flex items-center gap-2">
                  Legacy & Offspring
                  <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] uppercase font-extrabold tracking-wider">Expanded</span>
                </h4>
                <p className="text-sm text-muted-foreground">Direct descendents and future litters</p>
              </div>
            </div>

            {/* Horizontal Scroll Container */}
            <div className="flex gap-4 overflow-x-auto pb-6 px-4 snap-x">

              {/* Card 1: Available Puppies (Priority) */}
              {pets.filter(p => (p.parentIds?.sire === pet.id || p.parentIds?.dam === pet.id) && calculateAge(p.birthDate).includes('months')).map(puppy => (
                <div key={puppy.id} className="min-w-[280px] snap-center bg-white rounded-2xl border border-primary/20 shadow-sm overflow-hidden group cursor-pointer hover:shadow-md transition-all">
                  <div className="relative h-40 overflow-hidden">
                    <img src={puppy.image} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt={puppy.name} />
                    <div className="absolute top-3 right-3 bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider shadow-sm">
                      Available Now
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h5 className="font-bold text-foreground text-lg">{puppy.name}</h5>
                        <p className="text-xs text-muted-foreground">{calculateAge(puppy.birthDate)} • {puppy.gender}</p>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                      </div>
                    </div>
                    <div className="pt-3 border-t border-dashed border-primary/10 mt-2 flex items-center justify-between">
                      <span className="text-xs font-medium text-primary bg-primary/5 px-2 py-1 rounded">Direct Offspring</span>
                      {onPetClick && (
                        <button onClick={() => onPetClick(puppy)} className="text-xs font-bold text-foreground hover:underline">View Profile</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Card 2: Upcoming Litter (Mock) */}
              <div className="min-w-[280px] snap-center bg-gradient-to-br from-[#F5F1E8] to-white rounded-2xl border border-dashed border-primary/30 p-6 flex flex-col justify-between group hover:border-primary/60 transition-colors">
                <div>
                  <div className="flex items-center gap-2 mb-4 text-primary">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span className="text-xs font-bold uppercase tracking-wider">Coming Soon</span>
                  </div>
                  <h5 className="font-bold text-xl text-foreground mb-1">Spring 2026 Litter</h5>
                  <p className="text-sm text-muted-foreground mb-4">Planned breeding with <span className="font-semibold text-primary">Ch. Royal Gold</span></p>
                </div>
                <button className="w-full py-2 rounded-xl bg-white border border-primary/20 text-xs font-bold text-primary hover:bg-primary hover:text-white transition-all shadow-sm">
                  Join Waiting List
                </button>
              </div>

              {/* Card 3: Past Offspring (Found in mock data) */}
              {pets.filter(p => (p.parentIds?.sire === pet.id || p.parentIds?.dam === pet.id) && !calculateAge(p.birthDate).includes('months')).map(child => (
                <div key={child.id} onClick={() => onPetClick && onPetClick(child)} className="min-w-[220px] snap-center bg-white rounded-2xl border border-gray-100 p-4 flex flex-col gap-3 cursor-pointer hover:border-primary/30 transition-all">
                  <div className="flex items-center gap-3">
                    <img src={child.image} className="w-12 h-12 rounded-full object-cover border border-gray-100" alt={child.name} />
                    <div>
                      <h6 className="font-bold text-sm text-foreground">{child.name}</h6>
                      <p className="text-[10px] text-muted-foreground">Born {new Date(child.birthDate).getFullYear()}</p>
                    </div>
                  </div>
                  <div className="mt-auto pt-2">
                    <span className="block text-[10px] text-center w-full py-1.5 rounded-lg bg-gray-50 text-gray-500 font-medium group-hover:bg-primary/5 group-hover:text-primary transition-colors">
                      View Pedigree
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer - Sticky at Bottom */}
        <div className="flex-none flex flex-col sm:flex-row items-center justify-between gap-4 p-6 border-t border-primary/10 bg-white/95 backdrop-blur-sm z-20">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-full border border-foreground/10 text-foreground font-bold hover:bg-muted transition-colors"
          >
            Close
          </button>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <button
              onClick={handleExportCertificate}
              className="px-6 py-2.5 rounded-full bg-white border border-primary/20 text-foreground font-bold hover:bg-primary/5 transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export Certificate
            </button>
            <button
              onClick={handleShareProfile}
              className="px-6 py-2.5 rounded-full bg-primary text-white font-bold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-primary/25"
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
