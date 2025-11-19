# 📐 Layout ve Spacing Kullanım Kılavuzu

Bu doküman, projede kullanılan Layout ve Spacing system'inin nasıl kullanılacağını açıklar.

## 🎯 Layout System

Layout system'i tutarlı spacing, padding ve container yapıları sağlar.

### Consistent Padding

| Element | Padding | CSS Variable | Utility Class |
|----------|---------|-------------|---------------|
| Cards | 24px (1.5rem) | `--padding-card` | `p-card` |
| Sections (Vertical) | 32px (2rem) | `--padding-section-y` | `p-section-y` |
| Containers (Horizontal) | 24px (1.5rem) | `--padding-container-x` | `p-container-x` |

### Container Max-widths

| Size | Max-width | Breakpoint | Utility Class |
|------|-----------|------------|---------------|
| Small | 640px | sm | `container-sm` |
| Medium | 768px | md | `container-md` |
| Large | 1024px | lg | `container-lg` |
| XL | 1280px | xl | `container-xl` |
| 2XL | 1536px | 2xl | `container-2xl` |

### Grid System

12-column responsive grid system:

- **Default Gutter**: 24px (1.5rem)
- **Small Gutter**: 16px (1rem) - Mobile
- **Large Gutter**: 32px (2rem) - Desktop

---

## 📦 Component Kullanımı

### 1. Container Component

Tutarlı max-width container'lar:

```tsx
import { Container } from '@/components/ui/Container';

// Default (xl - 1280px)
<Container>
  <h1>Content</h1>
</Container>

// Custom size
<Container size="lg" padding={false}>
  <h1>Content without padding</h1>
</Container>

// Full width
<Container size="full">
  <h1>Full width content</h1>
</Container>
```

### 2. Grid Component

12-column responsive grid:

```tsx
import { Grid, GridItem } from '@/components/ui/Grid';

// 3 columns, responsive
<Grid cols={3} gap="lg" responsive={{ sm: 1, md: 2, lg: 3 }}>
  <GridItem>Item 1</GridItem>
  <GridItem>Item 2</GridItem>
  <GridItem>Item 3</GridItem>
</Grid>

// 12-column grid with custom spans
<Grid cols={12} gap="md">
  <GridItem span={8}>Main content (8 cols)</GridItem>
  <GridItem span={4}>Sidebar (4 cols)</GridItem>
</Grid>

// Responsive column spans
<Grid cols={12}>
  <GridItem 
    span={12} 
    responsive={{ sm: 12, md: 8, lg: 6 }}
  >
    Responsive item
  </GridItem>
</Grid>
```

### 3. Section Component

Tutarlı section spacing:

```tsx
import { Section } from '@/components/ui/Section';

// Default section with padding and spacing
<Section>
  <h2>Section Title</h2>
  <p>Section content</p>
</Section>

// Custom spacing
<Section spacing="lg" padding={false}>
  <h2>Large spacing, no padding</h2>
</Section>

// No spacing
<Section spacing="none">
  <h2>No spacing</h2>
</Section>
```

---

## 🎨 Utility Classes

### Padding Utilities

```tsx
// Card padding
<div className="p-card">Card content</div>

// Section vertical padding
<div className="p-section-y">Section content</div>

// Container horizontal padding
<div className="p-container-x">Container content</div>
```

### Container Utilities

```tsx
// Max-width containers
<div className="container-sm">Small container (640px)</div>
<div className="container-md">Medium container (768px)</div>
<div className="container-lg">Large container (1024px)</div>
<div className="container-xl">XL container (1280px)</div>
<div className="container-2xl">2XL container (1536px)</div>
```

### Grid Utilities

```tsx
// 12-column grid
<div className="grid-12">
  <div className="col-span-6">Half width</div>
  <div className="col-span-6">Half width</div>
</div>

// Grid with custom gutters
<div className="grid-12 grid-12-sm">Small gutter</div>
<div className="grid-12 grid-12-lg">Large gutter</div>

// Column spans
<div className="col-span-1">1 column</div>
<div className="col-span-2">2 columns</div>
<div className="col-span-3">3 columns</div>
<div className="col-span-4">4 columns</div>
<div className="col-span-6">6 columns</div>
<div className="col-span-12">12 columns (full)</div>
```

### Whitespace Utilities

```tsx
// Section spacing
<div className="space-section">Section with bottom spacing</div>
<div className="space-section-top">Section with top spacing</div>

// Group spacing
<div className="space-group">Group with bottom spacing</div>
<div className="space-group-top">Group with top spacing</div>
```

---

## 📋 Kullanım Örnekleri

### Sayfa Layout

```tsx
import { Container, Section } from '@/components/ui';

function PageLayout() {
  return (
    <Container size="xl">
      <Section spacing="lg">
        <h1>Page Title</h1>
        <p>Page description</p>
      </Section>

      <Section>
        <h2>Content Section</h2>
        <p>Content goes here</p>
      </Section>
    </Container>
  );
}
```

### Card Grid

```tsx
import { Grid, GridItem } from '@/components/ui/Grid';

function CardGrid({ items }) {
  return (
    <Grid 
      cols={4} 
      gap="lg" 
      responsive={{ sm: 1, md: 2, lg: 3, xl: 4 }}
    >
      {items.map((item) => (
        <GridItem key={item.id}>
          <div className="p-card bg-white rounded-xl shadow-lg">
            <h3>{item.title}</h3>
            <p>{item.description}</p>
          </div>
        </GridItem>
      ))}
    </Grid>
  );
}
```

### Dashboard Layout

```tsx
import { Container, Grid, GridItem, Section } from '@/components/ui';

function DashboardLayout() {
  return (
    <Container size="2xl">
      <Section spacing="lg">
        <h1>Dashboard</h1>
      </Section>

      <Grid cols={12} gap="md">
        {/* Stats Cards */}
        <GridItem span={12} responsive={{ sm: 12, md: 6, lg: 3 }}>
          <div className="p-card bg-white rounded-xl">Stat 1</div>
        </GridItem>
        <GridItem span={12} responsive={{ sm: 12, md: 6, lg: 3 }}>
          <div className="p-card bg-white rounded-xl">Stat 2</div>
        </GridItem>
        <GridItem span={12} responsive={{ sm: 12, md: 6, lg: 3 }}>
          <div className="p-card bg-white rounded-xl">Stat 3</div>
        </GridItem>
        <GridItem span={12} responsive={{ sm: 12, md: 6, lg: 3 }}>
          <div className="p-card bg-white rounded-xl">Stat 4</div>
        </GridItem>

        {/* Main Content */}
        <GridItem span={12} responsive={{ sm: 12, lg: 8 }}>
          <div className="p-card bg-white rounded-xl">Main Content</div>
        </GridItem>

        {/* Sidebar */}
        <GridItem span={12} responsive={{ sm: 12, lg: 4 }}>
          <div className="p-card bg-white rounded-xl">Sidebar</div>
        </GridItem>
      </Grid>
    </Container>
  );
}
```

### Form Layout

```tsx
import { Container, Section, Grid, GridItem } from '@/components/ui';

function FormLayout() {
  return (
    <Container size="lg">
      <Section spacing="lg">
        <h1>Create User</h1>
      </Section>

      <Section>
        <Grid cols={2} gap="md" responsive={{ sm: 1, md: 2 }}>
          <GridItem>
            <label>First Name</label>
            <input type="text" />
          </GridItem>
          <GridItem>
            <label>Last Name</label>
            <input type="text" />
          </GridItem>
        </Grid>
      </Section>
    </Container>
  );
}
```

---

## ✅ Best Practices

### 1. Container Kullanımı
- ✅ Sayfa içeriği için `Container` component'i kullanın
- ✅ Form'lar için `size="lg"` veya `size="md"` kullanın
- ✅ Dashboard'lar için `size="2xl"` veya `size="xl"` kullanın
- ❌ Her yerde container kullanmayın (full-width section'lar için gerekli değil)

### 2. Grid Kullanımı
- ✅ Card grid'leri için `Grid` component'i kullanın
- ✅ Responsive breakpoint'leri her zaman tanımlayın
- ✅ 12-column grid'i complex layout'lar için kullanın
- ❌ Basit flex layout'lar için grid kullanmayın

### 3. Spacing
- ✅ Section'lar arası `space-section` kullanın
- ✅ İlgili içerik grupları için `space-group` kullanın
- ✅ Card'lar için `p-card` kullanın
- ❌ Rastgele margin/padding değerleri kullanmayın

### 4. Padding
- ✅ Card'lar için `p-card` (24px)
- ✅ Section'lar için `p-section-y` (32px vertical)
- ✅ Container'lar için `p-container-x` (24px horizontal)
- ❌ Farklı padding değerleri kullanmayın

### 5. Responsive Design
```tsx
// ✅ Doğru: Responsive breakpoint'ler
<Grid cols={1} responsive={{ sm: 1, md: 2, lg: 3 }}>
  ...
</Grid>

// ❌ Yanlış: Sadece desktop için
<Grid cols={3}>
  ...
</Grid>
```

---

## 🔄 Migration Guide

Mevcut component'leri layout system'e geçirirken:

1. **Container'lar**: `max-w-7xl mx-auto` → `<Container size="xl">`
2. **Grid'ler**: `grid grid-cols-3 gap-4` → `<Grid cols={3} gap="md">`
3. **Padding**: `p-6` → `p-card`, `py-8` → `p-section-y`
4. **Spacing**: `mb-8` → `space-section`, `mb-6` → `space-group`

### Örnek Migration

**Önce:**
```tsx
<div className="max-w-7xl mx-auto px-6">
  <div className="mb-8">
    <h1>Title</h1>
  </div>
  <div className="grid grid-cols-3 gap-4">
    <div className="p-6 bg-white rounded-xl">Card 1</div>
    <div className="p-6 bg-white rounded-xl">Card 2</div>
    <div className="p-6 bg-white rounded-xl">Card 3</div>
  </div>
</div>
```

**Sonra:**
```tsx
<Container size="xl">
  <Section spacing="lg">
    <h1>Title</h1>
  </Section>
  <Grid cols={3} gap="md" responsive={{ sm: 1, md: 2, lg: 3 }}>
    <GridItem>
      <div className="p-card bg-white rounded-xl">Card 1</div>
    </GridItem>
    <GridItem>
      <div className="p-card bg-white rounded-xl">Card 2</div>
    </GridItem>
    <GridItem>
      <div className="p-card bg-white rounded-xl">Card 3</div>
    </GridItem>
  </Grid>
</Container>
```

---

## 📚 Referanslar

- Design System: `frontend/src/lib/DESIGN_SYSTEM.md`
- Design Tokens: `frontend/src/lib/designTokens.ts`
- Container Component: `frontend/src/components/ui/Container.tsx`
- Grid Component: `frontend/src/components/ui/Grid.tsx`
- Section Component: `frontend/src/components/ui/Section.tsx`
- CSS Variables: `frontend/src/styles/globals.css`
- Tailwind Config: `frontend/tailwind.config.cjs`

