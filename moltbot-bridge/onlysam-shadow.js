/**
 * 온리쌤 그림자 운영 - 몰트봇 → session_timelines
 * MOLTBOT_SHADOW_STRATEGY.md 매핑
 */

const ONLYSAM_URL = process.env.ONLYSAM_SUPABASE_URL || process.env.SUPABASE_URL;
const ONLYSAM_KEY = process.env.ONLYSAM_SERVICE_KEY || process.env.SUPABASE_SERVICE_KEY;

function isOnlysamConfigured() {
  return !!(ONLYSAM_URL && ONLYSAM_KEY);
}

async function sendTimelineEvent(eventKey, studentName = null) {
  if (!isOnlysamConfigured()) {
    return { success: false, error: 'not_configured', message: '온리쌤 연동이 설정되지 않았습니다. ONLYSAM_SUPABASE_URL, ONLYSAM_SERVICE_KEY 확인.' };
  }
  const url = `${ONLYSAM_URL.replace(/\/$/, '')}/functions/v1/moltbot-timeline`;
  const body = { event_key: eventKey, meta: { source: 'moltbot' } };
  if (studentName) body.student_name = studentName.trim();

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ONLYSAM_KEY}`,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch((err) => {
      console.warn('[OnlySam] JSON parse failed:', err?.message || err);
      return {};
    });
    if (!res.ok) {
      return { success: false, error: data.error || 'request_failed', message: data.message || res.statusText };
    }
    return data;
  } catch (e) {
    return { success: false, error: 'network', message: e.message };
  }
}

function setupOnlysamShadowCommands(bot) {
  const prefix = '📚 *온리쌤 그림자*';

  // /수업시작
  bot.onText(/\/수업시작/, async (msg) => {
    const chatId = msg.chat.id;
    const result = await sendTimelineEvent('SESSION_START');
    if (result.success) {
      bot.sendMessage(chatId, `${prefix}\n\n[${new Date().toLocaleTimeString('ko-KR')}]\n✅ 수업 시작됨`, { parse_mode: 'Markdown' });
    } else {
      bot.sendMessage(chatId, `${prefix}\n\n❌ ${result.message || result.error}`, { parse_mode: 'Markdown' });
    }
  });

  // /출석 학생이름
  bot.onText(/\/출석\s+(.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const name = match[1].trim();
    const result = await sendTimelineEvent('ATTENDANCE_PRESENT', name);
    if (result.success) {
      bot.sendMessage(chatId, `${prefix}\n\n출석 완료: *${name}*`, { parse_mode: 'Markdown' });
    } else {
      bot.sendMessage(chatId, `${prefix}\n\n❌ ${result.message || result.error}`, { parse_mode: 'Markdown' });
    }
  });

  // /결석 학생이름
  bot.onText(/\/결석\s+(.+)/, async (msg, match) => {
    const chatId = msg.chat.id;
    const name = match[1].trim();
    const result = await sendTimelineEvent('ATTENDANCE_ABSENT', name);
    if (result.success) {
      bot.sendMessage(chatId, `${prefix}\n\n결석: *${name}*`, { parse_mode: 'Markdown' });
    } else {
      bot.sendMessage(chatId, `${prefix}\n\n❌ ${result.message || result.error}`, { parse_mode: 'Markdown' });
    }
  });

  // /훈련전환
  bot.onText(/\/훈련전환/, async (msg) => {
    const chatId = msg.chat.id;
    const result = await sendTimelineEvent('DRILL_CHANGE');
    if (result.success) {
      bot.sendMessage(chatId, `${prefix}\n\n⏱️ 훈련 전환 기록됨`, { parse_mode: 'Markdown' });
    } else {
      bot.sendMessage(chatId, `${prefix}\n\n❌ ${result.message || result.error}`, { parse_mode: 'Markdown' });
    }
  });

  // /사고
  bot.onText(/\/사고/, async (msg) => {
    const chatId = msg.chat.id;
    const result = await sendTimelineEvent('INCIDENT');
    if (result.success) {
      bot.sendMessage(chatId, `${prefix}\n\n⚠️ 사고 기록됨`, { parse_mode: 'Markdown' });
    } else {
      bot.sendMessage(chatId, `${prefix}\n\n❌ ${result.message || result.error}`, { parse_mode: 'Markdown' });
    }
  });

  // /수업종료
  bot.onText(/\/수업종료/, async (msg) => {
    const chatId = msg.chat.id;
    const result = await sendTimelineEvent('SESSION_END');
    if (result.success) {
      bot.sendMessage(chatId, `${prefix}\n\n[${new Date().toLocaleTimeString('ko-KR')}]\n🏁 수업 종료\n기록 생성 중…`, { parse_mode: 'Markdown' });
    } else {
      bot.sendMessage(chatId, `${prefix}\n\n❌ ${result.message || result.error}`, { parse_mode: 'Markdown' });
    }
  });
}

export { isOnlysamConfigured, sendTimelineEvent, setupOnlysamShadowCommands };
