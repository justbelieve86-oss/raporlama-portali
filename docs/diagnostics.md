# Tanılama (Diagnostics) Araçları ve Kullanım

Bu doküman, projeye eklenen otomatik tanılama araçlarını (MCP tabanlı) nasıl çalıştıracağınızı ve çıktıları nasıl yorumlayacağınızı açıklar.

## Kapsam
- Frontend: `eslint`, `tsc --noEmit`, `vitest` (mevcut testler), `npm audit`
- Backend: `eslint`, `jest` (mevcut testler), `npm audit`
- Toplu: kök `scripts/diagnostics.sh` tek komutla her iki paketi ve opsiyonel Semgrep taramasını çalıştırır.

## Hızlı Başlangıç

1. Frontend:
   - `cd frontend`
   - `npm run diagnostics`
2. Backend:
   - `cd backend`
   - `npm run diagnostics`
3. Toplu (kök dizinde):
   - `bash scripts/diagnostics.sh`

## CI Entegrasyonu
- GitHub Actions yapılandırması eklendi: `.github/workflows/diagnostics.yml`.
- Tetikleyiciler: `push` ve `pull_request`.
- Adımlar:
  - `frontend`: `npm ci` ardından `npm run diagnostics`
  - `backend`: `npm ci` ardından `npm run diagnostics`
- Not: CI’da kök `scripts/diagnostics.sh` çalıştırılmıyor; Supabase anahtarları gerektiren scriptler yerel geliştirmede kullanılmalı.

## Çıktıların Yorumlanması
- ESLint: Hata (error) seviyeleri derleme engelleyici kabul edilir; uyarılar (warning) iyileştirme için öneridir.
- Typecheck: `tsc --noEmit` tip uyuşmazlıklarını raporlar; CI’da başarısızlığa sebep olabilir.
- Testler: Başarısız testler ilgili paket için aksiyon gerektirir. Backend’e örnek bir kontrat testi eklendi: `backend/__tests__/health.test.js`.
- Audit: Kırmızı kritik açıklar için güncelleme gereklidir; sarı/orta seviye için planlama yapılabilir.
- Semgrep (opsiyonel): Sisteminizde yüklü ise `p/ci` kural setiyle güvenlik taraması yapar.

## Sık Kullanım Senaryoları
- Geliştirme öncesi: `bash scripts/diagnostics.sh` ile hızlı sağlık kontrolü.
- PR öncesi: Her iki pakette `npm run diagnostics` çalıştırıp, audit ve test sonuçlarını paylaşın.
- Production hazırlığı: Audit ve contract testleri temiz; tip kontrolü hatasız olmalı.

## Notlar
- Semgrep yüklemek için: `pip install semgrep` veya `brew install semgrep`.
- Toplu script, hataları ekrana yazdırır ve devam eder; CI’da sert davranmak için `set -e` ve hata yakalama stratejilerini sıkılaştırabilirsiniz.