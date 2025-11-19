import React, { useState, useEffect } from 'react';
import DashboardShell from './DashboardShell';
import PageHeader from './ui/PageHeader';
import { BarChartIcon, UsersIcon, TrendingUpIcon, ActivityIcon } from './ui/icons';
import SkeletonLoader from './ui/SkeletonLoader';

interface StatItem {
  title: string;
  value: string;
  change: string;
  period: string;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface ActivityItem {
  action: string;
  detail: string;
  time: string;
  color: string;
}

interface SystemOverviewItem {
  label: string;
  value: string;
  usage: number;
}

export default function AdminDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<StatItem[]>([]);
  const [recentActivities, setRecentActivities] = useState<ActivityItem[]>([]);
  const [systemOverview, setSystemOverview] = useState<SystemOverviewItem[]>([]);

  // Simulate data loading
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setStats([
        {
          title: 'Toplam Kullanıcı',
          value: '2k',
          change: '+12%',
          period: 'son 30 gün',
          color: 'blue',
          icon: UsersIcon
        },
        {
          title: 'Aktif Markalar',
          value: '8',
          change: '+3',
          period: 'son 30 gün',
          color: 'green',
          icon: TrendingUpIcon
        },
        {
          title: 'Aylık Raporlar',
          value: '156',
          change: '+28%',
          period: 'son 30 gün',
          color: 'cyan',
          icon: BarChartIcon
        },
        {
          title: 'Sistem Durumu',
          value: '99.9%',
          change: 'Stabil',
          period: 'son 30 gün',
          color: 'yellow',
          icon: ActivityIcon
        }
      ]);

      setRecentActivities([
        {
          action: 'Yeni kullanıcı eklendi',
          detail: 'Ahmet Yılmaz sisteme eklendi',
          time: '2 saat önce',
          color: 'green'
        },
        {
          action: 'Rapor oluşturuldu',
          detail: 'Aylık satış raporu hazırlandı',
          time: '4 saat önce',
          color: 'cyan'
        },
        {
          action: 'Marka güncellendi',
          detail: 'Mercedes-Benz bilgileri düzenlendi',
          time: '1 gün önce',
          color: 'yellow'
        }
      ]);

      setSystemOverview([
        { label: 'Disk Kullanımı', value: '52%', usage: 52 },
        { label: 'Bellek Kullanımı', value: '43%', usage: 43 },
        { label: 'CPU Kullanımı', value: '32%', usage: 32 }
      ]);

      setIsLoading(false);
    };

    loadData();
  }, []);

  if (isLoading) {
    return (
      <DashboardShell role="admin">
        <div className="space-y-8">
          {/* Header Skeleton */}
          <div className="space-y-2">
            <SkeletonLoader width="200px" height="32px" />
            <SkeletonLoader width="300px" height="16px" />
          </div>

          {/* Stats Cards Skeleton */}
          <div className="admin-card-grid-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="admin-card-lg">
                <div className="flex items-center justify-between mb-4">
                  <SkeletonLoader variant="circular" width={40} height={40} />
                  <SkeletonLoader width="60px" height="24px" className="rounded-full" />
                </div>
                <div className="space-y-2">
                  <SkeletonLoader width="80px" height="32px" />
                  <SkeletonLoader width="120px" height="16px" />
                  <SkeletonLoader width="100px" height="12px" />
                </div>
              </div>
            ))}
          </div>

          {/* Main Content Grid Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Hızlı İşlemler Skeleton */}
            <div className="lg:col-span-2">
              <div className="admin-card-lg">
                <SkeletonLoader width="150px" height="24px" className="mb-6" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="p-4 border-2 border-dashed border-gray-200 rounded-lg">
                      <div className="text-center space-y-3">
                        <SkeletonLoader variant="circular" width={48} height={48} className="mx-auto" />
                        <SkeletonLoader width="120px" height="16px" className="mx-auto" />
                        <SkeletonLoader width="150px" height="12px" className="mx-auto" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar Skeleton */}
            <div className="space-y-6">
              {/* Son Aktiviteler Skeleton */}
              <div className="admin-card-lg">
                <SkeletonLoader width="120px" height="20px" className="mb-4" />
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="flex items-start space-x-3 p-3">
                      <SkeletonLoader variant="circular" width={8} height={8} className="mt-2" />
                      <div className="flex-1 space-y-2">
                        <SkeletonLoader width="150px" height="14px" />
                        <SkeletonLoader width="200px" height="12px" />
                        <SkeletonLoader width="80px" height="10px" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sistem Özeti Skeleton */}
              <div className="admin-card-lg">
                <SkeletonLoader width="100px" height="20px" className="mb-4" />
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <div key={index} className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex justify-between mb-3">
                        <SkeletonLoader width="100px" height="14px" />
                        <SkeletonLoader width="40px" height="14px" />
                      </div>
                      <SkeletonLoader width="100%" height="8px" className="rounded-full" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell role="admin">
      <div className="space-y-8">
        {/* Header */}
        <PageHeader 
          title="Dashboard" 
          description="Sistem genel durumu ve hızlı erişim" 
        />

        {/* Stats Cards */}
        <div className="admin-card-grid-4">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div 
                key={index} 
                className="admin-card-lg hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer group"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-2 rounded-lg bg-${stat.color}-100 group-hover:scale-110 transition-transform duration-200`}>
                    <Icon className={`w-5 h-5 text-${stat.color}-600`} />
                  </div>
                  <span className={`text-sm font-medium px-2 py-1 rounded-full bg-${stat.color}-100 text-${stat.color}-700 group-hover:bg-${stat.color}-200 transition-colors duration-200`}>
                    {stat.change}
                  </span>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 mb-1 group-hover:text-gray-800 transition-colors duration-200">{stat.value}</p>
                  <p className="text-sm text-gray-600">{stat.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{stat.period}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Hızlı İşlemler */}
          <div className="lg:col-span-2">
            <div className="admin-card-lg">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Hızlı İşlemler</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="p-4 border-2 border-dashed border-blue-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all duration-300 cursor-pointer group">
                   <div className="text-center">
                     <div className="w-12 h-12 bg-blue-100 rounded-lg mx-auto mb-3 flex items-center justify-center group-hover:scale-110 group-hover:bg-blue-200 transition-all duration-200">
                       <UsersIcon className="w-6 h-6 text-blue-600" />
                     </div>
                     <h3 className="font-medium text-gray-900 mb-1 group-hover:text-blue-700 transition-colors duration-200">Yeni Kullanıcı Ekle</h3>
                     <p className="text-sm text-gray-600">Sisteme yeni kullanıcı ekleyin</p>
                   </div>
                 </div>
                 <div className="p-4 border-2 border-dashed border-green-200 rounded-lg hover:border-green-400 hover:bg-green-50 transition-all duration-300 cursor-pointer group">
                   <div className="text-center">
                     <div className="w-12 h-12 bg-green-100 rounded-lg mx-auto mb-3 flex items-center justify-center group-hover:scale-110 group-hover:bg-green-200 transition-all duration-200">
                       <TrendingUpIcon className="w-6 h-6 text-green-600" />
                     </div>
                     <h3 className="font-medium text-gray-900 mb-1 group-hover:text-green-700 transition-colors duration-200">Marka Yönetimi</h3>
                     <p className="text-sm text-gray-600">Marka bilgilerini düzenleyin</p>
                   </div>
                 </div>
                 <div className="p-4 border-2 border-dashed border-cyan-200 rounded-lg hover:border-cyan-400 hover:bg-cyan-50 transition-all duration-300 cursor-pointer group">
                   <div className="text-center">
                     <div className="w-12 h-12 bg-cyan-100 rounded-lg mx-auto mb-3 flex items-center justify-center group-hover:scale-110 group-hover:bg-cyan-200 transition-all duration-200">
                       <BarChartIcon className="w-6 h-6 text-cyan-600" />
                     </div>
                     <h3 className="font-medium text-gray-900 mb-1 group-hover:text-cyan-700 transition-colors duration-200">Rapor Oluştur</h3>
                     <p className="text-sm text-gray-600">Yeni rapor hazırlayın</p>
                   </div>
                 </div>
                 <div className="p-4 border-2 border-dashed border-yellow-200 rounded-lg hover:border-yellow-400 hover:bg-yellow-50 transition-all duration-300 cursor-pointer group">
                   <div className="text-center">
                     <div className="w-12 h-12 bg-yellow-100 rounded-lg mx-auto mb-3 flex items-center justify-center group-hover:scale-110 group-hover:bg-yellow-200 transition-all duration-200">
                       <ActivityIcon className="w-6 h-6 text-yellow-600" />
                     </div>
                     <h3 className="font-medium text-gray-900 mb-1 group-hover:text-yellow-700 transition-colors duration-200">Sistem Ayarları</h3>
                     <p className="text-sm text-gray-600">Genel ayarları düzenleyin</p>
                   </div>
                 </div>
               </div>
            </div>
          </div>

          {/* Sistem Özeti */}
          <div className="space-y-6">
            {/* Son Aktiviteler */}
            <div className="admin-card-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Son Aktiviteler</h3>
              <div className="space-y-4">
                {recentActivities.map((activity, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-all duration-200 cursor-pointer group" style={{ animationDelay: `${index * 100}ms` }}>
                    <div className={`w-2 h-2 rounded-full bg-${activity.color}-500 mt-2 flex-shrink-0 group-hover:scale-150 transition-transform duration-200`}></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 group-hover:text-gray-800 transition-colors duration-200">{activity.action}</p>
                      <p className="text-sm text-gray-600">{activity.detail}</p>
                      <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sistem Özeti */}
            <div className="admin-card-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Sistem Özeti</h3>
              <div className="space-y-4">
                {systemOverview.map((item, index) => (
                  <div key={index} className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg hover:from-gray-100 hover:to-gray-200 transition-all duration-300 cursor-pointer group" style={{ animationDelay: `${index * 100}ms` }}>
                    <div className="flex justify-between text-sm mb-3">
                      <span className="text-gray-600 group-hover:text-gray-700 transition-colors duration-200">{item.label}</span>
                      <span className="font-medium text-gray-900 group-hover:text-gray-800 transition-colors duration-200">{item.value}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 group-hover:h-3 transition-all duration-200">
                      <div 
                        className={`h-2 group-hover:h-3 rounded-full transition-all duration-300 ${
                          item.usage > 70 ? 'bg-red-500 group-hover:bg-red-600' : 
                          item.usage > 50 ? 'bg-yellow-500 group-hover:bg-yellow-600' : 'bg-green-500 group-hover:bg-green-600'
                        }`}
                        style={{ width: `${item.usage}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}