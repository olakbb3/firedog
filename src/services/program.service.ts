import { supabase } from '@/lib/supabaseClient';

/**
 * ProgramService — centralized data access for `programs` and `user_programs`.
 */

const TABLE_PROGRAMS = 'programs';
const TABLE_USER_PROGRAMS = 'user_programs';
const TABLE_PENDING_PURCHASES = 'pending_purchases';

export const ProgramService = {
  async getPublicPrograms() {
    const { data, error } = await supabase
      .from(TABLE_PROGRAMS)
      .select('id, title, description, sku, store_link, image_url, is_free')
      .order('is_free', { ascending: false });
    return { data, error };
  },

  async getProgramDetail(programId: string) {
    const { data, error } = await supabase
      .from(TABLE_PROGRAMS)
      .select('id, title, description, sku, is_free')
      .eq('id', programId)
      .maybeSingle();
    return { data, error };
  },

  async getProgramBySku(sku: string) {
    const { data, error } = await supabase
      .from(TABLE_PROGRAMS)
      .select('id, title')
      .eq('sku', sku)
      .maybeSingle();
    return { data, error };
  },

  async getProgramsBySkus(skus: string[]) {
    const { data, error } = await supabase
      .from(TABLE_PROGRAMS)
      .select('id, title')
      .in('sku', skus);
    return { data, error };
  },

  async getUserEntitlements(userId: string) {
    const { data, error } = await supabase
      .from(TABLE_USER_PROGRAMS)
      .select('program_sku')
      .eq('user_id', userId);
    return { data, error };
  },

  async checkProgramOwnership(userId: string, programSku: string) {
    const { data, error } = await supabase
      .from(TABLE_USER_PROGRAMS)
      .select('id')
      .eq('user_id', userId)
      .eq('program_sku', programSku)
      .maybeSingle();
    return { data, error };
  },

  async getPendingPurchasesForEmail(email: string) {
    const { data, error } = await supabase
      .from(TABLE_PENDING_PURCHASES)
      .select('id, program_sku')
      .eq('processed', false)
      .ilike('email', email.toLowerCase());
    return { data, error };
  },

  async upsertClaimedEntitlement(userId: string, programSku: string) {
    const { data, error } = await supabase
      .from(TABLE_USER_PROGRAMS)
      .upsert(
        { user_id: userId, program_sku: programSku, source: 'auto_claim' },
        { onConflict: 'user_id,program_sku' },
      );
    return { data, error };
  },

  async markPendingPurchaseProcessed(pendingId: string) {
    const { data, error } = await supabase
      .from(TABLE_PENDING_PURCHASES)
      .update({ processed: true })
      .eq('id', pendingId);
    return { data, error };
  },
};
