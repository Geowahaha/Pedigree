import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Pet, pets } from '@/data/petData';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import PetRegistrationModal from './PetRegistrationModal';
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { getPublicPets, createPet, updatePet, deletePet, getAdminNotifications, getUsers, deleteUser, markNotificationAsRead, createUserNotification, AdminNotification, Pet as DbPet } from '@/lib/database';
import { getOwnershipClaims, approveOwnershipClaim, rejectOwnershipClaim } from '@/lib/ownership';
import type { OwnershipClaim } from '@/lib/ownership';
import { supabase } from '@/lib/supabase';
import { uploadPetImage } from '@/lib/storage';
import { UserProfile } from '@/lib/auth';
import { reindexAllPets, indexPet, generatePetDescription } from '@/lib/ai/vectorService';

interface AdminPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

type BreedingMatchAdmin = {
    id: string;
    sire_id: string | null;
    dam_id: string | null;
    match_date: string | null;
    due_date: string | null;
    status: string;
    description?: string | null;
};

type BreedingReservationAdmin = {
    id: string;
    sire_id: string | null;
    dam_id: string | null;
    user_id: string | null;
    user_contact: string | null;
    user_note: string | null;
    status: string;
    created_at: string;
    user?: { full_name?: string | null };
};

type PendingCommentAdmin = {
    id: string;
    pet_id: string;
    user_id: string;
    content: string;
    created_at: string;
    is_approved: boolean;
    user?: { full_name?: string | null };
    pet?: { name?: string | null };
};

type ChatMessageAdmin = {
    id: string;
    room_id: string;
    sender_id: string | null;
    content: string;
    message_type?: string | null;
    created_at: string;
};

type FaqEntryAdmin = {
    id: string;
    status: 'draft' | 'approved' | 'archived';
    is_active: boolean;
    scope: 'any' | 'global' | 'pet';
    category?: string | null;
    question_th?: string | null;
    question_en?: string | null;
    answer_th?: string | null;
    answer_en?: string | null;
    keywords?: string[] | null;
    priority?: number | null;
    source?: string | null;
    source_query_id?: string | null;
    created_at?: string;
    updated_at?: string;
};

type QueryPoolItem = {
    id: string;
    created_at: string;
    query: string;
    normalized_query?: string | null;
    lang?: string | null;
    source?: string | null;
    intent?: string | null;
    result?: string | null;
    context_pet_name?: string | null;
};

const AdminPanel: React.FC<AdminPanelProps> = ({ isOpen, onClose }) => {
    const { t } = useTranslation();
    const fallbackPetImage = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNjAiIGhlaWdodD0iMTYwIj48cmVjdCB3aWR0aD0iMTYwIiBoZWlnaHQ9IjE2MCIgZmlsbD0iI2YzZjRmNiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjAiIGZpbGw9IiM5Y2EzYWYiPlBldDwvdGV4dD48L3N2Zz4=';
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState<'pets' | 'verifications' | 'ownership' | 'puppy' | 'users' | 'notifications' | 'moderation' | 'ai'>('pets');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [editingPet, setEditingPet] = useState<Pet | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [showRegistrationModal, setShowRegistrationModal] = useState(false);
    const [petList, setPetList] = useState<Pet[]>([]);
    const [notifications, setNotifications] = useState<AdminNotification[]>([]);
    const [ownershipClaims, setOwnershipClaims] = useState<OwnershipClaim[]>([]);
    const [ownershipLoading, setOwnershipLoading] = useState(false);
    const [ownershipFilter, setOwnershipFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
    const [userList, setUserList] = useState<UserProfile[]>([]);
    const [selectedPets, setSelectedPets] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [breedingMatches, setBreedingMatches] = useState<BreedingMatchAdmin[]>([]);
    const [breedingReservations, setBreedingReservations] = useState<BreedingReservationAdmin[]>([]);
    const [breedingLoading, setBreedingLoading] = useState(false);
    const [pendingComments, setPendingComments] = useState<PendingCommentAdmin[]>([]);
    const [recentChatMessages, setRecentChatMessages] = useState<ChatMessageAdmin[]>([]);
    const [moderationLoading, setModerationLoading] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);
    const [roleUpdatingId, setRoleUpdatingId] = useState<string | null>(null);
    const [aiTab, setAiTab] = useState<'faq' | 'pool'>('faq');
    const [aiExpanded, setAiExpanded] = useState(false);
    const [faqFilter, setFaqFilter] = useState<'all' | 'draft' | 'approved' | 'archived'>('draft');
    const [faqEntries, setFaqEntries] = useState<FaqEntryAdmin[]>([]);
    const [queryPool, setQueryPool] = useState<QueryPoolItem[]>([]);
    const [showAllQueries, setShowAllQueries] = useState(false);
    const [faqForm, setFaqForm] = useState({
        id: '',
        status: 'draft' as 'draft' | 'approved' | 'archived',
        scope: 'any' as 'any' | 'global' | 'pet',
        category: '',
        questionTh: '',
        questionEn: '',
        answerTh: '',
        answerEn: '',
        keywords: '',
        priority: 0,
        sourceQueryId: ''
    });
    const [faqError, setFaqError] = useState('');
    const [matchModalOpen, setMatchModalOpen] = useState(false);
    const [matchError, setMatchError] = useState('');
    const [matchForm, setMatchForm] = useState({
        sireId: '',
        damId: '',
        matchDate: '',
        status: 'planned',
        description: ''
    });

    // Add New User State
    const [showAddUserModal, setShowAddUserModal] = useState(false);
    const [newUserForm, setNewUserForm] = useState({
        email: '',
        fullName: '',
        role: 'buyer' as 'buyer' | 'breeder' | 'admin',
        password: ''
    });
    const [userFormError, setUserFormError] = useState('');

    const resetMatchForm = () => {
        setMatchForm({
            sireId: '',
            damId: '',
            matchDate: '',
            status: 'planned',
            description: ''
        });
    };

    const resetFaqForm = () => {
        setFaqForm({
            id: '',
            status: 'draft',
            scope: 'any',
            category: '',
            questionTh: '',
            questionEn: '',
            answerTh: '',
            answerEn: '',
            keywords: '',
            priority: 0,
            sourceQueryId: ''
        });
        setFaqError('');
    };

    const normalizeKeywords = (value: string) => {
        return value
            .split(/[,\\n]/)
            .map(item => item.trim())
            .filter(Boolean);
    };

    const handleMatchModalChange = (open: boolean) => {
        setMatchModalOpen(open);
        if (!open) {
            setMatchError('');
            resetMatchForm();
        }
    };

    // Initial Load
    useEffect(() => {
        if (isOpen) {
            refreshData();
        }
    }, [isOpen]);

    useEffect(() => {
        if (activeTab !== 'ai' && aiExpanded) {
            setAiExpanded(false);
        }
    }, [activeTab, aiExpanded]);

    const refreshData = async () => {
        setLoading(true);
        try {
            // Fetch Pets
            const dbPets = await getPublicPets();
            const convertedPets = dbPets.map(convertDbPet);
            setPetList(convertedPets);

            // Fetch Notifications
            const notifs = await getAdminNotifications();
            setNotifications(notifs);

            // Fetch Users
            const users = await getUsers();
            setUserList(users);

            // Fetch Ownership Claims
            await loadOwnershipClaims();

            // Fetch Puppy Coming Soon data
            await loadBreedingAdmin();

            // Fetch Moderation data
            await loadModerationData();

            // Fetch AI Library data
            await loadAiLibrary();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const addDays = (value: string, days: number) => {
        const base = new Date(value);
        if (Number.isNaN(base.getTime())) return null;
        const next = new Date(base);
        next.setDate(next.getDate() + days);
        return next.toISOString().split('T')[0];
    };

    const loadBreedingAdmin = async () => {
        setBreedingLoading(true);
        try {
            const { data: matches } = await supabase
                .from('breeding_matches')
                .select('id, sire_id, dam_id, match_date, due_date, status, description')
                .order('match_date', { ascending: false });

            const { data: reservations } = await supabase
                .from('breeding_reservations')
                .select('id, sire_id, dam_id, user_id, user_contact, user_note, status, created_at, user:profiles!user_id(full_name)')
                .order('created_at', { ascending: true });

            setBreedingMatches((matches || []) as BreedingMatchAdmin[]);
            setBreedingReservations((reservations || []) as BreedingReservationAdmin[]);
        } catch (error) {
            console.error(error);
        } finally {
            setBreedingLoading(false);
        }
    };

    const loadModerationData = async () => {
        setModerationLoading(true);
        try {
            const { data: comments } = await supabase
                .from('pet_comments')
                .select('id, pet_id, user_id, content, created_at, is_approved, user:profiles!user_id(full_name), pet:pets!pet_id(name)')
                .eq('is_approved', false)
                .order('created_at', { ascending: false })
                .limit(50);

            const { data: chatMessages } = await supabase
                .from('chat_messages')
                .select('id, room_id, sender_id, content, message_type, created_at')
                .order('created_at', { ascending: false })
                .limit(50);

            setPendingComments((comments || []) as PendingCommentAdmin[]);
            setRecentChatMessages((chatMessages || []) as ChatMessageAdmin[]);
        } catch (error) {
            console.error(error);
        } finally {
            setModerationLoading(false);
        }
    };

    const loadAiLibrary = async () => {
        setAiLoading(true);
        try {
            const { data: faqData, error: faqError } = await supabase
                .from('ai_faq_entries')
                .select('id, status, is_active, scope, category, question_th, question_en, answer_th, answer_en, keywords, priority, source, source_query_id, created_at, updated_at')
                .order('updated_at', { ascending: false })
                .limit(300);
            if (faqError) throw faqError;
            setFaqEntries((faqData || []) as FaqEntryAdmin[]);

            const { data: queryData, error: queryError } = await supabase
                .from('ai_query_pool')
                .select('id, created_at, query, normalized_query, lang, source, intent, result, context_pet_name')
                .order('created_at', { ascending: false })
                .limit(300);
            if (queryError) throw queryError;
            setQueryPool((queryData || []) as QueryPoolItem[]);
        } catch (error) {
            console.error(error);
        } finally {
            setAiLoading(false);
        }
    };

    const loadOwnershipClaims = async () => {
        setOwnershipLoading(true);
        try {
            const claims = await getOwnershipClaims();
            setOwnershipClaims(claims);
        } catch (error) {
            console.error('Failed to load ownership claims:', error);
            setOwnershipClaims([]);
        } finally {
            setOwnershipLoading(false);
        }
    };

    const handleApproveOwnershipClaim = async (claim: OwnershipClaim) => {
        const notes = prompt('Admin notes (optional)') || undefined;
        try {
            await approveOwnershipClaim(claim.id, notes);
            await loadOwnershipClaims();
        } catch (error) {
            console.error(error);
            alert('Failed to approve claim.');
        }
    };

    const handleRejectOwnershipClaim = async (claim: OwnershipClaim) => {
        const notes = prompt('Admin notes (optional)') || undefined;
        try {
            await rejectOwnershipClaim(claim.id, notes);
            await loadOwnershipClaims();
        } catch (error) {
            console.error(error);
            alert('Failed to reject claim.');
        }
    };

    const handleUpdateUserRole = async (userId: string, role: 'buyer' | 'breeder' | 'admin') => {
        setRoleUpdatingId(userId);
        const updates: Partial<UserProfile> = { role };
        if (role === 'buyer' || role === 'breeder') {
            updates.account_type = role;
        }
        if (role === 'breeder') {
            updates.verified_breeder = true;
        }
        if (role === 'buyer') {
            updates.verified_breeder = false;
        }

        try {
            const { error } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', userId);
            if (error) throw error;
            setUserList(prev => prev.map(user => user.id === userId ? { ...user, ...updates } : user));
        } catch (error) {
            console.error(error);
            alert('Failed to update user role.');
        } finally {
            setRoleUpdatingId(null);
        }
    };

    const handleSelectFaq = (entry: FaqEntryAdmin) => {
        setFaqForm({
            id: entry.id,
            status: entry.status || 'draft',
            scope: (entry.scope || 'any') as 'any' | 'global' | 'pet',
            category: entry.category || '',
            questionTh: entry.question_th || '',
            questionEn: entry.question_en || '',
            answerTh: entry.answer_th || '',
            answerEn: entry.answer_en || '',
            keywords: (entry.keywords || []).join(', '),
            priority: entry.priority || 0,
            sourceQueryId: entry.source_query_id || ''
        });
        setFaqError('');
    };

    const handleUseQueryAsFaq = (item: QueryPoolItem) => {
        const isThai = item.lang === 'th' || /[\u0E01-\u0E59]/.test(item.query);
        setFaqForm({
            id: '',
            status: 'draft',
            scope: 'global',
            category: item.intent || '',
            questionTh: isThai ? item.query : '',
            questionEn: isThai ? '' : item.query,
            answerTh: '',
            answerEn: '',
            keywords: item.normalized_query || item.query,
            priority: 0,
            sourceQueryId: item.id
        });
        setFaqError('');
        setAiTab('faq');
    };

    const handleSaveFaq = async (nextStatus?: 'draft' | 'approved' | 'archived') => {
        const questionTh = faqForm.questionTh.trim();
        const questionEn = faqForm.questionEn.trim();
        const answerTh = faqForm.answerTh.trim();
        const answerEn = faqForm.answerEn.trim();
        if (!questionTh && !questionEn) {
            setFaqError('Please add a question (Thai or English).');
            return;
        }
        if (!answerTh && !answerEn) {
            setFaqError('Please add an answer (Thai or English).');
            return;
        }
        const payload = {
            status: nextStatus || faqForm.status,
            is_active: true,
            scope: faqForm.scope,
            category: faqForm.category || null,
            question_th: questionTh || null,
            question_en: questionEn || null,
            answer_th: answerTh || null,
            answer_en: answerEn || null,
            keywords: normalizeKeywords(faqForm.keywords),
            priority: Number(faqForm.priority) || 0,
            source_query_id: faqForm.sourceQueryId || null,
            source_query: questionTh || questionEn || null
        };

        try {
            if (faqForm.id) {
                const { error } = await supabase
                    .from('ai_faq_entries')
                    .update(payload)
                    .eq('id', faqForm.id);
                if (error) throw error;
            } else {
                const { data, error } = await supabase
                    .from('ai_faq_entries')
                    .insert(payload)
                    .select('id')
                    .single();
                if (error) throw error;
                setFaqForm(prev => ({ ...prev, id: data?.id || '' }));
            }
            setFaqError('');
            await loadAiLibrary();
        } catch (error) {
            console.error(error);
            setFaqError('Failed to save FAQ entry.');
        }
    };

    const handleDeleteFaq = async (id: string) => {
        if (!confirm('Delete this FAQ entry?')) return;
        try {
            const { error } = await supabase
                .from('ai_faq_entries')
                .delete()
                .eq('id', id);
            if (error) throw error;
            if (faqForm.id === id) resetFaqForm();
            await loadAiLibrary();
        } catch (error) {
            console.error(error);
            alert('Failed to delete FAQ entry.');
        }
    };

    const convertDbPet = (dbPet: DbPet): Pet => ({
        id: dbPet.id,
        name: dbPet.name,
        breed: dbPet.breed,
        type: (dbPet.type as 'dog' | 'cat') || 'dog',
        birthDate: dbPet.birth_date,
        gender: dbPet.gender || 'male',
        image: dbPet.image_url || fallbackPetImage,
        color: dbPet.color || '',
        registrationNumber: dbPet.registration_number || '',
        healthCertified: dbPet.health_certified,
        location: dbPet.location || 'Bangkok',
        owner: dbPet.owner_name || 'System',
        owner_id: dbPet.owner_id,
        ownership_status: dbPet.ownership_status,
        claimed_by: dbPet.claimed_by,
        claim_date: dbPet.claim_date,
        verification_evidence: dbPet.verification_evidence,
        parentIds: {
            sire: dbPet.pedigree?.sire_id || '',
            dam: dbPet.pedigree?.dam_id || '',
            sireStatus: (dbPet.father_verified_status as any) || 'verified',
            damStatus: (dbPet.mother_verified_status as any) || 'verified'
        }
    });

    const formatShortId = (value?: string | null) => {
        if (!value) return '-';
        if (value.length <= 8) return value;
        return `${value.slice(0, 4)}...${value.slice(-4)}`;
    };

    const getUserLabel = (userId?: string | null) => {
        if (!userId) return 'Unknown';
        const found = userList.find(user => user.id === userId);
        return found?.full_name || found?.email || formatShortId(userId);
    };

    const normalizeGender = (value?: string | null) => (value || '').trim().toLowerCase();
    const isMalePet = (pet?: Pick<Pet, 'gender'> | null) => {
        const gender = normalizeGender(pet?.gender);
        return gender === 'male' || gender === 'm' || gender === 'boy';
    };
    const isFemalePet = (pet?: Pick<Pet, 'gender'> | null) => {
        const gender = normalizeGender(pet?.gender);
        return gender === 'female' || gender === 'f' || gender === 'girl';
    };

    const getPetById = (petId?: string | null) => petList.find(pet => pet.id === petId);

    const getPetLabel = (petId?: string | null) => {
        const pet = getPetById(petId);
        return pet ? pet.name : formatShortId(petId);
    };

    const getMatchKey = (sireId?: string | null, damId?: string | null) => `${sireId || 'none'}:${damId || 'none'}`;
    const getNotificationActionLabel = (notification: AdminNotification) => {
        switch (notification.type) {
            case 'new_pet':
                return 'Open Pet';
            case 'verification_request':
                return 'Review Claim';
            case 'breeding_report':
                return 'Review';
            case 'new_user':
                return 'Open User';
            default:
                return null;
        }
    };

    // Filter logic for Pets tab
    const filteredPets = petList.filter(pet =>
        pet.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pet.breed.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (pet.registrationNumber && pet.registrationNumber.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Filter logic for Verifications tab
    const pendingVerifications = petList.filter(pet =>
        pet.parentIds && (pet.parentIds.sireStatus === 'pending' || pet.parentIds.damStatus === 'pending')
    );
    const pendingOwnershipClaims = ownershipClaims.filter(claim => claim.status === 'pending');
    const filteredOwnershipClaims = ownershipFilter === 'all'
        ? ownershipClaims
        : ownershipClaims.filter(claim => claim.status === ownershipFilter);
    const faqDraftCount = faqEntries.filter(entry => entry.status === 'draft').length;
    const handledQueryIds = new Set(
        faqEntries.map(entry => entry.source_query_id).filter(Boolean) as string[]
    );
    const visibleQueries = showAllQueries
        ? queryPool
        : queryPool.filter(item => !handledQueryIds.has(item.id));
    const aiQueueCount = visibleQueries.length;
    const filteredFaqEntries = faqFilter === 'all'
        ? faqEntries
        : faqEntries.filter(entry => entry.status === faqFilter);
    const sireOptions = petList.filter(isMalePet);
    const damOptions = petList.filter(isFemalePet);

    const reservationsByMatch = React.useMemo(() => {
        const grouped: Record<string, BreedingReservationAdmin[]> = {};
        breedingReservations.forEach(reservation => {
            const key = getMatchKey(reservation.sire_id, reservation.dam_id);
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(reservation);
        });
        return grouped;
    }, [breedingReservations]);

    const dueDatePreview = matchForm.matchDate ? addDays(matchForm.matchDate, 63) : null;

    // Empty template for new pet
    const emptyPet: Pet = {
        id: '',
        name: '',
        breed: '',
        type: 'dog',
        gender: 'male',
        birthDate: new Date().toISOString().split('T')[0],
        image: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?q=80&w=500&auto=format&fit=crop',
        color: '',
        location: 'Bangkok, Thailand',
        owner: 'Admin',
        healthCertified: false,
        parentIds: { sire: '', dam: '', sireStatus: 'verified', damStatus: 'verified' }
    };

    const handleSavePet = async (pet: Pet) => {
        try {
            // Mapping UI 'owner' state (which is now ID or 'Admin') to owner_id
            const ownerId = pet.owner && pet.owner !== 'Admin' ? pet.owner : undefined;

            // Handle "unknown" parents as null
            const motherId = pet.parentIds?.dam && pet.parentIds.dam !== 'unknown' ? pet.parentIds.dam : undefined;
            const fatherId = pet.parentIds?.sire && pet.parentIds.sire !== 'unknown' ? pet.parentIds.sire : undefined;

            if (isCreating) {
                await createPet({
                    name: pet.name,
                    breed: pet.breed,
                    type: pet.type as 'dog' | 'cat',
                    gender: pet.gender,
                    birth_date: pet.birthDate || new Date().toISOString(),
                    image_url: pet.image,
                    color: pet.color,
                    health_certified: pet.healthCertified,
                    location: pet.location,
                    registration_number: pet.registrationNumber,
                    mother_id: motherId,
                    father_id: fatherId,
                    owner_id: ownerId
                });

                // NOTE: createPet in database.ts might not return the ID. 
                // Ensuring we index requires the ID. 
                // For now, we will rely on refreshData() to get the ID, 
                // OR we'd need to fetch the latest pet created by this user.
                // However, since 'createPet' isn't guaranteed to return ID here without checking database.ts,
                // I will add a small timeout to fetch and index the latest pet, or just alert user.
                // BETTER: Let's assume the user will 'Re-index' periodically or I'll implement a 'getLatest' helper if needed.
                // BUT, to be "Smart", I'll try to find the pet I just created by name/owner to index it.

                // Let's try to index AFTER refreshData logic if possible, or just skip auto-index on create for now 
                // if I can't get ID easily. (Updating is safe as we have ID).

                // Wait, I can search for it immediately.
                alert(`Created new pet: ${pet.name}`);

                // Attempt Auto-Index for specific pet creation
                setTimeout(async () => {
                    try {
                        // Find the pet we just made (by name/owner)
                        const dbPets = await getPublicPets();
                        const created = dbPets.find(p => p.name === pet.name && p.breed === pet.breed);
                        if (created) {
                            const textData = generatePetDescription(convertDbPet(created));
                            indexPet(created.id, textData);
                        }
                    } catch (e) { console.error("Create-time index failed", e) }
                }, 1000); // 1s delay to ensure DB propagation
            } else {
                const response = await updatePet(pet.id, {
                    name: pet.name,
                    breed: pet.breed,
                    type: pet.type as 'dog' | 'cat',
                    gender: pet.gender,
                    birth_date: pet.birthDate,
                    image_url: pet.image,
                    color: pet.color,
                    registration_number: pet.registrationNumber,
                    health_certified: pet.healthCertified,
                    location: pet.location,
                    mother_id: motherId,
                    father_id: fatherId,
                    ...(ownerId ? { owner_id: ownerId } : {})
                });
                alert(`Updated pet: ${pet.name}`);

                // --- AUTO-INDEX FOR AI ---
                // Fire and forget (don't block UI)
                const textData = generatePetDescription(pet);
                indexPet(pet.id, textData).catch(err => console.error("Auto-index failed", err));
            }
            refreshData();
            setEditingPet(null);
            setIsCreating(false);
        } catch (error: any) {
            console.error("Save failed:", error);
            alert(`Failed to save: ${error?.message || "Unknown error"}`);
        }
    };

    const handleDeletePet = async (id: string) => {
        if (confirm("Are you sure you want to delete this pet? This action cannot be undone.")) {
            try {
                // Check if it's a real DB pet (UUID) or static mock
                if (id.includes('-')) {
                    // Likely UUID or our temp ID. Try DB delete.
                    await deletePet(id);
                }
                // Also update local list
                setPetList(prev => prev.filter(p => p.id !== id));
            } catch (err) {
                // Fallback for static pets
                setPetList(prev => prev.filter(p => p.id !== id));
            }
        }
    };

    const handleVerify = async (petId: string, type: 'sire' | 'dam', action: 'verified' | 'rejected') => {
        try {
            // Update DB
            const field = type === 'sire' ? 'father_verified_status' : 'mother_verified_status';
            await updatePet(petId, {
                [field]: action
            });

            // Notify Pet Owner
            const pet = petList.find(p => p.id === petId);
            if (pet && pet.owner_id) { // Ensure owner_id is available
                await createUserNotification({
                    user_id: pet.owner_id,
                    type: 'verification',
                    title: `Pedigree Verification Update`,
                    message: `The ${type === 'sire' ? 'father' : 'mother'} verification for your pet ${pet.name} has been ${action}.`,
                    payload: { pet_id: petId }
                });
            }

            // Update Local State directly for speed, then refresh
            setPetList(prev => prev.map(p => {
                if (p.id === petId && p.parentIds) {
                    return {
                        ...p,
                        parentIds: {
                            ...p.parentIds,
                            [type === 'sire' ? 'sireStatus' : 'damStatus']: action
                        }
                    };
                }
                return p;
            }));

            // Optional: Refresh in background to sync
            // refreshData(); 
        } catch (error) {
            console.error("Verification failed:", error);
            alert("Failed to update verification status.");
        }
    };

    const startCreate = () => {
        setEditingPet(emptyPet);
        setIsCreating(true);
    };

    const toggleSelectAll = () => {
        if (selectedPets.length === filteredPets.length) {
            setSelectedPets([]);
        } else {
            setSelectedPets(filteredPets.map(p => p.id));
        }
    };

    const toggleSelectPet = (id: string) => {
        setSelectedPets(prev =>
            prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
        );
    };

    const exportToCSV = () => {
        const petsToExport = selectedPets.length > 0
            ? petList.filter(p => selectedPets.includes(p.id))
            : petList;

        const headers = ['ID', 'Name', 'Breed', 'Type', 'Gender', 'Birth Date', 'Color', 'Location', 'Owner', 'Registration Number', 'Health Certified'];
        const rows = petsToExport.map(pet => [
            pet.id,
            pet.name,
            pet.breed,
            pet.type,
            pet.gender,
            pet.birthDate,
            pet.color,
            pet.location,
            pet.owner,
            pet.registrationNumber || '',
            pet.healthCertified ? 'Yes' : 'No'
        ]);

        const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `eibpo_export_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        alert(`Exported ${petsToExport.length} pet(s) to CSV`);
    };

    const bulkDelete = async () => {
        if (selectedPets.length === 0) {
            alert('No pets selected');
            return;
        }
        if (confirm(`Are you sure you want to delete ${selectedPets.length} selected pet(s)? This action cannot be undone.`)) {
            try {
                // Delete from DB (Parallel)
                await Promise.all(selectedPets.map(id => deletePet(id)));

                setPetList(petList.filter(p => !selectedPets.includes(p.id)));
                setSelectedPets([]);
                alert(`Deleted ${selectedPets.length} pet(s)`);
            } catch (error) {
                console.error("Bulk delete failed:", error);
                alert("Failed to delete some pets. Please try again.");
            }
        }
    };

    const handleCreateMatch = async () => {
        if (!matchForm.sireId || !matchForm.damId || !matchForm.matchDate) {
            setMatchError('Please fill in all required fields.');
            return;
        }
        if (matchForm.sireId === matchForm.damId) {
            setMatchError('Sire and dam must be different pets.');
            return;
        }
        const selectedSire = getPetById(matchForm.sireId);
        const selectedDam = getPetById(matchForm.damId);
        if (selectedSire && !isMalePet(selectedSire)) {
            setMatchError('Selected sire must be male. Update pet gender if needed.');
            return;
        }
        if (selectedDam && !isFemalePet(selectedDam)) {
            setMatchError('Selected dam must be female. Update pet gender if needed.');
            return;
        }
        setMatchError('');
        try {
            const dueDate = addDays(matchForm.matchDate, 63);
            const { error } = await supabase
                .from('breeding_matches')
                .insert({
                    sire_id: matchForm.sireId,
                    dam_id: matchForm.damId,
                    match_date: matchForm.matchDate,
                    due_date: dueDate,
                    status: matchForm.status,
                    description: matchForm.description || null
                });

            if (error) throw error;
            setMatchModalOpen(false);
            resetMatchForm();
            await loadBreedingAdmin();
        } catch (error) {
            console.error(error);
            setMatchError('Failed to add match.');
        }
    };

    const handleUpdateMatchStatus = async (matchId: string, status: string) => {
        try {
            const { error } = await supabase
                .from('breeding_matches')
                .update({ status })
                .eq('id', matchId);
            if (error) throw error;
            setBreedingMatches(prev => prev.map(match => match.id === matchId ? { ...match, status } : match));
        } catch (error) {
            console.error(error);
            alert('Failed to update match.');
        }
    };

    const handleDeleteMatch = async (matchId: string) => {
        if (!confirm('Delete this match?')) return;
        try {
            const { error } = await supabase
                .from('breeding_matches')
                .delete()
                .eq('id', matchId);
            if (error) throw error;
            setBreedingMatches(prev => prev.filter(match => match.id !== matchId));
        } catch (error) {
            console.error(error);
            alert('Failed to delete match.');
        }
    };

    const handleNotificationAction = async (notification: AdminNotification) => {
        if (notification.status === 'unread') {
            await markNotificationAsRead(notification.id);
            setNotifications(prev => prev.map(item => (
                item.id === notification.id ? { ...item, status: 'read' } : item
            )));
        }

        setMobileMenuOpen(false);

        switch (notification.type) {
            case 'new_pet': {
                setActiveTab('pets');
                if (notification.reference_id) {
                    const pet = getPetById(notification.reference_id);
                    if (pet) {
                        setEditingPet(pet);
                        setIsCreating(false);
                    } else {
                        setEditingPet(null);
                        setSearchTerm(notification.reference_id);
                    }
                }
                break;
            }
            case 'verification_request': {
                setActiveTab('ownership');
                setOwnershipFilter('pending');
                break;
            }
            case 'breeding_report': {
                setActiveTab('puppy');
                break;
            }
            case 'new_user': {
                setActiveTab('users');
                break;
            }
            default:
                break;
        }
    };

    const handleApproveCommentAdmin = async (commentId: string) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const { error } = await supabase
                .from('pet_comments')
                .update({
                    is_approved: true,
                    approved_by: user?.id || null,
                    approved_at: new Date().toISOString()
                })
                .eq('id', commentId);
            if (error) throw error;
            setPendingComments(prev => prev.filter(comment => comment.id !== commentId));
        } catch (error) {
            console.error(error);
            alert('Failed to approve comment.');
        }
    };

    const handleDeleteCommentAdmin = async (commentId: string) => {
        if (!confirm('Delete this comment?')) return;
        try {
            const { error } = await supabase
                .from('pet_comments')
                .delete()
                .eq('id', commentId);
            if (error) throw error;
            setPendingComments(prev => prev.filter(comment => comment.id !== commentId));
        } catch (error) {
            console.error(error);
            alert('Failed to delete comment.');
        }
    };

    const handleDeleteChatMessage = async (messageId: string) => {
        if (!confirm('Delete this message?')) return;
        try {
            const { error } = await supabase
                .from('chat_messages')
                .delete()
                .eq('id', messageId);
            if (error) throw error;
            setRecentChatMessages(prev => prev.filter(message => message.id !== messageId));
        } catch (error) {
            console.error(error);
            alert('Failed to delete message.');
        }
    };


    const handleAddNewUser = async () => {
        // Validate form - only email required now
        if (!newUserForm.email) {
            setUserFormError('Email is required');
            return;
        }

        try {
            const inviteRedirectTo = import.meta.env.VITE_INVITE_REDIRECT_URL || `${window.location.origin}/`;
            const accountType = newUserForm.role === 'buyer' ? 'buyer' : 'breeder';
            const autoVerified = newUserForm.role !== 'buyer';

            // Send magic link invitation instead of creating user directly
            const { data, error } = await supabase.auth.signInWithOtp({
                email: newUserForm.email,
                options: {
                    data: {
                        full_name: newUserForm.fullName,
                        role: newUserForm.role,
                        account_type: accountType,
                        verified_breeder: autoVerified,
                        invited_by: 'admin'
                    },
                    emailRedirectTo: inviteRedirectTo
                }
            });

            if (error) throw error;

            // Show success message
            alert(`✅ Invitation sent to ${newUserForm.email}!\n\n` +
                `The user will receive an email with a magic link to sign in.\n\n` +
                `Role: ${newUserForm.role}\n` +
                `Name: ${newUserForm.fullName || 'Not specified'}`);

            setShowAddUserModal(false);
            setNewUserForm({ email: '', fullName: '', role: 'buyer', password: '' });
            setUserFormError('');

        } catch (error: any) {
            console.error('Error sending invitation:', error);
            setUserFormError(error.message || 'Failed to send invitation');
        }
    };


    const handleToggleBreederVerification = async (userId: string, nextValue: boolean) => {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ verified_breeder: nextValue })
                .eq('id', userId);
            if (error) throw error;

            setUserList(prev => prev.map(user => (
                user.id === userId ? { ...user, verified_breeder: nextValue } : user
            )));

            try {
                await createUserNotification({
                    user_id: userId,
                    type: 'verification',
                    title: nextValue ? 'Breeder Verified' : 'Breeder Verification Updated',
                    message: nextValue
                        ? 'Your breeder account has been approved by admin.'
                        : 'Your breeder verification has been updated by admin.',
                    payload: { verified_breeder: nextValue }
                });
            } catch (notifError) {
                console.error('Failed to send verification notification', notifError);
            }
        } catch (error) {
            console.error(error);
            alert('Failed to update breeder verification.');
        }
    };

    const handleUpdateReservationStatus = async (reservation: BreedingReservationAdmin, status: string) => {
        try {
            const { error } = await supabase
                .from('breeding_reservations')
                .update({ status })
                .eq('id', reservation.id);
            if (error) throw error;
            setBreedingReservations(prev => prev.map(item => item.id === reservation.id ? { ...item, status } : item));

            if (reservation.user_id) {
                await createUserNotification({
                    user_id: reservation.user_id,
                    type: 'puppy',
                    title: 'Reservation Update',
                    message: `Your reservation status is now ${status}.`,
                    payload: { reservation_id: reservation.id }
                });
            }
        } catch (error) {
            console.error(error);
            alert('Failed to update reservation.');
        }
    };


    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent
                className={`${aiExpanded ? 'max-w-[95vw] w-[95vw] h-[95vh]' : 'max-w-6xl h-[90vh]'} max-h-[95vh] flex flex-col p-0 gap-0 bg-[#0A0A0A] border-[#C5A059]/20`}
            >
                <div className="p-4 md:p-6 border-b border-[#C5A059]/20 bg-[#0D0D0D] flex justify-between items-center sticky top-0 z-20">
                    <div className="flex items-center gap-3">
                        {/* Mobile Menu Trigger */}
                        <div className="md:hidden">
                            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                                <SheetTrigger asChild>
                                    <Button variant="ghost" size="icon" className="-ml-2">
                                        <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                                    </Button>
                                </SheetTrigger>
                                <SheetContent side="left" className="w-72 p-0">
                                    <div className="p-4 border-b bg-primary/5">
                                        <h2 className="text-lg font-bold text-primary">Admin Menu</h2>
                                    </div>
                                    <nav className="p-4 space-y-1">
                                        <Button
                                            variant="ghost"
                                            onClick={() => { setActiveTab('pets'); setEditingPet(null); setMobileMenuOpen(false); }}
                                            className={`w-full justify-start gap-3 ${activeTab === 'pets' ? 'bg-primary/10 text-primary' : 'text-gray-600'}`}
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                                            Manage Pets
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            onClick={() => { setActiveTab('verifications'); setEditingPet(null); setMobileMenuOpen(false); }}
                                            className={`w-full justify-start gap-3 ${activeTab === 'verifications' ? 'bg-primary/10 text-primary' : 'text-gray-600'}`}
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            Verifications
                                            {pendingVerifications.length > 0 && (
                                                <span className="ml-auto bg-red-100 text-red-600 py-0.5 px-2 rounded-full text-xs">{pendingVerifications.length}</span>
                                            )}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            onClick={() => { setActiveTab('ownership'); setEditingPet(null); setMobileMenuOpen(false); }}
                                            className={`w-full justify-start gap-3 ${activeTab === 'ownership' ? 'bg-primary/10 text-primary' : 'text-gray-600'}`}
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m2 7H7a2 2 0 01-2-2V5a2 2 0 012-2h7l5 5v9a2 2 0 01-2 2z" /></svg>
                                            Ownership Claims
                                            {pendingOwnershipClaims.length > 0 && (
                                                <span className="ml-auto bg-amber-100 text-amber-700 py-0.5 px-2 rounded-full text-xs">{pendingOwnershipClaims.length}</span>
                                            )}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            onClick={() => { setActiveTab('puppy'); setEditingPet(null); setMobileMenuOpen(false); }}
                                            className={`w-full justify-start gap-3 ${activeTab === 'puppy' ? 'bg-primary/10 text-primary' : 'text-gray-600'}`}
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 1.567-3 3.5S10.343 15 12 15s3-1.567 3-3.5S13.657 8 12 8zm7 3.5c0-1.147-.249-2.21-.695-3.172l1.576-1.576-1.414-1.414-1.576 1.576A7.48 7.48 0 0012 4.5a7.48 7.48 0 00-3.891 1.114L6.533 4.038 5.12 5.452l1.576 1.576A7.482 7.482 0 005 11.5c0 4.142 3.134 7.5 7 7.5s7-3.358 7-7.5z" /></svg>
                                            Puppy Coming Soon
                                            {breedingMatches.length > 0 && (
                                                <span className="ml-auto bg-blue-100 text-blue-600 py-0.5 px-2 rounded-full text-xs">{breedingMatches.length}</span>
                                            )}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            onClick={() => { setActiveTab('users'); setMobileMenuOpen(false); }}
                                            className={`w-full justify-start gap-3 ${activeTab === 'users' ? 'bg-primary/10 text-primary' : 'text-gray-600'}`}
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                                            User Management
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            onClick={() => { setActiveTab('moderation'); setMobileMenuOpen(false); }}
                                            className={`w-full justify-start gap-3 ${activeTab === 'moderation' ? 'bg-primary/10 text-primary' : 'text-gray-600'}`}
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m2 10H7a2 2 0 01-2-2V6a2 2 0 012-2h7l5 5v11a2 2 0 01-2 2z" /></svg>
                                            Moderation
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            onClick={() => { setActiveTab('ai'); setMobileMenuOpen(false); }}
                                            className={`w-full justify-start gap-3 ${activeTab === 'ai' ? 'bg-primary/10 text-primary' : 'text-gray-600'}`}
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364-6.364-1.414 1.414M7.05 16.95l-1.414 1.414m11.314 0-1.414-1.414M7.05 7.05 5.636 5.636" /></svg>
                                            AI Library
                                            {(faqDraftCount > 0 || aiQueueCount > 0) && (
                                                <span className="ml-auto bg-amber-100 text-amber-700 py-0.5 px-2 rounded-full text-xs">
                                                    {faqDraftCount || aiQueueCount}
                                                </span>
                                            )}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            onClick={() => { setActiveTab('notifications'); setMobileMenuOpen(false); }}
                                            className={`w-full justify-start gap-3 ${activeTab === 'notifications' ? 'bg-primary/10 text-primary' : 'text-gray-600'}`}
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                                            Notifications
                                            {notifications.filter(n => n.status === 'unread').length > 0 && (
                                                <span className="ml-auto bg-red-500 text-white py-0.5 px-2 rounded-full text-xs">{notifications.filter(n => n.status === 'unread').length}</span>
                                            )}
                                        </Button>
                                    </nav>
                                </SheetContent>
                            </Sheet>
                        </div>
                        <DialogTitle className="text-xl md:text-2xl font-bold flex items-center gap-3 text-[#C5A059]">
                            <div className="p-2 bg-[#C5A059]/10 rounded-lg hidden md:block">
                                <svg className="w-6 h-6 text-[#C5A059]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                            </div>
                            System Administration
                        </DialogTitle>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden flex">
                    {/* Sidebar */}
                    <div className="w-64 bg-[#0D0D0D] border-r border-[#C5A059]/10 hidden md:block pt-4 text-sm">
                        <div className="bg-[#C5A059]/10 mx-4 p-3 rounded-xl mb-6 border border-[#C5A059]/20">
                            <p className="text-xs font-semibold text-[#C5A059]/70 uppercase tracking-wider mb-1">Total Records</p>
                            <p className="text-2xl font-bold text-[#C5A059]">{petList.length}</p>
                            <p className="text-xs text-[#B8B8B8]/60 mt-1">{pendingVerifications.length} Pending Actions</p>

                            {/* AI Vector Indexing Button */}
                            <Button
                                size="sm"
                                variant="outline"
                                className="w-full mt-3 text-xs border-[#C5A059]/20 text-[#C5A059] hover:bg-[#C5A059]/10 bg-[#1A1A1A]"
                                onClick={async () => {
                                    if (confirm("This will scan ALL pets and generate AI embeddings for smart search. It may take a while. Continue?")) {
                                        setLoading(true);
                                        try {
                                            const count = await reindexAllPets();
                                            alert(`Successfully indexed ${count} pets for Smart Search!`);
                                        } catch (e) {
                                            alert("Indexing failed.");
                                            console.error(e);
                                        } finally {
                                            setLoading(false);
                                        }
                                    }
                                }}
                            >
                                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                Re-index AI Search
                            </Button>
                        </div>

                        <nav className="space-y-1 px-2">
                            <button
                                onClick={() => { setActiveTab('pets'); setEditingPet(null); }}
                                className={`w-full flex items-center gap-3 px-4 py-3 font-medium rounded-lg transition-colors ${activeTab === 'pets' ? 'bg-[#C5A059]/10 text-[#C5A059]' : 'text-[#B8B8B8] hover:bg-[#1A1A1A]'}`}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                                Manage Pets
                            </button>
                            <button
                                onClick={() => { setActiveTab('verifications'); setEditingPet(null); }}
                                className={`w-full flex items-center gap-3 px-4 py-3 font-medium rounded-lg transition-colors ${activeTab === 'verifications' ? 'bg-[#C5A059]/10 text-[#C5A059]' : 'text-[#B8B8B8] hover:bg-[#1A1A1A]'}`}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                Verifications
                                {pendingVerifications.length > 0 && (
                                    <span className="ml-auto bg-red-100 text-red-600 py-0.5 px-2 rounded-full text-xs">{pendingVerifications.length}</span>
                                )}
                            </button>
                            <button
                                onClick={() => { setActiveTab('ownership'); setEditingPet(null); }}
                                className={`w-full flex items-center gap-3 px-4 py-3 font-medium rounded-lg transition-colors ${activeTab === 'ownership' ? 'bg-[#C5A059]/10 text-[#C5A059]' : 'text-[#B8B8B8] hover:bg-[#1A1A1A]'}`}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m2 7H7a2 2 0 01-2-2V5a2 2 0 012-2h7l5 5v9a2 2 0 01-2 2z" /></svg>
                                Ownership Claims
                                {pendingOwnershipClaims.length > 0 && (
                                    <span className="ml-auto bg-amber-100 text-amber-700 py-0.5 px-2 rounded-full text-xs">{pendingOwnershipClaims.length}</span>
                                )}
                            </button>
                            <button
                                onClick={() => { setActiveTab('puppy'); setEditingPet(null); }}
                                className={`w-full flex items-center gap-3 px-4 py-3 font-medium rounded-lg transition-colors ${activeTab === 'puppy' ? 'bg-[#C5A059]/10 text-[#C5A059]' : 'text-[#B8B8B8] hover:bg-[#1A1A1A]'}`}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 1.567-3 3.5S10.343 15 12 15s3-1.567 3-3.5S13.657 8 12 8zm7 3.5c0-1.147-.249-2.21-.695-3.172l1.576-1.576-1.414-1.414-1.576 1.576A7.48 7.48 0 0012 4.5a7.48 7.48 0 00-3.891 1.114L6.533 4.038 5.12 5.452l1.576 1.576A7.482 7.482 0 005 11.5c0 4.142 3.134 7.5 7 7.5s7-3.358 7-7.5z" /></svg>
                                Puppy Coming Soon
                                {breedingMatches.length > 0 && (
                                    <span className="ml-auto bg-blue-100 text-blue-600 py-0.5 px-2 rounded-full text-xs">{breedingMatches.length}</span>
                                )}
                            </button>
                            <button
                                onClick={() => setActiveTab('users')}
                                className={`w-full flex items-center gap-3 px-4 py-3 font-medium rounded-lg transition-colors ${activeTab === 'users' ? 'bg-[#C5A059]/10 text-[#C5A059]' : 'text-[#B8B8B8] hover:bg-[#1A1A1A]'}`}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                                User Management
                            </button>
                            <button
                                onClick={() => setActiveTab('moderation')}
                                className={`w-full flex items-center gap-3 px-4 py-3 font-medium rounded-lg transition-colors ${activeTab === 'moderation' ? 'bg-[#C5A059]/10 text-[#C5A059]' : 'text-[#B8B8B8] hover:bg-[#1A1A1A]'}`}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m2 10H7a2 2 0 01-2-2V6a2 2 0 012-2h7l5 5v11a2 2 0 01-2 2z" /></svg>
                                Moderation
                            </button>
                            <button
                                onClick={() => setActiveTab('ai')}
                                className={`w-full flex items-center gap-3 px-4 py-3 font-medium rounded-lg transition-colors ${activeTab === 'ai' ? 'bg-[#C5A059]/10 text-[#C5A059]' : 'text-[#B8B8B8] hover:bg-[#1A1A1A]'}`}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364-6.364-1.414 1.414M7.05 16.95l-1.414 1.414m11.314 0-1.414-1.414M7.05 7.05 5.636 5.636" /></svg>
                                AI Library
                                {(faqDraftCount > 0 || aiQueueCount > 0) && (
                                    <span className="ml-auto bg-amber-100 text-amber-700 py-0.5 px-2 rounded-full text-xs">
                                        {faqDraftCount || aiQueueCount}
                                    </span>
                                )}
                            </button>
                            <button
                                onClick={() => setActiveTab('notifications')}
                                className={`w-full flex items-center gap-3 px-4 py-3 font-medium rounded-lg transition-colors ${activeTab === 'notifications' ? 'bg-[#C5A059]/10 text-[#C5A059]' : 'text-[#B8B8B8] hover:bg-[#1A1A1A]'}`}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                                Notifications
                                {notifications.filter(n => n.status === 'unread').length > 0 && (
                                    <span className="ml-auto bg-red-500 text-white py-0.5 px-2 rounded-full text-xs">{notifications.filter(n => n.status === 'unread').length}</span>
                                )}
                            </button>
                        </nav>
                    </div>

                    {/* Main Content Area */}
                    <div className="flex-1 flex flex-col min-w-0 bg-[#1A1A1A]">
                        {/* 1. PET EDITOR (Overlay on 'pets' tab) */}
                        {activeTab === 'pets' && editingPet ? (
                            <div className="flex-1 flex flex-col h-full">
                                <div className="p-4 border-b border-[#C5A059]/10 flex items-center justify-between bg-[#0D0D0D]">
                                    <h3 className="font-bold text-lg text-[#F5F5F0]">
                                        {isCreating ? 'Create New Entry' : `Editing: ${editingPet.name}`}
                                    </h3>
                                    <div className="flex gap-2">
                                        <Button variant="outline" onClick={() => { setEditingPet(null); setIsCreating(false); }} className="border-[#C5A059]/20 text-[#B8B8B8] hover:bg-[#1A1A1A]">Cancel</Button>
                                        <Button onClick={() => handleSavePet(editingPet)} className="bg-[#C5A059] text-[#0A0A0A] hover:bg-[#D4C4B5]">
                                            {isCreating ? 'Create Record' : 'Save Changes'}
                                        </Button>
                                    </div>
                                </div>

                                <ScrollArea className="flex-1 p-6">
                                    <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 pb-20">
                                        {/* Basic Info */}
                                        <div className="space-y-6">
                                            <div className="flex items-center gap-2 pb-2 border-b border-[#C5A059]/20 text-[#C5A059] font-semibold">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" /></svg>
                                                Identity
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label>Name</Label>
                                                    <Input value={editingPet.name} onChange={e => setEditingPet({ ...editingPet, name: e.target.value })} placeholder="Pet Name" />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Registration No.</Label>
                                                    <div className="flex gap-2">
                                                        <Input
                                                            value={editingPet.registrationNumber || ''}
                                                            onChange={e => setEditingPet({ ...editingPet, registrationNumber: e.target.value })}
                                                            placeholder="TRD-XXXX"
                                                        />
                                                        <Button
                                                            variant="outline"
                                                            onClick={() => {
                                                                const year = new Date().getFullYear();
                                                                const random = Math.floor(1000 + Math.random() * 9000); // 4 digit random
                                                                const newId = `TRD-${year}-${random}`;
                                                                setEditingPet({ ...editingPet, registrationNumber: newId });
                                                            }}
                                                            title="Generate ID"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label>Species</Label>
                                                    <Select value={editingPet.type} onValueChange={(val: any) => setEditingPet({ ...editingPet, type: val })}>
                                                        <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="dog">Dog</SelectItem>
                                                            <SelectItem value="cat">Cat</SelectItem>
                                                            <SelectItem value="horse">Horse</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Gender</Label>
                                                    <Select value={editingPet.gender} onValueChange={(val: any) => setEditingPet({ ...editingPet, gender: val })}>
                                                        <SelectTrigger className="bg-white"><SelectValue /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="male">Male</SelectItem>
                                                            <SelectItem value="female">Female</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <Label>Breed</Label>
                                                <Select
                                                    value={editingPet.breed}
                                                    onValueChange={(val) => setEditingPet({ ...editingPet, breed: val })}
                                                >
                                                    <SelectTrigger className="bg-white">
                                                        <SelectValue placeholder="Select Breed" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="Thai Ridgeback Dog">Thai Ridgeback Dog</SelectItem>
                                                        <SelectItem value="Thai Bangkaew">Thai Bangkaew</SelectItem>
                                                        <SelectItem value="Poodle">Poodle</SelectItem>
                                                        <SelectItem value="Golden Retriever">Golden Retriever</SelectItem>
                                                        <SelectItem value="Other">Other (Type manually)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                {/* Fallback for manual entry if needed, but for now Select covers 90% */}
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label>Birth Date</Label>
                                                    <Input type="date" value={editingPet.birthDate} onChange={e => setEditingPet({ ...editingPet, birthDate: e.target.value })} />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Color</Label>
                                                    <Input value={editingPet.color} onChange={e => setEditingPet({ ...editingPet, color: e.target.value })} />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Details & Pedigree */}
                                        <div className="space-y-6">
                                            <div className="flex items-center gap-2 pb-2 border-b text-primary font-semibold">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                                Details & Pedigree
                                            </div>

                                            <div className="space-y-2">
                                                <Label>Pet Photo</Label>
                                                <div className="flex gap-4 items-start">
                                                    <div className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 overflow-hidden flex items-center justify-center bg-gray-50 relative group">
                                                        {editingPet.image ? (
                                                            <img src={editingPet.image} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                        )}
                                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                            <label className="cursor-pointer text-white text-xs font-bold text-center px-2">
                                                                Change
                                                                <input
                                                                    type="file"
                                                                    className="hidden"
                                                                    accept="image/*"
                                                                    onChange={async (e) => {
                                                                        if (e.target.files?.[0]) {
                                                                            const file = e.target.files[0];
                                                                            try {
                                                                                // Show local preview immediately
                                                                                const previewUrl = URL.createObjectURL(file);
                                                                                setEditingPet({ ...editingPet, image: previewUrl });

                                                                                // Upload to Cloud
                                                                                const publicUrl = await uploadPetImage(file);

                                                                                // Update with real URL
                                                                                setEditingPet(prev => prev ? ({ ...prev, image: publicUrl }) : null);
                                                                            } catch (err) {
                                                                                console.error(err);
                                                                                alert('Failed to upload image. Please try again.');
                                                                            }
                                                                        }
                                                                    }}
                                                                />
                                                            </label>
                                                        </div>
                                                    </div>
                                                    <div className="flex-1 space-y-2">
                                                        <Input
                                                            value={editingPet.image}
                                                            onChange={e => setEditingPet({ ...editingPet, image: e.target.value })}
                                                            placeholder="or paste Image URL..."
                                                            className="text-xs font-mono"
                                                        />
                                                        <p className="text-xs text-muted-foreground">
                                                            Upload a photo or paste a direct URL. Recommended size: 500x500px.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label>Owner (Admin Override)</Label>
                                                    <Select
                                                        value={editingPet.owner}
                                                        onValueChange={(val) => setEditingPet({ ...editingPet, owner: val })}
                                                    >
                                                        <SelectTrigger className="bg-white">
                                                            <SelectValue placeholder="Select Owner" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="Admin">Admin (System)</SelectItem>
                                                            {userList.map(u => (
                                                                <SelectItem key={u.id} value={u.id}>
                                                                    {u.full_name || u.email}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>Location</Label>
                                                    <Input value={editingPet.location} onChange={e => setEditingPet({ ...editingPet, location: e.target.value })} />
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 py-2">
                                                <Checkbox
                                                    id="cert"
                                                    checked={editingPet.healthCertified}
                                                    onCheckedChange={(checked: boolean) => setEditingPet({ ...editingPet, healthCertified: checked })}
                                                />
                                                <Label htmlFor="cert" className="cursor-pointer">Health Certified Record</Label>
                                            </div>

                                            <div className="p-4 bg-muted/20 rounded-xl space-y-4 border border-dashed border-primary/20">
                                                <h4 className="text-sm font-bold text-gray-700">Pedigree Connections</h4>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-2">
                                                        <div className="flex justify-between">
                                                            <Label className="text-xs uppercase">Sire (Father)</Label>
                                                            <Label className="text-xs uppercase text-right">Status</Label>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <Select
                                                                value={editingPet.parentIds?.sire || ''}
                                                                onValueChange={(val) => setEditingPet({
                                                                    ...editingPet,
                                                                    parentIds: { ...editingPet.parentIds, sire: val, sireStatus: editingPet.parentIds?.sireStatus || 'verified' }
                                                                } as any)}
                                                            >
                                                                <SelectTrigger className="h-8 text-xs flex-1 bg-white">
                                                                    <SelectValue placeholder="Select Sire" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="unknown">Unknown / None</SelectItem>
                                                                    {petList
                                                                        .filter(p => isMalePet(p) && p.id !== editingPet.id)
                                                                        .map(p => (
                                                                            <SelectItem key={p.id} value={p.id}>
                                                                                {p.name} {p.registrationNumber ? `(${p.registrationNumber})` : ''}
                                                                            </SelectItem>
                                                                        ))}
                                                                </SelectContent>
                                                            </Select>

                                                            <Select
                                                                value={editingPet.parentIds?.sireStatus || 'verified'}
                                                                onValueChange={(val: any) => setEditingPet({
                                                                    ...editingPet,
                                                                    parentIds: { ...editingPet.parentIds, sireStatus: val }
                                                                } as any)}
                                                            >
                                                                <SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="verified">Verified</SelectItem>
                                                                    <SelectItem value="pending">Pending</SelectItem>
                                                                    <SelectItem value="rejected">Rejected</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <div className="flex justify-between">
                                                            <Label className="text-xs uppercase">Dam (Mother)</Label>
                                                            <Label className="text-xs uppercase text-right">Status</Label>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <Select
                                                                value={editingPet.parentIds?.dam || ''}
                                                                onValueChange={(val) => setEditingPet({
                                                                    ...editingPet,
                                                                    parentIds: { ...editingPet.parentIds, dam: val, damStatus: editingPet.parentIds?.damStatus || 'verified' }
                                                                } as any)}
                                                            >
                                                                <SelectTrigger className="h-8 text-xs flex-1 bg-white">
                                                                    <SelectValue placeholder="Select Dam" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="unknown">Unknown / None</SelectItem>
                                                                    {petList
                                                                        .filter(p => isFemalePet(p) && p.id !== editingPet.id)
                                                                        .map(p => (
                                                                            <SelectItem key={p.id} value={p.id}>
                                                                                {p.name} {p.registrationNumber ? `(${p.registrationNumber})` : ''}
                                                                            </SelectItem>
                                                                        ))}
                                                                </SelectContent>
                                                            </Select>

                                                            <Select
                                                                value={editingPet.parentIds?.damStatus || 'verified'}
                                                                onValueChange={(val: any) => setEditingPet({
                                                                    ...editingPet,
                                                                    parentIds: { ...editingPet.parentIds, damStatus: val }
                                                                } as any)}
                                                            >
                                                                <SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="verified">Verified</SelectItem>
                                                                    <SelectItem value="pending">Pending</SelectItem>
                                                                    <SelectItem value="rejected">Rejected</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </ScrollArea>
                            </div>
                        ) : activeTab === 'pets' ? (
                            /* --- LIST MODE --- */
                            <div className="flex-1 flex flex-col min-h-0">
                                {/* Bulk Actions Toolbar */}
                                {selectedPets.length > 0 && (
                                    <div className="p-3 bg-primary/10 border-b border-primary/20 flex items-center gap-4">
                                        <span className="text-sm font-bold text-primary">
                                            {selectedPets.length} pet(s) selected
                                        </span>
                                        <div className="flex gap-2 ml-auto">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={exportToCSV}
                                                className="text-green-700 border-green-300 hover:bg-green-50"
                                            >
                                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                                Export CSV
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={bulkDelete}
                                                className="text-red-700 border-red-300 hover:bg-red-50"
                                            >
                                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                Delete
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => setSelectedPets([])}
                                            >
                                                Clear
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                <div className="p-4 border-b flex gap-4 bg-gray-50/50">

                                    <div className="relative flex-1 max-w-md">
                                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                        <Input
                                            placeholder="Search by name, breed, or Reg ID..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="pl-9 bg-white"
                                        />
                                    </div>
                                    <Button className="ml-auto bg-white border border-gray-200 text-gray-700 shadow-sm hover:bg-gray-50 mr-2" onClick={() => setShowRegistrationModal(true)}>
                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                        OCR Register
                                    </Button>
                                    <Button className="bg-primary text-white shadow-sm hover:bg-primary/90" onClick={startCreate}>
                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                        Add New Record
                                    </Button>
                                </div>

                                <ScrollArea className="flex-1 bg-gray-50/30">
                                    <div className="p-4">
                                        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                                            <table className="w-full text-left text-sm">
                                                <thead className="bg-gray-50 border-b text-gray-600 font-medium">
                                                    <tr>
                                                        <th className="px-4 py-3 w-12">
                                                            <Checkbox
                                                                checked={selectedPets.length === filteredPets.length && filteredPets.length > 0}
                                                                onCheckedChange={toggleSelectAll}
                                                            />
                                                        </th>
                                                        <th className="px-4 py-3 w-16 text-center">Image</th>
                                                        <th className="px-4 py-3">Identity</th>
                                                        <th className="px-4 py-3">Details</th>
                                                        <th className="px-4 py-3">Pedigree</th>
                                                        <th className="px-4 py-3 text-right">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y">
                                                    {filteredPets.map(pet => (
                                                        <tr key={pet.id} className="hover:bg-blue-50/30 transition-colors">
                                                            <td className="px-4 py-3">
                                                                <Checkbox
                                                                    checked={selectedPets.includes(pet.id)}
                                                                    onCheckedChange={() => toggleSelectPet(pet.id)}
                                                                />
                                                            </td>
                                                            <td className="px-4 py-3 text-center">

                                                                <img src={pet.image} alt="" className="w-8 h-8 rounded-full object-cover mx-auto ring-1 ring-gray-200" />
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <div className="font-bold text-gray-900">{pet.name}</div>
                                                                <div className="text-xs text-gray-500 font-mono">{pet.registrationNumber || 'No ID'}</div>
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <div className="text-gray-700">{pet.breed}</div>
                                                                <div className="text-xs text-gray-500 capitalize">{pet.gender} • {pet.type}</div>
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <div className="flex items-center gap-1">
                                                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${pet.parentIds?.sire ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-400'}`}>SIRE</span>
                                                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${pet.parentIds?.dam ? 'bg-pink-100 text-pink-700' : 'bg-gray-100 text-gray-400'}`}>DAM</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3 text-right">
                                                                <div className="flex justify-end gap-2">
                                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-500 hover:text-blue-600" onClick={() => setEditingPet(pet)}>
                                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                                    </Button>
                                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-500 hover:text-red-600" onClick={() => handleDeletePet(pet.id)}>
                                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                                    </Button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                    {filteredPets.length === 0 && (
                                                        <tr>
                                                            <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                                                                No records found matching "{searchTerm}"
                                                            </td>
                                                        </tr>
                                                    )}

                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </ScrollArea>
                            </div>
                        ) : activeTab === 'verifications' ? (
                            /* 3. VERIFICATIONS TAB */
                            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
                                <h2 className="text-xl font-bold mb-4">Pending Pedigree Verifications</h2>
                                {pendingVerifications.length === 0 ? (
                                    <div className="text-center py-12 bg-white rounded-xl border border-dashed">
                                        <p className="text-gray-500">No pending verifications found.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {pendingVerifications.map(pet => (
                                            <div key={pet.id} className="bg-white p-4 rounded-xl border shadow-sm flex items-start gap-4">
                                                <img src={pet.image} className="w-16 h-16 rounded-lg object-cover" />
                                                <div className="flex-1">
                                                    <h4 className="font-bold text-lg">{pet.name} <span className="text-sm font-normal text-gray-500">({pet.breed})</span></h4>
                                                    <p className="text-sm text-gray-600 mb-3">Requesting verification for parents:</p>
                                                    <div className="flex gap-4">
                                                        {pet.parentIds?.sire && pet.parentIds.sireStatus === 'pending' && (
                                                            <div className="flex items-center gap-3 bg-blue-50 p-2 rounded-lg border border-blue-100">
                                                                <span className="text-xs font-bold text-blue-700 uppercase">Sire Connection</span>
                                                                <div>
                                                                    <div className="text-sm font-semibold text-gray-800">{getPetLabel(pet.parentIds.sire)}</div>
                                                                    <div className="text-[10px] text-gray-400 font-mono">{formatShortId(pet.parentIds.sire)}</div>
                                                                </div>
                                                                <div className="flex gap-1 ml-2">
                                                                    <Button size="sm" className="h-7 bg-green-600 hover:bg-green-700" onClick={() => handleVerify(pet.id, 'sire', 'verified')}>Approve</Button>
                                                                    <Button size="sm" variant="destructive" className="h-7" onClick={() => handleVerify(pet.id, 'sire', 'rejected')}>Reject</Button>
                                                                </div>
                                                            </div>
                                                        )}
                                                        {pet.parentIds?.dam && pet.parentIds.damStatus === 'pending' && (
                                                            <div className="flex items-center gap-3 bg-pink-50 p-2 rounded-lg border border-pink-100">
                                                                <span className="text-xs font-bold text-pink-700 uppercase">Dam Connection</span>
                                                                <div>
                                                                    <div className="text-sm font-semibold text-gray-800">{getPetLabel(pet.parentIds.dam)}</div>
                                                                    <div className="text-[10px] text-gray-400 font-mono">{formatShortId(pet.parentIds.dam)}</div>
                                                                </div>
                                                                <div className="flex gap-1 ml-2">
                                                                    <Button size="sm" className="h-7 bg-green-600 hover:bg-green-700" onClick={() => handleVerify(pet.id, 'dam', 'verified')}>Approve</Button>
                                                                    <Button size="sm" variant="destructive" className="h-7" onClick={() => handleVerify(pet.id, 'dam', 'rejected')}>Reject</Button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : activeTab === 'puppy' ? (
                            /* 4. PUPPY COMING SOON TAB */
                            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                                    <div>
                                        <h2 className="text-xl font-bold">Puppy Coming Soon</h2>
                                        <p className="text-xs text-gray-500">Manage breeding matches and reservations.</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button variant="outline" onClick={loadBreedingAdmin}>
                                            Refresh
                                        </Button>
                                        <Button className="bg-primary text-white hover:bg-primary/90" onClick={() => { setMatchError(''); resetMatchForm(); setMatchModalOpen(true); }}>
                                            Add Match
                                        </Button>
                                    </div>
                                </div>

                                {breedingLoading ? (
                                    <div className="text-center py-12 bg-white rounded-xl border border-dashed">
                                        <p className="text-gray-500">Loading matches...</p>
                                    </div>
                                ) : breedingMatches.length === 0 ? (
                                    <div className="text-center py-12 bg-white rounded-xl border border-dashed">
                                        <p className="text-gray-500">No breeding matches found.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {breedingMatches.map(match => {
                                            const key = getMatchKey(match.sire_id, match.dam_id);
                                            const reservations = reservationsByMatch[key] || [];
                                            return (
                                                <div key={match.id} className="bg-white p-4 rounded-xl border shadow-sm">
                                                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                                                        <div>
                                                            <div className="text-lg font-bold text-gray-900">
                                                                {getPetLabel(match.sire_id)} + {getPetLabel(match.dam_id)}
                                                            </div>
                                                            <div className="text-xs text-gray-500">
                                                                Match date: {match.match_date || '-'} | Due: {match.due_date || '-'}
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <select
                                                                value={match.status || 'planned'}
                                                                onChange={(e) => handleUpdateMatchStatus(match.id, e.target.value)}
                                                                className="border border-gray-200 rounded-md px-2 py-1 text-xs"
                                                            >
                                                                <option value="planned">Planned</option>
                                                                <option value="mated">Mated</option>
                                                                <option value="confirmed">Confirmed</option>
                                                                <option value="born">Born</option>
                                                                <option value="failed">Cancelled</option>
                                                            </select>
                                                            <Button size="sm" className="h-8 bg-green-600 hover:bg-green-700" onClick={() => handleUpdateMatchStatus(match.id, 'confirmed')}>
                                                                Approve
                                                            </Button>
                                                            <Button size="sm" variant="destructive" className="h-8" onClick={() => handleDeleteMatch(match.id)}>
                                                                Delete
                                                            </Button>
                                                        </div>
                                                    </div>

                                                    {match.description && (
                                                        <p className="text-sm text-gray-600 mt-2">{match.description}</p>
                                                    )}

                                                    <div className="mt-4 border-t pt-3">
                                                        <div className="flex items-center justify-between text-sm font-semibold text-gray-700">
                                                            <span>Reservations</span>
                                                            <span className="text-xs text-gray-500">{reservations.length}</span>
                                                        </div>
                                                        {reservations.length === 0 ? (
                                                            <p className="text-xs text-gray-500 mt-2">No reservations.</p>
                                                        ) : (
                                                            <div className="mt-2 space-y-2">
                                                                {reservations.map(reservation => (
                                                                    <div key={reservation.id} className="flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs text-gray-600 border border-gray-100 rounded-lg px-3 py-2">
                                                                        <div>
                                                                            <div className="font-semibold text-gray-800">
                                                                                {reservation.user?.full_name || 'Member'}
                                                                            </div>
                                                                            <div>Contact: {reservation.user_contact || '-'}</div>
                                                                            {reservation.user_note && (
                                                                                <div>Note: {reservation.user_note}</div>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="text-gray-400">
                                                                                {reservation.created_at ? new Date(reservation.created_at).toLocaleDateString() : '-'}
                                                                            </span>
                                                                            <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[10px] font-semibold capitalize">
                                                                                {reservation.status || 'pending'}
                                                                            </span>
                                                                            <Button size="sm" className="h-7 bg-green-600 hover:bg-green-700" onClick={() => handleUpdateReservationStatus(reservation, 'approved')}>
                                                                                Approve
                                                                            </Button>
                                                                            <Button size="sm" variant="destructive" className="h-7" onClick={() => handleUpdateReservationStatus(reservation, 'rejected')}>
                                                                                Reject
                                                                            </Button>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        ) : activeTab === 'ownership' ? (
                            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                                    <div>
                                        <h2 className="text-xl font-bold">Ownership Claims</h2>
                                        <p className="text-xs text-gray-500">Review and approve ownership claims.</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <select
                                            value={ownershipFilter}
                                            onChange={(e) => setOwnershipFilter(e.target.value as 'all' | 'pending' | 'approved' | 'rejected')}
                                            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
                                        >
                                            <option value="pending">Pending</option>
                                            <option value="approved">Approved</option>
                                            <option value="rejected">Rejected</option>
                                            <option value="all">All</option>
                                        </select>
                                        <Button variant="outline" onClick={loadOwnershipClaims} disabled={ownershipLoading}>
                                            {ownershipLoading ? 'Refreshing...' : 'Refresh'}
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {ownershipLoading ? (
                                        <p className="text-sm text-gray-500">Loading claims...</p>
                                    ) : filteredOwnershipClaims.length === 0 ? (
                                        <p className="text-sm text-gray-500">No ownership claims found.</p>
                                    ) : (
                                        filteredOwnershipClaims.map(claim => (
                                            <div key={claim.id} className="bg-white rounded-xl border shadow-sm p-4">
                                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden">
                                                            <img
                                                                src={claim.pet?.image_url || fallbackPetImage}
                                                                alt={claim.pet?.name || 'Pet'}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        </div>
                                                        <div>
                                                            <div className="font-semibold text-gray-900">{claim.pet?.name || 'Unknown Pet'}</div>
                                                            <div className="text-xs text-gray-500">{claim.pet?.breed || 'Unknown breed'}</div>
                                                        </div>
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        <div className="font-semibold text-gray-700">{claim.claimant?.full_name || 'Unknown user'}</div>
                                                        <div>{claim.claimant?.email || '-'}</div>
                                                    </div>
                                                </div>

                                                <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-600">
                                                    <span className="px-2 py-1 rounded-full bg-gray-100 font-semibold uppercase">{claim.status}</span>
                                                    <span className="px-2 py-1 rounded-full bg-gray-100">{claim.claim_type}</span>
                                                    <span className="px-2 py-1 rounded-full bg-gray-100">
                                                        {claim.created_at ? new Date(claim.created_at).toLocaleDateString() : '-'}
                                                    </span>
                                                </div>

                                                {claim.evidence && (
                                                    <p className="mt-3 text-sm text-gray-700">{claim.evidence}</p>
                                                )}

                                                <div className="mt-3 flex flex-wrap gap-2">
                                                    {claim.evidence_files && claim.evidence_files.length > 0 ? (
                                                        claim.evidence_files.map((fileUrl, index) => (
                                                            <a
                                                                key={`${claim.id}-file-${index}`}
                                                                href={fileUrl}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="text-xs text-blue-600 hover:underline"
                                                            >
                                                                File {index + 1}
                                                            </a>
                                                        ))
                                                    ) : (
                                                        <span className="text-xs text-gray-400">No files</span>
                                                    )}
                                                </div>

                                                <div className="mt-4 flex flex-wrap gap-2">
                                                    <Button
                                                        size="sm"
                                                        className="h-8 bg-green-600 hover:bg-green-700"
                                                        disabled={claim.status !== 'pending'}
                                                        onClick={() => handleApproveOwnershipClaim(claim)}
                                                    >
                                                        Approve
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        className="h-8"
                                                        disabled={claim.status !== 'pending'}
                                                        onClick={() => handleRejectOwnershipClaim(claim)}
                                                    >
                                                        Reject
                                                    </Button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        ) : activeTab === 'users' ? (
                            /* 4. USER MANAGEMENT TAB */
                            <div className="flex-1 flex flex-col min-h-0">
                                <div className="p-4 border-b flex gap-4 bg-gray-50/50">
                                    <div className="relative flex-1 max-w-md">
                                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                        <Input
                                            placeholder="Search users..."
                                            className="pl-9 bg-white"
                                        />
                                    </div>
                                    <Button
                                        className="ml-auto bg-[#C5A059] text-[#0A0A0A] shadow-sm hover:bg-[#D4C4B5]"
                                        onClick={() => setShowAddUserModal(true)}
                                    >
                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                        Add New User
                                    </Button>
                                </div>
                                <div className="flex-1 overflow-y-auto p-4 bg-gray-50/30">
                                    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-gray-50 border-b text-gray-600 font-medium">
                                                <tr>
                                                    <th className="px-4 py-3">User</th>
                                                    <th className="px-4 py-3">Role</th>
                                                    <th className="px-4 py-3">Status</th>
                                                    <th className="px-4 py-3">Joined</th>
                                                    <th className="px-4 py-3 text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {userList.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={5} className="py-8 text-center text-gray-400">No users found.</td>
                                                    </tr>
                                                ) : (
                                                    userList.map(user => (
                                                        <tr key={user.id} className="hover:bg-gray-50">
                                                            <td className="px-4 py-3">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs overflow-hidden">
                                                                        {user.avatar_url ? (
                                                                            <img src={user.avatar_url} alt={user.full_name || 'User'} className="w-full h-full object-cover" />
                                                                        ) : (
                                                                            (user.full_name || user.email || 'U').charAt(0).toUpperCase()
                                                                        )}
                                                                    </div>
                                                                    <div>
                                                                        <div className="font-bold text-gray-900">{user.full_name || 'Unnamed User'}</div>
                                                                        <div className="text-xs text-gray-500">{user.email}</div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <select
                                                                    value={user.role || user.account_type || 'buyer'}
                                                                    onChange={(e) => handleUpdateUserRole(user.id, e.target.value as 'buyer' | 'breeder' | 'admin')}
                                                                    disabled={roleUpdatingId === user.id}
                                                                    className="border border-gray-200 rounded-md px-2 py-1 text-xs bg-white"
                                                                >
                                                                    <option value="buyer">buyer</option>
                                                                    <option value="breeder">breeder</option>
                                                                    <option value="admin">admin</option>
                                                                </select>
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <div className="flex items-center gap-2">
                                                                    <div className={`w-2 h-2 rounded-full ${user.verified_breeder ? 'bg-green-500' : 'bg-gray-300'}`} />
                                                                    <span className="text-gray-700">{user.verified_breeder ? 'Verified' : 'Unverified'}</span>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                                                                {new Date(user.created_at).toLocaleDateString()}
                                                            </td>
                                                            <td className="px-4 py-3 text-right">
                                                                <div className="flex justify-end gap-2">
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        className="h-8"
                                                                        onClick={() => handleToggleBreederVerification(user.id, !user.verified_breeder)}
                                                                        disabled={user.role === 'admin'}
                                                                    >
                                                                        {user.verified_breeder ? 'Revoke' : 'Approve'}
                                                                    </Button>
                                                                    <Button
                                                                        size="icon"
                                                                        variant="ghost"
                                                                        className="h-8 w-8 text-gray-400 hover:text-red-600"
                                                                        onClick={async () => {
                                                                            if (confirm('Are you sure you want to delete this user profile? This action cannot be undone.')) {
                                                                                try {
                                                                                    await deleteUser(user.id);
                                                                                    refreshData();
                                                                                } catch (e) {
                                                                                    alert('Failed to delete user');
                                                                                }
                                                                            }
                                                                        }}
                                                                    >
                                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                                    </Button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        ) : activeTab === 'moderation' ? (
                            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                                    <div>
                                        <h2 className="text-xl font-bold">Content Moderation</h2>
                                        <p className="text-xs text-gray-500">Approve comments and remove abusive messages.</p>
                                    </div>
                                    <Button variant="outline" onClick={loadModerationData} disabled={moderationLoading}>
                                        {moderationLoading ? 'Refreshing...' : 'Refresh'}
                                    </Button>
                                </div>
                                <div className="grid gap-6 lg:grid-cols-2">
                                    <div className="bg-white rounded-xl border shadow-sm p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="font-semibold text-gray-900">Pending Comments</h3>
                                            <span className="text-xs text-gray-500">{pendingComments.length} pending</span>
                                        </div>
                                        {pendingComments.length === 0 ? (
                                            <p className="text-sm text-gray-500">No pending comments.</p>
                                        ) : (
                                            <div className="space-y-3">
                                                {pendingComments.map(comment => (
                                                    <div key={comment.id} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="min-w-0">
                                                                <div className="text-xs text-gray-500">
                                                                    {(comment.pet?.name || formatShortId(comment.pet_id))} | {(comment.user?.full_name || getUserLabel(comment.user_id))}
                                                                </div>
                                                                <p className="text-sm text-gray-800 mt-1 break-words">{comment.content}</p>
                                                                <div className="text-[10px] text-gray-400 mt-1">
                                                                    {new Date(comment.created_at).toLocaleString()}
                                                                </div>
                                                            </div>
                                                            <div className="flex flex-col gap-1">
                                                                <Button size="sm" className="h-7 bg-green-600 hover:bg-green-700" onClick={() => handleApproveCommentAdmin(comment.id)}>
                                                                    Approve
                                                                </Button>
                                                                <Button size="sm" variant="destructive" className="h-7" onClick={() => handleDeleteCommentAdmin(comment.id)}>
                                                                    Delete
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="bg-white rounded-xl border shadow-sm p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="font-semibold text-gray-900">Recent Chat Messages</h3>
                                            <span className="text-xs text-gray-500">{recentChatMessages.length} messages</span>
                                        </div>
                                        {recentChatMessages.length === 0 ? (
                                            <p className="text-sm text-gray-500">No recent messages.</p>
                                        ) : (
                                            <div className="space-y-3">
                                                {recentChatMessages.map(message => (
                                                    <div key={message.id} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="min-w-0">
                                                                <div className="text-xs text-gray-500 flex items-center gap-2">
                                                                    <span>Room {formatShortId(message.room_id)}</span>
                                                                    <span>|</span>
                                                                    <span>{getUserLabel(message.sender_id)}</span>
                                                                    {message.message_type && message.message_type !== 'text' && (
                                                                        <span className="text-[9px] uppercase tracking-wide font-semibold bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">
                                                                            {message.message_type}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <p className="text-sm text-gray-800 mt-1 break-words">{message.content}</p>
                                                                <div className="text-[10px] text-gray-400 mt-1">
                                                                    {new Date(message.created_at).toLocaleString()}
                                                                </div>
                                                            </div>
                                                            <Button
                                                                size="sm"
                                                                variant="destructive"
                                                                className="h-7"
                                                                onClick={() => handleDeleteChatMessage(message.id)}
                                                            >
                                                                Delete
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : activeTab === 'ai' ? (
                            <div className="flex-1 flex flex-col min-h-0 p-6 bg-gray-50/30">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                                    <div>
                                        <h2 className="text-xl font-bold">AI Library</h2>
                                        <p className="text-xs text-gray-500">Approve FAQ answers and review the query pool.</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            onClick={() => setAiExpanded(prev => !prev)}
                                        >
                                            {aiExpanded ? 'Collapse' : 'Expand'}
                                        </Button>
                                        <Button variant="outline" onClick={loadAiLibrary} disabled={aiLoading}>
                                            {aiLoading ? 'Refreshing...' : 'Refresh'}
                                        </Button>
                                        <Button onClick={resetFaqForm} className="bg-primary text-white hover:bg-primary/90">
                                            New FAQ
                                        </Button>
                                    </div>
                                </div>

                                <Tabs value={aiTab} onValueChange={(value) => setAiTab(value as 'faq' | 'pool')} className="flex flex-col flex-1 min-h-0">
                                    <TabsList className="mb-4">
                                        <TabsTrigger value="faq">FAQ Entries</TabsTrigger>
                                        <TabsTrigger value="pool">Query Pool</TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="faq" className="flex-1 min-h-0 overflow-hidden">
                                        <div className="grid gap-4 lg:grid-cols-[360px,1fr] h-full">
                                            <div className="bg-white rounded-xl border shadow-sm flex flex-col min-h-0">
                                                <div className="p-3 border-b flex items-center gap-2">
                                                    <Select value={faqFilter} onValueChange={(value) => setFaqFilter(value as any)}>
                                                        <SelectTrigger className="h-8 text-xs w-36">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="all">All</SelectItem>
                                                            <SelectItem value="draft">Draft</SelectItem>
                                                            <SelectItem value="approved">Approved</SelectItem>
                                                            <SelectItem value="archived">Archived</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <span className="text-xs text-gray-500 ml-auto">{filteredFaqEntries.length} items</span>
                                                </div>
                                                <ScrollArea className="flex-1 min-h-0">
                                                    <div className="p-3 space-y-2">
                                                        {filteredFaqEntries.length === 0 ? (
                                                            <p className="text-sm text-gray-500">No FAQ entries.</p>
                                                        ) : (
                                                            filteredFaqEntries.map(entry => (
                                                                <button
                                                                    key={entry.id}
                                                                    onClick={() => handleSelectFaq(entry)}
                                                                    className={`w-full text-left border rounded-lg p-3 hover:bg-gray-50 transition ${faqForm.id === entry.id ? 'border-primary/40 bg-primary/5' : 'border-gray-100'}`}
                                                                >
                                                                    <div className="flex items-start justify-between gap-2">
                                                                        <div className="min-w-0">
                                                                            <div className="text-sm font-semibold text-gray-900 truncate">
                                                                                {entry.question_th || entry.question_en || 'Untitled FAQ'}
                                                                            </div>
                                                                            <div className="text-[11px] text-gray-500 mt-1">
                                                                                {entry.scope} • {entry.category || 'general'}
                                                                            </div>
                                                                        </div>
                                                                        <span className={`text-[10px] uppercase px-2 py-0.5 rounded-full ${entry.status === 'approved' ? 'bg-green-100 text-green-700' : entry.status === 'archived' ? 'bg-gray-200 text-gray-600' : 'bg-amber-100 text-amber-700'}`}>
                                                                            {entry.status}
                                                                        </span>
                                                                    </div>
                                                                </button>
                                                            ))
                                                        )}
                                                    </div>
                                                </ScrollArea>
                                            </div>

                                            <div className="bg-white rounded-xl border shadow-sm flex flex-col min-h-0">
                                                <div className="p-4 border-b flex items-center justify-between gap-2">
                                                    <div>
                                                        <h3 className="font-semibold text-gray-900">FAQ Editor</h3>
                                                        <p className="text-xs text-gray-500">Save drafts, then approve when ready.</p>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <Button variant="outline" onClick={resetFaqForm} size="sm">Clear</Button>
                                                        {faqForm.id && (
                                                            <Button variant="destructive" onClick={() => handleDeleteFaq(faqForm.id)} size="sm">Delete</Button>
                                                        )}
                                                    </div>
                                                </div>
                                                <ScrollArea className="flex-1 min-h-0">
                                                    <div className="p-4 space-y-4">
                                                        {faqError && (
                                                            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
                                                                {faqError}
                                                            </div>
                                                        )}
                                                        <div className="grid gap-4 md:grid-cols-2">
                                                            <div className="space-y-2">
                                                                <Label>Status</Label>
                                                                <Select
                                                                    value={faqForm.status}
                                                                    onValueChange={(value) => setFaqForm(prev => ({ ...prev, status: value as any }))}
                                                                >
                                                                    <SelectTrigger className="bg-white">
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="draft">Draft</SelectItem>
                                                                        <SelectItem value="approved">Approved</SelectItem>
                                                                        <SelectItem value="archived">Archived</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label>Scope</Label>
                                                                <Select
                                                                    value={faqForm.scope}
                                                                    onValueChange={(value) => setFaqForm(prev => ({ ...prev, scope: value as any }))}
                                                                >
                                                                    <SelectTrigger className="bg-white">
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="any">Any</SelectItem>
                                                                        <SelectItem value="global">Global</SelectItem>
                                                                        <SelectItem value="pet">Pet Only</SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>
                                                        </div>
                                                        <div className="grid gap-4 md:grid-cols-2">
                                                            <div className="space-y-2">
                                                                <Label>Category</Label>
                                                                <Input
                                                                    value={faqForm.category}
                                                                    onChange={(e) => setFaqForm(prev => ({ ...prev, category: e.target.value }))}
                                                                    placeholder="marketplace, breeding, health..."
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <Label>Priority</Label>
                                                                <Input
                                                                    type="number"
                                                                    value={faqForm.priority}
                                                                    onChange={(e) => setFaqForm(prev => ({ ...prev, priority: Number(e.target.value) || 0 }))}
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label>Question (TH)</Label>
                                                            <Input
                                                                value={faqForm.questionTh}
                                                                onChange={(e) => setFaqForm(prev => ({ ...prev, questionTh: e.target.value }))}
                                                                placeholder="คำถามภาษาไทย"
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label>Question (EN)</Label>
                                                            <Input
                                                                value={faqForm.questionEn}
                                                                onChange={(e) => setFaqForm(prev => ({ ...prev, questionEn: e.target.value }))}
                                                                placeholder="English question"
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label>Answer (TH)</Label>
                                                            <Textarea
                                                                value={faqForm.answerTh}
                                                                onChange={(e) => setFaqForm(prev => ({ ...prev, answerTh: e.target.value }))}
                                                                placeholder="คำตอบภาษาไทย"
                                                                rows={4}
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label>Answer (EN)</Label>
                                                            <Textarea
                                                                value={faqForm.answerEn}
                                                                onChange={(e) => setFaqForm(prev => ({ ...prev, answerEn: e.target.value }))}
                                                                placeholder="English answer"
                                                                rows={4}
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label>Keywords (comma separated)</Label>
                                                            <Input
                                                                value={faqForm.keywords}
                                                                onChange={(e) => setFaqForm(prev => ({ ...prev, keywords: e.target.value }))}
                                                                placeholder="puppy, litter, จองคิว"
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label>Source Query ID</Label>
                                                            <Input value={faqForm.sourceQueryId} readOnly className="bg-gray-50 text-xs" />
                                                        </div>
                                                        <div className="flex flex-wrap gap-2 pt-2">
                                                            <Button variant="outline" onClick={() => handleSaveFaq('draft')}>
                                                                Save Draft
                                                            </Button>
                                                            <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleSaveFaq('approved')}>
                                                                Approve
                                                            </Button>
                                                            <Button variant="outline" onClick={() => handleSaveFaq('archived')}>
                                                                Archive
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </ScrollArea>
                                            </div>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="pool" className="flex-1 min-h-0 overflow-hidden">
                                        <div className="grid gap-4 lg:grid-cols-[360px,1fr] h-full">
                                            <div className="bg-white rounded-xl border shadow-sm flex flex-col min-h-0">
                                                <div className="p-3 border-b flex items-center gap-2">
                                                    <Label className="text-xs">Show handled</Label>
                                                    <Checkbox
                                                        checked={showAllQueries}
                                                        onCheckedChange={(value) => setShowAllQueries(Boolean(value))}
                                                    />
                                                    <span className="text-xs text-gray-500 ml-auto">{visibleQueries.length} queries</span>
                                                </div>
                                                <ScrollArea className="flex-1 min-h-0">
                                                    <div className="p-3 space-y-2">
                                                        {visibleQueries.length === 0 ? (
                                                            <p className="text-sm text-gray-500">No queries to review.</p>
                                                        ) : (
                                                            visibleQueries.map(item => {
                                                                const handled = handledQueryIds.has(item.id);
                                                                return (
                                                                    <div key={item.id} className="border rounded-lg p-3 bg-white">
                                                                        <div className="flex items-start justify-between gap-2">
                                                                            <div className="min-w-0">
                                                                                <div className="text-sm font-semibold text-gray-900 break-words">{item.query}</div>
                                                                                <div className="text-[11px] text-gray-500 mt-1">
                                                                                    {item.intent || 'general'} • {item.lang || 'auto'} • {new Date(item.created_at).toLocaleDateString()}
                                                                                </div>
                                                                            </div>
                                                                            {handled && (
                                                                                <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                                                                                    handled
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex items-center gap-2 mt-3">
                                                                            <Button size="sm" variant="outline" className="h-7" onClick={() => handleUseQueryAsFaq(item)}>
                                                                                Create Draft
                                                                            </Button>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })
                                                        )}
                                                    </div>
                                                </ScrollArea>
                                            </div>

                                            <div className="bg-white rounded-xl border shadow-sm flex flex-col min-h-0">
                                                <div className="p-4 border-b">
                                                    <h3 className="font-semibold text-gray-900">FAQ Editor</h3>
                                                    <p className="text-xs text-gray-500">Select a query to create a draft answer.</p>
                                                </div>
                                                <ScrollArea className="flex-1 min-h-0">
                                                    <div className="p-4">
                                                        <div className="flex flex-col gap-3">
                                                            <Button onClick={() => setAiTab('faq')} className="bg-primary text-white hover:bg-primary/90">
                                                                Open FAQ Editor
                                                            </Button>
                                                            <p className="text-xs text-gray-500">
                                                                Use "Create Draft" to prefill a new FAQ answer, then approve it in the FAQ tab.
                                                            </p>
                                                        </div>
                                                    </div>
                                                </ScrollArea>
                                            </div>
                                        </div>
                                    </TabsContent>
                                </Tabs>
                            </div>
                        ) : activeTab === 'notifications' ? (
                            /* 5. NOTIFICATIONS TAB */
                            <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
                                <h2 className="text-xl font-bold mb-4">System Notifications</h2>
                                <div className="space-y-4">
                                    {notifications.length === 0 ? (
                                        <p className="text-gray-500 text-center py-8">No notifications.</p>
                                    ) : (
                                        notifications.map(n => {
                                            const actionLabel = getNotificationActionLabel(n);
                                            return (
                                                <div key={n.id} className={`p-4 rounded-xl border flex gap-4 ${n.status === 'unread' ? 'bg-white border-primary/30 shadow-sm' : 'bg-gray-50 border-gray-100 opacity-70'}`}>
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 
                                                    ${n.type === 'new_pet' ? 'bg-green-100 text-green-600' :
                                                            n.type === 'breeding_report' ? 'bg-red-100 text-red-600' :
                                                                'bg-blue-100 text-blue-600'}`}>
                                                        {n.type === 'new_pet' && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>}
                                                        {n.type === 'breeding_report' && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
                                                        {n.type === 'verification_request' && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex justify-between items-start">
                                                            <h4 className="font-bold text-gray-900">{n.title}</h4>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs text-gray-500 whitespace-nowrap">{new Date(n.created_at).toLocaleDateString()}</span>
                                                                {actionLabel && (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-6 text-[10px] text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleNotificationAction(n);
                                                                        }}
                                                                    >
                                                                        {actionLabel}
                                                                    </Button>
                                                                )}
                                                                {n.status === 'unread' && (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-6 text-[10px] text-primary hover:text-primary/80 hover:bg-primary/5"
                                                                        onClick={async (e) => {
                                                                            e.stopPropagation();
                                                                            await markNotificationAsRead(n.id);
                                                                            refreshData();
                                                                        }}
                                                                    >
                                                                        Mark Read
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <p className="text-sm text-gray-600 mt-1">{n.message}</p>
                                                        {n.reference_id && (
                                                            <div className="mt-2 text-xs font-mono bg-gray-100 inline-block px-2 py-1 rounded text-gray-500">
                                                                Ref: {n.reference_id}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        ) : null}
                    </div>

                    <PetRegistrationModal
                        isOpen={showRegistrationModal}
                        onClose={() => setShowRegistrationModal(false)}
                        onSuccess={() => {
                            refreshData();
                            setShowRegistrationModal(false);
                        }}
                    />

                    <Dialog open={matchModalOpen} onOpenChange={handleMatchModalChange}>
                        <DialogContent className="max-w-xl">
                            <DialogHeader>
                                <DialogTitle>Add Breeding Match</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                                {matchError && (
                                    <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
                                        {matchError}
                                    </div>
                                )}
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label>Sire *</Label>
                                        <Select
                                            value={matchForm.sireId}
                                            onValueChange={(value) => setMatchForm(prev => ({ ...prev, sireId: value }))}
                                        >
                                            <SelectTrigger className="bg-white">
                                                <SelectValue placeholder="Select sire" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {sireOptions.length === 0 ? (
                                                    <SelectItem value="none" disabled>No male pets available</SelectItem>
                                                ) : (
                                                    sireOptions.map(pet => (
                                                        <SelectItem key={pet.id} value={pet.id}>
                                                            {pet.name} ({pet.breed})
                                                        </SelectItem>
                                                    ))
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Dam *</Label>
                                        <Select
                                            value={matchForm.damId}
                                            onValueChange={(value) => setMatchForm(prev => ({ ...prev, damId: value }))}
                                        >
                                            <SelectTrigger className="bg-white">
                                                <SelectValue placeholder="Select dam" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {damOptions.length === 0 ? (
                                                    <SelectItem value="none" disabled>No female pets available</SelectItem>
                                                ) : (
                                                    damOptions.map(pet => (
                                                        <SelectItem key={pet.id} value={pet.id}>
                                                            {pet.name} ({pet.breed})
                                                        </SelectItem>
                                                    ))
                                                )}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <Label>Match date *</Label>
                                        <Input
                                            type="date"
                                            value={matchForm.matchDate}
                                            onChange={(e) => setMatchForm(prev => ({ ...prev, matchDate: e.target.value }))}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Due date (auto)</Label>
                                        <Input value={dueDatePreview || ''} placeholder="Auto" disabled />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Status</Label>
                                    <Select
                                        value={matchForm.status}
                                        onValueChange={(value) => setMatchForm(prev => ({ ...prev, status: value }))}
                                    >
                                        <SelectTrigger className="bg-white">
                                            <SelectValue placeholder="Select status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="planned">Planned</SelectItem>
                                            <SelectItem value="mated">Mated</SelectItem>
                                            <SelectItem value="confirmed">Confirmed</SelectItem>
                                            <SelectItem value="born">Born</SelectItem>
                                            <SelectItem value="failed">Cancelled</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Description</Label>
                                    <Textarea
                                        value={matchForm.description}
                                        onChange={(e) => setMatchForm(prev => ({ ...prev, description: e.target.value }))}
                                        placeholder="Optional notes for this breeding match"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <Button variant="outline" onClick={() => handleMatchModalChange(false)}>
                                    Cancel
                                </Button>
                                <Button className="bg-primary text-white hover:bg-primary/90" onClick={handleCreateMatch}>
                                    Save Match
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>

                    {/* Add New User Modal */}
                    <Dialog open={showAddUserModal} onOpenChange={setShowAddUserModal}>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle>Add New User</DialogTitle>
                                <DialogDescription>
                                    Create a new user account manually
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                                {userFormError && (
                                    <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
                                        {userFormError}
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <Label htmlFor="email">Email *</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={newUserForm.email}
                                        onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                                        placeholder="user@example.com"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="fullName">Full Name</Label>
                                    <Input
                                        id="fullName"
                                        type="text"
                                        value={newUserForm.fullName}
                                        onChange={(e) => setNewUserForm({ ...newUserForm, fullName: e.target.value })}
                                        placeholder="John Doe"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="role">Role *</Label>
                                    <Select value={newUserForm.role} onValueChange={(val: any) => setNewUserForm({ ...newUserForm, role: val })}>
                                        <SelectTrigger className="bg-white">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="buyer">Buyer</SelectItem>
                                            <SelectItem value="breeder">Breeder</SelectItem>
                                            <SelectItem value="admin">Admin</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Info message */}
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                    <p className="text-sm text-blue-800">
                                        ℹ️ The user will receive a magic link via email to sign in. No password needed!
                                    </p>
                                </div>
                            </div>

                            <DialogFooter>
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setShowAddUserModal(false);
                                        setNewUserForm({ email: '', fullName: '', role: 'buyer', password: '' });
                                        setUserFormError('');
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    className="bg-[#C5A059] text-[#0A0A0A] hover:bg-[#D4C4B5]"
                                    onClick={handleAddNewUser}
                                >
                                    📧 Send Invitation
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default AdminPanel;
