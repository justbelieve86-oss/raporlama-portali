# 🧪 Test Dokümantasyonu

Bu doküman, projenin test yapısını ve test yazma rehberini açıklar.

## 📋 Test Yapısı

### Test Türleri

1. **Unit Tests** (`*.test.ts`, `*.test.tsx`)
   - Component testleri (React Testing Library)
   - Utility function testleri
   - Hook testleri

2. **Integration Tests** (`*.integration.test.ts`)
   - API service testleri
   - Component + API integration testleri

3. **E2E Tests** (`e2e/*.spec.ts`)
   - Playwright ile end-to-end testler
   - Kullanıcı akışları testleri

## 🚀 Test Komutları

```bash
# Tüm testleri çalıştır
npm run test

# Watch mode'da testleri çalıştır
npm run test:watch

# Coverage raporu ile testleri çalıştır
npm run test:coverage

# Vitest UI ile testleri çalıştır
npm run test:ui

# E2E testleri çalıştır
npm run test:e2e

# E2E testleri UI mode'da çalıştır
npm run test:e2e:ui

# E2E testleri headed mode'da çalıştır (browser görünür)
npm run test:e2e:headed
```

## 📊 Coverage Hedefleri

- **Lines**: %80+
- **Functions**: %80+
- **Branches**: %75+
- **Statements**: %80+

Coverage raporu `frontend/coverage/` klasöründe oluşturulur.

## 📝 Test Yazma Rehberi

### Component Testleri

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MyComponent } from '../MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent prop="value" />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  it('handles user interactions', async () => {
    const user = userEvent.setup();
    render(<MyComponent />);
    
    await user.click(screen.getByRole('button'));
    // Assertions...
  });
});
```

### API Service Testleri

```typescript
import { describe, it, expect, vi } from 'vitest';
import * as apiModule from '../../lib/axiosClient';
import { getBrands } from '../../services/api';

describe('getBrands', () => {
  it('returns brands from API', async () => {
    const spy = vi.spyOn(apiModule.api, 'get').mockResolvedValue({
      data: { success: true, data: { items: [{ id: '1', name: 'Brand' }] } },
    } as any);
    
    const result = await getBrands();
    expect(result).toEqual([{ id: '1', name: 'Brand' }]);
    spy.mockRestore();
  });
});
```

### E2E Testleri

```typescript
import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test('should login successfully', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[placeholder*="email"]', 'test@example.com');
    await page.fill('[placeholder*="şifre"]', 'password123');
    await page.click('button:has-text("Giriş Yap")');
    
    await expect(page).toHaveURL(/\/user/);
  });
});
```

## 🛠️ Test Setup

Test setup dosyası `src/test/setup.ts` içinde tanımlanmıştır:
- `@testing-library/jest-dom` matchers
- Window API mocks (matchMedia, IntersectionObserver, ResizeObserver)
- Test cleanup

## 📁 Test Dosya Yapısı

```
frontend/
├── src/
│   ├── components/
│   │   └── ui/
│   │       └── __tests__/
│   │           ├── button.test.tsx
│   │           ├── FloatingLabelInput.test.tsx
│   │           └── PasswordStrengthIndicator.test.tsx
│   ├── services/
│   │   └── __tests__/
│   │       ├── api.test.ts
│   │       └── api.integration.test.ts
│   └── test/
│       └── setup.ts
├── e2e/
│   ├── login.spec.ts
│   └── daily-kpi-dashboard.spec.ts
├── vitest.config.ts
└── playwright.config.ts
```

## 🔧 CI/CD Integration

GitHub Actions workflow (`.github/workflows/test.yml`) otomatik olarak:
- Linter çalıştırır
- Type check yapar
- Unit testleri çalıştırır
- Coverage raporu oluşturur
- E2E testleri çalıştırır

## 📚 Best Practices

1. **Test İsimlendirme**: Açıklayıcı test isimleri kullan
2. **AAA Pattern**: Arrange, Act, Assert
3. **Mock Kullanımı**: External dependencies'i mock'la
4. **Cleanup**: Her test'ten sonra cleanup yap
5. **Isolation**: Testler birbirinden bağımsız olmalı
6. **Coverage**: Kritik fonksiyonlar için %100 coverage hedefle

## 🐛 Debugging

### Vitest Debug

```bash
# UI mode'da testleri çalıştır
npm run test:ui
```

### Playwright Debug

```bash
# Headed mode'da testleri çalıştır
npm run test:e2e:headed

# UI mode'da testleri çalıştır
npm run test:e2e:ui
```

## 📖 Kaynaklar

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Playwright Documentation](https://playwright.dev/)

