import React, { useEffect } from 'react';
import Sidebar from './Sidebar';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { isMobileDevice } from '../utils/deviceDetection';
import { QueryProvider } from './providers/QueryProvider';

function DashboardShellContent({ children, role = 'user' }: { children: React.ReactNode; role?: 'admin' | 'user' | 'manager' }) {
  const { user, loading } = useCurrentUser();

  // Client-side guard and redirects
  useEffect(() => {
    if (loading) return;
    if (!user) {
      // Not authenticated → login (sadece login sayfasında değilsek)
      // Root path'te AuthGuard zaten yönlendirme yapacak
      const currentPath = window.location.pathname;
      if (currentPath !== '/login' && currentPath !== '/' && currentPath !== '/index.html') {
        window.location.href = '/login';
      }
      return;
    }
    
    // Mobil cihazlarda user için mobil sayfaya yönlendir (sadece /user route'unda)
    if (role === 'user' && isMobileDevice() && window.location.pathname === '/user') {
      window.location.href = '/user/mobile';
      return;
    }
    
    if (role === 'admin' && user.role !== 'admin') {
      // Authenticated but not admin → redirect to user home
      if (isMobileDevice()) {
        window.location.href = '/user/mobile';
      } else {
        window.location.href = '/user';
      }
      return;
    }
    if (role === 'manager' && user.role !== 'manager') {
      // Authenticated but not manager → redirect to user home
      if (isMobileDevice()) {
        window.location.href = '/user/mobile';
      } else {
        window.location.href = '/user';
      }
      return;
    }
  }, [loading, user, role]);

  // While checking auth, render a minimal placeholder to avoid layout flash
  if (loading) {
    return <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100" />;
  }

  // Block rendering if not allowed; redirects above will navigate away
  if (!user) return null;
  if (role === 'admin' && user.role !== 'admin') return null;
  if (role === 'manager' && user.role !== 'manager') return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
      <Sidebar role={role} />
      <main className="content-root min-h-screen">
        <div className="px-3 py-4 sm:px-4 sm:py-6 lg:px-6">
          {children}
        </div>
      </main>
    </div>
  );
}

export default function DashboardShell(props: { children: React.ReactNode; role?: 'admin' | 'user' | 'manager' }) {
  return (
    <QueryProvider>
      <DashboardShellContent {...props} />
    </QueryProvider>
  );
}