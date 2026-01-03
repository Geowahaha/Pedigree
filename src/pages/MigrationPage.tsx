import React, { useState } from 'react';
import { migrateFromAirtableToSupabase, verifyMigration } from '@/lib/migration';

const MigrationPage: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [step, setStep] = useState<'ready' | 'migrating' | 'complete'>('ready');

    const handleMigration = async () => {
        setLoading(true);
        setError(null);
        setStep('migrating');

        try {
            const migrationResult = await migrateFromAirtableToSupabase();
            setResult(migrationResult);
            setStep('complete');
        } catch (err: any) {
            setError(err.message);
            setStep('ready');
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async () => {
        setLoading(true);
        try {
            await verifyMigration();
            alert('Verification complete! Check console for details.');
        } catch (err: any) {
            alert(`Verification failed: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-8">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-5xl font-extrabold text-foreground mb-4">
                        🚀 Database Migration
                    </h1>
                    <p className="text-xl text-foreground/70">
                        Airtable → Supabase
                    </p>
                    <p className="text-sm text-foreground/50 mt-2">
                        One-time migration to move all pet data to Supabase
                    </p>
                </div>

                {/* Status Card */}
                <div className="bg-white rounded-2xl shadow-2xl p-8 mb-6">
                    {step === 'ready' && (
                        <div className="text-center">
                            <div className="mb-6">
                                <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-primary to-secondary rounded-full mb-4">
                                    <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                </div>
                            </div>

                            <h2 className="text-2xl font-bold text-foreground mb-4">
                                Ready to Migrate
                            </h2>

                            <p className="text-foreground/60 mb-8 max-w-2xl mx-auto">
                                This will import all pets from your Airtable "My Pet Bot" database
                                into Supabase. The process includes:
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 text-left">
                                <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg">
                                    <span className="text-2xl">✓</span>
                                    <div>
                                        <h3 className="font-semibold text-green-800">Import Pets</h3>
                                        <p className="text-sm text-green-600">All pet information</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
                                    <span className="text-2xl">🔗</span>
                                    <div>
                                        <h3 className="font-semibold text-blue-800">Link Parents</h3>
                                        <p className="text-sm text-blue-600">Pedigree relationships</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg">
                                    <span className="text-2xl">🖼️</span>
                                    <div>
                                        <h3 className="font-semibold text-purple-800">Images</h3>
                                        <p className="text-sm text-purple-600">Photo URLs preserved</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 p-4 bg-orange-50 rounded-lg">
                                    <span className="text-2xl">🔐</span>
                                    <div>
                                        <h3 className="font-semibold text-orange-800">Secure</h3>
                                        <p className="text-sm text-orange-600">RLS policies active</p>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleMigration}
                                disabled={loading}
                                className="px-8 py-4 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-bold text-lg hover:shadow-lg transition-all disabled:opacity-50"
                            >
                                {loading ? 'Starting...' : '🚀 Start Migration'}
                            </button>
                        </div>
                    )}

                    {step === 'migrating' && (
                        <div className="text-center py-12">
                            <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent mb-6"></div>
                            <h2 className="text-2xl font-bold text-foreground mb-4">
                                Migration in Progress...
                            </h2>
                            <p className="text-foreground/60">
                                Please wait while we transfer your data. This may take a few minutes.
                            </p>
                            <div className="mt-8 max-w-md mx-auto">
                                <div className="flex justify-between text-sm text-foreground/50 mb-2">
                                    <span>Importing pets...</span>
                                    <span>⏳</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div className="bg-gradient-to-r from-primary to-secondary h-2 rounded-full animate-pulse" style={{ width: '100%' }}></div>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 'complete' && result && (
                        <div className="text-center">
                            <div className="mb-6">
                                <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-full mb-4">
                                    <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                            </div>

                            <h2 className="text-3xl font-bold text-green-600 mb-4">
                                Migration Complete! 🎉
                            </h2>

                            <div className="bg-green-50 rounded-xl p-6 mb-6 max-w-md mx-auto">
                                <div className="text-6xl font-bold text-green-600 mb-2">
                                    {result.imported}
                                </div>
                                <div className="text-green-700 font-semibold">
                                    Pets Migrated Successfully
                                </div>
                            </div>

                            {result.errors && result.errors.length > 0 && (
                                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 max-w-md mx-auto">
                                    <h3 className="font-semibold text-yellow-800 mb-2">
                                        ⚠️ Some issues occurred:
                                    </h3>
                                    <ul className="text-sm text-yellow-700 text-left space-y-1">
                                        {result.errors.slice(0, 5).map((err: string, i: number) => (
                                            <li key={i}>• {err}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <div className="flex gap-4 justify-center">
                                <button
                                    onClick={handleVerify}
                                    disabled={loading}
                                    className="px-6 py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition-all"
                                >
                                    🔍 Verify Data
                                </button>

                                <a
                                    href="/"
                                    className="px-6 py-3 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-semibold hover:shadow-lg transition-all inline-block"
                                >
                                    ✨ Go to App
                                </a>
                            </div>
                        </div>
                    )}
                </div>

                {/* Error Display */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                        <h3 className="text-red-800 font-bold mb-2">❌ Migration Error</h3>
                        <p className="text-red-600">{error}</p>
                    </div>
                )}

                {/* Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mt-6">
                    <h3 className="text-blue-800 font-bold mb-2">ℹ️ Important Notes</h3>
                    <ul className="text-blue-700 space-y-2 text-sm">
                        <li>• This migration can be run multiple times safely</li>
                        <li>• Existing data will be updated, not duplicated</li>
                        <li>• Original Airtable data remains unchanged</li>
                        <li>• All pedigree relationships will be preserved</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default MigrationPage;
