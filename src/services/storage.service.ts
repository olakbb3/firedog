import { supabase } from '@/lib/supabaseClient';

export const StorageService = {
  async uploadAvatar(userId: string, file: File): Promise<string> {
    const path = `${userId}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true });
    if (error) {
      throw new Error('Avatar upload failed: ' + error.message);
    }
    return StorageService.getPublicUrl('avatars', path);
  },

  getPublicUrl(bucket: string, path: string): string {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  },
};
