import React, { useState, useEffect, useRef } from 'react';
import { Pet } from '@/data/petData';
import { getPetDocuments, PetDocument, addPetDocument, initChat, sendMessage } from '@/lib/database';
import { uploadPetDocument } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import { OwnershipHistory } from '@/components/professional/OwnershipHistory';
import { BreedingTools } from '@/components/professional/BreedingTools';
import {
  getPetComments, postPetComment, getPetSocialStats, togglePetLike, incrementPetView, subscribeToPetComments,
  PetComment, PetSocialStats
} from '@/lib/social_features';

interface PetDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  pet: Pet | null;
  onViewPedigree: (pet: Pet) => void;
}

const PetDetailsModal: React.FC<PetDetailsModalProps> = ({ isOpen, onClose, pet, onViewPedigree }) => {
  const [documents, setDocuments] = useState<PetDocument[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auth
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  // Social State
  const [socialStats, setSocialStats] = useState<PetSocialStats>({ view_count: 0, like_count: 0, comment_count: 0, has_liked: false });
  const [comments, setComments] = useState<PetComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingSocial, setLoadingSocial] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUser(user.id);
    });
  }, []);

  useEffect(() => {
    if (pet && isOpen) {
      loadDocuments();
      loadSocialData();
      incrementPetView(pet.id).catch(console.error);

      // Subscribe to Realtime Comments
      const subscription = subscribeToPetComments(pet.id, () => {
        // Reload comments when a new one comes in
        getPetComments(pet.id).then(setComments);
        // Also update counts
        getPetSocialStats(pet.id).then(stats => setSocialStats(prev => ({ ...prev, comment_count: stats.comment_count })));
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [pet, isOpen]);

  const loadDocuments = async () => {
    if (!pet) return;
    const docs = await getPetDocuments(pet.id);
    setDocuments(docs);
  };

  const loadSocialData = async () => {
    if (!pet) return;
    setLoadingSocial(true);
    try {
      const stats = await getPetSocialStats(pet.id);
      setSocialStats(stats);
      const comms = await getPetComments(pet.id);
      setComments(comms);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingSocial(false);
    }
  };

  const handleLike = async () => {
    if (!pet) return;
    const newLikedState = !socialStats.has_liked;

    // Optimistic UI
    setSocialStats(prev => ({
      ...prev,
      has_liked: newLikedState,
      like_count: newLikedState ? prev.like_count + 1 : prev.like_count - 1
    }));

    try {
      await togglePetLike(pet.id, newLikedState);
    } catch {
      // Revert if error
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

    try {
      await postPetComment(pet.id, newComment);
      setNewComment('');
      loadSocialData();
    } catch (e) {
      alert("Failed to post comment. Ensure you are logged in.");
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
          document_type: 'vaccination', // Default
          file_url: url
        });
        getPetDocuments(pet.id).then(setDocuments);
      } catch (err) { console.error(err); alert('Upload failed'); }
      setUploadingDoc(false);
    }
  };

  const calculateAge = (birthDate: string) => {
    const birth = new Date(birthDate);
    const now = new Date();
    const years = now.getFullYear() - birth.getFullYear();
    const months = now.getMonth() - birth.getMonth();

    if (years === 0) return `${months} months`;
    if (years === 1 && months < 0) return `${12 + months} months`;
    return `${years} year${years > 1 ? 's' : ''} old`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (!isOpen || !pet) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal - Parent Wrapper with Overflow Hidden */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">

        {/* ================= HERO IMAGE SECTION (Top) ================= */}
        <div className="relative h-64 sm:h-80 shrink-0">
          <img
            src={pet.image}
            alt={pet.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl bg-white/80 hover:bg-white transition-colors"
          >
            <svg className="w-6 h-6 text-[#2C2C2C]/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Badges */}
          <div className="absolute top-4 left-4 flex gap-2">
            <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${pet.type === 'dog'
              ? 'bg-[#C97064] text-white'
              : 'bg-[#8B9D83] text-white'
              }`}>
              {pet.type === 'dog' ? 'Dog' : 'Cat'}
            </span>
            {pet.healthCertified && (
              <span className="px-3 py-1.5 rounded-full text-sm font-medium bg-green-500 text-white flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Certified
              </span>
            )}
          </div>

          {/* Name Overlay & Main Actions */}
          <div className="absolute bottom-4 left-4 right-4">
            <h2 className="text-3xl font-bold text-white mb-1">{pet.name}</h2>
            <div className="flex items-center justify-between">
              <p className="text-white/90 font-medium">{pet.breed}</p>

              {/* Button Group: Family Tree & Chat */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    onClose();
                    onViewPedigree(pet);
                  }}
                  className="px-4 py-2 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 text-white text-sm font-bold hover:bg-white/30 transition-all flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Family Tree
                </button>

                {/* Chat Button */}
                {currentUser !== pet.owner_id && (
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      console.log('Chat button clicked', { petId: pet?.id, ownerId: pet?.owner_id });

                      if (!pet || !currentUser) {
                        alert('Please login to chat');
                        return;
                      }
                      if (!pet.owner_id) {
                        alert('Owner information unavailable.');
                        return;
                      }

                      try {
                        const roomId = await initChat(pet.owner_id);

                        await sendMessage(roomId, `Hi! I'm interested in ${pet.name}.`, 'pet_card', {
                          petId: pet.id,
                          petName: pet.name,
                          petImage: pet.image_url,
                          petBreed: pet.breed
                        });

                        const event = new CustomEvent('openChat', { detail: { roomId, targetUserName: pet.owner?.full_name || 'Owner', targetUserId: pet.owner_id } });
                        window.dispatchEvent(event);
                        onClose();
                      } catch (e) {
                        console.error('Chat error:', e);
                        alert('Unable to start chat.');
                      }
                    }}
                    className="px-4 py-2 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 text-white text-sm font-bold hover:bg-white/30 transition-all flex items-center gap-2 z-50 cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                    Chat with Owner
                  </button>
                )}
              </div>
            </div>
          </div>
        </div> {/* End Hero Image */}


        {/* ================= CONTENT SECTION (Scrollable) ================= */}
        <div className="p-6 overflow-y-auto bg-white flex-1">

          {/* Quick Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="p-4 rounded-xl bg-[#F5F1E8]">
              <span className="text-xs text-[#2C2C2C]/50 uppercase tracking-wider">Age</span>
              <p className="font-semibold text-[#2C2C2C] mt-1">{calculateAge(pet.birthDate)}</p>
            </div>
            <div className="p-4 rounded-xl bg-[#F5F1E8]">
              <span className="text-xs text-[#2C2C2C]/50 uppercase tracking-wider">Gender</span>
              <p className="font-semibold text-[#2C2C2C] mt-1 capitalize">{pet.gender}</p>
            </div>
            <div className="p-4 rounded-xl bg-[#F5F1E8]">
              <span className="text-xs text-[#2C2C2C]/50 uppercase tracking-wider">Color</span>
              <p className="font-semibold text-[#2C2C2C] mt-1">{pet.color}</p>
            </div>
            <div className="p-4 rounded-xl bg-[#F5F1E8]">
              <span className="text-xs text-[#2C2C2C]/50 uppercase tracking-wider">Location</span>
              <p className="font-semibold text-[#2C2C2C] mt-1">{pet.location.split(',')[0]}</p>
            </div>
          </div>

          {/* ============ COMMUNITY TALK (Moved Up) ============ */}
          <div className="mb-6 pb-6 border-b border-[#8B9D83]/10">
            <h4 className="font-semibold text-[#2C2C2C] flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-[#C97064]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" /></svg>
              Community Talk
            </h4>

            {/* Stats Bar */}
            <div className="flex items-center justify-between bg-white border border-[#8B9D83]/10 rounded-xl p-4 mb-4 shadow-sm">
              <div className="flex items-center gap-6 text-sm text-gray-500">
                <div className="flex items-center gap-1.5">
                  <svg className="w-5 h-5 text-[#8B9D83]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  <span>{socialStats.view_count} Views</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <svg className="w-5 h-5 text-[#C97064]" fill={socialStats.like_count > 0 ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                  <span>{socialStats.like_count} Likes</span>
                </div>
              </div>

              <button
                onClick={handleLike}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${socialStats.has_liked ? 'bg-[#C97064] text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                <svg className="w-5 h-5" fill={socialStats.has_liked ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                {socialStats.has_liked ? 'Liked' : 'Like'}
              </button>
            </div>

            {/* Comments (Compact) */}
            <div className="space-y-4 mb-4 max-h-[200px] overflow-y-auto pr-2">
              {comments.length === 0 ? (
                <p className="text-center text-gray-400 py-2 italic text-sm">No comments yet.</p>
              ) : (
                comments.map(comment => (
                  <div key={comment.id} className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden shrink-0 mt-1">
                      {comment.user?.avatar_url ? (
                        <img src={comment.user.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs font-bold text-gray-500">{comment.user?.full_name?.charAt(0) || '?'}</span>
                      )}
                    </div>
                    <div className="bg-gray-50 rounded-xl rounded-tl-none p-2 border border-gray-100 flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-[#2C2C2C]">{comment.user?.full_name || 'Anonymous'}</span>
                        <span className="text-[10px] text-gray-400">{new Date(comment.created_at).toLocaleDateString()}</span>
                      </div>
                      <p className="text-xs text-gray-700">{comment.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Comment Input */}
            <form onSubmit={handlePostComment} className="flex gap-2">
              <input
                type="text"
                placeholder="Write a comment..."
                className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#8B9D83]/20 focus:border-[#8B9D83] outline-none text-sm"
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
              />
              <button
                type="submit"
                disabled={!newComment.trim()}
                className="p-2 bg-[#8B9D83] text-white rounded-xl hover:bg-[#7A8C72] disabled:opacity-50 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
              </button>
            </form>
          </div>

          {/* Details List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-[#8B9D83]/10">
              <span className="text-[#2C2C2C]/60">Birth Date</span>
              <span className="font-medium text-[#2C2C2C]">{formatDate(pet.birthDate)}</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-[#8B9D83]/10">
              <span className="text-[#2C2C2C]/60">Full Location</span>
              <span className="font-medium text-[#2C2C2C]">{pet.location}</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-[#8B9D83]/10">
              <span className="text-[#2C2C2C]/60">Owner</span>
              <span className="font-medium text-[#2C2C2C]">{pet.owner}</span>
            </div>
            {pet.registrationNumber && (
              <div className="flex items-center justify-between py-3 border-b border-[#8B9D83]/10">
                <span className="text-[#2C2C2C]/60">Registration #</span>
                <span className="font-mono font-medium text-[#8B9D83]">{pet.registrationNumber}</span>
              </div>
            )}
            <div className="flex items-center justify-between py-3 border-b border-[#8B9D83]/10">
              <span className="text-[#2C2C2C]/60">Health Status</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${pet.healthCertified
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-100 text-gray-600'
                }`}>
                {pet.healthCertified ? 'Certified' : 'Not Certified'}
              </span>
            </div>
          </div>

          {/* Health Vault & Documents */}
          <div className="mt-6 pt-6 border-t border-[#8B9D83]/10">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-[#2C2C2C] flex items-center gap-2">
                <svg className="w-5 h-5 text-[#8B9D83]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                Health Vault
              </h4>
              {currentUser === pet.owner_id && (
                <div className="flex gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs bg-[#8B9D83]/10 text-[#6B7D63] px-3 py-1.5 rounded-lg hover:bg-[#8B9D83]/20 transition-colors font-medium flex items-center gap-1 border border-[#8B9D83]/20"
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
              <div className="p-6 rounded-xl border-2 border-dashed border-[#8B9D83]/10 bg-[#F5F1E8]/30 flex flex-col items-center justify-center text-center">
                <svg className="w-10 h-10 text-[#8B9D83]/20 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                <p className="text-sm text-[#2C2C2C]/40 font-medium">No medical records uploaded yet.</p>
                <p className="text-xs text-[#2C2C2C]/30 mt-1">Vaccination cards, DNA tests, or vet reports.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {documents.map(doc => (
                  <a key={doc.id} href={doc.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 rounded-xl border border-[#8B9D83]/10 hover:bg-[#F5F1E8] hover:border-[#8B9D83]/30 transition-all group bg-white shadow-sm">
                    <div className="w-10 h-10 rounded-lg bg-[#C97064]/10 text-[#C97064] flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[#2C2C2C] text-sm group-hover:text-[#C97064] transition-colors truncate">{doc.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#8B9D83] bg-[#8B9D83]/10 px-1.5 py-0.5 rounded">{doc.document_type}</span>
                        <span className="text-[10px] text-gray-400">{new Date(doc.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="p-2 rounded-full text-gray-300 group-hover:text-[#C97064] group-hover:bg-[#C97064]/10 transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Professional Features */}
          <OwnershipHistory petId={pet.id} />
          {currentUser === pet.owner_id && (
            <BreedingTools petId={pet.id} petGender={pet.gender} />
          )}

          {/* Footer */}
          <div className="flex items-center justify-between p-6 mt-6 border-t border-[#8B9D83]/10 bg-[#F5F1E8]/50 rounded-xl">
            <button
              onClick={onClose}
              className="w-full px-6 py-3 rounded-xl border border-[#8B9D83]/30 text-[#2C2C2C] font-medium hover:bg-white transition-colors"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default PetDetailsModal;
