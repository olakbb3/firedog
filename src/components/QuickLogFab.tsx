import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import FreestyleLogModal from './FreestyleLogModal';

interface Props {
  onLogged?: () => void;
}

export default function QuickLogFab({ onLogged }: Props) {
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
        className="fixed bottom-24 right-6 z-[9999] flex items-center gap-2 rounded-full bg-primary text-primary-foreground shadow-fire px-4 py-3 font-display text-sm font-bold tracking-wider hover:opacity-90 active:scale-95 transition safe-bottom"
      >
        <Plus className="h-5 w-5" />
        LOG WORKOUT
      </button>
      {user && (
        <FreestyleLogModal open={open} onOpenChange={setOpen} onLogged={onLogged} />
      )}
    </>
  );
}
