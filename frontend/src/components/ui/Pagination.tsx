import React from 'react';
import clsx from 'clsx';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  showPageSizeSelector?: boolean;
  showJumpToPage?: boolean;
  className?: string;
}

/**
 * Modern Pagination Component
 * - Page navigation
 * - Page size selector
 * - Jump to page
 * - Total count display
 */
export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  showPageSizeSelector = true,
  showJumpToPage = true,
  className,
}: PaginationProps) {
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      onPageChange(page);
    }
  };

  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      // Show all pages
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show first page
      pages.push(1);

      // Show ellipsis if needed
      if (currentPage > 3) {
        pages.push('ellipsis');
      }

      // Show pages around current
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        if (i !== 1 && i !== totalPages) {
          pages.push(i);
        }
      }

      // Show ellipsis if needed
      if (currentPage < totalPages - 2) {
        pages.push('ellipsis');
      }

      // Show last page
      if (totalPages > 1) {
        pages.push(totalPages);
      }
    }

    return pages;
  };

  return (
    <div className={clsx('flex flex-col sm:flex-row items-center justify-between gap-4', className)}>
      {/* Info */}
      <div className="text-sm text-gray-600">
        <span className="font-medium">{startItem}</span>
        {' - '}
        <span className="font-medium">{endItem}</span>
        {' / '}
        <span className="font-medium">{totalItems}</span>
        {' kayıt'}
      </div>

      <div className="flex items-center gap-4">
        {/* Page Size Selector */}
        {showPageSizeSelector && onPageSizeChange && (
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Sayfa başına:</label>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Page Navigation */}
        <div className="flex items-center gap-1">
          {/* First Page */}
          <button
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1}
            className={clsx(
              'px-3 py-1.5 text-sm rounded-lg transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              currentPage === 1
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-700 hover:bg-gray-100'
            )}
            aria-label="İlk sayfa"
          >
            ««
          </button>

          {/* Previous Page */}
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={clsx(
              'px-3 py-1.5 text-sm rounded-lg transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              currentPage === 1
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-700 hover:bg-gray-100'
            )}
            aria-label="Önceki sayfa"
          >
            ‹
          </button>

          {/* Page Numbers */}
          {getPageNumbers().map((page, index) => {
            if (page === 'ellipsis') {
              return (
                <span key={`ellipsis-${index}`} className="px-2 text-gray-400">
                  ...
                </span>
              );
            }

            return (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={clsx(
                  'min-w-[36px] px-3 py-1.5 text-sm rounded-lg transition-colors',
                  currentPage === page
                    ? 'bg-primary-500 text-white font-semibold'
                    : 'text-gray-700 hover:bg-gray-100'
                )}
                aria-label={`Sayfa ${page}`}
                aria-current={currentPage === page ? 'page' : undefined}
              >
                {page}
              </button>
            );
          })}

          {/* Next Page */}
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={clsx(
              'px-3 py-1.5 text-sm rounded-lg transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              currentPage === totalPages
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-700 hover:bg-gray-100'
            )}
            aria-label="Sonraki sayfa"
          >
            ›
          </button>

          {/* Last Page */}
          <button
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages}
            className={clsx(
              'px-3 py-1.5 text-sm rounded-lg transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              currentPage === totalPages
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-700 hover:bg-gray-100'
            )}
            aria-label="Son sayfa"
          >
            »»
          </button>
        </div>

        {/* Jump to Page */}
        {showJumpToPage && totalPages > 5 && (
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Git:</label>
            <input
              type="number"
              min={1}
              max={totalPages}
              defaultValue={currentPage}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const page = Number((e.target as HTMLInputElement).value);
                  handlePageChange(page);
                }
              }}
              className="w-16 px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Sayfa"
            />
          </div>
        )}
      </div>
    </div>
  );
}


