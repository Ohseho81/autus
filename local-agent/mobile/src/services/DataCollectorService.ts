/**
 * AUTUS Local Agent - Data Collector Service
 * ============================================
 * 
 * Android 기기에서 데이터 수집
 * 
 * 권한 필요:
 * - READ_CALL_LOG: 통화 기록
 * - READ_SMS: SMS 메시지
 * - READ_CONTACTS: 연락처 (선택)
 * 
 * Zero-Server-Cost: 모든 데이터는 로컬에만 저장
 */

import { NativeModules, PermissionsAndroid, Platform } from 'react-native';

// ═══════════════════════════════════════════════════════════════════════════
//                              TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface CallLogEntry {
  id: string;
  phone: string;
  name: string | null;
  duration: number;  // seconds
  type: 'incoming' | 'outgoing' | 'missed';
  timestamp: number; // ms
}

export interface SmsEntry {
  id: string;
  phone: string;
  body: string;
  type: 'inbox' | 'sent';
  timestamp: number; // ms
}

export interface ParsedPayment {
  phone: string;
  amount: number;
  source: 'bank' | 'card' | 'simple_pay';
  timestamp: number;
}

// ═══════════════════════════════════════════════════════════════════════════
//                              PERMISSIONS
// ═══════════════════════════════════════════════════════════════════════════

export async function requestPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    console.warn('Permissions only available on Android');
    return false;
  }

  try {
    const grants = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
      PermissionsAndroid.PERMISSIONS.READ_SMS,
      PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
    ]);

    const allGranted = Object.values(grants).every(
      (status) => status === PermissionsAndroid.RESULTS.GRANTED
    );

    return allGranted;
  } catch (error) {
    console.error('Permission request failed:', error);
    return false;
  }
}

export async function checkPermissions(): Promise<{
  callLog: boolean;
  sms: boolean;
  contacts: boolean;
}> {
  if (Platform.OS !== 'android') {
    return { callLog: false, sms: false, contacts: false };
  }

  const callLog = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.READ_CALL_LOG
  );
  const sms = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.READ_SMS
  );
  const contacts = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.READ_CONTACTS
  );

  return { callLog, sms, contacts };
}

// ═══════════════════════════════════════════════════════════════════════════
//                              CALL LOG COLLECTOR
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 통화 기록 수집
 * 
 * Android ContentResolver 사용
 */
export async function getCallLogs(days: number = 90): Promise<CallLogEntry[]> {
  // Native Module 호출 (별도 구현 필요)
  // 여기서는 인터페이스만 정의
  
  const cutoffMs = Date.now() - days * 24 * 60 * 60 * 1000;
  
  try {
    // TODO: NativeModules.CallLogModule.query() 구현
    // const rawLogs = await NativeModules.CallLogModule.query(cutoffMs);
    
    // 목업 데이터 (테스트용)
    const mockLogs: CallLogEntry[] = [
      {
        id: '1',
        phone: '010-1234-5678',
        name: '김철수',
        duration: 180,
        type: 'outgoing',
        timestamp: Date.now() - 1000 * 60 * 60,
      },
      {
        id: '2',
        phone: '010-2345-6789',
        name: '이영희',
        duration: 600,
        type: 'incoming',
        timestamp: Date.now() - 1000 * 60 * 60 * 24,
      },
    ];
    
    return mockLogs;
  } catch (error) {
    console.error('Failed to get call logs:', error);
    return [];
  }
}

/**
 * 통화 기록 분석
 */
export function analyzeCallLogs(logs: CallLogEntry[]): {
  byPhone: Map<string, { totalDuration: number; callCount: number }>;
  totalMinutes: number;
  longCallsCount: number;
} {
  const byPhone = new Map<string, { totalDuration: number; callCount: number }>();
  let totalMinutes = 0;
  let longCallsCount = 0;

  for (const log of logs) {
    const existing = byPhone.get(log.phone) || { totalDuration: 0, callCount: 0 };
    existing.totalDuration += log.duration;
    existing.callCount += 1;
    byPhone.set(log.phone, existing);

    totalMinutes += log.duration / 60;
    if (log.duration >= 300) { // 5분 이상
      longCallsCount += 1;
    }
  }

  return { byPhone, totalMinutes, longCallsCount };
}

// ═══════════════════════════════════════════════════════════════════════════
//                              SMS COLLECTOR
// ═══════════════════════════════════════════════════════════════════════════

/**
 * SMS 수집
 */
export async function getSmsMessages(days: number = 90): Promise<SmsEntry[]> {
  const cutoffMs = Date.now() - days * 24 * 60 * 60 * 1000;
  
  try {
    // TODO: NativeModules.SmsModule.query() 구현
    
    // 목업 데이터 (테스트용)
    const mockSms: SmsEntry[] = [
      {
        id: '1',
        phone: '15990000',
        body: '[국민은행] 입금 500,000원 잔액 1,200,000원',
        type: 'inbox',
        timestamp: Date.now() - 1000 * 60 * 60,
      },
      {
        id: '2',
        phone: '15990000',
        body: '[신한카드] 결제승인 300,000원',
        type: 'inbox',
        timestamp: Date.now() - 1000 * 60 * 60 * 24,
      },
    ];
    
    return mockSms;
  } catch (error) {
    console.error('Failed to get SMS:', error);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//                              PAYMENT PARSER
// ═══════════════════════════════════════════════════════════════════════════

// 결제 알림 패턴
const PAYMENT_PATTERNS = {
  bank: [
    /\[([가-힣]+은행)\]\s*입금\s*([\d,]+)원/,
    /\[([가-힣]+뱅크)\]\s*입금\s*([\d,]+)원/,
  ],
  card: [
    /\[([가-힣]+카드)\]\s*결제승인\s*([\d,]+)원/,
    /\[([가-힣]+카드)\]\s*승인\s*([\d,]+)원/,
  ],
  simple_pay: [
    /\[카카오페이\]\s*입금\s*([\d,]+)원/,
    /\[네이버페이\]\s*입금\s*([\d,]+)원/,
    /\[토스\]\s*입금\s*([\d,]+)원/,
  ],
};

// 제외 패턴
const EXCLUDE_PATTERNS = [/환불/, /취소/, /반품/, /출금/, /이체/];

/**
 * SMS에서 결제 금액 파싱
 */
export function parsePaymentFromSms(sms: SmsEntry): ParsedPayment | null {
  // 제외 패턴 체크
  for (const pattern of EXCLUDE_PATTERNS) {
    if (pattern.test(sms.body)) {
      return null;
    }
  }

  // 은행 입금
  for (const pattern of PAYMENT_PATTERNS.bank) {
    const match = sms.body.match(pattern);
    if (match) {
      const amountStr = match[2] || match[1];
      const amount = parseFloat(amountStr.replace(/,/g, ''));
      return {
        phone: sms.phone,
        amount,
        source: 'bank',
        timestamp: sms.timestamp,
      };
    }
  }

  // 카드 결제
  for (const pattern of PAYMENT_PATTERNS.card) {
    const match = sms.body.match(pattern);
    if (match) {
      const amount = parseFloat(match[2].replace(/,/g, ''));
      return {
        phone: sms.phone,
        amount,
        source: 'card',
        timestamp: sms.timestamp,
      };
    }
  }

  // 간편결제
  for (const pattern of PAYMENT_PATTERNS.simple_pay) {
    const match = sms.body.match(pattern);
    if (match) {
      const amount = parseFloat(match[1].replace(/,/g, ''));
      return {
        phone: sms.phone,
        amount,
        source: 'simple_pay',
        timestamp: sms.timestamp,
      };
    }
  }

  return null;
}

/**
 * SMS 배치에서 결제 내역 추출
 */
export function extractPayments(smsList: SmsEntry[]): ParsedPayment[] {
  const payments: ParsedPayment[] = [];
  
  for (const sms of smsList) {
    const payment = parsePaymentFromSms(sms);
    if (payment) {
      payments.push(payment);
    }
  }
  
  return payments;
}

/**
 * 전화번호별 총 입금액 집계
 */
export function aggregatePaymentsByPhone(
  payments: ParsedPayment[]
): Map<string, number> {
  const totals = new Map<string, number>();
  
  // 참고: 결제 알림의 phone은 은행/카드사 번호
  // 실제로는 학부모 전화번호와 매칭 필요
  
  for (const payment of payments) {
    const existing = totals.get(payment.phone) || 0;
    totals.set(payment.phone, existing + payment.amount);
  }
  
  return totals;
}

// ═══════════════════════════════════════════════════════════════════════════
//                              MAIN COLLECTOR
// ═══════════════════════════════════════════════════════════════════════════

export interface CollectionResult {
  callLogs: CallLogEntry[];
  smsMessages: SmsEntry[];
  payments: ParsedPayment[];
  callAnalysis: ReturnType<typeof analyzeCallLogs>;
  totalPaymentAmount: number;
  collectedAt: number;
}

/**
 * 전체 데이터 수집
 */
export async function collectAllData(days: number = 90): Promise<CollectionResult> {
  // 권한 체크
  const permissions = await checkPermissions();
  
  if (!permissions.callLog || !permissions.sms) {
    throw new Error('Required permissions not granted');
  }
  
  // 데이터 수집
  const callLogs = await getCallLogs(days);
  const smsMessages = await getSmsMessages(days);
  
  // 분석
  const callAnalysis = analyzeCallLogs(callLogs);
  const payments = extractPayments(smsMessages);
  const totalPaymentAmount = payments.reduce((sum, p) => sum + p.amount, 0);
  
  return {
    callLogs,
    smsMessages,
    payments,
    callAnalysis,
    totalPaymentAmount,
    collectedAt: Date.now(),
  };
}










/**
 * AUTUS Local Agent - Data Collector Service
 * ============================================
 * 
 * Android 기기에서 데이터 수집
 * 
 * 권한 필요:
 * - READ_CALL_LOG: 통화 기록
 * - READ_SMS: SMS 메시지
 * - READ_CONTACTS: 연락처 (선택)
 * 
 * Zero-Server-Cost: 모든 데이터는 로컬에만 저장
 */

import { NativeModules, PermissionsAndroid, Platform } from 'react-native';

// ═══════════════════════════════════════════════════════════════════════════
//                              TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface CallLogEntry {
  id: string;
  phone: string;
  name: string | null;
  duration: number;  // seconds
  type: 'incoming' | 'outgoing' | 'missed';
  timestamp: number; // ms
}

export interface SmsEntry {
  id: string;
  phone: string;
  body: string;
  type: 'inbox' | 'sent';
  timestamp: number; // ms
}

export interface ParsedPayment {
  phone: string;
  amount: number;
  source: 'bank' | 'card' | 'simple_pay';
  timestamp: number;
}

// ═══════════════════════════════════════════════════════════════════════════
//                              PERMISSIONS
// ═══════════════════════════════════════════════════════════════════════════

export async function requestPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    console.warn('Permissions only available on Android');
    return false;
  }

  try {
    const grants = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
      PermissionsAndroid.PERMISSIONS.READ_SMS,
      PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
    ]);

    const allGranted = Object.values(grants).every(
      (status) => status === PermissionsAndroid.RESULTS.GRANTED
    );

    return allGranted;
  } catch (error) {
    console.error('Permission request failed:', error);
    return false;
  }
}

export async function checkPermissions(): Promise<{
  callLog: boolean;
  sms: boolean;
  contacts: boolean;
}> {
  if (Platform.OS !== 'android') {
    return { callLog: false, sms: false, contacts: false };
  }

  const callLog = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.READ_CALL_LOG
  );
  const sms = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.READ_SMS
  );
  const contacts = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.READ_CONTACTS
  );

  return { callLog, sms, contacts };
}

// ═══════════════════════════════════════════════════════════════════════════
//                              CALL LOG COLLECTOR
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 통화 기록 수집
 * 
 * Android ContentResolver 사용
 */
export async function getCallLogs(days: number = 90): Promise<CallLogEntry[]> {
  // Native Module 호출 (별도 구현 필요)
  // 여기서는 인터페이스만 정의
  
  const cutoffMs = Date.now() - days * 24 * 60 * 60 * 1000;
  
  try {
    // TODO: NativeModules.CallLogModule.query() 구현
    // const rawLogs = await NativeModules.CallLogModule.query(cutoffMs);
    
    // 목업 데이터 (테스트용)
    const mockLogs: CallLogEntry[] = [
      {
        id: '1',
        phone: '010-1234-5678',
        name: '김철수',
        duration: 180,
        type: 'outgoing',
        timestamp: Date.now() - 1000 * 60 * 60,
      },
      {
        id: '2',
        phone: '010-2345-6789',
        name: '이영희',
        duration: 600,
        type: 'incoming',
        timestamp: Date.now() - 1000 * 60 * 60 * 24,
      },
    ];
    
    return mockLogs;
  } catch (error) {
    console.error('Failed to get call logs:', error);
    return [];
  }
}

/**
 * 통화 기록 분석
 */
export function analyzeCallLogs(logs: CallLogEntry[]): {
  byPhone: Map<string, { totalDuration: number; callCount: number }>;
  totalMinutes: number;
  longCallsCount: number;
} {
  const byPhone = new Map<string, { totalDuration: number; callCount: number }>();
  let totalMinutes = 0;
  let longCallsCount = 0;

  for (const log of logs) {
    const existing = byPhone.get(log.phone) || { totalDuration: 0, callCount: 0 };
    existing.totalDuration += log.duration;
    existing.callCount += 1;
    byPhone.set(log.phone, existing);

    totalMinutes += log.duration / 60;
    if (log.duration >= 300) { // 5분 이상
      longCallsCount += 1;
    }
  }

  return { byPhone, totalMinutes, longCallsCount };
}

// ═══════════════════════════════════════════════════════════════════════════
//                              SMS COLLECTOR
// ═══════════════════════════════════════════════════════════════════════════

/**
 * SMS 수집
 */
export async function getSmsMessages(days: number = 90): Promise<SmsEntry[]> {
  const cutoffMs = Date.now() - days * 24 * 60 * 60 * 1000;
  
  try {
    // TODO: NativeModules.SmsModule.query() 구현
    
    // 목업 데이터 (테스트용)
    const mockSms: SmsEntry[] = [
      {
        id: '1',
        phone: '15990000',
        body: '[국민은행] 입금 500,000원 잔액 1,200,000원',
        type: 'inbox',
        timestamp: Date.now() - 1000 * 60 * 60,
      },
      {
        id: '2',
        phone: '15990000',
        body: '[신한카드] 결제승인 300,000원',
        type: 'inbox',
        timestamp: Date.now() - 1000 * 60 * 60 * 24,
      },
    ];
    
    return mockSms;
  } catch (error) {
    console.error('Failed to get SMS:', error);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//                              PAYMENT PARSER
// ═══════════════════════════════════════════════════════════════════════════

// 결제 알림 패턴
const PAYMENT_PATTERNS = {
  bank: [
    /\[([가-힣]+은행)\]\s*입금\s*([\d,]+)원/,
    /\[([가-힣]+뱅크)\]\s*입금\s*([\d,]+)원/,
  ],
  card: [
    /\[([가-힣]+카드)\]\s*결제승인\s*([\d,]+)원/,
    /\[([가-힣]+카드)\]\s*승인\s*([\d,]+)원/,
  ],
  simple_pay: [
    /\[카카오페이\]\s*입금\s*([\d,]+)원/,
    /\[네이버페이\]\s*입금\s*([\d,]+)원/,
    /\[토스\]\s*입금\s*([\d,]+)원/,
  ],
};

// 제외 패턴
const EXCLUDE_PATTERNS = [/환불/, /취소/, /반품/, /출금/, /이체/];

/**
 * SMS에서 결제 금액 파싱
 */
export function parsePaymentFromSms(sms: SmsEntry): ParsedPayment | null {
  // 제외 패턴 체크
  for (const pattern of EXCLUDE_PATTERNS) {
    if (pattern.test(sms.body)) {
      return null;
    }
  }

  // 은행 입금
  for (const pattern of PAYMENT_PATTERNS.bank) {
    const match = sms.body.match(pattern);
    if (match) {
      const amountStr = match[2] || match[1];
      const amount = parseFloat(amountStr.replace(/,/g, ''));
      return {
        phone: sms.phone,
        amount,
        source: 'bank',
        timestamp: sms.timestamp,
      };
    }
  }

  // 카드 결제
  for (const pattern of PAYMENT_PATTERNS.card) {
    const match = sms.body.match(pattern);
    if (match) {
      const amount = parseFloat(match[2].replace(/,/g, ''));
      return {
        phone: sms.phone,
        amount,
        source: 'card',
        timestamp: sms.timestamp,
      };
    }
  }

  // 간편결제
  for (const pattern of PAYMENT_PATTERNS.simple_pay) {
    const match = sms.body.match(pattern);
    if (match) {
      const amount = parseFloat(match[1].replace(/,/g, ''));
      return {
        phone: sms.phone,
        amount,
        source: 'simple_pay',
        timestamp: sms.timestamp,
      };
    }
  }

  return null;
}

/**
 * SMS 배치에서 결제 내역 추출
 */
export function extractPayments(smsList: SmsEntry[]): ParsedPayment[] {
  const payments: ParsedPayment[] = [];
  
  for (const sms of smsList) {
    const payment = parsePaymentFromSms(sms);
    if (payment) {
      payments.push(payment);
    }
  }
  
  return payments;
}

/**
 * 전화번호별 총 입금액 집계
 */
export function aggregatePaymentsByPhone(
  payments: ParsedPayment[]
): Map<string, number> {
  const totals = new Map<string, number>();
  
  // 참고: 결제 알림의 phone은 은행/카드사 번호
  // 실제로는 학부모 전화번호와 매칭 필요
  
  for (const payment of payments) {
    const existing = totals.get(payment.phone) || 0;
    totals.set(payment.phone, existing + payment.amount);
  }
  
  return totals;
}

// ═══════════════════════════════════════════════════════════════════════════
//                              MAIN COLLECTOR
// ═══════════════════════════════════════════════════════════════════════════

export interface CollectionResult {
  callLogs: CallLogEntry[];
  smsMessages: SmsEntry[];
  payments: ParsedPayment[];
  callAnalysis: ReturnType<typeof analyzeCallLogs>;
  totalPaymentAmount: number;
  collectedAt: number;
}

/**
 * 전체 데이터 수집
 */
export async function collectAllData(days: number = 90): Promise<CollectionResult> {
  // 권한 체크
  const permissions = await checkPermissions();
  
  if (!permissions.callLog || !permissions.sms) {
    throw new Error('Required permissions not granted');
  }
  
  // 데이터 수집
  const callLogs = await getCallLogs(days);
  const smsMessages = await getSmsMessages(days);
  
  // 분석
  const callAnalysis = analyzeCallLogs(callLogs);
  const payments = extractPayments(smsMessages);
  const totalPaymentAmount = payments.reduce((sum, p) => sum + p.amount, 0);
  
  return {
    callLogs,
    smsMessages,
    payments,
    callAnalysis,
    totalPaymentAmount,
    collectedAt: Date.now(),
  };
}










/**
 * AUTUS Local Agent - Data Collector Service
 * ============================================
 * 
 * Android 기기에서 데이터 수집
 * 
 * 권한 필요:
 * - READ_CALL_LOG: 통화 기록
 * - READ_SMS: SMS 메시지
 * - READ_CONTACTS: 연락처 (선택)
 * 
 * Zero-Server-Cost: 모든 데이터는 로컬에만 저장
 */

import { NativeModules, PermissionsAndroid, Platform } from 'react-native';

// ═══════════════════════════════════════════════════════════════════════════
//                              TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface CallLogEntry {
  id: string;
  phone: string;
  name: string | null;
  duration: number;  // seconds
  type: 'incoming' | 'outgoing' | 'missed';
  timestamp: number; // ms
}

export interface SmsEntry {
  id: string;
  phone: string;
  body: string;
  type: 'inbox' | 'sent';
  timestamp: number; // ms
}

export interface ParsedPayment {
  phone: string;
  amount: number;
  source: 'bank' | 'card' | 'simple_pay';
  timestamp: number;
}

// ═══════════════════════════════════════════════════════════════════════════
//                              PERMISSIONS
// ═══════════════════════════════════════════════════════════════════════════

export async function requestPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    console.warn('Permissions only available on Android');
    return false;
  }

  try {
    const grants = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
      PermissionsAndroid.PERMISSIONS.READ_SMS,
      PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
    ]);

    const allGranted = Object.values(grants).every(
      (status) => status === PermissionsAndroid.RESULTS.GRANTED
    );

    return allGranted;
  } catch (error) {
    console.error('Permission request failed:', error);
    return false;
  }
}

export async function checkPermissions(): Promise<{
  callLog: boolean;
  sms: boolean;
  contacts: boolean;
}> {
  if (Platform.OS !== 'android') {
    return { callLog: false, sms: false, contacts: false };
  }

  const callLog = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.READ_CALL_LOG
  );
  const sms = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.READ_SMS
  );
  const contacts = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.READ_CONTACTS
  );

  return { callLog, sms, contacts };
}

// ═══════════════════════════════════════════════════════════════════════════
//                              CALL LOG COLLECTOR
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 통화 기록 수집
 * 
 * Android ContentResolver 사용
 */
export async function getCallLogs(days: number = 90): Promise<CallLogEntry[]> {
  // Native Module 호출 (별도 구현 필요)
  // 여기서는 인터페이스만 정의
  
  const cutoffMs = Date.now() - days * 24 * 60 * 60 * 1000;
  
  try {
    // TODO: NativeModules.CallLogModule.query() 구현
    // const rawLogs = await NativeModules.CallLogModule.query(cutoffMs);
    
    // 목업 데이터 (테스트용)
    const mockLogs: CallLogEntry[] = [
      {
        id: '1',
        phone: '010-1234-5678',
        name: '김철수',
        duration: 180,
        type: 'outgoing',
        timestamp: Date.now() - 1000 * 60 * 60,
      },
      {
        id: '2',
        phone: '010-2345-6789',
        name: '이영희',
        duration: 600,
        type: 'incoming',
        timestamp: Date.now() - 1000 * 60 * 60 * 24,
      },
    ];
    
    return mockLogs;
  } catch (error) {
    console.error('Failed to get call logs:', error);
    return [];
  }
}

/**
 * 통화 기록 분석
 */
export function analyzeCallLogs(logs: CallLogEntry[]): {
  byPhone: Map<string, { totalDuration: number; callCount: number }>;
  totalMinutes: number;
  longCallsCount: number;
} {
  const byPhone = new Map<string, { totalDuration: number; callCount: number }>();
  let totalMinutes = 0;
  let longCallsCount = 0;

  for (const log of logs) {
    const existing = byPhone.get(log.phone) || { totalDuration: 0, callCount: 0 };
    existing.totalDuration += log.duration;
    existing.callCount += 1;
    byPhone.set(log.phone, existing);

    totalMinutes += log.duration / 60;
    if (log.duration >= 300) { // 5분 이상
      longCallsCount += 1;
    }
  }

  return { byPhone, totalMinutes, longCallsCount };
}

// ═══════════════════════════════════════════════════════════════════════════
//                              SMS COLLECTOR
// ═══════════════════════════════════════════════════════════════════════════

/**
 * SMS 수집
 */
export async function getSmsMessages(days: number = 90): Promise<SmsEntry[]> {
  const cutoffMs = Date.now() - days * 24 * 60 * 60 * 1000;
  
  try {
    // TODO: NativeModules.SmsModule.query() 구현
    
    // 목업 데이터 (테스트용)
    const mockSms: SmsEntry[] = [
      {
        id: '1',
        phone: '15990000',
        body: '[국민은행] 입금 500,000원 잔액 1,200,000원',
        type: 'inbox',
        timestamp: Date.now() - 1000 * 60 * 60,
      },
      {
        id: '2',
        phone: '15990000',
        body: '[신한카드] 결제승인 300,000원',
        type: 'inbox',
        timestamp: Date.now() - 1000 * 60 * 60 * 24,
      },
    ];
    
    return mockSms;
  } catch (error) {
    console.error('Failed to get SMS:', error);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//                              PAYMENT PARSER
// ═══════════════════════════════════════════════════════════════════════════

// 결제 알림 패턴
const PAYMENT_PATTERNS = {
  bank: [
    /\[([가-힣]+은행)\]\s*입금\s*([\d,]+)원/,
    /\[([가-힣]+뱅크)\]\s*입금\s*([\d,]+)원/,
  ],
  card: [
    /\[([가-힣]+카드)\]\s*결제승인\s*([\d,]+)원/,
    /\[([가-힣]+카드)\]\s*승인\s*([\d,]+)원/,
  ],
  simple_pay: [
    /\[카카오페이\]\s*입금\s*([\d,]+)원/,
    /\[네이버페이\]\s*입금\s*([\d,]+)원/,
    /\[토스\]\s*입금\s*([\d,]+)원/,
  ],
};

// 제외 패턴
const EXCLUDE_PATTERNS = [/환불/, /취소/, /반품/, /출금/, /이체/];

/**
 * SMS에서 결제 금액 파싱
 */
export function parsePaymentFromSms(sms: SmsEntry): ParsedPayment | null {
  // 제외 패턴 체크
  for (const pattern of EXCLUDE_PATTERNS) {
    if (pattern.test(sms.body)) {
      return null;
    }
  }

  // 은행 입금
  for (const pattern of PAYMENT_PATTERNS.bank) {
    const match = sms.body.match(pattern);
    if (match) {
      const amountStr = match[2] || match[1];
      const amount = parseFloat(amountStr.replace(/,/g, ''));
      return {
        phone: sms.phone,
        amount,
        source: 'bank',
        timestamp: sms.timestamp,
      };
    }
  }

  // 카드 결제
  for (const pattern of PAYMENT_PATTERNS.card) {
    const match = sms.body.match(pattern);
    if (match) {
      const amount = parseFloat(match[2].replace(/,/g, ''));
      return {
        phone: sms.phone,
        amount,
        source: 'card',
        timestamp: sms.timestamp,
      };
    }
  }

  // 간편결제
  for (const pattern of PAYMENT_PATTERNS.simple_pay) {
    const match = sms.body.match(pattern);
    if (match) {
      const amount = parseFloat(match[1].replace(/,/g, ''));
      return {
        phone: sms.phone,
        amount,
        source: 'simple_pay',
        timestamp: sms.timestamp,
      };
    }
  }

  return null;
}

/**
 * SMS 배치에서 결제 내역 추출
 */
export function extractPayments(smsList: SmsEntry[]): ParsedPayment[] {
  const payments: ParsedPayment[] = [];
  
  for (const sms of smsList) {
    const payment = parsePaymentFromSms(sms);
    if (payment) {
      payments.push(payment);
    }
  }
  
  return payments;
}

/**
 * 전화번호별 총 입금액 집계
 */
export function aggregatePaymentsByPhone(
  payments: ParsedPayment[]
): Map<string, number> {
  const totals = new Map<string, number>();
  
  // 참고: 결제 알림의 phone은 은행/카드사 번호
  // 실제로는 학부모 전화번호와 매칭 필요
  
  for (const payment of payments) {
    const existing = totals.get(payment.phone) || 0;
    totals.set(payment.phone, existing + payment.amount);
  }
  
  return totals;
}

// ═══════════════════════════════════════════════════════════════════════════
//                              MAIN COLLECTOR
// ═══════════════════════════════════════════════════════════════════════════

export interface CollectionResult {
  callLogs: CallLogEntry[];
  smsMessages: SmsEntry[];
  payments: ParsedPayment[];
  callAnalysis: ReturnType<typeof analyzeCallLogs>;
  totalPaymentAmount: number;
  collectedAt: number;
}

/**
 * 전체 데이터 수집
 */
export async function collectAllData(days: number = 90): Promise<CollectionResult> {
  // 권한 체크
  const permissions = await checkPermissions();
  
  if (!permissions.callLog || !permissions.sms) {
    throw new Error('Required permissions not granted');
  }
  
  // 데이터 수집
  const callLogs = await getCallLogs(days);
  const smsMessages = await getSmsMessages(days);
  
  // 분석
  const callAnalysis = analyzeCallLogs(callLogs);
  const payments = extractPayments(smsMessages);
  const totalPaymentAmount = payments.reduce((sum, p) => sum + p.amount, 0);
  
  return {
    callLogs,
    smsMessages,
    payments,
    callAnalysis,
    totalPaymentAmount,
    collectedAt: Date.now(),
  };
}










/**
 * AUTUS Local Agent - Data Collector Service
 * ============================================
 * 
 * Android 기기에서 데이터 수집
 * 
 * 권한 필요:
 * - READ_CALL_LOG: 통화 기록
 * - READ_SMS: SMS 메시지
 * - READ_CONTACTS: 연락처 (선택)
 * 
 * Zero-Server-Cost: 모든 데이터는 로컬에만 저장
 */

import { NativeModules, PermissionsAndroid, Platform } from 'react-native';

// ═══════════════════════════════════════════════════════════════════════════
//                              TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface CallLogEntry {
  id: string;
  phone: string;
  name: string | null;
  duration: number;  // seconds
  type: 'incoming' | 'outgoing' | 'missed';
  timestamp: number; // ms
}

export interface SmsEntry {
  id: string;
  phone: string;
  body: string;
  type: 'inbox' | 'sent';
  timestamp: number; // ms
}

export interface ParsedPayment {
  phone: string;
  amount: number;
  source: 'bank' | 'card' | 'simple_pay';
  timestamp: number;
}

// ═══════════════════════════════════════════════════════════════════════════
//                              PERMISSIONS
// ═══════════════════════════════════════════════════════════════════════════

export async function requestPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    console.warn('Permissions only available on Android');
    return false;
  }

  try {
    const grants = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
      PermissionsAndroid.PERMISSIONS.READ_SMS,
      PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
    ]);

    const allGranted = Object.values(grants).every(
      (status) => status === PermissionsAndroid.RESULTS.GRANTED
    );

    return allGranted;
  } catch (error) {
    console.error('Permission request failed:', error);
    return false;
  }
}

export async function checkPermissions(): Promise<{
  callLog: boolean;
  sms: boolean;
  contacts: boolean;
}> {
  if (Platform.OS !== 'android') {
    return { callLog: false, sms: false, contacts: false };
  }

  const callLog = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.READ_CALL_LOG
  );
  const sms = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.READ_SMS
  );
  const contacts = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.READ_CONTACTS
  );

  return { callLog, sms, contacts };
}

// ═══════════════════════════════════════════════════════════════════════════
//                              CALL LOG COLLECTOR
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 통화 기록 수집
 * 
 * Android ContentResolver 사용
 */
export async function getCallLogs(days: number = 90): Promise<CallLogEntry[]> {
  // Native Module 호출 (별도 구현 필요)
  // 여기서는 인터페이스만 정의
  
  const cutoffMs = Date.now() - days * 24 * 60 * 60 * 1000;
  
  try {
    // TODO: NativeModules.CallLogModule.query() 구현
    // const rawLogs = await NativeModules.CallLogModule.query(cutoffMs);
    
    // 목업 데이터 (테스트용)
    const mockLogs: CallLogEntry[] = [
      {
        id: '1',
        phone: '010-1234-5678',
        name: '김철수',
        duration: 180,
        type: 'outgoing',
        timestamp: Date.now() - 1000 * 60 * 60,
      },
      {
        id: '2',
        phone: '010-2345-6789',
        name: '이영희',
        duration: 600,
        type: 'incoming',
        timestamp: Date.now() - 1000 * 60 * 60 * 24,
      },
    ];
    
    return mockLogs;
  } catch (error) {
    console.error('Failed to get call logs:', error);
    return [];
  }
}

/**
 * 통화 기록 분석
 */
export function analyzeCallLogs(logs: CallLogEntry[]): {
  byPhone: Map<string, { totalDuration: number; callCount: number }>;
  totalMinutes: number;
  longCallsCount: number;
} {
  const byPhone = new Map<string, { totalDuration: number; callCount: number }>();
  let totalMinutes = 0;
  let longCallsCount = 0;

  for (const log of logs) {
    const existing = byPhone.get(log.phone) || { totalDuration: 0, callCount: 0 };
    existing.totalDuration += log.duration;
    existing.callCount += 1;
    byPhone.set(log.phone, existing);

    totalMinutes += log.duration / 60;
    if (log.duration >= 300) { // 5분 이상
      longCallsCount += 1;
    }
  }

  return { byPhone, totalMinutes, longCallsCount };
}

// ═══════════════════════════════════════════════════════════════════════════
//                              SMS COLLECTOR
// ═══════════════════════════════════════════════════════════════════════════

/**
 * SMS 수집
 */
export async function getSmsMessages(days: number = 90): Promise<SmsEntry[]> {
  const cutoffMs = Date.now() - days * 24 * 60 * 60 * 1000;
  
  try {
    // TODO: NativeModules.SmsModule.query() 구현
    
    // 목업 데이터 (테스트용)
    const mockSms: SmsEntry[] = [
      {
        id: '1',
        phone: '15990000',
        body: '[국민은행] 입금 500,000원 잔액 1,200,000원',
        type: 'inbox',
        timestamp: Date.now() - 1000 * 60 * 60,
      },
      {
        id: '2',
        phone: '15990000',
        body: '[신한카드] 결제승인 300,000원',
        type: 'inbox',
        timestamp: Date.now() - 1000 * 60 * 60 * 24,
      },
    ];
    
    return mockSms;
  } catch (error) {
    console.error('Failed to get SMS:', error);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//                              PAYMENT PARSER
// ═══════════════════════════════════════════════════════════════════════════

// 결제 알림 패턴
const PAYMENT_PATTERNS = {
  bank: [
    /\[([가-힣]+은행)\]\s*입금\s*([\d,]+)원/,
    /\[([가-힣]+뱅크)\]\s*입금\s*([\d,]+)원/,
  ],
  card: [
    /\[([가-힣]+카드)\]\s*결제승인\s*([\d,]+)원/,
    /\[([가-힣]+카드)\]\s*승인\s*([\d,]+)원/,
  ],
  simple_pay: [
    /\[카카오페이\]\s*입금\s*([\d,]+)원/,
    /\[네이버페이\]\s*입금\s*([\d,]+)원/,
    /\[토스\]\s*입금\s*([\d,]+)원/,
  ],
};

// 제외 패턴
const EXCLUDE_PATTERNS = [/환불/, /취소/, /반품/, /출금/, /이체/];

/**
 * SMS에서 결제 금액 파싱
 */
export function parsePaymentFromSms(sms: SmsEntry): ParsedPayment | null {
  // 제외 패턴 체크
  for (const pattern of EXCLUDE_PATTERNS) {
    if (pattern.test(sms.body)) {
      return null;
    }
  }

  // 은행 입금
  for (const pattern of PAYMENT_PATTERNS.bank) {
    const match = sms.body.match(pattern);
    if (match) {
      const amountStr = match[2] || match[1];
      const amount = parseFloat(amountStr.replace(/,/g, ''));
      return {
        phone: sms.phone,
        amount,
        source: 'bank',
        timestamp: sms.timestamp,
      };
    }
  }

  // 카드 결제
  for (const pattern of PAYMENT_PATTERNS.card) {
    const match = sms.body.match(pattern);
    if (match) {
      const amount = parseFloat(match[2].replace(/,/g, ''));
      return {
        phone: sms.phone,
        amount,
        source: 'card',
        timestamp: sms.timestamp,
      };
    }
  }

  // 간편결제
  for (const pattern of PAYMENT_PATTERNS.simple_pay) {
    const match = sms.body.match(pattern);
    if (match) {
      const amount = parseFloat(match[1].replace(/,/g, ''));
      return {
        phone: sms.phone,
        amount,
        source: 'simple_pay',
        timestamp: sms.timestamp,
      };
    }
  }

  return null;
}

/**
 * SMS 배치에서 결제 내역 추출
 */
export function extractPayments(smsList: SmsEntry[]): ParsedPayment[] {
  const payments: ParsedPayment[] = [];
  
  for (const sms of smsList) {
    const payment = parsePaymentFromSms(sms);
    if (payment) {
      payments.push(payment);
    }
  }
  
  return payments;
}

/**
 * 전화번호별 총 입금액 집계
 */
export function aggregatePaymentsByPhone(
  payments: ParsedPayment[]
): Map<string, number> {
  const totals = new Map<string, number>();
  
  // 참고: 결제 알림의 phone은 은행/카드사 번호
  // 실제로는 학부모 전화번호와 매칭 필요
  
  for (const payment of payments) {
    const existing = totals.get(payment.phone) || 0;
    totals.set(payment.phone, existing + payment.amount);
  }
  
  return totals;
}

// ═══════════════════════════════════════════════════════════════════════════
//                              MAIN COLLECTOR
// ═══════════════════════════════════════════════════════════════════════════

export interface CollectionResult {
  callLogs: CallLogEntry[];
  smsMessages: SmsEntry[];
  payments: ParsedPayment[];
  callAnalysis: ReturnType<typeof analyzeCallLogs>;
  totalPaymentAmount: number;
  collectedAt: number;
}

/**
 * 전체 데이터 수집
 */
export async function collectAllData(days: number = 90): Promise<CollectionResult> {
  // 권한 체크
  const permissions = await checkPermissions();
  
  if (!permissions.callLog || !permissions.sms) {
    throw new Error('Required permissions not granted');
  }
  
  // 데이터 수집
  const callLogs = await getCallLogs(days);
  const smsMessages = await getSmsMessages(days);
  
  // 분석
  const callAnalysis = analyzeCallLogs(callLogs);
  const payments = extractPayments(smsMessages);
  const totalPaymentAmount = payments.reduce((sum, p) => sum + p.amount, 0);
  
  return {
    callLogs,
    smsMessages,
    payments,
    callAnalysis,
    totalPaymentAmount,
    collectedAt: Date.now(),
  };
}










/**
 * AUTUS Local Agent - Data Collector Service
 * ============================================
 * 
 * Android 기기에서 데이터 수집
 * 
 * 권한 필요:
 * - READ_CALL_LOG: 통화 기록
 * - READ_SMS: SMS 메시지
 * - READ_CONTACTS: 연락처 (선택)
 * 
 * Zero-Server-Cost: 모든 데이터는 로컬에만 저장
 */

import { NativeModules, PermissionsAndroid, Platform } from 'react-native';

// ═══════════════════════════════════════════════════════════════════════════
//                              TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface CallLogEntry {
  id: string;
  phone: string;
  name: string | null;
  duration: number;  // seconds
  type: 'incoming' | 'outgoing' | 'missed';
  timestamp: number; // ms
}

export interface SmsEntry {
  id: string;
  phone: string;
  body: string;
  type: 'inbox' | 'sent';
  timestamp: number; // ms
}

export interface ParsedPayment {
  phone: string;
  amount: number;
  source: 'bank' | 'card' | 'simple_pay';
  timestamp: number;
}

// ═══════════════════════════════════════════════════════════════════════════
//                              PERMISSIONS
// ═══════════════════════════════════════════════════════════════════════════

export async function requestPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    console.warn('Permissions only available on Android');
    return false;
  }

  try {
    const grants = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
      PermissionsAndroid.PERMISSIONS.READ_SMS,
      PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
    ]);

    const allGranted = Object.values(grants).every(
      (status) => status === PermissionsAndroid.RESULTS.GRANTED
    );

    return allGranted;
  } catch (error) {
    console.error('Permission request failed:', error);
    return false;
  }
}

export async function checkPermissions(): Promise<{
  callLog: boolean;
  sms: boolean;
  contacts: boolean;
}> {
  if (Platform.OS !== 'android') {
    return { callLog: false, sms: false, contacts: false };
  }

  const callLog = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.READ_CALL_LOG
  );
  const sms = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.READ_SMS
  );
  const contacts = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.READ_CONTACTS
  );

  return { callLog, sms, contacts };
}

// ═══════════════════════════════════════════════════════════════════════════
//                              CALL LOG COLLECTOR
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 통화 기록 수집
 * 
 * Android ContentResolver 사용
 */
export async function getCallLogs(days: number = 90): Promise<CallLogEntry[]> {
  // Native Module 호출 (별도 구현 필요)
  // 여기서는 인터페이스만 정의
  
  const cutoffMs = Date.now() - days * 24 * 60 * 60 * 1000;
  
  try {
    // TODO: NativeModules.CallLogModule.query() 구현
    // const rawLogs = await NativeModules.CallLogModule.query(cutoffMs);
    
    // 목업 데이터 (테스트용)
    const mockLogs: CallLogEntry[] = [
      {
        id: '1',
        phone: '010-1234-5678',
        name: '김철수',
        duration: 180,
        type: 'outgoing',
        timestamp: Date.now() - 1000 * 60 * 60,
      },
      {
        id: '2',
        phone: '010-2345-6789',
        name: '이영희',
        duration: 600,
        type: 'incoming',
        timestamp: Date.now() - 1000 * 60 * 60 * 24,
      },
    ];
    
    return mockLogs;
  } catch (error) {
    console.error('Failed to get call logs:', error);
    return [];
  }
}

/**
 * 통화 기록 분석
 */
export function analyzeCallLogs(logs: CallLogEntry[]): {
  byPhone: Map<string, { totalDuration: number; callCount: number }>;
  totalMinutes: number;
  longCallsCount: number;
} {
  const byPhone = new Map<string, { totalDuration: number; callCount: number }>();
  let totalMinutes = 0;
  let longCallsCount = 0;

  for (const log of logs) {
    const existing = byPhone.get(log.phone) || { totalDuration: 0, callCount: 0 };
    existing.totalDuration += log.duration;
    existing.callCount += 1;
    byPhone.set(log.phone, existing);

    totalMinutes += log.duration / 60;
    if (log.duration >= 300) { // 5분 이상
      longCallsCount += 1;
    }
  }

  return { byPhone, totalMinutes, longCallsCount };
}

// ═══════════════════════════════════════════════════════════════════════════
//                              SMS COLLECTOR
// ═══════════════════════════════════════════════════════════════════════════

/**
 * SMS 수집
 */
export async function getSmsMessages(days: number = 90): Promise<SmsEntry[]> {
  const cutoffMs = Date.now() - days * 24 * 60 * 60 * 1000;
  
  try {
    // TODO: NativeModules.SmsModule.query() 구현
    
    // 목업 데이터 (테스트용)
    const mockSms: SmsEntry[] = [
      {
        id: '1',
        phone: '15990000',
        body: '[국민은행] 입금 500,000원 잔액 1,200,000원',
        type: 'inbox',
        timestamp: Date.now() - 1000 * 60 * 60,
      },
      {
        id: '2',
        phone: '15990000',
        body: '[신한카드] 결제승인 300,000원',
        type: 'inbox',
        timestamp: Date.now() - 1000 * 60 * 60 * 24,
      },
    ];
    
    return mockSms;
  } catch (error) {
    console.error('Failed to get SMS:', error);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//                              PAYMENT PARSER
// ═══════════════════════════════════════════════════════════════════════════

// 결제 알림 패턴
const PAYMENT_PATTERNS = {
  bank: [
    /\[([가-힣]+은행)\]\s*입금\s*([\d,]+)원/,
    /\[([가-힣]+뱅크)\]\s*입금\s*([\d,]+)원/,
  ],
  card: [
    /\[([가-힣]+카드)\]\s*결제승인\s*([\d,]+)원/,
    /\[([가-힣]+카드)\]\s*승인\s*([\d,]+)원/,
  ],
  simple_pay: [
    /\[카카오페이\]\s*입금\s*([\d,]+)원/,
    /\[네이버페이\]\s*입금\s*([\d,]+)원/,
    /\[토스\]\s*입금\s*([\d,]+)원/,
  ],
};

// 제외 패턴
const EXCLUDE_PATTERNS = [/환불/, /취소/, /반품/, /출금/, /이체/];

/**
 * SMS에서 결제 금액 파싱
 */
export function parsePaymentFromSms(sms: SmsEntry): ParsedPayment | null {
  // 제외 패턴 체크
  for (const pattern of EXCLUDE_PATTERNS) {
    if (pattern.test(sms.body)) {
      return null;
    }
  }

  // 은행 입금
  for (const pattern of PAYMENT_PATTERNS.bank) {
    const match = sms.body.match(pattern);
    if (match) {
      const amountStr = match[2] || match[1];
      const amount = parseFloat(amountStr.replace(/,/g, ''));
      return {
        phone: sms.phone,
        amount,
        source: 'bank',
        timestamp: sms.timestamp,
      };
    }
  }

  // 카드 결제
  for (const pattern of PAYMENT_PATTERNS.card) {
    const match = sms.body.match(pattern);
    if (match) {
      const amount = parseFloat(match[2].replace(/,/g, ''));
      return {
        phone: sms.phone,
        amount,
        source: 'card',
        timestamp: sms.timestamp,
      };
    }
  }

  // 간편결제
  for (const pattern of PAYMENT_PATTERNS.simple_pay) {
    const match = sms.body.match(pattern);
    if (match) {
      const amount = parseFloat(match[1].replace(/,/g, ''));
      return {
        phone: sms.phone,
        amount,
        source: 'simple_pay',
        timestamp: sms.timestamp,
      };
    }
  }

  return null;
}

/**
 * SMS 배치에서 결제 내역 추출
 */
export function extractPayments(smsList: SmsEntry[]): ParsedPayment[] {
  const payments: ParsedPayment[] = [];
  
  for (const sms of smsList) {
    const payment = parsePaymentFromSms(sms);
    if (payment) {
      payments.push(payment);
    }
  }
  
  return payments;
}

/**
 * 전화번호별 총 입금액 집계
 */
export function aggregatePaymentsByPhone(
  payments: ParsedPayment[]
): Map<string, number> {
  const totals = new Map<string, number>();
  
  // 참고: 결제 알림의 phone은 은행/카드사 번호
  // 실제로는 학부모 전화번호와 매칭 필요
  
  for (const payment of payments) {
    const existing = totals.get(payment.phone) || 0;
    totals.set(payment.phone, existing + payment.amount);
  }
  
  return totals;
}

// ═══════════════════════════════════════════════════════════════════════════
//                              MAIN COLLECTOR
// ═══════════════════════════════════════════════════════════════════════════

export interface CollectionResult {
  callLogs: CallLogEntry[];
  smsMessages: SmsEntry[];
  payments: ParsedPayment[];
  callAnalysis: ReturnType<typeof analyzeCallLogs>;
  totalPaymentAmount: number;
  collectedAt: number;
}

/**
 * 전체 데이터 수집
 */
export async function collectAllData(days: number = 90): Promise<CollectionResult> {
  // 권한 체크
  const permissions = await checkPermissions();
  
  if (!permissions.callLog || !permissions.sms) {
    throw new Error('Required permissions not granted');
  }
  
  // 데이터 수집
  const callLogs = await getCallLogs(days);
  const smsMessages = await getSmsMessages(days);
  
  // 분석
  const callAnalysis = analyzeCallLogs(callLogs);
  const payments = extractPayments(smsMessages);
  const totalPaymentAmount = payments.reduce((sum, p) => sum + p.amount, 0);
  
  return {
    callLogs,
    smsMessages,
    payments,
    callAnalysis,
    totalPaymentAmount,
    collectedAt: Date.now(),
  };
}




















/**
 * AUTUS Local Agent - Data Collector Service
 * ============================================
 * 
 * Android 기기에서 데이터 수집
 * 
 * 권한 필요:
 * - READ_CALL_LOG: 통화 기록
 * - READ_SMS: SMS 메시지
 * - READ_CONTACTS: 연락처 (선택)
 * 
 * Zero-Server-Cost: 모든 데이터는 로컬에만 저장
 */

import { NativeModules, PermissionsAndroid, Platform } from 'react-native';

// ═══════════════════════════════════════════════════════════════════════════
//                              TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface CallLogEntry {
  id: string;
  phone: string;
  name: string | null;
  duration: number;  // seconds
  type: 'incoming' | 'outgoing' | 'missed';
  timestamp: number; // ms
}

export interface SmsEntry {
  id: string;
  phone: string;
  body: string;
  type: 'inbox' | 'sent';
  timestamp: number; // ms
}

export interface ParsedPayment {
  phone: string;
  amount: number;
  source: 'bank' | 'card' | 'simple_pay';
  timestamp: number;
}

// ═══════════════════════════════════════════════════════════════════════════
//                              PERMISSIONS
// ═══════════════════════════════════════════════════════════════════════════

export async function requestPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    console.warn('Permissions only available on Android');
    return false;
  }

  try {
    const grants = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
      PermissionsAndroid.PERMISSIONS.READ_SMS,
      PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
    ]);

    const allGranted = Object.values(grants).every(
      (status) => status === PermissionsAndroid.RESULTS.GRANTED
    );

    return allGranted;
  } catch (error) {
    console.error('Permission request failed:', error);
    return false;
  }
}

export async function checkPermissions(): Promise<{
  callLog: boolean;
  sms: boolean;
  contacts: boolean;
}> {
  if (Platform.OS !== 'android') {
    return { callLog: false, sms: false, contacts: false };
  }

  const callLog = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.READ_CALL_LOG
  );
  const sms = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.READ_SMS
  );
  const contacts = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.READ_CONTACTS
  );

  return { callLog, sms, contacts };
}

// ═══════════════════════════════════════════════════════════════════════════
//                              CALL LOG COLLECTOR
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 통화 기록 수집
 * 
 * Android ContentResolver 사용
 */
export async function getCallLogs(days: number = 90): Promise<CallLogEntry[]> {
  // Native Module 호출 (별도 구현 필요)
  // 여기서는 인터페이스만 정의
  
  const cutoffMs = Date.now() - days * 24 * 60 * 60 * 1000;
  
  try {
    // TODO: NativeModules.CallLogModule.query() 구현
    // const rawLogs = await NativeModules.CallLogModule.query(cutoffMs);
    
    // 목업 데이터 (테스트용)
    const mockLogs: CallLogEntry[] = [
      {
        id: '1',
        phone: '010-1234-5678',
        name: '김철수',
        duration: 180,
        type: 'outgoing',
        timestamp: Date.now() - 1000 * 60 * 60,
      },
      {
        id: '2',
        phone: '010-2345-6789',
        name: '이영희',
        duration: 600,
        type: 'incoming',
        timestamp: Date.now() - 1000 * 60 * 60 * 24,
      },
    ];
    
    return mockLogs;
  } catch (error) {
    console.error('Failed to get call logs:', error);
    return [];
  }
}

/**
 * 통화 기록 분석
 */
export function analyzeCallLogs(logs: CallLogEntry[]): {
  byPhone: Map<string, { totalDuration: number; callCount: number }>;
  totalMinutes: number;
  longCallsCount: number;
} {
  const byPhone = new Map<string, { totalDuration: number; callCount: number }>();
  let totalMinutes = 0;
  let longCallsCount = 0;

  for (const log of logs) {
    const existing = byPhone.get(log.phone) || { totalDuration: 0, callCount: 0 };
    existing.totalDuration += log.duration;
    existing.callCount += 1;
    byPhone.set(log.phone, existing);

    totalMinutes += log.duration / 60;
    if (log.duration >= 300) { // 5분 이상
      longCallsCount += 1;
    }
  }

  return { byPhone, totalMinutes, longCallsCount };
}

// ═══════════════════════════════════════════════════════════════════════════
//                              SMS COLLECTOR
// ═══════════════════════════════════════════════════════════════════════════

/**
 * SMS 수집
 */
export async function getSmsMessages(days: number = 90): Promise<SmsEntry[]> {
  const cutoffMs = Date.now() - days * 24 * 60 * 60 * 1000;
  
  try {
    // TODO: NativeModules.SmsModule.query() 구현
    
    // 목업 데이터 (테스트용)
    const mockSms: SmsEntry[] = [
      {
        id: '1',
        phone: '15990000',
        body: '[국민은행] 입금 500,000원 잔액 1,200,000원',
        type: 'inbox',
        timestamp: Date.now() - 1000 * 60 * 60,
      },
      {
        id: '2',
        phone: '15990000',
        body: '[신한카드] 결제승인 300,000원',
        type: 'inbox',
        timestamp: Date.now() - 1000 * 60 * 60 * 24,
      },
    ];
    
    return mockSms;
  } catch (error) {
    console.error('Failed to get SMS:', error);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//                              PAYMENT PARSER
// ═══════════════════════════════════════════════════════════════════════════

// 결제 알림 패턴
const PAYMENT_PATTERNS = {
  bank: [
    /\[([가-힣]+은행)\]\s*입금\s*([\d,]+)원/,
    /\[([가-힣]+뱅크)\]\s*입금\s*([\d,]+)원/,
  ],
  card: [
    /\[([가-힣]+카드)\]\s*결제승인\s*([\d,]+)원/,
    /\[([가-힣]+카드)\]\s*승인\s*([\d,]+)원/,
  ],
  simple_pay: [
    /\[카카오페이\]\s*입금\s*([\d,]+)원/,
    /\[네이버페이\]\s*입금\s*([\d,]+)원/,
    /\[토스\]\s*입금\s*([\d,]+)원/,
  ],
};

// 제외 패턴
const EXCLUDE_PATTERNS = [/환불/, /취소/, /반품/, /출금/, /이체/];

/**
 * SMS에서 결제 금액 파싱
 */
export function parsePaymentFromSms(sms: SmsEntry): ParsedPayment | null {
  // 제외 패턴 체크
  for (const pattern of EXCLUDE_PATTERNS) {
    if (pattern.test(sms.body)) {
      return null;
    }
  }

  // 은행 입금
  for (const pattern of PAYMENT_PATTERNS.bank) {
    const match = sms.body.match(pattern);
    if (match) {
      const amountStr = match[2] || match[1];
      const amount = parseFloat(amountStr.replace(/,/g, ''));
      return {
        phone: sms.phone,
        amount,
        source: 'bank',
        timestamp: sms.timestamp,
      };
    }
  }

  // 카드 결제
  for (const pattern of PAYMENT_PATTERNS.card) {
    const match = sms.body.match(pattern);
    if (match) {
      const amount = parseFloat(match[2].replace(/,/g, ''));
      return {
        phone: sms.phone,
        amount,
        source: 'card',
        timestamp: sms.timestamp,
      };
    }
  }

  // 간편결제
  for (const pattern of PAYMENT_PATTERNS.simple_pay) {
    const match = sms.body.match(pattern);
    if (match) {
      const amount = parseFloat(match[1].replace(/,/g, ''));
      return {
        phone: sms.phone,
        amount,
        source: 'simple_pay',
        timestamp: sms.timestamp,
      };
    }
  }

  return null;
}

/**
 * SMS 배치에서 결제 내역 추출
 */
export function extractPayments(smsList: SmsEntry[]): ParsedPayment[] {
  const payments: ParsedPayment[] = [];
  
  for (const sms of smsList) {
    const payment = parsePaymentFromSms(sms);
    if (payment) {
      payments.push(payment);
    }
  }
  
  return payments;
}

/**
 * 전화번호별 총 입금액 집계
 */
export function aggregatePaymentsByPhone(
  payments: ParsedPayment[]
): Map<string, number> {
  const totals = new Map<string, number>();
  
  // 참고: 결제 알림의 phone은 은행/카드사 번호
  // 실제로는 학부모 전화번호와 매칭 필요
  
  for (const payment of payments) {
    const existing = totals.get(payment.phone) || 0;
    totals.set(payment.phone, existing + payment.amount);
  }
  
  return totals;
}

// ═══════════════════════════════════════════════════════════════════════════
//                              MAIN COLLECTOR
// ═══════════════════════════════════════════════════════════════════════════

export interface CollectionResult {
  callLogs: CallLogEntry[];
  smsMessages: SmsEntry[];
  payments: ParsedPayment[];
  callAnalysis: ReturnType<typeof analyzeCallLogs>;
  totalPaymentAmount: number;
  collectedAt: number;
}

/**
 * 전체 데이터 수집
 */
export async function collectAllData(days: number = 90): Promise<CollectionResult> {
  // 권한 체크
  const permissions = await checkPermissions();
  
  if (!permissions.callLog || !permissions.sms) {
    throw new Error('Required permissions not granted');
  }
  
  // 데이터 수집
  const callLogs = await getCallLogs(days);
  const smsMessages = await getSmsMessages(days);
  
  // 분석
  const callAnalysis = analyzeCallLogs(callLogs);
  const payments = extractPayments(smsMessages);
  const totalPaymentAmount = payments.reduce((sum, p) => sum + p.amount, 0);
  
  return {
    callLogs,
    smsMessages,
    payments,
    callAnalysis,
    totalPaymentAmount,
    collectedAt: Date.now(),
  };
}










/**
 * AUTUS Local Agent - Data Collector Service
 * ============================================
 * 
 * Android 기기에서 데이터 수집
 * 
 * 권한 필요:
 * - READ_CALL_LOG: 통화 기록
 * - READ_SMS: SMS 메시지
 * - READ_CONTACTS: 연락처 (선택)
 * 
 * Zero-Server-Cost: 모든 데이터는 로컬에만 저장
 */

import { NativeModules, PermissionsAndroid, Platform } from 'react-native';

// ═══════════════════════════════════════════════════════════════════════════
//                              TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface CallLogEntry {
  id: string;
  phone: string;
  name: string | null;
  duration: number;  // seconds
  type: 'incoming' | 'outgoing' | 'missed';
  timestamp: number; // ms
}

export interface SmsEntry {
  id: string;
  phone: string;
  body: string;
  type: 'inbox' | 'sent';
  timestamp: number; // ms
}

export interface ParsedPayment {
  phone: string;
  amount: number;
  source: 'bank' | 'card' | 'simple_pay';
  timestamp: number;
}

// ═══════════════════════════════════════════════════════════════════════════
//                              PERMISSIONS
// ═══════════════════════════════════════════════════════════════════════════

export async function requestPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    console.warn('Permissions only available on Android');
    return false;
  }

  try {
    const grants = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
      PermissionsAndroid.PERMISSIONS.READ_SMS,
      PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
    ]);

    const allGranted = Object.values(grants).every(
      (status) => status === PermissionsAndroid.RESULTS.GRANTED
    );

    return allGranted;
  } catch (error) {
    console.error('Permission request failed:', error);
    return false;
  }
}

export async function checkPermissions(): Promise<{
  callLog: boolean;
  sms: boolean;
  contacts: boolean;
}> {
  if (Platform.OS !== 'android') {
    return { callLog: false, sms: false, contacts: false };
  }

  const callLog = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.READ_CALL_LOG
  );
  const sms = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.READ_SMS
  );
  const contacts = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.READ_CONTACTS
  );

  return { callLog, sms, contacts };
}

// ═══════════════════════════════════════════════════════════════════════════
//                              CALL LOG COLLECTOR
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 통화 기록 수집
 * 
 * Android ContentResolver 사용
 */
export async function getCallLogs(days: number = 90): Promise<CallLogEntry[]> {
  // Native Module 호출 (별도 구현 필요)
  // 여기서는 인터페이스만 정의
  
  const cutoffMs = Date.now() - days * 24 * 60 * 60 * 1000;
  
  try {
    // TODO: NativeModules.CallLogModule.query() 구현
    // const rawLogs = await NativeModules.CallLogModule.query(cutoffMs);
    
    // 목업 데이터 (테스트용)
    const mockLogs: CallLogEntry[] = [
      {
        id: '1',
        phone: '010-1234-5678',
        name: '김철수',
        duration: 180,
        type: 'outgoing',
        timestamp: Date.now() - 1000 * 60 * 60,
      },
      {
        id: '2',
        phone: '010-2345-6789',
        name: '이영희',
        duration: 600,
        type: 'incoming',
        timestamp: Date.now() - 1000 * 60 * 60 * 24,
      },
    ];
    
    return mockLogs;
  } catch (error) {
    console.error('Failed to get call logs:', error);
    return [];
  }
}

/**
 * 통화 기록 분석
 */
export function analyzeCallLogs(logs: CallLogEntry[]): {
  byPhone: Map<string, { totalDuration: number; callCount: number }>;
  totalMinutes: number;
  longCallsCount: number;
} {
  const byPhone = new Map<string, { totalDuration: number; callCount: number }>();
  let totalMinutes = 0;
  let longCallsCount = 0;

  for (const log of logs) {
    const existing = byPhone.get(log.phone) || { totalDuration: 0, callCount: 0 };
    existing.totalDuration += log.duration;
    existing.callCount += 1;
    byPhone.set(log.phone, existing);

    totalMinutes += log.duration / 60;
    if (log.duration >= 300) { // 5분 이상
      longCallsCount += 1;
    }
  }

  return { byPhone, totalMinutes, longCallsCount };
}

// ═══════════════════════════════════════════════════════════════════════════
//                              SMS COLLECTOR
// ═══════════════════════════════════════════════════════════════════════════

/**
 * SMS 수집
 */
export async function getSmsMessages(days: number = 90): Promise<SmsEntry[]> {
  const cutoffMs = Date.now() - days * 24 * 60 * 60 * 1000;
  
  try {
    // TODO: NativeModules.SmsModule.query() 구현
    
    // 목업 데이터 (테스트용)
    const mockSms: SmsEntry[] = [
      {
        id: '1',
        phone: '15990000',
        body: '[국민은행] 입금 500,000원 잔액 1,200,000원',
        type: 'inbox',
        timestamp: Date.now() - 1000 * 60 * 60,
      },
      {
        id: '2',
        phone: '15990000',
        body: '[신한카드] 결제승인 300,000원',
        type: 'inbox',
        timestamp: Date.now() - 1000 * 60 * 60 * 24,
      },
    ];
    
    return mockSms;
  } catch (error) {
    console.error('Failed to get SMS:', error);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//                              PAYMENT PARSER
// ═══════════════════════════════════════════════════════════════════════════

// 결제 알림 패턴
const PAYMENT_PATTERNS = {
  bank: [
    /\[([가-힣]+은행)\]\s*입금\s*([\d,]+)원/,
    /\[([가-힣]+뱅크)\]\s*입금\s*([\d,]+)원/,
  ],
  card: [
    /\[([가-힣]+카드)\]\s*결제승인\s*([\d,]+)원/,
    /\[([가-힣]+카드)\]\s*승인\s*([\d,]+)원/,
  ],
  simple_pay: [
    /\[카카오페이\]\s*입금\s*([\d,]+)원/,
    /\[네이버페이\]\s*입금\s*([\d,]+)원/,
    /\[토스\]\s*입금\s*([\d,]+)원/,
  ],
};

// 제외 패턴
const EXCLUDE_PATTERNS = [/환불/, /취소/, /반품/, /출금/, /이체/];

/**
 * SMS에서 결제 금액 파싱
 */
export function parsePaymentFromSms(sms: SmsEntry): ParsedPayment | null {
  // 제외 패턴 체크
  for (const pattern of EXCLUDE_PATTERNS) {
    if (pattern.test(sms.body)) {
      return null;
    }
  }

  // 은행 입금
  for (const pattern of PAYMENT_PATTERNS.bank) {
    const match = sms.body.match(pattern);
    if (match) {
      const amountStr = match[2] || match[1];
      const amount = parseFloat(amountStr.replace(/,/g, ''));
      return {
        phone: sms.phone,
        amount,
        source: 'bank',
        timestamp: sms.timestamp,
      };
    }
  }

  // 카드 결제
  for (const pattern of PAYMENT_PATTERNS.card) {
    const match = sms.body.match(pattern);
    if (match) {
      const amount = parseFloat(match[2].replace(/,/g, ''));
      return {
        phone: sms.phone,
        amount,
        source: 'card',
        timestamp: sms.timestamp,
      };
    }
  }

  // 간편결제
  for (const pattern of PAYMENT_PATTERNS.simple_pay) {
    const match = sms.body.match(pattern);
    if (match) {
      const amount = parseFloat(match[1].replace(/,/g, ''));
      return {
        phone: sms.phone,
        amount,
        source: 'simple_pay',
        timestamp: sms.timestamp,
      };
    }
  }

  return null;
}

/**
 * SMS 배치에서 결제 내역 추출
 */
export function extractPayments(smsList: SmsEntry[]): ParsedPayment[] {
  const payments: ParsedPayment[] = [];
  
  for (const sms of smsList) {
    const payment = parsePaymentFromSms(sms);
    if (payment) {
      payments.push(payment);
    }
  }
  
  return payments;
}

/**
 * 전화번호별 총 입금액 집계
 */
export function aggregatePaymentsByPhone(
  payments: ParsedPayment[]
): Map<string, number> {
  const totals = new Map<string, number>();
  
  // 참고: 결제 알림의 phone은 은행/카드사 번호
  // 실제로는 학부모 전화번호와 매칭 필요
  
  for (const payment of payments) {
    const existing = totals.get(payment.phone) || 0;
    totals.set(payment.phone, existing + payment.amount);
  }
  
  return totals;
}

// ═══════════════════════════════════════════════════════════════════════════
//                              MAIN COLLECTOR
// ═══════════════════════════════════════════════════════════════════════════

export interface CollectionResult {
  callLogs: CallLogEntry[];
  smsMessages: SmsEntry[];
  payments: ParsedPayment[];
  callAnalysis: ReturnType<typeof analyzeCallLogs>;
  totalPaymentAmount: number;
  collectedAt: number;
}

/**
 * 전체 데이터 수집
 */
export async function collectAllData(days: number = 90): Promise<CollectionResult> {
  // 권한 체크
  const permissions = await checkPermissions();
  
  if (!permissions.callLog || !permissions.sms) {
    throw new Error('Required permissions not granted');
  }
  
  // 데이터 수집
  const callLogs = await getCallLogs(days);
  const smsMessages = await getSmsMessages(days);
  
  // 분석
  const callAnalysis = analyzeCallLogs(callLogs);
  const payments = extractPayments(smsMessages);
  const totalPaymentAmount = payments.reduce((sum, p) => sum + p.amount, 0);
  
  return {
    callLogs,
    smsMessages,
    payments,
    callAnalysis,
    totalPaymentAmount,
    collectedAt: Date.now(),
  };
}










/**
 * AUTUS Local Agent - Data Collector Service
 * ============================================
 * 
 * Android 기기에서 데이터 수집
 * 
 * 권한 필요:
 * - READ_CALL_LOG: 통화 기록
 * - READ_SMS: SMS 메시지
 * - READ_CONTACTS: 연락처 (선택)
 * 
 * Zero-Server-Cost: 모든 데이터는 로컬에만 저장
 */

import { NativeModules, PermissionsAndroid, Platform } from 'react-native';

// ═══════════════════════════════════════════════════════════════════════════
//                              TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface CallLogEntry {
  id: string;
  phone: string;
  name: string | null;
  duration: number;  // seconds
  type: 'incoming' | 'outgoing' | 'missed';
  timestamp: number; // ms
}

export interface SmsEntry {
  id: string;
  phone: string;
  body: string;
  type: 'inbox' | 'sent';
  timestamp: number; // ms
}

export interface ParsedPayment {
  phone: string;
  amount: number;
  source: 'bank' | 'card' | 'simple_pay';
  timestamp: number;
}

// ═══════════════════════════════════════════════════════════════════════════
//                              PERMISSIONS
// ═══════════════════════════════════════════════════════════════════════════

export async function requestPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    console.warn('Permissions only available on Android');
    return false;
  }

  try {
    const grants = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
      PermissionsAndroid.PERMISSIONS.READ_SMS,
      PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
    ]);

    const allGranted = Object.values(grants).every(
      (status) => status === PermissionsAndroid.RESULTS.GRANTED
    );

    return allGranted;
  } catch (error) {
    console.error('Permission request failed:', error);
    return false;
  }
}

export async function checkPermissions(): Promise<{
  callLog: boolean;
  sms: boolean;
  contacts: boolean;
}> {
  if (Platform.OS !== 'android') {
    return { callLog: false, sms: false, contacts: false };
  }

  const callLog = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.READ_CALL_LOG
  );
  const sms = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.READ_SMS
  );
  const contacts = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.READ_CONTACTS
  );

  return { callLog, sms, contacts };
}

// ═══════════════════════════════════════════════════════════════════════════
//                              CALL LOG COLLECTOR
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 통화 기록 수집
 * 
 * Android ContentResolver 사용
 */
export async function getCallLogs(days: number = 90): Promise<CallLogEntry[]> {
  // Native Module 호출 (별도 구현 필요)
  // 여기서는 인터페이스만 정의
  
  const cutoffMs = Date.now() - days * 24 * 60 * 60 * 1000;
  
  try {
    // TODO: NativeModules.CallLogModule.query() 구현
    // const rawLogs = await NativeModules.CallLogModule.query(cutoffMs);
    
    // 목업 데이터 (테스트용)
    const mockLogs: CallLogEntry[] = [
      {
        id: '1',
        phone: '010-1234-5678',
        name: '김철수',
        duration: 180,
        type: 'outgoing',
        timestamp: Date.now() - 1000 * 60 * 60,
      },
      {
        id: '2',
        phone: '010-2345-6789',
        name: '이영희',
        duration: 600,
        type: 'incoming',
        timestamp: Date.now() - 1000 * 60 * 60 * 24,
      },
    ];
    
    return mockLogs;
  } catch (error) {
    console.error('Failed to get call logs:', error);
    return [];
  }
}

/**
 * 통화 기록 분석
 */
export function analyzeCallLogs(logs: CallLogEntry[]): {
  byPhone: Map<string, { totalDuration: number; callCount: number }>;
  totalMinutes: number;
  longCallsCount: number;
} {
  const byPhone = new Map<string, { totalDuration: number; callCount: number }>();
  let totalMinutes = 0;
  let longCallsCount = 0;

  for (const log of logs) {
    const existing = byPhone.get(log.phone) || { totalDuration: 0, callCount: 0 };
    existing.totalDuration += log.duration;
    existing.callCount += 1;
    byPhone.set(log.phone, existing);

    totalMinutes += log.duration / 60;
    if (log.duration >= 300) { // 5분 이상
      longCallsCount += 1;
    }
  }

  return { byPhone, totalMinutes, longCallsCount };
}

// ═══════════════════════════════════════════════════════════════════════════
//                              SMS COLLECTOR
// ═══════════════════════════════════════════════════════════════════════════

/**
 * SMS 수집
 */
export async function getSmsMessages(days: number = 90): Promise<SmsEntry[]> {
  const cutoffMs = Date.now() - days * 24 * 60 * 60 * 1000;
  
  try {
    // TODO: NativeModules.SmsModule.query() 구현
    
    // 목업 데이터 (테스트용)
    const mockSms: SmsEntry[] = [
      {
        id: '1',
        phone: '15990000',
        body: '[국민은행] 입금 500,000원 잔액 1,200,000원',
        type: 'inbox',
        timestamp: Date.now() - 1000 * 60 * 60,
      },
      {
        id: '2',
        phone: '15990000',
        body: '[신한카드] 결제승인 300,000원',
        type: 'inbox',
        timestamp: Date.now() - 1000 * 60 * 60 * 24,
      },
    ];
    
    return mockSms;
  } catch (error) {
    console.error('Failed to get SMS:', error);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//                              PAYMENT PARSER
// ═══════════════════════════════════════════════════════════════════════════

// 결제 알림 패턴
const PAYMENT_PATTERNS = {
  bank: [
    /\[([가-힣]+은행)\]\s*입금\s*([\d,]+)원/,
    /\[([가-힣]+뱅크)\]\s*입금\s*([\d,]+)원/,
  ],
  card: [
    /\[([가-힣]+카드)\]\s*결제승인\s*([\d,]+)원/,
    /\[([가-힣]+카드)\]\s*승인\s*([\d,]+)원/,
  ],
  simple_pay: [
    /\[카카오페이\]\s*입금\s*([\d,]+)원/,
    /\[네이버페이\]\s*입금\s*([\d,]+)원/,
    /\[토스\]\s*입금\s*([\d,]+)원/,
  ],
};

// 제외 패턴
const EXCLUDE_PATTERNS = [/환불/, /취소/, /반품/, /출금/, /이체/];

/**
 * SMS에서 결제 금액 파싱
 */
export function parsePaymentFromSms(sms: SmsEntry): ParsedPayment | null {
  // 제외 패턴 체크
  for (const pattern of EXCLUDE_PATTERNS) {
    if (pattern.test(sms.body)) {
      return null;
    }
  }

  // 은행 입금
  for (const pattern of PAYMENT_PATTERNS.bank) {
    const match = sms.body.match(pattern);
    if (match) {
      const amountStr = match[2] || match[1];
      const amount = parseFloat(amountStr.replace(/,/g, ''));
      return {
        phone: sms.phone,
        amount,
        source: 'bank',
        timestamp: sms.timestamp,
      };
    }
  }

  // 카드 결제
  for (const pattern of PAYMENT_PATTERNS.card) {
    const match = sms.body.match(pattern);
    if (match) {
      const amount = parseFloat(match[2].replace(/,/g, ''));
      return {
        phone: sms.phone,
        amount,
        source: 'card',
        timestamp: sms.timestamp,
      };
    }
  }

  // 간편결제
  for (const pattern of PAYMENT_PATTERNS.simple_pay) {
    const match = sms.body.match(pattern);
    if (match) {
      const amount = parseFloat(match[1].replace(/,/g, ''));
      return {
        phone: sms.phone,
        amount,
        source: 'simple_pay',
        timestamp: sms.timestamp,
      };
    }
  }

  return null;
}

/**
 * SMS 배치에서 결제 내역 추출
 */
export function extractPayments(smsList: SmsEntry[]): ParsedPayment[] {
  const payments: ParsedPayment[] = [];
  
  for (const sms of smsList) {
    const payment = parsePaymentFromSms(sms);
    if (payment) {
      payments.push(payment);
    }
  }
  
  return payments;
}

/**
 * 전화번호별 총 입금액 집계
 */
export function aggregatePaymentsByPhone(
  payments: ParsedPayment[]
): Map<string, number> {
  const totals = new Map<string, number>();
  
  // 참고: 결제 알림의 phone은 은행/카드사 번호
  // 실제로는 학부모 전화번호와 매칭 필요
  
  for (const payment of payments) {
    const existing = totals.get(payment.phone) || 0;
    totals.set(payment.phone, existing + payment.amount);
  }
  
  return totals;
}

// ═══════════════════════════════════════════════════════════════════════════
//                              MAIN COLLECTOR
// ═══════════════════════════════════════════════════════════════════════════

export interface CollectionResult {
  callLogs: CallLogEntry[];
  smsMessages: SmsEntry[];
  payments: ParsedPayment[];
  callAnalysis: ReturnType<typeof analyzeCallLogs>;
  totalPaymentAmount: number;
  collectedAt: number;
}

/**
 * 전체 데이터 수집
 */
export async function collectAllData(days: number = 90): Promise<CollectionResult> {
  // 권한 체크
  const permissions = await checkPermissions();
  
  if (!permissions.callLog || !permissions.sms) {
    throw new Error('Required permissions not granted');
  }
  
  // 데이터 수집
  const callLogs = await getCallLogs(days);
  const smsMessages = await getSmsMessages(days);
  
  // 분석
  const callAnalysis = analyzeCallLogs(callLogs);
  const payments = extractPayments(smsMessages);
  const totalPaymentAmount = payments.reduce((sum, p) => sum + p.amount, 0);
  
  return {
    callLogs,
    smsMessages,
    payments,
    callAnalysis,
    totalPaymentAmount,
    collectedAt: Date.now(),
  };
}










/**
 * AUTUS Local Agent - Data Collector Service
 * ============================================
 * 
 * Android 기기에서 데이터 수집
 * 
 * 권한 필요:
 * - READ_CALL_LOG: 통화 기록
 * - READ_SMS: SMS 메시지
 * - READ_CONTACTS: 연락처 (선택)
 * 
 * Zero-Server-Cost: 모든 데이터는 로컬에만 저장
 */

import { NativeModules, PermissionsAndroid, Platform } from 'react-native';

// ═══════════════════════════════════════════════════════════════════════════
//                              TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface CallLogEntry {
  id: string;
  phone: string;
  name: string | null;
  duration: number;  // seconds
  type: 'incoming' | 'outgoing' | 'missed';
  timestamp: number; // ms
}

export interface SmsEntry {
  id: string;
  phone: string;
  body: string;
  type: 'inbox' | 'sent';
  timestamp: number; // ms
}

export interface ParsedPayment {
  phone: string;
  amount: number;
  source: 'bank' | 'card' | 'simple_pay';
  timestamp: number;
}

// ═══════════════════════════════════════════════════════════════════════════
//                              PERMISSIONS
// ═══════════════════════════════════════════════════════════════════════════

export async function requestPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    console.warn('Permissions only available on Android');
    return false;
  }

  try {
    const grants = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
      PermissionsAndroid.PERMISSIONS.READ_SMS,
      PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
    ]);

    const allGranted = Object.values(grants).every(
      (status) => status === PermissionsAndroid.RESULTS.GRANTED
    );

    return allGranted;
  } catch (error) {
    console.error('Permission request failed:', error);
    return false;
  }
}

export async function checkPermissions(): Promise<{
  callLog: boolean;
  sms: boolean;
  contacts: boolean;
}> {
  if (Platform.OS !== 'android') {
    return { callLog: false, sms: false, contacts: false };
  }

  const callLog = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.READ_CALL_LOG
  );
  const sms = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.READ_SMS
  );
  const contacts = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.READ_CONTACTS
  );

  return { callLog, sms, contacts };
}

// ═══════════════════════════════════════════════════════════════════════════
//                              CALL LOG COLLECTOR
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 통화 기록 수집
 * 
 * Android ContentResolver 사용
 */
export async function getCallLogs(days: number = 90): Promise<CallLogEntry[]> {
  // Native Module 호출 (별도 구현 필요)
  // 여기서는 인터페이스만 정의
  
  const cutoffMs = Date.now() - days * 24 * 60 * 60 * 1000;
  
  try {
    // TODO: NativeModules.CallLogModule.query() 구현
    // const rawLogs = await NativeModules.CallLogModule.query(cutoffMs);
    
    // 목업 데이터 (테스트용)
    const mockLogs: CallLogEntry[] = [
      {
        id: '1',
        phone: '010-1234-5678',
        name: '김철수',
        duration: 180,
        type: 'outgoing',
        timestamp: Date.now() - 1000 * 60 * 60,
      },
      {
        id: '2',
        phone: '010-2345-6789',
        name: '이영희',
        duration: 600,
        type: 'incoming',
        timestamp: Date.now() - 1000 * 60 * 60 * 24,
      },
    ];
    
    return mockLogs;
  } catch (error) {
    console.error('Failed to get call logs:', error);
    return [];
  }
}

/**
 * 통화 기록 분석
 */
export function analyzeCallLogs(logs: CallLogEntry[]): {
  byPhone: Map<string, { totalDuration: number; callCount: number }>;
  totalMinutes: number;
  longCallsCount: number;
} {
  const byPhone = new Map<string, { totalDuration: number; callCount: number }>();
  let totalMinutes = 0;
  let longCallsCount = 0;

  for (const log of logs) {
    const existing = byPhone.get(log.phone) || { totalDuration: 0, callCount: 0 };
    existing.totalDuration += log.duration;
    existing.callCount += 1;
    byPhone.set(log.phone, existing);

    totalMinutes += log.duration / 60;
    if (log.duration >= 300) { // 5분 이상
      longCallsCount += 1;
    }
  }

  return { byPhone, totalMinutes, longCallsCount };
}

// ═══════════════════════════════════════════════════════════════════════════
//                              SMS COLLECTOR
// ═══════════════════════════════════════════════════════════════════════════

/**
 * SMS 수집
 */
export async function getSmsMessages(days: number = 90): Promise<SmsEntry[]> {
  const cutoffMs = Date.now() - days * 24 * 60 * 60 * 1000;
  
  try {
    // TODO: NativeModules.SmsModule.query() 구현
    
    // 목업 데이터 (테스트용)
    const mockSms: SmsEntry[] = [
      {
        id: '1',
        phone: '15990000',
        body: '[국민은행] 입금 500,000원 잔액 1,200,000원',
        type: 'inbox',
        timestamp: Date.now() - 1000 * 60 * 60,
      },
      {
        id: '2',
        phone: '15990000',
        body: '[신한카드] 결제승인 300,000원',
        type: 'inbox',
        timestamp: Date.now() - 1000 * 60 * 60 * 24,
      },
    ];
    
    return mockSms;
  } catch (error) {
    console.error('Failed to get SMS:', error);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//                              PAYMENT PARSER
// ═══════════════════════════════════════════════════════════════════════════

// 결제 알림 패턴
const PAYMENT_PATTERNS = {
  bank: [
    /\[([가-힣]+은행)\]\s*입금\s*([\d,]+)원/,
    /\[([가-힣]+뱅크)\]\s*입금\s*([\d,]+)원/,
  ],
  card: [
    /\[([가-힣]+카드)\]\s*결제승인\s*([\d,]+)원/,
    /\[([가-힣]+카드)\]\s*승인\s*([\d,]+)원/,
  ],
  simple_pay: [
    /\[카카오페이\]\s*입금\s*([\d,]+)원/,
    /\[네이버페이\]\s*입금\s*([\d,]+)원/,
    /\[토스\]\s*입금\s*([\d,]+)원/,
  ],
};

// 제외 패턴
const EXCLUDE_PATTERNS = [/환불/, /취소/, /반품/, /출금/, /이체/];

/**
 * SMS에서 결제 금액 파싱
 */
export function parsePaymentFromSms(sms: SmsEntry): ParsedPayment | null {
  // 제외 패턴 체크
  for (const pattern of EXCLUDE_PATTERNS) {
    if (pattern.test(sms.body)) {
      return null;
    }
  }

  // 은행 입금
  for (const pattern of PAYMENT_PATTERNS.bank) {
    const match = sms.body.match(pattern);
    if (match) {
      const amountStr = match[2] || match[1];
      const amount = parseFloat(amountStr.replace(/,/g, ''));
      return {
        phone: sms.phone,
        amount,
        source: 'bank',
        timestamp: sms.timestamp,
      };
    }
  }

  // 카드 결제
  for (const pattern of PAYMENT_PATTERNS.card) {
    const match = sms.body.match(pattern);
    if (match) {
      const amount = parseFloat(match[2].replace(/,/g, ''));
      return {
        phone: sms.phone,
        amount,
        source: 'card',
        timestamp: sms.timestamp,
      };
    }
  }

  // 간편결제
  for (const pattern of PAYMENT_PATTERNS.simple_pay) {
    const match = sms.body.match(pattern);
    if (match) {
      const amount = parseFloat(match[1].replace(/,/g, ''));
      return {
        phone: sms.phone,
        amount,
        source: 'simple_pay',
        timestamp: sms.timestamp,
      };
    }
  }

  return null;
}

/**
 * SMS 배치에서 결제 내역 추출
 */
export function extractPayments(smsList: SmsEntry[]): ParsedPayment[] {
  const payments: ParsedPayment[] = [];
  
  for (const sms of smsList) {
    const payment = parsePaymentFromSms(sms);
    if (payment) {
      payments.push(payment);
    }
  }
  
  return payments;
}

/**
 * 전화번호별 총 입금액 집계
 */
export function aggregatePaymentsByPhone(
  payments: ParsedPayment[]
): Map<string, number> {
  const totals = new Map<string, number>();
  
  // 참고: 결제 알림의 phone은 은행/카드사 번호
  // 실제로는 학부모 전화번호와 매칭 필요
  
  for (const payment of payments) {
    const existing = totals.get(payment.phone) || 0;
    totals.set(payment.phone, existing + payment.amount);
  }
  
  return totals;
}

// ═══════════════════════════════════════════════════════════════════════════
//                              MAIN COLLECTOR
// ═══════════════════════════════════════════════════════════════════════════

export interface CollectionResult {
  callLogs: CallLogEntry[];
  smsMessages: SmsEntry[];
  payments: ParsedPayment[];
  callAnalysis: ReturnType<typeof analyzeCallLogs>;
  totalPaymentAmount: number;
  collectedAt: number;
}

/**
 * 전체 데이터 수집
 */
export async function collectAllData(days: number = 90): Promise<CollectionResult> {
  // 권한 체크
  const permissions = await checkPermissions();
  
  if (!permissions.callLog || !permissions.sms) {
    throw new Error('Required permissions not granted');
  }
  
  // 데이터 수집
  const callLogs = await getCallLogs(days);
  const smsMessages = await getSmsMessages(days);
  
  // 분석
  const callAnalysis = analyzeCallLogs(callLogs);
  const payments = extractPayments(smsMessages);
  const totalPaymentAmount = payments.reduce((sum, p) => sum + p.amount, 0);
  
  return {
    callLogs,
    smsMessages,
    payments,
    callAnalysis,
    totalPaymentAmount,
    collectedAt: Date.now(),
  };
}










/**
 * AUTUS Local Agent - Data Collector Service
 * ============================================
 * 
 * Android 기기에서 데이터 수집
 * 
 * 권한 필요:
 * - READ_CALL_LOG: 통화 기록
 * - READ_SMS: SMS 메시지
 * - READ_CONTACTS: 연락처 (선택)
 * 
 * Zero-Server-Cost: 모든 데이터는 로컬에만 저장
 */

import { NativeModules, PermissionsAndroid, Platform } from 'react-native';

// ═══════════════════════════════════════════════════════════════════════════
//                              TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface CallLogEntry {
  id: string;
  phone: string;
  name: string | null;
  duration: number;  // seconds
  type: 'incoming' | 'outgoing' | 'missed';
  timestamp: number; // ms
}

export interface SmsEntry {
  id: string;
  phone: string;
  body: string;
  type: 'inbox' | 'sent';
  timestamp: number; // ms
}

export interface ParsedPayment {
  phone: string;
  amount: number;
  source: 'bank' | 'card' | 'simple_pay';
  timestamp: number;
}

// ═══════════════════════════════════════════════════════════════════════════
//                              PERMISSIONS
// ═══════════════════════════════════════════════════════════════════════════

export async function requestPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    console.warn('Permissions only available on Android');
    return false;
  }

  try {
    const grants = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
      PermissionsAndroid.PERMISSIONS.READ_SMS,
      PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
    ]);

    const allGranted = Object.values(grants).every(
      (status) => status === PermissionsAndroid.RESULTS.GRANTED
    );

    return allGranted;
  } catch (error) {
    console.error('Permission request failed:', error);
    return false;
  }
}

export async function checkPermissions(): Promise<{
  callLog: boolean;
  sms: boolean;
  contacts: boolean;
}> {
  if (Platform.OS !== 'android') {
    return { callLog: false, sms: false, contacts: false };
  }

  const callLog = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.READ_CALL_LOG
  );
  const sms = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.READ_SMS
  );
  const contacts = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.READ_CONTACTS
  );

  return { callLog, sms, contacts };
}

// ═══════════════════════════════════════════════════════════════════════════
//                              CALL LOG COLLECTOR
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 통화 기록 수집
 * 
 * Android ContentResolver 사용
 */
export async function getCallLogs(days: number = 90): Promise<CallLogEntry[]> {
  // Native Module 호출 (별도 구현 필요)
  // 여기서는 인터페이스만 정의
  
  const cutoffMs = Date.now() - days * 24 * 60 * 60 * 1000;
  
  try {
    // TODO: NativeModules.CallLogModule.query() 구현
    // const rawLogs = await NativeModules.CallLogModule.query(cutoffMs);
    
    // 목업 데이터 (테스트용)
    const mockLogs: CallLogEntry[] = [
      {
        id: '1',
        phone: '010-1234-5678',
        name: '김철수',
        duration: 180,
        type: 'outgoing',
        timestamp: Date.now() - 1000 * 60 * 60,
      },
      {
        id: '2',
        phone: '010-2345-6789',
        name: '이영희',
        duration: 600,
        type: 'incoming',
        timestamp: Date.now() - 1000 * 60 * 60 * 24,
      },
    ];
    
    return mockLogs;
  } catch (error) {
    console.error('Failed to get call logs:', error);
    return [];
  }
}

/**
 * 통화 기록 분석
 */
export function analyzeCallLogs(logs: CallLogEntry[]): {
  byPhone: Map<string, { totalDuration: number; callCount: number }>;
  totalMinutes: number;
  longCallsCount: number;
} {
  const byPhone = new Map<string, { totalDuration: number; callCount: number }>();
  let totalMinutes = 0;
  let longCallsCount = 0;

  for (const log of logs) {
    const existing = byPhone.get(log.phone) || { totalDuration: 0, callCount: 0 };
    existing.totalDuration += log.duration;
    existing.callCount += 1;
    byPhone.set(log.phone, existing);

    totalMinutes += log.duration / 60;
    if (log.duration >= 300) { // 5분 이상
      longCallsCount += 1;
    }
  }

  return { byPhone, totalMinutes, longCallsCount };
}

// ═══════════════════════════════════════════════════════════════════════════
//                              SMS COLLECTOR
// ═══════════════════════════════════════════════════════════════════════════

/**
 * SMS 수집
 */
export async function getSmsMessages(days: number = 90): Promise<SmsEntry[]> {
  const cutoffMs = Date.now() - days * 24 * 60 * 60 * 1000;
  
  try {
    // TODO: NativeModules.SmsModule.query() 구현
    
    // 목업 데이터 (테스트용)
    const mockSms: SmsEntry[] = [
      {
        id: '1',
        phone: '15990000',
        body: '[국민은행] 입금 500,000원 잔액 1,200,000원',
        type: 'inbox',
        timestamp: Date.now() - 1000 * 60 * 60,
      },
      {
        id: '2',
        phone: '15990000',
        body: '[신한카드] 결제승인 300,000원',
        type: 'inbox',
        timestamp: Date.now() - 1000 * 60 * 60 * 24,
      },
    ];
    
    return mockSms;
  } catch (error) {
    console.error('Failed to get SMS:', error);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//                              PAYMENT PARSER
// ═══════════════════════════════════════════════════════════════════════════

// 결제 알림 패턴
const PAYMENT_PATTERNS = {
  bank: [
    /\[([가-힣]+은행)\]\s*입금\s*([\d,]+)원/,
    /\[([가-힣]+뱅크)\]\s*입금\s*([\d,]+)원/,
  ],
  card: [
    /\[([가-힣]+카드)\]\s*결제승인\s*([\d,]+)원/,
    /\[([가-힣]+카드)\]\s*승인\s*([\d,]+)원/,
  ],
  simple_pay: [
    /\[카카오페이\]\s*입금\s*([\d,]+)원/,
    /\[네이버페이\]\s*입금\s*([\d,]+)원/,
    /\[토스\]\s*입금\s*([\d,]+)원/,
  ],
};

// 제외 패턴
const EXCLUDE_PATTERNS = [/환불/, /취소/, /반품/, /출금/, /이체/];

/**
 * SMS에서 결제 금액 파싱
 */
export function parsePaymentFromSms(sms: SmsEntry): ParsedPayment | null {
  // 제외 패턴 체크
  for (const pattern of EXCLUDE_PATTERNS) {
    if (pattern.test(sms.body)) {
      return null;
    }
  }

  // 은행 입금
  for (const pattern of PAYMENT_PATTERNS.bank) {
    const match = sms.body.match(pattern);
    if (match) {
      const amountStr = match[2] || match[1];
      const amount = parseFloat(amountStr.replace(/,/g, ''));
      return {
        phone: sms.phone,
        amount,
        source: 'bank',
        timestamp: sms.timestamp,
      };
    }
  }

  // 카드 결제
  for (const pattern of PAYMENT_PATTERNS.card) {
    const match = sms.body.match(pattern);
    if (match) {
      const amount = parseFloat(match[2].replace(/,/g, ''));
      return {
        phone: sms.phone,
        amount,
        source: 'card',
        timestamp: sms.timestamp,
      };
    }
  }

  // 간편결제
  for (const pattern of PAYMENT_PATTERNS.simple_pay) {
    const match = sms.body.match(pattern);
    if (match) {
      const amount = parseFloat(match[1].replace(/,/g, ''));
      return {
        phone: sms.phone,
        amount,
        source: 'simple_pay',
        timestamp: sms.timestamp,
      };
    }
  }

  return null;
}

/**
 * SMS 배치에서 결제 내역 추출
 */
export function extractPayments(smsList: SmsEntry[]): ParsedPayment[] {
  const payments: ParsedPayment[] = [];
  
  for (const sms of smsList) {
    const payment = parsePaymentFromSms(sms);
    if (payment) {
      payments.push(payment);
    }
  }
  
  return payments;
}

/**
 * 전화번호별 총 입금액 집계
 */
export function aggregatePaymentsByPhone(
  payments: ParsedPayment[]
): Map<string, number> {
  const totals = new Map<string, number>();
  
  // 참고: 결제 알림의 phone은 은행/카드사 번호
  // 실제로는 학부모 전화번호와 매칭 필요
  
  for (const payment of payments) {
    const existing = totals.get(payment.phone) || 0;
    totals.set(payment.phone, existing + payment.amount);
  }
  
  return totals;
}

// ═══════════════════════════════════════════════════════════════════════════
//                              MAIN COLLECTOR
// ═══════════════════════════════════════════════════════════════════════════

export interface CollectionResult {
  callLogs: CallLogEntry[];
  smsMessages: SmsEntry[];
  payments: ParsedPayment[];
  callAnalysis: ReturnType<typeof analyzeCallLogs>;
  totalPaymentAmount: number;
  collectedAt: number;
}

/**
 * 전체 데이터 수집
 */
export async function collectAllData(days: number = 90): Promise<CollectionResult> {
  // 권한 체크
  const permissions = await checkPermissions();
  
  if (!permissions.callLog || !permissions.sms) {
    throw new Error('Required permissions not granted');
  }
  
  // 데이터 수집
  const callLogs = await getCallLogs(days);
  const smsMessages = await getSmsMessages(days);
  
  // 분석
  const callAnalysis = analyzeCallLogs(callLogs);
  const payments = extractPayments(smsMessages);
  const totalPaymentAmount = payments.reduce((sum, p) => sum + p.amount, 0);
  
  return {
    callLogs,
    smsMessages,
    payments,
    callAnalysis,
    totalPaymentAmount,
    collectedAt: Date.now(),
  };
}

























