/**
 * Daily KPI Overview Island - Legacy wrapper
 * Yeni refactored yapıyı kullanır
 */

import { QueryProvider } from './providers/QueryProvider';
import DailyKpiOverviewIslandContent from './DailyKpiOverviewIsland/index.js';

export default function DailyKpiOverviewIsland() {
  return (
    <QueryProvider>
      <DailyKpiOverviewIslandContent />
    </QueryProvider>
  );
}
