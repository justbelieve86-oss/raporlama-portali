import React, { useEffect, useMemo, useState } from 'react';
import { DashboardIcon, ShieldCheckIcon, UsersIcon, PauseIcon, EditIcon, TrashIcon, EyeIcon } from './ui/icons';
import { Button } from './ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './ui/table';
import { Modal, ModalFooter } from './ui/modal';
import clsx from 'clsx';
import { listRoles, createRole, updateRole, deleteRole, type RoleItem as ServiceRoleItem } from '../services/roles';
import ErrorAlert from './ui/ErrorAlert';
import { toUserFriendlyError, type FriendlyError } from '../lib/errorUtils';
import { useToast } from '../hooks/useToast';
import { listRoutes, listRoutesHierarchical, fetchRoleCategory, saveRoleCategory, fetchRoleRoutes, saveRoleRoutes, type BaseRole } from '../lib/accessControl';
import type { MenuItem } from '../lib/sidebarMenuItems';
import { logger } from '../lib/logger';

type RoleStatus = 'aktif' | 'pasif';

interface RoleItem {
  id: string;
  name: string;
  description?: string;
  status: RoleStatus;
  created_at: string;
}

export default function RoleManagement({ className }: { className?: string }) {
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<FriendlyError | null>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newRole, setNewRole] = useState<{ name: string; description?: string; status: RoleStatus }>({ name: '', description: '', status: 'aktif' });
  const [isAddAccessModalOpen, setIsAddAccessModalOpen] = useState(false);
  const [newRoleCategory, setNewRoleCategory] = useState<BaseRole>('user');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleItem | null>(null);
  const [isEditAccessModalOpen, setIsEditAccessModalOpen] = useState(false);
  const toast = useToast();

  // Role-based Access Matrix state: { [roleName]: string[] (routes) }
  const [roleRoutes, setRoleRoutes] = useState<Record<string, string[]>>({});
  const routeItems = useMemo(() => listRoutes(), []);
  
  // Get hierarchical menu items based on selected category for access matrix
  const getHierarchicalMenuItems = (category: BaseRole) => {
    return listRoutesHierarchical(category);
  };

  const fetchRoles = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listRoles();
      const normalized: RoleItem[] = Array.isArray(data)
        ? (data as ServiceRoleItem[])
            .filter((r): r is ServiceRoleItem => r && typeof r === 'object' && r.id != null && r.name != null)
            .map((r: ServiceRoleItem) => ({
              id: String(r.id),
              name: String(r.name),
              description: r.description ? String(r.description) : undefined,
              status: (r.status === 'pasif' ? 'pasif' : 'aktif') as RoleStatus,
              created_at: r.created_at ? String(r.created_at) : new Date().toISOString(),
            }))
        : [];
      setRoles(normalized);
    } catch (e: unknown) {
      logger.error('Roles fetch error', e);
      setError(toUserFriendlyError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const stats = useMemo(() => {
    const safe = Array.isArray(roles)
      ? roles.filter((r): r is RoleItem => r && typeof r === 'object' && typeof r.status === 'string')
      : [];
    const total = safe.length;
    const active = safe.filter((r: RoleItem) => r.status === 'aktif').length;
    const passive = safe.filter((r: RoleItem) => r.status === 'pasif').length;
    return { total, active, passive };
  }, [roles]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR');
  };

  const getStatusBadge = (status: RoleStatus) => {
    if (status === 'aktif') {
      return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Aktif</span>;
    }
    return <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">Pasif</span>;
  };

  const openAddModal = () => {
    setNewRole({ name: '', description: '', status: 'aktif' });
    setNewRoleCategory('user');
    setIsAddModalOpen(true);
  };

  const handleAddRole = async () => {
    try {
      const created = await createRole(newRole);
      setRoles(prev => [created, ...prev]);
      // Save chosen category mapping for this new role
      try {
        await saveRoleCategory(created.name, newRoleCategory);
      } catch (_) {}
      // Save role routes if any were selected
      const routes = roleRoutes[created.name] || [];
      if (routes.length > 0) {
        try {
          await saveRoleRoutes(created.name, routes);
        } catch (_) {}
      }
      setIsAddModalOpen(false);
      setIsAddAccessModalOpen(false);
      // Safety: re-fetch latest roles to reflect server-generated fields and ensure consistency
      try {
        await fetchRoles();
      } catch (refreshErr) {
        logger.warn('Roles refresh failed after create', refreshErr);
      }
      toast.success({
        title: 'Başarılı',
        message: 'Rol başarıyla oluşturuldu'
      });
    } catch (e) {
      logger.error('Create role error', e);
      const friendly = toUserFriendlyError(e);
      toast.error({
        title: 'Hata',
        message: friendly.message || 'Rol oluşturulamadı'
      });
    }
  };

  const [editCategory, setEditCategory] = useState<BaseRole>('user');

  const openEditModal = async (role: RoleItem) => {
    setSelectedRole(role);
    try {
      const cat = await fetchRoleCategory(role.name);
      setEditCategory(cat);
    } catch (_) {
      setEditCategory('user');
    }
    // Load role routes for this role
    try {
      const routes = await fetchRoleRoutes(role.name);
      setRoleRoutes(prev => ({ ...prev, [role.name]: routes }));
    } catch (_) {
      // ignore
    }
    setIsEditModalOpen(true);
  };

  const handleUpdateRole = async () => {
    if (!selectedRole) return;
    try {
      const updated = await updateRole(selectedRole.id, {
        name: selectedRole.name,
        description: selectedRole.description,
        status: selectedRole.status,
      });
      setRoles(prev => (
        Array.isArray(prev)
          ? prev
              .filter((r): r is RoleItem => r && typeof r === 'object' && r.id != null)
              .map((r: RoleItem) => (String(r.id) === String(updated.id) ? updated : r))
          : []
      ));
      // save category mapping for this role name
      try {
        await saveRoleCategory(updated.name, editCategory);
      } catch (_) {
        // ignore
      }
      setIsEditModalOpen(false);
      toast.success({
        title: 'Başarılı',
        message: 'Rol başarıyla güncellendi'
      });
    } catch (e) {
      logger.error('Update role error', e);
      const friendly = toUserFriendlyError(e);
      toast.error({
        title: 'Hata',
        message: friendly.message || 'Rol güncellenemedi'
      });
    }
  };

  const handleDeleteRole = async (role: RoleItem) => {
    try {
      await deleteRole(role.id);
      setRoles(prev => (
        Array.isArray(prev)
          ? prev.filter((r): r is RoleItem => r && typeof r === 'object' && String(r.id) !== String(role.id))
          : []
      ));
      toast.success({
        title: 'Başarılı',
        message: 'Rol başarıyla silindi'
      });
    } catch (e) {
      logger.error('Delete role error', e);
      const friendly = toUserFriendlyError(e);
      toast.error({
        title: 'Hata',
        message: friendly.message || 'Rol silinemedi'
      });
    }
  };

  const togglePermission = async (path: string, roleName: string) => {
    if (!roleName) return;
    // Compute next routes for this role
    const currentRoutes = roleRoutes[roleName] || [];
    const set = new Set(currentRoutes);
    if (set.has(path)) {
      set.delete(path);
    } else {
      set.add(path);
    }
    const nextRoutes = Array.from(set);
    // Update local state optimistically
    setRoleRoutes(prev => ({ ...prev, [roleName]: nextRoutes }));
    // Persist to backend
    try {
      await saveRoleRoutes(roleName, nextRoutes);
      toast.success({ title: 'Kayıt edildi', message: 'Erişim matrisi güncellendi' });
    } catch (e) {
      // Revert on error
      setRoleRoutes(prev => ({ ...prev, [roleName]: currentRoutes }));
      toast.error({ title: 'Hata', message: 'Erişim matrisi kaydedilemedi' });
    }
  };

  // Toggle all routes in a category (parent item with children)
  const toggleCategory = async (categoryItem: MenuItem, roleName: string) => {
    if (!roleName || !categoryItem.children || categoryItem.children.length === 0) return;
    
    // Get all routes in this category
    const categoryRoutes: string[] = [];
    function collectRoutes(items: MenuItem[]) {
      for (const item of items) {
        if (item.href) {
          categoryRoutes.push(item.href);
        }
        if (item.children) {
          collectRoutes(item.children);
        }
      }
    }
    collectRoutes(categoryItem.children);
    
    if (categoryRoutes.length === 0) return;
    
    // Check if all routes in category are selected
    const currentRoutes = roleRoutes[roleName] || [];
    const allSelected = categoryRoutes.every(route => currentRoutes.includes(route));
    
    // Toggle: if all selected, deselect all; otherwise select all
    const set = new Set(currentRoutes);
    if (allSelected) {
      categoryRoutes.forEach(route => set.delete(route));
    } else {
      categoryRoutes.forEach(route => set.add(route));
    }
    
    const nextRoutes = Array.from(set);
    setRoleRoutes(prev => ({ ...prev, [roleName]: nextRoutes }));
    
    try {
      await saveRoleRoutes(roleName, nextRoutes);
      toast.success({ title: 'Kayıt edildi', message: 'Erişim matrisi güncellendi' });
    } catch (e) {
      setRoleRoutes(prev => ({ ...prev, [roleName]: currentRoutes }));
      toast.error({ title: 'Hata', message: 'Erişim matrisi kaydedilemedi' });
    }
  };

  // Render hierarchical menu items for access matrix
  const renderHierarchicalMenu = (items: MenuItem[], roleName: string, level: number = 0) => {
    return items.map((item, idx) => {
      const hasChildren = item.children && item.children.length > 0;
      const hasHref = !!item.href;
      const isCategory = hasChildren && !hasHref;
      const isRoute = hasHref;
      
      // For category items (parent with children but no href)
      if (isCategory) {
        const categoryRoutes: string[] = [];
        function collectRoutes(items: MenuItem[]) {
          for (const child of items) {
            if (child.href) categoryRoutes.push(child.href);
            if (child.children) collectRoutes(child.children);
          }
        }
        collectRoutes(item.children!);
        
        const currentRoutes = roleRoutes[roleName] || [];
        const allSelected = categoryRoutes.length > 0 && categoryRoutes.every(route => currentRoutes.includes(route));
        const someSelected = categoryRoutes.some(route => currentRoutes.includes(route));
        
        return (
          <React.Fragment key={`category-${idx}-${item.label}`}>
            <TableRow className="bg-gray-50">
              <TableCell colSpan={2} className="font-semibold py-3" style={{ paddingLeft: `${level * 20 + 12}px` }}>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected && !allSelected;
                    }}
                    onChange={() => toggleCategory(item, roleName)}
                    className="mr-2"
                  />
                  <span className="text-gray-800">{item.label}</span>
                </div>
              </TableCell>
            </TableRow>
            {item.children && renderHierarchicalMenu(item.children, roleName, level + 1)}
          </React.Fragment>
        );
      }
      
      // For route items (has href)
      if (isRoute) {
        const allowed = (roleRoutes[roleName] || []).includes(item.href!);
        return (
          <TableRow key={`route-${idx}-${item.href}`} className={level > 0 ? 'bg-gray-50/50' : ''}>
            <TableCell className="font-medium py-2" style={{ paddingLeft: `${level * 20 + 32}px` }}>
              {item.label}
            </TableCell>
            <TableCell>
              <input
                type="checkbox"
                checked={allowed}
                onChange={() => togglePermission(item.href!, roleName)}
              />
            </TableCell>
          </TableRow>
        );
      }
      
      // For items with both href and children (shouldn't happen in our structure, but handle it)
      return null;
    });
  };

  return (
    <div className={clsx('bg-gray-50 min-h-screen', className)}>
      <div className="px-2 py-4">
        {/* Stats Cards */}
        <div className="admin-card-grid-3">
          <div className="admin-card">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <UsersIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Toplam Rol</p>
                <p className="text-xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>
          <div className="admin-card">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <ShieldCheckIcon className="w-5 h-5 text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Aktif Rol</p>
                <p className="text-xl font-bold text-gray-900">{stats.active}</p>
              </div>
            </div>
          </div>
          <div className="admin-card">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <PauseIcon className="w-5 h-5 text-yellow-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Pasif Rol</p>
                <p className="text-xl font-bold text-gray-900">{stats.passive}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Erişim Matrisi (ana sayfa görünümü kaldırıldı; form modalları korunur) */}

        {/* Role List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <ShieldCheckIcon className="w-5 h-5 mr-2" />
              Rol Listesi
            </h2>
            <Button onClick={openAddModal} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
              + Yeni Rol Ekle
            </Button>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Rol Adı</TableHead>
                  <TableHead>Açıklama</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Oluşturulma</TableHead>
                  <TableHead>İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && (
                  <TableRow>
                    <TableCell colSpan={6}>Yükleniyor...</TableCell>
                  </TableRow>
                )}
                {error && !loading && (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <ErrorAlert
                        title="Roller yüklenemedi"
                        message={error.message}
                        details={(error.status ? `Durum: ${error.status}` : '') || undefined}
                        onRetry={fetchRoles}
                      />
                    </TableCell>
                  </TableRow>
                )}
                {!loading && !error && roles.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6}>Kayıt bulunamadı</TableCell>
                  </TableRow>
                )}
                {!loading && !error && (Array.isArray(roles) ? roles.filter((r): r is RoleItem => r && typeof r === 'object') : []).map((role: RoleItem, index: number) => (
                  <TableRow key={role?.id ?? `row-${index}`}>
                    <TableCell className="font-medium">{role?.id ? `cn${String(role.id).slice(0,6)}...` : `#${index + 1}`}</TableCell>
                    <TableCell>
                      <span className="text-blue-600 hover:underline cursor-pointer">{role?.name ?? '-'}</span>
                    </TableCell>
                    <TableCell>{role?.description || '-'}</TableCell>
                    <TableCell>{getStatusBadge((role?.status as RoleStatus) || 'aktif')}</TableCell>
                    <TableCell>{role?.created_at ? formatDate(role.created_at) : '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button className="p-1 text-blue-600 hover:text-blue-800" title="Görüntüle">
                          <EyeIcon className="w-4 h-4" />
                        </Button>
                        <Button onClick={() => role && openEditModal(role)} className="p-1 text-orange-600 hover:text-orange-800" title="Düzenle">
                          <EditIcon className="w-4 h-4" />
                        </Button>
                        <Button onClick={() => role && handleDeleteRole(role)} className="p-1 text-red-600 hover:text-red-800" title="Sil">
                          <TrashIcon className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Add Role Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Yeni Rol Ekle">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rol Adı</label>
            <input
              type="text"
              value={newRole.name}
              onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
            <textarea
              value={newRole.description}
              onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Durum</label>
            <select
              value={newRole.status}
              onChange={(e) => setNewRole({ ...newRole, status: e.target.value as RoleStatus })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="aktif">Aktif</option>
              <option value="pasif">Pasif</option>
            </select>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">Bu role sayfa erişimlerini tanımlayın.</p>
            <Button onClick={() => setIsAddAccessModalOpen(true)} className="px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
              Erişim Matrisi
            </Button>
          </div>
          <ModalFooter>
            <Button onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-gray-600 hover:text-gray-800">İptal</Button>
            <Button onClick={handleAddRole} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Ekle</Button>
          </ModalFooter>
        </div>
      </Modal>

      {/* Add Role → Access Matrix Modal */}
      <Modal isOpen={isAddAccessModalOpen} onClose={() => setIsAddAccessModalOpen(false)} title="Erişim Matrisi - Yeni Rol">
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-2">
              <span className="font-semibold text-gray-800">Rol:</span> {newRole.name || '(Rol adı henüz belirlenmedi)'}
            </p>
            <p className="text-sm text-gray-600 mb-2">
              <span className="font-semibold text-gray-800">Kategori:</span> {newRoleCategory}
            </p>
            <p className="text-xs text-gray-500">Seçilen kategoriye göre bu rolün erişebileceği sayfaları işaretleyin.</p>
          </div>
          {newRole.name ? (
            <div className="max-h-[50vh] overflow-y-auto border border-gray-200 rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kategori / Sayfa</TableHead>
                    <TableHead>İzin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {renderHierarchicalMenu(getHierarchicalMenuItems(newRoleCategory), newRole.name)}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">Önce rol adını girin ve rolü kaydedin, sonra erişim matrisini düzenleyebilirsiniz.</p>
            </div>
          )}
          <ModalFooter>
            <Button onClick={() => setIsAddAccessModalOpen(false)} className="px-4 py-2 text-gray-600 hover:text-gray-800">Kapat</Button>
            {newRole.name && (
              <Button onClick={() => setIsAddAccessModalOpen(false)} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Kaydet</Button>
            )}
          </ModalFooter>
        </div>
      </Modal>

      {/* Edit Role Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Rol Düzenle">
        {selectedRole && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rol Adı</label>
              <input
                type="text"
                value={selectedRole.name}
                onChange={(e) => setSelectedRole({ ...selectedRole, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Açıklama</label>
              <textarea
                value={selectedRole.description}
                onChange={(e) => setSelectedRole({ ...selectedRole, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kategori (admin / manager / user)</label>
              <select
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value as BaseRole)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="admin">admin</option>
                <option value="manager">manager</option>
                <option value="user">user</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Durum</label>
              <select
                value={selectedRole.status}
                onChange={(e) => setSelectedRole({ ...selectedRole, status: e.target.value as RoleStatus })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="aktif">Aktif</option>
                <option value="pasif">Pasif</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">Seçilen kategori için sayfa erişimlerini düzenleyin.</p>
              <Button onClick={() => setIsEditAccessModalOpen(true)} className="px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
                Erişim Matrisi
              </Button>
            </div>
            <ModalFooter>
              <Button onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-gray-600 hover:text-gray-800">İptal</Button>
              <Button onClick={handleUpdateRole} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">Güncelle</Button>
            </ModalFooter>
          </div>
        )}
      </Modal>

      {/* Edit Role → Access Matrix Modal */}
      <Modal isOpen={isEditAccessModalOpen} onClose={() => setIsEditAccessModalOpen(false)} title={`Erişim Matrisi - ${selectedRole?.name || ''}`}>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-2">
              <span className="font-semibold text-gray-800">Rol:</span> {selectedRole?.name || ''}
            </p>
            <p className="text-sm text-gray-600 mb-2">
              <span className="font-semibold text-gray-800">Kategori:</span> {editCategory}
            </p>
            <p className="text-xs text-gray-500">Seçilen kategoriye göre bu rolün erişebileceği sayfaları işaretleyin. Değişiklikler otomatik olarak kaydedilir.</p>
          </div>
          {selectedRole && (
            <div className="max-h-[50vh] overflow-y-auto border border-gray-200 rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kategori / Sayfa</TableHead>
                    <TableHead>İzin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {renderHierarchicalMenu(getHierarchicalMenuItems(editCategory), selectedRole.name)}
                </TableBody>
              </Table>
            </div>
          )}
          <ModalFooter>
            <Button onClick={() => setIsEditAccessModalOpen(false)} className="px-4 py-2 text-gray-600 hover:text-gray-800">Kapat</Button>
          </ModalFooter>
        </div>
      </Modal>
    </div>
  );
}