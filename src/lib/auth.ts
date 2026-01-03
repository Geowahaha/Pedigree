import { supabase } from './supabase';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  account_type: 'breeder' | 'buyer';
  avatar_url: string | null;
  location: string | null;
  phone: string | null;
  bio: string | null;
  verified_breeder: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthUser {
  id: string;
  email: string;
  profile: UserProfile | null;
}

// Sign up with email and password
export async function signUp(email: string, password: string, fullName: string, accountType: 'breeder' | 'buyer' = 'breeder') {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        account_type: accountType
      }
    }
  });

  if (error) throw error;

  // Update profile with additional info
  if (data.user) {
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        account_type: accountType
      })
      .eq('id', data.user.id);

    if (profileError) console.error('Profile update error:', profileError);
  }

  return data;
}

// Sign in with email and password
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) throw error;
  return data;
}

// Sign out
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// Get current session
export async function getSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  return session;
}

// Get current user with profile
export async function getCurrentUser(): Promise<AuthUser | null> {
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) return null;

  // Fetch profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return {
    id: user.id,
    email: user.email || '',
    profile: profile as UserProfile | null
  };
}

// Update user profile
export async function updateProfile(userId: string, updates: Partial<UserProfile>) {
  const { data, error } = await supabase
    .from('profiles')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Listen to auth state changes
export function onAuthStateChange(callback: (user: AuthUser | null) => void) {
  return supabase.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      callback({
        id: session.user.id,
        email: session.user.email || '',
        profile: profile as UserProfile | null
      });
    } else {
      callback(null);
    }
  });
}

// Reset password
export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`
  });
  if (error) throw error;
}

// Sign in with OAuth (Google, GitHub)
export async function signInWithOAuth(provider: 'google' | 'github' | 'facebook' | 'apple') {
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: import.meta.env.PROD ? 'https://petdegree.vercel.app' : window.location.origin
    }
  });
  if (error) throw error;
}
