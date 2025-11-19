import React, { useState, useRef, useEffect } from 'react';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { ChevronDownIcon, UserIcon, LogOutIcon, SettingsIcon, ShieldIcon } from './ui/icons';
import supabase from '../lib/supabase';
import clsx from 'clsx';
import SkeletonLoader from './ui/SkeletonLoader';
import { logger } from '../lib/logger';

interface UserProfileDropdownProps {
  className?: string;
}

export default function UserProfileDropdown({ className }: UserProfileDropdownProps) {
  const { user, loading, error } = useCurrentUser();
  const [isOpen, setIsOpen] = useState(false); // Kullanıcı menüsü veya hata menüsü için ortak state
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Dropdown dışına tıklandığında kapat
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      window.location.href = '/login';
    } catch (error) {
      logger.error('Logout error', error);
    }
  };

  const getUserDisplayName = () => {
    if (!user) return 'Kullanıcı';
    return user.full_name || user.username || user.email?.split('@')[0] || 'Kullanıcı';
  };

  const getUserInitials = () => {
    const displayName = getUserDisplayName();
    return displayName
      .split(' ')
      .map(name => name[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Session timeout durumunda otomatik login sayfasına yönlendir
  // ÖNEMLİ: Bu useEffect erken return'lerden ÖNCE olmalı (React hook kuralları)
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    
    if (error || (!user && !loading)) {
      const errMessage = (error || 'Oturum bulunamadı veya süresi dolmuş. Lütfen tekrar giriş yapın.') as string;
      const isSessionError = errMessage.includes('Kullanıcı bilgileri alınamadı') || 
                             errMessage.includes('Mevcut kullanıcı alınamadı') ||
                             errMessage.includes('401') ||
                             errMessage.includes('Unauthorized') ||
                             errMessage.includes('Oturum bulunamadı');
      
      if (isSessionError && typeof window !== 'undefined' && window.location.pathname !== '/login') {
        // Token'ları temizle
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        localStorage.removeItem('user_role');
        
        // Kısa bir gecikme ile login sayfasına yönlendir
        timeoutId = setTimeout(() => {
          window.location.href = '/login';
        }, 1000);
      }
    }
    
    // Cleanup fonksiyonu - her zaman döndürülmeli
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [error, user, loading]);

  if (loading) {
    return (
      <div className={clsx('flex items-center space-x-2 px-3 py-2 rounded-lg border border-slate-200 bg-white shadow-sm', className)}>
        <SkeletonLoader variant="circular" width={24} height={24} />
        <SkeletonLoader width="80px" height="16px" />
        <SkeletonLoader width="16px" height="16px" />
      </div>
    );
  }

  if (error || !user) {
    const errMessage = (error || 'Oturum bulunamadı veya süresi dolmuş. Lütfen tekrar giriş yapın.') as string;
    const handleCopy = async () => {
      try {
        const details = [
          `Message: ${errMessage}`,
          `URL: ${typeof window !== 'undefined' ? window.location.href : ''}`,
          `Time: ${new Date().toISOString()}`
        ].join('\n');
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
          await navigator.clipboard.writeText(details);
        }
      } catch (e) {
        logger.debug('UserProfileDropdown: copy details failed', e);
      }
    };

    return (
      <div className={clsx('relative', className)} ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          title={errMessage}
          className="flex items-center space-x-2 px-3 py-2 text-sm rounded-lg border border-red-200 bg-white shadow-sm text-red-600 hover:bg-red-50 transition-colors"
        >
          <span className="font-semibold">Hata</span>
          <ChevronDownIcon 
            className={clsx(
              'w-5 h-5 text-red-600 transition-transform',
              isOpen && 'rotate-180'
            )} 
          />
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-red-200 py-2 z-50">
            <div className="px-4">
              <p className="text-sm font-medium text-red-700">Oturum / Kullanıcı Hatası</p>
              <p className="text-xs text-red-600 mt-1 break-words">{errMessage}</p>
            </div>
            <div className="mt-2 px-4 flex items-center space-x-2">
              <button
                onClick={() => window.location.reload()}
                className="px-3 py-1.5 rounded-md border border-slate-200 text-xs hover:bg-gray-50"
              >
                Yenile
              </button>
              <button
                onClick={() => { window.location.href = '/login'; }}
                className="px-3 py-1.5 rounded-md border border-slate-200 text-xs hover:bg-gray-50"
              >
                Giriş Yap
              </button>
              <button
                onClick={handleCopy}
                className="px-3 py-1.5 rounded-md border border-slate-200 text-xs hover:bg-gray-50"
              >
                Detayı kopyala
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={clsx('relative', className)} ref={dropdownRef}>
      <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center space-x-2 px-3 py-2 text-sm rounded-lg bg-white shadow-md hover:bg-gray-50 transition-colors"
        >
          {/* Avatar */}
          <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-medium">
            {getUserInitials()}
          </div>
          
          {/* User Name */}
          <span className="text-black font-bold text-base">
            {getUserDisplayName()}
          </span>
          
          {/* Dropdown Icon */}
          <ChevronDownIcon 
            className={clsx(
              'w-5 h-5 text-black transition-transform',
              isOpen && 'rotate-180'
            )} 
          />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-gray-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* User Info Section */}
          <div className="px-4 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg">
                {getUserInitials()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {getUserDisplayName()}
                </p>
                <p className="text-xs text-gray-600 truncate mt-0.5">
                  {user.email}
                </p>
                {user.role && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border border-blue-200 mt-1.5">
                    <ShieldIcon className="w-3 h-3 mr-1" />
                    {user.role === 'admin' ? 'Yönetici' : user.role.toLowerCase().includes('koordinatör') ? 'Genel Koordinatör' : 'Kullanıcı'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-2">
            <a
              href="/user/profile"
              onClick={() => setIsOpen(false)}
              className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all group"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-100 group-hover:bg-blue-200 flex items-center justify-center mr-3 transition-colors">
                <UserIcon className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-gray-900">Profil</div>
                <div className="text-xs text-gray-500">Profil bilgilerinizi görüntüleyin</div>
              </div>
            </a>
            
            <a
              href="/user/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center w-full px-4 py-3 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all group"
            >
              <div className="w-8 h-8 rounded-lg bg-indigo-100 group-hover:bg-indigo-200 flex items-center justify-center mr-3 transition-colors">
                <SettingsIcon className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-gray-900">Ayarlar</div>
                <div className="text-xs text-gray-500">Hesap ayarlarınızı yönetin</div>
              </div>
            </a>
          </div>

          {/* Logout Section */}
          <div className="border-t border-gray-100 py-2">
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-all group"
            >
              <div className="w-8 h-8 rounded-lg bg-red-100 group-hover:bg-red-200 flex items-center justify-center mr-3 transition-colors">
                <LogOutIcon className="w-4 h-4 text-red-600" />
              </div>
              <div className="flex-1 text-left">
                <div className="font-medium">Çıkış Yap</div>
                <div className="text-xs text-red-500">Hesabınızdan çıkış yapın</div>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}