/**
 * API Response Types
 * Comprehensive type definitions for all API responses
 */

// Standard API Response Envelope
export interface ApiResponse<T = unknown> {
  success: boolean;
  status: 'success' | 'fail' | 'error';
  message?: string;
  data?: T;
  code?: string;
  details?: Record<string, unknown>;
  timestamp?: string;
}

// List Response Format
export interface ListResponse<T> {
  items: T[];
  count: number;
  total: number;
}

export interface ApiListResponse<T> extends ApiResponse<ListResponse<T>> {}

// KPI Types
export interface Kpi {
  id: string;
  kpi_id?: string;
  name: string;
  kpi_name?: string;
  category?: string;
  unit?: string;
  status?: 'aktif' | 'pasif';
  calculation_type?: 'direct' | 'percentage' | 'cumulative' | 'formula' | 'target';
  only_cumulative?: boolean;
  numerator_kpi_id?: string;
  denominator_kpi_id?: string;
  target?: number | null;
  monthly_average?: boolean;
  calculationType?: 'direct' | 'percentage' | 'cumulative' | 'formula' | 'target';
  monthlyAverage?: boolean;
  targetFormulaText?: string | null;
}

export interface KpiFormula {
  kpi_id: string;
  expression: string;
  display_expression: string | null;
}

export interface KpiCumulativeSource {
  kpi_id: string;
  source_kpi_id: string;
}

export interface KpiDetail {
  id: string;
  name: string;
  category: string;
  unit: string;
  status: 'aktif' | 'pasif';
  calculation_type: 'direct' | 'percentage' | 'cumulative' | 'formula' | 'target';
  only_cumulative: boolean;
  numerator_kpi_id?: string;
  denominator_kpi_id?: string;
  target?: number | null;
  monthly_average?: boolean;
  target_formula_text?: string | null;
}

// Report Types
export interface DailyReport {
  kpi_id: string;
  brand_id: string;
  year: number;
  month: number;
  day: number;
  report_date: string;
  value: number;
  updated_at?: string;
}

export interface MonthlyReport {
  kpi_id: string;
  brand_id: string;
  year: number;
  month: number;
  value: number;
  updated_at?: string;
}

export interface Target {
  kpi_id: string;
  brand_id: string;
  year: number;
  month: number;
  target: number;
}

// Brand KPI Mapping
export interface BrandKpiMapping {
  id: string;
  brand_id: string;
  kpi_id: string;
}

// User Types
export interface ApiUser {
  id: string;
  email: string;
  role: string;
  created_at: string;
  last_sign_in_at?: string;
  user_metadata?: {
    username?: string;
    full_name?: string;
    role?: string;
  };
  brands?: Array<{ id: string; name: string }>;
}

// Me Response
export interface MeResponse {
  user: ApiUser;
  role: string;
  brands: Array<{ id: string; name: string }>;
}

// Environment Types
export interface ImportMetaEnv {
  readonly PUBLIC_SUPABASE_URL: string;
  readonly PUBLIC_SUPABASE_ANON_KEY: string;
  readonly PUBLIC_API_URL?: string;
}

export interface ProcessEnv {
  readonly PUBLIC_API_URL?: string;
  readonly NODE_ENV?: string;
}

