'use client';

import { useState, useEffect, useCallback } from 'react';
import type { FilterPreset, FilterState } from '../types/scanner';
import { PRESETS_STORAGE_KEY, MAX_PRESETS } from '../utils/filterDefaults';

/** Sanitize preset name: trim, strip HTML, enforce 1-50 chars */
function sanitizeName(name: string): string {
  return name
    .replace(/<[^>]*>/g, '') // strip HTML tags
    .trim()
    .slice(0, 50);
}

function readPresets(): FilterPreset[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PRESETS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as FilterPreset[];
  } catch {
    // Corrupt JSON — reset
    localStorage.removeItem(PRESETS_STORAGE_KEY);
    return [];
  }
}

function writePresets(presets: FilterPreset[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
  } catch {
    // localStorage full or unavailable — silently fail
  }
}

interface UsePresetsResult {
  presets: FilterPreset[];
  savePreset: (name: string, filters: FilterState) => { ok: boolean; error?: string };
  deletePreset: (id: string) => void;
  getPreset: (id: string) => FilterPreset | undefined;
  canSave: boolean;
  presetsCount: string; // e.g. "3 of 5"
}

/**
 * localStorage-based preset CRUD with validation.
 * See SPEC-2.md Section 4.3 for storage schema.
 */
export function usePresets(): UsePresetsResult {
  const [presets, setPresets] = useState<FilterPreset[]>([]);

  // Load presets on mount
  useEffect(() => {
    setPresets(readPresets());
  }, []);

  const savePreset = useCallback(
    (name: string, filters: FilterState): { ok: boolean; error?: string } => {
      const sanitized = sanitizeName(name);

      if (sanitized.length === 0) {
        return { ok: false, error: 'Preset name cannot be empty.' };
      }

      const current = readPresets();

      // Check limit
      if (current.length >= MAX_PRESETS) {
        return { ok: false, error: `Maximum ${MAX_PRESETS} presets reached. Delete one first.` };
      }

      // Check unique name (case-insensitive)
      const duplicate = current.some(
        (p) => p.name.toLowerCase() === sanitized.toLowerCase(),
      );
      if (duplicate) {
        return { ok: false, error: `A preset named "${sanitized}" already exists.` };
      }

      const newPreset: FilterPreset = {
        id: crypto.randomUUID(),
        name: sanitized,
        filters: { ...filters },
        createdAt: Date.now(),
      };

      const updated = [...current, newPreset];
      writePresets(updated);
      setPresets(updated);
      return { ok: true };
    },
    [],
  );

  const deletePreset = useCallback((id: string) => {
    const current = readPresets();
    const updated = current.filter((p) => p.id !== id);
    writePresets(updated);
    setPresets(updated);
  }, []);

  const getPreset = useCallback(
    (id: string) => presets.find((p) => p.id === id),
    [presets],
  );

  return {
    presets,
    savePreset,
    deletePreset,
    getPreset,
    canSave: presets.length < MAX_PRESETS,
    presetsCount: `${presets.length} of ${MAX_PRESETS}`,
  };
}
