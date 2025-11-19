import React, { useState, useEffect, useMemo, useCallback } from 'react';
import clsx from 'clsx';
import { 
  DashboardIcon, 
  UsersIcon, 
  BrandIcon, 
  ShieldIcon, 
  BarChartIcon, 
  ReportsIcon, 
  MenuIcon, 
  XIcon,
  ChevronDownIcon,
  MagnetIcon
} from './ui/icons';
import supabase from '../lib/supabase';
import { userItems as baseUserItems, adminItems as baseAdminItems, managerItems as baseManagerItems, type MenuItem } from '../lib/sidebarMenuItems';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { fetchRoleRoutes } from '../lib/accessControl';
import { QueryProvider } from './providers/QueryProvider';
import { logger } from '../lib/logger';

// Add icons to menu items (icons are UI-specific, not needed for access control)
const userItems: MenuItem[] = baseUserItems.map(item => {
  if (item.label === 'Ana Sayfa') return { ...item, icon: DashboardIcon };
  if (item.label === 'Genel Bakış') return { ...item, icon: DashboardIcon, children: item.children?.map(child => ({ ...child, icon: DashboardIcon })) };
  if (item.label === 'Satış Yönetimi') return { ...item, icon: BarChartIcon, children: item.children?.map((child, idx) => ({ ...child, icon: idx === 0 ? DashboardIcon : ReportsIcon })) };
  if (item.label === 'Servis Yönetimi') return { ...item, icon: ShieldIcon, children: item.children?.map((child, idx) => ({ ...child, icon: idx === 0 ? DashboardIcon : ReportsIcon })) };
  if (item.label === '2. El Operasyonu') return { ...item, icon: MagnetIcon, children: item.children?.map((child, idx) => ({ ...child, icon: idx === 0 ? DashboardIcon : ReportsIcon })) };
  if (item.label === 'Kiralama Operasyonu') return { ...item, icon: BarChartIcon, children: item.children?.map((child, idx) => ({ ...child, icon: idx === 0 ? DashboardIcon : ReportsIcon })) };
  if (item.label === 'Ekspertiz Operasyonu') return { ...item, icon: ShieldIcon, children: item.children?.map((child, idx) => ({ ...child, icon: idx === 0 ? DashboardIcon : ReportsIcon })) };
  if (item.label === 'Yetkilendirme Ayarları') return { ...item, icon: ShieldIcon, children: item.children?.map((child, idx) => ({ ...child, icon: idx === 0 ? BrandIcon : idx === 1 ? ShieldIcon : BarChartIcon })) };
  if (item.label === 'Raporlar') return { ...item, icon: ReportsIcon };
  return item;
});

const adminItems: MenuItem[] = baseAdminItems.map((item, idx) => {
  const icons = [DashboardIcon, UsersIcon, BrandIcon, ShieldIcon, BarChartIcon, ReportsIcon];
  return { ...item, icon: icons[idx] || DashboardIcon };
});

interface SidebarProps {
  role?: 'admin' | 'user' | 'manager';
}

// Manager menü öğeleri
const managerItems: MenuItem[] = baseManagerItems.map((item, idx) => {
  const icons = [DashboardIcon, BarChartIcon, ShieldIcon, ReportsIcon];
  return { ...item, icon: icons[idx] || DashboardIcon, badge: item.label === 'Satış Raporları' ? 'Sık' : undefined };
});

function SidebarContent({ role = 'user' }: SidebarProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [currentPath, setCurrentPath] = useState('');
  const [userInfo, setUserInfo] = useState<any>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [allowedRoutes, setAllowedRoutes] = useState<Set<string>>(new Set());
  const [isLoadingRoutes, setIsLoadingRoutes] = useState(true); // Track loading state
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false); // Track if initial load is complete
  const [sidebarUser, setSidebarUser] = useState<{ role: string } | null>(null); // Independent user state for sidebar
  const { user } = useCurrentUser(); // Only use user data, ignore loading state
  
  // Magnetic sidebar states
  const [isMagnetActive, setIsMagnetActive] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  // Load user data into sidebar's independent state (only once, persist across page navigation)
  useEffect(() => {
    // Only set sidebarUser once when we first get user data
    // Never clear it, even if user becomes null during page navigation
    if (user?.role && !sidebarUser) {
      logger.debug('[Sidebar] Setting sidebar user', { role: user.role });
      setSidebarUser({ role: user.role });
    }
    // Don't update if sidebarUser already exists, even if user.role changes
    // This ensures sidebar remains stable across page navigation
  }, [user?.role, sidebarUser]); // Only set once, never update

  // Helper function to check if role is admin/equivalent
  const isAdminEquivalent = useCallback((role: string): boolean => {
    if (role === 'admin') return true;
    const normalizedRole = role.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
    return normalizedRole === 'genel koordinator';
  }, []);

  // Load allowed routes for user's role (only on initial load, independent of page navigation)
  useEffect(() => {
    // Skip if already loaded (prevent re-loading on page navigation)
    if (hasInitiallyLoaded) {
      return;
    }

    // Wait for sidebar user to be set
    if (!sidebarUser?.role) {
      setIsLoadingRoutes(true);
      return;
    }

    setIsLoadingRoutes(true); // Start loading
    const loadAllowedRoutes = async () => {
      try {
        // Admin and admin-equivalent roles have access to all routes
        if (isAdminEquivalent(sidebarUser.role)) {
          // Allow all routes (empty Set means "all routes" for admin)
          logger.debug('[Sidebar] Admin/equivalent role, allowing all routes');
          setAllowedRoutes(new Set()); // Empty Set = all routes allowed
          setIsLoadingRoutes(false);
          setHasInitiallyLoaded(true);
          return;
        }
        
        logger.debug('[Sidebar] Loading routes for role', { role: sidebarUser.role });
        const routes = await fetchRoleRoutes(sidebarUser.role);
        logger.debug('[Sidebar] Loaded routes', { role: sidebarUser.role, routesCount: routes?.length });
        
        // If routes are successfully loaded, use them
        // Empty array means no routes assigned (fail closed - only show home page)
        // Non-empty array means specific routes are allowed
        if (routes && routes.length > 0) {
          logger.debug('[Sidebar] Setting allowed routes', { routes });
          setAllowedRoutes(new Set(routes));
        } else {
          // No routes assigned - only allow home page
          logger.warn('[Sidebar] No routes found for role, only allowing home page', { role: sidebarUser.role });
          setAllowedRoutes(new Set(['/user'])); // Only allow home page
        }
        setIsLoadingRoutes(false);
        setHasInitiallyLoaded(true);
      } catch (e) {
        logger.error('Failed to load allowed routes', e);
        // Fail closed: on error, only allow home page (security-first approach)
        setAllowedRoutes(new Set(['/user'])); // Only allow home page
        setIsLoadingRoutes(false);
        setHasInitiallyLoaded(true);
      }
    };
    loadAllowedRoutes();
  }, [sidebarUser?.role, hasInitiallyLoaded, isAdminEquivalent]);

  const baseMenuItems = role === 'admin' ? adminItems : role === 'manager' ? managerItems : userItems;
  
  // Filter menu items based on user's allowed routes
  // Memoize to prevent re-creation on every render
  const filterMenuItems = useCallback((items: MenuItem[]): MenuItem[] => {
    // Check if user is admin/equivalent (empty Set means "all routes" only for admin)
    const isAdmin = sidebarUser?.role ? isAdminEquivalent(sidebarUser.role) : false;
    
    return items.map(item => {
      // If item has href, check if it's allowed
      if (item.href) {
        // Admin/equivalent roles: empty Set means "all routes allowed"
        if (allowedRoutes.size === 0 && isAdmin) {
          return item;
        }
        
        // Non-admin roles: check if route is in allowed routes
        // allowedRoutes.size === 0 for non-admin means only /user is allowed (fail closed)
        // allowedRoutes.size > 0 means check if route is in the set
        if (allowedRoutes.size > 0) {
          // Check if this route is in allowed routes
          if (!allowedRoutes.has(item.href)) {
            return null; // Filter out this item
          }
        } else {
          // Non-admin with empty routes - only allow /user
          if (item.href !== '/user') {
            return null; // Filter out this item
          }
        }
      }
      
      // If item has children, filter them recursively
      if (item.children && item.children.length > 0) {
        const filteredChildren = filterMenuItems(item.children);
        // If all children are filtered out, filter out the parent too
        if (filteredChildren.length === 0) {
          return null;
        }
        return { ...item, children: filteredChildren };
      }
      
      return item;
    }).filter((item): item is MenuItem => item !== null);
  }, [allowedRoutes, sidebarUser?.role, isAdminEquivalent]);

  // Filter menu items based on user's allowed routes
  // Memoize to prevent re-renders on page navigation
  // Use sidebarUser instead of user to be independent of page navigation
  const menuItems = useMemo(() => {
    // If still loading on initial load (before first successful load), show empty array
    if (!hasInitiallyLoaded) {
      return [];
    }
    
    // If sidebarUser is null (shouldn't happen after initial load, but handle gracefully)
    if (!sidebarUser?.role) {
      return [];
    }
    
    // Always filter menu items based on allowed routes
    // filterMenuItems will handle admin/equivalent roles correctly
    return filterMenuItems(baseMenuItems);
  }, [hasInitiallyLoaded, sidebarUser?.role, allowedRoutes, baseMenuItems, filterMenuItems]);

  useEffect(() => {
    setCurrentPath(window.location.pathname);

    const fetchUserInfo = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // profiles tablosunda sadece role alanı var; full_name'i user_metadata'dan al
          const { data: profile, error: profileErr } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

          if (profileErr) {
            // profili bulamazsak, role'i user_metadata'dan varsayalım
            logger.warn('Profile fetch warning', { message: profileErr?.message || profileErr });
          }

          const fullName = user.user_metadata?.full_name || user.user_metadata?.username || (user.email ?? '').split('@')[0];
          const roleFromProfile = (profile as any)?.role;
          const role = roleFromProfile || user.user_metadata?.role || 'user';

          setUserInfo({
            email: user.email,
            fullName,
            role,
          });
        }
      } catch (e) {
        logger.error('fetchUserInfo error', e);
      }
    };

    if (window.location.pathname !== '/login') {
      fetchUserInfo();
    }

    // After mount, align magnet/expanded states with localStorage to avoid SSR/client mismatch
    try {
      const saved = localStorage.getItem('sidebar-magnet-active');
      if (saved !== null) {
        const active = JSON.parse(saved);
        setIsMagnetActive(active);
        setIsExpanded(active);
      }
    } catch (e) {
      // ignore parsing errors
    }

    // Auto-expand parent menu if current path matches a child
    // Only do this if initial load is complete and menuItems is not empty
    if (hasInitiallyLoaded && menuItems.length > 0) {
      const currentPath = window.location.pathname;
      menuItems.forEach((item) => {
        if (item.children) {
          const hasActiveChild = item.children.some(child => 
            child.href && isActiveLink(child.href, currentPath)
          );
          if (hasActiveChild) {
            setExpandedItems(prev => new Set([...prev, item.label]));
          }
        }
      });
    }
  }, [role, hasInitiallyLoaded, menuItems]);

  // No longer using CSS custom property to avoid hydration issues

  const toggleAccordion = (itemLabel: string, depth: number) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      const isExpanded = newSet.has(itemLabel);
      if (isExpanded) {
        newSet.delete(itemLabel);
      } else {
        // If toggling a top-level accordion, collapse all other top-level accordions
        if (depth === 0) {
          menuItems.forEach((topItem) => {
            if (topItem.children && topItem.label !== itemLabel) {
              newSet.delete(topItem.label);
            }
          });
        }
        newSet.add(itemLabel);
      }
      return newSet;
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const toggleMobile = () => {
    setIsMobileOpen(!isMobileOpen);
  };

  // Magnetic sidebar functions
  const toggleMagnet = () => {
    const newMagnetState = !isMagnetActive;
    setIsMagnetActive(newMagnetState);
    setIsExpanded(newMagnetState);
    localStorage.setItem('sidebar-magnet-active', JSON.stringify(newMagnetState));
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
    setIsExpanded(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    if (!isMagnetActive) {
      setIsExpanded(false);
    }
  };

  // Update expanded state when magnet state changes
  useEffect(() => {
    setIsExpanded(isMagnetActive || isHovered);
  }, [isMagnetActive, isHovered]);

  const renderMenuItems = (items: MenuItem[], depth = 0, mobile = false) => {
    return (
      <>
        {items.map((item) => {
          const Icon = item.icon;
          const key = item.href ? item.href : `${item.label}-${depth}`;
          const isActive = item.href ? isActiveLink(item.href, currentPath) : false;
          const isAccordionExpanded = expandedItems.has(item.label);
          const hasActiveChild = item.children?.some(child => 
            child.href && isActiveLink(child.href, currentPath)
          );

          if (item.children && item.children.length > 0) {
            return (
              <li key={key}>
                <button
                  onClick={() => toggleAccordion(item.label, depth)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleAccordion(item.label, depth);
                    }
                  }}
                  className={clsx(
                    'w-full group flex items-center text-sm font-medium rounded-xl transition-all duration-300',
                    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900',
                    'hover:scale-[1.02] active:scale-[0.98]',
                    hasActiveChild || isAccordionExpanded 
                      ? 'bg-gradient-to-r from-blue-600/20 to-blue-500/10 text-white shadow-lg shadow-blue-500/10 border border-blue-500/20' 
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/50 hover:shadow-md',
                    isExpanded && !mobile ? (
                      'justify-between px-3 py-3'
                    ) : (
                      'justify-center px-2 py-3'
                    )
                  )}
                  aria-expanded={isAccordionExpanded}
                  aria-controls={`submenu-${item.label}`}
                  style={{ paddingLeft: isExpanded && !mobile ? 12 * Math.min(depth, 2) + 12 : undefined }}
                  title={item.label}
                >
                  <div className="flex items-center">
                    {Icon && (
                      <Icon
                        className={clsx(
                          'h-5 w-5 flex-shrink-0 transition-all duration-300',
                          'group-hover:scale-110',
                          hasActiveChild || isAccordionExpanded ? 'text-white drop-shadow-sm' : 'text-slate-400 group-hover:text-white',
                          isExpanded && !mobile ? 'mr-3' : ''
                        )}
                      />
                    )}
                    {isExpanded && !mobile && (
                      <>
                        <span className="whitespace-normal break-words leading-snug">{item.label}</span>
                        {item.badge && (
                          <span className="ml-2 inline-block py-0.5 px-2 text-xs font-medium rounded-full bg-slate-700 text-slate-300">
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                  {isExpanded && !mobile && (
                    <ChevronDownIcon
                      className={clsx(
                        'h-4 w-4 flex-shrink-0 transition-all duration-300 ease-out',
                        isAccordionExpanded ? 'rotate-180 scale-110' : 'rotate-0',
                        hasActiveChild || isAccordionExpanded ? 'text-white drop-shadow-sm' : 'text-slate-400 group-hover:text-white group-hover:scale-110'
                      )}
                    />
                  )}
                </button>
                {(isAccordionExpanded || mobile) && (
                  <div
                    id={`submenu-${item.label}`}
                    className={clsx(
                      'overflow-hidden transition-all duration-500 ease-out',
                      isAccordionExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                    )}
                    aria-hidden={!isAccordionExpanded}
                    style={{
                      transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                  >
                    <ul className={clsx(
                      "space-y-1 mt-1",
                      isExpanded && !mobile ? "ml-6" : "ml-0"
                    )}>
                      {renderMenuItems(item.children, depth + 1, mobile)}
                    </ul>
                  </div>
                )}
              </li>
            );
          }

          // leaf link
          return (
            <li key={key}>
              <a
                href={item.href}
                onClick={mobile ? () => setIsMobileOpen(false) : undefined}
                className={clsx(
                  'group flex items-center text-sm font-medium rounded-xl transition-all duration-300',
                  'hover:scale-[1.02] active:scale-[0.98]',
                    isActive 
                    ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/30 border border-blue-400/30' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/50 hover:shadow-md',
                  isExpanded && !mobile ? 'px-3 py-3' : 'px-2 py-3 justify-center'
                )}
                style={{ 
                  paddingLeft: isExpanded && !mobile ? 12 * Math.min(depth, 2) + 12 : undefined,
                  transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
                }}
                title={item.label}
              >
                {Icon && (
                  <Icon
                    className={clsx(
                      'h-5 w-5 flex-shrink-0 transition-all duration-300',
                      'group-hover:scale-110',
                      isActive ? 'text-white drop-shadow-sm scale-110' : 'text-slate-400 group-hover:text-white',
                      isExpanded && !mobile ? 'mr-3' : ''
                    )}
                  />
                )}
                {isExpanded && !mobile && (
                  <>
                    <span className="whitespace-normal break-words leading-snug">{item.label}</span>
                    {item.badge && (
                      <span className="ml-auto inline-block py-0.5 px-2 text-xs font-medium rounded-full bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md shadow-blue-500/30 animate-pulse">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </a>
            </li>
          );
        })}
      </>
    );
  };

  return (
    <div suppressHydrationWarning>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={toggleMobile}
          className="p-2.5 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-xl shadow-black/20 hover:shadow-2xl hover:scale-110 active:scale-95 transition-all duration-300 backdrop-blur-sm border border-slate-700/50"
          aria-label={isMobileOpen ? "Menüyü kapat" : "Menüyü aç"}
        >
          <div className="transition-transform duration-300">
            {isMobileOpen ? <XIcon size={20} className="rotate-90" /> : <MenuIcon size={20} />}
          </div>
        </button>
      </div>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-md z-40 transition-opacity duration-500 ease-out"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Desktop Sidebar */}
      <aside 
        className={clsx(
          "lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:block lg:overflow-y-auto lg:pb-4 transition-all duration-500 ease-out",
          "lg:bg-gradient-to-b lg:from-slate-900 lg:via-slate-800 lg:to-slate-900",
          "lg:backdrop-blur-xl lg:shadow-2xl lg:border-r lg:border-slate-700/50",
          isExpanded ? "lg:w-72" : "lg:w-16"
        )}
        data-expanded={isExpanded}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Header with User Profile and Magnet */}
        <div className="flex flex-col border-b border-slate-700/50 backdrop-blur-sm">
          {/* Top section with logo and magnet */}
          <div className="flex h-16 shrink-0 items-center relative">
            <div className={clsx(
              "flex items-center transition-all duration-500 ease-out flex-1",
              isExpanded ? "px-6 space-x-3" : "px-3 justify-center"
            )}>
              <div className={clsx(
                "w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0",
                "shadow-lg shadow-blue-500/30 transition-all duration-300",
                "hover:scale-110 hover:shadow-xl hover:shadow-blue-500/50"
              )}>
                <span className="text-white text-sm font-bold">R</span>
              </div>
              {isExpanded && (
                <div className="overflow-hidden flex-1 animate-in slide-in-from-left-4 duration-500">
                  <h1 className="text-white font-semibold text-lg whitespace-nowrap bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                    Raporlama
                  </h1>
                </div>
              )}
              {isExpanded && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={toggleMagnet}
                    className={clsx(
                      "p-2 rounded-xl transition-all duration-300 flex-shrink-0",
                      "hover:scale-110 active:scale-95",
                      isMagnetActive 
                        ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/50" 
                        : "bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 backdrop-blur-sm"
                    )}
                    title={isMagnetActive ? "Mıknatısı Kapat" : "Mıknatısı Aç"}
                  >
                    <MagnetIcon size={16} className="transition-transform duration-300" />
                  </button>
                </div>
              )}
            </div>
            {!isExpanded && (
              <div className="absolute top-2 right-1 flex flex-col space-y-1">
                <button
                  onClick={toggleMagnet}
                  className={clsx(
                    "p-1.5 rounded-lg transition-all duration-300",
                    "hover:scale-110 active:scale-95",
                    isMagnetActive 
                      ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30" 
                      : "bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 backdrop-blur-sm"
                  )}
                  title={isMagnetActive ? "Mıknatısı Kapat" : "Mıknatısı Aç"}
                >
                  <MagnetIcon size={12} />
                </button>
              </div>
            )}
          </div>
          

        </div>
        

        
        <nav className={clsx("transition-all duration-300", isExpanded ? "px-6 mt-4" : "px-2 mt-8")}>
          <ul className="space-y-2">
            {(!hasInitiallyLoaded && isLoadingRoutes) ? (
              // Show loading skeleton only on initial load (before first successful load)
              <li className="px-3 py-2 text-slate-400 text-sm">
                <div className="flex items-center space-x-3">
                  <div className="w-5 h-5 bg-slate-700 rounded animate-pulse"></div>
                  {isExpanded && <div className="h-4 bg-slate-700 rounded w-24 animate-pulse"></div>}
                </div>
              </li>
            ) : (
              // Once initially loaded, always show menu items (independent of page navigation)
              renderMenuItems(menuItems, 0, false)
            )}
          </ul>
        </nav>
        
        {/* Bottom section */}
        <div className={clsx(
          "absolute bottom-0 left-0 right-0 border-t border-slate-700/50 backdrop-blur-sm transition-all duration-500 ease-out",
          isExpanded ? "p-6" : "p-2"
        )}>
          <button
            onClick={handleLogout}
            className={clsx(
              "group flex items-center w-full text-sm font-medium text-slate-300 rounded-xl",
              "hover:text-white hover:bg-gradient-to-r hover:from-red-600/20 hover:to-red-500/10",
              "hover:border hover:border-red-500/20 hover:shadow-md",
              "transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]",
              isExpanded ? 'px-3 py-3' : 'px-2 py-3 justify-center'
            )}
            title={!isExpanded ? "Çıkış Yap" : ""}
          >
            <svg
              className={clsx(
                "h-5 w-5 text-slate-400 group-hover:text-red-400 transition-all duration-300 group-hover:scale-110",
                isExpanded ? 'mr-3' : ''
              )}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013 3v1"
              />
            </svg>
            {isExpanded && "Çıkış Yap"}
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <aside className={clsx(
          "lg:hidden fixed inset-y-0 left-0 z-50 w-72 sm:w-80",
          "bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900",
          "backdrop-blur-xl shadow-2xl border-r border-slate-700/50",
          "transform transition-transform duration-500 ease-out overflow-y-auto",
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{
          transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <div className="flex h-16 shrink-0 items-center justify-between px-4 sm:px-6 border-b border-slate-700/50 backdrop-blur-sm sticky top-0 bg-slate-900/80 z-10">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/30">
              <span className="text-white text-sm font-bold">R</span>
            </div>
            <div>
              <h1 className="text-white font-semibold text-lg bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                Raporlama
              </h1>
            </div>
          </div>
          <button
            onClick={() => setIsMobileOpen(false)}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/50 transition-all duration-300 hover:scale-110 active:scale-95 touch-manipulation"
            aria-label="Menüyü kapat"
          >
            <XIcon size={20} className="transition-transform duration-300" />
          </button>
        </div>
        <nav className="mt-8 px-6">
          <ul className="space-y-2">
            {(!hasInitiallyLoaded && isLoadingRoutes) ? (
              // Show loading skeleton only on initial load (before first successful load)
              <li className="px-3 py-2 text-slate-400 text-sm">
                <div className="flex items-center space-x-3">
                  <div className="w-5 h-5 bg-slate-700 rounded animate-pulse"></div>
                  <div className="h-4 bg-slate-700 rounded w-24 animate-pulse"></div>
                </div>
              </li>
            ) : (
              // Once initially loaded, always show menu items (independent of page navigation)
              renderMenuItems(menuItems, 0, true)
            )}
          </ul>
        </nav>
        
        {/* Bottom section */}
        <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-slate-700/50 backdrop-blur-sm">
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-3 py-3 text-sm font-medium text-slate-300 hover:text-white hover:bg-gradient-to-r hover:from-red-600/20 hover:to-red-500/10 hover:border hover:border-red-500/20 hover:shadow-md rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] group"
          >
            <svg
              className="mr-3 h-5 w-5 flex-shrink-0 text-slate-400 group-hover:text-red-400 transition-all duration-300 group-hover:scale-110"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013 3v1"
              />
            </svg>
            <span>Çıkış Yap</span>
        </button>
      </div>
    </aside>
    </div>
  );
}

function isActiveLink(href: string, currentPath: string): boolean {
  if (href === '/admin' || href === '/user') {
    return currentPath === href;
  }
  return currentPath.startsWith(href);
}

export default function Sidebar(props: SidebarProps) {
  return (
    <QueryProvider>
      <SidebarContent {...props} />
    </QueryProvider>
  );
}