/**
 * Accessibility Helper Components
 * Erişilebilirlik için yardımcı component'ler
 */

import React from 'react';

/**
 * Skip Link Component
 * Screen reader kullanıcıları için ana içeriğe atlama linki
 */
export function SkipLink({ href, children, className = '' }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <a
      href={href}
      className={`sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-md focus:shadow-lg ${className}`}
    >
      {children}
    </a>
  );
}

/**
 * Screen Reader Only Text
 * Sadece screen reader'lar için görünür metin
 */
export function ScreenReaderOnly({ children }: { children: React.ReactNode }) {
  return <span className="sr-only">{children}</span>;
}

/**
 * Keyboard Navigation Instructions
 * Klavye kısayolları için talimatlar
 */
export function KeyboardInstructions({ instructions }: { instructions: string }) {
  return (
    <div className="sr-only" role="note" aria-label="Klavye kısayolları">
      {instructions}
    </div>
  );
}

