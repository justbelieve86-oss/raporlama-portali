import React, { useEffect, useState, useMemo } from 'react';
import { Button } from './ui/button';
import { EyeIcon, EyeOffIcon } from './ui/icons';
import { FloatingLabelInput } from './ui/FloatingLabelInput';
import { PasswordStrengthIndicator } from './ui/PasswordStrengthIndicator';
import { clsx } from 'clsx';
import { createUser, adminGetBrands, type Brand } from '../services/api';
import { listRoles, type RoleItem } from '../services/roles';
import { useToast } from '../hooks/useToast';
import { toUserFriendlyError } from '../lib/errorUtils';
import { logger } from '../lib/logger';

interface AddUserFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  className?: string;
}

interface FormData {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  password: string;
  role: string;
  brandIds: string[];
}

interface FormErrors {
  [key: string]: string;
}

// Dinamik seçenekler için state
const initialRoles: RoleItem[] = [];
const initialBrands: Brand[] = [];

export default function AddUserForm({ onSuccess, onCancel, className }: AddUserFormProps) {
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    password: '',
    role: 'user',
    brandIds: []
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const toast = useToast();

  // Roller ve markalar
  const [roles, setRoles] = useState<RoleItem[]>(initialRoles);
  const [brands, setBrands] = useState<Brand[]>(initialBrands);
  const [optionsLoading, setOptionsLoading] = useState<boolean>(true);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [brandOpen, setBrandOpen] = useState(false);
  const [brandQuery, setBrandQuery] = useState('');
  const filteredBrands = useMemo(() => {
    const q = brandQuery.trim().toLowerCase();
    if (!q) return brands;
    return brands.filter(b => b.name.toLowerCase().includes(q));
  }, [brandQuery, brands]);
  
  // canonicalizeRole removed - not used

  useEffect(() => {
    let mounted = true;
    async function loadOptions() {
      try {
        setOptionsLoading(true);
        // Admin kullanıcı formunda tüm markaları göster (adminGetBrands kullan)
        const [rolesList, brandsResp] = await Promise.all([
          listRoles(),
          adminGetBrands({ status: 'all' }) // Tüm durumlardaki markaları getir
        ]);
        if (!mounted) return;
        const activeRoles = (rolesList || []).filter(r => r.status === 'aktif');
        setRoles(activeRoles);
        setBrands(brandsResp.brands || []);
        // Varsayılan rolü ayarla
        if (!formData.role) {
          const defaultRoleName = activeRoles.find(r => r.name.toLowerCase() === 'user' || r.name.toLowerCase() === 'kullanıcı')?.name
            || activeRoles[0]?.name
            || 'user';
          setFormData(prev => ({ ...prev, role: defaultRoleName })); // Dinamik roller için canonicalizeRole kullanma
        }
      } catch (e) {
        const error = e as { message?: string };
        setOptionsError(error?.message || 'Roller/markalar yüklenirken hata oluştu');
      } finally {
        setOptionsLoading(false);
      }
    }
    loadOptions();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'Ad gereklidir';
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Soyad gereklidir';
    }
    if (!formData.username.trim()) {
      newErrors.username = 'Kullanıcı adı gereklidir';
    } else if (formData.username.trim().length < 3) {
      newErrors.username = 'Kullanıcı adı en az 3 karakter olmalıdır';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email gereklidir';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Geçerli bir email adresi girin';
    }
    if (!formData.password.trim()) {
      newErrors.password = 'Şifre gereklidir';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Şifre en az 6 karakter olmalıdır';
    }
    if (!formData.role) newErrors.role = 'Rol seçimi gereklidir';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({});
    setSuccessMessage('');
    
    try {
      await createUser({
        email: formData.email,
        password: formData.password,
        role: formData.role,
        username: formData.username,
        full_name: `${formData.firstName} ${formData.lastName}`.trim(),
        brandIds: formData.brandIds
      });
      
      setSuccessMessage('Kullanıcı başarıyla oluşturuldu!');
      toast.success({
        title: 'Başarılı',
        message: 'Kullanıcı başarıyla oluşturuldu!'
      });
      
      // Reset form
      setFormData({
        firstName: '',
        lastName: '',
        username: '',
        email: '',
        password: '',
        role: 'user',
        brandIds: []
      });
      
      // Başarı sonrası callback
      onSuccess?.();
      
    } catch (error) {
      logger.error('Error creating user', error);
      
      const friendly = toUserFriendlyError(error as Error);
      toast.error({
        title: 'Hata',
        message: friendly.message || 'Kullanıcı oluşturulurken bir hata oluştu'
      });
      
      setErrors({ 
        submit: friendly.message || 'Kullanıcı oluşturulurken bir hata oluştu'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className={clsx('bg-white rounded-2xl shadow-xl border border-gray-200 max-w-3xl mx-auto', className)}>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-8 space-y-6">
        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-green-700 font-medium">{successMessage}</p>
            </div>
          </div>
        )}

        {/* Submit Error */}
        {errors.submit && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-700 font-medium">{errors.submit}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* First Name Field - Floating Label */}
        <FloatingLabelInput
          label="Ad"
          id="firstName"
          type="text"
          value={formData.firstName}
          onChange={(e) => handleInputChange('firstName', e.target.value)}
          autoComplete="given-name"
          error={errors.firstName}
          showValidationIcon={!!formData.firstName}
          required
        />

        {/* Last Name Field - Floating Label */}
        <FloatingLabelInput
          label="Soyad"
          id="lastName"
          type="text"
          value={formData.lastName}
          onChange={(e) => handleInputChange('lastName', e.target.value)}
          autoComplete="family-name"
          error={errors.lastName}
          showValidationIcon={!!formData.lastName}
          required
        />

        {/* Username Field - Floating Label */}
        <FloatingLabelInput
          label="Kullanıcı adı"
          id="username"
          type="text"
          value={formData.username}
          onChange={(e) => handleInputChange('username', e.target.value)}
          autoComplete="username"
          error={errors.username}
          helperText="Örn: ayilmaz"
          showValidationIcon={!!formData.username}
          required
        />

        {/* Email Field - Floating Label */}
        <FloatingLabelInput
          label="Email"
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => handleInputChange('email', e.target.value)}
          autoComplete="email"
          error={errors.email}
          helperText="ornek@email.com"
          showValidationIcon={!!formData.email}
          required
        />

        {/* Password Field - Floating Label with Strength Indicator */}
        <div className="md:col-span-2">
          <div className="relative">
            <FloatingLabelInput
              label="Şifre"
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              autoComplete="new-password"
              error={errors.password}
              showValidationIcon={!!formData.password && !errors.password}
              required
              className="pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showPassword ? <EyeOffIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
            </button>
          </div>
          {/* Password Strength Indicator */}
          {formData.password && (
            <PasswordStrengthIndicator password={formData.password} />
          )}
        </div>

        {/* Role Field (Dynamic) */}
        <div>
          <label htmlFor="role" className="block text-sm font-semibold text-gray-700 mb-2">
            Rol <span className="text-red-500">*</span>
          </label>
          <select
            id="role"
            value={formData.role}
            onChange={(e) => handleInputChange('role', e.target.value)}
            className={clsx(
              'w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 bg-white',
              errors.role 
                ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
            )}
          >
            {optionsLoading ? (
              <option>Yükleniyor...</option>
            ) : roles.length > 0 ? (
              roles.map((r) => (
                <option key={r.id} value={r.name}>{r.name}</option> // Dinamik roller için r.name kullan
              ))
            ) : (
              <option value="user">user</option>
            )}
          </select>
          {optionsError && <p className="mt-1 text-sm text-amber-600">{optionsError}</p>}
          {errors.role && <p className="mt-1 text-sm text-red-600">{errors.role}</p>}
        </div>
        </div>

        {/* Brands Field (Improved Multi-select) */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Marka Seçimi (çoklu)</label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setBrandOpen((o) => !o)}
              className="w-full px-4 py-3 border rounded-xl bg-white text-left flex items-center justify-between"
            >
              <div className="flex flex-wrap gap-2">
                {formData.brandIds.length === 0 && (
                  <span className="text-gray-500">Marka seçin...</span>
                )}
                {formData.brandIds.slice(0, 4).map((id) => {
                  const b = brands.find((x) => String(x.id) === String(id));
                  return (
                    <span key={id} className="px-2 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs border border-blue-200">
                      {b?.name || id}
                    </span>
                  );
                })}
                {formData.brandIds.length > 4 && (
                  <span className="px-2 py-1 rounded-lg bg-gray-100 text-gray-700 text-xs border border-gray-200">+{formData.brandIds.length - 4}</span>
                )}
              </div>
              <svg className="w-5 h-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 011.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd"/></svg>
            </button>

            {brandOpen && (
              <div className="absolute z-10 mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="text"
                    value={brandQuery}
                    onChange={(e) => setBrandQuery(e.target.value)}
                    placeholder="Marka ara..."
                    className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-200">
          <Button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-xl font-medium transition-all duration-200 border border-gray-300"
          >
            İptal
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Ekleniyor...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>Kullanıcı Ekle</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}