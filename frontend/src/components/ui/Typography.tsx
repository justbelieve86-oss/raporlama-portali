import React from 'react';
import clsx from 'clsx';

export interface TypographyProps extends React.HTMLAttributes<HTMLElement> {
  variant?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'body' | 'body-sm' | 'small' | 'caption';
  color?: 'primary' | 'secondary' | 'tertiary' | 'disabled';
  weight?: 'light' | 'regular' | 'medium' | 'semibold' | 'bold';
  as?: keyof JSX.IntrinsicElements;
  className?: string;
  children: React.ReactNode;
}

/**
 * Typography component - Standardize text styling across the application
 * 
 * @example
 * <Typography variant="h1" color="primary" weight="bold">
 *   Başlık
 * </Typography>
 * 
 * <Typography variant="body" color="secondary">
 *   Normal metin
 * </Typography>
 */
export function Typography({
  variant = 'body',
  color = 'primary',
  weight,
  as,
  className,
  children,
  ...props
}: TypographyProps) {
  // Determine the HTML element to render
  const Component = as || getDefaultElement(variant);

  // Build class names
  const variantClasses = {
    h1: 'text-h1',
    h2: 'text-h2',
    h3: 'text-h3',
    h4: 'text-h4',
    h5: 'text-h5',
    h6: 'text-h6',
    body: 'text-body',
    'body-sm': 'text-body-sm',
    small: 'text-small',
    caption: 'text-small',
  };

  const colorClasses = {
    primary: 'text-primary',
    secondary: 'text-secondary',
    tertiary: 'text-tertiary',
    disabled: 'text-disabled',
  };

  const weightClasses = {
    light: 'font-light',
    regular: 'font-regular',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold',
  };

  // Get default weight based on variant if not specified
  const defaultWeight = weight || getDefaultWeight(variant);

  return (
    <Component
      className={clsx(
        variantClasses[variant],
        colorClasses[color],
        weightClasses[defaultWeight],
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}

/**
 * Get default HTML element for variant
 */
function getDefaultElement(variant: TypographyProps['variant']): keyof JSX.IntrinsicElements {
  switch (variant) {
    case 'h1':
      return 'h1';
    case 'h2':
      return 'h2';
    case 'h3':
      return 'h3';
    case 'h4':
      return 'h4';
    case 'h5':
      return 'h5';
    case 'h6':
      return 'h6';
    case 'body':
    case 'body-sm':
    case 'small':
    case 'caption':
    default:
      return 'p';
  }
}

/**
 * Get default font weight for variant
 */
function getDefaultWeight(variant: TypographyProps['variant']): 'light' | 'regular' | 'medium' | 'semibold' | 'bold' {
  switch (variant) {
    case 'h1':
      return 'bold';
    case 'h2':
    case 'h3':
    case 'h4':
    case 'h5':
    case 'h6':
      return 'semibold';
    case 'body':
    case 'body-sm':
    case 'small':
    case 'caption':
    default:
      return 'regular';
  }
}

// Convenience components for common typography variants
export const H1 = ({ className, ...props }: Omit<TypographyProps, 'variant'>) => (
  <Typography variant="h1" {...props} className={className} />
);

export const H2 = ({ className, ...props }: Omit<TypographyProps, 'variant'>) => (
  <Typography variant="h2" {...props} className={className} />
);

export const H3 = ({ className, ...props }: Omit<TypographyProps, 'variant'>) => (
  <Typography variant="h3" {...props} className={className} />
);

export const H4 = ({ className, ...props }: Omit<TypographyProps, 'variant'>) => (
  <Typography variant="h4" {...props} className={className} />
);

export const H5 = ({ className, ...props }: Omit<TypographyProps, 'variant'>) => (
  <Typography variant="h5" {...props} className={className} />
);

export const H6 = ({ className, ...props }: Omit<TypographyProps, 'variant'>) => (
  <Typography variant="h6" {...props} className={className} />
);

export const Body = ({ className, ...props }: Omit<TypographyProps, 'variant'>) => (
  <Typography variant="body" {...props} className={className} />
);

export const BodySmall = ({ className, ...props }: Omit<TypographyProps, 'variant'>) => (
  <Typography variant="body-sm" {...props} className={className} />
);

export const Small = ({ className, ...props }: Omit<TypographyProps, 'variant'>) => (
  <Typography variant="small" {...props} className={className} />
);

export const Caption = ({ className, ...props }: Omit<TypographyProps, 'variant'>) => (
  <Typography variant="caption" {...props} className={className} />
);

