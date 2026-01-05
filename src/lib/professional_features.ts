import { supabase } from './supabase';

// ============ REPUTATION SYSTEM (Reviews) ============
export interface UserReview {
    id: string;
    reviewer_id: string;
    target_user_id: string;
    rating: number; // 1-5
    comment: string | null;
    created_at: string;
    reviewer?: {
        full_name: string;
        avatar_url?: string;
    };
}

export async function addUserReview(review: {
    target_user_id: string;
    rating: number;
    comment?: string;
}) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
        .from('user_reviews')
        .insert({
            reviewer_id: user.id,
            target_user_id: review.target_user_id,
            rating: review.rating,
            comment: review.comment
        });

    if (error) throw error;
}

export async function getUserReviews(userId: string) {
    const { data, error } = await supabase
        .from('user_reviews')
        .select(`
      *,
      reviewer:profiles!user_reviews_reviewer_id_profiles_fkey(full_name) 
    `) // Note: 'avatar_url' might not be on profiles? Check schema later. Using full_name for now.
        .eq('target_user_id', userId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data as UserReview[];
}

// ============ BREEDING TOOLS ============

// Heat Cycles
export interface HeatCycle {
    id: string;
    pet_id: string;
    start_date: string;
    end_date: string | null;
    notes: string | null;
}

export async function addHeatCycle(cycle: {
    pet_id: string;
    start_date: string;
    end_date?: string;
    notes?: string;
}) {
    const { error } = await supabase.from('heat_cycles').insert(cycle);
    if (error) throw error;
}

export async function getHeatCycles(petId: string) {
    const { data, error } = await supabase
        .from('heat_cycles')
        .select('*')
        .eq('pet_id', petId)
        .order('start_date', { ascending: false });

    if (error) throw error;
    return data as HeatCycle[];
}

// Litters
export interface Litter {
    id: string;
    dam_id: string | null;
    sire_id: string | null;
    birth_date: string;
    puppy_count: number;
    deceased_count: number;
    notes: string | null;
}

export async function addLitter(litter: {
    dam_id?: string;
    sire_id?: string;
    birth_date: string;
    puppy_count: number;
    deceased_count?: number;
    notes?: string;
}) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase.from('litters').insert({
        ...litter,
        breeder_id: user.id
    });
    if (error) throw error;
}

export async function getLitters(breederId: string) {
    const { data, error } = await supabase
        .from('litters')
        .select(`
      *,
      dam:pets!dam_id(name, breed), 
      sire:pets!sire_id(name, breed)
    `)
        .eq('breeder_id', breederId)
        .order('birth_date', { ascending: false });

    if (error) throw error;
    return data;
}

// ============ OWNERSHIP HISTORY ============
export interface OwnershipRecord {
    id: string;
    pet_id: string;
    previous_owner_id: string | null;
    new_owner_id: string | null;
    transfer_date: string;
    transfer_method: string | null;
    transfer_price: number | null;
    previous_owner?: { full_name: string };
    new_owner?: { full_name: string };
}

export async function getOwnershipHistory(petId: string) {
    const { data, error } = await supabase
        .from('ownership_history')
        .select(`
      *,
      previous_owner:profiles!ownership_history_previous_owner_id_profiles_fkey(full_name),
      new_owner:profiles!ownership_history_new_owner_id_profiles_fkey(full_name)
    `)
        .eq('pet_id', petId)
        .order('transfer_date', { ascending: false });

    if (error) throw error;
    return data as OwnershipRecord[];
}

export async function addOwnershipRecord(record: {
    pet_id: string;
    previous_owner_id?: string;
    new_owner_id?: string;
    transfer_method?: string;
    transfer_price?: number;
}) {
    const { error } = await supabase.from('ownership_history').insert(record);
    if (error) throw error;
}
