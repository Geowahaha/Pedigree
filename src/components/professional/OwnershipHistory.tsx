import React, { useEffect, useState } from 'react';
import { OwnershipRecord, getOwnershipHistory } from '@/lib/professional_features';

export const OwnershipHistory: React.FC<{ petId: string }> = ({ petId }) => {
    const [history, setHistory] = useState<OwnershipRecord[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getOwnershipHistory(petId)
            .then(setHistory)
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [petId]);

    if (!loading && history.length === 0) return null;

    return (
        <div className="mt-6 pt-6 border-t border-[#8B9D83]/10">
            <h4 className="font-semibold text-[#2C2C2C] mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-[#8B9D83]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Ownership History
            </h4>

            {loading ? (
                <div className="animate-pulse flex space-x-4">
                    <div className="h-10 bg-gray-200 rounded w-full"></div>
                </div>
            ) : (
                <div className="relative border-l-2 border-[#8B9D83]/20 ml-3 space-y-6 pl-6">
                    {history.map((record, i) => (
                        <div key={record.id} className="relative">
                            {/* Dot */}
                            <div className="absolute -left-[31px] top-1.5 w-3 h-3 rounded-full bg-[#8B9D83] ring-4 ring-white" />

                            <div className="bg-[#F5F1E8]/50 p-3 rounded-xl">
                                <p className="text-sm font-medium text-[#2C2C2C]">
                                    Transferred to <span className="text-[#C97064] font-bold">{record.new_owner?.full_name || 'Unknown'}</span>
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs text-[#2C2C2C]/50">
                                        {new Date(record.transfer_date).toLocaleDateString()}
                                    </span>
                                    {record.transfer_method && (
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#8B9D83]/10 text-[#6B7D63]">
                                            {record.transfer_method}
                                        </span>
                                    )}
                                </div>
                                {record.previous_owner?.full_name && (
                                    <p className="text-xs text-[#2C2C2C]/40 mt-1">
                                        From: {record.previous_owner.full_name}
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
