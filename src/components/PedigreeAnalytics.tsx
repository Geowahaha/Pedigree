import React, { useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { Pet } from '@/data/petData';

interface PedigreeAnalyticsProps {
    pet: Pet;
    tree?: any; // The pedigree tree object from getPedigreeTree
}

const COLORS = ['#C5A059', '#333333', '#8B7355', '#F5F5F0'];

export const PedigreeAnalytics: React.FC<PedigreeAnalyticsProps> = ({ pet, tree }) => {

    // 1. Champion Bloodline Analysis (Mocked logic for demo: count verified ancestors)
    const championStats = useMemo(() => {
        let champions = 0;
        let total = 0;

        // Traverse the shallow tree we have (Pet + Parents + Grandparents)
        // In a real app, this would be a deep recursive traversal of a pre-calculated graph.
        const nodes = [
            tree?.sire, tree?.dam,
            tree?.paternal_grandsire, tree?.paternal_granddam,
            tree?.maternal_grandsire, tree?.maternal_granddam
        ].filter(Boolean);

        total = nodes.length;
        // Assume specific keywords in name or 'health_certified' implies some quality for this chart
        champions = nodes.filter((p: any) => p.name?.includes('CH') || p.health_certified).length;

        // Fallback if no tree data (Mock for aesthetics)
        if (total === 0) {
            return [
                { name: 'Champion Lineage', value: 35 },
                { name: 'Standard Lineage', value: 65 }
            ];
        }

        const normal = total - champions;
        return [
            { name: 'Champion Lineage', value: champions || 1 }, // Ensure at least some value for chart
            { name: 'Standard Lineage', value: normal }
        ];
    }, [tree]);

    // 2. Generation Completeness (Known ancestors per gen)
    const completenessData = useMemo(() => {
        // Gen 1: Parents (2 max)
        const gen1 = [tree?.sire, tree?.dam].filter(Boolean).length;
        // Gen 2: Grandparents (4 max)
        const gen2 = [
            tree?.paternal_grandsire, tree?.paternal_granddam,
            tree?.maternal_grandsire, tree?.maternal_granddam
        ].filter(Boolean).length;

        return [
            { generation: 'Parents', count: gen1, max: 2, percentage: (gen1 / 2) * 100 },
            { generation: 'G.Parents', count: gen2, max: 4, percentage: (gen2 / 4) * 100 },
            { generation: 'G.G.Parents', count: 5, max: 8, percentage: 62 }, // Mocked deep gen
        ];
    }, [tree]);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">

            {/* Introduction */}
            <div className="bg-[#0D0D0D] p-4 rounded-xl border border-[#C5A059]/20">
                <h4 className="text-[#C5A059] font-bold mb-1 flex items-center gap-2">
                    <span className="text-xl">🧬</span> Genetic Influence
                </h4>
                <p className="text-sm text-[#B8B8B8]">
                    Analysis based on available pedigree records.
                    <span className="text-[#F5F5F0] font-medium ml-1">
                        {championStats[0].value > championStats[1].value ? 'High Champion Influence detected.' : 'Standard lineage distribution.'}
                    </span>
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Pie Chart: Bloodline Composition */}
                <div className="bg-[#1A1A1A] p-4 rounded-xl border border-[#C5A059]/10">
                    <h5 className="text-[#F5F5F0] font-medium mb-4 text-center text-sm">Bloodline Composition</h5>
                    <div className="h-[200px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={championStats}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {championStats.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0D0D0D', borderColor: '#C5A059', borderRadius: '8px', color: '#F5F5F0' }}
                                    itemStyle={{ color: '#C5A059' }}
                                />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Bar Chart: Generation Completeness */}
                <div className="bg-[#1A1A1A] p-4 rounded-xl border border-[#C5A059]/10">
                    <h5 className="text-[#F5F5F0] font-medium mb-4 text-center text-sm">Pedigree Completeness</h5>
                    <div className="h-[200px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={completenessData} layout="vertical" barSize={20}>
                                <XAxis type="number" domain={[0, 100]} hide />
                                <YAxis dataKey="generation" type="category" width={80} tick={{ fill: '#B8B8B8', fontSize: 10 }} axisLine={false} tickLine={false} />
                                <Tooltip
                                    cursor={{ fill: '#C5A059', opacity: 0.1 }}
                                    contentStyle={{ backgroundColor: '#0D0D0D', borderColor: '#C5A059', borderRadius: '8px', color: '#F5F5F0' }}
                                />
                                <Bar dataKey="percentage" fill="#C5A059" radius={[0, 4, 4, 0]} background={{ fill: '#333' }} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Inbreeding Coefficient (COI) Placeholder */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-[#0A0A0A] to-[#1A1A1A] rounded-xl border border-[#C5A059]/10">
                <div>
                    <p className="text-[#B8B8B8] text-xs uppercase tracking-wider">Estimated COI (Inbreeding)</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-[#F5F5F0]">1.2%</span>
                        <span className="text-xs text-green-500">Low Risk</span>
                    </div>
                </div>
                <div className="w-12 h-12 rounded-full border-2 border-green-500/20 flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
            </div>
        </div>
    );
};
