/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🤖 카카오 i 오픈빌더 챗봇 스킬 서버
 * 
 * 카카오톡 대화창 내에서 버튼 클릭 → 바로 응답
 * - 출석/결석 버튼 처리
 * - 보충수업 선택
 * - 보충 확정
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { supabase } from '../lib/supabase';
import { env } from '../config/env';
import { EXTERNAL_APIS } from '../config/api-endpoints';

// ═══════════════════════════════════════════════════════════════
// 타입 정의
// ═══════════════════════════════════════════════════════════════

// 카카오 스킬 요청 형식
export interface KakaoSkillRequest {
  intent: {
    id: string;
    name: string;
  };
  userRequest: {
    user: {
      id: string;
      properties: {
        plusfriendUserKey: string;
      };
    };
    utterance: string;
  };
  action: {
    clientExtra: Record<string, unknown>;
  };
}

// 카카오 스킬 응답 형식
export interface KakaoSkillResponse {
  version: '2.0';
  template: {
    outputs: KakaoOutput[];
    quickReplies?: KakaoQuickReply[];
  };
}

interface KakaoOutput {
  simpleText?: { text: string };
  basicCard?: KakaoBasicCard;
  carousel?: { type: string; items: KakaoBasicCard[] };
}

interface KakaoBasicCard {
  title: string;
  description?: string;
  thumbnail?: { imageUrl: string };
  buttons?: KakaoButton[];
}

interface KakaoButton {
  action: 'block' | 'webLink' | 'message';
  label: string;
  blockId?: string;
  webLinkUrl?: string;
  messageText?: string;
  extra?: Record<string, unknown>;
}

interface KakaoQuickReply {
  action: 'block' | 'message';
  label: string;
  blockId?: string;
  messageText?: string;
  extra?: Record<string, unknown>;
}

// ═══════════════════════════════════════════════════════════════
// 환경 변수
// ═══════════════════════════════════════════════════════════════

const BLOCK_IDS = {
  ATTEND: env.messaging.kakao.blockIds.attend,
  ABSENT: env.messaging.kakao.blockIds.absent,
  MAKEUP_SELECT: env.messaging.kakao.blockIds.makeupSelect,
  MAKEUP_CONFIRM: env.messaging.kakao.blockIds.makeupConfirm,
};

// ═══════════════════════════════════════════════════════════════
// 응답 빌더
// ═══════════════════════════════════════════════════════════════

function buildResponse(
  outputs: KakaoOutput[],
  quickReplies?: KakaoQuickReply[]
): KakaoSkillResponse {
  return {
    version: '2.0',
    template: {
      outputs,
      ...(quickReplies && { quickReplies }),
    },
  };
}

function textResponse(text: string): KakaoSkillResponse {
  return buildResponse([{ simpleText: { text } }]);
}

function cardWithButtons(
  title: string,
  description: string,
  buttons: KakaoButton[]
): KakaoSkillResponse {
  return buildResponse([
    {
      basicCard: {
        title,
        description,
        buttons,
      },
    },
  ]);
}

// ═══════════════════════════════════════════════════════════════
// 스킬 핸들러
// ═══════════════════════════════════════════════════════════════

/**
 * 수업 리마인더 메시지 생성 (채널 메시지 발송용)
 */
export async function buildLessonReminderMessage(params: {
  studentName: string;
  lessonId: string;
  studentId: string;
  lessonDate: string;
  lessonTime: string;
  location: string;
  coachName: string;
}): Promise<KakaoSkillResponse> {
  return cardWithButtons(
    '🏀 수업 알림',
    `${params.studentName} 학생의 수업이 내일 예정되어 있습니다.\n\n📅 ${params.lessonDate} ${params.lessonTime}\n📍 ${params.location}\n👨‍🏫 ${params.coachName}`,
    [
      {
        action: 'block',
        label: '✅ 출석 예정',
        blockId: BLOCK_IDS.ATTEND,
        extra: {
          lessonId: params.lessonId,
          studentId: params.studentId,
          response: 'ATTEND',
        },
      },
      {
        action: 'block',
        label: '❌ 결석 신청',
        blockId: BLOCK_IDS.ABSENT,
        extra: {
          lessonId: params.lessonId,
          studentId: params.studentId,
          response: 'ABSENT',
        },
      },
    ]
  );
}

/**
 * 출석 확인 스킬 핸들러
 */
export async function handleAttendSkill(
  request: KakaoSkillRequest
): Promise<KakaoSkillResponse> {
  const { lessonId, studentId } = request.action.clientExtra;
  const userKey = request.userRequest.user.properties.plusfriendUserKey;

  try {
    // 학생 정보 조회
    const { data: student } = await supabase
      .from('students')
      .select('name')
      .eq('id', studentId)
      .single();

    // 수업 정보 조회
    const { data: lesson } = await supabase
      .from('lesson_slots')
      .select('*')
      .eq('id', lessonId)
      .single();

    // 출석 응답 기록
    await supabase.from('attendance_responses').insert({
      lesson_id: lessonId,
      student_id: studentId,
      response_type: 'ATTEND',
      kakao_user_key: userKey,
    });

    return textResponse(
      `✅ 출석이 확인되었습니다!\n\n` +
      `${student?.name || ''} 학생\n` +
      `📅 ${lesson?.date} ${lesson?.start_time}\n` +
      `📍 ${lesson?.location}\n\n` +
      `내일 뵙겠습니다! 🏀`
    );
  } catch (error: unknown) {
    if (__DEV__) console.error('출석 확인 오류:', error);
    return textResponse('처리 중 오류가 발생했습니다. 학원으로 연락해주세요.');
  }
}

/**
 * 결석 신청 스킬 핸들러 → 보충수업 옵션 표시
 */
export async function handleAbsentSkill(
  request: KakaoSkillRequest
): Promise<KakaoSkillResponse> {
  const { lessonId, studentId } = request.action.clientExtra;
  const userKey = request.userRequest.user.properties.plusfriendUserKey;

  try {
    // 학생 정보 조회
    const { data: student } = await supabase
      .from('students')
      .select('name')
      .eq('id', studentId)
      .single();

    // 결석 기록
    const { data: absence } = await supabase
      .from('absences')
      .insert({
        lesson_id: lessonId,
        student_id: studentId,
        status: 'PENDING_MAKEUP',
        kakao_user_key: userKey,
      })
      .select()
      .single();

    // 보충 슬롯 조회
    const { data: slots } = await supabase
      .from('makeup_slots')
      .select('*')
      .gt('available_spots', 0)
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date', { ascending: true })
      .limit(5);

    if (!slots || slots.length === 0) {
      return textResponse(
        `결석이 확인되었습니다.\n\n` +
        `현재 예약 가능한 보충수업이 없습니다.\n` +
        `학원으로 연락해주세요.\n` +
        `📞 02-1234-5678`
      );
    }

    // 보충수업 선택 버튼 생성
    const quickReplies: KakaoQuickReply[] = slots.map((slot) => ({
      action: 'block' as const,
      label: formatSlotLabel(slot.date, slot.time),
      blockId: BLOCK_IDS.MAKEUP_CONFIRM,
      extra: {
        absenceId: absence?.id,
        slotId: slot.id,
        studentId,
        slotDate: slot.date,
        slotTime: slot.time,
        slotLocation: slot.location,
      },
    }));

    return buildResponse(
      [
        {
          simpleText: {
            text: `${student?.name || ''} 학생의 결석이 확인되었습니다.\n\n보충수업 날짜를 선택해주세요. 👇`,
          },
        },
      ],
      quickReplies
    );
  } catch (error: unknown) {
    if (__DEV__) console.error('결석 처리 오류:', error);
    return textResponse('처리 중 오류가 발생했습니다. 학원으로 연락해주세요.');
  }
}

/**
 * 보충수업 확정 스킬 핸들러
 */
export async function handleMakeupConfirmSkill(
  request: KakaoSkillRequest
): Promise<KakaoSkillResponse> {
  const { absenceId, slotId, studentId, slotDate, slotTime, slotLocation } =
    request.action.clientExtra;

  try {
    // 슬롯 잔여 확인
    const { data: slot } = await supabase
      .from('makeup_slots')
      .select('available_spots, coach_name')
      .eq('id', slotId)
      .single();

    if (!slot || slot.available_spots <= 0) {
      return textResponse(
        `죄송합니다. 선택하신 시간이 마감되었습니다.\n\n` +
        `다른 시간을 선택하시거나 학원으로 연락해주세요.\n` +
        `📞 02-1234-5678`
      );
    }

    // 학생 정보
    const { data: student } = await supabase
      .from('students')
      .select('name')
      .eq('id', studentId)
      .single();

    // 보충수업 확정
    await supabase
      .from('absences')
      .update({
        makeup_slot_id: slotId,
        status: 'MAKEUP_SCHEDULED',
        makeup_scheduled_at: new Date().toISOString(),
      })
      .eq('id', absenceId);

    // 슬롯 자리 감소
    await supabase
      .from('makeup_slots')
      .update({ available_spots: slot.available_spots - 1 })
      .eq('id', slotId);

    return textResponse(
      `🎉 보충수업이 확정되었습니다!\n\n` +
      `${student?.name || ''} 학생\n` +
      `📅 ${formatDate(slotDate)} ${slotTime}\n` +
      `📍 ${slotLocation}\n` +
      `👨‍🏫 ${slot.coach_name || ''}\n\n` +
      `변경이 필요하시면 학원으로 연락주세요.\n` +
      `📞 02-1234-5678`
    );
  } catch (error: unknown) {
    if (__DEV__) console.error('보충 확정 오류:', error);
    return textResponse('처리 중 오류가 발생했습니다. 학원으로 연락해주세요.');
  }
}

// ═══════════════════════════════════════════════════════════════
// 유틸리티
// ═══════════════════════════════════════════════════════════════

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${date.getMonth() + 1}/${date.getDate()}(${days[date.getDay()]})`;
}

function formatSlotLabel(date: string, time: string): string {
  return `${formatDate(date)} ${time}`;
}

// ═══════════════════════════════════════════════════════════════
// 채널 메시지 발송 (Push)
// ═══════════════════════════════════════════════════════════════

const OPENBUILDER_API_KEY = env.messaging.kakao.openbuilderApiKey;
const BOT_ID = env.messaging.kakao.openbuilderId;

/**
 * 카카오톡 채널 메시지 발송 (챗봇 메시지)
 */
export async function sendChannelMessage(params: {
  plusFriendUserKey: string;
  message: KakaoSkillResponse;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(
      EXTERNAL_APIS.kakao.chatbot.send(BOT_ID),
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: OPENBUILDER_API_KEY,
        },
        body: JSON.stringify({
          target: {
            plusFriendUserKey: params.plusFriendUserKey,
          },
          template: params.message.template,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    return { success: true };
  } catch (error: unknown) {
    if (__DEV__) console.error('채널 메시지 발송 실패:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * 수업 리마인더 발송 (채널 메시지)
 */
export async function sendLessonReminderToChannel(params: {
  plusFriendUserKey: string;
  studentName: string;
  lessonId: string;
  studentId: string;
  lessonDate: string;
  lessonTime: string;
  location: string;
  coachName: string;
}): Promise<{ success: boolean; error?: string }> {
  const message = await buildLessonReminderMessage({
    studentName: params.studentName,
    lessonId: params.lessonId,
    studentId: params.studentId,
    lessonDate: params.lessonDate,
    lessonTime: params.lessonTime,
    location: params.location,
    coachName: params.coachName,
  });

  return sendChannelMessage({
    plusFriendUserKey: params.plusFriendUserKey,
    message,
  });
}

// ═══════════════════════════════════════════════════════════════
// Export
// ═══════════════════════════════════════════════════════════════

export default {
  handleAttendSkill,
  handleAbsentSkill,
  handleMakeupConfirmSkill,
  buildLessonReminderMessage,
  sendChannelMessage,
  sendLessonReminderToChannel,
};
