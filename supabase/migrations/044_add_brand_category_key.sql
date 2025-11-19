-- Add optional category_key to brands for server-side filtering
BEGIN;

ALTER TABLE public.brands
  ADD COLUMN IF NOT EXISTS category_key text;

CREATE INDEX IF NOT EXISTS idx_brands_category_key
  ON public.brands (category_key);

COMMENT ON COLUMN public.brands.category_key IS 'Client-side category key (e.g., satis-markalari) for grouping/filtering';

COMMIT;