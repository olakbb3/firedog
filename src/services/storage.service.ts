import { supabase } from '@/lib/supabaseClient';

export const StorageService = {
  async uploadAvatar(
    userId: string,
    file: File
  ): Promise<{ data: string | null; error: any | null }> {
    try {
      const path = `${userId}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true });
      if (error) {
        return { data: null, error };
      }
      return { data: StorageService.getPublicUrl('avatars', path), error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  },

  getPublicUrl(bucket: string, path: string): string {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  },
};
