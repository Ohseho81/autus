/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📱 수업 피드백 & 보충수업 시스템
 * 
 * 흐름:
 * 1. 수업 리마인더 알림톡 발송 (출석/결석 버튼)
 * 2. 결석 버튼 클릭 → 웹페이지에서 보충 날짜 선택
 * 3. 보충 확정 알림톡 발송
 * 4. Supabase에 기록
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { supabase } from '../lib/supabase';
import { sendAlimtalk, AlimtalkTemplateCode } from './kakaoAlimtalk';

// ═══════════════════════════════════════════════════════════════
// 타입 정의
// ═══════════════════════════════════════════════════════════════

export type AttendanceResponse = 'ATTEND' | 'ABSENT';
export type MakeupStatus = 'PENDING' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';

export interface LessonReminder {
  lessonId: string;
  studentId: string;
  studentName: string;
  parentPhone: string;
  parentName: string;
  lessonName: string;
  lessonDate: string;
  lessonTime: string;
  location: string;
  coachName: string;
}

export interface AbsenceRequest {
  lessonId: string;
  studentId: string;
  reason?: string;
  preferredDates?: string[]; // 희망 보충 날짜들
}

export interface MakeupSlot {
  id: string;
  date: string;
  time: string;
  location: string;
  coachName: string;
  availableSpots: number;
}

// ═══════════════════════════════════════════════════════════════
// 알림톡 템플릿 (추가)
// ═══════════════════════════════════════════════════════════════

export const FEEDBACK_TEMPLATES = {
  // 수업 리마인더 (출석/결석 버튼 포함)
  LESSON_REMIND_WITH_RESPONSE: {
    templateCode: 'ATB_LESSON_RESPOND' as AlimtalkTemplateCode,
    content: `[온리쌤] 수업 알림

안녕하세요, #{parentName}님!

#{studentName} 학생의 수업이 내일 예정되어 있습니다.

🏀 수업: #{lessonName}
📅 일시: #{lessonDate} #{lessonTime}
📍 장소: #{location}
👨‍🏫 코치: #{coachName}

출석 여부를 알려주세요!`,
    buttons: [
      {
        name: '✅ 출석 예정',
        type: 'WL',
        urlMobile: '#{baseUrl}/attendance/confirm?token=#{token}&response=ATTEND'
      },
      {
        name: '❌ 결석 신청',
        type: 'WL', 
        urlMobile: '#{baseUrl}/attendance/absent?token=#{token}'
      }
    ]
  },

  // 보충수업 안내
  MAKEUP_OPTIONS: {
    templateCode: 'ATB_MAKEUP_OPTIONS' as AlimtalkTemplateCode,
    content: `[온리쌤] 보충수업 안내

안녕하세요, #{parentName}님!

#{studentName} 학생의 결석이 확인되었습니다.
아래 일정 중 보충수업을 선택해주세요.

#{makeupOptions}

※ 선착순 마감될 수 있습니다.`,
    buttons: [
      {
        name: '보충수업 선택하기',
        type: 'WL',
        urlMobile: '#{baseUrl}/makeup/select?token=#{token}'
      }
    ]
  },

  // 보충수업 확정
  MAKEUP_CONFIRMED: {
    templateCode: 'ATB_MAKEUP_CONFIRMED' as AlimtalkTemplateCode,
    content: `[온리쌤] 보충수업 확정

안녕하세요, #{parentName}님!

#{studentName} 학생의 보충수업이 확정되었습니다.

🏀 수업: #{lessonName}
📅 일시: #{makeupDate} #{makeupTime}
📍 장소: #{location}
👨‍🏫 코치: #{coachName}

변경이 필요하시면 학원으로 연락주세요.
📞 #{academyPhone}`,
    buttons: [
      {
        name: '일정 확인하기',
        type: 'WL',
        urlMobile: '#{baseUrl}/schedule?studentId=#{studentId}'
      }
    ]
  },

  // 출석 확인 완료
  ATTENDANCE_CONFIRMED: {
    templateCode: 'ATB_ATTEND_CONFIRMED' as AlimtalkTemplateCode,
    content: `[온리쌤] 출석 확인

안녕하세요, #{parentName}님!

#{studentName} 학생의 출석 예정이 확인되었습니다.

🏀 수업: #{lessonName}
📅 일시: #{lessonDate} #{lessonTime}
📍 장소: #{location}

내일 뵙겠습니다! 🏀`,
  }
};

// ═══════════════════════════════════════════════════════════════
// 웹 BASE URL
// ═══════════════════════════════════════════════════════════════

const BASE_URL = process.env.EXPO_PUBLIC_WEB_URL || 'https://onlyssam.app';

// ═══════════════════════════════════════════════════════════════
// 토큰 생성/검증
// ═══════════════════════════════════════════════════════════════

/**
 * 응답 토큰 생성 (URL에 포함)
 */
export function generateResponseToken(params: {
  lessonId: string;
  studentId: string;
  expiresIn?: number; // 시간 (기본 48시간)
}): string {
  const payload = {
    lessonId: params.lessonId,
    studentId: params.studentId,
    exp: Date.now() + (params.expiresIn || 48) * 60 * 60 * 1000,
    nonce: Math.random().toString(36).substring(2),
  };
  
  // Base64 인코딩 (실제로는 JWT 사용 권장)
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

/**
 * 토큰 검증
 */
export function verifyResponseToken(token: string): {
  valid: boolean;
  lessonId?: string;
  studentId?: string;
  error?: string;
} {
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64url').toString());
    
    if (payload.exp < Date.now()) {
      return { valid: false, error: '토큰이 만료되었습니다.' };
    }
    
    return {
      valid: true,
      lessonId: payload.lessonId,
      studentId: payload.studentId,
    };
  } catch (e: unknown) {
    return { valid: false, error: '유효하지 않은 토큰입니다.' };
  }
}

// ═══════════════════════════════════════════════════════════════
// 주요 함수
// ═══════════════════════════════════════════════════════════════

/**
 * 1. 수업 리마인더 발송 (출석/결석 버튼 포함)
 */
export async function sendLessonReminderWithResponse(
  reminder: LessonReminder
): Promise<{ success: boolean; token: string; error?: string }> {
  const token = generateResponseToken({
    lessonId: reminder.lessonId,
    studentId: reminder.studentId,
  });

  try {
    // DB에 토큰 저장
    const { error: insertError } = await supabase.from('attendance_response_tokens').insert({
      token,
      lesson_id: reminder.lessonId,
      student_id: reminder.studentId,
      parent_phone: reminder.parentPhone,
      status: 'PENDING',
      expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    });

    if (insertError) {
      if (__DEV__) console.error('[LessonFeedback] Token insert error:', insertError);
      return { success: false, token: '', error: '토큰 저장 실패' };
    }

    // 알림톡 발송
    const result = await sendAlimtalk({
      templateCode: 'ATB_LESSON_REMIND' as AlimtalkTemplateCode, // 기존 템플릿 사용
      recipient: { phone: reminder.parentPhone, name: reminder.parentName },
      variables: {
        parentName: reminder.parentName,
        studentName: reminder.studentName,
        lessonName: reminder.lessonName,
        lessonDate: reminder.lessonDate,
        lessonTime: reminder.lessonTime,
        location: reminder.location,
        coachName: reminder.coachName,
        // 버튼 URL에 토큰 포함
        baseUrl: BASE_URL,
        token: token,
      },
    });

    return {
      success: result.success,
      token,
      error: result.error,
    };
  } catch (err: unknown) {
    if (__DEV__) console.error('[LessonFeedback] sendLessonReminder error:', err);
    return { success: false, token: '', error: '리마인더 발송 실패' };
  }
}

/**
 * 2. 출석 응답 처리
 */
export async function handleAttendanceResponse(
  token: string,
  response: AttendanceResponse
): Promise<{ success: boolean; error?: string }> {
  // 토큰 검증
  const verification = verifyResponseToken(token);
  if (!verification.valid) {
    return { success: false, error: verification.error };
  }

  const { lessonId, studentId } = verification;

  // 토큰 상태 업데이트
  const { data: tokenData, error: tokenError } = await supabase
    .from('attendance_response_tokens')
    .update({
      status: response,
      responded_at: new Date().toISOString(),
    })
    .eq('token', token)
    .eq('status', 'PENDING')
    .select()
    .single();

  if (tokenError || !tokenData) {
    return { success: false, error: '이미 처리되었거나 유효하지 않은 요청입니다.' };
  }

  // 출석 예정 기록
  const { error: responseInsertError } = await supabase.from('attendance_responses').insert({
    lesson_id: lessonId,
    student_id: studentId,
    response_type: response,
    responded_at: new Date().toISOString(),
  });

  if (responseInsertError) {
    if (__DEV__) console.error('[LessonFeedback] Response insert error:', responseInsertError);
    return { success: false, error: '응답 기록 저장 실패' };
  }

  if (response === 'ATTEND') {
    // 출석 확인 알림톡 발송
    const student = await getStudentInfo(studentId!);
    const lesson = await getLessonInfo(lessonId!);
    
    if (student && lesson) {
      await sendAlimtalk({
        templateCode: 'ATB_ATTENDANCE' as AlimtalkTemplateCode,
        recipient: { phone: student.parentPhone, name: student.parentName },
        variables: {
          parentName: student.parentName,
          studentName: student.name,
          lessonName: lesson.name,
          lessonDate: lesson.date,
          lessonTime: lesson.time,
          location: lesson.location,
        },
      });
    }
  }

  return { success: true };
}

/**
 * 3. 결석 신청 처리 → 보충수업 옵션 발송
 */
export async function handleAbsenceRequest(
  token: string,
  request: AbsenceRequest
): Promise<{ success: boolean; makeupSlots?: MakeupSlot[]; error?: string }> {
  // 토큰 검증
  const verification = verifyResponseToken(token);
  if (!verification.valid) {
    return { success: false, error: verification.error };
  }

  const { lessonId, studentId } = verification;

  // 결석 기록
  const { data: absence, error: absenceError } = await supabase
    .from('absences')
    .insert({
      lesson_id: lessonId,
      student_id: studentId,
      reason: request.reason,
      status: 'PENDING_MAKEUP',
      requested_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (absenceError) {
    return { success: false, error: '결석 신청 처리 중 오류가 발생했습니다.' };
  }

  // 토큰 상태 업데이트
  await supabase
    .from('attendance_response_tokens')
    .update({
      status: 'ABSENT',
      responded_at: new Date().toISOString(),
    })
    .eq('token', token);

  // 보충수업 가능 슬롯 조회
  const makeupSlots = await getAvailableMakeupSlots(lessonId!, studentId!);

  // 학생 정보 조회
  const student = await getStudentInfo(studentId!);

  if (student && makeupSlots.length > 0) {
    // 보충수업 안내 알림톡 발송
    const makeupOptionsText = makeupSlots
      .slice(0, 3)
      .map((slot, i) => `${i + 1}. ${slot.date} ${slot.time} (${slot.location})`)
      .join('\n');

    const makeupToken = generateResponseToken({
      lessonId: absence.id, // 결석 ID를 보충 선택에 사용
      studentId: studentId!,
    });

    await sendAlimtalk({
      templateCode: 'ATB_PAYMENT_DUE' as AlimtalkTemplateCode, // 임시 템플릿
      recipient: { phone: student.parentPhone, name: student.parentName },
      variables: {
        parentName: student.parentName,
        studentName: student.name,
        remainingLessons: '보충',
        recommendedPackage: makeupOptionsText,
        packagePrice: '0',
        academyPhone: '02-1234-5678',
        baseUrl: BASE_URL,
        token: makeupToken,
      },
    });
  }

  return { success: true, makeupSlots };
}

/**
 * 4. 보충수업 선택 확정
 */
export async function confirmMakeupLesson(
  token: string,
  makeupSlotId: string
): Promise<{ success: boolean; error?: string }> {
  // 토큰 검증
  const verification = verifyResponseToken(token);
  if (!verification.valid) {
    return { success: false, error: verification.error };
  }

  const { lessonId: absenceId, studentId } = verification;

  // 보충 슬롯 조회
  const { data: slot, error: slotError } = await supabase
    .from('makeup_slots')
    .select('*')
    .eq('id', makeupSlotId)
    .gt('available_spots', 0)
    .single();

  if (slotError || !slot) {
    return { success: false, error: '선택하신 일정이 마감되었습니다.' };
  }

  // 보충수업 확정
  const { error: updateError } = await supabase
    .from('absences')
    .update({
      makeup_slot_id: makeupSlotId,
      status: 'MAKEUP_SCHEDULED',
      makeup_scheduled_at: new Date().toISOString(),
    })
    .eq('id', absenceId);

  if (updateError) {
    return { success: false, error: '보충수업 확정 중 오류가 발생했습니다.' };
  }

  // 슬롯 자리 감소
  await supabase
    .from('makeup_slots')
    .update({ available_spots: slot.available_spots - 1 })
    .eq('id', makeupSlotId);

  // 학생 정보 조회
  const student = await getStudentInfo(studentId!);

  if (student) {
    // 보충 확정 알림톡 발송
    await sendAlimtalk({
      templateCode: 'ATB_ATTENDANCE' as AlimtalkTemplateCode, // 임시 템플릿
      recipient: { phone: student.parentPhone, name: student.parentName },
      variables: {
        parentName: student.parentName,
        studentName: student.name,
        location: slot.location,
        checkInTime: `${slot.date} ${slot.time}`,
        lessonName: '보충수업',
      },
    });
  }

  return { success: true };
}

// ═══════════════════════════════════════════════════════════════
// 헬퍼 함수
// ═══════════════════════════════════════════════════════════════

async function getStudentInfo(studentId: string) {
  const { data } = await supabase
    .from('students')
    .select('id, name, parent_phone, parent_name')
    .eq('id', studentId)
    .single();
  
  return data ? {
    id: data.id,
    name: data.name,
    parentPhone: data.parent_phone,
    parentName: data.parent_name,
  } : null;
}

async function getLessonInfo(lessonId: string) {
  const { data } = await supabase
    .from('lesson_slots')
    .select('*')
    .eq('id', lessonId)
    .single();
  
  return data ? {
    id: data.id,
    name: data.name,
    date: data.date,
    time: data.start_time,
    location: data.location,
    coachName: data.coach_name,
  } : null;
}

async function getAvailableMakeupSlots(
  lessonId: string,
  studentId: string
): Promise<MakeupSlot[]> {
  const { data } = await supabase
    .from('makeup_slots')
    .select('*')
    .gt('available_spots', 0)
    .gte('date', new Date().toISOString().split('T')[0])
    .order('date', { ascending: true })
    .limit(5);

  return (data || []).map(slot => ({
    id: slot.id,
    date: slot.date,
    time: slot.time,
    location: slot.location,
    coachName: slot.coach_name,
    availableSpots: slot.available_spots,
  }));
}

// ═══════════════════════════════════════════════════════════════
// Export
// ═══════════════════════════════════════════════════════════════

export default {
  sendLessonReminderWithResponse,
  handleAttendanceResponse,
  handleAbsenceRequest,
  confirmMakeupLesson,
  generateResponseToken,
  verifyResponseToken,
};
