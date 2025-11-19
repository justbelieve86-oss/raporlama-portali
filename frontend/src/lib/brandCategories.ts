export type BrandCategoryKey = 'satis-markalari' | 'servis-markalari' | 'kiralama-markalari' | 'ikinci-el-markalari' | 'ekspertiz-markalari';

export const BRAND_CATEGORY_MAP: Record<string, Array<string | RegExp>> = {
  'satis-markalari': ['Honda', 'Toyota', 'BYD'],
  // Servis markaları: isim bazlı kurallar yerine doğrudan category_key ile filtrelenecek
  'servis-markalari': [],
  // Kiralama markaları: başlangıçta tüm markalar görünsün diye boş bırakıyoruz.
  // İleride gerçek kiralama markalarını ekleyebilirsiniz (ör. 'Avis', 'Enterprise', 'Sixt').
  'kiralama-markalari': [],
  // 2.el markaları: isim bazlı kurallar yerine doğrudan category_key ile filtrelenecek
  'ikinci-el-markalari': [],
  // Ekspertiz markaları: isim bazlı kurallar yerine doğrudan category_key ile filtrelenecek
  'ekspertiz-markalari': [],
};

type SimpleBrand = { id: string | number; name: string };

export function filterBrandsByCategory<T extends SimpleBrand>(brands: T[], key?: string | null): T[] {
  if (!key) return brands;
  const rules = BRAND_CATEGORY_MAP[String(key)] as Array<string | RegExp> | undefined;
  // Bilinmeyen kategori anahtarı: listeyi olduğu gibi döndür
  if (!rules) return brands;
  // Haritada mevcut ama boş kural listesi: category_key eşleşmesine göre filtrele
  if (rules.length === 0) {
    return brands.filter((b) => (b as any)?.category_key === key);
  }
  return brands.filter((b) => {
    const name = String(b.name || '').trim().toLowerCase();
    return rules.some((r) => {
      if (typeof r === 'string') {
        return name === r.toLowerCase();
      }
      try {
        return r.test(String(b.name || ''));
      } catch {
        return false;
      }
    });
  });
}