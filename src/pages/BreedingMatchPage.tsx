/**
 * Breeding Match Page
 * 
 * Dedicated page for AI Breeding Matchmaker with its own URL
 * URL: /breeding/:petId
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPetById, Pet } from '@/lib/database';
import BreedingMatchModal from '@/components/modals/BreedingMatchModal';

const BreedingMatchPage = () => {
    const { petId } = useParams<{ petId: string }>();
    const navigate = useNavigate();
    const [pet, setPet] = useState<Pet | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadPet = async () => {
            if (!petId) {
                navigate('/');
                return;
            }

            try {
                const petData = await getPetById(petId);
                if (petData) {
                    setPet(petData);
                } else {
                    navigate('/');
                }
            } catch (error) {
                console.error('Error loading pet:', error);
                navigate('/');
            } finally {
                setLoading(false);
            }
        };

        loadPet();
    }, [petId, navigate]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading breeding match...</p>
                </div>
            </div>
        );
    }

    if (!pet) {
        return null;
    }

    return (
        <BreedingMatchModal
            isOpen={true}
            onClose={() => navigate(-1)}
            sourcePet={pet as any}
        />
    );
};

export default BreedingMatchPage;
