import React, { useState, useMemo, useEffect } from 'react';
import { pets as staticPets, breeds, locations, Pet } from '@/data/petData';
import { useNavigate } from 'react-router-dom';
import { getPublicPets, searchPets, Pet as DbPet, createReservation, submitChatRequest, submitReport } from '@/lib/database';
import SkeletonCard from './SkeletonCard';

interface SearchSectionProps {
  onViewPedigree: (pet: Pet) => void;
  onViewDetails: (pet: Pet) => void;
}

const SearchSection: React.FC<SearchSectionProps> = ({ onViewPedigree, onViewDetails }) => {
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
    <section id="search" className="py-20 lg:py-28 bg-[#F5F1E8]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-1.5 rounded-full bg-[#8B9D83]/10 text-[#6B7D63] text-sm font-medium mb-4">
            Advanced Search
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#2C2C2C] mb-4">
            Find Your Perfect Match
          </h2>
          <p className="text-lg text-[#2C2C2C]/60 max-w-2xl mx-auto">
            Search through our comprehensive database of registered pets by breed, location, or bloodline.
          </p>
        </div>

        {/* Featured Breeding Matches Strategy */}
        <div className="mb-16">
          <FeaturedMatch allPets={allPets} onInteraction={openInteraction} onDetailClick={onViewDetails} />
        </div>

        {/* Search Box */}
        <div className="bg-white rounded-2xl p-6 lg:p-8 shadow-xl shadow-[#8B9D83]/10 mb-8">
          {/* Main Search */}
          <div className="relative mb-6">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#2C2C2C]/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by name, breed, or registration number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-xl border border-[#8B9D83]/20 focus:border-[#8B9D83] focus:ring-2 focus:ring-[#8B9D83]/20 outline-none transition-all text-[#2C2C2C] placeholder:text-[#2C2C2C]/40"
            />
            {searching && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <svg className="w-5 h-5 animate-spin text-[#8B9D83]" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
            )}
          </div>

          {/* Filters Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Pet Type */}
            <div>
              <label className="block text-sm font-medium text-[#2C2C2C]/70 mb-2">Pet Type</label>
              <select
                value={petType}
                onChange={(e) => {
                  setPetType(e.target.value as 'all' | 'dog' | 'cat');
                  setSelectedBreed('');
                }}
                className="w-full px-4 py-3 rounded-xl border border-[#8B9D83]/20 focus:border-[#8B9D83] focus:ring-2 focus:ring-[#8B9D83]/20 outline-none transition-all text-[#2C2C2C] bg-white"
              >
                <option value="all">All Types</option>
                <option value="dog">Dogs</option>
                <option value="cat">Cats</option>
              </select>
            </div>

            {/* Breed */}
            <div>
              <label className="block text-sm font-medium text-[#2C2C2C]/70 mb-2">Breed</label>
              <select
                value={selectedBreed}
                onChange={(e) => setSelectedBreed(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[#8B9D83]/20 focus:border-[#8B9D83] focus:ring-2 focus:ring-[#8B9D83]/20 outline-none transition-all text-[#2C2C2C] bg-white"
              >
                <option value="">All Breeds</option>
                {availableBreeds.map(breed => (
                  <option key={breed} value={breed}>{breed}</option>
                ))}
              </select>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-[#2C2C2C]/70 mb-2">Location</label>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[#8B9D83]/20 focus:border-[#8B9D83] focus:ring-2 focus:ring-[#8B9D83]/20 outline-none transition-all text-[#2C2C2C] bg-white"
              >
                <option value="">All Locations</option>
                {locations.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>

            {/* Health Certified */}
            <div>
              <label className="block text-sm font-medium text-[#2C2C2C]/70 mb-2">Certification</label>
              <button
                onClick={() => setHealthCertified(!healthCertified)}
                className={`w-full px-4 py-3 rounded-xl border transition-all flex items-center justify-center gap-2 ${healthCertified
                  ? 'border-[#8B9D83] bg-[#8B9D83]/10 text-[#6B7D63]'
                  : 'border-[#8B9D83]/20 text-[#2C2C2C]/60 hover:border-[#8B9D83]/40'
                  }`}
              >
                <svg className={`w-5 h-5 ${healthCertified ? 'text-[#8B9D83]' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Health Certified
              </button>
            </div>
          </div>

          {/* Clear Filters */}
          <div className="flex items-center justify-between mt-6 pt-6 border-t border-[#8B9D83]/10">
            <p className="text-sm text-[#2C2C2C]/60">
              Found <span className="font-semibold text-[#2C2C2C]">{filteredPairs.length}</span> proven breeding pairs
            </p>
            <button
              onClick={() => { setSearchQuery(''); setPetType('all'); setSelectedBreed(''); }}
              className="text-sm text-[#C97064] hover:text-[#B86054] font-medium transition-colors"
            >
              Clear all filters
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-4">
          {loading ? (
            <div className="grid grid-cols-1 gap-6">
              <div className="h-64 bg-gray-100 rounded-3xl animate-pulse"></div>
              <div className="h-64 bg-gray-100 rounded-3xl animate-pulse"></div>
            </div>
          ) : filteredPairs.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center">
              <svg className="w-16 h-16 mx-auto text-[#8B9D83]/30 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-xl font-semibold text-[#2C2C2C] mb-2">No mating pairs found</h3>
              <p className="text-[#2C2C2C]/60">Try different search terms or filters.</p>
            </div>
          ) : (
            filteredPairs.map((pair, idx) => (
              <div key={idx} className="bg-white rounded-3xl p-6 shadow-xl shadow-[#8B9D83]/5 border border-[#8B9D83]/10 mb-8 overflow-hidden hover:shadow-[#8B9D83]/10 transition-shadow">
                {/* Pair Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                  <h3 className="text-xl font-bold text-[#2C2C2C] flex items-center gap-2">
                    <span className="bg-[#C97064]/10 p-2 rounded-full text-[#C97064] text-xs">❤️ PROVEN PAIR</span>
                    {pair.sire.breed} Match
                  </h3>
                  <div className="flex items-center gap-2 bg-[#F5F1E8] px-3 py-1.5 rounded-full self-start md:self-auto">
                    <div className="text-xs font-medium text-[#2C2C2C]/70">
                      Rated <span className="text-[#C97064] font-bold">5.0</span>
                    </div>
                  </div>
                </div>

                {/* Sire & Dam Row */}
                <div className="flex flex-col lg:flex-row items-center gap-4 lg:gap-8 mb-8">
                  {/* Sire */}
                  <div className="flex-1 w-full bg-[#8B9D83]/5 rounded-2xl p-4 flex gap-4 items-center cursor-pointer hover:bg-[#8B9D83]/10 transition-colors"
                    onClick={() => onViewDetails(pair.sire)}>
                    <img src={pair.sire.image || ''} className="w-20 h-20 rounded-full object-cover border-4 border-blue-100" alt="Sire"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-100 text-blue-600 font-bold">SIRE</span>
                        <span className="font-bold truncate max-w-[120px]">{pair.sire.name}</span>
                      </div>
                      <p className="text-xs text-[#2C2C2C]/60">{pair.sire.color || 'Unknown Color'}</p>
                      <p className="text-xs text-[#8B9D83] mt-1 hover:underline">View Profile</p>
                    </div>
                  </div>

                  <div className="text-[#C97064] font-bold text-xl">+</div>

                  {/* Dam */}
                  <div className="flex-1 w-full bg-[#8B9D83]/5 rounded-2xl p-4 flex gap-4 items-center flex-row-reverse text-right cursor-pointer hover:bg-[#8B9D83]/10 transition-colors"
                    onClick={() => onViewDetails(pair.dam)}>
                    <img src={pair.dam.image || ''} className="w-20 h-20 rounded-full object-cover border-4 border-pink-100" alt="Dam"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                    <div>
                      <div className="flex items-center gap-2 mb-1 justify-end">
                        <span className="font-bold truncate max-w-[120px]">{pair.dam.name}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-pink-100 text-pink-600 font-bold">DAM</span>
                      </div>
                      <p className="text-xs text-[#2C2C2C]/60">{pair.dam.color || 'Unknown Color'}</p>
                      <p className="text-xs text-[#8B9D83] mt-1 hover:underline">View Profile</p>
                    </div>
                  </div>
                </div>

                {/* Offspring List */}
                <div className="border-t border-[#8B9D83]/10 pt-6">
                  <h4 className="text-sm font-bold text-[#2C2C2C] mb-4 flex items-center gap-2">
                    🏆 Registered Offspring
                    <span className="text-xs font-normal text-[#2C2C2C]/50">({pair.offspring.length})</span>
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {pair.offspring.slice(0, 5).map(child => (
                      <div key={child.id}
                        onClick={() => onViewPedigree(child)}
                        className="bg-[#F5F1E8]/50 p-2 rounded-lg flex flex-col items-center text-center cursor-pointer hover:bg-[#F5F1E8] transition-colors">
                        {child.image ? (
                          <img src={child.image}
                            className="w-10 h-10 rounded-full object-cover mb-2 border border-white shadow-sm"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-200 mb-2 flex items-center justify-center text-gray-400 text-[10px] font-bold">
                            {child.name.charAt(0)}
                          </div>
                        )}
                        <p className="text-xs font-bold text-[#2C2C2C] truncate w-full">{child.name}</p>
                        <p className="text-[10px] text-[#2C2C2C]/50">{child.gender === 'male' ? 'M' : 'F'} • {calculateAge(child.birthDate || '')}</p>
                      </div>
                    ))}
                    {pair.offspring.length > 5 && (
                      <div className="flex items-center justify-center text-xs text-[#8B9D83] font-medium bg-[#F5F1E8]/30 rounded-lg">
                        +{pair.offspring.length - 5}
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 mt-6 justify-end">
                  <button
                    onClick={() => openInteraction('report', pair.sire, pair.dam)}
                    className="text-xs text-[#2C2C2C]/40 hover:text-[#C97064] mr-auto transition-colors self-center sm:self-end mb-2 sm:mb-0">
                    Report Issue
                  </button>
                  <button
                    onClick={() => openInteraction('chat', pair.sire, pair.dam, pair.sire.owner)}
                    className="px-6 py-2 rounded-full border border-[#8B9D83]/30 text-[#6B7D63] font-bold text-sm hover:bg-[#8B9D83]/5 transition-colors flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                    Chat with Owner
                  </button>
                  <button
                    onClick={() => openInteraction('reserve', pair.sire, pair.dam)}
                    className="px-6 py-2 rounded-full bg-[#C97064] text-white font-bold text-sm hover:bg-[#B86054] transition-colors shadow-lg shadow-[#C97064]/20 flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    Reserve Puppy
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Interaction Modal */}
        {modalOpen && selectedInteraction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl scale-100 animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-[#2C2C2C]">
                  {modalType === 'reserve' && '📅 Reserve Puppy Queue'}
                  {modalType === 'chat' && '💬 Chat Request'}
                  {modalType === 'report' && '⚠️ Report Issue'}
                </h3>
                <button onClick={() => setModalOpen(false)} className="text-[#2C2C2C]/30 hover:text-[#2C2C2C]">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              {submitStatus === 'success' ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <h4 className="text-lg font-bold text-[#2C2C2C] mb-2">Request Sent!</h4>
                  <p className="text-[#2C2C2C]/60">We have received your request and will contact you shortly.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmitInteraction} className="space-y-4">
                  <div className="p-4 bg-[#F5F1E8] rounded-xl flex items-center gap-4 mb-4">
                    <div className="flex -space-x-2 overflow-hidden">
                      <img src={selectedInteraction.sire.image} className="w-10 h-10 rounded-full object-cover border-2 border-white" />
                      <img src={selectedInteraction.dam.image} className="w-10 h-10 rounded-full object-cover border-2 border-white" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#2C2C2C]/50 uppercase tracking-wider">Pairing</p>
                      <p className="text-sm font-bold text-[#2C2C2C]">{selectedInteraction.sire.name} + {selectedInteraction.dam.name}</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#2C2C2C]/70 mb-2">Your Contact (Email/Line/Tel)</label>
                    <input
                      required
                      type="text"
                      value={formData.contact}
                      onChange={e => setFormData({ ...formData, contact: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-[#8B9D83]/20 focus:border-[#C97064] outline-none"
                      placeholder="e.g. 081-234-5678"
                    />
                  </div>

                  {modalType === 'chat' && (
                    <div>
                      <label className="block text-sm font-medium text-[#2C2C2C]/70 mb-2">Message to Owner</label>
                      <textarea
                        required
                        value={formData.message}
                        onChange={e => setFormData({ ...formData, message: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-[#8B9D83]/20 focus:border-[#C97064] outline-none h-24 resize-none"
                        placeholder="I'm interested in..."
                      ></textarea>
                    </div>
                  )}

                  {(modalType === 'reserve' || modalType === 'report') && (
                    <div>
                      <label className="block text-sm font-medium text-[#2C2C2C]/70 mb-2">{modalType === 'report' ? 'Issue Details' : 'Special Note (Optional)'}</label>
                      <textarea
                        value={formData.note}
                        onChange={e => setFormData({ ...formData, note: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-[#8B9D83]/20 focus:border-[#C97064] outline-none h-24 resize-none"
                        placeholder={modalType === 'report' ? 'Describe the issue...' : 'Any preferences for color/gender?'}
                      ></textarea>
                    </div>
                  )}

                  <button
                    disabled={submitStatus === 'submitting'}
                    type="submit"
                    className="w-full py-4 rounded-xl bg-[#C97064] text-white font-bold hover:bg-[#B86054] transition-all disabled:opacity-50 flex justify-center"
                  >
                    {submitStatus === 'submitting' ? (
                      <svg className="w-5 h-5 animate-spin text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    ) : (
                      modalType === 'reserve' ? 'Confirm Reservation Queue' : 'Send Request'
                    )}
                  </button>

                  <p className="text-center text-xs text-[#2C2C2C]/40 mt-4">
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

// Add navigate hook usage
const FeaturedMatch: React.FC<{ allPets: Pet[], onInteraction: (type: 'reserve' | 'chat' | 'report', sire: Pet, dam: Pet, ownerName?: string) => void, onDetailClick: (pet: Pet) => void }> = ({ allPets, onInteraction, onDetailClick }) => {
  const navigate = useNavigate();
  // Try to find the specific "Boontum + Boonnum" pair
  // Find a pair that actually has children to display real history
  const match = useMemo(() => {
    // 1. Try to find the specific "Boontum + Violin" pair first (User Request)
    const boontum = allPets.find(p => p.name.includes('Boontum') || p.name.includes('บุญทุ่ม'));
    const violin = allPets.find(p => p.name.includes('Violin') || p.name.includes('ไวโอลิน'));

    if (boontum && violin) {
      return { sire: boontum, dam: violin, isHighlight: true };
    }

    // 2. Fallback: Find ANY pair that has children in our loaded list
    // This makes the UI dynamic based on real family connections
    const petsWithParents = allPets.filter(p => p.parentIds && p.parentIds.sire && p.parentIds.dam);
    if (petsWithParents.length > 0) {
      // Get standard pair from the first child found
      const child = petsWithParents[0];
      const sire = allPets.find(p => p.id === child.parentIds?.sire);
      const dam = allPets.find(p => p.id === child.parentIds?.dam);

      if (sire && dam) {
        return { sire, dam, isHighlight: true };
      }
    }

    // 3. Last Resort: Random Fallback (if no relations found at all)
    const males = allPets.filter(p => p.gender === 'male' && p.image && p.image !== '');
    const females = allPets.filter(p => p.gender === 'female' && p.image && p.image !== '');

    if (males.length === 0 || females.length === 0) return null;

    return {
      sire: males[Math.floor(Math.random() * males.length)],
      dam: females[Math.floor(Math.random() * females.length)],
      isHighlight: false
    };
  }, [allPets]);

  // Find confirmed offspring for this specific pair (e.g. Boontum + Violin)
  const offspring = useMemo(() => {
    if (!match) return [];
    return allPets.filter(p =>
      p.parentIds?.sire === match.sire.id &&
      p.parentIds?.dam === match.dam.id
    );
  }, [allPets, match]);

  if (!match) return null;

  return (
    <div className="bg-white rounded-3xl p-6 lg:p-8 shadow-xl shadow-[#8B9D83]/5 border border-[#8B9D83]/10 relative overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="absolute top-0 right-0 p-4 opacity-50">
        <svg className="w-32 h-32 text-[#8B9D83]/5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
      </div>

      <div className="relative z-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <h3 className="text-2xl font-bold text-[#2C2C2C] flex items-center gap-2">
            <span className="bg-[#C97064]/10 p-2 rounded-full text-[#C97064]">❤️</span>
            Recommended Mating Pair
            {match.isHighlight && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-700 font-bold border border-yellow-200">
                ✨ Quality Breeding Match
              </span>
            )}
          </h3>

          {/* Social Proof Badge */}
          <div className="flex items-center gap-2 bg-[#F5F1E8] px-3 py-1.5 rounded-full">
            <div className="flex -space-x-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-6 h-6 rounded-full bg-gray-300 border-2 border-white" />
              ))}
            </div>
            <div className="text-xs font-medium text-[#2C2C2C]/70">
              <span className="text-[#C97064] font-bold">5.0</span> (12 Reviews)
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row items-center gap-8">
          {/* Sire Card */}
          <div className="flex-1 w-full bg-[#8B9D83]/5 rounded-2xl p-4 flex gap-4 items-center group cursor-pointer hover:bg-[#8B9D83]/10 transition-colors"
            onClick={() => onDetailClick(match.sire)}>
            <img src={match.sire.image} className="w-24 h-24 rounded-full object-cover border-4 border-blue-100 shadow-md" alt="Sire" />
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-100 text-blue-600 font-bold">SIRE</span>
                <span className="text-xl font-bold truncate max-w-[150px]">{match.sire.name}</span>
              </div>
              <p className="text-sm text-[#2C2C2C]/60 line-clamp-1">{match.sire.breed}</p>
              <button
                className="text-xs text-[#8B9D83] font-medium mt-1 hover:underline text-left"
              >
                View Profile & Pedigree ↗
              </button>
            </div>
          </div>

          {/* Connection */}
          <div className="flex flex-col items-center justify-center px-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#C97064] to-[#B86054] text-white flex items-center justify-center text-xl font-bold mb-2 shadow-lg shadow-[#C97064]/20 transform hover:scale-110 transition-transform">
              +
            </div>
            <div className="text-center">
              <p className="text-xs font-bold text-[#2C2C2C] uppercase tracking-wider mb-1">Status: Confirmed</p>
              <div className="text-sm font-medium text-[#C97064] bg-[#C97064]/10 px-3 py-1 rounded-full">
                Due: Mar 8, 2024
              </div>
            </div>
          </div>

          {/* Dam Card */}
          <div className="flex-1 w-full bg-[#8B9D83]/5 rounded-2xl p-4 flex gap-4 items-center text-right flex-row-reverse border border-pink-100/50 group cursor-pointer hover:bg-[#8B9D83]/10 transition-colors"
            onClick={() => onDetailClick(match.dam)}>
            <img src={match.dam.image} className="w-24 h-24 rounded-full object-cover border-4 border-pink-100 shadow-md" alt="Dam" />
            <div>
              <div className="flex items-center gap-2 mb-1 justify-end">
                <span className="text-xl font-bold truncate max-w-[150px]">{match.dam.name}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-pink-100 text-pink-600 font-bold">DAM</span>
              </div>
              <p className="text-sm text-[#2C2C2C]/60 line-clamp-1">{match.dam.breed}</p>
              <button
                className="text-xs text-[#8B9D83] font-medium mt-1 hover:underline text-right w-full"
              >
                View Profile & Pedigree ↗
              </button>
            </div>
          </div>
        </div>

        {/* Verified Offspring Section */}
        {offspring.length > 0 && (
          <div className="mt-8 pt-8 border-t border-[#8B9D83]/10">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-xl font-bold text-[#2C2C2C] flex items-center gap-2">
                🏆 Past Successful Offspring
                <span className="text-xs font-normal text-[#2C2C2C]/50">({offspring.length} registered)</span>
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {offspring.slice(0, 6).map(child => (
                <div
                  key={child.id}
                  onClick={(e) => { e.stopPropagation(); onDetailClick(child); }}
                  className="bg-[#F5F1E8]/50 p-3 rounded-xl flex items-center gap-3 cursor-pointer hover:bg-[#F5F1E8] transition-colors group border border-transparent hover:border-[#8B9D83]/20"
                >
                  <img
                    src={child.image && child.image !== '' ? child.image : 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80'}
                    alt={child.name}
                    onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80'; }}
                    className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
                  />
                  <div className="overflow-hidden">
                    <p className="font-bold text-[#2C2C2C] text-sm truncate group-hover:text-[#C97064] transition-colors">{child.name}</p>
                    <p className="text-xs text-[#2C2C2C]/50">{child.gender === 'male' ? 'Male' : 'Female'} • {child.birthDate ? new Date().getFullYear() - new Date(child.birthDate).getFullYear() + 'y' : 'Unknown'}</p>
                  </div>
                </div>
              ))}

              {/* Call to action for more, if there are more than 6 */}
              {offspring.length > 6 && (
                <div className="flex items-center justify-center p-3 rounded-xl border border-dashed border-[#8B9D83]/30 text-xs text-[#8B9D83] cursor-pointer hover:bg-[#8B9D83]/5 transition-colors">
                  +{offspring.length - 6} More Offspring
                </div>
              )}
            </div>
          </div>
        )}

        {/* Community Comments (Mock) */}
        {match.isHighlight && (
          <div className="mt-6 pt-6 border-t border-[#8B9D83]/10">
            <h4 className="text-sm font-bold text-[#2C2C2C] mb-3">Community Buzz</h4>
            <div className="flex gap-4 overflow-x-auto pb-2">
              <div className="bg-[#F5F1E8] p-3 rounded-xl min-w-[250px] text-sm">
                <p className="text-[#2C2C2C]/80 italic">"Exciting! My dog is from this pair and has great temperament."</p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="w-5 h-5 bg-gray-300 rounded-full"></div>
                  <span className="text-xs font-bold text-[#2C2C2C]/60">Somsak K.</span>
                </div>
              </div>
              <div className="bg-[#F5F1E8] p-3 rounded-xl min-w-[250px] text-sm">
                <p className="text-[#2C2C2C]/80 italic">"Quality breeding match! Can't wait for the puppies."</p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="w-5 h-5 bg-gray-300 rounded-full"></div>
                  <span className="text-xs font-bold text-[#2C2C2C]/60">Jenny T.</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
          <button
            onClick={() => onInteraction('reserve', match.sire, match.dam)}
            className="px-8 py-3 rounded-full bg-[#C97064] text-white font-bold hover:bg-[#B86054] transition-all shadow-lg shadow-[#C97064]/20 flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            Reserve Puppy Queue
          </button>
          <button
            onClick={() => onInteraction('chat', match.sire, match.dam, match.sire.owner)}
            className="px-8 py-3 rounded-full bg-white border-2 border-[#8B9D83]/20 text-[#6B7D63] font-bold hover:bg-[#8B9D83]/5 transition-all flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            Chat with Owner
          </button>
        </div>

        <div className="mt-4 text-center">
          <button
            onClick={() => onInteraction('report', match.sire, match.dam)}
            className="text-xs text-[#2C2C2C]/40 hover:text-[#C97064] transition-colors">
            Report issue with this match
          </button>
        </div>
      </div>
    </div>
  );
};

export default SearchSection;
