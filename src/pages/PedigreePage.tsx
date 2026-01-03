import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPetById } from '@/lib/petsService';
import { Pet } from '@/data/petData';
import PedigreeModal from '@/components/modals/PedigreeModal';

const PedigreePage: React.FC = () => {
    const { petId } = useParams<{ petId: string }>();
    const navigate = useNavigate();
    const [pet, setPet] = useState<Pet | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadPet() {
            if (!petId) {
                navigate('/');
                return;
            }

            try {
                const foundPet = await getPetById(petId);
                if (foundPet) {
                    setPet(foundPet);
                } else {
                    // Pet not found
                    navigate('/');
                }
            } catch (error) {
                console.error('Failed to load pet:', error);
                navigate('/');
            } finally {
                setLoading(false);
            }
        }

        loadPet();
    }, [petId, navigate]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent mb-4"></div>
                    <p className="text-foreground/60">Loading pedigree...</p>
                </div>
            </div>
        );
    }

    return (
        <PedigreeModal
            isOpen={true}
            onClose={() => navigate('/')}
            pet={pet}
        />
    );
};

export default PedigreePage;
