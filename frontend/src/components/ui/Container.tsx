import React from 'react';
import clsx from 'clsx';

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  padding?: boolean;
  className?: string;
  children: React.ReactNode;
}

/**
 * Container component - Consistent max-width containers with responsive padding
 * 
 * @example
 * <Container size="lg" padding>
 *   <h1>Content</h1>
 * </Container>
 */
export function Container({
  size = 'xl',
  padding = true,
  className,
  children,
  ...props
}: ContainerProps) {
  const sizeClasses = {
    sm: 'container-sm',
    md: 'container-md',
    lg: 'container-lg',
    xl: 'container-xl',
    '2xl': 'container-2xl',
    full: 'max-w-full',
  };

  return (
    <div
      className={clsx(
        sizeClasses[size],
        padding && 'p-container-x',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

