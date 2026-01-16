import { supabase } from './supabase';
import { createUserNotification } from '@/lib/database';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  account_type: 'breeder' | 'buyer';
  role: 'admin' | 'breeder' | 'buyer'; // Role-based access control
  avatar_url: string | null;
  location: string | null;
  phone: string | null;
  bio: string | null;
  verified_breeder: boolean;
  trd_balance: number; // TRD Coin Balance
  created_at: string;
  updated_at: string;
}

export interface AuthUser {
  id: string;
  email: string;
  profile: UserProfile | null;
}

// Sign up with email and password
export async function signUp(
  email: string,
  password: string,
  fullName: string,
  accountType: 'breeder' | 'buyer' = 'breeder',
  nickname: string = '',
  avatarUrl: string = ''
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        account_type: accountType,
        nickname: nickname,
        avatar_url: avatarUrl
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
        account_type: accountType,
        nickname: nickname,
        avatar_url: avatarUrl
      })
      .eq('id', data.user.id);

    if (profileError) console.error('Profile update error:', profileError);

    // Welcome Notification
    try {
      await createUserNotification({
        user_id: data.user.id,
        type: 'system',
        title: 'Welcome to Eibpo! 🐾',
        message: `Hi ${nickname || fullName}! We're so happy you're here. Start exploring or register your first pet today.`,
        payload: { action: 'welcome' }
      });
    } catch (e) {
      console.error("Welcome notification failed", e);
    }
  }

  return data.user;
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

// Get current user with profile (OPTIMIZED)
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) return null;

    // Fetch profile in parallel with a timeout to prevent hanging
    const profilePromise = supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
      .then(({ data }) => data)
      .catch(() => null); // Return null if profile doesn't exist

    const profile = await Promise.race([
      profilePromise,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)) // 3s timeout
    ]);

    return {
      id: user.id,
      email: user.email || '',
      profile: profile as UserProfile | null
    };
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
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

// Listen to auth state changes (OPTIMIZED)
export function onAuthStateChange(callback: (user: AuthUser | null) => void) {
  return supabase.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      try {
        // Fetch profile with timeout
        const profilePromise = supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
          .then(({ data }) => data)
          .catch(() => null);

        let profile = await Promise.race([
          profilePromise,
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000)) // 2s timeout
        ]);

        const metadata = session.user.user_metadata || {};
        const invitedByAdmin = metadata.invited_by === 'admin';

        if (invitedByAdmin && profile) {
          const updates: Partial<UserProfile> = {};
          const desiredRole = metadata.role;
          const desiredAccountType = metadata.account_type;
          const desiredVerified = metadata.verified_breeder;

          if (desiredRole && profile.role !== desiredRole) {
            updates.role = desiredRole;
          }
          if (desiredAccountType && profile.account_type !== desiredAccountType) {
            updates.account_type = desiredAccountType;
          }
          if (typeof desiredVerified === 'boolean' && profile.verified_breeder !== desiredVerified) {
            updates.verified_breeder = desiredVerified;
          }

          if (Object.keys(updates).length > 0) {
            try {
              const { data } = await supabase
                .from('profiles')
                .update({
                  ...updates,
                  updated_at: new Date().toISOString()
                })
                .eq('id', session.user.id)
                .select()
                .single();

              profile = (data || { ...profile, ...updates }) as UserProfile;
            } catch (syncError) {
              console.warn('Profile invite sync failed', syncError);
            }
          }
        }

        callback({
          id: session.user.id,
          email: session.user.email || '',
          profile: profile as UserProfile | null
        });
      } catch (error) {
        console.error('Error in auth state change:', error);
        // Still callback with user but no profile
        callback({
          id: session.user.id,
          email: session.user.email || '',
          profile: null
        });
      }
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
      redirectTo: (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? window.location.origin
        : 'https://petdegree.vercel.app'
    }
  });
  if (error) throw error;
}
