import React from 'react';
import clsx from 'clsx';

export interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  padding?: boolean;
  spacing?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
  children: React.ReactNode;
  as?: 'section' | 'div';
}

/**
 * Section component - Consistent section spacing and padding
 * 
 * @example
 * <Section padding spacing="lg">
 *   <h2>Section Title</h2>
 *   <p>Section content</p>
 * </Section>
 */
export function Section({
  padding = true,
  spacing = 'md',
  className,
  children,
  as: Component = 'section',
  ...props
}: SectionProps) {
  const spacingClasses = {
    none: '',
    sm: 'space-group',
    md: 'space-section',
    lg: 'space-section mb-8',
  };

  return (
    <Component
      className={clsx(
        padding && 'p-section-y',
        spacingClasses[spacing],
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}

