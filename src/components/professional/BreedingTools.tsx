import React, { useEffect, useState, useRef } from 'react';
import {
    HeatCycle, Litter,
    getHeatCycles, addHeatCycle,
    getLitters, addLitter
} from '@/lib/professional_features';

interface BreedingToolsProps {
    petId: string;
    petGender: 'male' | 'female';
}

export const BreedingTools: React.FC<BreedingToolsProps> = ({ petId, petGender }) => {
    const [activeTab, setActiveTab] = useState<'heat' | 'litters'>('heat');
    const [cycles, setCycles] = useState<HeatCycle[]>([]);
    const [litters, setLitters] = useState<Litter[]>([]);
    const [loading, setLoading] = useState(true);

    // Form States
    const [showAddForm, setShowAddForm] = useState(false);

    // Heat Form
    const [startDate, setStartDate] = useState('');
    const [notes, setNotes] = useState('');

    // Litter Form
    const [litterDate, setLitterDate] = useState('');
    const [puppyCount, setPuppyCount] = useState(0);

    useEffect(() => {
        loadData();
    }, [petId]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (petGender === 'female') {
                const c = await getHeatCycles(petId);
                setCycles(c);
            }
            // Litters can be relevant for both (sire/dam), strictly mostly dam owner manages usually, 
            // but simplistic for now: fetch litters where this pet is parent.
            // NOTE: getLitters is currently by Breeder ID in our API. 
            // We might need to adjust API or just show "My Breeding Program" general tools.
            // For specific pet scope, let's stick to Heat Cycles for now for females.
        } catch (e) { console.error(e) }
        setLoading(false);
    };

    const handleAddHeat = async () => {
        if (!startDate) return;
        try {
            await addHeatCycle({
                pet_id: petId,
                start_date: startDate,
                notes: notes
            });
            setShowAddForm(false);
            setStartDate('');
            setNotes('');
            loadData();
        } catch (e) { alert('Failed to save'); }
    };

    if (petGender !== 'female') return null; // Heat cycles only for females for now

    return (
        <div className="mt-6 pt-6 border-t border-[#8B9D83]/10">
            <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-[#2C2C2C] flex items-center gap-2">
                    <svg className="w-5 h-5 text-[#C97064]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    Breeding Tracker
                </h4>
                <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="text-xs bg-[#C97064] text-white px-3 py-1.5 rounded-lg hover:bg-[#B56356] transition-colors"
                >
                    {showAddForm ? 'Cancel' : '+ Log Heat'}
                </button>
            </div>

            {showAddForm && (
                <div className="bg-[#F5F1E8] p-4 rounded-xl mb-4 animate-fadeIn">
                    <label className="block text-xs font-bold text-[#2C2C2C]/60 mb-1">Start Date</label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        className="w-full mb-3 p-2 rounded-lg border border-[#8B9D83]/20 text-sm"
                    />
                    <label className="block text-xs font-bold text-[#2C2C2C]/60 mb-1">Notes</label>
                    <textarea
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        className="w-full mb-3 p-2 rounded-lg border border-[#8B9D83]/20 text-sm"
                        placeholder="Behavior, symptoms..."
                    />
                    <button
                        onClick={handleAddHeat}
                        className="w-full py-2 bg-[#2C2C2C] text-white rounded-lg text-sm font-semibold"
                    >
                        Save Record
                    </button>
                </div>
            )}

            {cycles.length === 0 ? (
                <p className="text-sm text-[#2C2C2C]/40 italic">No heat cycles recorded.</p>
            ) : (
                <div className="space-y-2">
                    {cycles.map(cycle => (
                        <div key={cycle.id} className="flex items-center justify-between p-3 rounded-xl bg-white border border-[#8B9D83]/10">
                            <div>
                                <p className="font-medium text-[#2C2C2C] text-sm">
                                    {new Date(cycle.start_date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                                </p>
                                {cycle.notes && <p className="text-xs text-[#2C2C2C]/50">{cycle.notes}</p>}
                            </div>
                            <span className="text-xs bg-[#C97064]/10 text-[#C97064] px-2 py-1 rounded">
                                Heat
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
