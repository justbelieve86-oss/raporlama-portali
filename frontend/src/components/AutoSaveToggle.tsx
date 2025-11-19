import React, { useEffect, useState } from 'react';

/**
 * Simple toggle component to control daily auto-save via localStorage.
 * Used in page header to avoid duplicate toggles inside the data entry island.
 */
export default function AutoSaveToggle() {
  const [enabled, setEnabled] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem('dailyAutoSave');
      if (v === 'false') return false;
      return true; // default on
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('dailyAutoSave', enabled ? 'true' : 'false');
    } catch {
      // localStorage erişim hatası - sessizce yoksay
    }
  }, [enabled]);

  return (
    <button
      type="button"
      onClick={() => setEnabled(v => !v)}
      title="Otomatik kaydı aç/kapat"
      className={`inline-flex items-center gap-2 text-sm px-3 py-2 rounded-lg shadow ${enabled ? 'bg-violet-600 text-white hover:bg-violet-700' : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'}`}
      aria-pressed={enabled}
      aria-label="Otomatik Kayıt"
    >
      <span className="text-lg leading-none">⏺</span>
      <span>Otomatik Kayıt {enabled ? 'Açık' : 'Kapalı'}</span>
    </button>
  );
}