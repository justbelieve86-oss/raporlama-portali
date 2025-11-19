import React from 'react';
import { useTheme } from '../hooks/useTheme';
import { SunIcon, MoonIcon } from './ui/icons';
import clsx from 'clsx';

export default function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      className={clsx(
        'p-2 rounded-xl transition-all duration-300',
        'hover:scale-110 active:scale-95',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900',
        isDark
          ? 'bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/50'
          : 'bg-gradient-to-br from-slate-700 to-slate-800 text-slate-300 hover:bg-slate-600 hover:text-white backdrop-blur-sm',
        className
      )}
      title={isDark ? 'Gündüz moduna geç' : 'Gece moduna geç'}
      aria-label={isDark ? 'Gündüz moduna geç' : 'Gece moduna geç'}
    >
      <div className="relative w-5 h-5">
        <SunIcon
          size={20}
          className={clsx(
            'absolute inset-0 transition-all duration-300',
            isDark ? 'opacity-0 rotate-90 scale-0' : 'opacity-100 rotate-0 scale-100'
          )}
        />
        <MoonIcon
          size={20}
          className={clsx(
            'absolute inset-0 transition-all duration-300',
            isDark ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-0'
          )}
        />
      </div>
    </button>
  );
}

