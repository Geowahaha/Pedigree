import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { getWalletData, claimDailyReward, initiateTransfer, getPendingTransactions, approveTransaction, purchaseProStatus, WalletTransaction, DAILY_REWARD_AMOUNT, WITNESS_REWARD, PRO_STATUS_COST } from '@/lib/wallet';

interface WalletModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const WalletModal: React.FC<WalletModalProps> = ({ isOpen, onClose }) => {
    const { user, updateProfile } = useAuth();
    const [balance, setBalance] = useState(0);
    const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
    const [pendingTxs, setPendingTxs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [claiming, setClaiming] = useState(false);
    const [lastClaimed, setLastClaimed] = useState<string | null>(null);
    const [isVerified, setIsVerified] = useState(false);
    const [activeTab, setActiveTab] = useState<'personal' | 'community' | 'pro'>('personal');
    const [upgrading, setUpgrading] = useState(false);

    // View State: 'main', 'send', 'receive'
    const [view, setView] = useState<'main' | 'send' | 'receive'>('main');
    const [sendAmount, setSendAmount] = useState('');
    const [recipientEmail, setRecipientEmail] = useState('');
    const [transferring, setTransferring] = useState(false);

    // Fetch Data on Open
    useEffect(() => {
        if (isOpen && user) {
            loadWallet();
            // Reset view to main when re-opening
            setView('main');
            setSendAmount('');
            setRecipientEmail('');
        }
    }, [isOpen, user]);

    // Fetch Pending List when switching to Community Tab
    useEffect(() => {
        if (activeTab === 'community' && user) {
            loadPendingTxs();
        }
    }, [activeTab]);

    const loadWallet = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const data = await getWalletData(user.id);
            setBalance(data.balance);
            setTransactions(data.transactions);
            setLastClaimed(data.lastClaimed);
            setIsVerified(data.isVerified);
        } catch (err: any) {
            console.error(err);
            if (err?.code === '42703' || (err?.message && err.message.includes('does not exist')) || err?.code === 'PGRST100') {
                // PGRST100/406 can happen if column missing
                alert("⚠️ Database Update Required\n\nPlease run the Latest SQL script to add 'email' and 'status' columns.");
            }
        } finally {
            setLoading(false);
        }
    };

    const loadPendingTxs = async () => {
        const txs = await getPendingTransactions();
        setPendingTxs(txs);
    };

    const handleVerifyTx = async (txId: string) => {
        if (!user) return;
        try {
            const res = await approveTransaction(user.id, txId);
            alert(res.message);
            loadPendingTxs(); // Refresh list
            loadWallet(); // Refresh balance (earned reward)
        } catch (e: any) {
            alert('Verification failed: ' + e.message);
        }
    };

    const handleClaimReward = async () => {
        if (!user || claiming) return;
        setClaiming(true);
        try {
            const result = await claimDailyReward(user.id);
            if (result.success) {
                setBalance(prev => prev + DAILY_REWARD_AMOUNT);
                setLastClaimed(new Date().toISOString());
                updateProfile({ trd_balance: balance + DAILY_REWARD_AMOUNT });
                loadWallet(); // Full reload to get correct history
            }
            alert(result.message);
        } catch (error: any) {
            alert('Claim failed. See console.');
        } finally {
            setClaiming(false);
        }
    };

    const handleUpgrade = async () => {
        if (!user || upgrading) return;
        setUpgrading(true);
        try {
            const res = await purchaseProStatus(user.id);
            alert(res.message);
            loadWallet(); // Refresh to see balance deduction and verification status
        } catch (e: any) {
            alert(e.message);
        } finally {
            setUpgrading(false);
        }
    };

    const handleTransfer = async () => {
        if (!user || transferring) return;
        if (!recipientEmail || !sendAmount || Number(sendAmount) <= 0) {
            alert('Please enter a valid email and amount.');
            return;
        }

        setTransferring(true);
        try {
            const amount = Number(sendAmount);
            const result = await initiateTransfer(user.id, recipientEmail, amount);

            if (result.success) {
                alert(result.message);
                loadWallet(); // Reload to see pending tx
                setView('main');
            }
        } catch (error: any) {
            console.error('Transfer error', error);
            if (error?.code === '406' || error?.message?.includes('406')) {
                alert("⚠️ Error needs SQL Update\n\nThe system cannot find the 'email' column. Please run the provided SQL script.");
            } else {
                alert('Transfer failed: ' + (error.message || 'Unknown error'));
            }
        } finally {
            setTransferring(false);
        }
    };

    const isClaimable = () => {
        if (!lastClaimed) return true;
        const last = new Date(lastClaimed).getTime();
        const now = new Date().getTime();
        const hours = (now - last) / (1000 * 60 * 60);
        return hours >= 24;
    };

    if (!isOpen) return null;

    // ---- RENDER: Send View ----
    if (view === 'send') {
        return (
            <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
                <DialogContent className="max-w-md p-6 bg-[#0A0A0A] rounded-3xl border border-[#C5A059]/30 text-[#F5F5F0]">
                    <DialogHeader>
                        <DialogTitle className="text-center text-[#C5A059]">Secure Transfer</DialogTitle>
                        <DialogDescription className="text-center text-xs text-[#B8B8B8]">
                            Funds are held in Escrow until verified by a Community Guardian.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div>
                            <label className="text-xs text-[#B8B8B8] uppercase">Recipient Email</label>
                            <input
                                type="email"
                                placeholder="name@example.com"
                                className="w-full bg-[#1A1A1A] border border-[#C5A059]/20 rounded-lg p-3 text-white text-sm focus:border-[#C5A059] outline-none"
                                value={recipientEmail}
                                onChange={(e) => setRecipientEmail(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="text-xs text-[#B8B8B8] uppercase">Amount</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    placeholder="0"
                                    className="w-full bg-[#1A1A1A] border border-[#C5A059]/20 rounded-lg p-3 text-white text-lg font-bold focus:border-[#C5A059] outline-none"
                                    value={sendAmount}
                                    onChange={(e) => setSendAmount(e.target.value)}
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#C5A059] font-bold">TRD</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button onClick={() => setView('main')} className="flex-1 py-3 bg-[#1A1A1A] text-[#B8B8B8] rounded-lg">Cancel</button>
                        <button onClick={handleTransfer} disabled={transferring} className="flex-1 py-3 bg-[#C5A059] text-black font-bold rounded-lg">
                            {transferring ? 'Processing...' : 'Send with Escrow'}
                        </button>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    if (view === 'receive') {
        return (
            <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
                <DialogContent className="max-w-md p-6 bg-[#0A0A0A] rounded-3xl border border-[#C5A059]/30 text-[#F5F5F0]">
                    <DialogHeader>
                        <DialogTitle className="text-center text-[#C5A059]">Receive TRD</DialogTitle>
                        <DialogDescription className="text-center text-xs text-[#B8B8B8]">Simply share your registered Email.</DialogDescription>
                    </DialogHeader>
                    <div className="text-center py-6">
                        <p className="text-xl font-bold text-white mb-2">{user?.email}</p>
                        <p className="text-xs text-[#B8B8B8]">Share this with the sender.</p>
                    </div>
                    <button onClick={() => setView('main')} className="w-full py-3 bg-[#1A1A1A] rounded-lg">Back</button>
                </DialogContent>
            </Dialog>
        )
    }

    // ---- Main View ----
    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-md p-0 overflow-hidden bg-[#0A0A0A] rounded-3xl border border-[#C5A059]/30 shadow-2xl text-[#F5F5F0]">
                {/* Fixed: Added Title/Desc for accessibility even in Main View (hidden if needed, but DialogHeader handles it) */}
                <DialogHeader className="sr-only">
                    <DialogTitle>My Wallet</DialogTitle>
                    <DialogDescription>Manage your assets and cooperative share.</DialogDescription>
                </DialogHeader>

                {/* Tabs */}
                <div className="flex border-b border-[#C5A059]/20">
                    <button onClick={() => setActiveTab('personal')} className={`flex-1 py-4 text-sm font-bold ${activeTab === 'personal' ? 'text-[#C5A059] border-b-2 border-[#C5A059]' : 'text-[#B8B8B8]'}`}>MY WALLET</button>
                    <button onClick={() => setActiveTab('community')} className={`flex-1 py-4 text-sm font-bold ${activeTab === 'community' ? 'text-[#C5A059] border-b-2 border-[#C5A059]' : 'text-[#B8B8B8]'}`}>
                        COOP GUARDIAN 🛡️
                    </button>
                    <button onClick={() => setActiveTab('pro')} className={`flex-1 py-4 text-sm font-bold ${activeTab === 'pro' ? 'text-[#C5A059] border-b-2 border-[#C5A059]' : 'text-[#B8B8B8]'}`}>
                        PRO 🏆
                    </button>
                </div>

                {activeTab === 'pro' ? (
                    <div className="p-8 bg-[#111111] h-[550px] flex flex-col items-center text-center">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#C5A059] to-[#8B7355] flex items-center justify-center mb-6 shadow-2xl animate-pulse">
                            <span className="text-4xl">🏆</span>
                        </div>
                        <h2 className="text-2xl font-bold text-[#F5F5F0] mb-2">Become a Verified Pro</h2>
                        <p className="text-[#B8B8B8] text-sm mb-8 px-4">
                            Join the elite circle of professional breeders. Unlock exclusive benefits and build trust instantly.
                        </p>

                        <div className="w-full bg-[#1A1A1A] rounded-xl p-6 border border-[#C5A059]/30 mb-8 max-w-xs">
                            <ul className="text-left space-y-3">
                                <li className="flex items-center gap-3 text-sm text-[#F5F5F0]">
                                    <span className="text-[#C5A059]">✓</span> Verified Badge on all pets
                                </li>
                                <li className="flex items-center gap-3 text-sm text-[#F5F5F0]">
                                    <span className="text-[#C5A059]">✓</span> +50 Trust Reputation
                                </li>
                                <li className="flex items-center gap-3 text-sm text-[#F5F5F0]">
                                    <span className="text-[#C5A059]">✓</span> Priority Support
                                </li>
                                <li className="flex items-center gap-3 text-sm text-[#F5F5F0]">
                                    <span className="text-[#C5A059]">✓</span> Unlimited Breeding Matches
                                </li>
                            </ul>
                        </div>

                        <div className="mt-auto w-full max-w-xs">
                            <p className="text-[#C5A059] font-bold text-xl mb-4">{PRO_STATUS_COST} TRD</p>
                            {isVerified ? (
                                <div className="w-full py-3 bg-[#1A1A1A] text-[#C5A059] font-bold rounded-xl border border-[#C5A059]/30 flex items-center justify-center gap-2">
                                    <span>✓ You are already Pro!</span>
                                </div>
                            ) : (
                                <button
                                    onClick={handleUpgrade}
                                    disabled={upgrading || balance < PRO_STATUS_COST}
                                    className={`w-full py-3 font-bold rounded-xl transition-all ${balance < PRO_STATUS_COST
                                        ? 'bg-[#1A1A1A] text-[#B8B8B8] cursor-not-allowed'
                                        : 'bg-[#C5A059] text-black hover:bg-[#D4C4B5] hover:shadow-[0_0_20px_rgba(197,160,89,0.3)]'
                                        }`}
                                >
                                    {upgrading ? 'Processing...' : (balance < PRO_STATUS_COST ? 'Insufficient Funds' : 'Upgrade Now')}
                                </button>
                            )}
                        </div>
                    </div>
                ) : activeTab === 'personal' ? (
                    <div className="p-8 bg-gradient-to-br from-[#1A1A1A] to-[#0D0D0D]">
                        <div className="text-center mb-8">
                            <h1 className="text-5xl font-['Playfair_Display'] font-bold text-white">{balance.toLocaleString()}</h1>
                            <span className="text-[#C5A059] font-bold">TRD</span>
                        </div>
                        <div className="flex justify-center gap-6 mb-8">
                            <button onClick={() => setView('send')} className="flex flex-col items-center gap-2 group">
                                <div className="w-12 h-12 rounded-full bg-[#1A1A1A] border border-[#C5A059]/30 flex items-center justify-center group-hover:bg-[#C5A059] group-hover:text-black transition-all">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
                                </div>
                                <span className="text-xs text-[#B8B8B8]">Send</span>
                            </button>
                            <button onClick={handleClaimReward} disabled={!isClaimable() || claiming} className="flex flex-col items-center gap-2">
                                <div className={`w-14 h-14 rounded-full flex items-center justify-center border border-[#C5A059] ${isClaimable() ? 'bg-[#C5A059] text-black' : 'bg-[#1A1A1A] text-[#C5A059]'}`}>
                                    <span className="text-2xl">🎁</span>
                                </div>
                                <span className="text-xs text-[#C5A059] font-bold">{isClaimable() ? 'Claim' : 'Wait'}</span>
                            </button>
                            <button onClick={() => setView('receive')} className="flex flex-col items-center gap-2 group">
                                <div className="w-12 h-12 rounded-full bg-[#1A1A1A] border border-[#C5A059]/30 flex items-center justify-center group-hover:bg-[#C5A059] group-hover:text-black transition-all">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                                </div>
                                <span className="text-xs text-[#B8B8B8]">Receive</span>
                            </button>
                        </div>
                        <div className="bg-[#111111] p-4 rounded-xl h-[200px] overflow-y-auto">
                            <h3 className="text-xs font-bold text-[#B8B8B8] mb-3">Recent Activity</h3>
                            {transactions.map(tx => (
                                <div key={tx.id} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                                    <div>
                                        <p className="text-sm text-white">{tx.description}</p>
                                        <p className={`text-[10px] ${tx.status === 'pending' ? 'text-yellow-500' : 'text-[#B8B8B8]/50'}`}>
                                            {tx.status === 'pending' ? '⏳ Pending Verification' : 'Completed'}
                                        </p>
                                    </div>
                                    <span className={`font-mono text-sm ${tx.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {tx.amount > 0 ? '+' : ''}{tx.amount}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="p-6 bg-[#111111] h-[550px] overflow-y-auto">
                        <div className="mb-6 bg-[#1A1A1A] p-4 rounded-xl border border-[#C5A059]/20">
                            <h3 className="text-[#C5A059] font-bold text-lg mb-1">Guardian Console 🛡️</h3>
                            <p className="text-xs text-[#B8B8B8]">Help secure the cooperative. Verify pending transactions and earn TRD.</p>
                        </div>

                        <h4 className="text-white text-sm font-bold mb-3">Pending Verifications ({pendingTxs.length})</h4>

                        {pendingTxs.length === 0 && (
                            <p className="text-center text-[#B8B8B8]/30 text-xs py-8">All clear! No pending transactions.</p>
                        )}

                        <div className="space-y-3">
                            {pendingTxs.map((tx: any) => (
                                <div key={tx.id} className="p-3 bg-[#0A0A0A] rounded-lg border border-white/10 flex justify-between items-center">
                                    <div>
                                        <p className="text-xs text-[#C5A059] font-bold">Transfer {tx.amount} TRD</p>
                                        <p className="text-[10px] text-[#B8B8B8]">To: {tx.profiles?.email || 'Unknown'}</p>
                                        <p className="text-[10px] text-[#B8B8B8]">Date: {new Date(tx.created_at).toLocaleDateString()}</p>
                                    </div>
                                    {tx.user_id !== user?.id ? (
                                        <button
                                            onClick={() => handleVerifyTx(tx.id)}
                                            className="px-3 py-1 bg-[#C5A059]/20 text-[#C5A059] text-xs font-bold rounded hover:bg-[#C5A059] hover:text-black transition-colors"
                                        >
                                            Verify (+1 TRD)
                                        </button>
                                    ) : (
                                        <span className="text-[10px] text-yellow-500">Waiting for Guardian</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="py-2 text-center bg-[#0A0A0A] border-t border-[#C5A059]/10">
                    <p className="text-[9px] text-[#B8B8B8]/30 font-serif tracking-widest uppercase">Powered by Boonping & Eibpo</p>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default WalletModal;
