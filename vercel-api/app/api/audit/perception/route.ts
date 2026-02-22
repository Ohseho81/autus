/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🔍 Perception Audit - 시스템 인지력 진단
 * 
 * Quick Tag 데이터 품질 전수 조사
 * - Tag Relevance 분석 (결정적 태그 비중)
 * - Voice-to-Data 변환 정밀도
 * - 데이터 정제 수준 평가
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../../lib/supabase';
import { captureError } from '../../../../lib/monitoring';

// Dynamic route - prevents static generation error
export const dynamic = 'force-dynamic';


// 결정적 태그 (이탈과 직결)
const CRITICAL_TAGS = [
  // 고위험 (이탈 직결)
  's:-20', 's:-15', 'M:-15', 'M:-10',
  'psych_fear', 'psych_cost', '비용', '불만', '퇴원',
  'bond:차가움', '결석', '성적하락',
  
  // 긍정 (유지 강화)
  's:+20', 's:+15', 'M:+15', 'M:+10',
  'psych_praise', 'psych_compete', '만족', '추천',
  'bond:강함',
];

// 무의미 태그 (삭제 권장)
const IRRELEVANT_TAGS = [
  '기타', '일반', '보통', 'etc', 'normal',
  'undefined', 'null', '',
];

interface AuditResult {
  summary: {
    total_logs: number;
    audit_period: string;
    data_quality_score: number;
    perception_accuracy: number;
  };
  tag_analysis: {
    critical_tag_ratio: number;
    irrelevant_tag_ratio: number;
    top_critical_tags: Array<{ tag: string; count: number; impact: string }>;
    tags_to_remove: string[];
    recommended_tags: string[];
  };
  vectorization_quality: {
    total_vectorized: number;
    successful_extractions: number;
    extraction_accuracy: number;
    common_errors: Array<{ error: string; count: number }>;
  };
  voice_to_data: {
    total_voice_inputs: number;
    conversion_success_rate: number;
    avg_confidence_score: number;
    prompt_improvement_suggestions: string[];
  };
  refinement_score: {
    s_index_coverage: number;
    m_score_coverage: number;
    bond_strength_coverage: number;
    overall_refinement: number;
  };
  recommendations: string[];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // 1. 전체 로그 조회
    const supabase = getSupabaseAdmin();
    if (!getSupabaseAdmin()) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }
    const { data: logs, error } = await getSupabaseAdmin()
      .from('interaction_logs')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    const totalLogs = logs?.length || 0;
    
    // 2. 태그 분석
    const tagAnalysis = analyzeTagRelevance(logs || []);
    
    // 3. 벡터화 품질 분석
    const vectorizationQuality = analyzeVectorizationQuality(logs || []);
    
    // 4. Voice-to-Data 분석
    const voiceAnalysis = analyzeVoiceToData(logs || []);
    
    // 5. 정제 점수 계산
    const refinementScore = calculateRefinementScore(logs || []);
    
    // 6. 전체 데이터 품질 점수
    const dataQualityScore = calculateDataQualityScore(
      tagAnalysis,
      vectorizationQuality,
      voiceAnalysis,
      refinementScore
    );
    
    // 7. 개선 권장사항 생성
    const recommendations = generateRecommendations(
      tagAnalysis,
      vectorizationQuality,
      voiceAnalysis,
      refinementScore
    );
    
    const auditResult: AuditResult = {
      summary: {
        total_logs: totalLogs,
        audit_period: `${days}일`,
        data_quality_score: dataQualityScore,
        perception_accuracy: refinementScore.overall_refinement,
      },
      tag_analysis: tagAnalysis,
      vectorization_quality: vectorizationQuality,
      voice_to_data: voiceAnalysis,
      refinement_score: refinementScore,
      recommendations,
    };
    
    // 감사 결과 저장
    await getSupabaseAdmin().from('audit_logs').insert({
      audit_type: 'perception',
      audit_result: auditResult,
      created_at: new Date().toISOString(),
    });
    
    return NextResponse.json({
      success: true,
      data: auditResult,
    });
    
  } catch (error) {
    captureError(error instanceof Error ? error : new Error(String(error)), { context: 'audit-perception.handler' });
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// 태그 관련성 분석
function analyzeTagRelevance(logs: Array<Record<string, unknown>>) {
  const tagCounts: Record<string, number> = {};
  let totalTags = 0;
  let criticalTagCount = 0;
  let irrelevantTagCount = 0;
  
  logs.forEach(log => {
    const tags: string[] = Array.isArray(log.tags) ? log.tags : [];
    tags.forEach((tag: string) => {
      totalTags++;
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      
      if (CRITICAL_TAGS.some(ct => tag.includes(ct))) {
        criticalTagCount++;
      }
      if (IRRELEVANT_TAGS.includes(tag.toLowerCase())) {
        irrelevantTagCount++;
      }
    });
  });
  
  // 상위 결정적 태그
  const topCriticalTags = Object.entries(tagCounts)
    .filter(([tag]) => CRITICAL_TAGS.some(ct => tag.includes(ct)))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tag, count]) => ({
      tag,
      count,
      impact: tag.includes('-') ? '위험' : '긍정',
    }));
  
  // 삭제 권장 태그
  const tagsToRemove = Object.entries(tagCounts)
    .filter(([tag, count]) => 
      IRRELEVANT_TAGS.includes(tag.toLowerCase()) || count < 3
    )
    .map(([tag]) => tag);
  
  return {
    critical_tag_ratio: totalTags > 0 ? criticalTagCount / totalTags : 0,
    irrelevant_tag_ratio: totalTags > 0 ? irrelevantTagCount / totalTags : 0,
    top_critical_tags: topCriticalTags,
    tags_to_remove: tagsToRemove,
    recommended_tags: [
      's:-20 (매우 불만)', 's:+20 (매우 만족)',
      'M:-15 (성과 급락)', 'M:+15 (성과 급상승)',
      'psych_cost (비용 민감)', 'psych_fear (이탈 불안)',
    ],
  };
}

// 벡터화 품질 분석
function analyzeVectorizationQuality(logs: Array<Record<string, unknown>>) {
  let successfulExtractions = 0;
  const errorCounts: Record<string, number> = {};
  
  logs.forEach(log => {
    const vector = log.vectorized_data;
    if (vector) {
      if (
        typeof vector.s_delta === 'number' &&
        typeof vector.m_delta === 'number' &&
        vector.analysis_summary !== '분석 불가'
      ) {
        successfulExtractions++;
      } else {
        const error = vector.analysis_summary || 'Unknown error';
        errorCounts[error] = (errorCounts[error] || 0) + 1;
      }
    }
  });
  
  const commonErrors = Object.entries(errorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([error, count]) => ({ error, count }));
  
  return {
    total_vectorized: logs.filter(l => l.vectorized_data).length,
    successful_extractions: successfulExtractions,
    extraction_accuracy: logs.length > 0 ? successfulExtractions / logs.length : 0,
    common_errors: commonErrors,
  };
}

// Voice-to-Data 분석
function analyzeVoiceToData(logs: Array<Record<string, unknown>>) {
  const voiceLogs = logs.filter(l => 
    l.raw_content?.includes('[음성 기록]') || 
    l.raw_content?.includes('voice_transcript')
  );
  
  let successfulConversions = 0;
  let totalConfidence = 0;
  
  voiceLogs.forEach(log => {
    const vector = log.vectorized_data;
    if (vector && vector.analysis_summary !== '분석 불가') {
      successfulConversions++;
      // 신뢰도는 risk_indicators 정밀도로 추정
      totalConfidence += vector.risk_indicators?.length > 0 ? 0.8 : 0.6;
    }
  });
  
  return {
    total_voice_inputs: voiceLogs.length,
    conversion_success_rate: voiceLogs.length > 0 ? successfulConversions / voiceLogs.length : 0,
    avg_confidence_score: voiceLogs.length > 0 ? totalConfidence / voiceLogs.length : 0,
    prompt_improvement_suggestions: [
      '구체적인 감정 키워드 추출 강화',
      '비용 관련 언급 민감도 상향',
      '경쟁사 언급 감지 추가',
      '긍정/부정 톤 분류 정밀도 향상',
    ],
  };
}

// 정제 점수 계산
function calculateRefinementScore(logs: Array<Record<string, unknown>>) {
  let sIndexCoverage = 0;
  let mScoreCoverage = 0;
  let bondCoverage = 0;
  
  logs.forEach(log => {
    const vector = log.vectorized_data;
    if (vector) {
      if (typeof vector.s_delta === 'number' && vector.s_delta !== 0) sIndexCoverage++;
      if (typeof vector.m_delta === 'number' && vector.m_delta !== 0) mScoreCoverage++;
      if (typeof vector.bond_strength === 'number' && vector.bond_strength !== 50) bondCoverage++;
    }
  });
  
  const total = logs.length || 1;
  
  return {
    s_index_coverage: sIndexCoverage / total,
    m_score_coverage: mScoreCoverage / total,
    bond_strength_coverage: bondCoverage / total,
    overall_refinement: (sIndexCoverage + mScoreCoverage + bondCoverage) / (total * 3),
  };
}

// 데이터 품질 점수 계산
function calculateDataQualityScore(
  tagAnalysis: AuditResult['tag_analysis'],
  vectorization: AuditResult['vectorization_quality'],
  voice: AuditResult['voice_to_data'],
  refinement: AuditResult['refinement_score']
): number {
  const weights = {
    criticalTagRatio: 0.25,
    vectorizationAccuracy: 0.30,
    voiceConversion: 0.20,
    refinementScore: 0.25,
  };
  
  const score = 
    tagAnalysis.critical_tag_ratio * weights.criticalTagRatio * 100 +
    vectorization.extraction_accuracy * weights.vectorizationAccuracy * 100 +
    voice.conversion_success_rate * weights.voiceConversion * 100 +
    refinement.overall_refinement * weights.refinementScore * 100;
  
  return Math.round(score);
}

// 개선 권장사항 생성
function generateRecommendations(
  tagAnalysis: AuditResult['tag_analysis'],
  vectorization: AuditResult['vectorization_quality'],
  voice: AuditResult['voice_to_data'],
  refinement: AuditResult['refinement_score']
): string[] {
  const recommendations: string[] = [];
  
  // 태그 관련
  if (tagAnalysis.critical_tag_ratio < 0.3) {
    recommendations.push('⚠️ 결정적 태그 비중이 30% 미만입니다. Quick Tag UI에서 이탈 관련 태그를 상단에 배치하세요.');
  }
  if (tagAnalysis.irrelevant_tag_ratio > 0.1) {
    recommendations.push(`🗑️ 무의미 태그 ${tagAnalysis.tags_to_remove.length}개를 삭제하여 데이터 정밀도를 높이세요.`);
  }
  
  // 벡터화 관련
  if (vectorization.extraction_accuracy < 0.8) {
    recommendations.push('🔧 Claude 벡터화 프롬프트를 개선하여 추출 정확도를 80% 이상으로 올리세요.');
  }
  
  // Voice 관련
  if (voice.conversion_success_rate < 0.7) {
    recommendations.push('🎙️ Voice-to-Data 프롬프트 엔지니어링으로 음성 변환 성공률을 높이세요.');
  }
  
  // 정제 관련
  if (refinement.s_index_coverage < 0.5) {
    recommendations.push('📊 s(t) 만족도 데이터 입력이 부족합니다. 감정 태그 사용을 독려하세요.');
  }
  if (refinement.m_score_coverage < 0.5) {
    recommendations.push('📈 M(성과) 데이터 입력이 부족합니다. 성적/활동 연동을 강화하세요.');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('✅ 현재 시스템 인지력이 양호합니다. 지속적인 모니터링을 권장합니다.');
  }
  
  return recommendations;
}
