/**
 * BreederProfileModal - Black & Gold Luxury Theme
 */

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { uploadUserAvatar } from '@/lib/storage';
import { Pet } from '@/data/petData';
import { mapPet } from '@/lib/database';
import PetCard from '../ui/PetCard';

interface BreederProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string | null;
    currentUserId?: string;
    onViewPet?: (pet: Pet) => void;
}

const BreederProfileModal: React.FC<BreederProfileModalProps> = ({ isOpen, onClose, userId, currentUserId, onViewPet }) => {
    const { signOut, updateProfile } = useAuth();
    const [profile, setProfile] = useState<any>(null);
    const [pets, setPets] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'pets' | 'about'>('pets');
    const [isMaximized, setIsMaximized] = useState(false);

    // Edit Mode State
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({
        full_name: '',
        bio: '',
        location: '',
        phone: '',
        line_id: '',
        facebook: '',
        breeding_focus: '',
        years_experience: ''
    });

    // Pet Image Selector State
    const [showPetSelector, setShowPetSelector] = useState(false);

    const handlePetImageSelect = async (imageUrl: string) => {
        if (!userId || !imageUrl) return;
        try {
            setLoading(true);
            await updateProfile({ avatar_url: imageUrl });
            setProfile({ ...profile, avatar_url: imageUrl });
            setShowPetSelector(false);
            // alert('Profile photo updated from pet!');
        } catch (error) {
            console.error('Error updating avatar:', error);
            alert('Failed to update profil photo.');
        } finally {
            setLoading(false);
        }
    };

    const isOwnProfile = currentUserId === userId;

    const handleSignOut = async () => {
        if (!confirm('Sign out from Eibpo?')) return;
        try {
            await signOut();
            onClose();
        } catch (error) {
            console.error('Sign out failed:', error);
            alert('Unable to sign out right now.');
        }
    };

    useEffect(() => {
        if (userId && isOpen) {
            loadProfileData();
            setIsEditing(false);
            setShowPetSelector(false);
        }
    }, [userId, isOpen]);

    useEffect(() => {
        if (profile) {
            setEditForm({
                full_name: profile.full_name || '',
                bio: profile.bio || '',
                location: profile.location || '',
                phone: profile.phone || '',
                line_id: profile.line_id || '',
                facebook: profile.facebook || '',
                breeding_focus: profile.breeding_focus || '',
                years_experience: profile.years_experience || ''
            });
        }
    }, [profile]);

    const loadProfileData = async () => {
        setLoading(true);
        try {
            const { data: userProfile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .maybeSingle();

            if (profileError && profileError.code !== 'PGRST116') {
                console.error('Error fetching profile', profileError);
            }
            setProfile(userProfile || { full_name: 'Unknown User' });

            const { data: petsData, error: petsError } = await supabase
                .from('pets')
                .select(`
          *,
          father:father_id(name),
          mother:mother_id(name)
        `)
                .eq('owner_id', userId)
                .order('created_at', { ascending: false });

            if (petsData) {
                // Ensure 'image' property is populated for PetCard
                setPets(petsData.map(p => {
                    const mapped = mapPet(p);
                    return { ...mapped, image: mapped.image_url || (p as any).image_url };
                }));
            }

        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveProfile = async () => {
        if (!userId) return;
        try {
            // Only update fields that exist in the database schema to prevent crashes
            const updates = {
                full_name: editForm.full_name,
                bio: editForm.bio,
                location: editForm.location,
                phone: editForm.phone,
                // These fields are not yet in the DB schema, so we skip saving them to Supabase for now
                // line_id: editForm.line_id,
                // facebook: editForm.facebook,
                // breeding_focus: editForm.breeding_focus,
                // years_experience: editForm.years_experience ? parseInt(editForm.years_experience) : null,
            };

            await updateProfile(updates);

            // Update local state with all fields (including those not saved to DB) so UI updates immediately
            setProfile({
                ...profile,
                ...updates,
                // Keep these in local state for UI preview even if not saved to DB
                line_id: editForm.line_id,
                facebook: editForm.facebook,
                breeding_focus: editForm.breeding_focus,
                years_experience: editForm.years_experience
            });

            setIsEditing(false);
            alert('Profile updated successfully!');
        } catch (error: any) {
            console.error('Error updating profile:', error);
            alert('Failed to update profile.');
        }
    };

    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0 || !userId) return;

        try {
            const file = e.target.files[0];
            setLoading(true);
            const publicUrl = await uploadUserAvatar(file);

            await updateProfile({ avatar_url: publicUrl });

            setProfile({ ...profile, avatar_url: publicUrl });
            alert('Profile photo updated!');
        } catch (error) {
            console.error('Error uploading avatar:', error);
            alert('Failed to upload profile photo.');
        } finally {
            setLoading(false);
        }
    };

    const getYear = (dateString: string | null) => {
        if (!dateString) return 'Unknown';
        const date = new Date(dateString);
        return isNaN(date.getFullYear()) ? 'Unknown' : date.getFullYear();
    };

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent
                className={`p-0 overflow-hidden bg-[#1A1A1A] border border-[#C5A059]/20 shadow-2xl flex flex-col transition-all duration-300 ${isMaximized ? 'w-screen h-screen max-w-none rounded-none border-0' : 'max-w-4xl h-[90vh] rounded-2xl'}`}
                aria-describedby="profile-description"
            >
                <DialogTitle className="sr-only">Breeder Profile</DialogTitle>
                <DialogDescription id="profile-description" className="sr-only">
                    View details about the breeder, their pets, and contact information.
                </DialogDescription>

                {/* Pet Image Selector Overlay */}
                {showPetSelector && (
                    <div className="absolute inset-0 z-50 bg-[#1A1A1A] flex flex-col animate-in fade-in duration-200">
                        <div className="p-4 border-b border-[#C5A059]/10 flex items-center justify-between bg-[#0D0D0D]">
                            <h3 className="font-bold text-[#F5F5F0] flex items-center gap-2">
                                <span className="text-[#C5A059]">🐾</span> Select from My Pets
                            </h3>
                            <button
                                onClick={() => setShowPetSelector(false)}
                                className="p-2 hover:bg-[#C5A059]/10 rounded-full text-[#B8B8B8] hover:text-[#F5F5F0] transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="grid grid-cols-2 small:grid-cols-3 md:grid-cols-4 gap-4">
                                {pets.filter(p => p.image || p.image_url).map(pet => (
                                    <div
                                        key={pet.id}
                                        className="aspect-square relative group cursor-pointer rounded-xl overflow-hidden border-2 border-transparent hover:border-[#C5A059] transition-all"
                                        onClick={() => handlePetImageSelect(pet.image || pet.image_url!)}
                                    >
                                        <img src={pet.image || pet.image_url!} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/40 group-hover:bg-transparent transition-colors" />
                                        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                                            <p className="text-xs text-white font-medium truncate">{pet.name}</p>
                                        </div>
                                    </div>
                                ))}
                                {pets.filter(p => p.image || p.image_url).length === 0 && (
                                    <div className="col-span-full py-20 text-center text-[#B8B8B8]/40">
                                        No pets with images found.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Header / Cover */}
                <div
                    className="relative h-48 bg-gradient-to-r from-[#1A1A1A] via-[#0D0D0D] to-[#1A1A1A] shrink-0 border-b border-[#C5A059]/10 cursor-pointer"
                    onDoubleClick={() => setIsMaximized(!isMaximized)}
                >
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0D0D0D] to-transparent"></div>
                    <div className="absolute top-4 right-4 z-10 flex gap-2">
                        {/* Maximize Button */}
                        <button
                            onClick={() => setIsMaximized(!isMaximized)}
                            className="w-8 h-8 rounded-full bg-[#0A0A0A]/60 hover:bg-[#C5A059]/20 text-[#B8B8B8] hover:text-[#F5F5F0] flex items-center justify-center transition-colors"
                        >
                            {isMaximized ? (
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 14h6m-6 0v6m0-6l6 6m10-10h-6m6 0V4m0 6l-6-6" /></svg>
                            ) : (
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                            )}
                        </button>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-full bg-[#0A0A0A]/60 hover:bg-[#C5A059]/20 text-[#B8B8B8] hover:text-[#F5F5F0] flex items-center justify-center transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>

                    {/* Profile Info Overlay - COMPACT MODE (Inside Cover) */}
                    <div className="absolute bottom-4 left-6 flex items-end gap-4 z-20 w-[calc(100%-3rem)]">
                        <div className="relative group">
                            <div className={`w-24 h-24 rounded-full border-4 border-[#0D0D0D] bg-gradient-to-br from-[#C5A059] to-[#8B7355] shadow-lg overflow-hidden flex items-center justify-center text-3xl font-bold text-[#0A0A0A] shrink-0 ${isEditing ? 'cursor-pointer hover:opacity-80' : ''}`}
                                onClick={() => isEditing && document.getElementById('avatar-upload')?.click()}>
                                {profile?.avatar_url ? (
                                    <img src={profile.avatar_url} className="w-full h-full object-cover" />
                                ) : (
                                    profile?.full_name?.[0]?.toUpperCase() || 'U'
                                )}
                                {isEditing && (
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    </div>
                                )}
                            </div>

                            {/* NEW: Select from Pets Button */}
                            {isEditing && (
                                <button
                                    type="button"
                                    onClick={() => setShowPetSelector(true)}
                                    className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-[10px] bg-[#1A1A1A] border border-[#C5A059]/30 text-[#C5A059] px-2 py-0.5 rounded-full whitespace-nowrap hover:bg-[#C5A059] hover:text-[#0A0A0A] transition-colors shadow-lg z-20"
                                >
                                    Select from Pets
                                </button>
                            )}

                            <input
                                type="file"
                                id="avatar-upload"
                                className="hidden"
                                accept="image/*"
                                onChange={handleAvatarChange}
                                disabled={!isEditing}
                            />
                        </div>
                        <div className="pb-2 mb-1 flex-1 min-w-0">
                            {isEditing ? (
                                <input
                                    type="text"
                                    value={editForm.full_name}
                                    onChange={e => setEditForm({ ...editForm, full_name: e.target.value })}
                                    className="text-2xl font-bold text-[#F5F5F0] bg-[#0D0D0D]/50 border border-[#C5A059]/30 rounded px-2 w-full max-w-md focus:outline-none focus:border-[#C5A059]"
                                    placeholder="Enter full name"
                                />
                            ) : (
                                <h2 className="text-2xl font-['Playfair_Display'] font-bold text-[#F5F5F0] flex items-center gap-2 truncate">
                                    {profile?.full_name || 'Breeder'}
                                    {(profile?.role === 'admin' || profile?.account_type === 'breeder') && (
                                        <span className="bg-[#C5A059] text-[#0A0A0A] text-[10px] uppercase px-1.5 py-0.5 rounded shadow-sm align-middle shrink-0 font-bold">PRO</span>
                                    )}
                                </h2>
                            )}

                            <div className="flex items-center gap-4 text-sm text-[#B8B8B8] mt-1">
                                {isEditing ? (
                                    <div className="flex items-center gap-1">
                                        <span className="text-[#C5A059]/60"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg></span>
                                        <input
                                            type="text"
                                            value={editForm.location}
                                            onChange={e => setEditForm({ ...editForm, location: e.target.value })}
                                            className="bg-[#0D0D0D]/50 border border-[#C5A059]/30 rounded px-1.5 py-0.5 text-sm w-48 focus:outline-none focus:border-[#C5A059] text-[#F5F5F0]"
                                            placeholder="Set Location"
                                        />
                                    </div>
                                ) : (
                                    <span className="flex items-center gap-1 min-w-0"><svg className="w-4 h-4 shrink-0 text-[#C5A059]/60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg> <span className="truncate">{profile?.location || 'Location not set'}</span></span>
                                )}

                                <span className="flex items-center gap-1 min-w-0"><svg className="w-4 h-4 shrink-0 text-[#C5A059]/60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg> <span className="truncate">{profile?.email || 'No email'}</span></span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Spacer Removed for Compact Layout */}
                {/* <div className="h-14 shrink-0 bg-[#0D0D0D]"></div> */}

                {/* Actions Bar */}
                <div className="px-8 py-2 flex items-center justify-between border-b border-[#C5A059]/10 shrink-0 bg-[#0D0D0D]">
                    <div className="flex gap-6">
                        <button
                            onClick={() => setActiveTab('pets')}
                            className={`pb-2 text-sm font-semibold transition-colors border-b-2 ${activeTab === 'pets' ? 'border-[#C5A059] text-[#C5A059]' : 'border-transparent text-[#B8B8B8]/60 hover:text-[#F5F5F0]'}`}
                        >
                            My Pets ({pets.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('about')}
                            className={`pb-2 text-sm font-semibold transition-colors border-b-2 ${activeTab === 'about' ? 'border-[#C5A059] text-[#C5A059]' : 'border-transparent text-[#B8B8B8]/60 hover:text-[#F5F5F0]'}`}
                        >
                            About
                        </button>
                    </div>
                    {isOwnProfile && (
                        <div className="flex gap-2">
                            {isEditing ? (
                                <>
                                    <button
                                        onClick={() => setIsEditing(false)}
                                        className="px-4 py-1.5 bg-[#1A1A1A] text-[#B8B8B8] text-xs font-bold rounded-lg hover:bg-[#C5A059]/10 transition-colors border border-[#C5A059]/20"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSaveProfile}
                                        className="px-4 py-1.5 bg-[#C5A059] text-[#0A0A0A] text-xs font-bold rounded-lg hover:bg-[#D4C4B5] transition-colors"
                                    >
                                        Save Changes
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="px-4 py-1.5 bg-[#C5A059] text-[#0A0A0A] text-xs font-bold rounded-lg hover:bg-[#D4C4B5] transition-colors"
                                >
                                    Edit Profile
                                </button>
                            )}
                            <button
                                onClick={handleSignOut}
                                className="px-4 py-1.5 bg-red-500/10 text-red-400 text-xs font-bold rounded-lg hover:bg-red-500/20 transition-colors"
                            >
                                Sign Out
                            </button>
                        </div>
                    )}
                </div>

                {/* Content Area - Scrollable */}
                <div className="flex-1 overflow-y-auto p-8 bg-[#1A1A1A]">
                    {loading ? (
                        <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-2 border-[#C5A059] border-t-transparent"></div></div>
                    ) : (
                        <>
                            {activeTab === 'pets' && (
                                <div className="columns-2 md:columns-3 xl:columns-4 gap-4 space-y-4">
                                    {pets.length > 0 ? pets.map(pet => (
                                        <PetCard
                                            key={pet.id}
                                            pet={pet}
                                            isOwner={isOwnProfile}
                                            onClick={() => { onClose(); onViewPet?.(pet); }}
                                            onPedigreeClick={() => { onClose(); onViewPet?.(pet); }}
                                            onChatClick={() => { }} // Handle chat if viewing other's profile
                                            onLikeClick={() => { }} // Handle like
                                            onBoostClick={() => window.dispatchEvent(new CustomEvent('openBoostModal', { detail: { pet } }))} // Hacky but works if modal matches
                                        />
                                    )) : (
                                        <div className="col-span-full py-12 text-center text-[#B8B8B8]/40 italic">No pets found.</div>
                                    )}
                                    {/* Add Pet Card for Owner */}
                                    {isOwnProfile && (
                                        <div className="bg-[#0D0D0D] rounded-xl border-2 border-dashed border-[#C5A059]/20 flex flex-col items-center justify-center h-[280px] hover:border-[#C5A059]/50 hover:bg-[#C5A059]/5 transition-all cursor-pointer text-[#B8B8B8]/60 hover:text-[#C5A059] break-inside-avoid mb-4" onClick={() => {
                                            onClose();
                                            document.getElementById('register-trigger')?.click();
                                            window.dispatchEvent(new Event('openRegisterPet'));
                                        }}>
                                            <div className="w-12 h-12 rounded-full bg-[#C5A059]/10 flex items-center justify-center mb-2"><span className="text-2xl text-[#C5A059]">+</span></div>
                                            <span className="text-sm font-bold">Register New Pet</span>
                                        </div>
                                    )}
                                </div>
                            )}
                            {activeTab === 'about' && (
                                <div className="bg-[#0D0D0D] p-6 rounded-xl border border-[#C5A059]/10">
                                    {isEditing ? (
                                        <div className="mb-4">
                                            <label className="text-xs font-bold uppercase text-[#C5A059]/60">Bio / Description</label>
                                            <textarea
                                                value={editForm.bio}
                                                onChange={e => setEditForm({ ...editForm, bio: e.target.value })}
                                                className="w-full mt-1 p-3 bg-[#1A1A1A] border border-[#C5A059]/20 rounded-xl focus:outline-none focus:border-[#C5A059] min-h-[120px] text-[#F5F5F0]"
                                                placeholder="Tell people about your kennel and breeding philosophy..."
                                            />
                                        </div>
                                    ) : (
                                        <>
                                            <h3 className="font-bold text-lg text-[#F5F5F0] mb-4">About {profile?.full_name}</h3>
                                            <p className="text-[#B8B8B8] leading-relaxed whitespace-pre-wrap">
                                                {profile?.bio || "This breeder hasn't added a bio yet."}
                                            </p>
                                        </>
                                    )}

                                    <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <h4 className="font-bold text-sm text-[#C5A059] uppercase tracking-wider mb-2">Contact Info</h4>
                                            <ul className="space-y-3 text-sm text-[#B8B8B8]">
                                                {isEditing ? (
                                                    <>
                                                        <li className="flex flex-col gap-1">
                                                            <span className="text-xs text-[#B8B8B8]/40">Phone</span>
                                                            <input type="text" value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} className="bg-[#1A1A1A] border border-[#C5A059]/20 rounded px-2 py-1 w-full text-[#F5F5F0]" placeholder="+66..." />
                                                        </li>
                                                        <li className="flex flex-col gap-1">
                                                            <span className="text-xs text-[#B8B8B8]/40">Line ID</span>
                                                            <input type="text" value={editForm.line_id} onChange={e => setEditForm({ ...editForm, line_id: e.target.value })} className="bg-[#1A1A1A] border border-[#C5A059]/20 rounded px-2 py-1 w-full text-[#F5F5F0]" placeholder="@lineId" />
                                                        </li>
                                                        <li className="flex flex-col gap-1">
                                                            <span className="text-xs text-[#B8B8B8]/40">Facebook</span>
                                                            <input type="text" value={editForm.facebook} onChange={e => setEditForm({ ...editForm, facebook: e.target.value })} className="bg-[#1A1A1A] border border-[#C5A059]/20 rounded px-2 py-1 w-full text-[#F5F5F0]" placeholder="Facebook URL or Name" />
                                                        </li>
                                                    </>
                                                ) : (
                                                    <>
                                                        <li className="flex items-center gap-2"><span className="w-20 text-[#B8B8B8]/40 shrink-0">Phone:</span> {profile?.phone || '-'}</li>
                                                        <li className="flex items-center gap-2"><span className="w-20 text-[#B8B8B8]/40 shrink-0">Line ID:</span> {profile?.line_id || '-'}</li>
                                                        <li className="flex items-center gap-2"><span className="w-20 text-[#B8B8B8]/40 shrink-0">Facebook:</span> {profile?.facebook || '-'}</li>
                                                    </>
                                                )}
                                            </ul>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-sm text-[#C5A059] uppercase tracking-wider mb-2">Breeding Info</h4>
                                            <ul className="space-y-3 text-sm text-[#B8B8B8]">
                                                {isEditing ? (
                                                    <>
                                                        <li className="flex flex-col gap-1">
                                                            <span className="text-xs text-[#B8B8B8]/40">Focus (Breeds)</span>
                                                            <input type="text" value={editForm.breeding_focus} onChange={e => setEditForm({ ...editForm, breeding_focus: e.target.value })} className="bg-[#1A1A1A] border border-[#C5A059]/20 rounded px-2 py-1 w-full text-[#F5F5F0]" placeholder="e.g. French Bulldog, Pomeranian" />
                                                        </li>
                                                        <li className="flex flex-col gap-1">
                                                            <span className="text-xs text-[#B8B8B8]/40">Years Experience</span>
                                                            <input type="number" value={editForm.years_experience} onChange={e => setEditForm({ ...editForm, years_experience: e.target.value })} className="bg-[#1A1A1A] border border-[#C5A059]/20 rounded px-2 py-1 w-full text-[#F5F5F0]" placeholder="e.g. 5" />
                                                        </li>
                                                    </>
                                                ) : (
                                                    <>
                                                        <li className="flex items-center gap-2"><span className="w-20 text-[#B8B8B8]/40 shrink-0">Focus:</span> {profile?.breeding_focus || 'General'}</li>
                                                        <li className="flex items-center gap-2"><span className="w-20 text-[#B8B8B8]/40 shrink-0">Experience:</span> {profile?.years_experience ? `${profile.years_experience} Years` : '-'}</li>
                                                    </>
                                                )}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default BreederProfileModal;
