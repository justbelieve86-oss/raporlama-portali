import React from 'react';
import clsx from 'clsx';

export interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
  cols?: 1 | 2 | 3 | 4 | 6 | 12;
  gap?: 'sm' | 'md' | 'lg';
  responsive?: {
    sm?: 1 | 2 | 3 | 4 | 6 | 12;
    md?: 1 | 2 | 3 | 4 | 6 | 12;
    lg?: 1 | 2 | 3 | 4 | 6 | 12;
    xl?: 1 | 2 | 3 | 4 | 6 | 12;
  };
  className?: string;
  children: React.ReactNode;
}

/**
 * Grid component - 12-column responsive grid system
 * 
 * @example
 * <Grid cols={3} gap="lg" responsive={{ sm: 1, md: 2, lg: 3 }}>
 *   <div>Item 1</div>
 *   <div>Item 2</div>
 *   <div>Item 3</div>
 * </Grid>
 */
export function Grid({
  cols = 12,
  gap = 'md',
  responsive,
  className,
  children,
  ...props
}: GridProps) {
  const gapClasses = {
    sm: 'gap-gutter-sm',
    md: 'gap-gutter',
    lg: 'gap-gutter-lg',
  };

  // Build responsive grid classes
  const gridClasses = [];
  
  if (cols === 12 && !responsive) {
    // Use 12-column grid system
    gridClasses.push('grid-12');
  } else {
    // Use Tailwind grid with responsive breakpoints
    const baseCols = `grid-cols-${cols}`;
    gridClasses.push(baseCols);
    
    if (responsive) {
      if (responsive.sm) gridClasses.push(`sm:grid-cols-${responsive.sm}`);
      if (responsive.md) gridClasses.push(`md:grid-cols-${responsive.md}`);
      if (responsive.lg) gridClasses.push(`lg:grid-cols-${responsive.lg}`);
      if (responsive.xl) gridClasses.push(`xl:grid-cols-${responsive.xl}`);
    }
  }

  return (
    <div
      className={clsx(
        'grid',
        ...gridClasses,
        gapClasses[gap],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * GridItem component - Grid item with column span
 */
export interface GridItemProps extends React.HTMLAttributes<HTMLDivElement> {
  span?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
  responsive?: {
    sm?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
    md?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
    lg?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
    xl?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
  };
  className?: string;
  children: React.ReactNode;
}

export function GridItem({
  span,
  responsive,
  className,
  children,
  ...props
}: GridItemProps) {
  const spanClasses = [];
  
  if (span) {
    spanClasses.push(`col-span-${span}`);
  }
  
  if (responsive) {
    if (responsive.sm) spanClasses.push(`sm:col-span-${responsive.sm}`);
    if (responsive.md) spanClasses.push(`md:col-span-${responsive.md}`);
    if (responsive.lg) spanClasses.push(`lg:col-span-${responsive.lg}`);
    if (responsive.xl) spanClasses.push(`xl:col-span-${responsive.xl}`);
  }

  return (
    <div
      className={clsx(...spanClasses, className)}
      {...props}
    >
      {children}
    </div>
  );
}

