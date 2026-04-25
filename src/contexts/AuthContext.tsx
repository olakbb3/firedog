import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

type AppRole = "athlete" | "coach" | "admin";

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
      const { data } = await supabase.from("profiles").select("role, accepted_terms").eq("id", userId).maybeSingle();
      setRole((data?.role as AppRole) || "athlete");
      setAcceptedTerms(data?.accepted_terms === true);
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
        } = await supabase.auth.getSession();

        if (initialSession?.user) {
          // Fetch profile BEFORE setting session so router has the role immediately
          await fetchProfile(initialSession.user.id, initialSession.user.email);
          if (mounted) {
            setSession(initialSession);
            setUser(initialSession.user);
          }
        }
      } catch (error) {
        console.error("Auth init error:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      // Skip initial session — already handled by initializeAuth
      if (event === "INITIAL_SESSION") return;

      if (nextSession?.user) {
        // Fetch profile first so role is always available to the router
        await fetchProfile(nextSession.user.id, nextSession.user.email);
        if (mounted) {
          setSession(nextSession);
          setUser(nextSession.user);
        }
      } else {
        // User signed out — clear everything
        if (mounted) {
          setSession(null);
          setUser(null);
          setRole(null);
          setAcceptedTerms(false);
        }
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
    <AuthContext.Provider value={{ session, user, role, acceptedTerms, setAcceptedTerms, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
