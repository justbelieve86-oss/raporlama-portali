# 🎨 Micro-interactions ve Animations Kılavuzu

Bu doküman, micro-interactions ve animations component'lerinin nasıl kullanılacağını açıklar.

## 🎯 Animation Component'leri

### 1. Button Interactions

Button component'i otomatik olarak hover ve active animasyonları içerir.

#### Kullanım

```tsx
import { Button } from '@/components/ui/button';

<Button variant="primary" onClick={handleClick}>
  Tıkla
</Button>
```

#### Özellikler

- ✅ Hover: Scale (1.05x), shadow increase
- ✅ Active: Scale (0.95x), shadow decrease
- ✅ Smooth transitions (200ms)
- ✅ Focus ring animations

---

### 2. Card Hover Effects

Card component'i hover effects ile geliştirildi.

#### Kullanım

```tsx
import { Card } from '@/components/ui/card';

<Card hoverable clickable onClick={handleClick}>
  <CardContent>İçerik</CardContent>
</Card>
```

#### Props

- `hoverable?: boolean` - Enable hover effects (default: false)
- `clickable?: boolean` - Enable click animation (default: false)

#### Özellikler

- ✅ Hover: Shadow increase, translate up
- ✅ Click: Scale down (0.98x)
- ✅ Smooth transitions (300ms)

---

### 3. Loading States

#### Spinner Component

```tsx
import { Spinner } from '@/components/ui/Spinner';

<Spinner size="md" color="primary" />
```

#### Props

- `size?: 'sm' | 'md' | 'lg'` - Spinner size (default: 'md')
- `color?: 'primary' | 'white' | 'gray'` - Spinner color (default: 'primary')
- `className?: string` - Additional CSS classes

#### ProgressBar Component

```tsx
import { ProgressBar } from '@/components/ui/ProgressBar';

<ProgressBar
  value={75}
  max={100}
  showLabel
  color="primary"
  size="md"
  animated
/>
```

#### Props

- `value: number` - Current value (0-100)
- `max?: number` - Maximum value (default: 100)
- `showLabel?: boolean` - Show percentage label (default: false)
- `color?: 'primary' | 'success' | 'warning' | 'error' | 'info'` - Bar color (default: 'primary')
- `size?: 'sm' | 'md' | 'lg'` - Bar height (default: 'md')
- `animated?: boolean` - Enable pulse animation (default: true)

---

### 4. Toast Animations

Toast component'i slide-in ve fade-out animasyonları içerir.

#### Kullanım

```tsx
import Toast from '@/components/ui/Toast';

<Toast
  id="toast-1"
  type="success"
  title="Başarılı"
  message="İşlem tamamlandı"
  duration={3000}
  onClose={handleClose}
/>
```

#### Özellikler

- ✅ Slide in from right
- ✅ Fade out on close
- ✅ Scale animation
- ✅ Smooth transitions (300ms)

---

### 5. Page Transitions

Page transition wrapper component.

#### Kullanım

```tsx
import { PageTransition } from '@/components/ui/PageTransition';

<PageTransition type="fade" duration={300}>
  <div>Sayfa içeriği</div>
</PageTransition>
```

#### Props

- `type?: 'fade' | 'slide' | 'scale'` - Transition type (default: 'fade')
- `duration?: number` - Transition duration in ms (default: 300)
- `className?: string` - Additional CSS classes

#### Özellikler

- ✅ Fade in/out
- ✅ Slide transitions
- ✅ Scale transitions
- ✅ Customizable duration

---

### 6. Form Field Focus

FloatingLabelInput component'i otomatik olarak focus animasyonları içerir.

#### Kullanım

```tsx
import { FloatingLabelInput } from '@/components/ui/FloatingLabelInput';

<FloatingLabelInput
  label="Email"
  type="email"
  showValidationIcon
/>
```

#### Özellikler

- ✅ Label animation (float up on focus)
- ✅ Border color transition
- ✅ Scale animation on focus
- ✅ Validation icon animations

---

### 7. Success/Error States

#### CheckmarkAnimation Component

```tsx
import { CheckmarkAnimation } from '@/components/ui/CheckmarkAnimation';

<CheckmarkAnimation size="md" color="success" />
```

#### Props

- `size?: 'sm' | 'md' | 'lg'` - Checkmark size (default: 'md')
- `color?: 'success' | 'primary'` - Checkmark color (default: 'success')
- `className?: string` - Additional CSS classes

#### Özellikler

- ✅ Animated checkmark drawing
- ✅ Circle pulse animation
- ✅ Smooth stroke animation

#### ErrorShake Component

```tsx
import { ErrorShake } from '@/components/ui/ErrorShake';

<ErrorShake trigger={hasError}>
  <input type="text" />
</ErrorShake>
```

#### Props

- `children: React.ReactNode` - Child element to shake
- `trigger?: boolean` - Trigger shake animation (default: false)
- `className?: string` - Additional CSS classes

#### Özellikler

- ✅ Shake animation on error
- ✅ Automatic reset after animation
- ✅ Smooth shake effect

---

## 🎨 CSS Animations

### Available Animations

```css
.animate-shimmer        /* Shimmer effect */
.animate-pulse-slow     /* Slow pulse */
.animate-bounce-subtle  /* Subtle bounce */
.animate-slide-in-right /* Slide in from right */
.animate-slide-out-right /* Slide out to right */
.animate-bounce-in      /* Bounce in effect */
.animate-shake          /* Shake animation */
.animate-checkmark      /* Checkmark drawing */
.animate-fade-in        /* Fade in */
.animate-fade-out       /* Fade out */
.animate-scale-in       /* Scale in */
```

### Kullanım

```tsx
<div className="animate-fade-in">
  İçerik
</div>
```

---

## 🎨 Kullanım Örnekleri

### Button with Loading State

```tsx
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/Spinner';

function LoadingButton({ loading, onClick, children }) {
  return (
    <Button onClick={onClick} disabled={loading}>
      {loading ? (
        <>
          <Spinner size="sm" color="white" className="mr-2" />
          Yükleniyor...
        </>
      ) : (
        children
      )}
    </Button>
  );
}
```

### Card with Hover Effect

```tsx
import { Card, CardContent } from '@/components/ui/card';

<Card hoverable clickable onClick={handleCardClick}>
  <CardContent>
    <h3>Başlık</h3>
    <p>İçerik</p>
  </CardContent>
</Card>
```

### Form with Error Shake

```tsx
import { FloatingLabelInput } from '@/components/ui/FloatingLabelInput';
import { ErrorShake } from '@/components/ui/ErrorShake';

function FormField({ error, ...props }) {
  return (
    <ErrorShake trigger={!!error}>
      <FloatingLabelInput
        error={error}
        showValidationIcon
        {...props}
      />
    </ErrorShake>
  );
}
```

### Success State with Checkmark

```tsx
import { CheckmarkAnimation } from '@/components/ui/CheckmarkAnimation';

function SuccessMessage({ show }) {
  if (!show) return null;

  return (
    <div className="flex items-center gap-2">
      <CheckmarkAnimation size="sm" color="success" />
      <span>İşlem başarılı!</span>
    </div>
  );
}
```

### Page with Transition

```tsx
import { PageTransition } from '@/components/ui/PageTransition';

function MyPage() {
  return (
    <PageTransition type="fade" duration={300}>
      <div>
        <h1>Sayfa Başlığı</h1>
        <p>Sayfa içeriği</p>
      </div>
    </PageTransition>
  );
}
```

### Progress Indicator

```tsx
import { ProgressBar } from '@/components/ui/ProgressBar';

function UploadProgress({ progress }) {
  return (
    <div>
      <ProgressBar
        value={progress}
        showLabel
        color="primary"
        size="md"
        animated
      />
    </div>
  );
}
```

---

## ✅ Best Practices

### 1. Performance
- ✅ CSS animations kullanın (JavaScript animasyonlarından daha performanslı)
- ✅ `transform` ve `opacity` kullanın (GPU accelerated)
- ✅ `will-change` property'sini dikkatli kullanın
- ❌ Çok fazla animasyon kullanmayın (overwhelming)

### 2. Timing
- ✅ Hover effects: 200-300ms
- ✅ Page transitions: 300-500ms
- ✅ Loading states: Continuous
- ✅ Error states: 500ms (shake)
- ❌ Çok hızlı animasyonlar (kullanıcı fark edemez)
- ❌ Çok yavaş animasyonlar (kullanıcı bekler)

### 3. Easing
- ✅ Ease-out for entrances
- ✅ Ease-in for exits
- ✅ Ease-in-out for continuous animations
- ❌ Linear easing (unnatural)

### 4. Accessibility
- ✅ `prefers-reduced-motion` media query'yi destekleyin
- ✅ Animasyonları disable edilebilir yapın
- ✅ Focus states için animasyonlar ekleyin
- ❌ Sadece görsel animasyonlar (işlevsel değil)

### 5. Consistency
- ✅ Aynı animasyonları aynı durumlar için kullanın
- ✅ Aynı timing ve easing kullanın
- ✅ Design system'e uygun animasyonlar
- ❌ Her yerde farklı animasyonlar

---

## 🔄 Migration Guide

Mevcut component'leri animasyonlu versiyonlara geçirirken:

**Önce:**
```tsx
<button className="bg-blue-600 text-white px-4 py-2">
  Tıkla
</button>
```

**Sonra:**
```tsx
<Button variant="primary">
  Tıkla
</Button>
```

**Önce:**
```tsx
<div className="bg-white rounded-lg shadow">
  İçerik
</div>
```

**Sonra:**
```tsx
<Card hoverable>
  <CardContent>İçerik</CardContent>
</Card>
```

---

## 📚 Referanslar

- Design System: `frontend/src/lib/DESIGN_SYSTEM.md`
- Button Component: `frontend/src/components/ui/button.tsx`
- Card Component: `frontend/src/components/ui/card.tsx`
- Spinner Component: `frontend/src/components/ui/Spinner.tsx`
- ProgressBar Component: `frontend/src/components/ui/ProgressBar.tsx`
- CheckmarkAnimation Component: `frontend/src/components/ui/CheckmarkAnimation.tsx`
- ErrorShake Component: `frontend/src/components/ui/ErrorShake.tsx`
- PageTransition Component: `frontend/src/components/ui/PageTransition.tsx`
- Toast Component: `frontend/src/components/ui/Toast.tsx`
- CSS Animations: `frontend/src/styles/globals.css`


