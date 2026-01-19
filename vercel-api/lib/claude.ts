// ============================================
// AUTUS Claude AI Integration
// ============================================

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY!,
});

// Types
export interface RewardCardRequest {
  role: string;
  pain_point: string;
  orbit_distance: number;
  context_data: Record<string, any>;
}

export interface RewardCardResponse {
  title: string;
  icon: string;
  message: string;
  actions: { label: string; type: string; requires_approval: boolean }[];
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
    const systemPrompt = `너는 AUTUS의 AI 어시스턴트야. 
사용자의 역할과 고민에 맞는 '즉시 보상 카드' 메시지를 생성해.

규칙:
1. 숫자나 퍼센트를 직접 노출하지 마
2. 따뜻하고 격려하는 톤 유지
3. 즉시 행동할 수 있는 구체적 제안
4. orbit_distance에 따라 자동화 수준 조절:
   - 0.2 (가까이): 원클릭 실행 제안
   - 0.5 (중간): 옵션 선택 제안
   - 0.8 (멀리): 정보 제공만

JSON 형식으로 응답:
{
  "title": "카드 제목",
  "icon": "이모지",
  "message": "메인 메시지 (1-2문장)",
  "actions": [{"label": "버튼텍스트", "type": "action_type", "requires_approval": boolean}]
}`;

    const userPrompt = `역할: ${request.role}
주요 고민: ${request.pain_point}
자동화 거리: ${request.orbit_distance}
컨텍스트 데이터: ${JSON.stringify(request.context_data)}

이 사용자를 위한 보상 카드를 생성해.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [
        { role: 'user', content: userPrompt }
      ],
      system: systemPrompt,
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    
    try {
      // JSON 파싱
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('JSON parse error:', e);
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

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      messages: [
        { role: 'user', content: `분석 대상 데이터:\n${JSON.stringify(request.data, null, 2)}` }
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
      console.error('JSON parse error:', e);
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

    const response = await anthropic.messages.create({
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
      console.error('JSON parse error:', e);
    }

    return {
      a: '기존 방식으로 빠르게 처리',
      b: '표준 프로세스를 따라 진행',
      c: '자동화 시스템 구축 후 반복 활용',
      meta: { a_time: '짧게', b_time: '보통', c_time: '길게' }
    };
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

    const response = await anthropic.messages.create({
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
