import React, { useMemo } from 'react'

type BreadcrumbItem = {
  label: string
  href: string
}

interface BreadcrumbsProps {
  title?: string
  path: string
  theme?: 'light' | 'dark'
}

const LABEL_MAP: Record<string, string> = {
  'admin': 'Admin',
  'user': 'Kullanıcı',
  'sales': 'Satış',
  'dashboard': 'Dashboard',
  'data-entry': 'Veri Girişi',
  'reports': 'Raporlar',
  'kpi': 'KPI',
  'roles': 'Roller',
  'brands': 'Markalar',
}

export default function Breadcrumbs({ title, path, theme = 'light' }: BreadcrumbsProps) {

  const items = useMemo<BreadcrumbItem[]>(() => {
    const sourcePath = typeof path === 'string' && path.length > 0 ? path : '/'
    const segments = sourcePath
      .split('/')
      .filter(Boolean)

    const crumbs: BreadcrumbItem[] = []
    let acc = ''

    segments.forEach((seg) => {
      acc += `/${seg}`
      const label = LABEL_MAP[seg] ?? capitalize(seg)
      crumbs.push({ label, href: acc })
    })

    if (crumbs.length > 0 && title) {
      // Son öğe sayfa başlığı ile özelleştirilebilir
      crumbs[crumbs.length - 1].label = title
    }

    // Kök için başlangıç öğesini ekle
    return [{ label: 'Anasayfa', href: '/' }, ...crumbs]
  }, [path, title])

  const isDark = theme === 'dark'
  
  return (
    <nav aria-label="Breadcrumb" className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg overflow-hidden ${
      isDark 
        ? 'bg-slate-700 text-slate-200' 
        : 'bg-white text-black shadow-md'
    }`}>
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1
        return (
          <div key={item.href} className="flex items-center gap-2 flex-shrink-0">
            {idx > 0 && (
              <span className={`select-none ${isDark ? 'text-slate-400' : 'text-black'}`}>/</span>
            )}
            {isLast ? (
              <span className={`truncate font-medium ${isDark ? 'text-white' : 'text-black'}`} aria-current="page">{item.label}</span>
            ) : (
              <a href={item.href} className={`transition-colors truncate hover:underline ${
                isDark 
                  ? 'text-blue-400 hover:text-blue-300' 
                  : 'text-blue-700 hover:text-blue-900 underline'
              }`}>
                {item.label}
              </a>
            )}
          </div>
        )
      })}
    </nav>
  )
}

function capitalize(s: string) {
  if (!s) return s
  return s.charAt(0).toUpperCase() + s.slice(1)
}