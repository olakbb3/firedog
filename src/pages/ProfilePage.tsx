import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, Dumbbell, Trophy, BookOpen, LogOut, Shield, ChevronRight, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { toast } from '@/hooks/use-toast';
import firedogLogo from '@/assets/firedog-logo.png';

interface ProfileData {
  full_name: string | null;
  points: number;
  completed_workouts: number;
  avatar_url: string | null;
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
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      const [profileRes, programsRes] = await Promise.all([
        supabase.from('profiles').select('full_name, points, completed_workouts, avatar_url').eq('id', user.id).maybeSingle(),
        supabase.from('programs').select('id, title').limit(10),
      ]);
      if (profileRes.data) setProfile(profileRes.data);
      if (programsRes.data) setPrograms(programsRes.data);
    };

    fetchProfile();
  }, [user]);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : prev);
      toast({ title: 'Avatar updated!' });
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const displayName = profile?.full_name || user?.user_metadata?.full_name || 'Athlete';

  return (
    <div className="px-4 pt-6 pb-4 max-w-lg mx-auto">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleAvatarUpload}
      />

      {/* Profile Header */}
      <div className="flex flex-col items-center mb-8">
        <button
          onClick={handleAvatarClick}
          disabled={uploading}
          className="relative w-20 h-20 rounded-full gradient-fire flex items-center justify-center text-primary-foreground font-display text-2xl font-bold shadow-fire mb-3 overflow-hidden group cursor-pointer disabled:opacity-60"
        >
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            displayName.charAt(0)
          )}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Camera className="h-5 w-5 text-white" />
          </div>
        </button>
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
