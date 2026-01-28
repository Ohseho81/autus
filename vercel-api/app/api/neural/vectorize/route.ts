/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🧠 Neural Pipeline - Data Vectorization Engine
 * 
 * Quick-Tag 이벤트를 Claude 3.5 API로 분석하여
 * s(t)와 ΔM 값을 실시간 추출 → physics_metrics 갱신
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getSupabaseAdmin } from '../../../../lib/supabase';

// Supabase 클라이언트

// Anthropic 클라이언트
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

// Physics 변수 추출을 위한 프롬프트
const PHYSICS_EXTRACTION_PROMPT = `
당신은 KRATON Physics Engine의 데이터 벡터화 전문가입니다.
교육/서비스 현장에서 발생한 상호작용 데이터를 분석하여 물리 변수를 추출합니다.

## 추출해야 할 변수

1. **s_delta** (만족도 변화): -100 ~ +100
   - 긍정적 반응, 신뢰 증가 → 양수
   - 불안, 불만, 의심 → 음수

2. **m_delta** (성과/가치 변화): -100 ~ +100  
   - 성취, 참여, 발전 → 양수
   - 결석, 성적하락, 이탈징후 → 음수

3. **bond_strength** (유대 강도): 0 ~ 100
   - 관계의 현재 결속력

4. **risk_indicators** (위험 신호): 배열
   - 감지된 위험 요소들

5. **psychological_triggers** (심리적 트리거): 배열
   - 발견된 행동 유발 요소들

## 응답 형식 (JSON)
{
  "s_delta": number,
  "m_delta": number,
  "bond_strength": number,
  "risk_indicators": string[],
  "psychological_triggers": string[],
  "analysis_summary": string,
  "recommended_action": string
}
`;

interface InteractionData {
  node_id: string;
  target_id: string;
  interaction_type: string;
  raw_text?: string;
  tags?: string[];
  sentiment_emoji?: string;
  bond_tag?: string;
  issue_triggers?: string[];
  voice_transcript?: string;
  timestamp?: string;
}

interface PhysicsVector {
  s_delta: number;
  m_delta: number;
  bond_strength: number;
  risk_indicators: string[];
  psychological_triggers: string[];
  analysis_summary: string;
  recommended_action: string;
}

export async function POST(request: NextRequest) {
  try {
    const data: InteractionData = await request.json();
    
    // 1. 입력 데이터 조합
    const contextText = buildContextText(data);
    
    // 2. Claude API로 물리 변수 추출
    const physicsVector = await extractPhysicsVector(contextText);
    
    // 3. interaction_logs에 원본 저장
    const { data: logEntry, error: logError } = await getSupabaseAdmin()
      .from('interaction_logs')
      .insert({
        node_pair_id: `${data.node_id}-${data.target_id}`,
        source_node: data.node_id,
        target_node: data.target_id,
        interaction_type: data.interaction_type,
        raw_content: contextText,
        sentiment_score: physicsVector.s_delta,
        tags: data.tags || [],
        vectorized_data: physicsVector,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (logError) {
      console.error('Log insert error:', logError);
    }
    
    // 4. physics_metrics 테이블 갱신
    await updatePhysicsMetrics(data.target_id, physicsVector);
    
    // 5. Risk 임계치 체크 → Active Shield 트리거
    const riskTriggered = await checkRiskThreshold(data.target_id, physicsVector);
    
    return NextResponse.json({
      success: true,
      data: {
        log_id: logEntry?.id,
        physics_vector: physicsVector,
        risk_triggered: riskTriggered,
        message: '데이터 벡터화 완료',
      },
    });
    
  } catch (error) {
    console.error('Neural Pipeline Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// 컨텍스트 텍스트 조합
function buildContextText(data: InteractionData): string {
  const parts: string[] = [];
  
  parts.push(`[상호작용 유형] ${data.interaction_type}`);
  
  if (data.sentiment_emoji) {
    const emojiMap: Record<string, string> = {
      '😊': '매우 만족 (+20)',
      '🙂': '만족 (+10)',
      '😐': '불만족 (-10)',
      '😟': '매우 불만 (-20)',
    };
    parts.push(`[감정 상태] ${emojiMap[data.sentiment_emoji] || data.sentiment_emoji}`);
  }
  
  if (data.bond_tag) {
    parts.push(`[유대 강도] ${data.bond_tag}`);
  }
  
  if (data.issue_triggers?.length) {
    parts.push(`[이슈 트리거] ${data.issue_triggers.join(', ')}`);
  }
  
  if (data.tags?.length) {
    parts.push(`[태그] ${data.tags.join(', ')}`);
  }
  
  if (data.raw_text) {
    parts.push(`[메모] ${data.raw_text}`);
  }
  
  if (data.voice_transcript) {
    parts.push(`[음성 기록] ${data.voice_transcript}`);
  }
  
  return parts.join('\n');
}

// Claude API로 물리 변수 추출
async function extractPhysicsVector(contextText: string): Promise<PhysicsVector> {
  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `${PHYSICS_EXTRACTION_PROMPT}\n\n## 분석할 데이터\n${contextText}\n\n위 데이터를 분석하여 JSON 형식으로 응답하세요.`,
        },
      ],
    });
    
    // 응답에서 JSON 추출
    const content = message.content[0];
    if (content.type === 'text') {
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as PhysicsVector;
      }
    }
    
    // 기본값 반환
    return getDefaultPhysicsVector();
    
  } catch (error) {
    console.error('Claude API Error:', error);
    return getDefaultPhysicsVector();
  }
}

function getDefaultPhysicsVector(): PhysicsVector {
  return {
    s_delta: 0,
    m_delta: 0,
    bond_strength: 50,
    risk_indicators: [],
    psychological_triggers: [],
    analysis_summary: '분석 불가',
    recommended_action: '수동 검토 필요',
  };
}

// physics_metrics 테이블 갱신
async function updatePhysicsMetrics(nodeId: string, vector: PhysicsVector) {
  // 기존 메트릭 조회
  const { data: existing } = await getSupabaseAdmin()
    .from('physics_metrics')
    .select('*')
    .eq('node_id', nodeId)
    .single();
  
  if (existing) {
    // 기존 값에 델타 적용
    const newSIndex = Math.max(0, Math.min(100, existing.s_index + vector.s_delta / 10));
    const newMScore = Math.max(0, Math.min(100, existing.m_score + vector.m_delta / 10));
    
    // V-Index 재계산: V = (M - T) × (1 + s)^t
    const t = existing.tenure_months || 1;
    const newVValue = (existing.mint_total - existing.tax_total) * Math.pow(1 + newSIndex / 100, t / 12);
    
    await getSupabaseAdmin()
      .from('physics_metrics')
      .update({
        s_index: newSIndex,
        m_score: newMScore,
        v_value: newVValue,
        bond_strength: vector.bond_strength,
        risk_indicators: vector.risk_indicators,
        last_interaction: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('node_id', nodeId);
      
  } else {
    // 새 메트릭 생성
    await getSupabaseAdmin()
      .from('physics_metrics')
      .insert({
        node_id: nodeId,
        s_index: 50 + vector.s_delta / 10,
        m_score: 50 + vector.m_delta / 10,
        v_value: 0,
        bond_strength: vector.bond_strength,
        risk_indicators: vector.risk_indicators,
        last_interaction: new Date().toISOString(),
        created_at: new Date().toISOString(),
      });
  }
}

// Risk 임계치 체크
async function checkRiskThreshold(nodeId: string, vector: PhysicsVector): Promise<boolean> {
  // R(t) 계산: 위험 지표가 있고 s_delta가 음수면 위험
  const riskScore = vector.risk_indicators.length * 10 + Math.abs(Math.min(0, vector.s_delta));
  
  if (riskScore > 30) {
    // Risk Queue에 추가
    await getSupabaseAdmin()
      .from('risk_queue')
      .insert({
        target_node: nodeId,
        risk_score: riskScore,
        risk_indicators: vector.risk_indicators,
        priority: riskScore > 60 ? 'CRITICAL' : riskScore > 40 ? 'HIGH' : 'MEDIUM',
        status: 'OPEN',
        analysis_summary: vector.analysis_summary,
        recommended_action: vector.recommended_action,
        created_at: new Date().toISOString(),
      });
    
    // Active Shield 트리거 (n8n webhook 호출)
    if (process.env.N8N_ACTIVE_SHIELD_WEBHOOK) {
      await fetch(process.env.N8N_ACTIVE_SHIELD_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          node_id: nodeId,
          risk_score: riskScore,
          vector: vector,
          triggered_at: new Date().toISOString(),
        }),
      });
    }
    
    return true;
  }
  
  return false;
}

// GET: 헬스체크
export async function GET() {
  return NextResponse.json({
    success: true,
    service: 'Neural Pipeline - Vectorization Engine',
    status: 'operational',
    capabilities: [
      'Text Analysis (Claude 3.5)',
      'Physics Variable Extraction',
      's(t) & ΔM Calculation',
      'Real-time Metrics Update',
      'Risk Threshold Detection',
    ],
  });
}
