import React, { useState, useEffect } from 'react';
import { pets as staticPets, Pet } from '@/data/petData';
import { getPublicPets, Pet as DbPet } from '@/lib/database';
import PetCard from './PetCard';
import SkeletonCard from './SkeletonCard';

interface PedigreeSectionProps {
  onRegisterClick: () => void;
  onViewPedigree: (pet: Pet) => void;
  onViewDetails: (pet: Pet) => void;
}

const PedigreeSection: React.FC<PedigreeSectionProps> = ({ onRegisterClick, onViewPedigree, onViewDetails }) => {
  const [filter, setFilter] = useState<'all' | 'dog' | 'cat'>('all');
  const [allPets, setAllPets] = useState<Pet[]>(staticPets);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [generationFilter, setGenerationFilter] = useState<'all' | 'complete' | 'partial' | 'none'>('all');

  // Load pets from database
  useEffect(() => {
    const loadPets = async () => {
      setLoading(true);
      try {
        const dbPets = await getPublicPets();

        // Convert database pets to display format
        const convertedPets: Pet[] = dbPets.map((dbPet: DbPet) => ({
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
        }));

        // Combine static pets with database pets (database pets first)
        setAllPets([...convertedPets, ...staticPets]);
      } catch (error) {
        console.error('Error loading pets:', error);
        // Fall back to static pets
        setAllPets(staticPets);
      } finally {
        setLoading(false);
      }
    };

    loadPets();
  }, []);

  const filteredPets = allPets.filter(pet => {
    // Type filter
    const matchesType = filter === 'all' || pet.type === filter;

    // Search filter (name, owner, location, registration number)
    const matchesSearch = !searchTerm ||
      pet.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (pet.owner && pet.owner.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (pet.location && pet.location.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (pet.registrationNumber && pet.registrationNumber.toLowerCase().includes(searchTerm.toLowerCase()));

    // Generation depth filter
    let matchesGeneration = true;
    if (generationFilter !== 'all') {
      const hasSire = Boolean(pet.parentIds?.sire);
      const hasDam = Boolean(pet.parentIds?.dam);
      const hasParents = hasSire && hasDam;

      if (generationFilter === 'complete') {
        matchesGeneration = hasParents;
      } else if (generationFilter === 'partial') {
        matchesGeneration = (hasSire || hasDam) && !hasParents;
      } else if (generationFilter === 'none') {
        matchesGeneration = !hasSire && !hasDam;
      }
    }

    return matchesType && matchesSearch && matchesGeneration;
  });

  return (
    <section id="pedigree" className="py-20 lg:py-28 bg-muted/30 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-bold mb-4 animate-in fade-in zoom-in duration-500">
            Pedigree Registry
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground mb-4">
            Registered Family Trees
          </h2>
          <p className="text-lg text-foreground/60 max-w-2xl mx-auto">
            Explore our collection of registered pets with verified pedigrees. Each profile includes complete ancestry documentation.
          </p>
        </div>

        {/* Generation Filter */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center gap-3 bg-white rounded-2xl p-2 shadow-sm border">
            <span className="text-sm font-bold text-foreground/70 px-2">Filter by Pedigree:</span>
            <select
              value={generationFilter}
              onChange={(e) => setGenerationFilter(e.target.value as typeof generationFilter)}
              className="px-4 py-2 rounded-xl border-0 focus:ring-2 focus:ring-primary/20 outline-none text-sm font-medium bg-transparent text-foreground cursor-pointer"
            >
              <option value="all">All Generations</option>
              <option value="complete">✓ Complete Pedigree</option>
              <option value="partial">○ Partial Pedigree</option>
              <option value="none">✕ No Pedigree</option>
            </select>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center justify-center gap-2 mb-10">
          {[
            { id: 'all', label: 'All Pets' },
            { id: 'dog', label: 'Dogs' },
            { id: 'cat', label: 'Cats' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as 'all' | 'dog' | 'cat')}
              className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300 ${filter === tab.id
                ? 'bg-foreground text-background shadow-lg scale-105'
                : 'bg-background text-foreground/70 hover:bg-primary/10 hover:text-primary'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Pet Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {loading ? (
            <>
              {[...Array(8)].map((_, idx) => (
                <SkeletonCard key={idx} type="pet" />
              ))}
            </>
          ) : (
            filteredPets.slice(0, 8).map((pet) => (
              <PetCard
                key={pet.id}
                pet={pet}
                onViewPedigree={onViewPedigree}
                onViewDetails={onViewDetails}
              />
            ))
          )}
        </div>


        {/* CTA */}
        <div className="text-center">
          <button
            onClick={onRegisterClick}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-accent text-white font-bold hover:bg-accent/90 transition-all duration-300 shadow-xl shadow-accent/25 hover:shadow-2xl hover:shadow-accent/30 hover:-translate-y-1"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Register Your Pet
          </button>
        </div>
      </div>
    </section>
  );
};

export default PedigreeSection;
