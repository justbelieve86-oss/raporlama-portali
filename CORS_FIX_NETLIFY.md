# 🔧 CORS Hatası Düzeltme - Netlify

Netlify'dan Render.com backend'ine istek yaparken CORS hatası alıyorsanız, bu rehberi takip edin.

## 🐛 Hata Mesajı

```
Access to XMLHttpRequest at 'https://raporlama-backend.onrender.com/auth/login' 
from origin 'https://691a24e1bb99593f16fb33ce--kardelen-portal.netlify.app' 
has been blocked by CORS policy: 
Response to preflight request doesn't pass access control check: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## ✅ Çözüm: Backend CORS Ayarlarını Güncelle

### Adım 1: Render.com Dashboard'a Git

1. [Render.com Dashboard](https://dashboard.render.com) → Login
2. Backend service'inizi seçin: `raporlama-backend`

### Adım 2: Environment Variables'ı Güncelle

1. **Environment** sekmesine tıklayın
2. **FRONTEND_URLS** environment variable'ını bulun veya **Add Environment Variable** ile ekleyin

### Adım 3: Netlify URL'lerini Ekle

**FRONTEND_URLS** değerine Netlify URL'lerinizi ekleyin (virgülle ayrılmış):

```
https://kardelen-portal.netlify.app,https://your-site.netlify.app
```

**Örnek:**
```
FRONTEND_URLS=https://kardelen-portal.netlify.app,https://raporlama-portali.netlify.app
```

**Not:** 
- Production URL'i ekleyin: `https://your-site.netlify.app`
- Preview URL'leri otomatik olarak desteklenir (pattern matching ile)
- Virgülle ayırın, boşluk bırakmayın

### Adım 4: Deploy

1. **Save changes** butonuna tıklayın
2. Render otomatik olarak yeniden deploy edecek (1-2 dakika)
3. Deploy tamamlandıktan sonra Netlify'dan tekrar deneyin

---

## 🔍 Alternatif: FRONTEND_URL Kullanımı

Eğer sadece tek bir Netlify URL'i kullanacaksanız:

1. **FRONTEND_URL** environment variable'ını ekleyin/güncelleyin
2. Değer: `https://your-site.netlify.app`
3. Save → Deploy

**Not:** `FRONTEND_URL` kullanırsanız, sadece o URL'e izin verilir. Preview URL'leri için `FRONTEND_URLS` kullanın.

---

## 🧪 Test Etme

### 1. Backend Health Check

```bash
curl https://raporlama-backend.onrender.com/api/health
```

Response: `{"status":"ok"}` ✅

### 2. CORS Test (Browser Console)

Netlify'dan açılan sayfada browser console'da:

```javascript
fetch('https://raporlama-backend.onrender.com/api/health', {
  method: 'GET',
  credentials: 'include'
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

Hata yoksa ✅

### 3. Login Test

Netlify'dan login sayfasında giriş yapmayı deneyin. CORS hatası olmamalı.

---

## 📝 Notlar

### Netlify Preview URL'leri

Backend'de Netlify preview URL'leri için pattern matching eklendi:
- Pattern: `https://{hash}--{site-name}.netlify.app`
- Örnek: `https://691a24e1bb99593f16fb33ce--kardelen-portal.netlify.app`

**Önemli:** `FRONTEND_URLS`'de herhangi bir `netlify.app` URL'i varsa, tüm Netlify preview URL'leri otomatik olarak izin verilir.

### Vercel URL'leri

Eğer hem Vercel hem Netlify kullanıyorsanız:

```
FRONTEND_URLS=https://your-site.vercel.app,https://your-site.netlify.app
```

---

## 🚨 Sorun Giderme

### Problem 1: Hala CORS Hatası

**Çözüm:**
1. Render.com'da deploy'un tamamlandığından emin olun
2. Browser cache'ini temizleyin (Ctrl+Shift+R veya Cmd+Shift+R)
3. Backend loglarını kontrol edin (Render Dashboard → Logs)

### Problem 2: Preview URL'leri Çalışmıyor

**Çözüm:**
1. `FRONTEND_URLS`'de `netlify.app` içeren bir URL olduğundan emin olun
2. Backend kodunun güncel olduğundan emin olun (pattern matching eklendi)

### Problem 3: Environment Variable Değişikliği Uygulanmadı

**Çözüm:**
1. Render Dashboard → **Manual Deploy** → **Deploy latest commit**
2. Veya GitHub'a push yapın (auto-deploy aktifse)

---

## ✅ Başarı Kontrolü

CORS hatası düzeltildikten sonra:

- ✅ Login sayfası açılıyor
- ✅ API istekleri başarılı
- ✅ CORS hatası yok (browser console'da)
- ✅ Authentication çalışıyor

---

## 📞 Yardım

- [Render.com Docs](https://render.com/docs)
- [CORS MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- Backend logları: Render Dashboard → Logs

