# Raporlama Backend

Express.js ile Supabase Auth entegrasyonlu basit API.

## Geliştirme

1. `.env` dosyası oluşturun ve aşağıdaki anahtarları doldurun:

```
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_JWT_SECRET=...
PORT=4000
FRONTEND_URL=http://localhost:4321
# Birden fazla origin için virgülle ayrılmış liste kullanabilirsiniz:
# FRONTEND_URLS=http://localhost:4321,http://localhost:4322,https://app.example.com
```

> Not: `SERVICE_ROLE_KEY` sadece sunucuda kullanılmalıdır.
> Not: Lokal geliştirmede Astro dev portu 4322 olabilir; bu durumda `FRONTEND_URL=http://localhost:4322` olarak ayarlayın.
> Not: Production’da çoklu frontend domainleri varsa `FRONTEND_URLS` kullanın.

### Supabase Anahtarları Nereden Alınır?
- Supabase Dashboard → Project Settings → API
  - `SUPABASE_URL`: Project URL (ör. `https://xyzcompany.supabase.co`)
  - `SUPABASE_ANON_KEY`: anon public key (frontend için)
  - `SUPABASE_SERVICE_ROLE_KEY`: service role key (sadece backend)
  - `SUPABASE_JWT_SECRET`: JWT secret (opsiyonel, offline doğrulama ve bazı RLS senaryoları için)

2. Bağımlılıkları yükleyin ve çalıştırın:

```
npm install
npm run dev
```

## Endpointler

- `GET /api/health` — Sağlık kontrolü
- `GET /api/me` — Aktif kullanıcı (Authorization: Bearer <JWT>)
- `POST /api/admin/users` — Admin yetkisiyle yeni kullanıcı oluşturur

## Supabase Şema

`supabase/migrations/001_init.sql` dosyasındaki şemayı çalıştırın:

```
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','user')),
  created_at timestamp with time zone default timezone('utc'::text, now())
);
```

Admin ataması için ilgili kullanıcıya `profiles.role = 'admin'` verisi ekleyin.

### RLS ve Yetkiler
- `profiles` tablosunda RLS aktif; authenticated kullanıcılar `select` yapabilir.
- Insert işlemleri backend’de service role ile çalıştığı için RLS’yi bypass eder.

### Doğrulama Akışı
- Frontend kullanıcı girişinde Supabase JWT oluşturur.
- Axios interceptor JWT’yi `Authorization: Bearer <token>` olarak backend’e iletir.
- Backend, `supabase.auth.getUser(token)` ile token’ı doğrular ve `profiles.role` ile rolü belirler.