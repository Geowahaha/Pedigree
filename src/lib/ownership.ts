import { supabase } from './supabase';
import { createNotification, createUserNotification } from './database';
import type { Pet } from './database';

const EVIDENCE_BUCKET = 'ownership-evidence';
const EVIDENCE_URL_TTL_SECONDS = 60 * 60 * 24;

async function toSignedEvidenceUrls(evidenceFiles?: string[] | null): Promise<string[]> {
    if (!Array.isArray(evidenceFiles) || evidenceFiles.length === 0) return [];

    const urls = await Promise.all(
        evidenceFiles.map(async (filePath) => {
            if (!filePath) return null;
            if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
                return filePath;
            }

            const { data, error } = await supabase
                .storage
                .from(EVIDENCE_BUCKET)
                .createSignedUrl(filePath, EVIDENCE_URL_TTL_SECONDS);

            if (error || !data?.signedUrl) return filePath;
            return data.signedUrl;
        })
    );

    return urls.filter((url): url is string => Boolean(url));
}

// ============ OWNERSHIP VERIFICATION ============

export interface OwnershipClaim {
    id: string;
    pet_id: string;
    claimant_id: string;
    claim_type: 'original_owner' | 'new_owner' | 'breeder';
    evidence: string;
    evidence_files: string[]; // Storage paths or signed URLs
    status: 'pending' | 'approved' | 'rejected';
    admin_notes: string | null;
    reviewed_by: string | null;
    created_at: string;
    updated_at: string;
    // Relations
    pet?: Pet;
    claimant?: {
        id: string;
        full_name: string;
        email: string;
    };
}

export interface ClaimMessage {
    id: string;
    claim_id: string;
    sender_id: string;
    message: string;
    attachments: string[];
    created_at: string;
    // Relations
    sender?: {
        full_name: string;
        is_admin: boolean;
    };
}

// Get all ownership claims (Admin)
export async function getOwnershipClaims(status?: 'pending' | 'approved' | 'rejected') {
    let query = supabase
        .from('ownership_claims')
        .select(`
      *,
      pet:pets(id, name, image_url, breed),
      claimant:profiles!claimant_id(id, full_name, email)
    `)
        .order('created_at', { ascending: false });

    if (status) {
        query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) {
        console.error('Error fetching ownership claims:', error);
        return [];
    }
    const claims = data as OwnershipClaim[];
    const hydrated = await Promise.all(
        claims.map(async (claim) => ({
            ...claim,
            evidence_files: await toSignedEvidenceUrls(claim.evidence_files)
        }))
    );
    return hydrated;
}

// Get user's ownership claims
export async function getUserOwnershipClaims() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('ownership_claims')
        .select(`
      *,
      pet:pets(id, name, image_url, breed)
    `)
        .eq('claimant_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching user claims:', error);
        return [];
    }
    const claims = data as OwnershipClaim[];
    const hydrated = await Promise.all(
        claims.map(async (claim) => ({
            ...claim,
            evidence_files: await toSignedEvidenceUrls(claim.evidence_files)
        }))
    );
    return hydrated;
}

// Create ownership claim
export async function createOwnershipClaim(claimData: {
    pet_id: string;
    claim_type: 'original_owner' | 'new_owner' | 'breeder';
    evidence: string;
    evidence_files?: string[];
}) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Check if already claimed
    const { data: existing } = await supabase
        .from('ownership_claims')
        .select('id')
        .eq('pet_id', claimData.pet_id)
        .eq('claimant_id', user.id)
        .maybeSingle();

    if (existing) {
        throw new Error('You already have a claim for this pet');
    }

    const { data, error } = await supabase
        .from('ownership_claims')
        .insert({
            pet_id: claimData.pet_id,
            claimant_id: user.id,
            claim_type: claimData.claim_type,
            evidence: claimData.evidence,
            evidence_files: claimData.evidence_files || []
        })
        .select()
        .single();

    if (error) throw error;

    // Notify admin
    await createNotification({
        type: 'verification_request',
        title: 'New Ownership Claim',
        message: `${user.email} submitted an ownership claim`,
        reference_id: data.id
    });

    return data as OwnershipClaim;
}

// Approve ownership claim (Admin)
export async function approveOwnershipClaim(claimId: string, adminNotes?: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Use database function for atomic operation
    const { data, error } = await supabase.rpc('approve_ownership_claim', {
        claim_id_param: claimId,
        admin_id_param: user.id,
        admin_notes_param: adminNotes || null
    });

    if (error) throw error;

    // Get claim details for notification
    const { data: claim } = await supabase
        .from('ownership_claims')
        .select('claimant_id, pet:pets(name)')
        .eq('id', claimId)
        .single();

    if (claim) {
        // Notify user
        await createUserNotification({
            user_id: claim.claimant_id,
            type: 'verification',
            title: 'Ownership Claim Approved!',
            message: `Your claim for ${claim.pet?.name} has been approved. You are now the verified owner!`,
            payload: { claim_id: claimId }
        });
    }

    return data;
}

// Reject ownership claim (Admin)
export async function rejectOwnershipClaim(claimId: string, adminNotes?: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Use database function
    const { data, error } = await supabase.rpc('reject_ownership_claim', {
        claim_id_param: claimId,
        admin_id_param: user.id,
        admin_notes_param: adminNotes || null
    });

    if (error) throw error;

    // Get claim details for notification
    const { data: claim } = await supabase
        .from('ownership_claims')
        .select('claimant_id, pet:pets(name)')
        .eq('id', claimId)
        .single();

    if (claim) {
        // Notify user
        await createUserNotification({
            user_id: claim.claimant_id,
            type: 'system',
            title: 'Ownership Claim Rejected',
            message: `Your claim for ${claim.pet?.name} was not approved. ${adminNotes || ''}`,
            payload: { claim_id: claimId }
        });
    }

    return data;
}

// Get claim messages
export async function getClaimMessages(claimId: string) {
    const { data, error } = await supabase
        .from('claim_messages')
        .select(`
      *,
      sender:profiles!sender_id(full_name, is_admin)
    `)
        .eq('claim_id', claimId)
        .order('created_at', { ascending: true });

    if (error) {
        console.error('Error fetching claim messages:', error);
        return [];
    }
    return data as ClaimMessage[];
}

// Send claim message
export async function sendClaimMessage(claimId: string, message: string, attachments?: string[]) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
        .from('claim_messages')
        .insert({
            claim_id: claimId,
            sender_id: user.id,
            message,
            attachments: attachments || []
        })
        .select()
        .single();

    if (error) throw error;
    return data as ClaimMessage;
}

// Check if user has claimed a pet
export async function hasClaimedPet(petId: string): Promise<OwnershipClaim | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
        .from('ownership_claims')
        .select('*')
        .eq('pet_id', petId)
        .eq('claimant_id', user.id)
        .maybeSingle();

    if (error || !data) return null;
    return data as OwnershipClaim;
}
