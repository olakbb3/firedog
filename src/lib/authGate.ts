import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export type AuthAction =
  | 'log_workout'
  | 'submit_score'
  | 'view_premium'
  | 'purchase_program';

/**
 * Centralized auth gate.
 * Use `requireAuth(action, callback)` before any user-only action.
 * If the user is signed in, the callback runs.
 * Otherwise, navigates to /onboarding with the action context.
 */
export function useAuthGate() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const requireAuth = (action: AuthAction, callback?: () => void): boolean => {
    if (user) {
      try {
        callback?.();
      } catch (e) {
        console.error('Auth action failed:', e);
      }
      return true;
    }
    navigate('/onboarding', { state: { action } });
    return false;
  };

  return { requireAuth, isAuthenticated: !!user };
}
