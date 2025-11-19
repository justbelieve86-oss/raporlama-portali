-- Migration: User KPI Ordering Preferences
-- Description: Create table to store user-specific KPI ordering preferences

-- Create user_kpi_ordering table
CREATE TABLE IF NOT EXISTS user_kpi_ordering (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    kpi_id UUID NOT NULL REFERENCES kpis(id) ON DELETE CASCADE,
    order_index INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique ordering per user and brand
    UNIQUE(user_id, brand_id, kpi_id),
    UNIQUE(user_id, brand_id, order_index)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_kpi_ordering_user_brand ON user_kpi_ordering(user_id, brand_id);
CREATE INDEX IF NOT EXISTS idx_user_kpi_ordering_order ON user_kpi_ordering(user_id, brand_id, order_index);

-- Enable RLS (Row Level Security)
ALTER TABLE user_kpi_ordering ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only see and modify their own ordering preferences
DROP POLICY IF EXISTS "Users can view their own KPI ordering" ON user_kpi_ordering;
CREATE POLICY "Users can view their own KPI ordering" ON user_kpi_ordering
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own KPI ordering" ON user_kpi_ordering;
CREATE POLICY "Users can insert their own KPI ordering" ON user_kpi_ordering
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own KPI ordering" ON user_kpi_ordering;
CREATE POLICY "Users can update their own KPI ordering" ON user_kpi_ordering
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own KPI ordering" ON user_kpi_ordering;
CREATE POLICY "Users can delete their own KPI ordering" ON user_kpi_ordering
    FOR DELETE USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_kpi_ordering_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at (drop if exists first to avoid conflicts)
DROP TRIGGER IF EXISTS trigger_update_user_kpi_ordering_updated_at ON user_kpi_ordering;
CREATE TRIGGER trigger_update_user_kpi_ordering_updated_at
    BEFORE UPDATE ON user_kpi_ordering
    FOR EACH ROW
    EXECUTE FUNCTION update_user_kpi_ordering_updated_at();

-- Grant necessary permissions
GRANT ALL ON user_kpi_ordering TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;