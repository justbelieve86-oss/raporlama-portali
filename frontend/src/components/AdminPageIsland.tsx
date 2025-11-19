// React import not needed with new JSX transform
import { QueryProvider } from './providers/QueryProvider';
import AdminDashboard from './AdminDashboard';

export default function AdminPageIsland() {
  return (
    <QueryProvider>
      <AdminDashboard />
    </QueryProvider>
  );
}