/**
 * PetDetailsModal - Dark Luxury Theme (Black & Gold)
 * 
 * A comprehensive pet profile modal with:
 * - Photo gallery
 * - Pet information
 * - Social features (likes, comments)
 * - Chat with owner 
 * - Health documents
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pet } from '@/data/petData';
import { getPetDocuments, PetDocument, addPetDocument, initChat, sendMessage } from '@/lib/database';
import { uploadPetDocument } from '@/lib/storage';
import { useAuth } from '@/contexts/AuthContext';
import {
  approvePetComment, deletePetComment, getPetComments, postPetComment, getPetSocialStats, togglePetLike, incrementPetView, subscribeToPetComments,
  PetComment, PetSocialStats
} from '@/lib/social_features';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { getPetPhotos, addPetPhoto, deletePetPhoto, PetPhoto, getRelatedBreeders, RelatedBreeder } from '@/lib/database';
import { AIChatOverlay } from '@/components/ai/AIChatOverlay';

interface PetDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  pet: Pet | null;
  onViewPedigree: (pet: Pet) => void;
  onChatWithOwner?: (pet: Pet) => void;
  onFindMate?: (pet: Pet) => void;
}

const PetDetailsModal: React.FC<PetDetailsModalProps> = ({ isOpen, onClose, pet, onViewPedigree, onChatWithOwner, onFindMate }) => {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<PetDocument[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { user: authUser } = useAuth();
  const currentUserId = authUser?.id || null;
  const isAdmin = authUser?.profile?.role === 'admin';
  const canManageHealthProfile = isAdmin || (currentUserId && pet?.owner_id === currentUserId);

  // Social State
  const [socialStats, setSocialStats] = useState<PetSocialStats>({ view_count: 0, like_count: 0, comment_count: 0, has_liked: false });
  const [comments, setComments] = useState<PetComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingSocial, setLoadingSocial] = useState(false);
  const [videoError, setVideoError] = useState(false);

  // AI Chat State
  const [showAIChat, setShowAIChat] = useState(false);
  const [initialAIQuery, setInitialAIQuery] = useState('');

  // Gallery State
  const [photos, setPhotos] = useState<PetPhoto[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (pet && isOpen) {
      // Check for ephemeral/mock IDs (Non-UUIDs)
      const isEphemeral = pet.id.startsWith('ext-') || pet.id.startsWith('mock-');

      if (isEphemeral) {
        setDocuments([]);
        setPhotos([]);
        setComments([]);
        setSocialStats({ view_count: 125, like_count: 12, comment_count: 0, has_liked: false });
        setLoadingSocial(false);
        return;
      }

      loadDocuments();
      loadPhotos();
      loadSocialData();
      incrementPetView(pet.id).catch(console.error);

      const subscription = subscribeToPetComments(pet.id, () => {
        getPetComments(pet.id, { includeUnapproved: isAdmin }).then(setComments);
        getPetSocialStats(pet.id).then(stats => setSocialStats(prev => ({ ...prev, comment_count: stats.comment_count })));
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [pet, isOpen, isAdmin]);

  const loadDocuments = async () => {
    if (!pet) return;
    const docs = await getPetDocuments(pet.id);
    setDocuments(docs);
  };

  const loadPhotos = async () => {
    if (!pet) return;
    const p = await getPetPhotos(pet.id);
    setPhotos(p);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0] && pet) {
      setUploadingPhoto(true);
      try {
        const url = await uploadPetDocument(e.target.files[0]);
        await addPetPhoto({
          pet_id: pet.id,
          image_url: url,
          caption: e.target.files[0].name
        });
        loadPhotos();
      } catch (err) { console.error(err); alert('Photo upload failed'); }
      setUploadingPhoto(false);
    }
  };

  const loadSocialData = async () => {
    if (!pet) return;
    setLoadingSocial(true);
    try {
      const stats = await getPetSocialStats(pet.id);
      setSocialStats(stats);
      const comms = await getPetComments(pet.id, { includeUnapproved: isAdmin });
      setComments(comms);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingSocial(false);
    }
  };

  const handleLike = async () => {
    if (!pet) return;

    // Local Handle for Magic Cards
    if (pet.id.startsWith('ext-') || pet.id.startsWith('mock-')) {
      const newLikedState = !socialStats.has_liked;
      setSocialStats(prev => ({
        ...prev,
        has_liked: newLikedState,
        like_count: newLikedState ? prev.like_count + 1 : prev.like_count - 1
      }));
      return;
    }

    const newLikedState = !socialStats.has_liked;

    setSocialStats(prev => ({
      ...prev,
      has_liked: newLikedState,
      like_count: newLikedState ? prev.like_count + 1 : prev.like_count - 1
    }));

    try {
      await togglePetLike(pet.id, newLikedState);
    } catch {
      setSocialStats(prev => ({
        ...prev,
        has_liked: !newLikedState,
        like_count: !newLikedState ? prev.like_count + 1 : prev.like_count - 1
      }));
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pet || !newComment.trim()) return;

    const text = newComment.trim();
    const isQuestion =
      text.includes('?') ||
      ['ไหม', 'มั้ย', 'ป่าว', 'เปล่า', 'ลูก', 'กี่', 'เท่าไหร่', 'ยังไง', 'ไหน', 'อะไร', 'ทำไม', 'ใคร', 'หรือ', 'อยากได้', 'สนใจ'].some(kw => text.includes(kw)) ||
      /^(what|where|when|who|why|how|is|are|do|does|can|could|should)/i.test(text);

    if (isQuestion) {
      setInitialAIQuery(text);
      setShowAIChat(true);
      setNewComment('');
      return;
    }

    // Local Handle for Magic Cards
    if (pet.id.startsWith('ext-') || pet.id.startsWith('mock-')) {
      const newC: any = {
        id: `local-${Date.now()}`,
        pet_id: pet.id,
        user_id: currentUserId || 'guest',
        content: text,
        created_at: new Date().toISOString(),
        is_approved: true,
        user: { full_name: authUser?.profile?.full_name || 'You', avatar_url: authUser?.profile?.avatar_url }
      };
      setComments(prev => [newC, ...prev]);
      setNewComment('');
      setSocialStats(prev => ({ ...prev, comment_count: prev.comment_count + 1 }));
      return;
    }

    try {
      await postPetComment(pet.id, text);
      setNewComment('');
      loadSocialData();
    } catch (e) {
      alert("Failed to post comment. Ensure you are logged in.");
    }
  };

  const handleApproveComment = async (commentId: string) => {
    try {
      await approvePetComment(commentId, true);
      loadSocialData();
    } catch (error) {
      console.error(error);
      alert('Failed to approve comment.');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Delete this comment?')) return;
    try {
      await deletePetComment(commentId);
      loadSocialData();
    } catch (error) {
      console.error(error);
      alert('Failed to delete comment.');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0] && pet) {
      setUploadingDoc(true);
      try {
        const url = await uploadPetDocument(e.target.files[0]);
        await addPetDocument({
          pet_id: pet.id,
          title: e.target.files[0].name,
          document_type: 'vaccination',
          file_url: url
        });
        getPetDocuments(pet.id).then(setDocuments);
      } catch (err) { console.error(err); alert('Upload failed'); }
      setUploadingDoc(false);
    }
  };

  const handleChatWithOwner = async () => {
    if (!pet || !currentUserId) {
      alert('Please login to chat');
      return;
    }
    if (!pet.owner_id) {
      alert('Owner information unavailable.');
      return;
    }

    // Use the onChatWithOwner callback if provided
    if (onChatWithOwner) {
      onChatWithOwner(pet);
      onClose();
      return;
    }

    // Fallback to legacy behavior
    try {
      const roomId = await initChat(pet.owner_id);
      await sendMessage(roomId, `Hi! I'm interested in ${pet.name}.`, 'pet_card', {
        petId: pet.id,
        petName: pet.name,
        petImage: resolvedImage,
        petBreed: pet.breed
      });
      const event = new CustomEvent('openChat', { detail: { roomId, targetUserName: resolvedOwnerName, targetUserId: pet.owner_id } });
      window.dispatchEvent(event);
      onClose();
    } catch (e) {
      console.error('Chat error:', e);
      alert('Unable to start chat.');
    }
  };

  const handleOpenVetProfile = () => {
    if (!pet) return;
    onClose();
    navigate(`/vet-profile/${pet.id}`);
  };

  const resolveOwnerName = (petData: any) => {
    if (!petData) return 'Unknown';
    if (typeof petData.owner === 'string') return petData.owner;
    if (typeof petData.owner === 'object' && petData.owner !== null) {
      return petData.owner.full_name || petData.owner.name || petData.owner.username || 'Unknown';
    }
    if (typeof petData.owner_name === 'string' && petData.owner_name.trim()) return petData.owner_name;
    return 'Unknown';
  };

  const calculateAge = (birthDate: string) => {
    if (!birthDate) return 'Unknown';
    const birth = new Date(birthDate);
    if (Number.isNaN(birth.getTime())) return 'Unknown';
    const now = new Date();
    const years = now.getFullYear() - birth.getFullYear();
    const months = now.getMonth() - birth.getMonth();

    if (years === 0) return `${months} months`;
    if (years === 1 && months < 0) return `${12 + months} months`;
    return `${years} year${years > 1 ? 's' : ''} old`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'Unknown';
    const parsed = new Date(dateStr);
    if (Number.isNaN(parsed.getTime())) return 'Unknown';
    return parsed.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  if (!isOpen || !pet) return null;

  const resolvedImage = pet.image || (pet as any).image_url || '';
  const resolvedRegistrationNumber = pet.registrationNumber || (pet as any).registration_number || '';
  const resolvedBirthDate = pet.birthDate || (pet as any).birth_date || (pet as any).birthday || '';
  const resolvedOwnerName = resolveOwnerName(pet);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop - Dark Luxury */}
      <div className="absolute inset-0 bg-[#0A0A0A]/95 backdrop-blur-md" onClick={onClose} />

      {/* Modal - Dark Luxury Theme */}
      <div className={`bg-[#1A1A1A] shadow-2xl overflow-hidden flex flex-col transition-all duration-300 ${isMaximized ? 'fixed inset-0 z-[60] w-full h-full rounded-none border-0' : 'relative w-full max-w-4xl max-h-[90vh] rounded-2xl border border-[#C5A059]/20'}`}>

        {/* ================= HERO IMAGE SECTION ================= */}
        <div
          className="relative h-64 sm:h-80 shrink-0 cursor-pointer"
          onDoubleClick={() => setIsMaximized(!isMaximized)}
        >
          {pet.media_type === 'video' && pet.video_url ? (
            (() => {
              const ytId = pet.video_url?.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)?.[1];
              if (ytId) {
                return (
                  <iframe
                    src={`https://www.youtube.com/embed/${ytId}?autoplay=1&mute=0&controls=1&loop=1&playlist=${ytId}&playsinline=1`}
                    title={pet.name}
                    className="w-full h-full object-contain bg-black"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                );
              }

              // Instagram Support
              if (pet.video_url?.includes('instagram.com')) {
                const cleanUrl = pet.video_url.split('?')[0].replace(/\/$/, '');
                const embedUrl = cleanUrl.endsWith('/embed') ? cleanUrl : `${cleanUrl}/embed`;
                return (
                  <iframe
                    src={embedUrl}
                    className="w-full h-full object-contain bg-black"
                    frameBorder="0"
                    scrolling="no"
                  />
                );
              }

              // Other Platforms
              const isTikTok = pet.video_url?.includes('tiktok.com');
              const isFB = pet.video_url?.includes('facebook.com');
              const isPin = pet.video_url?.includes('pinterest.com');

              if (isTikTok || isFB || isPin) {
                const bgClass = isTikTok ? 'bg-black' : isFB ? 'bg-[#1877F2]' : 'bg-[#E60023]';
                const label = isTikTok ? 'TikTok' : isFB ? 'Facebook' : 'Pinterest';
                return (
                  <div className={`w-full h-full flex flex-col items-center justify-center ${bgClass} p-8 text-center text-white`}>
                    <span className="text-4xl mb-4">▶</span>
                    <h3 className="text-xl font-bold mb-2">View on {label}</h3>
                    <a
                      href={pet.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-6 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full text-sm font-bold transition-all"
                    >
                      Open App
                    </a>
                  </div>
                );
              }

              if (videoError) {
                return (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-[#0D0D0D] p-12 text-center">
                    <span className="text-4xl mb-4 text-[#C5A059]/50">📹</span>
                    <h3 className="text-lg font-bold text-[#F5F5F0] mb-2">Video Unavailable</h3>
                    <p className="text-sm text-[#B8B8B8] mb-6">Format not supported inline.</p>
                    <a
                      href={pet.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-6 py-2.5 bg-[#C5A059] text-[#0A0A0A] font-bold rounded-xl hover:bg-[#D4C4B5] transition-colors"
                    >
                      Open Link
                    </a>
                  </div>
                );
              }

              return (
                <video
                  src={pet.video_url}
                  poster={resolvedImage}
                  className="w-full h-full object-contain bg-black"
                  onError={() => setVideoError(true)}
                  controls
                  autoPlay
                  loop
                  playsInline
                />
              );
            })()
          ) : resolvedImage ? (
            <img
              src={resolvedImage}
              alt={pet.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
          ) : null}

          {/* Fallback for missing image */}
          <div className={`absolute inset-0 bg-[#0D0D0D] flex flex-col items-center justify-center text-[#C5A059]/30 ${resolvedImage ? 'hidden' : ''}`}>
            <svg className="w-20 h-20 opacity-20" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-5.5-2.5l7.51-3.49L17.5 6.5 9.99 9.99 6.5 17.5zm5.5-6.6c.61 0 1.1.49 1.1 1.1s-.49 1.1-1.1 1.1-1.1-.49-1.1-1.1.49-1.1 1.1-1.1z" /></svg>
            <span className="text-sm font-medium opacity-40 mt-2">No photo available</span>
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-transparent" />

          {/* Close & Maximize Buttons */}
          <div className="absolute top-4 right-4 flex gap-2">
            <button
              onClick={() => setIsMaximized(!isMaximized)}
              className="p-2 rounded-lg bg-[#0A0A0A]/80 hover:bg-[#0A0A0A] text-[#B8B8B8] hover:text-[#F5F5F0] transition-colors"
            >
              {isMaximized ? (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 14h6m-6 0v6m0-6l6 6m10-10h-6m6 0V4m0 6l-6-6" /></svg>
              ) : (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
              )}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-[#0A0A0A]/80 hover:bg-[#0A0A0A] text-[#B8B8B8] hover:text-[#F5F5F0] transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Badges */}
          <div className="absolute top-4 left-4 flex gap-2">
            <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${pet.type === 'dog' ? 'bg-[#C5A059] text-[#0A0A0A]' : 'bg-[#8B7355] text-white'}`}>
              {pet.type === 'dog' ? 'Dog' : 'Cat'}
            </span>
            {pet.healthCertified && (
              <span className="px-3 py-1.5 rounded-full text-sm font-medium bg-[#4A7C59] text-white flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Verified
              </span>
            )}
          </div>

          {/* Name & Action Buttons */}
          <div className="absolute bottom-4 left-4 right-4">
            <h2 className="font-['Playfair_Display'] text-3xl text-[#F5F5F0] mb-1">{pet.name}</h2>
            <div className="flex items-center justify-between">
              <p className="text-[#C5A059] font-medium">{pet.breed}</p>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => { onClose(); onViewPedigree(pet); }}
                  className="px-4 py-2 rounded-lg bg-[#0A0A0A]/80 border border-[#C5A059]/30 text-[#C5A059] text-sm font-medium hover:bg-[#C5A059]/10 transition-all flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Family Tree
                </button>

                {onFindMate && (
                  <button
                    onClick={() => { onFindMate(pet); }}
                    className="px-4 py-2 rounded-lg bg-[#0A0A0A]/80 border border-pink-500/30 text-pink-400 text-sm font-medium hover:bg-pink-500/10 transition-all flex items-center gap-2"
                  >
                    <span className="text-base">❤️</span>
                    Find Match
                  </button>
                )}

                {canManageHealthProfile && (
                  <button
                    onClick={handleOpenVetProfile}
                    className="px-4 py-2 rounded-lg bg-[#0A0A0A]/80 border border-[#4A7C59]/30 text-[#7FB68A] text-sm font-medium hover:bg-[#4A7C59]/10 transition-all flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
                    </svg>
                    Vet AI Profile
                  </button>
                )}

                {currentUserId !== pet.owner_id && (
                  <button
                    onClick={handleChatWithOwner}
                    className="px-4 py-2 rounded-lg bg-[#C5A059] text-[#0A0A0A] text-sm font-medium hover:bg-[#D4C4B5] transition-all flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                    Chat with Owner
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ================= CONTENT SECTION ================= */}
        <div className="p-6 overflow-y-auto flex-1">

          {/* Quick Stats */}
          <div className="flex overflow-x-auto gap-3 mb-6 pb-2 -mx-6 px-6 scrollbar-hide snap-x">
            {/* Registration */}
            <div className="min-w-[160px] p-3 rounded-xl bg-[#0D0D0D] border border-[#C5A059]/10 flex flex-col justify-center min-h-[80px] snap-center">
              <span className="text-[10px] text-[#C5A059]/60 uppercase tracking-wider font-bold mb-1">Registration #</span>
              <p className="font-mono text-[#F5F5F0] text-sm truncate">{resolvedRegistrationNumber || 'Pending'}</p>
            </div>

            {/* Owner */}
            <div
              className="min-w-[160px] p-3 rounded-xl bg-[#0D0D0D] border border-[#C5A059]/10 flex flex-col justify-center cursor-pointer hover:border-[#C5A059]/30 transition-colors min-h-[80px] snap-center"
              onClick={() => pet.owner_id && window.dispatchEvent(new CustomEvent('openBreederProfile', { detail: { ownerId: pet.owner_id } }))}
            >
              <span className="text-[10px] text-[#C5A059]/60 uppercase tracking-wider font-bold mb-1">Owner</span>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#C5A059] to-[#8B7355] text-[#0A0A0A] flex items-center justify-center text-[10px] font-bold shrink-0">
                  {resolvedOwnerName.charAt(0).toUpperCase() || 'O'}
                </div>
                <p className="text-[#F5F5F0] text-sm truncate">{resolvedOwnerName}</p>
              </div>
            </div>

            {/* Birth Date */}
            <div className="min-w-[160px] p-3 rounded-xl bg-[#0D0D0D] border border-[#C5A059]/10 flex flex-col justify-center min-h-[80px] snap-center">
              <span className="text-[10px] text-[#C5A059]/60 uppercase tracking-wider font-bold mb-1">Birth Date</span>
              <div className="flex flex-col">
                <p className="text-[#F5F5F0] text-sm">{formatDate(resolvedBirthDate)}</p>
                <span className="text-[10px] text-[#C5A059]">{calculateAge(resolvedBirthDate)}</span>
              </div>
            </div>

            {/* Gender */}
            <div className="min-w-[160px] p-3 rounded-xl bg-[#0D0D0D] border border-[#C5A059]/10 flex flex-col justify-center min-h-[80px] snap-center">
              <span className="text-[10px] text-[#C5A059]/60 uppercase tracking-wider font-bold mb-1">Gender</span>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${pet.gender === 'male' ? 'bg-blue-400' : 'bg-pink-400'}`}></span>
                <p className="text-[#F5F5F0] text-sm capitalize">{pet.gender}</p>
              </div>
            </div>

            {/* Color */}
            <div className="min-w-[160px] p-3 rounded-xl bg-[#0D0D0D] border border-[#C5A059]/10 flex flex-col justify-center min-h-[80px] snap-center">
              <span className="text-[10px] text-[#C5A059]/60 uppercase tracking-wider font-bold mb-1">Color</span>
              <p className="text-[#F5F5F0] text-sm capitalize truncate">{pet.color || 'Unknown'}</p>
            </div>

            {/* Location */}
            <div className="min-w-[160px] p-3 rounded-xl bg-[#0D0D0D] border border-[#C5A059]/10 flex flex-col justify-center min-h-[80px] snap-center">
              <span className="text-[10px] text-[#C5A059]/60 uppercase tracking-wider font-bold mb-1">Location</span>
              <div className="flex items-center gap-1">
                <svg className="w-3 h-3 text-[#C5A059]/40 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                <p className="text-[#F5F5F0] text-sm truncate">{pet.location || 'Unknown'}</p>
              </div>
            </div>
          </div>

          {/* Photo Gallery */}
          <div id="gallery-section" className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-[#F5F5F0] flex items-center gap-2">
                <svg className="w-5 h-5 text-[#C5A059]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                Photo Gallery
              </h4>
              {currentUserId === pet.owner_id && (
                <div>
                  <button
                    onClick={() => photoInputRef.current?.click()}
                    disabled={uploadingPhoto}
                    className="px-3 py-1.5 bg-[#C5A059] text-[#0A0A0A] text-xs font-bold rounded-lg hover:bg-[#D4C4B5] transition-colors flex items-center gap-1"
                  >
                    {uploadingPhoto ? 'Uploading...' : '+ Add Photo'}
                  </button>
                  <input type="file" ref={photoInputRef} className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                </div>
              )}
            </div>

            {photos.length === 0 ? (
              <div className="p-8 rounded-xl bg-[#0D0D0D] border border-dashed border-[#C5A059]/20 text-center">
                <p className="text-[#B8B8B8]/50 text-sm">No additional photos yet.</p>
              </div>
            ) : (
              <div className="columns-2 sm:columns-3 gap-3 space-y-3">
                {photos.map(photo => (
                  <div key={photo.id} className="break-inside-avoid relative group rounded-xl overflow-hidden border border-[#C5A059]/10 hover:border-[#C5A059]/30 transition-all">
                    <img src={photo.image_url} alt="" className="w-full h-auto object-cover transform group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-[#0A0A0A]/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      {photo.caption && <p className="text-[#F5F5F0] text-[10px] font-medium truncate">{photo.caption}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Community Stats & Like */}
          <div className="mb-6 pb-6 border-b border-[#C5A059]/10">
            <h4 className="font-medium text-[#F5F5F0] flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-[#C5A059]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" /></svg>
              Community
            </h4>

            <div className="flex items-center justify-between bg-[#0D0D0D] border border-[#C5A059]/10 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-6 text-sm text-[#B8B8B8]">
                <div className="flex items-center gap-1.5">
                  <svg className="w-5 h-5 text-[#C5A059]/60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  <span>{socialStats.view_count} Views</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <svg className="w-5 h-5 text-red-400" fill={socialStats.like_count > 0 ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                  <span>{socialStats.like_count} Likes</span>
                </div>
              </div>

              <button
                onClick={handleLike}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${socialStats.has_liked ? 'bg-red-500 text-white' : 'bg-[#C5A059]/10 text-[#C5A059] hover:bg-[#C5A059]/20'}`}
              >
                <svg className="w-5 h-5" fill={socialStats.has_liked ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                {socialStats.has_liked ? 'Liked' : 'Like'}
              </button>
            </div>

            {/* Comments */}
            <div className="space-y-4 mb-4 max-h-[200px] overflow-y-auto pr-2">
              {comments.length === 0 ? (
                <p className="text-center text-[#B8B8B8]/40 py-2 italic text-sm">No comments yet. Be the first!</p>
              ) : (
                comments.map(comment => (
                  <div key={comment.id} className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#C5A059] to-[#8B7355] flex items-center justify-center overflow-hidden shrink-0 mt-1 text-[10px] text-[#0A0A0A] font-bold">
                      {comment.user?.full_name?.charAt(0) || '?'}
                    </div>
                    <div className="bg-[#0D0D0D] rounded-xl rounded-tl-none p-2 border border-[#C5A059]/10 flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-[#F5F5F0]">{comment.user?.full_name || 'Anonymous'}</span>
                        <div className="flex items-center gap-2">
                          {isAdmin && comment.is_approved === false && (
                            <span className="text-[9px] font-semibold uppercase tracking-wide text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded">Pending</span>
                          )}
                          <span className="text-[10px] text-[#B8B8B8]/50">{new Date(comment.created_at).toLocaleDateString()}</span>
                          {isAdmin && (
                            <div className="flex items-center gap-1">
                              {comment.is_approved === false && (
                                <button type="button" className="text-[10px] font-semibold text-green-400 hover:text-green-300" onClick={() => handleApproveComment(comment.id)}>Approve</button>
                              )}
                              <button type="button" className="text-[10px] font-semibold text-red-400 hover:text-red-300" onClick={() => handleDeleteComment(comment.id)}>Delete</button>
                            </div>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-[#B8B8B8]">{comment.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Comment Input */}
            <form onSubmit={handlePostComment} className="flex items-center gap-2">
              <input
                type="text"
                className="flex-1 bg-[#0D0D0D] border border-[#C5A059]/20 rounded-full px-4 py-2.5 text-sm text-[#F5F5F0] placeholder:text-[#B8B8B8]/40 focus:border-[#C5A059]/50 focus:outline-none"
                placeholder="Ask anything or comment..."
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
              />
              <button
                type="submit"
                disabled={!newComment.trim()}
                className={`w-10 h-10 flex items-center justify-center rounded-full transition-all ${newComment.trim() ? 'bg-[#C5A059] text-[#0A0A0A] hover:bg-[#D4C4B5]' : 'bg-[#0D0D0D] text-[#B8B8B8]/30'}`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
              </button>
            </form>
          </div>

          {/* Health Vault */}
          <div className="pt-6 border-t border-[#C5A059]/10">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-[#F5F5F0] flex items-center gap-2">
                <svg className="w-5 h-5 text-[#C5A059]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                Health Vault
              </h4>
              {currentUserId === pet.owner_id && (
                <div className="flex gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs bg-[#C5A059]/10 text-[#C5A059] px-3 py-1.5 rounded-lg hover:bg-[#C5A059]/20 transition-colors font-medium flex items-center gap-1 border border-[#C5A059]/20"
                    disabled={uploadingDoc}
                  >
                    {uploadingDoc ? (
                      <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                    ) : (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    )}
                    Upload Doc
                  </button>
                  <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.jpg,.png" onChange={handleFileUpload} />
                </div>
              )}
            </div>

            {documents.length === 0 ? (
              <div className="p-6 rounded-xl border-2 border-dashed border-[#C5A059]/10 bg-[#0D0D0D] flex flex-col items-center justify-center text-center">
                <svg className="w-10 h-10 text-[#C5A059]/20 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                <p className="text-sm text-[#B8B8B8]/40 font-medium">No medical records uploaded yet.</p>
                <p className="text-xs text-[#B8B8B8]/30 mt-1">Vaccination cards, DNA tests, or vet reports.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {documents.map(doc => (
                  <a key={doc.id} href={doc.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-xl border border-[#C5A059]/10 hover:bg-[#0D0D0D] hover:border-[#C5A059]/30 transition-all group bg-[#0A0A0A]">
                    <div className="w-10 h-10 rounded-lg bg-[#C5A059]/10 text-[#C5A059] flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[#F5F5F0] text-sm group-hover:text-[#C5A059] transition-colors truncate">{doc.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#C5A059] bg-[#C5A059]/10 px-1.5 py-0.5 rounded">{doc.document_type}</span>
                        <span className="text-[10px] text-[#B8B8B8]/40">{new Date(doc.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="p-2 rounded-full text-[#B8B8B8]/30 group-hover:text-[#C5A059] group-hover:bg-[#C5A059]/10 transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Related & Sponsored Suggestions */}
          <div className="pt-6 border-t border-[#C5A059]/10">
            <h4 className="font-medium text-[#F5F5F0] mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-[#C5A059]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
              You might also like
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {/* Mock Related 1 */}
              <div className="group cursor-pointer rounded-xl bg-[#0D0D0D] border border-[#C5A059]/10 overflow-hidden hover:border-[#C5A059]/30 transition-all">
                <div className="h-32 relative">
                  <img src="https://images.unsplash.com/photo-1516734212186-a967f81ad0d7" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="Related" />
                  <span className="absolute top-2 left-2 px-1.5 py-0.5 bg-white/90 text-black text-[9px] font-bold rounded shadow-sm">Sponsored</span>
                </div>
                <div className="p-2">
                  <p className="text-xs font-bold text-[#F5F5F0] truncate">Top Grooming Kits</p>
                  <p className="text-[10px] text-[#B8B8B8]">Professional Choice</p>
                </div>
              </div>

              {/* Mock Related 2 */}
              <div className="group cursor-pointer rounded-xl bg-[#0D0D0D] border border-[#C5A059]/10 overflow-hidden hover:border-[#C5A059]/30 transition-all">
                <div className="h-32 relative">
                  <img src="https://images.unsplash.com/photo-1541599540903-216a46ca1dc0" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="Related" />
                  <span className="absolute top-2 left-2 px-1.5 py-0.5 bg-red-600 text-white text-[9px] font-bold rounded shadow-sm flex items-center gap-1">📌 Pin</span>
                </div>
                <div className="p-2">
                  <p className="text-xs font-bold text-[#F5F5F0] truncate">Luxury Pet Homes</p>
                  <p className="text-[10px] text-[#B8B8B8]">Design Weekly</p>
                </div>
              </div>

              {/* Mock Related 3 */}
              <div className="group cursor-pointer rounded-xl bg-[#0D0D0D] border border-[#C5A059]/10 overflow-hidden hover:border-[#C5A059]/30 transition-all">
                <div className="h-32 relative">
                  <img src="https://images.unsplash.com/photo-1583337130417-3346a1be7dee" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="Related" />
                </div>
                <div className="p-2">
                  <p className="text-xs font-bold text-[#F5F5F0] truncate">{pet.breed} Puppies</p>
                  <p className="text-[10px] text-[#B8B8B8]">Available soon</p>
                </div>
              </div>
            </div>
          </div>

          {/* AI Chat Overlay */}
          <AIChatOverlay
            isOpen={showAIChat}
            onClose={() => setShowAIChat(false)}
            initialQuery={initialAIQuery}
            currentPet={pet as any}
          />

        </div>
      </div>
    </div>
  );
};

export default PetDetailsModal;
