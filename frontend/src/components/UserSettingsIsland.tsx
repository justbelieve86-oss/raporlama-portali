import React, { useState } from 'react';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { SettingsIcon, BellIcon, LockIcon, GlobeIcon, MoonIcon, SunIcon } from './ui/icons';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import SkeletonLoader from './ui/SkeletonLoader';
import { QueryProvider } from './providers/QueryProvider';
import clsx from 'clsx';

function UserSettingsIslandContent() {
  const { user, loading, error } = useCurrentUser();
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    reports: true,
  });
  const [theme, setTheme] = useState<'light' | 'dark' | 'auto'>('light');
  const [language, setLanguage] = useState('tr');

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <SkeletonLoader width="200px" height="24px" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <SkeletonLoader width="100%" height="60px" />
              <SkeletonLoader width="100%" height="60px" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !user) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">
            <p className="text-red-600 font-medium">Ayarlar yüklenemedi</p>
            <p className="text-sm text-gray-500 mt-2">{error || 'Kullanıcı bilgisi bulunamadı'}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Bildirim Ayarları */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellIcon className="w-5 h-5 text-blue-600" />
            Bildirim Ayarları
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all">
              <div className="flex-1">
                <div className="font-medium text-gray-900">E-posta Bildirimleri</div>
                <div className="text-sm text-gray-500 mt-0.5">Önemli güncellemeler için e-posta alın</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifications.email}
                  onChange={(e) => setNotifications({ ...notifications, email: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all">
              <div className="flex-1">
                <div className="font-medium text-gray-900">Push Bildirimleri</div>
                <div className="text-sm text-gray-500 mt-0.5">Tarayıcı bildirimleri alın</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifications.push}
                  onChange={(e) => setNotifications({ ...notifications, push: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all">
              <div className="flex-1">
                <div className="font-medium text-gray-900">Rapor Bildirimleri</div>
                <div className="text-sm text-gray-500 mt-0.5">Rapor hazır olduğunda bildirim alın</div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifications.reports}
                  onChange={(e) => setNotifications({ ...notifications, reports: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Görünüm Ayarları */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MoonIcon className="w-5 h-5 text-blue-600" />
            Görünüm Ayarları
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Tema</label>
              <div className="grid grid-cols-3 gap-3">
                {(['light', 'dark', 'auto'] as const).map((themeOption) => (
                  <button
                    key={themeOption}
                    onClick={() => setTheme(themeOption)}
                    className={clsx(
                      "p-4 rounded-lg border-2 transition-all text-left",
                      theme === themeOption
                        ? "border-blue-500 bg-blue-50 shadow-md"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {themeOption === 'light' && <SunIcon className="w-5 h-5 text-yellow-600" />}
                      {themeOption === 'dark' && <MoonIcon className="w-5 h-5 text-indigo-600" />}
                      {themeOption === 'auto' && <GlobeIcon className="w-5 h-5 text-blue-600" />}
                      <span className="font-medium text-gray-900 capitalize">
                        {themeOption === 'light' ? 'Açık' : themeOption === 'dark' ? 'Koyu' : 'Otomatik'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {themeOption === 'light' && 'Açık renk teması'}
                      {themeOption === 'dark' && 'Koyu renk teması'}
                      {themeOption === 'auto' && 'Sistem ayarına göre'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Dil</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              >
                <option value="tr">Türkçe</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Güvenlik Ayarları */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LockIcon className="w-5 h-5 text-blue-600" />
            Güvenlik
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-medium text-gray-900">Şifre Değiştir</div>
                  <div className="text-sm text-gray-500 mt-0.5">Hesap şifrenizi güncelleyin</div>
                </div>
                <Button variant="secondary" className="ml-4">
                  Değiştir
                </Button>
              </div>
            </div>

            <div className="p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-medium text-gray-900">İki Faktörlü Doğrulama</div>
                  <div className="text-sm text-gray-500 mt-0.5">Hesabınızı ekstra güvenlik ile koruyun</div>
                </div>
                <Button variant="secondary" className="ml-4">
                  Etkinleştir
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Kaydet Butonu */}
      <div className="flex justify-end gap-3">
        <Button variant="secondary">
          İptal
        </Button>
        <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg transition-all">
          Değişiklikleri Kaydet
        </Button>
      </div>
    </div>
  );
}

export default function UserSettingsIsland() {
  return (
    <QueryProvider>
      <UserSettingsIslandContent />
    </QueryProvider>
  );
}
