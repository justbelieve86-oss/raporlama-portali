# SQL + HTTP + Shell Pipeline (Başlangıç)

Bu pipeline, mevcut proje üzerinde üç temel entegrasyonu bir arada gösterir:
- HTTP: Backend’e giriş yapıp admin KPI listesini çeker.
- SQL: Supabase Postgres’ten günlük raporlar sorgulanır.
- Shell: Var olan doğrulama scriptleri çalıştırılır.

## Nasıl Çalıştırılır
1) Backend ve frontend’i geliştirme modunda başlatın.
   - Frontend: `npm run dev` (kök: `frontend/`)
   - Backend: `npm run dev` (kök: `backend/`)

2) Ortam değişkenlerini ayarlayın:
   - `BACKEND_URL` (varsayılan: `http://127.0.0.1:4000`)
   - `ADMIN_USERNAME` ve `ADMIN_PASSWORD` (backend `/api/auth/login` için)

3) Script’i çalıştırın:
   - `node backend/scripts/mcp-pipeline.js`

Script akışı:
- HTTP ile login olup token alır ve `/api/admin/kpis` listesini çeker.
- SQL ile `kpi_daily_reports` tablosundan son gün raporlarını sorgular ve basit anomali kontrolü yapar.
- Shell ile kök dizindeki `scripts/verify-kpis.js` scriptini çalıştırır ve çıktıyı yazdırır.

## Örnek Ortam Ayarı (macOS/zsh)
```sh
export BACKEND_URL=http://127.0.0.1:4000
export ADMIN_USERNAME=admin
export ADMIN_PASSWORD=your-password
node backend/scripts/mcp-pipeline.js
```

## Notlar
- SQL sorguları, backend’in `supabase` service client’ı üzerinden yapılır; RLS kısıtlarını aşmak için yönetici seviyesinde çalışır.
- HTTP istekleri, backend üzerinde tanımlı admin uçları ile zenginleştirilmiş KPI listesini döndürür.
- Shell çağrısı, repo içindeki mevcut scriptlerin tekrar kullanılmasını sağlar.

## Genişletme Fikirleri
- Slack/Email bildirimleri: Anomali sayısı > 0 ise uyarı gönder.
- Google Sheets entegrasyonu: Hedef tablolarını çekip `brand_kpi_targets` ile senkronize et.
- Dosya çıktısı: `DenetimRaporu.md` içine pipeline özetini ekle.