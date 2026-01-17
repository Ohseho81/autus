/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🏛️ AUTUS WORK GENOME ENGINE
 * 업무를 생명체로 모델링 - 설계 대상이 아닌 진화 주체
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * 규칙:
 * - 수동 편집 함수 없음
 * - 진화는 사용 빈도와 실패 비용으로만 발생
 * - 출력은 새로운 genome 상태 (UI 데이터 아님)
 * - CRUD 엔드포인트 없음
 * - 관리자 오버라이드 없음
 */

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface WorkGenome {
  readonly id: string;
  readonly mass: number;           // 질량 (중요도)
  readonly irreversibility: number; // 비가역성 (ψ)
  readonly failureCost: number;    // 실패 비용
  readonly mutationRate: number;   // 변이율
  readonly generation: number;     // 세대
  readonly parentId: string | null;
  readonly birthTimestamp: number;
  readonly usageCount: number;
  readonly failureCount: number;
}

export interface GenomeState {
  readonly genomes: readonly WorkGenome[];
  readonly generation: number;
  readonly timestamp: number;
}

export interface EvolutionInput {
  genomeId: string;
  wasSuccessful: boolean;
  executionTime: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const MUTATION_THRESHOLD = 0.1;
const EXTINCTION_THRESHOLD = 0.8;
const PROLIFERATION_THRESHOLD = 10;
const MAX_MUTATION_DELTA = 0.05;

// ─────────────────────────────────────────────────────────────────────────────
// PURE EVOLUTION FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 사용 기록 후 genome 진화 (순수 함수)
 * 수동 편집 아님 - 자연 선택
 */
export function evolveGenome(
  genome: WorkGenome,
  input: EvolutionInput
): WorkGenome {
  const newUsageCount = genome.usageCount + 1;
  const newFailureCount = input.wasSuccessful 
    ? genome.failureCount 
    : genome.failureCount + 1;
  
  const failureRate = newFailureCount / newUsageCount;
  
  // 자연 변이 계산
  const mutationOccurred = Math.random() < genome.mutationRate;
  
  let newMass = genome.mass;
  let newIrreversibility = genome.irreversibility;
  let newFailureCost = genome.failureCost;
  
  if (mutationOccurred) {
    // 실패율에 따른 적응 변이
    const delta = (Math.random() - 0.5) * MAX_MUTATION_DELTA * 2;
    
    if (failureRate > 0.5) {
      // 실패 많으면 질량 감소 (중요도 하락)
      newMass = Math.max(0.1, genome.mass + delta * -1);
    } else {
      // 성공적이면 질량 유지/증가
      newMass = Math.min(10, genome.mass + Math.abs(delta));
    }
    
    // 실패 비용은 실제 실패 경험에 따라 조정
    if (!input.wasSuccessful) {
      newFailureCost = genome.failureCost * 1.1;
    }
  }
  
  return Object.freeze({
    ...genome,
    mass: newMass,
    irreversibility: newIrreversibility,
    failureCost: newFailureCost,
    usageCount: newUsageCount,
    failureCount: newFailureCount
  });
}

/**
 * 소멸 판정 (순수 함수)
 */
export function shouldExtinct(genome: WorkGenome): boolean {
  if (genome.usageCount < 5) return false;
  
  const failureRate = genome.failureCount / genome.usageCount;
  return failureRate > EXTINCTION_THRESHOLD;
}

/**
 * 증식 판정 (순수 함수)
 */
export function shouldProliferate(genome: WorkGenome): boolean {
  if (genome.usageCount < PROLIFERATION_THRESHOLD) return false;
  
  const failureRate = genome.failureCount / genome.usageCount;
  return failureRate < 0.1 && genome.mass > 5;
}

/**
 * 증식 (자식 genome 생성)
 */
export function proliferate(parent: WorkGenome): WorkGenome {
  return Object.freeze({
    id: `${parent.id}-${Date.now().toString(36)}`,
    mass: parent.mass * (0.9 + Math.random() * 0.2),
    irreversibility: parent.irreversibility,
    failureCost: parent.failureCost * (0.8 + Math.random() * 0.4),
    mutationRate: parent.mutationRate * (0.9 + Math.random() * 0.2),
    generation: parent.generation + 1,
    parentId: parent.id,
    birthTimestamp: Date.now(),
    usageCount: 0,
    failureCount: 0
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// STATE EVOLUTION (전체 상태 진화)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 전체 genome 상태 진화 (순수 함수)
 */
export function evolveState(
  state: GenomeState,
  inputs: EvolutionInput[]
): GenomeState {
  const inputMap = new Map(inputs.map(i => [i.genomeId, i]));
  
  let newGenomes: WorkGenome[] = [];
  const toProliferate: WorkGenome[] = [];
  
  for (const genome of state.genomes) {
    const input = inputMap.get(genome.id);
    
    if (input) {
      const evolved = evolveGenome(genome, input);
      
      // 소멸 판정
      if (shouldExtinct(evolved)) {
        continue; // 제거
      }
      
      // 증식 판정
      if (shouldProliferate(evolved)) {
        toProliferate.push(evolved);
      }
      
      newGenomes.push(evolved);
    } else {
      newGenomes.push(genome);
    }
  }
  
  // 증식 처리
  for (const parent of toProliferate) {
    newGenomes.push(proliferate(parent));
  }
  
  return Object.freeze({
    genomes: Object.freeze(newGenomes),
    generation: state.generation + 1,
    timestamp: Date.now()
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// FACTORY
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 새 genome 생성 (Genesis)
 */
export function createGenome(
  id: string,
  mass: number,
  irreversibility: number,
  failureCost: number
): WorkGenome {
  return Object.freeze({
    id,
    mass: Math.max(0.1, Math.min(10, mass)),
    irreversibility: Math.max(0, Math.min(1, irreversibility)),
    failureCost: Math.max(0, failureCost),
    mutationRate: MUTATION_THRESHOLD,
    generation: 0,
    parentId: null,
    birthTimestamp: Date.now(),
    usageCount: 0,
    failureCount: 0
  });
}

/**
 * 초기 상태 생성
 */
export function createInitialState(genomes: WorkGenome[]): GenomeState {
  return Object.freeze({
    genomes: Object.freeze([...genomes]),
    generation: 0,
    timestamp: Date.now()
  });
}
