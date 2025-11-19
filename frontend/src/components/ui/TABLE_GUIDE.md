# 📊 Table Component'leri Kullanım Kılavuzu

Bu doküman, modern table component'lerinin nasıl kullanılacağını açıklar.

## 🎯 Table Component'leri

### 1. Table Components (Enhanced)

Geliştirilmiş table component'leri - Sticky headers, hover effects, alternating colors.

#### Kullanım

```tsx
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

<Table>
  <TableHeader sticky>
    <TableRow>
      <TableHead>Ad</TableHead>
      <TableHead>Email</TableHead>
      <TableHead>Rol</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow hoverable clickable onClick={() => handleRowClick(item)}>
      <TableCell>{item.name}</TableCell>
      <TableCell>{item.email}</TableCell>
      <TableCell>{item.role}</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

#### Özellikler

- ✅ Sticky headers (`sticky` prop)
- ✅ Row hover effects (`hoverable` prop)
- ✅ Alternating row colors (even rows)
- ✅ Clickable rows (`clickable` + `onClick`)
- ✅ Smooth transitions

---

### 2. SortableTableHeader

Sortable column header with sort indicators.

#### Kullanım

```tsx
import { SortableTableHeader } from '@/components/ui/SortableTableHeader';

const [sortColumn, setSortColumn] = useState<string | null>(null);
const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);

<SortableTableHeader
  sortable
  sortDirection={sortColumn === 'name' ? sortDirection : null}
  onSort={(direction) => {
    setSortColumn('name');
    setSortDirection(direction);
  }}
>
  Ad
</SortableTableHeader>
```

#### Props

- `sortable?: boolean` - Enable sorting (default: false)
- `sortDirection?: 'asc' | 'desc' | null` - Current sort direction
- `onSort?: (direction: SortDirection) => void` - Sort callback
- Standard `th` props

#### Özellikler

- ✅ Click to sort
- ✅ Sort indicators (↑ ↓)
- ✅ Visual feedback
- ✅ Hover effects

---

### 3. EmptyState

Empty state component for tables and lists.

#### Kullanım

```tsx
import { EmptyState } from '@/components/ui/EmptyState';
import { TableIcon } from '@/components/ui/icons';

{data.length === 0 && (
  <tr>
    <td colSpan={columns.length}>
      <EmptyState
        icon={TableIcon}
        title="Veri bulunamadı"
        description="Henüz kayıt eklenmemiş"
        action={<Button onClick={handleAdd}>Yeni Kayıt Ekle</Button>}
      />
    </td>
  </tr>
)}
```

#### Props

- `icon?: React.ComponentType` - Icon component
- `title: string` - Title text (zorunlu)
- `description?: string` - Description text
- `action?: React.ReactNode` - Action button/component
- `className?: string` - Additional CSS classes

---

### 4. Pagination

Modern pagination component with page size selector and jump to page.

#### Kullanım

```tsx
import { Pagination } from '@/components/ui/Pagination';

const [page, setPage] = useState(1);
const [pageSize, setPageSize] = useState(20);
const totalItems = 150;
const totalPages = Math.ceil(totalItems / pageSize);

<Pagination
  currentPage={page}
  totalPages={totalPages}
  totalItems={totalItems}
  pageSize={pageSize}
  onPageChange={setPage}
  onPageSizeChange={setPageSize}
  pageSizeOptions={[10, 20, 50, 100]}
  showPageSizeSelector
  showJumpToPage
/>
```

#### Props

- `currentPage: number` - Current page (1-based)
- `totalPages: number` - Total number of pages
- `totalItems: number` - Total number of items
- `pageSize: number` - Items per page
- `onPageChange: (page: number) => void` - Page change callback
- `onPageSizeChange?: (size: number) => void` - Page size change callback
- `pageSizeOptions?: number[]` - Page size options (default: [10, 20, 50, 100])
- `showPageSizeSelector?: boolean` - Show page size selector (default: true)
- `showJumpToPage?: boolean` - Show jump to page input (default: true)

#### Özellikler

- ✅ Page navigation (first, prev, next, last)
- ✅ Page number display with ellipsis
- ✅ Page size selector
- ✅ Jump to page input
- ✅ Total count display
- ✅ Responsive design

---

### 5. RowActionsMenu

Three-dot menu for table rows.

#### Kullanım

```tsx
import { RowActionsMenu } from '@/components/ui/RowActionsMenu';
import { EditIcon, TrashIcon } from '@/components/ui/icons';

<RowActionsMenu
  actions={[
    {
      label: 'Düzenle',
      icon: EditIcon,
      onClick: () => handleEdit(item),
    },
    {
      label: 'Sil',
      icon: TrashIcon,
      variant: 'danger',
      onClick: () => handleDelete(item.id),
    },
  ]}
/>
```

#### Props

- `actions: RowAction[]` - Array of actions
- `trigger?: React.ReactNode` - Custom trigger button
- `className?: string` - Additional CSS classes

#### RowAction Interface

```tsx
interface RowAction {
  label: string;
  icon?: React.ComponentType;
  onClick: () => void;
  variant?: 'default' | 'danger';
  disabled?: boolean;
}
```

#### Özellikler

- ✅ Three-dot menu trigger
- ✅ Custom trigger support
- ✅ Click outside to close
- ✅ Icon support
- ✅ Danger variant
- ✅ Disabled state

---

## 🎨 Kullanım Örnekleri

### Complete Table with Sorting and Pagination

```tsx
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { SortableTableHeader } from '@/components/ui/SortableTableHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { RowActionsMenu } from '@/components/ui/RowActionsMenu';

function DataTable({ data, columns }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortColumn || !sortDirection) return data;
    
    return [...data].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];
      
      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
  }, [data, sortColumn, sortDirection]);

  // Paginate data
  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return sortedData.slice(start, end);
  }, [sortedData, page, pageSize]);

  const totalPages = Math.ceil(sortedData.length / pageSize);

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader sticky>
          <TableRow>
            {columns.map((col) => (
              col.sortable ? (
                <SortableTableHeader
                  key={col.key}
                  sortable
                  sortDirection={sortColumn === col.key ? sortDirection : null}
                  onSort={(direction) => {
                    setSortColumn(direction ? col.key : null);
                    setSortDirection(direction);
                  }}
                >
                  {col.label}
                </SortableTableHeader>
              ) : (
                <TableHead key={col.key}>{col.label}</TableHead>
              )
            ))}
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedData.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length + 1}>
                <EmptyState
                  title="Veri bulunamadı"
                  description="Henüz kayıt eklenmemiş"
                />
              </TableCell>
            </TableRow>
          ) : (
            paginatedData.map((item) => (
              <TableRow key={item.id} hoverable>
                {columns.map((col) => (
                  <TableCell key={col.key}>{item[col.key]}</TableCell>
                ))}
                <TableCell>
                  <RowActionsMenu
                    actions={[
                      { label: 'Düzenle', onClick: () => handleEdit(item) },
                      { label: 'Sil', variant: 'danger', onClick: () => handleDelete(item.id) },
                    ]}
                  />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {sortedData.length > 0 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={sortedData.length}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}
    </div>
  );
}
```

### Simple Table with Hover Effects

```tsx
<Table>
  <TableHeader sticky>
    <TableRow>
      <TableHead>Ad</TableHead>
      <TableHead>Email</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {users.map((user) => (
      <TableRow key={user.id} hoverable clickable onClick={() => selectUser(user)}>
        <TableCell>{user.name}</TableCell>
        <TableCell>{user.email}</TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

### Table with Row Actions

```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Ad</TableHead>
      <TableHead>Email</TableHead>
      <TableHead className="w-12"></TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {users.map((user) => (
      <TableRow key={user.id} hoverable>
        <TableCell>{user.name}</TableCell>
        <TableCell>{user.email}</TableCell>
        <TableCell>
          <RowActionsMenu
            actions={[
              { label: 'Düzenle', icon: EditIcon, onClick: () => editUser(user) },
              { label: 'Sil', icon: TrashIcon, variant: 'danger', onClick: () => deleteUser(user.id) },
            ]}
          />
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

---

## ✅ Best Practices

### 1. Sticky Headers
- ✅ Long tables için sticky headers kullanın
- ✅ Sticky header'da shadow ekleyin
- ✅ Background color kullanın (white veya gray-50)
- ❌ Çok kısa tablolarda kullanmayın

### 2. Row Hover Effects
- ✅ Her zaman hover effect ekleyin (kullanıcı deneyimi)
- ✅ Clickable rows için `clickable` prop kullanın
- ✅ Smooth transitions kullanın
- ❌ Çok agresif hover renkleri kullanmayın

### 3. Alternating Colors
- ✅ Even rows için subtle background
- ✅ Hover ile override edilebilir olmalı
- ❌ Çok koyu renkler kullanmayın (okunabilirlik)

### 4. Sorting
- ✅ Sadece sortable column'lar için SortableTableHeader kullanın
- ✅ Sort state'i yönetin (column + direction)
- ✅ Multi-column sorting için state genişletin
- ❌ Her column'u sortable yapmayın

### 5. Pagination
- ✅ Büyük listeler için pagination kullanın
- ✅ Page size selector ekleyin
- ✅ Total count gösterin
- ✅ Jump to page için sadece büyük sayfa sayılarında gösterin
- ❌ Çok küçük listeler için pagination kullanmayın

### 6. Empty State
- ✅ Her zaman empty state gösterin
- ✅ Açıklayıcı mesaj ekleyin
- ✅ Action button ekleyin (eğer uygunsa)
- ❌ Boş tablo göstermeyin

### 7. Row Actions
- ✅ Sadece gerekli action'ları ekleyin (2-3 max)
- ✅ Danger action'lar için `variant="danger"` kullanın
- ✅ Icon'lar ekleyin (görsel netlik)
- ❌ Çok fazla action eklemeyin

---

## 🔄 Migration Guide

Mevcut table'ları modern component'lere geçirirken:

**Önce:**
```tsx
<table>
  <thead>
    <tr>
      <th>Ad</th>
      <th>Email</th>
    </tr>
  </thead>
  <tbody>
    {users.map((user) => (
      <tr>
        <td>{user.name}</td>
        <td>{user.email}</td>
      </tr>
    ))}
  </tbody>
</table>
```

**Sonra:**
```tsx
<Table>
  <TableHeader sticky>
    <TableRow>
      <TableHead>Ad</TableHead>
      <TableHead>Email</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {users.map((user) => (
      <TableRow key={user.id} hoverable>
        <TableCell>{user.name}</TableCell>
        <TableCell>{user.email}</TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

---

## 📚 Referanslar

- Design System: `frontend/src/lib/DESIGN_SYSTEM.md`
- Table Components: `frontend/src/components/ui/table.tsx`
- SortableTableHeader: `frontend/src/components/ui/SortableTableHeader.tsx`
- EmptyState: `frontend/src/components/ui/EmptyState.tsx`
- Pagination: `frontend/src/components/ui/Pagination.tsx`
- RowActionsMenu: `frontend/src/components/ui/RowActionsMenu.tsx`


