# 🚀 Deployment Alternatifleri - Ücretsiz Platformlar

Vercel dışında kullanılabilecek ücretsiz deployment platformları.

## 📊 Karşılaştırma Tablosu

| Platform | Frontend | Backend | Ücretsiz Limit | Sleep | Önerilen |
|----------|----------|---------|----------------|-------|----------|
| **Netlify** | ✅ Mükemmel | ⚠️ Functions | 100 GB/ay | ❌ | ⭐⭐⭐⭐⭐ |
| **Cloudflare Pages** | ✅ Mükemmel | ⚠️ Workers | Sınırsız | ❌ | ⭐⭐⭐⭐⭐ |
| **GitHub Pages** | ✅ İyi | ❌ | 1 GB storage | ❌ | ⭐⭐⭐ |
| **Railway** | ✅ İyi | ✅ İyi | $5 kredi/ay | ❌ | ⭐⭐⭐⭐ |
| **Render** | ✅ İyi | ✅ İyi | 750 saat/ay | ⚠️ 15dk | ⭐⭐⭐⭐ |
| **Fly.io** | ⚠️ | ✅ İyi | 3 VM | ❌ | ⭐⭐⭐⭐ |
| **Cyclic.sh** | ⚠️ | ✅ İyi | Sınırsız | ⚠️ | ⭐⭐⭐ |

---

## 🎨 Frontend Deployment (Astro + React)

### 1. Netlify ⭐ ÖNERİLEN

**Avantajlar:**
- ✅ Astro için mükemmel destek
- ✅ Otomatik algılama
- ✅ Preview deployments
- ✅ Form handling
- ✅ Edge functions
- ✅ 100 GB bandwidth/ay (yeterli)

**Kurulum:**
1. [Netlify Dashboard](https://app.netlify.com) → Add new site → Import from Git
2. GitHub repo seç
3. Build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Root directory: `frontend`
4. Environment variables ekle
5. Deploy!

**netlify.toml** zaten oluşturuldu ✅

---

### 2. Cloudflare Pages ⭐ HIZLI

**Avantajlar:**
- ✅ Sınırsız bandwidth
- ✅ Global CDN (çok hızlı)
- ✅ Ücretsiz SSL
- ✅ 500 build/ay (yeterli)
- ✅ Astro desteği

**Kurulum:**
1. [Cloudflare Dashboard](https://dash.cloudflare.com) → Pages
2. Create a project → Connect to Git
3. GitHub repo seç
4. Build settings:
   - Framework preset: Astro
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Root directory: `frontend`
5. Environment variables ekle
6. Deploy!

---

### 3. GitHub Pages

**Avantajlar:**
- ✅ Tamamen ücretsiz
- ✅ GitHub ile entegre
- ✅ Basit kurulum

**Dezavantajlar:**
- ⚠️ Static export gerekir (Astro için `output: 'static'`)
- ⚠️ 1 GB storage limiti
- ⚠️ 100 GB bandwidth/ay

**Kurulum:**
1. `astro.config.mjs` güncelle:
   ```js
   export default defineConfig({
     output: 'static', // Server-side rendering yok
   });
   ```
2. GitHub Actions workflow oluştur
3. Deploy!

---

## ⚙️ Backend Deployment (Node.js + Express)

### 1. Render.com (Mevcut) ✅

**Durum:** Zaten kullanılıyor

**Avantajlar:**
- ✅ 750 saat/ay ücretsiz
- ✅ Otomatik SSL
- ✅ GitHub entegrasyonu
- ✅ Kolay kurulum

**Dezavantajlar:**
- ⚠️ 15 dakika idle sonrası sleep (ilk istek yavaş)

---

### 2. Railway ⭐ ÖNERİLEN

**Avantajlar:**
- ✅ Sleep yok (her zaman aktif)
- ✅ $5 kredi/ay (yaklaşık 500 saat)
- ✅ Hızlı deployment
- ✅ Kolay kurulum

**Kurulum:**
1. [Railway.app](https://railway.app) → New Project
2. Deploy from GitHub repo
3. Root directory: `backend`
4. Environment variables ekle
5. Deploy!

**railway.json** oluşturulabilir (opsiyonel)

---

### 3. Fly.io

**Avantajlar:**
- ✅ Sleep yok
- ✅ Global deployment
- ✅ 3 shared-cpu VM ücretsiz
- ✅ 3 GB storage

**Kurulum:**
1. [Fly.io](https://fly.io) → Sign up
2. `flyctl` CLI kurulumu
3. `fly launch` komutu
4. Deploy!

---

### 4. Cyclic.sh

**Avantajlar:**
- ✅ Sınırsız ücretsiz
- ✅ Serverless
- ✅ Otomatik scaling
- ✅ Sleep var ama hızlı wake

**Kurulum:**
1. [Cyclic.sh](https://cyclic.sh) → New App
2. GitHub repo bağla
3. Root directory: `backend`
4. Environment variables ekle
5. Deploy!

---

## 🎯 Önerilen Kombinasyonlar

### Kombinasyon 1: Netlify + Render (Önerilen)
- **Frontend:** Netlify (Astro için mükemmel)
- **Backend:** Render (zaten kullanılıyor)
- **Avantaj:** Her ikisi de ücretsiz, kolay kurulum

### Kombinasyon 2: Cloudflare Pages + Railway
- **Frontend:** Cloudflare Pages (sınırsız, hızlı)
- **Backend:** Railway (sleep yok)
- **Avantaj:** Her ikisi de sleep yok, hızlı

### Kombinasyon 3: GitHub Pages + Fly.io
- **Frontend:** GitHub Pages (basit, ücretsiz)
- **Backend:** Fly.io (global, sleep yok)
- **Avantaj:** Tamamen ücretsiz, global

---

## 📝 Hızlı Başlangıç: Netlify (Frontend)

### Adım 1: Netlify'da Site Oluştur

1. [Netlify Dashboard](https://app.netlify.com) → Sign up/Login
2. **Add new site** → **Import an existing project**
3. **Deploy with GitHub** → Repository seç: `justbelieve86-oss/raporlama-portali`
4. **Configure build:**
   - Base directory: `frontend`
   - Build command: `npm run build`
   - Publish directory: `frontend/dist`

### Adım 2: Environment Variables

Netlify Dashboard → Site settings → Environment variables:

```
PUBLIC_SUPABASE_URL=https://xxx.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJ...
PUBLIC_API_URL=https://your-backend.onrender.com/api
```

### Adım 3: Deploy

- **Deploy site** butonuna tıkla
- Build başarılı olunca URL alınır: `https://your-site.netlify.app`

### Adım 4: Custom Domain (Opsiyonel)

- Site settings → Domain management
- Custom domain ekle

---

## 🔄 Vercel'den Netlify'a Geçiş

### 1. Netlify'da Site Oluştur (yukarıdaki adımlar)

### 2. Environment Variables'ı Kopyala

Vercel'den Netlify'a aynı environment variables'ları ekle

### 3. DNS Ayarları (Custom domain varsa)

- Vercel'den domain'i kaldır
- Netlify'a domain ekle
- DNS kayıtlarını güncelle

### 4. Vercel'i Devre Dışı Bırak (Opsiyonel)

- Vercel Dashboard → Project settings → Danger zone → Delete project

---

## 📊 Limit Karşılaştırması

| Platform | Build/Deploy Limit | Bandwidth | Sleep | Önerilen Kullanım |
|----------|-------------------|-----------|-------|-------------------|
| **Vercel** | 100/gün | 100 GB/ay | ❌ | ⚠️ Limit aşıldı |
| **Netlify** | 300 dk/gün | 100 GB/ay | ❌ | ✅ Frontend için ideal |
| **Cloudflare** | 500/ay | Sınırsız | ❌ | ✅ Yüksek trafik için |
| **GitHub Pages** | Sınırsız | 100 GB/ay | ❌ | ✅ Basit projeler için |

---

## 🚀 Hemen Başla

**En hızlı çözüm:** Netlify (Frontend)

1. `frontend/netlify.toml` zaten oluşturuldu ✅
2. Netlify Dashboard'a git
3. GitHub repo'yu bağla
4. Deploy!

**Backend:** Render zaten çalışıyor ✅

---

## 📚 Daha Fazla Bilgi

- [Netlify Docs](https://docs.netlify.com)
- [Cloudflare Pages Docs](https://developers.cloudflare.com/pages)
- [Railway Docs](https://docs.railway.app)
- [Fly.io Docs](https://fly.io/docs)

