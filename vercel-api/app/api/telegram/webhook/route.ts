// ═══════════════════════════════════════════════════════════════════════════════
// 📱 AUTUS × Telegram Webhook Handler
// Telegram Bot API → AUTUS 명령 처리
// ═══════════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { sendTelegramMessage } from '@/lib/telegram';
import { getSupabaseAdmin } from '@/lib/supabase';

// ─────────────────────────────────────────────────────────────────────
// Telegram Update Types
// ─────────────────────────────────────────────────────────────────────

interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

interface TelegramChat {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  type: string;
}

interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
}

interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

// ─────────────────────────────────────────────────────────────────────
// Owner Chat ID (only respond to owner)
// ─────────────────────────────────────────────────────────────────────

const OWNER_CHAT_ID = process.env.TELEGRAM_OWNER_CHAT_ID || '';

// ─────────────────────────────────────────────────────────────────────
// Command Handlers
// ─────────────────────────────────────────────────────────────────────

async function handleCommand(command: string, chatId: number): Promise<string> {
  const supabase = getSupabaseAdmin();

  switch (command) {
    // ───── 상태 확인 ─────
    case '/status':
    case '/상태': {
      try {
        // DB 연결 확인
        const dbStart = Date.now();
        const { error: dbError } = await supabase.from('autus_nodes').select('id').limit(1);
        const dbLatency = Date.now() - dbStart;

        // 메모리 사용량
        const mem = process.memoryUsage();
        const memMB = Math.round(mem.heapUsed / 1024 / 1024);

        const dbStatus = dbError ? `❌ 오류: ${dbError.message}` : `✅ 정상 (${dbLatency}ms)`;

        return `📊 AUTUS 시스템 상태

🔧 API: ✅ 정상 (v2.1.0)
💾 DB: ${dbStatus}
🧠 메모리: ${memMB}MB
⏰ ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}`;
      } catch (e) {
        return `⚠️ 상태 확인 중 오류: ${e instanceof Error ? e.message : '알 수 없는 오류'}`;
      }
    }

    // ───── 학생 수 ─────
    case '/students':
    case '/학생': {
      try {
        const { count, error } = await supabase
          .from('students')
          .select('*', { count: 'exact', head: true });

        if (error) return `❌ 학생 조회 실패: ${error.message}`;
        return `👩‍🎓 등록 학생 수: ${count ?? 0}명`;
      } catch (e) {
        return `⚠️ 조회 오류: ${e instanceof Error ? e.message : '알 수 없는 오류'}`;
      }
    }

    // ───── 오늘 수업 ─────
    case '/today':
    case '/오늘': {
      try {
        const today = new Date().toISOString().split('T')[0];
        const { data, error } = await supabase
          .from('encounters')
          .select('title, start_time, student:students(name)')
          .gte('start_time', `${today}T00:00:00`)
          .lte('start_time', `${today}T23:59:59`)
          .order('start_time', { ascending: true })
          .limit(10);

        if (error) return `❌ 수업 조회 실패: ${error.message}`;
        if (!data || data.length === 0) return `📅 오늘 예정된 수업이 없습니다.`;

        const lines = data.map((e: any, i: number) => {
          const time = new Date(e.start_time).toLocaleTimeString('ko-KR', {
            timeZone: 'Asia/Seoul',
            hour: '2-digit',
            minute: '2-digit',
          });
          const name = e.student?.name ?? '미지정';
          return `${i + 1}. ${time} ${e.title} (${name})`;
        });

        return `📅 오늘의 수업 (${data.length}건)\n\n${lines.join('\n')}`;
      } catch (e) {
        return `⚠️ 조회 오류: ${e instanceof Error ? e.message : '알 수 없는 오류'}`;
      }
    }

    // ───── 미납 현황 ─────
    case '/overdue':
    case '/미납': {
      try {
        const { data, error } = await supabase
          .from('payments')
          .select('student:students(name), amount, due_date')
          .eq('status', 'overdue')
          .order('due_date', { ascending: true })
          .limit(10);

        if (error) return `❌ 미납 조회 실패: ${error.message}`;
        if (!data || data.length === 0) return `💰 미납 건이 없습니다! 👍`;

        const total = data.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
        const lines = data.map((p: any) => {
          const name = p.student?.name ?? '미지정';
          const amt = (p.amount || 0).toLocaleString();
          return `• ${name}: ${amt}원 (기한: ${p.due_date})`;
        });

        return `💰 미납 현황 (${data.length}건)\n총액: ${total.toLocaleString()}원\n\n${lines.join('\n')}`;
      } catch (e) {
        return `⚠️ 조회 오류: ${e instanceof Error ? e.message : '알 수 없는 오류'}`;
      }
    }

    // ───── 도움말 ─────
    case '/help':
    case '/start':
    case '/도움': {
      return `🤖 AUTUS 몰트봇 v2.1.0

📋 사용 가능한 명령어:

/status (/상태) - 시스템 상태 확인
/students (/학생) - 등록 학생 수
/today (/오늘) - 오늘 수업 일정
/overdue (/미납) - 미납 현황
/help (/도움) - 이 도움말

💡 한국어 명령어도 사용 가능합니다!`;
    }

    // ───── 알 수 없는 명령 ─────
    default:
      return `❓ 알 수 없는 명령: ${command}\n/help 로 사용 가능한 명령어를 확인하세요.`;
  }
}

// ─────────────────────────────────────────────────────────────────────
// POST Handler (Telegram Webhook)
// ─────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const update: TelegramUpdate = await request.json();

    // 메시지가 없으면 무시
    if (!update.message || !update.message.text) {
      return NextResponse.json({ ok: true });
    }

    const { chat, text } = update.message;
    const chatId = chat.id.toString();

    // Owner 전용 (보안)
    if (OWNER_CHAT_ID && chatId !== OWNER_CHAT_ID) {
      await sendTelegramMessage(chatId, '⛔ 인증되지 않은 사용자입니다.');
      return NextResponse.json({ ok: true });
    }

    // 명령어 추출 (첫 단어)
    const command = text.trim().split(/\s+/)[0].toLowerCase();

    // 명령 처리
    const response = await handleCommand(command, chat.id);

    // 응답 전송
    await sendTelegramMessage(chatId, response);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Telegram Webhook Error]', error);
    return NextResponse.json({ ok: true }); // Telegram에는 항상 200 반환
  }
}

// ─────────────────────────────────────────────────────────────────────
// GET (Webhook 상태 확인)
// ─────────────────────────────────────────────────────────────────────

export async function GET() {
  return NextResponse.json({
    service: 'autus-telegram-webhook',
    status: 'active',
    commands: ['/status', '/students', '/today', '/overdue', '/help'],
    timestamp: new Date().toISOString(),
  });
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
