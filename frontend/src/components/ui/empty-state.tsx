import React from 'react';
import clsx from 'clsx';

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
};

export default function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center text-center',
        'rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8',
        className
      )}
    >
      {icon && (
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
      {description && (
        <p className="mt-2 max-w-md text-sm text-gray-600">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}