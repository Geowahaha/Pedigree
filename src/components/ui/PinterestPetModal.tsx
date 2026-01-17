/**
 * Pinterest-Style Pet Modal
 * 
 * Features:
 * - Large image/video display (like Pinterest)
 * - Floating action buttons overlaying the media
 * - Rich comments section with emoji, sticker, and image support
 * - AI chat integration
 * - Inline parent editing with full database pet list
 */

import React, { useState, useEffect, useRef } from 'react';
import { Pet } from '@/data/petData';
import { getPublicPets, updatePedigree } from '@/lib/database';
import SmartImage from '@/components/ui/SmartImage';
import data from '@emoji-mart/data'
import Picker from '@emoji-mart/react'

interface PinterestPetModalProps {
    pet: Pet;
    isOpen: boolean;
    onClose: () => void;
    onViewPedigree: (pet: Pet) => void;
    isOwner?: boolean;
    currentUserId?: string;
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

export const PinterestPetModal: React.FC<PinterestPetModalProps> = ({
    pet,
    isOpen,
    onClose,
    onViewPedigree,
    isOwner = false,
    currentUserId,
}) => {
    const [allPets, setAllPets] = useState<Pet[]>([]);
    const [loading, setLoading] = useState(false);
    const [isEditingParents, setIsEditingParents] = useState(false);
    const [selectedSire, setSelectedSire] = useState<string | null>(null);
    const [selectedDam, setSelectedDam] = useState<string | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [commentText, setCommentText] = useState('');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showStickerPicker, setShowStickerPicker] = useState(false);
    const [commentImages, setCommentImages] = useState<string[]>([]);
    const [expandedCommentImage, setExpandedCommentImage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Initialize parent selections when pet changes
    useEffect(() => {
        if (pet) {
            setSelectedSire(pet.parentIds?.sire || null);
            setSelectedDam(pet.parentIds?.dam || null);
        }
    }, [pet]);

    // Fetch ALL pets from database for sire/dam selection
    useEffect(() => {
        if (isOpen && isOwner) {
            loadAllPets();
        }
    }, [isOpen, isOwner]);

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

    // Early return if modal is not open or pet is null
    if (!isOpen || !pet) return null;

    // Get parent details
    const sirePet = allPets.find(p => p.id === (selectedSire || pet.parentIds?.sire));
    const damPet = allPets.find(p => p.id === (selectedDam || pet.parentIds?.dam));

    // Filter eligible parents from ALL database pets
    const malePets = allPets.filter(p =>
        p.gender?.toLowerCase() === 'male' &&
        p.breed === pet.breed &&
        p.id !== pet.id &&
        p.name && p.name.trim() !== ''
    );

    const femalePets = allPets.filter(p =>
        p.gender?.toLowerCase() === 'female' &&
        p.breed === pet.breed &&
        p.id !== pet.id &&
        p.name && p.name.trim() !== ''
    );

    const handleSaveParents = async () => {
        try {
            await updatePedigree(pet.id, selectedSire || undefined, selectedDam || undefined);
            // Update local state
            if (pet.parentIds) {
                pet.parentIds.sire = selectedSire || undefined;
                pet.parentIds.dam = selectedDam || undefined;
            }
            setIsEditingParents(false);
        } catch (error) {
            console.error('Error updating parents:', error);
            alert('Failed to update parent information');
        }
    };

    const handleAddComment = () => {
        if (!commentText.trim() && commentImages.length === 0) return;

        const newComment: Comment = {
            id: Date.now().toString(),
            user_id: currentUserId || 'anonymous',
            user_name: 'Current User', // TODO: Get from auth
            content: commentText,
            images: commentImages,
            created_at: new Date().toISOString(),
        };

        setComments([newComment, ...comments]);
        setCommentText('');
        setCommentImages([]);
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

    // Popular Thai stickers
    const stickers = [
        '😀', '😂', '🥰', '😍', '🤩', '🥳', '😎', '🤗',
        '🐕', '🐶', '🐩', '🐕‍🦺', '🐾', '❤️', '💕', '✨',
        '👍', '👏', '🙏', '💪', '🔥', '⭐', '🌟', '💯',
    ];

    const isVideo = pet.media_type === 'video';

    return (
        <>
            <div
            className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-stretch justify-center p-0 overflow-hidden"
            onClick={onClose}
            >
            {/* Modal Container - Pinterest Style */}
            <div
                className="relative bg-white rounded-none overflow-hidden w-screen h-[100dvh] max-w-none flex shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* LEFT: Large Media Display */}
                <div className="relative w-3/5 bg-black flex items-center justify-center">
                    {/* Media */}
                    {isVideo && pet.video_url ? (
                        <video
                            src={pet.video_url}
                            className="w-full h-full object-contain"
                            controls
                            autoPlay
                            loop
                        />
                    ) : pet.image ? (
                        <SmartImage
                            src={pet.image}
                            petId={pet.id}
                            alt={pet.name}
                            className="w-full h-full object-contain"
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center text-white/50">
                            <svg className="w-20 h-20 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span>No media available</span>
                        </div>
                    )}

                    {/* Floating Action Buttons - Pinterest Style */}
                    <div className="absolute top-6 right-6 flex flex-col gap-3 z-10">
                        {/* Visit Site / View Larger */}
                        <button
                            onClick={() => window.open(pet.external_link || pet.image, '_blank')}
                            className="group flex items-center gap-2 bg-white/95 hover:bg-white backdrop-blur-sm px-4 py-2.5 rounded-full shadow-lg transition-all"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                            <span className="text-sm font-semibold">Visit site</span>
                        </button>

                        {/* Profile */}
                        <button
                            onClick={() => onViewPedigree(pet)}
                            className="w-12 h-12 rounded-full bg-white/95 hover:bg-white backdrop-blur-sm flex items-center justify-center shadow-lg transition-all"
                            title="View Pedigree"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        </button>

                        {/* Save */}
                        <button
                            className="w-12 h-12 rounded-full bg-[#ea4c89] hover:bg-[#d9457a] text-white flex items-center justify-center shadow-lg transition-all"
                            title="Save"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                            </svg>
                        </button>

                        {/* Share */}
                        <button
                            className="w-12 h-12 rounded-full bg-white/95 hover:bg-white backdrop-blur-sm flex items-center justify-center shadow-lg transition-all"
                            title="Share"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                            </svg>
                        </button>

                        {/* More Actions */}
                        <button
                            className="w-12 h-12 rounded-full bg-white/95 hover:bg-white backdrop-blur-sm flex items-center justify-center shadow-lg transition-all"
                            title="More"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                            </svg>
                        </button>
                    </div>

                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute top-6 left-6 w-12 h-12 rounded-full bg-white/95 hover:bg-white backdrop-blur-sm flex items-center justify-center shadow-lg transition-all z-10"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* RIGHT: Info & Comments Section */}
                <div className="w-2/5 flex flex-col bg-white overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-6">
                        {/* Header */}
                        <div className="mb-6">
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">{pet.name}</h2>
                            <p className="text-gray-600">{pet.breed} • {pet.gender}</p>
                        </div>

                        {/* Owner Info */}
                        <div className="flex items-center gap-3 pb-6 border-b border-gray-100">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-400 to-purple-500" />
                            <div>
                                <p className="font-semibold text-gray-900">{pet.owner || 'Unknown Owner'}</p>
                                <p className="text-sm text-gray-500">{pet.location || 'Location'}</p>
                            </div>
                        </div>

                        {/* Family Tree Section */}
                        <div className="my-6 p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border border-blue-100">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-bold text-sm text-gray-800 flex items-center gap-2">
                                    <svg className="w-4 h-4 text-[#ea4c89]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                    Family Tree
                                </h3>
                                {isOwner && !isEditingParents && (
                                    <button
                                        onClick={() => setIsEditingParents(true)}
                                        className="text-xs text-[#ea4c89] hover:text-[#d9457a] font-semibold"
                                    >
                                        ✏️ Edit
                                    </button>
                                )}
                            </div>

                            {isEditingParents && isOwner ? (
                                <div className="space-y-3">
                                    {/* Sire Dropdown - ALL Database Pets */}
                                    <div>
                                        <label className="text-xs font-bold text-blue-600 uppercase block mb-1.5">
                                            Sire (พ่อ) {loading && <span className="text-gray-400">Loading...</span>}
                                        </label>
                                        <select
                                            value={selectedSire || ''}
                                            onChange={(e) => setSelectedSire(e.target.value || null)}
                                            className="w-full px-3 py-2.5 border-2 border-blue-200 rounded-xl text-sm focus:border-blue-500 outline-none transition-colors"
                                            disabled={loading}
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

                                    {/* Dam Dropdown - ALL Database Pets */}
                                    <div>
                                        <label className="text-xs font-bold text-pink-600 uppercase block mb-1.5">
                                            Dam (แม่) {loading && <span className="text-gray-400">Loading...</span>}
                                        </label>
                                        <select
                                            value={selectedDam || ''}
                                            onChange={(e) => setSelectedDam(e.target.value || null)}
                                            className="w-full px-3 py-2.5 border-2 border-pink-200 rounded-xl text-sm focus:border-pink-500 outline-none transition-colors"
                                            disabled={loading}
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
                                            className="flex-1 py-2.5 bg-gradient-to-r from-[#ea4c89] to-[#d9457a] text-white text-sm font-bold rounded-xl hover:shadow-lg transition-all"
                                        >
                                            ✓ Save
                                        </button>
                                        <button
                                            onClick={() => {
                                                setIsEditingParents(false);
                                                setSelectedSire(pet.parentIds?.sire || null);
                                                setSelectedDam(pet.parentIds?.dam || null);
                                            }}
                                            className="px-4 py-2.5 bg-gray-100 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-200 transition-all"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {sirePet && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className="text-blue-500">👨</span>
                                            <span className="text-gray-600">Sire:</span>
                                            <button
                                                onClick={() => onViewPedigree(sirePet)}
                                                className="font-semibold text-blue-600 hover:underline"
                                            >
                                                {sirePet.name}
                                            </button>
                                        </div>
                                    )}
                                    {damPet && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className="text-pink-500">👩</span>
                                            <span className="text-gray-600">Dam:</span>
                                            <button
                                                onClick={() => onViewPedigree(damPet)}
                                                className="font-semibold text-pink-600 hover:underline"
                                            >
                                                {damPet.name}
                                            </button>
                                        </div>
                                    )}
                                    {!sirePet && !damPet && (
                                        <p className="text-xs text-gray-400 italic text-center py-2">
                                            {isOwner ? 'คลิก Edit เพื่อเพิ่มข้อมูลพ่อแม่' : 'ยังไม่มีข้อมูลพ่อแม่'}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Description */}
                        {pet.description && (
                            <div className="mb-6">
                                <p className="text-sm text-gray-700 leading-relaxed">{pet.description}</p>
                            </div>
                        )}

                        {/* Comments Section */}
                        <div className="border-t border-gray-100 pt-6">
                            <h3 className="font-bold text-gray-900 mb-4">Comments</h3>

                            {/* Comment List */}
                            <div className="space-y-4 mb-4">
                                {comments.length === 0 ? (
                                    <p className="text-sm text-gray-400 italic text-center py-4">
                                        No comments yet. Be the first to comment!
                                    </p>
                                ) : (
                                    comments.map(comment => (
                                        <div key={comment.id} className="flex gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex-shrink-0" />
                                            <div className="flex-1">
                                                <p className="font-semibold text-sm text-gray-900">{comment.user_name}</p>
                                                {comment.content && (
                                                    <p className="text-sm text-gray-700 mt-1">{comment.content}</p>
                                                )}
                                                {comment.images && comment.images.length > 0 && (
                                                    <div className="flex gap-2 mt-2">
                                                        {comment.images.map((img, idx) => (
                                                            <img
                                                                key={idx}
                                                                src={img}
                                                                alt="Comment attachment"
                                                                className="w-20 h-20 object-cover rounded-lg cursor-zoom-in"
                                                                onClick={() => setExpandedCommentImage(img)}
                                                            />
                                                        ))}
                                                    </div>
                                                )}
                                                <p className="text-xs text-gray-400 mt-1">
                                                    {new Date(comment.created_at).toLocaleDateString('th-TH')}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Comment Input - Fixed at Bottom */}
                    <div className="border-t border-gray-200 p-4 bg-gray-50">
                        {/* Image Previews */}
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

                        {/* Input Row */}
                        <div className="flex items-center gap-2">
                            <textarea
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                placeholder="Add a comment..."
                                className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-full text-sm resize-none focus:border-[#ea4c89] outline-none"
                                rows={1}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleAddComment();
                                    }
                                }}
                            />

                            {/* Emoji Picker */}
                            <div className="relative">
                                <button
                                    onClick={() => {
                                        setShowEmojiPicker(!showEmojiPicker);
                                        setShowStickerPicker(false);
                                    }}
                                    className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
                                    title="Emoji"
                                >
                                    😊
                                </button>
                                {showEmojiPicker && (
                                    <div className="absolute bottom-12 right-0 z-50">
                                        <Picker data={data} onEmojiSelect={handleEmojiSelect} theme="light" />
                                    </div>
                                )}
                            </div>

                            {/* Sticker Picker */}
                            <div className="relative">
                                <button
                                    onClick={() => {
                                        setShowStickerPicker(!showStickerPicker);
                                        setShowEmojiPicker(false);
                                    }}
                                    className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
                                    title="Stickers"
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
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                multiple
                                className="hidden"
                                onChange={handleImageUpload}
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
                                title="Upload Image"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </button>

                            {/* Send Button */}
                            <button
                                onClick={handleAddComment}
                                disabled={!commentText.trim() && commentImages.length === 0}
                                className="w-10 h-10 rounded-full bg-[#ea4c89] text-white flex items-center justify-center hover:bg-[#d9457a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            {expandedCommentImage && (
                <div
                    className="fixed inset-0 z-[10002] bg-black/80 flex items-center justify-center p-4"
                    onClick={() => setExpandedCommentImage(null)}
                >
                    <div className="relative max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
                        <img
                            src={expandedCommentImage}
                            alt="Comment full"
                            className="w-full max-h-[85vh] object-contain rounded-2xl"
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
        </>
    );
};
