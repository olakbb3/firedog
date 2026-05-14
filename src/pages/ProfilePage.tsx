import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Flame, Dumbbell, Trophy, BookOpen, LogOut, Shield, ChevronRight, Camera, Pencil, FileText, ExternalLink, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { ProgramService } from '@/services/program.service';
import { toast } from '@/hooks/use-toast';
import firedogLogo from '@/assets/firedog-logo.png';
import EditProfileModal, { AthleteProfileFields } from '@/components/EditProfileModal';
import AuthPrompt from '@/components/AuthPrompt';
import ErrorState from '@/components/ErrorState';
import PointsGuideModal from '@/components/PointsGuideModal';
import { useUnitPreference, convertWeight, convertHeight, type UnitSystem } from '@/lib/units';
import { Skeleton } from '@/components/ui/skeleton';
import { displayLiftName, normalizeLift } from '@/components/PerLiftLeaderboard';

interface ProfileData {
  full_name: string | null;
  points: number;
  completed_workouts: number;
  avatar_url: string | null;
  weight_lbs: number | null;
  height_inches: number | null;
  gym_affiliation: string | null;
  fd_affiliation: string | null;
  fd_career_volunteer: string | null;
  fd_rank: string | null;
  rank: string | null;
  preferred_unit: UnitSystem | null;
}

interface ProgramRow {
  id: string;
  title: string;
}

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, role, signOut } = useAuth();
  const unit = useUnitPreference(user?.id);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [programs, setPrograms] = useState<ProgramRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [leaderBadgeLoading, setLeaderBadgeLoading] = useState(false);
  const [leaderBadge, setLeaderBadge] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const fetchProfileData = async () => {
      setError(null);
      setLeaderBadgeLoading(true);
      try {
        const baseCols = 'full_name, points, completed_workouts, avatar_url, weight_lbs, height_inches, gym_affiliation, fd_affiliation, fd_career_volunteer, fd_rank, rank';
        const today = new Date();
        const todayStr = today.toLocaleDateString('en-CA');
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toLocaleDateString('en-CA');
        const fetchProfile = async () => {
          let profileRes = await supabase
            .from('profiles')
            .select(`${baseCols}, preferred_unit`)
            .eq('id', user.id)
            .maybeSingle();
          if (profileRes.error && /preferred_unit/i.test(profileRes.error.message || '')) {
            profileRes = await supabase
              .from('profiles')
              .select(baseCols)
              .eq('id', user.id)
              .maybeSingle();
          }
          return profileRes;
        };

        const [profileRes, enrolledRes, freeWodRes, challengeRes] = await Promise.all([
          fetchProfile(),
          ProgramService.getUserEntitlements(user.id),
          supabase.from('programs').select('id, title').eq('sku', 'FREE_WOD').maybeSingle(),
          supabase
            .from('challenges')
            .select('id, start_date')
            .eq('title', 'FIREDOG TOTAL')
            .lte('start_date', monthStart)
            .gte('end_date', todayStr)
            .order('start_date', { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);

        if (cancelled) return;
        if (profileRes.error) throw profileRes.error;
        if (profileRes.data) setProfile(profileRes.data as ProfileData);

        let activePrograms: ProgramRow[] = [];
        const enrolledSkus = (enrolledRes.data || []).map(r => r.program_sku).filter(Boolean);
        if (enrolledSkus.length > 0) {
          const { data } = await supabase.from('programs').select('id, title').in('sku', enrolledSkus);
          if (data) activePrograms = data;
        }

        if (freeWodRes.data && !activePrograms.some(p => p.id === freeWodRes.data!.id)) {
          activePrograms.push(freeWodRes.data);
        }

        if (!cancelled) setPrograms(activePrograms);

        const challenge = challengeRes.data;
        if (!challenge) {
          if (!cancelled) { setLeaderBadge(null); }
          return;
        }
        const [sectionsRes, logsRes] = await Promise.all([
          supabase.from('workout_sections').select('id, section_name').eq('workout_id', challenge.id),
          supabase.rpc('get_leaderboard_logs', {
            _workout_id: challenge.id,
            _section_id: null,
            _from: null,
            _to: null,
            _weight_only: true,
          }),
        ]);
        if (cancelled) return;
        const sectionMap = new Map(((sectionsRes.data as any[]) || []).map(s => [s.id, s.section_name]));
        const groups = new Map<string, any[]>();
        ((logsRes.data as any[]) || []).forEach(log => {
          const name = sectionMap.get(log.workout_section_id) || log.workout_section_id;
          const key = normalizeLift(String(name || ''));
          if (!key) return;
          if (!groups.has(key)) groups.set(key, []);
          groups.get(key)!.push(log);
        });
        let badge: string | null = null;
        groups.forEach((rawLogs, liftName) => {
          if (badge) return;
          const userMax = new Map<string, number>();
          rawLogs.forEach(log => userMax.set(log.user_id, Math.max(userMax.get(log.user_id) || 0, log.weight || 0)));
          const ranked = Array.from(userMax.entries()).sort((a, b) => b[1] - a[1]);
          if (ranked[0]?.[0] === user.id) {
            const label = new Date(`${challenge.start_date}T00:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            badge = `🔥 ${displayLiftName(liftName)} Leader — ${label}`;
          }
        });
        if (!cancelled) setLeaderBadge(badge);
      } catch (err: any) {
        if (!cancelled) {
          console.error('ProfilePage fetch error:', err);
          setError(err?.message || 'Unable to load data.');
        }
      } finally {
        if (!cancelled) setLeaderBadgeLoading(false);
      }
    };
    fetchProfileData();
    return () => { cancelled = true; };
  }, [user, reloadTick]);

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

  if (user && error) {
    return <ErrorState message={error} onRetry={() => { setError(null); setReloadTick((t) => t + 1); }} />;
  }

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

        {(profile?.gym_affiliation || profile?.fd_affiliation) && (
          <div className="flex flex-wrap justify-center gap-2 mt-3">
            {profile?.gym_affiliation && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground">
                🏋️ {profile.gym_affiliation}
              </span>
            )}
            {profile?.fd_affiliation && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground">
                🚒 {profile.fd_affiliation}{profile.fd_career_volunteer ? ` - ${profile.fd_career_volunteer}` : ''}
              </span>
            )}
          </div>
        )}

        {(() => {
          const rankLabels: Record<string, string> = {
            Chief: '💎 Chief',
            Captain: '⭐ Captain',
            'Senior Firefighter': '🔥 Senior Firefighter',
            Firefighter: '🚒 Firefighter',
            Recruit: '🔰 Recruit',
          };
          const stats = [
            profile?.weight_lbs ? convertWeight(profile.weight_lbs, unit) : null,
            profile?.height_inches ? convertHeight(profile.height_inches, unit) : null,
            profile?.fd_rank || null,
            profile?.rank ? rankLabels[profile.rank] || profile.rank : null,
          ].filter(Boolean);
          return stats.length > 0 ? (
            <p className="text-xs text-muted-foreground mt-2">{stats.join(' • ')}</p>
          ) : null;
        })()}

        {leaderBadgeLoading ? (
          <Skeleton className="mt-3 h-7 w-56 rounded-full" />
        ) : leaderBadge ? (
          <span className="mt-3 max-w-full rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary truncate">
            {leaderBadge}
          </span>
        ) : null}

        <Button
          variant="outline"
          size="sm"
          className="mt-4 font-display"
          onClick={() => setEditOpen(true)}
        >
          <Pencil className="h-3.5 w-3.5 mr-1.5" />
          EDIT PROFILE
        </Button>
      </div>

      {user && profile && (
        <EditProfileModal
          open={editOpen}
          onOpenChange={setEditOpen}
          userId={user.id}
          initial={{
            weight_lbs: profile.weight_lbs,
            height_inches: profile.height_inches,
            gym_affiliation: profile.gym_affiliation,
            fd_affiliation: profile.fd_affiliation,
            fd_career_volunteer: profile.fd_career_volunteer,
            fd_rank: profile.fd_rank,
            preferred_unit: (profile.preferred_unit as UnitSystem) || 'imperial',
          }}
          onSaved={(fields) => setProfile(prev => prev ? { ...prev, ...fields } : prev)}
        />
      )}

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
          <p className="text-lg font-bold">{profile?.rank || '—'}</p>
          <p className="text-[10px] text-muted-foreground">Rank</p>
        </div>
      </div>
      <div className="-mt-3 mb-6 flex justify-end">
        <PointsGuideModal points={profile?.points ?? 0} rank={profile?.rank}>
          <button
            type="button"
            className="text-xs text-muted-foreground hover:text-foreground hover:underline transition-colors"
          >
            ℹ️ How Points Work
          </button>
        </PointsGuideModal>
      </div>

      {/* Programs */}
      {programs.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-bold font-display mb-3">MY ACTIVE TRAINING</h2>
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

      {/* Empty state when no active programs */}
      {programs.length === 0 && (
        <div className="mb-6 text-center py-6">
          <p className="text-sm text-muted-foreground mb-3">You haven't started a training track yet.</p>
          <Button variant="outline" className="font-display" onClick={() => navigate('/programs')}>
            BROWSE PROGRAMS
          </Button>
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

      {/* Legal & Privacy */}
      <div className="space-y-2 mb-6">
        <h2 className="text-sm font-bold font-display mb-3">LEGAL & PRIVACY</h2>
        <a
          href="https://firedogworks.store/pages/app-terms-and-conditions"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full rounded-xl bg-card border border-border p-4 flex items-center gap-3 shadow-card hover:border-primary/50 transition-colors"
        >
          <FileText className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">Terms and Conditions</span>
          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground ml-auto" />
        </a>
        <a
          href="https://firedogworks.store/pages/app-privacy-policy"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full rounded-xl bg-card border border-border p-4 flex items-center gap-3 shadow-card hover:border-primary/50 transition-colors"
        >
          <Shield className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm">Privacy Policy</span>
          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground ml-auto" />
        </a>
        <a
          href="https://firedogworks.store/pages/account-deletion-request"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full rounded-xl bg-card border border-border p-4 flex items-center gap-3 shadow-card hover:border-destructive/30 transition-colors"
        >
          <Trash2 className="h-4 w-4 text-destructive/70" />
          <span className="font-semibold text-sm text-destructive/70">Delete Account Data</span>
          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground ml-auto" />
        </a>
      </div>

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
