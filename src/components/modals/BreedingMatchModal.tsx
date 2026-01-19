import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Pet } from '@/data/petData';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { calculateCompatibilityScore } from '@/lib/breeding';
import { useLanguage } from '@/contexts/LanguageContext';

interface BreedingMatchModalProps {
    isOpen: boolean;
    onClose: () => void;
    sourcePet: Pet | null;
}

const MATCH_UNLOCK_COST = 10;

const BreedingMatchModal: React.FC<BreedingMatchModalProps> = ({ isOpen, onClose, sourcePet }) => {
    const { user } = useAuth();
    const { language } = useLanguage();
    const [matches, setMatches] = useState<Pet[]>([]);
    const [loading, setLoading] = useState(false);
    const [isPro, setIsPro] = useState(false);
    const [balance, setBalance] = useState(0);
    const [unlockedMatches, setUnlockedMatches] = useState<string[]>([]);
    const [unlockingId, setUnlockingId] = useState<string | null>(null);
    const isThai = language === 'th';
    const t = (en: string, th: string) => (isThai ? th : en);
    const translateBreedingText = (text: string) => {
        if (!isThai) return text;
        const replacements: Array<{ en: string; th: string }> = [
            { en: 'Different species cannot breed.', th: 'ต่างสายพันธุ์กัน ไม่สามารถผสมพันธุ์ได้' },
            { en: 'Same gender. Cannot breed naturally.', th: 'เพศเดียวกัน ไม่สามารถผสมพันธุ์ตามธรรมชาติได้' },
            { en: 'Genetically diverse match.', th: 'การจับคู่ที่หลากหลายทางพันธุกรรม' },
            { en: 'CRITICAL: Parent/Child relationship. Do not breed.', th: 'อันตรายมาก: เป็นพ่อแม่/ลูก ห้ามผสมพันธุ์' },
            { en: 'HIGH RISK: Full siblings. Avoid inbreeding.', th: 'ความเสี่ยงสูง: พี่น้องร่วมพ่อแม่ หลีกเลี่ยงการผสมเลือดชิด' },
            { en: 'MODERATE RISK: Half siblings. Line breeding requires expert knowledge.', th: 'ความเสี่ยงปานกลาง: พี่น้องร่วมพ่อหรือแม่ การผสมสายเลือดต้องใช้ผู้เชี่ยวชาญ' },
            { en: 'Pedigree data is limited. Treat genetic risk as unknown.', th: 'ข้อมูลสายเลือดจำกัด ควรถือว่าความเสี่ยงทางพันธุกรรมไม่แน่ชัด' },
            { en: 'One or both pets are too young to breed.', th: 'อย่างน้อยหนึ่งตัวอายุน้อยเกินไปสำหรับการผสมพันธุ์' },
            { en: 'Consider age-related risks.', th: 'ควรพิจารณาความเสี่ยงตามอายุ' },
            { en: 'Parent/child relationship. Do not breed.', th: 'เป็นพ่อแม่/ลูก ห้ามผสมพันธุ์' },
            { en: 'Full siblings share both parents.', th: 'พี่น้องร่วมพ่อแม่เดียวกัน' },
            { en: 'Shared parent detected. Review lineage carefully.', th: 'พบพ่อหรือแม่ร่วมกัน โปรดตรวจสอบสายเลือดอย่างละเอียด' },
            { en: 'Limited pedigree data. Confirm lineage if possible.', th: 'ข้อมูลสายเลือดจำกัด ควรยืนยันสายเลือดหากทำได้' },
            { en: 'Cross-breeding will produce mixed breed offspring.', th: 'การผสมข้ามสายพันธุ์จะได้ลูกผสม' },
            { en: 'Health screening recommended for both parents.', th: 'แนะนำตรวจสุขภาพพ่อแม่พันธุ์ทั้งสอง' },
            { en: 'Birth date missing or invalid. Age-based checks are limited.', th: 'วันเกิดไม่ครบหรือไม่ถูกต้อง การตรวจตามอายุมีข้อจำกัด' },
            { en: 'Breeding age is below recommended minimum.', th: 'อายุยังไม่ถึงเกณฑ์ที่แนะนำสำหรับการผสมพันธุ์' },
            { en: 'Older breeding age increases health risks.', th: 'อายุผสมพันธุ์มากขึ้นเพิ่มความเสี่ยงด้านสุขภาพ' },
            { en: 'Strongly preserves specific traits.', th: 'คงลักษณะเฉพาะได้ชัดเจน' },
            { en: 'Predictable traits.', th: 'ลักษณะค่อนข้างคาดเดาได้' },
            { en: 'Retains desired family traits.', th: 'คงลักษณะที่ต้องการของสายพันธุ์' },
            { en: 'Higher genetic diversity.', th: 'ความหลากหลายทางพันธุกรรมสูง' },
            { en: 'Lower inherited risk.', th: 'ความเสี่ยงโรคทางพันธุกรรมน้อยลง' },
            { en: 'Consistent breed traits.', th: 'คงลักษณะสายพันธุ์สม่ำเสมอ' },
            { en: 'Close breed lineage. Predictable traits.', th: 'สายพันธุ์ใกล้เคียง ลักษณะคาดเดาได้' },
            { en: 'Hybrid vigor possible.', th: 'อาจได้ความแข็งแรงจากลูกผสม' },
            { en: 'High risk of inherited disorders.', th: 'เสี่ยงต่อโรคทางพันธุกรรมสูง' },
            { en: 'Lower genetic diversity.', th: 'ความหลากหลายทางพันธุกรรมต่ำ' },
            { en: 'High risk of recessive defects.', th: 'เสี่ยงต่อโรคยีนด้อยสูง' },
            { en: 'Lower fertility and litter health.', th: 'ความสมบูรณ์พันธุ์และสุขภาพลูกลดลง' },
            { en: 'Moderate risk of inherited issues.', th: 'มีความเสี่ยงโรคทางพันธุกรรมระดับปานกลาง' },
            { en: 'Traits may be less predictable.', th: 'ลักษณะอาจคาดเดาได้ยาก' },
            { en: 'Inbreeding. Very high genetic risk.', th: 'ผสมเลือดชิด ความเสี่ยงทางพันธุกรรมสูงมาก' },
            { en: 'Inbreeding. High genetic risk.', th: 'ผสมเลือดชิด ความเสี่ยงทางพันธุกรรมสูง' },
            { en: 'Linebreeding. Moderate genetic risk.', th: 'ผสมสายเลือด ความเสี่ยงทางพันธุกรรมปานกลาง' },
            { en: 'Pedigree unknown. Genetic risk is uncertain.', th: 'ไม่ทราบสายเลือด ความเสี่ยงทางพันธุกรรมไม่แน่ชัด' }
        ];
        return replacements.reduce((acc, { en, th }) => acc.replace(en, th), text);
    };
    const formatMatchLabel = (label: string) => {
        if (!isThai) return label;
        const map: Record<string, string> = {
            'Perfect Match': 'เข้ากันมากที่สุด',
            Excellent: 'ดีมาก',
            Good: 'ดี',
            Fair: 'พอใช้',
            Risk: 'เสี่ยง',
            Incompatible: 'ไม่เข้ากัน'
        };
        return map[label] || label;
    };
    const formatBreedingLabel = (type?: string, level?: string) => {
        if (!type) return t('Unknown', 'ไม่ทราบ');
        const typeKey = type.toLowerCase();
        const typeMap: Record<string, { en: string; th: string }> = {
            inbreeding: { en: 'Inbreeding', th: 'ผสมเลือดชิด' },
            linebreeding: { en: 'Linebreeding', th: 'ผสมสายเลือด' },
            outcross: { en: 'Outcross', th: 'ผสมข้ามสาย' }
        };
        const typeLabel = typeMap[typeKey]?.[isThai ? 'th' : 'en'] || (type.charAt(0).toUpperCase() + type.slice(1));
        const levelKey = (level || '').toLowerCase();
        const levelMap: Record<string, { en: string; th: string }> = {
            low: { en: 'low', th: 'ต่ำ' },
            medium: { en: 'medium', th: 'ปานกลาง' },
            moderate: { en: 'moderate', th: 'ปานกลาง' },
            high: { en: 'high', th: 'สูง' }
        };
        const levelLabel = levelMap[levelKey]?.[isThai ? 'th' : 'en'];
        return levelLabel ? `${typeLabel} (${levelLabel})` : typeLabel;
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
            alert(t(`Insufficient funds. You need ${MATCH_UNLOCK_COST} TRD.`, `ยอดคงเหลือไม่พอ ต้องใช้ ${MATCH_UNLOCK_COST} TRD`));
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
            alert(t(`Contact Unlocked! Genetics: ${score}% Compatible.`, `ปลดล็อกการติดต่อแล้ว! ความเข้ากันทางพันธุกรรม ${score}%`));

        } catch (e) {
            alert(t('Unlock failed', 'ปลดล็อกไม่สำเร็จ'));
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
                            {t('AI Breeding Matchmaker', 'AI จับคู่การผสมพันธุ์')}
                            {isPro && <span className="text-xs bg-black text-white px-3 py-1 rounded-full ml-2 font-bold tracking-wide">{t('PRO UNLIMITED', 'โปรไม่จำกัด')}</span>}
                        </DialogTitle>
                        <DialogDescription className="text-gray-500 text-base">
                            {t('Analyzing genetics for', 'วิเคราะห์พันธุกรรมของ')} <span className="text-black font-bold">{sourcePet.name}</span> ({sourcePet.breed})
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-64 space-y-4">
                            <div className="w-16 h-16 border-4 border-gray-200 border-t-black rounded-full animate-spin"></div>
                            <p className="animate-pulse text-gray-500 font-medium">
                                {t('Scanning genetic compatibility...', 'กำลังวิเคราะห์ความเข้ากันทางพันธุกรรม...')}
                            </p>
                        </div>
                    ) : matches.length === 0 ? (
                        <div className="text-center py-20">
                            <p className="text-gray-500 text-lg">{t('No compatible matches found yet.', 'ยังไม่พบคู่ที่เข้ากัน')}</p>
                            <p className="text-sm text-gray-400 mt-2">{t('Try again later as more breeders join.', 'ลองใหม่อีกครั้งเมื่อมีผู้เพาะพันธุ์เพิ่มขึ้น')}</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {matches.map(match => {
                                const isUnlocked = unlockedMatches.includes(match.id) || isPro;
                                const matchResult = (match as any).matchResult;
                                return (
                                    <div key={match.id} className="relative bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-xl transition-all duration-300">
                                        {/* Match Score Badge - Top Center */}
                                        <div className={`absolute top-3 left-1/2 -translate-x-1/2 z-20 px-4 py-2 rounded-full backdrop-blur-md flex items-center gap-2 font-bold text-xs shadow-lg
                                            ${matchResult.score >= 80 ? 'bg-green-500 text-white' :
                                                matchResult.score >= 50 ? 'bg-yellow-500 text-white' :
                                                    'bg-red-500 text-white'}`}>
                                            <span className="text-lg">💕</span>
                                            {matchResult.score}% {formatMatchLabel(matchResult.label)}
                                        </div>

                                        {/* Stacked Pet Cards */}
                                        <div className="flex flex-col">
                                            {/* Source Pet (Your Pet) - Top */}
                                            <div className="relative h-36 bg-gradient-to-b from-pink-50 to-white p-3 flex items-center gap-4 border-b border-gray-100">
                                                <div className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 border-2 border-pink-200 shadow-md">
                                                    <img
                                                        src={sourcePet?.image || (sourcePet as any)?.image_url}
                                                        className="w-full h-full object-cover"
                                                        alt={sourcePet?.name}
                                                    />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-[10px] uppercase tracking-wider text-pink-600 font-bold mb-1">
                                                        {t('Your Pet', 'สัตว์เลี้ยงของคุณ')}
                                                    </div>
                                                    <h4 className="font-bold text-lg text-gray-900 truncate">{sourcePet?.name}</h4>
                                                    <p className="text-sm text-gray-500 truncate">{sourcePet?.breed}</p>
                                                    <p className="text-xs text-gray-400">{sourcePet?.gender === 'male' ? '♂ Male' : '♀ Female'}</p>
                                                </div>
                                            </div>

                                            {/* Heart Connector */}
                                            <div className="relative h-10 flex items-center justify-center bg-gradient-to-r from-pink-100 via-red-100 to-pink-100">
                                                <div className="absolute inset-0 flex items-center">
                                                    <div className="w-full border-t-2 border-dashed border-pink-200"></div>
                                                </div>
                                                <div className="relative z-10 w-10 h-10 bg-gradient-to-br from-pink-500 to-red-500 rounded-full flex items-center justify-center shadow-lg transform hover:scale-110 transition-transform">
                                                    <span className="text-xl">❤️</span>
                                                </div>
                                            </div>

                                            {/* Match Pet - Bottom */}
                                            <div className={`relative h-36 bg-gradient-to-t from-blue-50 to-white p-3 flex items-center gap-4 ${!isUnlocked ? 'blur-sm' : ''}`}>
                                                <div className="w-24 h-24 rounded-xl overflow-hidden flex-shrink-0 border-2 border-blue-200 shadow-md">
                                                    <img
                                                        src={match.image || (match as any).image_url}
                                                        className={`w-full h-full object-cover ${!isUnlocked ? 'grayscale' : ''}`}
                                                        alt={match.name}
                                                    />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-[10px] uppercase tracking-wider text-blue-600 font-bold mb-1">
                                                        {t('Matched Partner', 'คู่ที่แมตช์')}
                                                    </div>
                                                    <h4 className="font-bold text-lg text-gray-900 truncate">
                                                        {isUnlocked ? match.name : t('Hidden', 'ซ่อน')}
                                                    </h4>
                                                    <p className="text-sm text-gray-500 truncate">{match.breed}</p>
                                                    <p className="text-xs text-gray-400">{match.gender === 'male' ? '♂ Male' : '♀ Female'}</p>
                                                </div>
                                            </div>

                                            {/* Lock Overlay */}
                                            {!isUnlocked && (
                                                <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center">
                                                    <div className="text-center">
                                                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-xl mb-3 mx-auto">
                                                            <span className="text-3xl">🔒</span>
                                                        </div>
                                                        <p className="text-gray-600 font-medium">{t('Locked Match', 'คู่แมตช์ถูกล็อก')}</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Analysis Section */}
                                        <div className="p-4 space-y-3 border-t border-gray-100">
                                            {/* AI Advice */}
                                            <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
                                                <p className="text-xs text-blue-800 italic font-medium">
                                                    "{translateBreedingText(matchResult.advice)}"
                                                </p>
                                            </div>

                                            {/* Breeding Info */}
                                            {(() => {
                                                const breeding = matchResult?.breeding;
                                                if (!breeding) return null;
                                                const badgeClass = breeding.type === 'inbreeding'
                                                    ? 'text-red-700'
                                                    : breeding.type === 'linebreeding'
                                                        ? 'text-amber-700'
                                                        : 'text-emerald-700';
                                                return (
                                                    <div className="flex items-center justify-between text-sm bg-gray-50 rounded-lg p-2">
                                                        <span className="text-gray-500">{t('Strategy', 'กลยุทธ์')}</span>
                                                        <span className={`font-semibold ${badgeClass}`}>
                                                            {formatBreedingLabel(breeding.type, breeding.level)}
                                                        </span>
                                                    </div>
                                                );
                                            })()}

                                            {/* Score Breakdown */}
                                            {matchResult?.breakdown && (
                                                <div className="grid grid-cols-3 gap-2 text-center">
                                                    <div className="bg-gray-50 rounded-lg p-2">
                                                        <div className="text-lg font-bold text-gray-800">{Math.round(matchResult.breakdown.genetic_risk)}%</div>
                                                        <div className="text-[10px] text-gray-500">{t('Genetic', 'พันธุกรรม')}</div>
                                                    </div>
                                                    <div className="bg-gray-50 rounded-lg p-2">
                                                        <div className="text-lg font-bold text-gray-800">{Math.round(matchResult.breakdown.health_score)}%</div>
                                                        <div className="text-[10px] text-gray-500">{t('Health', 'สุขภาพ')}</div>
                                                    </div>
                                                    <div className="bg-gray-50 rounded-lg p-2">
                                                        <div className="text-lg font-bold text-gray-800">{Math.round(matchResult.breakdown.breed_score)}%</div>
                                                        <div className="text-[10px] text-gray-500">{t('Breed', 'สายพันธุ์')}</div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Action Button */}
                                        <div className="p-4 pt-0">
                                            {isUnlocked ? (
                                                <button
                                                    onClick={() => handleContact(match)}
                                                    className="w-full py-3 bg-gradient-to-r from-pink-500 to-red-500 text-white font-bold rounded-full hover:from-pink-600 hover:to-red-600 transition-all flex items-center justify-center gap-2 shadow-lg"
                                                >
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                                                    {t('Contact Owner', 'ติดต่อเจ้าของ')}
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleUnlock(match)}
                                                    disabled={unlockingId === match.id}
                                                    className="w-full py-3 bg-white border-2 border-gray-900 text-gray-900 font-bold rounded-full hover:bg-gray-900 hover:text-white transition-all flex items-center justify-center gap-2 shadow-sm"
                                                >
                                                    {unlockingId === match.id
                                                        ? t('Unlocking...', 'กำลังปลดล็อก...')
                                                        : t(`Unlock (${MATCH_UNLOCK_COST} TRD)`, `ปลดล็อก (${MATCH_UNLOCK_COST} TRD)`)}
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
