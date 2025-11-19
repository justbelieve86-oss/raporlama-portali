// React import not needed with new JSX transform
import { QueryProvider } from './providers/QueryProvider';
import DashboardShell from './DashboardShell';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import ReportsTable from './ReportsTable';

export default function AdminReportsIsland() {
  return (
    <QueryProvider>
      <DashboardShell role="admin">
        <Card>
          <CardHeader>
            <CardTitle>Raporlar</CardTitle>
            <CardDescription>KPI bazlı rapor listesi (örnek veri).</CardDescription>
          </CardHeader>
          <CardContent>
            <ReportsTable />
          </CardContent>
        </Card>
      </DashboardShell>
    </QueryProvider>
  );
}