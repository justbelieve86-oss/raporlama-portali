import React, { useState } from 'react';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { UserIcon, MailIcon, ShieldIcon, CalendarIcon, EditIcon } from './ui/icons';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import SkeletonLoader from './ui/SkeletonLoader';
import { QueryProvider } from './providers/QueryProvider';
import clsx from 'clsx';

function UserProfileIslandContent() {
  const { user, loading, error } = useCurrentUser();
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState('');
  const [editedEmail, setEditedEmail] = useState('');

  React.useEffect(() => {
    if (user) {
      setEditedName(user.full_name || user.username || '');
      setEditedEmail(user.email || '');
    }
  }, [user]);

  const getUserInitials = () => {
    if (!user) return 'U';
    const displayName = user.full_name || user.username || user.email?.split('@')[0] || 'Kullanıcı';
    return displayName
      .split(' ')
      .map(name => name[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Bilinmiyor';
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('tr-TR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    } catch {
      return dateString;
    }
  };

  const getRoleDisplay = (role?: string) => {
    if (!role) return 'Kullanıcı';
    if (role === 'admin') return 'Yönetici';
    if (role.toLowerCase().includes('koordinatör')) return 'Genel Koordinatör';
    return role;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <SkeletonLoader width="200px" height="24px" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <SkeletonLoader width="100%" height="60px" />
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
            <p className="text-red-600 font-medium">Profil bilgileri yüklenemedi</p>
            <p className="text-sm text-gray-500 mt-2">{error || 'Kullanıcı bilgisi bulunamadı'}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Profile Header Card */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 h-32"></div>
        <CardContent className="pt-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 -mt-16 sm:-mt-12">
            <div className="relative">
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-3xl sm:text-4xl font-bold shadow-xl border-4 border-white">
                {getUserInitials()}
              </div>
              <button
                className="absolute bottom-0 right-0 sm:bottom-2 sm:right-2 w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center shadow-md hover:shadow-lg transition-all hover:scale-110"
                title="Profil fotoğrafı değiştir"
              >
                <EditIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
              </button>
            </div>
            <div className="flex-1 pt-4 sm:pt-0">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
                {user.full_name || user.username || 'Kullanıcı'}
              </h2>
              <p className="text-gray-600 mt-1">{user.email}</p>
              <div className="flex items-center gap-2 mt-3">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 border border-blue-200">
                  <ShieldIcon className="w-3 h-3 mr-1.5" />
                  {getRoleDisplay(user.role)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Information Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <UserIcon className="w-5 h-5 text-blue-600" />
              Kişisel Bilgiler
            </CardTitle>
            {!isEditing && (
              <Button
                variant="secondary"
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2"
              >
                <EditIcon className="w-4 h-4" />
                Düzenle
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Ad Soyad</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="Ad Soyad"
                  />
                ) : (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-gray-50 border border-gray-200">
                    <UserIcon className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-900">{user.full_name || user.username || 'Belirtilmemiş'}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">E-posta</label>
                {isEditing ? (
                  <input
                    type="email"
                    value={editedEmail}
                    onChange={(e) => setEditedEmail(e.target.value)}
                    className="w-full h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder="E-posta"
                  />
                ) : (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-gray-50 border border-gray-200">
                    <MailIcon className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-900">{user.email || 'Belirtilmemiş'}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Rol</label>
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-gray-50 border border-gray-200">
                  <ShieldIcon className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-900">{getRoleDisplay(user.role)}</span>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Kayıt Tarihi</label>
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-gray-50 border border-gray-200">
                  <CalendarIcon className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-900">{formatDate(user.created_at)}</span>
                </div>
              </div>
            </div>

            {isEditing && (
              <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
                <Button
                  onClick={() => {
                    // TODO: Save profile changes
                    setIsEditing(false);
                  }}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                >
                  Kaydet
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setEditedName(user.full_name || user.username || '');
                    setEditedEmail(user.email || '');
                    setIsEditing(false);
                  }}
                >
                  İptal
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Account Statistics Card */}
      <Card>
        <CardHeader>
          <CardTitle>Hesap İstatistikleri</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100">
              <div className="text-2xl font-bold text-blue-600">-</div>
              <div className="text-sm text-gray-600 mt-1">Toplam Rapor</div>
            </div>
            <div className="p-4 rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100">
              <div className="text-2xl font-bold text-green-600">-</div>
              <div className="text-sm text-gray-600 mt-1">Aktif Marka</div>
            </div>
            <div className="p-4 rounded-lg bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-100">
              <div className="text-2xl font-bold text-purple-600">-</div>
              <div className="text-sm text-gray-600 mt-1">Son Giriş</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function UserProfileIsland() {
  return (
    <QueryProvider>
      <UserProfileIslandContent />
    </QueryProvider>
  );
}

