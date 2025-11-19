import React from 'react';
import clsx from 'clsx';

export function Table({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="relative w-full overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className={clsx('w-full caption-bottom text-sm', className)} {...props} />
    </div>
  );
}

export interface TableHeaderProps extends React.HTMLAttributes<HTMLTableSectionElement> {
  sticky?: boolean;
}

export function TableHeader({ sticky = false, className, ...props }: TableHeaderProps) {
  return (
    <thead
      className={clsx(
        '[&_tr]:border-b',
        sticky && 'sticky top-0 z-10 bg-white shadow-sm',
        className
      )}
      {...props}
    />
  );
}

export function TableBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={clsx('[&_tr:last-child]:border-0', className)} {...props} />;
}

export function TableFooter({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tfoot className={clsx('bg-gray-50 font-medium text-gray-700', className)} {...props} />;
}

export interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  hoverable?: boolean;
  clickable?: boolean;
  onClick?: () => void;
}

export function TableRow({
  hoverable = true,
  clickable = false,
  onClick,
  className,
  ...props
}: TableRowProps) {
  return (
    <tr
      onClick={clickable && onClick ? onClick : undefined}
      className={clsx(
        'border-b transition-colors duration-150',
        'even:bg-gray-50/30',
        hoverable && 'hover:bg-primary-50/50',
        clickable && onClick && 'cursor-pointer active:bg-primary-100',
        className
      )}
      {...props}
    />
  );
}

export function TableHead({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={clsx(
        'h-11 px-4 text-left align-middle',
        'text-xs font-semibold tracking-wide text-gray-700',
        'bg-gray-50',
        className
      )}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={clsx('px-4 py-3 align-middle text-gray-700', className)} {...props} />;
}

export function TableCaption({ className, ...props }: React.HTMLAttributes<HTMLTableCaptionElement>) {
  return <caption className={clsx('mt-4 text-sm text-gray-500', className)} {...props} />;
}