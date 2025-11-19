/**
 * KPI calculation utility functions
 */

import { normalize } from './kpiFormatters';

export type Kpi = {
  id: string;
  name: string;
  category?: string;
  unit?: string;
  calculation_type?: 'direct' | 'percentage' | 'cumulative' | 'formula' | 'target';
  target?: number | null;
  only_cumulative?: boolean;
  numerator_kpi_id?: string;
  denominator_kpi_id?: string;
};

export type BrandData = {
  kpis: Kpi[];
  values: Record<string, Record<number, number>>; // kpiId -> day -> value
  cumulativeOverrides: Record<string, number>; // only_cumulative monthly overrides
  targets: Record<string, number>; // monthly targets per KPI
  cumulativeSources: Record<string, string[]>; // cumulative KPI sources
  formulaExpressions: Record<string, string>; // formula expressions per KPI
  unitById: Record<string, string>;
};

/**
 * Basit aritmetik ifadeyi değerlendir (DailyDataEntryIsland ile uyumlu)
 */
export function evaluateArithmeticExpression(expr: string): number | null {
  const tokens: Array<string | number> = [];
  const s = expr.replace(/\s+/g, '');
  let numBuffer = '';
  const flushNumber = () => { if (numBuffer) { tokens.push(Number(numBuffer)); numBuffer = ''; } };
  const isOp = (c: string) => ['+', '-', '*', '/'].includes(c);
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if ((c >= '0' && c <= '9') || c === '.') numBuffer += c;
    else if (isOp(c) || c === '(' || c === ')') { flushNumber(); tokens.push(c); }
    else return null;
  }
  flushNumber();
  const prec: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2 };
  const output: Array<string | number> = [];
  const ops: string[] = [];
  for (const t of tokens) {
    if (typeof t === 'number') output.push(t);
    else if (t === '(') ops.push(t);
    else if (t === ')') { while (ops.length && ops[ops.length - 1] !== '(') output.push(ops.pop() as string); if (ops.pop() !== '(') return null; }
    else if (isOp(t)) { while (ops.length && isOp(ops[ops.length - 1]) && prec[ops[ops.length - 1]] >= prec[t]) output.push(ops.pop() as string); ops.push(t); }
    else return null;
  }
  while (ops.length) { const op = ops.pop() as string; if (op === '(' || op === ')') return null; output.push(op); }
  const stack: number[] = [];
  for (const t of output) {
    if (typeof t === 'number') stack.push(t);
    else if (isOp(t)) { if (stack.length < 2) return null; const b = stack.pop() as number; const a = stack.pop() as number; let r = 0; if (t === '+') r = a + b; else if (t === '-') r = a - b; else if (t === '*') r = a * b; else if (t === '/') { if (b === 0) return null; r = a / b; } stack.push(r); }
  }
  return stack.length === 1 ? stack[0] : null;
}

/**
 * Yardımcılar: referans değerleri hesaplama
 */
export function makeResolvers(all: BrandData) {
  const allKpis = all.kpis;
  const { values, cumulativeSources, cumulativeOverrides } = all;
  const resolveRefId = (raw: string): string | null => {
    const token = String(raw || '').trim();
    if (allKpis.some(k => String(k.id) === token)) return token;
    const byName = allKpis.find(k => normalize(k.name) === normalize(token));
    return byName ? String(byName.id) : null;
  };
  const getRefDayValue = (refId: string, d: number): number => {
    const direct = values[String(refId)]?.[d];
    if (direct != null) return Number(direct) || 0;
    const refKpi = (allKpis || []).find(x => String(x.id) === String(refId));
    if (!refKpi) return 0;
    if (refKpi.only_cumulative === true) return 0;
    if (refKpi.calculation_type === 'cumulative') {
      const sources = cumulativeSources[refId] || [];
      let daySum = 0;
      for (const sid of sources) { const v = values[String(sid)]?.[d]; daySum += Number(v) || 0; }
      return daySum;
    }
    return 0;
  };
  const getRefCumulativeValue = (refId: string, d: number): number => {
    const refKpi = (allKpis || []).find(x => String(x.id) === String(refId));
    if (!refKpi) return 0;
    if (refKpi.only_cumulative === true) { return Number(cumulativeOverrides[refId] ?? 0); }
    if (refKpi.calculation_type === 'cumulative') {
      const sources = cumulativeSources[refId] || [];
      let sum = 0;
      for (let i = 1; i <= d; i++) { for (const sid of sources) { sum += Number(values[String(sid)]?.[i]) || 0; } }
      return sum;
    }
    let sum = 0; const row = values[String(refId)] || {};
    for (let i = 1; i <= d; i++) { sum += Number(row[i]) || 0; }
    return sum;
  };
  return { resolveRefId, getRefDayValue, getRefCumulativeValue };
}

