import React, { useRef, useState } from 'react';
import { Pet } from '@/data/petData';
import { useAuth } from '@/contexts/AuthContext';
import { createOwnershipClaim } from '@/lib/ownership';
import { uploadOwnershipEvidence } from '@/lib/storage';

const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'pdf'];

interface ClaimOwnershipModalProps {
    isOpen: boolean;
    pet: Pet;
    onClose: () => void;
    onSubmitted?: () => void;
}

export const ClaimOwnershipModal: React.FC<ClaimOwnershipModalProps> = ({
    isOpen,
    pet,
    onClose,
    onSubmitted,
}) => {
    const { user, loading } = useAuth();
    const [claimType, setClaimType] = useState<'original_owner' | 'new_owner' | 'breeder'>('original_owner');
    const [evidence, setEvidence] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const resetForm = () => {
        setClaimType('original_owner');
        setEvidence('');
        setFiles([]);
        setError(null);
        setSubmitting(false);
        setSubmitted(false);
    };

    const handleClose = () => {
        if (submitting) return;
        resetForm();
        onClose();
    };

    const validateFile = (file: File) => {
        const extension = file.name.split('.').pop()?.toLowerCase() || '';
        if (!ALLOWED_EXTENSIONS.includes(extension)) {
            return `Unsupported file type: ${file.name}`;
        }
        if (file.size > MAX_FILE_SIZE) {
            return `File too large (max 10 MB): ${file.name}`;
        }
        return null;
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const nextFiles = Array.from(e.target.files || []);
        if (nextFiles.length === 0) return;

        const totalFiles = files.length + nextFiles.length;
        if (totalFiles > MAX_FILES) {
            setError(`You can upload up to ${MAX_FILES} files.`);
            return;
        }

        const nextErrors = nextFiles.map(validateFile).filter(Boolean);
        if (nextErrors.length > 0) {
            setError(nextErrors[0] || 'Invalid file selected.');
            return;
        }

        setFiles(prev => [...prev, ...nextFiles]);
        setError(null);
    };

    const handleRemoveFile = (index: number) => {
        setFiles(prev => prev.filter((_, idx) => idx !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user || loading) {
            setError('Please sign in to submit a claim.');
            return;
        }

        if (!evidence.trim() && files.length === 0) {
            setError('Please provide evidence text or upload a file.');
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            const uploadedPaths: string[] = [];
            for (const file of files) {
                const path = await uploadOwnershipEvidence(file);
                uploadedPaths.push(path);
            }

            await createOwnershipClaim({
                pet_id: pet.id,
                claim_type: claimType,
                evidence: evidence.trim(),
                evidence_files: uploadedPaths
            });

            setSubmitted(true);
            if (onSubmitted) onSubmitted();
        } catch (err: any) {
            setError(err?.message || 'Failed to submit claim.');
        } finally {
            setSubmitting(false);
        }
    };

    if (!user && !loading) {
        return (
            <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
                <div className="absolute inset-0 bg-black/60" onClick={handleClose} />
                <div className="relative bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Sign in required</h3>
                    <p className="text-sm text-gray-600 mb-6">
                        Please sign in to submit an ownership claim.
                    </p>
                    <button
                        onClick={handleClose}
                        className="w-full px-4 py-2.5 rounded-lg bg-gray-900 text-white font-medium hover:bg-gray-800"
                    >
                        Close
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
            <div className="absolute inset-0 bg-black/60" onClick={handleClose} />
            <div className="relative bg-white rounded-2xl w-full max-w-lg max-h-[90vh] shadow-2xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
                    <div>
                        <h3 className="text-xl font-semibold text-gray-900">Claim ownership</h3>
                        <p className="text-xs text-gray-500 mt-1">{pet.name} - {pet.breed}</p>
                    </div>
                    <button
                        onClick={handleClose}
                        className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center flex-shrink-0"
                        aria-label="Close"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="overflow-y-auto flex-1">
                    {submitted ? (
                        <div className="px-6 py-6">
                            <div className="rounded-xl bg-green-50 border border-green-100 px-4 py-3 text-sm text-green-800">
                                Your claim has been submitted. An admin will review it soon.
                            </div>
                            <button
                                onClick={handleClose}
                                className="mt-6 w-full px-4 py-2.5 rounded-lg bg-gray-900 text-white font-medium hover:bg-gray-800"
                            >
                                Close
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-4">
                            {error && (
                                <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-sm text-red-700">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-gray-700 uppercase">Claim type</label>
                                <select
                                    value={claimType}
                                    onChange={(e) => setClaimType(e.target.value as 'original_owner' | 'new_owner' | 'breeder')}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-gray-900 outline-none"
                                >
                                    <option value="original_owner">Original owner</option>
                                    <option value="new_owner">New owner (bought)</option>
                                    <option value="breeder">Breeder</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-gray-700 uppercase">Evidence</label>
                                <textarea
                                    value={evidence}
                                    onChange={(e) => setEvidence(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:border-gray-900 outline-none resize-none"
                                    rows={4}
                                    placeholder="Describe your proof or background."
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-semibold text-gray-700 uppercase">Files</label>
                                    <span className="text-[11px] text-gray-500">
                                        JPG, PNG, PDF - Max 10 MB - {files.length}/{MAX_FILES}
                                    </span>
                                </div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    className="hidden"
                                    multiple
                                    accept=".jpg,.jpeg,.png,.pdf"
                                    onChange={handleFileChange}
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full px-3 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-gray-400"
                                >
                                    Add files
                                </button>

                                {files.length > 0 && (
                                    <div className="space-y-2">
                                        {files.map((file, index) => (
                                            <div key={`${file.name}-${index}`} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 text-sm text-gray-700">
                                                <span className="truncate">{file.name}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveFile(index)}
                                                    className="text-xs text-gray-500 hover:text-gray-700 ml-2 flex-shrink-0"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    className="flex-1 px-4 py-2.5 rounded-lg bg-gray-100 text-gray-700 font-medium hover:bg-gray-200"
                                    disabled={submitting}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2.5 rounded-lg bg-gray-900 text-white font-medium hover:bg-gray-800 disabled:opacity-60"
                                    disabled={submitting}
                                >
                                    {submitting ? 'Submitting...' : 'Submit claim'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};
