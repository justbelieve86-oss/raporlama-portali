# 🔍 Backend Deploy Kontrolü

## Sorun: Route Bulunamadı `/api/auth/login`

Backend'de route tanımlı ama 404 hatası alınıyorsa, backend'in Render.com'da güncel deploy edilmediği anlamına gelir.

## ✅ Hızlı Çözüm

### 1. Render.com Dashboard'a Git

1. [Render.com Dashboard](https://dashboard.render.com) → Login
2. Backend service'inizi seçin: `raporlama-backend`

### 2. Deploy Durumunu Kontrol Et

1. **Events** veya **Logs** sekmesine tıklayın
2. Son deploy'un ne zaman yapıldığını kontrol edin
3. Eğer son commit'ten önceyse, manuel deploy yapın

### 3. Manuel Deploy Yap

1. **Manual Deploy** → **Deploy latest commit**
2. Veya GitHub'a push yapın (auto-deploy aktifse otomatik deploy edilir)

### 4. Deploy Loglarını Kontrol Et

1. **Logs** sekmesinde deploy loglarını kontrol edin
2. Hata varsa düzeltin
3. Deploy başarılı olana kadar bekleyin (1-2 dakika)

---

## 🔍 Backend Route Kontrolü

Backend'de route tanımlı mı kontrol edin:

```bash
# Backend health check
curl https://raporlama-backend.onrender.com/api/health

# Login endpoint test (POST isteği)
curl -X POST https://raporlama-backend.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test@example.com","password":"test"}'
```

**Beklenen Response:**
- Health: `{"status":"ok"}`
- Login: `{"success":true,"data":{...},"message":"Giriş başarılı"}`

**Hata Response:**
- `{"status":"fail","message":"Route bulunamadı: /api/auth/login","code":"ROUTE_NOT_FOUND"}`

---

## 🐛 Sorun Giderme

### Problem 1: Backend Deploy Edilmedi

**Çözüm:**
1. Render.com Dashboard → Backend service
2. **Manual Deploy** → **Deploy latest commit**
3. Deploy tamamlanana kadar bekleyin

### Problem 2: Backend Çalışmıyor

**Çözüm:**
1. **Logs** sekmesinde hata var mı kontrol edin
2. Environment variables doğru mu kontrol edin
3. Backend service'in **Running** durumunda olduğundan emin olun

### Problem 3: Route Tanımlı Değil

**Çözüm:**
1. Backend kodunu kontrol edin: `backend/src/index.js`
2. Route tanımlı mı kontrol edin: `app.use('/api/auth', authRoutes);`
3. `authRoutes` dosyasında `/login` route'u var mı kontrol edin

---

## 📝 Checklist

- [ ] Backend Render.com'da deploy edildi
- [ ] Backend service **Running** durumunda
- [ ] Son commit deploy edildi
- [ ] Health check başarılı (`/api/health`)
- [ ] Login endpoint çalışıyor (`/api/auth/login`)

---

## 🚨 Acil Durum

Eğer backend deploy edilmiyorsa:

1. **Render.com Dashboard** → Backend service → **Settings**
2. **Auto-Deploy** ayarını kontrol edin
3. **Manual Deploy** yapın
4. Deploy loglarını kontrol edin

---

## 📞 Yardım

- [Render.com Docs](https://render.com/docs)
- [Render.com Status](https://status.render.com)
- Backend logları: Render Dashboard → Logs

