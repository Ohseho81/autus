/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🤖 AI Script Generator API - Claude 기반 상담 스크립트 생성
 * 
 * 기능:
 * - 이탈 방지 상담 스크립트
 * - 미납 안내 스크립트
 * - 긍정 피드백 스크립트
 * - 학부모 면담 스크립트
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { NextRequest, NextResponse } from 'next/server';

// Claude API Client (lazy initialization to reduce cold start)
let _anthropic: InstanceType<typeof import('@anthropic-ai/sdk').default> | null = null;
function getAnthropic() {
  if (!_anthropic) {
    if (!process.env.ANTHROPIC_API_KEY) return null;
    const Anthropic = require('@anthropic-ai/sdk').default;
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _anthropic;
}

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

interface ScriptRequest {
  action: 'generate' | 'templates' | 'analyze_voice';
  
  // generate 액션
  scenario?: 'churn_prevention' | 'payment_reminder' | 'positive_feedback' | 'parent_meeting' | 'custom';
  student_name?: string;
  parent_name?: string;
  context?: {
    state?: number;
    risk_factors?: string[];
    recent_events?: string[];
    teacher_name?: string;
    subject?: string;
    overdue_amount?: number;
    overdue_months?: number;
    positive_points?: string[];
  };
  custom_prompt?: string;
  
  // analyze_voice 액션
  voice_text?: string;
}

interface ScriptResponse {
  opening: string;
  empathy: string;
  main: string;
  solution: string;
  closing: string;
  tips: string[];
}

// ═══════════════════════════════════════════════════════════════════════════
// 스크립트 템플릿
// ═══════════════════════════════════════════════════════════════════════════

const SCRIPT_TEMPLATES = {
  churn_prevention: {
    name: '이탈 방지 상담',
    description: '이탈 위험 학생/학부모 상담용',
    icon: '🛡️',
    prompts: {
      system: `당신은 경험 많은 학원 상담 전문가입니다. 이탈 위험이 있는 학생의 학부모와 상담할 때 사용할 스크립트를 작성합니다.

핵심 원칙:
1. 공감 먼저 - 학부모의 걱정을 먼저 인정
2. 구체적 개선안 제시 - 막연한 약속이 아닌 구체적 계획
3. 긍정적 미래 제시 - 현재 문제보다 해결 후 모습 강조
4. 선택권 제공 - 일방적 설득이 아닌 옵션 제시`,
    },
  },
  payment_reminder: {
    name: '미납 안내',
    description: '수강료 미납 안내용',
    icon: '💳',
    prompts: {
      system: `당신은 학원 행정 담당자입니다. 수강료 미납 학부모에게 연락할 때 사용할 스크립트를 작성합니다.

핵심 원칙:
1. 부드러운 톤 유지 - 추심이 아닌 안내
2. 상황 이해 - 사정이 있을 수 있음을 인정
3. 유연한 해결책 - 분납 등 옵션 제시
4. 학생 케어 연결 - 비용 문제와 학습 분리`,
    },
  },
  positive_feedback: {
    name: '긍정 피드백',
    description: '학생 칭찬/격려 메시지',
    icon: '⭐',
    prompts: {
      system: `당신은 학생의 성장을 응원하는 선생님입니다. 학생의 긍정적인 발전을 학부모에게 전달하는 메시지를 작성합니다.

핵심 원칙:
1. 구체적 칭찬 - 막연한 "잘했어요"가 아닌 구체적 행동
2. 성장 강조 - 현재 수준보다 변화/노력 강조
3. 미래 연결 - 이 성장이 어디로 이어지는지
4. 부모 역할 인정 - 가정에서의 지원에 감사`,
    },
  },
  parent_meeting: {
    name: '학부모 면담',
    description: '정기 학부모 상담용',
    icon: '👨‍👩‍👧',
    prompts: {
      system: `당신은 학생의 담당 선생님입니다. 학부모 면담에서 사용할 체계적인 상담 스크립트를 작성합니다.

면담 구조:
1. 인사 및 분위기 조성
2. 학생의 현재 상태 공유
3. 강점과 개선점 균형있게 전달
4. 가정에서의 협조 사항
5. 향후 계획 및 마무리`,
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// POST Handler
// ═══════════════════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const payload: ScriptRequest = await request.json();
    const { action } = payload;

    switch (action) {
      case 'generate':
        return await generateScript(payload);
      
      case 'templates':
        return NextResponse.json({
          success: true,
          templates: Object.entries(SCRIPT_TEMPLATES).map(([key, value]) => ({
            id: key,
            name: value.name,
            description: value.description,
            icon: value.icon,
          })),
        });
      
      case 'analyze_voice':
        return await analyzeVoice(payload);
      
      default:
        return NextResponse.json({
          success: false,
          error: `Unknown action: ${action}`,
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Script API Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// 스크립트 생성
// ═══════════════════════════════════════════════════════════════════════════

async function generateScript(payload: ScriptRequest) {
  const { scenario = 'churn_prevention', student_name, parent_name, context, custom_prompt } = payload;
  
  const template = SCRIPT_TEMPLATES[scenario as keyof typeof SCRIPT_TEMPLATES] || SCRIPT_TEMPLATES.churn_prevention;

  // 프롬프트 구성
  const userPrompt = buildUserPrompt(scenario, student_name, parent_name, context, custom_prompt);

  // Claude API 호출
  const anthropic = getAnthropic();
  if (anthropic) {
    try {
      const response = await anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1500,
        system: template.prompts.system,
        messages: [{ role: 'user', content: userPrompt }],
      });

      const content = response.content[0];
      const text = content.type === 'text' ? content.text : '';
      
      // 응답 파싱
      const script = parseScriptResponse(text);

      return NextResponse.json({
        success: true,
        scenario,
        student_name,
        script,
        raw_response: text,
        model: 'claude-3-haiku',
      });
    } catch (e) {
      console.error('Claude API Error:', e);
      // 폴백: Mock 스크립트 반환
      return NextResponse.json({
        success: true,
        scenario,
        student_name,
        script: getMockScript(scenario, student_name || '학생', parent_name, context),
        source: 'mock',
      });
    }
  }

  // Claude 미설정 시 Mock 스크립트
  return NextResponse.json({
    success: true,
    scenario,
    student_name,
    script: getMockScript(scenario, student_name || '학생', parent_name, context),
    source: 'mock',
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// 프롬프트 빌더
// ═══════════════════════════════════════════════════════════════════════════

function buildUserPrompt(
  scenario: string,
  studentName?: string,
  parentName?: string,
  context?: ScriptRequest['context'],
  customPrompt?: string
): string {
  const name = studentName || '학생';
  const parent = parentName || '학부모님';

  let prompt = `${name} 학생의 ${parent}에게 연락할 상담 스크립트를 작성해주세요.\n\n`;

  if (context) {
    prompt += '상황 정보:\n';
    if (context.state) prompt += `- 학생 상태(State): ${context.state}\n`;
    if (context.risk_factors?.length) prompt += `- 위험 신호: ${context.risk_factors.join(', ')}\n`;
    if (context.recent_events?.length) prompt += `- 최근 이벤트: ${context.recent_events.join(', ')}\n`;
    if (context.teacher_name) prompt += `- 담당 선생님: ${context.teacher_name}\n`;
    if (context.subject) prompt += `- 과목: ${context.subject}\n`;
    if (context.overdue_amount) prompt += `- 미납 금액: ${context.overdue_amount.toLocaleString()}원\n`;
    if (context.overdue_months) prompt += `- 미납 기간: ${context.overdue_months}개월\n`;
    if (context.positive_points?.length) prompt += `- 긍정적인 점: ${context.positive_points.join(', ')}\n`;
    prompt += '\n';
  }

  if (customPrompt) {
    prompt += `추가 지시사항: ${customPrompt}\n\n`;
  }

  prompt += `다음 형식으로 스크립트를 작성해주세요:

[인사말]
(첫 인사)

[공감]
(상황에 대한 공감)

[본론]
(핵심 내용)

[해결안]
(구체적 제안)

[마무리]
(마무리 인사)

[팁]
- (상담 팁 1)
- (상담 팁 2)
- (상담 팁 3)`;

  return prompt;
}

// ═══════════════════════════════════════════════════════════════════════════
// 응답 파싱
// ═══════════════════════════════════════════════════════════════════════════

function parseScriptResponse(text: string): ScriptResponse {
  const sections = {
    opening: '',
    empathy: '',
    main: '',
    solution: '',
    closing: '',
    tips: [] as string[],
  };

  // 섹션 추출
  const patterns = [
    { key: 'opening', pattern: /\[인사말\]\s*([\s\S]*?)(?=\[|$)/i },
    { key: 'empathy', pattern: /\[공감\]\s*([\s\S]*?)(?=\[|$)/i },
    { key: 'main', pattern: /\[본론\]\s*([\s\S]*?)(?=\[|$)/i },
    { key: 'solution', pattern: /\[해결안\]\s*([\s\S]*?)(?=\[|$)/i },
    { key: 'closing', pattern: /\[마무리\]\s*([\s\S]*?)(?=\[|$)/i },
  ];

  patterns.forEach(({ key, pattern }) => {
    const match = text.match(pattern);
    if (match) {
      (sections as any)[key] = match[1].trim();
    }
  });

  // 팁 추출
  const tipsMatch = text.match(/\[팁\]\s*([\s\S]*?)$/i);
  if (tipsMatch) {
    sections.tips = tipsMatch[1]
      .split('\n')
      .map(line => line.replace(/^[-•]\s*/, '').trim())
      .filter(line => line.length > 0);
  }

  return sections;
}

// ═══════════════════════════════════════════════════════════════════════════
// Mock 스크립트
// ═══════════════════════════════════════════════════════════════════════════

function getMockScript(
  scenario: string,
  studentName: string,
  parentName?: string,
  context?: ScriptRequest['context']
): ScriptResponse {
  const parent = parentName || '학부모님';

  const scripts: Record<string, ScriptResponse> = {
    churn_prevention: {
      opening: `안녕하세요, ${parent}. ${studentName} 학생 담당 선생님입니다.`,
      empathy: `최근 ${studentName} 학생의 출석이 불규칙해서 걱정이 되어 연락드렸습니다. 혹시 가정에서 어려운 일이 있으시거나, 학원 생활에 불편한 점이 있으신지 여쭤봐도 될까요?`,
      main: `저희도 ${studentName} 학생이 더 즐겁게 공부할 수 있도록 여러 방안을 고민하고 있습니다. 현재 만족도가 다소 낮은 상황인데, 구체적으로 어떤 부분이 아쉬우셨는지 말씀해주시면 적극 개선하겠습니다.`,
      solution: `담당 선생님과의 케미 문제라면 선생님 변경도 가능하고, 학습 방식이 맞지 않다면 맞춤 커리큘럼을 다시 설계해 드릴 수 있습니다. ${studentName} 학생에게 가장 도움이 되는 방향으로 조정하겠습니다.`,
      closing: `항상 ${studentName} 학생의 성장을 응원하고 있습니다. 언제든 편하게 연락 주세요. 감사합니다.`,
      tips: [
        '학부모의 말을 먼저 경청하세요',
        '방어적이지 않고 수용적인 태도를 유지하세요',
        '구체적인 개선 일정을 제시하세요',
      ],
    },
    payment_reminder: {
      opening: `안녕하세요, ${parent}. ${studentName} 학생 학원입니다.`,
      empathy: `다름이 아니라 ${studentName} 학생의 이번 달 수강료 납부 건으로 연락드렸습니다. 혹시 바쁘신 와중에 놓치신 건 아닌지 확인차 연락드립니다.`,
      main: `${context?.overdue_months || 1}개월 분 ${(context?.overdue_amount || 300000).toLocaleString()}원이 미납 상태입니다. 별도 사정이 있으시면 말씀해 주시면 분납 등 유연하게 안내해 드리겠습니다.`,
      solution: `카드 결제, 계좌이체, 분납 등 편하신 방법으로 진행해 주시면 됩니다. 어려운 점 있으시면 언제든 상담 부탁드립니다.`,
      closing: `${studentName} 학생이 학습에만 집중할 수 있도록 저희도 최선을 다하겠습니다. 감사합니다.`,
      tips: [
        '추심이 아닌 안내의 톤을 유지하세요',
        '학부모의 상황을 이해하는 자세를 보여주세요',
        '학생의 학습과 비용 문제를 분리하세요',
      ],
    },
    positive_feedback: {
      opening: `안녕하세요, ${parent}. ${studentName} 학생 담당 선생님입니다.`,
      empathy: `좋은 소식을 전해드리고 싶어서 연락드렸습니다!`,
      main: `${studentName} 학생이 최근 ${context?.positive_points?.join(', ') || '수업 참여도와 과제 완성도'}에서 눈에 띄는 성장을 보여주고 있습니다. 특히 어려운 문제에도 포기하지 않고 끝까지 도전하는 모습이 인상적이었습니다.`,
      solution: `이 성장세를 유지하면 ${studentName} 학생의 목표 달성도 충분히 가능할 것으로 보입니다. 가정에서도 격려해 주시면 큰 힘이 될 것 같습니다.`,
      closing: `앞으로도 ${studentName} 학생의 성장을 위해 최선을 다하겠습니다. 감사합니다!`,
      tips: [
        '구체적인 행동/성과를 언급하세요',
        '부모님의 지원에 감사를 표현하세요',
        '앞으로의 긍정적 전망을 공유하세요',
      ],
    },
    parent_meeting: {
      opening: `안녕하세요, ${parent}. 바쁘신 와중에 시간 내주셔서 감사합니다.`,
      empathy: `${studentName} 학생의 학원 생활과 학습 상황에 대해 말씀드리고, 또 가정에서 느끼시는 점도 들어보고 싶어서 면담을 요청드렸습니다.`,
      main: `현재 ${studentName} 학생은 전반적으로 안정적인 학습을 하고 있습니다. 강점으로는 꾸준한 출석과 성실한 태도가 있고, 개선이 필요한 부분은 집중력 유지와 복습 습관입니다.`,
      solution: `학원에서는 1:1 질문 시간을 늘리고, 가정에서는 하루 30분 복습 시간을 확보해주시면 큰 도움이 될 것 같습니다.`,
      closing: `궁금하신 점이나 제안하고 싶으신 부분이 있으시면 말씀해 주세요. ${studentName} 학생을 위해 함께 노력하겠습니다.`,
      tips: [
        '긍정적인 점을 먼저 언급하세요',
        '개선점은 구체적인 방안과 함께 제시하세요',
        '학부모의 의견을 충분히 경청하세요',
      ],
    },
  };

  return scripts[scenario] || scripts.churn_prevention;
}

// ═══════════════════════════════════════════════════════════════════════════
// 음성 분석
// ═══════════════════════════════════════════════════════════════════════════

async function analyzeVoice(payload: ScriptRequest) {
  const { voice_text } = payload;

  if (!voice_text) {
    return NextResponse.json({
      success: false,
      error: 'voice_text is required',
    }, { status: 400 });
  }

  // 위험 키워드 분석
  const riskKeywords = ['그만두', '다른 학원', '비싸', '효과 없', '불만', '힘들', '포기'];
  const positiveKeywords = ['좋아', '만족', '추천', '감사', '도움', '성장', '발전'];

  const foundRisks = riskKeywords.filter(kw => voice_text.includes(kw));
  const foundPositives = positiveKeywords.filter(kw => voice_text.includes(kw));

  const riskScore = foundRisks.length * 20;
  const positiveScore = foundPositives.length * 15;
  const overallScore = Math.max(0, Math.min(100, 50 + positiveScore - riskScore));

  return NextResponse.json({
    success: true,
    analysis: {
      overall_score: overallScore,
      sentiment: overallScore >= 60 ? 'positive' : overallScore >= 40 ? 'neutral' : 'negative',
      risk_indicators: foundRisks,
      positive_indicators: foundPositives,
      suggested_action: overallScore < 40 ? 'immediate_attention' : overallScore < 60 ? 'monitor' : 'maintain',
      summary: `감정 분석 결과: ${overallScore >= 60 ? '긍정적' : overallScore >= 40 ? '중립적' : '주의 필요'}`,
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// GET Handler - 템플릿 목록
// ═══════════════════════════════════════════════════════════════════════════

export async function GET() {
  return NextResponse.json({
    success: true,
    templates: Object.entries(SCRIPT_TEMPLATES).map(([key, value]) => ({
      id: key,
      name: value.name,
      description: value.description,
      icon: value.icon,
    })),
  });
}
