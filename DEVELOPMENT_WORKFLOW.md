# 🔧 Development Workflow Rehberi

## 📌 Önemli: Değişiklikler Otomatik Canlıya Geçmez!

**Kısa cevap**: Localhost'ta çalışmaya devam edebilirsiniz. Sadece `git push` yaptığınızda canlıya geçer.

---

## 🎯 Nasıl Çalışır?

### 1. Localhost'ta Geliştirme (Normal Kullanım)

```bash
# Backend'i localhost'ta çalıştır
cd backend
npm install
npm run dev  # veya npm start

# Frontend'i localhost'ta çalıştır
cd frontend
npm install
npm run dev
```

**Sonuç**: 
- ✅ Localhost'ta çalışır (`http://localhost:4000` ve `http://localhost:4321`)
- ✅ Canlıya geçmez
- ✅ Değişiklikler sadece local'de görünür

### 2. Canlıya Geçirme (İsteğe Bağlı)

```bash
# Değişiklikleri commit et
git add .
git commit -m "Yeni özellik eklendi"

# GitHub'a push et
git push origin main
```

**Sonuç**:
- ✅ Render (backend) otomatik deploy başlatır
- ✅ Vercel (frontend) otomatik deploy başlatır
- ⏱️ Deploy 3-5 dakika sürer

---

## 🔄 Auto-Deploy Ayarları

### Render (Backend)
- **Auto-Deploy**: `Yes` (aktif)
- **Branch**: `main`
- **Ne zaman deploy olur**: `main` branch'e push yaptığınızda

### Vercel (Frontend)
- **Auto-Deploy**: `Yes` (aktif)
- **Branch**: `main`
- **Ne zaman deploy olur**: `main` branch'e push yaptığınızda

---

## 💡 Önerilen Development Workflow

### Senaryo 1: Normal Geliştirme (Önerilen)

```bash
# 1. Localhost'ta geliştir
npm run dev

# 2. Test et
# - Backend: http://localhost:4000/api/health
# - Frontend: http://localhost:4321

# 3. Hazır olduğunda canlıya geç
git add .
git commit -m "Özellik açıklaması"
git push origin main
```

### Senaryo 2: Branch Stratejisi (İleri Seviye)

```bash
# 1. Yeni feature branch oluştur
git checkout -b feature/yeni-ozellik

# 2. Geliştir ve test et
npm run dev

# 3. Commit et
git add .
git commit -m "Yeni özellik eklendi"

# 4. Main branch'e merge et
git checkout main
git merge feature/yeni-ozellik

# 5. Canlıya geç
git push origin main
```

**Avantaj**: 
- ✅ Main branch her zaman stabil kalır
- ✅ Feature'lar test edilip merge edilir
- ✅ Canlıya sadece test edilmiş kodlar geçer

### Senaryo 3: Auto-Deploy'u Devre Dışı Bırakma

Eğer auto-deploy'u istemiyorsanız:

**Render'da:**
1. Render Dashboard → Service → Settings
2. **Auto-Deploy**: `No` yapın
3. Manuel deploy için: **Manual Deploy** butonunu kullanın

**Vercel'de:**
1. Vercel Dashboard → Project → Settings → Git
2. **Production Branch**: Değiştirin veya auto-deploy'u kapatın
3. Manuel deploy için: **Deployments** → **Redeploy**

---

## 🚨 Önemli Notlar

### 1. Environment Variables
- **Localhost**: `.env` dosyaları kullanılır (`.gitignore`'da)
- **Canlı**: Render/Vercel Dashboard'dan ayarlanır
- ⚠️ `.env` dosyaları GitHub'a push edilmez (güvenlik)

### 2. Database
- **Localhost**: Local Supabase veya production Supabase kullanabilirsiniz
- **Canlı**: Production Supabase kullanılır
- ⚠️ Production database'de test verisi oluşturmayın!

### 3. CORS
- **Localhost**: `http://localhost:4321` otomatik izinli
- **Canlı**: `FRONTEND_URL` environment variable'ında belirtilen URL izinli

### 4. Logging
- **Localhost**: Tüm loglar görünür (`logger.debug`, `logger.info`, vb.)
- **Canlı**: Sadece `logger.error` ve `logger.warn` görünür (production mode)

---

## 🔍 Kontrol Listesi

### Localhost'ta Geliştirme Yaparken
- [ ] Backend `.env` dosyası var mı?
- [ ] Frontend `.env` dosyası var mı?
- [ ] `npm run dev` çalışıyor mu?
- [ ] Localhost'ta test edildi mi?

### Canlıya Geçmeden Önce
- [ ] Kod test edildi mi?
- [ ] Environment variable'lar doğru mu?
- [ ] Migration'lar uygulandı mı? (gerekirse)
- [ ] Commit mesajı açıklayıcı mı?

### Canlıya Geçtikten Sonra
- [ ] Render deploy başarılı mı? (Logs kontrol et)
- [ ] Vercel deploy başarılı mı? (Deployments kontrol et)
- [ ] Health check çalışıyor mu?
- [ ] Frontend'de test edildi mi?

---

## 🛠️ Hızlı Komutlar

### Localhost'ta Çalıştırma
```bash
# Backend
cd backend && npm run dev

# Frontend
cd frontend && npm run dev
```

### Canlıya Geçirme
```bash
# Tüm değişiklikleri commit et ve push et
git add .
git commit -m "Açıklayıcı commit mesajı"
git push origin main
```

### Deploy Durumunu Kontrol Etme
```bash
# Render logs (CLI ile)
render logs --service-id YOUR_SERVICE_ID

# Veya tarayıcıdan
# Render Dashboard → Service → Logs
# Vercel Dashboard → Project → Deployments
```

---

## 📚 Daha Fazla Bilgi

- **Render Auto-Deploy**: [Render Docs](https://render.com/docs/auto-deploy)
- **Vercel Auto-Deploy**: [Vercel Docs](https://vercel.com/docs/deployments/automatic-deployments)
- **Git Workflow**: [Git Branching](https://git-scm.com/book/en/v2/Git-Branching-Basic-Branching-and-Merging)

---

**Özet**: Localhost'ta rahatça geliştirin, hazır olduğunuzda `git push` yapın. Canlıya otomatik geçer! 🚀

