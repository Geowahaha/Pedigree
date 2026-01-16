import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export const useRealtimePets = (onNewPet?: () => void) => {
    const [newPetCount, setNewPetCount] = useState(0);

    useEffect(() => {
        const channel = supabase
            .channel('public-pets-changes')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'pets',
                    filter: 'is_public=eq.true',
                },
                (payload) => {
                    // New pet added!
                    setNewPetCount(prev => prev + 1);

                    // Show toast notification
                    const pet = payload.new as any;
                    toast.success(`✨ New ${pet.breed || 'pet'} added!`, {
                        description: 'Click to refresh',
                        action: {
                            label: 'Refresh',
                            onClick: () => {
                                setNewPetCount(0);
                                onNewPet?.(); // Let parent handle refresh
                            },
                        },
                    });
                }
            )
            .subscribe();

        return () => {
            channel.unsubscribe();
        };
    }, [onNewPet]);

    return { newPetCount, resetCount: () => setNewPetCount(0) };
};
