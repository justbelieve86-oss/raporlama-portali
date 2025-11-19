import React, { useState, useEffect } from 'react';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { getBrands, getBrandKpis, getKpiDailyReports } from '../services/api';
import { BarChartIcon, DashboardIcon, ReportsIcon, ShieldIcon, ActivityIcon, MenuIcon } from './ui/icons';
import { Card, CardContent } from './ui/card';
import { isMobileDevice } from '../utils/deviceDetection';
import { QueryProvider } from './providers/QueryProvider';

interface StatCard {
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  color: 'blue' | 'green' | 'amber' | 'red' | 'violet';
}

function MobileDashboardContent() {
  const { user } = useCurrentUser();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Stats
  const [totalBrands, setTotalBrands] = useState(0);
  const [activeKpis, setActiveKpis] = useState(0);
  const [monthlyReports, setMonthlyReports] = useState(0);
  const [avgProgress, setAvgProgress] = useState<number | null>(null);

  useEffect(() => {
    // Desktop'ta mobil sayfaya gelinirse normal sayfaya yönlendir
    if (!isMobileDevice()) {
      window.location.href = '/user';
      return;
    }
    
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Brands
      const brandsResponse = await getBrands({});
      const brands = Array.isArray(brandsResponse) ? brandsResponse : [];
      setTotalBrands(brands.length);

      // Active KPIs (tüm markalardan)
      let totalKpis = 0;
      for (const brand of brands) {
        try {
          const kpisResponse = await getBrandKpis(brand.id);
          const kpis = kpisResponse?.kpis || [];
          totalKpis += kpis.length;
        } catch (err) {
          // Marka için KPI alınamazsa devam et
        }
      }
      setActiveKpis(totalKpis);

      // Monthly reports count (basit sayım - sadece ilk marka için örnek)
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;
      let reportCount = 0;
      if (brands.length > 0) {
        try {
          const reportsResponse = await getKpiDailyReports(brands[0].id, currentYear, currentMonth);
          const reports = Array.isArray(reportsResponse) ? reportsResponse : [];
          reportCount = reports.length;
        } catch (err) {
          // Hata durumunda devam et
        }
      }
      setMonthlyReports(reportCount);

      // Average progress (basit hesaplama - şimdilik 0, ileride gerçek hesaplama yapılabilir)
      setAvgProgress(0);

    } catch (err: unknown) {
      const error = err as { message?: string };
      setError(error?.message || 'Veriler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const stats: StatCard[] = [
    {
      title: 'Toplam Marka',
      value: totalBrands,
      icon: ShieldIcon,
      color: 'blue',
    },
    {
      title: 'Aktif KPI',
      value: activeKpis,
      icon: ActivityIcon,
      color: 'green',
    },
    {
      title: 'Bu Ay Rapor',
      value: monthlyReports,
      icon: ReportsIcon,
      color: 'amber',
    },
    {
      title: 'Ort. Gerçekleşme',
      value: avgProgress !== null ? `${Math.round(avgProgress)}%` : '0%',
      icon: BarChartIcon,
      color: avgProgress !== null && avgProgress >= 70 ? 'green' : avgProgress !== null && avgProgress >= 50 ? 'amber' : 'red',
    },
  ];

  const getColorClasses = (color: StatCard['color']) => {
    const colors = {
      blue: 'border-blue-200 bg-blue-50',
      green: 'border-green-200 bg-green-50',
      amber: 'border-amber-200 bg-amber-50',
      red: 'border-red-200 bg-red-50',
      violet: 'border-violet-200 bg-violet-50',
    };
    return colors[color];
  };

  const quickLinks = [
    { href: '/user/sales/dashboard', label: 'Satış', icon: BarChartIcon, color: 'blue' },
    { href: '/user/service/dashboard', label: 'Servis', icon: ShieldIcon, color: 'green' },
    { href: '/user/sales/data-entry', label: 'Veri Girişi', icon: ActivityIcon, color: 'amber' },
    { href: '/user/reports', label: 'Raporlar', icon: ReportsIcon, color: 'violet' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 p-4">
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100 p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="flex items-center justify-between p-4">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Raporlama</h1>
            <p className="text-xs text-gray-600">Hoş geldiniz, {user?.full_name || user?.username || 'Kullanıcı'}</p>
          </div>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 rounded-lg bg-slate-900 text-white touch-manipulation"
            aria-label="Menü"
          >
            <MenuIcon size={20} />
          </button>
        </div>
      </header>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => setIsMenuOpen(false)}
          />
          <nav className="fixed top-0 right-0 h-full w-64 bg-slate-900 z-50 p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-white font-semibold">Menü</h2>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="p-2 rounded-lg text-white hover:bg-slate-800 touch-manipulation"
              >
                ✕
              </button>
            </div>
            <div className="space-y-2">
              <a
                href="/user/mobile"
                className="block px-4 py-3 text-white hover:bg-slate-800 rounded-lg touch-manipulation"
                onClick={() => setIsMenuOpen(false)}
              >
                Ana Sayfa
              </a>
              <a
                href="/user/mobile/daily-kpi"
                className="block px-4 py-3 text-white hover:bg-slate-800 rounded-lg touch-manipulation"
                onClick={() => setIsMenuOpen(false)}
              >
                Günlük KPI Dashboard
              </a>
              <a
                href="/user/mobile/monthly-kpi"
                className="block px-4 py-3 text-white hover:bg-slate-800 rounded-lg touch-manipulation"
                onClick={() => setIsMenuOpen(false)}
              >
                Aylık KPI Dashboard
              </a>
              <a
                href="/login"
                className="block px-4 py-3 text-red-400 hover:bg-slate-800 rounded-lg touch-manipulation mt-4 border-t border-slate-700 pt-4"
                onClick={() => {
                  localStorage.removeItem('access_token');
                  localStorage.removeItem('refresh_token');
                  setIsMenuOpen(false);
                }}
              >
                Çıkış Yap
              </a>
            </div>
          </nav>
        </>
      )}

      {/* Main Content */}
      <main className="p-4 space-y-4 pb-20">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className={`border-2 ${getColorClasses(stat.color)}`}>
                <CardContent className="p-3">
                  <div className="flex flex-col">
                    <p className="text-xs font-medium opacity-80 mb-1">{stat.title}</p>
                    <p className="text-xl font-bold">{stat.value}</p>
                    <div className="mt-2 flex justify-end">
                      <div className={`p-2 rounded-lg bg-white/50 ${getColorClasses(stat.color)}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Links */}
        <Card>
          <CardContent className="p-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Hızlı Erişim</h2>
            <div className="grid grid-cols-2 gap-3">
              {quickLinks.map((link, index) => {
                const Icon = link.icon;
                return (
                  <a
                    key={index}
                    href={link.href}
                    className="flex flex-col items-center justify-center p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 active:bg-blue-100 transition-all touch-manipulation"
                  >
                    <Icon className="w-6 h-6 text-blue-600 mb-2" />
                    <span className="text-xs font-medium text-gray-700 text-center">{link.label}</span>
                  </a>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-600 text-center">
              Mobil görünüm için optimize edilmiş sayfa. Tüm özelliklere erişmek için menüyü kullanın.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export default function MobileDashboard() {
  return (
    <QueryProvider>
      <MobileDashboardContent />
    </QueryProvider>
  );
}

