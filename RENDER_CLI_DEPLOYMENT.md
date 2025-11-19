# 🚀 Render CLI ile Deployment

Render CLI kullanarak backend'i daha hızlı deploy edebilirsiniz.

## 1. Render CLI Authentication

```bash
# Render'a login olun
render login
```

Bu komut tarayıcınızı açacak ve Render hesabınızla giriş yapmanızı isteyecek.

## 2. Render Service Oluşturma

### Yöntem 1: render.yaml ile (Önerilen)

```bash
# Backend dizininde
cd backend

# render.yaml dosyası zaten mevcut, service oluştur
render services:create --file render.yaml
```

**Not**: `render.yaml` dosyasındaki environment variable'ları Render Dashboard'dan manuel olarak eklemeniz gerekecek.

### Yöntem 2: Komut satırından

```bash
cd backend

# Service oluştur
render services:create \
  --name raporlama-backend \
  --type web \
  --env node \
  --build-command "npm install" \
  --start-command "npm start" \
  --repo https://github.com/justbelieve86-oss/raporlama-portali \
  --branch main \
  --root-dir backend
```

## 3. Environment Variables Ekleme

Render CLI ile environment variable eklemek:

```bash
# Service ID'yi alın (Render Dashboard'dan veya render services:list)
render env:set \
  --service-id YOUR_SERVICE_ID \
  SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co \
  SUPABASE_ANON_KEY=eyJ... \
  SUPABASE_SERVICE_ROLE_KEY=eyJ... \
  SUPABASE_JWT_SECRET=... \
  FRONTEND_URL=https://your-frontend.vercel.app \
  NODE_ENV=production
```

**Alternatif**: Render Dashboard'dan manuel olarak ekleyebilirsiniz (daha kolay).

## 4. Deploy

```bash
# Manuel deploy tetikleme
render deploys:create --service-id YOUR_SERVICE_ID
```

**Not**: `autoDeploy: true` ayarı varsa, GitHub'a push yaptığınızda otomatik deploy olur.

## 5. Service Bilgilerini Görüntüleme

```bash
# Tüm servisleri listele
render services:list

# Belirli bir service'in detaylarını gör
render services:show --service-id YOUR_SERVICE_ID

# Service loglarını gör
render logs --service-id YOUR_SERVICE_ID
```

## Avantajlar

✅ **Hızlı**: Komut satırından hızlı deployment  
✅ **Otomatik**: render.yaml ile yapılandırma yönetimi  
✅ **Scriptable**: CI/CD pipeline'larında kullanılabilir  

## Dezavantajlar

⚠️ **Environment Variables**: CLI ile eklemek biraz karmaşık, Dashboard daha kolay  
⚠️ **İlk Kurulum**: İlk kez service oluştururken Dashboard daha görsel  

## Öneri

İlk deployment için **Dashboard kullanın** (daha kolay), sonraki güncellemeler için **CLI veya otomatik deploy** kullanın.

---

**Not**: Vercel için CLI da var (`vercel`), ama Vercel Dashboard çok kullanıcı dostu olduğu için genelde Dashboard tercih edilir.

