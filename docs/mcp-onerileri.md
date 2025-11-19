# MCP Entegrasyon Önerileri ve Kullanım Senaryoları

Bu doküman, mevcut mimarinize (Astro frontend, Node.js backend, Supabase/Postgres) uygun, hızlı değer katacak MCP (Model Context Protocol) entegrasyon önerilerini ve pratik kullanım akışlarını içermektedir.

## Mimari Özet
- Frontend: `Astro` + `Tailwind`, geliştirme URL’si: `http://localhost:4321/`
- Backend: Node.js (Express), Supabase ile kimlik/doğrulama ve veri erişimi
- Veritabanı: Supabase Postgres, tablolar: `kpis`, `kpi_targets`, `kpi_daily_reports`, `brand_kpi_targets`, `kpi_formulas` vb.
- Scriptler: `scripts/` altında kurulum/doğrulama ve RLS testleri

## Önerilen MCP’ler
- SQL/Database: Supabase Postgres’e bağlanıp sorgular çalıştırır; KPI raporlama ve denetim otomatizasyonu için temel.
- HTTP/Fetch: Backend API’leriniz, Supabase REST/RPC uçları ve harici servislerle entegrasyon.
- Filesystem: Repo içi doküman üretimi (ör. `DenetimRaporu.md`), CSV/JSON rapor çıktıları, geçici veri dosyaları.
- Shell/Process: `scripts/*.js` ve `npm run` komutları; tek adımda kurulum, doğrulama ve geliştirme ortamını açma/kapama.
- Git: Durum, diff ve küçük commit/PR otomasyonları; yapılan değişiklikleri denetim raporlarıyla birlikte sürümlemek.
- Browser: Otomatik görsel doğrulama, basit scraping veya yönetim ekranlarında robotik test akışı.
- Slack/Email: KPI eşikleri aşıldığında uyarı; günlük rapor özeti ile takıma bildirim.
- Google Sheets: Marka/KPI hedeflerinin tablo üzerinden senkronizasyonu; pazarlama/operasyon ekipleri için veri girişi kolaylığı.
- S3/Blob Storage: CSV/Excel raporlarının ve görsel çıktılarının arşivlenmesi; dış sistemlerle dosya tabanlı entegrasyon.

## Projeye Özel Kullanım Senaryoları
- KPI doğrulama otomasyonu: `sql.query` ile günlük/kümülatif tutarlılık, ardından `shell.exec` ile `scripts/verify-kpis.js` ve sonuçları `filesystem.write` ile rapora dökme.
- Hedef senkronizasyonu: `sheets.read` ile hedef tablolarını alıp `http.request` veya `sql.query` ile `brand_kpi_targets` güncelleme.
- Anlık uyarılar: `sql.query` ile eşik sapması yakalandığında `slack.postMessage` veya `email.send` ile bildirim.
- Tek komut geliştirme akışı: `shell.exec` ile `npm run dev` (frontend) ve backend’i başlatan `./scripts/start-all.sh`, ardından `browser.open` ile `http://localhost:4321/admin/kpi` doğrulaması.
- Denetim raporu üretimi: `sql.query` ile değişim setleri, `filesystem.write` ile `DenetimRaporu.md` güncellemesi, `git.commit` ile versiyonlama.

## Başlangıç Kurulumu
- Öncelik: SQL + HTTP + Shell üçlüsüyle başlayın; Supabase/Backend/Script entegrasyonunu hemen sağlar.
- Ortam değişkenleri: `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` gibi gizli bilgileri güvenli şekilde tanımlayın.
- Güvenli şablonlar: SQL için salt-okunur sorgu setleri ve sınırlı RPC; HTTP’de izinli domain beyaz listesi; Shell’de yalnızca `scripts/` ve `npm run` komutları.

## Güvenlik ve İzinler
- RLS politikalarına uyum: Yönetim işlemleri için servis anahtarı/admin rolü kullanırken, kullanıcı akışında yetkili görünürlük.
- Asgari yetki: SQL ve HTTP çağrılarını görev bazında kısıtlayın; dosya erişiminde repo dışına yazmaktan kaçının.
- Günlükleme: MCP çağrı sonuçlarını `logs/` veya `DenetimRaporu.md` içine özetleyerek izlenebilirlik sağlayın.

## Örnek Akışlar
1) Günlük KPI denetim pipeline’ı:
   - `sql.query`: Son 24 saatlik `kpi_daily_reports` ve hedef/kümülatif tutarlılık kontrolü.
   - `shell.exec`: `scripts/verify-kpis.js` ve/veya yardımcı scriptler.
   - `filesystem.write`: Özet ve detayları `DenetimRaporu.md` içine ekle.
   - `slack.postMessage`: Kritik sapmaları ilgili kanala bildir.

2) Hedef senkronizasyonu:
   - `sheets.read`: Marka bazlı hedef veri çek.
   - `http.request` veya `sql.query`: `brand_kpi_targets` güncelle.
   - `git.commit`: Yapılan değişiklikleri küçük bir mesajla sürümle.

## Sonraki Adımlar
- Hangi entegrasyonu önce istiyorsunuz? SQL + HTTP + Shell ile başlayıp Slack/Sheets’i ikinci aşamada ekleyebiliriz.
- Hedef senaryonuzu belirtin (ör. “günlük KPI sapmalarını Slack’e gönder”), buna uygun MCP konfigürasyonu ve örnek kullanım akışını sağlayalım.
- İstenirse Supabase tablolarına yönelik örnek `sql.query` şablonları ve `scripts/*` çağrılarıyla çalışır bir “günlük denetim pipeline” taslağı oluşturabiliriz.