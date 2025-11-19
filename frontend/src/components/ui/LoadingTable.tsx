import React from 'react';
import clsx from 'clsx';

interface LoadingTableProps {
  rows?: number;
  columns?: number;
  className?: string;
  showHeader?: boolean;
}

export default function LoadingTable({
  rows = 5,
  columns = 4,
  className,
  showHeader = true
}: LoadingTableProps) {
  return (
    <div className={clsx('overflow-hidden', className)}>
      <table className="min-w-full divide-y divide-gray-200">
        {showHeader && (
          <thead className="bg-gray-50">
            <tr>
              {Array.from({ length: columns }).map((_, index) => (
                <th key={index} className="px-6 py-3 text-left">
                  <div className="h-4 bg-gray-300 rounded animate-pulse" />
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody className="bg-white divide-y divide-gray-200">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-gray-50">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <td key={colIndex} className="px-6 py-4 whitespace-nowrap">
                  <div 
                    className={clsx(
                      'bg-gray-200 rounded animate-pulse',
                      colIndex === 0 ? 'h-4 w-24' : 'h-4 w-16'
                    )} 
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}