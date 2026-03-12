import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import firedogLogo from '@/assets/firedogworks-logo.png';

const LoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock login — navigate to home
    navigate('/');
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <img src={firedogLogo} alt="FiredogWorks" className="w-24 h-24 mb-4 object-contain" />
      <h1 className="text-2xl font-bold mb-1">WELCOME BACK</h1>
      <p className="text-muted-foreground text-sm mb-8">Train hard. Stay ready.</p>

      <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4">
        <Input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="bg-secondary border-border"
        />
        <Input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="bg-secondary border-border"
        />
        <Button type="submit" className="w-full gradient-fire text-primary-foreground font-display text-lg tracking-wide shadow-fire">
          SIGN IN
        </Button>
      </form>

      <p className="mt-6 text-sm text-muted-foreground">
        Don't have an account?{' '}
        <button onClick={() => navigate('/signup')} className="text-primary font-semibold">
          Sign Up
        </button>
      </p>
    </div>
  );
};

export default LoginPage;
