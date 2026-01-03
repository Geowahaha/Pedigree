import React, { useState } from 'react';
import { breeds } from '@/data/petData';
import { useAuth } from '@/contexts/AuthContext';
import { createPet } from '@/lib/database';

interface RegisterPetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const RegisterPetModal: React.FC<RegisterPetModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'dog' as 'dog' | 'cat',
    breed: '',
    birthDate: '',
    gender: 'male' as 'male' | 'female',
    color: '',
    location: '',
    healthCertified: false,
    sireRegistration: '',
    damRegistration: '',
    description: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [registrationNumber, setRegistrationNumber] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('Please sign in to register a pet');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const pet = await createPet({
        name: formData.name,
        type: formData.type,
        breed: formData.breed,
        gender: formData.gender,
        birth_date: formData.birthDate,
        color: formData.color || undefined,
        health_certified: formData.healthCertified,
        location: formData.location || undefined,
        description: formData.description || undefined,
        sire_registration: formData.sireRegistration || undefined,
        dam_registration: formData.damRegistration || undefined,
      });

      setRegistrationNumber(pet.registration_number);
      setSubmitted(true);
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to register pet');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSubmitted(false);
    setStep(1);
    setError(null);
    setRegistrationNumber(null);
    setFormData({
      name: '',
      type: 'dog',
      breed: '',
      birthDate: '',
      gender: 'male',
      color: '',
      location: '',
      healthCertified: false,
      sireRegistration: '',
      damRegistration: '',
      description: '',
    });
    onClose();
  };

  const availableBreeds = breeds[formData.type];

  // Check if user is logged in
  if (!user) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-[#C97064]/10 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-[#C97064]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-[#2C2C2C] mb-2">Sign In Required</h3>
          <p className="text-[#2C2C2C]/60 mb-6">
            Please sign in or create an account to register your pet and manage their pedigree.
          </p>
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-xl bg-[#C97064] text-white font-medium hover:bg-[#B86054] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
      
      {/* Modal */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#8B9D83]/10">
          <div>
            <h2 className="text-2xl font-bold text-[#2C2C2C]">Register Your Pet</h2>
            <p className="text-sm text-[#2C2C2C]/60 mt-1">
              {submitted ? 'Registration Complete' : `Step ${step} of 3`}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-xl hover:bg-[#F5F1E8] transition-colors"
          >
            <svg className="w-6 h-6 text-[#2C2C2C]/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress Bar */}
        {!submitted && (
          <div className="px-6 pt-4">
            <div className="flex gap-2">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`flex-1 h-1.5 rounded-full transition-colors ${
                    s <= step ? 'bg-[#8B9D83]' : 'bg-[#8B9D83]/20'
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 overflow-y-auto max-h-[60vh]">
            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                {error}
              </div>
            )}

            {submitted ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 rounded-full bg-[#8B9D83]/10 flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-[#8B9D83]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-[#2C2C2C] mb-2">Registration Complete!</h3>
                <p className="text-[#2C2C2C]/60 mb-4">
                  Your pet has been successfully registered in the Petdegree database.
                </p>
                {registrationNumber && (
                  <div className="inline-block px-6 py-3 rounded-xl bg-[#F5F1E8] mb-6">
                    <p className="text-sm text-[#2C2C2C]/60 mb-1">Registration Number</p>
                    <p className="text-xl font-mono font-bold text-[#8B9D83]">{registrationNumber}</p>
                  </div>
                )}
                <p className="text-sm text-[#2C2C2C]/50">
                  You can view and manage your pet's profile from your dashboard.
                </p>
              </div>
            ) : (
              <>
                {/* Step 1: Basic Info */}
                {step === 1 && (
                  <div className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-[#2C2C2C]/70 mb-2">Pet Name *</label>
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          required
                          className="w-full px-4 py-3 rounded-xl border border-[#8B9D83]/20 focus:border-[#8B9D83] focus:ring-2 focus:ring-[#8B9D83]/20 outline-none transition-all"
                          placeholder="e.g., Apollo"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#2C2C2C]/70 mb-2">Pet Type *</label>
                        <select
                          name="type"
                          value={formData.type}
                          onChange={handleChange}
                          className="w-full px-4 py-3 rounded-xl border border-[#8B9D83]/20 focus:border-[#8B9D83] focus:ring-2 focus:ring-[#8B9D83]/20 outline-none transition-all bg-white"
                        >
                          <option value="dog">Dog</option>
                          <option value="cat">Cat</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-[#2C2C2C]/70 mb-2">Breed *</label>
                        <select
                          name="breed"
                          value={formData.breed}
                          onChange={handleChange}
                          required
                          className="w-full px-4 py-3 rounded-xl border border-[#8B9D83]/20 focus:border-[#8B9D83] focus:ring-2 focus:ring-[#8B9D83]/20 outline-none transition-all bg-white"
                        >
                          <option value="">Select breed</option>
                          {availableBreeds.map(breed => (
                            <option key={breed} value={breed}>{breed}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#2C2C2C]/70 mb-2">Gender *</label>
                        <select
                          name="gender"
                          value={formData.gender}
                          onChange={handleChange}
                          className="w-full px-4 py-3 rounded-xl border border-[#8B9D83]/20 focus:border-[#8B9D83] focus:ring-2 focus:ring-[#8B9D83]/20 outline-none transition-all bg-white"
                        >
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-[#2C2C2C]/70 mb-2">Birth Date *</label>
                        <input
                          type="date"
                          name="birthDate"
                          value={formData.birthDate}
                          onChange={handleChange}
                          required
                          className="w-full px-4 py-3 rounded-xl border border-[#8B9D83]/20 focus:border-[#8B9D83] focus:ring-2 focus:ring-[#8B9D83]/20 outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[#2C2C2C]/70 mb-2">Color/Markings</label>
                        <input
                          type="text"
                          name="color"
                          value={formData.color}
                          onChange={handleChange}
                          className="w-full px-4 py-3 rounded-xl border border-[#8B9D83]/20 focus:border-[#8B9D83] focus:ring-2 focus:ring-[#8B9D83]/20 outline-none transition-all"
                          placeholder="e.g., Golden"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Pedigree Info */}
                {step === 2 && (
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-[#2C2C2C]/70 mb-2">Sire (Father) Registration Number</label>
                      <input
                        type="text"
                        name="sireRegistration"
                        value={formData.sireRegistration}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-xl border border-[#8B9D83]/20 focus:border-[#8B9D83] focus:ring-2 focus:ring-[#8B9D83]/20 outline-none transition-all"
                        placeholder="e.g., GR-2020-0123"
                      />
                      <p className="text-xs text-[#2C2C2C]/50 mt-1">Enter the registration number if the sire is already in our database</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#2C2C2C]/70 mb-2">Dam (Mother) Registration Number</label>
                      <input
                        type="text"
                        name="damRegistration"
                        value={formData.damRegistration}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-xl border border-[#8B9D83]/20 focus:border-[#8B9D83] focus:ring-2 focus:ring-[#8B9D83]/20 outline-none transition-all"
                        placeholder="e.g., GR-2019-0456"
                      />
                      <p className="text-xs text-[#2C2C2C]/50 mt-1">Enter the registration number if the dam is already in our database</p>
                    </div>

                    <div className="p-4 rounded-xl bg-[#8B9D83]/10 flex items-start gap-3">
                      <input
                        type="checkbox"
                        name="healthCertified"
                        checked={formData.healthCertified}
                        onChange={handleChange}
                        className="mt-1 w-5 h-5 rounded border-[#8B9D83]/30 text-[#8B9D83] focus:ring-[#8B9D83]"
                      />
                      <div>
                        <label className="font-medium text-[#2C2C2C]">Health Certification</label>
                        <p className="text-sm text-[#2C2C2C]/60 mt-1">
                          I confirm this pet has passed health screenings and has documentation available for verification.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: Additional Info */}
                {step === 3 && (
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-[#2C2C2C]/70 mb-2">Location</label>
                      <input
                        type="text"
                        name="location"
                        value={formData.location}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-xl border border-[#8B9D83]/20 focus:border-[#8B9D83] focus:ring-2 focus:ring-[#8B9D83]/20 outline-none transition-all"
                        placeholder="City, State"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[#2C2C2C]/70 mb-2">Description (Optional)</label>
                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        rows={3}
                        className="w-full px-4 py-3 rounded-xl border border-[#8B9D83]/20 focus:border-[#8B9D83] focus:ring-2 focus:ring-[#8B9D83]/20 outline-none transition-all resize-none"
                        placeholder="Tell us about your pet's personality, achievements, or special traits..."
                      />
                    </div>

                    <div className="p-4 rounded-xl bg-[#F5F1E8]">
                      <h4 className="font-medium text-[#2C2C2C] mb-3">Registration Summary</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <span className="text-[#2C2C2C]/60">Pet Name:</span>
                        <span className="text-[#2C2C2C] font-medium">{formData.name || '-'}</span>
                        <span className="text-[#2C2C2C]/60">Type:</span>
                        <span className="text-[#2C2C2C] font-medium capitalize">{formData.type}</span>
                        <span className="text-[#2C2C2C]/60">Breed:</span>
                        <span className="text-[#2C2C2C] font-medium">{formData.breed || '-'}</span>
                        <span className="text-[#2C2C2C]/60">Gender:</span>
                        <span className="text-[#2C2C2C] font-medium capitalize">{formData.gender}</span>
                        <span className="text-[#2C2C2C]/60">Birth Date:</span>
                        <span className="text-[#2C2C2C] font-medium">{formData.birthDate || '-'}</span>
                        <span className="text-[#2C2C2C]/60">Health Certified:</span>
                        <span className="text-[#2C2C2C] font-medium">{formData.healthCertified ? 'Yes' : 'No'}</span>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-[#8B9D83]/10 border border-[#8B9D83]/20">
                      <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-[#8B9D83] mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <p className="text-sm text-[#2C2C2C]/70">
                            By submitting this registration, you confirm that all information provided is accurate and that you are the legal owner of this pet.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          {!submitted && (
            <div className="flex items-center justify-between p-6 border-t border-[#8B9D83]/10 bg-[#F5F1E8]/50">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="px-6 py-3 rounded-xl border border-[#8B9D83]/30 text-[#2C2C2C] font-medium hover:bg-white transition-colors"
                >
                  Back
                </button>
              ) : (
                <div />
              )}
              
              {step < 3 ? (
                <button
                  type="button"
                  onClick={() => setStep(step + 1)}
                  disabled={step === 1 && (!formData.name || !formData.breed || !formData.birthDate)}
                  className="px-6 py-3 rounded-xl bg-[#2C2C2C] text-white font-medium hover:bg-[#3C3C3C] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-3 rounded-xl bg-[#C97064] text-white font-medium hover:bg-[#B86054] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Registering...
                    </>
                  ) : (
                    'Submit Registration'
                  )}
                </button>
              )}
            </div>
          )}

          {submitted && (
            <div className="flex justify-center p-6 border-t border-[#8B9D83]/10 bg-[#F5F1E8]/50">
              <button
                type="button"
                onClick={handleClose}
                className="px-8 py-3 rounded-xl bg-[#8B9D83] text-white font-medium hover:bg-[#7A8C72] transition-colors"
              >
                Done
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default RegisterPetModal;
