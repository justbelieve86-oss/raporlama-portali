# 📝 Typography Kullanım Kılavuzu

Bu doküman, projede kullanılan Typography system'inin nasıl kullanılacağını açıklar.

## 🎯 Typography System

Typography system'i tutarlı, okunabilir ve hiyerarşik bir metin yapısı sağlar.

### Font Hierarchy

| Variant | Font Size | Font Weight | Line Height | Kullanım |
|---------|-----------|-------------|-------------|----------|
| H1 | 2.5rem (40px) | Bold (700) | 1.2 | Ana başlıklar |
| H2 | 2rem (32px) | Semibold (600) | 1.3 | Bölüm başlıkları |
| H3 | 1.5rem (24px) | Semibold (600) | 1.3 | Alt başlıklar |
| H4 | 1.25rem (20px) | Semibold (600) | 1.4 | Küçük başlıklar |
| H5 | 1.125rem (18px) | Semibold (600) | 1.5 | Çok küçük başlıklar |
| H6 | 1rem (16px) | Semibold (600) | 1.5 | En küçük başlıklar |
| Body | 1rem (16px) | Regular (400) | 1.5 | Normal metin |
| Body Small | 0.875rem (14px) | Regular (400) | 1.5 | Küçük metin |
| Small | 0.75rem (12px) | Regular (400) | 1.4 | Çok küçük metin |

### Text Colors

| Color | Hex | Kullanım |
|-------|-----|----------|
| Primary | `#111827` (gray-900) | Ana metin, başlıklar |
| Secondary | `#4b5563` (gray-600) | İkincil metin, açıklamalar |
| Tertiary | `#9ca3af` (gray-400) | Üçüncül metin, placeholder'lar |
| Disabled | `#d1d5db` (gray-300) | Devre dışı metin |

### Font Weights

| Weight | Value | Kullanım |
|--------|-------|----------|
| Light | 300 | Çok ince metin |
| Regular | 400 | Normal metin (body) |
| Medium | 500 | Vurgulu metin |
| Semibold | 600 | Başlıklar (H2-H6) |
| Bold | 700 | Ana başlıklar (H1) |

---

## 📦 Kullanım Yöntemleri

### 1. Typography Component

En esnek ve önerilen yöntem:

```tsx
import { Typography } from '@/components/ui/Typography';

// H1 Başlık
<Typography variant="h1" color="primary" weight="bold">
  Ana Başlık
</Typography>

// Body metin
<Typography variant="body" color="secondary">
  Normal metin içeriği
</Typography>

// Custom element
<Typography variant="h2" as="div" color="primary">
  Div içinde H2 stili
</Typography>
```

### 2. Convenience Components

Hızlı kullanım için özel component'ler:

```tsx
import { H1, H2, H3, Body, BodySmall, Small } from '@/components/ui/Typography';

<H1>Ana Başlık</H1>
<H2>Bölüm Başlığı</H2>
<H3>Alt Başlık</H3>
<Body>Normal metin</Body>
<BodySmall>Küçük metin</BodySmall>
<Small>Çok küçük metin</Small>
```

### 3. Tailwind Utility Classes

CSS utility class'ları ile:

```tsx
// Headings
<h1 className="text-h1 text-primary font-bold">Başlık 1</h1>
<h2 className="text-h2 text-primary font-semibold">Başlık 2</h2>
<h3 className="text-h3 text-primary font-semibold">Başlık 3</h3>

// Body text
<p className="text-body text-primary font-regular">Normal metin</p>
<p className="text-body-sm text-secondary font-regular">Küçük metin</p>
<p className="text-small text-tertiary font-regular">Çok küçük metin</p>

// Text colors
<p className="text-primary">Ana metin</p>
<p className="text-secondary">İkincil metin</p>
<p className="text-tertiary">Üçüncül metin</p>
<p className="text-disabled">Devre dışı metin</p>

// Font weights
<p className="font-light">İnce metin</p>
<p className="font-regular">Normal metin</p>
<p className="font-medium">Orta metin</p>
<p className="font-semibold">Yarı kalın metin</p>
<p className="font-bold">Kalın metin</p>

// Line heights
<p className="leading-heading">Başlık line height</p>
<p className="leading-body">Body line height</p>
<p className="leading-small">Küçük metin line height</p>
```

---

## 🎨 Kullanım Örnekleri

### Sayfa Başlığı

```tsx
import { H1, Body } from '@/components/ui/Typography';

<div className="mb-6">
  <H1 color="primary">Kullanıcı Yönetimi</H1>
  <Body color="secondary" className="mt-2">
    Kullanıcıları görüntüleyin, düzenleyin ve yönetin
  </Body>
</div>
```

### Kart İçeriği

```tsx
import { H3, BodySmall, Small } from '@/components/ui/Typography';

<div className="bg-white rounded-xl p-6 shadow-lg">
  <H3 color="primary" className="mb-2">Toplam Kullanıcı</H3>
  <div className="text-3xl font-bold text-primary mb-2">1,234</div>
  <BodySmall color="secondary">Son 30 günde +12% artış</BodySmall>
  <Small color="tertiary" className="mt-1">Son güncelleme: 2 saat önce</Small>
</div>
```

### Form Label ve Helper Text

```tsx
import { BodySmall, Small } from '@/components/ui/Typography';

<div>
  <BodySmall color="primary" weight="semibold" className="mb-2">
    Email Adresi
  </BodySmall>
  <input type="email" className="w-full px-4 py-2 border rounded-lg" />
  <Small color="tertiary" className="mt-1">
    Email adresinizi girin
  </Small>
</div>
```

### Tablo Başlıkları ve Hücreleri

```tsx
import { BodySmall, Small } from '@/components/ui/Typography';

<table>
  <thead>
    <tr>
      <th>
        <BodySmall color="primary" weight="semibold">Kullanıcı Adı</BodySmall>
      </th>
      <th>
        <BodySmall color="primary" weight="semibold">Email</BodySmall>
      </th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>
        <Body color="primary">ahmet.yilmaz</Body>
      </td>
      <td>
        <Body color="secondary">ahmet@example.com</Body>
      </td>
    </tr>
  </tbody>
</table>
```

### Alert/Notification Mesajları

```tsx
import { Body, BodySmall } from '@/components/ui/Typography';

<div className="bg-success-50 border border-success-200 rounded-lg p-4">
  <Body color="primary" weight="semibold" className="mb-1">
    İşlem Başarılı
  </Body>
  <BodySmall color="secondary">
    Kullanıcı başarıyla oluşturuldu
  </BodySmall>
</div>
```

---

## ✅ Best Practices

### 1. Hiyerarşi
- ✅ H1'i sadece sayfa başlıkları için kullanın
- ✅ H2-H6'ı içerik hiyerarşisini korumak için sırayla kullanın
- ✅ Body text için `body` veya `body-sm` kullanın
- ❌ H1'den sonra H3 kullanmayın (H2 kullanın)

### 2. Renkler
- ✅ Primary: Ana içerik, başlıklar
- ✅ Secondary: Açıklamalar, yardımcı metin
- ✅ Tertiary: Placeholder'lar, çok hafif metin
- ✅ Disabled: Devre dışı durumlar
- ❌ Çok fazla renk kullanmayın (okunabilirlik azalır)

### 3. Font Weights
- ✅ Başlıklar için semibold (600) veya bold (700)
- ✅ Body text için regular (400)
- ✅ Vurgu için medium (500)
- ❌ Çok fazla farklı weight kullanmayın

### 4. Line Heights
- ✅ Başlıklar için 1.2-1.3
- ✅ Body text için 1.5-1.6
- ✅ Küçük metin için 1.4
- ❌ Çok dar veya geniş line height kullanmayın

### 5. Responsive Typography
```tsx
// Mobile'da küçük, desktop'ta büyük
<h1 className="text-2xl sm:text-h1">Başlık</h1>

// Typography component ile
<Typography 
  variant="h1" 
  className="text-2xl sm:text-h1"
>
  Başlık
</Typography>
```

---

## 🔄 Migration Guide

Mevcut component'leri typography system'e geçirirken:

1. **Başlıklar**: `text-2xl font-bold` → `text-h1` veya `<H1>`
2. **Body Text**: `text-base` → `text-body` veya `<Body>`
3. **Renkler**: `text-gray-900` → `text-primary`
4. **Font Weights**: `font-bold` → `font-bold` (aynı, ama standardize)
5. **Line Heights**: `leading-tight` → `leading-heading`

### Örnek Migration

**Önce:**
```tsx
<h2 className="text-2xl font-semibold text-gray-900 leading-tight">
  Başlık
</h2>
<p className="text-base text-gray-600 leading-normal">
  Metin
</p>
```

**Sonra:**
```tsx
<H2 color="primary">Başlık</H2>
<Body color="secondary">Metin</Body>
```

veya

```tsx
<h2 className="text-h2 text-primary font-semibold leading-heading-relaxed">
  Başlık
</h2>
<p className="text-body text-secondary font-regular leading-body">
  Metin
</p>
```

---

## 📚 Referanslar

- Design System: `frontend/src/lib/DESIGN_SYSTEM.md`
- Design Tokens: `frontend/src/lib/designTokens.ts`
- Typography Component: `frontend/src/components/ui/Typography.tsx`
- CSS Variables: `frontend/src/styles/globals.css`
- Tailwind Config: `frontend/tailwind.config.cjs`

