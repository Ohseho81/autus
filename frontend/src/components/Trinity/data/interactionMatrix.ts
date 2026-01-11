/**
 * AUTUS - 72x72 상호작용 매트릭스
 * ================================
 * 
 * 72타입 간의 상호작용 계수를 계산하는 엔진
 * 
 * 상호작용 변수 (ξ): -1.0 ~ +1.0
 * - +0.7 이상: 공명 (Resonance) - 황금색
 * - +0.3 ~ +0.7: 안정 (Stable) - 초록색  
 * - -0.3 ~ +0.3: 중립 (Neutral) - 회색
 * - -0.7 ~ -0.3: 마찰 (Friction) - 노란색
 * - -0.7 이하: 충돌 (Conflict) - 빨간색
 */

import { NodeType, InteractionResult, ALL_72_TYPES } from './node72Types';
export type { InteractionResult } from './node72Types';

// ═══════════════════════════════════════════════════════════════════════════
// 상호작용 계산 공식
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 두 타입 간의 상호작용 계수 계산
 * 
 * 공식: ξ = (상성 계수 × 0.4) + (벡터 유사도 × 0.3) + (역할 시너지 × 0.3)
 */
export function calculateInteraction(typeA: NodeType, typeB: NodeType): InteractionResult {
  // 1. 상성 계수 (카테고리 간 기본 상성)
  const compatibilityScore = getCompatibilityScore(typeA.category, typeB.category);
  
  // 2. 벡터 유사도 (6개 특성 벡터의 코사인 유사도 변형)
  const vectorSimilarity = calculateVectorSimilarity(typeA.vectors, typeB.vectors);
  
  // 3. 역할 시너지 (상호보완성)
  const roleSynergy = calculateRoleSynergy(typeA, typeB);
  
  // 최종 계수
  const coefficient = (compatibilityScore * 0.4) + (vectorSimilarity * 0.3) + (roleSynergy * 0.3);
  
  // 결과 타입 결정
  const type = getInteractionType(coefficient);
  
  // 결과 및 액션 생성
  const { outcome, action } = generateOutcomeAndAction(typeA, typeB, coefficient, type);
  
  return {
    nodeA: typeA.id,
    nodeB: typeB.id,
    coefficient: Math.round(coefficient * 100) / 100,
    type,
    outcome,
    action
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 상성 계수 (카테고리 간)
// ═══════════════════════════════════════════════════════════════════════════

const COMPATIBILITY_MATRIX: Record<string, Record<string, number>> = {
  'T': { 'T': 0.3, 'B': 0.9, 'L': 0.5 },  // 투자자-투자자: 경쟁, 투자자-사업가: 최고 시너지
  'B': { 'T': 0.9, 'B': 0.6, 'L': 0.8 },  // 사업가-투자자: 최고 시너지, 사업가-근로자: 높음
  'L': { 'T': 0.5, 'B': 0.8, 'L': 0.4 },  // 근로자-사업가: 높음, 근로자-근로자: 협업 필요
};

function getCompatibilityScore(catA: string, catB: string): number {
  const base = COMPATIBILITY_MATRIX[catA]?.[catB] ?? 0.5;
  // -1 ~ +1 범위로 변환
  return (base - 0.5) * 2;
}

// ═══════════════════════════════════════════════════════════════════════════
// 벡터 유사도
// ═══════════════════════════════════════════════════════════════════════════

function calculateVectorSimilarity(
  vecA: NodeType['vectors'], 
  vecB: NodeType['vectors']
): number {
  const keys = ['risk', 'social', 'execution', 'creativity', 'stability', 'leadership'] as const;
  
  // 상호보완성 계산 (차이가 적당히 있으면서 합이 높으면 좋음)
  let complementScore = 0;
  let totalWeight = 0;
  
  keys.forEach(key => {
    const a = vecA[key];
    const b = vecB[key];
    
    // 상호보완 점수: 둘 중 하나가 높고 합이 높으면 좋음
    const max = Math.max(a, b);
    const sum = a + b;
    const diff = Math.abs(a - b);
    
    // 차이가 30-50 사이일 때 최적 (상호보완)
    const complementary = diff >= 30 && diff <= 50 ? 1 : (diff < 30 ? 0.7 : 0.5);
    
    // 합이 높으면 좋음
    const strength = sum / 200;
    
    complementScore += complementary * strength;
    totalWeight += 1;
  });
  
  const similarity = complementScore / totalWeight;
  
  // -1 ~ +1 범위로 변환
  return (similarity - 0.5) * 2;
}

// ═══════════════════════════════════════════════════════════════════════════
// 역할 시너지
// ═══════════════════════════════════════════════════════════════════════════

function calculateRoleSynergy(typeA: NodeType, typeB: NodeType): number {
  // 특정 조합에 대한 시너지 보너스
  const synergyRules: Array<{ condA: string[], condB: string[], bonus: number }> = [
    // 공격적 투자자 + 확장형 사업가 = 최고 시너지
    { condA: ['T01', 'T02', 'T03'], condB: ['B02', 'B07', 'B12'], bonus: 0.9 },
    // 시스템 사업가 + 반복형 근로자 = 안정적 시너지
    { condA: ['B03', 'B13'], condB: ['L21', 'L10', 'L12'], bonus: 0.8 },
    // 보수적 투자자 + 모험적 사업가 = 마찰
    { condA: ['T05', 'T06', 'T18'], condB: ['B07', 'B08'], bonus: -0.4 },
    // 창의적 근로자끼리 = 방향성 상실 가능
    { condA: ['L01', 'L03', 'L06'], condB: ['L01', 'L03', 'L06'], bonus: 0.1 },
    // 총괄형 사업가 + 공격적 투자자 = 전략적 시너지
    { condA: ['B01', 'B20', 'B24'], condB: ['T01', 'T04', 'T19'], bonus: 0.85 },
    // 플랫폼 사업가 + 기술 사업가 = 높은 시너지
    { condA: ['B04', 'B08'], condB: ['L04', 'L11'], bonus: 0.7 },
    // 영업 + 마케터 = 좋은 조합
    { condA: ['L13'], condB: ['L14'], bonus: 0.6 },
  ];
  
  for (const rule of synergyRules) {
    if (
      (rule.condA.includes(typeA.id) && rule.condB.includes(typeB.id)) ||
      (rule.condA.includes(typeB.id) && rule.condB.includes(typeA.id))
    ) {
      return rule.bonus;
    }
  }
  
  // 기본값: 리더십 높은 쪽과 실행력 높은 쪽의 조합
  const leaderFollower = 
    (typeA.vectors.leadership > 70 && typeB.vectors.execution > 70) ||
    (typeB.vectors.leadership > 70 && typeA.vectors.execution > 70);
  
  if (leaderFollower) return 0.5;
  
  return 0;
}

// ═══════════════════════════════════════════════════════════════════════════
// 상호작용 타입 결정
// ═══════════════════════════════════════════════════════════════════════════

function getInteractionType(coefficient: number): InteractionResult['type'] {
  if (coefficient >= 0.7) return 'resonance';
  if (coefficient >= 0.3) return 'stable';
  if (coefficient >= -0.3) return 'neutral';
  if (coefficient >= -0.7) return 'friction';
  return 'conflict';
}

// ═══════════════════════════════════════════════════════════════════════════
// 결과 및 액션 생성
// ═══════════════════════════════════════════════════════════════════════════

function generateOutcomeAndAction(
  typeA: NodeType, 
  typeB: NodeType, 
  coefficient: number,
  type: InteractionResult['type']
): { outcome: string; action: string } {
  const outcomes: Record<InteractionResult['type'], string[]> = {
    resonance: [
      '자본 가속도(α) 폭발',
      '수익 밀도(ρ) 최대화',
      '신규 노드(자리) 생성',
      '네트워크 효과 극대화',
      '시너지 증폭 루프 형성'
    ],
    stable: [
      '수익 밀도(ρ) 최적화',
      '안정적 성장 궤도',
      '효율성 개선',
      '프로세스 자동화 완성',
      '지속가능한 협력 구조'
    ],
    neutral: [
      '현상 유지',
      '관찰 모드 지속',
      '잠재적 연결 대기',
      '데이터 수집 중',
      '방향성 탐색 필요'
    ],
    friction: [
      '엔트로피(Δ) 발생',
      '에너지 손실 감지',
      '방향성 불일치',
      '조정 비용 발생',
      '중재 필요'
    ],
    conflict: [
      '연결 단절 권고',
      '심각한 에너지 누수',
      '상호 가치 훼손',
      '시스템 불안정화',
      '즉각적 분리 필요'
    ]
  };
  
  const actions: Record<InteractionResult['type'], string[]> = {
    resonance: [
      '레버리지 파이프라인 무제한 승인',
      '골든 라인(Golden Line) 연결',
      '우선순위 최상위 배정',
      '자원 집중 투입',
      '확장 가속화 승인'
    ],
    stable: [
      '루틴 프로세스 자동화 도킹',
      '정기 모니터링 설정',
      '점진적 자원 배분',
      '안정화 유지 전략',
      '최적화 알고리즘 적용'
    ],
    neutral: [
      '관찰 모드 유지',
      '데이터 축적 후 재평가',
      '촉매 노드 탐색',
      '잠재력 테스트 실행',
      '조건부 연결 대기'
    ],
    friction: [
      '중력장 분리 또는 중재 노드 투입',
      '버퍼 노드 배치',
      '간접 연결 전환',
      '냉각 기간 설정',
      '역할 재조정 제안'
    ],
    conflict: [
      '즉각적 연결 해제',
      '격리 구역 배정',
      '대체 경로 탐색',
      '손실 최소화 모드',
      'Purge 프로토콜 실행'
    ]
  };
  
  const outcomeList = outcomes[type];
  const actionList = actions[type];
  
  // 해시 기반 일관된 선택
  const hash = (typeA.id + typeB.id).split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  
  return {
    outcome: outcomeList[hash % outcomeList.length],
    action: actionList[hash % actionList.length]
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// 전체 72x72 매트릭스 생성
// ═══════════════════════════════════════════════════════════════════════════

export function generateFullMatrix(): InteractionResult[][] {
  const matrix: InteractionResult[][] = [];
  
  for (let i = 0; i < ALL_72_TYPES.length; i++) {
    const row: InteractionResult[] = [];
    for (let j = 0; j < ALL_72_TYPES.length; j++) {
      row.push(calculateInteraction(ALL_72_TYPES[i], ALL_72_TYPES[j]));
    }
    matrix.push(row);
  }
  
  return matrix;
}

// 특정 타입의 상호작용 목록 (상위 N개)
export function getTopInteractions(typeId: string, topN: number = 10): InteractionResult[] {
  const type = ALL_72_TYPES.find(t => t.id === typeId);
  if (!type) return [];
  
  const interactions = ALL_72_TYPES
    .filter(t => t.id !== typeId)
    .map(t => calculateInteraction(type, t))
    .sort((a, b) => b.coefficient - a.coefficient);
  
  return interactions.slice(0, topN);
}

// 특정 타입의 최악 상호작용 (하위 N개)
export function getWorstInteractions(typeId: string, bottomN: number = 5): InteractionResult[] {
  const type = ALL_72_TYPES.find(t => t.id === typeId);
  if (!type) return [];
  
  const interactions = ALL_72_TYPES
    .filter(t => t.id !== typeId)
    .map(t => calculateInteraction(type, t))
    .sort((a, b) => a.coefficient - b.coefficient);
  
  return interactions.slice(0, bottomN);
}

// 상호작용 타입별 색상
export const INTERACTION_COLORS: Record<InteractionResult['type'], { bg: string; text: string; border: string }> = {
  resonance: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' },
  stable: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
  neutral: { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/30' },
  friction: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  conflict: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
};

// 상호작용 타입 라벨
export const INTERACTION_LABELS: Record<InteractionResult['type'], string> = {
  resonance: '공명',
  stable: '안정',
  neutral: '중립',
  friction: '마찰',
  conflict: '충돌',
};
