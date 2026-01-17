/**
 * Breeding Match Modal
 * 
 * "Design is not just what it looks like and feels like.
 * Design is how it works." - Steve Jobs
 * 
 * A beautiful modal for displaying breeding match results
 */

import React, { useState, useEffect } from 'react';
import { Pet } from '@/lib/database';
import { findBreedingMatches, analyzeBreedingPair, BreedingCandidate, BreedingAnalysis } from '@/lib/ai/breedingMatch';

interface BreedingMatchModalProps {
    isOpen: boolean;
    onClose: () => void;
    pet: Pet;
    onViewPet?: (pet: Pet) => void;
}

export const BreedingMatchModal: React.FC<BreedingMatchModalProps> = ({
    isOpen,
    onClose,
    pet,
    onViewPet
}) => {
    const [analysis, setAnalysis] = useState<BreedingAnalysis | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedCandidate, setSelectedCandidate] = useState<BreedingCandidate | null>(null);
    const [pairAnalysis, setPairAnalysis] = useState<any>(null);
    const [lang] = useState<'th' | 'en'>('th');

    useEffect(() => {
        if (isOpen && pet) {
            loadMatches();
        }
    }, [isOpen, pet]);

    const loadMatches = async () => {
        setLoading(true);
        try {
            const result = await findBreedingMatches(pet, { limit: 6 });
            setAnalysis(result);
        } catch (error) {
            console.error('Error loading matches:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectCandidate = async (candidate: BreedingCandidate) => {
        setSelectedCandidate(candidate);
        try {
            const result = await analyzeBreedingPair(pet, candidate.pet);
            setPairAnalysis(result);
        } catch (error) {
            console.error('Error analyzing pair:', error);
        }
    };

    if (!isOpen) return null;

    const statusColors = {
        excellent: 'from-emerald-500 to-green-500',
        good: 'from-primary to-secondary',
        acceptable: 'from-amber-400 to-yellow-500',
        risky: 'from-orange-500 to-red-400',
        not_recommended: 'from-red-500 to-rose-600'
    };

    const statusLabels = {
        excellent: { th: 'ยอดเยี่ยม', en: 'Excellent' },
        good: { th: 'ดี', en: 'Good' },
        acceptable: { th: 'พอรับได้', en: 'Acceptable' },
        risky: { th: 'เสี่ยง', en: 'Risky' },
        not_recommended: { th: 'ไม่แนะนำ', en: 'Not Recommended' }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-stretch justify-center p-0">
            {/* Backdrop - Teal Theme */}
            <div
                className="absolute inset-0 bg-[#3D8A91]/70 backdrop-blur-md animate-in fade-in duration-300"
                onClick={onClose}
            />

            {/* Modal - Cream/Teal Theme */}
            <div className="relative w-screen h-[100dvh] max-w-none max-h-none bg-gradient-to-b from-[#FAF8F5] to-[#F0EDE5] rounded-none shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-500 border-0">
                {/* Header - Teal/Olive Gradient */}
                <div className="sticky top-0 z-10 bg-gradient-to-r from-[#5BBCC4] to-[#8B956D] px-6 py-5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                                <span className="text-2xl">💕</span>
                            </div>
                            <div className="text-white">
                                <h2 className="text-xl font-bold">
                                    {lang === 'th' ? 'ค้นหาคู่ผสมสำหรับ' : 'Breeding Match for'}
                                </h2>
                                <p className="text-white/80 font-medium">{pet.name} ({pet.breed})</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Content - Cream Background */}
                <div className="flex-1 p-6 overflow-y-auto bg-gradient-to-b from-[#FAF8F5] to-[#F5F0E8]">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-4">
                            <div className="w-16 h-16 border-4 border-[#5BBCC4]/20 border-t-[#5BBCC4] rounded-full animate-spin" />
                            <p className="text-foreground/60">
                                {lang === 'th' ? 'กำลังวิเคราะห์สายพันธุ์...' : 'Analyzing genetics...'}
                            </p>
                        </div>
                    ) : analysis && analysis.candidates.length > 0 ? (
                        <div className="space-y-6">
                            {/* Summary Card */}
                            <div className={`p-5 rounded-2xl bg-gradient-to-r ${statusColors[analysis.status]} text-white`}>
                                <div className="flex items-start gap-4">
                                    <div className="text-4xl">🧬</div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-bold">
                                                {statusLabels[analysis.status][lang]}
                                            </span>
                                        </div>
                                        <p className="text-white/90 whitespace-pre-line">
                                            {analysis.summary[lang]}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Candidates Grid */}
                            <div>
                                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                    <span>🏆</span>
                                    {lang === 'th' ? 'คู่ผสมที่แนะนำ' : 'Recommended Matches'}
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {analysis.candidates.map((candidate, index) => (
                                        <button
                                            key={candidate.pet.id}
                                            onClick={() => handleSelectCandidate(candidate)}
                                            className={`group relative p-4 rounded-2xl border-2 transition-all duration-300 text-left ${selectedCandidate?.pet.id === candidate.pet.id
                                                ? 'border-primary bg-primary/5 shadow-lg'
                                                : 'border-foreground/10 hover:border-primary/30 hover:shadow-md'
                                                }`}
                                        >
                                            {/* Rank Badge */}
                                            <div className={`absolute -top-2 -left-2 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${index === 0 ? 'bg-amber-400 text-amber-900' :
                                                index === 1 ? 'bg-slate-300 text-slate-700' :
                                                    index === 2 ? 'bg-amber-700 text-amber-100' :
                                                        'bg-foreground/10 text-foreground/60'
                                                }`}>
                                                {index + 1}
                                            </div>

                                            <div className="flex items-center gap-3 mb-3">
                                                {/* Pet Image */}
                                                <div className="w-14 h-14 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                                                    {candidate.pet.image ? (
                                                        <img
                                                            src={candidate.pet.image}
                                                            alt={candidate.pet.name}
                                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-2xl bg-primary/10">
                                                            {candidate.pet.gender === 'male' ? '🐕' : '🐩'}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-bold truncate">{candidate.pet.name}</h4>
                                                    <p className="text-sm text-foreground/60 truncate">{candidate.pet.breed}</p>
                                                </div>
                                            </div>

                                            {/* Score Bar */}
                                            <div className="mb-3">
                                                <div className="flex items-center justify-between text-sm mb-1">
                                                    <span className="text-foreground/60">
                                                        {lang === 'th' ? 'คะแนน' : 'Score'}
                                                    </span>
                                                    <span className="font-bold text-primary">{Math.round(candidate.score)}/100</span>
                                                </div>
                                                <div className="h-2 bg-foreground/10 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-500"
                                                        style={{ width: `${candidate.score}%` }}
                                                    />
                                                </div>
                                            </div>

                                            {/* COI Badge */}
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-foreground/60">COI</span>
                                                <span className={`font-medium ${candidate.coi <= 0.03 ? 'text-emerald-600' :
                                                    candidate.coi <= 0.0625 ? 'text-amber-600' :
                                                        'text-red-600'
                                                    }`}>
                                                    {(candidate.coi * 100).toFixed(2)}%
                                                </span>
                                            </div>

                                            {/* Warnings */}
                                            {candidate.warnings.length > 0 && (
                                                <div className="mt-3 flex flex-wrap gap-1">
                                                    {candidate.warnings.slice(0, 2).map((warning, i) => (
                                                        <span
                                                            key={i}
                                                            className={`px-2 py-0.5 rounded-full text-xs ${warning.type === 'critical' ? 'bg-red-100 text-red-700' :
                                                                warning.type === 'warning' ? 'bg-amber-100 text-amber-700' :
                                                                    'bg-blue-100 text-blue-700'
                                                                }`}
                                                        >
                                                            {warning.message[lang].substring(0, 25)}...
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Selected Pair Detail */}
                            {selectedCandidate && pairAnalysis && (
                                <div className="mt-6 p-5 rounded-2xl bg-foreground/5 border border-foreground/10">
                                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                        <span>🔬</span>
                                        {lang === 'th' ? 'วิเคราะห์คู่ผสม' : 'Pair Analysis'}
                                    </h3>

                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        {/* Pet 1 */}
                                        <div className="p-3 rounded-xl bg-white flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted">
                                                {pet.image ? (
                                                    <img src={pet.image} alt={pet.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-primary/10">🐕</div>
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-bold">{pet.name}</p>
                                                <p className="text-xs text-foreground/60">{pet.gender === 'male' ? '♂' : '♀'} {pet.color}</p>
                                            </div>
                                        </div>

                                        {/* Heart */}
                                        <div className="absolute left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-pink-500 text-white flex items-center justify-center text-lg z-10" style={{ display: 'none' }}>
                                            ❤️
                                        </div>

                                        {/* Pet 2 */}
                                        <div className="p-3 rounded-xl bg-white flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted">
                                                {selectedCandidate.pet.image ? (
                                                    <img src={selectedCandidate.pet.image} alt={selectedCandidate.pet.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-primary/10">🐩</div>
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-bold">{selectedCandidate.pet.name}</p>
                                                <p className="text-xs text-foreground/60">{selectedCandidate.pet.gender === 'male' ? '♂' : '♀'} {selectedCandidate.pet.color}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Recommendation */}
                                    <div className={`p-4 rounded-xl ${pairAnalysis.compatible ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
                                        <p className={`font-medium ${pairAnalysis.compatible ? 'text-emerald-700' : 'text-red-700'}`}>
                                            {pairAnalysis.recommendation[lang]}
                                        </p>
                                    </div>

                                    {/* Score Breakdown */}
                                    <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {Object.entries(pairAnalysis.analysis.breakdown).map(([key, value]) => (
                                            <div key={key} className="p-2 rounded-lg bg-white text-center">
                                                <p className="text-xs text-foreground/50 capitalize">{key.replace('Score', '')}</p>
                                                <p className="font-bold text-primary">{(value as number).toFixed(0)}</p>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Color Predictions */}
                                    {selectedCandidate.colorPrediction.length > 0 && (
                                        <div className="mt-4">
                                            <p className="text-sm font-medium mb-2">
                                                {lang === 'th' ? '🎨 คาดการณ์สีลูก:' : '🎨 Color Predictions:'}
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                {selectedCandidate.colorPrediction.map((pred, i) => (
                                                    <span key={i} className="px-3 py-1 bg-white rounded-full text-sm">
                                                        {pred.color} ({(pred.probability * 100).toFixed(0)}%)
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div className="mt-4 flex gap-3">
                                        {onViewPet && (
                                            <button
                                                onClick={() => onViewPet(selectedCandidate.pet)}
                                                className="flex-1 py-3 px-4 rounded-xl bg-primary text-white font-semibold hover:bg-primary/90 transition-colors"
                                            >
                                                {lang === 'th' ? 'ดูรายละเอียด' : 'View Details'}
                                            </button>
                                        )}
                                        <button
                                            onClick={() => {
                                                // TODO: Open contact modal or chat
                                                alert(lang === 'th' ? 'ฟังก์ชันติดต่อกำลังพัฒนา' : 'Contact feature coming soon');
                                            }}
                                            className="flex-1 py-3 px-4 rounded-xl border-2 border-primary text-primary font-semibold hover:bg-primary/5 transition-colors"
                                        >
                                            {lang === 'th' ? 'ติดต่อเจ้าของ' : 'Contact Owner'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-16">
                            <div className="text-6xl mb-4">🐕</div>
                            <h3 className="text-xl font-bold mb-2">
                                {lang === 'th' ? 'ไม่พบคู่ผสมที่เหมาะสม' : 'No Suitable Matches Found'}
                            </h3>
                            <p className="text-foreground/60 max-w-md mx-auto">
                                {lang === 'th'
                                    ? 'ขณะนี้ยังไม่มีสัตว์เลี้ยงเพศตรงข้ามสายพันธุ์เดียวกันในระบบ'
                                    : 'There are currently no pets of the opposite gender and same breed in our system'}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BreedingMatchModal;
