import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { createReservation, createUserNotification } from '@/lib/database';
import { useAuth } from '@/contexts/AuthContext';
import { getPetById } from '@/lib/petsService';
import { Pet } from '@/data/petData';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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

  const statusConfig = useMemo(() => ({
    planned: {
      label: 'Planned',
      className: 'bg-[#C5A059]/20 text-[#C5A059] border border-[#C5A059]/30'
    },
    mated: {
      label: 'Mated',
      className: 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
    },
    confirmed: {
      label: 'Confirmed',
      className: 'bg-green-500/20 text-green-400 border border-green-500/30'
    },
    born: {
      label: 'Available',
      className: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
    },
    failed: {
      label: 'Cancelled',
      className: 'bg-[#B8B8B8]/10 text-[#B8B8B8] border border-[#B8B8B8]/30'
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
      // First, try to load breeding_matches - simplified query without relations that might fail
      const { data, error } = await supabase
        .from('breeding_matches')
        .select('id, sire_id, dam_id, match_date, due_date, status, description, approval_status')
        .in('status', ['planned', 'mated', 'confirmed', 'born'])
        .order('match_date', { ascending: false })
        .limit(6);

      // Filter for approved matches client-side to avoid complex OR conditions
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
        // Try without profiles relation first (more compatible)
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

      // Simplified query without profiles relation
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

      // Fetch user names separately if needed
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

    setUserPets(petsData || []);
  };

  const loadSireOptions = async () => {
    const { data: petsData } = await supabase
      .from('pets')
      .select('id, name, gender, breed, image_url, owner_id')
      .or('gender.eq.male,gender.eq.Male')
      .order('created_at', { ascending: false })
      .limit(200);

    setSireOptions(petsData || []);
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

      // Simplified query without profiles relation that might not exist
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

        // Filter for male pets client-side
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

      // Get requester names separately
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
        return (
          <div key={match.id} className="rounded-2xl bg-[#1A1A1A] border border-[#C5A059]/10 shadow-sm p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${statusInfo.className}`}>{statusInfo.label}</span>
              <span className="text-xs text-[#B8B8B8]/50">{copy.dueDate}: {formatDateShort(match.dueDateComputed)}</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => handlePetDetails(sire?.id)}
                className="rounded-xl bg-[#0D0D0D] p-3 flex gap-3 items-center text-left hover:bg-[#C5A059]/10 border border-[#C5A059]/10 hover:border-[#C5A059]/30 transition-colors"
              >
                <img
                  src={sire?.image_url || '/placeholder-pet.png'}
                  alt={sire?.name || 'Sire'}
                  className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                />
                <div>
                  <p className="text-xs text-[#C5A059]/60 font-semibold">{copy.sire}</p>
                  <p className="text-sm font-bold text-[#F5F5F0]">{sire?.name || '-'}</p>
                  <p className="text-[10px] text-[#B8B8B8]/50">{sire?.breed || '-'}</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => handlePetDetails(dam?.id)}
                className="rounded-xl bg-[#0D0D0D] p-3 flex gap-3 items-center text-left hover:bg-[#C5A059]/10 border border-[#C5A059]/10 hover:border-[#C5A059]/30 transition-colors"
              >
                <img
                  src={dam?.image_url || '/placeholder-pet.png'}
                  alt={dam?.name || 'Dam'}
                  className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                />
                <div>
                  <p className="text-xs text-[#C5A059]/60 font-semibold">{copy.dam}</p>
                  <p className="text-sm font-bold text-[#F5F5F0]">{dam?.name || '-'}</p>
                  <p className="text-[10px] text-[#B8B8B8]/50">{dam?.breed || '-'}</p>
                </div>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs text-[#B8B8B8]/60">
              <div>
                <div className="font-semibold text-[#B8B8B8]/50">{copy.matchDate}</div>
                <div className="font-bold text-[#F5F5F0]">{formatDateShort(match.match_date)}</div>
              </div>
              <div>
                <div className="font-semibold text-[#B8B8B8]/50">{copy.offspring}</div>
                <div className="text-[#B8B8B8]/80">
                  {sireOffspring.length > 0 || damOffspring.length > 0
                    ? `${sireOffspring.length ? `${copy.sire}: ${sireOffspring.join(', ')}` : ''}${sireOffspring.length && damOffspring.length ? ' | ' : ''}${damOffspring.length ? `${copy.dam}: ${damOffspring.join(', ')}` : ''}`
                    : 'No recorded offspring yet.'}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-[#B8B8B8]/50">
              <span>{copy.status}: {statusInfo.label}</span>
              <span>{ownerLabel}</span>
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={() => {
                  if (!user) {
                    onRequireAuth?.();
                    return;
                  }
                  setReserveMatch(match);
                }}
                disabled={!match.sire_id || !match.dam_id}
                className="px-4 py-2 rounded-xl bg-[#C5A059] text-[#0A0A0A] text-xs font-bold shadow hover:bg-[#D4C4B5] transition-colors disabled:opacity-50"
              >
                {user ? copy.reserve : copy.reserveLogin}
              </button>
              {match.description && (
                <span className="text-xs text-[#B8B8B8]/50 line-clamp-1">{match.description}</span>
              )}
            </div>

            <div className="border-t border-[#C5A059]/10 pt-3">
              <div className="flex items-center justify-between text-xs text-[#B8B8B8]/50">
                <span>{copy.queueTitle}</span>
                <span className="text-[#C5A059]">{reservations.length}</span>
              </div>
              {!user ? (
                <button
                  type="button"
                  onClick={() => onRequireAuth?.()}
                  className="mt-2 text-xs font-semibold text-[#C5A059] hover:underline"
                >
                  {copy.loginToQueue}
                </button>
              ) : reservationsLoading ? (
                <p className="mt-2 text-xs text-[#B8B8B8]/50">Loading...</p>
              ) : reservations.length === 0 ? (
                <p className="mt-2 text-xs text-[#B8B8B8]/50">{copy.queueEmpty}</p>
              ) : (
                <div className="mt-2 space-y-2">
                  {reservations.map((reservation, index) => {
                    const reserverName = reservation.user?.full_name || copy.memberFallback;
                    return (
                      <div key={reservation.id} className="flex items-center justify-between text-xs text-[#B8B8B8]/70">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[#C5A059]/60">{index + 1}.</span>
                          <span className="font-semibold truncate text-[#F5F5F0]">{reserverName}</span>
                          <span className="text-foreground/40">{maskContact(reservation.user_contact)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-foreground/40">
                          <span>{formatReservationDate(reservation.created_at)}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${getReservationStatusClass(reservation.status)}`}>
                            {reservation.status || 'pending'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <section id="puppy-coming-soon" className="relative py-16 px-4 scroll-mt-24">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
          <div>
            <h3 className="text-3xl font-['Playfair_Display'] font-bold text-[#F5F5F0]">{copy.title}</h3>
            <p className="text-[#B8B8B8]/60 mt-2 max-w-2xl">{copy.subtitle}</p>
          </div>
          <button
            onClick={handleOpenRegister}
            className="px-6 py-3 rounded-xl bg-[#C5A059] text-[#0A0A0A] text-sm font-bold shadow hover:bg-[#D4C4B5] transition-colors"
          >
            {copy.registerMatch}
          </button>
        </div>
        {registerNotice && (
          <div className="mb-6 rounded-2xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400">
            {registerNotice}
          </div>
        )}
        {(user && (pendingLoading || pendingApprovals.length > 0)) && (
          <div className="mb-8 rounded-2xl bg-[#1A1A1A] border border-[#C5A059]/10 shadow-sm p-5">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
              <div>
                <h4 className="text-lg font-bold text-[#F5F5F0]">{copy.approvalTitle}</h4>
                <p className="text-xs text-[#B8B8B8]/50">{copy.approvalSubtitle}</p>
              </div>
            </div>
            {pendingLoading ? (
              <p className="text-sm text-[#B8B8B8]/50">Loading...</p>
            ) : pendingApprovals.length === 0 ? (
              <p className="text-sm text-[#B8B8B8]/50">{copy.approvalEmpty}</p>
            ) : (
              <div className="space-y-3">
                {pendingApprovals.map((match) => (
                  <div key={match.id} className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-xl border border-[#C5A059]/10 bg-[#0D0D0D] px-4 py-3">
                    <div>
                      <div className="text-sm font-bold text-[#F5F5F0]">
                        {match.sire?.name || '-'} x {match.dam?.name || '-'}
                      </div>
                      <div className="text-xs text-[#B8B8B8]/50">
                        Match date: {formatDateShort(match.match_date)} | Due: {formatDateShort(match.dueDateComputed)}
                      </div>
                      <div className="text-xs text-[#B8B8B8]/50">
                        {copy.requesterLabel}: {match.requester?.full_name || copy.memberFallback}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleApprovalDecision(match, 'approved')}
                        className="px-3 py-2 rounded-lg bg-[#C5A059] text-[#0A0A0A] text-xs font-bold hover:bg-[#D4C4B5] transition-colors"
                      >
                        {copy.approve}
                      </button>
                      <button
                        onClick={() => handleApprovalDecision(match, 'rejected')}
                        className="px-3 py-2 rounded-lg border border-red-500/30 text-red-400 text-xs font-bold hover:bg-red-500/10 transition-colors"
                      >
                        {copy.reject}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div className="grid gap-6 md:grid-cols-2">
            {[0, 1].map((i) => (
              <div key={i} className="h-56 rounded-2xl bg-[#1A1A1A] border border-[#C5A059]/10 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-12">
            <div id="puppy-available" className="scroll-mt-24">
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-6">
                <div>
                  <h4 className="text-2xl font-['Playfair_Display'] text-[#F5F5F0]">{copy.availableTitle}</h4>
                  <p className="text-sm text-[#B8B8B8]/60">{copy.availableSubtitle}</p>
                </div>
              </div>
              {availableMatches.length === 0 ? (
                <div className="rounded-2xl bg-[#1A1A1A] border border-dashed border-[#C5A059]/20 p-8 text-center text-[#B8B8B8]/60">
                  {copy.noAvailableMatches}
                </div>
              ) : (
                renderMatchCards(availableMatches)
              )}
            </div>

            <div id="puppy-coming" className="scroll-mt-24">
              <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-6">
                <div>
                  <h4 className="text-2xl font-['Playfair_Display'] text-[#F5F5F0]">{copy.title}</h4>
                  <p className="text-sm text-[#B8B8B8]/60">{copy.subtitle}</p>
                </div>
              </div>
              {comingMatches.length === 0 ? (
                <div className="rounded-2xl bg-[#1A1A1A] border border-dashed border-[#C5A059]/20 p-8 text-center text-[#B8B8B8]/60">
                  {copy.noMatches}
                </div>
              ) : (
                renderMatchCards(comingMatches)
              )}
            </div>
          </div>
        )}
      </div>

      <Dialog open={!!reserveMatch} onOpenChange={(open) => !open && setReserveMatch(null)}>
        <DialogContent className="max-w-md" aria-describedby="reserve-description">
          <DialogHeader>
            <DialogTitle>{copy.reserve}</DialogTitle>
            <DialogDescription id="reserve-description">
              {reserveMatch?.sire?.name} × {reserveMatch?.dam?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-foreground/60">{copy.contactLabel}</label>
              <input
                value={reserveContact}
                onChange={(e) => setReserveContact(e.target.value)}
                className="w-full mt-1 rounded-lg border border-gray-200 px-3 py-2 text-sm"
                placeholder="Phone or Line"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-foreground/60">{copy.noteLabel}</label>
              <textarea
                value={reserveNote}
                onChange={(e) => setReserveNote(e.target.value)}
                className="w-full mt-1 rounded-lg border border-gray-200 px-3 py-2 text-sm min-h-[90px]"
              />
            </div>
            {reserveStatus === 'error' && (
              <p className="text-xs text-red-500">
                Please provide your contact info.
              </p>
            )}
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setReserveMatch(null)}
                className="px-3 py-2 rounded-lg text-xs font-bold text-foreground/60"
              >
                {copy.cancel}
              </button>
              <button
                onClick={handleReserve}
                className="px-3 py-2 rounded-lg bg-[#2C2C2C] text-white text-xs font-bold"
                disabled={reserveStatus === 'saving'}
              >
                {reserveStatus === 'saving' ? '...' : copy.submit}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showRegister} onOpenChange={(open) => !open && setShowRegister(false)}>
        <DialogContent className="max-w-md" aria-describedby="register-match-description">
          <DialogHeader>
            <DialogTitle>{copy.registerTitle}</DialogTitle>
            <DialogDescription id="register-match-description">
              Add your breeding pair to the system.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {registerError && (
              <p className="text-xs text-red-500">{registerError}</p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-foreground/60">{copy.sireLabel}</label>
                <select
                  value={matchForm.sireId}
                  onChange={(e) => setMatchForm((prev) => ({ ...prev, sireId: e.target.value }))}
                  className="w-full mt-1 rounded-lg border border-gray-200 px-2 py-2 text-sm"
                >
                  <option value="">Select sire</option>
                  {sireOptions.map((pet) => (
                    <option key={pet.id} value={pet.id}>
                      {pet.name}{pet.owner_id === user?.id ? ' (mine)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-foreground/60">{copy.damLabel}</label>
                <select
                  value={matchForm.damId}
                  onChange={(e) => setMatchForm((prev) => ({ ...prev, damId: e.target.value }))}
                  className="w-full mt-1 rounded-lg border border-gray-200 px-2 py-2 text-sm"
                >
                  <option value="">Select dam</option>
                  {userPets.filter(pet => pet.gender?.toLowerCase() === 'female').map((pet) => (
                    <option key={pet.id} value={pet.id}>{pet.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-foreground/60">{copy.matchDateLabel}</label>
              <input
                type="date"
                value={matchForm.matchDate}
                onChange={(e) => setMatchForm((prev) => ({ ...prev, matchDate: e.target.value }))}
                className="w-full mt-1 rounded-lg border border-gray-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-foreground/60">{copy.statusLabel}</label>
              <select
                value={matchForm.status}
                onChange={(e) => setMatchForm((prev) => ({ ...prev, status: e.target.value as MatchStatus }))}
                className="w-full mt-1 rounded-lg border border-gray-200 px-3 py-2 text-sm"
              >
                <option value="planned">{statusConfig.planned.label}</option>
                <option value="mated">{statusConfig.mated.label}</option>
                <option value="confirmed">{statusConfig.confirmed.label}</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-foreground/60">{copy.descriptionLabel}</label>
              <textarea
                value={matchForm.description}
                onChange={(e) => setMatchForm((prev) => ({ ...prev, description: e.target.value }))}
                className="w-full mt-1 rounded-lg border border-gray-200 px-3 py-2 text-sm min-h-[80px]"
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setShowRegister(false)}
                className="px-3 py-2 rounded-lg text-xs font-bold text-foreground/60"
              >
                {copy.cancel}
              </button>
              <button
                onClick={handleRegisterMatch}
                className="px-3 py-2 rounded-lg bg-[#2C2C2C] text-white text-xs font-bold"
                disabled={registerLoading}
              >
                {registerLoading ? '...' : copy.save}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default PuppyComingSoonSection;
