-- Migration: Add context field to user_kpi_ordering
-- Description: Add context field to distinguish between different pages (sales-dashboard, monthly-overview, etc.)

BEGIN;

-- Add context column (nullable for backward compatibility, default to 'sales-dashboard' for existing records)
ALTER TABLE user_kpi_ordering 
ADD COLUMN IF NOT EXISTS context TEXT;

-- Update existing records to have 'sales-dashboard' context (for backward compatibility)
UPDATE user_kpi_ordering 
SET context = 'sales-dashboard' 
WHERE context IS NULL;

-- Add default value for new records
ALTER TABLE user_kpi_ordering 
ALTER COLUMN context SET DEFAULT 'sales-dashboard';

-- Drop old unique constraints that don't include context
ALTER TABLE user_kpi_ordering 
DROP CONSTRAINT IF EXISTS user_kpi_ordering_user_id_brand_id_kpi_id_key;

ALTER TABLE user_kpi_ordering 
DROP CONSTRAINT IF EXISTS user_kpi_ordering_user_id_brand_id_order_index_key;

-- Add new unique constraints that include context
ALTER TABLE user_kpi_ordering 
ADD CONSTRAINT user_kpi_ordering_user_brand_kpi_context_unique 
UNIQUE(user_id, brand_id, kpi_id, context);

ALTER TABLE user_kpi_ordering 
ADD CONSTRAINT user_kpi_ordering_user_brand_order_context_unique 
UNIQUE(user_id, brand_id, order_index, context);

-- Update indexes to include context for better query performance
DROP INDEX IF EXISTS idx_user_kpi_ordering_user_brand;
CREATE INDEX IF NOT EXISTS idx_user_kpi_ordering_user_brand_context 
ON user_kpi_ordering(user_id, brand_id, context);

DROP INDEX IF EXISTS idx_user_kpi_ordering_order;
CREATE INDEX IF NOT EXISTS idx_user_kpi_ordering_order_context 
ON user_kpi_ordering(user_id, brand_id, order_index, context);

COMMIT;

