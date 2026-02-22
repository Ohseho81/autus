// ============================================
// AUTUS Claude AI Integration
// ============================================

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { captureError } from './monitoring';

// Lazy initialization to avoid build-time errors
function getAnthropicClient() {
  if (!process.env.CLAUDE_API_KEY) {
    throw new Error('CLAUDE_API_KEY environment variable not configured');
  }
  return new Anthropic({
    apiKey: process.env.CLAUDE_API_KEY,
  });
}

// Supabase client for metrics logging
function getSupabaseClient() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// Prompt Cache 메트릭 로깅
interface CacheMetrics {
  endpoint: string;
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
  response_time_ms: number;
}

async function logCacheMetrics(metrics: CacheMetrics) {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  // Claude API 가격 (2026년 기준 추정)
  const INPUT_COST_PER_1K = 0.003;  // $0.003 per 1K input tokens
  const OUTPUT_COST_PER_1K = 0.015; // $0.015 per 1K output tokens
  const CACHE_WRITE_COST_PER_1K = 0.00375; // $0.00375 per 1K (25% premium)
  const CACHE_READ_COST_PER_1K = 0.0003;   // $0.0003 per 1K (90% discount)

  const totalTokens = metrics.input_tokens + metrics.output_tokens;
  const cacheHit = (metrics.cache_read_input_tokens || 0) > 0;
  
  // 비용 계산
  const estimatedCost = 
    (metrics.input_tokens / 1000 * INPUT_COST_PER_1K) +
    (metrics.output_tokens / 1000 * OUTPUT_COST_PER_1K) +
    ((metrics.cache_creation_input_tokens || 0) / 1000 * CACHE_WRITE_COST_PER_1K) +
    ((metrics.cache_read_input_tokens || 0) / 1000 * CACHE_READ_COST_PER_1K);

  // 캐시로 절약한 비용 (캐시 읽기가 있으면 일반 입력 대비 절약)
  const savings = cacheHit 
    ? (metrics.cache_read_input_tokens || 0) / 1000 * (INPUT_COST_PER_1K - CACHE_READ_COST_PER_1K)
    : 0;

  try {
    await supabase.from('prompt_cache_metrics').insert({
      endpoint: metrics.endpoint,
      cache_hit: cacheHit,
      cache_creation_input_tokens: metrics.cache_creation_input_tokens,
      cache_read_input_tokens: metrics.cache_read_input_tokens,
      input_tokens: metrics.input_tokens,
      output_tokens: metrics.output_tokens,
      total_tokens: totalTokens,
      estimated_cost_usd: estimatedCost,
      savings_usd: savings,
      response_time_ms: metrics.response_time_ms
    });
  } catch (e) {
    captureError(e instanceof Error ? e : new Error(String(e)), { context: 'claude.logCacheMetrics' });
  }
}

// Types
export interface RewardCardRequest {
  role: string;
  pain_point: string;
  orbit_distance: number;
  context_data: Record<string, any>;
}

export interface RewardCardAction {
  label: string;
  type: string;
  requires_approval: boolean;
  webhook_payload?: {
    action_type: string;
    target?: string;
    message?: string;
    template_id?: string;
    metadata?: Record<string, any>;
  };
}

export interface RewardCardResponse {
  title: string;
  icon: string;
  message: string;
  actions: RewardCardAction[];
}

export interface AnalysisRequest {
  type: 'churn_risk' | 'cashflow' | 'performance' | 'engagement';
  data: Record<string, any>;
}

export interface AnalysisResponse {
  summary: string;
  risk_level: 'low' | 'medium' | 'high';
  recommendations: string[];
  predicted_impact: number;
}

// ============================================
// AI Functions
// ============================================

export const ai = {
  /**
   * 보상 카드 메시지 생성
   */
  async generateRewardCard(request: RewardCardRequest): Promise<RewardCardResponse> {
    const startTime = Date.now();
    
    const systemPrompt = `너는 AUTUS의 실행형 AI 에이전트야. 
사용자의 역할과 고민에 맞는 '즉시 보상 카드'를 생성하고, 버튼 클릭 시 자동 실행할 수 있는 webhook_payload도 포함해.

규칙:
1. 숫자나 퍼센트를 직접 노출하지 마
2. 따뜻하고 격려하는 톤 유지
3. 즉시 행동할 수 있는 구체적 제안
4. orbit_distance에 따라 자동화 수준 조절:
   - 0.2 (가까이): 원클릭 자동 실행 제안
   - 0.5 (중간): 승인 후 실행 제안
   - 0.8 (멀리): 정보 제공만

사용 가능한 action_type:
- send_sms: 문자 발송 (알리고)
- send_kakao: 카카오 알림톡
- update_erp: ERP 업데이트
- issue_reward: 리워드 발급
- generate_report: 보고서 생성
- sync_data: 데이터 동기화

JSON 형식으로 응답:
{
  "title": "카드 제목",
  "icon": "이모지",
  "message": "메인 메시지 (1-2문장)",
  "actions": [
    {
      "label": "버튼텍스트",
      "type": "action_type",
      "requires_approval": boolean,
      "webhook_payload": {
        "action_type": "send_sms|send_kakao|update_erp|...",
        "target": "대상 (전화번호, ID 등)",
        "message": "실행할 메시지 내용",
        "template_id": "템플릿 ID (선택)",
        "metadata": {}
      }
    }
  ]
}`;

    const userPrompt = `역할: ${request.role}
주요 고민: ${request.pain_point}
자동화 거리: ${request.orbit_distance}
컨텍스트 데이터: ${JSON.stringify(request.context_data)}

이 사용자를 위한 보상 카드를 생성해.`;

    const response = await getAnthropicClient().messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [
        { role: 'user', content: userPrompt }
      ],
      system: systemPrompt,
    });

    // Prompt Cache 메트릭 로깅
    const responseTime = Date.now() - startTime;
    logCacheMetrics({
      endpoint: '/api/brain/generateRewardCard',
      input_tokens: response.usage?.input_tokens || 0,
      output_tokens: response.usage?.output_tokens || 0,
      cache_creation_input_tokens: (response.usage as Record<string, unknown>)?.cache_creation_input_tokens as number | undefined,
      cache_read_input_tokens: (response.usage as Record<string, unknown>)?.cache_read_input_tokens as number | undefined,
      response_time_ms: responseTime
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    
    try {
      // JSON 파싱
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      captureError(e instanceof Error ? e : new Error(String(e)), { context: 'claude.generateRewardCard.jsonParse' });
    }

    // Fallback
    return {
      title: '오늘의 제안',
      icon: '✨',
      message: '새로운 기회가 준비되어 있습니다.',
      actions: [{ label: '확인하기', type: 'view', requires_approval: false }]
    };
  },

  /**
   * 데이터 분석
   */
  async analyzeData(request: AnalysisRequest): Promise<AnalysisResponse> {
    const startTime = Date.now();
    
    const typePrompts: Record<string, string> = {
      churn_risk: '퇴원/이탈 위험 분석',
      cashflow: '현금흐름 및 미납 분석',
      performance: '성과 및 생산성 분석',
      engagement: '참여도 및 만족도 분석'
    };

    const systemPrompt = `너는 AUTUS의 데이터 분석 AI야.
${typePrompts[request.type]}을 수행하고 결과를 JSON으로 반환해.

응답 형식:
{
  "summary": "1문장 요약",
  "risk_level": "low|medium|high",
  "recommendations": ["추천1", "추천2", "추천3"],
  "predicted_impact": 0.0~1.0 사이 영향도
}

규칙:
1. 구체적이고 실행 가능한 추천
2. 숫자는 내부 분석용으로만 사용
3. 사용자 친화적 요약 제공`;

    const response = await getAnthropicClient().messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      messages: [
        { role: 'user', content: `분석 대상 데이터:\n${JSON.stringify(request.data, null, 2)}` }
      ],
      system: systemPrompt,
    });

    // Prompt Cache 메트릭 로깅
    const responseTime = Date.now() - startTime;
    logCacheMetrics({
      endpoint: `/api/brain/analyzeData/${request.type}`,
      input_tokens: response.usage?.input_tokens || 0,
      output_tokens: response.usage?.output_tokens || 0,
      cache_creation_input_tokens: (response.usage as Record<string, unknown>)?.cache_creation_input_tokens as number | undefined,
      cache_read_input_tokens: (response.usage as Record<string, unknown>)?.cache_read_input_tokens as number | undefined,
      response_time_ms: responseTime
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      captureError(e instanceof Error ? e : new Error(String(e)), { context: 'claude.analyzeData.jsonParse' });
    }

    return {
      summary: '분석이 완료되었습니다.',
      risk_level: 'medium',
      recommendations: ['데이터를 더 수집해 주세요.'],
      predicted_impact: 0.5
    };
  },

  /**
   * 자연어 업무 → 3지 선택 생성
   */
  async generateThreeOptions(taskDescription: string): Promise<{
    a: string;
    b: string;
    c: string;
    meta: { a_time: string; b_time: string; c_time: string };
  }> {
    const systemPrompt = `사용자가 요청한 업무에 대해 정확히 3가지 선택지를 생성해.

규칙:
1) A: 가장 빠르고 간단한 방법 (T 최소화)
2) B: 표준적이고 균형 잡힌 방법 (T 중간, s 중간)
3) C: 장기적으로 가장 가치가 쌓이는 방법 (s 최대화)

제약:
- 각 옵션은 1문장
- 시간은 "짧게/보통/길게" 범주만
- 숫자/퍼센트 금지

JSON 형식:
{
  "a": "옵션 A 설명",
  "b": "옵션 B 설명", 
  "c": "옵션 C 설명",
  "meta": {"a_time": "짧게", "b_time": "보통", "c_time": "길게"}
}`;

    const response = await getAnthropicClient().messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [
        { role: 'user', content: `업무: ${taskDescription}` }
      ],
      system: systemPrompt,
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      captureError(e instanceof Error ? e : new Error(String(e)), { context: 'claude.generateThreeOptions.jsonParse' });
    }

    return {
      a: '기존 방식으로 빠르게 처리',
      b: '표준 프로세스를 따라 진행',
      c: '자동화 시스템 구축 후 반복 활용',
      meta: { a_time: '짧게', b_time: '보통', c_time: '길게' }
    };
  },

  /**
   * 일일 카페 콘텐츠 생성
   */
  async generateDailyContent(data: {
    type: 'cafe_post' | 'comment' | 'dm';
    topic?: string;
    context?: string;
  }): Promise<{ title?: string; content: string }> {
    const startTime = Date.now();

    const topics = ['퇴원 관리', '미수금 회수', '학부모 상담', '마케팅 노하우', '강사 관리'];
    const randomTopic = data.topic || topics[Math.floor(Math.random() * topics.length)];

    const prompts: Record<string, string> = {
      cafe_post: `학원 원장 커뮤니티(학원노)에 올릴 가치 제공형 글을 작성해줘.

주제: ${randomTopic}
${data.context ? `추가 컨텍스트: ${data.context}` : ''}

규칙:
1. 제목 포함 ([제목] 형식)
2. 따뜻하고 공감하는 톤
3. 구체적인 숫자나 사례 1-2개 포함
4. 300-500자 내외
5. 마지막에 댓글 유도 문구
6. 홍보성 절대 금지 - 순수 노하우 공유만
7. 이모지 적절히 사용

JSON 형식으로 응답:
{"title": "제목", "content": "본문 내용"}`,
      
      comment: `학원 원장이 쓴 고민 글에 달 공감 댓글을 작성해줘.

주제: ${randomTopic}
${data.context ? `원글 내용: ${data.context}` : ''}

규칙:
1. 2-3문장으로 짧게
2. 진심 어린 공감
3. 구체적인 조언 1개
4. 홍보 절대 금지

JSON 형식으로 응답:
{"content": "댓글 내용"}`,

      dm: `학원 원장에게 보낼 첫 DM을 작성해줘.

상황: 퇴원/미수금 고민 글을 쓴 원장님에게 연락
${data.context ? `추가 정보: ${data.context}` : ''}

규칙:
1. 자연스럽고 부담 없는 톤
2. 무료 파일럿 언급 (효과 없으면 0원)
3. 통화 제안으로 마무리
4. 100자 내외

JSON 형식으로 응답:
{"content": "DM 내용"}`
    };

    const response = await getAnthropicClient().messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      messages: [
        { role: 'user', content: prompts[data.type] || prompts.cafe_post }
      ],
      system: '너는 학원 운영 전문가야. 학원 원장 커뮤니티에서 신뢰받는 조언을 제공해.'
    });

    const responseTime = Date.now() - startTime;
    logCacheMetrics({
      endpoint: '/api/brain/generateDailyContent',
      input_tokens: response.usage?.input_tokens || 0,
      output_tokens: response.usage?.output_tokens || 0,
      cache_creation_input_tokens: (response.usage as Record<string, unknown>)?.cache_creation_input_tokens as number | undefined,
      cache_read_input_tokens: (response.usage as Record<string, unknown>)?.cache_read_input_tokens as number | undefined,
      response_time_ms: responseTime
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      captureError(e instanceof Error ? e : new Error(String(e)), { context: 'claude.generateDailyContent.jsonParse' });
    }

    return { content: text };
  },

  /**
   * 학부모 상담 일지 자동 생성
   */
  async generateConsultReport(data: {
    studentName: string;
    subject: string;
    attendance: number;
    performance: string;
    notes: string;
  }): Promise<string> {
    const systemPrompt = `학부모 상담 일지 초안을 작성해.
톤: 따뜻하고 전문적
길이: 3-4문단
포함: 학생 강점, 개선점, 다음 목표`;

    const response = await getAnthropicClient().messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 600,
      messages: [
        { role: 'user', content: `학생: ${data.studentName}
과목: ${data.subject}
출석률: ${data.attendance}%
성취도: ${data.performance}
메모: ${data.notes}` }
      ],
      system: systemPrompt,
    });

    return response.content[0].type === 'text' ? response.content[0].text : '';
  }
};
