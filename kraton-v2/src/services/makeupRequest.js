/**
 * 📋 보충 수업 요청 관리 서비스
 *
 * 워크플로우:
 * 1. 학부모 요청 (REQUESTED)
 * 2. 코치 동의 (COACH_APPROVED)
 * 3. 관리자 승인 (ADMIN_APPROVED)
 * 4. 캘린더 반영 (COMPLETED)
 *
 * 수업 유형별 규칙:
 * - 팀수업: 동일 레벨(연생) 다른 오픈클래스로 보충
 * - 개인훈련: 동일 코치의 빈 시간대로 변경
 */

import { googleCalendarService } from './googleCalendar.js';
import { sendAlimtalk, TEMPLATES } from './kakaoAlimtalk.js';

// ============================================
// 상태 정의
// ============================================
export const REQUEST_STATUS = {
  REQUESTED: 'REQUESTED',           // 학부모가 요청
  COACH_APPROVED: 'COACH_APPROVED', // 코치 동의
  ADMIN_APPROVED: 'ADMIN_APPROVED', // 관리자 승인
  COMPLETED: 'COMPLETED',           // 캘린더 반영 완료
  REJECTED: 'REJECTED',             // 거절
  CANCELLED: 'CANCELLED',           // 취소
};

// ============================================
// 로컬 스토리지 (데모용)
// 실제로는 Supabase 사용
// ============================================
const STORAGE_KEY = 'atb_makeup_requests';

function getStoredRequests() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveRequests(requests) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
}

// ============================================
// 보충 요청 서비스
// ============================================
export const makeupRequestService = {
  // 보충 가능 일정 조회
  async getAvailableSlots(params) {
    const { studentBirthYear, originalDate, classType, coachId } = params;

    if (classType === 'team') {
      // 팀수업: 동일 연생 다른 오픈클래스
      return await googleCalendarService.getAvailableTeamSlots(
        studentBirthYear,
        originalDate,
        3 // 3개 추천
      );
    } else {
      // 개인훈련: 동일 코치 빈 시간
      return await googleCalendarService.getAvailablePrivateSlots(
        coachId,
        originalDate,
        3
      );
    }
  },

  // 보충 요청 생성
  async createRequest(params) {
    const {
      studentId,
      studentName,
      studentBirthYear,
      parentPhone,
      originalClassId,
      originalClassName,
      originalDate,
      originalTime,
      originalCoachId,
      targetSlot, // { date, time, classId, className, coachId, coachName, type }
    } = params;

    const request = {
      id: `req_${Date.now()}`,
      studentId,
      studentName,
      studentBirthYear,
      parentPhone,

      // 원래 수업 정보
      originalClassId,
      originalClassName,
      originalDate,
      originalTime,
      originalCoachId,

      // 변경 희망 정보
      targetClassId: targetSlot.classId,
      targetClassName: targetSlot.className,
      targetDate: targetSlot.date,
      targetTime: targetSlot.time,
      targetCoachId: targetSlot.coachId,
      targetCoachName: targetSlot.coachName,
      classType: targetSlot.type,

      // 상태
      status: REQUEST_STATUS.REQUESTED,

      // 승인 이력
      coachApprovedAt: null,
      coachApprovedBy: null,
      adminApprovedAt: null,
      adminApprovedBy: null,
      rejectedReason: null,

      // 메타
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 저장
    const requests = getStoredRequests();
    requests.push(request);
    saveRequests(requests);

    // 코치에게 알림 (실제로는 푸시/알림톡)
    console.log('[MakeupRequest] 코치 알림 발송:', {
      to: targetSlot.coachId,
      message: `${studentName} 학부모가 보충 요청을 했습니다.`,
    });

    return { success: true, data: request };
  },

  // 요청 목록 조회
  async getRequests(filter = {}) {
    let requests = getStoredRequests();

    // 상태 필터
    if (filter.status) {
      requests = requests.filter(r => r.status === filter.status);
    }

    // 코치 필터
    if (filter.coachId) {
      requests = requests.filter(r =>
        r.targetCoachId === filter.coachId || r.originalCoachId === filter.coachId
      );
    }

    // 학생 필터
    if (filter.studentId) {
      requests = requests.filter(r => r.studentId === filter.studentId);
    }

    // 날짜 정렬 (최신순)
    requests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return { success: true, data: requests };
  },

  // 요청 상세 조회
  async getRequest(requestId) {
    const requests = getStoredRequests();
    const request = requests.find(r => r.id === requestId);

    if (!request) {
      return { success: false, error: '요청을 찾을 수 없습니다.' };
    }

    return { success: true, data: request };
  },

  // 코치 동의
  async approveByCoach(requestId, coachId) {
    const requests = getStoredRequests();
    const index = requests.findIndex(r => r.id === requestId);

    if (index === -1) {
      return { success: false, error: '요청을 찾을 수 없습니다.' };
    }

    const request = requests[index];

    if (request.status !== REQUEST_STATUS.REQUESTED) {
      return { success: false, error: '처리할 수 없는 상태입니다.' };
    }

    request.status = REQUEST_STATUS.COACH_APPROVED;
    request.coachApprovedAt = new Date().toISOString();
    request.coachApprovedBy = coachId;
    request.updatedAt = new Date().toISOString();

    requests[index] = request;
    saveRequests(requests);

    // 관리자에게 알림
    console.log('[MakeupRequest] 관리자 알림 발송:', {
      message: `${request.targetCoachName} 코치가 보충 요청에 동의했습니다. 승인해주세요.`,
    });

    return { success: true, data: request };
  },

  // 관리자 승인
  async approveByAdmin(requestId, adminId) {
    const requests = getStoredRequests();
    const index = requests.findIndex(r => r.id === requestId);

    if (index === -1) {
      return { success: false, error: '요청을 찾을 수 없습니다.' };
    }

    const request = requests[index];

    if (request.status !== REQUEST_STATUS.COACH_APPROVED) {
      return { success: false, error: '코치 동의가 필요합니다.' };
    }

    // 구글 캘린더에 일정 생성
    const calendarResult = await googleCalendarService.createMakeupClass({
      studentName: request.studentName,
      originalDate: request.originalDate,
      targetDate: request.targetDate,
      targetTime: request.targetTime,
      className: request.targetClassName,
      coachId: request.targetCoachId,
      type: request.classType,
    });

    if (!calendarResult.success) {
      return { success: false, error: '캘린더 등록 실패: ' + calendarResult.error };
    }

    request.status = REQUEST_STATUS.COMPLETED;
    request.adminApprovedAt = new Date().toISOString();
    request.adminApprovedBy = adminId;
    request.calendarEventId = calendarResult.data.id;
    request.updatedAt = new Date().toISOString();

    requests[index] = request;
    saveRequests(requests);

    // 학부모에게 승인 알림톡 발송
    try {
      await sendAlimtalk({
        templateCode: 'MAKEUP_APPROVED',
        to: request.parentPhone,
        variables: {
          studentName: request.studentName,
          originalDate: request.originalDate,
          originalTime: request.originalTime,
          newDate: request.targetDate,
          newTime: request.targetTime,
          className: request.targetClassName,
        },
      });
    } catch (error) {
      console.error('[MakeupRequest] 알림톡 발송 실패:', error);
    }

    return { success: true, data: request };
  },

  // 거절
  async reject(requestId, reason, rejectedBy) {
    const requests = getStoredRequests();
    const index = requests.findIndex(r => r.id === requestId);

    if (index === -1) {
      return { success: false, error: '요청을 찾을 수 없습니다.' };
    }

    const request = requests[index];
    request.status = REQUEST_STATUS.REJECTED;
    request.rejectedReason = reason;
    request.rejectedBy = rejectedBy;
    request.updatedAt = new Date().toISOString();

    requests[index] = request;
    saveRequests(requests);

    // 학부모에게 거절 알림톡 발송
    try {
      await sendAlimtalk({
        templateCode: 'MAKEUP_REJECTED',
        to: request.parentPhone,
        variables: {
          studentName: request.studentName,
          reason: reason,
        },
      });
    } catch (error) {
      console.error('[MakeupRequest] 알림톡 발송 실패:', error);
    }

    return { success: true, data: request };
  },

  // 취소 (학부모)
  async cancel(requestId) {
    const requests = getStoredRequests();
    const index = requests.findIndex(r => r.id === requestId);

    if (index === -1) {
      return { success: false, error: '요청을 찾을 수 없습니다.' };
    }

    const request = requests[index];

    // 완료된 요청은 취소 불가
    if (request.status === REQUEST_STATUS.COMPLETED) {
      return { success: false, error: '이미 완료된 요청은 취소할 수 없습니다.' };
    }

    request.status = REQUEST_STATUS.CANCELLED;
    request.updatedAt = new Date().toISOString();

    requests[index] = request;
    saveRequests(requests);

    return { success: true, data: request };
  },

  // 대시보드 통계
  async getStats() {
    const requests = getStoredRequests();

    const stats = {
      total: requests.length,
      pending: requests.filter(r => r.status === REQUEST_STATUS.REQUESTED).length,
      coachApproved: requests.filter(r => r.status === REQUEST_STATUS.COACH_APPROVED).length,
      completed: requests.filter(r => r.status === REQUEST_STATUS.COMPLETED).length,
      rejected: requests.filter(r => r.status === REQUEST_STATUS.REJECTED).length,
    };

    return { success: true, data: stats };
  },

  // 데모 데이터 초기화
  initDemoData() {
    const demoRequests = [
      {
        id: 'req_demo_1',
        studentId: 'student_1',
        studentName: '김민준',
        studentBirthYear: 2016,
        parentPhone: '010-1234-5678',
        originalClassId: 'class_3',
        originalClassName: '초등저 A',
        originalDate: '2026-02-03',
        originalTime: '16:00',
        originalCoachId: 'coach_1',
        targetClassId: 'class_4',
        targetClassName: '초등저 B',
        targetDate: '2026-02-06',
        targetTime: '16:00',
        targetCoachId: 'coach_2',
        targetCoachName: '박코치',
        classType: 'team',
        status: REQUEST_STATUS.REQUESTED,
        coachApprovedAt: null,
        coachApprovedBy: null,
        adminApprovedAt: null,
        adminApprovedBy: null,
        rejectedReason: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'req_demo_2',
        studentId: 'student_2',
        studentName: '이서연',
        studentBirthYear: 2017,
        parentPhone: '010-2345-6789',
        originalClassId: 'class_3',
        originalClassName: '초등저 A',
        originalDate: '2026-02-05',
        originalTime: '16:00',
        originalCoachId: 'coach_1',
        targetClassId: 'class_4',
        targetClassName: '초등저 B',
        targetDate: '2026-02-06',
        targetTime: '16:00',
        targetCoachId: 'coach_2',
        targetCoachName: '박코치',
        classType: 'team',
        status: REQUEST_STATUS.COACH_APPROVED,
        coachApprovedAt: new Date().toISOString(),
        coachApprovedBy: 'coach_2',
        adminApprovedAt: null,
        adminApprovedBy: null,
        rejectedReason: null,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    saveRequests(demoRequests);
    return { success: true, data: demoRequests };
  },
};

export default makeupRequestService;
