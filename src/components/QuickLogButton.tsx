import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Lock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import FreestyleLogModal from './FreestyleLogModal';

interface Props {
  onLogged?: () => void;
  isPremium?: boolean;
}

export default function QuickLogButton({ onLogged, isPremium = true }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleClick = () => {
    if (!user) {
      navigate('/onboarding');
      return;
    }
    setOpen(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        aria-label="Log workout"
        className="w-full rounded-xl py-4 flex items-center justify-center gap-2 font-bold transition-transform active:scale-95 shadow-md bg-primary text-primary-foreground font-display tracking-wider"
      >
        {isPremium ? <Plus className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
        LOG WORKOUT
        {!isPremium && (
          <span className="ml-1 rounded-full bg-primary-foreground/20 px-2 py-0.5 text-[10px] font-bold tracking-wider">
            PRO
          </span>
        )}
      </button>
      {user && (
        <FreestyleLogModal open={open} onOpenChange={setOpen} onLogged={onLogged} />
      )}
    </>
  );
}
