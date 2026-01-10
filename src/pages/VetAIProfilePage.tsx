import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Pet } from '@/data/petData';
import { getPetById } from '@/lib/petsService';
import {
  getPetHealthProfile,
  PetHealthProfile,
  SpayNeuterStatus,
  upsertPetHealthProfile
} from '@/lib/database';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type VetProfileForm = {
  clinicName: string;
  clinicPhone: string;
  vetName: string;
  weightKg: string;
  dietSummary: string;
  feedingSchedule: string;
  exerciseNotes: string;
  allergies: string;
  conditions: string;
  medications: string;
  vaccines: string;
  dewormingSchedule: string;
  lastCheckupDate: string;
  spayNeuterStatus: SpayNeuterStatus;
  reproductiveHistory: string;
  familyHistoryNotes: string;
  incidentHistory: string;
  riskFlags: string;
  emergencyPlan: string;
  notes: string;
};

const emptyForm: VetProfileForm = {
  clinicName: '',
  clinicPhone: '',
  vetName: '',
  weightKg: '',
  dietSummary: '',
  feedingSchedule: '',
  exerciseNotes: '',
  allergies: '',
  conditions: '',
  medications: '',
  vaccines: '',
  dewormingSchedule: '',
  lastCheckupDate: '',
  spayNeuterStatus: 'unknown',
  reproductiveHistory: '',
  familyHistoryNotes: '',
  incidentHistory: '',
  riskFlags: '',
  emergencyPlan: '',
  notes: ''
};

const VetAIProfilePage: React.FC = () => {
  const { petId } = useParams<{ petId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.profile?.role === 'admin';

  const [pet, setPet] = useState<Pet | null>(null);
  const [profile, setProfile] = useState<PetHealthProfile | null>(null);
  const [form, setForm] = useState<VetProfileForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [accessState, setAccessState] = useState<'ok' | 'login' | 'denied'>('ok');

  const isOwner = useMemo(() => {
    if (!user || !pet?.owner_id) return false;
    return user.id === pet.owner_id;
  }, [user, pet]);

  const canEdit = Boolean(user && (isAdmin || isOwner));

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      if (!petId) {
        navigate('/');
        return;
      }

      setLoading(true);
      setErrorMessage('');
      setStatusMessage('');

      try {
        const petData = await getPetById(petId);
        if (!isMounted) return;
        if (!petData) {
          setAccessState('denied');
          setErrorMessage('Pet not found.');
          setLoading(false);
          return;
        }

        setPet(petData);

        if (!user) {
          setAccessState('login');
          setLoading(false);
          return;
        }

        if (!isAdmin) {
          if (!petData.owner_id || petData.owner_id !== user.id) {
            setAccessState('denied');
            setLoading(false);
            return;
          }
        }

        setAccessState('ok');
        const healthProfile = await getPetHealthProfile(petId);
        if (!isMounted) return;

        setProfile(healthProfile);
        setForm({
          clinicName: healthProfile?.clinic_name || '',
          clinicPhone: healthProfile?.clinic_phone || '',
          vetName: healthProfile?.vet_name || '',
          weightKg: healthProfile?.weight_kg != null ? String(healthProfile.weight_kg) : '',
          dietSummary: healthProfile?.diet_summary || '',
          feedingSchedule: healthProfile?.feeding_schedule || '',
          exerciseNotes: healthProfile?.exercise_notes || '',
          allergies: healthProfile?.allergies || '',
          conditions: healthProfile?.conditions || '',
          medications: healthProfile?.medications || '',
          vaccines: healthProfile?.vaccines || '',
          dewormingSchedule: healthProfile?.deworming_schedule || '',
          lastCheckupDate: healthProfile?.last_checkup_date || '',
          spayNeuterStatus: (healthProfile?.spay_neuter_status || 'unknown') as SpayNeuterStatus,
          reproductiveHistory: healthProfile?.reproductive_history || '',
          familyHistoryNotes: healthProfile?.family_history_notes || '',
          incidentHistory: healthProfile?.incident_history || '',
          riskFlags: healthProfile?.risk_flags?.join(', ') || '',
          emergencyPlan: healthProfile?.emergency_plan || '',
          notes: healthProfile?.notes || ''
        });
      } catch (error) {
        console.error('Failed to load Vet AI profile:', error);
        if (!isMounted) return;
        setErrorMessage('Unable to load Vet AI Profile data.');
        setAccessState('denied');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [petId, navigate, user, isAdmin]);

  const updateForm = (field: keyof VetProfileForm, value: string | SpayNeuterStatus) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const toNullable = (value: string) => {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  };

  const parseWeight = (value: string) => {
    if (!value.trim()) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const parseRiskFlags = (value: string) => {
    const items = value
      .split(/[,\\n]/)
      .map(item => item.trim())
      .filter(Boolean);
    return items.length ? items : null;
  };

  const handleSave = async () => {
    if (!pet || !user) {
      setErrorMessage('Please log in to save.');
      return;
    }
    if (!canEdit) {
      setErrorMessage('You do not have permission to edit this profile.');
      return;
    }

    setSaving(true);
    setErrorMessage('');
    setStatusMessage('');

    try {
      const payload: Omit<PetHealthProfile, 'id' | 'created_at' | 'updated_at'> = {
        pet_id: pet.id,
        created_by: profile?.created_by || user.id,
        updated_by: user.id,
        clinic_name: toNullable(form.clinicName),
        clinic_phone: toNullable(form.clinicPhone),
        vet_name: toNullable(form.vetName),
        weight_kg: parseWeight(form.weightKg),
        diet_summary: toNullable(form.dietSummary),
        feeding_schedule: toNullable(form.feedingSchedule),
        exercise_notes: toNullable(form.exerciseNotes),
        allergies: toNullable(form.allergies),
        conditions: toNullable(form.conditions),
        medications: toNullable(form.medications),
        vaccines: toNullable(form.vaccines),
        deworming_schedule: toNullable(form.dewormingSchedule),
        last_checkup_date: form.lastCheckupDate || null,
        spay_neuter_status: form.spayNeuterStatus || 'unknown',
        reproductive_history: toNullable(form.reproductiveHistory),
        family_history_notes: toNullable(form.familyHistoryNotes),
        incident_history: toNullable(form.incidentHistory),
        risk_flags: parseRiskFlags(form.riskFlags),
        emergency_plan: toNullable(form.emergencyPlan),
        notes: toNullable(form.notes)
      };

      const saved = await upsertPetHealthProfile(payload);
      setProfile(saved);
      setStatusMessage('Vet AI Profile saved.');
    } catch (error) {
      console.error('Save Vet AI profile failed:', error);
      setErrorMessage('Failed to save Vet AI Profile.');
    } finally {
      setSaving(false);
    }
  };

  const renderAccessMessage = () => {
    const title = accessState === 'login' ? 'Login required' : 'Access restricted';
    const description =
      accessState === 'login'
        ? 'Please sign in to view or edit Vet AI Profiles.'
        : 'Only the pet owner or admins can view this Vet AI Profile.';

    return (
      <div className="mt-10 rounded-2xl border border-[#E6DED2] bg-white/80 p-8 text-center shadow-sm">
        <h2 className="font-['Playfair_Display'] text-2xl text-[#2B2B2B] mb-2">{title}</h2>
        <p className="text-sm text-[#6B6B6B] mb-6">{description}</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button variant="outline" onClick={() => navigate('/')}>Back to Home</Button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#F5F2EA] via-[#F9F6F0] to-[#EFE8DC] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-[#A4835C] border-t-transparent mb-4"></div>
          <p className="text-[#6B6B6B]">Loading Vet AI Profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F5F2EA] via-[#F9F6F0] to-[#EFE8DC] text-[#2B2B2B]">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-[#A4835C] font-semibold">Vet AI Profile</p>
            <h1 className="font-['Playfair_Display'] text-3xl md:text-4xl mt-2">
              {pet?.name || 'Pet'} Health Snapshot
            </h1>
            <p className="text-sm text-[#6B6B6B] mt-2 max-w-2xl">
              This profile captures structured health history to help owners and Vet AI prevent risks. It does not replace professional veterinary care.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => navigate(-1)}>Back</Button>
            <Button onClick={handleSave} disabled={!canEdit || saving}>
              {saving ? 'Saving...' : 'Save Profile'}
            </Button>
          </div>
        </div>

        {errorMessage && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {statusMessage && (
          <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {statusMessage}
          </div>
        )}

        {accessState !== 'ok' && renderAccessMessage()}

        {accessState === 'ok' && (
          <>
            <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1.2fr_2fr]">
              <div className="rounded-2xl border border-[#E6DED2] bg-white/80 p-6 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="h-20 w-20 overflow-hidden rounded-2xl bg-[#E9E1D6]">
                    {pet?.image ? (
                      <img src={pet.image} alt={pet.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-[#A4835C] text-sm font-semibold">
                        No Photo
                      </div>
                    )}
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">{pet?.name}</h2>
                    <p className="text-sm text-[#6B6B6B]">{pet?.breed || 'Unknown breed'}</p>
                    <p className="text-sm text-[#6B6B6B]">Owner: {pet?.owner || 'Unknown'}</p>
                  </div>
                </div>
                <div className="mt-6 border-t border-[#EFE8DC] pt-4 text-sm text-[#6B6B6B] space-y-2">
                  <p>Birth date: {pet?.birthDate || 'Unknown'}</p>
                  <p>Registration: {pet?.registrationNumber || 'Pending'}</p>
                  <p>Location: {pet?.location || 'Unknown'}</p>
                  <p>Gender: {pet?.gender || 'Unknown'}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-[#E6DED2] bg-white/80 p-6 shadow-sm">
                <h3 className="text-lg font-semibold mb-4">Vet Contact</h3>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Clinic Name</Label>
                    <Input
                      value={form.clinicName}
                      onChange={(e) => updateForm('clinicName', e.target.value)}
                      placeholder="Vet clinic"
                      disabled={!canEdit}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Vet Name</Label>
                    <Input
                      value={form.vetName}
                      onChange={(e) => updateForm('vetName', e.target.value)}
                      placeholder="Attending vet"
                      disabled={!canEdit}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Clinic Phone</Label>
                    <Input
                      value={form.clinicPhone}
                      onChange={(e) => updateForm('clinicPhone', e.target.value)}
                      placeholder="Contact number"
                      disabled={!canEdit}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-[#E6DED2] bg-white/80 p-6 shadow-sm space-y-4">
                <h3 className="text-lg font-semibold">Basic Health</h3>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Weight (kg)</Label>
                    <Input
                      type="number"
                      value={form.weightKg}
                      onChange={(e) => updateForm('weightKg', e.target.value)}
                      placeholder="e.g. 18.5"
                      disabled={!canEdit}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Last Checkup</Label>
                    <Input
                      type="date"
                      value={form.lastCheckupDate}
                      onChange={(e) => updateForm('lastCheckupDate', e.target.value)}
                      disabled={!canEdit}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Spay/Neuter</Label>
                    <Select
                      value={form.spayNeuterStatus}
                      onValueChange={(value) => updateForm('spayNeuterStatus', value as SpayNeuterStatus)}
                      disabled={!canEdit}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unknown">Unknown</SelectItem>
                        <SelectItem value="intact">Intact</SelectItem>
                        <SelectItem value="spayed">Spayed</SelectItem>
                        <SelectItem value="neutered">Neutered</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Diet Summary</Label>
                  <Textarea
                    value={form.dietSummary}
                    onChange={(e) => updateForm('dietSummary', e.target.value)}
                    placeholder="Food type, supplements, feeding notes"
                    disabled={!canEdit}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Feeding Schedule</Label>
                  <Input
                    value={form.feedingSchedule}
                    onChange={(e) => updateForm('feedingSchedule', e.target.value)}
                    placeholder="e.g. 3 meals/day"
                    disabled={!canEdit}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Exercise Notes</Label>
                  <Textarea
                    value={form.exerciseNotes}
                    onChange={(e) => updateForm('exerciseNotes', e.target.value)}
                    placeholder="Daily walks, intensity, restrictions"
                    disabled={!canEdit}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-[#E6DED2] bg-white/80 p-6 shadow-sm space-y-4">
                <h3 className="text-lg font-semibold">Medical History</h3>
                <div className="space-y-2">
                  <Label>Allergies</Label>
                  <Input
                    value={form.allergies}
                    onChange={(e) => updateForm('allergies', e.target.value)}
                    placeholder="Food or medication allergies"
                    disabled={!canEdit}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Conditions</Label>
                  <Textarea
                    value={form.conditions}
                    onChange={(e) => updateForm('conditions', e.target.value)}
                    placeholder="Chronic conditions, diagnoses"
                    disabled={!canEdit}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Medications</Label>
                  <Textarea
                    value={form.medications}
                    onChange={(e) => updateForm('medications', e.target.value)}
                    placeholder="Current medications and dosages"
                    disabled={!canEdit}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Vaccines</Label>
                  <Textarea
                    value={form.vaccines}
                    onChange={(e) => updateForm('vaccines', e.target.value)}
                    placeholder="Vaccination records"
                    disabled={!canEdit}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Deworming Schedule</Label>
                  <Input
                    value={form.dewormingSchedule}
                    onChange={(e) => updateForm('dewormingSchedule', e.target.value)}
                    placeholder="e.g. every 3 months"
                    disabled={!canEdit}
                  />
                </div>
              </div>
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-[#E6DED2] bg-white/80 p-6 shadow-sm space-y-4">
                <h3 className="text-lg font-semibold">Breeding & Family History</h3>
                <div className="space-y-2">
                  <Label>Reproductive History</Label>
                  <Textarea
                    value={form.reproductiveHistory}
                    onChange={(e) => updateForm('reproductiveHistory', e.target.value)}
                    placeholder="Pregnancy history, mating notes, fertility concerns"
                    disabled={!canEdit}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Family Health History</Label>
                  <Textarea
                    value={form.familyHistoryNotes}
                    onChange={(e) => updateForm('familyHistoryNotes', e.target.value)}
                    placeholder="Known issues in parents or lineage"
                    disabled={!canEdit}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-[#E6DED2] bg-white/80 p-6 shadow-sm space-y-4">
                <h3 className="text-lg font-semibold">Incidents & Risk</h3>
                <div className="space-y-2">
                  <Label>Incident History</Label>
                  <Textarea
                    value={form.incidentHistory}
                    onChange={(e) => updateForm('incidentHistory', e.target.value)}
                    placeholder="Hospitalizations, accidents, emergency events"
                    disabled={!canEdit}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Risk Flags</Label>
                  <Input
                    value={form.riskFlags}
                    onChange={(e) => updateForm('riskFlags', e.target.value)}
                    placeholder="Comma-separated: bloat risk, deep chest, etc."
                    disabled={!canEdit}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Emergency Plan</Label>
                  <Textarea
                    value={form.emergencyPlan}
                    onChange={(e) => updateForm('emergencyPlan', e.target.value)}
                    placeholder="Preferred ER, transport plan, emergency contacts"
                    disabled={!canEdit}
                  />
                </div>
              </div>
            </div>

            <div className="mt-8 rounded-2xl border border-[#E6DED2] bg-white/80 p-6 shadow-sm space-y-4">
              <h3 className="text-lg font-semibold">Additional Notes</h3>
              <Textarea
                value={form.notes}
                onChange={(e) => updateForm('notes', e.target.value)}
                placeholder="Other observations, vet recommendations, lifestyle notes"
                disabled={!canEdit}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default VetAIProfilePage;
