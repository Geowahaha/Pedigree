import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAncestors, AncestorNode, updatePet } from '@/lib/database';
import { Loader2, Save, AlertTriangle, CheckCircle2 } from "lucide-react";

interface BloodlineInspectorProps {
    childId: string;
    childName: string;
    childBirthDate: string | null;
    sireId?: string;
    damId?: string;
}

export const BloodlineInspector: React.FC<BloodlineInspectorProps> = ({ childId, childName, childBirthDate, sireId, damId }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [ancestors, setAncestors] = useState<AncestorNode[]>([]);
    const [loading, setLoading] = useState(false);
    const [editingDates, setEditingDates] = useState<Record<string, string>>({});
    const [savingId, setSavingId] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            loadAncestors();
        }
    }, [isOpen, childId, sireId, damId]);

    const loadAncestors = async () => {
        setLoading(true);
        try {
            // Updated call signature
            const data = await getAncestors({ petId: childId, sireId, damId });

            // Add Self (Child) to the list
            const rootNode: AncestorNode = {
                id: childId,
                name: childName,
                role: 'SELF',
                generation: 0,
                birth_date: childBirthDate
            };

            const allNodes = [rootNode, ...data];
            setAncestors(allNodes);

            // Initialize editing state
            const initialDates: Record<string, string> = {};
            allNodes.forEach(a => {
                if (a.birth_date) {
                    initialDates[a.id] = new Date(a.birth_date).toISOString().split('T')[0];
                }
            });
            setEditingDates(initialDates);
        } catch (error) {
            console.error("Failed to load ancestors", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDateChange = (id: string, value: string) => {
        setEditingDates(prev => ({ ...prev, [id]: value }));
    };

    const handleSaveDate = async (ancestor: AncestorNode) => {
        const newDate = editingDates[ancestor.id];
        if (!newDate) return;

        setSavingId(ancestor.id);
        try {
            // We only update the birth_date to minimize side effects
            await updatePet(ancestor.id, { birth_date: newDate });
            // Update local state to show 'saved' or refresh
            setAncestors(prev => prev.map(a => a.id === ancestor.id ? { ...a, birth_date: newDate } : a));
        } catch (error: any) {
            alert(`Failed to update ${ancestor.name}: ${error.message}`);
        } finally {
            setSavingId(null);
        }
    };

    // Helper to check if date is invalid relative to child (only for ancestors)
    const isConflictWithChild = (dateStr: string, role: string) => {
        if (role === 'SELF') return false; // Self doesn't conflict with self in this view
        if (!childBirthDate || !dateStr) return false;
        // If checking ancestor, dateStr (ancestor birth) should be BEFORE childBirthDate
        return new Date(dateStr) >= new Date(childBirthDate);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-full mt-1 text-amber-500 border-amber-500/50 hover:bg-amber-500/10 h-8 text-xs">
                    <AlertTriangle className="w-3 h-3 mr-1.5" />
                    Inspect Lineage Dates
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col bg-[#0A0A0A] border-[#C5A059]/20 text-[#F5F5F0]">
                <DialogHeader>
                    <DialogTitle className="text-[#C5A059] flex items-center gap-2">
                        <span className="text-xl">🧬</span>
                        Ancestors of {childName}
                    </DialogTitle>
                    <div className="text-sm text-[#B8B8B8]">
                        Child Birth Date: <span className="font-mono text-white">{childBirthDate || 'Not Set'}</span>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-1 space-y-3 pr-2">
                    {loading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="w-8 h-8 animate-spin text-[#C5A059]" />
                        </div>
                    ) : ancestors.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 text-sm">
                            <p>No ancestors found based on current parent selection.</p>
                            <p className="mt-2 text-xs opacity-60">Parents: {sireId ? 'Sire Selected' : 'No Sire'}, {damId ? 'Dam Selected' : 'No Dam'}</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {ancestors.map((ancestor) => {
                                const currentDate = editingDates[ancestor.id] || '';
                                const isConflict = isConflictWithChild(currentDate, ancestor.role);

                                return (
                                    <div key={ancestor.id} className={`flex items-center gap-3 p-2.5 rounded-lg border ${ancestor.role === 'SELF' ? 'bg-[#C5A059]/10 border-[#C5A059]/30' : 'bg-[#1A1A1A] border-[#333]'}`}>
                                        <div className="w-10 text-center shrink-0">
                                            <div className="text-[10px] text-gray-500 uppercase font-bold">Gen</div>
                                            <div className={`text-base font-bold ${ancestor.role === 'SELF' ? 'text-white' : 'text-[#C5A059]'}`}>{ancestor.generation}</div>
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${ancestor.role === 'Sire' ? 'bg-blue-900/30 text-blue-400' :
                                                        ancestor.role === 'Dam' ? 'bg-pink-900/30 text-pink-400' :
                                                            ancestor.role === 'SELF' ? 'bg-[#C5A059] text-black' :
                                                                'bg-gray-800 text-gray-400'
                                                    }`}>
                                                    {ancestor.role}
                                                </span>
                                                <h4 className="font-bold truncate text-white text-sm">{ancestor.name}</h4>
                                            </div>
                                            <div className="text-[10px] text-gray-500 font-mono mt-0.5 opacity-60 truncate">
                                                ID: {ancestor.id}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                            <div className="relative">
                                                <Input
                                                    type="date"
                                                    value={currentDate}
                                                    onChange={(e) => handleDateChange(ancestor.id, e.target.value)}
                                                    className={`w-32 h-8 text-xs bg-[#0D0D0D] border ${isConflict ? 'border-red-500 text-red-500' :
                                                            ancestor.role === 'SELF' ? 'border-[#C5A059]/50 text-white' :
                                                                'border-[#333] text-gray-300'
                                                        }`}
                                                />
                                                {isConflict && (
                                                    <div className="absolute -top-5 right-0 text-[10px] text-red-500 font-bold bg-black/90 px-1.5 py-0.5 rounded border border-red-900/50 z-10 whitespace-nowrap">
                                                        ⚠ Newer than Child
                                                    </div>
                                                )}
                                            </div>

                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                onClick={() => handleSaveDate(ancestor)}
                                                disabled={savingId === ancestor.id}
                                                className={`h-8 w-8 p-0 bg-[#C5A059] text-black hover:bg-[#D4C4B5] ${savingId === ancestor.id ? 'opacity-80' : ''}`}
                                            >
                                                {savingId === ancestor.id ? (
                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                ) : (
                                                    <Save className="w-3 h-3" />
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};
