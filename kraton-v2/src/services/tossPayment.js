/**
 * 💳 토스페이먼츠 결제링크 서비스
 *
 * 최소개발 최대효율 - 결제링크 생성만 담당
 * 수납 처리는 SmartFit에서 수동으로 진행
 */

// 토스 API 설정 (실제 운영 시 환경변수로 관리)
const TOSS_CONFIG = {
  clientKey: import.meta.env.VITE_TOSS_CLIENT_KEY || 'test_ck_demo',
  secretKey: import.meta.env.VITE_TOSS_SECRET_KEY || 'test_sk_demo',
  // 결제 완료 후 리다이렉트 URL
  successUrl: `${window.location.origin}/payment/success`,
  failUrl: `${window.location.origin}/payment/fail`,
};

// 데모 모드 (API 키 없을 때)
const IS_DEMO = !import.meta.env.VITE_TOSS_SECRET_KEY;

/**
 * 결제링크 생성
 * @param {Object} params - 결제 정보
 * @returns {Object} - 결제링크 정보
 */
export async function createPaymentLink({
  studentId,
  studentName,
  parentPhone,
  amount,
  description = '수강료',
  dueDate = null,
}) {
  const orderId = `ATB-${studentId}-${Date.now()}`;

  if (IS_DEMO) {
    // 데모 모드: 가상 결제링크 생성
    const demoLink = `https://demo.tosspayments.com/pay/${orderId}`;

    const paymentRecord = {
      id: orderId,
      studentId,
      studentName,
      parentPhone,
      amount,
      description,
      status: 'PENDING',
      paymentLink: demoLink,
      shortLink: `https://atb.pay/${orderId.slice(-8)}`,
      createdAt: new Date().toISOString(),
      dueDate: dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };

    // 로컬 저장
    savePaymentRecord(paymentRecord);

    return {
      success: true,
      data: paymentRecord,
      message: '[데모] 결제링크가 생성되었습니다.',
    };
  }

  // 실제 토스 API 호출
  try {
    const response = await fetch('https://api.tosspayments.com/v1/payment-links', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(TOSS_CONFIG.secretKey + ':')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount,
        orderId,
        orderName: `${studentName} ${description}`,
        successUrl: TOSS_CONFIG.successUrl,
        failUrl: TOSS_CONFIG.failUrl,
        validHours: 720, // 30일
        customerName: studentName,
        customerMobilePhone: parentPhone,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || '결제링크 생성 실패');
    }

    const paymentRecord = {
      id: orderId,
      studentId,
      studentName,
      parentPhone,
      amount,
      description,
      status: 'PENDING',
      paymentLink: data.paymentLink,
      shortLink: data.shortLink,
      createdAt: new Date().toISOString(),
      dueDate: dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      expiresAt: data.expiresAt,
      tossPaymentKey: data.paymentKey,
    };

    savePaymentRecord(paymentRecord);

    return {
      success: true,
      data: paymentRecord,
    };
  } catch (error) {
    console.error('토스 결제링크 생성 오류:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * 결제 상태 확인
 */
export async function checkPaymentStatus(orderId) {
  if (IS_DEMO) {
    const records = getPaymentRecords();
    const record = records.find(r => r.id === orderId);
    return record || null;
  }

  try {
    const response = await fetch(`https://api.tosspayments.com/v1/payments/orders/${orderId}`, {
      headers: {
        'Authorization': `Basic ${btoa(TOSS_CONFIG.secretKey + ':')}`,
      },
    });

    return await response.json();
  } catch (error) {
    console.error('결제 상태 확인 오류:', error);
    return null;
  }
}

/**
 * 결제 완료 처리 (웹훅 또는 수동)
 */
export function markAsPaid(orderId, paymentInfo = {}) {
  const records = getPaymentRecords();
  const index = records.findIndex(r => r.id === orderId);

  if (index === -1) return false;

  records[index] = {
    ...records[index],
    status: 'PAID',
    paidAt: new Date().toISOString(),
    paymentMethod: paymentInfo.method || '카드',
    syncedToSmartFit: false, // SmartFit 수동 입력 여부
    ...paymentInfo,
  };

  localStorage.setItem('atb_payments', JSON.stringify(records));
  return records[index];
}

/**
 * SmartFit 동기화 완료 표시
 */
export function markAsSynced(orderId) {
  const records = getPaymentRecords();
  const index = records.findIndex(r => r.id === orderId);

  if (index === -1) return false;

  records[index].syncedToSmartFit = true;
  records[index].syncedAt = new Date().toISOString();

  localStorage.setItem('atb_payments', JSON.stringify(records));
  return records[index];
}

/**
 * 결제 기록 저장
 */
function savePaymentRecord(record) {
  const records = getPaymentRecords();
  records.push(record);
  localStorage.setItem('atb_payments', JSON.stringify(records));
}

/**
 * 모든 결제 기록 조회
 */
export function getPaymentRecords(filter = {}) {
  const records = JSON.parse(localStorage.getItem('atb_payments') || '[]');

  let filtered = records;

  if (filter.status) {
    filtered = filtered.filter(r => r.status === filter.status);
  }

  if (filter.syncedToSmartFit !== undefined) {
    filtered = filtered.filter(r => r.syncedToSmartFit === filter.syncedToSmartFit);
  }

  if (filter.fromDate) {
    filtered = filtered.filter(r => new Date(r.createdAt) >= new Date(filter.fromDate));
  }

  if (filter.toDate) {
    filtered = filtered.filter(r => new Date(r.createdAt) <= new Date(filter.toDate));
  }

  return filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/**
 * 미동기화 결제 건수 조회
 */
export function getUnsyncedCount() {
  const records = getPaymentRecords({ status: 'PAID', syncedToSmartFit: false });
  return records.length;
}

/**
 * SmartFit 입력용 엑셀 데이터 생성
 */
export function generateExcelData(filter = { status: 'PAID', syncedToSmartFit: false }) {
  const records = getPaymentRecords(filter);

  return records.map(r => ({
    '결제일시': new Date(r.paidAt || r.createdAt).toLocaleString('ko-KR'),
    '학생명': r.studentName,
    '금액': r.amount,
    '결제수단': r.paymentMethod || '-',
    '주문번호': r.id,
    'SmartFit동기화': r.syncedToSmartFit ? 'O' : 'X',
  }));
}

/**
 * CSV 다운로드
 */
export function downloadCSV(data, filename = 'payment_list.csv') {
  if (!data.length) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(h => `"${row[h]}"`).join(','))
  ].join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

// 데모 데이터 초기화
export function initDemoData() {
  if (localStorage.getItem('atb_payments')) return;

  const demoPayments = [
    {
      id: 'ATB-1-1704067200000',
      studentId: '1',
      studentName: '최여찬',
      parentPhone: '010-2278-6129',
      amount: 720000,
      description: '1월 수강료',
      status: 'PAID',
      paidAt: '2025-01-28T10:30:00Z',
      paymentMethod: '카드',
      syncedToSmartFit: false,
      paymentLink: 'https://demo.pay/1',
      createdAt: '2025-01-25T09:00:00Z',
    },
    {
      id: 'ATB-2-1704153600000',
      studentId: '2',
      studentName: '송은호',
      parentPhone: '010-3456-7890',
      amount: 400000,
      description: '1월 수강료',
      status: 'PAID',
      paidAt: '2025-01-29T14:20:00Z',
      paymentMethod: '계좌이체',
      syncedToSmartFit: false,
      paymentLink: 'https://demo.pay/2',
      createdAt: '2025-01-26T09:00:00Z',
    },
    {
      id: 'ATB-3-1704240000000',
      studentId: '3',
      studentName: '김한준',
      parentPhone: '010-9876-5432',
      amount: 374000,
      description: '1월 수강료',
      status: 'PENDING',
      syncedToSmartFit: false,
      paymentLink: 'https://demo.pay/3',
      createdAt: '2025-01-27T09:00:00Z',
      dueDate: '2025-02-03T23:59:59Z',
    },
  ];

  localStorage.setItem('atb_payments', JSON.stringify(demoPayments));
}

export default {
  createPaymentLink,
  checkPaymentStatus,
  markAsPaid,
  markAsSynced,
  getPaymentRecords,
  getUnsyncedCount,
  generateExcelData,
  downloadCSV,
  initDemoData,
};
