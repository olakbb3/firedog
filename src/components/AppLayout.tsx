import { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Dumbbell, Trophy, BookOpen, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const navItems = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/progress', icon: Dumbbell, label: 'Progress' },
  { path: '/leaderboard', icon: Trophy, label: 'Board' },
  { path: '/programs', icon: BookOpen, label: 'Programs' },
  { path: '/profile', icon: User, label: 'Profile' },
];

const AppLayout = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Hide nav on auth/splash/admin/onboarding pages
  const hideNav = ['/login', '/signup', '/onboarding', '/consent'].includes(location.pathname) || location.pathname.startsWith('/admin');

  const displayNavItems = navItems;

  return (
    <div className="min-h-screen bg-background">
      <div className={`${hideNav ? '' : 'pb-20'}`}>
        {children}
      </div>
      {!hideNav && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur-lg safe-bottom">
          <div className="mx-auto flex max-w-lg items-center justify-around py-2">
            {displayNavItems.map(({ path, icon: Icon, label }) => {
              const active = location.pathname === path;
              return (
                <button
                  key={path}
                  onClick={() => navigate(path)}
                  className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors ${
                    active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-[10px] font-medium">{label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
};

export default AppLayout;
