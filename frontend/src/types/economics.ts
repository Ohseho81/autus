/**
 * AUTUS Economics Types
 */

export interface EconomicIndicator {
  id: string;
  name: string;
  nameKo: string;
  value: number;
  previousValue?: number;
  change?: number;
  changePercent?: number;
  timestamp: string;
  source?: string;
  unit?: string;
}

export interface CountryData {
  code: string;
  name: string;
  nameKo: string;
  region: string;
  indicators: Record<string, number>;
  coordinates: [number, number];
}

export interface RegionalData {
  region: string;
  countries: string[];
  aggregatedIndicators: Record<string, number>;
  totalPopulation: number;
  totalGDP: number;
}

export interface TimeSeriesPoint {
  timestamp: string;
  value: number;
  metadata?: Record<string, any>;
}

export interface TimeSeries {
  indicator: string;
  country?: string;
  data: TimeSeriesPoint[];
  startDate: string;
  endDate: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
}

// Physics와 Economics 매핑
export const ECONOMICS_PHYSICS_MAP: Record<string, number> = {
  'gdp': 0,           // FINANCIAL_HEALTH
  'inflation': 1,      // CAPITAL_RISK
  'trade_balance': 2,  // COMPLIANCE_IQ
  'unemployment': 3,   // CONTROL_ENV
  'sentiment': 4,      // REPUTATION
  'population': 5,     // STAKEHOLDER
};

// 색상 스케일
export function getEconomicColor(value: number, indicator: string): string {
  const isPositive = ['gdp', 'trade_balance', 'sentiment'].includes(indicator);
  
  if (isPositive) {
    if (value >= 0.7) return '#22c55e';
    if (value >= 0.4) return '#f59e0b';
    return '#ef4444';
  } else {
    if (value <= 0.3) return '#22c55e';
    if (value <= 0.6) return '#f59e0b';
    return '#ef4444';
  }
}

// M2C 색상
export const M2C_COLORS = {
  excellent: '#10b981',  // ≥2.0x
  good: '#06b6d4',       // ≥1.5x
  warning: '#f59e0b',    // ≥1.0x
  critical: '#ef4444',   // <1.0x
};

export function getM2CColor(m2c: number): string {
  if (m2c >= 2.0) return M2C_COLORS.excellent;
  if (m2c >= 1.5) return M2C_COLORS.good;
  if (m2c >= 1.0) return M2C_COLORS.warning;
  return M2C_COLORS.critical;
}

export function getM2CColorRgba(m2c: number, alpha: number = 1): [number, number, number, number] {
  if (m2c >= 2.0) return [16, 185, 129, Math.floor(alpha * 255)];
  if (m2c >= 1.5) return [6, 182, 212, Math.floor(alpha * 255)];
  if (m2c >= 1.0) return [245, 158, 11, Math.floor(alpha * 255)];
  return [239, 68, 68, Math.floor(alpha * 255)];
}

export function formatUSD(value: number, short: boolean = false): string {
  if (short) {
    if (value >= 1e12) return `$${(value / 1e12).toFixed(1)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(0)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(0)}M`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

