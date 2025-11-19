import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PasswordStrengthIndicator } from '../PasswordStrengthIndicator';

describe('PasswordStrengthIndicator', () => {
  it('renders null with empty password', () => {
    const { container } = render(<PasswordStrengthIndicator password="" />);
    expect(container.firstChild).toBeNull();
  });

  it('shows "Çok zayıf" for very weak password', () => {
    render(<PasswordStrengthIndicator password="123" />);
    expect(screen.getByText('Çok zayıf')).toBeInTheDocument();
  });

  it('shows "Zayıf" for weak password', () => {
    render(<PasswordStrengthIndicator password="12345678" />);
    expect(screen.getByText('Zayıf')).toBeInTheDocument();
  });

  it('shows "Güçlü" for medium-strong password', () => {
    render(<PasswordStrengthIndicator password="Password123" />);
    expect(screen.getByText('Güçlü')).toBeInTheDocument();
  });

  it('shows "Güçlü" for strong password', () => {
    render(<PasswordStrengthIndicator password="Password123!" />);
    expect(screen.getByText('Güçlü')).toBeInTheDocument();
  });

  it('displays password requirements', () => {
    render(<PasswordStrengthIndicator password="test" />);
    expect(screen.getByText(/En az 8 karakter/)).toBeInTheDocument();
    expect(screen.getByText(/Büyük ve küçük harf/)).toBeInTheDocument();
  });

  it('updates strength indicator when password changes', () => {
    const { rerender } = render(<PasswordStrengthIndicator password="weak" />);
    expect(screen.getByText('Çok zayıf')).toBeInTheDocument();

    rerender(<PasswordStrengthIndicator password="StrongPassword123!" />);
    expect(screen.getByText('Güçlü')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <PasswordStrengthIndicator password="test" className="custom-class" />
    );
    const element = container.firstChild;
    expect(element).toHaveClass('custom-class');
  });

  it('calculates strength correctly for various password patterns', () => {
    const testCases = [
      { password: 'a', expected: 'Çok zayıf' },
      { password: '12345678', expected: 'Zayıf' },
      { password: 'password', expected: 'Zayıf' },
      { password: 'Password1', expected: 'Güçlü' }, // 8+ chars, lowercase, uppercase, digit = 4
      { password: 'Password123', expected: 'Güçlü' }, // 8+ chars, lowercase, uppercase, digit = 4
      { password: 'Password123!', expected: 'Güçlü' },
      { password: 'VeryStrongPassword123!@#', expected: 'Güçlü' },
    ];

    testCases.forEach(({ password, expected }) => {
      const { unmount } = render(<PasswordStrengthIndicator password={password} />);
      expect(screen.getByText(expected)).toBeInTheDocument();
      unmount();
    });
  });
});

