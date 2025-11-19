/**
 * KPI formatting utility functions
 */

export function normalize(s: string | undefined | null): string {
  return String(s || '').trim().toLowerCase();
}

export function getUnitMeta(unit?: string) {
  const u = String(unit || '').trim();
  const isPercent = u === '%' || normalize(u) === 'yüzde';
  const isTl = u === 'TL' || normalize(u) === 'tl' || normalize(u) === '₺';
  const unitLabel = u ? u : undefined;
  return { isPercent, isTl, unitLabel } as const;
}

export function formatNumber(n: number): string {
  return Intl.NumberFormat('tr-TR').format(Number(n || 0));
}

export function formatCurrency(n: number): string {
  return new Intl.NumberFormat('tr-TR').format(Number(n || 0));
}

export function pillClass(variant: 'gray' | 'violet' | 'blue' | 'green' | 'amber' | 'red' | 'emerald' | 'orange' | 'rose' | 'indigo' = 'gray'): string {
  const base = 'px-2 py-0.5 rounded-full border text-[10px]';
  // WCAG AA uyumlu kontrast oranları: bg-*-50 üzerinde text-*-700 veya text-*-800 kullan
  // Color blind friendly palet (deuteranopia ve protanopia uyumlu)
  if (variant === 'gray') return base + ' border-gray-400 text-gray-800 bg-gray-50';
  if (variant === 'violet') return base + ' border-violet-400 text-violet-800 bg-violet-50';
  if (variant === 'blue') return base + ' border-blue-400 text-blue-800 bg-blue-50';
  if (variant === 'green') return base + ' border-green-500 text-green-800 bg-green-50';
  if (variant === 'emerald') return base + ' border-emerald-500 text-emerald-800 bg-emerald-50';
  if (variant === 'amber') return base + ' border-amber-500 text-amber-900 bg-amber-50';
  if (variant === 'orange') return base + ' border-orange-500 text-orange-900 bg-orange-50';
  if (variant === 'red') return base + ' border-red-500 text-red-800 bg-red-50';
  if (variant === 'rose') return base + ' border-rose-500 text-rose-800 bg-rose-50';
  if (variant === 'indigo') return base + ' border-indigo-500 text-indigo-800 bg-indigo-50';
  return base + ' border-gray-400 text-gray-800 bg-gray-50';
}

