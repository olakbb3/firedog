import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import firedogLogo from '@/assets/firedog-logo.png';

interface AuthPromptProps {
  title: string;
  description: string;
  /** Optional preview content rendered above the CTA (feature preview, stats grid, etc.) */
  preview?: ReactNode;
  primaryLabel?: string;
  secondaryLabel?: string;
}

/**
 * Guest-facing prompt rendered in place of user-scoped content.
 * IMPORTANT: This component never auto-navigates or redirects.
 * Navigation happens only via explicit user click on the CTAs.
 */
const AuthPrompt = ({
  title,
  description,
  preview,
  primaryLabel = 'CREATE FREE ACCOUNT',
  secondaryLabel = 'Already have an account? Sign in',
}: AuthPromptProps) => {
  const navigate = useNavigate();

  return (
    <div className="px-4 pt-6 pb-4 max-w-lg mx-auto">
      <div className="flex flex-col items-center text-center mb-6">
        <img src={firedogLogo} alt="FiredogWorks" className="w-16 h-16 object-contain mb-4 opacity-80" />
        <h1 className="text-xl font-bold mb-2">{title}</h1>
        <p className="text-sm text-muted-foreground mb-6 max-w-xs">{description}</p>
      </div>

      {preview && (
        <div className="mb-6 opacity-70 pointer-events-none select-none" aria-hidden="true">
          {preview}
        </div>
      )}

      <div className="flex flex-col items-center">
        <Button className="font-display" onClick={() => navigate('/onboarding')}>
          {primaryLabel}
        </Button>
        <button
          onClick={() => navigate('/login')}
          className="mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {secondaryLabel}
        </button>
      </div>
    </div>
  );
};

export default AuthPrompt;
