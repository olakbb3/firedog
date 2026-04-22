import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import firedogLogo from '@/assets/firedog-logo.png';

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // Supabase auto-handles the recovery hash and creates a session.
    // Listen for the PASSWORD_RECOVERY event or check for existing session.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) {
        setHasSession(true);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const passwordsMatch = password.length >= 6 && password === confirm;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordsMatch) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast({ title: 'Could not update password', description: error.message, variant: 'destructive' });
      } else {
        setDone(true);
        toast({ title: 'Password updated!', description: 'Redirecting to login...' });
        setTimeout(async () => {
          await supabase.auth.signOut();
          navigate('/login');
        }, 1500);
      }
    } catch (err: any) {
      toast({ title: 'Unexpected error', description: err.message || String(err), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <img src={firedogLogo} alt="FiredogWorks" className="w-32 h-32 mb-4 object-contain" />
      <h1 className="text-2xl font-bold mb-1">RESET PASSWORD</h1>
      <p className="text-muted-foreground text-sm mb-8">Set your new password.</p>

      {hasSession === false ? (
        <div className="w-full max-w-sm rounded-xl bg-secondary border border-border p-4 text-center space-y-3">
          <p className="text-sm">This link has expired or is invalid. Request a new one.</p>
          <Button
            onClick={() => navigate('/forgot-password')}
            className="w-full gradient-fire text-primary-foreground font-display tracking-wide shadow-fire"
          >
            REQUEST NEW LINK
          </Button>
        </div>
      ) : done ? (
        <div className="w-full max-w-sm rounded-xl bg-secondary border border-border p-4 text-center">
          <p className="text-sm">Password updated! Redirecting to login...</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
          <Input
            type="password"
            placeholder="New password (min 6 chars)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-secondary border-border"
            minLength={6}
            required
          />
          <Input
            type="password"
            placeholder="Confirm password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="bg-secondary border-border"
            minLength={6}
            required
          />
          {confirm.length > 0 && password !== confirm && (
            <p className="text-xs text-destructive">Passwords do not match</p>
          )}
          <Button
            type="submit"
            disabled={loading || !passwordsMatch}
            className="w-full gradient-fire text-primary-foreground font-display text-lg tracking-wide shadow-fire"
          >
            {loading ? 'UPDATING...' : 'UPDATE PASSWORD'}
          </Button>
        </form>
      )}
    </div>
  );
};

export default ResetPasswordPage;
