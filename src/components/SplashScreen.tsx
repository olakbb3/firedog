import { useState, useEffect } from 'react';
import firedogLogo from '@/assets/firedogworks-logo.jpg';

const SplashScreen = ({ onComplete }: { onComplete: () => void }) => {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setFadeOut(true), 1800);
    const completeTimer = setTimeout(onComplete, 2300);
    return () => { clearTimeout(timer); clearTimeout(completeTimer); };
  }, [onComplete]);

  return (
    <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-background transition-opacity duration-500 ${fadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
      <div className="animate-pulse">
        <img src={firedogLogo} alt="FiredogWorks" className="w-40 h-40 object-contain" />
      </div>
      <h1 className="mt-6 text-3xl font-bold tracking-wider text-fire">FIREDOGWORKS</h1>
      <div className="mt-8 w-16 h-1 rounded-full gradient-fire animate-pulse" />
    </div>
  );
};

export default SplashScreen;
