# 📊 Raporlama Portalı

Modern KPI raporlama ve yönetim sistemi. Astro + React frontend ve Express.js backend ile geliştirilmiş, Supabase veritabanı kullanan full-stack web uygulaması.

## 🚀 Özellikler

- **👥 Kullanıcı Yönetimi**: Admin ve kullanıcı rolleri ile yetkilendirme
- **🏢 Marka Yönetimi**: Çoklu marka desteği ve kullanıcı-marka ilişkileri
- **📈 KPI Yönetimi**: Performans göstergelerini tanımlama ve kategorilendirme
- **📊 Raporlama**: Aylık KPI değerleri girişi ve raporlama
- **🎯 Hedef Takibi**: KPI hedefleri belirleme ve takip etme
- **📱 Responsive Tasarım**: Mobil ve desktop uyumlu modern arayüz
- **🔒 Güvenlik**: JWT tabanlı kimlik doğrulama ve RLS güvenlik

## 🏗️ Teknoloji Stack

### Frontend
- **Framework**: Astro 5.x + React 18
- **Styling**: Tailwind CSS
- **State Management**: TanStack Query (React Query)
- **Charts**: Chart.js + React Chart.js 2
- **Deployment**: Vercel

### Backend
- **Runtime**: Node.js + Express.js
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth + JWT
- **Security**: Helmet, CORS, Rate Limiting
- **Deployment**: Render.com

## 📚 Dokümantasyon

### 🚀 Deployment Rehberleri
- **[Netlify Setup Guide](./NETLIFY_SETUP_GUIDE.md)** - Netlify deployment adımları
- **[Render CLI Deployment](./RENDER_CLI_DEPLOYMENT.md)** - Render.com backend deployment
- **[Deployment Alternatives](./DEPLOYMENT_ALTERNATIVES.md)** - Alternatif deployment seçenekleri

### 🔧 Sorun Giderme
- **[Netlify Troubleshooting](./NETLIFY_TROUBLESHOOTING.md)** - Netlify sorun giderme
- **[CORS Fix Guide](./CORS_FIX_NETLIFY.md)** - CORS hatası çözümü
- **[Backend Deploy Check](./BACKEND_DEPLOY_CHECK.md)** - Backend deploy kontrolü

### 💻 Geliştirme
- **[Development Recommendations](./DEVELOPMENT_RECOMMENDATIONS.md)** - Geliştirme önerileri
- **[Development Workflow](./DEVELOPMENT_WORKFLOW.md)** - Geliştirme workflow'u
- **[Daily KPI Dashboard Improvements](./DAILY_KPI_DASHBOARD_IMPROVEMENTS.md)** - Dashboard geliştirme notları

### 📖 Component Guides
- **[Testing Guide](./frontend/TESTING.md)** - Frontend test rehberi
- **[Design System](./frontend/src/lib/DESIGN_SYSTEM.md)** - Tasarım sistemi
- Component guides: `frontend/src/components/ui/*.md`

## 📁 Proje Yapısı

```
RaporlamaProject4/
├── backend/                 # Express.js API server
│   ├── src/
│   │   ├── routes/         # API route handlers
│   │   ├── middleware/     # Auth ve diğer middleware'ler
│   │   └── index.js        # Ana server dosyası
│   ├── .env.example        # Environment variables örneği
│   └── package.json
├── frontend/               # Astro + React frontend
│   ├── src/
│   │   ├── components/     # React bileşenleri
│   │   ├── pages/          # Astro sayfaları
│   │   ├── layouts/        # Sayfa layout'ları
│   │   ├── services/       # API servisleri
│   │   └── lib/            # Utility fonksiyonları
│   ├── .env.example        # Environment variables örneği
│   └── package.json
├── supabase/
│   └── migrations/         # Veritabanı migration dosyaları
└── scripts/                # Yardımcı scriptler
```

## 🛠️ Kurulum

### Ön Gereksinimler
- Node.js 18+ 
- npm veya yarn
- Supabase hesabı

### 1. Projeyi Klonlayın
```bash
git clone <repository-url>
cd RaporlamaProject4
```

### 2. Supabase Projesi Oluşturun
1. [Supabase Dashboard](https://supabase.com/dashboard)'a gidin
2. Yeni proje oluşturun
3. Project Settings > API'den gerekli anahtarları alın

### 3. Environment Variables Ayarlayın

#### Backend (.env)
```bash
cd backend
cp .env.example .env
# .env dosyasını düzenleyip Supabase bilgilerinizi girin
```

#### Frontend (.env)
```bash
cd frontend
cp .env.example .env
# .env dosyasını düzenleyip Supabase bilgilerinizi girin
```

### 4. Veritabanı Migration'larını Çalıştırın
```bash
# Supabase CLI ile migration'ları çalıştırın
# veya SQL dosyalarını manuel olarak Supabase Dashboard'da çalıştırın
```

#### Otomatik Uygulama (CI ve Lokal)

- CI otomasyonu: `.github/workflows/supabase-migrations.yml` eklendi.
  - `main` branşına push olduğunda `supabase db push` çalışır.
  - Gerekli GitHub Secrets:
    - `SUPABASE_ACCESS_TOKEN`: Supabase Access Token (Dashboard → Account → Access Tokens)
    - `SUPABASE_PROJECT_REF`: Proje referansı (Project Settings → General, URL: `https://<ref>.supabase.co`)

- Lokal otomasyon: `scripts/auto-db-push.sh`
  - Uzaktan push için ortam değişkenlerini set ederseniz otomatik link ve push dener:
    - `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`
  - Eğer uzaktan push mümkün değilse lokal Supabase dev ortamını başlatıp (`supabase start`) lokalde `db push` uygular.
  - Çalıştırma:
    ```
    bash scripts/auto-db-push.sh
    ```

Not: CI ile uzaktan push yapılması tavsiye edilir; lokal dev push, sadece yerel geliştirme/test için uygundur.

### 5. Bağımlılıkları Yükleyin ve Çalıştırın

#### Backend
```bash
cd backend
npm install
npm run dev
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

### 🔎 Hızlı Smoke Testler

Backend için:

```bash
cd backend
# Sağlık kontrolü
npm run smoke:health
# Login ve /me doğrulaması (env USERNAME/PASSWORD ile yapılandırılabilir)
npm run smoke:me
```

Frontend için:

```bash
cd frontend
# /login sayfasının SSR çıktısını doğrular
npm run smoke
```

Hepsini bir arada çalıştırmak için kök dizinde:

```bash
bash scripts/smoke-all.sh
```

Uygulama şu adreslerde çalışacak:
- Frontend: http://localhost:4321
- Backend API: http://localhost:4000

## 👤 İlk Admin Kullanıcısı Oluşturma

```bash
cd scripts
node create-admin.js
```

## 📚 API Dokümantasyonu

### Authentication Endpoints
- `POST /api/auth/login` - Kullanıcı girişi
- `GET /api/me` - Aktif kullanıcı bilgileri

### Admin Endpoints
- `GET /api/admin/users` - Kullanıcıları listele
- `POST /api/admin/users` - Yeni kullanıcı oluştur
- `PUT /api/admin/users/:id` - Kullanıcı güncelle
- `DELETE /api/admin/users/:id` - Kullanıcı sil

### Brand Endpoints
- `GET /api/brands` - Markalar listesi
- `POST /api/admin/brands` - Yeni marka oluştur
- `PUT /api/admin/brands/:id` - Marka güncelle
- `DELETE /api/admin/brands/:id` - Marka sil

### KPI Endpoints
- `GET /api/kpis` - KPI'lar listesi
- `POST /api/admin/kpis` - Yeni KPI oluştur
- `PUT /api/admin/kpis/:id` - KPI güncelle
- `DELETE /api/admin/kpis/:id` - KPI sil

## 🔒 Güvenlik

- JWT tabanlı kimlik doğrulama
- Row Level Security (RLS) ile veri güvenliği
- Rate limiting ile brute force koruması
- CORS yapılandırması
- Input validation ve sanitization
- Helmet.js ile güvenlik başlıkları

## 🚀 Deployment

### Backend (Render.com)
1. Render.com'da yeni web service oluşturun
2. GitHub repository'nizi bağlayın
3. Environment variables'ları ayarlayın
4. Deploy edin

### Frontend (Vercel)
1. Vercel'e GitHub repository'nizi bağlayın
2. Environment variables'ları ayarlayın
3. Deploy edin

## 🧪 Testing

```bash
# Backend testleri
cd backend
npm test

# Frontend testleri
cd frontend
npm test
```

## 📈 Performans

- React Query ile akıllı caching
- Lazy loading ile kod bölme
- Image optimization
- Bundle size optimization
- Database query optimization

## 🤝 Katkıda Bulunma

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit edin (`git commit -m 'Add amazing feature'`)
4. Push edin (`git push origin feature/amazing-feature`)
5. Pull Request oluşturun

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

## 🆘 Destek

Sorularınız için:
- GitHub Issues
- Email: [email@example.com]
- Dokümantasyon: [docs-url]

## 🔄 Changelog

### v0.1.0 (Mevcut)
- İlk sürüm
- Temel KPI yönetimi
- Kullanıcı ve marka yönetimi
- Raporlama sistemi

## 🎯 Roadmap

- [ ] Advanced analytics dashboard
- [ ] Export/Import functionality
- [ ] Mobile app
- [ ] Real-time notifications
- [ ] Advanced reporting features
- [ ] Multi-language support