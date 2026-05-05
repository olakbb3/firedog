import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { getProfile } from "@/services/profile.service";
import { toast } from "sonner";

type AppRole = "athlete" | "coach" | "admin";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  acceptedTerms: boolean;
  setAcceptedTerms: (v: boolean) => void;
  sessionChecked: boolean;
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
  const [sessionChecked, setSessionChecked] = useState(false);
  const [loading, setLoading] = useState(true);

  const claimPendingPurchases = async (userId: string, email: string) => {
    try {
      const { data: pending } = await supabase
        .from("pending_purchases")
        .select("id, program_sku")
        .eq("processed", false)
        .ilike("email", email.toLowerCase());

      if (!pending || pending.length === 0) return;

      for (const row of pending) {
        await supabase
          .from("user_programs")
          .upsert(
            { user_id: userId, program_sku: row.program_sku, source: "auto_claim" },
            { onConflict: "user_id,program_sku" },
          );

        await supabase.from("pending_purchases").update({ processed: true }).eq("id", row.id);
      }

      toast.success("We found your purchase and unlocked your program! 🔥");
    } catch (err) {
      console.warn("Auto-claim failed:", err);
    }
  };

  const fetchProfile = async (userId: string, email?: string) => {
    try {
      const { data, error } = await getProfile(userId);
      if (error) {
        console.warn("getProfile failed:", error);
        setRole("athlete");
        setAcceptedTerms(false);
      } else {
        setRole((data?.role as AppRole) || "athlete");
        setAcceptedTerms(data?.accepted_terms === true);
      }
    } catch {
      setRole("athlete");
      setAcceptedTerms(false);
    }

    if (email) {
      claimPendingPurchases(userId, email);
    }
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const {
          data: { session: initialSession },
          error,
        } = await supabase.auth.getSession();

        if (error && (error.message?.includes("Refresh Token Not Found") || error.status === 400)) {
          if (mounted) {
            setSession(null);
            setUser(null);
            setLoading(false);
          }
          return;
        }

        if (initialSession?.user) {
          await fetchProfile(initialSession.user.id, initialSession.user.email);
          if (mounted) {
            setSession(initialSession);
            setUser(initialSession.user);
          }
        }
      } catch (error) {
        console.log("Auth init: no session found (guest mode)");
      } finally {
        if (mounted) {
          setSessionChecked(true);
          setLoading(false);
        }
      }
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;

      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (nextSession?.user) {
        void fetchProfile(nextSession.user.id, nextSession.user.email);
      } else {
        setRole(null);
        setAcceptedTerms(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setRole(null);
    setAcceptedTerms(false);
  };

  return (
    <AuthContext.Provider value={{ session, user, role, acceptedTerms, setAcceptedTerms, sessionChecked, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
