# Railway Deployment Guide

Bu dokümantasyon, Raporlama Projesi'nin Railway üzerinden deploy edilmesi için gerekli adımları içerir.

## 📋 Genel Bakış

Proje iki ayrı servis olarak deploy edilmelidir:
- **Backend**: Node.js/Express API
- **Frontend**: Astro/React uygulaması

## 🚀 Backend Deployment

### 1. Railway'de Yeni Proje Oluşturma

1. [Railway](https://railway.app) hesabınıza giriş yapın
2. "New Project" butonuna tıklayın
3. "Deploy from GitHub repo" seçeneğini seçin
4. Repository'yi seçin
5. "Add Service" → "GitHub Repo" seçin
6. Backend klasörünü seçin veya root directory olarak `backend` belirtin

### 2. Environment Variables (Backend)

Railway dashboard'da "Variables" sekmesine gidin ve şu değişkenleri ekleyin:

```bash
# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SUPABASE_JWT_SECRET=...

# Frontend URL (Railway'den alınacak frontend URL'i)
FRONTEND_URL=https://your-frontend-app.railway.app
# VEYA çoklu origin için:
FRONTEND_URLS=https://your-frontend-app.railway.app,http://localhost:4321

# Server
PORT=4000
NODE_ENV=production
```

### 3. Build Settings (Backend)

Railway otomatik olarak `backend/Procfile` dosyasını kullanacaktır.

**Root Directory**: `backend`

**Build Command**: (Otomatik - npm install)

**Start Command**: (Otomatik - Procfile'dan alınır)

### 4. Port Ayarları

Railway otomatik olarak `PORT` environment variable'ını sağlar. Backend kodu bunu kullanmalıdır.

## 🎨 Frontend Deployment

### 1. Railway'de Yeni Service Oluşturma

1. Aynı Railway projesinde "New Service" → "GitHub Repo" seçin
2. Aynı repository'yi seçin
3. Root directory olarak `frontend` belirtin

### 2. Environment Variables (Frontend)

```bash
# Supabase (Sadece Anon Key!)
PUBLIC_SUPABASE_URL=https://xxx.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Backend API URL (Railway'den alınacak backend URL'i)
PUBLIC_API_URL=https://your-backend-app.railway.app/api

# Build
NODE_ENV=production
```

**ÖNEMLİ**: Frontend'de ASLA `SUPABASE_SERVICE_ROLE_KEY` kullanmayın!

### 3. Build Settings (Frontend)

**Root Directory**: `frontend`

**Build Command**: `npm run build`

**Start Command**: `npm run preview -- --port $PORT --host 0.0.0.0`

**Output Directory**: `frontend/dist`

### 4. Port Ayarları

Frontend `Procfile` dosyası `$PORT` environment variable'ını kullanır.

## 🔗 Service Bağlantıları

### Backend → Frontend URL

Backend'in `FRONTEND_URL` veya `FRONTEND_URLS` environment variable'ına frontend'in Railway URL'ini ekleyin.

### Frontend → Backend URL

Frontend'in `PUBLIC_API_URL` environment variable'ına backend'in Railway URL'ini ekleyin.

## 📝 Deployment Checklist

### Backend
- [ ] Railway'de backend service oluşturuldu
- [ ] GitHub repository bağlandı
- [ ] Root directory: `backend` ayarlandı
- [ ] Environment variables eklendi
- [ ] Port ayarları kontrol edildi
- [ ] Build başarılı
- [ ] Health check endpoint çalışıyor (`/api/health`)

### Frontend
- [ ] Railway'de frontend service oluşturuldu
- [ ] GitHub repository bağlandı
- [ ] Root directory: `frontend` ayarlandı
- [ ] Build command: `npm run build` ayarlandı
- [ ] Start command: `npm run preview -- --port $PORT --host 0.0.0.0` ayarlandı
- [ ] Environment variables eklendi
- [ ] Backend URL'i `PUBLIC_API_URL`'e eklendi
- [ ] Build başarılı
- [ ] Frontend erişilebilir

### Genel
- [ ] CORS ayarları kontrol edildi
- [ ] Environment variables doğru
- [ ] Her iki service de çalışıyor
- [ ] Frontend backend'e bağlanabiliyor
- [ ] Authentication çalışıyor

## 🔍 Troubleshooting

### Backend Build Hatası
- `package.json` dosyasının doğru olduğundan emin olun
- `Procfile` dosyasının `backend/` klasöründe olduğunu kontrol edin
- Environment variables'ın doğru olduğunu kontrol edin

### Frontend Build Hatası
- Astro build'in başarılı olduğundan emin olun
- `PUBLIC_*` prefix'li environment variables'ın doğru olduğunu kontrol edin
- Port ayarlarının doğru olduğunu kontrol edin

### CORS Hatası
- Backend'de `FRONTEND_URL` veya `FRONTEND_URLS`'in doğru olduğunu kontrol edin
- Frontend URL'inin tam olarak eşleştiğini kontrol edin (http vs https, trailing slash, vb.)

### Database Bağlantı Hatası
- Supabase environment variables'ın doğru olduğunu kontrol edin
- Supabase projesinin aktif olduğunu kontrol edin
- RLS (Row Level Security) politikalarını kontrol edin

## 📚 Ek Kaynaklar

- [Railway Documentation](https://docs.railway.app)
- [Astro Deployment](https://docs.astro.build/en/guides/deploy/)
- [Node.js Deployment](https://docs.railway.app/guides/nodejs)

