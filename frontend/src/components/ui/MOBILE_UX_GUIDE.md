# 📱 Mobil UX Component'leri Kullanım Kılavuzu

Bu doküman, mobil cihazlar için özel olarak oluşturulan UX component'lerinin nasıl kullanılacağını açıklar.

## 🎯 Mobil UX Component'leri

### 1. MobileBottomNav

Fixed bottom navigation bar for mobile devices.

#### Kullanım

```tsx
import { MobileBottomNav } from '@/components/ui/MobileBottomNav';
import { HomeIcon, ChartIcon, SettingsIcon, UserIcon } from '@/components/ui/icons';

const navItems = [
  {
    label: 'Ana Sayfa',
    icon: <HomeIcon className="w-6 h-6" />,
    path: '/user/mobile',
  },
  {
    label: 'Günlük KPI',
    icon: <ChartIcon className="w-6 h-6" />,
    path: '/user/mobile/daily-kpi',
    badge: 5, // Optional badge
  },
  {
    label: 'Aylık KPI',
    icon: <ChartIcon className="w-6 h-6" />,
    path: '/user/mobile/monthly-kpi',
  },
  {
    label: 'Profil',
    icon: <UserIcon className="w-6 h-6" />,
    path: '/user/profile',
  },
];

<MobileBottomNav items={navItems} />
```

#### Özellikler

- ✅ Fixed bottom position
- ✅ Active state highlighting
- ✅ Badge indicators
- ✅ iOS safe area support
- ✅ Touch-optimized (44px min height)
- ✅ Smooth transitions

---

### 2. PullToRefresh

Native-like pull to refresh functionality.

#### Kullanım

```tsx
import { PullToRefresh } from '@/components/ui/PullToRefresh';

function MyComponent() {
  const handleRefresh = async () => {
    // Refresh data
    await fetchData();
  };

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="p-4">
        <h1>Content</h1>
        <p>Pull down to refresh</p>
      </div>
    </PullToRefresh>
  );
}
```

#### Props

- `onRefresh: () => Promise<void> | void` - Refresh function
- `disabled?: boolean` - Disable pull to refresh
- `threshold?: number` - Pull distance in pixels (default: 80)
- `className?: string` - Additional CSS classes

#### Özellikler

- ✅ Native-like animation
- ✅ Loading indicator
- ✅ Damping effect
- ✅ Smooth transitions
- ✅ Touch-optimized

---

### 3. MobileInput

Mobile-optimized input component.

#### Kullanım

```tsx
import { MobileInput } from '@/components/ui/MobileInput';

<MobileInput
  label="Email"
  type="email"
  placeholder="ornek@email.com"
  error={errors.email}
  helperText="Email adresinizi girin"
  required
/>
```

#### Özellikler

- ✅ Larger touch targets (44px min height)
- ✅ Optimized input types for mobile keyboards
- ✅ 16px font size (prevents iOS zoom)
- ✅ Better keyboard handling
- ✅ Error and helper text support

#### Input Type Optimization

- `number` → `tel` (better mobile keyboard)
- `email` → `email` (email keyboard)
- `tel` → `tel` (phone keyboard)
- `url` → `url` (URL keyboard)

---

### 4. SwipeableItem

Swipe gestures to reveal actions.

#### Kullanım

```tsx
import { SwipeableItem } from '@/components/ui/SwipeableItem';

<SwipeableItem
  leftAction={<span>Edit</span>}
  rightAction={<span>Delete</span>}
  onSwipeLeft={() => handleDelete()}
  onSwipeRight={() => handleEdit()}
>
  <div className="p-4 border-b">
    <h3>Item Title</h3>
    <p>Item description</p>
  </div>
</SwipeableItem>
```

#### Props

- `leftAction?: React.ReactNode` - Action shown when swiping right
- `rightAction?: React.ReactNode` - Action shown when swiping left
- `onSwipeLeft?: () => void` - Callback when swiped left
- `onSwipeRight?: () => void` - Callback when swiped right
- `threshold?: number` - Swipe distance in pixels (default: 100)

#### Özellikler

- ✅ Swipe to reveal actions
- ✅ Smooth animations
- ✅ Snap to position
- ✅ Touch-optimized

---

### 5. useSwipeGesture Hook

Custom hook for detecting swipe gestures.

#### Kullanım

```tsx
import { useSwipeGesture } from '@/hooks/useSwipeGesture';

function MyComponent() {
  const { elementRef, swipeDirection } = useSwipeGesture({
    onSwipeLeft: () => console.log('Swiped left'),
    onSwipeRight: () => console.log('Swiped right'),
    onSwipeUp: () => console.log('Swiped up'),
    onSwipeDown: () => console.log('Swiped down'),
    threshold: 50, // Minimum distance in pixels
    velocity: 0.3, // Minimum velocity in px/ms
  });

  return (
    <div ref={elementRef}>
      <p>Swipe me!</p>
      {swipeDirection && <p>Last swipe: {swipeDirection}</p>}
    </div>
  );
}
```

#### Options

- `onSwipeLeft?: () => void` - Callback for left swipe
- `onSwipeRight?: () => void` - Callback for right swipe
- `onSwipeUp?: () => void` - Callback for up swipe
- `onSwipeDown?: () => void` - Callback for down swipe
- `threshold?: number` - Minimum distance in pixels (default: 50)
- `velocity?: number` - Minimum velocity in px/ms (default: 0.3)
- `preventDefault?: boolean` - Prevent default touch behavior (default: true)

---

## 🎨 Kullanım Örnekleri

### Mobile Dashboard with Bottom Nav

```tsx
import { MobileBottomNav } from '@/components/ui/MobileBottomNav';
import { PullToRefresh } from '@/components/ui/PullToRefresh';

function MobileDashboard() {
  const handleRefresh = async () => {
    await loadDashboardData();
  };

  const navItems = [
    { label: 'Ana Sayfa', icon: <HomeIcon />, path: '/user/mobile' },
    { label: 'Günlük', icon: <ChartIcon />, path: '/user/mobile/daily-kpi' },
    { label: 'Aylık', icon: <ChartIcon />, path: '/user/mobile/monthly-kpi' },
    { label: 'Profil', icon: <UserIcon />, path: '/user/profile' },
  ];

  return (
    <div className="pb-20"> {/* Space for bottom nav */}
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="p-4">
          <h1>Dashboard</h1>
          {/* Content */}
        </div>
      </PullToRefresh>
      
      <MobileBottomNav items={navItems} />
    </div>
  );
}
```

### Swipeable List

```tsx
import { SwipeableItem } from '@/components/ui/SwipeableItem';

function SwipeableList({ items, onDelete, onEdit }) {
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <SwipeableItem
          key={item.id}
          leftAction={
            <button onClick={() => onEdit(item)} className="text-white">
              Düzenle
            </button>
          }
          rightAction={
            <button onClick={() => onDelete(item.id)} className="text-white">
              Sil
            </button>
          }
          onSwipeLeft={() => onDelete(item.id)}
          onSwipeRight={() => onEdit(item)}
        >
          <div className="p-4 bg-white border-b">
            <h3>{item.title}</h3>
            <p>{item.description}</p>
          </div>
        </SwipeableItem>
      ))}
    </div>
  );
}
```

### Mobile Form

```tsx
import { MobileInput } from '@/components/ui/MobileInput';

function MobileForm() {
  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    name: '',
  });
  const [errors, setErrors] = useState({});

  return (
    <form className="space-y-4 p-4">
      <MobileInput
        label="Ad Soyad"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        error={errors.name}
        required
      />
      
      <MobileInput
        label="Email"
        type="email"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        error={errors.email}
        helperText="ornek@email.com"
        required
      />
      
      <MobileInput
        label="Telefon"
        type="tel"
        value={formData.phone}
        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
        error={errors.phone}
        required
      />
    </form>
  );
}
```

---

## ✅ Best Practices

### 1. Bottom Navigation
- ✅ En fazla 4-5 item kullanın
- ✅ Active state'i her zaman gösterin
- ✅ Badge'leri sadece önemli bildirimler için kullanın
- ✅ iOS safe area için padding ekleyin
- ❌ Çok fazla item eklemeyin (kullanıcı deneyimi bozulur)

### 2. Pull to Refresh
- ✅ Sadece liste ve dashboard'larda kullanın
- ✅ Refresh işlemi hızlı olmalı (< 2 saniye)
- ✅ Loading state'i gösterin
- ❌ Form'larda kullanmayın

### 3. Mobile Input
- ✅ Her zaman label kullanın
- ✅ Input type'ı optimize edin
- ✅ Error mesajlarını gösterin
- ✅ 16px font size kullanın (iOS zoom önleme)
- ❌ Küçük touch target'lar kullanmayın

### 4. Swipe Gestures
- ✅ Sadece liste item'larında kullanın
- ✅ Açık action'lar gösterin
- ✅ Threshold'u kullanıcı dostu yapın (100px)
- ✅ Snap to position animasyonu ekleyin
- ❌ Çok hassas swipe detection yapmayın

### 5. Touch Targets
- ✅ Minimum 44x44px touch target
- ✅ Adequate spacing between targets
- ✅ Visual feedback on touch
- ❌ Küçük butonlar ve linkler

---

## 📚 Referanslar

- Design System: `frontend/src/lib/DESIGN_SYSTEM.md`
- Mobile Components: `frontend/src/components/ui/`
- Hooks: `frontend/src/hooks/`
- Device Detection: `frontend/src/utils/deviceDetection.ts`


