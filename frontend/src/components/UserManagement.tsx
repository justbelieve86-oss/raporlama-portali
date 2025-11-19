import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { User } from '../services/api';
import { getUsers, deleteUser, updateUser } from '../services/api';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from './ui/table';
import { Modal, ModalFooter } from './ui/modal';
import { Button } from './ui/button';
import { UsersIcon, UserCheckIcon, ShieldCheckIcon, UserPlusIcon, SearchIcon, EditIcon, TrashIcon, LogOutIcon, EyeIcon } from './ui/icons';
import { Input } from './ui/input';
import { clsx } from 'clsx';
import AddUserForm from './AddUserForm';
import EditUserForm from './EditUserForm';
import ErrorAlert from './ui/ErrorAlert';
import { toUserFriendlyError } from '../lib/errorUtils';
import { useToast } from '../hooks/useToast';
import { supabase } from '../lib/supabase';
import { api } from '../lib/axiosClient';
import EmptyState from './ui/empty-state';
import { TableRowSkeleton } from './ui/SkeletonLoader';
import { logger } from '../lib/logger';

interface UserManagementProps {
  className?: string;
}

export default function UserManagement({ className }: UserManagementProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'user'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  // Edit form state artık ayrı bileşende yönetiliyor

  const limit = 10;
  const toast = useToast();

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      try {
        logger.debug('UserManagement: Checking authentication');
        const { data: { session }, error } = await supabase.auth.getSession();
        logger.debug('UserManagement: Session data', { 
          hasSession: !!session, 
          hasUser: !!session?.user,
          hasToken: !!session?.access_token,
          userId: session?.user?.id,
          userEmail: session?.user?.email,
          error: error
        });
        
        if (session) {
          logger.debug('UserManagement: User is authenticated');
          setIsAuthenticated(true);
        } else {
          logger.debug('UserManagement: No session found, redirecting to login');
          window.location.href = '/login';
        }
      } catch (error) {
        logger.error('UserManagement: Auth check error', error);
        window.location.href = '/login';
      }
    };

    checkAuth();
  }, []);

  // Mock data for demonstration (since API requires auth)
  const mockUsers: User[] = [
    {
      id: 'cmt99yth',
      email: 'admin@kardelen.com',
      role: 'admin',
      created_at: '2025-10-27T00:00:00Z',
      user_metadata: { username: 'Admin User' }
    },
    {
      id: 'cmt99ytl',
      email: 'user@kardelen.com', 
      role: 'user',
      created_at: '2025-10-27T00:00:00Z',
      user_metadata: { username: 'Test User' }
    }
  ];

  const fetchUsers = async () => {
    if (!isAuthenticated) {
      logger.debug('fetchUsers: User not authenticated, skipping fetch');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      logger.debug('fetchUsers: Starting user fetch', { 
        page: currentPage, 
        limit, 
        search: searchTerm, 
        role: roleFilter
      });

      // Check session before making API call
      const { data: { session } } = await supabase.auth.getSession();
      logger.debug('fetchUsers: Current session', {
        hasSession: !!session,
        hasToken: !!session?.access_token,
        tokenLength: session?.access_token?.length
      });

      const response = await getUsers({
        page: currentPage,
        limit,
        search: searchTerm,
        role: roleFilter === 'all' ? undefined : roleFilter
      });

      logger.debug('fetchUsers: API Response received', {
        hasData: !!response,
        usersCount: response?.users?.length,
        totalCount: response?.total
      });

      if (response && response.users) {
        setUsers(response.users);
        setTotalUsers(response.total || 0);
        setTotalPages(response.totalPages || 1);
        logger.debug('fetchUsers: Users set successfully', { count: response.users.length });
      } else {
        logger.warn('fetchUsers: No users in response, using mock data');
        setUsers(mockUsers);
        setTotalUsers(mockUsers.length);
        setTotalPages(1);
      }
    } catch (error: unknown) {
      logger.error('fetchUsers: Error occurred', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data
      });
      
      setError('Kullanıcılar yüklenirken hata oluştu');
      logger.warn('fetchUsers: Falling back to mock data due to error');
      setUsers(mockUsers);
      setTotalUsers(mockUsers.length);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchUsers();
    }
  }, [currentPage, searchTerm, roleFilter, isAuthenticated]);

  const handleSearchInput = useCallback((term: string) => {
    setSearchInput(term);
    setCurrentPage(1);
  }, []);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => {
      setSearchTerm(searchInput);
    }, 250);
    return () => clearTimeout(t);
  }, [searchInput]);

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setIsEditModalOpen(true);
  };

  const handleDelete = (user: User) => {
    setSelectedUser(user);
    setIsDeleteModalOpen(true);
  };
  
  const handleView = (user: User) => {
    setSelectedUser(user);
    setIsViewModalOpen(true);
  };

  // Güncelleme EditUserForm içerisinde ele alınıyor

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    
    try {
      logger.debug('Deleting user', { userId: selectedUser.id, email: selectedUser.email });
      await deleteUser(selectedUser.id);
      logger.debug('User deleted successfully');
      await fetchUsers();
      setIsDeleteModalOpen(false);
      setSelectedUser(null);
      toast.success({
        title: 'Başarılı',
        message: 'Kullanıcı başarıyla silindi'
      });
    } catch (err: unknown) {
      logger.error('Delete user error', err);
      const error = err as { message?: string; response?: { data?: unknown; status?: number; statusText?: string } };
      logger.error('Error details', {
        message: error?.message,
        response: error?.response?.data,
        status: error?.response?.status,
        statusText: error?.response?.statusText
      });
      const friendly = toUserFriendlyError(err);
      toast.error({
        title: 'Hata',
        message: friendly.message || 'Kullanıcı silinirken bir hata oluştu'
      });
    }
  };

  const stats = useMemo(() => {
    if (!users || !Array.isArray(users)) {
      return { total: 0, admin: 0, active: 0, registered: 0 };
    }
    const total = users.length;
    const admin = users.filter(u => u.role === 'admin').length;
    const active = users.length; // Assuming all users are active for demo
    const registered = users.length;
    
    return { total, admin, active, registered };
  }, [users]);

  const filteredUsers = useMemo(() => {
    if (!users || !Array.isArray(users)) {
      return [];
    }
    return users.filter(user => {
      const matchesSearch = !searchTerm || 
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.user_metadata?.username?.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, searchTerm, roleFilter]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR');
  };

  const getRoleBadge = (role: string) => {
    if (role === 'admin') {
      return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">Admin</span>;
    }
    return <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">Genel Kullanıcı</span>;
  };

  const getStatusBadge = () => {
    return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Aktif</span>;
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <div className={clsx('bg-gray-50 min-h-screen', className)}>
      <div className="px-2 py-4">{/* Content wrapper */}

      {/* Search and Filter */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="md:col-span-2 relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            type="text"
            placeholder="Kullanıcı ara (isim, e-posta, kullanıcı adı)"
            value={searchInput}
            onChange={(e) => handleSearchInput(e.target.value)}
            className="pl-10"
          />
        </div>
        <div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as 'all' | 'admin' | 'user')}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Tüm Roller</option>
            <option value="admin">Admin</option>
            <option value="user">Kullanıcı</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="admin-card-grid-4">
        <div className="admin-card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <UsersIcon className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Toplam Kullanıcı</p>
              <p className="text-xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="admin-card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <UserCheckIcon className="w-5 h-5 text-green-600" />
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Aktif Kullanıcı</p>
              <p className="text-xl font-bold text-gray-900">{stats.active}</p>
            </div>
          </div>
        </div>

        <div className="admin-card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <ShieldCheckIcon className="w-5 h-5 text-yellow-600" />
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Admin</p>
              <p className="text-xl font-bold text-gray-900">{stats.admin}</p>
            </div>
          </div>
        </div>

        <div className="admin-card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <UserPlusIcon className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Kayıt Kullanıcı</p>
              <p className="text-xl font-bold text-gray-900">{stats.registered}</p>
            </div>
          </div>
        </div>
      </div>

      {/* User List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <UsersIcon className="w-5 h-5 mr-2" />
            Kullanıcı Listesi
          </h2>
          <Button
            onClick={() => setIsAddUserModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <UserPlusIcon className="w-4 h-4" />
            <span>Yeni Kullanıcı</span>
          </Button>
        </div>

        {loading ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader sticky>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Ad Soyad</TableHead>
                  <TableHead>Kullanıcı Adı</TableHead>
                  <TableHead>E-posta</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Yetkili Markalar</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Kayıt Tarihi</TableHead>
                  <TableHead>İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...Array(6)].map((_, i) => (
                  <TableRowSkeleton key={i} columns={9} />
                ))}
              </TableBody>
            </Table>
          </div>
        ) : error ? (
          <div className="p-6">
            <ErrorAlert
              title="Kullanıcılar yüklenemedi"
              message={error}
              details="Bağlantınızı kontrol ederek veya sayfayı yenileyerek tekrar deneyin. Sorun devam ederse destek ekibiyle iletişime geçin."
              onRetry={() => fetchUsers()}
              retryLabel="Listeyi Yenile"
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader sticky>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Ad Soyad</TableHead>
                  <TableHead>Kullanıcı Adı</TableHead>
                  <TableHead>E-posta</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Yetkili Markalar</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Kayıt Tarihi</TableHead>
                  <TableHead>İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9}>
                      <EmptyState
                        title="Sonuç bulunamadı"
                        description="Arama ve filtre kriterlerini değiştirerek yeniden deneyin."
                      />
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.map((user, index) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">#{index + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm font-medium text-gray-600">
                          {getInitials(user.user_metadata?.full_name || user.user_metadata?.username || user.email)}
                        </div>
                        <span>{user.user_metadata?.full_name || user.user_metadata?.username || user.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>{user.user_metadata?.username || '-'}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(user.brands || []).length === 0 ? (
                          <span className="text-xs text-gray-500">—</span>
                        ) : (
                          (user.brands || []).slice(0, 4).map((b) => (
                            <span key={b.id} className="px-2 py-1 rounded-full bg-blue-50 text-blue-700 text-xs border border-blue-200">{b.name}</span>
                          ))
                        )}
                        {(user.brands || []).length > 4 && (
                          <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs border border-gray-200">+{(user.brands || []).length - 4}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge()}</TableCell>
                    <TableCell>{formatDate(user.created_at)}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          onClick={() => handleView(user)}
                          className="p-1 text-gray-600 hover:text-gray-800"
                        >
                          <EyeIcon className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => handleEdit(user)}
                          className="p-1 text-blue-600 hover:text-blue-800"
                        >
                          <EditIcon className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => handleDelete(user)}
                          className="p-1 text-red-600 hover:text-red-800"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
            <div className="text-sm text-gray-700">
              Toplam {totalUsers} kullanıcı, sayfa {currentPage} / {totalPages}
            </div>
            <div className="flex items-center space-x-2">
              <Button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage <= 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Önceki
              </Button>
              <span className="px-3 py-1 text-sm text-gray-700">
                {currentPage} / {totalPages}
              </span>
              <Button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage >= totalPages}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Sonraki
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      <Modal isOpen={isAddUserModalOpen} onClose={() => setIsAddUserModalOpen(false)} title="Yeni Kullanıcı Ekle">
        <div className="p-6">
          <AddUserForm onSuccess={() => {
            setIsAddUserModalOpen(false);
            fetchUsers();
          }} />
        </div>
      </Modal>

      {/* Edit User Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Kullanıcı Düzenle">
        <div className="p-6">
          {selectedUser && (
            <EditUserForm
              key={selectedUser.id}
              user={selectedUser}
              onCancel={() => setIsEditModalOpen(false)}
              onSuccess={() => {
                setIsEditModalOpen(false);
                setSelectedUser(null);
                fetchUsers();
              }}
            />
          )}
        </div>
      </Modal>

      {/* View User Modal */}
      <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title="Kullanıcı Detayları">
        <div className="p-6">
          {selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-sm font-medium text-gray-600">
                  {getInitials(selectedUser.user_metadata?.full_name || selectedUser.user_metadata?.username || selectedUser.email)}
                </div>
                <div>
                  <div className="font-semibold text-gray-900">{selectedUser.user_metadata?.full_name || selectedUser.user_metadata?.username || selectedUser.email}</div>
                  <div className="text-sm text-gray-600">{selectedUser.email}</div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="text-xs text-gray-500">Rol</div>
                  <div>{getRoleBadge(selectedUser.role)}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-gray-500">Kayıt Tarihi</div>
                  <div className="text-sm text-gray-700">{formatDate(selectedUser.created_at)}</div>
                </div>
                <div className="sm:col-span-2 space-y-1">
                  <div className="text-xs text-gray-500">Yetkili Markalar</div>
                  <div className="flex flex-wrap gap-1">
                    {(selectedUser.brands || []).length === 0 ? (
                      <span className="text-xs text-gray-500">—</span>
                    ) : (
                      (selectedUser.brands || []).map((b) => (
                        <span key={b.id} className="px-2 py-1 rounded-full bg-blue-50 text-blue-700 text-xs border border-blue-200">{b.name}</span>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Delete User Modal */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Kullanıcı Sil">
        <div className="p-6">
          <p className="text-gray-600 mb-6">
            {selectedUser?.email} kullanıcısını silmek istediğinizden emin misiniz?
            Bu işlem geri alınamaz.
          </p>
          <ModalFooter>
            <Button
              onClick={() => setIsDeleteModalOpen(false)}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              İptal
            </Button>
            <Button
              onClick={handleDeleteUser}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Sil
            </Button>
          </ModalFooter>
        </div>
      </Modal>
      </div> {/* Content wrapper closing */}
    </div>
  );
}