export type KpiStatus = 'aktif' | 'pasif';
export type YtdCalc = 'ortalama' | 'toplam';

export interface KpiItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  status: KpiStatus;
  reportCount: number;
  ytdCalc: YtdCalc;
  onlyCumulative?: boolean;
  averageData?: boolean;
  monthlyAverage?: boolean; // Aylık Ortalama seçeneği
  numeratorKpiId?: string;
  denominatorKpiId?: string;
  cumulativeSourceIds?: string[];
  formulaText?: string;
  target?: string;
  hasTargetData?: boolean;
  targetFormulaText?: string;
}