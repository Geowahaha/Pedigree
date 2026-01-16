/**
 * SearchSection - Pet Search & Breeding Pairs
 * 
 * Dribbble Style Update
 */

import React, { useState, useMemo, useEffect } from 'react';
import { breeds, locations, Pet } from '@/data/petData';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getPublicPets, searchPets, Pet as DbPet, createReservation, submitChatRequest, submitReport } from '@/lib/database';
import PuppyComingSoonSection from './PuppyComingSoonSection';

interface SearchSectionProps {
  onViewPedigree: (pet: Pet) => void;
  onViewDetails: (pet: Pet) => void;
  onRequireAuth?: () => void;
}

const SearchSection: React.FC<SearchSectionProps> = ({ onViewPedigree, onViewDetails, onRequireAuth }) => {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [petType, setPetType] = useState<'all' | 'dog' | 'cat'>('all');
  const [selectedBreed, setSelectedBreed] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [healthCertified, setHealthCertified] = useState(false);
  const [allPets, setAllPets] = useState<Pet[]>([]);
  const [loading, setLoading] = useState(false);

  const [searching, setSearching] = useState(false);

  // Interaction Modals State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'reserve' | 'chat' | 'report' | null>(null);
  const [selectedInteraction, setSelectedInteraction] = useState<{ sire: Pet, dam: Pet, ownerName?: string } | null>(null);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [formData, setFormData] = useState({ contact: '', note: '', message: '' });

  // Reset form when modal closes
  useEffect(() => {
    if (!modalOpen) {
      setSubmitStatus('idle');
      setFormData({ contact: '', note: '', message: '' });
    }
  }, [modalOpen]);

  // Handle Form Submission
  const handleSubmitInteraction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInteraction || !modalType) return;

    setSubmitStatus('submitting');
    try {
      if (modalType === 'reserve') {
        await createReservation(selectedInteraction.sire.id, selectedInteraction.dam.id, formData.contact, formData.note);
      } else if (modalType === 'chat') {
        await submitChatRequest(selectedInteraction.sire.id, selectedInteraction.dam.id, selectedInteraction.ownerName || 'Owner', formData.contact, formData.message);
      } else if (modalType === 'report') {
        await submitReport(selectedInteraction.sire.id, selectedInteraction.dam.id, 'User Report', formData.note);
      }
      setSubmitStatus('success');
      setTimeout(() => {
        setModalOpen(false);
        setSubmitStatus('idle');
      }, 2000);
    } catch (err) {
      console.error(err);
      if (`${err}`.includes('Not authenticated')) {
        onRequireAuth?.();
      }
      setSubmitStatus('error');
    }
  };

  // Convert database pet to display format
  // Convert database pet to display format
  const convertDbPet = (dbPet: DbPet): Pet => {
    // Sanitize type based on breed
    const breedLower = (dbPet.breed || '').toLowerCase();
    let finalType: 'dog' | 'cat' = dbPet.type;

    if (breedLower.includes('dog') || breedLower.includes('hura') || breedLower.includes('หมา') || breedLower.includes('สุนัข') || breedLower.includes('retriever') || breedLower.includes('shepherd') || breedLower.includes('terrier')) {
      finalType = 'dog';
    } else if (breedLower.includes('cat') || breedLower.includes('แมว') || breedLower.includes('persian') || breedLower.includes('shorthair') || breedLower.includes('maine coon')) {
      finalType = 'cat';
    }

    return {
      id: dbPet.id,
      name: dbPet.name,
      breed: dbPet.breed,
      type: finalType,
      birthDate: dbPet.birth_date,
      gender: dbPet.gender,
      image: dbPet.image_url || '', // No fallback, let UI handle or filter
      color: dbPet.color || '',
      registrationNumber: dbPet.registration_number || undefined,
      healthCertified: dbPet.health_certified,
      location: dbPet.location || '',
      owner: dbPet.owner?.full_name || dbPet.owner_name || 'Unknown',
      owner_id: dbPet.owner_id, // Important for chat!
      ownership_status: dbPet.ownership_status,
      claimed_by: dbPet.claimed_by,
      claim_date: dbPet.claim_date,
      verification_evidence: dbPet.verification_evidence,
      parentIds: dbPet.pedigree ? {
        sire: dbPet.pedigree.sire_id || undefined,
        dam: dbPet.pedigree.dam_id || undefined
      } : undefined
    };
  };

  // Load pets from database on mount
  useEffect(() => {
    const loadPets = async () => {
      setLoading(true);
      try {
        const dbPets = await getPublicPets();
        const convertedPets = dbPets.map(convertDbPet);
        setAllPets(convertedPets);
      } catch (error) {
        console.error('Error loading pets:', error);
        setAllPets([]);
      } finally {
        setLoading(false);
      }
    };

    loadPets();
  }, []);

  // Search in database when query changes
  useEffect(() => {
    const performSearch = async () => {
      if (searchQuery.length >= 2) {
        setSearching(true);
        try {
          const results = await searchPets(searchQuery);
          const convertedResults = results.map(convertDbPet);
          setAllPets(convertedResults);
        } catch (error) {
          console.error('Search error:', error);
        } finally {
          setSearching(false);
        }
      }
    };

    const timeoutId = setTimeout(performSearch, 500);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const availableBreeds = petType === 'all'
    ? [...breeds.dog, ...breeds.cat]
    : breeds[petType];

  // Group pets into breeding pairs based on parentIds
  const breedingPairs = useMemo(() => {
    const pairs: Record<string, { sire: Pet, dam: Pet, offspring: Pet[] }> = {};

    allPets.forEach(pet => {
      if (pet.parentIds?.sire && pet.parentIds?.dam) {
        // Find parents in our list
        const sire = allPets.find(p => p.id === pet.parentIds!.sire);
        const dam = allPets.find(p => p.id === pet.parentIds!.dam);

        if (sire && dam) {
          const key = `${sire.id}-${dam.id}`;
          if (!pairs[key]) {
            pairs[key] = { sire, dam, offspring: [] };
          }
          pairs[key].offspring.push(pet);
        }
      }
    });
    return Object.values(pairs);
  }, [allPets]);

  const filteredPairs = useMemo(() => {
    return breedingPairs.filter(pair => {
      const searchLower = searchQuery.toLowerCase();

      // Check if Sire, Dam, or ANY offspring matches search
      const sireMatch = pair.sire.name.toLowerCase().includes(searchLower) || pair.sire.breed.toLowerCase().includes(searchLower);
      const damMatch = pair.dam.name.toLowerCase().includes(searchLower) || pair.dam.breed.toLowerCase().includes(searchLower);
      const offspringMatch = pair.offspring.some(o => o.name.toLowerCase().includes(searchLower));

      const matchesSearch = searchQuery.length < 2 || sireMatch || damMatch || offspringMatch;

      const matchesType = petType === 'all' || pair.sire.type === petType; // Assuming pair is same type
      const matchesBreed = !selectedBreed || pair.sire.breed === selectedBreed;

      return matchesSearch && matchesType && matchesBreed;
    });
  }, [breedingPairs, searchQuery, petType, selectedBreed]);

  const openInteraction = (type: 'reserve' | 'chat' | 'report', sire: Pet, dam: Pet, ownerName?: string) => {
    if (type === 'reserve' && !user) {
      onRequireAuth?.();
      return;
    }
    setModalType(type);
    setSelectedInteraction({ sire, dam, ownerName });
    setModalOpen(true);
  };

  const calculateAge = (birthDate: string) => {
    if (!birthDate || isNaN(new Date(birthDate).getTime())) return 'Unknown';
    const birth = new Date(birthDate);
    const now = new Date();
    const years = now.getFullYear() - birth.getFullYear();
    if (years === 0) return `Puppy`;
    return `${years} year${years > 1 ? 's' : ''}`;
  };

  return (
    <section id="search" className="py-16 sm:py-20 lg:py-32 bg-white relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40 hidden sm:block">
        <div className="absolute top-40 right-1/4 w-[500px] h-[500px] bg-pink-100/30 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-40 left-1/4 w-[400px] h-[400px] bg-purple-100/20 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s', animationDelay: '2s' }} />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header - Responsive Typography */}
        <div className="text-center mb-10 sm:mb-16 space-y-4 sm:space-y-6">
          <span className="inline-flex items-center gap-2 px-4 sm:px-5 py-2 rounded-full bg-pink-50 text-[#ea4c89] text-xs sm:text-sm font-semibold tracking-wide border border-pink-100 shadow-sm">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {language === 'th' ? 'ค้นหาขั้นสูง' : 'Advanced Search'}
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-[#0d0c22]">
            <span className="text-[#0d0c22]">{language === 'th' ? 'ค้นหา' : 'Find Your'} </span>
            <span className="text-[#ea4c89]">
              {language === 'th' ? 'คู่ที่สมบูรณ์แบบ' : 'Perfect Match'}
            </span>
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-gray-500 max-w-xs sm:max-w-2xl mx-auto leading-relaxed font-medium px-2">
            {language === 'th'
              ? 'ค้นหาจากฐานข้อมูลสัตว์เลี้ยงที่ลงทะเบียน ตามสายพันธุ์ สถานที่ หรือสายเลือด'
              : 'Search through our comprehensive database of registered pets by breed, location, or bloodline.'
            }
          </p>
        </div>

        {/* Featured Breeding Matches Strategy */}
        <div className="mb-20">
          <PuppyComingSoonSection onViewDetails={onViewDetails} onRequireAuth={onRequireAuth} />
        </div>

        {/* Search Box - Mobile Optimized */}
        <div className="bg-white rounded-2xl sm:rounded-[32px] p-4 sm:p-6 lg:p-10 shadow-xl shadow-gray-100 border border-gray-100 mb-8 sm:mb-12">
          {/* Main Search - Touch Friendly */}
          <div className="relative mb-6 sm:mb-8 group">
            <div className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-pink-50 flex items-center justify-center group-focus-within:bg-[#ea4c89] group-focus-within:text-white transition-all">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-[#ea4c89] group-focus-within:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder={language === 'th' ? 'ค้นหาตามชื่อ สายพันธุ์...' : 'Search by name, breed...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-14 sm:pl-20 pr-4 sm:pr-6 py-4 sm:py-5 min-h-[52px] rounded-xl sm:rounded-2xl border-2 border-gray-100 bg-gray-50/50 focus:border-[#ea4c89] focus:ring-4 focus:ring-pink-100 outline-none transition-all text-[#0d0c22] text-base sm:text-lg placeholder:text-gray-400 font-medium"
              style={{ fontSize: '16px' }}
            />
            {searching && (
              <div className="absolute right-5 top-1/2 -translate-y-1/2">
                <svg className="w-6 h-6 animate-spin text-[#ea4c89]" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
            )}
          </div>

          {/* Filters Grid - Mobile 2 cols, Desktop 4 cols */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
            {/* Pet Type */}
            <div className="space-y-1.5 sm:space-y-2">
              <label className="block text-xs sm:text-sm font-bold text-[#0d0c22]">
                {language === 'th' ? 'ประเภท' : 'Pet Type'}
              </label>
              <select
                value={petType}
                onChange={(e) => {
                  setPetType(e.target.value as 'all' | 'dog' | 'cat');
                  setSelectedBreed('');
                }}
                className="w-full px-3 sm:px-4 py-3 sm:py-3.5 min-h-[48px] rounded-xl border-2 border-gray-100 bg-white focus:border-[#ea4c89] focus:ring-2 focus:ring-pink-100 outline-none transition-all text-[#0d0c22] cursor-pointer hover:border-gray-300 font-medium text-sm sm:text-base"
                style={{ fontSize: '16px' }}
              >
                <option value="all">{language === 'th' ? 'ทั้งหมด' : 'All Types'}</option>
                <option value="dog">{language === 'th' ? 'สุนัข' : 'Dogs'}</option>
                <option value="cat">{language === 'th' ? 'แมว' : 'Cats'}</option>
              </select>
            </div>

            {/* Breed */}
            <div className="space-y-1.5 sm:space-y-2">
              <label className="block text-xs sm:text-sm font-bold text-[#0d0c22]">
                {language === 'th' ? 'สายพันธุ์' : 'Breed'}
              </label>
              <select
                value={selectedBreed}
                onChange={(e) => setSelectedBreed(e.target.value)}
                className="w-full px-3 sm:px-4 py-3 sm:py-3.5 min-h-[48px] rounded-xl border-2 border-gray-100 bg-white focus:border-[#ea4c89] focus:ring-2 focus:ring-pink-100 outline-none transition-all text-[#0d0c22] cursor-pointer hover:border-gray-300 font-medium text-sm sm:text-base"
                style={{ fontSize: '16px' }}
              >
                <option value="">{language === 'th' ? 'ทุกสายพันธุ์' : 'All Breeds'}</option>
                {availableBreeds.map(breed => (
                  <option key={breed} value={breed}>{breed}</option>
                ))}
              </select>
            </div>

            {/* Location */}
            <div className="space-y-1.5 sm:space-y-2">
              <label className="block text-xs sm:text-sm font-bold text-[#0d0c22]">
                {language === 'th' ? 'พื้นที่' : 'Location'}
              </label>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full px-3 sm:px-4 py-3 sm:py-3.5 min-h-[48px] rounded-xl border-2 border-gray-100 bg-white focus:border-[#ea4c89] focus:ring-2 focus:ring-pink-100 outline-none transition-all text-[#0d0c22] cursor-pointer hover:border-gray-300 font-medium text-sm sm:text-base"
                style={{ fontSize: '16px' }}
              >
                <option value="">{language === 'th' ? 'ทุกพื้นที่' : 'All Locations'}</option>
                {locations.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>

            {/* Health Certified */}
            <div className="space-y-1.5 sm:space-y-2">
              <label className="block text-xs sm:text-sm font-bold text-[#0d0c22]">
                {language === 'th' ? 'การรับรอง' : 'Certification'}
              </label>
              <button
                onClick={() => setHealthCertified(!healthCertified)}
                className={`w-full px-3 sm:px-4 py-3 sm:py-3.5 min-h-[48px] rounded-xl border-2 transition-all flex items-center justify-center gap-2 font-bold text-sm sm:text-base touch-target ${healthCertified
                  ? 'border-[#ea4c89] bg-pink-50 text-[#ea4c89] shadow-sm'
                  : 'border-gray-100 text-gray-400 hover:border-gray-300 hover:bg-gray-50 active:bg-gray-100'
                  }`}
              >
                <svg className={`w-5 h-5 transition-colors ${healthCertified ? 'text-[#ea4c89]' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                {language === 'th' ? 'ผ่านการตรวจสุขภาพ' : 'Health Certified'}
              </button>
            </div>
          </div>

          {/* Clear Filters - Mobile Responsive */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-gray-100 gap-3">
            <p className="text-xs sm:text-sm text-gray-500 font-medium">
              {language === 'th' ? 'พบ' : 'Found'} <span className="font-bold text-[#ea4c89] text-sm sm:text-base">{filteredPairs.length}</span> {language === 'th' ? 'คู่ผสมพันธุ์' : 'proven breeding pairs'}
            </p>
            <button
              onClick={() => { setSearchQuery(''); setPetType('all'); setSelectedBreed(''); }}
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-gray-400 hover:text-[#0d0c22] active:text-[#ea4c89] font-semibold transition-colors py-2 min-h-[44px] touch-target"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              {language === 'th' ? 'ล้างตัวกรอง' : 'Clear all filters'}
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-8">
          {loading ? (
            <div className="grid grid-cols-1 gap-8">
              {[1, 2].map((i) => (
                <div key={i} className="h-72 bg-gray-50 rounded-3xl animate-pulse" />
              ))}
            </div>
          ) : filteredPairs.length === 0 ? (
            <div className="bg-white rounded-3xl p-16 text-center border border-gray-100 shadow-md">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-pink-50 flex items-center justify-center">
                <svg className="w-10 h-10 text-[#ea4c89]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-[#0d0c22] mb-3">
                {language === 'th' ? 'ไม่พบคู่ผสมพันธุ์' : 'No mating pairs found'}
              </h3>
              <p className="text-gray-500 text-lg">
                {language === 'th' ? 'ลองใช้คำค้นหาหรือตัวกรองอื่น' : 'Try different search terms or filters.'}
              </p>
            </div>
          ) : (
            filteredPairs.map((pair, idx) => (
              <div
                key={idx}
                className="group bg-white rounded-[32px] p-8 shadow-sm border border-gray-100 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                {/* Pair Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-pink-50 border border-pink-100">
                      <span className="text-lg">❤️</span>
                      <span className="text-xs font-bold uppercase tracking-wider text-[#ea4c89]">Proven Pair</span>
                    </span>
                    <h3 className="text-xl font-bold text-[#0d0c22]">
                      {pair.sire.breed} Match
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 border border-amber-100">
                    <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span className="text-sm font-bold text-amber-700">5.0</span>
                  </div>
                </div>

                {/* Sire & Dam Row - Stack on Mobile */}
                <div className="flex flex-col lg:flex-row items-center gap-4 sm:gap-6 lg:gap-10 mb-6 sm:mb-10">
                  {/* Sire */}
                  <div
                    className="flex-1 w-full bg-slate-50 rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex gap-3 sm:gap-5 items-center cursor-pointer hover:bg-slate-100 active:bg-slate-100 transition-all duration-200 border border-gray-100 group/sire"
                    onClick={() => onViewDetails(pair.sire)}
                  >
                    <div className="relative">
                      <img
                        src={pair.sire.image || ''}
                        className="w-16 h-16 sm:w-24 sm:h-24 rounded-xl sm:rounded-2xl object-cover border-2 sm:border-4 border-white shadow-lg group-hover/sire:scale-105 transition-transform"
                        alt="Sire"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                      <div className="absolute -bottom-1 sm:-bottom-2 -right-1 sm:-right-2 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold shadow-lg">♂</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 sm:mb-2">
                        <span className="px-2 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] bg-blue-500 text-white font-bold uppercase tracking-wider shadow-sm shadow-blue-200">Sire</span>
                      </div>
                      <h4 className="font-bold text-base sm:text-lg text-[#0d0c22] truncate">{pair.sire.name}</h4>
                      <p className="text-xs sm:text-sm text-gray-500">{pair.sire.color || 'Unknown Color'}</p>
                      <p className="text-xs text-[#ea4c89] mt-1 sm:mt-2 font-bold group-hover/sire:underline">View Profile →</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-r from-[#ea4c89] to-[#ff8fab] text-white font-bold text-lg sm:text-xl shadow-lg shadow-[#ea4c89]/30 flex-shrink-0">
                    +
                  </div>

                  {/* Dam */}
                  <div
                    className="flex-1 w-full bg-pink-50/50 rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex gap-3 sm:gap-5 items-center flex-row-reverse text-right cursor-pointer hover:bg-pink-50 active:bg-pink-50 transition-all duration-200 border border-pink-100 group/dam"
                    onClick={() => onViewDetails(pair.dam)}
                  >
                    <div className="relative">
                      <img
                        src={pair.dam.image || ''}
                        className="w-16 h-16 sm:w-24 sm:h-24 rounded-xl sm:rounded-2xl object-cover border-2 sm:border-4 border-white shadow-lg group-hover/dam:scale-105 transition-transform"
                        alt="Dam"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                      <div className="absolute -bottom-1 sm:-bottom-2 -left-1 sm:-left-2 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-[#ea4c89] flex items-center justify-center text-white text-xs font-bold shadow-lg">♀</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 sm:mb-2 justify-end">
                        <span className="px-2 py-0.5 sm:py-1 rounded-full text-[9px] sm:text-[10px] bg-[#ea4c89] text-white font-bold uppercase tracking-wider shadow-sm shadow-pink-200">Dam</span>
                      </div>
                      <h4 className="font-bold text-base sm:text-lg text-[#0d0c22] truncate">{pair.dam.name}</h4>
                      <p className="text-xs sm:text-sm text-gray-500">{pair.dam.color || 'Unknown Color'}</p>
                      <p className="text-xs text-[#ea4c89] mt-1 sm:mt-2 font-bold group-hover/dam:underline">← View Profile</p>
                    </div>
                  </div>
                </div>

                {/* Offspring List - Responsive Grid */}
                <div className="border-t border-gray-100 pt-4 sm:pt-6">
                  <h4 className="text-xs sm:text-sm font-bold text-[#0d0c22] mb-3 sm:mb-4 flex items-center gap-2">
                    🏆 Registered Offspring
                    <span className="text-xs font-normal text-gray-400">({pair.offspring.length})</span>
                  </h4>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
                    {pair.offspring.slice(0, 5).map(child => (
                      <div key={child.id}
                        onClick={() => onViewPedigree(child)}
                        className="bg-gray-50 p-2 rounded-xl flex flex-col items-center text-center cursor-pointer hover:bg-white hover:shadow-md border border-transparent hover:border-gray-100 transition-all">
                        {child.image ? (
                          <img src={child.image}
                            className="w-10 h-10 rounded-full object-cover mb-2 border-2 border-white shadow-sm"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-white border border-gray-100 mb-2 flex items-center justify-center text-gray-400 text-[10px] font-bold">
                            {child.name.charAt(0)}
                          </div>
                        )}
                        <p className="text-xs font-bold text-[#0d0c22] truncate w-full">{child.name}</p>
                        <p className="text-[10px] text-gray-500">{child.gender === 'male' ? 'M' : 'F'} • {calculateAge(child.birthDate || '')}</p>
                      </div>
                    ))}
                    {pair.offspring.length > 5 && (
                      <div className="flex items-center justify-center text-xs text-gray-400 font-bold bg-gray-50 rounded-xl">
                        +{pair.offspring.length - 5}
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons - Full Width Stack on Mobile */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-100">
                  <button
                    onClick={() => openInteraction('report', pair.sire, pair.dam)}
                    className="text-xs sm:text-sm text-gray-400 hover:text-red-500 active:text-red-600 transition-colors sm:mr-auto hidden sm:block font-medium py-2 min-h-[44px]">
                    {language === 'th' ? 'รายงานปัญหา' : 'Report Issue'}
                  </button>
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
                    <button
                      onClick={() => openInteraction('chat', pair.sire, pair.dam, pair.sire.owner)}
                      className="flex-1 sm:flex-none px-4 sm:px-6 py-3.5 sm:py-3 min-h-[48px] rounded-xl border border-gray-200 text-[#0d0c22] font-bold text-sm hover:bg-gray-50 active:bg-gray-100 transition-all flex items-center justify-center gap-2 touch-target">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                      {language === 'th' ? 'แชทกับเจ้าของ' : 'Chat with Owner'}
                    </button>
                    <button
                      onClick={() => openInteraction('reserve', pair.sire, pair.dam)}
                      className="flex-1 sm:flex-none px-4 sm:px-6 py-3.5 sm:py-3 min-h-[48px] rounded-xl bg-[#0d0c22] text-white font-bold text-sm hover:bg-[#ea4c89] active:bg-[#d63f7a] transition-all shadow-lg shadow-black/10 flex items-center justify-center gap-2 hover:-translate-y-0.5 touch-target">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      {language === 'th' ? 'จองลูกสุนัข' : 'Reserve Puppy'}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Interaction Modal */}
        {modalOpen && selectedInteraction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-[32px] w-full max-w-md p-6 shadow-2xl scale-100 animate-in zoom-in-95 duration-200 border border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-[#0d0c22]">
                  {modalType === 'reserve' && '📅 Reserve Puppy Queue'}
                  {modalType === 'chat' && '💬 Chat Request'}
                  {modalType === 'report' && '⚠️ Report Issue'}
                </h3>
                <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-[#0d0c22]">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              {submitStatus === 'success' ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-[#ea4c89]/10 text-[#ea4c89] rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <h4 className="text-lg font-bold text-[#0d0c22] mb-2">Request Sent!</h4>
                  <p className="text-gray-500">We have received your request and will contact you shortly.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmitInteraction} className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-2xl flex items-center gap-4 mb-4 border border-gray-100">
                    <div className="flex -space-x-2 overflow-hidden">
                      <img src={selectedInteraction.sire.image} className="w-10 h-10 rounded-full object-cover border-2 border-white" />
                      <img src={selectedInteraction.dam.image} className="w-10 h-10 rounded-full object-cover border-2 border-white" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pairing</p>
                      <p className="text-sm font-bold text-[#0d0c22]">{selectedInteraction.sire.name} + {selectedInteraction.dam.name}</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-[#0d0c22] mb-2">Your Contact (Email/Line/Tel)</label>
                    <input
                      required
                      type="text"
                      value={formData.contact}
                      onChange={e => setFormData({ ...formData, contact: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#ea4c89] outline-none font-medium"
                      placeholder="e.g. 081-234-5678"
                    />
                  </div>

                  {modalType === 'chat' && (
                    <div>
                      <label className="block text-sm font-bold text-[#0d0c22] mb-2">Message to Owner</label>
                      <textarea
                        required
                        value={formData.message}
                        onChange={e => setFormData({ ...formData, message: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#ea4c89] outline-none h-24 resize-none font-medium"
                        placeholder="I'm interested in..."
                      ></textarea>
                    </div>
                  )}

                  {(modalType === 'reserve' || modalType === 'report') && (
                    <div>
                      <label className="block text-sm font-bold text-[#0d0c22] mb-2">{modalType === 'report' ? 'Issue Details' : 'Special Note (Optional)'}</label>
                      <textarea
                        value={formData.note}
                        onChange={e => setFormData({ ...formData, note: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#ea4c89] outline-none h-24 resize-none font-medium"
                        placeholder={modalType === 'report' ? 'Describe the issue...' : 'Any preferences for color/gender?'}
                      ></textarea>
                    </div>
                  )}

                  <button
                    disabled={submitStatus === 'submitting'}
                    type="submit"
                    className="w-full py-4 rounded-xl bg-[#0d0c22] text-white font-bold hover:bg-[#ea4c89] transition-all disabled:opacity-50 flex justify-center shadow-lg"
                  >
                    {submitStatus === 'submitting' ? (
                      <svg className="w-5 h-5 animate-spin text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    ) : (
                      modalType === 'reserve' ? 'Confirm Reservation Queue' : 'Send Request'
                    )}
                  </button>

                  <p className="text-center text-xs text-gray-400 mt-4">
                    By clicking confirm, you agree to share your contact details with the breeder.
                  </p>
                </form>
              )}
            </div>
          </div>
        )}

      </div>
    </section>
  );
};

export default SearchSection;
