import { api } from '../lib/axiosClient';
import { filterBrandsByCategory } from '../lib/brandCategories';
import { getListItems } from '../utils/apiList';
import { logger } from '../lib/logger';
import type { MeResponse, Kpi, KpiFormula, KpiCumulativeSource, KpiDetail, DailyReport, MonthlyReport, Target, BrandKpiMapping, ApiUser } from '../types/api';

export interface User {
  id: string;
  email: string;
  role: string; // dinamik roller desteklensin
  created_at: string;
  last_sign_in_at?: string;
  user_metadata?: {
    username?: string;
    full_name?: string;
    role?: string;
  };
  brands?: { id: string; name: string }[];
}

export interface PaginatedUsers {
  users: User[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function getMe(): Promise<MeResponse> {
  const { data } = await api.get<{ success: true; data: MeResponse; message?: string }>('/me');
  // Backend returns: { success: true, data: { user, role, brands }, message }
  // Backend may return dynamic roles (e.g., "Genel Koordinatör")
  const responseData = (data as { data?: MeResponse } & Partial<MeResponse>);
  const meData = responseData.data || responseData;
  return {
    user: meData.user || {} as ApiUser,
    role: meData.role || meData.user?.user_metadata?.role || 'user',
    brands: meData.brands || [],
  };
}

export async function verifyPassword(password: string) {
  // baseURL zaten /api ile bitiyor, bu yüzden sadece /auth/verify-password kullan
  const { data } = await api.post('/auth/verify-password', { password });
  return data as { verified: boolean };
}

export async function adminCreateUser(payload: { email: string; password: string; role: 'admin' | 'user' }) {
  const { data } = await api.post<{ success: boolean; user: User }>('/admin/users', payload);
  return data;
}

export async function createUser(payload: { 
  email: string; 
  password: string; 
  role: string;
  username?: string;
  full_name?: string;
  brandIds?: string[];
}) {
  const { data } = await api.post('/admin/users', payload);
  return data as { user: User };
}

export async function getUsers(params?: { 
  page?: number; 
  limit?: number; 
  search?: string; 
  role?: 'admin' | 'user' | 'all';
}) {
  const res = await api.get('/admin/users', { params });
  const body = res.data || {};
  const payload = body.data || {};
  const items = getListItems<User>(payload);
  const count = typeof payload.count === 'number' ? payload.count : items.length;
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 10;
  // Backend şu an toplam kayıt sayısını sağlamıyor; mevcut sayfada gelen
  // kayıt sayısını temel alarak total ve totalPages oluşturuyoruz.
  const total = count;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    users: items,
    total,
    page,
    limit,
    totalPages,
  } as PaginatedUsers;
}

export async function updateUser(userId: string, payload: { 
  email?: string; 
  role?: string;
  username?: string;
  full_name?: string;
  password?: string;
  brandIds?: string[];
}) {
  const { data } = await api.put(`/admin/users/${userId}`, payload);
  return data as { user: User };
}

export async function getUserBrandIds(userId: string) {
  const res = await api.get(`/admin/users/${userId}/brands`);
  const body = res.data || {};
  const payload = body.data || {};
  return (payload?.brandIds || []) as string[];
}

export async function deleteUser(userId: string) {
  logger.debug('API deleteUser called', { userId });
  const { data } = await api.delete(`/admin/users/${userId}`);
  logger.debug('API deleteUser response', { success: data?.success });
  return data as { success: boolean };
}

// --- Brands ---
export interface Brand {
  id: string;
  name: string;
  description: string;
  status: 'aktif' | 'pasif' | 'kayitli';
  created_at: string;
  category_key?: string;
}

export async function getBrands(params?: { search?: string; status?: 'all' | 'aktif' | 'pasif' | 'kayitli'; brandCategory?: string }) {
  // Use /api/brands endpoint for user pages (requires auth, returns only user's authorized brands)
  // Use /api/admin/brands endpoint for admin pages (requires admin, returns all brands)
  // For now, use /api/brands for user pages - it filters by user_brands automatically
  const res = await api.get('/brands', { params });
  const body = res.data || {};
  const payload = body.data || {};
  let items = getListItems<Brand>(payload);

  // Apply status filter on client side if needed (backend /api/brands doesn't support status filter)
  if (params?.status && params.status !== 'all') {
    items = items.filter(brand => {
      if (params.status === 'aktif') return brand.status === 'aktif';
      if (params.status === 'pasif') return brand.status === 'pasif';
      if (params.status === 'kayitli') return brand.status === 'kayitli';
      return true;
    });
  }

  // Eğer kategori anahtarı gönderilmiş ve backend boş dönerse,
  // güvenli geri dönüş: filtresiz listeyi çekip, istemci tarafında filtre uygula
  if ((params?.brandCategory ?? '').trim() && items.length === 0) {
    const p = params ?? {};
    const { search, brandCategory } = p;
    const res2 = await api.get('/brands', { params: { search } });
    const body2 = res2.data || {};
    const payload2 = body2.data || {};
    const allItems = getListItems<Brand>(payload2);
    const filtered = filterBrandsByCategory(allItems, brandCategory);
    // Apply status filter
    let finalFiltered = filtered;
    if (params?.status && params.status !== 'all') {
      finalFiltered = filtered.filter(brand => {
        if (params.status === 'aktif') return brand.status === 'aktif';
        if (params.status === 'pasif') return brand.status === 'pasif';
        if (params.status === 'kayitli') return brand.status === 'kayitli';
        return true;
      });
    }
    return { brands: finalFiltered };
  }

  return { brands: items };
}

// Admin-only function to get all brands (requires admin access)
export async function adminGetBrands(params?: { search?: string; status?: 'all' | 'aktif' | 'pasif' | 'kayitli'; brandCategory?: string }) {
  const res = await api.get('/admin/brands', { params });
  const body = res.data || {};
  const payload = body.data || {};
  let items = getListItems<Brand>(payload);

  // Eğer kategori anahtarı gönderilmiş ve backend boş dönerse,
  // güvenli geri dönüş: filtresiz listeyi çekip, istemci tarafında filtre uygula
  if ((params?.brandCategory ?? '').trim() && items.length === 0) {
    const p = params ?? {};
    const { search, status, brandCategory } = p;
    const res2 = await api.get('/admin/brands', { params: { search, status } });
    const body2 = res2.data || {};
    const payload2 = body2.data || {};
    const allItems = getListItems<Brand>(payload2);
    const filtered = filterBrandsByCategory(allItems, brandCategory);
    return { brands: filtered };
  }

  return { brands: items };
}

export async function adminCreateBrand(payload: { name: string; description?: string; status?: 'aktif' | 'pasif' | 'kayitli'; category_key?: string }) {
  const { data } = await api.post('/admin/brands', payload);
  return data as { brand: Brand };
}

export async function adminUpdateBrand(id: string, payload: { name?: string; description?: string; status?: 'aktif' | 'pasif' | 'kayitli'; category_key?: string | null }) {
  const { data } = await api.put(`/admin/brands/${id}`, payload);
  return data as { brand: Brand };
}

export async function adminDeleteBrand(id: string) {
  const { data } = await api.delete(`/admin/brands/${id}`);
  return data as { success: boolean };
}

// Model types
export interface BrandModel {
  id: string;
  brand_id: string;
  name: string;
  description?: string;
  status: 'aktif' | 'pasif' | 'kayitli';
  created_at: string;
  updated_at?: string;
}

// Model API functions
export async function adminGetModels(brandId: string, params?: { search?: string; status?: 'all' | 'aktif' | 'pasif' | 'kayitli' }) {
  const res = await api.get(`/admin/brands/${brandId}/models`, { params });
  const body = res.data || {};
  const payload = body.data || {};
  const items = getListItems<BrandModel>(payload);
  return { models: items };
}

export async function adminCreateModel(brandId: string, payload: { name: string; description?: string; status?: 'aktif' | 'pasif' | 'kayitli' }) {
  const { data } = await api.post(`/admin/brands/${brandId}/models`, payload);
  return data as { model: BrandModel };
}

export async function adminUpdateModel(brandId: string, id: string, payload: { name?: string; description?: string; status?: 'aktif' | 'pasif' | 'kayitli' }) {
  const { data } = await api.put(`/admin/brands/${brandId}/models/${id}`, payload);
  return data as { model: BrandModel };
}

export async function adminDeleteModel(brandId: string, id: string) {
  const { data } = await api.delete(`/admin/brands/${brandId}/models/${id}`);
  return data as { success: boolean };
}

export async function getKpis(): Promise<Kpi[]> {
  const { data } = await api.get('/admin/kpis');
  return getListItems<Kpi>(data);
}

// --- KPI Formulas ---
export async function adminUpdateKpiFormula(kpiId: string, payload: { expression?: string; display_expression?: string | null }) {
  const { data } = await api.put(`/admin/kpis/${kpiId}/formula`, payload);
  return data as { formula?: { kpi_id: string; expression: string; display_expression: string | null } };
}

export async function adminBulkUpdateKpiStatus(kpiIds: string[], status: 'aktif' | 'pasif') {
  const { data } = await api.post('/admin/kpis/bulk-status', { kpiIds, status });
  return data as { success: boolean };
}

export async function adminBulkUpdateKpiCategory(kpiIds: string[], category: string) {
  const { data } = await api.post('/admin/kpis/bulk-category', { kpiIds, category });
  return data as { success: boolean };
}

export async function adminBulkDeleteKpis(kpiIds: string[]) {
  const { data } = await api.post('/admin/kpis/bulk-delete', { kpiIds });
  return data as { success: boolean };
}

/**
 * Creates a new KPI.
 * @param kpiData - The data for the new KPI.
 * @returns The created KPI data.
 */
export async function adminCreateKpi(kpiData: Record<string, unknown>) {
  const { data } = await api.post<{ success: boolean; kpi: Kpi }>('/admin/kpis', kpiData);
  return data;
}

/**
 * Updates an existing KPI.
 * @param kpiId - The ID of the KPI to update.
 * @param kpiData - The data to update for the KPI.
 * @returns The updated KPI data.
 */
export async function adminUpdateKpi(kpiId: string, kpiData: Record<string, unknown>) {
  const { data } = await api.put<{ success: boolean; kpi: Kpi }>(`/admin/kpis/${kpiId}`, kpiData);
  return data;
}

/**
 * Deletes a KPI.
 * @param kpiId - The ID of the KPI to delete.
 * @returns A success flag.
 */
export async function adminDeleteKpi(kpiId: string) {
  const { data } = await api.delete(`/admin/kpis/${kpiId}`);
  return data as { success: boolean };
}

/**
 * Gets the sources for a KPI.
 * @param kpiId - The ID of the KPI.
 * @returns The KPI sources.
 */
export async function getKpiSources(kpiId: string): Promise<KpiCumulativeSource[]> {
  const { data } = await api.get(`/admin/kpis/${kpiId}/sources`);
  return getListItems<KpiCumulativeSource>(data);
}

/**
 * Gets the formula for a KPI.
 * @param kpiId - The ID of the KPI.
 * @returns The KPI formula.
 */
export async function getKpiFormula(kpiId: string): Promise<KpiFormula | null> {
  const { data } = await api.get<{ success: boolean; data: KpiFormula }>(`/admin/kpis/${kpiId}/formula`);
  return data?.data || null;
}

/**
 * Fetches all KPI categories from the backend.
 * @returns A promise that resolves to an array of category names.
 */
export async function getKpiCategories(): Promise<string[]> {
  const { data } = await api.get<{ success: boolean; data: { items: Array<{ name: string }> } }>('/admin/kpi-categories');
  const items = getListItems<{ name: string }>(data);
  return items.map((c) => c.name);
}

/**
 * Fetches all KPI units from the backend.
 * @returns A promise that resolves to an array of unit names.
 */
export async function getKpiUnits(): Promise<string[]> {
  const { data } = await api.get<{ success: boolean; data: { items: Array<{ name: string }> } }>('/admin/kpi-units');
  const items = getListItems<{ name: string }>(data);
  return items.map((u) => u.name);
}

export async function adminCreateCategory(name: string) {
  const { data } = await api.post('/admin/kpi-categories', { name });
  return data as { success: boolean };
}

export async function adminUpdateCategory(oldName: string, newName: string) {
  const { data } = await api.put(`/admin/kpi-categories/${oldName}`, { name: newName });
  return data as { success: boolean };
}

export async function adminDeleteCategory(name: string) {
  const { data } = await api.delete(`/admin/kpi-categories/${name}`);
  return data as { success: boolean };
}

export async function adminCreateUnit(name: string) {
  const { data } = await api.post('/admin/kpi-units', { name });
  return data as { success: boolean };
}

export async function adminDeleteUnit(name: string) {
  const { data } = await api.delete(`/admin/kpi-units/${name}`);
  return data as { success: boolean };
}

export const getBrandKpis = async (brandId: string): Promise<{ kpis: Kpi[] }> => {
  try {
    // Axios client already has baseURL `/api`, so avoid double prefix
    const res = await api.get(`/brands/${brandId}/kpis`);
    // Backend now returns standard sendList format
    return { kpis: getListItems<Kpi>(res.data) };
  } catch (error) {
    throw error;
  }
};
export const getKpiCumulativeSources = (kpiIds: string[]): Promise<KpiCumulativeSource[]> => 
  api.get(`/kpis/cumulative_sources?kpi_ids=${kpiIds.join(',')}`).then(res => getListItems<KpiCumulativeSource>(res.data));
export const getKpiFormulas = (kpiIds: string[]): Promise<KpiFormula[]> => 
  api.get(`/kpis/formulas?kpi_ids=${kpiIds.join(',')}`).then(res => getListItems<KpiFormula>(res.data));
export const getKpiMonthlyReports = (brandId: string, year: number, month: number, kpiIds: string[]): Promise<MonthlyReport[]> => 
  api.get(`/reports/monthly?brand_id=${brandId}&year=${year}&month=${month}&kpi_ids=${kpiIds.join(',')}`).then(res => getListItems<MonthlyReport>(res.data));
export const getKpiDailyReports = async (brandId: string, year: number, month: number, day?: number, kpiIds?: string[]): Promise<DailyReport[]> => {
  try {
    const res = await api.get(`/reports/daily?brand_id=${brandId}&year=${year}&month=${month}${day ? `&day=${day}` : ''}${kpiIds ? `&kpi_ids=${kpiIds.join(',')}` : ''}`);
    return getListItems<DailyReport>(res.data);
  } catch (error) {
    throw error;
  }
};
export const getBrandKpiTargets = async (brandId: string, year: number, month?: number, kpiIds?: string[]): Promise<Target[]> => {
  try {
    const res = await api.get(`/targets?brand_id=${brandId}&year=${year}${month ? `&month=${month}` : ''}${kpiIds ? `&kpi_ids=${kpiIds.join(',')}` : ''}`);
    return getListItems<Target>(res.data);
  } catch (error) {
    throw error;
  }
};
export const saveKpiDailyReport = (brandId: string, year: number, month: number, day: number, kpiId: string, value: number | null) => {
  const normalized = value ?? 0;
  return api.post('/reports/daily', { brand_id: brandId, year, month, day, kpi_id: kpiId, value: normalized });
};
export const saveBrandKpiMonthlyTarget = (brandId: string, year: number, month: number, kpiId: string, value: number | null) => {
  const normalized = value ?? 0;
  return api.post('/targets', { brand_id: brandId, year, month, kpi_id: kpiId, value: normalized });
};
export const saveBrandKpiYearlyTarget = (brandId: string, year: number, kpiId: string, value: number | null) => {
  const normalized = value ?? 0;
  return api.post('/targets', { brand_id: brandId, year, kpi_id: kpiId, value: normalized });
};
export const saveKpiReport = (brandId: string, year: number, month: number, kpiId: string, value: number | null) => {
  const normalized = value ?? 0;
  return api.post('/reports/monthly', { brand_id: brandId, year, month, kpi_id: kpiId, value: normalized });
};
// sendList dönen endpoint: data.items içinden diziyi çıkar
export const getBrandKpiMappings = (brandId: string): Promise<BrandKpiMapping[]> => 
  api.get(`/brands/${brandId}/kpi-mappings`).then(res => getListItems<BrandKpiMapping>(res.data));
export const addBrandKpiMapping = (brandId: string, kpiId: string) => api.post(`/brands/${brandId}/kpi-mappings`, { kpi_id: kpiId });
export const deleteBrandKpiMapping = (brandId: string, kpiId: string) => api.delete(`/brands/${brandId}/kpi-mappings/${kpiId}`);
// sendList dönen endpoint
export const getKpiDetails = (kpiIds: string[]): Promise<KpiDetail[]> => 
  api.get(`/kpis/details?kpi_ids=${kpiIds.join(',')}`).then(res => getListItems<KpiDetail>(res.data));
// sendList dönen endpoint
export const getBrandKpiYearlyTargets = (brandId: string, year: number, kpiIds: string[]): Promise<Target[]> => 
  api.get(`/targets/yearly?brand_id=${brandId}&year=${year}&kpi_ids=${kpiIds.join(',')}`).then(res => getListItems<Target>(res.data));
// sendList dönen endpoint
export const getKpiMonthlyReportsForUser = (brandId: string, year: number, kpiIds: string[]): Promise<MonthlyReport[]> => {
  if (!kpiIds || kpiIds.length === 0) {
    return Promise.resolve([]);
  }
  return api.get(`/reports/monthly/user?brand_id=${brandId}&year=${year}&kpi_ids=${kpiIds.join(',')}`).then(res => getListItems<MonthlyReport>(res.data));
};

// User summary and activities
export const getUserSummary = () => api.get('/user/summary').then(res => res.data.data || res.data);
export const getUserActivities = (limit = 10) => api.get(`/user/activities?limit=${limit}`).then(res => getListItems(res.data));
export const deleteKpiReport = (brandId: string, year: number, month: number, kpiId: string) => api.delete(`/reports/monthly?brand_id=${brandId}&year=${year}&month=${month}&kpi_id=${kpiId}`);
export const deleteBrandKpiYearlyTarget = (brandId: string, year: number, kpiId: string) => api.delete(`/targets?brand_id=${brandId}&year=${year}&kpi_id=${kpiId}`);

// Model-based sales data types
export interface ModelBasedSalesData {
  id?: string;
  modelId: string;
  modelName?: string;
  date: string;
  baglanti: number | null;
  fatura: number | null;
  faturaBaglanti: number | null;
  hedef: number | null;
}

// Model-based sales API functions
export async function getModelBasedSales(brandId: string, date: string): Promise<ModelBasedSalesData[]> {
  const res = await api.get(`/brands/${brandId}/models/sales`, { params: { date } });
  return getListItems<ModelBasedSalesData>(res.data);
}

export async function saveModelBasedSales(brandId: string, data: ModelBasedSalesData): Promise<{ success: boolean }> {
  const { data: response } = await api.post(`/brands/${brandId}/models/sales`, {
    date: data.date,
    modelId: data.modelId,
    baglanti: data.baglanti,
    fatura: data.fatura,
    faturaBaglanti: data.faturaBaglanti,
    hedef: data.hedef,
  });
  return { success: true };
}

export async function saveModelBasedSalesBulk(brandId: string, date: string, salesData: ModelBasedSalesData[]): Promise<{ success: boolean; count: number }> {
  const response = await api.post(`/brands/${brandId}/models/sales/bulk`, {
    date,
    salesData: salesData.map(item => ({
      modelId: item.modelId,
      baglanti: item.baglanti,
      fatura: item.fatura,
      faturaBaglanti: item.faturaBaglanti,
      hedef: item.hedef,
    })),
  });
  // Backend sendSuccess format: { success: true, data: { count: ... }, message: ... }
  const count = response?.data?.data?.count || 0;
  return { success: true, count };
}