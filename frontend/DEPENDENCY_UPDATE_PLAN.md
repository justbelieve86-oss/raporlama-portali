# Frontend Dependency Update Plan

## ✅ Completed Updates (Safe - Patch/Minor)

- ✅ `@astrojs/react`: 4.4.1 → 4.4.2 (patch)
- ✅ `@supabase/supabase-js`: 2.79.0 → 2.83.0 (minor)
- ✅ `@tailwindcss/postcss`: 4.1.16 → 4.1.17 (patch)
- ✅ `@tailwindcss/vite`: 4.1.16 → 4.1.17 (patch)
- ✅ `@tanstack/react-query`: 5.90.7 → 5.90.10 (patch)
- ✅ `@typescript-eslint/eslint-plugin`: 8.46.3 → 8.47.0 (patch)
- ✅ `@typescript-eslint/parser`: 8.46.3 → 8.47.0 (patch)
- ✅ `astro`: 5.15.3 → 5.15.9 (patch)
- ✅ `autoprefixer`: 10.4.21 → 10.4.22 (patch)
- ✅ `react-window`: 2.2.2 → 2.2.3 (patch)
- ✅ `tailwindcss`: 4.1.16 → 4.1.17 (patch)

## ⚠️ Pending Major Updates (Requires Breaking Changes Review)

### 1. @astrojs/vercel 9.0.1 (from 8.0.4)
**Breaking Changes:**
- Vercel deployment configuration changes
- Build output changes
- Edge runtime changes

**Migration Steps:**
1. Review @astrojs/vercel 9.x migration guide
2. Update vercel.json configuration if needed
3. Test Vercel deployment
4. Verify build output

**Risk Level:** 🟡 Medium (Deployment adapter)

### 2. Vitest 4.0.10 (from 2.1.9)
**Breaking Changes:**
- Test API changes
- Configuration changes
- Coverage API changes
- Snapshot format changes

**Migration Steps:**
1. Review Vitest 4.x migration guide
2. Update vitest.config.ts
3. Update test files if needed
4. Update @vitest/coverage-v8 to 4.x (must match vitest version)
5. Run all tests
6. Update test snapshots if any

**Risk Level:** 🟡 Medium (Test framework)

### 3. @vitest/coverage-v8 4.0.10 (from 2.1.9)
**Breaking Changes:**
- Must match Vitest version
- Coverage API changes

**Migration Steps:**
1. Update after Vitest 4.x migration
2. Update coverage configuration if needed
3. Test coverage reports

**Risk Level:** 🟡 Medium (Test coverage, depends on Vitest 4)

### 4. jsdom 27.2.0 (from 25.0.1)
**Breaking Changes:**
- DOM API changes
- Node.js version requirements
- Test environment changes

**Migration Steps:**
1. Review jsdom 27.x migration guide
2. Check Node.js version compatibility
3. Update test setup if needed
4. Run all tests

**Risk Level:** 🟡 Medium (Test environment)

### 5. globals 16.5.0 (from 15.15.0)
**Breaking Changes:**
- ESLint configuration changes
- Global variable definitions changes

**Migration Steps:**
1. Review globals 16.x migration guide
2. Update ESLint configuration if needed
3. Run linting

**Risk Level:** 🟢 Low (ESLint configuration)

## Recommended Update Strategy

### Phase 1: Low Risk Updates (Immediate)
- ✅ Completed: All patch/minor updates

### Phase 2: Medium Risk Updates (After Testing)
1. Update globals 16.x (ESLint config, easier to rollback)
2. Update jsdom 27.x (test environment)
3. Update Vitest 4.x + @vitest/coverage-v8 4.x (test framework, together)
4. Update @astrojs/vercel 9.x (deployment adapter)

## Testing Checklist

After each update:
- [ ] Run `npm test` - All tests pass
- [ ] Run `npm run lint` - No linting errors
- [ ] Run `npm run typecheck` - No TypeScript errors
- [ ] Run `npm run test:coverage` - Coverage maintained
- [ ] Run `npm run build` - Build succeeds
- [ ] Manual smoke tests:
  - [ ] Application starts
  - [ ] Pages load correctly
  - [ ] React components work
  - [ ] API calls work
  - [ ] Authentication works

## Notes

- All major updates should be done in a separate branch
- Test thoroughly before merging
- Keep backup of package.json and package-lock.json
- Consider staging environment testing before production
- Vitest and @vitest/coverage-v8 must be updated together (same major version)
- jsdom update may require Node.js version check

## Special Considerations

### Vitest 4.x Migration
- Vitest 4.x has significant API changes
- Coverage configuration may need updates
- Test files may need updates for new APIs
- Snapshot format may change

### @astrojs/vercel 9.x Migration
- Vercel deployment configuration may change
- Build output structure may change
- Edge runtime configuration may change
- Review Vercel documentation for breaking changes

### jsdom 27.x Migration
- Requires Node.js 18+ (check current version)
- DOM API changes may affect tests
- Test environment setup may need updates

