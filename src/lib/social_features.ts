// ============ SOCIAL FEATURES ============

import { supabase } from './supabase';

export interface PetComment {
    id: string;
    pet_id: string;
    user_id: string;
    content: string;
    created_at: string;
    is_approved?: boolean;
    approved_by?: string | null;
    approved_at?: string | null;
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
export async function getPetComments(petId: string, options?: { includeUnapproved?: boolean }) {
    const { data: { user } } = await supabase.auth.getUser();
    let query = supabase
        .from('pet_comments')
        .select(`
      *,
      user:user_id (
        full_name,
        avatar_url
      )
    `)
        .eq('pet_id', petId);

    if (!options?.includeUnapproved) {
        if (user) {
            query = query.or(`is_approved.eq.true,user_id.eq.${user.id}`);
        } else {
            query = query.eq('is_approved', true);
        }
    }

    const { data, error } = await query.order('created_at', { ascending: false }); // Newest first

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

    let isApproved = false;
    let approvedBy: string | null = null;
    let approvedAt: string | null = null;

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

    if (profile?.role === 'admin') {
        isApproved = true;
        approvedBy = user.id;
        approvedAt = new Date().toISOString();
    }

    const { error } = await supabase
        .from('pet_comments')
        .insert({
            pet_id: petId,
            user_id: user.id,
            content,
            is_approved: isApproved,
            approved_by: approvedBy,
            approved_at: approvedAt
        });

    if (error) throw error;
}

export async function approvePetComment(commentId: string, approved = true) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Must be logged in to approve");

    const updates = approved
        ? { is_approved: true, approved_by: user.id, approved_at: new Date().toISOString() }
        : { is_approved: false, approved_by: null, approved_at: null };

    const { error } = await supabase
        .from('pet_comments')
        .update(updates)
        .eq('id', commentId);

    if (error) throw error;
}

export async function deletePetComment(commentId: string) {
    const { error } = await supabase
        .from('pet_comments')
        .delete()
        .eq('id', commentId);

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
        .eq('pet_id', petId)
        .eq('is_approved', true);

    let hasLiked = false;
    if (user) {
        const { data } = await supabase
            .from('pet_likes')
            .select('user_id')
            .eq('pet_id', petId)
            .eq('user_id', user.id)
            .maybeSingle();
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
