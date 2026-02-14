/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚡ Quick Tag API
 * Optimus Console - 현장 데이터 벡터화
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../lib/supabase';


// Semantic Hash 생성 (간단한 버전)
function semanticHash(action: string, content: string): string {
  const timestamp = Date.now().toString(36);
  const hash = Buffer.from(`${action}:${content}`).toString('base64').slice(0, 12);
  return `${hash}-${timestamp}`;
}

// PII 마스킹
function maskPII(text: string): string {
  // 전화번호 마스킹
  let masked = text.replace(/\d{3}-\d{4}-\d{4}/g, '***-****-****');
  // 이메일 마스킹
  masked = masked.replace(/[\w.-]+@[\w.-]+\.\w+/g, '***@***.***');
  return masked;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      org_id,
      tagger_id,
      target_id,
      target_type,
      emotion_delta,
      bond_strength,
      issue_triggers,
      voice_insight,
    } = body;

    // 1. interaction_logs에 저장
    const { data: log, error: logError } = await getSupabaseAdmin()
      .from('interaction_logs')
      .insert({
        org_id,
        user_id: tagger_id,
        target_id,
        target_type,
        interaction_type: 'quick_tag',
        raw_content: voice_insight || '',
        tags: issue_triggers || [],
        vectorized_data: {
          emotion_delta,
          bond_strength,
          issue_triggers,
        },
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (logError) throw logError;

    // 2. Voice-to-Insight AI 분석 (Claude API)
    let aiAnalysis = null;
    if (voice_insight) {
      aiAnalysis = await analyzeVoiceInsight(voice_insight);
    }

    // 3. 학생/타겟의 s-index 업데이트
    if (target_type === 'student') {
      const { data: student } = await getSupabaseAdmin()
        .from('relational_nodes')
        .select('meta')
        .eq('id', target_id)
        .single();

      const currentSIndex = student?.meta?.s_index || 50;
      const newSIndex = Math.min(100, Math.max(0, currentSIndex + emotion_delta));

      await getSupabaseAdmin()
        .from('relational_nodes')
        .update({
          meta: {
            ...student?.meta,
            s_index: newSIndex,
            bond_strength,
            last_interaction: new Date().toISOString(),
            ai_flags: aiAnalysis?.flags || [],
          },
        })
        .eq('id', target_id);
    }

    // 4. Physics Metrics 업데이트
    await getSupabaseAdmin().from('physics_metrics').upsert({
      node_id: target_id,
      s_index: emotion_delta > 0 ? 'positive' : emotion_delta < 0 ? 'negative' : 'neutral',
      m_score: 50, // 기본값
      bond_strength: bond_strength === 'strong' ? 80 : bond_strength === 'cold' ? 20 : 50,
      r_score: emotion_delta < -10 ? 70 : emotion_delta < 0 ? 40 : 20,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'node_id',
    });

    // 5. Immortal Ledger에 기록
    const hash = semanticHash('quick_tag', `${target_id}:${emotion_delta}:${bond_strength}`);
    
    await getSupabaseAdmin().from('immortal_events').insert({
      org_id,
      user_id: tagger_id,
      role: 'optimus',
      action_type: 'quick_tag',
      entity_type: target_type,
      entity_id: target_id,
      semantic_hash: hash,
      content_redacted: maskPII(`${target_type} 태깅: 감정 ${emotion_delta > 0 ? '+' : ''}${emotion_delta}`),
      outcome_delta_v: emotion_delta > 0 ? 0.1 : -0.1,
      meta: {
        emotion_delta,
        bond_strength,
        issue_triggers,
        ai_analysis: aiAnalysis,
      },
    });

    // 6. 위험 신호 감지 시 Risk Queue에 추가
    const riskTriggered = emotion_delta <= -15 || bond_strength === 'cold' || aiAnalysis?.risk_detected;
    
    if (riskTriggered) {
      await getSupabaseAdmin().from('risk_queue').upsert({
        org_id,
        target_node: target_id,
        priority: emotion_delta <= -20 ? 'CRITICAL' : 'HIGH',
        risk_score: Math.abs(emotion_delta) * 4,
        signals: [
          ...(emotion_delta <= -15 ? [`감정 변화 ${emotion_delta}`] : []),
          ...(bond_strength === 'cold' ? ['유대 관계 냉각'] : []),
          ...(aiAnalysis?.risk_signals || []),
        ],
        suggested_action: aiAnalysis?.suggested_action || '담당자 확인 필요',
        status: 'open',
        created_at: new Date().toISOString(),
      }, {
        onConflict: 'target_node',
        ignoreDuplicates: false,
      });
      
      // n8n 웹훅 트리거 (Active Shield)
      if (process.env.N8N_WEBHOOK_URL) {
        fetch(process.env.N8N_WEBHOOK_URL + '/quick-tag', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'risk_detected',
            target_id,
            emotion_delta,
            bond_strength,
            ai_analysis: aiAnalysis,
          }),
        }).catch(console.error);
      }
    }

    return NextResponse.json({
      success: true,
      log_id: log.id,
      ai_analysis: aiAnalysis,
      risk_triggered: riskTriggered,
      new_s_index: target_type === 'student' ? (50 + emotion_delta) : null,
    });

  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error('Quick Tag error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// Voice-to-Insight AI 분석
async function analyzeVoiceInsight(text: string) {
  if (!process.env.CLAUDE_API_KEY) {
    // Mock 응답
    const isNegative = text.includes('불만') || text.includes('걱정') || text.includes('비용');
    return {
      sentiment: isNegative ? 'negative' : 'neutral',
      risk_detected: isNegative,
      risk_signals: isNegative ? ['부정적 감정 감지'] : [],
      opportunity_signals: [],
      flags: isNegative ? ['주의 필요'] : [],
      suggested_action: isNegative ? '담당자 확인 필요' : null,
      confidence: 0.7,
    };
  }
  
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        system: `당신은 학원 고객 관계 분석 전문가입니다. 
상담 내용에서 위험 신호와 기회를 감지하세요.
JSON 형식으로만 응답하세요.`,
        messages: [{
          role: 'user',
          content: `다음 상담 메모를 분석해주세요:
"${text}"

다음 JSON 형식으로 응답:
{
  "sentiment": "positive" | "neutral" | "negative",
  "risk_detected": boolean,
  "risk_signals": string[],
  "opportunity_signals": string[],
  "flags": string[],
  "suggested_action": string,
  "confidence": number
}`
        }],
      }),
    });

    const data = await response.json();
    const content = data.content?.[0]?.text || '{}';
    
    try {
      return JSON.parse(content);
    } catch {
      return {
        sentiment: 'neutral',
        risk_detected: false,
        risk_signals: [],
        opportunity_signals: [],
        flags: [],
        suggested_action: '추가 분석 필요',
        confidence: 0.5,
      };
    }
  } catch (error) {
    console.error('AI Analysis error:', error);
    return null;
  }
}

// GET: 최근 태그 조회
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('org_id');
  const limit = parseInt(searchParams.get('limit') || '20');
  
  if (!orgId) {
    return NextResponse.json({ error: 'org_id required' }, { status: 400 });
  }
  
  const { data, error } = await getSupabaseAdmin()
    .from('interaction_logs')
    .select('*')
    .eq('org_id', orgId)
    .eq('interaction_type', 'quick_tag')
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  // 통계 계산
  const stats = {
    total_today: data?.filter(d => 
      new Date(d.created_at).toDateString() === new Date().toDateString()
    ).length || 0,
    positive: data?.filter(d => d.vectorized_data?.emotion_delta > 0).length || 0,
    negative: data?.filter(d => d.vectorized_data?.emotion_delta < 0).length || 0,
    neutral: data?.filter(d => d.vectorized_data?.emotion_delta === 0).length || 0,
  };
  
  return NextResponse.json({ tags: data, stats });
}
