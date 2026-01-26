/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🧪 Chemistry Matching 엔진
 * 선생님-학생 궁합 분석 및 V 창출 예측
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { ChemistryInput, ChemistryResult } from './types';

// 교수 스타일 유형
type TeachingStyle = 'strict' | 'supportive' | 'analytical' | 'creative' | 'balanced';

// 학습 스타일 유형
type LearningStyle = 'self_directed' | 'guided' | 'visual' | 'hands_on' | 'mixed';

// 스타일 상성 매트릭스
const COMPATIBILITY_MATRIX: Record<TeachingStyle, Record<LearningStyle, number>> = {
  strict: {
    self_directed: 85,
    guided: 70,
    visual: 60,
    hands_on: 55,
    mixed: 65,
  },
  supportive: {
    self_directed: 60,
    guided: 90,
    visual: 75,
    hands_on: 80,
    mixed: 78,
  },
  analytical: {
    self_directed: 90,
    guided: 65,
    visual: 70,
    hands_on: 55,
    mixed: 72,
  },
  creative: {
    self_directed: 75,
    guided: 70,
    visual: 95,
    hands_on: 90,
    mixed: 82,
  },
  balanced: {
    self_directed: 75,
    guided: 78,
    visual: 75,
    hands_on: 75,
    mixed: 85,
  },
};

// 스타일 라벨
const STYLE_LABELS: Record<string, string> = {
  strict: '엄격/관리형',
  supportive: '지지/격려형',
  analytical: '분석/논리형',
  creative: '창의/자유형',
  balanced: '균형형',
  self_directed: '자기주도형',
  guided: '지도 선호형',
  visual: '시각 학습형',
  hands_on: '실습 학습형',
  mixed: '복합형',
};

/**
 * Chemistry 매칭 분석
 */
export function analyzeChemistry(
  teachingStyle: TeachingStyle,
  learningStyle: LearningStyle,
  context?: {
    studentRiskTags?: string[];
    teacherExperience?: number;
    subjectMatch?: boolean;
  }
): ChemistryResult {
  // 기본 호환성 점수
  let baseScore = COMPATIBILITY_MATRIX[teachingStyle][learningStyle];
  
  // 추가 요인 반영
  let adjustedScore = baseScore;
  
  // 위험 학생 컨텍스트
  if (context?.studentRiskTags?.includes('관찰필요')) {
    if (teachingStyle === 'supportive') adjustedScore += 10;
    if (teachingStyle === 'strict') adjustedScore -= 10;
  }
  
  if (context?.studentRiskTags?.includes('성적하락')) {
    if (teachingStyle === 'analytical') adjustedScore += 5;
  }
  
  // 경험 보너스
  if (context?.teacherExperience && context.teacherExperience > 5) {
    adjustedScore += 5;
  }
  
  // 과목 매칭 보너스
  if (context?.subjectMatch) {
    adjustedScore += 5;
  }
  
  // 점수 정규화
  adjustedScore = Math.min(100, Math.max(0, adjustedScore));
  
  // 예상 V 창출 계산
  const avgTuition = 450000; // 월 평균 수업료
  const retentionBonus = adjustedScore / 100;
  const predictedVCreation = Math.round(avgTuition * retentionBonus * 12); // 연간
  
  // 시너지/리스크 포인트 생성
  const synergyPoints = generateSynergyPoints(teachingStyle, learningStyle, adjustedScore);
  const riskPoints = generateRiskPoints(teachingStyle, learningStyle, adjustedScore);
  
  return {
    compatibility_score: adjustedScore,
    predicted_v_creation: predictedVCreation,
    recommendation: getRecommendation(adjustedScore),
    analysis: {
      teaching_style: STYLE_LABELS[teachingStyle] || teachingStyle,
      learning_style: STYLE_LABELS[learningStyle] || learningStyle,
      synergy_points: synergyPoints,
      risk_points: riskPoints,
    },
    similar_cases: {
      success_rate: Math.round(adjustedScore * 0.9), // 유사 케이스 성공률 추정
      avg_duration_months: Math.round(6 + (adjustedScore / 100) * 18), // 6-24개월
    },
  };
}

/**
 * 권장 등급 반환
 */
function getRecommendation(score: number): ChemistryResult['recommendation'] {
  if (score >= 85) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 50) return 'neutral';
  return 'poor';
}

/**
 * 시너지 포인트 생성
 */
function generateSynergyPoints(
  teaching: TeachingStyle,
  learning: LearningStyle,
  score: number
): string[] {
  const points: string[] = [];
  
  if (score >= 80) {
    points.push('스타일 궁합이 매우 좋음');
  }
  
  if (teaching === 'supportive' && learning === 'guided') {
    points.push('세심한 지도가 필요한 학생에게 최적');
  }
  
  if (teaching === 'analytical' && learning === 'self_directed') {
    points.push('논리적 접근으로 자기주도 학습 촉진');
  }
  
  if (teaching === 'creative' && (learning === 'visual' || learning === 'hands_on')) {
    points.push('창의적 교수법이 학습 효과 극대화');
  }
  
  if (teaching === 'balanced') {
    points.push('다양한 학습 스타일에 유연하게 대응 가능');
  }
  
  if (teaching === 'strict' && learning === 'self_directed') {
    points.push('명확한 기준과 자기 동기부여의 조합');
  }
  
  return points.length > 0 ? points : ['기본 호환성 유지'];
}

/**
 * 리스크 포인트 생성
 */
function generateRiskPoints(
  teaching: TeachingStyle,
  learning: LearningStyle,
  score: number
): string[] {
  const points: string[] = [];
  
  if (score < 60) {
    points.push('스타일 차이로 소통 어려움 가능');
  }
  
  if (teaching === 'strict' && learning === 'hands_on') {
    points.push('엄격한 방식이 실습형 학생에게 부담될 수 있음');
  }
  
  if (teaching === 'analytical' && learning === 'visual') {
    points.push('논리 중심 설명이 시각형 학생에게 어려울 수 있음');
  }
  
  if (teaching === 'creative' && learning === 'guided') {
    points.push('자유로운 방식이 가이드 선호 학생에게 혼란을 줄 수 있음');
  }
  
  if (teaching === 'supportive' && learning === 'self_directed') {
    points.push('과도한 지원이 자기주도형 학생의 독립성을 저해할 수 있음');
  }
  
  return points;
}

/**
 * 최적 매칭 추천
 */
export function recommendOptimalMatching(
  teachers: Array<{
    id: string;
    name: string;
    teaching_style: TeachingStyle;
    experience: number;
    current_students: number;
    max_students: number;
  }>,
  student: {
    id: string;
    learning_style: LearningStyle;
    risk_tags?: string[];
  }
): Array<{
  teacher_id: string;
  teacher_name: string;
  chemistry: ChemistryResult;
  availability: boolean;
}> {
  return teachers
    .map(teacher => {
      const chemistry = analyzeChemistry(
        teacher.teaching_style,
        student.learning_style,
        {
          studentRiskTags: student.risk_tags,
          teacherExperience: teacher.experience,
        }
      );
      
      return {
        teacher_id: teacher.id,
        teacher_name: teacher.name,
        chemistry,
        availability: teacher.current_students < teacher.max_students,
      };
    })
    .sort((a, b) => {
      // 가용성 우선, 그 다음 호환성 점수
      if (a.availability !== b.availability) {
        return a.availability ? -1 : 1;
      }
      return b.chemistry.compatibility_score - a.chemistry.compatibility_score;
    });
}

/**
 * 매칭 히스토리 기반 학습
 */
export function learnFromMatchingHistory(
  history: Array<{
    teaching_style: TeachingStyle;
    learning_style: LearningStyle;
    outcome: 'success' | 'neutral' | 'failure';
    duration_months: number;
    v_created: number;
  }>
): Record<TeachingStyle, Record<LearningStyle, { success_rate: number; avg_v: number }>> {
  const stats: Record<string, Record<string, { total: number; success: number; totalV: number }>> = {};
  
  // 초기화
  Object.keys(COMPATIBILITY_MATRIX).forEach(t => {
    stats[t] = {};
    Object.keys(COMPATIBILITY_MATRIX[t as TeachingStyle]).forEach(l => {
      stats[t][l] = { total: 0, success: 0, totalV: 0 };
    });
  });
  
  // 집계
  history.forEach(h => {
    const key = stats[h.teaching_style]?.[h.learning_style];
    if (key) {
      key.total++;
      if (h.outcome === 'success') key.success++;
      key.totalV += h.v_created;
    }
  });
  
  // 결과 변환
  const result: Record<TeachingStyle, Record<LearningStyle, { success_rate: number; avg_v: number }>> = {} as any;
  
  Object.entries(stats).forEach(([t, learningStats]) => {
    result[t as TeachingStyle] = {} as any;
    Object.entries(learningStats).forEach(([l, s]) => {
      result[t as TeachingStyle][l as LearningStyle] = {
        success_rate: s.total > 0 ? s.success / s.total : 0.5,
        avg_v: s.total > 0 ? s.totalV / s.total : 0,
      };
    });
  });
  
  return result;
}
