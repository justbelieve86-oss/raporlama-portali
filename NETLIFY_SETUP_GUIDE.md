# 🚀 Netlify Kurulum Rehberi - Adım Adım

Bu rehber, frontend projesini Netlify'a deploy etmek için detaylı adımları içerir.

---

## 📋 Ön Hazırlık

### Gereksinimler
- ✅ GitHub repository hazır: `justbelieve86-oss/raporlama-portali`
- ✅ Frontend build başarılı (`npm run build`)
- ✅ Backend URL hazır (Render.com'dan)
- ✅ Supabase bilgileri hazır

---

## 🔐 Adım 1: Netlify Hesabı Oluşturma

### 1.1. Netlify'a Kayıt Ol

1. [Netlify.com](https://www.netlify.com) → **Sign up**
2. **GitHub ile giriş yap** (önerilen) veya email ile kayıt ol
3. GitHub hesabınızı bağlayın (gerekirse)

**Not:** GitHub ile giriş yapmak deployment'ı kolaylaştırır.

---

## 📦 Adım 2: Yeni Site Oluşturma

### 2.1. Site Oluşturma

1. Netlify Dashboard → **Add new site** (sağ üst köşe)
2. **Import an existing project** seç
3. **Deploy with GitHub** butonuna tıkla
4. GitHub hesabınızı bağlayın (ilk kez ise)
5. Repository seç: `justbelieve86-oss/raporlama-portali`

### 2.2. Build Ayarları

Netlify otomatik olarak Astro'yu algılayacak, ancak ayarları kontrol edin:

**Branch to deploy:** `main` (veya `master`)

**Basic build settings:**
- **Base directory:** `frontend` ⚠️ ÖNEMLİ!
- **Build command:** `npm run build` (otomatik)
- **Publish directory:** `frontend/dist` (otomatik)

**Not:** Base directory'yi `frontend` olarak ayarlamak çok önemli!

### 2.3. Deploy Butonu

- **Deploy site** butonuna tıkla
- İlk build başlayacak (2-3 dakika sürebilir)

---

## 🔧 Adım 3: Environment Variables Ekleme

### 3.1. Environment Variables Sayfasına Git

1. Site deploy olduktan sonra → **Site settings** (üst menü)
2. **Environment variables** → **Add a variable**

### 3.2. Gerekli Environment Variables

Aşağıdaki değişkenleri ekleyin:

#### Supabase Bilgileri
```
PUBLIC_SUPABASE_URL
https://YOUR_PROJECT_REF.supabase.co
```

```
PUBLIC_SUPABASE_ANON_KEY
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Backend API URL
```
PUBLIC_API_URL
https://raporlama-backend.onrender.com/api
```

**⚠️ ÖNEMLİ:** 
- URL'in sonunda `/api` olmalı!
- Doğru: `https://raporlama-backend.onrender.com/api`
- Yanlış: `https://raporlama-backend.onrender.com`
- Frontend'de API çağrıları `/api` prefix'i olmadan yapılır (örn: `/auth/login`, `/me`, `/brands`) (eksik `/api`)

**Not:** Backend URL'ini Render.com'dan alın. Eğer henüz deploy edilmediyse, deploy ettikten sonra güncelleyin.

### 3.3. ⚠️ ÖNEMLİ: Backend CORS Ayarları

Netlify deploy olduktan sonra, **Backend'de (Render.com) CORS ayarlarını güncellemeniz gerekiyor:**

1. **Render.com Dashboard** → Backend service → **Environment**
2. **FRONTEND_URLS** environment variable'ını bulun veya ekleyin
3. Değer olarak Netlify URL'lerinizi ekleyin (virgülle ayrılmış):
   ```
   https://your-site.netlify.app,https://kardelen-portal.netlify.app
   ```
   
   **Not:** Netlify preview URL'leri otomatik olarak desteklenir (pattern matching ile).
   
4. **Save changes** → Render otomatik olarak yeniden deploy edecek

**Alternatif:** Eğer sadece production URL'i eklemek istiyorsanız:
```
FRONTEND_URL
https://your-site.netlify.app
```

### 3.3. Environment Variables Ekleme

Her bir değişken için:
1. **Key** alanına değişken adını yazın (örn: `PUBLIC_SUPABASE_URL`)
2. **Value** alanına değeri yazın
3. **Add variable** butonuna tıklayın

**Örnek:**
```
Key: PUBLIC_SUPABASE_URL
Value: https://abcdefghijklmnop.supabase.co
```

### 3.4. Scope (Kapsam) Ayarları

- **All scopes** seçili bırakın (production, preview, branch deploys için geçerli)
- Veya sadece **Production** seçebilirsiniz

---

## 🔄 Adım 4: Yeniden Deploy

### 4.1. Environment Variables Sonrası

Environment variables ekledikten sonra:
1. **Deploys** sekmesine gidin
2. **Trigger deploy** → **Deploy site** butonuna tıklayın
3. Build yeniden başlayacak (environment variables ile)

**Not:** İlk deploy environment variables olmadan yapıldıysa, yeniden deploy gerekir.

---

## ✅ Adım 5: Deploy Kontrolü

### 5.1. Build Durumunu Kontrol Et

1. **Deploys** sekmesinde build durumunu görün
2. **Building** → **Published** olana kadar bekleyin
3. Yeşil tik işareti görününce deploy başarılı ✅

### 5.2. Site URL'ini Kontrol Et

1. Deploy başarılı olduktan sonra:
   - **Site overview** → **Domain** bölümünde URL görünür
   - Örnek: `https://raporlama-portali-12345.netlify.app`
2. URL'ye tıklayarak siteyi açın
3. Site çalışıyor mu kontrol edin

### 5.3. Hata Kontrolü

Eğer site açılmıyorsa:
1. **Deploys** → En son deploy → **View build log**
2. Hata mesajlarını kontrol edin
3. Genellikle environment variables eksikliği veya build hatası olur

---

## 🌐 Adım 6: Custom Domain (Opsiyonel)

### 6.1. Custom Domain Ekleme

1. **Site settings** → **Domain management**
2. **Add custom domain** butonuna tıklayın
3. Domain adınızı girin (örn: `raporlama.example.com`)
4. **Verify** butonuna tıklayın

### 6.2. DNS Ayarları

Netlify size DNS kayıtlarını gösterecek:
- **A record** veya **CNAME record** eklemeniz gerekecek
- Domain sağlayıcınızın (GoDaddy, Namecheap, vb.) DNS ayarlarından ekleyin

### 6.3. SSL Sertifikası

- Netlify otomatik olarak SSL sertifikası sağlar (Let's Encrypt)
- Birkaç dakika içinde aktif olur

---

## 🔄 Adım 7: Otomatik Deploy Ayarları

### 7.1. Auto Deploy Kontrolü

1. **Site settings** → **Build & deploy** → **Continuous Deployment**
2. **Deploy settings** kontrol edin:
   - ✅ **Auto publish** aktif olmalı
   - ✅ **Branch to deploy:** `main`

### 7.2. Build Hooks (Opsiyonel)

Manuel deploy için:
1. **Site settings** → **Build & deploy** → **Build hooks**
2. **Add build hook** → İsim verin
3. URL'yi kopyalayın (CI/CD için kullanılabilir)

---

## 🐛 Sorun Giderme

### Problem 1: Build Başarısız

**Hata:** `Build failed: npm run build`

**Çözüm:**
1. **Deploys** → Build log'u kontrol edin
2. Genellikle dependency hatası olur
3. `package.json` ve `package-lock.json` dosyalarının güncel olduğundan emin olun
4. Local'de `npm run build` çalıştırıp test edin

### Problem 2: Environment Variables Çalışmıyor

**Hata:** `PUBLIC_SUPABASE_URL is undefined`

**Çözüm:**
1. Environment variables'ın doğru eklendiğinden emin olun
2. `PUBLIC_` prefix'i olmalı (Astro için gerekli)
3. Yeniden deploy yapın (environment variables sonrası)

### Problem 3: Site Açılmıyor (404)

**Hata:** Sayfa bulunamadı

**Çözüm:**
1. **Site settings** → **Build & deploy** → **Publish directory**
2. `frontend/dist` olduğundan emin olun
3. `netlify.toml` dosyasının doğru olduğunu kontrol edin

### Problem 4: API İstekleri Çalışmıyor

**Hata:** CORS hatası veya API istekleri başarısız

**Çözüm:**
1. `PUBLIC_API_URL` environment variable'ının doğru olduğundan emin olun
2. Backend'de CORS ayarlarını kontrol edin (Render.com'da)
3. Backend'in `FRONTEND_URL` environment variable'ında Netlify URL'ini ekleyin

---

## 📊 Adım 8: Performans ve Analytics (Opsiyonel)

### 8.1. Netlify Analytics

1. **Site settings** → **Analytics**
2. **Enable Analytics** (ücretsiz plan için sınırlı)
3. Site trafiğini görüntüleyin

### 8.2. Build Notifications

1. **Site settings** → **Build & deploy** → **Deploy notifications**
2. Email veya Slack bildirimleri ekleyin
3. Her deploy'da bildirim alın

---

## 🔐 Adım 9: Güvenlik Ayarları

### 9.1. Headers Kontrolü

`netlify.toml` dosyasında güvenlik headers'ları zaten var:
- X-Frame-Options
- X-XSS-Protection
- X-Content-Type-Options
- Referrer-Policy

### 9.2. Environment Variables Güvenliği

- ✅ **Asla** `SUPABASE_SERVICE_ROLE_KEY` eklemeyin (sadece backend'de olmalı)
- ✅ Sadece `PUBLIC_` prefix'li değişkenler frontend'de kullanılabilir
- ✅ Hassas bilgileri environment variables'da saklamayın

---

## 📝 Checklist

Deploy öncesi kontrol listesi:

- [ ] GitHub repository'de tüm kodlar push edildi
- [ ] `frontend/netlify.toml` dosyası mevcut
- [ ] Local'de `npm run build` başarılı
- [ ] Backend URL hazır (Render.com'dan)
- [ ] Supabase bilgileri hazır
- [ ] Netlify hesabı oluşturuldu
- [ ] GitHub repository bağlandı
- [ ] Build settings doğru (base directory: `frontend`)
- [ ] Environment variables eklendi
- [ ] Deploy başarılı
- [ ] Site açılıyor
- [ ] API istekleri çalışıyor

---

## 🎯 Hızlı Başlangıç (Özet)

1. **Netlify.com** → Sign up (GitHub ile)
2. **Add new site** → **Import from Git** → Repository seç
3. **Build settings:**
   - Base directory: `frontend`
   - Build command: `npm run build` (otomatik)
   - Publish directory: `frontend/dist` (otomatik)
4. **Deploy site** → İlk build başlar
5. **Site settings** → **Environment variables** → Ekle:
   - `PUBLIC_SUPABASE_URL`
   - `PUBLIC_SUPABASE_ANON_KEY`
   - `PUBLIC_API_URL`
6. **Trigger deploy** → **Deploy site** (yeniden deploy)
7. Site URL'ini kontrol et ✅

---

## 📞 Yardım

- [Netlify Docs](https://docs.netlify.com)
- [Netlify Community](https://answers.netlify.com)
- [Netlify Support](https://www.netlify.com/support)

---

## 🎉 Başarılı Deploy Sonrası

Deploy başarılı olduktan sonra:

1. ✅ Site URL'ini kaydedin
2. ✅ Backend'de `FRONTEND_URL` environment variable'ını güncelleyin
3. ✅ CORS ayarlarını kontrol edin
4. ✅ Siteyi test edin (login, dashboard, vb.)

**Tebrikler! 🎉 Frontend artık Netlify'da canlıda!**

