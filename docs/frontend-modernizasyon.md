# Frontend Modernizasyon Planı

Bu belge; admin panelindeki kullanıcı listesi ve genel frontend için tasarım modernizasyonu, renk paleti/erişilebilirlik, performans ve kod kalitesi iyileştirmelerini kapsamlı ve uygulanabilir bir plana döker. Uygulamalar, mevcut kod tabanındaki `frontend/src` bileşenleri ve Astro sayfalarıyla uyumludur.

## Amaç ve Kapsam
- UI/UX modernizasyonu: responsive, kullanıcı dostu, tutarlı bileşen seti.
- Renk paleti ve erişilebilirlik: WCAG uyumluluğu, kontrast iyileştirmeleri, dark mode temeli.
- Performans: görsel optimizasyon, bundle küçültme, lazy loading, sanallaştırma.
- Kod kalitesi: bileşen tabanlı refactoring, kullanılmayan kod temizliği, linting.

## Tasarım Modernizasyonu
- Kart ve layout standardı
  - `admin-card` ve `admin-card-lg` sınıfları bir `Card` bileşenine taşınacak (`frontend/src/components/ui/Card.tsx`).
  - Slotlar: `CardHeader`, `CardContent`, `CardFooter`. Shadow, spacing ve border tutarlılığı.
- Sayfa başlıkları
  - `PageHeader.tsx` grid tabanlı yapı; başlık + aksiyon/filtre alanları. Mobilde profil dropdown ikonlaşır (`sm:hidden`).
- Tablo modernizasyonu
  - Sticky header, zebra satır, hover vurgusu mevcut; ek olarak klavye navigasyonu (`tabindex`), `aria-selected`, odak halkası.
  - İşlem butonları için tooltip ve geniş dokunma alanı (`h-9 w-9`), mikro animasyonlar (`transition-colors`, `duration-150`).
- Modal erişilebilirlik
  - `ui/modal.tsx` için `role="dialog" aria-modal="true" aria-labelledby` eklenir; focus trap ve odak geri dönüşü.
  - Giriş/çıkış animasyonu, `prefers-reduced-motion` uyumluluğu.
- Form ve input standardı
  - `@tailwindcss/forms` aktif edilir. `Input` focus halkası `ring-2 ring-primary`.
  - `FormField` yardımcı bileşeni: `label`, `helper`, `error`.

## Renk Paleti ve Erişilebilirlik
- Tailwind tema semantik renkleri (örnek):
  - `success`: `hsl(142.1 76.2% 36.3%)`, `foreground: hsl(0 0% 98%)`
  - `warning`: `hsl(38 92% 50%)`, `foreground: hsl(222.2 47.4% 11.2%)`
  - `destructive`: `hsl(0 72% 45%)`, `foreground: hsl(0 0% 98%)`
  - `muted`: `hsl(210 16% 94%)`, `surface`: `hsl(0 0% 100%)`
- `darkMode: 'class'` eklenir; `primary` ve `foreground` için koyu mod varyantları belirlenir.
- Kontrast iyileştirmeleri
  - `primary` maviyi 4.5:1 hedefi için koyulaştır (ör. `hsl(221.2 70% 40–45%)`).
  - `secondary` zemin üzerinde metinleri `text-gray-800` ile güçlendir; `outline` badge sınırı `border-gray-300`.
- Semantik kullanım rehberi
  - Badge: rol ve durumlar için `success/warning/destructive/secondary` varyantları.
  - Durum çipleri: ikon + metin, yeterli kontrast.

## Performans İyileştirmeleri
- Görsel asset optimizasyonu
  - Avatar/ikonlarda `loading="lazy"`, `decoding="async"`, uygun `srcset/sizes`.
  - Astro tarafında `@astrojs/image` veya `astro:assets` ile responsive pipeline.
- JS/CSS bundle küçültme
  - Büyük modallar ve raporlar için `React.lazy` + `Suspense`.
  - İkon kütüphanesi treeshake (yalnızca gereken ikonlar). Alternatif: `lucide-react`.
  - Route-level code splitting; vendor chunk ayrımı.
- Liste sanallaştırma
  - Büyük veri setlerinde `react-window` veya `@tanstack/react-virtual`.
- İstek optimizasyonu
  - Aramada `debounce` (250ms), filtreleme için `useMemo`.
  - SWR/TanStack Query ile cache ve revalidation.

## Kod Kalitesi ve Refactoring
- Kullanılmayan kod temizliği
  - `tsconfig`: `noUnusedLocals`, `noUnusedParameters`.
  - ESLint: `eslint-plugin-unused-imports`, `eslint-plugin-jsx-a11y`; pre-commit hook.
- UI katmanı standardı
  - Ortak bileşenler: `Card`, `Table`, `EmptyState`, `Badge`, `Button`, `Modal`, `Input`.
  - Tablo eylemleri: `RowActions` bileşeni; erişilebilirlik ve tooltip tek noktadan.
- Erişilebilirlik testleri
  - `jest-axe`/`vitest-axe` ile modallar, butonlar, formlar için temel testler.

## Örnek Uygulama Parçaları
- Tailwind tema genişletme ve dark mode (öneri):

```js
// frontend/tailwind.config.cjs
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        success: { DEFAULT: 'hsl(142.1 76.2% 36.3%)', foreground: 'hsl(0 0% 98%)' },
        warning: { DEFAULT: 'hsl(38 92% 50%)', foreground: 'hsl(222.2 47.4% 11.2%)' },
        destructive: { DEFAULT: 'hsl(0 72% 45%)', foreground: 'hsl(0 0% 98%)' },
        muted: 'hsl(210 16% 94%)',
        surface: 'hsl(0 0% 100%)',
      },
    },
  },
  plugins: [require('@tailwindcss/forms'), require('@tailwindcss/typography')],
};
```

- Modal erişilebilirlik eklemeleri (öneri):

```tsx
// frontend/src/components/ui/modal.tsx (özet)
<div role="dialog" aria-modal="true" aria-labelledby="modal-title" className="fixed inset-0 ...">
  <div className="...">
    <h3 id="modal-title" className="text-lg font-semibold">{title}</h3>
    {/* Focus trap ve kapatmada odak geri dönüşü */}
  </div>
</div>
```

- Input focus görünürlüğü (öneri):

```tsx
// frontend/src/components/ui/input.tsx (özet)
className={clsx('h-9 w-full rounded-md border ... focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1', className)}
```

## Uygulama Sırası

### Hızlı Kazanımlar (1–2 saat)
1. `@tailwindcss/forms` ekle ve `Input` focus halkasını güçlendir.
2. Modal’a `role/aria` ve temel focus trap ekle.
3. Avatar `<img>`’lere `loading="lazy" decoding="async"` ekle.
4. `primary` tonunu koyulaştır ve badge/label kontrastlarını düzenle.
5. Filtre aramada `debounce` ve `useMemo` uygula.

### Sprint 1
- Tema tokenları ve semantik renkler.
- Card/Table/Modal erişilebilirlik.
- ESLint/Prettier/unused imports, küçük lazy load’lar.

### Sprint 2
- Radix tabanlı dialog/dropdown (opsiyonel).
- Route-level code splitting, image pipeline.
- SWR/TanStack Query entegrasyonu.

### Sprint 3
- Virtualized table.
- Dark mode.
- jest-axe erişilebilirlik testleri.

## Referans Dizinler
- `frontend/src/components/ui/*` — UI bileşenleri
- `frontend/src/components/UserManagement.tsx` — kullanıcı listesi
- `frontend/src/styles/app.css` — ortak yardımcı sınıflar
- `frontend/tailwind.config.cjs` — tema ve eklentiler
- `frontend/src/pages/admin/*.astro` — sayfa kompozisyonları

## Onay Kriterleri (Acceptance Criteria)
- Kullanıcı listesi ve diğer admin listelerinde tutarlı Card/Table UI.
- İnteraktif bileşenlerde erişilebilirlik öznitelikleri ve görünür focus.
- Görsel ve JS bundle boyutlarında ölçülebilir azalma (devtools/ Lighthouse).
- Renk kontrastı 4.5:1 veya üstü; badge ve butonlarda semantik renk kullanımı.
- Lint ve temel erişilebilirlik testleri temiz çalışır.

---
Bu plan referans alınarak her adım uygulandıktan sonra PR açıklamalarında ilgili bölümler işaretlenecektir. Öncelik: Hızlı Kazanımlar → Sprint 1.