import React, { useState, useEffect, useMemo } from 'react';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { QueryProvider } from './providers/QueryProvider';
import { fetchRoleRoutes } from '../lib/accessControl';
import { userItems } from '../lib/sidebarMenuItems';
import { BarChartIcon, DashboardIcon, ReportsIcon, ShieldIcon, ActivityIcon, MagnetIcon } from './ui/icons';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { logger } from '../lib/logger';

function UserDashboardContent() {
  const { user } = useCurrentUser();
  
  // User access control
  const [accessibleRoutes, setAccessibleRoutes] = useState<string[]>([]);
  const [accessLoading, setAccessLoading] = useState(true);

  // Load user accessible routes
  useEffect(() => {
    const loadAccessibleRoutes = async () => {
      if (!user?.role) {
        setAccessLoading(false);
        return;
      }

      try {
        setAccessLoading(true);
        // Admin equivalent roles have access to all routes
        const normalizedRole = user.role.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
        if (user.role === 'admin' || normalizedRole === 'genel koordinator') {
          // Extract all routes from userItems
          const allRoutes: string[] = [];
          const extractRoutes = (items: typeof userItems) => {
            items.forEach(item => {
              if (item.href) allRoutes.push(item.href);
              if (item.children) extractRoutes(item.children);
            });
          };
          extractRoutes(userItems);
          logger.debug('[UserDashboard] Admin/equivalent role, allowing all routes', { allRoutes });
          setAccessibleRoutes(allRoutes);
        } else {
          // Fetch routes for this role
          logger.debug('[UserDashboard] Loading routes for role', { role: user.role });
          const routes = await fetchRoleRoutes(user.role);
          logger.debug('[UserDashboard] Loaded routes', { 
            role: user.role, 
            routesCount: routes?.length,
            routesType: typeof routes,
            routesIsArray: Array.isArray(routes),
            routesPreview: routes?.slice(0, 10) // İlk 10 route'u göster
          });
          
          // If routes are successfully loaded, use them
          // Empty array means no routes assigned (fail closed - only show home page)
          if (routes && Array.isArray(routes) && routes.length > 0) {
            logger.debug('[UserDashboard] Setting accessible routes', { routes });
            setAccessibleRoutes(routes);
          } else {
            // No routes assigned - only allow home page
            logger.warn('[UserDashboard] No routes found for role, only allowing home page', { 
              role: user.role, 
              routesLength: routes?.length,
              routesIsArray: Array.isArray(routes)
            });
            setAccessibleRoutes(['/user']);
          }
        }
      } catch (e) {
        logger.error('Error loading accessible routes', e);
        // Fail closed: if check fails, only allow home page (security-first)
        setAccessibleRoutes(['/user']);
      } finally {
        setAccessLoading(false);
      }
    };

    loadAccessibleRoutes();
  }, [user?.role]);

  // Helper function to check if user has access to a route
  const hasAccess = useMemo(() => {
    return (route: string): boolean => {
      if (accessLoading) return false; // Don't show anything while loading
      // If accessibleRoutes is empty (after loading), it means no routes assigned (fail closed)
      // Only /user should be accessible in this case
      if (accessibleRoutes.length === 0) {
        return route === '/user'; // Only allow home page
      }
      return accessibleRoutes.includes(route);
    };
  }, [accessibleRoutes, accessLoading]);

  // Extract quick access links from userItems, filtered by access
  const quickAccessLinks = useMemo(() => {
    const links: Array<{ href: string; label: string; subLabel: string; icon: React.ComponentType<{ className?: string }>; color: string }> = [];
    
    logger.debug('[UserDashboard] Extracting quick access links', {
      accessibleRoutesCount: accessibleRoutes.length,
      accessLoading,
      hasAccessFunction: typeof hasAccess
    });
    
    const extractLinks = (items: typeof userItems) => {
      items.forEach(item => {
        if (item.href) {
          const access = hasAccess(item.href);
          logger.debug('[UserDashboard] Checking access for route', {
            route: item.href,
            hasAccess: access,
            inAccessibleRoutes: accessibleRoutes.includes(item.href)
          });
          
          if (access) {
            // Map routes to quick access links
            if (item.href === '/user/sales/dashboard') {
              links.push({ href: item.href, label: 'Satış', subLabel: 'Dashboard', icon: BarChartIcon, color: 'blue' });
            } else if (item.href === '/user/service/dashboard') {
              links.push({ href: item.href, label: 'Servis', subLabel: 'Dashboard', icon: ShieldIcon, color: 'green' });
            } else if (item.href === '/user/rental/dashboard') {
              links.push({ href: item.href, label: 'Kiralama', subLabel: 'Dashboard', icon: BarChartIcon, color: 'amber' });
            } else if (item.href === '/user/second-hand/dashboard') {
              links.push({ href: item.href, label: 'İkinci El', subLabel: 'Dashboard', icon: MagnetIcon, color: 'violet' });
            } else if (item.href === '/user/expertise/dashboard') {
              links.push({ href: item.href, label: 'Ekspertiz', subLabel: 'Dashboard', icon: ShieldIcon, color: 'indigo' });
            } else if (item.href === '/user/overview/daily-kpi-dashboard') {
              links.push({ href: item.href, label: 'Günlük KPI', subLabel: 'Dashboard', icon: DashboardIcon, color: 'blue' });
            } else if (item.href === '/user/overview/monthly-kpi-dashboard') {
              links.push({ href: item.href, label: 'Aylık KPI', subLabel: 'Dashboard', icon: ReportsIcon, color: 'blue' });
            } else if (item.href === '/user/sales/data-entry') {
              links.push({ href: item.href, label: 'Veri Girişi', subLabel: 'Satış', icon: ActivityIcon, color: 'gray' });
            } else if (item.href === '/user/reports') {
              links.push({ href: item.href, label: 'Raporlar', subLabel: 'Tüm Raporlar', icon: ReportsIcon, color: 'gray' });
            }
          }
        }
        if (item.children) extractLinks(item.children);
      });
    };
    
    extractLinks(userItems);
    logger.debug('[UserDashboard] Final quick access links', {
      linksCount: links.length,
      links: links.map(l => l.href)
    });
    return links;
  }, [hasAccess, accessibleRoutes, accessLoading]);


  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-6">

      {/* 2. Hızlı Erişim Linkleri - Kullanıcının erişim haklarına göre filtrelenmiş */}
      {quickAccessLinks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DashboardIcon className="w-5 h-5" />
              Hızlı Erişim
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
              {quickAccessLinks.map((link, index) => {
                const Icon = link.icon;
                const colorClasses = {
                  blue: 'hover:border-blue-500 hover:bg-blue-50 active:bg-blue-100 text-blue-600 group-hover:text-blue-700',
                  green: 'hover:border-green-500 hover:bg-green-50 active:bg-green-100 text-green-600 group-hover:text-green-700',
                  amber: 'hover:border-amber-500 hover:bg-amber-50 active:bg-amber-100 text-amber-600 group-hover:text-amber-700',
                  violet: 'hover:border-violet-500 hover:bg-violet-50 active:bg-violet-100 text-violet-600 group-hover:text-violet-700',
                  indigo: 'hover:border-indigo-500 hover:bg-indigo-50 active:bg-indigo-100 text-indigo-600 group-hover:text-indigo-700',
                  gray: 'hover:border-gray-500 hover:bg-gray-50 active:bg-gray-100 text-gray-600 group-hover:text-gray-900',
                };
                const colorClass = colorClasses[link.color as keyof typeof colorClasses] || colorClasses.gray;
                
                return (
                  <a
                    key={index}
                    href={link.href}
                    className={`flex flex-col items-center justify-center p-3 sm:p-4 border-2 border-gray-200 rounded-lg ${colorClass} transition-all group touch-manipulation`}
                  >
                    <Icon className="w-6 h-6 sm:w-8 sm:h-8 mb-1 sm:mb-2 group-hover:scale-110 transition-transform" />
                    <span className="text-xs sm:text-sm font-medium text-gray-700 text-center">{link.label}</span>
                    <span className="text-xs text-gray-500 text-center">{link.subLabel}</span>
                  </a>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
      
      {quickAccessLinks.length === 0 && !accessLoading && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DashboardIcon className="w-5 h-5" />
              Hızlı Erişim
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500 text-center py-4">
              Erişim yetkiniz bulunmuyor. Lütfen yöneticinizle iletişime geçin.
            </p>
          </CardContent>
        </Card>
      )}

    </div>
  );
}

export default function UserDashboard() {
  return (
    <QueryProvider>
      <UserDashboardContent />
    </QueryProvider>
  );
}
