import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useOnboarding } from '@/contexts/OnboardingContext';
import firedogLogo from '@/assets/firedog-logo.png';
import { ChevronRight, ChevronLeft } from 'lucide-react';

const steps = [
  {
    question: 'What is your current training level?',
    field: 'training_level' as const,
    options: ['Beginner', 'Intermediate', 'Advanced'],
  },
  {
    question: 'What are you training for?',
    field: 'fitness_goal' as const,
    options: ['Strength', 'Conditioning', 'Performance'],
  },
  {
    question: 'How many days per week do you train?',
    field: 'training_frequency' as const,
    options: ['3 days', '4 days', '5+ days'],
  },
];

const OnboardingPage = () => {
  const navigate = useNavigate();
  const { data, setField, pendingAction } = useOnboarding();
  const [step, setStep] = useState(0);
  const current = steps[step];
  const selectedValue = data[current.field];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      navigate('/consent');
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <img src={firedogLogo} alt="FiredogWorks" className="w-16 h-16 mb-6 object-contain" />

      {/* Pending action context */}
      {pendingAction && (
        <div className="mb-4 rounded-lg bg-primary/10 border border-primary/20 px-4 py-2">
          <p className="text-xs text-primary font-semibold text-center">
            Sign up to {pendingAction.toLowerCase()}
          </p>
        </div>
      )}

      {/* Progress dots */}
      <div className="flex gap-2 mb-8">
        {steps.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === step ? 'w-8 gradient-fire' : i < step ? 'w-4 bg-primary/50' : 'w-4 bg-secondary'
            }`}
          />
        ))}
      </div>

      <p className="text-xs text-muted-foreground mb-2 font-display tracking-widest">
        STEP {step + 1} OF {steps.length}
      </p>
      <h1 className="text-xl font-bold text-center mb-8">{current.question}</h1>

      <div className="w-full max-w-sm space-y-3">
        {current.options.map((option) => (
          <button
            key={option}
            onClick={() => setField(current.field, option)}
            className={`w-full rounded-xl border p-4 text-left text-sm font-semibold transition-all ${
              selectedValue === option
                ? 'border-primary bg-primary/10 text-foreground shadow-fire'
                : 'border-border bg-card text-muted-foreground hover:border-primary/50'
            }`}
          >
            {option}
          </button>
        ))}
      </div>

      <div className="mt-8 flex w-full max-w-sm gap-3">
        {step > 0 && (
          <Button
            variant="outline"
            onClick={() => setStep(step - 1)}
            className="border-border text-muted-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
        <Button
          onClick={handleNext}
          disabled={!selectedValue}
          className="flex-1 gradient-fire text-primary-foreground font-display text-lg tracking-wide shadow-fire disabled:opacity-40"
        >
          {step === steps.length - 1 ? 'CREATE ACCOUNT' : 'NEXT'}
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      <button
        onClick={() => navigate('/login')}
        className="mt-6 text-xs text-muted-foreground hover:text-foreground"
      >
        Already have an account? <span className="text-primary font-semibold">Sign In</span>
      </button>
    </div>
  );
};

export default OnboardingPage;
