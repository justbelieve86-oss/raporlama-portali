import React from 'react';
import clsx from 'clsx';

export type SortDirection = 'asc' | 'desc' | null;

export interface SortableTableHeaderProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  sortable?: boolean;
  sortDirection?: SortDirection;
  onSort?: (direction: SortDirection) => void;
  children: React.ReactNode;
}

/**
 * Sortable Table Header Component
 * Click to sort, shows sort indicator
 */
export function SortableTableHeader({
  sortable = false,
  sortDirection = null,
  onSort,
  children,
  className,
  ...props
}: SortableTableHeaderProps) {
  const handleClick = () => {
    if (!sortable || !onSort) return;

    // Cycle: null -> asc -> desc -> null
    if (sortDirection === null) {
      onSort('asc');
    } else if (sortDirection === 'asc') {
      onSort('desc');
    } else {
      onSort(null);
    }
  };

  return (
    <th
      {...props}
      onClick={sortable ? handleClick : undefined}
      className={clsx(
        'h-11 px-4 text-left align-middle',
        'text-xs font-semibold tracking-wide text-gray-600',
        'select-none',
        sortable && 'cursor-pointer hover:bg-gray-100 transition-colors',
        className
      )}
    >
      <div className="flex items-center gap-2">
        <span>{children}</span>
        {sortable && (
          <div className="flex flex-col">
            <svg
              className={clsx(
                'w-3 h-3',
                sortDirection === 'asc' ? 'text-primary-600' : 'text-gray-400'
              )}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
                clipRule="evenodd"
              />
            </svg>
            <svg
              className={clsx(
                'w-3 h-3 -mt-1',
                sortDirection === 'desc' ? 'text-primary-600' : 'text-gray-400'
              )}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        )}
      </div>
    </th>
  );
}


