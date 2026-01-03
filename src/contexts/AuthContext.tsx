import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthUser, getCurrentUser, onAuthStateChange, signIn, signUp, signOut, signInWithOAuth, updateProfile, UserProfile } from '@/lib/auth';
import { loadCart, saveCart, CartItem } from '@/lib/database';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, accountType: 'breeder' | 'buyer') => Promise<void>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithGitHub: () => Promise<void>;
  signInWithOAuth: (provider: 'google' | 'github' | 'line') => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  savedCart: CartItem[];
  syncCart: (items: CartItem[]) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [savedCart, setSavedCart] = useState<CartItem[]>([]);

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
    const user = await getCurrentUser();
    setUser(user);
    if (user) {
      const cart = await loadCart();
      setSavedCart(cart);
    }
  };

  const handleSignUp = async (email: string, password: string, fullName: string, accountType: 'breeder' | 'buyer') => {
    await signUp(email, password, fullName, accountType);
    const user = await getCurrentUser();
    setUser(user);
  };

  const handleSignOut = async () => {
    await signOut();
    setUser(null);
    setSavedCart([]);
  };

  const handleSignInWithGoogle = async () => {
    await signInWithOAuth('google');
  };

  const handleSignInWithGitHub = async () => {
    await signInWithOAuth('github');
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

  const handleSignInWithOAuth = async (provider: 'google' | 'github' | 'line') => {
    // Cast 'line' to specific provider type if needed by supabase type definition
    // Usually 'google' | 'github' | 'azure' | etc. 
    // If 'line' is not in the type, we might need to cast to any or use correct string.
    await signInWithOAuth(provider as any);
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
        signInWithOAuth: handleSignInWithOAuth,
        updateProfile: handleUpdateProfile,
        savedCart,
        syncCart
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
