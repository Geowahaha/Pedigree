// ============ SOCIAL FEATURES ============

import { supabase } from './supabase';

export interface PetComment {
    id: string;
    pet_id: string;
    user_id: string;
    content: string;
    created_at: string;
    user?: {
        full_name: string;
        avatar_url?: string;
    };
}

export interface PetSocialStats {
    view_count: number;
    like_count: number;
    comment_count: number;
    has_liked: boolean;
}

// 1. GET COMMENTS
export async function getPetComments(petId: string) {
    const { data, error } = await supabase
        .from('pet_comments')
        .select(`
      *,
      user:user_id (
        full_name,
        avatar_url
      )
    `)
        .eq('pet_id', petId)
        .order('created_at', { ascending: false }); // Newest first

    if (error) {
        console.error('Error fetching comments:', error);
        return [];
    }
    return data;
}

// 2. POST COMMENT
export async function postPetComment(petId: string, content: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Must be logged in to comment");

    const { error } = await supabase
        .from('pet_comments')
        .insert({
            pet_id: petId,
            user_id: user.id,
            content
        });

    if (error) throw error;
}

// 3. GET SOCIAL STATS (Likes, Views, HasLiked)
export async function getPetSocialStats(petId: string): Promise<PetSocialStats> {
    const { data: { user } } = await supabase.auth.getUser();

    // Get Views & Counts
    const { data: pet } = await supabase
        .from('pets')
        .select('view_count')
        .eq('id', petId)
        .single();

    const { count: likeCount } = await supabase
        .from('pet_likes')
        .select('*', { count: 'exact', head: true })
        .eq('pet_id', petId);

    const { count: commentCount } = await supabase
        .from('pet_comments')
        .select('*', { count: 'exact', head: true })
        .eq('pet_id', petId);

    let hasLiked = false;
    if (user) {
        const { data } = await supabase
            .from('pet_likes')
            .select('user_id')
            .eq('pet_id', petId)
            .eq('user_id', user.id)
            .single();
        if (data) hasLiked = true;
    }

    return {
        view_count: pet?.view_count || 0,
        like_count: likeCount || 0,
        comment_count: commentCount || 0,
        has_liked: hasLiked
    };
}

// 4. TOGGLE LIKE
export async function togglePetLike(petId: string, isLiking: boolean) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Must be logged in");

    if (isLiking) {
        await supabase.from('pet_likes').insert({ pet_id: petId, user_id: user.id });
    } else {
        await supabase.from('pet_likes').delete().eq('pet_id', petId).eq('user_id', user.id);
    }
}

// 5. INCREMENT VIEW count
export async function incrementPetView(petId: string) {
    await supabase.rpc('increment_pet_view', { target_pet_id: petId });
}

// 6. SUBSCRIBE TO COMMENTS
export function subscribeToPetComments(petId: string, callback: () => void) {
    return supabase
        .channel(`pet-comments:${petId}`)
        .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'pet_comments', filter: `pet_id=eq.${petId}` },
            callback
        )
        .subscribe();
}
