import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import firedogLogo from '@/assets/firedog-logo.png';

const ConsentPage = () => {
  const navigate = useNavigate();
  const { user, setAcceptedTerms } = useAuth();
  const { toast } = useToast();
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    if (!agreed) return;
    setLoading(true);

    try {
      if (user) {
        // Logged-in user: persist to DB and update local state
        const { error } = await supabase
          .from('profiles')
          .update({
            accepted_terms: true,
            accepted_terms_at: new Date().toISOString(),
          })
          .eq('id', user.id);

        if (error) {
          toast({ title: 'Error', description: 'Could not save consent. Please try again.', variant: 'destructive' });
          return;
        }

        setAcceptedTerms(true);
        navigate('/');
      } else {
        // Pre-signup: store in localStorage as fallback
        localStorage.setItem('consent_given', 'true');
        navigate('/signup');
      }
    } catch {
      toast({ title: 'Error', description: 'Something went wrong.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-10">
      <img src={firedogLogo} alt="FiredogWorks" className="w-16 h-16 mb-6 object-contain" />

      <h1 className="text-xl font-bold mb-1 font-display tracking-wide">TRAINING WAIVER</h1>
      <p className="text-xs text-muted-foreground mb-6">Please read and accept before continuing</p>

      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-1">
        <ScrollArea className="h-64 px-4 py-3">
          <div className="space-y-4 text-xs text-muted-foreground leading-relaxed">
            <p className="font-semibold text-foreground">Assumption of Risk & Liability Waiver</p>

            <p>
              By participating in any training program, workout, or physical activity provided by
              FiredogWorks, you acknowledge and agree to the following:
            </p>

            <p className="font-semibold text-foreground">1. Voluntary Participation</p>
            <p>
              Your participation in all training activities is entirely voluntary. You are free to
              discontinue participation at any time.
            </p>

            <p className="font-semibold text-foreground">2. Medical Clearance</p>
            <p>
              You confirm that you are in good physical health and have obtained medical clearance
              from a qualified physician to engage in strenuous physical exercise. If you have any
              known medical conditions, injuries, or limitations, you agree to consult your
              healthcare provider before beginning any program.
            </p>

            <p className="font-semibold text-foreground">3. Assumption of Risk</p>
            <p>
              You understand that physical exercise carries inherent risks including, but not limited
              to, muscle strains, sprains, fractures, cardiovascular events, and other injuries. You
              voluntarily assume all risks associated with your participation.
            </p>

            <p className="font-semibold text-foreground">4. Release of Liability</p>
            <p>
              You hereby release, waive, and discharge FiredogWorks, its coaches, trainers,
              affiliates, and representatives from any and all liability, claims, or demands arising
              from your participation in training activities, except in cases of gross negligence or
              willful misconduct.
            </p>

            <p className="font-semibold text-foreground">5. Personal Responsibility</p>
            <p>
              You accept full responsibility for monitoring your own physical condition during
              training. You agree to stop exercising immediately if you experience pain, dizziness,
              or discomfort.
            </p>
          </div>
        </ScrollArea>
      </div>

      <label className="mt-6 flex items-start gap-3 w-full max-w-sm cursor-pointer">
        <Checkbox
          checked={agreed}
          onCheckedChange={(checked) => setAgreed(checked === true)}
          className="mt-0.5"
        />
        <span className="text-xs text-muted-foreground leading-snug">
          I have read and agree to the training waiver
        </span>
      </label>

      <Button
        onClick={handleContinue}
        disabled={!agreed || loading}
        className="mt-6 w-full max-w-sm gradient-fire text-primary-foreground font-display text-lg tracking-wide shadow-fire disabled:opacity-40"
      >
        {loading ? 'SAVING...' : 'CONTINUE'}
      </Button>
    </div>
  );
};

export default ConsentPage;
