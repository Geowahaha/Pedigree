import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pet } from '@/data/petData';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { QuickActions } from './QuickActions';
import { getPublicPets, Pet as DbPet } from '@/lib/database';
import { hasClaimedPet } from '@/lib/ownership';
import type { OwnershipClaim } from '@/lib/ownership';
import { ClaimOwnershipModal } from '@/components/modals/ClaimOwnershipModal';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import SmartImage from '@/components/ui/SmartImage';


interface ExpandablePetCardProps {
    pet: Pet;
    isExpanded: boolean;
    onToggle: () => void;
    onPedigreeClick: () => void;
    onChatClick: () => void;
    onLikeClick: () => void;
    isLiked?: boolean;
    isOwner?: boolean;
    isAdmin?: boolean;
    allPets?: Pet[];
    onUpdateParents?: (sireId: string | null, damId: string | null) => void;
    onCommentClick?: () => void;
    onEditClick?: () => void;
    onMatchClick?: () => void;
    onVetClick?: () => void;
    onMagicCardClick?: () => void;
    onDeleteClick?: () => void;
}

export const ExpandablePetCard: React.FC<ExpandablePetCardProps> = ({
    pet,
    isExpanded,
    onToggle,
    onPedigreeClick,
    onChatClick,
    onLikeClick,
    isLiked = false,
    isOwner = false,
    isAdmin = false,
    allPets = [],
    onUpdateParents,
    onCommentClick,
    onEditClick,
    onMatchClick,
    onVetClick,
    onMagicCardClick,
    onDeleteClick,
}) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [imageLoaded, setImageLoaded] = useState(false);
    const [showActions, setShowActions] = useState(false);
    const [isEditingParents, setIsEditingParents] = useState(false);
    const [selectedSire, setSelectedSire] = useState<string | null>(pet.parentIds?.sire || null);
    const [selectedDam, setSelectedDam] = useState<string | null>(pet.parentIds?.dam || null);
    const [showComments, setShowComments] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [databasePets, setDatabasePets] = useState<Pet[]>([]);
    const [loadingPets, setLoadingPets] = useState(false);
    const [claimModalOpen, setClaimModalOpen] = useState(false);
    const [claimStatus, setClaimStatus] = useState<OwnershipClaim | null>(null);
    const [claimStatusLoading, setClaimStatusLoading] = useState(false);
    const lastTapRef = useRef<number>(0);
    const tapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const isVideo = pet.media_type === 'video';
    const ownershipStatus = pet.ownership_status ?? (pet.owner_id ? 'verified' : undefined);
    const canClaim = !isOwner && (ownershipStatus === 'waiting_owner' || ownershipStatus === 'pending_claim');
    const claimLabel = claimStatus?.status === 'approved'
        ? 'You Own This Pet'
        : claimStatus?.status === 'pending'
            ? 'Claim Pending Review'
            : claimStatus?.status === 'rejected'
                ? 'Claim Rejected'
                : 'Claim This Pet';

    const handleClaimSubmitted = async () => {
        setClaimModalOpen(false);
        if (!user?.id) return;
        setClaimStatusLoading(true);
        try {
            const claim = await hasClaimedPet(pet.id);
            setClaimStatus(claim);
        } catch (error) {
            setClaimStatus(null);
        } finally {
            setClaimStatusLoading(false);
        }
    };

    // Fetch ALL pets from database when editing parents
    useEffect(() => {
        if (isEditingParents && isOwner) {
            loadAllPetsFromDatabase();
        }
    }, [isEditingParents, isOwner]);

    useEffect(() => {
        let active = true;
        const status = pet.ownership_status ?? (pet.owner_id ? 'verified' : undefined);
        const canClaim = !isOwner && (status === 'waiting_owner' || status === 'pending_claim');

        if (!isExpanded || !user?.id || !pet?.id || !canClaim) {
            setClaimStatus(null);
            return () => {
                active = false;
            };
        }

        setClaimStatusLoading(true);
        hasClaimedPet(pet.id)
            .then((claim) => {
                if (active) setClaimStatus(claim);
            })
            .catch(() => {
                if (active) setClaimStatus(null);
            })
            .finally(() => {
                if (active) setClaimStatusLoading(false);
            });

        return () => {
            active = false;
        };
    }, [isExpanded, isOwner, pet?.id, pet?.owner_id, pet?.ownership_status, user?.id]);

    // Convert DB Pet to UI Pet format
    const convertDbPet = (dbPet: DbPet): Pet => ({
        id: dbPet.id,
        name: dbPet.name,
        breed: dbPet.breed,
        type: dbPet.type || 'dog',
        birthDate: dbPet.birth_date,
        gender: dbPet.gender,
        image: dbPet.image_url || '',
        color: dbPet.color || '',
        registrationNumber: dbPet.registration_number || undefined,
        healthCertified: dbPet.health_certified,
        location: dbPet.location || '',
        owner: dbPet.owner?.full_name || dbPet.owner_name || 'Unknown',
        owner_id: dbPet.owner_id,
        ownership_status: dbPet.ownership_status,
        claimed_by: dbPet.claimed_by,
        claim_date: dbPet.claim_date,
        verification_evidence: dbPet.verification_evidence,
        parentIds: dbPet.pedigree ? {
            sire: dbPet.pedigree.sire_id || undefined,
            dam: dbPet.pedigree.dam_id || undefined
        } : undefined,
        created_at: dbPet.created_at,
    });

    const loadAllPetsFromDatabase = async () => {
        setLoadingPets(true);
        try {
            const dbPets = await getPublicPets();
            // Convert database pets to UI pet format
            const convertedPets = dbPets.map(convertDbPet);
            setDatabasePets(convertedPets);
        } catch (error) {
            console.error('Error loading pets from database:', error);
        } finally {
            setLoadingPets(false);
        }
    };

    // Use database pets if available, otherwise fall back to passed allPets
    const availablePets = databasePets.length > 0 ? databasePets : allPets;


    // Get parent names - check both database pets and passed pets
    const sirePet = availablePets.find(p => p.id === pet.parentIds?.sire);
    const damPet = availablePets.find(p => p.id === pet.parentIds?.dam);

    // Filter eligible parents from ALL database pets
    const malePets = availablePets.filter(p =>
        p.gender?.toLowerCase() === 'male' &&
        p.breed === pet.breed &&
        p.id !== pet.id &&
        p.name && p.name.trim() !== ''
    );
    const femalePets = availablePets.filter(p =>
        p.gender?.toLowerCase() === 'female' &&
        p.breed === pet.breed &&
        p.id !== pet.id &&
        p.name && p.name.trim() !== ''
    );

    const handleSaveParents = async () => {
        if (onUpdateParents) {
            await onUpdateParents(selectedSire, selectedDam);
            setIsEditingParents(false);
        }
    };

    const handleAddComment = () => {
        if (!commentText.trim()) return;
        console.log('Comment:', commentText);
        // TODO: Save comment to database
        setCommentText('');
    };

    const handleOverlayCommentClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        if (!isExpanded) {
            if (onCommentClick) {
                onCommentClick();
                return;
            }
            onToggle();
            setShowComments(true);
            return;
        }
        setShowComments(prev => !prev);
    };

    const handleOverlayEditClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        if (!isOwner) return;
        if (!isExpanded) {
            if (onEditClick) {
                onEditClick();
                return;
            }
            onToggle();
        }
        setShowComments(false);
        setIsEditingParents(true);
    };

    const canOpenOwnerProfile = Boolean(pet.owner_id);

    // Prefetch owner profile data on hover for instant feel
    const handleOwnerProfileHover = () => {
        if (!pet.owner_id) return;
        // Prefetch profile + pets data
        supabase.from('profiles').select('*').eq('id', pet.owner_id).maybeSingle();
        supabase.from('pets').select('*').eq('owner_id', pet.owner_id).limit(10);
    };

    const handleOwnerProfileClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        if (!pet.owner_id) return;
        navigate(`/profile/${pet.owner_id}`);
    };

    const handleCardTap = () => {
        const isTouch = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
        if (!isTouch) {
            onToggle();
            return;
        }

        const now = Date.now();
        const lastTap = lastTapRef.current;

        if (tapTimeoutRef.current) {
            clearTimeout(tapTimeoutRef.current);
            tapTimeoutRef.current = null;
        }

        if (now - lastTap < 260) {
            lastTapRef.current = 0;
            onPedigreeClick();
            return;
        }

        lastTapRef.current = now;
        tapTimeoutRef.current = setTimeout(() => {
            onToggle();
            tapTimeoutRef.current = null;
        }, 240);
    };

    useEffect(() => {
        return () => {
            if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
        };
    }, []);


    return (
        <div
            className={`relative group cursor-pointer break-inside-avoid transition-all duration-300 ${isExpanded ? 'col-span-2 row-span-2 z-50' : 'mb-4 md:mb-8'
                }`}
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => setShowActions(false)}
            onClick={handleCardTap}
        >
            {/* Card Container */}
            <div
                className={`relative rounded-[24px] overflow-hidden bg-white shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition-all duration-500 ${isExpanded
                    ? 'h-[700px] shadow-[0_20px_60px_rgba(0,0,0,0.2)]'
                    : 'h-auto hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)]'
                    } border border-gray-100`}
            >
                {/* Media Content */}
                <div className={`w-full ${isExpanded ? 'h-[300px]' : 'aspect-[4/5] md:aspect-[3/4]'} relative bg-black`}>
                    {isVideo && pet.video_url ? (
                        <video
                            src={pet.video_url}
                            className="w-full h-full object-cover"
                            loop
                            muted
                            playsInline
                            autoPlay
                        />
                    ) : pet.image ? (
                        <SmartImage
                            src={pet.image}
                            petId={pet.id}
                            alt={pet.name}
                            className={`w-full h-full object-cover transition-opacity duration-500 ${imageLoaded ? 'opacity-100' : 'opacity-0'
                                }`}
                            onLoad={() => setImageLoaded(true)}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-50">
                            <span className="text-4xl opacity-30">🐕</span>
                        </div>
                    )}

                    {/* Gradient Overlay */}
                    <div
                        className={`absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent transition-opacity duration-300 ${showActions || isExpanded ? 'opacity-100' : 'opacity-0'
                            }`}
                    />

                    {(ownershipStatus === 'waiting_owner' || ownershipStatus === 'pending_claim' || ownershipStatus === 'disputed') && (
                        <div className="absolute top-3 left-3 px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-white/90 text-gray-900 shadow-sm">
                            {ownershipStatus === 'waiting_owner' && 'Waiting Owner'}
                            {ownershipStatus === 'pending_claim' && 'Claim In Review'}
                            {ownershipStatus === 'disputed' && 'Ownership Disputed'}
                        </div>
                    )}

                    {/* Floating Actions */}
                    <div
                        className={`absolute top-3 right-3 flex flex-col items-end gap-2 transition-all duration-300 ${showActions || isExpanded ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
                            } z-20`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleOverlayCommentClick}
                                className="h-9 px-3 rounded-full bg-white/95 backdrop-blur-sm flex items-center gap-1.5 text-gray-700 text-xs font-semibold shadow-sm hover:bg-white transition-all"
                                title="Comments & AI Chat"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                                Comment
                            </button>
                            {isOwner && (
                                <button
                                    onClick={handleOverlayEditClick}
                                    className="h-9 px-3 rounded-full bg-white/95 backdrop-blur-sm flex items-center gap-1.5 text-gray-700 text-xs font-semibold shadow-sm hover:bg-white transition-all"
                                    title="Edit Pet"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-5M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z" />
                                    </svg>
                                    Edit
                                </button>
                            )}
                        </div>
                        <div className="flex flex-col gap-2 items-end">
                            {!isOwner && (
                                <button
                                    onClick={onChatClick}
                                    className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-gray-600 hover:text-[#ea4c89] hover:bg-white shadow-sm transition-all"
                                    title="Chat with Owner"
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                                    </svg>
                                </button>
                            )}
                            <button
                                onClick={onPedigreeClick}
                                className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-gray-600 hover:text-[#ea4c89] hover:bg-white shadow-sm transition-all"
                                title="Family Tree"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            </button>
                            <button
                                onClick={onLikeClick}
                                className={`w-10 h-10 rounded-full backdrop-blur-sm flex items-center justify-center shadow-sm transition-all ${isLiked ? 'bg-[#ea4c89] text-white' : 'bg-white/90 text-gray-600 hover:text-[#ea4c89] hover:bg-white'
                                    }`}
                                title="Like"
                            >
                                <svg className="w-4 h-4" fill={isLiked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                </svg>
                            </button>
                        </div>
                    </div>
                    {!isExpanded && (
                        <>
                            <div className="absolute bottom-3 right-3 z-30" onClick={(e) => e.stopPropagation()}>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <button
                                            className="w-9 h-9 rounded-full bg-white/95 backdrop-blur-sm text-gray-700 shadow-md flex items-center justify-center hover:bg-white transition-colors"
                                            aria-label="Open menu"
                                        >
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01" />
                                            </svg>
                                        </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" sideOffset={6} className="w-52">
                                        <DropdownMenuItem onClick={() => onPedigreeClick()}>
                                            View Pedigree
                                        </DropdownMenuItem>
                                        {onVetClick && (
                                            <DropdownMenuItem onClick={() => onVetClick()}>
                                                Vet AI Profile
                                            </DropdownMenuItem>
                                        )}
                                        {onMatchClick && (
                                            <DropdownMenuItem onClick={() => onMatchClick()}>
                                                Match AI
                                            </DropdownMenuItem>
                                        )}
                                        {isOwner && onEditClick && (
                                            <DropdownMenuItem onClick={() => onEditClick()}>
                                                Edit Pet
                                            </DropdownMenuItem>
                                        )}
                                        {onMagicCardClick && (
                                            <>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem onClick={() => onMagicCardClick()}>
                                                    Add Magic Card
                                                </DropdownMenuItem>
                                            </>
                                        )}
                                        {(isOwner || isAdmin) && onDeleteClick && (
                                            <>
                                                <DropdownMenuSeparator />
                                                <DropdownMenuItem
                                                    onClick={() => onDeleteClick()}
                                                    className="text-red-500 focus:text-red-500 focus:bg-red-500/10"
                                                >
                                                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                    Delete Card
                                                </DropdownMenuItem>
                                            </>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>

                            <div className="hidden md:block">
                                <QuickActions
                                    isLiked={isLiked}
                                    onLike={() => onLikeClick()}
                                    onShare={() => { }}
                                    onAddToCollection={() => { }}
                                />
                            </div>
                        </>
                    )}
                </div>

                {!isExpanded && (
                    <div className="px-3 pt-3 pb-4">
                        <p className="text-sm font-bold text-[#0d0c22] truncate">{pet.name}</p>
                        <p className="text-[11px] text-gray-500 truncate">{pet.breed}</p>
                    </div>
                )}

                {/* Expanded Content */}
                {isExpanded && (
                    <div className="p-6 overflow-y-auto h-[400px]" onClick={(e) => e.stopPropagation()}>
                        {/* Header */}
                        <div className="mb-4">
                            <h2 className="text-2xl font-bold text-[#0d0c22]">{pet.name}</h2>
                            <p className="text-gray-500">{pet.breed} • {pet.gender}</p>
                            {(sirePet?.name || damPet?.name) && !isEditingParents && (
                                <p className="text-sm text-gray-600 mt-2">
                                    ลูกของ <span className="font-medium text-blue-600">{sirePet?.name || '?'}</span> (พ่อ)
                                    {' + '}
                                    <span className="font-medium text-pink-600">{damPet?.name || '?'}</span> (แม่)
                                </p>
                            )}
                        </div>

                        {/* Owner */}
                        <button
                            type="button"
                            onClick={handleOwnerProfileClick}
                            onMouseEnter={handleOwnerProfileHover}
                            disabled={!canOpenOwnerProfile}
                            className="flex items-center gap-3 mb-6 pb-6 border-b text-left w-full disabled:cursor-default hover:bg-gray-50/50 transition-colors rounded-lg p-2 -m-2"
                            title={canOpenOwnerProfile ? 'View profile' : undefined}
                            aria-label={canOpenOwnerProfile ? `View profile for ${pet.owner || 'owner'}` : undefined}
                        >
                            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-gray-200 to-gray-300" />
                            <div className="flex-1">
                                <p className="text-sm font-medium">{pet.owner || 'Unknown Owner'}</p>
                                <p className="text-xs text-gray-400">{pet.location || 'Location'}</p>
                            </div>
                            {canOpenOwnerProfile && (
                                <span className="ml-auto flex items-center gap-1 text-xs text-gray-400">
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12h.01M12 12h.01M9 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                    </svg>
                                    <span className="hidden sm:inline">View profile</span>
                                </span>
                            )}
                        </button>

                        {/* Ownership Status */}
                        {ownershipStatus && (
                            <div className="mb-6 rounded-xl border border-gray-100 bg-gray-50 p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] uppercase text-gray-500 font-semibold">Ownership</p>
                                        <p className="text-sm font-semibold text-gray-900">
                                            {ownershipStatus === 'waiting_owner' && 'Waiting Owner'}
                                            {ownershipStatus === 'pending_claim' && 'Claim In Review'}
                                            {ownershipStatus === 'verified' && 'Verified Owner'}
                                            {ownershipStatus === 'disputed' && 'Ownership Disputed'}
                                        </p>
                                    </div>
                                    {canClaim && (
                                        <button
                                            onClick={() => setClaimModalOpen(true)}
                                            className="px-3 py-2 rounded-full bg-gray-900 text-white text-xs font-semibold hover:bg-gray-800 disabled:opacity-60"
                                            disabled={claimStatus?.status === 'pending' || claimStatus?.status === 'approved' || claimStatus?.status === 'rejected' || claimStatusLoading}
                                        >
                                            {claimLabel}
                                        </button>
                                    )}
                                </div>
                                {canClaim && (
                                    <p className="text-xs text-gray-500 mt-2">
                                        {claimStatusLoading && 'Checking claim status...'}
                                        {!claimStatusLoading && claimStatus?.status === 'pending' && 'Your claim is pending admin review.'}
                                        {!claimStatusLoading && claimStatus?.status === 'approved' && 'You already own this pet.'}
                                        {!claimStatusLoading && claimStatus?.status === 'rejected' && 'Your claim was rejected. Contact admin for help.'}
                                        {!claimStatusLoading && !claimStatus && 'Submit your claim to become the verified owner.'}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* One-Stop Parent Editing */}
                        <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-4 border border-gray-100 mb-4">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-bold text-sm text-gray-700 flex items-center gap-2">
                                    <svg className="w-4 h-4 text-[#ea4c89]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                    Family Tree
                                </h3>
                            </div>

                            {isEditingParents && isOwner ? (
                                <div className="space-y-3">
                                    {/* Sire Dropdown */}
                                    <div>
                                        <label className="text-[10px] font-bold text-blue-600 uppercase block mb-1">
                                            Sire (พ่อ) {loadingPets && <span className="text-gray-400">Loading...</span>}
                                        </label>
                                        <select
                                            value={selectedSire || ''}
                                            onChange={(e) => setSelectedSire(e.target.value || null)}
                                            className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:border-blue-500 outline-none"
                                            disabled={loadingPets}
                                        >
                                            <option value="">-- เลือกพ่อ --</option>
                                            {malePets.map(p => (
                                                <option key={p.id} value={p.id}>
                                                    {p.name} {p.registrationNumber && `(${p.registrationNumber})`}
                                                </option>
                                            ))}
                                        </select>
                                        <p className="text-[10px] text-gray-400 mt-1">
                                            {malePets.length} male {pet.breed} available
                                        </p>
                                    </div>

                                    {/* Dam Dropdown */}
                                    <div>
                                        <label className="text-[10px] font-bold text-pink-600 uppercase block mb-1">
                                            Dam (แม่) {loadingPets && <span className="text-gray-400">Loading...</span>}
                                        </label>
                                        <select
                                            value={selectedDam || ''}
                                            onChange={(e) => setSelectedDam(e.target.value || null)}
                                            className="w-full px-3 py-2 border border-pink-200 rounded-lg text-sm focus:border-pink-500 outline-none"
                                            disabled={loadingPets}
                                        >
                                            <option value="">-- เลือกแม่ --</option>
                                            {femalePets.map(p => (
                                                <option key={p.id} value={p.id}>
                                                    {p.name} {p.registrationNumber && `(${p.registrationNumber})`}
                                                </option>
                                            ))}
                                        </select>
                                        <p className="text-[10px] text-gray-400 mt-1">
                                            {femalePets.length} female {pet.breed} available
                                        </p>
                                    </div>

                                    {/* Save/Cancel Buttons */}
                                    <div className="flex gap-2 pt-2">
                                        <button
                                            onClick={handleSaveParents}
                                            className="flex-1 py-2 bg-gradient-to-r from-[#ea4c89] to-[#d9457a] text-white text-xs font-bold rounded-lg hover:shadow-lg transition-all"
                                        >
                                            ✓ Save
                                        </button>
                                        <button
                                            onClick={() => {
                                                setIsEditingParents(false);
                                                setSelectedSire(pet.parentIds?.sire || null);
                                                setSelectedDam(pet.parentIds?.dam || null);
                                            }}
                                            className="px-4 py-2 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-200 transition-all"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {sirePet?.name && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className="text-blue-500">👨</span>
                                            <span className="text-gray-600">Sire:</span>
                                            <button
                                                onClick={onPedigreeClick}
                                                className="font-medium text-blue-600 hover:underline"
                                            >
                                                {sirePet.name}
                                            </button>
                                        </div>
                                    )}
                                    {damPet?.name && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className="text-pink-500">👩</span>
                                            <span className="text-gray-600">Dam:</span>
                                            <button
                                                onClick={onPedigreeClick}
                                                className="font-medium text-pink-600 hover:underline"
                                            >
                                                {damPet.name}
                                            </button>
                                        </div>
                                    )}
                                    {!sirePet?.name && !damPet?.name && (
                                        <p className="text-xs text-gray-400 italic text-center py-2">
                                            {isOwner ? 'คลิก Edit เพื่อเพิ่มข้อมูลพ่อแม่' : 'ยังไม่มีข้อมูลพ่อแม่'}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Comments & AI Chat Section */}
                        {showComments && (
                            <div className="bg-gradient-to-br from-blue-50 to-white rounded-xl p-4 border border-blue-100">
                                <h3 className="font-bold text-sm text-gray-700 mb-3 flex items-center gap-2">
                                    <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                    </svg>
                                    Comments & AI Chat
                                </h3>
                                <div className="space-y-2">
                                    <textarea
                                        value={commentText}
                                        onChange={(e) => setCommentText(e.target.value)}
                                        placeholder="Ask AI or leave a comment..."
                                        className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm resize-none focus:border-blue-500 outline-none"
                                        rows={2}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleAddComment();
                                            }
                                        }}
                                    />
                                    <button
                                        onClick={handleAddComment}
                                        disabled={!commentText.trim()}
                                        className="w-full py-2 bg-blue-500 text-white text-xs font-bold rounded-lg hover:bg-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Send
                                    </button>
                                    <p className="text-[10px] text-gray-400 italic text-center">
                                        Comments coming soon! Use AI search bar for now.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Info Below Card (Collapsed State) */}
                {!isExpanded && (
                    <div className="pt-3 px-1">
                        <div className="flex justify-between items-center">
                            <button
                                type="button"
                                onClick={handleOwnerProfileClick}
                                onMouseEnter={handleOwnerProfileHover}
                                disabled={!canOpenOwnerProfile}
                                className="flex items-center gap-2 disabled:cursor-default hover:opacity-70 transition-opacity"
                                title={canOpenOwnerProfile ? 'View profile' : undefined}
                                aria-label={canOpenOwnerProfile ? `View profile for ${pet.owner || 'owner'}` : undefined}
                            >
                                <div className="w-5 h-5 rounded-full bg-gray-100 overflow-hidden">
                                    <div className="w-full h-full bg-gradient-to-tr from-gray-200 to-gray-300" />
                                </div>
                                <span className="text-xs font-medium text-[#0d0c22] truncate max-w-[100px]">{pet.owner || 'User'}</span>
                                {canOpenOwnerProfile && (
                                    <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h.01M12 12h.01M15 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                    </svg>
                                )}
                            </button>
                            <div className="flex items-center gap-2 text-gray-400 text-[10px] font-medium">
                                <span className="flex items-center gap-0.5">❤️ {pet.likes || 0}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <ClaimOwnershipModal
                isOpen={claimModalOpen}
                pet={pet}
                onClose={() => setClaimModalOpen(false)}
                onSubmitted={handleClaimSubmitted}
            />
        </div>
    );
};
