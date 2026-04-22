import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import firedogLogo from '@/assets/firedog-logo.png';

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        toast({ title: 'Could not send reset link', description: error.message, variant: 'destructive' });
      } else {
        setSent(true);
        toast({ title: 'Check your email for a reset link.' });
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
      <h1 className="text-2xl font-bold mb-1">FORGOT PASSWORD</h1>
      <p className="text-muted-foreground text-sm mb-8 text-center max-w-sm">
        Enter your email and we'll send you a reset link.
      </p>

      {sent ? (
        <div className="w-full max-w-sm rounded-xl bg-secondary border border-border p-4 text-center space-y-2">
          <p className="text-sm">Check your email for a reset link.</p>
          <p className="text-xs text-muted-foreground">Didn't get it? Check your spam folder.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-secondary border-border"
            required
          />
          <Button
            type="submit"
            disabled={loading}
            className="w-full gradient-fire text-primary-foreground font-display text-lg tracking-wide shadow-fire"
          >
            {loading ? 'SENDING...' : 'SEND RESET LINK'}
          </Button>
        </form>
      )}

      <p className="mt-6 text-sm text-muted-foreground">
        <button onClick={() => navigate('/login')} className="text-primary font-semibold">
          Back to Sign In
        </button>
      </p>
    </div>
  );
};

export default ForgotPasswordPage;
