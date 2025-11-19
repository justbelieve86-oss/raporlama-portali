// Local access control utilities used by RoleManagement
// Provides client-side access matrix with backend persistence integration.
import { api } from './axiosClient';
import { userItems, adminItems, managerItems, type MenuItem } from './sidebarMenuItems';
import { logger } from './logger';

export type BaseRole = 'admin' | 'manager' | 'user';

export type RouteItem = {
  path: string;
  label: string;
};

const ACCESS_MATRIX_KEY = 'access_matrix';
const ROLE_CATEGORY_KEY = 'role_category_map';

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

// Extract all routes from sidebar menu items recursively
function extractRoutesFromMenuItems(items: MenuItem[]): RouteItem[] {
  const routes: RouteItem[] = [];
  const seenPaths = new Set<string>();

  function traverse(items: MenuItem[]) {
    for (const item of items) {
      if (item.href) {
        // Only add if not already seen (avoid duplicates)
        if (!seenPaths.has(item.href)) {
          routes.push({ path: item.href, label: item.label });
          seenPaths.add(item.href);
        }
      }
      if (item.children && item.children.length > 0) {
        traverse(item.children);
      }
    }
  }

  traverse(items);
  return routes;
}

// Returns a list of known routes to display in the access matrix.
// Automatically extracts routes from Sidebar menu items to keep in sync.
// Keep labels user-facing (Turkish) to match the rest of the UI.
export function listRoutes(): RouteItem[] {
  // Extract routes from all menu types and combine
  const allRoutes = extractRoutesFromMenuItems([...userItems, ...adminItems, ...managerItems]);

  // Sort by path for consistent display
  return allRoutes.sort((a, b) => a.path.localeCompare(b.path));
}

// Returns hierarchical menu structure for access matrix display
// Groups routes by their parent categories (like sidebar)
// category parameter filters which menu items to return
export function listRoutesHierarchical(category?: BaseRole): MenuItem[] {
  if (category === 'admin') {
    return [...adminItems];
  } else if (category === 'manager') {
    return [...managerItems];
  } else if (category === 'user') {
    return [...userItems];
  }
  // If no category specified, return all (for backward compatibility)
  return [...userItems, ...adminItems];
}

// Access Matrix: { [routePath]: BaseRole[] }
export function getAccessMatrix(): Record<string, BaseRole[]> {
  if (!isBrowser()) return {};
  const raw = localStorage.getItem(ACCESS_MATRIX_KEY);
  const parsed = safeParse<Record<string, BaseRole[]>>(raw, {});
  // Ensure unique and valid role keys
  const cleaned: Record<string, BaseRole[]> = {};
  for (const [path, roles] of Object.entries(parsed || {})) {
    const set = new Set(
      (Array.isArray(roles) ? roles : []).filter((r): r is BaseRole => r === 'admin' || r === 'manager' || r === 'user')
    );
    cleaned[path] = Array.from(set);
  }
  return cleaned;
}

export function setAccessMatrix(matrix: Record<string, BaseRole[]>): void {
  if (!isBrowser()) return;
  try {
    // Sanitize before saving
    const sanitized: Record<string, BaseRole[]> = {};
    for (const [path, roles] of Object.entries(matrix || {})) {
      const set = new Set(
        (Array.isArray(roles) ? roles : []).filter((r): r is BaseRole => r === 'admin' || r === 'manager' || r === 'user')
      );
      sanitized[path] = Array.from(set);
    }
    localStorage.setItem(ACCESS_MATRIX_KEY, JSON.stringify(sanitized));
  } catch {
    // Ignore storage errors silently
  }
}

// Backend persistence: Fetch full access matrix and map to { [routePath]: BaseRole[] }
export async function fetchAccessMatrix(): Promise<Record<string, BaseRole[]>> {
  try {
    const resp = await api.get('/admin/access-matrix');
    const items = resp?.data?.data?.items || resp?.data?.items || [];
    const map: Record<string, BaseRole[]> = {};
    for (const it of items) {
      const category: BaseRole = it.category;
      const routes: string[] = Array.isArray(it.routes) ? it.routes : [];
      for (const path of routes) {
        const prev = map[path] || [];
        if (!prev.includes(category)) prev.push(category);
        map[path] = prev;
      }
    }
    // Mirror locally for offline fallback
    setAccessMatrix(map);
    return map;
  } catch (e) {
    // Fallback to local storage if backend fails
    return getAccessMatrix();
  }
}

// Persist access matrix for a specific category
export async function saveAccessMatrixForCategory(category: BaseRole, matrix: Record<string, BaseRole[]>): Promise<void> {
  const routes = Object.entries(matrix || {})
    .filter(([_, roles]) => Array.isArray(roles) && roles.includes(category))
    .map(([path]) => path);
  try {
    await api.put('/admin/access-matrix', { category, routes });
    // Also store locally as a convenience
    setAccessMatrix(matrix);
  } catch (e) {
    // If backend fails, at least keep local copy
    setAccessMatrix(matrix);
    throw e;
  }
}

// Role Category mapping: { [roleName]: BaseRole }
export function getRoleCategory(roleName: string): BaseRole {
  if (!isBrowser()) return 'user';
  const raw = localStorage.getItem(ROLE_CATEGORY_KEY);
  const map = safeParse<Record<string, BaseRole>>(raw, {});
  const value = map[roleName];
  return value === 'admin' || value === 'manager' || value === 'user' ? value : 'user';
}

export function setRoleCategory(roleName: string, category: BaseRole): void {
  if (!isBrowser()) return;
  try {
    const raw = localStorage.getItem(ROLE_CATEGORY_KEY);
    const map = safeParse<Record<string, BaseRole>>(raw, {});
    map[roleName] = category;
    localStorage.setItem(ROLE_CATEGORY_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage errors silently
  }
}

// Backend persistence wrappers for role category
export async function fetchRoleCategory(roleName: string): Promise<BaseRole> {
  try {
    const resp = await api.get('/admin/role-categories', { params: { roleName } });
    const row = resp?.data?.data || resp?.data || null;
    const cat = row?.category;
    if (cat === 'admin' || cat === 'manager' || cat === 'user') {
      // Mirror to local for offline
      setRoleCategory(roleName, cat);
      return cat;
    }
    return getRoleCategory(roleName);
  } catch {
    return getRoleCategory(roleName);
  }
}

export async function saveRoleCategory(roleName: string, category: BaseRole): Promise<void> {
  try {
    await api.put('/admin/role-categories', { roleName, category });
    setRoleCategory(roleName, category);
  } catch (e) {
    setRoleCategory(roleName, category);
    throw e;
  }
}

// Role-based Route Access Control
// Fetch routes for a specific role
export async function fetchRoleRoutes(roleName: string): Promise<string[]> {
  try {
    logger.debug('[fetchRoleRoutes] Fetching routes for role', { roleName });
    const resp = await api.get('/admin/role-routes', { params: { roleName } });
    logger.debug('[fetchRoleRoutes] Raw response', { 
      status: resp?.status, 
      statusText: resp?.statusText,
      hasData: !!resp?.data,
      hasDataData: !!resp?.data?.data
    });
    
    const data = resp?.data?.data || resp?.data || {};
    logger.debug('[fetchRoleRoutes] Parsed data', { 
      hasRoutes: 'routes' in data,
      routesType: typeof data.routes,
      routesIsArray: Array.isArray(data.routes)
    });
    
    const routes = Array.isArray(data.routes) ? data.routes : [];
    logger.debug('[fetchRoleRoutes] Final routes', { 
      roleName, 
      routesCount: routes.length,
      routesPreview: routes.slice(0, 5) // İlk 5 route'u göster
    });
    
    return routes;
  } catch (e: unknown) {
    const error = e as { message?: string; response?: { data?: unknown; status?: number; statusText?: string } };
    logger.error('[fetchRoleRoutes] Failed to fetch role routes', {
      error: e,
      message: error?.message,
      response: error?.response?.data,
      status: error?.response?.status,
      statusText: error?.response?.statusText
    });
    return [];
  }
}

// Save routes for a specific role
export async function saveRoleRoutes(roleName: string, routes: string[]): Promise<void> {
  try {
    await api.put('/admin/role-routes', { roleName, routes });
  } catch (e) {
    logger.error('Failed to save role routes', e);
    throw e;
  }
}

// Check if current user's role has access to a specific route
export async function checkUserRouteAccess(routePath: string, userRole: string): Promise<boolean> {
  try {
    // Admin equivalent roles have access to all routes
    if (userRole === 'admin' || normalizeRole(userRole) === 'genel koordinator') {
      logger.debug('[checkUserRouteAccess] Admin/equivalent role, allowing access');
      return true;
    }
    
    logger.debug('[checkUserRouteAccess] Checking access', { routePath, userRole });
    
    // Fetch routes for this role
    const routes = await fetchRoleRoutes(userRole);
    logger.debug('[checkUserRouteAccess] Fetched routes for role', { userRole, routes, routePath, hasAccess: routes.includes(routePath) });
    
    // If no routes returned, deny access (fail closed for security)
    if (!routes || routes.length === 0) {
      logger.warn('[checkUserRouteAccess] No routes found for role, denying access', { userRole, routePath });
      return false;
    }
    
    return routes.includes(routePath);
  } catch (e) {
    logger.error('Failed to check route access', e);
    // Fail closed: if check fails, deny access (security-first approach)
    return false;
  }
}

// Helper function to normalize role (same as backend)
function normalizeRole(role: string): string {
  if (typeof role !== 'string') return '';
  try {
    return role
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  } catch {
    return String(role).toLowerCase().trim();
  }
}