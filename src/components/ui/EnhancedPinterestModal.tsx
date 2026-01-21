/**
 * Enhanced Pinterest-Style Pet Modal v2
 * 
 * Matches Pinterest UX 1:1 with:
 * - Full pet profile editing (all fields)
 * - Working Share button (copy link + social)
 * - Working More menu (Download, Edit, Report)
 * - Single database pool (no magic card duplication)
 * - Rich comments with emoji/sticker/image
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pet } from '@/data/petData';
import { addPetPhoto, deletePetPhoto, getPetPhotos, getPublicPets, updatePet, updatePedigree } from '@/lib/database';
import type { PetPhoto } from '@/lib/database';
import { uploadPetImage } from '@/lib/storage';
import { hasClaimedPet } from '@/lib/ownership';
import type { OwnershipClaim } from '@/lib/ownership';
import { getPetComments, postPetComment, deletePetComment, type PetComment } from '@/lib/social_features';
import { ClaimOwnershipModal } from '@/components/modals/ClaimOwnershipModal';
import { useLanguage } from '@/contexts/LanguageContext';
import SmartImage from '@/components/ui/SmartImage';
import { VideoPlayer } from '@/components/ui/VideoPlayer';
import data from '@emoji-mart/data'
import Picker from '@emoji-mart/react'

interface EnhancedPinterestModalProps {
    pet: Pet;
    isOpen: boolean;
    onClose: () => void;
    onViewPedigree: (pet: Pet) => void;
    onFindMate?: (pet: Pet) => void;
    isOwner?: boolean;
    isAdmin?: boolean;
    currentUserId?: string;
    canManageHealthProfile?: boolean;
    initialSection?: string | null;
}

interface Comment {
    id: string;
    user_id: string;
    user_name: string;
    user_avatar?: string;
    content: string;
    images?: string[];
    emoji?: string;
    created_at: string;
}

export const EnhancedPinterestModal: React.FC<EnhancedPinterestModalProps> = ({
    pet,
    isOpen,
    onClose,
    onViewPedigree,
    onFindMate,
    isOwner = false,
    isAdmin = false,
    currentUserId,
    canManageHealthProfile = false,
}) => {
    const navigate = useNavigate();
    const { language } = useLanguage();
    const isThai = language === 'th';
    const t = (en: string, th: string) => (isThai ? th : en);
    // State
    const [allPets, setAllPets] = useState<Pet[]>([]);
    const [loading, setLoading] = useState(false);
    const [isEditingFull, setIsEditingFull] = useState(false);
    const [showShareMenu, setShowShareMenu] = useState(false);
    const [showMoreMenu, setShowMoreMenu] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);
    const [reportReason, setReportReason] = useState('');
    const [reportDetails, setReportDetails] = useState('');
    const [copiedLink, setCopiedLink] = useState(false);
    const [claimModalOpen, setClaimModalOpen] = useState(false);
    const [claimStatus, setClaimStatus] = useState<OwnershipClaim | null>(null);
    const [claimStatusLoading, setClaimStatusLoading] = useState(false);

    // Edit state
    const [editForm, setEditForm] = useState({
        name: '',
        breed: '',
        birthDate: '',
        color: '',
        location: '',
        description: '',
        registrationNumber: '',
        imageUrl: '',
        sireId: null as string | null,
        damId: null as string | null,
        videoUrl: '',
        externalLink: '',
        // Admin-only fields
        ownerName: '',
        ownerId: '' as string | null,
        ownershipStatus: '' as string,
    });

    const [comments, setComments] = useState<Comment[]>([]);
    const [commentsLoading, setCommentsLoading] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showStickerPicker, setShowStickerPicker] = useState(false);
    const [commentImages, setCommentImages] = useState<string[]>([]);
    const [expandedCommentImage, setExpandedCommentImage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const coverInputRef = useRef<HTMLInputElement>(null);
    const shareMenuRef = useRef<HTMLDivElement>(null);
    const moreMenuRef = useRef<HTMLDivElement>(null);
    const [imageUploading, setImageUploading] = useState(false);
    const [galleryPhotos, setGalleryPhotos] = useState<PetPhoto[]>([]);
    const [galleryLoading, setGalleryLoading] = useState(false);
    const [galleryUploading, setGalleryUploading] = useState(false);
    const galleryInputRef = useRef<HTMLInputElement>(null);

    // Initialize form when pet changes
    useEffect(() => {
        if (pet) {
            setEditForm({
                name: pet.name || '',
                breed: pet.breed || '',
                birthDate: pet.birthDate || '',
                color: pet.color || '',
                location: pet.location || '',
                description: pet.description || '',
                registrationNumber: pet.registrationNumber || '',
                imageUrl: pet.image_url || pet.image || '',
                sireId: pet.parentIds?.sire || null,
                damId: pet.parentIds?.dam || null,
                videoUrl: pet.video_url || '',
                externalLink: pet.external_link || '',
                // Admin-only fields
                ownerName: pet.owner_name || (typeof pet.owner === 'string' ? pet.owner : pet.owner?.full_name) || '',
                ownerId: pet.owner_id || null,
                ownershipStatus: pet.ownership_status || 'waiting_owner',
            });
        }
    }, [pet]);

    // LOAD COMMENTS FROM DB when pet changes (persist by pet_id)
    const loadComments = async () => {
        if (!pet?.id) return;
        setCommentsLoading(true);
        try {
            const dbComments = await getPetComments(pet.id);
            const mappedComments: Comment[] = dbComments.map((c: PetComment) => ({
                id: c.id,
                user_id: c.user_id,
                user_name: c.user?.full_name || 'Anonymous',
                user_avatar: c.user?.avatar_url,
                content: c.content,
                created_at: c.created_at,
            }));
            setComments(mappedComments);
        } catch (err) {
            console.error('Failed to load comments:', err);
            setComments([]);
        } finally {
            setCommentsLoading(false);
        }
    };

    useEffect(() => {
        // Reset UI state when viewing a different pet
        setCommentText('');
        setCommentImages([]);
        setShowEmojiPicker(false);
        setShowStickerPicker(false);
        // Load comments from DB for this pet
        loadComments();
    }, [pet?.id]);

    // Fetch ALL pets from database
    useEffect(() => {
        if (isOpen) {
            loadAllPets();
        }
    }, [isOpen]);

    useEffect(() => {
        let active = true;
        const status = pet?.ownership_status ?? (pet?.owner_id ? 'verified' : undefined);
        const canClaim = !isOwner && (status === 'waiting_owner' || status === 'pending_claim');

        if (!isOpen || !pet?.id || !currentUserId || !canClaim) {
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
    }, [currentUserId, isOpen, isOwner, pet?.id, pet?.owner_id, pet?.ownership_status]);

    // Close dropdown menus when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (shareMenuRef.current && !shareMenuRef.current.contains(event.target as Node)) {
                setShowShareMenu(false);
            }
            if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
                setShowMoreMenu(false);
            }
        };

        if (showShareMenu || showMoreMenu) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [showShareMenu, showMoreMenu]);

    const loadAllPets = async () => {
        setLoading(true);
        try {
            const pets = await getPublicPets();
            setAllPets(pets);
        } catch (error) {
            console.error('Error loading pets:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadGallery = async () => {
        if (!pet?.id || pet.id.startsWith('ext-') || pet.id.startsWith('mock-')) {
            setGalleryPhotos([]);
            return;
        }

        setGalleryLoading(true);
        try {
            const photos = await getPetPhotos(pet.id);
            setGalleryPhotos(photos);
        } catch (error) {
            console.error('Error loading gallery photos:', error);
        } finally {
            setGalleryLoading(false);
        }
    };

    useEffect(() => {
        if (!isOpen || !isOwner) return;
        loadGallery();
    }, [isOpen, isOwner, pet?.id]);

    if (!isOpen || !pet) return null;

    // Get parent pets
    const sirePet = allPets.find(p => p.id === editForm.sireId);
    const damPet = allPets.find(p => p.id === editForm.damId);

    // Filter eligible parents - same breed, opposite gender, not self
    const malePets = allPets.filter(p =>
        p.gender?.toLowerCase() === 'male' &&
        p.breed === editForm.breed &&
        p.id !== pet.id &&
        p.name && p.name.trim() !== ''
    );

    const femalePets = allPets.filter(p =>
        p.gender?.toLowerCase() === 'female' &&
        p.breed === editForm.breed &&
        p.id !== pet.id &&
        p.name && p.name.trim() !== ''
    );

    const resolveBirthDateValue = (value?: string | null) => {
        if (!value) return null;
        const parsed = new Date(value);
        if (Number.isNaN(parsed.getTime())) return null;
        return parsed;
    };

    const getParentAgeWarning = (parent?: Pet | null, label?: string) => {
        const labelText = isThai
            ? (label === 'Sire' ? 'พ่อพันธุ์' : label === 'Dam' ? 'แม่พันธุ์' : (label || ''))
            : (label || '');
        if (!parent) return null;
        if (!editForm.birthDate) {
            return isThai
                ? `${labelText} ถูกเลือกแล้ว กรุณาเพิ่มวันเกิดเพื่อยืนยันสายเลือด`
                : `${label} selected. Add the pet birth date to validate lineage.`;
        }
        const parentBirth = (parent as any).birthDate || (parent as any).birth_date || (parent as any).birthday;
        const parentDate = resolveBirthDateValue(parentBirth);
        if (!parentDate) {
            return isThai ? `${labelText} ไม่มีวันเกิด` : `${label} birth date is missing.`;
        }
        const childDate = resolveBirthDateValue(editForm.birthDate);
        if (!childDate) return null;
        const diffDays = (childDate.getTime() - parentDate.getTime()) / (1000 * 60 * 60 * 24);
        if (diffDays < 0) {
            return isThai ? `${labelText} มีวันเกิดหลังลูก` : `${label} birth date is after the child.`;
        }
        if (diffDays < 365) {
            return isThai ? `${labelText} ควรอายุมากกว่าอย่างน้อย 1 ปี` : `${label} should be at least 1 year older than the child.`;
        }
        return null;
    };

    const sireAgeWarning = getParentAgeWarning(sirePet, 'Sire');
    const damAgeWarning = getParentAgeWarning(damPet, 'Dam');

    const handleSaveFullEdit = async () => {
        try {
            const trimmedVideoUrl = editForm.videoUrl.trim();
            const mediaType = trimmedVideoUrl ? 'video' : 'image';

            // Build update object
            const updateData: any = {
                name: editForm.name,
                breed: editForm.breed,
                birth_date: editForm.birthDate || null,
                color: editForm.color,
                location: editForm.location,
                description: editForm.description,
                registration_number: editForm.registrationNumber,
                image_url: editForm.imageUrl || undefined,
                media_type: mediaType,
                video_url: trimmedVideoUrl || undefined,
            };

            // Only admin can update external_link and ownership fields
            if (isAdmin) {
                updateData.external_link = editForm.externalLink.trim() || null;
                updateData.owner_name = editForm.ownerName.trim() || null;

                // Validate ownerId is a UUID before sending to pet update
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                if (editForm.ownerId && uuidRegex.test(editForm.ownerId)) {
                    updateData.owner_id = editForm.ownerId;
                } else if (!editForm.ownerId) {
                    updateData.owner_id = null;
                } else {
                    console.warn('Invalid Owner ID skipped to prevent 400 error');
                    // We don't set owner_id if it's invalid name string
                }

                updateData.ownership_status = editForm.ownershipStatus as any || 'waiting_owner';
            }

            // Update pet profile
            await updatePet(pet.id, updateData);

            // Update pedigree
            await updatePedigree(pet.id, editForm.sireId || undefined, editForm.damId || undefined);

            // Update local pet object
            Object.assign(pet, {
                name: editForm.name,
                breed: editForm.breed,
                birthDate: editForm.birthDate,
                color: editForm.color,
                location: editForm.location,
                description: editForm.description,
                registrationNumber: editForm.registrationNumber,
                image: editForm.imageUrl || pet.image,
                image_url: editForm.imageUrl || pet.image_url,
                media_type: mediaType,
                video_url: trimmedVideoUrl || undefined,
                parentIds: {
                    sire: editForm.sireId || undefined,
                    dam: editForm.damId || undefined,
                },
                // Admin fields
                ...(isAdmin ? {
                    owner: editForm.ownerName || undefined,
                    owner_name: editForm.ownerName || undefined,
                    owner_id: editForm.ownerId || undefined,
                    ownership_status: editForm.ownershipStatus || 'waiting_owner',
                } : {})
            });

            setIsEditingFull(false);
            alert(t('Pet updated successfully!', 'อัปเดตข้อมูลสัตว์เลี้ยงสำเร็จ!'));
        } catch (error) {
            console.error('Error updating pet:', error);
            alert(t('Failed to update pet information', 'อัปเดตข้อมูลสัตว์เลี้ยงไม่สำเร็จ'));
        }
    };

    // Helper: Get share URL using registration number if available, fallback to id
    const getShareUrl = () => {
        const slug = pet.registrationNumber || (pet as any).registration_number || pet.id;
        return `${window.location.origin}/pet/${encodeURIComponent(slug)}`;
    };

    const handleCopyLink = () => {
        const url = getShareUrl();
        navigator.clipboard.writeText(url);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
    };

    const handleShare = (platform: string) => {
        const url = getShareUrl();
        const text = `Check out ${pet.name} - ${pet.breed}`;

        const shareUrls: Record<string, string> = {
            facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
            twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
            whatsapp: `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`,
            line: `https://line.me/R/msg/text/?${encodeURIComponent(text + ' ' + url)}`,
        };

        if (shareUrls[platform]) {
            window.open(shareUrls[platform], '_blank', 'width=600,height=400');
        }
        setShowShareMenu(false);
    };

    const handleOpenVetProfile = () => {
        onClose();
        navigate(`/vet-profile/${pet.id}`);
    };

    const handleCoverImageClick = () => {
        if (!isEditingFull || !isOwner || isVideo) return;
        coverInputRef.current?.click();
    };

    const handleCoverImageSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setImageUploading(true);
        try {
            const publicUrl = await uploadPetImage(file);
            setEditForm(prev => ({ ...prev, imageUrl: publicUrl }));
        } catch (error) {
            console.error('Failed to upload image:', error);
            alert(t('Failed to upload image.', 'อัปโหลดรูปภาพไม่สำเร็จ'));
        } finally {
            setImageUploading(false);
            event.target.value = '';
        }
    };

    const handleGalleryUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!pet?.id) return;
        const files = Array.from(event.target.files || []);
        if (!files.length) return;

        setGalleryUploading(true);
        try {
            let firstUploadedUrl: string | null = null;
            for (const file of files) {
                const publicUrl = await uploadPetImage(file);
                if (!firstUploadedUrl) firstUploadedUrl = publicUrl;
                await addPetPhoto({
                    pet_id: pet.id,
                    image_url: publicUrl,
                    caption: file.name,
                });
            }
            if (!editForm.imageUrl && firstUploadedUrl) {
                setEditForm(prev => ({ ...prev, imageUrl: firstUploadedUrl }));
            }
            await loadGallery();
        } catch (error) {
            console.error('Failed to upload gallery photos:', error);
            alert(t('Failed to upload gallery photos.', 'อัปโหลดรูปแกลเลอรีไม่สำเร็จ'));
        } finally {
            setGalleryUploading(false);
            event.target.value = '';
        }
    };

    const handleGalleryDelete = async (photoId: string) => {
        if (!confirm(t('Remove this photo from the gallery?', 'ลบรูปนี้ออกจากแกลเลอรีหรือไม่?'))) return;
        try {
            await deletePetPhoto(photoId);
            setGalleryPhotos(prev => prev.filter(photo => photo.id !== photoId));
        } catch (error) {
            console.error('Failed to delete gallery photo:', error);
            alert(t('Failed to delete gallery photo.', 'ลบรูปแกลเลอรีไม่สำเร็จ'));
        }
    };

    const handleDownloadImage = () => {
        if (pet.image) {
            const link = document.createElement('a');
            link.href = pet.image;
            link.download = `${pet.name}-${pet.id}.jpg`;
            link.click();
        }
        setShowMoreMenu(false);
    };

    const handleAddComment = async () => {
        if (!commentText.trim() && commentImages.length === 0) return;
        if (!currentUserId) {
            alert(t('Please sign in to comment', 'กรุณาเข้าสู่ระบบเพื่อแสดงความคิดเห็น'));
            return;
        }

        try {
            // Save to DB
            await postPetComment(pet.id, commentText.trim());
            // Refresh comments from DB
            await loadComments();
            setCommentText('');
            setCommentImages([]);
        } catch (err) {
            console.error('Failed to post comment:', err);
            alert(t('Failed to post comment. Please try again.', 'โพสต์ความคิดเห็นไม่สำเร็จ กรุณาลองใหม่'));
        }
    };

    const handleSubmitReport = async () => {
        if (!reportReason) {
            alert(t('Please select a reason for reporting', 'กรุณาเลือกเหตุผลในการรายงาน'));
            return;
        }

        try {
            // TODO: Send report to backend/Supabase
            console.log('Report submitted:', {
                petId: pet.id,
                petName: pet.name,
                reason: reportReason,
                details: reportDetails,
                reportedBy: currentUserId,
                timestamp: new Date().toISOString()
            });

            // For now, just show success message
            alert(t('Thank you for your report. We will review it shortly.', 'ขอบคุณสำหรับการรายงาน เราจะตรวจสอบโดยเร็ว'));

            // Reset form
            setShowReportModal(false);
            setReportReason('');
            setReportDetails('');
        } catch (error) {
            console.error('Error submitting report:', error);
            alert(t('Failed to submit report. Please try again.', 'ส่งรายงานไม่สำเร็จ กรุณาลองใหม่'));
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;

        Array.from(files).forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                if (e.target?.result) {
                    setCommentImages(prev => [...prev, e.target!.result as string]);
                }
            };
            reader.readAsDataURL(file);
        });
    };

    const handleEmojiSelect = (emoji: any) => {
        setCommentText(prev => prev + emoji.native);
        setShowEmojiPicker(false);
    };

    const stickers = [
        '😀', '😂', '🥰', '😍', '🤩', '🥳', '😎', '🤗',
        '🐕', '🐶', '🐩', '🐕‍🦺', '🐾', '❤️', '💕', '✨',
        '👍', '👏', '🙏', '💪', '🔥', '⭐', '🌟', '💯',
    ];

    const activeVideoUrl = isEditingFull ? editForm.videoUrl : pet.video_url;
    const isVideo = Boolean(activeVideoUrl);
    const displayImage = isEditingFull
        ? (editForm.imageUrl || pet.image || pet.image_url || '')
        : (pet.image || pet.image_url || '');
    const ownershipStatus = pet.ownership_status ?? (pet.owner_id ? 'verified' : undefined);
    const canClaim = !isOwner && (ownershipStatus === 'waiting_owner' || ownershipStatus === 'pending_claim');
    const claimLabel = claimStatus?.status === 'approved'
        ? t('You Own This Pet', 'คุณเป็นเจ้าของสัตว์เลี้ยงนี้')
        : claimStatus?.status === 'pending'
            ? t('Claim Pending Review', 'รอตรวจสอบคำขอ')
            : claimStatus?.status === 'rejected'
                ? t('Claim Rejected', 'คำขอถูกปฏิเสธ')
                : t('Claim This Pet', 'ขอเป็นเจ้าของสัตว์เลี้ยงนี้');

    const handleClaimSubmitted = async () => {
        setClaimModalOpen(false);
        if (!currentUserId) return;
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

    return (
        <div
            className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-stretch justify-center p-0"
            onClick={onClose}
        >
            {/* Modal Container */}
            <div
                className="relative bg-white rounded-none overflow-hidden w-screen h-[100dvh] max-w-none flex flex-col md:flex-row shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* LEFT: Large Media */}
                <div className="relative w-full md:w-[55%] h-[50vh] md:h-auto bg-black flex items-center justify-center">
                    {isVideo && activeVideoUrl ? (
                        <VideoPlayer
                            src={activeVideoUrl}
                            autoPlay={true}
                            className="w-full h-full"
                        />
                    ) : displayImage ? (
                        <SmartImage
                            src={displayImage}
                            petId={pet.id}
                            alt={pet.name}
                            className={`w-full h-full object-contain ${isEditingFull && (isOwner || isAdmin) ? 'cursor-pointer' : ''}`}
                            onClick={handleCoverImageClick}
                        />
                    ) : (
                        <div
                            className={`flex flex-col items-center text-white/50 ${isEditingFull && (isOwner || isAdmin) ? 'cursor-pointer' : ''}`}
                            onClick={handleCoverImageClick}
                        >
                            <svg className="w-20 h-20 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span>{t('No media', 'ไม่มีสื่อ')}</span>
                        </div>
                    )}

                    {isEditingFull && (isOwner || isAdmin) && !isVideo && (
                        <div
                            className={`absolute inset-0 flex items-center justify-center bg-black/35 transition-opacity pointer-events-none ${imageUploading ? 'opacity-100' : 'opacity-0 hover:opacity-100'}`}
                        >
                            <span className="px-3 py-2 rounded-full bg-white/90 text-sm font-semibold text-gray-900">
                                {imageUploading ? 'Uploading...' : 'Click to change photo'}
                            </span>
                        </div>
                    )}

                    <input
                        ref={coverInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleCoverImageSelect}
                    />
                    <input
                        ref={galleryInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleGalleryUpload}
                    />

                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute top-6 left-6 w-12 h-12 rounded-full bg-white/95 hover:bg-white backdrop-blur-sm flex items-center justify-center shadow-lg transition-all z-20"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    {/* Visit Site Button (Bottom-Left) - Hide for internal videos */}
                    {!((isVideo && activeVideoUrl?.includes('supabase')) && !pet.external_link) && (
                        <button
                            onClick={() => window.open(pet.external_link || (isVideo && activeVideoUrl ? activeVideoUrl : pet.image), '_blank')}
                            className="absolute bottom-4 left-4 md:bottom-6 md:left-6 flex items-center gap-2 bg-white/95 hover:bg-white backdrop-blur-sm px-4 py-2.5 rounded-full shadow-lg transition-all z-10"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            <span className="text-sm font-semibold">{t('Visit site', 'เยี่ยมชมเว็บไซต์')}</span>
                        </button>
                    )}
                </div>

                {/* RIGHT: Info Panel */}
                <div className="w-full md:w-[45%] flex flex-col bg-white min-h-0">
                    {/* Sticky Header with Actions */}
                    <div className="sticky top-0 z-30 bg-white border-b border-gray-100 px-4 md:px-6 py-3 md:py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => onViewPedigree(pet)}
                                className="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span className="text-sm font-semibold">{t('Pedigree', 'สายเลือด')}</span>
                            </button>

                            {onFindMate && (
                                <button
                                    onClick={() => onFindMate(pet)}
                                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-pink-500 text-white hover:bg-pink-600 transition-colors"
                                >
                                    <span className="text-sm font-semibold">{t('Find Match', 'หาเพื่อนผสม')}</span>
                                </button>
                            )}

                            {canManageHealthProfile && (
                                <button
                                    onClick={handleOpenVetProfile}
                                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                                >
                                    <span className="text-sm font-semibold">{t('Vet Profile', 'โปรไฟล์สัตวแพทย์')}</span>
                                </button>
                            )}

                            {/* Share Button */}
                            <div className="relative" ref={shareMenuRef}>
                                <button
                                    onClick={() => setShowShareMenu(!showShareMenu)}
                                    className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
                                    title={t('Share', 'แชร์')}
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                                    </svg>
                                </button>

                                {/* Share Menu */}
                                {showShareMenu && (
                                    <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 z-50">
                                        <h3 className="font-bold text-sm mb-3">{t('Share this pet', 'แชร์สัตว์เลี้ยงนี้')}</h3>

                                        {/* Copy Link */}
                                        <div className="flex items-center gap-2 mb-4">
                                            <input
                                                type="text"
                                                value={getShareUrl()}
                                                readOnly
                                                className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                                            />
                                            <button
                                                onClick={handleCopyLink}
                                                className="px-4 py-2 bg-[#ea4c89] text-white rounded-lg text-xs font-semibold hover:bg-[#d9457a] transition-colors"
                                            >
                                                {copiedLink ? t('Copied!', 'คัดลอกแล้ว!') : t('Copy', 'คัดลอก')}
                                            </button>
                                        </div>

                                        {/* Social Share */}
                                        <div className="grid grid-cols-4 gap-2">
                                            {[
                                                { name: 'WhatsApp', icon: '💬', platform: 'whatsapp' },
                                                { name: 'Facebook', icon: '📘', platform: 'facebook' },
                                                { name: 'Twitter', icon: '🐦', platform: 'twitter' },
                                                { name: 'LINE', icon: '💚', platform: 'line' },
                                            ].map(social => (
                                                <button
                                                    key={social.platform}
                                                    onClick={() => handleShare(social.platform)}
                                                    className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                                                >
                                                    <span className="text-2xl">{social.icon}</span>
                                                    <span className="text-[10px] font-medium text-gray-600">{social.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* More Menu */}
                            <div className="relative" ref={moreMenuRef}>
                                <button
                                    onClick={() => setShowMoreMenu(!showMoreMenu)}
                                    className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
                                    title="More"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                    </svg>
                                </button>

                                {/* More Menu Dropdown */}
                                {showMoreMenu && (
                                    <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-gray-200 py-2 z-50">
                                        {pet.image && (
                                            <button
                                                onClick={handleDownloadImage}
                                                className="w-full px-4 py-2 text-left text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                </svg>
                                                {t('Download image', 'ดาวน์โหลดรูปภาพ')}
                                            </button>
                                        )}
                                        {(isOwner || isAdmin) && (
                                            <button
                                                onClick={() => {
                                                    setIsEditingFull(true);
                                                    setShowMoreMenu(false);
                                                }}
                                                className="w-full px-4 py-2 text-left text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                                {t('Edit pet profile', 'แก้ไขโปรไฟล์สัตว์เลี้ยง')}
                                            </button>
                                        )}
                                        <button
                                            onClick={() => {
                                                setShowReportModal(true);
                                                setShowMoreMenu(false);
                                            }}
                                            className="w-full px-4 py-2 text-left text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2 text-red-600"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                            </svg>
                                            {t('Report', 'รายงาน')}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Save Button (Pinterest Red) */}
                        {isEditingFull && (isOwner || isAdmin) && (
                            <button
                                type="button"
                                onClick={handleSaveFullEdit}
                                className="px-6 py-2.5 bg-[#ea4c89] text-white rounded-full font-bold text-sm hover:bg-[#d9457a] transition-colors shadow-md"
                            >
                                {t('Save', 'บันทึก')}
                            </button>
                        )}
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 md:py-6">
                        {/* Pet Header */}
                        <div className="mb-6">
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">{pet.name}</h1>
                            <p className="text-gray-600">{pet.breed} • {pet.gender}</p>
                            {pet.registrationNumber && (
                                <p className="text-sm text-gray-500 font-mono mt-1">{pet.registrationNumber}</p>
                            )}
                        </div>

                        {/* Owner Info - Clickable to navigate to profile */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (pet.owner_id) {
                                    onClose();
                                    navigate(`/profile/${pet.owner_id}`);
                                }
                            }}
                            disabled={!pet.owner_id}
                            className={`flex items-center gap-3 pb-6 border-b border-gray-100 w-full text-left transition-colors rounded-lg p-2 -m-2 ${pet.owner_id ? 'hover:bg-gray-50 cursor-pointer' : 'cursor-default'}`}
                        >
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                                <p className={`font-semibold text-gray-900 truncate ${pet.owner_id ? 'group-hover:text-[#ea4c89]' : ''}`}>
                                    {(typeof pet.owner === 'string' ? pet.owner : pet.owner?.full_name) || pet.owner_name || t('Unknown Owner', 'ไม่ทราบชื่อเจ้าของ')}
                                </p>
                                <p className="text-sm text-gray-500 truncate">{pet.location || t('Location', 'สถานที่')}</p>
                            </div>
                            {pet.owner_id && (
                                <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            )}
                        </button>

                        {/* Ownership Status */}
                        {ownershipStatus && (
                            <div className="mt-6 rounded-2xl border border-gray-100 bg-gray-50 p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-[11px] uppercase text-gray-500 font-semibold">{t('Ownership', 'ความเป็นเจ้าของ')}</p>
                                        <p className="text-sm font-semibold text-gray-900">
                                            {ownershipStatus === 'waiting_owner' && t('Waiting Owner', 'รอเจ้าของยืนยัน')}
                                            {ownershipStatus === 'pending_claim' && t('Claim In Review', 'กำลังตรวจสอบคำขอ')}
                                            {ownershipStatus === 'verified' && t('Verified Owner', 'เจ้าของยืนยันแล้ว')}
                                            {ownershipStatus === 'disputed' && t('Ownership Disputed', 'มีข้อโต้แย้ง')}
                                        </p>
                                    </div>
                                    {canClaim && (
                                        <button
                                            onClick={() => setClaimModalOpen(true)}
                                            className="px-4 py-2 rounded-full bg-gray-900 text-white text-xs font-semibold hover:bg-gray-800 disabled:opacity-60"
                                            disabled={claimStatus?.status === 'pending' || claimStatus?.status === 'approved' || claimStatus?.status === 'rejected' || claimStatusLoading}
                                        >
                                            {claimLabel}
                                        </button>
                                    )}
                                </div>
                                {canClaim && (
                                    <p className="text-xs text-gray-500 mt-2">
                                        {claimStatusLoading && t('Checking claim status...', 'กำลังตรวจสอบสถานะคำขอ...')}
                                        {!claimStatusLoading && claimStatus?.status === 'pending' && t('Your claim is pending admin review.', 'คำขอของคุณกำลังรอการตรวจสอบ')}
                                        {!claimStatusLoading && claimStatus?.status === 'approved' && t('You already own this pet.', 'คุณเป็นเจ้าของสัตว์เลี้ยงนี้แล้ว')}
                                        {!claimStatusLoading && claimStatus?.status === 'rejected' && t('Your claim was rejected. Contact admin for help.', 'คำขอถูกปฏิเสธ กรุณาติดต่อแอดมิน')}
                                        {!claimStatusLoading && !claimStatus && t('Submit your claim to become the verified owner.', 'ยื่นคำขอเพื่อเป็นเจ้าของที่ยืนยันแล้ว')}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Full Edit Mode */}
                        {isEditingFull && (isOwner || isAdmin) ? (
                            <div className="my-6 p-6 bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl border border-blue-100">
                                <h3 className="font-bold text-lg mb-4">{t('Edit Pet Profile', 'แก้ไขโปรไฟล์สัตว์เลี้ยง')}</h3>

                                <div className="space-y-4">
                                    {/* Media Manager */}
                                    <div className="p-4 bg-white/80 rounded-2xl border border-blue-100 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-sm font-bold text-gray-800">{t('Media Manager', 'จัดการสื่อ')}</h4>
                                            <button
                                                onClick={() => galleryInputRef.current?.click()}
                                                className="px-3 py-1.5 rounded-full bg-gray-900 text-white text-xs font-semibold hover:bg-gray-800 disabled:opacity-60"
                                                disabled={galleryUploading}
                                            >
                                                {galleryUploading ? t('Uploading...', 'กำลังอัปโหลด...') : t('Add photos', 'เพิ่มรูปภาพ')}
                                            </button>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <div className="w-20 h-20 rounded-xl border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center">
                                                {editForm.imageUrl ? (
                                                    <img src={editForm.imageUrl} alt="Cover" className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-[11px] text-gray-400">{t('No cover', 'ไม่มีหน้าปก')}</span>
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-xs font-semibold text-gray-600 uppercase">{t('Cover photo', 'รูปหน้าปก')}</p>
                                                <div className="flex flex-wrap gap-2 mt-2">
                                                    <button
                                                        onClick={() => coverInputRef.current?.click()}
                                                        className="px-3 py-1.5 rounded-full bg-white border border-gray-200 text-xs font-semibold text-gray-700 hover:border-gray-300"
                                                    >
                                                        {t('Change cover', 'เปลี่ยนหน้าปก')}
                                                    </button>
                                                    {editForm.imageUrl && (
                                                        <button
                                                            onClick={() => setEditForm(prev => ({ ...prev, imageUrl: '' }))}
                                                            className="px-3 py-1.5 rounded-full bg-white border border-gray-200 text-xs font-semibold text-gray-500 hover:border-gray-300"
                                                        >
                                                            {t('Remove', 'ลบ')}
                                                        </button>
                                                    )}
                                                </div>
                                                <p className="text-[11px] text-gray-500 mt-2">{t('Choose any gallery photo to set as cover.', 'เลือกรูปจากแกลเลอรีเพื่อใช้เป็นหน้าปก')}</p>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <p className="text-xs font-semibold text-gray-600 uppercase">{t('Gallery', 'แกลเลอรี')}</p>
                                                <span className="text-xs text-gray-400">{galleryPhotos.length} {t('items', 'รายการ')}</span>
                                            </div>
                                            {galleryLoading ? (
                                                <p className="text-xs text-gray-500">{t('Loading gallery...', 'กำลังโหลดแกลเลอรี...')}</p>
                                            ) : galleryPhotos.length === 0 ? (
                                                <p className="text-sm text-gray-500">{t('No gallery photos yet.', 'ยังไม่มีรูปในแกลเลอรี')}</p>
                                            ) : (
                                                <div className="grid grid-cols-3 gap-2">
                                                    {galleryPhotos.map((photo) => (
                                                        <div key={photo.id} className="relative group">
                                                            <img
                                                                src={photo.image_url}
                                                                alt={photo.caption || 'Gallery photo'}
                                                                className="w-full h-24 rounded-lg object-cover border border-gray-200"
                                                            />
                                                            {editForm.imageUrl === photo.image_url && (
                                                                <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-white/90 text-[10px] font-semibold text-gray-700">
                                                                    {t('Cover', 'หน้าปก')}
                                                                </span>
                                                            )}
                                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                                <button
                                                                    onClick={() => setEditForm(prev => ({ ...prev, imageUrl: photo.image_url }))}
                                                                    className="px-2 py-1 rounded-full bg-white text-[10px] font-semibold text-gray-800"
                                                                >
                                                                    {t('Set cover', 'ตั้งเป็นหน้าปก')}
                                                                </button>
                                                                <button
                                                                    onClick={() => handleGalleryDelete(photo.id)}
                                                                    className="px-2 py-1 rounded-full bg-white text-[10px] font-semibold text-gray-800"
                                                                >
                                                                    {t('Remove', 'ลบ')}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <label className="text-xs font-bold text-gray-700 uppercase block mb-1.5">
                                                {t('Primary video URL', 'ลิงก์วิดีโอหลัก')}
                                            </label>
                                            <input
                                                type="url"
                                                value={editForm.videoUrl}
                                                onChange={(e) => setEditForm({ ...editForm, videoUrl: e.target.value })}
                                                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-blue-500 outline-none"
                                                placeholder={t('Direct MP4 link or hosted video URL', 'ลิงก์ MP4 หรือลิงก์วิดีโอที่โฮสต์')}
                                            />
                                            <div className="flex items-center justify-between mt-2">
                                                <p className="text-[11px] text-gray-500">{t('Direct MP4 links work best for playback.', 'ลิงก์ MP4 ตรงจะเล่นได้ดีที่สุด')}</p>
                                                <button
                                                    type="button"
                                                    disabled
                                                    className="px-3 py-1.5 rounded-full bg-gray-100 text-[11px] font-semibold text-gray-400 cursor-not-allowed"
                                                >
                                                    {t('AI video (coming soon)', 'วิดีโอ AI (เร็ว ๆ นี้)')}
                                                </button>
                                            </div>
                                        </div>

                                        {/* External Link - Admin Only */}
                                        {isAdmin && (
                                            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                                                <label className="text-xs font-bold text-amber-700 uppercase block mb-1.5">
                                                    🔐 {t('External Link (Admin Only)', 'ลิงก์ภายนอก (แอดมินเท่านั้น)')}
                                                </label>
                                                <input
                                                    type="url"
                                                    value={editForm.externalLink}
                                                    onChange={(e) => setEditForm({ ...editForm, externalLink: e.target.value })}
                                                    className="w-full px-3 py-2.5 border-2 border-amber-300 rounded-xl text-sm focus:border-amber-500 outline-none bg-white"
                                                    placeholder={t('https://tiktok.com/... or any external URL', 'https://tiktok.com/... หรือลิงก์ภายนอกอื่นๆ')}
                                                />
                                                <p className="text-[11px] text-amber-600 mt-1">
                                                    {t('This URL will be used for "Visit Site" button. Leave empty to auto-detect from video URL.', 'URL นี้จะใช้สำหรับปุ่ม "เยี่ยมชมเว็บไซต์" เว้นว่างเพื่อใช้ลิงก์จากวิดีโอ')}
                                                </p>
                                            </div>
                                        )}

                                        {/* Admin-Only Ownership Management */}
                                        {isAdmin && (
                                            <div className="p-4 bg-red-50 rounded-xl border border-red-200 space-y-4">
                                                <h4 className="text-sm font-bold text-red-700 uppercase flex items-center gap-2">
                                                    🔐 {t('Admin: Ownership Management', 'แอดมิน: จัดการความเป็นเจ้าของ')}
                                                </h4>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="text-xs font-bold text-red-600 uppercase block mb-1.5">
                                                            {t('Owner Name', 'ชื่อเจ้าของ')}
                                                        </label>
                                                        <input
                                                            type="text"
                                                            value={editForm.ownerName}
                                                            onChange={(e) => setEditForm({ ...editForm, ownerName: e.target.value })}
                                                            className="w-full px-3 py-2.5 border-2 border-red-200 rounded-xl text-sm focus:border-red-500 outline-none bg-white"
                                                            placeholder={t('Enter owner name', 'ระบุชื่อเจ้าของ')}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-bold text-red-600 uppercase block mb-1.5">
                                                            {t('Ownership Status', 'สถานะความเป็นเจ้าของ')}
                                                        </label>
                                                        <select
                                                            value={editForm.ownershipStatus}
                                                            onChange={(e) => setEditForm({ ...editForm, ownershipStatus: e.target.value })}
                                                            className="w-full px-3 py-2.5 border-2 border-red-200 rounded-xl text-sm focus:border-red-500 outline-none bg-white"
                                                        >
                                                            <option value="waiting_owner">{t('Waiting Owner', 'รอเจ้าของยืนยัน')}</option>
                                                            <option value="pending_claim">{t('Pending Claim', 'กำลังตรวจสอบคำขอ')}</option>
                                                            <option value="verified">{t('Verified', 'ยืนยันแล้ว')}</option>
                                                            <option value="disputed">{t('Disputed', 'มีข้อโต้แย้ง')}</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="text-xs font-bold text-red-600 uppercase block mb-1.5">
                                                        {t('Owner ID (UUID)', 'รหัสเจ้าของ (UUID)')}
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={editForm.ownerId || ''}
                                                        onChange={(e) => setEditForm({ ...editForm, ownerId: e.target.value || null })}
                                                        className="w-full px-3 py-2.5 border-2 border-red-200 rounded-xl text-sm focus:border-red-500 outline-none bg-white font-mono"
                                                        placeholder={t('Leave empty for "waiting owner"', 'เว้นว่างสำหรับ "รอเจ้าของยืนยัน"')}
                                                    />
                                                    <p className="text-[11px] text-red-500 mt-1">
                                                        ⚠️ {t('Changing owner ID will affect ownership. Use with caution.', 'การเปลี่ยน Owner ID จะมีผลต่อความเป็นเจ้าของ ใช้ด้วยความระมัดระวัง')}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Basic Info */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-bold text-gray-700 uppercase block mb-1.5">{t('Name', 'ชื่อ')}</label>
                                            <input
                                                type="text"
                                                value={editForm.name}
                                                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-blue-500 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-700 uppercase block mb-1.5">{t('Breed', 'สายพันธุ์')}</label>
                                            <select
                                                value={editForm.breed}
                                                onChange={(e) => setEditForm({ ...editForm, breed: e.target.value })}
                                                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-blue-500 outline-none bg-white"
                                            >
                                                <option value="">{t('-- Select Breed --', '-- เลือกสายพันธุ์ --')}</option>
                                                <option value="Thai Ridgeback Dog">Thai Ridgeback Dog</option>
                                                <option value="Thai Bangkaew">Thai Bangkaew</option>
                                                <option value="Poodle">Poodle</option>
                                                <option value="Golden Retriever">Golden Retriever</option>
                                                <option value="Labrador Retriever">Labrador Retriever</option>
                                                <option value="German Shepherd">German Shepherd</option>
                                                <option value="Siberian Husky">Siberian Husky</option>
                                                <option value="Beagle">Beagle</option>
                                                <option value="Bulldog">Bulldog</option>
                                                <option value="Shih Tzu">Shih Tzu</option>
                                                <option value="Chihuahua">Chihuahua</option>
                                                <option value="Pomeranian">Pomeranian</option>
                                                <option value="Yorkshire Terrier">Yorkshire Terrier</option>
                                                <option value="Dachshund">Dachshund</option>
                                                <option value="Boxer">Boxer</option>
                                                <option value="Rottweiler">Rottweiler</option>
                                                <option value="Doberman Pinscher">Doberman Pinscher</option>
                                                <option value="Great Dane">Great Dane</option>
                                                <option value="Border Collie">Border Collie</option>
                                                <option value="Australian Shepherd">Australian Shepherd</option>
                                                <option value="Pembroke Welsh Corgi">Pembroke Welsh Corgi</option>
                                                <option value="Cocker Spaniel">Cocker Spaniel</option>
                                                <option value="Maltese">Maltese</option>
                                                <option value="Pug">Pug</option>
                                                <option value="Boston Terrier">Boston Terrier</option>
                                                <option value="Cavalier King Charles Spaniel">Cavalier King Charles Spaniel</option>
                                                <option value="Miniature Schnauzer">Miniature Schnauzer</option>
                                                <option value="French Bulldog">French Bulldog</option>
                                                <option value="Shetland Sheepdog">Shetland Sheepdog</option>
                                                <option value="Bernese Mountain Dog">Bernese Mountain Dog</option>
                                                <option value="Akita">Akita</option>
                                                <option value="Samoyed">Samoyed</option>
                                                <option value="Chow Chow">Chow Chow</option>
                                                <option value="Dalmatian">Dalmatian</option>
                                                <option value="Bichon Frise">Bichon Frise</option>
                                                <option value="Jack Russell Terrier">Jack Russell Terrier</option>
                                                <option value="West Highland White Terrier">West Highland White Terrier</option>
                                                <option value="Staffordshire Bull Terrier">Staffordshire Bull Terrier</option>
                                                <option value="English Springer Spaniel">English Springer Spaniel</option>
                                                <option value="Weimaraner">Weimaraner</option>
                                                <option value="Vizsla">Vizsla</option>
                                                <option value="Basenji">Basenji</option>
                                                <option value="Bloodhound">Bloodhound</option>
                                                <option value="Newfoundland">Newfoundland</option>
                                                <option value="Saint Bernard">Saint Bernard</option>
                                                <option value="Mastiff">Mastiff</option>
                                                <option value="Bull Terrier">Bull Terrier</option>
                                                <option value="Rhodesian Ridgeback">Rhodesian Ridgeback</option>
                                                <option value="Cane Corso">Cane Corso</option>
                                                <option value="Alaskan Malamute">Alaskan Malamute</option>
                                                <option value="Other">Other (Custom)</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-bold text-gray-700 uppercase block mb-1.5">{t('Birth Date (optional)', 'วันเกิด (ไม่บังคับ)')}</label>
                                            <input
                                                type="date"
                                                value={editForm.birthDate}
                                                onChange={(e) => setEditForm({ ...editForm, birthDate: e.target.value })}
                                                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-blue-500 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-700 uppercase block mb-1.5">{t('Color', 'สี')}</label>
                                            <input
                                                type="text"
                                                value={editForm.color}
                                                onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
                                                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-blue-500 outline-none"
                                                placeholder={t('e.g., Brown, Black', 'เช่น น้ำตาล, ดำ')}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-gray-700 uppercase block mb-1.5">{t('Location', 'สถานที่')}</label>
                                        <input
                                            type="text"
                                            value={editForm.location}
                                            onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                                            className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-blue-500 outline-none"
                                            placeholder={t('City, Country', 'เมือง, ประเทศ')}
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-gray-700 uppercase block mb-1.5">{t('Registration Number', 'เลขทะเบียน')}</label>
                                        <input
                                            type="text"
                                            value={editForm.registrationNumber}
                                            onChange={(e) => setEditForm({ ...editForm, registrationNumber: e.target.value })}
                                            className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-blue-500 outline-none font-mono"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-gray-700 uppercase block mb-1.5">{t('Description', 'คำอธิบาย')}</label>
                                        <textarea
                                            value={editForm.description}
                                            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                            className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-blue-500 outline-none resize-none"
                                            rows={3}
                                        />
                                    </div>

                                    {/* Parents */}
                                    <div className="pt-4 border-t border-gray-200">
                                        <h4 className="font-bold text-sm mb-3">{t('Family Tree', 'ผังสายเลือด')}</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs font-bold text-blue-600 uppercase block mb-1.5">
                                                    {t('Sire', 'พ่อพันธุ์')} {loading && <span className="text-gray-400">{t('Loading...', 'กำลังโหลด...')}</span>}
                                                </label>
                                                <select
                                                    value={editForm.sireId || ''}
                                                    onChange={(e) => setEditForm({ ...editForm, sireId: e.target.value || null })}
                                                    className="w-full px-3 py-2.5 border-2 border-blue-200 rounded-xl text-sm focus:border-blue-500 outline-none"
                                                    disabled={loading}
                                                >
                                                    <option value="">{t('-- Select --', '-- เลือก --')}</option>
                                                    {malePets.map(p => (
                                                        <option key={p.id} value={p.id}>
                                                            {p.name} {p.registrationNumber && `(${p.registrationNumber})`}
                                                        </option>
                                                    ))}
                                                </select>
                                                <p className="text-[10px] text-gray-400 mt-1">
                                                    {malePets.length} {t('male', 'ตัวผู้')} {editForm.breed} {t('available', 'พร้อมใช้งาน')}
                                                </p>
                                                {sireAgeWarning && (
                                                    <p className="text-[11px] text-amber-600 mt-1">{sireAgeWarning}</p>
                                                )}
                                            </div>

                                            <div>
                                                <label className="text-xs font-bold text-pink-600 uppercase block mb-1.5">
                                                    {t('Dam', 'แม่พันธุ์')} {loading && <span className="text-gray-400">{t('Loading...', 'กำลังโหลด...')}</span>}
                                                </label>
                                                <select
                                                    value={editForm.damId || ''}
                                                    onChange={(e) => setEditForm({ ...editForm, damId: e.target.value || null })}
                                                    className="w-full px-3 py-2.5 border-2 border-pink-200 rounded-xl text-sm focus:border-pink-500 outline-none"
                                                    disabled={loading}
                                                >
                                                    <option value="">{t('-- Select --', '-- เลือก --')}</option>
                                                    {femalePets.map(p => (
                                                        <option key={p.id} value={p.id}>
                                                            {p.name} {p.registrationNumber && `(${p.registrationNumber})`}
                                                        </option>
                                                    ))}
                                                </select>
                                                <p className="text-[10px] text-gray-400 mt-1">
                                                    {femalePets.length} fe{t('male', 'ตัวผู้')} {editForm.breed} {t('available', 'พร้อมใช้งาน')}
                                                </p>
                                                {damAgeWarning && (
                                                    <p className="text-[11px] text-amber-600 mt-1">{damAgeWarning}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Buttons */}
                                    <div className="flex gap-3 pt-4">
                                        <button
                                            onClick={handleSaveFullEdit}
                                            className="flex-1 py-3 bg-gradient-to-r from-[#ea4c89] to-[#d9457a] text-white text-sm font-bold rounded-xl hover:shadow-lg transition-all"
                                        >
                                            {t('Save All Changes', 'บันทึกการเปลี่ยนแปลงทั้งหมด')}
                                        </button>
                                        <button
                                            onClick={() => setIsEditingFull(false)}
                                            className="px-6 py-3 bg-gray-100 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-200 transition-all"
                                        >
                                            {t('Cancel', 'ยกเลิก')}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <>
                                {/* Read-Only View */}
                                {(sirePet || damPet) && (
                                    <div className="my-6 p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border border-blue-100">
                                        <h3 className="font-bold text-sm text-gray-800 mb-3 flex items-center gap-2">
                                            <svg className="w-4 h-4 text-[#ea4c89]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                            </svg>
                                            {t('Family Tree', 'ผังสายเลือด')}
                                        </h3>
                                        <div className="space-y-2">
                                            {sirePet && (
                                                <div className="flex items-center gap-2 text-sm">
                                                    <span className="text-blue-500">👨</span>
                                                    <span className="text-gray-600">{t('Sire', 'พ่อพันธุ์')}:</span>
                                                    <button onClick={() => onViewPedigree(sirePet)} className="font-semibold text-blue-600 hover:underline">
                                                        {sirePet.name}
                                                    </button>
                                                </div>
                                            )}
                                            {damPet && (
                                                <div className="flex items-center gap-2 text-sm">
                                                    <span className="text-pink-500">👩</span>
                                                    <span className="text-gray-600">{t('Dam', 'แม่พันธุ์')}:</span>
                                                    <button onClick={() => onViewPedigree(damPet)} className="font-semibold text-pink-600 hover:underline">
                                                        {damPet.name}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Description */}
                                {pet.description && (
                                    <div className="mb-6">
                                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{pet.description}</p>
                                    </div>
                                )}
                            </>
                        )}

                        {/* Comments Section */}
                        <div className="border-t border-gray-100 pt-6 mt-6">
                            <h3 className="font-bold text-gray-900 mb-4">{t('Comments', 'ความคิดเห็น')}</h3>

                            <div className="space-y-4 mb-4">
                                {comments.length === 0 ? (
                                    <p className="text-sm text-gray-400 italic text-center py-4">
                                        {t('No comments yet. Be the first to comment!', 'ยังไม่มีความคิดเห็น เป็นคนแรกที่แสดงความคิดเห็น')}
                                    </p>
                                ) : (
                                    comments.map(comment => (
                                        <div key={comment.id} className="flex gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex-shrink-0" />
                                            <div className="flex-1">
                                                <p className="font-semibold text-sm text-gray-900">{comment.user_name}</p>
                                                {comment.content && <p className="text-sm text-gray-700 mt-1">{comment.content}</p>}
                                                {comment.images && comment.images.length > 0 && (
                                                    <div className="flex gap-2 mt-2">
                                                        {comment.images.map((img, idx) => (
                                                            <img
                                                                key={idx}
                                                                src={img}
                                                                alt="Comment"
                                                                className="w-20 h-20 object-cover rounded-lg cursor-zoom-in"
                                                                onClick={() => setExpandedCommentImage(img)}
                                                            />
                                                        ))}
                                                    </div>
                                                )}
                                                <p className="text-xs text-gray-400 mt-1">
                                                    {new Date(comment.created_at).toLocaleDateString(isThai ? 'th-TH' : 'en-US')}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Fixed Comment Input */}
                    <div className="border-t border-gray-200 p-4 bg-gray-50">
                        {commentImages.length > 0 && (
                            <div className="flex gap-2 mb-2 overflow-x-auto">
                                {commentImages.map((img, idx) => (
                                    <div key={idx} className="relative">
                                        <img
                                            src={img}
                                            alt="Preview"
                                            className="w-16 h-16 object-cover rounded-lg cursor-zoom-in"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setExpandedCommentImage(img);
                                            }}
                                        />
                                        <button
                                            onClick={() => setCommentImages(prev => prev.filter((_, i) => i !== idx))}
                                            className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex items-center gap-2">
                            <textarea
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                placeholder={t('Add a comment...', 'เพิ่มความคิดเห็น...')}
                                className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-full text-sm resize-none focus:border-[#ea4c89] outline-none"
                                rows={1}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleAddComment();
                                    }
                                }}
                            />

                            {/* Emoji */}
                            <div className="relative">
                                <button
                                    onClick={() => {
                                        setShowEmojiPicker(!showEmojiPicker);
                                        setShowStickerPicker(false);
                                    }}
                                    className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center"
                                >
                                    😊
                                </button>
                                {showEmojiPicker && (
                                    <div className="absolute bottom-12 right-0 z-50">
                                        <Picker data={data} onEmojiSelect={handleEmojiSelect} theme="light" />
                                    </div>
                                )}
                            </div>

                            {/* Stickers */}
                            <div className="relative">
                                <button
                                    onClick={() => {
                                        setShowStickerPicker(!showStickerPicker);
                                        setShowEmojiPicker(false);
                                    }}
                                    className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center"
                                >
                                    ⭐
                                </button>
                                {showStickerPicker && (
                                    <div className="absolute bottom-12 right-0 bg-white rounded-2xl shadow-2xl p-4 border border-gray-200 z-50">
                                        <div className="grid grid-cols-4 gap-2">
                                            {stickers.map((sticker, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => {
                                                        setCommentText(prev => prev + sticker);
                                                        setShowStickerPicker(false);
                                                    }}
                                                    className="w-10 h-10 text-2xl hover:scale-125 transition-transform"
                                                >
                                                    {sticker}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Image Upload */}
                            <input type="file" ref={fileInputRef} accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </button>

                            {/* Send */}
                            <button
                                onClick={handleAddComment}
                                disabled={!commentText.trim() && commentImages.length === 0}
                                className="w-10 h-10 rounded-full bg-[#ea4c89] text-white flex items-center justify-center hover:bg-[#d9457a] disabled:opacity-50"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Report Modal - Pinterest Style */}
            {showReportModal && (
                <div className="fixed inset-0 bg-black/60 flex items-stretch justify-center z-[200] p-0">
                    <div className="bg-white rounded-none shadow-2xl w-screen h-[100dvh] max-w-none max-h-none overflow-hidden">
                        {/* Header */}
                        <div className="px-4 md:px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                            <h3 className="text-xl font-bold text-gray-900">{t('Report this pet', 'รายงานสัตว์เลี้ยงนี้')}</h3>
                            <button
                                onClick={() => {
                                    setShowReportModal(false);
                                    setReportReason('');
                                    setReportDetails('');
                                }}
                                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Body */}
                        <div className="px-4 md:px-6 py-4 overflow-y-auto md:max-h-[50vh]">
                            <p className="text-sm text-gray-600 mb-4">
                                {t("Help us understand what's happening. Your report is anonymous.", 'ช่วยให้เราทราบว่าเกิดอะไรขึ้น รายงานนี้เป็นแบบไม่ระบุตัวตน')}
                            </p>

                            {/* Report Reasons */}
                            <div className="space-y-2 mb-4">
                                {[
                                    { value: 'spam', label: t('Spam or scam', 'สแปมหรือหลอกลวง'), icon: '🚫' },
                                    { value: 'fake', label: t('Fake or misleading information', 'ข้อมูลปลอมหรือทำให้เข้าใจผิด'), icon: '⚠️' },
                                    { value: 'inappropriate', label: t('Inappropriate content', 'เนื้อหาไม่เหมาะสม'), icon: '🔞' },
                                    { value: 'animal_welfare', label: t('Animal welfare concerns', 'ปัญหาสวัสดิภาพสัตว์'), icon: '🐾' },
                                    { value: 'stolen', label: t('Stolen pet listing', 'ประกาศสัตว์เลี้ยงที่ถูกขโมย'), icon: '🔒' },
                                    { value: 'harassment', label: t('Harassment or hate speech', 'การคุกคามหรือถ้อยคำเกลียดชัง'), icon: '💢' },
                                    { value: 'violence', label: t('Violence or dangerous content', 'ความรุนแรงหรือเนื้อหาอันตราย'), icon: '⚔️' },
                                    { value: 'copyright', label: t('Copyright or trademark violation', 'ละเมิดลิขสิทธิ์หรือเครื่องหมายการค้า'), icon: '©️' },
                                    { value: 'other', label: t('Something else', 'อื่น ๆ'), icon: '❓' },
                                ].map((reason) => (
                                    <button
                                        key={reason.value}
                                        onClick={() => setReportReason(reason.value)}
                                        className={`w-full px-4 py-3 text-left rounded-xl transition-all ${reportReason === reason.value
                                            ? 'bg-red-50 border-2 border-red-500'
                                            : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl">{reason.icon}</span>
                                            <span className={`font-medium ${reportReason === reason.value ? 'text-red-700' : 'text-gray-700'
                                                }`}>
                                                {reason.label}
                                            </span>
                                            {reportReason === reason.value && (
                                                <span className="ml-auto text-red-500">
                                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                    </svg>
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>

                            {/* Additional Details */}
                            {reportReason && (
                                <div className="mt-4">
                                    <label className="text-sm font-bold text-gray-700 block mb-2">
                                        {t('Additional details (optional)', 'รายละเอียดเพิ่มเติม (ไม่บังคับ)')}
                                    </label>
                                    <textarea
                                        value={reportDetails}
                                        onChange={(e) => setReportDetails(e.target.value)}
                                        placeholder={t('Please provide more information to help us review your report...', 'โปรดให้ข้อมูลเพิ่มเติมเพื่อช่วยเราตรวจสอบรายงานของคุณ')}
                                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:border-red-500 outline-none resize-none"
                                        rows={4}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-4 md:px-6 py-4 border-t border-gray-200 flex gap-3">
                            <button
                                onClick={() => {
                                    setShowReportModal(false);
                                    setReportReason('');
                                    setReportDetails('');
                                }}
                                className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                            >
                                {t('Cancel', 'ยกเลิก')}
                            </button>
                            <button
                                onClick={handleSubmitReport}
                                disabled={!reportReason}
                                className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {t('Submit Report', 'ส่งรายงาน')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ClaimOwnershipModal
                isOpen={claimModalOpen}
                pet={pet}
                onClose={() => setClaimModalOpen(false)}
                onSubmitted={handleClaimSubmitted}
            />

            {expandedCommentImage && (
                <div
                    className="fixed inset-0 z-[10002] bg-black/80 flex items-stretch justify-center p-0"
                    onClick={(e) => {
                        e.stopPropagation();
                        setExpandedCommentImage(null);
                    }}
                >
                    <div className="relative w-full h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                        <img
                            src={expandedCommentImage}
                            alt="Comment full"
                            className="w-full h-full object-contain rounded-none"
                        />
                        <button
                            onClick={() => setExpandedCommentImage(null)}
                            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/90 hover:bg-white flex items-center justify-center"
                            aria-label="Close image"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

