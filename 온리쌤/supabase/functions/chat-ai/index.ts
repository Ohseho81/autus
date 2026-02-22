/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Chat AI - 승원봇 AI 대화 Edge Function
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 앱(SeungwonBot) -> supabase.functions.invoke('chat-ai') -> Claude API -> 응답
 *
 * 요청: { messages, screenshot?, deviceInfo? }
 * 응답: { ok: true, data: { reply: string } }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const FUNCTION_NAME = 'chat-ai';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function log(message: string, data?: unknown) {
  console.log(`[${FUNCTION_NAME}] [${new Date().toISOString()}] ${message}`, data !== undefined ? data : '');
}

function logError(message: string, error?: unknown) {
  console.error(`[${FUNCTION_NAME}] [${new Date().toISOString()}] ${message}`, error !== undefined ? error : '');
}

const SYSTEM_PROMPT = `너는 '승원봇'이야. 농구 학원 관리 앱 AUTUS의 UI/UX 전문 피드백 봇이야.

역할:
- 사용자가 보고하는 UI/UX 문제(레이아웃 깨짐, 버튼 위치, 폰트 크기, 색상, 간격, 동선 불편 등)를 정확히 파악해
- "뭐가 → 어떻게 불편한지" 가 빠지면 자연스럽게 물어봐
- 피드백을 받으면 구체적으로 어떻게 개선할 수 있는지 제안도 해줘

화면 컨텍스트:
- 사용자 메시지에 [현재 화면: OOO] 태그가 붙어있으면, 사용자가 그 화면을 보면서 피드백하는 거야
- 이 정보를 활용해서 "아, 지금 보고 계신 OOO 화면이군요!" 처럼 자연스럽게 대화해
- [현재 화면] 태그 자체를 반복하지 말고, 자연스럽게 녹여서 대화해

앱 화면 구조:
- 관리자: 모니터, Outcome 대시보드, 회원 관리, 회원 상세, 일정, 설정, 감사 기록
- 코치: 코치 홈, 출석 체크, 영상 업로드
- 학부모: 학부모 홈, 예약, 현황, 기록, 결제

스크린샷:
- 사용자가 스크린샷을 첨부하면 해당 화면을 직접 보고 분석해
- 스크린샷에서 보이는 구체적 요소(버튼, 텍스트, 색상, 레이아웃)를 언급하며 대화해
- "캡처해주신 화면을 보니..." 처럼 자연스럽게 시작해

규칙:
- 한국어로 짧고 친근하게 (2-3문장)
- 이모지 적절히 사용
- UI/UX와 무관한 질문이 오면 "저는 UI/UX 피드백 전문이에요! 화면이나 디자인 관련 불편한 점을 알려주세요 🎨" 라고 안내해`;

/** Maximum number of messages allowed per request to prevent abuse */
const MAX_MESSAGES = 50;

/** Maximum screenshot base64 size (~300KB raw) */
const MAX_SCREENSHOT_LENGTH = 400_000;

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Method validation
  if (req.method !== 'POST') {
    log(`Rejected method: ${req.method}`);
    return new Response(
      JSON.stringify({ ok: false, error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Content-Type validation
    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      log(`Invalid content-type: ${contentType}`);
      return new Response(
        JSON.stringify({ ok: false, error: 'Content-Type must be application/json', code: 'INVALID_CONTENT_TYPE' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Environment validation
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      logError('ANTHROPIC_API_KEY not configured');
      return new Response(
        JSON.stringify({ ok: false, error: 'AI service not configured', code: 'ENV_MISSING' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse body
    let body: { messages?: unknown; screenshot?: unknown; deviceInfo?: unknown };
    try {
      body = await req.json();
    } catch (_parseError) {
      log('Failed to parse JSON body');
      return new Response(
        JSON.stringify({ ok: false, error: 'Invalid JSON body', code: 'INVALID_JSON' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { messages, screenshot, deviceInfo } = body;

    // Validate messages field
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      log('Missing or empty messages array');
      return new Response(
        JSON.stringify({ ok: false, error: 'messages array is required and must not be empty', code: 'MISSING_FIELD' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (messages.length > MAX_MESSAGES) {
      log(`Too many messages: ${messages.length}`);
      return new Response(
        JSON.stringify({ ok: false, error: `Too many messages. Maximum is ${MAX_MESSAGES}`, code: 'PAYLOAD_TOO_LARGE' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate each message has role and content
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      if (!msg || typeof msg !== 'object' || !msg.role || !msg.content) {
        log(`Invalid message at index ${i}: missing role or content`);
        return new Response(
          JSON.stringify({ ok: false, error: `Invalid message at index ${i}: each message must have role and content`, code: 'INVALID_MESSAGE_FORMAT' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    log(`Request: ${messages.length} messages, screenshot=${!!screenshot}, deviceInfo=${!!deviceInfo}`);

    // Screenshot validation (300KB base64 = ~225KB raw)
    const validScreenshot = screenshot && typeof screenshot === 'string' && screenshot.length < MAX_SCREENSHOT_LENGTH
      ? screenshot
      : null;

    if (screenshot && !validScreenshot) {
      log(`Screenshot too large or invalid, skipping: ${typeof screenshot === 'string' ? Math.round(screenshot.length / 1024) + 'KB' : typeof screenshot}`);
    }

    // Attach screenshot to first user message if present (Claude Vision)
    const apiMessages = messages.map((msg: { role: string; content: string }, idx: number) => {
      if (validScreenshot && idx === 0 && msg.role === 'user') {
        return {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/jpeg',
                data: validScreenshot,
              },
            },
            { type: 'text', text: msg.content },
          ],
        };
      }
      return msg;
    });

    const systemPrompt = deviceInfo
      ? `${SYSTEM_PROMPT}\n\n사용자 기기: ${deviceInfo}\n- 이 기기 정보를 참고해서 화면 크기에 맞는 UI 제안을 해줘 (예: 작은 화면이면 터치 영역 더 크게, 태블릿이면 여백 활용 등)`
      : SYSTEM_PROMPT;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 300,
        system: systemPrompt,
        messages: apiMessages,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      logError(`Claude API error: ${response.status}`, errorBody);

      // Return appropriate status based on upstream error
      const upstreamStatus = response.status;
      const clientStatus = upstreamStatus === 429 ? 429 : upstreamStatus >= 500 ? 502 : 500;
      const code = upstreamStatus === 429 ? 'RATE_LIMITED' : 'AI_API_ERROR';

      return new Response(
        JSON.stringify({ ok: false, error: `AI service error (${upstreamStatus})`, code }),
        { status: clientStatus, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const reply = data.content?.[0]?.text || '응답을 생성하지 못했어요.';

    log(`Reply generated: ${reply.length} chars`);

    return new Response(
      JSON.stringify({ ok: true, data: { reply } }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logError('Unhandled error:', error);
    return new Response(
      JSON.stringify({ ok: false, error: message, code: 'INTERNAL_ERROR' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
