import React, { useState } from 'react';
import { airtableClient } from '@/lib/airtable';
import { buildPedigreeTree, convertAirtableToPet } from '@/lib/pedigreeResolver';
import { registerNewPet } from '@/lib/registrationService';

const AirtableTestPage: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const handleTest = async (testType: string) => {
        setLoading(true);
        setError(null);
        setResults(null);

        try {
            switch (testType) {
                case 'search':
                    const searchResults = await airtableClient.searchPets('Apollo', 5);
                    setResults({
                        type: 'Search Results',
                        data: searchResults.map(convertAirtableToPet),
                    });
                    break;

                case 'random':
                    const randomPets = await airtableClient.getRandomPets(6);
                    setResults({
                        type: 'Random Pets',
                        data: randomPets.map(convertAirtableToPet),
                    });
                    break;

                case 'tree':
                    // Get first pet and build its tree
                    const firstPets = await airtableClient.getRandomPets(1);
                    if (firstPets.length > 0) {
                        const tree = await buildPedigreeTree(firstPets[0].id);
                        setResults({
                            type: 'Family Tree',
                            data: tree,
                        });
                    }
                    break;

                case 'register':
                    const newPet = await registerNewPet({
                        name: `TestPet_${Date.now()}`,
                        breed: 'Golden Retriever',
                        gender: 'Female',
                        birthday: '2024-01-01',
                        weight: 25,
                        type: 'Dog',
                        notes: 'Test registration from Petdegree app',
                    });
                    setResults({
                        type: 'New Pet Registered',
                        data: newPet,
                    });
                    break;

                default:
                    break;
            }
        } catch (err: any) {
            setError(err.message || 'An error occurred');
            console.error('Test error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#F5F1E8] to-[#E8F1E8] p-8">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-4xl font-bold text-foreground mb-8">
                    🧪 Airtable Integration Test
                </h1>

                {/* Test Buttons */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <button
                        onClick={() => handleTest('search')}
                        disabled={loading}
                        className="px-6 py-4 bg-primary text-white rounded-xl hover:bg-primary/90 transition-all disabled:opacity-50 font-semibold shadow-lg"
                    >
                        🔍 Search Test
                    </button>

                    <button
                        onClick={() => handleTest('random')}
                        disabled={loading}
                        className="px-6 py-4 bg-secondary text-white rounded-xl hover:bg-secondary/90 transition-all disabled:opacity-50 font-semibold shadow-lg"
                    >
                        🎲 Random Test
                    </button>

                    <button
                        onClick={() => handleTest('tree')}
                        disabled={loading}
                        className="px-6 py-4 bg-accent text-white rounded-xl hover:bg-accent/90 transition-all disabled:opacity-50 font-semibold shadow-lg"
                    >
                        🌳 Tree Test
                    </button>

                    <button
                        onClick={() => handleTest('register')}
                        disabled={loading}
                        className="px-6 py-4 bg-foreground text-background rounded-xl hover:bg-foreground/90 transition-all disabled:opacity-50 font-semibold shadow-lg"
                    >
                        📝 Register Test
                    </button>
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
                        <p className="mt-4 text-foreground/60">Testing...</p>
                    </div>
                )}

                {/* Error State */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                        <h3 className="text-red-800 font-bold mb-2">❌ Error</h3>
                        <p className="text-red-600">{error}</p>
                    </div>
                )}

                {/* Results */}
                {results && (
                    <div className="bg-white rounded-xl shadow-xl p-6">
                        <h2 className="text-2xl font-bold text-foreground mb-4">
                            {results.type}
                        </h2>

                        <pre className="bg-gray-50 p-4 rounded-lg overflow-auto max-h-96 text-sm">
                            {JSON.stringify(results.data, null, 2)}
                        </pre>

                        {/* Display Images if available */}
                        {Array.isArray(results.data) && (
                            <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {results.data.map((pet: any, index: number) => (
                                    <div key={index} className="border rounded-lg p-3 bg-gray-50">
                                        {pet.image && (
                                            <img
                                                src={pet.image}
                                                alt={pet.name}
                                                className="w-full h-32 object-cover rounded-lg mb-2"
                                            />
                                        )}
                                        <h4 className="font-semibold text-sm">{pet.name}</h4>
                                        <p className="text-xs text-foreground/60">{pet.breed}</p>
                                        {pet.registrationNumber && (
                                            <p className="text-xs text-primary mt-1 font-mono">
                                                {pet.registrationNumber}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Instructions */}
                <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
                    <h3 className="text-blue-800 font-bold mb-2">💡 Instructions</h3>
                    <ul className="text-blue-700 space-y-2 text-sm">
                        <li>🔍 <strong>Search Test</strong>: Search for "Apollo" in Airtable</li>
                        <li>🎲 <strong>Random Test</strong>: Get 6 random pets</li>
                        <li>🌳 <strong>Tree Test</strong>: Build family tree for a random pet</li>
                        <li>📝 <strong>Register Test</strong>: Create a new test pet record</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default AirtableTestPage;
