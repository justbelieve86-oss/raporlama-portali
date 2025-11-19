import { useEffect, useState } from 'react';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { checkUserRouteAccess } from '../lib/accessControl';
import { QueryProvider } from './providers/QueryProvider';
import { logger } from '../lib/logger';

interface RouteGuardProps {
  children: React.ReactNode;
  routePath: string;
}

function RouteGuardContent({ children, routePath }: RouteGuardProps) {
  const { user, loading } = useCurrentUser();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      if (loading) return;
      
      if (!user) {
        // Not authenticated - redirect to login
        window.location.href = '/login';
        return;
      }

      try {
        const access = await checkUserRouteAccess(routePath, user.role);
        setHasAccess(access);
        
        if (!access) {
          // No access - redirect to home or show error
          logger.warn(`Access denied to route: ${routePath} for role: ${user.role}`);
          // Optionally redirect to home
          // window.location.href = '/user';
        }
      } catch (e) {
        logger.error('Route access check error', e);
        // On error, allow access (fail open)
        setHasAccess(true);
      } finally {
        setChecking(false);
      }
    };

    checkAccess();
  }, [user, loading, routePath]);

  if (loading || checking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Yükleniyor...</div>
      </div>
    );
  }

  if (!user) {
    return null; // Redirecting to login
  }

  if (hasAccess === false) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Erişim Reddedildi</h1>
          <p className="text-gray-600 mb-4">Bu sayfaya erişim yetkiniz yok.</p>
          <a href="/user" className="text-blue-600 hover:text-blue-800 underline">
            Ana Sayfaya Dön
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default function RouteGuard(props: RouteGuardProps) {
  return (
    <QueryProvider>
      <RouteGuardContent {...props} />
    </QueryProvider>
  );
}

