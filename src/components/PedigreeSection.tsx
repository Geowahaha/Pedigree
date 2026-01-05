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


  // Load pets from database
  useEffect(() => {
    const loadPets = async () => {
      setLoading(true);
      try {
        const dbPets = await getPublicPets();

        // Convert database pets to display format
        const convertedPets: Pet[] = dbPets.map((dbPet: DbPet) => {
          // Sanitize type based on breed if possible to prevent errors
          const breedLower = (dbPet.breed || '').toLowerCase();
          const typeLower = (dbPet.type || '').toLowerCase();

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
            // No default/fake images - leave empty if missing
            image: dbPet.image_url || '',
            color: dbPet.color || '',
            registrationNumber: dbPet.registration_number || undefined,
            healthCertified: dbPet.health_certified,
            location: dbPet.location || '',
            owner: dbPet.owner?.full_name || dbPet.owner_name || 'Unknown',
            parentIds: dbPet.pedigree ? {
              sire: dbPet.pedigree.sire_id || undefined,
              dam: dbPet.pedigree.dam_id || undefined
            } : undefined
          };
        });

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



    // Check for valid image (strict rule: show ONLY pets with images)
    const hasImage = pet.image && pet.image.trim() !== '';

    return matchesType && matchesSearch && hasImage;
  });

  return (
    <section id="pedigree" className="py-20 lg:py-28 bg-muted/30 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="cursor-pointer group" onClick={onRegisterClick}>
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-bold mb-4 animate-in fade-in zoom-in duration-500">
              Pedigree Registry
            </span>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-foreground mb-4 group-hover:text-primary transition-colors duration-300">
              Register your pet now!
            </h2>
            <p className="text-lg text-foreground/60 max-w-2xl mx-auto group-hover:underline decoration-primary underline-offset-4">
              Click here to verify pedigree and archive lineage
            </p>
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
      </div>
    </section>
  );
};

export default PedigreeSection;
