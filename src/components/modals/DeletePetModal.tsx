/**
 * Delete Pet Confirmation Modal
 * - Magic Cards: Simple confirmation
 * - Regular Pet Cards: Requires typing pet name to confirm (safer)
 */

import React, { useState, useEffect } from 'react';
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X, Trash2, AlertTriangle } from "lucide-react";

interface DeletePetModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    petName: string;
    isMagicCard: boolean;  // External Import cards are easier to delete
}

export const DeletePetModal: React.FC<DeletePetModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    petName,
    isMagicCard
}) => {
    const [confirmText, setConfirmText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Extract the shortest word from pet name for easier confirmation
    // e.g., "มะตูม MATOOM" → "MATOOM", "Bella Rose Champion" → "Bella"
    const getShortName = (name: string): string => {
        // Split by spaces and common separators
        const words = name.split(/[\s\-_\/]+/).filter(w => w.length > 0);
        if (words.length === 0) return name;
        if (words.length === 1) return words[0];

        // Prefer English words (ASCII only) over Thai
        const englishWords = words.filter(w => /^[A-Za-z0-9]+$/.test(w));
        if (englishWords.length > 0) {
            // Return the shortest English word (usually the nickname)
            return englishWords.reduce((a, b) => a.length <= b.length ? a : b);
        }

        // No English words - return shortest word overall
        return words.reduce((a, b) => a.length <= b.length ? a : b);
    };

    const shortName = getShortName(petName);

    // Reset on open
    useEffect(() => {
        if (isOpen) {
            setConfirmText('');
            setError(null);
            setIsDeleting(false);
        }
    }, [isOpen]);

    const canDelete = isMagicCard || confirmText.toLowerCase() === shortName.toLowerCase();

    const handleDelete = async () => {
        if (!canDelete) {
            setError(`Please type "${shortName}" to confirm deletion`);
            return;
        }

        setIsDeleting(true);
        setError(null);
        try {
            await onConfirm();
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to delete. Please try again.');
        } finally {
            setIsDeleting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
            <DialogPrimitive.Portal>
                <DialogPrimitive.Overlay className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
                <DialogPrimitive.Content
                    className="fixed z-[100] bg-[#1A1A1A] border border-red-500/30 text-[#F5F5F0] p-6 shadow-xl
                        left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md rounded-2xl
                        data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
                >
                    <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 transition-opacity text-[#B8B8B8]">
                        <X className="h-5 w-5" />
                        <span className="sr-only">Close</span>
                    </DialogPrimitive.Close>

                    {/* Warning Icon */}
                    <div className="flex flex-col items-center text-center mb-6">
                        <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
                            <AlertTriangle className="w-8 h-8 text-red-400" />
                        </div>
                        <DialogPrimitive.Title className="text-xl font-bold text-[#F5F5F0]">
                            Delete {isMagicCard ? 'Magic Card' : 'Pet'}
                        </DialogPrimitive.Title>
                        <DialogPrimitive.Description className="text-sm text-[#B8B8B8] mt-2">
                            {isMagicCard ? (
                                <>Are you sure you want to delete this Magic Card?</>
                            ) : (
                                <>
                                    This action <span className="text-red-400 font-bold">cannot be undone</span>.
                                    All data including pedigree links and history will be permanently deleted.
                                </>
                            )}
                        </DialogPrimitive.Description>
                    </div>

                    {/* Pet Name Display */}
                    <div className="bg-[#0A0A0A] border border-red-500/20 rounded-xl p-4 mb-4">
                        <p className="text-sm text-[#B8B8B8] mb-1">{isMagicCard ? 'Card Name' : 'Pet Name'}</p>
                        <p className="text-xl font-bold text-red-400">{petName}</p>
                    </div>

                    {/* Confirmation Input (only for regular pets) */}
                    {!isMagicCard && (
                        <div className="mb-4">
                            <label className="block text-sm text-[#B8B8B8] mb-2">
                                Please type <span className="text-red-400 font-bold">"{shortName}"</span> to confirm:
                            </label>
                            <input
                                type="text"
                                value={confirmText}
                                onChange={(e) => setConfirmText(e.target.value)}
                                placeholder={`Type ${shortName} here...`}
                                className="w-full px-4 py-3 rounded-xl bg-[#0A0A0A] border border-red-500/20 text-[#F5F5F0] placeholder:text-[#B8B8B8]/40 focus:border-red-500/50 focus:outline-none"
                                autoFocus
                            />
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-3 rounded-xl border border-[#C5A059]/30 text-[#B8B8B8] font-medium hover:bg-[#C5A059]/10 hover:text-[#F5F5F0] transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleDelete}
                            disabled={!canDelete || isDeleting}
                            className="flex-1 px-4 py-3 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isDeleting ? (
                                <>
                                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Deleting...
                                </>
                            ) : (
                                <>
                                    <Trash2 className="w-4 h-4" />
                                    Delete {isMagicCard ? 'Card' : 'Pet'}
                                </>
                            )}
                        </button>
                    </div>
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
};

export default DeletePetModal;
