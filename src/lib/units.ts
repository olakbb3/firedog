import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export type UnitSystem = 'imperial' | 'metric';

const STORAGE_KEY = 'fdw:preferred_unit';
const EVENT_NAME = 'fdw:unit-changed';

// In-memory cache shared across components — avoids per-component DB hits.
let cachedUnit: UnitSystem | null = null;

const readCachedUnit = (): UnitSystem => {
  if (cachedUnit) return cachedUnit;
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'metric' || v === 'imperial') {
      cachedUnit = v;
      return v;
    }
  } catch {}
  return 'imperial';
};

export const setPreferredUnit = (unit: UnitSystem) => {
  cachedUnit = unit;
  try {
    localStorage.setItem(STORAGE_KEY, unit);
  } catch {}
  // Notify all subscribed components in the same tab.
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: unit }));
};

/**
 * Subscribe to the user's preferred unit. Reads from cache first,
 * then hydrates from the profiles table. Updates only re-render
 * components that consume this hook.
 */
export const useUnitPreference = (userId?: string | null): UnitSystem => {
  const [unit, setUnit] = useState<UnitSystem>(() => readCachedUnit());

  useEffect(() => {
    const handler = (e: Event) => {
      const next = (e as CustomEvent<UnitSystem>).detail;
      if (next === 'metric' || next === 'imperial') setUnit(next);
    };
    window.addEventListener(EVENT_NAME, handler);
    return () => window.removeEventListener(EVENT_NAME, handler);
  }, []);

  useEffect(() => {
    if (!userId || cachedUnit) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('preferred_unit')
          .eq('id', userId)
          .maybeSingle();
        if (cancelled) return;
        const v = (data as any)?.preferred_unit;
        if (v === 'metric' || v === 'imperial') {
          cachedUnit = v;
          try { localStorage.setItem(STORAGE_KEY, v); } catch {}
          setUnit(v);
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [userId]);

  return unit;
};

// ─── Conversion helpers ────────────────────────────────────────────────────

export const convertWeight = (
  lbs: number | null | undefined,
  unit: UnitSystem
): string => {
  if (lbs == null) return '—';
  return unit === 'metric'
    ? `${roundWeight(lbsToKg(lbs))} kg`
    : `${lbs} lbs`;
};

export const lbsToKg = (lbs: number): number => lbs / 2.2046;

export const kgToLbs = (kg: number): number => kg * 2.2046;

export const roundWeight = (value: number): number => Math.round(value * 10) / 10;

export const displayWeightValue = (lbs: number, unit: UnitSystem): number =>
  unit === 'metric' ? roundWeight(lbsToKg(lbs)) : roundWeight(lbs);

export const parseWeightToLbs = (value: string, unit: UnitSystem): number | null => {
  const parsed = parseFloat(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return unit === 'metric' ? kgToLbs(parsed) : parsed;
};

export const convertHeight = (
  inches: number | null | undefined,
  unit: UnitSystem
): string => {
  if (inches == null) return '—';
  if (unit === 'metric') return `${Math.round(inches * 2.54)} cm`;
  const ft = Math.floor(inches / 12);
  const inch = inches % 12;
  return `${ft}'${inch}"`;
};

/**
 * Reformat a stored "lbs" string (e.g. "185 lbs") using the active unit.
 * Falls back to the original value when it can't be parsed.
 */
export const reformatWeightString = (
  value: string,
  unit: UnitSystem
): string => {
  const m = value.match(/^(\d+(?:\.\d+)?)\s*lbs?$/i);
  if (!m) return value;
  return convertWeight(parseFloat(m[1]), unit);
};
