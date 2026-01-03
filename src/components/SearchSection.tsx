import React, { useState, useMemo, useEffect } from 'react';
import { pets as staticPets, breeds, locations, Pet } from '@/data/petData';
import { getPublicPets, searchPets, Pet as DbPet } from '@/lib/database';
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
  const [allPets, setAllPets] = useState<Pet[]>(staticPets);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);

  // Convert database pet to display format
  const convertDbPet = (dbPet: DbPet): Pet => ({
    id: dbPet.id,
    name: dbPet.name,
    breed: dbPet.breed,
    type: dbPet.type,
    birthDate: dbPet.birth_date,
    gender: dbPet.gender,
    image: dbPet.image_url || (dbPet.type === 'dog'
      ? 'https://d64gsuwffb70l.cloudfront.net/69567cc3a990a2b608fe6790_1767275829522_4145f3ee.jpg'
      : 'https://d64gsuwffb70l.cloudfront.net/69567cc3a990a2b608fe6790_1767275859561_c08c1e97.jpg'),
    color: dbPet.color || '',
    registrationNumber: dbPet.registration_number || undefined,
    healthCertified: dbPet.health_certified,
    location: dbPet.location || '',
    owner: dbPet.owner?.full_name || 'Unknown',
    parentIds: dbPet.pedigree ? {
      sire: dbPet.pedigree.sire_id || undefined,
      dam: dbPet.pedigree.dam_id || undefined
    } : undefined
  });

  // Load pets from database on mount
  useEffect(() => {
    const loadPets = async () => {
      setLoading(true);
      try {
        const dbPets = await getPublicPets();
        const convertedPets = dbPets.map(convertDbPet);
        setAllPets([...convertedPets, ...staticPets]);
      } catch (error) {
        console.error('Error loading pets:', error);
        setAllPets(staticPets);
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
          // Combine with static pets that match
          const staticMatches = staticPets.filter(pet =>
            pet.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            pet.breed.toLowerCase().includes(searchQuery.toLowerCase()) ||
            pet.registrationNumber?.toLowerCase().includes(searchQuery.toLowerCase())
          );
          setAllPets([...convertedResults, ...staticMatches]);
        } catch (error) {
          console.error('Search error:', error);
        } finally {
          setSearching(false);
        }
      }
    };

    const debounce = setTimeout(performSearch, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const availableBreeds = petType === 'all'
    ? [...breeds.dog, ...breeds.cat]
    : breeds[petType];

  const filteredPets = useMemo(() => {
    return allPets.filter(pet => {
      const matchesSearch = searchQuery.length < 2 ||
        pet.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pet.breed.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pet.registrationNumber?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = petType === 'all' || pet.type === petType;
      const matchesBreed = !selectedBreed || pet.breed === selectedBreed;
      const matchesLocation = !selectedLocation || pet.location === selectedLocation;
      const matchesHealth = !healthCertified || pet.healthCertified;

      return matchesSearch && matchesType && matchesBreed && matchesLocation && matchesHealth;
    });
  }, [allPets, searchQuery, petType, selectedBreed, selectedLocation, healthCertified]);

  const clearFilters = () => {
    setSearchQuery('');
    setPetType('all');
    setSelectedBreed('');
    setSelectedLocation('');
    setHealthCertified(false);
  };

  const calculateAge = (birthDate: string) => {
    const birth = new Date(birthDate);
    const now = new Date();
    const years = now.getFullYear() - birth.getFullYear();
    const months = now.getMonth() - birth.getMonth();

    if (years === 0) return `${months} months`;
    if (years === 1 && months < 0) return `${12 + months} months`;
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
              Found <span className="font-semibold text-[#2C2C2C]">{filteredPets.length}</span> pets
            </p>
            <button
              onClick={clearFilters}
              className="text-sm text-[#C97064] hover:text-[#B86054] font-medium transition-colors"
            >
              Clear all filters
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="space-y-4">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, idx) => (
                <SkeletonCard key={idx} type="pet" />
              ))}
            </div>
          ) : filteredPets.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center">
              <svg className="w-16 h-16 mx-auto text-[#8B9D83]/30 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-xl font-semibold text-[#2C2C2C] mb-2">No pets found</h3>
              <p className="text-[#2C2C2C]/60">Try adjusting your search criteria</p>
            </div>
          ) : (
            filteredPets.slice(0, 10).map((pet) => (
              <div
                key={pet.id}
                className="bg-white rounded-2xl p-4 lg:p-6 flex flex-col sm:flex-row gap-4 lg:gap-6 hover:shadow-lg transition-shadow cursor-pointer group"
                onClick={() => onViewDetails(pet)}
              >
                <img
                  src={pet.image}
                  alt={pet.name}
                  loading="eager"
                  decoding="async"
                  fetchPriority="high"
                  className="w-full sm:w-32 lg:w-40 h-32 lg:h-40 rounded-xl object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = pet.type === 'dog'
                      ? 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&h=400&fit=crop'
                      : 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400&h=400&fit=crop';
                  }}
                />
                <div className="flex-1">
                  <div className="flex flex-wrap items-start gap-2 mb-2">
                    <h3 className="text-xl font-semibold text-[#2C2C2C]">{pet.name}</h3>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${pet.type === 'dog' ? 'bg-[#C97064]/10 text-[#C97064]' : 'bg-[#8B9D83]/10 text-[#6B7D63]'
                      }`}>
                      {pet.type === 'dog' ? 'Dog' : 'Cat'}
                    </span>
                    {pet.healthCertified && (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Certified
                      </span>
                    )}
                  </div>
                  <p className="text-[#2C2C2C]/70 mb-3">{pet.breed} • {pet.color}</p>
                  <div className="flex flex-wrap gap-4 text-sm text-[#2C2C2C]/60 mb-4">
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {calculateAge(pet.birthDate)}
                    </span>
                    {pet.location && (
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {pet.location}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      {pet.owner}
                    </span>
                  </div>
                  {pet.registrationNumber && (
                    <p className="text-xs text-[#8B9D83] font-mono mb-4">{pet.registrationNumber}</p>
                  )}
                  <div className="flex gap-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewPedigree(pet);
                      }}
                      className="px-4 py-2 rounded-lg bg-[#2C2C2C] text-white text-sm font-medium hover:bg-[#3C3C3C] transition-colors"
                    >
                      View Pedigree
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewDetails(pet);
                      }}
                      className="px-4 py-2 rounded-lg border border-[#8B9D83]/30 text-[#2C2C2C] text-sm font-medium hover:bg-[#8B9D83]/10 transition-colors"
                    >
                      Full Details
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
};

export default SearchSection;
