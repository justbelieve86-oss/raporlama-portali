// Shared sidebar menu items definition
// Used by both Sidebar component and accessControl for access matrix
import type React from 'react';

export type MenuItem = { 
  label: string; 
  href?: string; 
  icon?: React.ComponentType<{ className?: string; size?: number }>;
  badge?: string;
  children?: MenuItem[];
};

export const userItems: MenuItem[] = [
  { label: 'Ana Sayfa', href: '/user' },
  {
    label: 'Genel Bakış', children: [
      { label: 'Günlük KPI Dashboard', href: '/user/overview/daily-kpi-dashboard' },
      { label: 'Aylık KPI Dashboard', href: '/user/overview/monthly-kpi-dashboard' },
    ]
  },
  {
    label: 'Satış Yönetimi', children: [
      { label: 'Satış Dashboard', href: '/user/sales/dashboard' },
      { label: 'Veri Girişi - Aylık KPI', href: '/user/sales/data-entry' },
      { label: 'Veri Girişi-Günlük', href: '/user/sales/daily-entry' },
      { label: 'Veri Girişi - Model Bazlı Satış', href: '/user/sales/model-based-entry' },
    ]
  },
  {
    label: 'Servis Yönetimi', children: [
      { label: 'Servis Dashboard', href: '/user/service/dashboard' },
      { label: 'Servis Veri Girişi', href: '/user/service/data-entry' },
      { label: 'Veri Girişi - Günlük', href: '/user/service/daily-data-entry' },
    ]
  },
  {
    label: '2. El Operasyonu', children: [
      { label: '2. El Dashboard', href: '/user/second-hand/dashboard' },
      { label: '2. El Veri Girişi - Aylık', href: '/user/second-hand/data-entry' },
      { label: '2. El Veri Girişi - Günlük', href: '/user/second-hand/daily-data-entry' },
    ]
  },
  {
    label: 'Kiralama Operasyonu', children: [
      { label: 'Kiralama Dashboard', href: '/user/rental/dashboard' },
      { label: 'Kiralama Veri Girişi', href: '/user/rental/data-entry' },
      { label: 'Kiralama Veri Girişi - Günlük', href: '/user/rental/daily-data-entry' },
    ]
  },
  {
    label: 'Ekspertiz Operasyonu', children: [
      { label: 'Ekspertiz Dashboard', href: '/user/expertise/dashboard' },
      { label: 'Ekspertiz Veri Girişi', href: '/user/expertise/data-entry' },
      { label: 'Ekspertiz Veri Girişi - Günlük', href: '/user/expertise/daily-data-entry' },
    ]
  },
  {
    label: 'Yetkilendirme Ayarları', children: [
      { label: 'Marka Yönetimi', href: '/user/auth-settings/brands' },
      { label: 'Rol Yönetimi', href: '/user/auth-settings/roles' },
      { label: 'KPI Yönetimi', href: '/user/auth-settings/kpi' },
    ]
  },
  { label: 'Raporlar', href: '/user/reports' },
];

export const adminItems: MenuItem[] = [
  { label: 'Dashboard', href: '/admin' },
  { label: 'Kullanıcı Yönetimi', href: '/admin/users' },
  { label: 'Marka Yönetimi', href: '/admin/brands' },
  { label: 'Rol Yönetimi', href: '/admin/roles' },
  { label: 'KPI Yönetimi', href: '/admin/kpi' },
  { label: 'Raporlar', href: '/admin/reports' },
];

export const managerItems: MenuItem[] = [
  { label: 'Dashboard', href: '/manager' },
  { label: 'Satış Raporları', href: '/user/sales/dashboard' },
  { label: 'Servis Raporları', href: '/user/service/dashboard' },
  { label: 'Kullanıcı Raporları', href: '/user/reports' },
];

