import { useNavigate } from 'react-router-dom';
import { Flame, Dumbbell, Trophy, BookOpen, Settings, LogOut, Shield, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { mockUser, mockPrograms } from '@/data/mockData';
import firedogLogo from '@/assets/firedogworks-logo.png';

const ProfilePage = () => {
  const navigate = useNavigate();
  const purchasedPrograms = mockPrograms.filter(p => p.is_purchased);

  return (
    <div className="px-4 pt-6 pb-4 max-w-lg mx-auto">
      {/* Profile Header */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-20 h-20 rounded-full gradient-fire flex items-center justify-center text-primary-foreground font-display text-2xl font-bold shadow-fire mb-3">
          {mockUser.name.charAt(0)}
        </div>
        <h1 className="text-xl font-bold">{mockUser.name}</h1>
        <p className="text-sm text-muted-foreground">{mockUser.email}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="rounded-xl bg-card border border-border p-3 text-center shadow-card">
          <Dumbbell className="h-4 w-4 mx-auto text-primary mb-1" />
          <p className="text-lg font-bold">{mockUser.completed_workouts}</p>
          <p className="text-[10px] text-muted-foreground">Workouts</p>
        </div>
        <div className="rounded-xl bg-card border border-border p-3 text-center shadow-card">
          <Flame className="h-4 w-4 mx-auto text-accent mb-1" />
          <p className="text-lg font-bold">{mockUser.points}</p>
          <p className="text-[10px] text-muted-foreground">Points</p>
        </div>
        <div className="rounded-xl bg-card border border-border p-3 text-center shadow-card">
          <Trophy className="h-4 w-4 mx-auto text-fire-yellow mb-1" />
          <p className="text-lg font-bold">#3</p>
          <p className="text-[10px] text-muted-foreground">Rank</p>
        </div>
      </div>

      {/* Purchased Programs */}
      <div className="mb-6">
        <h2 className="text-sm font-bold font-display mb-3">MY PROGRAMS</h2>
        {purchasedPrograms.length > 0 ? (
          <div className="space-y-2">
            {purchasedPrograms.map(p => (
              <div key={p.id} className="rounded-xl bg-card border border-border p-4 flex items-center justify-between shadow-card">
                <div className="flex items-center gap-3">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-sm">{p.title}</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No programs purchased yet.</p>
        )}
      </div>

      {/* Menu Items */}
      <div className="space-y-2 mb-6">
        <button
          onClick={() => navigate('/admin')}
          className="w-full rounded-xl bg-card border border-border p-4 flex items-center gap-3 shadow-card hover:border-primary/50 transition-colors"
        >
          <Shield className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">Admin Dashboard</span>
          <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
        </button>
      </div>

      <Button variant="outline" className="w-full border-border text-muted-foreground hover:text-foreground font-display" onClick={() => navigate('/login')}>
        <LogOut className="h-4 w-4 mr-2" />
        SIGN OUT
      </Button>

      {/* Branding */}
      <div className="mt-8 flex flex-col items-center opacity-40">
        <img src={firedogLogo} alt="FiredogWorks" className="w-8 h-8 object-contain" />
        <p className="text-[10px] text-muted-foreground mt-1">FiredogWorks</p>
      </div>
    </div>
  );
};

export default ProfilePage;
