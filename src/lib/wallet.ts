import { supabase } from './supabase';

export const BOOST_COST = 50;
export const BOOST_DURATION_HOURS = 24;
export const PRO_STATUS_COST = 500;
export const DAILY_REWARD_AMOUNT = 10;
export const WITNESS_REWARD = 1;

export interface WalletTransaction {
    id: string;
    user_id: string;
    amount: number;
    type: 'reward' | 'purchase' | 'transfer' | 'adjustment';
    description: string;
    created_at: string;
    status?: 'pending' | 'completed' | 'rejected'; // New Field
    related_transaction_id?: string; // To link Sender and Receiver logs
}

export async function getWalletData(userId: string) {
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('trd_balance, last_reward_claimed_at, verified_breeder')
        .eq('id', userId)
        .single();

    if (profileError) {
        if (profileError.code === '42703' || profileError.message.includes('does not exist')) {
            throw profileError;
        }
        return { balance: 0, transactions: [], lastClaimed: null, isVerified: false };
    }

    // Get History
    let transactions: WalletTransaction[] = [];
    try {
        const { data: history } = await supabase
            .from('wallet_transactions')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(50);

        if (history) transactions = history;
    } catch (e) { }

    return {
        balance: profile?.trd_balance || 0,
        transactions,
        lastClaimed: profile?.last_reward_claimed_at,
        isVerified: profile?.verified_breeder || false
    };
}

export async function claimDailyReward(userId: string) {
    // ... (Same as before, simplified for brevity but logic persists)
    const { data: profile } = await supabase.from('profiles').select('last_reward_claimed_at, trd_balance').eq('id', userId).single();
    const lastClaim = profile?.last_reward_claimed_at ? new Date(profile.last_reward_claimed_at) : null;
    const now = new Date();

    if (lastClaim) {
        const diffHours = (now.getTime() - lastClaim.getTime()) / (1000 * 60 * 60);
        if (diffHours < 24) return { success: false, message: `Wait ${Math.ceil(24 - diffHours)}h` };
    }

    const newBalance = (profile?.trd_balance || 0) + DAILY_REWARD_AMOUNT;
    await supabase.from('profiles').update({ trd_balance: newBalance, last_reward_claimed_at: now.toISOString() }).eq('id', userId);

    // Auto-complete rewards (system trusted)
    await supabase.from('wallet_transactions').insert({
        user_id: userId,
        amount: DAILY_REWARD_AMOUNT,
        type: 'reward',
        description: 'Daily Login Reward 🌟',
        status: 'completed'
    });

    return { success: true, message: `You earned ${DAILY_REWARD_AMOUNT} TRD!` };
}

/**
 * Spend TRD to Boost a Pet Listing
 */
export async function boostPet(userId: string, petId: string) {
    // 1. Check Balance and Deduct
    const { data: profile } = await supabase.from('profiles').select('trd_balance').eq('id', userId).single();
    if (!profile || (profile.trd_balance || 0) < BOOST_COST) {
        throw new Error(`Insufficient TRD. You need ${BOOST_COST} TRD.`);
    }

    // 2. Process Payment (Deduct)
    const newBalance = (profile.trd_balance || 0) - BOOST_COST;
    const { error: payError } = await supabase.from('profiles').update({ trd_balance: newBalance }).eq('id', userId);
    if (payError) throw payError;

    // 3. Log Payment
    await supabase.from('wallet_transactions').insert({
        user_id: userId,
        amount: -BOOST_COST,
        type: 'purchase',
        description: 'Boost Listing 🚀',
        status: 'completed'
    });

    // 4. Update Pet (Boost Expiry)
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + BOOST_DURATION_HOURS);

    const { error: boostError } = await supabase
        .from('pets')
        .update({ boosted_until: expiry.toISOString() })
        .eq('id', petId);

    if (boostError) {
        // Refund if pet update fails (Crucial)
        await supabase.from('profiles').update({ trd_balance: profile.trd_balance }).eq('id', userId); // Revert
        throw new Error('Failed to apply boost. TRD refunded.');
    }

    return { success: true, message: `Boosted! Your pet is promoted for ${BOOST_DURATION_HOURS} hours.` };
}


/**
 * 1. Initiate Transfer (Escrow)
 * Deducts from sender immediately but puts receiver transaction in 'pending'.
 */
export async function initiateTransfer(senderId: string, recipientEmail: string, amount: number) {
    // A. Find Recipient by Email (Safer/Easier)
    const { data: recipient } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('email', recipientEmail)
        .single();

    if (!recipient) throw new Error('User not found. Check the email carefully.');
    if (recipient.id === senderId) throw new Error('Cannot send to yourself.');

    // B. Check Balance
    const { data: sender } = await supabase.from('profiles').select('trd_balance').eq('id', senderId).single();
    if (!sender || (sender.trd_balance || 0) < amount) throw new Error('Insufficient balance.');

    // C. Deduct Sender (Immediate Lock)
    const { error: deductError } = await supabase
        .from('profiles')
        .update({ trd_balance: (sender.trd_balance || 0) - amount })
        .eq('id', senderId);

    if (deductError) throw deductError;

    // D. Create Transaction Records
    const txId = crypto.randomUUID();

    // 1. Sender Log (Completed - Money Left)
    await supabase.from('wallet_transactions').insert({
        id: txId,
        user_id: senderId,
        amount: -amount,
        type: 'transfer',
        description: `Transfer to ${recipient.email}`,
        status: 'pending', // Pending Witness Verification
    });

    // 2. Recipient Log (Pending - Money Not Arrived)
    // We store a separate record for the recipient, or just query the sender's pending tx?
    // For simplicity: We insert a 'pending' record for recipient.
    await supabase.from('wallet_transactions').insert({
        user_id: recipient.id,
        amount: amount,
        type: 'transfer',
        description: `Pending from ${senderId.slice(0, 4)}... (Needs Witness)`,
        status: 'pending',
        related_transaction_id: txId
    });

    return { success: true, message: 'Transfer initiated! Waiting for Community Witness to verify.' };
}

/**
 * 2. Get Pending Transactions (For Witnesses)
 * Lists all transactions where status = 'pending' and type = 'transfer' (positive amounts only to avoid double counting)
 */
export async function getPendingTransactions() {
    const { data } = await supabase
        .from('wallet_transactions')
        .select('*, profiles!user_id(full_name, email)') // Join to see who is receiving
        .eq('status', 'pending')
        .gt('amount', 0) // Only look at the Receiving side record
        .order('created_at', { ascending: true });

    return data || [];
}

/**
 * 3. Approve Transaction (The Witness Act)
 */
export async function approveTransaction(witnessId: string, transactionId: string) {
    // A. Get the pending transaction (Recipient side)
    const { data: tx } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('id', transactionId)
        .single();

    if (!tx || tx.status !== 'pending') throw new Error('Transaction already processed or invalid.');
    if (tx.user_id === witnessId) throw new Error('You cannot witness your own receipt!');

    // B. Re-fetch Recipient Profile to add funds
    const { data: recipient } = await supabase.from('profiles').select('trd_balance').eq('id', tx.user_id).single();

    // C. Add Funds to Recipient
    await supabase.from('profiles').update({ trd_balance: (recipient?.trd_balance || 0) + tx.amount }).eq('id', tx.user_id);

    // D. Mark Recipient TX as Completed
    await supabase.from('wallet_transactions').update({ status: 'completed', description: tx.description.replace('Pending', 'Received') }).eq('id', transactionId);

    // E. Mark Sender TX as Completed (Find by related_id or rough match)
    // For MVP, we assumed related_transaction_id link. 
    if (tx.related_transaction_id) {
        await supabase.from('wallet_transactions').update({ status: 'completed' }).eq('id', tx.related_transaction_id);
    }

    // F. Reward Witness
    const { data: witness } = await supabase.from('profiles').select('trd_balance').eq('id', witnessId).single();
    await supabase.from('profiles').update({ trd_balance: (witness?.trd_balance || 0) + WITNESS_REWARD }).eq('id', witnessId);

    // Log Witness Reward
    await supabase.from('wallet_transactions').insert({
        user_id: witnessId,
        amount: WITNESS_REWARD,
        type: 'reward',
        description: 'Witness Fee Reward 🛡️',
        status: 'completed'
    });

    return { success: true, message: 'Transaction Verified! You earned 1 TRD.' };
}

export async function purchaseProStatus(userId: string) {
    try {
        // 1. Check Balance
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('trd_balance, verified_breeder')
            .eq('id', userId)
            .single();

        if (profileError) throw profileError;

        if (profile.verified_breeder) {
            throw new Error('You are already a Verified Pro Breeder!');
        }

        if ((profile.trd_balance || 0) < PRO_STATUS_COST) {
            throw new Error(`Insufficient funds. You need ${PRO_STATUS_COST} TRD.`);
        }

        // 2. Deduct Balance
        const { error: updateError } = await supabase
            .from('profiles')
            .update({
                trd_balance: (profile.trd_balance || 0) - PRO_STATUS_COST,
                verified_breeder: true
            })
            .eq('id', userId);

        if (updateError) throw updateError;

        // 3. Log Transaction
        await supabase.from('wallet_transactions').insert({
            user_id: userId,
            amount: -PRO_STATUS_COST,
            type: 'purchase',
            description: 'Upgrade to Pro Breeder 🏆',
            status: 'completed'
        });

        return { success: true, message: 'Welcome to the club! You are now a Verified Breeder. 🏆' };
    } catch (error: any) {
        throw error;
    }
}
