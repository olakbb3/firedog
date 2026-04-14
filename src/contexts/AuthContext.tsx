import { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';

type AppRole = 'athlete' | 'coach' | 'admin';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  acceptedTerms: boolean;
  setAcceptedTerms: (v: boolean) => void;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(true);
  const isInitializedRef = useRef(false);

  const claimPendingPurchases = async (userId: string, email: string) => {
    try {
      const { data: pending } = await supabase
        .from('pending_purchases')
        .select('id, program_sku')
        .eq('processed', false)
        .ilike('email', email.toLowerCase());

      if (!pending || pending.length === 0) return;

      for (const row of pending) {
        await supabase
          .from('user_programs')
          .upsert(
            { user_id: userId, program_sku: row.program_sku, source: 'auto_claim' },
            { onConflict: 'user_id,program_sku' }
          );

        await supabase
          .from('pending_purchases')
          .update({ processed: true })
          .eq('id', row.id);
      }

      toast.success('We found your purchase and unlocked your program! 🔥');
    } catch (err) {
      console.warn('Auto-claim failed:', err);
    }
  };

  const fetchProfile = async (userId: string, email?: string) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('role, accepted_terms')
        .eq('id', userId)
        .maybeSingle();
      setRole((data?.role as AppRole) || 'athlete');
      setAcceptedTerms(data?.accepted_terms === true);
    } catch {
      setRole('athlete');
      setAcceptedTerms(false);
    }

    if (email) {
      claimPendingPurchases(userId, email);
    }
  };

  useEffect(() => {
    const applySession = (nextSession: Session | null) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (nextSession?.user) {
        setTimeout(() => fetchProfile(nextSession.user.id), 0);
      } else {
        setRole(null);
        setAcceptedTerms(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      applySession(nextSession);

      if (isInitializedRef.current) {
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      applySession(session);
      isInitializedRef.current = true;
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setRole(null);
    setAcceptedTerms(false);
  };

  return (
    <AuthContext.Provider value={{ session, user, role, acceptedTerms, setAcceptedTerms, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
