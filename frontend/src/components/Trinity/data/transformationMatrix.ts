/**
 * AUTUS - 노드-작용 변환 매트릭스
 * ================================
 * 
 * 72개 노드 타입 × 72개 외부 작용 = 5,184개 변환 경로
 * 
 * "특정 [노드 타입]에게 어떤 [외부 작용]을 가하면 [결과 타입]이 된다"
 */

import { ALL_72_TYPES, NodeType, getTypeById } from './node72Types';
import { ALL_72_FORCES, ForceType, PHYSICS_NODES, ACTION_TYPES } from './forceTypes';

// ═══════════════════════════════════════════════════════════════════════════
// 변환 결과 인터페이스
// ═══════════════════════════════════════════════════════════════════════════

export interface TransformationResult {
  sourceType: string;      // 원본 노드 타입 (T01, B05, L21 등)
  forceApplied: string;    // 적용된 Force (F01-F72)
  
  // 주요 결과
  primaryResult: {
    targetType: string;    // 변환 결과 타입
    probability: number;   // 변환 확률 (0-100%)
    duration: string;      // 소요 시간
  };
  
  // 대안 결과 (확률적)
  alternativeResults: {
    targetType: string;
    probability: number;
    condition: string;     // 조건
  }[];
  
  // 부작용
  sideEffects: {
    node: string;          // 영향받는 물리 노드
    effect: number;        // -3 ~ +3
    description: string;
  }[];
  
  // 메타데이터
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Expert' | 'Legendary';
  reversible: boolean;
  costMultiplier: number;  // 기본 비용 대비 배수
}

// ═══════════════════════════════════════════════════════════════════════════
// 물리 노드 ↔ 노드 타입 매핑
// ═══════════════════════════════════════════════════════════════════════════

// 각 타입이 강한 물리 노드
const TYPE_PRIMARY_NODE: Record<string, string> = {
  // T (투자자) - CAPITAL 중심
  T01: 'CAPITAL', T02: 'CAPITAL', T03: 'CAPITAL', T04: 'CAPITAL',
  T05: 'CAPITAL', T06: 'CAPITAL', T07: 'CAPITAL', T08: 'CAPITAL',
  T09: 'CAPITAL', T10: 'EMOTION', T11: 'CAPITAL', T12: 'CAPITAL',
  T13: 'KNOWLEDGE', T14: 'KNOWLEDGE', T15: 'CAPITAL', T16: 'CAPITAL',
  T17: 'CAPITAL', T18: 'CAPITAL', T19: 'NETWORK', T20: 'NETWORK',
  T21: 'CAPITAL', T22: 'NETWORK', T23: 'CAPITAL', T24: 'CAPITAL',
  
  // B (사업가) - NETWORK/TIME 중심
  B01: 'NETWORK', B02: 'NETWORK', B03: 'TIME', B04: 'NETWORK',
  B05: 'TIME', B06: 'NETWORK', B07: 'EMOTION', B08: 'KNOWLEDGE',
  B09: 'EMOTION', B10: 'KNOWLEDGE', B11: 'KNOWLEDGE', B12: 'EMOTION',
  B13: 'TIME', B14: 'NETWORK', B15: 'TIME', B16: 'NETWORK',
  B17: 'TIME', B18: 'BIO', B19: 'KNOWLEDGE', B20: 'CAPITAL',
  B21: 'CAPITAL', B22: 'KNOWLEDGE', B23: 'NETWORK', B24: 'CAPITAL',
  
  // L (근로자) - TIME/BIO 중심
  L01: 'KNOWLEDGE', L02: 'KNOWLEDGE', L03: 'KNOWLEDGE', L04: 'KNOWLEDGE',
  L05: 'KNOWLEDGE', L06: 'EMOTION', L07: 'TIME', L08: 'NETWORK',
  L09: 'NETWORK', L10: 'TIME', L11: 'KNOWLEDGE', L12: 'TIME',
  L13: 'NETWORK', L14: 'KNOWLEDGE', L15: 'EMOTION', L16: 'KNOWLEDGE',
  L17: 'BIO', L18: 'BIO', L19: 'KNOWLEDGE', L20: 'KNOWLEDGE',
  L21: 'TIME', L22: 'NETWORK', L23: 'KNOWLEDGE', L24: 'TIME',
};

// ═══════════════════════════════════════════════════════════════════════════
// 진화 경로 정의 (주요 변환 규칙)
// ═══════════════════════════════════════════════════════════════════════════

// 카테고리 내 상향 진화 경로
const EVOLUTION_PATHS: Record<string, string[]> = {
  // T: 투자자 진화 트리
  T22: ['T01', 'T05', 'T16'],           // 크라우드 → 공격적/보수적/크립토
  T05: ['T06', 'T07', 'T14'],           // 보수적 → 배당/부동산/가치
  T06: ['T09', 'T18'],                  // 배당 → 기관/채권
  T01: ['T02', 'T03', 'T15'],           // 공격적 → 벤처/투기/성장
  T03: ['T11', 'T13'],                  // 투기 → 헤지펀드/퀀트
  T02: ['T08', 'T20'],                  // 벤처 → 엔젤/시드
  T08: ['T04', 'T19'],                  // 엔젤 → M&A/행동주의
  T09: ['T11', 'T12'],                  // 기관 → 헤지펀드/패밀리오피스
  T11: ['T12', 'T24'],                  // 헤지펀드 → 패밀리오피스/소버린
  
  // B: 사업가 진화 트리
  B15: ['B14', 'B17', 'B05'],           // 소상공인 → 가족/서비스/프랜차이즈
  B14: ['B13', 'B16', 'B18'],           // 가족 → 운영/유통/제조
  B17: ['B03', 'B09', 'B11'],           // 서비스 → 시스템/사회적/콘텐츠
  B05: ['B02', 'B06'],                  // 프랜차이즈 → 확장/글로벌
  B07: ['B08', 'B12'],                  // 모험적 → 기술/연쇄
  B08: ['B04', 'B10'],                  // 기술 → 플랫폼/디자인
  B03: ['B01', 'B04'],                  // 시스템 → 총괄/플랫폼
  B01: ['B20', 'B21', 'B24'],           // 총괄 → 투자/인수/지주
  B12: ['B21', 'B24'],                  // 연쇄창업 → 인수/지주
  
  // L: 근로자 진화 트리
  L21: ['L17', 'L18', 'L15'],           // 반복형 → 물류/생산/고객서비스
  L18: ['L12', 'L16'],                  // 생산 → 품질관리/기술지원
  L15: ['L13', 'L14'],                  // 고객서비스 → 영업/마케터
  L13: ['L07', 'L08'],                  // 영업 → PM/팀리더
  L07: ['L10', 'L02'],                  // PM → 관리자/기획자
  L10: ['L08', 'L19'],                  // 관리자 → 팀리더/법률
  L04: ['L05', 'L11'],                  // 개발자 → 연구원/애널리스트
  L05: ['L19', 'L23'],                  // 연구원 → 법률/교육
  L01: ['L02', 'L03', 'L06'],           // 창의적 → 기획/디자인/크리에이터
  L24: ['L01', 'L04', 'B07'],           // 프리랜서 → 창의적/개발자/모험적사업가
};

// 카테고리 간 전환 경로 (크로스오버)
const CROSSOVER_PATHS: Record<string, { target: string; condition: string }[]> = {
  // L → B (근로자 → 사업가)
  L08: [{ target: 'B15', condition: '독립 창업' }],
  L10: [{ target: 'B13', condition: '관리직 독립' }],
  L24: [{ target: 'B07', condition: '프리랜서 법인화' }, { target: 'B11', condition: '콘텐츠 사업화' }],
  L04: [{ target: 'B08', condition: '기술 스타트업' }],
  L01: [{ target: 'B10', condition: '디자인 에이전시' }, { target: 'B11', condition: '콘텐츠 사업' }],
  L19: [{ target: 'B19', condition: '컨설팅 법인' }],
  L20: [{ target: 'B19', condition: '재무 컨설팅' }, { target: 'T05', condition: '재테크 전문화' }],
  
  // B → T (사업가 → 투자자)
  B24: [{ target: 'T12', condition: '지주회사 자산화' }],
  B20: [{ target: 'T08', condition: '엔젤 전환' }],
  B21: [{ target: 'T04', condition: 'M&A 전문화' }],
  B12: [{ target: 'T02', condition: '벤처 투자 전환' }],
  B01: [{ target: 'T09', condition: '기관 투자 전환' }],
  
  // T → B (투자자 → 사업가) - 역방향
  T08: [{ target: 'B07', condition: '직접 창업' }],
  T19: [{ target: 'B21', condition: '경영권 인수' }],
  T04: [{ target: 'B01', condition: '경영 참여' }],
  
  // L → T (근로자 → 투자자) - 드묾
  L11: [{ target: 'T13', condition: '퀀트 전환' }],
};

// ═══════════════════════════════════════════════════════════════════════════
// Force 효과 매핑
// ═══════════════════════════════════════════════════════════════════════════

// Force가 촉진하는 변환 방향
const FORCE_EFFECTS: Record<string, {
  promotes: string[];      // 촉진하는 변환
  inhibits: string[];      // 억제하는 변환
  categoryShift: number;   // 카테고리 전환 확률 보너스 (-20 ~ +20)
}> = {
  // CAPITAL 관련 Force
  CAPITAL_INJECT: { promotes: ['T', 'B'], inhibits: ['L'], categoryShift: 10 },
  CAPITAL_AMPLIFY: { promotes: ['T'], inhibits: [], categoryShift: 15 },
  CAPITAL_UPGRADE: { promotes: ['T', 'B'], inhibits: ['L'], categoryShift: 5 },
  
  // NETWORK 관련 Force
  NETWORK_INJECT: { promotes: ['B'], inhibits: [], categoryShift: 5 },
  NETWORK_AMPLIFY: { promotes: ['B', 'T'], inhibits: ['L'], categoryShift: 10 },
  NETWORK_UPGRADE: { promotes: ['B'], inhibits: [], categoryShift: 5 },
  
  // KNOWLEDGE 관련 Force
  KNOWLEDGE_AMPLIFY: { promotes: ['L', 'B'], inhibits: [], categoryShift: 5 },
  KNOWLEDGE_UPGRADE: { promotes: ['L'], inhibits: [], categoryShift: 0 },
  
  // TIME 관련 Force
  TIME_AMPLIFY: { promotes: ['B', 'T'], inhibits: ['L'], categoryShift: 15 },
  TIME_INJECT: { promotes: ['B'], inhibits: [], categoryShift: 10 },
  
  // EMOTION 관련 Force
  EMOTION_AMPLIFY: { promotes: ['B'], inhibits: [], categoryShift: 10 },
  EMOTION_UPGRADE: { promotes: ['L', 'B'], inhibits: [], categoryShift: 5 },
};

// ═══════════════════════════════════════════════════════════════════════════
// 핵심 변환 계산 함수
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 노드 타입에 Force를 적용했을 때의 변환 결과 계산
 */
export function calculateTransformation(
  sourceTypeId: string,
  forceId: string
): TransformationResult {
  const sourceType = getTypeById(sourceTypeId);
  const force = ALL_72_FORCES.find(f => f.id === forceId);
  
  if (!sourceType || !force) {
    throw new Error(`Invalid source type (${sourceTypeId}) or force (${forceId})`);
  }
  
  const sourceCategory = sourceTypeId.charAt(0); // T, B, L
  const sourceNode = TYPE_PRIMARY_NODE[sourceTypeId];
  const forceNode = force.node;
  const forceAction = force.action;
  const forceCode = `${forceNode}_${forceAction}`;
  
  // 1. 기본 확률 계산
  let baseProbability = 30; // 기본 30%
  
  // 물리 노드 매칭 보너스
  if (sourceNode === forceNode) {
    baseProbability += 25; // 같은 노드면 +25%
  }
  
  // Force 효과 적용
  const forceEffect = FORCE_EFFECTS[forceCode];
  if (forceEffect) {
    if (forceEffect.promotes.includes(sourceCategory)) {
      baseProbability += 15;
    }
    if (forceEffect.inhibits.includes(sourceCategory)) {
      baseProbability -= 20;
    }
  }
  
  // 2. 주요 결과 타입 결정
  let primaryTarget = sourceTypeId; // 기본: 변화 없음
  let possibleEvolutions = EVOLUTION_PATHS[sourceTypeId] || [];
  
  // 증폭/업그레이드 계열 Force는 상향 진화
  if (['AMPLIFY', 'UPGRADE', 'INJECT'].includes(forceAction)) {
    if (possibleEvolutions.length > 0) {
      // 물리 노드가 매칭되는 진화 경로 우선
      const matchingEvolution = possibleEvolutions.find(evo => 
        TYPE_PRIMARY_NODE[evo] === forceNode
      );
      primaryTarget = matchingEvolution || possibleEvolutions[0];
      baseProbability += 10;
    }
  }
  
  // 감쇠/다운그레이드 계열 Force는 하향 또는 유지
  if (['DECAY', 'DOWNGRADE', 'DRAIN'].includes(forceAction)) {
    // 역방향 진화 경로 찾기
    const reverseEvolution = Object.entries(EVOLUTION_PATHS).find(([_, targets]) =>
      targets.includes(sourceTypeId)
    );
    if (reverseEvolution) {
      primaryTarget = reverseEvolution[0];
      baseProbability = Math.max(baseProbability - 10, 20);
    }
  }
  
  // 3. 카테고리 전환 가능성 체크
  const alternativeResults: TransformationResult['alternativeResults'] = [];
  const crossoverPaths = CROSSOVER_PATHS[sourceTypeId] || [];
  
  if (crossoverPaths.length > 0 && forceEffect?.categoryShift) {
    for (const crossover of crossoverPaths) {
      const crossoverProb = Math.min(forceEffect.categoryShift + 10, 30);
      alternativeResults.push({
        targetType: crossover.target,
        probability: crossoverProb,
        condition: crossover.condition
      });
    }
  }
  
  // 4. 부작용 계산
  const sideEffects: TransformationResult['sideEffects'] = [];
  const actionType = ACTION_TYPES[forceAction as keyof typeof ACTION_TYPES];
  
  if (actionType) {
    // 주 효과
    sideEffects.push({
      node: forceNode,
      effect: actionType.effect,
      description: `${PHYSICS_NODES[forceNode as keyof typeof PHYSICS_NODES]?.name || forceNode} ${actionType.name}`
    });
    
    // 연쇄 효과 (일부 Force는 다른 노드에도 영향)
    if (forceAction === 'AMPLIFY') {
      // 증폭은 인접 노드에도 약한 긍정 효과
      const adjacentNodes = getAdjacentNodes(forceNode);
      for (const adj of adjacentNodes) {
        sideEffects.push({
          node: adj,
          effect: 1,
          description: `${PHYSICS_NODES[adj as keyof typeof PHYSICS_NODES]?.name || adj} 연쇄 증가`
        });
      }
    }
    
    if (forceAction === 'DRAIN' || forceAction === 'DECAY') {
      // 유출/감쇠는 EMOTION에 부정 영향
      if (forceNode !== 'EMOTION') {
        sideEffects.push({
          node: 'EMOTION',
          effect: -1,
          description: '감정 에너지 소모'
        });
      }
    }
  }
  
  // 5. 난이도 계산
  const difficulty = calculateDifficulty(sourceTypeId, primaryTarget, force);
  
  // 6. 소요 시간 계산
  const duration = calculateDuration(sourceTypeId, primaryTarget, force);
  
  // 7. 비용 배수 계산
  const costMultiplier = calculateCostMultiplier(sourceCategory, primaryTarget.charAt(0), force);
  
  // 8. 가역성 판단
  const reversible = !['UPGRADE', 'DOWNGRADE'].includes(forceAction);
  
  return {
    sourceType: sourceTypeId,
    forceApplied: forceId,
    primaryResult: {
      targetType: primaryTarget,
      probability: Math.min(Math.max(baseProbability, 10), 95), // 10-95% 범위
      duration
    },
    alternativeResults,
    sideEffects,
    difficulty,
    reversible,
    costMultiplier
  };
}

// 인접 물리 노드 반환
function getAdjacentNodes(node: string): string[] {
  const adjacency: Record<string, string[]> = {
    BIO: ['EMOTION', 'TIME'],
    CAPITAL: ['NETWORK', 'TIME'],
    NETWORK: ['CAPITAL', 'EMOTION', 'KNOWLEDGE'],
    KNOWLEDGE: ['NETWORK', 'TIME'],
    TIME: ['BIO', 'CAPITAL', 'KNOWLEDGE'],
    EMOTION: ['BIO', 'NETWORK']
  };
  return adjacency[node] || [];
}

// 난이도 계산
function calculateDifficulty(
  source: string,
  target: string,
  force: ForceType
): TransformationResult['difficulty'] {
  const sourceCategory = source.charAt(0);
  const targetCategory = target.charAt(0);
  
  // 카테고리 전환은 어려움
  if (sourceCategory !== targetCategory) {
    if (force.rarity === 'Legendary') return 'Legendary';
    if (force.rarity === 'Epic') return 'Expert';
    return 'Hard';
  }
  
  // 같은 카테고리 내 진화
  const sourceNum = parseInt(source.slice(1));
  const targetNum = parseInt(target.slice(1));
  const gap = Math.abs(targetNum - sourceNum);
  
  if (gap <= 3) return 'Easy';
  if (gap <= 8) return 'Medium';
  if (gap <= 15) return 'Hard';
  return 'Expert';
}

// 소요 시간 계산
function calculateDuration(source: string, target: string, force: ForceType): string {
  const sourceCategory = source.charAt(0);
  const targetCategory = target.charAt(0);
  
  // 카테고리 전환
  if (sourceCategory !== targetCategory) {
    if (sourceCategory === 'L' && targetCategory === 'B') return '1-3년';
    if (sourceCategory === 'B' && targetCategory === 'T') return '3-10년';
    if (sourceCategory === 'L' && targetCategory === 'T') return '5-15년';
    return '2-5년';
  }
  
  // 같은 카테고리 내
  if (source === target) return force.duration;
  
  const gap = Math.abs(parseInt(source.slice(1)) - parseInt(target.slice(1)));
  if (gap <= 3) return '3-12개월';
  if (gap <= 8) return '1-3년';
  return '3-7년';
}

// 비용 배수 계산
function calculateCostMultiplier(sourceCategory: string, targetCategory: string, force: ForceType): number {
  let multiplier = force.cost / 5; // 기본 비용 기반
  
  // 카테고리 전환 보너스
  if (sourceCategory !== targetCategory) {
    if (targetCategory === 'T') multiplier *= 3;
    else if (targetCategory === 'B') multiplier *= 2;
  }
  
  return Math.round(multiplier * 10) / 10;
}

// ═══════════════════════════════════════════════════════════════════════════
// 전체 매트릭스 생성
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 특정 노드 타입에 대한 모든 Force 효과 계산
 */
export function getTransformationsForType(typeId: string): TransformationResult[] {
  return ALL_72_FORCES.map(force => calculateTransformation(typeId, force.id));
}

/**
 * 특정 Force에 대한 모든 노드 타입 효과 계산
 */
export function getTransformationsForForce(forceId: string): TransformationResult[] {
  return ALL_72_TYPES.map(type => calculateTransformation(type.id, forceId));
}

/**
 * 목표 타입으로 가는 최적 경로 찾기
 */
export function findOptimalPath(
  sourceTypeId: string,
  targetTypeId: string,
  maxSteps: number = 5
): { path: string[]; forces: string[]; totalProbability: number; totalDuration: string }[] {
  const results: { path: string[]; forces: string[]; totalProbability: number; totalDuration: string }[] = [];
  
  // BFS로 경로 탐색
  const queue: { current: string; path: string[]; forces: string[]; prob: number }[] = [
    { current: sourceTypeId, path: [sourceTypeId], forces: [], prob: 100 }
  ];
  
  const visited = new Set<string>();
  
  while (queue.length > 0 && results.length < 5) {
    const { current, path, forces, prob } = queue.shift()!;
    
    if (current === targetTypeId && path.length > 1) {
      results.push({
        path,
        forces,
        totalProbability: prob,
        totalDuration: estimateTotalDuration(path)
      });
      continue;
    }
    
    if (path.length >= maxSteps || visited.has(current)) continue;
    visited.add(current);
    
    // 가능한 모든 변환 시도
    for (const force of ALL_72_FORCES) {
      const transformation = calculateTransformation(current, force.id);
      const nextType = transformation.primaryResult.targetType;
      
      if (nextType !== current && !path.includes(nextType)) {
        const newProb = (prob * transformation.primaryResult.probability) / 100;
        if (newProb >= 5) { // 5% 이상만
          queue.push({
            current: nextType,
            path: [...path, nextType],
            forces: [...forces, force.id],
            prob: newProb
          });
        }
      }
      
      // 대안 경로도 탐색
      for (const alt of transformation.alternativeResults) {
        if (!path.includes(alt.targetType)) {
          const newProb = (prob * alt.probability) / 100;
          if (newProb >= 5) {
            queue.push({
              current: alt.targetType,
              path: [...path, alt.targetType],
              forces: [...forces, force.id],
              prob: newProb
            });
          }
        }
      }
    }
  }
  
  return results.sort((a, b) => b.totalProbability - a.totalProbability);
}

function estimateTotalDuration(path: string[]): string {
  const steps = path.length - 1;
  if (steps === 0) return '즉시';
  if (steps === 1) return '6개월-2년';
  if (steps === 2) return '2-5년';
  if (steps === 3) return '5-10년';
  return '10년+';
}

// ═══════════════════════════════════════════════════════════════════════════
// 추천 시스템
// ═══════════════════════════════════════════════════════════════════════════

/**
 * 현재 타입에서 추천하는 Force 목록
 */
export function getRecommendedForces(
  typeId: string,
  goal: 'evolve' | 'stabilize' | 'crossover' = 'evolve'
): { force: ForceType; reason: string; probability: number }[] {
  const recommendations: { force: ForceType; reason: string; probability: number }[] = [];
  const sourceNode = TYPE_PRIMARY_NODE[typeId];
  const category = typeId.charAt(0);
  
  for (const force of ALL_72_FORCES) {
    const transformation = calculateTransformation(typeId, force.id);
    
    if (goal === 'evolve') {
      // 상향 진화 추천
      if (transformation.primaryResult.targetType !== typeId &&
          transformation.primaryResult.probability >= 40) {
        recommendations.push({
          force,
          reason: `${transformation.primaryResult.targetType}로 진화 가능`,
          probability: transformation.primaryResult.probability
        });
      }
    } else if (goal === 'stabilize') {
      // 안정화 추천
      if (['LOCK', 'UPGRADE'].includes(force.action) && force.node === sourceNode) {
        recommendations.push({
          force,
          reason: `${sourceNode} 강화 및 안정화`,
          probability: 80
        });
      }
    } else if (goal === 'crossover') {
      // 카테고리 전환 추천
      for (const alt of transformation.alternativeResults) {
        if (alt.targetType.charAt(0) !== category && alt.probability >= 15) {
          recommendations.push({
            force,
            reason: `${alt.condition} → ${alt.targetType}`,
            probability: alt.probability
          });
        }
      }
    }
  }
  
  return recommendations
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 10);
}

// ═══════════════════════════════════════════════════════════════════════════
// 통계 및 요약
// ═══════════════════════════════════════════════════════════════════════════

export const TRANSFORMATION_STATS = {
  totalCombinations: 72 * 72, // 5,184
  categoryTransitions: {
    'L→B': { avgProbability: 15, avgDuration: '1-3년', difficulty: 'Hard' },
    'B→T': { avgProbability: 10, avgDuration: '3-10년', difficulty: 'Expert' },
    'L→T': { avgProbability: 5, avgDuration: '5-15년', difficulty: 'Legendary' },
    'T→B': { avgProbability: 20, avgDuration: '1-2년', difficulty: 'Medium' },
    'B→L': { avgProbability: 30, avgDuration: '즉시-1년', difficulty: 'Easy' },
    'T→L': { avgProbability: 25, avgDuration: '1-3년', difficulty: 'Medium' },
  },
  mostEffectiveForces: [
    { id: 'F15', name: '자본 증폭', avgEvolutionRate: 45 },
    { id: 'F51', name: '시간 증폭', avgEvolutionRate: 40 },
    { id: 'F27', name: '네트워크 증폭', avgEvolutionRate: 38 },
    { id: 'F63', name: '감정 증폭', avgEvolutionRate: 35 },
    { id: 'F45', name: '지식 업그레이드', avgEvolutionRate: 32 },
  ]
};
