import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Pet } from '@/data/petData';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { getWalletData } from '@/lib/wallet';
import { PRO_STATUS_COST } from '@/lib/wallet';

interface BreedingMatchModalProps {
    isOpen: boolean;
    onClose: () => void;
    sourcePet: Pet | null;
}

const MATCH_UNLOCK_COST = 10;

const BreedingMatchModal: React.FC<BreedingMatchModalProps> = ({ isOpen, onClose, sourcePet }) => {
    const { user } = useAuth();
    const [matches, setMatches] = useState<Pet[]>([]);
    const [loading, setLoading] = useState(false);
    const [isPro, setIsPro] = useState(false);
    const [balance, setBalance] = useState(0);
    const [unlockedMatches, setUnlockedMatches] = useState<string[]>([]);
    const [unlockingId, setUnlockingId] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && sourcePet) {
            loadProfiling();
            findMatches();
        }
    }, [isOpen, sourcePet]);

    const loadProfiling = async () => {
        if (!user) return;
        const { data } = await supabase.from('profiles').select('verified_breeder, trd_balance').eq('id', user.id).single();
        if (data) {
            setIsPro(data.verified_breeder || false);
            setBalance(data.trd_balance || 0);
        }
    };

    const findMatches = async () => {
        if (!sourcePet) return;
        setLoading(true);

        try {
            // Gender Fix: Explicitly look for opposite gender (handling case sensitivity)
            const targetGender = ['male', 'Male'].includes(sourcePet.gender) ? 'female' : 'male';

            // Basic Filter: Same Breed, Target Gender, Different Owner
            const { data: potentialMatches, error } = await supabase
                .from('pets')
                .select('*, owner:profiles!owner_id(full_name, email)')
                .eq('breed', sourcePet.breed)
                .ilike('gender', targetGender) // Case insensitive match for opposite gender
                .neq('owner_id', sourcePet.owner_id || '')
                .eq('is_public', true)
                .limit(20);

            if (error) throw error;

            if (!potentialMatches) {
                setMatches([]);
                return;
            }

            // RELATIONSHIP ANALYSIS ENGINE 🧬
            const getRelationship = (source: Pet, target: any) => {
                // 1. Close Immediate Family (High Risk)
                if (target.id === source.mother_id || target.id === source.father_id) return { type: 'Parent', risk: 'High', label: 'Inbreeding ⚠️', advice: 'Avoid. Extremely high risk of genetic defects.' };
                if (source.id === target.mother_id || source.id === target.father_id) return { type: 'Child', risk: 'High', label: 'Inbreeding ⚠️', advice: 'Avoid. Extremely high risk of genetic defects.' };

                // 2. Siblings (High/Moderate Risk)
                const sourceSire = source.father_id;
                const sourceDam = source.mother_id;
                const targetSire = target.father_id;
                const targetDam = target.mother_id;

                if (sourceSire && targetSire && sourceSire === targetSire && sourceDam && targetDam && sourceDam === targetDam)
                    return { type: 'Full Sibling', risk: 'High', label: 'Inbreeding ⚠️', advice: 'High Risk. Only for expert genetic preservation.' };

                if ((sourceSire && targetSire && sourceSire === targetSire) || (sourceDam && targetDam && sourceDam === targetDam))
                    return { type: 'Half Sibling', risk: 'Moderate', label: 'Line Breeding 🧬', advice: 'Moderate Risk. Can fix traits but requires health testing.' };

                // 3. Unrelated
                return { type: 'Unrelated', risk: 'Low', label: 'Outcross ✅', advice: 'Safest option for health and vigor.' };
            };

            // Analyze Relationships
            const analyzedMatches = potentialMatches.map(match => {
                const rel = getRelationship(sourcePet, match);
                return {
                    ...match,
                    id: match.id,
                    name: match.name,
                    image: match.image_url,
                    owner_id: match.owner_id,
                    owner: match.owner,
                    relationship: rel // Attach analysis
                };
            });

            // Sort: Outcross first, then Line Breeding
            analyzedMatches.sort((a, b) => {
                const riskScore = { 'Low': 0, 'Moderate': 1, 'High': 2 };
                return riskScore[a.relationship.risk as keyof typeof riskScore] - riskScore[b.relationship.risk as keyof typeof riskScore];
            });

            setMatches(analyzedMatches as any);

        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleUnlock = async (matchPet: Pet) => {
        if (!user) return;

        if (isPro) {
            setUnlockedMatches(prev => [...prev, matchPet.id]);
            return;
        }

        if (balance < MATCH_UNLOCK_COST) {
            alert(`Insufficient funds. You need ${MATCH_UNLOCK_COST} TRD.`);
            return;
        }

        setUnlockingId(matchPet.id);
        try {
            // Deduct TRD
            const { error } = await supabase.rpc('deduct_balance', {
                user_id: user.id,
                amount: MATCH_UNLOCK_COST
            });

            if (error) {
                await supabase.from('profiles').update({ trd_balance: balance - MATCH_UNLOCK_COST }).eq('id', user.id);
                await supabase.from('wallet_transactions').insert({
                    user_id: user.id,
                    amount: -MATCH_UNLOCK_COST,
                    type: 'purchase',
                    description: `Unlocked match: ${matchPet.name}`,
                    status: 'completed'
                });
            }

            setBalance(prev => prev - MATCH_UNLOCK_COST);
            setUnlockedMatches(prev => [...prev, matchPet.id]);
            alert("Contact Unlocked! Genetics: 98% Compatible 🧬");

        } catch (e) {
            alert('Unlock failed');
        } finally {
            setUnlockingId(null);
        }
    };

    const handleContact = (match: Pet) => {
        onClose(); // Close the modal
        if (match.owner_id) {
            // Dispatch event to open chat (handled by PinterestLayout)
            const event = new CustomEvent('openChat', {
                detail: {
                    targetUserId: match.owner_id,
                    petInfo: { id: match.id, name: match.name, breed: match.breed, image: match.image }
                }
            });
            window.dispatchEvent(event);
        }
    };

    if (!isOpen || !sourcePet) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-4xl p-0 bg-[#0A0A0A] border border-[#C5A059]/20 text-[#F5F5F0] overflow-hidden max-h-[85vh] flex flex-col">
                <div className="p-6 border-b border-[#C5A059]/10 bg-[#111111]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-3 text-[#C5A059]">
                            <span className="text-2xl">🧬</span>
                            AI Breeding Matchmaker
                            {isPro && <span className="text-xs bg-[#C5A059] text-black px-2 py-0.5 rounded ml-2">PRO UNLIMITED</span>}
                        </DialogTitle>
                        <DialogDescription className="text-[#B8B8B8]">
                            Analyzing genetics for <span className="text-white font-bold">{sourcePet.name}</span> ({sourcePet.breed})
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-64 space-y-4">
                            <div className="w-16 h-16 border-4 border-[#C5A059] border-t-transparent rounded-full animate-spin"></div>
                            <p className="animate-pulse text-[#C5A059]">Scanning Genetic compatibility...</p>
                        </div>
                    ) : matches.length === 0 ? (
                        <div className="text-center py-20">
                            <p className="text-[#B8B8B8]">No compatible matches found yet.</p>
                            <p className="text-xs text-[#B8B8B8]/50 mt-2">Try again later as more breeders join.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {matches.map(match => {
                                const isUnlocked = unlockedMatches.includes(match.id) || isPro;
                                return (
                                    <div key={match.id} className="relative group bg-[#151515] rounded-xl overflow-hidden border border-[#C5A059]/10 hover:border-[#C5A059]/50 transition-all">
                                        {/* Match Badge */}
                                        <div className={`absolute top-2 left-2 z-10 px-2 py-1 rounded backdrop-blur-md border flex items-center gap-1 font-bold text-[10px] uppercase shadow-lg
                                            ${(match as any).relationship.risk === 'Low' ? 'bg-green-900/80 text-green-400 border-green-500/30' :
                                                (match as any).relationship.risk === 'Moderate' ? 'bg-yellow-900/80 text-yellow-400 border-yellow-500/30' :
                                                    'bg-red-900/80 text-red-400 border-red-500/30'}`}>
                                            {(match as any).relationship.label}
                                        </div>

                                        {/* Image */}
                                        <div className="h-48 relative">
                                            <img src={match.image || (match as any).image_url} className={`w-full h-full object-cover ${!isUnlocked ? 'blur-[2px] grayscale-[50%]' : ''}`} alt={match.name} />
                                            {!isUnlocked && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                                                    <span className="text-3xl">🔒</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Content */}
                                        <div className="p-4">
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className="font-bold text-lg text-[#F5F5F0]">{isUnlocked ? match.name : 'Hidden Profile'}</h3>
                                                <div className="text-right">
                                                    <span className="block text-xs text-[#B8B8B8]">{match.location || 'Thailand'}</span>
                                                </div>
                                            </div>

                                            <div className="space-y-2 mb-4">
                                                {/* Risk Analysis Quote */}
                                                <div className="p-2 rounded bg-[#0A0A0A] border border-white/5">
                                                    <p className="text-[10px] text-[#B8B8B8] italic">
                                                        "{(match as any).relationship.advice}"
                                                    </p>
                                                </div>

                                                <div className="flex justify-between text-xs border-b border-white/5 pb-1">
                                                    <span className="text-[#B8B8B8]">Age</span>
                                                    <span>{match.age ? `${match.age} yrs` : 'Unknown'}</span>
                                                </div>
                                                <div className="flex justify-between text-xs border-b border-white/5 pb-1">
                                                    <span className="text-[#B8B8B8]">Color</span>
                                                    <span>{match.color}</span>
                                                </div>
                                                <div className="flex justify-between text-xs border-b border-white/5 pb-1">
                                                    <span className="text-[#B8B8B8]">Owner</span>
                                                    <span className={isUnlocked ? 'text-[#C5A059]' : 'blur-sm'}>
                                                        {isUnlocked ? (match.owner?.full_name || 'View Profile') : 'Hidden Name'}
                                                    </span>
                                                </div>
                                            </div>

                                            {isUnlocked ? (
                                                <button
                                                    onClick={() => handleContact(match)}
                                                    className="w-full py-2 bg-[#C5A059] text-[#0A0A0A] font-bold rounded-lg hover:bg-[#D4C4B5] transition-colors flex items-center justify-center gap-2"
                                                >
                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                                                    Contact Owner
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleUnlock(match)}
                                                    disabled={unlockingId === match.id}
                                                    className="w-full py-2 bg-[#1A1A1A] border border-[#C5A059] text-[#C5A059] font-bold rounded-lg hover:bg-[#C5A059] hover:text-black transition-all flex items-center justify-center gap-2"
                                                >
                                                    {unlockingId === match.id ? 'Unlocking...' : `Unlock Match (${MATCH_UNLOCK_COST} TRD)`}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default BreedingMatchModal;
