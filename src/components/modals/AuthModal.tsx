import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { signIn, signUp, signInWithGoogle, signInWithGitHub, signInWithOAuth, demoMode, toggleDemoMode } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    confirmPassword: '',
    accountType: 'breeder' as 'breeder' | 'buyer'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === 'signup') {
        if (formData.password !== formData.confirmPassword) {
          throw new Error('Passwords do not match');
        }
        if (formData.password.length < 6) {
          throw new Error('Password must be at least 6 characters');
        }
        await signUp(formData.email, formData.password, formData.name, formData.accountType);
      } else {
        await signIn(formData.email, formData.password);
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
        // Reset form
        setFormData({
          email: '',
          password: '',
          name: '',
          confirmPassword: '',
          accountType: 'breeder'
        });
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthSignIn = async (provider: 'google' | 'github' | 'line') => {
    try {
      if (provider === 'line') {
        // Note: Real LINE integration requires Supabase OIDC configuration or custom flow
        // For now, we simulate calling the OAuth endpoint
        await signInWithOAuth('line' as any);
      } else if (provider === 'google') {
        await signInWithGoogle();
      } else {
        await signInWithGitHub();
      }
    } catch (err: any) {
      setError(err.message || 'OAuth sign in failed');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="p-6 pb-0">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#8B9D83] to-[#6B7D63] flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <span className="text-xl font-semibold text-[#2C2C2C]">
                Pet<span className="text-[#8B9D83]">degree</span>
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-[#F5F1E8] transition-colors"
            >
              <svg className="w-5 h-5 text-[#2C2C2C]/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-[#F5F1E8] rounded-xl">
            <button
              onClick={() => { setMode('login'); setError(null); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${mode === 'login'
                ? 'bg-white text-[#2C2C2C] shadow-sm'
                : 'text-[#2C2C2C]/60 hover:text-[#2C2C2C]'
                }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setMode('signup'); setError(null); }}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${mode === 'signup'
                ? 'bg-white text-[#2C2C2C] shadow-sm'
                : 'text-[#2C2C2C]/60 hover:text-[#2C2C2C]'
                }`}
            >
              Create Account
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {success ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-[#8B9D83]/10 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-[#8B9D83]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-[#2C2C2C]">
                {mode === 'login' ? 'Welcome back!' : 'Account created!'}
              </h3>
              <p className="text-[#2C2C2C]/60 mt-2">
                {mode === 'signup' && 'Please check your email to verify your account.'}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Error Message */}
              {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                  {error}
                </div>
              )}

              {mode === 'signup' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-[#2C2C2C]/70 mb-2">Full Name</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 rounded-xl border border-[#8B9D83]/20 focus:border-[#8B9D83] focus:ring-2 focus:ring-[#8B9D83]/20 outline-none transition-all"
                      placeholder="Your name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#2C2C2C]/70 mb-2">Account Type</label>
                    <select
                      name="accountType"
                      value={formData.accountType}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-xl border border-[#8B9D83]/20 focus:border-[#8B9D83] focus:ring-2 focus:ring-[#8B9D83]/20 outline-none transition-all bg-white"
                    >
                      <option value="breeder">Breeder / Pet Owner</option>
                      <option value="buyer">Buyer / Pet Lover</option>
                    </select>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-[#2C2C2C]/70 mb-2">Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-[#8B9D83]/20 focus:border-[#8B9D83] focus:ring-2 focus:ring-[#8B9D83]/20 outline-none transition-all"
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#2C2C2C]/70 mb-2">Password</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  minLength={6}
                  className="w-full px-4 py-3 rounded-xl border border-[#8B9D83]/20 focus:border-[#8B9D83] focus:ring-2 focus:ring-[#8B9D83]/20 outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>

              {mode === 'signup' && (
                <div>
                  <label className="block text-sm font-medium text-[#2C2C2C]/70 mb-2">Confirm Password</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    minLength={6}
                    className="w-full px-4 py-3 rounded-xl border border-[#8B9D83]/20 focus:border-[#8B9D83] focus:ring-2 focus:ring-[#8B9D83]/20 outline-none transition-all"
                    placeholder="••••••••"
                  />
                </div>
              )}

              {mode === 'login' && (
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-[#2C2C2C]/70">
                    <input type="checkbox" className="rounded border-[#8B9D83]/30 text-[#8B9D83] focus:ring-[#8B9D83]" />
                    Remember me
                  </label>
                  <button type="button" className="text-sm text-[#8B9D83] hover:text-[#6B7D63] font-medium">
                    Forgot password?
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-xl bg-[#C97064] text-white font-semibold hover:bg-[#B86054] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : mode === 'login' ? (
                  'Sign In'
                ) : (
                  'Create Account'
                )}
              </button>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#8B9D83]/20" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-[#2C2C2C]/50">Or continue with</span>
                </div>
              </div>

              {/* Social Login */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleOAuthSignIn('google')}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl border border-[#8B9D83]/20 hover:bg-[#F5F1E8] transition-colors"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Google
                </button>

                <button
                  type="button"
                  onClick={() => handleOAuthSignIn('apple' as any)}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl bg-black text-white hover:bg-gray-900 transition-colors"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-.66-.3-1.4-.6-2.01-.58-.65 0-1.48.33-2.15.65-1.01.48-2.03.58-3.05-.4l-.04-.04c-3.16-3.23-2.62-8.15.53-10.87.89-.78 2.03-1.2 2.94-1.18.66.02 1.3.28 1.95.53.51.2.98.38 1.45.38.49 0 .99-.19 1.5-.4.76-.3 1.52-.61 2.37-.53 1 .09 2.04.48 2.84 1.25-.09.06-1.74 1.05-1.72 4.14.01 3.32 2.9 4.41 2.97 4.44-.04.13-.42 1.45-1.4 2.88l-.1.14zM12.03 7.25c-.15-2.23 1.66-4.22 3.74-4.25.17 2.3-2.11 4.2-3.74 4.25z" />
                  </svg>
                  Apple
                </button>

                <button
                  type="button"
                  onClick={() => handleOAuthSignIn('github')}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl border border-[#8B9D83]/20 hover:bg-[#F5F1E8] transition-colors"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.341-3.369-1.341-.454-1.155-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                  </svg>
                  GitHub
                </button>
                <button
                  type="button"
                  onClick={() => handleOAuthSignIn('line')}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl border border-[#06C755]/30 hover:bg-[#06C755]/10 text-[#06C755] transition-colors bg-[#06C755]/5"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63h-2.671v2.738c0 .345-.281.63-.63.63-.349 0-.63-.285-.63-.63V9.863h3.931zm-10.133.631c.349 0 .63.285.63.631v.322c0 .345-.281.63-.63.63s-.63-.285-.63-.63v-.322h-1.32v2.738c0 .345-.281.63-.63.63-.349 0-.63-.285-.63-.63V9.863h2.583c.348 0 .63.286.63.631zm-4.747.633c0-.345-.281-.63-.63-.63h-2.18c-.349 0-.63.285-.63.63v2.738c0 .345.281.63.63.63s.63-.285.63-.63v-1.261h1.55c.349 0 .63-.285.63-.63 0-.345-.281-.63-.63-.63h-1.55v-.217h1.55c.349 0 .63-.285.63-.63zm6.393 1.256c0 .345-.281.63-.63.63-.349 0-.63-.285-.63-.63v-1.63h-.01l-1.637 2.223c-.126.17-.323.275-.531.275h-.02c-.349-.022-.613-.323-.591-.672v-2.738c0-.345.281-.63.63-.63s.63.285.63.63v1.651l.011-.004 1.57-2.14c.125-.173.326-.279.538-.275h.02c.349.022.613.323.591.672v2.838zM12 0C5.373 0 0 4.974 0 11.11C0 16.63 4.908 21.24 11.238 22.067c.437.151.65-.187.65-.436 0-.276-.002-1.042-.008-1.996-2.582.561-3.128-1.247-3.128-1.247-.468-1.192-1.144-1.509-1.144-1.509-.844-.576.064-.564.064-.564.932.066 1.423.957 1.423.957.828 1.418 2.172 1.008 2.702.772.083-.6.324-1.009.59-1.241-2.062-.234-4.23-1.031-4.23-4.59 0-1.013.363-1.841.957-2.49-.096-.235-.415-1.179.091-2.457 0 0 .78-.249 2.553.952.741-.206 1.535-.309 2.327-.312.79.003 1.584.106 2.328.312 1.77-1.201 2.55-0.952 2.55-0.952.507 1.278.188 2.222.093 2.457.597.649.956 1.477.956 2.49 0 3.568-2.171 4.352-4.24 4.58.334.288.631.855.631 1.722 0 1.243-.012 2.245-.012 2.548 0 .252.213.592.656.434C19.094 21.235 24 16.626 24 11.11 24 4.974 18.627 0 12 0z" />
                  </svg>
                  LINE
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-2 text-center text-sm text-[#2C2C2C]/50">
          {mode === 'login' ? (
            <p>
              Don't have an account?{' '}
              <button
                onClick={() => { setMode('signup'); setError(null); }}
                className="text-[#8B9D83] hover:text-[#6B7D63] font-medium"
              >
                Sign up
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{' '}
              <button
                onClick={() => { setMode('login'); setError(null); }}
                className="text-[#8B9D83] hover:text-[#6B7D63] font-medium"
              >
                Sign in
              </button>
            </p>
          )}

          <div className="mt-6 pt-4 border-t border-[#8B9D83]/10 flex items-center justify-between">
            <div className="text-left">
              <p className="text-xs font-semibold text-[#2C2C2C]/70">Demo Mode (Simulation)</p>
              <p className="text-[10px] text-[#2C2C2C]/40">Use if Supabase config is missing.</p>
            </div>
            <button
              type="button"
              onClick={toggleDemoMode}
              className={`w-11 h-6 rounded-full transition-colors relative ${demoMode ? 'bg-[#8B9D83]' : 'bg-gray-200'}`}
            >
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform shadow-sm ${demoMode ? 'left-6' : 'left-1'}`} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
