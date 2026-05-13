import { supabase } from '@/lib/supabaseClient';
import type { Session, User, AuthChangeEvent, Subscription } from '@supabase/supabase-js';

export const AuthService = {
  signUp(email: string, password: string, fullName: string) {
    return supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin,
      },
    });
  },

  signIn(email: string, password: string) {
    return supabase.auth.signInWithPassword({ email, password });
  },

  signInWithGoogle() {
    return supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  },

  signOut() {
    return supabase.auth.signOut();
  },

  getCurrentUser() {
    return supabase.auth.getUser();
  },

  getSession() {
    return supabase.auth.getSession();
  },

  resetPassword(email: string) {
    return supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
  },

  updatePassword(newPassword: string) {
    return supabase.auth.updateUser({ password: newPassword });
  },

  onAuthStateChange(
    callback: (event: AuthChangeEvent, session: Session | null) => void
  ): { data: { subscription: Subscription } } {
    return supabase.auth.onAuthStateChange(callback);
  },
};

export type { Session, User, AuthChangeEvent };
