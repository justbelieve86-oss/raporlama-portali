import { api } from './axiosClient';

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'user';
  created_at: string;
  updated_at: string;
}

export interface CreateUserData {
  email: string;
  password: string;
  role: 'admin' | 'user';
}

export interface UpdateUserData {
  email?: string;
  role?: 'admin' | 'user';
}

// Kullanıcı listesi getir
export const getUsers = async (): Promise<User[]> => {
  const response = await api.get('/admin/users');
  return response.data;
};

// Kullanıcı oluştur
export const createUser = async (userData: CreateUserData): Promise<User> => {
  const response = await api.post('/admin/users', userData);
  return response.data;
};

// Kullanıcı güncelle
export const updateUser = async (id: string, userData: UpdateUserData): Promise<User> => {
  const response = await api.put(`/admin/users/${id}`, userData);
  return response.data;
};

// Kullanıcı sil
export const deleteUser = async (id: string): Promise<void> => {
  await api.delete(`/admin/users/${id}`);
};