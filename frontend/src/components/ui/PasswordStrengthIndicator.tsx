import React from 'react';
import clsx from 'clsx';

interface PasswordStrengthIndicatorProps {
  password: string;
  className?: string;
}

/**
 * Şifre gücünü hesaplar (0-4 arası)
 */
function calculatePasswordStrength(password: string): number {
  if (!password) return 0;
  
  let strength = 0;
  
  // Uzunluk kontrolü
  if (password.length >= 8) strength++;
  if (password.length >= 12) strength++;
  
  // Karakter çeşitliliği
  if (/[a-z]/.test(password)) strength++; // Küçük harf
  if (/[A-Z]/.test(password)) strength++; // Büyük harf
  if (/[0-9]/.test(password)) strength++; // Rakam
  if (/[^a-zA-Z0-9]/.test(password)) strength++; // Özel karakter
  
  // Maksimum 4
  return Math.min(strength, 4);
}

/**
 * Şifre gücüne göre mesaj döndürür
 */
function getStrengthMessage(strength: number): { text: string; color: string } {
  switch (strength) {
    case 0:
    case 1:
      return { text: 'Çok zayıf', color: 'text-error-600' };
    case 2:
      return { text: 'Zayıf', color: 'text-warning-600' };
    case 3:
      return { text: 'Orta', color: 'text-info-600' };
    case 4:
      return { text: 'Güçlü', color: 'text-success-600' };
    default:
      return { text: 'Çok zayıf', color: 'text-error-600' };
  }
}

/**
 * Şifre gücüne göre bar rengi döndürür
 */
function getBarColor(strength: number, index: number): string {
  if (strength <= index) return 'bg-gray-200';
  
  if (strength <= 2) return 'bg-error-500';
  if (strength === 3) return 'bg-warning-500';
  return 'bg-success-500';
}

export function PasswordStrengthIndicator({ password, className }: PasswordStrengthIndicatorProps) {
  const strength = calculatePasswordStrength(password);
  const { text, color } = getStrengthMessage(strength);

  if (!password) return null;

  return (
    <div className={clsx('mt-2', className)}>
      {/* Strength Bars */}
      <div className="flex gap-1 mb-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={clsx(
              'h-1.5 flex-1 rounded-full transition-all duration-normal',
              getBarColor(strength, i - 1)
            )}
          />
        ))}
      </div>
      
      {/* Strength Message */}
      <p className={clsx('text-xs font-medium', color)}>
        {text}
      </p>
      
      {/* Requirements */}
      <div className="mt-2 space-y-1">
        <p className="text-xs text-gray-600 font-medium mb-1">Şifre gereksinimleri:</p>
        <ul className="text-xs text-gray-500 space-y-0.5">
          <li className={clsx('flex items-center gap-1', password.length >= 8 ? 'text-success-600' : '')}>
            <span>{password.length >= 8 ? '✓' : '○'}</span>
            <span>En az 8 karakter</span>
          </li>
          <li className={clsx('flex items-center gap-1', /[a-z]/.test(password) && /[A-Z]/.test(password) ? 'text-success-600' : '')}>
            <span>{/[a-z]/.test(password) && /[A-Z]/.test(password) ? '✓' : '○'}</span>
            <span>Büyük ve küçük harf</span>
          </li>
          <li className={clsx('flex items-center gap-1', /[0-9]/.test(password) ? 'text-success-600' : '')}>
            <span>{/[0-9]/.test(password) ? '✓' : '○'}</span>
            <span>En az bir rakam</span>
          </li>
          <li className={clsx('flex items-center gap-1', /[^a-zA-Z0-9]/.test(password) ? 'text-success-600' : '')}>
            <span>{/[^a-zA-Z0-9]/.test(password) ? '✓' : '○'}</span>
            <span>En az bir özel karakter</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

