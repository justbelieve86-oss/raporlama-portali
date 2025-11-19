/**
 * Table Controls Component
 * Görünüm modu ve kolon görünürlüğü kontrolleri
 */

import React, { useState } from 'react';
import { SettingsIcon, EyeIcon, EyeOffIcon } from '../../ui/icons.js';
import { useTablePreferences, type ViewMode } from '../hooks/useTablePreferences.js';
import clsx from 'clsx';

export function TableControls() {
  const { viewMode, columnVisibility, setViewMode, toggleColumn } = useTablePreferences();
  const [isColumnMenuOpen, setIsColumnMenuOpen] = useState(false);

  const viewModes: Array<{ mode: ViewMode; label: string; icon: string }> = [
    { mode: 'table', label: 'Tablo', icon: '📊' },
    { mode: 'card', label: 'Kart', icon: '🃏' },
    { mode: 'compact', label: 'Kompakt', icon: '📋' },
  ];

  return (
    <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200 transition-colors duration-300">
      {/* View Mode Selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700">Görünüm:</span>
        <div className="flex gap-1 bg-white rounded-lg border border-gray-300 p-1 transition-colors duration-300">
          {viewModes.map(({ mode, label, icon }) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={clsx(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                viewMode === mode
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-700 hover:bg-gray-100'
              )}
              title={label}
              aria-label={`${label} görünümünü seç`}
              aria-pressed={viewMode === mode}
            >
              <span className="mr-1.5">{icon}</span>
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Column Visibility Toggle */}
      <div className="relative">
        <button
          onClick={() => setIsColumnMenuOpen(!isColumnMenuOpen)}
          className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all"
          aria-label="Kolon görünürlüğü ayarları"
          aria-expanded={isColumnMenuOpen}
        >
          <SettingsIcon className="w-4 h-4" />
          <span className="hidden sm:inline">Kolonlar</span>
        </button>

        {isColumnMenuOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsColumnMenuOpen(false)}
              aria-hidden="true"
            />
            {/* Dropdown Menu */}
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20 transition-colors duration-300">
              <div className="px-4 py-2 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900">Kolon Görünürlüğü</h3>
              </div>
              <div className="py-1">
                {[
                  { key: 'daily' as const, label: 'Günlük' },
                  { key: 'cumulative' as const, label: 'Kümülatif' },
                  { key: 'target' as const, label: 'Hedef' },
                  { key: 'progress' as const, label: 'Gerçekleşme %' },
                ].map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => {
                      toggleColumn(key);
                    }}
                    className="flex items-center justify-between w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <span>{label}</span>
                    {columnVisibility[key] ? (
                      <EyeIcon className="w-4 h-4 text-green-600" />
                    ) : (
                      <EyeOffIcon className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

