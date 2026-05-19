import { supabase } from '@/lib/supabaseClient';

/**
 * ProgramService — centralized data access for `programs` and `user_programs`.
 *
 * Scope:
 * - Public program retrieval
 * - Entitlement queries (ownership, user programs)
 * - Pending purchase claim DB ops
 *
 * Out of scope: auth lifecycle, admin writes, workouts/sections/exercises/logs.
 */

const TABLE_PROGRAMS = 'programs';
const TABLE_USER_PROGRAMS = 'user_programs';
const TABLE_PENDING_PURCHASES = 'pending_purchases';

export const ProgramService = {
  // ─── PUBLIC PROGRAM RETRIEVAL ─────────────────────────────────────────────

  /**
   * Returns all programs for the public Programs catalog.
   * Used by: ProgramsPage. Free programs first.
   */
  getPublicPrograms() {
    return supabase
      .from(TABLE_PROGRAMS)
      .select('id, title, description, sku, store_link, image_url, is_free')
      .order('is_free', { ascending: false });
  },

  /**
   * Fetches a single program by id (UUID route param).
   * Used by: ProgramDetailPage.
   */
  getProgramDetail(programId: string) {
    return supabase
      .from(TABLE_PROGRAMS)
      .select('id, title, description, sku, is_free')
      .eq('id', programId)
      .maybeSingle();
  },

  /**
   * Fetches a single program by SKU.
   * Used by: ProfilePage (FREE_WOD lookup).
   */
  getProgramBySku(sku: string) {
    return supabase
      .from(TABLE_PROGRAMS)
      .select('id, title')
      .eq('sku', sku)
      .maybeSingle();
  },

  /**
   * Fetches all programs matching the given SKUs.
   * Used by: ProfilePage (enrolled programs).
   */
  getProgramsBySkus(skus: string[]) {
    return supabase
      .from(TABLE_PROGRAMS)
      .select('id, title')
      .in('sku', skus);
  },

  // ─── ENTITLEMENT QUERIES ──────────────────────────────────────────────────

  /**
   * Returns owned program SKUs for a given user.
   * Used by: ProgramsPage, ProfilePage.
   */
  getUserEntitlements(userId: string) {
    return supabase
      .from(TABLE_USER_PROGRAMS)
      .select('program_sku')
      .eq('user_id', userId);
  },

  /**
   * Checks if a user owns a program by SKU.
   * Used by: ProgramDetailPage. Returns `{ data: { id } | null, error }`.
   */
  checkProgramOwnership(userId: string, programSku: string) {
    return supabase
      .from(TABLE_USER_PROGRAMS)
      .select('id')
      .eq('user_id', userId)
      .eq('program_sku', programSku)
      .maybeSingle();
  },

  // ─── PENDING PURCHASE CLAIM (DB ONLY) ─────────────────────────────────────

  /**
   * Lists unprocessed pending purchases for an email (case-insensitive).
   */
  getPendingPurchasesForEmail(email: string) {
    return supabase
      .from(TABLE_PENDING_PURCHASES)
      .select('id, program_sku')
      .eq('processed', false)
      .ilike('email', email.toLowerCase());
  },

  /**
   * Upserts a user_programs entitlement row from an auto-claim.
   */
  upsertClaimedEntitlement(userId: string, programSku: string) {
    return supabase
      .from(TABLE_USER_PROGRAMS)
      .upsert(
        { user_id: userId, program_sku: programSku, source: 'auto_claim' },
        { onConflict: 'user_id,program_sku' },
      );
  },

  /**
   * Marks a pending_purchases row as processed.
   */
  markPendingPurchaseProcessed(pendingId: string) {
    return supabase
      .from(TABLE_PENDING_PURCHASES)
      .update({ processed: true })
      .eq('id', pendingId);
  },
};
