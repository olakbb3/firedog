/**
 * MovementService — Phase 4 Foundation
 *
 * Owns: canonical movement retrieval, alias lookup, normalization resolution,
 * movement metadata retrieval.
 *
 * Does NOT own: workout logging orchestration, PR computation, leaderboard
 * aggregation, analytics orchestration.
 *
 * All movement-domain Supabase access MUST flow through this service.
 */
import { supabase } from '@/integrations/supabase/client';

export interface CanonicalMovement {
  id: string;
  canonical_name: string;
  normalized_key: string;
  category: string | null;
  default_result_type: string | null;
}

export interface MovementAlias {
  id: string;
  alias: string;
  normalized_alias: string;
  movement_id: string;
}

const TABLE_MOVEMENTS = 'movements';
const TABLE_MOVEMENT_ALIASES = 'movement_aliases';

/**
 * Fetch all movements for selector UIs.
 * Preserves the legacy query shape used by MovementSelector.
 */
export async function getAllMovements() {
  const { data, error } = await supabase
    .from(TABLE_MOVEMENTS)
    .select('*')
    .order('name', { ascending: true });
  return { data, error };
}

/** Lowercase + trim + collapse whitespace. Pure; safe for guest contexts. */
export function normalizeMovementKey(raw: string): string {
  return (raw ?? '').toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Foundation parser: split a raw exercise string into a movement-name guess
 * and a trailing prescription token (e.g. "Dumbbell thrusters 35/25" ->
 * { movement: "Dumbbell thrusters", prescribed_weight: "35/25" }).
 *
 * NON-DESTRUCTIVE: callers may use this to *suggest* normalization. It does
 * not mutate any stored exercise rows.
 */
export function parseMovementMetadata(raw: string): {
  movement: string;
  prescribed_weight: string | null;
} {
  const trimmed = (raw ?? '').trim();
  // Match a trailing weight token: "35/25", "95#", "20kg", "100 lbs"
  const m = trimmed.match(/\s+(\d+(?:\.\d+)?(?:\s*\/\s*\d+(?:\.\d+)?)?\s*(?:#|lbs?|kg)?)\s*$/i);
  if (!m) return { movement: trimmed, prescribed_weight: null };
  return {
    movement: trimmed.slice(0, m.index).trim(),
    prescribed_weight: m[1].trim(),
  };
}

export async function getCanonicalMovements() {
  const { data, error } = await supabase
    .from(TABLE_MOVEMENTS)
    .select('id, canonical_name, normalized_key, category, default_result_type')
    .order('canonical_name', { ascending: true });
  return { data, error };
}

export async function findMovementByAlias(alias: string) {
  const normalized = normalizeMovementKey(alias);
  if (!normalized) return { data: null, error: null };
  const { data, error } = await supabase
    .from(TABLE_MOVEMENT_ALIASES)
    .select('id, alias, normalized_alias, movement_id')
    .eq('normalized_alias', normalized)
    .maybeSingle();
  return { data, error };
}

/**
 * Resolve a raw movement name to a canonical movement.
 * 1. Direct match on `movements.normalized_key`
 * 2. Fallback to `movement_aliases.normalized_alias` -> joined movement
 * Returns null if no match. Never throws on missing rows.
 */
export async function resolveCanonicalMovement(rawMovementName: string) {
  const normalized = normalizeMovementKey(rawMovementName);
  if (!normalized) return { data: null, error: null };

  const direct = await supabase
    .from(TABLE_MOVEMENTS)
    .select('id, canonical_name, normalized_key, category, default_result_type')
    .eq('normalized_key', normalized)
    .maybeSingle();
  if (direct.error) return { data: null, error: direct.error };
  if (direct.data) return { data: direct.data as CanonicalMovement, error: null };

  const aliased = await supabase
    .from(TABLE_MOVEMENT_ALIASES)
    .select('movement:movements(id, canonical_name, normalized_key, category, default_result_type)')
    .eq('normalized_alias', normalized)
    .maybeSingle();
  if (aliased.error) return { data: null, error: aliased.error };
  const movement = (aliased.data as any)?.movement ?? null;
  return { data: movement as CanonicalMovement | null, error: null };
}

export async function createMovementAlias(params: {
  alias: string;
  movement_id: string;
}) {
  const normalized_alias = normalizeMovementKey(params.alias);
  const { data, error } = await supabase
    .from(TABLE_MOVEMENT_ALIASES)
    .insert({
      alias: params.alias.trim(),
      normalized_alias,
      movement_id: params.movement_id,
    })
    .select('id, alias, normalized_alias, movement_id')
    .single();
  return { data, error };
}

export const MovementService = {
  normalizeMovementKey,
  parseMovementMetadata,
  getAllMovements,
  getCanonicalMovements,
  findMovementByAlias,
  resolveCanonicalMovement,
  createMovementAlias,
};

export default MovementService;
