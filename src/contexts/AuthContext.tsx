import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthUser, getCurrentUser, onAuthStateChange, signIn, signUp, signOut, signInWithOAuth, updateProfile, UserProfile } from '@/lib/auth';
import { loadCart, saveCart, CartItem } from '@/lib/database';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, accountType: 'breeder' | 'buyer', nickname?: string, avatarUrl?: string) => Promise<AuthUser | null>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithGitHub: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithOAuth: (provider: 'google' | 'github' | 'facebook' | 'apple') => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  savedCart: CartItem[];
  syncCart: (items: CartItem[]) => Promise<void>;
  demoMode: boolean;
  toggleDemoMode: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [savedCart, setSavedCart] = useState<CartItem[]>([]);

  // Demo Mode State
  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    // Get initial user
    getCurrentUser().then((user) => {
      setUser(user);
      setLoading(false);

      // Load saved cart if user is logged in
      if (user) {
        loadCart().then(setSavedCart);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = onAuthStateChange((user) => {
      setUser(user);
      if (user) {
        loadCart().then(setSavedCart);
      } else {
        setSavedCart([]);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSignIn = async (email: string, password: string) => {
    await signIn(email, password);
    // onAuthStateChange will automatically update the user and cart
    // No need to manually fetch here - this makes login faster!
  };

  const handleSignUp = async (
    email: string,
    password: string,
    fullName: string,
    accountType: 'breeder' | 'buyer',
    nickname?: string,
    avatarUrl?: string
  ) => {
    const newUser = await signUp(email, password, fullName, accountType, nickname, avatarUrl);
    // onAuthStateChange will automatically update the user
    return newUser;
  };

  const handleSignOut = async () => {
    await signOut();
    setUser(null);
    setSavedCart([]);
  };

  const handleSignInWithGoogle = async () => {
    await handleSignInWithOAuth('google');
  };

  const handleSignInWithGitHub = async () => {
    await handleSignInWithOAuth('github');
  };

  const handleSignInWithApple = async () => {
    await handleSignInWithOAuth('apple');
  };

  const handleUpdateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) throw new Error('Not authenticated');
    const updated = await updateProfile(user.id, updates);
    setUser({
      ...user,
      profile: updated as UserProfile
    });
  };

  const syncCart = async (items: CartItem[]) => {
    if (user) {
      await saveCart(items);
      setSavedCart(items);
    }
  };

  const mockUser = (provider: string): AuthUser => ({
    id: `mock-user-${provider}`,
    email: `demo.${provider}@example.com`,
    profile: {
      id: `mock-user-${provider}`,
      email: `demo.${provider}@example.com`,
      full_name: `Demo User (${provider})`,
      account_type: 'breeder',
      role: 'breeder',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      avatar_url: `https://ui-avatars.com/api/?name=Demo+${provider}&background=random`,
      location: 'Demo City',
      phone: '000-000-0000',
      bio: 'This is a demo account for testing social login flow.',
      verified_breeder: true
    }
  });

  const handleSignInWithOAuth = async (provider: 'google' | 'github' | 'facebook' | 'apple') => {
    if (demoMode) {
      // Simulate login delay
      setLoading(true);
      setTimeout(() => {
        const user = mockUser(provider);
        setUser(user);
        setLoading(false);
      }, 800);
      return;
    }

    await signInWithOAuth(provider as any);
  };

  const toggleDemoMode = () => {
    setDemoMode(prev => !prev);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn: handleSignIn,
        signUp: handleSignUp,
        signOut: handleSignOut,
        signInWithGoogle: handleSignInWithGoogle,
        signInWithGitHub: handleSignInWithGitHub,
        signInWithApple: handleSignInWithApple,
        signInWithOAuth: handleSignInWithOAuth,
        updateProfile: handleUpdateProfile,
        savedCart,
        syncCart,
        demoMode,
        toggleDemoMode
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Export hook separately to maintain Fast Refresh compatibility
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
