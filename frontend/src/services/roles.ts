import { api } from '../lib/axiosClient';

export type RoleStatus = 'aktif' | 'pasif';

export interface RoleItem {
  id: string;
  name: string;
  description?: string;
  status: RoleStatus;
  created_at: string;
}

export interface CreateRolePayload {
  name: string;
  description?: string;
  status: RoleStatus;
}

export interface UpdateRolePayload {
  name?: string;
  description?: string;
  status?: RoleStatus;
}

// Backend /admin/roles endpoint'i sendList ile dönüyor:
// { success, message, data: { items: RoleItem[], count: number } }
// Bu yüzden roles listesini data.items'tan almamız gerekiyor.
export async function listRoles(params?: { search?: string; status?: RoleStatus | 'all' }): Promise<RoleItem[]> {
  const res = await api.get('/admin/roles', { params });
  const body = res.data || {};
  const payload = body.data || {};
  const items = (payload.items ?? []) as any[];
  // Defensive filtering: drop null/undefined and malformed entries
  const safe = Array.isArray(items)
    ? items.filter((r) => r && typeof r === 'object' && typeof r.id === 'string' && typeof r.status === 'string')
    : [];
  return safe as RoleItem[];
}

export async function createRole(payload: CreateRolePayload): Promise<RoleItem> {
  const res = await api.post('/admin/roles', payload);
  const body = res.data || {};
  const payloadData = body.data || {};
  return payloadData.role as RoleItem;
}

export async function updateRole(id: string, payload: UpdateRolePayload): Promise<RoleItem> {
  const res = await api.put(`/admin/roles/${id}`, payload);
  const body = res.data || {};
  const payloadData = body.data || {};
  return payloadData.role as RoleItem;
}

export async function deleteRole(id: string): Promise<void> {
  await api.delete(`/admin/roles/${id}`);
}