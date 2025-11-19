import * as React from 'react';
import clsx from 'clsx';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
  clickable?: boolean;
}

export function Card({ className, hoverable = false, clickable = false, ...props }: CardProps) {
  return (
    <div
      className={clsx(
        'rounded-lg border bg-white text-foreground shadow-sm',
        'border-gray-200',
        'transition-all duration-300',
        hoverable && 'hover:shadow-xl hover:-translate-y-1',
        clickable && 'cursor-pointer active:scale-[0.98]',
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx('p-4 border-b border-gray-200', className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={clsx('text-lg font-semibold', className)} {...props} />;
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={clsx('text-sm text-gray-600', className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx('p-4', className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={clsx('p-4 border-t border-gray-200', className)} {...props} />;
}