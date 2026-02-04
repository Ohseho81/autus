/**
 * 💬 카카오 알림톡 서비스
 *
 * 최소개발 최대효율 - 미수금 청구서 발송 전용
 * 실제 발송은 비즈메시지 API 또는 NHN Cloud 사용
 */

// 알림톡 설정
const ALIMTALK_CONFIG = {
  apiKey: import.meta.env.VITE_ALIMTALK_API_KEY || '',
  senderKey: import.meta.env.VITE_ALIMTALK_SENDER_KEY || '',
  templateCode: {
    PAYMENT_REQUEST: 'ATB_PAYMENT_001', // 청구서 발송
    PAYMENT_REMINDER: 'ATB_PAYMENT_002', // 미수금 리마인더
    PAYMENT_COMPLETE: 'ATB_PAYMENT_003', // 결제 완료
    ATTENDANCE_ABSENT: 'ATB_ATTEND_001', // 결석 알림
  },
};

const IS_DEMO = !import.meta.env.VITE_ALIMTALK_API_KEY;

/**
 * 알림톡 템플릿
 */
export const TEMPLATES = {
  // 청구서 발송 (결제링크 포함)
  PAYMENT_REQUEST: {
    code: 'ATB_PAYMENT_001',
    title: '수강료 청구서',
    template: `[올댓바스켓]

안녕하세요, #{학생명} 학생 학부모님.

#{월}월 수강료 청구서입니다.

💰 청구금액: #{금액}원
📅 납부기한: #{납부기한}

아래 링크에서 편리하게 결제하세요.
#{결제링크}

감사합니다. 🏀`,
  },

  // 미수금 리마인더
  PAYMENT_REMINDER: {
    code: 'ATB_PAYMENT_002',
    title: '수강료 납부 안내',
    template: `[올댓바스켓]

안녕하세요, #{학생명} 학생 학부모님.

#{월}월 수강료 #{금액}원이 아직 미납 상태입니다.

📅 연체일: #{연체일}일
⚠️ 납부 부탁드립니다.

결제하기: #{결제링크}

문의: 02-XXX-XXXX`,
  },

  // 결제 완료
  PAYMENT_COMPLETE: {
    code: 'ATB_PAYMENT_003',
    title: '결제 완료',
    template: `[올댓바스켓]

#{학생명} 학생 #{월}월 수강료 결제가 완료되었습니다.

💳 결제금액: #{금액}원
📅 결제일시: #{결제일시}

감사합니다! 🏀`,
  },

  // 결석 알림
  ATTENDANCE_ABSENT: {
    code: 'ATB_ATTEND_001',
    title: '출석 확인',
    template: `[올댓바스켓]

안녕하세요, #{학생명} 학생 학부모님.

오늘(#{날짜}) #{수업명} 수업에 출석하지 않았습니다.

확인 부탁드립니다.
문의: 02-XXX-XXXX`,
  },

  // 결석 알림 + 보충 신청 버튼
  ATTENDANCE_ABSENT_WITH_MAKEUP: {
    code: 'ATB_ATTEND_002',
    title: '결석 알림 (보충 신청)',
    template: `[올댓바스켓]

안녕하세요, #{학생명} 학생 학부모님.

오늘(#{날짜}) #{수업명} 수업에 출석하지 않았습니다.

보충 수업을 원하시면 아래 버튼을 눌러주세요.`,
    buttons: [
      {
        type: 'WL', // 웹링크
        name: '보충 신청하기',
        linkMobile: '#{보충링크}',
        linkPc: '#{보충링크}',
      },
    ],
  },

  // 보충 승인 알림
  MAKEUP_APPROVED: {
    code: 'ATB_MAKEUP_001',
    title: '보충 수업 승인',
    template: `[올댓바스켓]

#{학생명} 학생의 보충 수업이 확정되었습니다.

▶ 변경 전: #{기존날짜} #{기존시간}
▶ 변경 후: #{새날짜} #{새시간}
▶ 수업: #{수업명}

감사합니다. 🏀`,
  },

  // 보충 거절 알림
  MAKEUP_REJECTED: {
    code: 'ATB_MAKEUP_002',
    title: '보충 수업 불가',
    template: `[올댓바스켓]

#{학생명} 학생의 보충 수업 신청이 어렵습니다.

사유: #{거절사유}

다른 일정을 원하시면 카카오톡으로 문의해주세요.
올댓바스켓 드림`,
    buttons: [
      {
        type: 'WL',
        name: '다시 신청하기',
        linkMobile: '#{보충링크}',
        linkPc: '#{보충링크}',
      },
    ],
  },
};

/**
 * 알림톡 발송
 */
export async function sendAlimtalk({
  templateCode,
  phone,
  variables = {},
}) {
  const template = Object.values(TEMPLATES).find(t => t.code === templateCode);
  if (!template) {
    return { success: false, error: '템플릿을 찾을 수 없습니다.' };
  }

  // 템플릿에 변수 치환
  let message = template.template;
  Object.entries(variables).forEach(([key, value]) => {
    message = message.replace(new RegExp(`#{${key}}`, 'g'), value);
  });

  // 발송 기록
  const record = {
    id: `MSG-${Date.now()}`,
    templateCode,
    phone,
    variables,
    message,
    status: IS_DEMO ? 'DEMO_SENT' : 'PENDING',
    createdAt: new Date().toISOString(),
  };

  if (IS_DEMO) {
    console.log('📱 [데모] 알림톡 발송:', { phone, message });
    saveMessageRecord(record);
    return {
      success: true,
      data: record,
      message: '[데모] 알림톡이 발송되었습니다.',
    };
  }

  // 실제 API 호출 (NHN Cloud 예시)
  try {
    const response = await fetch('https://api-alimtalk.cloud.toast.com/alimtalk/v2.2/appkeys/{appKey}/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Secret-Key': ALIMTALK_CONFIG.apiKey,
      },
      body: JSON.stringify({
        senderKey: ALIMTALK_CONFIG.senderKey,
        templateCode,
        recipientList: [{
          recipientNo: phone.replace(/-/g, ''),
          templateParameter: variables,
        }],
      }),
    });

    const data = await response.json();

    record.status = data.header?.isSuccessful ? 'SENT' : 'FAILED';
    record.response = data;
    saveMessageRecord(record);

    return {
      success: data.header?.isSuccessful,
      data: record,
    };
  } catch (error) {
    record.status = 'FAILED';
    record.error = error.message;
    saveMessageRecord(record);

    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * 청구서 알림톡 발송 (간편 함수)
 */
export async function sendPaymentRequest({
  studentName,
  parentPhone,
  amount,
  month,
  dueDate,
  paymentLink,
}) {
  return sendAlimtalk({
    templateCode: 'ATB_PAYMENT_001',
    phone: parentPhone,
    variables: {
      학생명: studentName,
      월: month || new Date().getMonth() + 1,
      금액: amount.toLocaleString(),
      납부기한: dueDate || '7일 이내',
      결제링크: paymentLink,
    },
  });
}

/**
 * 미수금 리마인더 발송
 */
export async function sendPaymentReminder({
  studentName,
  parentPhone,
  amount,
  month,
  daysOverdue,
  paymentLink,
}) {
  return sendAlimtalk({
    templateCode: 'ATB_PAYMENT_002',
    phone: parentPhone,
    variables: {
      학생명: studentName,
      월: month,
      금액: amount.toLocaleString(),
      연체일: daysOverdue,
      결제링크: paymentLink,
    },
  });
}

/**
 * 결제 완료 알림 발송
 */
export async function sendPaymentComplete({
  studentName,
  parentPhone,
  amount,
  month,
}) {
  return sendAlimtalk({
    templateCode: 'ATB_PAYMENT_003',
    phone: parentPhone,
    variables: {
      학생명: studentName,
      월: month,
      금액: amount.toLocaleString(),
      결제일시: new Date().toLocaleString('ko-KR'),
    },
  });
}

/**
 * 일괄 발송 (미수금 대상자 전체)
 */
export async function sendBulkPaymentRequest(records) {
  const results = {
    total: records.length,
    success: 0,
    failed: 0,
    details: [],
  };

  for (const record of records) {
    const result = await sendPaymentRequest({
      studentName: record.studentName || record.student_name,
      parentPhone: record.parentPhone || record.parent_phone,
      amount: record.amount,
      month: record.month || new Date().getMonth() + 1,
      paymentLink: record.paymentLink || record.payment_link,
    });

    if (result.success) {
      results.success++;
    } else {
      results.failed++;
    }

    results.details.push({
      studentName: record.studentName || record.student_name,
      ...result,
    });

    // API 과부하 방지
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return results;
}

/**
 * 메시지 기록 저장
 */
function saveMessageRecord(record) {
  const records = JSON.parse(localStorage.getItem('atb_messages') || '[]');
  records.push(record);
  localStorage.setItem('atb_messages', JSON.stringify(records));
}

/**
 * 메시지 발송 이력 조회
 */
export function getMessageHistory(filter = {}) {
  const records = JSON.parse(localStorage.getItem('atb_messages') || '[]');

  let filtered = records;

  if (filter.templateCode) {
    filtered = filtered.filter(r => r.templateCode === filter.templateCode);
  }

  if (filter.phone) {
    filtered = filtered.filter(r => r.phone === filter.phone);
  }

  if (filter.fromDate) {
    filtered = filtered.filter(r => new Date(r.createdAt) >= new Date(filter.fromDate));
  }

  return filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

/**
 * 오늘 발송 건수
 */
export function getTodaySentCount() {
  const today = new Date().toDateString();
  const records = getMessageHistory();
  return records.filter(r => new Date(r.createdAt).toDateString() === today).length;
}

/**
 * 발송 비용 계산 (건당 15원 기준)
 */
export function calculateCost(count) {
  const COST_PER_MESSAGE = 15;
  return {
    count,
    unitCost: COST_PER_MESSAGE,
    totalCost: count * COST_PER_MESSAGE,
    formatted: `₩${(count * COST_PER_MESSAGE).toLocaleString()}`,
  };
}

/**
 * 결석 알림 발송
 */
export async function sendAbsentAlert({
  studentName,
  parentPhone,
  className,
  date = null,
  withMakeupButton = false,
  makeupLink = null,
}) {
  const templateCode = withMakeupButton ? 'ATB_ATTEND_002' : 'ATB_ATTEND_001';
  const dateStr = date || new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });

  return sendAlimtalk({
    templateCode,
    phone: parentPhone,
    variables: {
      학생명: studentName,
      날짜: dateStr,
      수업명: className,
      보충링크: makeupLink || '',
    },
  });
}

/**
 * 보충 승인 알림 발송
 */
export async function sendMakeupApproved({
  studentName,
  parentPhone,
  className,
  originalDate,
  originalTime,
  newDate,
  newTime,
}) {
  return sendAlimtalk({
    templateCode: 'ATB_MAKEUP_001',
    phone: parentPhone,
    variables: {
      학생명: studentName,
      수업명: className,
      기존날짜: originalDate,
      기존시간: originalTime,
      새날짜: newDate,
      새시간: newTime,
    },
  });
}

/**
 * 보충 거절 알림 발송
 */
export async function sendMakeupRejected({
  studentName,
  parentPhone,
  reason,
  makeupLink,
}) {
  return sendAlimtalk({
    templateCode: 'ATB_MAKEUP_002',
    phone: parentPhone,
    variables: {
      학생명: studentName,
      거절사유: reason,
      보충링크: makeupLink,
    },
  });
}

export default {
  TEMPLATES,
  sendAlimtalk,
  sendPaymentRequest,
  sendPaymentReminder,
  sendPaymentComplete,
  sendBulkPaymentRequest,
  sendAbsentAlert,
  sendMakeupApproved,
  sendMakeupRejected,
  getMessageHistory,
  getTodaySentCount,
  calculateCost,
};
