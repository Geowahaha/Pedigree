import React, { useState } from 'react';
import { Pet, pets as allPets } from '@/data/petData';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface BreederDashboardProps {
    onClose: () => void;
}

const BreederDashboard: React.FC<BreederDashboardProps> = ({ onClose }) => {
    const { user } = useAuth();
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<'overview' | 'pets' | 'requests' | 'settings'>('overview');

    // Smart Match State
    const [matchModalOpen, setMatchModalOpen] = useState(false);
    const [currentMatchPet, setCurrentMatchPet] = useState<Pet | null>(null);
    const [matchResults, setMatchResults] = useState<{ pet: Pet; score: number }[]>([]);

    // Mock Data for "Smart Verification" Feature
    const [pendingRequests, setPendingRequests] = useState([
        {
            id: 'req-001',
            requesterName: 'Emily Rodriguez',
            requesterPet: 'Max',
            requesterPetId: 'pet-003',
            claimedParent: 'Apollo',
            claimedParentId: 'pet-001',
            relationship: 'sire',
            date: '2025-12-30'
        },
        {
            id: 'req-002',
            requesterName: 'New Breeder John',
            requesterPet: 'Bella Jr.',
            requesterPetId: 'pet-new',
            claimedParent: 'Luna',
            claimedParentId: 'pet-002',
            relationship: 'dam',
            date: '2026-01-01'
        }
    ]);

    const [myPets] = useState<Pet[]>(allPets.slice(0, 3)); // Mock: User owns first 3 pets

    const handleVerify = (id: string) => {
        // In a real app, this would call the backend to update verification status
        setPendingRequests(prev => prev.filter(req => req.id !== id));
        // Provide feedback (toast usually)
        alert("Relationship Verified! The verified badge will now appear on the family tree.");
    };

    const handleReject = (id: string) => {
        setPendingRequests(prev => prev.filter(req => req.id !== id));
    };

    const handleSmartMatch = (pet: Pet) => {
        setCurrentMatchPet(pet);

        // Match Logic
        const results = allPets
            .filter(p => p.id !== pet.id) // Exclude self
            .map(candidate => {
                let score = 0;
                // Basic Species check
                if (pet.type !== candidate.type) return { pet: candidate, score: 0 };

                // Gender check (opposite generally preferred for breeding)
                if (pet.gender !== candidate.gender) score += 30;

                // Breed check
                if (pet.breed === candidate.breed) score += 40;

                // Location check (same location bonus)
                if (pet.location === candidate.location) score += 10;

                // Age compatibility (simple mock)
                if (Math.abs(parseInt(pet.age) - parseInt(candidate.age)) < 5) score += 20;

                return { pet: candidate, score: Math.min(score, 100) };
            })
            .filter(r => r.score > 50) // Only showing decent matches
            .sort((a, b) => b.score - a.score)
            .slice(0, 5); // Top 5

        setMatchResults(results);
        setMatchModalOpen(true);
    };

    return (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm overflow-y-auto">
            <div className="min-h-screen p-4 md:p-8">
                {/* Header */}
                <div className="max-w-7xl mx-auto flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white text-xl font-bold">
                            {user?.profile?.full_name?.charAt(0) || 'B'}
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">{t('dashboard.title')}</h1>
                            <p className="text-foreground/60">{user?.profile?.full_name || 'Verified Breeder'}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-muted transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
                    {/* Sidebar */}
                    <div className="space-y-2">
                        {[
                            { id: 'overview', label: t('dashboard.overview'), icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
                            { id: 'pets', label: t('dashboard.my_pets'), icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z' },
                            { id: 'requests', label: t('dashboard.requests'), icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', badge: pendingRequests.length },
                            { id: 'settings', label: t('dashboard.settings'), icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
                        ].map((item) => (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id as any)}
                                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${activeTab === item.id
                                    ? 'bg-primary text-white shadow-lg'
                                    : 'bg-white/50 hover:bg-white text-foreground/70 hover:text-foreground'
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                                    </svg>
                                    <span className="font-medium">{item.label}</span>
                                </div>
                                {item.badge ? (
                                    <span className="bg-accent text-white text-xs font-bold px-2 py-0.5 rounded-full">{item.badge}</span>
                                ) : null}
                            </button>
                        ))}
                    </div>

                    {/* Main Content */}
                    <div className="md:col-span-3 bg-white/50 backdrop-blur-md rounded-3xl p-6 border border-white/50 min-h-[500px]">

                        {activeTab === 'overview' && (
                            <div className="space-y-6">
                                <h2 className="text-xl font-bold text-foreground">{t('dashboard.overview')}</h2>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-primary/10">
                                        <div className="text-4xl font-extrabold text-primary mb-1">{myPets.length}</div>
                                        <div className="text-sm text-foreground/60">Active Pets</div>
                                    </div>
                                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-primary/10">
                                        <div className="text-4xl font-extrabold text-accent mb-1">{pendingRequests.length}</div>
                                        <div className="text-sm text-foreground/60">Pending Verifications</div>
                                    </div>
                                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-primary/10">
                                        <div className="text-4xl font-extrabold text-secondary mb-1">0</div>
                                        <div className="text-sm text-foreground/60">New Messages</div>
                                    </div>
                                </div>

                                <div className="mt-8">
                                    <h3 className="text-lg font-bold mb-4">Recent Activity</h3>
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-primary/5">
                                            <div className="w-2 h-2 rounded-full bg-green-500" />
                                            <p className="text-sm text-foreground/80">
                                                <span className="font-bold">Apollo</span>'s pedigree was viewed 12 times today.
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-primary/5">
                                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                                            <p className="text-sm text-foreground/80">
                                                New smart contract verification request from <span className="font-bold">Emily Rodriguez</span>.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'requests' && (
                            <div className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-xl font-bold text-foreground">{t('dashboard.requests')}</h2>
                                    <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-1 rounded">SMART_VERIFY_ENABLED</span>
                                </div>
                                <p className="text-foreground/60">
                                    Other breeders have listed your pets as parents in their litters. Verify these claims to complete the official pedigree chain.
                                </p>

                                {pendingRequests.length === 0 ? (
                                    <div className="text-center py-12 text-foreground/40">
                                        No pending verification requests.
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {pendingRequests.map((req) => (
                                            <div key={req.id} className="bg-white p-6 rounded-2xl shadow-sm border border-primary/10 flex flex-col md:flex-row items-center justify-between gap-6 transition-all hover:scale-[1.01]">
                                                <div className="flex items-center gap-6">
                                                    {/* Child Pet (Requester) */}
                                                    <div className="flex flex-col items-center">
                                                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center font-bold text-foreground/50 text-sm">
                                                            {req.requesterPet[0]}
                                                        </div>
                                                        <span className="text-xs font-bold mt-1 text-center">{req.requesterPet}</span>
                                                        <span className="text-[10px] text-foreground/40 text-center">Child</span>
                                                    </div>

                                                    {/* Connection Line */}
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className="text-[10px] uppercase font-bold text-primary/60 tracking-widest">{req.relationship === 'sire' ? 'FATHER' : 'MOTHER'}</span>
                                                        <div className="w-16 h-0.5 bg-primary/20 relative">
                                                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-primary/20 rounded-full" />
                                                        </div>
                                                    </div>

                                                    {/* Parent Pet (Yours) */}
                                                    <div className="flex flex-col items-center">
                                                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm">
                                                            {req.claimedParent[0]}
                                                        </div>
                                                        <span className="text-xs font-bold mt-1 text-center">{req.claimedParent}</span>
                                                        <span className="text-[10px] text-foreground/40 text-center">Your Pet</span>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col gap-2 min-w-[200px]">
                                                    <div className="text-xs text-foreground/60 mb-2">
                                                        Requested by <span className="font-bold">{req.requesterName}</span> on {req.date}
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleVerify(req.id)}
                                                            className="flex-1 bg-primary text-white text-xs font-bold py-2.5 rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                                                        >
                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                                            Verify
                                                        </button>
                                                        <button
                                                            onClick={() => handleReject(req.id)}
                                                            className="flex-1 bg-white border border-red-200 text-red-500 text-xs font-bold py-2.5 rounded-lg hover:bg-red-50 transition-colors"
                                                        >
                                                            Reject
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'pets' && (
                            <div className="space-y-6">
                                <h2 className="text-xl font-bold text-foreground">{t('dashboard.my_pets')}</h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {myPets.map(pet => (
                                        <div key={pet.id} className="group relative overflow-hidden rounded-2xl bg-white border border-primary/10 hover:shadow-lg transition-all p-4 flex gap-4">
                                            <img src={pet.image} alt={pet.name} className="w-20 h-20 rounded-xl object-cover" />
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h3 className="font-bold text-foreground">{pet.name}</h3>
                                                        <p className="text-sm text-foreground/60">{pet.breed}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => handleSmartMatch(pet)}
                                                        className="text-xs bg-gradient-to-r from-pink-500 to-rose-500 text-white px-3 py-1.5 rounded-full font-bold shadow-md hover:shadow-lg transition-all hover:scale-105 flex items-center gap-1"
                                                    >
                                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
                                                        {t('dashboard.smart_match')}
                                                    </button>
                                                </div>
                                                <p className="text-xs text-primary/80 mt-1 uppercase tracking-wider font-semibold">{pet.registrationNumber}</p>
                                                <div className="mt-2 flex gap-2">
                                                    <button className="text-xs bg-muted px-2 py-1 rounded-md hover:bg-muted/80">Stats</button>
                                                    <button className="text-xs bg-muted px-2 py-1 rounded-md hover:bg-muted/80">Edit Details</button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </div>

            {/* Smart Match Modal */}
            <Dialog open={matchModalOpen} onOpenChange={setMatchModalOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Smart Match Results</DialogTitle>
                        <DialogDescription>
                            Looking for a perfect match for <span className="font-bold text-primary">{currentMatchPet?.name}</span>?
                            Here are the top candidates based on breed, genetics, and age compatibility.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        {matchResults.length > 0 ? matchResults.map((match, idx) => (
                            <div key={match.pet.id} className="flex items-center gap-4 p-3 bg-white rounded-xl border hover:border-primary/50 transition-all cursor-pointer">
                                <div className="relative">
                                    <img src={match.pet.image} alt={match.pet.name} className="w-16 h-16 rounded-full object-cover" />
                                    <div className="absolute -bottom-1 -right-1 bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-white">
                                        {match.score}%
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-center">
                                        <h4 className="font-bold text-foreground">{match.pet.name}</h4>
                                        <span className="text-xs text-muted-foreground">{match.pet.location}</span>
                                    </div>
                                    <p className="text-xs text-foreground/60">{match.pet.breed} • {match.pet.age}</p>
                                </div>
                                <button className="text-xs bg-primary/10 text-primary hover:bg-primary hover:text-white px-3 py-2 rounded-lg font-bold transition-all">
                                    Connect
                                </button>
                            </div>
                        )) : (
                            <div className="text-center py-8 text-muted-foreground">
                                No high-probability matches found at this time.
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default BreederDashboard;
