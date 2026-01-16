import React, { useState } from 'react';
import { toast } from 'sonner';

interface FilterChip {
    id: string;
    label: string;
    filter: (pets: any[]) => any[];
}

interface SmartFilterBarProps {
    onFilterChange: (filteredPets: any[]) => void;
    allPets: any[];
}

export const SmartFilterBar: React.FC<SmartFilterBarProps> = ({ onFilterChange, allPets }) => {
    const [query, setQuery] = useState('');
    const [activeFilters, setActiveFilters] = useState<FilterChip[]>([]);

    const parseNaturalLanguage = (input: string): FilterChip[] => {
        const filters: FilterChip[] = [];
        const lower = input.toLowerCase();

        // Age detection
        const ageMatch = lower.match(/under (\d+)|younger than (\d+)|less than (\d+) years?/);
        if (ageMatch) {
            const years = parseInt(ageMatch[1] || ageMatch[2] || ageMatch[3]);
            filters.push({
                id: `age-${years}`,
                label: `Under ${years} years`,
                filter: (pets) => pets.filter(p => {
                    if (!p.birthDate) return false;
                    const age = new Date().getFullYear() - new Date(p.birthDate).getFullYear();
                    return age < years;
                })
            });
        }

        // Breed detection
        const breedMatch = lower.match(/(golden retriever|labrador|poodle|husky|chihuahua|beagle)/);
        if (breedMatch) {
            const breed = breedMatch[1];
            filters.push({
                id: `breed-${breed}`,
                label: breed.split(' ').map(w => w[0].toUpperCase() + w.slice(1)).join(' '),
                filter: (pets) => pets.filter(p => p.breed?.toLowerCase().includes(breed))
            });
        }

        // Gender
        if (lower.includes('male') && !lower.includes('female')) {
            filters.push({
                id: 'gender-male',
                label: 'Male only',
                filter: (pets) => pets.filter(p => p.gender === 'male')
            });
        } else if (lower.includes('female')) {
            filters.push({
                id: 'gender-female',
                label: 'Female only',
                filter: (pets) => pets.filter(p => p.gender === 'female')
            });
        }

        // Location (simple)
        const locationMatch = lower.match(/near (bangkok|phuket|chiang mai)/);
        if (locationMatch) {
            const location = locationMatch[1];
            filters.push({
                id: `location-${location}`,
                label: `Near ${location[0].toUpperCase() + location.slice(1)}`,
                filter: (pets) => pets.filter(p => p.location?.toLowerCase().includes(location))
            });
        }

        // Certified
        if (lower.includes('certified') || lower.includes('health')) {
            filters.push({
                id: 'certified',
                label: 'Health Certified',
                filter: (pets) => pets.filter(p => p.healthCertified)
            });
        }

        return filters;
    };

    const handleSearch = () => {
        if (!query.trim()) {
            toast.error('Please enter a search query');
            return;
        }

        const newFilters = parseNaturalLanguage(query);

        if (newFilters.length === 0) {
            toast.info('No filters detected. Try: "golden retriever under 2 years"');
            return;
        }

        setActiveFilters(prev => [...prev, ...newFilters]);
        applyFilters([...activeFilters, ...newFilters]);
        setQuery('');
        toast.success(`Applied ${newFilters.length} filter(s)`);
    };

    const applyFilters = (filters: FilterChip[]) => {
        let result = allPets;
        filters.forEach(f => {
            result = f.filter(result);
        });
        onFilterChange(result);
    };

    const removeFilter = (id: string) => {
        const updated = activeFilters.filter(f => f.id !== id);
        setActiveFilters(updated);
        applyFilters(updated);
    };

    const clearAll = () => {
        setActiveFilters([]);
        onFilterChange(allPets);
        toast.success('Filters cleared');
    };

    return (
        <div className="mb-6">
            {/* Search Input */}
            <div className="flex gap-2 mb-4">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Try: 'golden retriever under 2 years near Bangkok'"
                    className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:border-[#ea4c89] outline-none text-sm"
                />
                <button
                    onClick={handleSearch}
                    className="px-6 py-3 bg-[#ea4c89] text-white rounded-xl font-medium hover:bg-[#d9457a] transition-colors"
                >
                    🔍 Search
                </button>
            </div>

            {/* Active Filters */}
            {activeFilters.length > 0 && (
                <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-xs text-gray-500 font-medium">Active Filters:</span>
                    {activeFilters.map(filter => (
                        <button
                            key={filter.id}
                            onClick={() => removeFilter(filter.id)}
                            className="px-3 py-1.5 bg-[#ea4c89]/10 text-[#ea4c89] rounded-full text-xs font-medium flex items-center gap-1.5 hover:bg-[#ea4c89]/20 transition-colors"
                        >
                            {filter.label}
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    ))}
                    <button
                        onClick={clearAll}
                        className="text-xs text-gray-400 hover:text-gray-600 underline"
                    >
                        Clear all
                    </button>
                </div>
            )}
        </div>
    );
};
