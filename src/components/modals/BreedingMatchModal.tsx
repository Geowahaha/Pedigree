import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Pet } from '@/data/petData';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { calculateCompatibilityScore } from '@/lib/breeding';

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
    const formatBreedingLabel = (type?: string, level?: string) => {
        if (!type) return 'Unknown';
        const label = type.charAt(0).toUpperCase() + type.slice(1);
        return level ? `${label} (${level})` : label;
    };
    const getAgeYears = (birthDate?: string) => {
        if (!birthDate) return undefined;
        const dob = new Date(birthDate);
        if (Number.isNaN(dob.getTime())) return undefined;
        return new Date().getFullYear() - dob.getFullYear();
    };

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
            // 1. Robust Gender Detection
            // Detect if source is male (handling 'Male', 'male', 'M', 'Boy', etc.)
            const sGender = sourcePet.gender?.toLowerCase().trim() || '';
            const isMale = sGender === 'male' || sGender === 'm' || sGender === 'boy';
            const isFemale = sGender === 'female' || sGender === 'f' || sGender === 'girl';
            const targetGender = isMale ? 'female' : isFemale ? 'male' : null;

            // 2. Fuzzy Breed Matching
            // Remove common suffixes to broaden search (e.g. "Thai Ridgeback Dog" -> "Thai Ridgeback")
            const fuzzyBreed = (sourcePet.breed || '')
                .replace(/\s+(Dog|Cat|Puppy|Kitten)$/i, '') // Remove species suffix
                .replace(/s$/i, '') // Remove plural 's' just in case
                .trim();

            console.log(`SmartMatch: Looking for ${targetGender} like '${fuzzyBreed}'`);

            // 3. Query with Broadened Constraints
            let query = supabase
                .from('pets')
                .select('id,name,breed,gender,type,birthday,color,location,owner_id,image_url,verified,mother_id,father_id,owner:profiles!owner_id(full_name, email)')
                .neq('id', sourcePet.id)
                .neq('owner_id', sourcePet.owner_id || '')
                .eq('is_public', true)
                .limit(50);

            if (fuzzyBreed) {
                query = query.ilike('breed', `%${fuzzyBreed}%`);
            }
            if (targetGender) {
                query = query.ilike('gender', targetGender);
            }

            let { data: potentialMatches, error } = await query;

            if (error) throw error;

            if (!potentialMatches || potentialMatches.length === 0) {
                let fallbackQuery = supabase
                    .from('pets')
                    .select('id,name,breed,gender,type,birthday,color,location,owner_id,image_url,verified,mother_id,father_id,owner:profiles!owner_id(full_name, email)')
                    .neq('id', sourcePet.id)
                    .neq('owner_id', sourcePet.owner_id || '')
                    .eq('is_public', true)
                    .limit(50);

                if (sourcePet.type) {
                    fallbackQuery = fallbackQuery.eq('type', sourcePet.type);
                }
                if (targetGender) {
                    fallbackQuery = fallbackQuery.ilike('gender', targetGender);
                }

                const fallback = await fallbackQuery;
                potentialMatches = fallback.data || [];
                if (fallback.error) throw fallback.error;
                if (potentialMatches.length === 0) {
                    setMatches([]);
                    return;
                }
            }

            // RELATIONSHIP ANALYSIS ENGINE 🧬
            // Powered by @/lib/breeding.ts

            // Analyze Relationships
            const analyzedMatches = potentialMatches.map(match => {
                const matchResult = calculateCompatibilityScore(sourcePet, match as unknown as Pet);
                const matchAge = getAgeYears((match as any).birthday);
                return {
                    ...match,
                    id: match.id,
                    name: match.name,
                    image: match.image_url,
                    owner_id: match.owner_id,
                    owner: match.owner,
                    age: matchAge ?? (match as any).age,
                    matchResult // Attach full analysis
                };
            });

            // Sort: Highest Compatibility Score First
            analyzedMatches.sort((a, b) => b.matchResult.score - a.matchResult.score);

            setMatches(analyzedMatches as any);

        } catch (e) {
            console.error("SmartMatch Failed:", e);
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
            // Show real score
            const score = (matchPet as any).matchResult?.score || 95;
            alert(`Contact Unlocked! Genetics: ${score}% Compatible 🧬`);

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
            <DialogContent className="sm:max-w-4xl p-0 bg-white border-0 sm:border sm:border-gray-100 text-black overflow-hidden sm:max-h-[85vh] flex flex-col sm:rounded-[2rem] shadow-2xl">
                <div className="p-6 border-b border-gray-100 bg-white sticky top-0 z-10">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-3 text-black font-bold text-2xl">
                            <span className="text-3xl">🧬</span>
                            AI Breeding Matchmaker
                            {isPro && <span className="text-xs bg-black text-white px-3 py-1 rounded-full ml-2 font-bold tracking-wide">PRO UNLIMITED</span>}
                        </DialogTitle>
                        <DialogDescription className="text-gray-500 text-base">
                            Analyzing genetics for <span className="text-black font-bold">{sourcePet.name}</span> ({sourcePet.breed})
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-64 space-y-4">
                            <div className="w-16 h-16 border-4 border-gray-200 border-t-black rounded-full animate-spin"></div>
                            <p className="animate-pulse text-gray-500 font-medium">Scanning Genetic compatibility...</p>
                        </div>
                    ) : matches.length === 0 ? (
                        <div className="text-center py-20">
                            <p className="text-gray-500 text-lg">No compatible matches found yet.</p>
                            <p className="text-sm text-gray-400 mt-2">Try again later as more breeders join.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {matches.map(match => {
                                const isUnlocked = unlockedMatches.includes(match.id) || isPro;
                                return (
                                    <div key={match.id} className="relative group bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-xl transition-all duration-300">
                                        {/* Match Badge */}
                                        <div className={`absolute top-3 left-3 z-10 px-3 py-1.5 rounded-full backdrop-blur-md flex items-center gap-1 font-bold text-[10px] uppercase shadow-sm
                                            ${(match as any).matchResult.score >= 80 ? 'bg-green-100 text-green-700 border border-green-200' :
                                                (match as any).matchResult.score >= 50 ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' :
                                                    'bg-red-100 text-red-700 border border-red-200'}`}>
                                            {(match as any).matchResult.label} • {(match as any).matchResult.score}%
                                        </div>

                                        {/* Image */}
                                        <div className="h-56 relative bg-gray-100">
                                            <img src={match.image || (match as any).image_url} className={`w-full h-full object-cover transition-all duration-500 ${!isUnlocked ? 'blur-md grayscale opacity-80' : 'group-hover:scale-105'}`} alt={match.name} />
                                            {!isUnlocked && (
                                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/30 backdrop-blur-sm">
                                                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg mb-2">
                                                        <span className="text-2xl">🔒</span>
                                                    </div>
                                                    <span className="font-bold text-gray-800 bg-white/80 px-3 py-1 rounded-full text-xs">Locked Profile</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Content */}
                                        <div className="p-5">
                                            <div className="flex justify-between items-start mb-3">
                                                <h3 className="font-bold text-xl text-black leading-tight">{isUnlocked ? match.name : 'Hidden Profile'}</h3>
                                                <div className="text-right">
                                                    <span className="px-2 py-0.5 bg-gray-100 rounded text-[10px] font-medium text-gray-500">{match.location || 'Thailand'}</span>
                                                </div>
                                            </div>

                                            <div className="space-y-3 mb-6">
                                                {/* Risk Analysis Quote */}
                                                <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
                                                    <p className="text-xs text-blue-800 italic font-medium">
                                                        "{(match as any).matchResult.advice}"
                                                    </p>
                                                </div>

                                                {(() => {
                                                    const breeding = (match as any).matchResult?.breeding;
                                                    if (!breeding) return null;
                                                    const badgeClass = breeding.type === 'inbreeding'
                                                        ? 'text-red-700'
                                                        : breeding.type === 'linebreeding'
                                                            ? 'text-amber-700'
                                                            : 'text-emerald-700';
                                                    const warningText = breeding.warnings?.slice(0, 1).join(' ');
                                                    const prosText = breeding.pros?.slice(0, 2).join('; ');
                                                    const consText = breeding.cons?.slice(0, 2).join('; ');
                                                    return (
                                                        <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 space-y-2 text-xs">
                                                            <div className="flex justify-between items-center">
                                                                <span className="text-gray-500">Breeding strategy</span>
                                                                <span className={`font-semibold ${badgeClass}`}>
                                                                    {formatBreedingLabel(breeding.type, breeding.level)}
                                                                </span>
                                                            </div>
                                                            {warningText && (
                                                                <p className="text-amber-700">Warning: {warningText}</p>
                                                            )}
                                                            {prosText && (
                                                                <p className="text-emerald-700">Pros: {prosText}</p>
                                                            )}
                                                            {consText && (
                                                                <p className="text-rose-700">Cons: {consText}</p>
                                                            )}
                                                            {breeding.summary && (
                                                                <p className="text-gray-500">{breeding.summary}</p>
                                                            )}
                                                        </div>
                                                    );
                                                })()}

                                                {(() => {
                                                    const breakdown = (match as any).matchResult?.breakdown;
                                                    if (!breakdown) return null;
                                                    return (
                                                        <div className="space-y-2 text-xs">
                                                            <div className="flex justify-between text-gray-500">
                                                                <span>Genetic safety</span>
                                                                <span className="font-semibold text-gray-800">{Math.round(breakdown.genetic_risk)}%</span>
                                                            </div>
                                                            <div className="flex justify-between text-gray-500">
                                                                <span>Health readiness</span>
                                                                <span className="font-semibold text-gray-800">{Math.round(breakdown.health_score)}%</span>
                                                            </div>
                                                            <div className="flex justify-between text-gray-500">
                                                                <span>Breed match</span>
                                                                <span className="font-semibold text-gray-800">{Math.round(breakdown.breed_score)}%</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })()}

                                                <div className="flex justify-between text-sm border-b border-gray-100 pb-2">
                                                    <span className="text-gray-500">Age</span>
                                                    <span className="font-medium text-black">{match.age ? `${match.age} yrs` : 'Unknown'}</span>
                                                </div>
                                                <div className="flex justify-between text-sm border-b border-gray-100 pb-2">
                                                    <span className="text-gray-500">Color</span>
                                                    <span className="font-medium text-black">{match.color}</span>
                                                </div>
                                                <div className="flex justify-between text-sm border-b border-gray-100 pb-2">
                                                    <span className="text-gray-500">Owner</span>
                                                    <span className={isUnlocked ? 'font-medium text-black' : 'blur-sm text-gray-300'}>
                                                        {isUnlocked ? ((match.owner as any)?.full_name || 'View Profile') : 'Hidden Name'}
                                                    </span>
                                                </div>
                                            </div>

                                            {isUnlocked ? (
                                                <button
                                                    onClick={() => handleContact(match)}
                                                    className="w-full py-3 bg-black text-white font-bold rounded-full hover:bg-gray-800 transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                                                >
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                                                    Contact Owner
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleUnlock(match)}
                                                    disabled={unlockingId === match.id}
                                                    className="w-full py-3 bg-white border-2 border-black text-black font-bold rounded-full hover:bg-black hover:text-white transition-all flex items-center justify-center gap-2 shadow-sm"
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
