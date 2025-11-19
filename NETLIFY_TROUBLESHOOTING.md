# 🔧 Netlify Sorun Giderme Rehberi

Bu rehber, Netlify deployment'ında karşılaşılan yaygın sorunları ve çözümlerini içerir.

---

## 🐛 Yaygın Hatalar ve Çözümleri

### 1. Route Bulunamadı: `/auth/login`

**Hata Mesajı:**
```
Route bulunamadı: /auth/login
```

**Neden:**
- Frontend'de API endpoint'leri `/auth/login` olarak çağrılıyor
- Backend route'ları `/api/auth/login` formatında
- `PUBLIC_API_URL` environment variable'ı yanlış ayarlanmış olabilir

**Çözüm:**

#### Adım 1: Netlify Environment Variables Kontrolü

1. **Netlify Dashboard** → Site → **Site settings** → **Environment variables**
2. `PUBLIC_API_URL` değişkenini kontrol edin
3. Değer şu formatta olmalı: `https://your-backend.onrender.com/api` ⚠️ **Sonunda `/api` olmalı!**

**Doğru:**
```
PUBLIC_API_URL=https://raporlama-backend.onrender.com/api
```

**Yanlış:**
```
PUBLIC_API_URL=https://raporlama-backend.onrender.com
```

#### Adım 2: Frontend Route'larını Kontrol Et

Frontend'de API çağrıları `/api` prefix'i **olmadan** yapılmalı (baseURL zaten `/api` ile bitiyor):

**Doğru:**
```typescript
await api.post('/auth/login', { username, password });
```

**Yanlış:**
```typescript
await api.post('/api/auth/login', { username, password }); // Bu /api/api/auth/login olur!
```

#### Adım 3: Yeniden Deploy

1. Environment variable'ı düzelttikten sonra
2. **Deploys** → **Trigger deploy** → **Deploy site**
3. Build tamamlandıktan sonra test edin

---

### 2. CORS Hatası

**Hata Mesajı:**
```
Access to XMLHttpRequest at 'https://raporlama-backend.onrender.com/auth/login' 
from origin 'https://your-site.netlify.app' 
has been blocked by CORS policy
```

**Çözüm:** `CORS_FIX_NETLIFY.md` dosyasına bakın.

**Hızlı Çözüm:**
1. Render.com Dashboard → Backend service → **Environment**
2. `FRONTEND_URLS` ekleyin: `https://your-site.netlify.app`
3. Save → Deploy

---

### 3. Environment Variables Çalışmıyor

**Hata:** `PUBLIC_API_URL is undefined`

**Çözüm:**

1. **Netlify Dashboard** → **Site settings** → **Environment variables**
2. Değişkenlerin doğru eklendiğinden emin olun:
   - `PUBLIC_SUPABASE_URL`
   - `PUBLIC_SUPABASE_ANON_KEY`
   - `PUBLIC_API_URL` (sonunda `/api` olmalı!)
3. **Scope** ayarını kontrol edin (Production, Preview, Branch deploys)
4. Yeniden deploy yapın

**Not:** Astro'da environment variables `PUBLIC_` prefix'i ile başlamalı.

---

### 4. Build Başarısız

**Hata:** `Build failed: npm run build`

**Çözüm:**

1. **Deploys** → Build log'u kontrol edin
2. Genellikle dependency hatası olur
3. Local'de test edin:
   ```bash
   cd frontend
   npm install
   npm run build
   ```
4. Hata varsa düzeltin ve GitHub'a push edin

---

### 5. Site Açılmıyor (404)

**Hata:** Sayfa bulunamadı

**Çözüm:**

1. **Site settings** → **Build & deploy** → **Publish directory**
2. `dist` olduğundan emin olun (base directory `frontend` ise)
3. `netlify.toml` dosyasını kontrol edin:
   ```toml
   [build]
     publish = "dist"
   ```

---

### 6. API İstekleri Çalışmıyor

**Hata:** API istekleri başarısız veya CORS hatası

**Çözüm:**

1. `PUBLIC_API_URL` doğru mu? (sonunda `/api` olmalı)
2. Backend çalışıyor mu? (`https://your-backend.onrender.com/api/health`)
3. CORS ayarları doğru mu? (Render.com'da `FRONTEND_URLS`)
4. Browser console'da hata var mı?

---

## 🔍 Debug Adımları

### 1. Browser Console Kontrolü

1. Netlify'dan siteyi açın
2. **F12** → **Console** sekmesi
3. Hataları kontrol edin
4. **Network** sekmesinde API isteklerini kontrol edin

### 2. Environment Variables Kontrolü

Browser console'da:
```javascript
console.log('API URL:', import.meta.env.PUBLIC_API_URL);
```

Eğer `undefined` ise, Netlify'da environment variable eksik veya yanlış.

### 3. Backend Health Check

```bash
curl https://your-backend.onrender.com/api/health
```

Response: `{"status":"ok"}` olmalı.

---

## 📝 Checklist

- [ ] `PUBLIC_API_URL` Netlify'da doğru ayarlanmış (sonunda `/api`)
- [ ] `PUBLIC_SUPABASE_URL` Netlify'da ayarlanmış
- [ ] `PUBLIC_SUPABASE_ANON_KEY` Netlify'da ayarlanmış
- [ ] Backend'de `FRONTEND_URLS` ayarlanmış (Netlify URL'i)
- [ ] Build başarılı
- [ ] Site açılıyor
- [ ] API istekleri çalışıyor
- [ ] Login çalışıyor

---

## 🚨 Acil Durum Çözümleri

### Route Hatası Hızlı Düzeltme

1. **Netlify Dashboard** → **Environment variables**
2. `PUBLIC_API_URL` değerini kontrol et
3. Sonunda `/api` var mı? Yoksa ekle:
   ```
   https://raporlama-backend.onrender.com/api
   ```
4. **Trigger deploy** → **Deploy site**

### CORS Hatası Hızlı Düzeltme

1. **Render.com Dashboard** → Backend → **Environment**
2. `FRONTEND_URLS` ekle: `https://your-site.netlify.app`
3. Save → Render otomatik deploy edecek

---

## 📞 Yardım

- [Netlify Docs](https://docs.netlify.com)
- [Netlify Community](https://answers.netlify.com)
- [CORS_FIX_NETLIFY.md](./CORS_FIX_NETLIFY.md)
