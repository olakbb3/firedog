import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabaseClient';
import { toast } from '@/hooks/use-toast';
import { setPreferredUnit, type UnitSystem } from '@/lib/units';

export interface AthleteProfileFields {
  weight_lbs: number | null;
  height_inches: number | null;
  gym_affiliation: string | null;
  fd_affiliation: string | null;
  fd_career_volunteer: string | null;
  fd_rank: string | null;
  preferred_unit?: UnitSystem;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  initial: AthleteProfileFields;
  onSaved: (fields: AthleteProfileFields) => void;
}

const EditProfileModal = ({ open, onOpenChange, userId, initial, onSaved }: Props) => {
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [gym, setGym] = useState('');
  const [fd, setFd] = useState('');
  const [careerVol, setCareerVol] = useState<string>('');
  const [rank, setRank] = useState('');
  const [unit, setUnit] = useState<UnitSystem>('imperial');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setWeight(initial.weight_lbs?.toString() ?? '');
      setHeight(initial.height_inches?.toString() ?? '');
      setGym(initial.gym_affiliation ?? '');
      setFd(initial.fd_affiliation ?? '');
      setCareerVol(initial.fd_career_volunteer ?? '');
      setRank(initial.fd_rank ?? '');
      setUnit((initial.preferred_unit as UnitSystem) || 'imperial');
    }
  }, [open, initial]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const parsedWeight = weight.trim() ? parseInt(weight, 10) : null;
      const parsedHeight = height.trim() ? parseInt(height, 10) : null;

      if (weight.trim() && (isNaN(parsedWeight!) || parsedWeight! < 1 || parsedWeight! > 999)) {
        toast({ title: 'Invalid weight', description: 'Enter a value between 1 and 999.', variant: 'destructive' });
        setSaving(false);
        return;
      }
      if (height.trim() && (isNaN(parsedHeight!) || parsedHeight! < 1 || parsedHeight! > 108)) {
        toast({ title: 'Invalid height', description: 'Enter inches between 1 and 108.', variant: 'destructive' });
        setSaving(false);
        return;
      }

      const payload: AthleteProfileFields = {
        weight_lbs: parsedWeight,
        height_inches: parsedHeight,
        gym_affiliation: gym.trim() || null,
        fd_affiliation: fd.trim() || null,
        fd_career_volunteer: careerVol || null,
        fd_rank: rank.trim() || null,
        preferred_unit: unit,
      };

      let { error } = await supabase.from('profiles').update(payload as any).eq('id', userId);
      // If preferred_unit column hasn't been migrated yet, retry without it
      // so the rest of the profile still saves cleanly.
      if (error && /preferred_unit/i.test(error.message || '')) {
        const { preferred_unit, ...rest } = payload;
        const retry = await supabase.from('profiles').update(rest as any).eq('id', userId);
        error = retry.error;
      }
      if (error) throw error;

      // Broadcast unit change so dependent components re-render immediately.
      setPreferredUnit(unit);

      onSaved(payload);
      toast({ title: 'Profile updated' });
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>Update your athlete details.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Units</Label>
            <Select value={unit} onValueChange={(v) => setUnit(v as UnitSystem)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="imperial">Imperial (lbs, in)</SelectItem>
                <SelectItem value="metric">Metric (kg, cm)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="weight">Weight (lbs)</Label>
              <Input id="weight" type="number" inputMode="numeric" placeholder="185" value={weight} onChange={(e) => setWeight(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="height">Height (inches)</Label>
              <Input id="height" type="number" inputMode="numeric" placeholder="72" value={height} onChange={(e) => setHeight(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="gym">Gym Affiliation</Label>
            <Input id="gym" placeholder="CrossFit Firedog" value={gym} onChange={(e) => setGym(e.target.value)} maxLength={100} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fd">Fire Department Affiliation</Label>
            <Input id="fd" placeholder="Engine 21" value={fd} onChange={(e) => setFd(e.target.value)} maxLength={100} />
          </div>

          <div className="space-y-1.5">
            <Label>Career / Volunteer</Label>
            <Select value={careerVol} onValueChange={setCareerVol}>
              <SelectTrigger>
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Career">Career</SelectItem>
                <SelectItem value="Volunteer">Volunteer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rank">Rank</Label>
            <Input id="rank" placeholder="Lieutenant" value={rank} onChange={(e) => setRank(e.target.value)} maxLength={50} />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditProfileModal;
