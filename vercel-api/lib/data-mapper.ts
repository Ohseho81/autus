// =============================================================================
// AUTUS v1.0 - ERP Data Mapper
// Converts raw ERP data to normalized StudentData format
// =============================================================================

import * as crypto from 'crypto';
import {
  StudentData,
  ERPProvider,
  RiskBand,
  ClasstingStudent,
  NarakhubCSVRow,
  TongtongCSVRow,
  ACA2000Row,
  SmartfitCSVRow,
} from './types-erp';

// -----------------------------------------------------------------------------
// Data Mapper Class
// -----------------------------------------------------------------------------

export class DataMapper {
  private academyId: string;
  private provider: ERPProvider;

  constructor(academyId: string, provider: ERPProvider) {
    this.academyId = academyId;
    this.provider = provider;
  }

  // ---------------------------------------------------------------------------
  // Main Mapping Functions
  // ---------------------------------------------------------------------------

  /**
   * Map Classting student to normalized format
   */
  mapClassting(raw: ClasstingStudent): StudentData {
    return {
      academy_id: this.academyId,
      external_id: raw.id,
      provider: 'classting',
      
      name: raw.name,
      grade: raw.grade,
      grade_band: this.normalizeGrade(raw.grade),
      class_name: raw.class_name,
      
      parent_name: raw.parent?.name,
      parent_phone: this.normalizePhone(raw.parent?.phone),
      parent_email: raw.parent?.email,
      
      attendance_rate: raw.attendance_rate,
      homework_completion: raw.assignment_completion,
      
      synced_at: new Date().toISOString(),
    };
  }

  /**
   * Map Narakhub CSV row to normalized format
   */
  mapNarakhub(raw: NarakhubCSVRow): StudentData {
    const monthlyFee = this.parseNumber(raw.등록금);
    const unpaidAmount = this.parseNumber(raw.미납금);
    
    return {
      academy_id: this.academyId,
      external_id: raw.학생ID,
      provider: 'narakhub',
      
      name: raw.학생명,
      grade: raw.학년,
      grade_band: this.normalizeGrade(raw.학년),
      class_name: raw.반,
      
      parent_name: raw.학부모명,
      parent_phone: this.normalizePhone(raw.연락처),
      parent_email: raw.이메일,
      
      monthly_fee: monthlyFee,
      unpaid_amount: unpaidAmount,
      payment_status: this.getPaymentStatus(unpaidAmount, monthlyFee),
      
      attendance_rate: this.parsePercent(raw.출석률),
      
      metadata: raw.상담메모 ? { memo: raw.상담메모 } : undefined,
      synced_at: new Date().toISOString(),
    };
  }

  /**
   * Map Tongtong CSV row to normalized format
   */
  mapTongtong(raw: TongtongCSVRow): StudentData {
    const monthlyFee = this.parseNumber(raw.monthly_fee);
    const unpaidAmount = this.parseNumber(raw.unpaid);
    
    return {
      academy_id: this.academyId,
      external_id: raw.student_code,
      provider: 'tongtong',
      
      name: raw.student_name,
      grade: raw.grade,
      grade_band: this.normalizeGrade(raw.grade),
      class_name: raw.class,
      
      parent_name: raw.parent_name,
      parent_phone: this.normalizePhone(raw.parent_phone),
      
      monthly_fee: monthlyFee,
      unpaid_amount: unpaidAmount,
      payment_status: this.getPaymentStatus(unpaidAmount, monthlyFee),
      
      attendance_rate: this.parsePercent(raw.attendance_pct),
      recent_score: this.parseNumber(raw.last_score),
      
      metadata: raw.memo ? { memo: raw.memo } : undefined,
      synced_at: new Date().toISOString(),
    };
  }

  /**
   * Map ACA2000 row to normalized format
   */
  mapACA2000(raw: ACA2000Row): StudentData {
    return {
      academy_id: this.academyId,
      external_id: raw.학번,
      provider: 'aca2000',
      
      name: raw.성명,
      grade: raw.학년,
      grade_band: this.normalizeGrade(raw.학년),
      subject: raw.과목,
      
      parent_phone: this.normalizePhone(raw.학부모연락처),
      
      monthly_fee: raw.월수강료,
      unpaid_amount: raw.미납액,
      payment_status: this.getPaymentStatus(raw.미납액, raw.월수강료),
      
      attendance_rate: raw.출석률,
      recent_score: raw.최근점수,
      
      metadata: raw.비고 ? { memo: raw.비고 } : undefined,
      synced_at: new Date().toISOString(),
    };
  }

  /**
   * Map Smartfit CSV row to normalized format
   */
  mapSmartfit(raw: SmartfitCSVRow): StudentData {
    const monthlyFee = this.parseNumber(raw.월회비);
    const unpaidAmount = this.parseNumber(raw.미납금);
    
    return {
      academy_id: this.academyId,
      external_id: raw.회원코드,
      provider: 'smartfit',
      
      name: raw.회원명,
      grade_band: raw.등급,
      
      parent_name: raw.학부모명,
      parent_phone: this.normalizePhone(raw.연락처),
      
      monthly_fee: monthlyFee,
      unpaid_amount: unpaidAmount,
      payment_status: this.getPaymentStatus(unpaidAmount, monthlyFee),
      
      attendance_rate: this.parsePercent(raw.출석률),
      
      metadata: raw.메모 ? { memo: raw.메모 } : undefined,
      synced_at: new Date().toISOString(),
    };
  }

  // ---------------------------------------------------------------------------
  // Batch Mapping
  // ---------------------------------------------------------------------------

  /**
   * Map array of raw data based on provider
   */
  mapBatch<T>(records: T[]): StudentData[] {
    return records.map((record) => {
      switch (this.provider) {
        case 'classting':
          return this.mapClassting(record as unknown as ClasstingStudent);
        case 'narakhub':
          return this.mapNarakhub(record as unknown as NarakhubCSVRow);
        case 'tongtong':
          return this.mapTongtong(record as unknown as TongtongCSVRow);
        case 'aca2000':
          return this.mapACA2000(record as unknown as ACA2000Row);
        case 'smartfit':
          return this.mapSmartfit(record as unknown as SmartfitCSVRow);
        default:
          throw new Error(`Unknown provider: ${this.provider}`);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Normalization Helpers
  // ---------------------------------------------------------------------------

  /**
   * Normalize grade to standard band
   */
  private normalizeGrade(grade?: string): string {
    if (!grade) return 'unknown';
    
    const g = grade.toLowerCase().replace(/\s/g, '');
    
    // Elementary
    if (/초[1-6]|elementary|e[1-6]|1-6학년/.test(g)) return 'elementary';
    
    // Middle School
    if (/중[1-3]|middle|m[1-3]|7-9학년/.test(g)) return 'middle';
    
    // High School
    if (/고[1-3]|high|h[1-3]|10-12학년/.test(g)) return 'high';
    
    // Specific grades
    if (/중1/.test(g)) return 'middle-1';
    if (/중2/.test(g)) return 'middle-2';
    if (/중3/.test(g)) return 'middle-3';
    if (/고1/.test(g)) return 'high-1';
    if (/고2/.test(g)) return 'high-2';
    if (/고3/.test(g)) return 'high-3';
    
    return grade;
  }

  /**
   * Normalize phone number to standard format
   */
  private normalizePhone(phone?: string): string | undefined {
    if (!phone) return undefined;
    
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');
    
    // Korean mobile: 010-XXXX-XXXX
    if (digits.length === 11 && digits.startsWith('010')) {
      return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
    }
    
    // Korean landline: 02-XXX-XXXX or 0XX-XXX-XXXX
    if (digits.length === 10) {
      if (digits.startsWith('02')) {
        return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
      }
      return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    
    return phone;
  }

  /**
   * Parse number from string
   */
  private parseNumber(value?: string | number): number {
    if (value === undefined || value === null || value === '') return 0;
    if (typeof value === 'number') return value;
    
    // Remove currency symbols and commas
    const cleaned = value.replace(/[₩$,원]/g, '').trim();
    const num = parseFloat(cleaned);
    
    return isNaN(num) ? 0 : num;
  }

  /**
   * Parse percentage from string
   */
  private parsePercent(value?: string | number): number {
    if (value === undefined || value === null || value === '') return 100;
    if (typeof value === 'number') return value > 1 ? value : value * 100;
    
    const cleaned = value.replace(/%/g, '').trim();
    const num = parseFloat(cleaned);
    
    if (isNaN(num)) return 100;
    return num > 1 ? num : num * 100;
  }

  /**
   * Get payment status based on unpaid amount
   */
  private getPaymentStatus(
    unpaid: number,
    monthlyFee?: number
  ): 'paid' | 'unpaid' | 'partial' {
    if (unpaid <= 0) return 'paid';
    if (monthlyFee && unpaid >= monthlyFee) return 'unpaid';
    return 'partial';
  }
}

// -----------------------------------------------------------------------------
// Data Hashing (for change detection)
// -----------------------------------------------------------------------------

/**
 * Generate hash for student data to detect changes
 */
export function hashStudentData(data: StudentData): string {
  const keyFields = [
    data.name,
    data.grade,
    data.parent_phone,
    data.monthly_fee,
    data.unpaid_amount,
    data.attendance_rate,
    data.recent_score,
  ];
  
  const str = keyFields.map(f => String(f ?? '')).join('|');
  return crypto.createHash('md5').update(str).digest('hex');
}

/**
 * Check if student data has changed
 */
export function hasChanged(
  newData: StudentData,
  existingHash?: string
): boolean {
  if (!existingHash) return true;
  return hashStudentData(newData) !== existingHash;
}

// -----------------------------------------------------------------------------
// Validation
// -----------------------------------------------------------------------------

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate student data
 */
export function validateStudentData(data: StudentData): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Required fields
  if (!data.academy_id) errors.push('academy_id is required');
  if (!data.external_id) errors.push('external_id is required');
  if (!data.provider) errors.push('provider is required');
  if (!data.name) errors.push('name is required');
  
  // Numeric ranges
  if (data.attendance_rate !== undefined) {
    if (data.attendance_rate < 0 || data.attendance_rate > 100) {
      warnings.push('attendance_rate should be between 0 and 100');
    }
  }
  
  if (data.monthly_fee !== undefined && data.monthly_fee < 0) {
    warnings.push('monthly_fee should not be negative');
  }
  
  if (data.unpaid_amount !== undefined && data.unpaid_amount < 0) {
    warnings.push('unpaid_amount should not be negative');
  }
  
  // Phone format
  if (data.parent_phone && !/^[\d\-]+$/.test(data.parent_phone)) {
    warnings.push('parent_phone format may be invalid');
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// -----------------------------------------------------------------------------
// Risk Calculation Helpers
// -----------------------------------------------------------------------------

/**
 * Calculate risk band from score
 */
export function getRiskBand(score: number): RiskBand {
  if (score >= 200) return 'critical';
  if (score >= 150) return 'high';
  if (score >= 100) return 'medium';
  return 'low';
}

/**
 * Calculate risk score from student data
 */
export function calculateRiskScore(data: StudentData): number {
  let score = 0;
  
  // Attendance (0-100 points)
  if (data.attendance_rate !== undefined) {
    const attendanceRisk = Math.max(0, 100 - data.attendance_rate);
    score += attendanceRisk;
  }
  
  // Payment (0-100 points)
  if (data.unpaid_amount && data.unpaid_amount > 0) {
    // 10만원당 20점
    score += Math.min(100, Math.floor(data.unpaid_amount / 100000) * 20);
  }
  
  // Score change (0-50 points)
  if (data.score_change !== undefined && data.score_change < 0) {
    score += Math.min(50, Math.abs(data.score_change) * 2);
  }
  
  // Homework (0-50 points)
  if (data.homework_completion !== undefined) {
    const homeworkRisk = Math.max(0, 100 - data.homework_completion) / 2;
    score += homeworkRisk;
  }
  
  return Math.min(300, Math.round(score));
}

// -----------------------------------------------------------------------------
// Export
// -----------------------------------------------------------------------------

export default DataMapper;
