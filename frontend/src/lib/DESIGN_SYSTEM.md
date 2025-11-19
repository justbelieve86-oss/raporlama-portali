# 🎨 Design System Kullanım Kılavuzu

Bu doküman, projede kullanılan Design System token'larının nasıl kullanılacağını açıklar.

## 📦 Design Tokens

Design tokens `frontend/src/lib/designTokens.ts` dosyasında tanımlanmıştır ve Tailwind CSS config'ine entegre edilmiştir.

### Renkler

#### Primary (Mavi)
```tsx
// Tailwind class'ları
<div className="bg-primary-500 text-white">Primary Button</div>
<div className="text-primary-600">Primary Text</div>
<div className="border-primary-300">Primary Border</div>

// CSS Variables
<div style={{ backgroundColor: 'var(--color-primary-500)' }}>Primary</div>

// TypeScript import
import { colors } from '@/lib/designTokens';
const primaryColor = colors.primary[500]; // '#3b82f6'
```

#### Semantic Colors
```tsx
// Success
<div className="bg-success-500 text-white">Success</div>
<div className="bg-success-100 text-success-700">Success Light</div>

// Warning
<div className="bg-warning-500 text-white">Warning</div>
<div className="bg-warning-100 text-warning-700">Warning Light</div>

// Error
<div className="bg-error-500 text-white">Error</div>
<div className="bg-error-100 text-error-700">Error Light</div>

// Info
<div className="bg-info-500 text-white">Info</div>
<div className="bg-info-100 text-info-700">Info Light</div>
```

### Typography

#### Heading Styles
```tsx
<h1 className="text-h1">Başlık 1</h1>
<h2 className="text-h2">Başlık 2</h2>
<h3 className="text-h3">Başlık 3</h3>
<h4 className="text-h4">Başlık 4</h4>
<h5 className="text-h5">Başlık 5</h5>
<h6 className="text-h6">Başlık 6</h6>
```

#### Body Text
```tsx
<p className="text-body">Normal metin</p>
<p className="text-body-sm">Küçük metin</p>
<p className="text-small">Çok küçük metin</p>
<p className="text-caption">Caption metin</p>
```

#### Display Text (Büyük başlıklar)
```tsx
<h1 className="text-display-2xl">Display 2XL</h1>
<h1 className="text-display-xl">Display XL</h1>
<h1 className="text-display-lg">Display Large</h1>
<h1 className="text-display-md">Display Medium</h1>
<h1 className="text-display-sm">Display Small</h1>
```

### Spacing

```tsx
// Padding
<div className="p-xs">Extra Small Padding (4px)</div>
<div className="p-sm">Small Padding (8px)</div>
<div className="p-md">Medium Padding (16px)</div>
<div className="p-lg">Large Padding (24px)</div>
<div className="p-xl">Extra Large Padding (32px)</div>
<div className="p-2xl">2XL Padding (48px)</div>

// Margin
<div className="m-xs">Extra Small Margin</div>
<div className="m-sm">Small Margin</div>
<div className="m-md">Medium Margin</div>
<div className="m-lg">Large Margin</div>
<div className="m-xl">Extra Large Margin</div>
<div className="m-2xl">2XL Margin</div>

// Gap (Grid/Flex)
<div className="grid gap-md">Grid with Medium Gap</div>
<div className="flex gap-lg">Flex with Large Gap</div>
```

### Shadows

```tsx
<div className="shadow-sm">Small Shadow</div>
<div className="shadow-md">Medium Shadow</div>
<div className="shadow-lg">Large Shadow</div>
<div className="shadow-xl">Extra Large Shadow</div>
<div className="shadow-2xl">2XL Shadow</div>
<div className="shadow-inner">Inner Shadow</div>
```

### Border Radius

```tsx
<div className="rounded-xs">Extra Small (2px)</div>
<div className="rounded-sm">Small (4px)</div>
<div className="rounded-md">Medium (6px)</div>
<div className="rounded-lg">Large (8px)</div>
<div className="rounded-xl">Extra Large (12px)</div>
<div className="rounded-2xl">2XL (16px)</div>
<div className="rounded-3xl">3XL (24px)</div>
<div className="rounded-full">Full Circle</div>
```

### Transitions

```tsx
// Transition duration
<div className="transition-all duration-fast">Fast Transition (150ms)</div>
<div className="transition-all duration-normal">Normal Transition (200ms)</div>
<div className="transition-all duration-slow">Slow Transition (300ms)</div>
<div className="transition-all duration-slower">Slower Transition (500ms)</div>

// Örnek kullanım
<button className="transition-all duration-normal hover:scale-105">
  Hover Button
</button>
```

### Z-Index

```tsx
<div className="z-dropdown">Dropdown (1000)</div>
<div className="z-sticky">Sticky (1020)</div>
<div className="z-fixed">Fixed (1030)</div>
<div className="z-modal-backdrop">Modal Backdrop (1040)</div>
<div className="z-modal">Modal (1050)</div>
<div className="z-popover">Popover (1060)</div>
<div className="z-tooltip">Tooltip (1070)</div>
```

## 🎯 Kullanım Örnekleri

### Modern Card Component
```tsx
<div className="bg-white rounded-xl shadow-lg p-lg border border-gray-200">
  <h3 className="text-h3 text-gray-900 mb-md">Card Title</h3>
  <p className="text-body text-gray-600">Card content goes here</p>
</div>
```

### Modern Button
```tsx
<button className="bg-primary-500 hover:bg-primary-600 text-white font-semibold px-lg py-md rounded-lg shadow-md transition-all duration-normal hover:shadow-lg hover:-translate-y-0.5">
  Click Me
</button>
```

### Stat Card with Gradient
```tsx
<div className="bg-gradient-to-br from-primary-500 to-primary-600 text-white rounded-xl shadow-xl p-lg">
  <p className="text-body-sm text-primary-100 mb-xs">Toplam Marka</p>
  <p className="text-h1 font-bold">24</p>
  <p className="text-body-sm text-primary-100 mt-sm">+12% artış</p>
</div>
```

### Form Input
```tsx
<div className="space-y-sm">
  <label className="text-body-sm font-semibold text-gray-700">
    Kullanıcı Adı
  </label>
  <input
    type="text"
    className="w-full px-md py-md border-2 border-gray-300 rounded-xl focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-all duration-normal"
    placeholder="Kullanıcı adınızı girin"
  />
</div>
```

### Alert/Notification
```tsx
{/* Success */}
<div className="bg-success-100 border border-success-300 text-success-700 rounded-lg p-md">
  İşlem başarıyla tamamlandı!
</div>

{/* Warning */}
<div className="bg-warning-100 border border-warning-300 text-warning-700 rounded-lg p-md">
  Dikkat: Bu işlem geri alınamaz!
</div>

{/* Error */}
<div className="bg-error-100 border border-error-300 text-error-700 rounded-lg p-md">
  Bir hata oluştu. Lütfen tekrar deneyin.
</div>

{/* Info */}
<div className="bg-info-100 border border-info-300 text-info-700 rounded-lg p-md">
  Bilgi: Yeni özellikler eklendi.
</div>
```

## 📚 Best Practices

### 1. Renk Kullanımı
- ✅ Primary renkleri: Butonlar, linkler, vurgular için
- ✅ Semantic renkler: Success, warning, error, info durumları için
- ✅ Gray renkleri: Metin, arka plan, border'lar için
- ❌ Hardcoded hex renkler kullanmayın

### 2. Spacing
- ✅ Design system spacing değerlerini kullanın (xs, sm, md, lg, xl, 2xl)
- ✅ Tutarlı spacing için aynı değerleri tekrar kullanın
- ❌ Rastgele px değerleri kullanmayın

### 3. Typography
- ✅ Heading'ler için text-h1, text-h2, vb. kullanın
- ✅ Body text için text-body, text-body-sm kullanın
- ✅ Font weight'leri tutarlı kullanın (font-semibold, font-bold)
- ❌ Inline style'da fontSize kullanmayın

### 4. Shadows
- ✅ Kartlar için shadow-md veya shadow-lg
- ✅ Hover efektleri için shadow-xl
- ✅ Subtle efektler için shadow-sm
- ❌ Çok fazla shadow kullanmayın (görsel karmaşa)

### 5. Border Radius
- ✅ Kartlar için rounded-xl veya rounded-2xl
- ✅ Butonlar için rounded-lg
- ✅ Input'lar için rounded-xl
- ✅ Küçük elementler için rounded-md

## 🔄 Migration Guide

Mevcut component'leri design system'e geçirirken:

1. **Renkler**: `bg-blue-500` → `bg-primary-500`
2. **Spacing**: `p-4` → `p-md`, `p-6` → `p-lg`
3. **Typography**: `text-2xl font-bold` → `text-h1`
4. **Shadows**: Mevcut shadow class'ları zaten uyumlu
5. **Border Radius**: `rounded-lg` → `rounded-xl` (daha modern görünüm için)

## 📖 Referanslar

- Design Tokens: `frontend/src/lib/designTokens.ts`
- Tailwind Config: `frontend/tailwind.config.cjs`
- CSS Variables: `frontend/src/styles/globals.css`

