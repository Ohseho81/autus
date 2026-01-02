/**
 * AUTUS Local Agent - Excel Watcher
 * ===================================
 * 
 * 학원 LMS 엑셀 파일 변경 감지 및 파싱
 * 
 * Electron (Desktop) 앱에서 실행
 * 파일 시스템 감시로 실시간 데이터 수집
 */

import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import { EventEmitter } from 'events';

// ═══════════════════════════════════════════════════════════════════════════
//                              TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface LmsRecord {
  studentName: string;
  parentPhone: string;
  grade?: string;
  subjects?: string[];
  currentScore?: number;
  previousScore?: number;
  scoreChange: number;
  attendanceRate: number;
  lastAttendance?: Date;
  tuitionPaid: boolean;
  nextPaymentDate?: Date;
}

export interface WatcherConfig {
  watchPaths: string[];           // 감시할 폴더/파일 경로
  filePattern: RegExp;            // 파일명 패턴 (예: *.xlsx)
  pollInterval: number;           // 폴링 간격 (ms)
  parseOnStart: boolean;          // 시작 시 기존 파일 파싱
}

export interface ParseResult {
  filePath: string;
  records: LmsRecord[];
  parsedAt: Date;
  errors: string[];
}

// ═══════════════════════════════════════════════════════════════════════════
//                              DEFAULT CONFIG
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_CONFIG: WatcherConfig = {
  watchPaths: [],
  filePattern: /\.(xlsx?|csv)$/i,
  pollInterval: 5000,  // 5초
  parseOnStart: true,
};

// ═══════════════════════════════════════════════════════════════════════════
//                              COLUMN MAPPINGS
// ═══════════════════════════════════════════════════════════════════════════

// 엑셀 컬럼명 → LmsRecord 필드 매핑
const COLUMN_MAPPINGS: Record<string, keyof LmsRecord> = {
  // 학생 정보
  '학생명': 'studentName',
  '이름': 'studentName',
  '학생이름': 'studentName',
  'student_name': 'studentName',
  
  // 학부모 연락처
  '학부모연락처': 'parentPhone',
  '연락처': 'parentPhone',
  '전화번호': 'parentPhone',
  '부모연락처': 'parentPhone',
  'parent_phone': 'parentPhone',
  'phone': 'parentPhone',
  
  // 학년
  '학년': 'grade',
  'grade': 'grade',
  
  // 성적
  '현재점수': 'currentScore',
  '이번성적': 'currentScore',
  '점수': 'currentScore',
  'current_score': 'currentScore',
  'score': 'currentScore',
  
  '이전점수': 'previousScore',
  '지난성적': 'previousScore',
  'previous_score': 'previousScore',
  
  // 출석
  '출석률': 'attendanceRate',
  '출석': 'attendanceRate',
  'attendance': 'attendanceRate',
  'attendance_rate': 'attendanceRate',
  
  // 결제
  '납부여부': 'tuitionPaid',
  '결제여부': 'tuitionPaid',
  'paid': 'tuitionPaid',
};

// ═══════════════════════════════════════════════════════════════════════════
//                              EXCEL WATCHER
// ═══════════════════════════════════════════════════════════════════════════

export class ExcelWatcher extends EventEmitter {
  private config: WatcherConfig;
  private watchers: fs.FSWatcher[] = [];
  private fileHashes: Map<string, string> = new Map();
  private isRunning: boolean = false;

  constructor(config: Partial<WatcherConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         LIFECYCLE
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 감시 시작
   */
  async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    console.log('[ExcelWatcher] Starting...');

    // 각 경로에 대해 감시 설정
    for (const watchPath of this.config.watchPaths) {
      await this.setupWatcher(watchPath);
    }

    // 시작 시 기존 파일 파싱
    if (this.config.parseOnStart) {
      await this.parseExistingFiles();
    }

    this.emit('started');
  }

  /**
   * 감시 중지
   */
  stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;

    for (const watcher of this.watchers) {
      watcher.close();
    }
    this.watchers = [];

    console.log('[ExcelWatcher] Stopped');
    this.emit('stopped');
  }

  /**
   * 감시 경로 추가
   */
  addWatchPath(watchPath: string): void {
    if (!this.config.watchPaths.includes(watchPath)) {
      this.config.watchPaths.push(watchPath);
      
      if (this.isRunning) {
        this.setupWatcher(watchPath);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         FILE WATCHING
  // ─────────────────────────────────────────────────────────────────────────

  private async setupWatcher(watchPath: string): Promise<void> {
    try {
      const stats = await fs.promises.stat(watchPath);

      if (stats.isDirectory()) {
        // 폴더 감시
        const watcher = fs.watch(watchPath, (eventType, filename) => {
          if (filename && this.config.filePattern.test(filename)) {
            const filePath = path.join(watchPath, filename);
            this.handleFileChange(filePath);
          }
        });
        this.watchers.push(watcher);
        console.log(`[ExcelWatcher] Watching directory: ${watchPath}`);
      } else if (stats.isFile()) {
        // 파일 직접 감시
        const watcher = fs.watch(watchPath, () => {
          this.handleFileChange(watchPath);
        });
        this.watchers.push(watcher);
        console.log(`[ExcelWatcher] Watching file: ${watchPath}`);
      }
    } catch (error) {
      console.error(`[ExcelWatcher] Failed to setup watcher for ${watchPath}:`, error);
    }
  }

  private async handleFileChange(filePath: string): Promise<void> {
    // 파일 해시로 실제 변경 여부 확인
    const newHash = await this.getFileHash(filePath);
    const oldHash = this.fileHashes.get(filePath);

    if (newHash && newHash !== oldHash) {
      this.fileHashes.set(filePath, newHash);
      
      console.log(`[ExcelWatcher] File changed: ${filePath}`);
      
      // 파싱 및 이벤트 발생
      const result = await this.parseFile(filePath);
      this.emit('fileChanged', result);
    }
  }

  private async getFileHash(filePath: string): Promise<string | null> {
    try {
      const content = await fs.promises.readFile(filePath);
      const crypto = require('crypto');
      return crypto.createHash('md5').update(content).digest('hex');
    } catch {
      return null;
    }
  }

  private async parseExistingFiles(): Promise<void> {
    for (const watchPath of this.config.watchPaths) {
      try {
        const stats = await fs.promises.stat(watchPath);

        if (stats.isDirectory()) {
          const files = await fs.promises.readdir(watchPath);
          for (const file of files) {
            if (this.config.filePattern.test(file)) {
              const filePath = path.join(watchPath, file);
              const result = await this.parseFile(filePath);
              this.emit('fileParsed', result);
            }
          }
        } else if (stats.isFile()) {
          const result = await this.parseFile(watchPath);
          this.emit('fileParsed', result);
        }
      } catch (error) {
        console.error(`[ExcelWatcher] Failed to parse existing files in ${watchPath}:`, error);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         EXCEL PARSING
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 엑셀 파일 파싱
   */
  async parseFile(filePath: string): Promise<ParseResult> {
    const result: ParseResult = {
      filePath,
      records: [],
      parsedAt: new Date(),
      errors: [],
    };

    try {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      
      // JSON으로 변환
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      if (rows.length === 0) {
        result.errors.push('No data found in file');
        return result;
      }

      // 컬럼 매핑 찾기
      const firstRow = rows[0] as Record<string, any>;
      const columnMap = this.findColumnMapping(Object.keys(firstRow));

      // 각 행 파싱
      for (let i = 0; i < rows.length; i++) {
        try {
          const row = rows[i] as Record<string, any>;
          const record = this.parseRow(row, columnMap);
          
          if (record) {
            result.records.push(record);
          }
        } catch (error) {
          result.errors.push(`Row ${i + 1}: ${error}`);
        }
      }

      // 파일 해시 저장
      const hash = await this.getFileHash(filePath);
      if (hash) {
        this.fileHashes.set(filePath, hash);
      }

    } catch (error) {
      result.errors.push(`Parse error: ${error}`);
    }

    return result;
  }

  private findColumnMapping(headers: string[]): Map<string, keyof LmsRecord> {
    const mapping = new Map<string, keyof LmsRecord>();

    for (const header of headers) {
      const normalizedHeader = header.toLowerCase().trim();
      
      for (const [pattern, field] of Object.entries(COLUMN_MAPPINGS)) {
        if (normalizedHeader === pattern.toLowerCase() || 
            normalizedHeader.includes(pattern.toLowerCase())) {
          mapping.set(header, field);
          break;
        }
      }
    }

    return mapping;
  }

  private parseRow(
    row: Record<string, any>,
    columnMap: Map<string, keyof LmsRecord>
  ): LmsRecord | null {
    const record: Partial<LmsRecord> = {
      scoreChange: 0,
      attendanceRate: 1,
      tuitionPaid: true,
    };

    // 매핑된 컬럼 값 추출
    for (const [header, field] of columnMap) {
      const value = row[header];
      
      if (value !== undefined && value !== '') {
        switch (field) {
          case 'currentScore':
          case 'previousScore':
            record[field] = parseFloat(value) || 0;
            break;
          case 'attendanceRate':
            // 백분율 또는 소수점
            const rate = parseFloat(value);
            record[field] = rate > 1 ? rate / 100 : rate;
            break;
          case 'tuitionPaid':
            record[field] = ['Y', 'O', '완료', '납부', 'true', '1'].includes(
              String(value).toUpperCase()
            );
            break;
          case 'parentPhone':
            // 전화번호 정규화
            record[field] = this.normalizePhone(String(value));
            break;
          default:
            (record as any)[field] = String(value);
        }
      }
    }

    // 필수 필드 검증
    if (!record.studentName || !record.parentPhone) {
      return null;
    }

    // 성적 변화 계산
    if (record.currentScore !== undefined && record.previousScore !== undefined) {
      record.scoreChange = record.currentScore - record.previousScore;
    }

    return record as LmsRecord;
  }

  private normalizePhone(phone: string): string {
    // 숫자만 추출
    const digits = phone.replace(/[^0-9]/g, '');
    
    // 형식화 (010-1234-5678)
    if (digits.length === 11 && digits.startsWith('010')) {
      return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
    }
    
    return digits;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         PUBLIC API
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 수동으로 특정 파일 파싱
   */
  async manualParse(filePath: string): Promise<ParseResult> {
    return this.parseFile(filePath);
  }

  /**
   * 감시 중인 경로 목록
   */
  getWatchPaths(): string[] {
    return [...this.config.watchPaths];
  }

  /**
   * 상태 조회
   */
  getStatus(): {
    isRunning: boolean;
    watchPaths: string[];
    trackedFiles: number;
  } {
    return {
      isRunning: this.isRunning,
      watchPaths: this.config.watchPaths,
      trackedFiles: this.fileHashes.size,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//                              FACTORY
// ═══════════════════════════════════════════════════════════════════════════

export function createExcelWatcher(config?: Partial<WatcherConfig>): ExcelWatcher {
  return new ExcelWatcher(config);
}

// ═══════════════════════════════════════════════════════════════════════════
//                              USAGE EXAMPLE
// ═══════════════════════════════════════════════════════════════════════════

/*
import { createExcelWatcher } from './ExcelWatcher';

const watcher = createExcelWatcher({
  watchPaths: [
    '/Users/user/Documents/학원관리',
    '/Users/user/Desktop/LMS.xlsx',
  ],
  parseOnStart: true,
});

watcher.on('fileChanged', (result) => {
  console.log('File changed:', result.filePath);
  console.log('Records:', result.records.length);
  
  // SQ 업데이트
  for (const record of result.records) {
    sqService.upsertNode({
      id: record.parentPhone,
      name: record.studentName + ' 학부모',
      phone: record.parentPhone,
      studentName: record.studentName,
      synergyScore: calculateSynergyFromLms(record),
    });
  }
});

watcher.on('fileParsed', (result) => {
  console.log('Initial parse:', result.filePath);
});

watcher.start();
*/










/**
 * AUTUS Local Agent - Excel Watcher
 * ===================================
 * 
 * 학원 LMS 엑셀 파일 변경 감지 및 파싱
 * 
 * Electron (Desktop) 앱에서 실행
 * 파일 시스템 감시로 실시간 데이터 수집
 */

import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import { EventEmitter } from 'events';

// ═══════════════════════════════════════════════════════════════════════════
//                              TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface LmsRecord {
  studentName: string;
  parentPhone: string;
  grade?: string;
  subjects?: string[];
  currentScore?: number;
  previousScore?: number;
  scoreChange: number;
  attendanceRate: number;
  lastAttendance?: Date;
  tuitionPaid: boolean;
  nextPaymentDate?: Date;
}

export interface WatcherConfig {
  watchPaths: string[];           // 감시할 폴더/파일 경로
  filePattern: RegExp;            // 파일명 패턴 (예: *.xlsx)
  pollInterval: number;           // 폴링 간격 (ms)
  parseOnStart: boolean;          // 시작 시 기존 파일 파싱
}

export interface ParseResult {
  filePath: string;
  records: LmsRecord[];
  parsedAt: Date;
  errors: string[];
}

// ═══════════════════════════════════════════════════════════════════════════
//                              DEFAULT CONFIG
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_CONFIG: WatcherConfig = {
  watchPaths: [],
  filePattern: /\.(xlsx?|csv)$/i,
  pollInterval: 5000,  // 5초
  parseOnStart: true,
};

// ═══════════════════════════════════════════════════════════════════════════
//                              COLUMN MAPPINGS
// ═══════════════════════════════════════════════════════════════════════════

// 엑셀 컬럼명 → LmsRecord 필드 매핑
const COLUMN_MAPPINGS: Record<string, keyof LmsRecord> = {
  // 학생 정보
  '학생명': 'studentName',
  '이름': 'studentName',
  '학생이름': 'studentName',
  'student_name': 'studentName',
  
  // 학부모 연락처
  '학부모연락처': 'parentPhone',
  '연락처': 'parentPhone',
  '전화번호': 'parentPhone',
  '부모연락처': 'parentPhone',
  'parent_phone': 'parentPhone',
  'phone': 'parentPhone',
  
  // 학년
  '학년': 'grade',
  'grade': 'grade',
  
  // 성적
  '현재점수': 'currentScore',
  '이번성적': 'currentScore',
  '점수': 'currentScore',
  'current_score': 'currentScore',
  'score': 'currentScore',
  
  '이전점수': 'previousScore',
  '지난성적': 'previousScore',
  'previous_score': 'previousScore',
  
  // 출석
  '출석률': 'attendanceRate',
  '출석': 'attendanceRate',
  'attendance': 'attendanceRate',
  'attendance_rate': 'attendanceRate',
  
  // 결제
  '납부여부': 'tuitionPaid',
  '결제여부': 'tuitionPaid',
  'paid': 'tuitionPaid',
};

// ═══════════════════════════════════════════════════════════════════════════
//                              EXCEL WATCHER
// ═══════════════════════════════════════════════════════════════════════════

export class ExcelWatcher extends EventEmitter {
  private config: WatcherConfig;
  private watchers: fs.FSWatcher[] = [];
  private fileHashes: Map<string, string> = new Map();
  private isRunning: boolean = false;

  constructor(config: Partial<WatcherConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         LIFECYCLE
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 감시 시작
   */
  async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    console.log('[ExcelWatcher] Starting...');

    // 각 경로에 대해 감시 설정
    for (const watchPath of this.config.watchPaths) {
      await this.setupWatcher(watchPath);
    }

    // 시작 시 기존 파일 파싱
    if (this.config.parseOnStart) {
      await this.parseExistingFiles();
    }

    this.emit('started');
  }

  /**
   * 감시 중지
   */
  stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;

    for (const watcher of this.watchers) {
      watcher.close();
    }
    this.watchers = [];

    console.log('[ExcelWatcher] Stopped');
    this.emit('stopped');
  }

  /**
   * 감시 경로 추가
   */
  addWatchPath(watchPath: string): void {
    if (!this.config.watchPaths.includes(watchPath)) {
      this.config.watchPaths.push(watchPath);
      
      if (this.isRunning) {
        this.setupWatcher(watchPath);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         FILE WATCHING
  // ─────────────────────────────────────────────────────────────────────────

  private async setupWatcher(watchPath: string): Promise<void> {
    try {
      const stats = await fs.promises.stat(watchPath);

      if (stats.isDirectory()) {
        // 폴더 감시
        const watcher = fs.watch(watchPath, (eventType, filename) => {
          if (filename && this.config.filePattern.test(filename)) {
            const filePath = path.join(watchPath, filename);
            this.handleFileChange(filePath);
          }
        });
        this.watchers.push(watcher);
        console.log(`[ExcelWatcher] Watching directory: ${watchPath}`);
      } else if (stats.isFile()) {
        // 파일 직접 감시
        const watcher = fs.watch(watchPath, () => {
          this.handleFileChange(watchPath);
        });
        this.watchers.push(watcher);
        console.log(`[ExcelWatcher] Watching file: ${watchPath}`);
      }
    } catch (error) {
      console.error(`[ExcelWatcher] Failed to setup watcher for ${watchPath}:`, error);
    }
  }

  private async handleFileChange(filePath: string): Promise<void> {
    // 파일 해시로 실제 변경 여부 확인
    const newHash = await this.getFileHash(filePath);
    const oldHash = this.fileHashes.get(filePath);

    if (newHash && newHash !== oldHash) {
      this.fileHashes.set(filePath, newHash);
      
      console.log(`[ExcelWatcher] File changed: ${filePath}`);
      
      // 파싱 및 이벤트 발생
      const result = await this.parseFile(filePath);
      this.emit('fileChanged', result);
    }
  }

  private async getFileHash(filePath: string): Promise<string | null> {
    try {
      const content = await fs.promises.readFile(filePath);
      const crypto = require('crypto');
      return crypto.createHash('md5').update(content).digest('hex');
    } catch {
      return null;
    }
  }

  private async parseExistingFiles(): Promise<void> {
    for (const watchPath of this.config.watchPaths) {
      try {
        const stats = await fs.promises.stat(watchPath);

        if (stats.isDirectory()) {
          const files = await fs.promises.readdir(watchPath);
          for (const file of files) {
            if (this.config.filePattern.test(file)) {
              const filePath = path.join(watchPath, file);
              const result = await this.parseFile(filePath);
              this.emit('fileParsed', result);
            }
          }
        } else if (stats.isFile()) {
          const result = await this.parseFile(watchPath);
          this.emit('fileParsed', result);
        }
      } catch (error) {
        console.error(`[ExcelWatcher] Failed to parse existing files in ${watchPath}:`, error);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         EXCEL PARSING
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 엑셀 파일 파싱
   */
  async parseFile(filePath: string): Promise<ParseResult> {
    const result: ParseResult = {
      filePath,
      records: [],
      parsedAt: new Date(),
      errors: [],
    };

    try {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      
      // JSON으로 변환
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      if (rows.length === 0) {
        result.errors.push('No data found in file');
        return result;
      }

      // 컬럼 매핑 찾기
      const firstRow = rows[0] as Record<string, any>;
      const columnMap = this.findColumnMapping(Object.keys(firstRow));

      // 각 행 파싱
      for (let i = 0; i < rows.length; i++) {
        try {
          const row = rows[i] as Record<string, any>;
          const record = this.parseRow(row, columnMap);
          
          if (record) {
            result.records.push(record);
          }
        } catch (error) {
          result.errors.push(`Row ${i + 1}: ${error}`);
        }
      }

      // 파일 해시 저장
      const hash = await this.getFileHash(filePath);
      if (hash) {
        this.fileHashes.set(filePath, hash);
      }

    } catch (error) {
      result.errors.push(`Parse error: ${error}`);
    }

    return result;
  }

  private findColumnMapping(headers: string[]): Map<string, keyof LmsRecord> {
    const mapping = new Map<string, keyof LmsRecord>();

    for (const header of headers) {
      const normalizedHeader = header.toLowerCase().trim();
      
      for (const [pattern, field] of Object.entries(COLUMN_MAPPINGS)) {
        if (normalizedHeader === pattern.toLowerCase() || 
            normalizedHeader.includes(pattern.toLowerCase())) {
          mapping.set(header, field);
          break;
        }
      }
    }

    return mapping;
  }

  private parseRow(
    row: Record<string, any>,
    columnMap: Map<string, keyof LmsRecord>
  ): LmsRecord | null {
    const record: Partial<LmsRecord> = {
      scoreChange: 0,
      attendanceRate: 1,
      tuitionPaid: true,
    };

    // 매핑된 컬럼 값 추출
    for (const [header, field] of columnMap) {
      const value = row[header];
      
      if (value !== undefined && value !== '') {
        switch (field) {
          case 'currentScore':
          case 'previousScore':
            record[field] = parseFloat(value) || 0;
            break;
          case 'attendanceRate':
            // 백분율 또는 소수점
            const rate = parseFloat(value);
            record[field] = rate > 1 ? rate / 100 : rate;
            break;
          case 'tuitionPaid':
            record[field] = ['Y', 'O', '완료', '납부', 'true', '1'].includes(
              String(value).toUpperCase()
            );
            break;
          case 'parentPhone':
            // 전화번호 정규화
            record[field] = this.normalizePhone(String(value));
            break;
          default:
            (record as any)[field] = String(value);
        }
      }
    }

    // 필수 필드 검증
    if (!record.studentName || !record.parentPhone) {
      return null;
    }

    // 성적 변화 계산
    if (record.currentScore !== undefined && record.previousScore !== undefined) {
      record.scoreChange = record.currentScore - record.previousScore;
    }

    return record as LmsRecord;
  }

  private normalizePhone(phone: string): string {
    // 숫자만 추출
    const digits = phone.replace(/[^0-9]/g, '');
    
    // 형식화 (010-1234-5678)
    if (digits.length === 11 && digits.startsWith('010')) {
      return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
    }
    
    return digits;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         PUBLIC API
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 수동으로 특정 파일 파싱
   */
  async manualParse(filePath: string): Promise<ParseResult> {
    return this.parseFile(filePath);
  }

  /**
   * 감시 중인 경로 목록
   */
  getWatchPaths(): string[] {
    return [...this.config.watchPaths];
  }

  /**
   * 상태 조회
   */
  getStatus(): {
    isRunning: boolean;
    watchPaths: string[];
    trackedFiles: number;
  } {
    return {
      isRunning: this.isRunning,
      watchPaths: this.config.watchPaths,
      trackedFiles: this.fileHashes.size,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//                              FACTORY
// ═══════════════════════════════════════════════════════════════════════════

export function createExcelWatcher(config?: Partial<WatcherConfig>): ExcelWatcher {
  return new ExcelWatcher(config);
}

// ═══════════════════════════════════════════════════════════════════════════
//                              USAGE EXAMPLE
// ═══════════════════════════════════════════════════════════════════════════

/*
import { createExcelWatcher } from './ExcelWatcher';

const watcher = createExcelWatcher({
  watchPaths: [
    '/Users/user/Documents/학원관리',
    '/Users/user/Desktop/LMS.xlsx',
  ],
  parseOnStart: true,
});

watcher.on('fileChanged', (result) => {
  console.log('File changed:', result.filePath);
  console.log('Records:', result.records.length);
  
  // SQ 업데이트
  for (const record of result.records) {
    sqService.upsertNode({
      id: record.parentPhone,
      name: record.studentName + ' 학부모',
      phone: record.parentPhone,
      studentName: record.studentName,
      synergyScore: calculateSynergyFromLms(record),
    });
  }
});

watcher.on('fileParsed', (result) => {
  console.log('Initial parse:', result.filePath);
});

watcher.start();
*/










/**
 * AUTUS Local Agent - Excel Watcher
 * ===================================
 * 
 * 학원 LMS 엑셀 파일 변경 감지 및 파싱
 * 
 * Electron (Desktop) 앱에서 실행
 * 파일 시스템 감시로 실시간 데이터 수집
 */

import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import { EventEmitter } from 'events';

// ═══════════════════════════════════════════════════════════════════════════
//                              TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface LmsRecord {
  studentName: string;
  parentPhone: string;
  grade?: string;
  subjects?: string[];
  currentScore?: number;
  previousScore?: number;
  scoreChange: number;
  attendanceRate: number;
  lastAttendance?: Date;
  tuitionPaid: boolean;
  nextPaymentDate?: Date;
}

export interface WatcherConfig {
  watchPaths: string[];           // 감시할 폴더/파일 경로
  filePattern: RegExp;            // 파일명 패턴 (예: *.xlsx)
  pollInterval: number;           // 폴링 간격 (ms)
  parseOnStart: boolean;          // 시작 시 기존 파일 파싱
}

export interface ParseResult {
  filePath: string;
  records: LmsRecord[];
  parsedAt: Date;
  errors: string[];
}

// ═══════════════════════════════════════════════════════════════════════════
//                              DEFAULT CONFIG
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_CONFIG: WatcherConfig = {
  watchPaths: [],
  filePattern: /\.(xlsx?|csv)$/i,
  pollInterval: 5000,  // 5초
  parseOnStart: true,
};

// ═══════════════════════════════════════════════════════════════════════════
//                              COLUMN MAPPINGS
// ═══════════════════════════════════════════════════════════════════════════

// 엑셀 컬럼명 → LmsRecord 필드 매핑
const COLUMN_MAPPINGS: Record<string, keyof LmsRecord> = {
  // 학생 정보
  '학생명': 'studentName',
  '이름': 'studentName',
  '학생이름': 'studentName',
  'student_name': 'studentName',
  
  // 학부모 연락처
  '학부모연락처': 'parentPhone',
  '연락처': 'parentPhone',
  '전화번호': 'parentPhone',
  '부모연락처': 'parentPhone',
  'parent_phone': 'parentPhone',
  'phone': 'parentPhone',
  
  // 학년
  '학년': 'grade',
  'grade': 'grade',
  
  // 성적
  '현재점수': 'currentScore',
  '이번성적': 'currentScore',
  '점수': 'currentScore',
  'current_score': 'currentScore',
  'score': 'currentScore',
  
  '이전점수': 'previousScore',
  '지난성적': 'previousScore',
  'previous_score': 'previousScore',
  
  // 출석
  '출석률': 'attendanceRate',
  '출석': 'attendanceRate',
  'attendance': 'attendanceRate',
  'attendance_rate': 'attendanceRate',
  
  // 결제
  '납부여부': 'tuitionPaid',
  '결제여부': 'tuitionPaid',
  'paid': 'tuitionPaid',
};

// ═══════════════════════════════════════════════════════════════════════════
//                              EXCEL WATCHER
// ═══════════════════════════════════════════════════════════════════════════

export class ExcelWatcher extends EventEmitter {
  private config: WatcherConfig;
  private watchers: fs.FSWatcher[] = [];
  private fileHashes: Map<string, string> = new Map();
  private isRunning: boolean = false;

  constructor(config: Partial<WatcherConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         LIFECYCLE
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 감시 시작
   */
  async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    console.log('[ExcelWatcher] Starting...');

    // 각 경로에 대해 감시 설정
    for (const watchPath of this.config.watchPaths) {
      await this.setupWatcher(watchPath);
    }

    // 시작 시 기존 파일 파싱
    if (this.config.parseOnStart) {
      await this.parseExistingFiles();
    }

    this.emit('started');
  }

  /**
   * 감시 중지
   */
  stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;

    for (const watcher of this.watchers) {
      watcher.close();
    }
    this.watchers = [];

    console.log('[ExcelWatcher] Stopped');
    this.emit('stopped');
  }

  /**
   * 감시 경로 추가
   */
  addWatchPath(watchPath: string): void {
    if (!this.config.watchPaths.includes(watchPath)) {
      this.config.watchPaths.push(watchPath);
      
      if (this.isRunning) {
        this.setupWatcher(watchPath);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         FILE WATCHING
  // ─────────────────────────────────────────────────────────────────────────

  private async setupWatcher(watchPath: string): Promise<void> {
    try {
      const stats = await fs.promises.stat(watchPath);

      if (stats.isDirectory()) {
        // 폴더 감시
        const watcher = fs.watch(watchPath, (eventType, filename) => {
          if (filename && this.config.filePattern.test(filename)) {
            const filePath = path.join(watchPath, filename);
            this.handleFileChange(filePath);
          }
        });
        this.watchers.push(watcher);
        console.log(`[ExcelWatcher] Watching directory: ${watchPath}`);
      } else if (stats.isFile()) {
        // 파일 직접 감시
        const watcher = fs.watch(watchPath, () => {
          this.handleFileChange(watchPath);
        });
        this.watchers.push(watcher);
        console.log(`[ExcelWatcher] Watching file: ${watchPath}`);
      }
    } catch (error) {
      console.error(`[ExcelWatcher] Failed to setup watcher for ${watchPath}:`, error);
    }
  }

  private async handleFileChange(filePath: string): Promise<void> {
    // 파일 해시로 실제 변경 여부 확인
    const newHash = await this.getFileHash(filePath);
    const oldHash = this.fileHashes.get(filePath);

    if (newHash && newHash !== oldHash) {
      this.fileHashes.set(filePath, newHash);
      
      console.log(`[ExcelWatcher] File changed: ${filePath}`);
      
      // 파싱 및 이벤트 발생
      const result = await this.parseFile(filePath);
      this.emit('fileChanged', result);
    }
  }

  private async getFileHash(filePath: string): Promise<string | null> {
    try {
      const content = await fs.promises.readFile(filePath);
      const crypto = require('crypto');
      return crypto.createHash('md5').update(content).digest('hex');
    } catch {
      return null;
    }
  }

  private async parseExistingFiles(): Promise<void> {
    for (const watchPath of this.config.watchPaths) {
      try {
        const stats = await fs.promises.stat(watchPath);

        if (stats.isDirectory()) {
          const files = await fs.promises.readdir(watchPath);
          for (const file of files) {
            if (this.config.filePattern.test(file)) {
              const filePath = path.join(watchPath, file);
              const result = await this.parseFile(filePath);
              this.emit('fileParsed', result);
            }
          }
        } else if (stats.isFile()) {
          const result = await this.parseFile(watchPath);
          this.emit('fileParsed', result);
        }
      } catch (error) {
        console.error(`[ExcelWatcher] Failed to parse existing files in ${watchPath}:`, error);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         EXCEL PARSING
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 엑셀 파일 파싱
   */
  async parseFile(filePath: string): Promise<ParseResult> {
    const result: ParseResult = {
      filePath,
      records: [],
      parsedAt: new Date(),
      errors: [],
    };

    try {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      
      // JSON으로 변환
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      if (rows.length === 0) {
        result.errors.push('No data found in file');
        return result;
      }

      // 컬럼 매핑 찾기
      const firstRow = rows[0] as Record<string, any>;
      const columnMap = this.findColumnMapping(Object.keys(firstRow));

      // 각 행 파싱
      for (let i = 0; i < rows.length; i++) {
        try {
          const row = rows[i] as Record<string, any>;
          const record = this.parseRow(row, columnMap);
          
          if (record) {
            result.records.push(record);
          }
        } catch (error) {
          result.errors.push(`Row ${i + 1}: ${error}`);
        }
      }

      // 파일 해시 저장
      const hash = await this.getFileHash(filePath);
      if (hash) {
        this.fileHashes.set(filePath, hash);
      }

    } catch (error) {
      result.errors.push(`Parse error: ${error}`);
    }

    return result;
  }

  private findColumnMapping(headers: string[]): Map<string, keyof LmsRecord> {
    const mapping = new Map<string, keyof LmsRecord>();

    for (const header of headers) {
      const normalizedHeader = header.toLowerCase().trim();
      
      for (const [pattern, field] of Object.entries(COLUMN_MAPPINGS)) {
        if (normalizedHeader === pattern.toLowerCase() || 
            normalizedHeader.includes(pattern.toLowerCase())) {
          mapping.set(header, field);
          break;
        }
      }
    }

    return mapping;
  }

  private parseRow(
    row: Record<string, any>,
    columnMap: Map<string, keyof LmsRecord>
  ): LmsRecord | null {
    const record: Partial<LmsRecord> = {
      scoreChange: 0,
      attendanceRate: 1,
      tuitionPaid: true,
    };

    // 매핑된 컬럼 값 추출
    for (const [header, field] of columnMap) {
      const value = row[header];
      
      if (value !== undefined && value !== '') {
        switch (field) {
          case 'currentScore':
          case 'previousScore':
            record[field] = parseFloat(value) || 0;
            break;
          case 'attendanceRate':
            // 백분율 또는 소수점
            const rate = parseFloat(value);
            record[field] = rate > 1 ? rate / 100 : rate;
            break;
          case 'tuitionPaid':
            record[field] = ['Y', 'O', '완료', '납부', 'true', '1'].includes(
              String(value).toUpperCase()
            );
            break;
          case 'parentPhone':
            // 전화번호 정규화
            record[field] = this.normalizePhone(String(value));
            break;
          default:
            (record as any)[field] = String(value);
        }
      }
    }

    // 필수 필드 검증
    if (!record.studentName || !record.parentPhone) {
      return null;
    }

    // 성적 변화 계산
    if (record.currentScore !== undefined && record.previousScore !== undefined) {
      record.scoreChange = record.currentScore - record.previousScore;
    }

    return record as LmsRecord;
  }

  private normalizePhone(phone: string): string {
    // 숫자만 추출
    const digits = phone.replace(/[^0-9]/g, '');
    
    // 형식화 (010-1234-5678)
    if (digits.length === 11 && digits.startsWith('010')) {
      return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
    }
    
    return digits;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         PUBLIC API
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 수동으로 특정 파일 파싱
   */
  async manualParse(filePath: string): Promise<ParseResult> {
    return this.parseFile(filePath);
  }

  /**
   * 감시 중인 경로 목록
   */
  getWatchPaths(): string[] {
    return [...this.config.watchPaths];
  }

  /**
   * 상태 조회
   */
  getStatus(): {
    isRunning: boolean;
    watchPaths: string[];
    trackedFiles: number;
  } {
    return {
      isRunning: this.isRunning,
      watchPaths: this.config.watchPaths,
      trackedFiles: this.fileHashes.size,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//                              FACTORY
// ═══════════════════════════════════════════════════════════════════════════

export function createExcelWatcher(config?: Partial<WatcherConfig>): ExcelWatcher {
  return new ExcelWatcher(config);
}

// ═══════════════════════════════════════════════════════════════════════════
//                              USAGE EXAMPLE
// ═══════════════════════════════════════════════════════════════════════════

/*
import { createExcelWatcher } from './ExcelWatcher';

const watcher = createExcelWatcher({
  watchPaths: [
    '/Users/user/Documents/학원관리',
    '/Users/user/Desktop/LMS.xlsx',
  ],
  parseOnStart: true,
});

watcher.on('fileChanged', (result) => {
  console.log('File changed:', result.filePath);
  console.log('Records:', result.records.length);
  
  // SQ 업데이트
  for (const record of result.records) {
    sqService.upsertNode({
      id: record.parentPhone,
      name: record.studentName + ' 학부모',
      phone: record.parentPhone,
      studentName: record.studentName,
      synergyScore: calculateSynergyFromLms(record),
    });
  }
});

watcher.on('fileParsed', (result) => {
  console.log('Initial parse:', result.filePath);
});

watcher.start();
*/










/**
 * AUTUS Local Agent - Excel Watcher
 * ===================================
 * 
 * 학원 LMS 엑셀 파일 변경 감지 및 파싱
 * 
 * Electron (Desktop) 앱에서 실행
 * 파일 시스템 감시로 실시간 데이터 수집
 */

import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import { EventEmitter } from 'events';

// ═══════════════════════════════════════════════════════════════════════════
//                              TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface LmsRecord {
  studentName: string;
  parentPhone: string;
  grade?: string;
  subjects?: string[];
  currentScore?: number;
  previousScore?: number;
  scoreChange: number;
  attendanceRate: number;
  lastAttendance?: Date;
  tuitionPaid: boolean;
  nextPaymentDate?: Date;
}

export interface WatcherConfig {
  watchPaths: string[];           // 감시할 폴더/파일 경로
  filePattern: RegExp;            // 파일명 패턴 (예: *.xlsx)
  pollInterval: number;           // 폴링 간격 (ms)
  parseOnStart: boolean;          // 시작 시 기존 파일 파싱
}

export interface ParseResult {
  filePath: string;
  records: LmsRecord[];
  parsedAt: Date;
  errors: string[];
}

// ═══════════════════════════════════════════════════════════════════════════
//                              DEFAULT CONFIG
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_CONFIG: WatcherConfig = {
  watchPaths: [],
  filePattern: /\.(xlsx?|csv)$/i,
  pollInterval: 5000,  // 5초
  parseOnStart: true,
};

// ═══════════════════════════════════════════════════════════════════════════
//                              COLUMN MAPPINGS
// ═══════════════════════════════════════════════════════════════════════════

// 엑셀 컬럼명 → LmsRecord 필드 매핑
const COLUMN_MAPPINGS: Record<string, keyof LmsRecord> = {
  // 학생 정보
  '학생명': 'studentName',
  '이름': 'studentName',
  '학생이름': 'studentName',
  'student_name': 'studentName',
  
  // 학부모 연락처
  '학부모연락처': 'parentPhone',
  '연락처': 'parentPhone',
  '전화번호': 'parentPhone',
  '부모연락처': 'parentPhone',
  'parent_phone': 'parentPhone',
  'phone': 'parentPhone',
  
  // 학년
  '학년': 'grade',
  'grade': 'grade',
  
  // 성적
  '현재점수': 'currentScore',
  '이번성적': 'currentScore',
  '점수': 'currentScore',
  'current_score': 'currentScore',
  'score': 'currentScore',
  
  '이전점수': 'previousScore',
  '지난성적': 'previousScore',
  'previous_score': 'previousScore',
  
  // 출석
  '출석률': 'attendanceRate',
  '출석': 'attendanceRate',
  'attendance': 'attendanceRate',
  'attendance_rate': 'attendanceRate',
  
  // 결제
  '납부여부': 'tuitionPaid',
  '결제여부': 'tuitionPaid',
  'paid': 'tuitionPaid',
};

// ═══════════════════════════════════════════════════════════════════════════
//                              EXCEL WATCHER
// ═══════════════════════════════════════════════════════════════════════════

export class ExcelWatcher extends EventEmitter {
  private config: WatcherConfig;
  private watchers: fs.FSWatcher[] = [];
  private fileHashes: Map<string, string> = new Map();
  private isRunning: boolean = false;

  constructor(config: Partial<WatcherConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         LIFECYCLE
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 감시 시작
   */
  async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    console.log('[ExcelWatcher] Starting...');

    // 각 경로에 대해 감시 설정
    for (const watchPath of this.config.watchPaths) {
      await this.setupWatcher(watchPath);
    }

    // 시작 시 기존 파일 파싱
    if (this.config.parseOnStart) {
      await this.parseExistingFiles();
    }

    this.emit('started');
  }

  /**
   * 감시 중지
   */
  stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;

    for (const watcher of this.watchers) {
      watcher.close();
    }
    this.watchers = [];

    console.log('[ExcelWatcher] Stopped');
    this.emit('stopped');
  }

  /**
   * 감시 경로 추가
   */
  addWatchPath(watchPath: string): void {
    if (!this.config.watchPaths.includes(watchPath)) {
      this.config.watchPaths.push(watchPath);
      
      if (this.isRunning) {
        this.setupWatcher(watchPath);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         FILE WATCHING
  // ─────────────────────────────────────────────────────────────────────────

  private async setupWatcher(watchPath: string): Promise<void> {
    try {
      const stats = await fs.promises.stat(watchPath);

      if (stats.isDirectory()) {
        // 폴더 감시
        const watcher = fs.watch(watchPath, (eventType, filename) => {
          if (filename && this.config.filePattern.test(filename)) {
            const filePath = path.join(watchPath, filename);
            this.handleFileChange(filePath);
          }
        });
        this.watchers.push(watcher);
        console.log(`[ExcelWatcher] Watching directory: ${watchPath}`);
      } else if (stats.isFile()) {
        // 파일 직접 감시
        const watcher = fs.watch(watchPath, () => {
          this.handleFileChange(watchPath);
        });
        this.watchers.push(watcher);
        console.log(`[ExcelWatcher] Watching file: ${watchPath}`);
      }
    } catch (error) {
      console.error(`[ExcelWatcher] Failed to setup watcher for ${watchPath}:`, error);
    }
  }

  private async handleFileChange(filePath: string): Promise<void> {
    // 파일 해시로 실제 변경 여부 확인
    const newHash = await this.getFileHash(filePath);
    const oldHash = this.fileHashes.get(filePath);

    if (newHash && newHash !== oldHash) {
      this.fileHashes.set(filePath, newHash);
      
      console.log(`[ExcelWatcher] File changed: ${filePath}`);
      
      // 파싱 및 이벤트 발생
      const result = await this.parseFile(filePath);
      this.emit('fileChanged', result);
    }
  }

  private async getFileHash(filePath: string): Promise<string | null> {
    try {
      const content = await fs.promises.readFile(filePath);
      const crypto = require('crypto');
      return crypto.createHash('md5').update(content).digest('hex');
    } catch {
      return null;
    }
  }

  private async parseExistingFiles(): Promise<void> {
    for (const watchPath of this.config.watchPaths) {
      try {
        const stats = await fs.promises.stat(watchPath);

        if (stats.isDirectory()) {
          const files = await fs.promises.readdir(watchPath);
          for (const file of files) {
            if (this.config.filePattern.test(file)) {
              const filePath = path.join(watchPath, file);
              const result = await this.parseFile(filePath);
              this.emit('fileParsed', result);
            }
          }
        } else if (stats.isFile()) {
          const result = await this.parseFile(watchPath);
          this.emit('fileParsed', result);
        }
      } catch (error) {
        console.error(`[ExcelWatcher] Failed to parse existing files in ${watchPath}:`, error);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         EXCEL PARSING
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 엑셀 파일 파싱
   */
  async parseFile(filePath: string): Promise<ParseResult> {
    const result: ParseResult = {
      filePath,
      records: [],
      parsedAt: new Date(),
      errors: [],
    };

    try {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      
      // JSON으로 변환
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      if (rows.length === 0) {
        result.errors.push('No data found in file');
        return result;
      }

      // 컬럼 매핑 찾기
      const firstRow = rows[0] as Record<string, any>;
      const columnMap = this.findColumnMapping(Object.keys(firstRow));

      // 각 행 파싱
      for (let i = 0; i < rows.length; i++) {
        try {
          const row = rows[i] as Record<string, any>;
          const record = this.parseRow(row, columnMap);
          
          if (record) {
            result.records.push(record);
          }
        } catch (error) {
          result.errors.push(`Row ${i + 1}: ${error}`);
        }
      }

      // 파일 해시 저장
      const hash = await this.getFileHash(filePath);
      if (hash) {
        this.fileHashes.set(filePath, hash);
      }

    } catch (error) {
      result.errors.push(`Parse error: ${error}`);
    }

    return result;
  }

  private findColumnMapping(headers: string[]): Map<string, keyof LmsRecord> {
    const mapping = new Map<string, keyof LmsRecord>();

    for (const header of headers) {
      const normalizedHeader = header.toLowerCase().trim();
      
      for (const [pattern, field] of Object.entries(COLUMN_MAPPINGS)) {
        if (normalizedHeader === pattern.toLowerCase() || 
            normalizedHeader.includes(pattern.toLowerCase())) {
          mapping.set(header, field);
          break;
        }
      }
    }

    return mapping;
  }

  private parseRow(
    row: Record<string, any>,
    columnMap: Map<string, keyof LmsRecord>
  ): LmsRecord | null {
    const record: Partial<LmsRecord> = {
      scoreChange: 0,
      attendanceRate: 1,
      tuitionPaid: true,
    };

    // 매핑된 컬럼 값 추출
    for (const [header, field] of columnMap) {
      const value = row[header];
      
      if (value !== undefined && value !== '') {
        switch (field) {
          case 'currentScore':
          case 'previousScore':
            record[field] = parseFloat(value) || 0;
            break;
          case 'attendanceRate':
            // 백분율 또는 소수점
            const rate = parseFloat(value);
            record[field] = rate > 1 ? rate / 100 : rate;
            break;
          case 'tuitionPaid':
            record[field] = ['Y', 'O', '완료', '납부', 'true', '1'].includes(
              String(value).toUpperCase()
            );
            break;
          case 'parentPhone':
            // 전화번호 정규화
            record[field] = this.normalizePhone(String(value));
            break;
          default:
            (record as any)[field] = String(value);
        }
      }
    }

    // 필수 필드 검증
    if (!record.studentName || !record.parentPhone) {
      return null;
    }

    // 성적 변화 계산
    if (record.currentScore !== undefined && record.previousScore !== undefined) {
      record.scoreChange = record.currentScore - record.previousScore;
    }

    return record as LmsRecord;
  }

  private normalizePhone(phone: string): string {
    // 숫자만 추출
    const digits = phone.replace(/[^0-9]/g, '');
    
    // 형식화 (010-1234-5678)
    if (digits.length === 11 && digits.startsWith('010')) {
      return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
    }
    
    return digits;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         PUBLIC API
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 수동으로 특정 파일 파싱
   */
  async manualParse(filePath: string): Promise<ParseResult> {
    return this.parseFile(filePath);
  }

  /**
   * 감시 중인 경로 목록
   */
  getWatchPaths(): string[] {
    return [...this.config.watchPaths];
  }

  /**
   * 상태 조회
   */
  getStatus(): {
    isRunning: boolean;
    watchPaths: string[];
    trackedFiles: number;
  } {
    return {
      isRunning: this.isRunning,
      watchPaths: this.config.watchPaths,
      trackedFiles: this.fileHashes.size,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//                              FACTORY
// ═══════════════════════════════════════════════════════════════════════════

export function createExcelWatcher(config?: Partial<WatcherConfig>): ExcelWatcher {
  return new ExcelWatcher(config);
}

// ═══════════════════════════════════════════════════════════════════════════
//                              USAGE EXAMPLE
// ═══════════════════════════════════════════════════════════════════════════

/*
import { createExcelWatcher } from './ExcelWatcher';

const watcher = createExcelWatcher({
  watchPaths: [
    '/Users/user/Documents/학원관리',
    '/Users/user/Desktop/LMS.xlsx',
  ],
  parseOnStart: true,
});

watcher.on('fileChanged', (result) => {
  console.log('File changed:', result.filePath);
  console.log('Records:', result.records.length);
  
  // SQ 업데이트
  for (const record of result.records) {
    sqService.upsertNode({
      id: record.parentPhone,
      name: record.studentName + ' 학부모',
      phone: record.parentPhone,
      studentName: record.studentName,
      synergyScore: calculateSynergyFromLms(record),
    });
  }
});

watcher.on('fileParsed', (result) => {
  console.log('Initial parse:', result.filePath);
});

watcher.start();
*/










/**
 * AUTUS Local Agent - Excel Watcher
 * ===================================
 * 
 * 학원 LMS 엑셀 파일 변경 감지 및 파싱
 * 
 * Electron (Desktop) 앱에서 실행
 * 파일 시스템 감시로 실시간 데이터 수집
 */

import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import { EventEmitter } from 'events';

// ═══════════════════════════════════════════════════════════════════════════
//                              TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface LmsRecord {
  studentName: string;
  parentPhone: string;
  grade?: string;
  subjects?: string[];
  currentScore?: number;
  previousScore?: number;
  scoreChange: number;
  attendanceRate: number;
  lastAttendance?: Date;
  tuitionPaid: boolean;
  nextPaymentDate?: Date;
}

export interface WatcherConfig {
  watchPaths: string[];           // 감시할 폴더/파일 경로
  filePattern: RegExp;            // 파일명 패턴 (예: *.xlsx)
  pollInterval: number;           // 폴링 간격 (ms)
  parseOnStart: boolean;          // 시작 시 기존 파일 파싱
}

export interface ParseResult {
  filePath: string;
  records: LmsRecord[];
  parsedAt: Date;
  errors: string[];
}

// ═══════════════════════════════════════════════════════════════════════════
//                              DEFAULT CONFIG
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_CONFIG: WatcherConfig = {
  watchPaths: [],
  filePattern: /\.(xlsx?|csv)$/i,
  pollInterval: 5000,  // 5초
  parseOnStart: true,
};

// ═══════════════════════════════════════════════════════════════════════════
//                              COLUMN MAPPINGS
// ═══════════════════════════════════════════════════════════════════════════

// 엑셀 컬럼명 → LmsRecord 필드 매핑
const COLUMN_MAPPINGS: Record<string, keyof LmsRecord> = {
  // 학생 정보
  '학생명': 'studentName',
  '이름': 'studentName',
  '학생이름': 'studentName',
  'student_name': 'studentName',
  
  // 학부모 연락처
  '학부모연락처': 'parentPhone',
  '연락처': 'parentPhone',
  '전화번호': 'parentPhone',
  '부모연락처': 'parentPhone',
  'parent_phone': 'parentPhone',
  'phone': 'parentPhone',
  
  // 학년
  '학년': 'grade',
  'grade': 'grade',
  
  // 성적
  '현재점수': 'currentScore',
  '이번성적': 'currentScore',
  '점수': 'currentScore',
  'current_score': 'currentScore',
  'score': 'currentScore',
  
  '이전점수': 'previousScore',
  '지난성적': 'previousScore',
  'previous_score': 'previousScore',
  
  // 출석
  '출석률': 'attendanceRate',
  '출석': 'attendanceRate',
  'attendance': 'attendanceRate',
  'attendance_rate': 'attendanceRate',
  
  // 결제
  '납부여부': 'tuitionPaid',
  '결제여부': 'tuitionPaid',
  'paid': 'tuitionPaid',
};

// ═══════════════════════════════════════════════════════════════════════════
//                              EXCEL WATCHER
// ═══════════════════════════════════════════════════════════════════════════

export class ExcelWatcher extends EventEmitter {
  private config: WatcherConfig;
  private watchers: fs.FSWatcher[] = [];
  private fileHashes: Map<string, string> = new Map();
  private isRunning: boolean = false;

  constructor(config: Partial<WatcherConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         LIFECYCLE
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 감시 시작
   */
  async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    console.log('[ExcelWatcher] Starting...');

    // 각 경로에 대해 감시 설정
    for (const watchPath of this.config.watchPaths) {
      await this.setupWatcher(watchPath);
    }

    // 시작 시 기존 파일 파싱
    if (this.config.parseOnStart) {
      await this.parseExistingFiles();
    }

    this.emit('started');
  }

  /**
   * 감시 중지
   */
  stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;

    for (const watcher of this.watchers) {
      watcher.close();
    }
    this.watchers = [];

    console.log('[ExcelWatcher] Stopped');
    this.emit('stopped');
  }

  /**
   * 감시 경로 추가
   */
  addWatchPath(watchPath: string): void {
    if (!this.config.watchPaths.includes(watchPath)) {
      this.config.watchPaths.push(watchPath);
      
      if (this.isRunning) {
        this.setupWatcher(watchPath);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         FILE WATCHING
  // ─────────────────────────────────────────────────────────────────────────

  private async setupWatcher(watchPath: string): Promise<void> {
    try {
      const stats = await fs.promises.stat(watchPath);

      if (stats.isDirectory()) {
        // 폴더 감시
        const watcher = fs.watch(watchPath, (eventType, filename) => {
          if (filename && this.config.filePattern.test(filename)) {
            const filePath = path.join(watchPath, filename);
            this.handleFileChange(filePath);
          }
        });
        this.watchers.push(watcher);
        console.log(`[ExcelWatcher] Watching directory: ${watchPath}`);
      } else if (stats.isFile()) {
        // 파일 직접 감시
        const watcher = fs.watch(watchPath, () => {
          this.handleFileChange(watchPath);
        });
        this.watchers.push(watcher);
        console.log(`[ExcelWatcher] Watching file: ${watchPath}`);
      }
    } catch (error) {
      console.error(`[ExcelWatcher] Failed to setup watcher for ${watchPath}:`, error);
    }
  }

  private async handleFileChange(filePath: string): Promise<void> {
    // 파일 해시로 실제 변경 여부 확인
    const newHash = await this.getFileHash(filePath);
    const oldHash = this.fileHashes.get(filePath);

    if (newHash && newHash !== oldHash) {
      this.fileHashes.set(filePath, newHash);
      
      console.log(`[ExcelWatcher] File changed: ${filePath}`);
      
      // 파싱 및 이벤트 발생
      const result = await this.parseFile(filePath);
      this.emit('fileChanged', result);
    }
  }

  private async getFileHash(filePath: string): Promise<string | null> {
    try {
      const content = await fs.promises.readFile(filePath);
      const crypto = require('crypto');
      return crypto.createHash('md5').update(content).digest('hex');
    } catch {
      return null;
    }
  }

  private async parseExistingFiles(): Promise<void> {
    for (const watchPath of this.config.watchPaths) {
      try {
        const stats = await fs.promises.stat(watchPath);

        if (stats.isDirectory()) {
          const files = await fs.promises.readdir(watchPath);
          for (const file of files) {
            if (this.config.filePattern.test(file)) {
              const filePath = path.join(watchPath, file);
              const result = await this.parseFile(filePath);
              this.emit('fileParsed', result);
            }
          }
        } else if (stats.isFile()) {
          const result = await this.parseFile(watchPath);
          this.emit('fileParsed', result);
        }
      } catch (error) {
        console.error(`[ExcelWatcher] Failed to parse existing files in ${watchPath}:`, error);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         EXCEL PARSING
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 엑셀 파일 파싱
   */
  async parseFile(filePath: string): Promise<ParseResult> {
    const result: ParseResult = {
      filePath,
      records: [],
      parsedAt: new Date(),
      errors: [],
    };

    try {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      
      // JSON으로 변환
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      if (rows.length === 0) {
        result.errors.push('No data found in file');
        return result;
      }

      // 컬럼 매핑 찾기
      const firstRow = rows[0] as Record<string, any>;
      const columnMap = this.findColumnMapping(Object.keys(firstRow));

      // 각 행 파싱
      for (let i = 0; i < rows.length; i++) {
        try {
          const row = rows[i] as Record<string, any>;
          const record = this.parseRow(row, columnMap);
          
          if (record) {
            result.records.push(record);
          }
        } catch (error) {
          result.errors.push(`Row ${i + 1}: ${error}`);
        }
      }

      // 파일 해시 저장
      const hash = await this.getFileHash(filePath);
      if (hash) {
        this.fileHashes.set(filePath, hash);
      }

    } catch (error) {
      result.errors.push(`Parse error: ${error}`);
    }

    return result;
  }

  private findColumnMapping(headers: string[]): Map<string, keyof LmsRecord> {
    const mapping = new Map<string, keyof LmsRecord>();

    for (const header of headers) {
      const normalizedHeader = header.toLowerCase().trim();
      
      for (const [pattern, field] of Object.entries(COLUMN_MAPPINGS)) {
        if (normalizedHeader === pattern.toLowerCase() || 
            normalizedHeader.includes(pattern.toLowerCase())) {
          mapping.set(header, field);
          break;
        }
      }
    }

    return mapping;
  }

  private parseRow(
    row: Record<string, any>,
    columnMap: Map<string, keyof LmsRecord>
  ): LmsRecord | null {
    const record: Partial<LmsRecord> = {
      scoreChange: 0,
      attendanceRate: 1,
      tuitionPaid: true,
    };

    // 매핑된 컬럼 값 추출
    for (const [header, field] of columnMap) {
      const value = row[header];
      
      if (value !== undefined && value !== '') {
        switch (field) {
          case 'currentScore':
          case 'previousScore':
            record[field] = parseFloat(value) || 0;
            break;
          case 'attendanceRate':
            // 백분율 또는 소수점
            const rate = parseFloat(value);
            record[field] = rate > 1 ? rate / 100 : rate;
            break;
          case 'tuitionPaid':
            record[field] = ['Y', 'O', '완료', '납부', 'true', '1'].includes(
              String(value).toUpperCase()
            );
            break;
          case 'parentPhone':
            // 전화번호 정규화
            record[field] = this.normalizePhone(String(value));
            break;
          default:
            (record as any)[field] = String(value);
        }
      }
    }

    // 필수 필드 검증
    if (!record.studentName || !record.parentPhone) {
      return null;
    }

    // 성적 변화 계산
    if (record.currentScore !== undefined && record.previousScore !== undefined) {
      record.scoreChange = record.currentScore - record.previousScore;
    }

    return record as LmsRecord;
  }

  private normalizePhone(phone: string): string {
    // 숫자만 추출
    const digits = phone.replace(/[^0-9]/g, '');
    
    // 형식화 (010-1234-5678)
    if (digits.length === 11 && digits.startsWith('010')) {
      return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
    }
    
    return digits;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         PUBLIC API
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 수동으로 특정 파일 파싱
   */
  async manualParse(filePath: string): Promise<ParseResult> {
    return this.parseFile(filePath);
  }

  /**
   * 감시 중인 경로 목록
   */
  getWatchPaths(): string[] {
    return [...this.config.watchPaths];
  }

  /**
   * 상태 조회
   */
  getStatus(): {
    isRunning: boolean;
    watchPaths: string[];
    trackedFiles: number;
  } {
    return {
      isRunning: this.isRunning,
      watchPaths: this.config.watchPaths,
      trackedFiles: this.fileHashes.size,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//                              FACTORY
// ═══════════════════════════════════════════════════════════════════════════

export function createExcelWatcher(config?: Partial<WatcherConfig>): ExcelWatcher {
  return new ExcelWatcher(config);
}

// ═══════════════════════════════════════════════════════════════════════════
//                              USAGE EXAMPLE
// ═══════════════════════════════════════════════════════════════════════════

/*
import { createExcelWatcher } from './ExcelWatcher';

const watcher = createExcelWatcher({
  watchPaths: [
    '/Users/user/Documents/학원관리',
    '/Users/user/Desktop/LMS.xlsx',
  ],
  parseOnStart: true,
});

watcher.on('fileChanged', (result) => {
  console.log('File changed:', result.filePath);
  console.log('Records:', result.records.length);
  
  // SQ 업데이트
  for (const record of result.records) {
    sqService.upsertNode({
      id: record.parentPhone,
      name: record.studentName + ' 학부모',
      phone: record.parentPhone,
      studentName: record.studentName,
      synergyScore: calculateSynergyFromLms(record),
    });
  }
});

watcher.on('fileParsed', (result) => {
  console.log('Initial parse:', result.filePath);
});

watcher.start();
*/




















/**
 * AUTUS Local Agent - Excel Watcher
 * ===================================
 * 
 * 학원 LMS 엑셀 파일 변경 감지 및 파싱
 * 
 * Electron (Desktop) 앱에서 실행
 * 파일 시스템 감시로 실시간 데이터 수집
 */

import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import { EventEmitter } from 'events';

// ═══════════════════════════════════════════════════════════════════════════
//                              TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface LmsRecord {
  studentName: string;
  parentPhone: string;
  grade?: string;
  subjects?: string[];
  currentScore?: number;
  previousScore?: number;
  scoreChange: number;
  attendanceRate: number;
  lastAttendance?: Date;
  tuitionPaid: boolean;
  nextPaymentDate?: Date;
}

export interface WatcherConfig {
  watchPaths: string[];           // 감시할 폴더/파일 경로
  filePattern: RegExp;            // 파일명 패턴 (예: *.xlsx)
  pollInterval: number;           // 폴링 간격 (ms)
  parseOnStart: boolean;          // 시작 시 기존 파일 파싱
}

export interface ParseResult {
  filePath: string;
  records: LmsRecord[];
  parsedAt: Date;
  errors: string[];
}

// ═══════════════════════════════════════════════════════════════════════════
//                              DEFAULT CONFIG
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_CONFIG: WatcherConfig = {
  watchPaths: [],
  filePattern: /\.(xlsx?|csv)$/i,
  pollInterval: 5000,  // 5초
  parseOnStart: true,
};

// ═══════════════════════════════════════════════════════════════════════════
//                              COLUMN MAPPINGS
// ═══════════════════════════════════════════════════════════════════════════

// 엑셀 컬럼명 → LmsRecord 필드 매핑
const COLUMN_MAPPINGS: Record<string, keyof LmsRecord> = {
  // 학생 정보
  '학생명': 'studentName',
  '이름': 'studentName',
  '학생이름': 'studentName',
  'student_name': 'studentName',
  
  // 학부모 연락처
  '학부모연락처': 'parentPhone',
  '연락처': 'parentPhone',
  '전화번호': 'parentPhone',
  '부모연락처': 'parentPhone',
  'parent_phone': 'parentPhone',
  'phone': 'parentPhone',
  
  // 학년
  '학년': 'grade',
  'grade': 'grade',
  
  // 성적
  '현재점수': 'currentScore',
  '이번성적': 'currentScore',
  '점수': 'currentScore',
  'current_score': 'currentScore',
  'score': 'currentScore',
  
  '이전점수': 'previousScore',
  '지난성적': 'previousScore',
  'previous_score': 'previousScore',
  
  // 출석
  '출석률': 'attendanceRate',
  '출석': 'attendanceRate',
  'attendance': 'attendanceRate',
  'attendance_rate': 'attendanceRate',
  
  // 결제
  '납부여부': 'tuitionPaid',
  '결제여부': 'tuitionPaid',
  'paid': 'tuitionPaid',
};

// ═══════════════════════════════════════════════════════════════════════════
//                              EXCEL WATCHER
// ═══════════════════════════════════════════════════════════════════════════

export class ExcelWatcher extends EventEmitter {
  private config: WatcherConfig;
  private watchers: fs.FSWatcher[] = [];
  private fileHashes: Map<string, string> = new Map();
  private isRunning: boolean = false;

  constructor(config: Partial<WatcherConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         LIFECYCLE
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 감시 시작
   */
  async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    console.log('[ExcelWatcher] Starting...');

    // 각 경로에 대해 감시 설정
    for (const watchPath of this.config.watchPaths) {
      await this.setupWatcher(watchPath);
    }

    // 시작 시 기존 파일 파싱
    if (this.config.parseOnStart) {
      await this.parseExistingFiles();
    }

    this.emit('started');
  }

  /**
   * 감시 중지
   */
  stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;

    for (const watcher of this.watchers) {
      watcher.close();
    }
    this.watchers = [];

    console.log('[ExcelWatcher] Stopped');
    this.emit('stopped');
  }

  /**
   * 감시 경로 추가
   */
  addWatchPath(watchPath: string): void {
    if (!this.config.watchPaths.includes(watchPath)) {
      this.config.watchPaths.push(watchPath);
      
      if (this.isRunning) {
        this.setupWatcher(watchPath);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         FILE WATCHING
  // ─────────────────────────────────────────────────────────────────────────

  private async setupWatcher(watchPath: string): Promise<void> {
    try {
      const stats = await fs.promises.stat(watchPath);

      if (stats.isDirectory()) {
        // 폴더 감시
        const watcher = fs.watch(watchPath, (eventType, filename) => {
          if (filename && this.config.filePattern.test(filename)) {
            const filePath = path.join(watchPath, filename);
            this.handleFileChange(filePath);
          }
        });
        this.watchers.push(watcher);
        console.log(`[ExcelWatcher] Watching directory: ${watchPath}`);
      } else if (stats.isFile()) {
        // 파일 직접 감시
        const watcher = fs.watch(watchPath, () => {
          this.handleFileChange(watchPath);
        });
        this.watchers.push(watcher);
        console.log(`[ExcelWatcher] Watching file: ${watchPath}`);
      }
    } catch (error) {
      console.error(`[ExcelWatcher] Failed to setup watcher for ${watchPath}:`, error);
    }
  }

  private async handleFileChange(filePath: string): Promise<void> {
    // 파일 해시로 실제 변경 여부 확인
    const newHash = await this.getFileHash(filePath);
    const oldHash = this.fileHashes.get(filePath);

    if (newHash && newHash !== oldHash) {
      this.fileHashes.set(filePath, newHash);
      
      console.log(`[ExcelWatcher] File changed: ${filePath}`);
      
      // 파싱 및 이벤트 발생
      const result = await this.parseFile(filePath);
      this.emit('fileChanged', result);
    }
  }

  private async getFileHash(filePath: string): Promise<string | null> {
    try {
      const content = await fs.promises.readFile(filePath);
      const crypto = require('crypto');
      return crypto.createHash('md5').update(content).digest('hex');
    } catch {
      return null;
    }
  }

  private async parseExistingFiles(): Promise<void> {
    for (const watchPath of this.config.watchPaths) {
      try {
        const stats = await fs.promises.stat(watchPath);

        if (stats.isDirectory()) {
          const files = await fs.promises.readdir(watchPath);
          for (const file of files) {
            if (this.config.filePattern.test(file)) {
              const filePath = path.join(watchPath, file);
              const result = await this.parseFile(filePath);
              this.emit('fileParsed', result);
            }
          }
        } else if (stats.isFile()) {
          const result = await this.parseFile(watchPath);
          this.emit('fileParsed', result);
        }
      } catch (error) {
        console.error(`[ExcelWatcher] Failed to parse existing files in ${watchPath}:`, error);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         EXCEL PARSING
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 엑셀 파일 파싱
   */
  async parseFile(filePath: string): Promise<ParseResult> {
    const result: ParseResult = {
      filePath,
      records: [],
      parsedAt: new Date(),
      errors: [],
    };

    try {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      
      // JSON으로 변환
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      if (rows.length === 0) {
        result.errors.push('No data found in file');
        return result;
      }

      // 컬럼 매핑 찾기
      const firstRow = rows[0] as Record<string, any>;
      const columnMap = this.findColumnMapping(Object.keys(firstRow));

      // 각 행 파싱
      for (let i = 0; i < rows.length; i++) {
        try {
          const row = rows[i] as Record<string, any>;
          const record = this.parseRow(row, columnMap);
          
          if (record) {
            result.records.push(record);
          }
        } catch (error) {
          result.errors.push(`Row ${i + 1}: ${error}`);
        }
      }

      // 파일 해시 저장
      const hash = await this.getFileHash(filePath);
      if (hash) {
        this.fileHashes.set(filePath, hash);
      }

    } catch (error) {
      result.errors.push(`Parse error: ${error}`);
    }

    return result;
  }

  private findColumnMapping(headers: string[]): Map<string, keyof LmsRecord> {
    const mapping = new Map<string, keyof LmsRecord>();

    for (const header of headers) {
      const normalizedHeader = header.toLowerCase().trim();
      
      for (const [pattern, field] of Object.entries(COLUMN_MAPPINGS)) {
        if (normalizedHeader === pattern.toLowerCase() || 
            normalizedHeader.includes(pattern.toLowerCase())) {
          mapping.set(header, field);
          break;
        }
      }
    }

    return mapping;
  }

  private parseRow(
    row: Record<string, any>,
    columnMap: Map<string, keyof LmsRecord>
  ): LmsRecord | null {
    const record: Partial<LmsRecord> = {
      scoreChange: 0,
      attendanceRate: 1,
      tuitionPaid: true,
    };

    // 매핑된 컬럼 값 추출
    for (const [header, field] of columnMap) {
      const value = row[header];
      
      if (value !== undefined && value !== '') {
        switch (field) {
          case 'currentScore':
          case 'previousScore':
            record[field] = parseFloat(value) || 0;
            break;
          case 'attendanceRate':
            // 백분율 또는 소수점
            const rate = parseFloat(value);
            record[field] = rate > 1 ? rate / 100 : rate;
            break;
          case 'tuitionPaid':
            record[field] = ['Y', 'O', '완료', '납부', 'true', '1'].includes(
              String(value).toUpperCase()
            );
            break;
          case 'parentPhone':
            // 전화번호 정규화
            record[field] = this.normalizePhone(String(value));
            break;
          default:
            (record as any)[field] = String(value);
        }
      }
    }

    // 필수 필드 검증
    if (!record.studentName || !record.parentPhone) {
      return null;
    }

    // 성적 변화 계산
    if (record.currentScore !== undefined && record.previousScore !== undefined) {
      record.scoreChange = record.currentScore - record.previousScore;
    }

    return record as LmsRecord;
  }

  private normalizePhone(phone: string): string {
    // 숫자만 추출
    const digits = phone.replace(/[^0-9]/g, '');
    
    // 형식화 (010-1234-5678)
    if (digits.length === 11 && digits.startsWith('010')) {
      return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
    }
    
    return digits;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         PUBLIC API
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 수동으로 특정 파일 파싱
   */
  async manualParse(filePath: string): Promise<ParseResult> {
    return this.parseFile(filePath);
  }

  /**
   * 감시 중인 경로 목록
   */
  getWatchPaths(): string[] {
    return [...this.config.watchPaths];
  }

  /**
   * 상태 조회
   */
  getStatus(): {
    isRunning: boolean;
    watchPaths: string[];
    trackedFiles: number;
  } {
    return {
      isRunning: this.isRunning,
      watchPaths: this.config.watchPaths,
      trackedFiles: this.fileHashes.size,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//                              FACTORY
// ═══════════════════════════════════════════════════════════════════════════

export function createExcelWatcher(config?: Partial<WatcherConfig>): ExcelWatcher {
  return new ExcelWatcher(config);
}

// ═══════════════════════════════════════════════════════════════════════════
//                              USAGE EXAMPLE
// ═══════════════════════════════════════════════════════════════════════════

/*
import { createExcelWatcher } from './ExcelWatcher';

const watcher = createExcelWatcher({
  watchPaths: [
    '/Users/user/Documents/학원관리',
    '/Users/user/Desktop/LMS.xlsx',
  ],
  parseOnStart: true,
});

watcher.on('fileChanged', (result) => {
  console.log('File changed:', result.filePath);
  console.log('Records:', result.records.length);
  
  // SQ 업데이트
  for (const record of result.records) {
    sqService.upsertNode({
      id: record.parentPhone,
      name: record.studentName + ' 학부모',
      phone: record.parentPhone,
      studentName: record.studentName,
      synergyScore: calculateSynergyFromLms(record),
    });
  }
});

watcher.on('fileParsed', (result) => {
  console.log('Initial parse:', result.filePath);
});

watcher.start();
*/










/**
 * AUTUS Local Agent - Excel Watcher
 * ===================================
 * 
 * 학원 LMS 엑셀 파일 변경 감지 및 파싱
 * 
 * Electron (Desktop) 앱에서 실행
 * 파일 시스템 감시로 실시간 데이터 수집
 */

import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import { EventEmitter } from 'events';

// ═══════════════════════════════════════════════════════════════════════════
//                              TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface LmsRecord {
  studentName: string;
  parentPhone: string;
  grade?: string;
  subjects?: string[];
  currentScore?: number;
  previousScore?: number;
  scoreChange: number;
  attendanceRate: number;
  lastAttendance?: Date;
  tuitionPaid: boolean;
  nextPaymentDate?: Date;
}

export interface WatcherConfig {
  watchPaths: string[];           // 감시할 폴더/파일 경로
  filePattern: RegExp;            // 파일명 패턴 (예: *.xlsx)
  pollInterval: number;           // 폴링 간격 (ms)
  parseOnStart: boolean;          // 시작 시 기존 파일 파싱
}

export interface ParseResult {
  filePath: string;
  records: LmsRecord[];
  parsedAt: Date;
  errors: string[];
}

// ═══════════════════════════════════════════════════════════════════════════
//                              DEFAULT CONFIG
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_CONFIG: WatcherConfig = {
  watchPaths: [],
  filePattern: /\.(xlsx?|csv)$/i,
  pollInterval: 5000,  // 5초
  parseOnStart: true,
};

// ═══════════════════════════════════════════════════════════════════════════
//                              COLUMN MAPPINGS
// ═══════════════════════════════════════════════════════════════════════════

// 엑셀 컬럼명 → LmsRecord 필드 매핑
const COLUMN_MAPPINGS: Record<string, keyof LmsRecord> = {
  // 학생 정보
  '학생명': 'studentName',
  '이름': 'studentName',
  '학생이름': 'studentName',
  'student_name': 'studentName',
  
  // 학부모 연락처
  '학부모연락처': 'parentPhone',
  '연락처': 'parentPhone',
  '전화번호': 'parentPhone',
  '부모연락처': 'parentPhone',
  'parent_phone': 'parentPhone',
  'phone': 'parentPhone',
  
  // 학년
  '학년': 'grade',
  'grade': 'grade',
  
  // 성적
  '현재점수': 'currentScore',
  '이번성적': 'currentScore',
  '점수': 'currentScore',
  'current_score': 'currentScore',
  'score': 'currentScore',
  
  '이전점수': 'previousScore',
  '지난성적': 'previousScore',
  'previous_score': 'previousScore',
  
  // 출석
  '출석률': 'attendanceRate',
  '출석': 'attendanceRate',
  'attendance': 'attendanceRate',
  'attendance_rate': 'attendanceRate',
  
  // 결제
  '납부여부': 'tuitionPaid',
  '결제여부': 'tuitionPaid',
  'paid': 'tuitionPaid',
};

// ═══════════════════════════════════════════════════════════════════════════
//                              EXCEL WATCHER
// ═══════════════════════════════════════════════════════════════════════════

export class ExcelWatcher extends EventEmitter {
  private config: WatcherConfig;
  private watchers: fs.FSWatcher[] = [];
  private fileHashes: Map<string, string> = new Map();
  private isRunning: boolean = false;

  constructor(config: Partial<WatcherConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         LIFECYCLE
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 감시 시작
   */
  async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    console.log('[ExcelWatcher] Starting...');

    // 각 경로에 대해 감시 설정
    for (const watchPath of this.config.watchPaths) {
      await this.setupWatcher(watchPath);
    }

    // 시작 시 기존 파일 파싱
    if (this.config.parseOnStart) {
      await this.parseExistingFiles();
    }

    this.emit('started');
  }

  /**
   * 감시 중지
   */
  stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;

    for (const watcher of this.watchers) {
      watcher.close();
    }
    this.watchers = [];

    console.log('[ExcelWatcher] Stopped');
    this.emit('stopped');
  }

  /**
   * 감시 경로 추가
   */
  addWatchPath(watchPath: string): void {
    if (!this.config.watchPaths.includes(watchPath)) {
      this.config.watchPaths.push(watchPath);
      
      if (this.isRunning) {
        this.setupWatcher(watchPath);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         FILE WATCHING
  // ─────────────────────────────────────────────────────────────────────────

  private async setupWatcher(watchPath: string): Promise<void> {
    try {
      const stats = await fs.promises.stat(watchPath);

      if (stats.isDirectory()) {
        // 폴더 감시
        const watcher = fs.watch(watchPath, (eventType, filename) => {
          if (filename && this.config.filePattern.test(filename)) {
            const filePath = path.join(watchPath, filename);
            this.handleFileChange(filePath);
          }
        });
        this.watchers.push(watcher);
        console.log(`[ExcelWatcher] Watching directory: ${watchPath}`);
      } else if (stats.isFile()) {
        // 파일 직접 감시
        const watcher = fs.watch(watchPath, () => {
          this.handleFileChange(watchPath);
        });
        this.watchers.push(watcher);
        console.log(`[ExcelWatcher] Watching file: ${watchPath}`);
      }
    } catch (error) {
      console.error(`[ExcelWatcher] Failed to setup watcher for ${watchPath}:`, error);
    }
  }

  private async handleFileChange(filePath: string): Promise<void> {
    // 파일 해시로 실제 변경 여부 확인
    const newHash = await this.getFileHash(filePath);
    const oldHash = this.fileHashes.get(filePath);

    if (newHash && newHash !== oldHash) {
      this.fileHashes.set(filePath, newHash);
      
      console.log(`[ExcelWatcher] File changed: ${filePath}`);
      
      // 파싱 및 이벤트 발생
      const result = await this.parseFile(filePath);
      this.emit('fileChanged', result);
    }
  }

  private async getFileHash(filePath: string): Promise<string | null> {
    try {
      const content = await fs.promises.readFile(filePath);
      const crypto = require('crypto');
      return crypto.createHash('md5').update(content).digest('hex');
    } catch {
      return null;
    }
  }

  private async parseExistingFiles(): Promise<void> {
    for (const watchPath of this.config.watchPaths) {
      try {
        const stats = await fs.promises.stat(watchPath);

        if (stats.isDirectory()) {
          const files = await fs.promises.readdir(watchPath);
          for (const file of files) {
            if (this.config.filePattern.test(file)) {
              const filePath = path.join(watchPath, file);
              const result = await this.parseFile(filePath);
              this.emit('fileParsed', result);
            }
          }
        } else if (stats.isFile()) {
          const result = await this.parseFile(watchPath);
          this.emit('fileParsed', result);
        }
      } catch (error) {
        console.error(`[ExcelWatcher] Failed to parse existing files in ${watchPath}:`, error);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         EXCEL PARSING
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 엑셀 파일 파싱
   */
  async parseFile(filePath: string): Promise<ParseResult> {
    const result: ParseResult = {
      filePath,
      records: [],
      parsedAt: new Date(),
      errors: [],
    };

    try {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      
      // JSON으로 변환
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      if (rows.length === 0) {
        result.errors.push('No data found in file');
        return result;
      }

      // 컬럼 매핑 찾기
      const firstRow = rows[0] as Record<string, any>;
      const columnMap = this.findColumnMapping(Object.keys(firstRow));

      // 각 행 파싱
      for (let i = 0; i < rows.length; i++) {
        try {
          const row = rows[i] as Record<string, any>;
          const record = this.parseRow(row, columnMap);
          
          if (record) {
            result.records.push(record);
          }
        } catch (error) {
          result.errors.push(`Row ${i + 1}: ${error}`);
        }
      }

      // 파일 해시 저장
      const hash = await this.getFileHash(filePath);
      if (hash) {
        this.fileHashes.set(filePath, hash);
      }

    } catch (error) {
      result.errors.push(`Parse error: ${error}`);
    }

    return result;
  }

  private findColumnMapping(headers: string[]): Map<string, keyof LmsRecord> {
    const mapping = new Map<string, keyof LmsRecord>();

    for (const header of headers) {
      const normalizedHeader = header.toLowerCase().trim();
      
      for (const [pattern, field] of Object.entries(COLUMN_MAPPINGS)) {
        if (normalizedHeader === pattern.toLowerCase() || 
            normalizedHeader.includes(pattern.toLowerCase())) {
          mapping.set(header, field);
          break;
        }
      }
    }

    return mapping;
  }

  private parseRow(
    row: Record<string, any>,
    columnMap: Map<string, keyof LmsRecord>
  ): LmsRecord | null {
    const record: Partial<LmsRecord> = {
      scoreChange: 0,
      attendanceRate: 1,
      tuitionPaid: true,
    };

    // 매핑된 컬럼 값 추출
    for (const [header, field] of columnMap) {
      const value = row[header];
      
      if (value !== undefined && value !== '') {
        switch (field) {
          case 'currentScore':
          case 'previousScore':
            record[field] = parseFloat(value) || 0;
            break;
          case 'attendanceRate':
            // 백분율 또는 소수점
            const rate = parseFloat(value);
            record[field] = rate > 1 ? rate / 100 : rate;
            break;
          case 'tuitionPaid':
            record[field] = ['Y', 'O', '완료', '납부', 'true', '1'].includes(
              String(value).toUpperCase()
            );
            break;
          case 'parentPhone':
            // 전화번호 정규화
            record[field] = this.normalizePhone(String(value));
            break;
          default:
            (record as any)[field] = String(value);
        }
      }
    }

    // 필수 필드 검증
    if (!record.studentName || !record.parentPhone) {
      return null;
    }

    // 성적 변화 계산
    if (record.currentScore !== undefined && record.previousScore !== undefined) {
      record.scoreChange = record.currentScore - record.previousScore;
    }

    return record as LmsRecord;
  }

  private normalizePhone(phone: string): string {
    // 숫자만 추출
    const digits = phone.replace(/[^0-9]/g, '');
    
    // 형식화 (010-1234-5678)
    if (digits.length === 11 && digits.startsWith('010')) {
      return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
    }
    
    return digits;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         PUBLIC API
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 수동으로 특정 파일 파싱
   */
  async manualParse(filePath: string): Promise<ParseResult> {
    return this.parseFile(filePath);
  }

  /**
   * 감시 중인 경로 목록
   */
  getWatchPaths(): string[] {
    return [...this.config.watchPaths];
  }

  /**
   * 상태 조회
   */
  getStatus(): {
    isRunning: boolean;
    watchPaths: string[];
    trackedFiles: number;
  } {
    return {
      isRunning: this.isRunning,
      watchPaths: this.config.watchPaths,
      trackedFiles: this.fileHashes.size,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//                              FACTORY
// ═══════════════════════════════════════════════════════════════════════════

export function createExcelWatcher(config?: Partial<WatcherConfig>): ExcelWatcher {
  return new ExcelWatcher(config);
}

// ═══════════════════════════════════════════════════════════════════════════
//                              USAGE EXAMPLE
// ═══════════════════════════════════════════════════════════════════════════

/*
import { createExcelWatcher } from './ExcelWatcher';

const watcher = createExcelWatcher({
  watchPaths: [
    '/Users/user/Documents/학원관리',
    '/Users/user/Desktop/LMS.xlsx',
  ],
  parseOnStart: true,
});

watcher.on('fileChanged', (result) => {
  console.log('File changed:', result.filePath);
  console.log('Records:', result.records.length);
  
  // SQ 업데이트
  for (const record of result.records) {
    sqService.upsertNode({
      id: record.parentPhone,
      name: record.studentName + ' 학부모',
      phone: record.parentPhone,
      studentName: record.studentName,
      synergyScore: calculateSynergyFromLms(record),
    });
  }
});

watcher.on('fileParsed', (result) => {
  console.log('Initial parse:', result.filePath);
});

watcher.start();
*/










/**
 * AUTUS Local Agent - Excel Watcher
 * ===================================
 * 
 * 학원 LMS 엑셀 파일 변경 감지 및 파싱
 * 
 * Electron (Desktop) 앱에서 실행
 * 파일 시스템 감시로 실시간 데이터 수집
 */

import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import { EventEmitter } from 'events';

// ═══════════════════════════════════════════════════════════════════════════
//                              TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface LmsRecord {
  studentName: string;
  parentPhone: string;
  grade?: string;
  subjects?: string[];
  currentScore?: number;
  previousScore?: number;
  scoreChange: number;
  attendanceRate: number;
  lastAttendance?: Date;
  tuitionPaid: boolean;
  nextPaymentDate?: Date;
}

export interface WatcherConfig {
  watchPaths: string[];           // 감시할 폴더/파일 경로
  filePattern: RegExp;            // 파일명 패턴 (예: *.xlsx)
  pollInterval: number;           // 폴링 간격 (ms)
  parseOnStart: boolean;          // 시작 시 기존 파일 파싱
}

export interface ParseResult {
  filePath: string;
  records: LmsRecord[];
  parsedAt: Date;
  errors: string[];
}

// ═══════════════════════════════════════════════════════════════════════════
//                              DEFAULT CONFIG
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_CONFIG: WatcherConfig = {
  watchPaths: [],
  filePattern: /\.(xlsx?|csv)$/i,
  pollInterval: 5000,  // 5초
  parseOnStart: true,
};

// ═══════════════════════════════════════════════════════════════════════════
//                              COLUMN MAPPINGS
// ═══════════════════════════════════════════════════════════════════════════

// 엑셀 컬럼명 → LmsRecord 필드 매핑
const COLUMN_MAPPINGS: Record<string, keyof LmsRecord> = {
  // 학생 정보
  '학생명': 'studentName',
  '이름': 'studentName',
  '학생이름': 'studentName',
  'student_name': 'studentName',
  
  // 학부모 연락처
  '학부모연락처': 'parentPhone',
  '연락처': 'parentPhone',
  '전화번호': 'parentPhone',
  '부모연락처': 'parentPhone',
  'parent_phone': 'parentPhone',
  'phone': 'parentPhone',
  
  // 학년
  '학년': 'grade',
  'grade': 'grade',
  
  // 성적
  '현재점수': 'currentScore',
  '이번성적': 'currentScore',
  '점수': 'currentScore',
  'current_score': 'currentScore',
  'score': 'currentScore',
  
  '이전점수': 'previousScore',
  '지난성적': 'previousScore',
  'previous_score': 'previousScore',
  
  // 출석
  '출석률': 'attendanceRate',
  '출석': 'attendanceRate',
  'attendance': 'attendanceRate',
  'attendance_rate': 'attendanceRate',
  
  // 결제
  '납부여부': 'tuitionPaid',
  '결제여부': 'tuitionPaid',
  'paid': 'tuitionPaid',
};

// ═══════════════════════════════════════════════════════════════════════════
//                              EXCEL WATCHER
// ═══════════════════════════════════════════════════════════════════════════

export class ExcelWatcher extends EventEmitter {
  private config: WatcherConfig;
  private watchers: fs.FSWatcher[] = [];
  private fileHashes: Map<string, string> = new Map();
  private isRunning: boolean = false;

  constructor(config: Partial<WatcherConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         LIFECYCLE
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 감시 시작
   */
  async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    console.log('[ExcelWatcher] Starting...');

    // 각 경로에 대해 감시 설정
    for (const watchPath of this.config.watchPaths) {
      await this.setupWatcher(watchPath);
    }

    // 시작 시 기존 파일 파싱
    if (this.config.parseOnStart) {
      await this.parseExistingFiles();
    }

    this.emit('started');
  }

  /**
   * 감시 중지
   */
  stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;

    for (const watcher of this.watchers) {
      watcher.close();
    }
    this.watchers = [];

    console.log('[ExcelWatcher] Stopped');
    this.emit('stopped');
  }

  /**
   * 감시 경로 추가
   */
  addWatchPath(watchPath: string): void {
    if (!this.config.watchPaths.includes(watchPath)) {
      this.config.watchPaths.push(watchPath);
      
      if (this.isRunning) {
        this.setupWatcher(watchPath);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         FILE WATCHING
  // ─────────────────────────────────────────────────────────────────────────

  private async setupWatcher(watchPath: string): Promise<void> {
    try {
      const stats = await fs.promises.stat(watchPath);

      if (stats.isDirectory()) {
        // 폴더 감시
        const watcher = fs.watch(watchPath, (eventType, filename) => {
          if (filename && this.config.filePattern.test(filename)) {
            const filePath = path.join(watchPath, filename);
            this.handleFileChange(filePath);
          }
        });
        this.watchers.push(watcher);
        console.log(`[ExcelWatcher] Watching directory: ${watchPath}`);
      } else if (stats.isFile()) {
        // 파일 직접 감시
        const watcher = fs.watch(watchPath, () => {
          this.handleFileChange(watchPath);
        });
        this.watchers.push(watcher);
        console.log(`[ExcelWatcher] Watching file: ${watchPath}`);
      }
    } catch (error) {
      console.error(`[ExcelWatcher] Failed to setup watcher for ${watchPath}:`, error);
    }
  }

  private async handleFileChange(filePath: string): Promise<void> {
    // 파일 해시로 실제 변경 여부 확인
    const newHash = await this.getFileHash(filePath);
    const oldHash = this.fileHashes.get(filePath);

    if (newHash && newHash !== oldHash) {
      this.fileHashes.set(filePath, newHash);
      
      console.log(`[ExcelWatcher] File changed: ${filePath}`);
      
      // 파싱 및 이벤트 발생
      const result = await this.parseFile(filePath);
      this.emit('fileChanged', result);
    }
  }

  private async getFileHash(filePath: string): Promise<string | null> {
    try {
      const content = await fs.promises.readFile(filePath);
      const crypto = require('crypto');
      return crypto.createHash('md5').update(content).digest('hex');
    } catch {
      return null;
    }
  }

  private async parseExistingFiles(): Promise<void> {
    for (const watchPath of this.config.watchPaths) {
      try {
        const stats = await fs.promises.stat(watchPath);

        if (stats.isDirectory()) {
          const files = await fs.promises.readdir(watchPath);
          for (const file of files) {
            if (this.config.filePattern.test(file)) {
              const filePath = path.join(watchPath, file);
              const result = await this.parseFile(filePath);
              this.emit('fileParsed', result);
            }
          }
        } else if (stats.isFile()) {
          const result = await this.parseFile(watchPath);
          this.emit('fileParsed', result);
        }
      } catch (error) {
        console.error(`[ExcelWatcher] Failed to parse existing files in ${watchPath}:`, error);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         EXCEL PARSING
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 엑셀 파일 파싱
   */
  async parseFile(filePath: string): Promise<ParseResult> {
    const result: ParseResult = {
      filePath,
      records: [],
      parsedAt: new Date(),
      errors: [],
    };

    try {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      
      // JSON으로 변환
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      if (rows.length === 0) {
        result.errors.push('No data found in file');
        return result;
      }

      // 컬럼 매핑 찾기
      const firstRow = rows[0] as Record<string, any>;
      const columnMap = this.findColumnMapping(Object.keys(firstRow));

      // 각 행 파싱
      for (let i = 0; i < rows.length; i++) {
        try {
          const row = rows[i] as Record<string, any>;
          const record = this.parseRow(row, columnMap);
          
          if (record) {
            result.records.push(record);
          }
        } catch (error) {
          result.errors.push(`Row ${i + 1}: ${error}`);
        }
      }

      // 파일 해시 저장
      const hash = await this.getFileHash(filePath);
      if (hash) {
        this.fileHashes.set(filePath, hash);
      }

    } catch (error) {
      result.errors.push(`Parse error: ${error}`);
    }

    return result;
  }

  private findColumnMapping(headers: string[]): Map<string, keyof LmsRecord> {
    const mapping = new Map<string, keyof LmsRecord>();

    for (const header of headers) {
      const normalizedHeader = header.toLowerCase().trim();
      
      for (const [pattern, field] of Object.entries(COLUMN_MAPPINGS)) {
        if (normalizedHeader === pattern.toLowerCase() || 
            normalizedHeader.includes(pattern.toLowerCase())) {
          mapping.set(header, field);
          break;
        }
      }
    }

    return mapping;
  }

  private parseRow(
    row: Record<string, any>,
    columnMap: Map<string, keyof LmsRecord>
  ): LmsRecord | null {
    const record: Partial<LmsRecord> = {
      scoreChange: 0,
      attendanceRate: 1,
      tuitionPaid: true,
    };

    // 매핑된 컬럼 값 추출
    for (const [header, field] of columnMap) {
      const value = row[header];
      
      if (value !== undefined && value !== '') {
        switch (field) {
          case 'currentScore':
          case 'previousScore':
            record[field] = parseFloat(value) || 0;
            break;
          case 'attendanceRate':
            // 백분율 또는 소수점
            const rate = parseFloat(value);
            record[field] = rate > 1 ? rate / 100 : rate;
            break;
          case 'tuitionPaid':
            record[field] = ['Y', 'O', '완료', '납부', 'true', '1'].includes(
              String(value).toUpperCase()
            );
            break;
          case 'parentPhone':
            // 전화번호 정규화
            record[field] = this.normalizePhone(String(value));
            break;
          default:
            (record as any)[field] = String(value);
        }
      }
    }

    // 필수 필드 검증
    if (!record.studentName || !record.parentPhone) {
      return null;
    }

    // 성적 변화 계산
    if (record.currentScore !== undefined && record.previousScore !== undefined) {
      record.scoreChange = record.currentScore - record.previousScore;
    }

    return record as LmsRecord;
  }

  private normalizePhone(phone: string): string {
    // 숫자만 추출
    const digits = phone.replace(/[^0-9]/g, '');
    
    // 형식화 (010-1234-5678)
    if (digits.length === 11 && digits.startsWith('010')) {
      return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
    }
    
    return digits;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         PUBLIC API
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 수동으로 특정 파일 파싱
   */
  async manualParse(filePath: string): Promise<ParseResult> {
    return this.parseFile(filePath);
  }

  /**
   * 감시 중인 경로 목록
   */
  getWatchPaths(): string[] {
    return [...this.config.watchPaths];
  }

  /**
   * 상태 조회
   */
  getStatus(): {
    isRunning: boolean;
    watchPaths: string[];
    trackedFiles: number;
  } {
    return {
      isRunning: this.isRunning,
      watchPaths: this.config.watchPaths,
      trackedFiles: this.fileHashes.size,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//                              FACTORY
// ═══════════════════════════════════════════════════════════════════════════

export function createExcelWatcher(config?: Partial<WatcherConfig>): ExcelWatcher {
  return new ExcelWatcher(config);
}

// ═══════════════════════════════════════════════════════════════════════════
//                              USAGE EXAMPLE
// ═══════════════════════════════════════════════════════════════════════════

/*
import { createExcelWatcher } from './ExcelWatcher';

const watcher = createExcelWatcher({
  watchPaths: [
    '/Users/user/Documents/학원관리',
    '/Users/user/Desktop/LMS.xlsx',
  ],
  parseOnStart: true,
});

watcher.on('fileChanged', (result) => {
  console.log('File changed:', result.filePath);
  console.log('Records:', result.records.length);
  
  // SQ 업데이트
  for (const record of result.records) {
    sqService.upsertNode({
      id: record.parentPhone,
      name: record.studentName + ' 학부모',
      phone: record.parentPhone,
      studentName: record.studentName,
      synergyScore: calculateSynergyFromLms(record),
    });
  }
});

watcher.on('fileParsed', (result) => {
  console.log('Initial parse:', result.filePath);
});

watcher.start();
*/










/**
 * AUTUS Local Agent - Excel Watcher
 * ===================================
 * 
 * 학원 LMS 엑셀 파일 변경 감지 및 파싱
 * 
 * Electron (Desktop) 앱에서 실행
 * 파일 시스템 감시로 실시간 데이터 수집
 */

import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import { EventEmitter } from 'events';

// ═══════════════════════════════════════════════════════════════════════════
//                              TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface LmsRecord {
  studentName: string;
  parentPhone: string;
  grade?: string;
  subjects?: string[];
  currentScore?: number;
  previousScore?: number;
  scoreChange: number;
  attendanceRate: number;
  lastAttendance?: Date;
  tuitionPaid: boolean;
  nextPaymentDate?: Date;
}

export interface WatcherConfig {
  watchPaths: string[];           // 감시할 폴더/파일 경로
  filePattern: RegExp;            // 파일명 패턴 (예: *.xlsx)
  pollInterval: number;           // 폴링 간격 (ms)
  parseOnStart: boolean;          // 시작 시 기존 파일 파싱
}

export interface ParseResult {
  filePath: string;
  records: LmsRecord[];
  parsedAt: Date;
  errors: string[];
}

// ═══════════════════════════════════════════════════════════════════════════
//                              DEFAULT CONFIG
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_CONFIG: WatcherConfig = {
  watchPaths: [],
  filePattern: /\.(xlsx?|csv)$/i,
  pollInterval: 5000,  // 5초
  parseOnStart: true,
};

// ═══════════════════════════════════════════════════════════════════════════
//                              COLUMN MAPPINGS
// ═══════════════════════════════════════════════════════════════════════════

// 엑셀 컬럼명 → LmsRecord 필드 매핑
const COLUMN_MAPPINGS: Record<string, keyof LmsRecord> = {
  // 학생 정보
  '학생명': 'studentName',
  '이름': 'studentName',
  '학생이름': 'studentName',
  'student_name': 'studentName',
  
  // 학부모 연락처
  '학부모연락처': 'parentPhone',
  '연락처': 'parentPhone',
  '전화번호': 'parentPhone',
  '부모연락처': 'parentPhone',
  'parent_phone': 'parentPhone',
  'phone': 'parentPhone',
  
  // 학년
  '학년': 'grade',
  'grade': 'grade',
  
  // 성적
  '현재점수': 'currentScore',
  '이번성적': 'currentScore',
  '점수': 'currentScore',
  'current_score': 'currentScore',
  'score': 'currentScore',
  
  '이전점수': 'previousScore',
  '지난성적': 'previousScore',
  'previous_score': 'previousScore',
  
  // 출석
  '출석률': 'attendanceRate',
  '출석': 'attendanceRate',
  'attendance': 'attendanceRate',
  'attendance_rate': 'attendanceRate',
  
  // 결제
  '납부여부': 'tuitionPaid',
  '결제여부': 'tuitionPaid',
  'paid': 'tuitionPaid',
};

// ═══════════════════════════════════════════════════════════════════════════
//                              EXCEL WATCHER
// ═══════════════════════════════════════════════════════════════════════════

export class ExcelWatcher extends EventEmitter {
  private config: WatcherConfig;
  private watchers: fs.FSWatcher[] = [];
  private fileHashes: Map<string, string> = new Map();
  private isRunning: boolean = false;

  constructor(config: Partial<WatcherConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         LIFECYCLE
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 감시 시작
   */
  async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    console.log('[ExcelWatcher] Starting...');

    // 각 경로에 대해 감시 설정
    for (const watchPath of this.config.watchPaths) {
      await this.setupWatcher(watchPath);
    }

    // 시작 시 기존 파일 파싱
    if (this.config.parseOnStart) {
      await this.parseExistingFiles();
    }

    this.emit('started');
  }

  /**
   * 감시 중지
   */
  stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;

    for (const watcher of this.watchers) {
      watcher.close();
    }
    this.watchers = [];

    console.log('[ExcelWatcher] Stopped');
    this.emit('stopped');
  }

  /**
   * 감시 경로 추가
   */
  addWatchPath(watchPath: string): void {
    if (!this.config.watchPaths.includes(watchPath)) {
      this.config.watchPaths.push(watchPath);
      
      if (this.isRunning) {
        this.setupWatcher(watchPath);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         FILE WATCHING
  // ─────────────────────────────────────────────────────────────────────────

  private async setupWatcher(watchPath: string): Promise<void> {
    try {
      const stats = await fs.promises.stat(watchPath);

      if (stats.isDirectory()) {
        // 폴더 감시
        const watcher = fs.watch(watchPath, (eventType, filename) => {
          if (filename && this.config.filePattern.test(filename)) {
            const filePath = path.join(watchPath, filename);
            this.handleFileChange(filePath);
          }
        });
        this.watchers.push(watcher);
        console.log(`[ExcelWatcher] Watching directory: ${watchPath}`);
      } else if (stats.isFile()) {
        // 파일 직접 감시
        const watcher = fs.watch(watchPath, () => {
          this.handleFileChange(watchPath);
        });
        this.watchers.push(watcher);
        console.log(`[ExcelWatcher] Watching file: ${watchPath}`);
      }
    } catch (error) {
      console.error(`[ExcelWatcher] Failed to setup watcher for ${watchPath}:`, error);
    }
  }

  private async handleFileChange(filePath: string): Promise<void> {
    // 파일 해시로 실제 변경 여부 확인
    const newHash = await this.getFileHash(filePath);
    const oldHash = this.fileHashes.get(filePath);

    if (newHash && newHash !== oldHash) {
      this.fileHashes.set(filePath, newHash);
      
      console.log(`[ExcelWatcher] File changed: ${filePath}`);
      
      // 파싱 및 이벤트 발생
      const result = await this.parseFile(filePath);
      this.emit('fileChanged', result);
    }
  }

  private async getFileHash(filePath: string): Promise<string | null> {
    try {
      const content = await fs.promises.readFile(filePath);
      const crypto = require('crypto');
      return crypto.createHash('md5').update(content).digest('hex');
    } catch {
      return null;
    }
  }

  private async parseExistingFiles(): Promise<void> {
    for (const watchPath of this.config.watchPaths) {
      try {
        const stats = await fs.promises.stat(watchPath);

        if (stats.isDirectory()) {
          const files = await fs.promises.readdir(watchPath);
          for (const file of files) {
            if (this.config.filePattern.test(file)) {
              const filePath = path.join(watchPath, file);
              const result = await this.parseFile(filePath);
              this.emit('fileParsed', result);
            }
          }
        } else if (stats.isFile()) {
          const result = await this.parseFile(watchPath);
          this.emit('fileParsed', result);
        }
      } catch (error) {
        console.error(`[ExcelWatcher] Failed to parse existing files in ${watchPath}:`, error);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         EXCEL PARSING
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 엑셀 파일 파싱
   */
  async parseFile(filePath: string): Promise<ParseResult> {
    const result: ParseResult = {
      filePath,
      records: [],
      parsedAt: new Date(),
      errors: [],
    };

    try {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      
      // JSON으로 변환
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      if (rows.length === 0) {
        result.errors.push('No data found in file');
        return result;
      }

      // 컬럼 매핑 찾기
      const firstRow = rows[0] as Record<string, any>;
      const columnMap = this.findColumnMapping(Object.keys(firstRow));

      // 각 행 파싱
      for (let i = 0; i < rows.length; i++) {
        try {
          const row = rows[i] as Record<string, any>;
          const record = this.parseRow(row, columnMap);
          
          if (record) {
            result.records.push(record);
          }
        } catch (error) {
          result.errors.push(`Row ${i + 1}: ${error}`);
        }
      }

      // 파일 해시 저장
      const hash = await this.getFileHash(filePath);
      if (hash) {
        this.fileHashes.set(filePath, hash);
      }

    } catch (error) {
      result.errors.push(`Parse error: ${error}`);
    }

    return result;
  }

  private findColumnMapping(headers: string[]): Map<string, keyof LmsRecord> {
    const mapping = new Map<string, keyof LmsRecord>();

    for (const header of headers) {
      const normalizedHeader = header.toLowerCase().trim();
      
      for (const [pattern, field] of Object.entries(COLUMN_MAPPINGS)) {
        if (normalizedHeader === pattern.toLowerCase() || 
            normalizedHeader.includes(pattern.toLowerCase())) {
          mapping.set(header, field);
          break;
        }
      }
    }

    return mapping;
  }

  private parseRow(
    row: Record<string, any>,
    columnMap: Map<string, keyof LmsRecord>
  ): LmsRecord | null {
    const record: Partial<LmsRecord> = {
      scoreChange: 0,
      attendanceRate: 1,
      tuitionPaid: true,
    };

    // 매핑된 컬럼 값 추출
    for (const [header, field] of columnMap) {
      const value = row[header];
      
      if (value !== undefined && value !== '') {
        switch (field) {
          case 'currentScore':
          case 'previousScore':
            record[field] = parseFloat(value) || 0;
            break;
          case 'attendanceRate':
            // 백분율 또는 소수점
            const rate = parseFloat(value);
            record[field] = rate > 1 ? rate / 100 : rate;
            break;
          case 'tuitionPaid':
            record[field] = ['Y', 'O', '완료', '납부', 'true', '1'].includes(
              String(value).toUpperCase()
            );
            break;
          case 'parentPhone':
            // 전화번호 정규화
            record[field] = this.normalizePhone(String(value));
            break;
          default:
            (record as any)[field] = String(value);
        }
      }
    }

    // 필수 필드 검증
    if (!record.studentName || !record.parentPhone) {
      return null;
    }

    // 성적 변화 계산
    if (record.currentScore !== undefined && record.previousScore !== undefined) {
      record.scoreChange = record.currentScore - record.previousScore;
    }

    return record as LmsRecord;
  }

  private normalizePhone(phone: string): string {
    // 숫자만 추출
    const digits = phone.replace(/[^0-9]/g, '');
    
    // 형식화 (010-1234-5678)
    if (digits.length === 11 && digits.startsWith('010')) {
      return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
    }
    
    return digits;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         PUBLIC API
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 수동으로 특정 파일 파싱
   */
  async manualParse(filePath: string): Promise<ParseResult> {
    return this.parseFile(filePath);
  }

  /**
   * 감시 중인 경로 목록
   */
  getWatchPaths(): string[] {
    return [...this.config.watchPaths];
  }

  /**
   * 상태 조회
   */
  getStatus(): {
    isRunning: boolean;
    watchPaths: string[];
    trackedFiles: number;
  } {
    return {
      isRunning: this.isRunning,
      watchPaths: this.config.watchPaths,
      trackedFiles: this.fileHashes.size,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//                              FACTORY
// ═══════════════════════════════════════════════════════════════════════════

export function createExcelWatcher(config?: Partial<WatcherConfig>): ExcelWatcher {
  return new ExcelWatcher(config);
}

// ═══════════════════════════════════════════════════════════════════════════
//                              USAGE EXAMPLE
// ═══════════════════════════════════════════════════════════════════════════

/*
import { createExcelWatcher } from './ExcelWatcher';

const watcher = createExcelWatcher({
  watchPaths: [
    '/Users/user/Documents/학원관리',
    '/Users/user/Desktop/LMS.xlsx',
  ],
  parseOnStart: true,
});

watcher.on('fileChanged', (result) => {
  console.log('File changed:', result.filePath);
  console.log('Records:', result.records.length);
  
  // SQ 업데이트
  for (const record of result.records) {
    sqService.upsertNode({
      id: record.parentPhone,
      name: record.studentName + ' 학부모',
      phone: record.parentPhone,
      studentName: record.studentName,
      synergyScore: calculateSynergyFromLms(record),
    });
  }
});

watcher.on('fileParsed', (result) => {
  console.log('Initial parse:', result.filePath);
});

watcher.start();
*/










/**
 * AUTUS Local Agent - Excel Watcher
 * ===================================
 * 
 * 학원 LMS 엑셀 파일 변경 감지 및 파싱
 * 
 * Electron (Desktop) 앱에서 실행
 * 파일 시스템 감시로 실시간 데이터 수집
 */

import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import { EventEmitter } from 'events';

// ═══════════════════════════════════════════════════════════════════════════
//                              TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface LmsRecord {
  studentName: string;
  parentPhone: string;
  grade?: string;
  subjects?: string[];
  currentScore?: number;
  previousScore?: number;
  scoreChange: number;
  attendanceRate: number;
  lastAttendance?: Date;
  tuitionPaid: boolean;
  nextPaymentDate?: Date;
}

export interface WatcherConfig {
  watchPaths: string[];           // 감시할 폴더/파일 경로
  filePattern: RegExp;            // 파일명 패턴 (예: *.xlsx)
  pollInterval: number;           // 폴링 간격 (ms)
  parseOnStart: boolean;          // 시작 시 기존 파일 파싱
}

export interface ParseResult {
  filePath: string;
  records: LmsRecord[];
  parsedAt: Date;
  errors: string[];
}

// ═══════════════════════════════════════════════════════════════════════════
//                              DEFAULT CONFIG
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_CONFIG: WatcherConfig = {
  watchPaths: [],
  filePattern: /\.(xlsx?|csv)$/i,
  pollInterval: 5000,  // 5초
  parseOnStart: true,
};

// ═══════════════════════════════════════════════════════════════════════════
//                              COLUMN MAPPINGS
// ═══════════════════════════════════════════════════════════════════════════

// 엑셀 컬럼명 → LmsRecord 필드 매핑
const COLUMN_MAPPINGS: Record<string, keyof LmsRecord> = {
  // 학생 정보
  '학생명': 'studentName',
  '이름': 'studentName',
  '학생이름': 'studentName',
  'student_name': 'studentName',
  
  // 학부모 연락처
  '학부모연락처': 'parentPhone',
  '연락처': 'parentPhone',
  '전화번호': 'parentPhone',
  '부모연락처': 'parentPhone',
  'parent_phone': 'parentPhone',
  'phone': 'parentPhone',
  
  // 학년
  '학년': 'grade',
  'grade': 'grade',
  
  // 성적
  '현재점수': 'currentScore',
  '이번성적': 'currentScore',
  '점수': 'currentScore',
  'current_score': 'currentScore',
  'score': 'currentScore',
  
  '이전점수': 'previousScore',
  '지난성적': 'previousScore',
  'previous_score': 'previousScore',
  
  // 출석
  '출석률': 'attendanceRate',
  '출석': 'attendanceRate',
  'attendance': 'attendanceRate',
  'attendance_rate': 'attendanceRate',
  
  // 결제
  '납부여부': 'tuitionPaid',
  '결제여부': 'tuitionPaid',
  'paid': 'tuitionPaid',
};

// ═══════════════════════════════════════════════════════════════════════════
//                              EXCEL WATCHER
// ═══════════════════════════════════════════════════════════════════════════

export class ExcelWatcher extends EventEmitter {
  private config: WatcherConfig;
  private watchers: fs.FSWatcher[] = [];
  private fileHashes: Map<string, string> = new Map();
  private isRunning: boolean = false;

  constructor(config: Partial<WatcherConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         LIFECYCLE
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 감시 시작
   */
  async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    console.log('[ExcelWatcher] Starting...');

    // 각 경로에 대해 감시 설정
    for (const watchPath of this.config.watchPaths) {
      await this.setupWatcher(watchPath);
    }

    // 시작 시 기존 파일 파싱
    if (this.config.parseOnStart) {
      await this.parseExistingFiles();
    }

    this.emit('started');
  }

  /**
   * 감시 중지
   */
  stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;

    for (const watcher of this.watchers) {
      watcher.close();
    }
    this.watchers = [];

    console.log('[ExcelWatcher] Stopped');
    this.emit('stopped');
  }

  /**
   * 감시 경로 추가
   */
  addWatchPath(watchPath: string): void {
    if (!this.config.watchPaths.includes(watchPath)) {
      this.config.watchPaths.push(watchPath);
      
      if (this.isRunning) {
        this.setupWatcher(watchPath);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         FILE WATCHING
  // ─────────────────────────────────────────────────────────────────────────

  private async setupWatcher(watchPath: string): Promise<void> {
    try {
      const stats = await fs.promises.stat(watchPath);

      if (stats.isDirectory()) {
        // 폴더 감시
        const watcher = fs.watch(watchPath, (eventType, filename) => {
          if (filename && this.config.filePattern.test(filename)) {
            const filePath = path.join(watchPath, filename);
            this.handleFileChange(filePath);
          }
        });
        this.watchers.push(watcher);
        console.log(`[ExcelWatcher] Watching directory: ${watchPath}`);
      } else if (stats.isFile()) {
        // 파일 직접 감시
        const watcher = fs.watch(watchPath, () => {
          this.handleFileChange(watchPath);
        });
        this.watchers.push(watcher);
        console.log(`[ExcelWatcher] Watching file: ${watchPath}`);
      }
    } catch (error) {
      console.error(`[ExcelWatcher] Failed to setup watcher for ${watchPath}:`, error);
    }
  }

  private async handleFileChange(filePath: string): Promise<void> {
    // 파일 해시로 실제 변경 여부 확인
    const newHash = await this.getFileHash(filePath);
    const oldHash = this.fileHashes.get(filePath);

    if (newHash && newHash !== oldHash) {
      this.fileHashes.set(filePath, newHash);
      
      console.log(`[ExcelWatcher] File changed: ${filePath}`);
      
      // 파싱 및 이벤트 발생
      const result = await this.parseFile(filePath);
      this.emit('fileChanged', result);
    }
  }

  private async getFileHash(filePath: string): Promise<string | null> {
    try {
      const content = await fs.promises.readFile(filePath);
      const crypto = require('crypto');
      return crypto.createHash('md5').update(content).digest('hex');
    } catch {
      return null;
    }
  }

  private async parseExistingFiles(): Promise<void> {
    for (const watchPath of this.config.watchPaths) {
      try {
        const stats = await fs.promises.stat(watchPath);

        if (stats.isDirectory()) {
          const files = await fs.promises.readdir(watchPath);
          for (const file of files) {
            if (this.config.filePattern.test(file)) {
              const filePath = path.join(watchPath, file);
              const result = await this.parseFile(filePath);
              this.emit('fileParsed', result);
            }
          }
        } else if (stats.isFile()) {
          const result = await this.parseFile(watchPath);
          this.emit('fileParsed', result);
        }
      } catch (error) {
        console.error(`[ExcelWatcher] Failed to parse existing files in ${watchPath}:`, error);
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         EXCEL PARSING
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 엑셀 파일 파싱
   */
  async parseFile(filePath: string): Promise<ParseResult> {
    const result: ParseResult = {
      filePath,
      records: [],
      parsedAt: new Date(),
      errors: [],
    };

    try {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      
      // JSON으로 변환
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      if (rows.length === 0) {
        result.errors.push('No data found in file');
        return result;
      }

      // 컬럼 매핑 찾기
      const firstRow = rows[0] as Record<string, any>;
      const columnMap = this.findColumnMapping(Object.keys(firstRow));

      // 각 행 파싱
      for (let i = 0; i < rows.length; i++) {
        try {
          const row = rows[i] as Record<string, any>;
          const record = this.parseRow(row, columnMap);
          
          if (record) {
            result.records.push(record);
          }
        } catch (error) {
          result.errors.push(`Row ${i + 1}: ${error}`);
        }
      }

      // 파일 해시 저장
      const hash = await this.getFileHash(filePath);
      if (hash) {
        this.fileHashes.set(filePath, hash);
      }

    } catch (error) {
      result.errors.push(`Parse error: ${error}`);
    }

    return result;
  }

  private findColumnMapping(headers: string[]): Map<string, keyof LmsRecord> {
    const mapping = new Map<string, keyof LmsRecord>();

    for (const header of headers) {
      const normalizedHeader = header.toLowerCase().trim();
      
      for (const [pattern, field] of Object.entries(COLUMN_MAPPINGS)) {
        if (normalizedHeader === pattern.toLowerCase() || 
            normalizedHeader.includes(pattern.toLowerCase())) {
          mapping.set(header, field);
          break;
        }
      }
    }

    return mapping;
  }

  private parseRow(
    row: Record<string, any>,
    columnMap: Map<string, keyof LmsRecord>
  ): LmsRecord | null {
    const record: Partial<LmsRecord> = {
      scoreChange: 0,
      attendanceRate: 1,
      tuitionPaid: true,
    };

    // 매핑된 컬럼 값 추출
    for (const [header, field] of columnMap) {
      const value = row[header];
      
      if (value !== undefined && value !== '') {
        switch (field) {
          case 'currentScore':
          case 'previousScore':
            record[field] = parseFloat(value) || 0;
            break;
          case 'attendanceRate':
            // 백분율 또는 소수점
            const rate = parseFloat(value);
            record[field] = rate > 1 ? rate / 100 : rate;
            break;
          case 'tuitionPaid':
            record[field] = ['Y', 'O', '완료', '납부', 'true', '1'].includes(
              String(value).toUpperCase()
            );
            break;
          case 'parentPhone':
            // 전화번호 정규화
            record[field] = this.normalizePhone(String(value));
            break;
          default:
            (record as any)[field] = String(value);
        }
      }
    }

    // 필수 필드 검증
    if (!record.studentName || !record.parentPhone) {
      return null;
    }

    // 성적 변화 계산
    if (record.currentScore !== undefined && record.previousScore !== undefined) {
      record.scoreChange = record.currentScore - record.previousScore;
    }

    return record as LmsRecord;
  }

  private normalizePhone(phone: string): string {
    // 숫자만 추출
    const digits = phone.replace(/[^0-9]/g, '');
    
    // 형식화 (010-1234-5678)
    if (digits.length === 11 && digits.startsWith('010')) {
      return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
    }
    
    return digits;
  }

  // ─────────────────────────────────────────────────────────────────────────
  //                         PUBLIC API
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * 수동으로 특정 파일 파싱
   */
  async manualParse(filePath: string): Promise<ParseResult> {
    return this.parseFile(filePath);
  }

  /**
   * 감시 중인 경로 목록
   */
  getWatchPaths(): string[] {
    return [...this.config.watchPaths];
  }

  /**
   * 상태 조회
   */
  getStatus(): {
    isRunning: boolean;
    watchPaths: string[];
    trackedFiles: number;
  } {
    return {
      isRunning: this.isRunning,
      watchPaths: this.config.watchPaths,
      trackedFiles: this.fileHashes.size,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//                              FACTORY
// ═══════════════════════════════════════════════════════════════════════════

export function createExcelWatcher(config?: Partial<WatcherConfig>): ExcelWatcher {
  return new ExcelWatcher(config);
}

// ═══════════════════════════════════════════════════════════════════════════
//                              USAGE EXAMPLE
// ═══════════════════════════════════════════════════════════════════════════

/*
import { createExcelWatcher } from './ExcelWatcher';

const watcher = createExcelWatcher({
  watchPaths: [
    '/Users/user/Documents/학원관리',
    '/Users/user/Desktop/LMS.xlsx',
  ],
  parseOnStart: true,
});

watcher.on('fileChanged', (result) => {
  console.log('File changed:', result.filePath);
  console.log('Records:', result.records.length);
  
  // SQ 업데이트
  for (const record of result.records) {
    sqService.upsertNode({
      id: record.parentPhone,
      name: record.studentName + ' 학부모',
      phone: record.parentPhone,
      studentName: record.studentName,
      synergyScore: calculateSynergyFromLms(record),
    });
  }
});

watcher.on('fileParsed', (result) => {
  console.log('Initial parse:', result.filePath);
});

watcher.start();
*/


























