import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, Dumbbell, Trophy, BookOpen, LogOut, Shield, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import firedogLogo from '@/assets/firedog-logo.png';

interface ProfileData {
  full_name: string | null;
  points: number;
  completed_workouts: number;
}

interface ProgramRow {
  id: string;
  title: string;
}

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, role, signOut } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [programs, setPrograms] = useState<ProgramRow[]>([]);

  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      const [profileRes, programsRes] = await Promise.all([
        supabase.from('profiles').select('full_name, points, completed_workouts').eq('id', user.id).maybeSingle(),
        supabase.from('programs').select('id, title').limit(10),
      ]);
      if (profileRes.data) setProfile(profileRes.data);
      if (programsRes.data) setPrograms(programsRes.data);
    };

    fetchProfile();
  }, [user]);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const displayName = profile?.full_name || user?.user_metadata?.full_name || 'Athlete';

  return (
    <div className="px-4 pt-6 pb-4 max-w-lg mx-auto">
      {/* Profile Header */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-20 h-20 rounded-full gradient-fire flex items-center justify-center text-primary-foreground font-display text-2xl font-bold shadow-fire mb-3">
          {displayName.charAt(0)}
        </div>
        <h1 className="text-xl font-bold">{displayName}</h1>
        <p className="text-sm text-muted-foreground">{user?.email}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="rounded-xl bg-card border border-border p-3 text-center shadow-card">
          <Dumbbell className="h-4 w-4 mx-auto text-primary mb-1" />
          <p className="text-lg font-bold">{profile?.completed_workouts ?? 0}</p>
          <p className="text-[10px] text-muted-foreground">Workouts</p>
        </div>
        <div className="rounded-xl bg-card border border-border p-3 text-center shadow-card">
          <Flame className="h-4 w-4 mx-auto text-accent mb-1" />
          <p className="text-lg font-bold">{profile?.points ?? 0}</p>
          <p className="text-[10px] text-muted-foreground">Points</p>
        </div>
        <div className="rounded-xl bg-card border border-border p-3 text-center shadow-card">
          <Trophy className="h-4 w-4 mx-auto text-fire-yellow mb-1" />
          <p className="text-lg font-bold">—</p>
          <p className="text-[10px] text-muted-foreground">Rank</p>
        </div>
      </div>

      {/* Programs */}
      {programs.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-bold font-display mb-3">PROGRAMS</h2>
          <div className="space-y-2">
            {programs.map(p => (
              <div key={p.id} className="rounded-xl bg-card border border-border p-4 flex items-center justify-between shadow-card">
                <div className="flex items-center gap-3">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <span className="font-semibold text-sm">{p.title}</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Admin button - only visible to admins */}
      {role === 'admin' && (
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
      )}

      <Button variant="outline" className="w-full border-border text-muted-foreground hover:text-foreground font-display" onClick={handleLogout}>
        <LogOut className="h-4 w-4 mr-2" />
        SIGN OUT
      </Button>

      <div className="mt-8 flex flex-col items-center opacity-40 space-y-1">
        <img src={firedogLogo} alt="FiredogWorks" className="w-10 h-10 object-contain" />
        <p className="text-[10px] text-muted-foreground">© FiredogWorks</p>
        <div className="flex gap-3">
          <button className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">Privacy Policy</button>
          <button className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">Terms of Service</button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
