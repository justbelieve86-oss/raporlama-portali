import React, { useEffect, useMemo, useState } from 'react';
import { Button } from './ui/button';
import { EyeIcon, EyeOffIcon } from './ui/icons';
import { clsx } from 'clsx';
import type { User, Brand } from '../services/api';
import { updateUser, adminGetBrands, getUserBrandIds } from '../services/api';
import { listRoles } from '../services/roles';
import type { RoleItem } from '../services/roles';
import { useToast } from '../hooks/useToast';
import { toUserFriendlyError } from '../lib/errorUtils';

interface EditUserFormProps {
  user: User;
  onSuccess?: () => void;
  onCancel?: () => void;
  className?: string;
}

interface FormData {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  password: string; // boş bırakılırsa güncellenmez
  role: string;
  brandIds: string[];
}

interface FormErrors {
  [key: string]: string;
}

const initialRoles: RoleItem[] = [];
const initialBrands: Brand[] = [];

function splitFullName(full?: string) {
  if (!full) return { firstName: '', lastName: '' };
  const parts = full.trim().split(/\s+/);
  const firstName = parts[0] || '';
  const lastName = parts.slice(1).join(' ') || '';
  return { firstName, lastName };
}

function canonicalizeRole(name?: string): string {
  const n = (name || '').trim().toLowerCase();
  if (['admin', 'administrator', 'yönetici'].includes(n)) return 'admin';
  if (['user', 'kullanıcı', 'normal'].includes(n)) return 'user';
  return (name || '').trim();
}

export default function EditUserForm({ user, onSuccess, onCancel, className }: EditUserFormProps) {
  const { firstName: initialFirst, lastName: initialLast } = splitFullName(user.user_metadata?.full_name);
  const [formData, setFormData] = useState<FormData>({
    firstName: initialFirst,
    lastName: initialLast,
    username: user.user_metadata?.username || '',
    email: user.email,
    password: '',
    role: user.role || user.user_metadata?.role || 'user', // Dinamik roller için canonicalizeRole kullanma
    brandIds: []
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [roles, setRoles] = useState<RoleItem[]>(initialRoles);
  const [brands, setBrands] = useState<Brand[]>(initialBrands);
  const toast = useToast();
  const [optionsLoading, setOptionsLoading] = useState(true);

  // Marka seçim paneli
  const [brandOpen, setBrandOpen] = useState(false);
  const [brandQuery, setBrandQuery] = useState('');

  const filteredBrands = useMemo(() => {
    const q = brandQuery.toLowerCase();
    return brands.filter((b) => b.name.toLowerCase().includes(q));
  }, [brands, brandQuery]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setOptionsLoading(true);
        // Admin kullanıcı düzenleme formunda tüm markaları göster (adminGetBrands kullan)
        const [rolesList, { brands: brandsList }, currentBrandIds] = await Promise.all([
          listRoles().catch(() => []),
          adminGetBrands({ status: 'all' }).catch(() => ({ brands: [] })), // Tüm durumlardaki markaları getir
          getUserBrandIds(user.id).catch(() => [])
        ]);
        if (!mounted) return;
        setRoles(rolesList || []);
        setBrands(brandsList || []);
        setFormData((f) => ({ ...f, brandIds: (currentBrandIds || []).map(String) }));
      } finally {
        if (mounted) setOptionsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [user.id]);

  function handleInputChange<K extends keyof FormData>(key: K, value: FormData[K]) {
    setFormData((p) => ({ ...p, [key]: value }));
  }

  function validate(): boolean {
    const next: FormErrors = {};
    if (!formData.firstName.trim()) next.firstName = 'Ad gerekli';
    if (!formData.lastName.trim()) next.lastName = 'Soyad gerekli';
    if (!formData.username.trim()) next.username = 'Kullanıcı adı gerekli';
    if (!formData.email.trim()) next.email = 'E-posta gerekli';
    if (!formData.role.trim()) next.role = 'Rol gerekli';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const full_name = `${formData.firstName} ${formData.lastName}`.trim();
    type UpdateUserPayload = {
      email: string;
      role: string;
      username: string;
      full_name: string;
      brandIds?: string[];
      password?: string;
    };
    const payload: UpdateUserPayload = {
      email: formData.email,
      role: formData.role,
      username: formData.username,
      full_name,
      brandIds: formData.brandIds
    };
    if (formData.password) payload.password = formData.password;

    try {
      await updateUser(user.id, payload);
      toast.success({
        title: 'Başarılı',
        message: 'Kullanıcı başarıyla güncellendi'
      });
      onSuccess?.();
    } catch (err: unknown) {
      const friendly = toUserFriendlyError(err);
      toast.error({
        title: 'Hata',
        message: friendly.message || 'Kullanıcı güncellenirken hata oluştu'
      });
      setErrors((prev) => ({ ...prev, submit: friendly.message || 'Kullanıcı güncellenirken hata oluştu' }));
    }
  }

  return (
    <form onSubmit={handleSubmit} className={clsx('space-y-6', className)}>
      <div className="mx-auto w-full max-w-3xl">
        {/* Grid layout iki sütun */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Ad */}
          <div>
            <label htmlFor="firstName" className="block text-sm font-semibold text-gray-700 mb-2">Ad <span className="text-red-500">*</span></label>
          <input
            id="firstName"
            type="text"
            value={formData.firstName}
            onChange={(e) => handleInputChange('firstName', e.target.value)}
            autoComplete="given-name"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
            {errors.firstName && <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>}
          </div>
          {/* Soyad */}
          <div>
            <label htmlFor="lastName" className="block text-sm font-semibold text-gray-700 mb-2">Soyad <span className="text-red-500">*</span></label>
          <input
            id="lastName"
            type="text"
            value={formData.lastName}
            onChange={(e) => handleInputChange('lastName', e.target.value)}
            autoComplete="family-name"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
            {errors.lastName && <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>}
          </div>

          {/* Kullanıcı adı */}
          <div>
            <label htmlFor="username" className="block text-sm font-semibold text-gray-700 mb-2">Kullanıcı adı <span className="text-red-500">*</span></label>
          <input
            id="username"
            type="text"
            value={formData.username}
            onChange={(e) => handleInputChange('username', e.target.value)}
            autoComplete="username"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
            {errors.username && <p className="mt-1 text-sm text-red-600">{errors.username}</p>}
          </div>

          {/* E-posta */}
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">E-posta <span className="text-red-500">*</span></label>
          <input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            autoComplete="email"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
            {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
          </div>

          {/* Şifre (opsiyonel) */}
          <div className="md:col-span-2">
            <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">Şifre (boş bırakılırsa değişmez)</label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                autoComplete="new-password"
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500">
                {showPassword ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Rol */}
          <div>
            <label htmlFor="role" className="block text-sm font-semibold text-gray-700 mb-2">Rol <span className="text-red-500">*</span></label>
            <select
              id="role"
              value={formData.role}
              onChange={(e) => handleInputChange('role', e.target.value)} // Dinamik roller için canonicalizeRole kullanma
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {optionsLoading ? (
                <option>Yükleniyor...</option>
              ) : (roles && roles.filter((r) => r.status === 'aktif').length > 0) ? (
                roles.filter((r) => r.status === 'aktif').map((r) => (
                  <option key={r.id} value={r.name}>{r.name}</option> // Dinamik roller için r.name kullan
                ))
              ) : (
                <>
                  <option value="user">user</option>
                  <option value="admin">admin</option>
                </>
              )}
            </select>
            {errors.role && <p className="mt-1 text-sm text-red-600">{errors.role}</p>}
          </div>

          {/* Markalar */}
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Marka seçin</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.brandIds.length === 0 ? (
                <span className="text-sm text-gray-500">Seçili marka yok</span>
              ) : (
                brands
                  .filter((b) => formData.brandIds.includes(String(b.id)))
                  .slice(0, 6)
                  .map((b) => (
                    <span key={b.id} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-50 text-blue-700 border border-blue-200">
                      {b.name}
                    </span>
                  ))
              )}
              {formData.brandIds.length > 6 && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-50 text-gray-700 border border-gray-200">+{formData.brandIds.length - 6}</span>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" className="bg-gray-100 text-gray-700 hover:bg-gray-200" onClick={() => setBrandOpen(true)}>Paneli Aç</Button>
              <Button type="button" className="bg-gray-100 text-gray-700 hover:bg-gray-200" onClick={() => handleInputChange('brandIds', [])}>Temizle</Button>
            </div>
            {brandOpen && (
              <div className="mt-3 rounded-lg border p-3 bg-white">
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="text"
                    placeholder="Marka ara..."
                    value={brandQuery}
                    onChange={(e) => setBrandQuery(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <Button type="button" className="bg-gray-100 text-gray-700 hover:bg-gray-200" onClick={() => setBrandQuery('')}>Temizle</Button>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <Button type="button" className="bg-blue-600 text-white hover:bg-blue-700" onClick={() => handleInputChange('brandIds', brands.map((b) => String(b.id)))}>Tümünü Seç</Button>
                  <Button type="button" className="bg-gray-100 text-gray-700 hover:bg-gray-200" onClick={() => handleInputChange('brandIds', [])}>Temizle</Button>
                  <Button type="button" className="bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100" onClick={() => handleInputChange('brandIds', filteredBrands.map((b) => String(b.id)))}>Filtrelenenleri Seç</Button>
                </div>
                <div className="max-h-[60vh] overflow-auto border rounded-lg p-2">
                  {optionsLoading ? (
                    <div className="p-3 text-sm text-gray-500">Yükleniyor...</div>
                  ) : filteredBrands.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                      {filteredBrands.map((b) => {
                        const idStr = String(b.id);
                        const checked = formData.brandIds.includes(idStr);
                        return (
                          <label key={idStr} className={clsx('flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer', checked ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200')}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                const exists = formData.brandIds.includes(idStr);
                                const next = exists ? formData.brandIds.filter((x) => x !== idStr) : [...formData.brandIds, idStr];
                                handleInputChange('brandIds', next);
                              }}
                            />
                            <span className="text-sm text-gray-800 truncate">{b.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-3 text-sm text-gray-500">Sonuç bulunamadı</div>
                  )}
                </div>
                <div className="flex justify-end mt-3">
                  <Button type="button" className="bg-blue-600 text-white hover:bg-blue-700" onClick={() => setBrandOpen(false)}>Tamam</Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        {errors.submit && <p className="text-red-600 text-sm">{errors.submit}</p>}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" className="text-gray-700 bg-gray-100 hover:bg-gray-200" onClick={onCancel}>İptal</Button>
          <Button type="submit" className="bg-blue-600 text-white hover:bg-blue-700">Güncelle</Button>
        </div>
      </div>
    </form>
  );
}