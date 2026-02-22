import { getSupabaseAdmin } from '@/lib/supabase';
import { logger } from '@/lib/logger';

// ─── Types ───────────────────────────────────────────────
export interface VariantData {
  title_prefix: string;
  body: string;
  buttons: Array<{ type: string; name: string; url: string }>;
  kakao_template_code: string;
}

export interface RenderedMessage {
  kakao_template_code: string;
  body: string;
  buttons: Array<{ type: string; name: string; url_mobile?: string; url_pc?: string }>;
}

// ─── 1) loadVariant ──────────────────────────────────────
// Selection rule: academy override (active) → global active → error
export async function loadVariant(
  academy_id: string | null,
  template_key: string
): Promise<VariantData> {
  const client = getSupabaseAdmin();

  // Try academy-specific override first
  if (academy_id) {
    const { data: override } = await client
      .from('message_variants')
      .select('title_prefix, body, buttons')
      .eq('academy_id', academy_id)
      .eq('template_key', template_key)
      .eq('status', 'active')
      .order('version', { ascending: false })
      .limit(1);

    if (override && override.length > 0) {
      const v = override[0];
      const kakao_template_code = await getKakaoCode(template_key);
      logger.info('Loaded academy variant', { academy_id, template_key });
      return {
        title_prefix: v.title_prefix as string,
        body: v.body as string,
        buttons: v.buttons as Array<{ type: string; name: string; url: string }>,
        kakao_template_code,
      };
    }
  }

  // Fallback to global default (academy_id IS NULL)
  const { data: global } = await client
    .from('message_variants')
    .select('title_prefix, body, buttons')
    .is('academy_id', null)
    .eq('template_key', template_key)
    .eq('status', 'active')
    .order('version', { ascending: false })
    .limit(1);

  if (global && global.length > 0) {
    const v = global[0];
    const kakao_template_code = await getKakaoCode(template_key);
    logger.info('Loaded global variant', { template_key });
    return {
      title_prefix: v.title_prefix as string,
      body: v.body as string,
      buttons: v.buttons as Array<{ type: string; name: string; url: string }>,
      kakao_template_code,
    };
  }

  // No variant found → block send
  throw new Error(`No active variant found for template_key=${template_key}, academy_id=${academy_id}`);
}

// ─── 2) renderTemplate ──────────────────────────────────
// Replace all #{key} patterns with vars[key]. Error if unreplaced keys remain.
export function renderTemplate(
  template: string,
  vars: Record<string, string>
): string {
  let rendered = template;

  for (const [key, value] of Object.entries(vars)) {
    rendered = rendered.replace(new RegExp(`#\\{${key}\\}`, 'g'), value);
  }

  // Check for unreplaced variables
  const unreplaced = rendered.match(/#\{[^}]+\}/g);
  if (unreplaced && unreplaced.length > 0) {
    throw new Error(`Unreplaced template variables: ${unreplaced.join(', ')}`);
  }

  return rendered;
}

// ─── 3) buildKakaoPayload ───────────────────────────────
// Builds Kakao Alimtalk API payload from rendered content
export function buildKakaoPayload(
  kakao_template_code: string,
  rendered_body: string,
  rendered_buttons: Array<{ type: string; name: string; url: string }>,
  receiver_phone: string
): Record<string, unknown> {
  return {
    template_code: kakao_template_code,
    receiver_num: receiver_phone,
    content: rendered_body,
    buttons: rendered_buttons.map(btn => ({
      type: btn.type,
      name: btn.name,
      url_mobile: btn.url,
      url_pc: btn.url,
    })),
  };
}

// ─── 4) sendKakaoAlimtalk ───────────────────────────────
// Actual Kakao Alimtalk API call
export async function sendKakaoAlimtalk(
  payload: Record<string, unknown>
): Promise<{ success: boolean; message_id?: string; error?: string }> {
  const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY;
  const KAKAO_SENDER_KEY = process.env.KAKAO_SENDER_KEY;

  if (!KAKAO_REST_API_KEY || !KAKAO_SENDER_KEY) {
    throw new Error('Missing KAKAO_REST_API_KEY or KAKAO_SENDER_KEY environment variables');
  }

  const apiUrl = 'https://kapi.kakao.com/v2/api/talk/memo/default/send';

  try {
    const response = await fetch('https://bizmsg-web.kakaoenterprise.com/v1/message/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${KAKAO_REST_API_KEY}`,
        'X-Sender-Key': KAKAO_SENDER_KEY,
      },
      body: JSON.stringify({
        sender_key: KAKAO_SENDER_KEY,
        template_code: payload.template_code,
        receiver_num: payload.receiver_num,
        message: payload.content,
        button: payload.buttons,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      logger.error('Kakao API error', new Error(errorBody), {
        status: response.status,
        template_code: payload.template_code as string,
      });
      return { success: false, error: `HTTP ${response.status}: ${errorBody}` };
    }

    const result = await response.json() as Record<string, unknown>;
    logger.info('Kakao message sent', {
      template_code: payload.template_code,
      receiver: payload.receiver_num,
    });

    return { success: true, message_id: result.message_id as string | undefined };
  } catch (error) {
    logger.error('Kakao API request failed', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

// ─── Helper: get kakao_template_code from message_templates ─
async function getKakaoCode(template_key: string): Promise<string> {
  const client = getSupabaseAdmin();
  const { data, error } = await client
    .from('message_templates')
    .select('kakao_template_code')
    .eq('template_key', template_key)
    .limit(1);

  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error(`No kakao_template_code found for template_key=${template_key}`);
  }

  return data[0].kakao_template_code as string;
}

// ─── 5) Full pipeline: load → render → build → send ────
export async function processAndSendMessage(
  academy_id: string | null,
  template_key: string,
  vars: Record<string, string>,
  receiver_phone: string
): Promise<{ success: boolean; error?: string }> {
  // 1. Load variant from DB
  const variant = await loadVariant(academy_id, template_key);

  // 2. Render title + body + button URLs
  const rendered_title = renderTemplate(variant.title_prefix, vars);
  const rendered_body = renderTemplate(`${rendered_title} ${variant.body}`, vars);
  const rendered_buttons = variant.buttons.map(btn => ({
    ...btn,
    url: renderTemplate(btn.url, vars),
  }));

  // 3. Build Kakao payload
  const payload = buildKakaoPayload(
    variant.kakao_template_code,
    rendered_body,
    rendered_buttons,
    receiver_phone
  );

  // 4. Send
  return sendKakaoAlimtalk(payload);
}
