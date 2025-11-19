import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as apiModule from '../../lib/axiosClient';
import {
  getMe,
  verifyPassword,
  adminCreateUser,
  createUser,
  getUsers,
  updateUser,
  getUserBrandIds,
  deleteUser,
  getBrands,
  adminGetBrands,
  adminCreateBrand,
} from '../../services/api';

describe('services/api - extended tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('getMe', () => {
    it('should return user data from response.data', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        user_metadata: { role: 'user' },
      };
      const spy = vi.spyOn(apiModule.api, 'get').mockResolvedValue({
        data: {
          success: true,
          data: {
            user: mockUser,
            role: 'user',
            brands: [],
          },
        },
      } as any);
      const result = await getMe();
      expect(result.user).toEqual(mockUser);
      expect(result.role).toBe('user');
      expect(result.brands).toEqual([]);
      spy.mockRestore();
    });

    it('should handle direct response data', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        user_metadata: { role: 'admin' },
      };
      const spy = vi.spyOn(apiModule.api, 'get').mockResolvedValue({
        data: {
          user: mockUser,
          role: 'admin',
        },
      } as any);
      const result = await getMe();
      expect(result.user).toEqual(mockUser);
      expect(result.role).toBe('admin');
      spy.mockRestore();
    });

    it('should fallback to user_metadata role', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        user_metadata: { role: 'coordinator' },
      };
      const spy = vi.spyOn(apiModule.api, 'get').mockResolvedValue({
        data: {
          user: mockUser,
        },
      } as any);
      const result = await getMe();
      expect(result.role).toBe('coordinator');
      spy.mockRestore();
    });
  });

  describe('verifyPassword', () => {
    it('should verify password', async () => {
      const spy = vi.spyOn(apiModule.api, 'post').mockResolvedValue({
        data: { verified: true },
      } as any);
      const result = await verifyPassword('password123');
      expect(result.verified).toBe(true);
      expect(spy).toHaveBeenCalledWith('/auth/verify-password', { password: 'password123' });
      spy.mockRestore();
    });
  });

  describe('adminCreateUser', () => {
    it('should create user with admin role', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'admin@example.com',
        role: 'admin',
      };
      const spy = vi.spyOn(apiModule.api, 'post').mockResolvedValue({
        data: { success: true, user: mockUser },
      } as any);
      const result = await adminCreateUser({
        email: 'admin@example.com',
        password: 'password123',
        role: 'admin',
      });
      expect(result.user).toEqual(mockUser);
      spy.mockRestore();
    });
  });

  describe('createUser', () => {
    it('should create user with all fields', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'user@example.com',
        role: 'user',
      };
      const spy = vi.spyOn(apiModule.api, 'post').mockResolvedValue({
        data: { user: mockUser },
      } as any);
      const result = await createUser({
        email: 'user@example.com',
        password: 'password123',
        role: 'user',
        username: 'testuser',
        full_name: 'Test User',
        brandIds: ['brand-1'],
      });
      expect(result.user).toEqual(mockUser);
      spy.mockRestore();
    });
  });

  describe('getUsers', () => {
    it('should return paginated users', async () => {
      const mockUsers = [
        { id: 'user-1', email: 'user1@example.com', role: 'user' },
        { id: 'user-2', email: 'user2@example.com', role: 'user' },
      ];
      const spy = vi.spyOn(apiModule.api, 'get').mockResolvedValue({
        data: {
          success: true,
          data: {
            items: mockUsers,
            count: 2,
          },
        },
      } as any);
      const result = await getUsers({ page: 1, limit: 10 });
      expect(result.users).toEqual(mockUsers);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
      spy.mockRestore();
    });

    it('should handle empty users list', async () => {
      const spy = vi.spyOn(apiModule.api, 'get').mockResolvedValue({
        data: {
          success: true,
          data: {
            items: [],
            count: 0,
          },
        },
      } as any);
      const result = await getUsers();
      expect(result.users).toEqual([]);
      expect(result.total).toBe(0);
      spy.mockRestore();
    });
  });

  describe('updateUser', () => {
    it('should update user', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'updated@example.com',
        role: 'user',
      };
      const spy = vi.spyOn(apiModule.api, 'put').mockResolvedValue({
        data: { user: mockUser },
      } as any);
      const result = await updateUser('user-1', {
        email: 'updated@example.com',
        role: 'user',
      });
      expect(result.user).toEqual(mockUser);
      spy.mockRestore();
    });
  });

  describe('getUserBrandIds', () => {
    it('should return brand IDs', async () => {
      const spy = vi.spyOn(apiModule.api, 'get').mockResolvedValue({
        data: {
          success: true,
          data: {
            brandIds: ['brand-1', 'brand-2'],
          },
        },
      } as any);
      const result = await getUserBrandIds('user-1');
      expect(result).toEqual(['brand-1', 'brand-2']);
      spy.mockRestore();
    });

    it('should return empty array if no brands', async () => {
      const spy = vi.spyOn(apiModule.api, 'get').mockResolvedValue({
        data: {
          success: true,
          data: {},
        },
      } as any);
      const result = await getUserBrandIds('user-1');
      expect(result).toEqual([]);
      spy.mockRestore();
    });
  });

  describe('deleteUser', () => {
    it('should delete user', async () => {
      const spy = vi.spyOn(apiModule.api, 'delete').mockResolvedValue({
        data: { success: true },
      } as any);
      const result = await deleteUser('user-1');
      expect(result.success).toBe(true);
      spy.mockRestore();
    });
  });

  describe('getBrands', () => {
    it('should return brands', async () => {
      const mockBrands = [
        { id: 'brand-1', name: 'Brand 1', description: 'Desc 1', status: 'aktif' as const },
      ];
      const spy = vi.spyOn(apiModule.api, 'get').mockResolvedValue({
        data: {
          success: true,
          data: {
            items: mockBrands,
          },
        },
      } as any);
      const result = await getBrands();
      expect(result.brands).toEqual(mockBrands);
      spy.mockRestore();
    });

    it('should filter by status', async () => {
      const mockBrands = [
        { id: 'brand-1', name: 'Brand 1', description: 'Desc 1', status: 'aktif' as const },
        { id: 'brand-2', name: 'Brand 2', description: 'Desc 2', status: 'pasif' as const },
      ];
      const spy = vi.spyOn(apiModule.api, 'get').mockResolvedValue({
        data: {
          success: true,
          data: {
            items: mockBrands,
          },
        },
      } as any);
      const result = await getBrands({ status: 'aktif' });
      expect(result.brands).toEqual([mockBrands[0]]);
      spy.mockRestore();
    });
  });

  describe('adminGetBrands', () => {
    it('should return all brands for admin', async () => {
      const mockBrands = [
        { id: 'brand-1', name: 'Brand 1', description: 'Desc 1', status: 'aktif' as const },
      ];
      const spy = vi.spyOn(apiModule.api, 'get').mockResolvedValue({
        data: {
          success: true,
          data: {
            items: mockBrands,
          },
        },
      } as any);
      const result = await adminGetBrands();
      expect(result.brands).toEqual(mockBrands);
      spy.mockRestore();
    });
  });

  describe('adminCreateBrand', () => {
    it('should create brand', async () => {
      const mockBrand = {
        id: 'brand-1',
        name: 'New Brand',
        description: 'Description',
        status: 'aktif' as const,
      };
      const spy = vi.spyOn(apiModule.api, 'post').mockResolvedValue({
        data: { brand: mockBrand },
      } as any);
      const result = await adminCreateBrand({
        name: 'New Brand',
        description: 'Description',
        status: 'aktif',
      });
      expect(result.brand).toEqual(mockBrand);
      spy.mockRestore();
    });
  });
});

