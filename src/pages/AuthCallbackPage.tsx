import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';

const AuthCallbackPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase auto-handles the OAuth callback hash and creates a session.
    // Wait for the session to be established, then redirect home.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        navigate('/', { replace: true });
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/', { replace: true });
      } else {
        // Give it a moment, then fall back to login if no session shows up
        setTimeout(() => {
          supabase.auth.getSession().then(({ data: { session: s } }) => {
            navigate(s ? '/' : '/login', { replace: true });
          });
        }, 1500);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <p className="text-muted-foreground text-sm">Signing you in...</p>
    </div>
  );
};

export default AuthCallbackPage;
