import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import firedogLogo from '@/assets/firedogworks-logo.png';

const SignupPage = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    navigate('/');
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <img src={firedogLogo} alt="FiredogWorks" className="w-24 h-24 mb-4 object-contain" />
      <h1 className="text-2xl font-bold mb-1">JOIN THE CREW</h1>
      <p className="text-muted-foreground text-sm mb-8">Start your training today.</p>

      <form onSubmit={handleSignup} className="w-full max-w-sm space-y-4">
        <Input placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} className="bg-secondary border-border" />
        <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-secondary border-border" />
        <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-secondary border-border" />
        <Button type="submit" className="w-full gradient-fire text-primary-foreground font-display text-lg tracking-wide shadow-fire">
          CREATE ACCOUNT
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
