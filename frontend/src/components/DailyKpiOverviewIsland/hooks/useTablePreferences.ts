/**
 * Table Preferences Hook
 * Kolon görünürlüğü, görünüm modu ve diğer tablo tercihlerini yönetir
 */

import { useState, useEffect, useCallback } from 'react';
import { logger } from '../../../lib/logger.js';

export type ViewMode = 'table' | 'card' | 'compact';
export type ColumnVisibility = {
  daily: boolean;
  cumulative: boolean;
  target: boolean;
  progress: boolean;
};

const STORAGE_KEY = 'daily-kpi-table-preferences';

interface TablePreferences {
  viewMode: ViewMode;
  columnVisibility: ColumnVisibility;
}

const DEFAULT_PREFERENCES: TablePreferences = {
  viewMode: 'table',
  columnVisibility: {
    daily: true,
    cumulative: true,
    target: true,
    progress: true,
  },
};

export function useTablePreferences() {
  const [preferences, setPreferences] = useState<TablePreferences>(() => {
    // SSR-safe: localStorage sadece client-side'da mevcut
    if (typeof window === 'undefined') {
      return DEFAULT_PREFERENCES;
    }
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
      }
    } catch (e) {
      logger.warn('Failed to load table preferences from localStorage', e);
    }
    return DEFAULT_PREFERENCES;
  });

  // Save to localStorage whenever preferences change
  useEffect(() => {
    // SSR-safe: localStorage sadece client-side'da mevcut
    if (typeof window === 'undefined') {
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch (e) {
      logger.warn('Failed to save table preferences to localStorage', e);
    }
  }, [preferences]);

  const setViewMode = useCallback((mode: ViewMode) => {
    setPreferences(prev => ({ ...prev, viewMode: mode }));
  }, []);

  const setColumnVisibility = useCallback((visibility: Partial<ColumnVisibility>) => {
    setPreferences(prev => ({
      ...prev,
      columnVisibility: { ...prev.columnVisibility, ...visibility },
    }));
  }, []);

  const toggleColumn = useCallback((column: keyof ColumnVisibility) => {
    setPreferences(prev => ({
      ...prev,
      columnVisibility: {
        ...prev.columnVisibility,
        [column]: !prev.columnVisibility[column],
      },
    }));
  }, []);

  const resetPreferences = useCallback(() => {
    setPreferences(DEFAULT_PREFERENCES);
  }, []);

  return {
    preferences,
    viewMode: preferences.viewMode,
    columnVisibility: preferences.columnVisibility,
    setViewMode,
    setColumnVisibility,
    toggleColumn,
    resetPreferences,
  };
}

