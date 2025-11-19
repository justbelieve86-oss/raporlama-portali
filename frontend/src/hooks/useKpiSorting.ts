import { useState } from 'react';

export type SortableKpiKeys = 'name' | 'category' | 'status' | 'ytdCalc' | 'reportCount';
export type SortDirection = 'asc' | 'desc';

export function useKpiSorting(initialSortBy: SortableKpiKeys = 'name', initialSortDir: SortDirection = 'asc') {
  const [sortBy, setSortBy] = useState<SortableKpiKeys>(initialSortBy);
  const [sortDir, setSortDir] = useState<SortDirection>(initialSortDir);

  const handleSort = (field: SortableKpiKeys) => {
    if (sortBy === field) {
      setSortDir(prevDir => (prevDir === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortDir('asc');
    }
  };

  return { sortBy, sortDir, handleSort };
}