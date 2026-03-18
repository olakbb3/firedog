import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { useToast } from '@/hooks/use-toast';

export const useAuthGate = () => {
  const { user } = useAuth();
  const { setPendingAction } = useOnboarding();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  /**
   * Call before any auth-required action.
   * Returns true if user is authenticated and action can proceed.
   * Returns false if user is a guest — triggers onboarding flow.
   */
  const requireAuth = (actionLabel: string): boolean => {
    if (user) return true;

    toast({
      title: 'Account Required',
      description: `Sign up to ${actionLabel.toLowerCase()}.`,
    });

    setPendingAction(actionLabel, location.pathname);
    navigate('/onboarding');
    return false;
  };

  return { requireAuth, isGuest: !user };
};
