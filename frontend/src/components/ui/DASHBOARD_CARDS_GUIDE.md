# 📊 Dashboard Card Component'leri Kullanım Kılavuzu

Bu doküman, modern dashboard card component'lerinin nasıl kullanılacağını açıklar.

## 🎯 Dashboard Card Component'leri

### 1. StatCard

Modern stat card component'i - Gradient backgrounds, trend indicators, interactive effects.

#### Kullanım

```tsx
import { StatCard } from '@/components/ui/StatCard';
import { ShieldIcon } from '@/components/ui/icons';

<StatCard
  title="Toplam Marka"
  value={24}
  change="+12%"
  period="son 30 gün"
  icon={ShieldIcon}
  color="blue"
  trend="up"
  gradient
  onClick={() => navigate('/brands')}
/>
```

#### Props

- `title: string` - Card title (zorunlu)
- `value: string | number` - Main value (zorunlu)
- `change?: string` - Change indicator (örn: "+12%", "-5%")
- `period?: string` - Period text (örn: "son 30 gün")
- `icon: React.ComponentType` - Icon component (zorunlu)
- `color?: 'blue' | 'green' | 'amber' | 'red' | 'violet' | 'indigo' | 'purple'` - Color theme (default: 'blue')
- `trend?: 'up' | 'down' | 'neutral'` - Trend direction (auto-detected from change if not provided)
- `onClick?: () => void` - Click handler (makes card clickable)
- `loading?: boolean` - Loading state (shows shimmer effect)
- `gradient?: boolean` - Use gradient background (default: true)
- `className?: string` - Additional CSS classes

#### Özellikler

- ✅ Gradient backgrounds (8 color themes)
- ✅ Trend indicators (up/down arrows with colors)
- ✅ Interactive hover effects (shadow, translate, scale)
- ✅ Loading shimmer effect
- ✅ Icon animations (pulse, scale on hover)
- ✅ Click to drill-down support
- ✅ Responsive design

---

### 2. Sparkline

Mini trend chart component for dashboard cards.

#### Kullanım

```tsx
import { Sparkline } from '@/components/ui/Sparkline';

<Sparkline
  data={[10, 15, 12, 18, 20, 16, 22]}
  color="#3b82f6"
  width={80}
  height={30}
/>
```

#### Props

- `data: number[]` - Data points array (zorunlu)
- `color?: string` - Line color (default: '#3b82f6')
- `width?: number` - Chart width in pixels (default: 80)
- `height?: number` - Chart height in pixels (default: 30)
- `className?: string` - Additional CSS classes

#### Özellikler

- ✅ Smooth curve rendering
- ✅ Area fill
- ✅ Data point markers
- ✅ Auto-scaling
- ✅ Customizable colors

---

### 3. LoadingShimmer & CardShimmer

Skeleton loading effects for cards and content.

#### Kullanım

```tsx
import { LoadingShimmer, CardShimmer } from '@/components/ui/LoadingShimmer';

// Custom shimmer
<LoadingShimmer width="200px" height="100px" />

// Card shimmer
<CardShimmer />
```

#### Özellikler

- ✅ Smooth shimmer animation
- ✅ Pre-configured card shimmer
- ✅ Customizable dimensions

---

## 🎨 Kullanım Örnekleri

### Basic Stat Card

```tsx
import { StatCard } from '@/components/ui/StatCard';
import { ShieldIcon } from '@/components/ui/icons';

<StatCard
  title="Toplam Marka"
  value={24}
  icon={ShieldIcon}
  color="blue"
/>
```

### Stat Card with Trend

```tsx
<StatCard
  title="Aktif KPI"
  value={156}
  change="+12%"
  period="bu ay"
  icon={ActivityIcon}
  color="green"
  trend="up"
  gradient
/>
```

### Stat Card with Sparkline

```tsx
import { StatCard } from '@/components/ui/StatCard';
import { Sparkline } from '@/components/ui/Sparkline';
import { TrendingUpIcon } from '@/components/ui/icons';

<div className="relative">
  <StatCard
    title="Aylık Rapor"
    value={89}
    change="+5%"
    icon={TrendingUpIcon}
    color="violet"
    gradient
  />
  <div className="absolute bottom-4 right-4">
    <Sparkline
      data={[10, 15, 12, 18, 20, 16, 22, 25]}
      color="rgba(255, 255, 255, 0.8)"
      width={80}
      height={30}
    />
  </div>
</div>
```

### Interactive Stat Card

```tsx
<StatCard
  title="Toplam Kullanıcı"
  value={1234}
  change="+8%"
  period="son hafta"
  icon={UsersIcon}
  color="indigo"
  trend="up"
  onClick={() => navigate('/admin/users')}
  gradient
/>
```

### Loading State

```tsx
<StatCard
  title="Yükleniyor..."
  value=""
  icon={ShieldIcon}
  color="blue"
  loading={true}
/>
```

### Non-gradient Card

```tsx
<StatCard
  title="Toplam Marka"
  value={24}
  icon={ShieldIcon}
  color="blue"
  gradient={false}
/>
```

### Card Grid

```tsx
import { Grid, GridItem } from '@/components/ui/Grid';
import { StatCard } from '@/components/ui/StatCard';

<Grid cols={4} gap="md" responsive={{ sm: 1, md: 2, lg: 4 }}>
  <GridItem>
    <StatCard
      title="Toplam Marka"
      value={24}
      icon={ShieldIcon}
      color="blue"
    />
  </GridItem>
  <GridItem>
    <StatCard
      title="Aktif KPI"
      value={156}
      icon={ActivityIcon}
      color="green"
    />
  </GridItem>
  <GridItem>
    <StatCard
      title="Aylık Rapor"
      value={89}
      icon={ReportsIcon}
      color="violet"
    />
  </GridItem>
  <GridItem>
    <StatCard
      title="Ortalama İlerleme"
      value="78%"
      icon={TrendingUpIcon}
      color="amber"
    />
  </GridItem>
</Grid>
```

---

## ✅ Best Practices

### 1. Color Selection
- ✅ Primary metrics için `blue` veya `indigo`
- ✅ Success metrics için `green`
- ✅ Warning metrics için `amber`
- ✅ Error metrics için `red`
- ✅ Secondary metrics için `violet` veya `purple`
- ❌ Çok fazla farklı renk kullanmayın (maksimum 4-5 renk)

### 2. Trend Indicators
- ✅ `change` prop'unu her zaman sağlayın (kullanıcı için önemli)
- ✅ `trend` prop'unu manuel set edin veya otomatik detection'a güvenin
- ✅ Period bilgisi ekleyin (örn: "son 30 gün", "bu ay")
- ❌ Yanıltıcı trend göstermeyin

### 3. Interactive Cards
- ✅ Drill-down yapılabilir card'lar için `onClick` ekleyin
- ✅ Hover effect'leri kullanın
- ✅ Loading state'leri gösterin
- ❌ Her card'ı clickable yapmayın (sadece gerekli olanlar)

### 4. Gradient vs Non-gradient
- ✅ Ana dashboard'da gradient kullanın
- ✅ Detay sayfalarında non-gradient kullanın
- ✅ Tutarlılık için aynı sayfada aynı stil kullanın
- ❌ Karışık kullanmayın

### 5. Sparklines
- ✅ Trend gösterimi için kullanın
- ✅ Küçük tutun (80x30px)
- ✅ Gradient card'larda yarı saydam renk kullanın
- ❌ Çok fazla detay eklemeyin (basit tutun)

---

## 🔄 Migration Guide

Mevcut card'ları StatCard'a geçirirken:

**Önce:**
```tsx
<Card className="border-2 border-blue-200">
  <CardContent className="p-4">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-600">Toplam Marka</p>
        <p className="text-2xl font-bold">24</p>
      </div>
      <ShieldIcon className="w-8 h-8 text-blue-600" />
    </div>
  </CardContent>
</Card>
```

**Sonra:**
```tsx
<StatCard
  title="Toplam Marka"
  value={24}
  icon={ShieldIcon}
  color="blue"
  gradient
/>
```

---

## 📚 Referanslar

- Design System: `frontend/src/lib/DESIGN_SYSTEM.md`
- StatCard Component: `frontend/src/components/ui/StatCard.tsx`
- Sparkline Component: `frontend/src/components/ui/Sparkline.tsx`
- LoadingShimmer Component: `frontend/src/components/ui/LoadingShimmer.tsx`
- Card Component: `frontend/src/components/ui/card.tsx`


