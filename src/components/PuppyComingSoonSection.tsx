import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { createReservation, createUserNotification } from '@/lib/database';
import { useAuth } from '@/contexts/AuthContext';
import { getPetById } from '@/lib/petsService';
import { Pet } from '@/data/petData';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LitterRegistrationModal } from './modals/LitterRegistrationModal';

type MatchStatus = 'planned' | 'mated' | 'confirmed' | 'born' | 'failed';
type ApprovalStatus = 'pending' | 'approved' | 'rejected';

type MatchRow = {
  id: string;
  sire_id: string | null;
  dam_id: string | null;
  match_date: string | null;
  due_date: string | null;
  status: MatchStatus;
  requested_by?: string | null;
  approval_status?: ApprovalStatus | null;
  approved_by?: string | null;
  approved_at?: string | null;
  description?: string | null;
};

type PetRow = {
  id: string;
  name: string;
  breed: string;
  type: string | null;
  gender: string | null;
  birthday?: string | null;
  image_url?: string | null;
  registration_number?: string | null;
  owner_id?: string | null;
  owner_name?: string | null;
  owner?: { full_name?: string | null };
};

type MatchCard = MatchRow & {
  sire?: PetRow | null;
  dam?: PetRow | null;
  dueDateComputed?: string | null;
  sireOffspring?: string[];
  damOffspring?: string[];
  requester?: { full_name?: string | null } | null;
};

type ReservationRow = {
  id: string;
  sire_id: string;
  dam_id: string;
  user_id?: string | null;
  user_contact: string | null;
  user_note?: string | null;
  status: string;
  created_at: string;
  user?: { full_name?: string | null };
};

const addDays = (value: string, days: number) => {
  const base = new Date(value);
  if (Number.isNaN(base.getTime())) return null;
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next.toISOString().split('T')[0];
};

const formatDateShort = (value?: string | null) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const getOwnerName = (pet?: PetRow | null) => {
  if (!pet) return null;
  return pet.owner?.full_name || pet.owner_name || null;
};

const getMatchKey = (sireId?: string | null, damId?: string | null) => `${sireId || 'none'}:${damId || 'none'}`;

const formatReservationDate = (value?: string | null) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const maskContact = (value?: string | null) => {
  if (!value) return '...';
  const digits = value.replace(/\D/g, '');
  if (digits.length >= 3) return `...${digits.slice(-3)}`;
  return '...';
};

const getReservationStatusClass = (status?: string | null) => {
  switch (status) {
    case 'approved':
      return 'bg-green-100 text-green-700';
    case 'contacted':
      return 'bg-blue-100 text-blue-700';
    case 'rejected':
      return 'bg-gray-100 text-gray-600';
    default:
      return 'bg-amber-100 text-amber-700';
  }
};

interface PuppyComingSoonSectionProps {
  onRequireAuth?: () => void;
  onViewDetails?: (pet: Pet) => void;
  focusSection?: 'available' | 'coming';
}

const PuppyComingSoonSection: React.FC<PuppyComingSoonSectionProps> = ({ onRequireAuth, onViewDetails, focusSection }) => {
  const { user } = useAuth();

  const copy = useMemo(() => ({
    availableTitle: 'Puppy Available Now',
    availableSubtitle: 'Find litters that are ready for reservation or pickup.',
    title: 'Puppy Hub',
    subtitle: 'Track available litters and upcoming breeding pairs in one place.',
    reserve: 'Reserve Queue',
    reserveLogin: 'Login to Reserve',
    registerMatch: 'Register Breeding Match',
    contactLabel: 'Contact (phone/Line)',
    noteLabel: 'Note to breeder',
    submit: 'Submit Reservation',
    cancel: 'Cancel',
    status: 'Status',
    dueDate: 'Expected Due',
    matchDate: 'Match Date',
    sire: 'Sire',
    dam: 'Dam',
    offspring: 'Offspring history',
    noMatches: 'No registered breeding matches yet.',
    noAvailableMatches: 'No puppies available right now.',
    loginFirst: 'Please log in first.',
    registerTitle: 'Register Breeding Match',
    matchDateLabel: 'Match date',
    statusLabel: 'Status',
    descriptionLabel: 'Notes',
    sireLabel: 'Sire (male)',
    damLabel: 'Dam (female)',
    save: 'Save Match',
    queueTitle: 'Reservation Queue',
    queueEmpty: 'No reservations yet.',
    loginToQueue: 'Login to view queue',
    reservedBy: 'Reserved by',
    reservedOn: 'Booked',
    contactMaskLabel: 'Contact',
    memberFallback: 'Member',
    approvalTitle: 'Breeding Approval Requests',
    approvalSubtitle: 'Approve sire requests before they become verified matches.',
    approvalEmpty: 'No pending approvals.',
    approve: 'Approve',
    reject: 'Reject',
    awaitingApproval: 'Awaiting sire approval',
    approvedNotice: 'Match created and approved.',
    pendingNotice: 'Request sent to the sire owner for approval.',
    requesterLabel: 'Requested by'
  }), []);

  const [comingMatches, setComingMatches] = useState<MatchCard[]>([]);
  const [availableMatches, setAvailableMatches] = useState<MatchCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [reserveMatch, setReserveMatch] = useState<MatchCard | null>(null);
  const [reserveContact, setReserveContact] = useState('');
  const [reserveNote, setReserveNote] = useState('');
  const [reserveStatus, setReserveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [showRegister, setShowRegister] = useState(false);
  const [registerError, setRegisterError] = useState('');
  const [registerNotice, setRegisterNotice] = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);
  const [userPets, setUserPets] = useState<PetRow[]>([]);
  const [sireOptions, setSireOptions] = useState<PetRow[]>([]);
  const [reservationsByMatch, setReservationsByMatch] = useState<Record<string, ReservationRow[]>>({});
  const [reservationsLoading, setReservationsLoading] = useState(false);
  const [pendingApprovals, setPendingApprovals] = useState<MatchCard[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [matchForm, setMatchForm] = useState({
    sireId: '',
    damId: '',
    matchDate: '',
    status: 'planned' as MatchStatus,
    description: ''
  });

  const [litterModalOpen, setLitterModalOpen] = useState(false);
  const [selectedLitterMatch, setSelectedLitterMatch] = useState<MatchCard | null>(null);

  const statusConfig = useMemo(() => ({
    planned: {
      label: 'Planned',
      className: 'bg-yellow-50 text-yellow-600 border border-yellow-100'
    },
    mated: {
      label: 'Mated',
      className: 'bg-blue-50 text-blue-600 border border-blue-100'
    },
    confirmed: {
      label: 'Confirmed',
      className: 'bg-green-50 text-green-600 border border-green-100'
    },
    born: {
      label: 'Available',
      className: 'bg-[#ea4c89]/10 text-[#ea4c89] border border-pink-100'
    },
    failed: {
      label: 'Cancelled',
      className: 'bg-gray-50 text-gray-500 border border-gray-100'
    }
  }), []);

  useEffect(() => {
    if (!focusSection) return;
    const targetId = focusSection === 'available' ? 'puppy-available' : 'puppy-coming';
    const target = document.getElementById(targetId);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [focusSection]);

  const loadMatches = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('breeding_matches')
        .select('id, sire_id, dam_id, match_date, due_date, status, description, approval_status')
        .in('status', ['planned', 'mated', 'confirmed', 'born'])
        .order('match_date', { ascending: false })
        .limit(6);

      const filteredData = (data || []).filter((row: any) =>
        row.approval_status === 'approved' || row.approval_status === null
      );

      if (error) {
        console.error('Error loading breeding matches:', error);
        setComingMatches([]);
        setAvailableMatches([]);
        return;
      }

      if (!filteredData || filteredData.length === 0) {
        setComingMatches([]);
        setAvailableMatches([]);
        return;
      }

      const petIds = Array.from(new Set(filteredData.flatMap((row: any) => [row.sire_id, row.dam_id]).filter(Boolean)));
      let pets: PetRow[] = [];
      if (petIds.length > 0) {
        const { data: petsData, error: petsError } = await supabase
          .from('pets')
          .select('id, name, breed, type, gender, birthday, image_url, registration_number, owner_id, owner_name')
          .in('id', petIds);

        if (!petsError) {
          pets = petsData || [];
        } else {
          console.error('Error loading pets for matches:', petsError);
        }
      }

      const petMap = new Map<string, PetRow>();
      pets.forEach(pet => petMap.set(pet.id, pet));

      let offspringMap = new Map<string, string[]>();
      if (petIds.length > 0) {
        const orFilters = petIds.flatMap((id) => [`father_id.eq.${id}`, `mother_id.eq.${id}`]).join(',');
        const { data: offspring } = await supabase
          .from('pets')
          .select('name, father_id, mother_id')
          .or(orFilters)
          .limit(200);
        if (offspring) {
          offspring.forEach((child: any) => {
            if (child.father_id && petIds.includes(child.father_id)) {
              const list = offspringMap.get(child.father_id) || [];
              list.push(child.name);
              offspringMap.set(child.father_id, list);
            }
            if (child.mother_id && petIds.includes(child.mother_id)) {
              const list = offspringMap.get(child.mother_id) || [];
              list.push(child.name);
              offspringMap.set(child.mother_id, list);
            }
          });
        }
      }

      const cards: MatchCard[] = filteredData.map((row: any) => {
        const sire = row.sire_id ? petMap.get(row.sire_id) : null;
        const dam = row.dam_id ? petMap.get(row.dam_id) : null;
        const computedDue = row.due_date || (row.match_date ? addDays(row.match_date, 63) : null);
        return {
          ...row,
          sire,
          dam,
          dueDateComputed: computedDue,
          sireOffspring: row.sire_id ? (offspringMap.get(row.sire_id) || []) : [],
          damOffspring: row.dam_id ? (offspringMap.get(row.dam_id) || []) : []
        };
      });
      const available = cards.filter((match) => match.status === 'born');
      const coming = cards.filter((match) => match.status !== 'born' && match.status !== 'failed');
      setAvailableMatches(available);
      setComingMatches(coming);
      if (user) {
        await loadReservations([...available, ...coming]);
      } else {
        setReservationsByMatch({});
      }
    } finally {
      setLoading(false);
    }
  };

  const loadReservations = async (matchList: MatchCard[]) => {
    if (!user) {
      setReservationsByMatch({});
      return;
    }

    const pairs = matchList.filter((match) => match.sire_id && match.dam_id);
    if (pairs.length === 0) {
      setReservationsByMatch({});
      return;
    }

    setReservationsLoading(true);
    try {
      const filters = pairs
        .map((match) => `and(sire_id.eq.${match.sire_id},dam_id.eq.${match.dam_id})`)
        .join(',');

      const { data, error } = await supabase
        .from('breeding_reservations')
        .select('id, sire_id, dam_id, user_id, user_contact, user_note, status, created_at')
        .or(filters)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading reservations:', error);
        setReservationsByMatch({});
        return;
      }

      if (!data) {
        setReservationsByMatch({});
        return;
      }

      const userIds = data.map((row: any) => row.user_id).filter(Boolean);
      let userNameMap = new Map<string, string>();
      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);

        if (users) {
          users.forEach((u: any) => {
            userNameMap.set(u.id, u.full_name || 'Unknown');
          });
        }
      }

      const grouped: Record<string, ReservationRow[]> = {};
      data.forEach((row: any) => {
        const key = getMatchKey(row.sire_id, row.dam_id);
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push({
          ...row,
          user: row.user_id ? { full_name: userNameMap.get(row.user_id) || 'Unknown' } : null
        });
      });

      setReservationsByMatch(grouped);
    } finally {
      setReservationsLoading(false);
    }
  };


  const loadUserPets = async () => {
    if (!user) {
      setRegisterError(copy.loginFirst);
      setUserPets([]);
      return;
    }

    const { data: petsData } = await supabase
      .from('pets')
      .select('id, name, gender, breed, image_url, owner_id')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });

    // Add back type for compatibility
    setUserPets((petsData || []).map((p: any) => ({ ...p, type: p.type || 'dog' })));
  };

  const loadSireOptions = async () => {
    const { data: petsData } = await supabase
      .from('pets')
      .select('id, name, gender, breed, image_url, owner_id')
      .or('gender.eq.male,gender.eq.Male')
      .order('created_at', { ascending: false })
      .limit(200);

    setSireOptions((petsData || []).map((p: any) => ({ ...p, type: p.type || 'dog' })));
  };

  const loadPendingApprovals = async () => {
    if (!user) {
      setPendingApprovals([]);
      return;
    }

    setPendingLoading(true);
    try {
      let pendingRows: any[] | null = null;
      let pendingError: any = null;

      if (user.profile?.role === 'admin') {
        const { data, error } = await supabase
          .from('breeding_matches')
          .select('id, sire_id, dam_id, match_date, due_date, status, description, approval_status, requested_by')
          .eq('approval_status', 'pending')
          .order('match_date', { ascending: false });
        pendingRows = data;
        pendingError = error;
      } else {
        const { data: sirePets } = await supabase
          .from('pets')
          .select('id')
          .eq('owner_id', user.id);

        const sireIds = (sirePets || []).map((pet: any) => pet.id);
        if (sireIds.length === 0) {
          setPendingApprovals([]);
          setPendingLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('breeding_matches')
          .select('id, sire_id, dam_id, match_date, due_date, status, description, approval_status, requested_by')
          .eq('approval_status', 'pending')
          .in('sire_id', sireIds)
          .order('match_date', { ascending: false });
        pendingRows = data;
        pendingError = error;
      }

      if (pendingError) {
        console.error('Error loading pending approvals:', pendingError);
        setPendingApprovals([]);
        return;
      }

      if (!pendingRows || pendingRows.length === 0) {
        setPendingApprovals([]);
        return;
      }

      const petIds = Array.from(
        new Set(pendingRows.flatMap((row: any) => [row.sire_id, row.dam_id]).filter(Boolean))
      );

      const requesterIds = pendingRows
        .map((row: any) => row.requested_by)
        .filter(Boolean);

      let requesterMap = new Map<string, string>();
      if (requesterIds.length > 0) {
        const { data: requesters } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', requesterIds);

        if (requesters) {
          requesters.forEach((r: any) => {
            requesterMap.set(r.id, r.full_name || 'Unknown');
          });
        }
      }

      let pets: PetRow[] = [];
      if (petIds.length > 0) {
        const { data: petsData } = await supabase
          .from('pets')
          .select('id, name, breed, type, gender, birthday, image_url, registration_number, owner_id, owner_name')
          .in('id', petIds);
        pets = petsData || [];
      }

      const petMap = new Map<string, PetRow>();
      pets.forEach(pet => petMap.set(pet.id, pet));

      const cards: MatchCard[] = pendingRows.map((row: any) => ({
        ...row,
        sire: row.sire_id ? petMap.get(row.sire_id) : null,
        dam: row.dam_id ? petMap.get(row.dam_id) : null,
        dueDateComputed: row.due_date || (row.match_date ? addDays(row.match_date, 63) : null),
        requester: row.requested_by ? { full_name: requesterMap.get(row.requested_by) || 'Unknown' } : null
      }));

      setPendingApprovals(cards);
    } finally {
      setPendingLoading(false);
    }
  };

  useEffect(() => {
    loadMatches();
    loadPendingApprovals();
  }, [user?.id]);

  const handlePetDetails = async (petId?: string | null) => {
    if (!petId || !onViewDetails) return;
    const pet = await getPetById(petId);
    if (pet) onViewDetails(pet);
  };

  const notifyBreeders = async (match: MatchCard, contact: string, note: string) => {
    const ownerIds = [match.sire?.owner_id, match.dam?.owner_id].filter(Boolean) as string[];
    if (ownerIds.length === 0) return;

    const uniqueOwnerIds = Array.from(new Set(ownerIds));
    const reserverName = user?.profile?.full_name || user?.email || copy.memberFallback;
    const sireName = match.sire?.name || '-';
    const damName = match.dam?.name || '-';
    const message = `New reservation for ${sireName} x ${damName}. Contact: ${contact}. Note: ${note || '-'}.`;

    await Promise.all(
      uniqueOwnerIds.map((ownerId) =>
        createUserNotification({
          user_id: ownerId,
          type: 'puppy',
          title: `Reservation from ${reserverName}`,
          message,
          payload: {
            match_id: match.id,
            sire_id: match.sire_id,
            dam_id: match.dam_id,
            contact,
            note
          }
        })
      )
    );
  };

  const handleReserve = async () => {
    if (!reserveMatch?.sire_id || !reserveMatch?.dam_id) return;
    if (!user) {
      onRequireAuth?.();
      return;
    }
    if (!reserveContact.trim()) {
      setReserveStatus('error');
      return;
    }
    setReserveStatus('saving');
    try {
      await createReservation(reserveMatch.sire_id, reserveMatch.dam_id, reserveContact.trim(), reserveNote.trim());
      await notifyBreeders(reserveMatch, reserveContact.trim(), reserveNote.trim());
      await loadReservations([...availableMatches, ...comingMatches]);
      setReserveStatus('success');
      setReserveContact('');
      setReserveNote('');
      setTimeout(() => {
        setReserveStatus('idle');
        setReserveMatch(null);
      }, 1200);
    } catch (err) {
      setReserveStatus('error');
    }
  };

  const handleOpenRegister = async () => {
    setRegisterError('');
    setRegisterNotice('');
    if (!user) {
      onRequireAuth?.();
      setRegisterError(copy.loginFirst);
      return;
    }
    await Promise.all([loadUserPets(), loadSireOptions()]);
    setShowRegister(true);
  };

  const handleRegisterMatch = async () => {
    if (!matchForm.sireId || !matchForm.damId || !matchForm.matchDate) {
      setRegisterError('Please fill in all required fields.');
      return;
    }
    if (matchForm.sireId === matchForm.damId) {
      setRegisterError('Sire and dam must be different pets.');
      return;
    }

    // VALIDATION: Check if match date is too old (e.g., > 8 months ago)
    const matchDate = new Date(matchForm.matchDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - matchDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 240) { // Approx 8 months
      setRegisterError("Puppy created long ago. For historical records, please contact admin.");
      return;
    }
    if (!user) {
      onRequireAuth?.();
      setRegisterError(copy.loginFirst);
      return;
    }
    setRegisterLoading(true);
    setRegisterError('');
    setRegisterNotice('');
    try {
      const selectedSire = sireOptions.find(pet => pet.id === matchForm.sireId);
      const selectedDam = userPets.find(pet => pet.id === matchForm.damId);
      if (!selectedSire || !selectedDam) {
        setRegisterError('Please select valid sire and dam.');
        setRegisterLoading(false);
        return;
      }

      const needsApproval = !!selectedSire.owner_id && selectedSire.owner_id !== user.id;
      const approvalStatus: ApprovalStatus = needsApproval ? 'pending' : 'approved';
      const dueDate = addDays(matchForm.matchDate, 63);
      const { data, error } = await supabase
        .from('breeding_matches')
        .insert({
          sire_id: matchForm.sireId,
          dam_id: matchForm.damId,
          match_date: matchForm.matchDate,
          due_date: dueDate,
          status: matchForm.status,
          description: matchForm.description || null,
          requested_by: user.id,
          approval_status: approvalStatus,
          approved_by: needsApproval ? null : user.id,
          approved_at: needsApproval ? null : new Date().toISOString()
        })
        .select('id')
        .single();
      if (error) throw error;

      if (needsApproval && selectedSire.owner_id) {
        await createUserNotification({
          user_id: selectedSire.owner_id,
          type: 'breeding',
          title: 'Breeding match approval needed',
          message: `${selectedDam.name} wants to match with ${selectedSire.name}. Please review and approve.`,
          payload: {
            match_id: data?.id,
            sire_id: matchForm.sireId,
            dam_id: matchForm.damId,
            requested_by: user.id
          }
        });
      }

      setRegisterNotice(needsApproval ? copy.pendingNotice : copy.approvedNotice);
      setShowRegister(false);
      setMatchForm({
        sireId: '',
        damId: '',
        matchDate: '',
        status: 'planned',
        description: ''
      });
      await loadMatches();
      await loadPendingApprovals();
    } catch (err) {
      setRegisterError('Failed to save. Please try again.');
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleApprovalDecision = async (match: MatchCard, decision: ApprovalStatus) => {
    if (!user) {
      onRequireAuth?.();
      return;
    }
    try {
      const { error } = await supabase
        .from('breeding_matches')
        .update({
          approval_status: decision,
          approved_by: user.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', match.id);

      if (error) throw error;

      if (match.requested_by) {
        await createUserNotification({
          user_id: match.requested_by,
          type: 'breeding',
          title: `Breeding match ${decision}`,
          message: `Your request for ${match.sire?.name || 'sire'} x ${match.dam?.name || 'dam'} was ${decision}.`,
          payload: { match_id: match.id, decision }
        });
      }

      await loadPendingApprovals();
      await loadMatches();
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkBorn = async (match: MatchCard) => {
    if (!user) return;

    if (match.match_date) {
      const matchDate = new Date(match.match_date);
      const now = new Date();
      const diffTime = now.getTime() - matchDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 58) {
        alert("Wait for your puppies to be born first.");
        return;
      }
    }

    if (!confirm("Confirm that litters are born? This will notify all followers.")) return;

    try {
      const { error } = await supabase
        .from('breeding_matches')
        .update({
          status: 'born',
          due_date: new Date().toISOString()
        })
        .eq('id', match.id);

      if (error) throw error;

      const reservationKey = getMatchKey(match.sire_id, match.dam_id);
      const outputReservations = reservationsByMatch[reservationKey] || [];
      const distinctUserIds = Array.from(new Set(outputReservations.map(r => r.user_id).filter(Boolean))) as string[];

      if (distinctUserIds.length > 0) {
        const sireName = match.sire?.name || 'Sire';
        const damName = match.dam?.name || 'Dam';
        const message = `Great news! Puppies from ${sireName} x ${damName} are born! Contact the breeder now.`;

        await Promise.all(distinctUserIds.map(uid =>
          createUserNotification({
            user_id: uid,
            type: 'puppy',
            title: 'Puppies Born! 🐾',
            message: message,
            payload: { match_id: match.id, status: 'born' }
          })
        ));

        alert(`Status updated and ${distinctUserIds.length} interested users notified!`);
      }

      await loadMatches();

      // AUTO OPEN LITTER REGISTRATION
      setSelectedLitterMatch(match);
      setLitterModalOpen(true);

    } catch (err) {
      console.error(err);
      alert('Failed to update status');
    }
  };

  const renderMatchCards = (list: MatchCard[]) => (
    <div className="grid gap-6 lg:grid-cols-2">
      {list.map((match) => {
        const sire = match.sire;
        const dam = match.dam;
        const statusInfo = statusConfig[match.status] || statusConfig.planned;
        const sireOffspring = match.sireOffspring?.slice(0, 3) || [];
        const damOffspring = match.damOffspring?.slice(0, 3) || [];
        const ownerLabel = getOwnerName(sire) || getOwnerName(dam) || 'Unknown';
        const reservationKey = getMatchKey(match.sire_id, match.dam_id);
        const reservations = reservationsByMatch[reservationKey] || [];
        const isOwner = user && (user.id === sire?.owner_id || user.id === dam?.owner_id);

        return (
          <div key={match.id} className="rounded-3xl bg-white border border-gray-100 shadow-sm hover:shadow-lg transition-all p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${statusInfo.className}`}>{statusInfo.label}</span>
              {isOwner && match.status !== 'born' && (
                <button
                  onClick={() => handleMarkBorn(match)}
                  className="px-3 py-1 bg-[#ea4c89] text-white text-xs font-bold rounded-full hover:bg-pink-600 transition-colors"
                >
                  Mark as Born
                </button>
              )}
            </div>

            <div className="flex items-center justify-between gap-4">
              {/* SIRE */}
              <div
                className="flex flex-col items-center gap-2 cursor-pointer group"
                onClick={() => handlePetDetails(match.sire_id)}
              >
                <div className="relative">
                  <img src={sire?.image_url || ''} className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-md group-hover:scale-105 transition-transform" />
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white text-[10px]">♂</div>
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-[#0d0c22]">{sire?.name || 'Unknown'}</p>
                  <p className="text-xs text-gray-500">{sire?.breed || ''}</p>
                </div>
              </div>

              <div className="flex flex-col items-center gap-1">
                <div className="w-8 h-8 rounded-full bg-pink-50 flex items-center justify-center text-[#ea4c89] text-xs font-bold">X</div>
                <p className="text-[10px] text-gray-400 font-medium">Matched</p>
                <p className="text-xs font-bold text-[#0d0c22]">{formatDateShort(match.match_date)}</p>
              </div>

              {/* DAM */}
              <div
                className="flex flex-col items-center gap-2 cursor-pointer group"
                onClick={() => handlePetDetails(match.dam_id)}
              >
                <div className="relative">
                  <img src={dam?.image_url || ''} className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-md group-hover:scale-105 transition-transform" />
                  <div className="absolute -bottom-1 -left-1 w-5 h-5 bg-pink-500 rounded-full flex items-center justify-center text-white text-[10px]">♀</div>
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-[#0d0c22]">{dam?.name || 'Unknown'}</p>
                  <p className="text-xs text-gray-500">{dam?.breed || ''}</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-3 flex justify-between items-center text-xs">
              <div>
                <span className="text-gray-400 block mb-0.5">{match.status === 'born' ? 'Born Date' : 'Due Date'}</span>
                <span className="font-bold text-[#0d0c22]">{formatDateShort(match.status === 'born' ? match.due_date : match.dueDateComputed)}</span>
              </div>
              <div className="text-right">
                <span className="text-gray-400 block mb-0.5">Breeder</span>
                <span className="font-bold text-[#0d0c22]">{ownerLabel}</span>
              </div>
            </div>

            {/* RESERVATIONS */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Queue ({reservations.length})</h4>
                <button
                  onClick={() => setReserveMatch(match)}
                  className="text-xs font-bold text-[#ea4c89] hover:underline"
                >
                  Join Queue +
                </button>
              </div>
              <div className="flex -space-x-2 overflow-hidden mb-2 pl-1">
                {reservations.length > 0 ? reservations.slice(0, 5).map((r, i) => (
                  <div key={i} className="w-6 h-6 rounded-full bg-white border border-gray-100 flex items-center justify-center text-xs text-gray-500 shadow-sm" title={r.user?.full_name || 'User'}>
                    {(r.user?.full_name || 'U')[0]}
                  </div>
                )) : (
                  <p className="text-xs text-gray-400 italic pl-1">No reservations yet</p>
                )}
                {reservations.length > 5 && (
                  <div className="w-6 h-6 rounded-full bg-gray-100 border border-white flex items-center justify-center text-[10px] text-gray-500 font-bold">
                    +{reservations.length - 5}
                  </div>
                )}
              </div>
            </div>

            {/* Offspring Stats */}
            {(sireOffspring.length > 0 || damOffspring.length > 0) && (
              <div className="pt-3 border-t border-gray-100">
                <p className="text-[10px] text-gray-400">
                  <span className="font-bold text-gray-600">Offspring:</span> {sireOffspring.concat(damOffspring).slice(0, 3).join(', ')}...
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-16">
      {/* Pending Approvals (Admin/Owner) */}
      {pendingApprovals.length > 0 && (
        <div className="bg-amber-50 rounded-2xl p-6 border border-amber-100">
          <h3 className="text-lg font-bold text-amber-800 mb-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            {copy.approvalTitle}
          </h3>
          <div className="grid gap-4 md:grid-cols-2 mt-4">
            {pendingApprovals.map(match => (
              <div key={match.id} className="bg-white p-4 rounded-xl shadow-sm border border-amber-100/50">
                <div className="flex items-center gap-3 mb-3">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 uppercase">{copy.awaitingApproval}</span>
                  <span className="text-xs text-gray-400">{formatDateShort(match.match_date)}</span>
                </div>
                <p className="text-sm text-[#0d0c22] font-medium mb-3">
                  <span className="font-bold">{match.dam?.name}</span> wants to match with <span className="font-bold">{match.sire?.name}</span>
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprovalDecision(match, 'approved')}
                    className="flex-1 py-2 bg-green-500 text-white rounded-lg text-xs font-bold hover:bg-green-600"
                  >
                    {copy.approve}
                  </button>
                  <button
                    onClick={() => handleApprovalDecision(match, 'rejected')}
                    className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-200"
                  >
                    {copy.reject}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Available Puppies */}
      <div id="puppy-available" className="scroll-mt-24">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-3xl font-black text-[#0d0c22] mb-2">{copy.availableTitle}</h2>
            <p className="text-gray-500">{copy.availableSubtitle}</p>
          </div>
          {/* Action Button? */}
        </div>

        {loading ? (
          <div className="text-center py-10 text-gray-400">Loading...</div>
        ) : availableMatches.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center border border-dashed border-gray-200">
            <span className="text-4xl opacity-50 block mb-4">🐶</span>
            <p className="text-gray-500 font-medium">{copy.noAvailableMatches}</p>
          </div>
        ) : (
          renderMatchCards(availableMatches)
        )}
      </div>

      {/* Upcoming Matches */}
      <div id="puppy-coming" className="scroll-mt-24">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-3xl font-black text-[#0d0c22] mb-2">{copy.title}</h2>
            <p className="text-gray-500">{copy.subtitle}</p>
          </div>
          <button
            onClick={handleOpenRegister}
            className="px-6 py-3 bg-[#ea4c89] text-white rounded-xl text-sm font-bold shadow-lg shadow-pink-200 hover:bg-pink-600 hover:-translate-y-0.5 transition-all"
          >
            + {copy.registerMatch}
          </button>
        </div>

        {loading ? (
          <div className="text-center py-10 text-gray-400">Loading...</div>
        ) : comingMatches.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center border border-dashed border-gray-200">
            <span className="text-4xl opacity-50 block mb-4">🧬</span>
            <p className="text-gray-500 font-medium">{copy.noMatches}</p>
          </div>
        ) : (
          renderMatchCards(comingMatches)
        )}
      </div>

      {/* MODALS */}
      {/* Reservation Dialog */}
      <Dialog open={!!reserveMatch} onOpenChange={(open) => !open && setReserveMatch(null)}>
        <DialogContent className="sm:max-w-md bg-white border-none rounded-2xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#0d0c22]">{copy.reserve}</DialogTitle>
            <DialogDescription className="text-gray-500">
              Join the queue for {reserveMatch?.sire?.name} x {reserveMatch?.dam?.name}
            </DialogDescription>
          </DialogHeader>

          {!user ? (
            <div className="text-center py-6">
              <p className="text-orange-500 font-medium mb-4">{copy.loginFirst}</p>
              <button onClick={() => onRequireAuth?.()} className="px-6 py-2 bg-[#0d0c22] text-white rounded-lg font-bold">
                Login
              </button>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div>
                <label className="block text-sm font-bold text-[#0d0c22] mb-1">{copy.contactLabel}</label>
                <input
                  type="text"
                  value={reserveContact}
                  onChange={(e) => setReserveContact(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-[#ea4c89] outline-none transition-all"
                  placeholder="e.g. 081-xxx-xxxx"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-[#0d0c22] mb-1">{copy.noteLabel}</label>
                <textarea
                  value={reserveNote}
                  onChange={(e) => setReserveNote(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-[#ea4c89] outline-none transition-all h-24 resize-none"
                  placeholder="Prefer male/female?"
                />
              </div>

              {reserveStatus === 'error' && <p className="text-red-500 text-sm font-bold">Failed to submit. Please check fields.</p>}
              {reserveStatus === 'success' && <p className="text-green-500 text-sm font-bold">Success! Added to queue.</p>}

              <div className="flex gap-3 mt-4">
                <button onClick={() => setReserveMatch(null)} className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-50 rounded-xl transition-colors">
                  {copy.cancel}
                </button>
                <button
                  onClick={handleReserve}
                  disabled={reserveStatus === 'saving' || reserveStatus === 'success'}
                  className="flex-1 py-3 bg-[#0d0c22] text-white font-bold rounded-xl hover:bg-gray-900 transition-colors disabled:opacity-50"
                >
                  {reserveStatus === 'saving' ? 'Saving...' : copy.submit}
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Registration Dialog */}
      <Dialog open={showRegister} onOpenChange={setShowRegister}>
        <DialogContent className="sm:max-w-lg bg-white border-none rounded-2xl shadow-xl overflow-hidden">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#0d0c22]">{copy.registerTitle}</DialogTitle>
            <DialogDescription className="text-gray-500">Record a new breeding match.</DialogDescription>
          </DialogHeader>

          {registerError && (
            <div className="bg-red-50 text-red-500 p-3 rounded-lg text-sm font-bold mb-2 icon-error">
              {registerError}
            </div>
          )}
          {registerNotice && (
            <div className="bg-green-50 text-green-600 p-3 rounded-lg text-sm font-bold mb-2">
              {registerNotice}
            </div>
          )}

          <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-[#0d0c22] mb-1">{copy.sireLabel}</label>
                <select
                  value={matchForm.sireId}
                  onChange={(e) => setMatchForm({ ...matchForm, sireId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white focus:border-[#ea4c89] outline-none"
                >
                  <option value="">Select Sire</option>
                  {sireOptions.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.breed})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-[#0d0c22] mb-1">{copy.damLabel}</label>
                <select
                  value={matchForm.damId}
                  onChange={(e) => setMatchForm({ ...matchForm, damId: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white focus:border-[#ea4c89] outline-none"
                >
                  <option value="">Select Dam</option>
                  {userPets.filter(p => p.gender === 'female' || p.gender === 'Female').map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.breed})</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-[#0d0c22] mb-1">{copy.matchDateLabel}</label>
              <input
                type="date"
                value={matchForm.matchDate}
                onChange={(e) => setMatchForm({ ...matchForm, matchDate: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white focus:border-[#ea4c89] outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-[#0d0c22] mb-1">{copy.statusLabel}</label>
              <div className="flex flex-wrap gap-2">
                {(['planned', 'mated', 'confirmed', 'born'] as MatchStatus[]).map(s => (
                  <button
                    key={s}
                    onClick={() => setMatchForm({ ...matchForm, status: s })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${matchForm.status === s ? 'bg-[#ea4c89] text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-[#0d0c22] mb-1">{copy.descriptionLabel}</label>
              <textarea
                value={matchForm.description}
                onChange={(e) => setMatchForm({ ...matchForm, description: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-white focus:border-[#ea4c89] outline-none h-20 resize-none"
                placeholder="Optional notes..."
              />
            </div>

            <div className="pt-2">
              <button
                onClick={handleRegisterMatch}
                disabled={registerLoading}
                className="w-full py-3 bg-[#0d0c22] text-white font-bold rounded-xl hover:bg-gray-900 transition-all shadow-lg"
              >
                {registerLoading ? 'Saving...' : copy.save}
              </button>
            </div>
          </div>

        </DialogContent>
      </Dialog>

      {/* Litter Registration Modal */}
      {selectedLitterMatch && (
        <LitterRegistrationModal
          open={litterModalOpen}
          onOpenChange={setLitterModalOpen}
          matchId={selectedLitterMatch.id}
          sireId={selectedLitterMatch.sire_id}
          damId={selectedLitterMatch.dam_id}
          damName={selectedLitterMatch.dam?.name}
        />
      )}
    </div>
  );
};

export default PuppyComingSoonSection;
