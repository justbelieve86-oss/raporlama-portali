/**
 * Daily KPI Header Component
 * Tarih ve kategori seçici
 */

import React, { useEffect } from 'react';

interface DailyKpiHeaderProps {
  selectedCategory: string;
  onChangeCategory: (v: string) => void;
  useManualOrdering: boolean;
  onToggleManualOrdering: (v: boolean) => void;
  referenceBrandName?: string;
  isSavingOrder?: boolean;
  canEditOrdering: boolean;
  year: number;
  month: number;
  day: number;
  onChangeDate: (y: number, m: number, d: number) => void;
}

export const DailyKpiHeader = React.memo(function DailyKpiHeader({
  selectedCategory,
  onChangeCategory,
  year,
  month,
  day,
  onChangeDate,
}: DailyKpiHeaderProps) {
  // Bugün ve Dün butonlarını DOM'dan kaldır (production cache sorunu için)
  useEffect(() => {
    const removeButtons = () => {
      const buttons = document.querySelectorAll('button');
      buttons.forEach((btn) => {
        const text = btn.textContent?.trim() || '';
        const title = btn.getAttribute('title') || '';
        if (text === 'Bugün' || text === 'Dün' || title === 'Bugün' || title === 'Dün') {
          btn.remove();
        }
      });
    };
    
    removeButtons();
    const interval = setInterval(removeButtons, 100);
    
    return () => clearInterval(interval);
  }, []);

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);
  const months = [
    { value: 1, label: 'Ocak' },
    { value: 2, label: 'Şubat' },
    { value: 3, label: 'Mart' },
    { value: 4, label: 'Nisan' },
    { value: 5, label: 'Mayıs' },
    { value: 6, label: 'Haziran' },
    { value: 7, label: 'Temmuz' },
    { value: 8, label: 'Ağustos' },
    { value: 9, label: 'Eylül' },
    { value: 10, label: 'Ekim' },
    { value: 11, label: 'Kasım' },
    { value: 12, label: 'Aralık' },
  ];
  
  const daysInMonth = new Date(year, month, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newYear = parseInt(e.target.value, 10);
    const newDaysInMonth = new Date(newYear, month, 0).getDate();
    const newDay = Math.min(day, newDaysInMonth);
    onChangeDate(newYear, month, newDay);
  };

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMonth = parseInt(e.target.value, 10);
    const newDaysInMonth = new Date(year, newMonth, 0).getDate();
    const newDay = Math.min(day, newDaysInMonth);
    onChangeDate(year, newMonth, newDay);
  };

  const handleDayChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newDay = parseInt(e.target.value, 10);
    onChangeDate(year, month, newDay);
  };


  return (
    <div className="flex items-center justify-between flex-wrap gap-4 bg-white rounded-lg border border-gray-200 p-4 shadow-sm mb-4 transition-colors duration-300">
      {/* Sol taraf: Tarih seçici */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <label htmlFor="date-year" className="text-sm text-gray-700 whitespace-nowrap">
            <span className="sr-only">Tarih seçimi: </span>
            📅 <span className="sr-only">Yıl, Ay, Gün</span>Tarih:
          </label>
          <select 
            id="date-year" 
            value={year} 
            onChange={handleYearChange}
            aria-label="Yıl seç"
            className="border border-gray-300 rounded-md pl-2 pr-10 py-1.5 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-colors duration-300"
            style={{ paddingRight: '2.5rem' }}
          >
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <select 
            id="date-month" 
            value={month} 
            onChange={handleMonthChange}
            aria-label="Ay seç"
            className="border border-gray-300 rounded-md pl-2 pr-10 py-1.5 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-colors duration-300"
            style={{ paddingRight: '2.5rem' }}
          >
            {months.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <select 
            id="date-day" 
            value={day} 
            onChange={handleDayChange}
            aria-label="Gün seç"
            className="border border-gray-300 rounded-md pl-2 pr-10 py-1.5 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 transition-colors duration-300"
            style={{ paddingRight: '2.5rem' }}
          >
            {days.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Sağ taraf: Kategori */}
      <div className="flex items-center gap-3 flex-wrap bg-white border border-gray-300 rounded-lg px-4 py-2.5 shadow-sm">
        <label htmlFor="category" className="text-sm font-medium text-gray-700 flex items-center gap-2">
          <span className="text-base">📊</span>
          <span>Kategori</span>
        </label>
        <select 
          id="category" 
          className="border border-gray-300 rounded-md pl-3 pr-10 py-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" 
          style={{ paddingRight: '2.5rem' }}
          value={selectedCategory} 
          onChange={(e) => onChangeCategory(e.target.value)}
        >
          <option value="Satış">Satış</option>
          <option value="Servis">Servis</option>
          <option value="Kiralama">Kiralama</option>
          <option value="İkinci El">İkinci El</option>
          <option value="Ekspertiz">Ekspertiz</option>
        </select>
      </div>
    </div>
  );
}, (prev, next) => {
  return (
    prev.selectedCategory === next.selectedCategory &&
    prev.year === next.year &&
    prev.month === next.month &&
    prev.day === next.day
  );
});

