import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { useOnboarding } from '@/contexts/OnboardingContext';
import GoogleSignInButton from '@/components/GoogleSignInButton';
import AuthDivider from '@/components/AuthDivider';
import firedogLogo from '@/assets/firedog-logo.png';

const SignupPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: onboardingData, reset: resetOnboarding, returnPath } = useOnboarding();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) {
        toast({ title: 'Signup failed', description: error.message, variant: 'destructive' });
        return;
      }

      // Update profile with onboarding data + consent
      if (data.user) {
        const consentGiven = localStorage.getItem('consent_given') === 'true';
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            full_name: name,
            training_level: onboardingData.training_level || null,
            fitness_goal: onboardingData.fitness_goal || null,
            training_frequency: onboardingData.training_frequency || null,
            onboarding_completed: true,
            ...(consentGiven
              ? { accepted_terms: true, accepted_terms_at: new Date().toISOString() }
              : {}),
          })
          .eq('id', data.user.id);

        if (profileError) {
          console.warn('Profile update failed:', profileError.message);
        }

        if (consentGiven) {
          localStorage.removeItem('consent_given');
        }
      }

      const redirectTo = returnPath || '/';
      resetOnboarding();
      toast({ title: 'Account created!', description: 'Welcome to FiredogWorks.' });
      navigate(redirectTo);
    } catch (err: any) {
      toast({ title: 'Unexpected error', description: err.message || String(err), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <img src={firedogLogo} alt="FiredogWorks" className="w-32 h-32 mb-4 object-contain" />
      <h1 className="text-2xl font-bold mb-1">JOIN THE CREW</h1>
      <p className="text-muted-foreground text-sm mb-8">Start your training today.</p>

      {/* Show selected onboarding preferences */}
      {onboardingData.training_level && (
        <div className="w-full max-w-sm mb-6 rounded-xl bg-secondary border border-border p-3 space-y-1">
          <p className="text-xs text-muted-foreground">Your profile:</p>
          <p className="text-xs"><span className="text-primary font-semibold">{onboardingData.training_level}</span> · {onboardingData.fitness_goal} · {onboardingData.training_frequency}</p>
        </div>
      )}

      <div className="w-full max-w-sm">
        <GoogleSignInButton label="Sign up with Google" />
      </div>
      <AuthDivider />

      <form onSubmit={handleSignup} className="w-full max-w-sm space-y-4">
        <Input placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} className="bg-secondary border-border" required />
        <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-secondary border-border" required />
        <Input type="password" placeholder="Password (min 6 chars)" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-secondary border-border" minLength={6} required />
        <Button
          type="submit"
          disabled={loading}
          className="w-full gradient-fire text-primary-foreground font-display text-lg tracking-wide shadow-fire"
        >
          {loading ? 'CREATING...' : 'CREATE ACCOUNT'}
        </Button>
      </form>

      <p className="mt-6 text-sm text-muted-foreground">
        Already have an account?{' '}
        <button onClick={() => navigate('/login')} className="text-primary font-semibold">
          Sign In
        </button>
      </p>
    </div>
  );
};

export default SignupPage;
