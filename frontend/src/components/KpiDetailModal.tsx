import React, { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  type ChartOptions,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { useTheme } from '../hooks/useTheme';
import { parseNumberInput } from '../lib/formatUtils';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const MONTHS = ["Ocak","Şubat","Mart","Nisan","Mayıs","Haziran","Temmuz","Ağustos","Eylül","Ekim","Kasım","Aralık"];

type Kpi = { 
  id: string; 
  name: string; 
  category?: string; 
  unit?: string; 
  ytd_calc?: 'ortalama' | 'toplam';
  // Bazı KPI'lar yalnızca kümülatif olabilir; bu durumda projeksiyon göstermeyiz
  only_cumulative?: boolean;
};

interface KpiDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  kpi: Kpi | null;
  currentYearData: Record<number, string>;
  previousYearData: Record<number, string>;
  target: string;
  currentYear: number;
  currentMonth: number;
}

export default function KpiDetailModal({
  isOpen,
  onClose,
  kpi,
  currentYearData,
  previousYearData,
  target,
  currentYear,
  currentMonth
}: KpiDetailModalProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const [chartData, setChartData] = useState<any>(null);
  const [projectionData, setProjectionData] = useState<any>(null);
  const [statistics, setStatistics] = useState<{
    currentYearTotal: number;
    previousYearTotal: number;
    growth: number;
    averageCurrent: number;
    averagePrevious: number;
    bestMonth: { month: string; value: number };
    worstMonth: { month: string; value: number };
  } | null>(null);
  
  // Tüm KPI'lar için projeksiyon göster (hedef varsa)
  const showProjection = !!(
    kpi &&
    target &&
    (parseNumberInput(target) ?? 0) > 0
  );

  useEffect(() => {
    if (!kpi || !isOpen) return;

    // Yıllık karşılaştırma grafiği verisi
    const currentYearValues = MONTHS.map((_, index) => {
      const monthValue = currentYearData[index + 1];
      return monthValue ? (parseNumberInput(monthValue) ?? 0) : 0;
    });

    const previousYearValues = MONTHS.map((_, index) => {
      const monthValue = previousYearData[index + 1];
      return monthValue ? (parseNumberInput(monthValue) ?? 0) : 0;
    });

    setChartData({
      labels: MONTHS,
      datasets: [
        {
          label: `${currentYear} (Güncel Yıl)`,
          data: currentYearValues,
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
        },
        {
          label: `${currentYear - 1} (Önceki Yıl)`,
          data: previousYearValues,
          borderColor: 'rgb(156, 163, 175)',
          backgroundColor: 'rgba(156, 163, 175, 0.1)',
          borderWidth: 2,
          fill: false,
          tension: 0.4,
          borderDash: [5, 5],
        }
      ]
    });

    // İstatistikleri hesapla
    const currentYearTotal = currentYearValues.reduce((sum, val) => sum + val, 0);
    const previousYearTotal = previousYearValues.reduce((sum, val) => sum + val, 0);
    const validCurrentValues = currentYearValues.filter(val => val > 0);
    const validPreviousValues = previousYearValues.filter(val => val > 0);
    const averageCurrent = validCurrentValues.length > 0 ? validCurrentValues.reduce((sum, val) => sum + val, 0) / validCurrentValues.length : 0;
    const averagePrevious = validPreviousValues.length > 0 ? validPreviousValues.reduce((sum, val) => sum + val, 0) / validPreviousValues.length : 0;
    
    // Puan birimli KPI'lar için büyüme oranını ortalama bazlı hesapla
    const isPuanUnit = kpi.unit?.toLowerCase() === 'puan';
    const growth = isPuanUnit
      ? (averagePrevious > 0 ? ((averageCurrent - averagePrevious) / averagePrevious) * 100 : 0)
      : (previousYearTotal > 0 ? ((currentYearTotal - previousYearTotal) / previousYearTotal) * 100 : 0);
    
    // En iyi ve en kötü ayı bul
    const currentYearMaxIndex = currentYearValues.length > 0 
      ? currentYearValues.indexOf(Math.max(...currentYearValues)) 
      : -1;
    const positiveValues = currentYearValues.filter(val => val > 0);
    const currentYearMinIndex = positiveValues.length > 0
      ? currentYearValues.indexOf(Math.min(...positiveValues))
      : -1;
    
    setStatistics({
      currentYearTotal,
      previousYearTotal,
      growth,
      averageCurrent,
      averagePrevious,
      bestMonth: {
        month: currentYearMaxIndex >= 0 ? MONTHS[currentYearMaxIndex] : '',
        value: currentYearMaxIndex >= 0 ? currentYearValues[currentYearMaxIndex] : 0
      },
      worstMonth: {
        month: currentYearMinIndex >= 0 ? MONTHS[currentYearMinIndex] : '',
        value: currentYearMinIndex >= 0 ? currentYearValues[currentYearMinIndex] : 0
      }
    });

    // Hedef projeksiyonu grafiği verisi - TÜM KPI'lar için göster (hedef varsa)
    if (showProjection) {
      const targetValue = parseNumberInput(target) ?? 0;
      
      // Adet verisi için özel hesaplama
      if (kpi.unit === 'Adet') {
          const currentTotal = currentYearValues.slice(0, currentMonth).reduce((sum, val) => sum + val, 0);
          const remainingMonths = 12 - currentMonth;
          
          let monthlyNeeded = 0;
          
          if (remainingMonths > 0) {
            const remainingTarget = Math.max(0, targetValue - currentTotal);
            monthlyNeeded = remainingTarget / remainingMonths;
          }
        
        // Tek sütun için birleşik veri oluştur
        // Gerçekleşen veri varsa gerçekleşen, yoksa projeksiyon göster
        const combinedData = currentYearValues.map((actualValue, index) => {
          if (index < currentMonth) {
            // Gerçekleşen aylar için gerçek veriyi göster
            return actualValue;
          } else {
            // Gelecek aylar için projeksiyon göster
            return monthlyNeeded;
          }
        });
        
        // Renkleri dinamik olarak ayarla
        const backgroundColors = currentYearValues.map((_, index) => {
          if (index < currentMonth) {
            // Gerçekleşen aylar için yeşil
            return 'rgba(34, 197, 94, 0.8)';
          } else {
            // Projeksiyon ayları için mavi
            return 'rgba(59, 130, 246, 0.8)';
          }
        });
        
        const borderColors = currentYearValues.map((_, index) => {
          if (index < currentMonth) {
            // Gerçekleşen aylar için yeşil
            return 'rgba(34, 197, 94, 1)';
          } else {
            // Projeksiyon ayları için mavi
            return 'rgba(59, 130, 246, 1)';
          }
        });
        
        setProjectionData({
          labels: MONTHS,
          datasets: [
            {
              label: 'Gerçekleşen / Projeksiyon',
              data: combinedData,
              backgroundColor: backgroundColors,
              borderColor: borderColors,
              borderWidth: 1,
            },
            {
              label: 'Yıllık Hedef',
              data: Array(12).fill(targetValue / 12), // Aylık hedef gösterimi
              type: 'line' as const,
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              borderColor: 'rgba(239, 68, 68, 1)',
              borderWidth: 2,
              fill: false,
              pointRadius: 0,
            },
          ],
        });
        
        return;
      }
      
      // Yüzde birimli KPI'lar için özel hesaplama
      if (kpi.unit === '%' || kpi.unit?.toLowerCase() === 'yüzde') {
        // Yüzde KPI'lar için ortalama bazlı projeksiyon
        const validValues = currentYearValues.slice(0, currentMonth).filter(val => val > 0);
        const currentAverage = validValues.length > 0 ? validValues.reduce((sum, val) => sum + val, 0) / validValues.length : 0;
        const targetAverage = targetValue; // Yüzde için hedef zaten ortalama
        
        const remainingMonths = 12 - currentMonth;
        let monthlyNeeded = targetAverage;
        let isTargetAchievable = true;
        
        if (remainingMonths > 0 && validValues.length > 0) {
          const maxPossibleValue = Math.max(...validValues);
          if (targetAverage > maxPossibleValue && maxPossibleValue > 0) {
            monthlyNeeded = maxPossibleValue;
            isTargetAchievable = false;
          }
        }
        
        const projectionValues = MONTHS.map((_, index) => {
          if (index < currentMonth) {
            return currentYearValues[index];
          } else {
            return monthlyNeeded;
          }
        });
        
        setProjectionData({
          labels: MONTHS,
          datasets: [
            {
              label: 'Gerçekleşen',
              data: currentYearValues.map((val, index) => index < currentMonth ? val : null),
              backgroundColor: 'rgba(34, 197, 94, 0.8)',
              borderColor: 'rgb(34, 197, 94)',
              borderWidth: 1,
            },
            {
              label: isTargetAchievable ? 'Hedefe Ulaşmak İçin Gerekli' : 'Maksimum Projeksiyon',
              data: MONTHS.map((_, index) => index >= currentMonth ? monthlyNeeded : null),
              backgroundColor: isTargetAchievable ? 'rgba(249, 115, 22, 0.8)' : 'rgba(168, 85, 247, 0.8)',
              borderColor: isTargetAchievable ? 'rgb(249, 115, 22)' : 'rgb(168, 85, 247)',
              borderWidth: 1,
            },
            {
              label: 'Yıllık Hedef',
              data: MONTHS.map(() => targetAverage),
              type: 'line' as const,
              borderColor: 'rgb(239, 68, 68)',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              borderWidth: 2,
              borderDash: [10, 5],
              fill: false,
            }
          ]
        });
        return;
      }
      
      // Only cumulative KPI'lar için özel hesaplama
      if (kpi.only_cumulative) {
        // Kümülatif KPI'lar için aylık hedef gösterimi
        const monthlyTarget = targetValue / 12;
        const projectionValues = MONTHS.map((_, index) => {
          if (index < currentMonth) {
            return currentYearValues[index] || 0;
          } else {
            return monthlyTarget;
          }
        });
        
        setProjectionData({
          labels: MONTHS,
          datasets: [
            {
              label: 'Gerçekleşen',
              data: currentYearValues.map((val, index) => index < currentMonth ? (val || 0) : null),
              backgroundColor: 'rgba(34, 197, 94, 0.8)',
              borderColor: 'rgb(34, 197, 94)',
              borderWidth: 1,
            },
            {
              label: 'Hedef Projeksiyonu',
              data: MONTHS.map((_, index) => index >= currentMonth ? monthlyTarget : null),
              backgroundColor: 'rgba(59, 130, 246, 0.8)',
              borderColor: 'rgb(59, 130, 246)',
              borderWidth: 1,
            },
            {
              label: 'Aylık Hedef',
              data: MONTHS.map(() => monthlyTarget),
              type: 'line' as const,
              borderColor: 'rgb(239, 68, 68)',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              borderWidth: 2,
              borderDash: [10, 5],
              fill: false,
            }
          ]
        });
        return;
      }
      
      // KPI'ın ytd_calc değerine göre gerçekleşen değeri hesapla
      let currentRealized = 0;
      const validValues = currentYearValues.slice(0, currentMonth).filter(val => val > 0);
      
      if (kpi.ytd_calc === 'ortalama') {
        // Ortalama hesaplama: gerçekleşen ayların ortalaması * 12
        const average = validValues.length > 0 ? validValues.reduce((sum, val) => sum + val, 0) / validValues.length : 0;
        currentRealized = average * 12; // Yıllık projeksiyon için ortalamayı 12 ile çarp
      } else {
        // Toplam hesaplama: mevcut toplam
        currentRealized = currentYearValues.slice(0, currentMonth).reduce((sum, val) => sum + val, 0);
      }
      
      const remainingMonths = 12 - currentMonth;
      
      // Kalan aylarda hedefe ulaşmak için gereken aylık değer
      let monthlyNeeded = 0;
      let isTargetAchievable = true;
      
      if (remainingMonths > 0) {
        if (kpi.ytd_calc === 'ortalama') {
          // Ortalama KPI için: hedefe ulaşmak için gereken yıllık ortalama hesapla
          const requiredYearlyAverage = targetValue;
          const currentSum = validValues.reduce((sum, val) => sum + val, 0);
          const currentAverage = validValues.length > 0 ? currentSum / validValues.length : 0;
          
          // Hedefe ulaşmak için kalan aylarda gereken ortalama
          const totalMonthsNeeded = 12;
          const requiredTotalSum = requiredYearlyAverage * totalMonthsNeeded;
          const remainingSum = requiredTotalSum - currentSum;
          monthlyNeeded = remainingSum / remainingMonths;
          
          // Maksimum mümkün değeri kontrol et
          const maxPossibleValue = validValues.length > 0 ? Math.max(...validValues) : 0;
          
          // Eğer gereken değer maksimumdan büyükse, maksimum değerle en yakın projeksiyonu hesapla
          if (monthlyNeeded > maxPossibleValue && maxPossibleValue > 0) {
            monthlyNeeded = maxPossibleValue;
            isTargetAchievable = false;
          }
        } else {
          // Toplam KPI için: kalan hedefi kalan ay sayısına böl
          const remainingTarget = Math.max(0, targetValue - currentRealized);
          monthlyNeeded = remainingTarget / remainingMonths;
          
          const maxPossibleValue = currentYearValues.slice(0, currentMonth).length > 0 
            ? Math.max(...currentYearValues.slice(0, currentMonth).filter(v => v > 0)) 
            : 0;
          if (monthlyNeeded > maxPossibleValue && maxPossibleValue > 0) {
            monthlyNeeded = maxPossibleValue;
            isTargetAchievable = false;
          }
        }
      }

      const projectionValues = MONTHS.map((_, index) => {
        if (index < currentMonth) {
          return currentYearValues[index];
        } else {
          return monthlyNeeded;
        }
      });

      setProjectionData({
        labels: MONTHS,
        datasets: [
          {
            label: 'Gerçekleşen',
            data: currentYearValues.map((val, index) => index < currentMonth ? val : null),
            backgroundColor: 'rgba(34, 197, 94, 0.8)',
            borderColor: 'rgb(34, 197, 94)',
            borderWidth: 1,
          },
          {
            label: isTargetAchievable ? 'Hedefe Ulaşmak İçin Gerekli' : 'Maksimum Projeksiyon (Hedefe En Yakın)',
            data: MONTHS.map((_, index) => index >= currentMonth ? monthlyNeeded : null),
            backgroundColor: isTargetAchievable ? 'rgba(249, 115, 22, 0.8)' : 'rgba(168, 85, 247, 0.8)',
            borderColor: isTargetAchievable ? 'rgb(249, 115, 22)' : 'rgb(168, 85, 247)',
            borderWidth: 1,
          },
          {
            label: 'Yıllık Hedef',
            data: MONTHS.map(() => targetValue / 12),
            type: 'line' as const,
            borderColor: 'rgb(239, 68, 68)',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            borderWidth: 2,
            borderDash: [10, 5],
            fill: false,
          }
        ]
      });
    }
  }, [kpi, currentYearData, previousYearData, target, currentYear, currentMonth, isOpen]);

  if (!isOpen || !kpi) return null;

  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 15,
          color: isDark ? '#e2e8f0' : '#1e293b',
          font: {
            size: window.innerWidth < 640 ? 11 : 12,
          },
        },
      },
      title: {
        display: true,
        text: `${kpi.name} - Yıllık Karşılaştırma`,
        color: isDark ? '#f1f5f9' : '#0f172a',
        font: {
          size: window.innerWidth < 640 ? 14 : 16,
        },
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
        titleColor: isDark ? '#f1f5f9' : '#0f172a',
        bodyColor: isDark ? '#e2e8f0' : '#1e293b',
        borderColor: isDark ? '#334155' : '#e2e8f0',
        borderWidth: 1,
        titleFont: {
          size: window.innerWidth < 640 ? 12 : 14,
        },
        bodyFont: {
          size: window.innerWidth < 640 ? 11 : 12,
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: isDark ? '#94a3b8' : '#64748b',
          font: {
            size: window.innerWidth < 640 ? 10 : 11,
          },
          maxRotation: window.innerWidth < 640 ? 45 : 0,
        },
        grid: {
          color: isDark ? 'rgba(148, 163, 184, 0.1)' : 'rgba(148, 163, 184, 0.2)',
        },
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: kpi.unit || 'Değer',
          color: isDark ? '#e2e8f0' : '#1e293b',
          font: {
            size: window.innerWidth < 640 ? 11 : 12,
          },
        },
        ticks: {
          color: isDark ? '#94a3b8' : '#64748b',
          font: {
            size: window.innerWidth < 640 ? 10 : 11,
          },
        },
        grid: {
          color: isDark ? 'rgba(148, 163, 184, 0.1)' : 'rgba(148, 163, 184, 0.2)',
        },
      },
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false,
    },
  };

  const projectionOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 15,
          color: isDark ? '#e2e8f0' : '#1e293b',
          font: {
            size: window.innerWidth < 640 ? 11 : 12,
          },
        },
      },
      title: {
        display: true,
        text: `${kpi.name} - Hedef Projeksiyonu`,
        color: isDark ? '#f1f5f9' : '#0f172a',
        font: {
          size: window.innerWidth < 640 ? 14 : 16,
        },
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: isDark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
        titleColor: isDark ? '#f1f5f9' : '#0f172a',
        bodyColor: isDark ? '#e2e8f0' : '#1e293b',
        borderColor: isDark ? '#334155' : '#e2e8f0',
        borderWidth: 1,
        titleFont: {
          size: window.innerWidth < 640 ? 12 : 14,
        },
        bodyFont: {
          size: window.innerWidth < 640 ? 11 : 12,
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: isDark ? '#94a3b8' : '#64748b',
          font: {
            size: window.innerWidth < 640 ? 10 : 11,
          },
          maxRotation: window.innerWidth < 640 ? 45 : 0,
        },
        grid: {
          color: isDark ? 'rgba(148, 163, 184, 0.1)' : 'rgba(148, 163, 184, 0.2)',
        },
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: kpi.unit || 'Değer',
          color: isDark ? '#e2e8f0' : '#1e293b',
          font: {
            size: window.innerWidth < 640 ? 11 : 12,
          },
        },
        ticks: {
          color: isDark ? '#94a3b8' : '#64748b',
          font: {
            size: window.innerWidth < 640 ? 10 : 11,
          },
        },
        grid: {
          color: isDark ? 'rgba(148, 163, 184, 0.1)' : 'rgba(148, 163, 184, 0.2)',
        },
      },
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false,
    },
  };

  return (
    <div className="fixed inset-0 bg-transparent backdrop-blur-md supports-[backdrop-filter]:bg-white/5 flex items-center justify-center z-[100] p-2 sm:p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto animate-fadeInUp ring-1 ring-black/5 transition-colors duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{kpi.name}</h2>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              {kpi.category && `Kategori: ${kpi.category}`}
              {kpi.unit && ` • Birim: ${kpi.unit}`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-4 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-6 sm:space-y-8">
          {/* İstatistikler Özeti */}
          {statistics && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 sm:p-4 border border-blue-200">
                <div className="text-xs sm:text-sm text-blue-700 font-medium mb-1">
                  {kpi.unit?.toLowerCase() === 'puan' ? 'Ortalama' : 'Toplam'} ({currentYear})
                </div>
                <div className="text-lg sm:text-xl font-bold text-blue-900">
                  {kpi.unit?.toLowerCase() === 'puan' 
                    ? new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 }).format(statistics.averageCurrent)
                    : new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 }).format(statistics.currentYearTotal)
                  } {kpi.unit || ''}
                </div>
              </div>
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-3 sm:p-4 border border-gray-200">
                <div className="text-xs sm:text-sm text-gray-700 font-medium mb-1">
                  {kpi.unit?.toLowerCase() === 'puan' ? 'Ortalama' : 'Toplam'} ({currentYear - 1})
                </div>
                <div className="text-lg sm:text-xl font-bold text-gray-900">
                  {kpi.unit?.toLowerCase() === 'puan'
                    ? new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 }).format(statistics.averagePrevious)
                    : new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 }).format(statistics.previousYearTotal)
                  } {kpi.unit || ''}
                </div>
              </div>
              <div className={`bg-gradient-to-br rounded-lg p-3 sm:p-4 border ${
                statistics.growth >= 0 
                  ? 'from-green-50 to-green-100 border-green-200' 
                  : 'from-red-50 to-red-100 border-red-200'
              }`}>
                <div className={`text-xs sm:text-sm font-medium mb-1 ${
                  statistics.growth >= 0 ? 'text-green-700' : 'text-red-700'
                }`}>
                  Büyüme Oranı
                </div>
                <div className={`text-lg sm:text-xl font-bold ${
                  statistics.growth >= 0 ? 'text-green-900' : 'text-red-900'
                }`}>
                  {statistics.growth >= 0 ? '+' : ''}{statistics.growth.toFixed(1)}%
                </div>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-3 sm:p-4 border border-purple-200">
                <div className="text-xs sm:text-sm text-purple-700 font-medium mb-1">Ortalama</div>
                <div className="text-lg sm:text-xl font-bold text-purple-900">
                  {new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 }).format(statistics.averageCurrent)} {kpi.unit || ''}
                </div>
              </div>
            </div>
          )}

          {/* Yıllık Karşılaştırma Grafiği */}
          <div className="bg-gray-50 rounded-lg p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Yıllık Performans Karşılaştırması</h3>
            <div className="h-64 sm:h-80">
              {chartData && <Line data={chartData} options={chartOptions} />}
            </div>
          </div>

          {/* Hedef Projeksiyonu Grafiği - TÜM KPI'lar için göster */}
          {showProjection ? (
            <div className="bg-gray-50 rounded-lg p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Hedef Projeksiyonu</h3>
              <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 text-sm">
                <div className="bg-white p-3 rounded border">
                  <div className="text-gray-600 text-xs sm:text-sm">Yıllık Hedef</div>
                  <div className="text-base sm:text-lg font-semibold text-blue-600 truncate">{target} {kpi.unit}</div>
                </div>
                <div className="bg-white p-3 rounded border">
                  <div className="text-gray-600 text-xs sm:text-sm">Gerçekleşen ({currentMonth} ay)</div>
                  <div className="text-base sm:text-lg font-semibold text-green-600 truncate">
                    {(() => {
                      const currentYearValues = MONTHS.map((_, index) => {
                        const monthValue = currentYearData[index + 1];
                        return monthValue ? (parseNumberInput(monthValue) ?? 0) : 0;
                      });
                      const validValues = currentYearValues.slice(0, currentMonth).filter(val => val > 0);
                      
                      // Adet verisi için her zaman toplam göster
                      if (kpi.unit === 'Adet') {
                        return currentYearValues.slice(0, currentMonth).reduce((sum, val) => sum + val, 0).toFixed(0);
                      }
                      
                      if (kpi.ytd_calc === 'ortalama') {
                        const average = validValues.length > 0 ? validValues.reduce((sum, val) => sum + val, 0) / validValues.length : 0;
                        return average.toFixed(1); // Gerçek ortalama değer
                      } else {
                        return currentYearValues.slice(0, currentMonth).reduce((sum, val) => sum + val, 0).toFixed(1);
                      }
                    })()} {kpi.unit}
                  </div>
                </div>
                <div className="bg-white p-3 rounded border">
                  <div className="text-gray-600 text-xs sm:text-sm">
                    {(() => {
                      const currentYearValues = MONTHS.map((_, index) => {
                        const monthValue = currentYearData[index + 1];
                        return monthValue ? (parseNumberInput(monthValue) ?? 0) : 0;
                      });
                      const validValues = currentYearValues.slice(0, currentMonth).filter(val => val > 0);
                      const remainingMonths = 12 - currentMonth;
                      
                      // Adet verisi için özel etiket
                      if (kpi.unit === 'Adet') {
                        return "Kalan Adet";
                      }
                      
                      if (kpi.ytd_calc === 'ortalama' && remainingMonths > 0) {
                        const targetValue = parseNumberInput(target) ?? 0;
                        const currentSum = validValues.reduce((sum, val) => sum + val, 0);
                        const requiredTotalSum = targetValue * 12;
                        const remainingSum = requiredTotalSum - currentSum;
                        const monthlyNeeded = remainingSum / remainingMonths;
                        const maxPossibleValue = validValues.length > 0 ? Math.max(...validValues) : 0;
                        
                        if (monthlyNeeded > maxPossibleValue && maxPossibleValue > 0) {
                          return "Maksimum Ulaşılabilir Hedef";
                        }
                      }
                      return "Kalan Hedef";
                    })()}
                  </div>
                  <div className="text-base sm:text-lg font-semibold text-orange-600 truncate">
                    {(() => {
                      const currentYearValues = MONTHS.map((_, index) => {
                        const monthValue = currentYearData[index + 1];
                        return monthValue ? (parseNumberInput(monthValue) ?? 0) : 0;
                      });
                      const validValues = currentYearValues.slice(0, currentMonth).filter(val => val > 0);
                      const remainingMonths = 12 - currentMonth;
                      
                      // Adet verisi için özel hesaplama
                      if (kpi.unit === 'Adet') {
                        const currentTotal = currentYearValues.slice(0, currentMonth).reduce((sum, val) => sum + val, 0);
                        const targetValue = parseNumberInput(target) ?? 0;
                        const remainingCount = Math.max(0, targetValue - currentTotal);
                        
                        return remainingCount.toFixed(0);
                      }
                      
                      let currentRealized = 0;
                      let maxProjection = 0;
                      
                      if (kpi.ytd_calc === 'ortalama') {
                        const currentSum = validValues.reduce((sum, val) => sum + val, 0);
                        const average = validValues.length > 0 ? currentSum / validValues.length : 0;
                        currentRealized = average * 12;
                        
                        // Maksimum projeksiyon hesapla
                        if (remainingMonths > 0) {
                          const targetValue = parseNumberInput(target) ?? 0;
                          const requiredTotalSum = targetValue * 12;
                          const remainingSum = requiredTotalSum - currentSum;
                          const monthlyNeeded = remainingSum / remainingMonths;
                          const maxPossibleValue = validValues.length > 0 ? Math.max(...validValues) : 0;
                          
                          if (monthlyNeeded > maxPossibleValue && maxPossibleValue > 0) {
                            // Maksimum değerlerle ulaşılabilir projeksiyon
                            const maxRemainingSum = maxPossibleValue * remainingMonths;
                            maxProjection = (currentSum + maxRemainingSum) / 12;
                            return maxProjection.toFixed(1);
                          }
                        }
                      } else {
                        currentRealized = currentYearValues.slice(0, currentMonth).reduce((sum, val) => sum + val, 0);
                      }
                      
                      return Math.max(0, (parseNumberInput(target) ?? 0) - currentRealized).toFixed(1);
                    })()} {kpi.unit}
                  </div>
                </div>
              </div>
              <div className="h-64 sm:h-80">
                {projectionData && <Bar data={projectionData} options={projectionOptions} />}
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Hedef Projeksiyonu</h3>
              <div className="p-4 border rounded bg-white text-sm text-gray-700">
                Bu KPI için hedef değeri tanımlanmamış. Projeksiyon grafiği görmek için KPI'ya hedef değeri ekleyin.
              </div>
            </div>
          )}

          {/* Ek İstatistikler */}
          {statistics && (
            <div className="bg-gray-50 rounded-lg p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Detaylı İstatistikler</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-lg border">
                  <div className="text-sm text-gray-600 mb-2">En İyi Performans</div>
                  <div className="text-lg font-semibold text-green-700">
                    {statistics.bestMonth.month}: {new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 }).format(statistics.bestMonth.value)} {kpi.unit || ''}
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg border">
                  <div className="text-sm text-gray-600 mb-2">En Düşük Performans</div>
                  <div className="text-lg font-semibold text-red-700">
                    {statistics.worstMonth.month}: {new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 }).format(statistics.worstMonth.value)} {kpi.unit || ''}
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg border">
                  <div className="text-sm text-gray-600 mb-2">Ortalama ({currentYear})</div>
                  <div className="text-lg font-semibold text-blue-700">
                    {new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 }).format(statistics.averageCurrent)} {kpi.unit || ''}
                  </div>
                </div>
                <div className="bg-white p-4 rounded-lg border">
                  <div className="text-sm text-gray-600 mb-2">Ortalama ({currentYear - 1})</div>
                  <div className="text-lg font-semibold text-gray-700">
                    {new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 }).format(statistics.averagePrevious)} {kpi.unit || ''}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-4 sm:p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 sm:px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm sm:text-base"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}