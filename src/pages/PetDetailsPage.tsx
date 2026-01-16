import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import PinterestLayout from '@/components/layout/PinterestLayout';

interface Pet {
    id: string;
    name: string;
    breed: string;
    gender: string;
    image?: string;
    owner?: string;
    location?: string;
    [key: string]: any;
}

const PetDetailsPage = () => {
    const { petId } = useParams<{ petId: string }>();
    const navigate = useNavigate();
    const [pet, setPet] = useState<Pet | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPet = async () => {
            if (!petId) {
                navigate('/');
                return;
            }

            try {
                const { data, error } = await supabase
                    .from('pets')
                    .select('*')
                    .eq('id', petId)
                    .single();

                if (error) throw error;

                if (data) {
                    setPet(data);
                } else {
                    navigate('/');
                }
            } catch (error) {
                console.error('Error fetching pet:', error);
                navigate('/');
            } finally {
                setLoading(false);
            }
        };

        fetchPet();
    }, [petId, navigate]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-[#ea4c89] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading pet details...</p>
                </div>
            </div>
        );
    }

    if (!pet) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                <div className="text-center">
                    <h1 className="text-4xl font-bold text-gray-800 mb-4">Pet Not Found</h1>
                    <p className="text-gray-600 mb-6">The pet you're looking for doesn't exist.</p>
                    <Button onClick={() => navigate('/')} className="bg-[#ea4c89] hover:bg-[#d9457a]">
                        Go Home
                    </Button>
                </div>
            </div>
        );
    }

    // Pass the pet ID to PinterestLayout to auto-open the modal
    return <PinterestLayout initialPetId={petId} />;
};

export default PetDetailsPage;
