/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🌌 AUTUS v2.1 - Complete System Specification (TypeScript)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * 이 파일은 AUTUS 시스템의 완전한 타입 정의와 스키마를 포함합니다.
 * LLM 프롬프트 생성, 문서화, 타입 검증에 사용됩니다.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// 📌 TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

export type LayerId = 'L1' | 'L2' | 'L3' | 'L4' | 'L5';
export type NodeState = 'IGNORABLE' | 'PRESSURING' | 'IRREVERSIBLE';
export type MissionType = '자동화' | '외주' | '지시';
export type MissionStatus = 'active' | 'done' | 'ignored';
export type CircuitId = 'survival' | 'fatigue' | 'repeat' | 'people' | 'growth';

export interface NodeSpec {
  id: string;
  name: string;
  icon: string;
  layer: LayerId;
  unit: string;
  desc: string;
  idealValue?: number;
  dangerValue?: number;
  inverse?: boolean; // true면 낮을수록 위험
}

export interface LayerSpec {
  id: LayerId;
  name: string;
  icon: string;
  color: string;
  nodeIds: string[];
  desc: string;
}

export interface CircuitSpec {
  id: CircuitId;
  name: string;
  nameKr: string;
  icon: string;
  nodeIds: string[];
  desc: string;
  formula: string;
  threshold: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📌 36 NODES SPECIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

export const NODES_SPEC: Record<string, NodeSpec> = {
  // L1: 💰 재무 (8개)
  n01: { id: 'n01', name: '현금', icon: '💵', layer: 'L1', unit: '원', desc: '즉시 사용 가능한 현금', idealValue: 50000000, dangerValue: 5000000, inverse: true },
  n02: { id: 'n02', name: '수입', icon: '📈', layer: 'L1', unit: '원/월', desc: '월 수입', idealValue: 10000000, dangerValue: 3000000, inverse: true },
  n03: { id: 'n03', name: '지출', icon: '📉', layer: 'L1', unit: '원/월', desc: '월 지출', idealValue: 5000000, dangerValue: 15000000 },
  n04: { id: 'n04', name: '부채', icon: '💳', layer: 'L1', unit: '원', desc: '총 부채', idealValue: 0, dangerValue: 100000000 },
  n05: { id: 'n05', name: '런웨이', icon: '⏱️', layer: 'L1', unit: '주', desc: '현금으로 버틸 수 있는 기간', idealValue: 24, dangerValue: 4, inverse: true },
  n06: { id: 'n06', name: '예비비', icon: '🛡️', layer: 'L1', unit: '원', desc: '비상 자금', idealValue: 20000000, dangerValue: 1000000, inverse: true },
  n07: { id: 'n07', name: '미수금', icon: '📄', layer: 'L1', unit: '원', desc: '받을 돈', idealValue: 0, dangerValue: 20000000 },
  n08: { id: 'n08', name: '마진', icon: '💹', layer: 'L1', unit: '%', desc: '수익률', idealValue: 30, dangerValue: 5, inverse: true },

  // L2: ❤️ 생체 (6개)
  n09: { id: 'n09', name: '수면', icon: '😴', layer: 'L2', unit: '시간', desc: '일 평균 수면', idealValue: 8, dangerValue: 4, inverse: true },
  n10: { id: 'n10', name: 'HRV', icon: '💓', layer: 'L2', unit: 'ms', desc: '심박변이도', idealValue: 50, dangerValue: 20, inverse: true },
  n11: { id: 'n11', name: '활동량', icon: '🏃', layer: 'L2', unit: '분/일', desc: '일 운동 시간', idealValue: 60, dangerValue: 10, inverse: true },
  n12: { id: 'n12', name: '연속작업', icon: '⌨️', layer: 'L2', unit: '시간', desc: '휴식 없이 작업한 시간', idealValue: 1, dangerValue: 6 },
  n13: { id: 'n13', name: '휴식간격', icon: '☕', layer: 'L2', unit: '시간', desc: '마지막 휴식 후 경과', idealValue: 1, dangerValue: 4 },
  n14: { id: 'n14', name: '병가', icon: '🏥', layer: 'L2', unit: '일/월', desc: '월 병가 일수', idealValue: 0, dangerValue: 5 },

  // L3: ⚙️ 운영 (8개)
  n15: { id: 'n15', name: '마감', icon: '📅', layer: 'L3', unit: '일', desc: '가장 가까운 마감까지', idealValue: 14, dangerValue: 1, inverse: true },
  n16: { id: 'n16', name: '지연', icon: '⏰', layer: 'L3', unit: '건', desc: '지연된 태스크', idealValue: 0, dangerValue: 10 },
  n17: { id: 'n17', name: '가동률', icon: '⚡', layer: 'L3', unit: '%', desc: '리소스 활용률', idealValue: 80, dangerValue: 40, inverse: true },
  n18: { id: 'n18', name: '태스크', icon: '📋', layer: 'L3', unit: '건', desc: '진행 중 태스크', idealValue: 10, dangerValue: 50 },
  n19: { id: 'n19', name: '오류율', icon: '🐛', layer: 'L3', unit: '%', desc: '작업 오류 비율', idealValue: 1, dangerValue: 10 },
  n20: { id: 'n20', name: '처리속도', icon: '🚀', layer: 'L3', unit: '건/일', desc: '일 처리량', idealValue: 20, dangerValue: 5, inverse: true },
  n21: { id: 'n21', name: '재고', icon: '📦', layer: 'L3', unit: '일분', desc: '재고 일수', idealValue: 30, dangerValue: 5, inverse: true },
  n22: { id: 'n22', name: '의존도', icon: '🔗', layer: 'L3', unit: '%', desc: '핵심 인력 의존도', idealValue: 20, dangerValue: 80 },

  // L4: 👥 고객 (7개)
  n23: { id: 'n23', name: '고객수', icon: '👤', layer: 'L4', unit: '명', desc: '총 활성 고객', idealValue: 100, dangerValue: 10, inverse: true },
  n24: { id: 'n24', name: '이탈률', icon: '🚪', layer: 'L4', unit: '%/월', desc: '월 이탈률', idealValue: 2, dangerValue: 15 },
  n25: { id: 'n25', name: 'NPS', icon: '⭐', layer: 'L4', unit: '점', desc: '고객 추천 지수', idealValue: 50, dangerValue: 0, inverse: true },
  n26: { id: 'n26', name: '반복구매', icon: '🔄', layer: 'L4', unit: '%', desc: '재구매율', idealValue: 40, dangerValue: 10, inverse: true },
  n27: { id: 'n27', name: 'CAC', icon: '💰', layer: 'L4', unit: '원', desc: '고객 획득 비용', idealValue: 50000, dangerValue: 200000 },
  n28: { id: 'n28', name: 'LTV', icon: '💎', layer: 'L4', unit: '원', desc: '고객 생애 가치', idealValue: 500000, dangerValue: 100000, inverse: true },
  n29: { id: 'n29', name: '리드', icon: '📥', layer: 'L4', unit: '건/주', desc: '주간 신규 리드', idealValue: 20, dangerValue: 2, inverse: true },

  // L5: 🌍 외부 (7개)
  n30: { id: 'n30', name: '직원', icon: '👥', layer: 'L5', unit: '명', desc: '총 직원 수', idealValue: 10, dangerValue: 1, inverse: true },
  n31: { id: 'n31', name: '이직률', icon: '🚶', layer: 'L5', unit: '%/년', desc: '연간 이직률', idealValue: 10, dangerValue: 40 },
  n32: { id: 'n32', name: '경쟁자', icon: '🎯', layer: 'L5', unit: '개', desc: '주요 경쟁사', idealValue: 3, dangerValue: 20 },
  n33: { id: 'n33', name: '시장성장', icon: '📊', layer: 'L5', unit: '%/년', desc: '시장 성장률', idealValue: 20, dangerValue: -10, inverse: true },
  n34: { id: 'n34', name: '환율', icon: '💱', layer: 'L5', unit: '%', desc: '환율 변동', idealValue: 0, dangerValue: 15 },
  n35: { id: 'n35', name: '금리', icon: '🏦', layer: 'L5', unit: '%', desc: '기준 금리', idealValue: 3, dangerValue: 8 },
  n36: { id: 'n36', name: '규제', icon: '📜', layer: 'L5', unit: '건', desc: '관련 규제 변화', idealValue: 0, dangerValue: 5 },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 📌 5 LAYERS SPECIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

export const LAYERS_SPEC: Record<LayerId, LayerSpec> = {
  L1: { id: 'L1', name: '재무', icon: '💰', color: '#FFD700', nodeIds: ['n01','n02','n03','n04','n05','n06','n07','n08'], desc: '현금 흐름과 재정 건전성' },
  L2: { id: 'L2', name: '생체', icon: '❤️', color: '#FF6B6B', nodeIds: ['n09','n10','n11','n12','n13','n14'], desc: '신체적/정신적 건강' },
  L3: { id: 'L3', name: '운영', icon: '⚙️', color: '#4ECDC4', nodeIds: ['n15','n16','n17','n18','n19','n20','n21','n22'], desc: '업무 처리 및 생산성' },
  L4: { id: 'L4', name: '고객', icon: '👥', color: '#9B59B6', nodeIds: ['n23','n24','n25','n26','n27','n28','n29'], desc: '고객 관계 및 매출' },
  L5: { id: 'L5', name: '외부', icon: '🌍', color: '#3498DB', nodeIds: ['n30','n31','n32','n33','n34','n35','n36'], desc: '외부 환경 및 시장' },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 📌 5 CIRCUITS SPECIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

export const CIRCUITS_SPEC: CircuitSpec[] = [
  { id: 'survival', name: 'Survival', nameKr: '생존', icon: '🛡️', nodeIds: ['n03','n01','n05'], desc: '지출→현금→런웨이', formula: '런웨이 = 현금 / 지출', threshold: 0.5 },
  { id: 'fatigue', name: 'Fatigue', nameKr: '피로', icon: '😵', nodeIds: ['n18','n09','n10','n16'], desc: '태스크→수면→HRV→지연', formula: '피로 = 태스크 × (1 - 수면/8)', threshold: 0.4 },
  { id: 'repeat', name: 'Repeat Capital', nameKr: '반복자본', icon: '🔄', nodeIds: ['n26','n02','n01'], desc: '반복구매→수입→현금', formula: '반복자본 = 반복구매율 × ARPU × 고객수', threshold: 0.3 },
  { id: 'people', name: 'People', nameKr: '인력', icon: '👥', nodeIds: ['n31','n17','n20'], desc: '이직률→가동률→처리속도', formula: '인력효율 = 가동률 × (1 - 이직률/100)', threshold: 0.3 },
  { id: 'growth', name: 'Growth', nameKr: '성장', icon: '📈', nodeIds: ['n29','n23','n02'], desc: '리드→고객수→수입', formula: '성장률 = 리드 × 전환율 × ARPU', threshold: 0.2 },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 📌 ALGORITHMS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 압력 계산
 */
export function calculatePressure(value: number, spec: NodeSpec): number {
  const { idealValue = 0, dangerValue = 100, inverse = false } = spec;
  
  let pressure: number;
  if (inverse) {
    // 낮을수록 위험 (예: 현금, 수면)
    pressure = (idealValue - value) / (idealValue - dangerValue);
  } else {
    // 높을수록 위험 (예: 부채, 지출)
    pressure = (value - idealValue) / (dangerValue - idealValue);
  }
  
  return Math.max(0, Math.min(1, pressure));
}

/**
 * 상태 결정
 */
export function determineState(pressure: number): NodeState {
  if (pressure >= 0.7) return 'IRREVERSIBLE';
  if (pressure >= 0.3) return 'PRESSURING';
  return 'IGNORABLE';
}

/**
 * 상태 색상
 */
export function getStateColor(state: NodeState): string {
  const colors: Record<NodeState, string> = {
    IGNORABLE: '#00d46a',
    PRESSURING: '#ffa500',
    IRREVERSIBLE: '#ff3b3b',
  };
  return colors[state];
}

/**
 * 압력 색상
 */
export function getPressureColor(pressure: number): string {
  if (pressure >= 0.7) return '#ff3b3b';
  if (pressure >= 0.3) return '#ffa500';
  return '#00d46a';
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📌 LLM CONTEXT GENERATORS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 전체 컨텍스트 생성
 */
export function generateLLMContext(): string {
  const lines: string[] = [];
  
  lines.push('═'.repeat(60));
  lines.push('🌌 AUTUS v2.1 - Complete System Context');
  lines.push('═'.repeat(60));
  
  // 노드 요약
  lines.push('\n## 36 Nodes (5 Layers)');
  for (const layer of Object.values(LAYERS_SPEC)) {
    const nodeList = layer.nodeIds
      .map(id => `${NODES_SPEC[id].icon}${NODES_SPEC[id].name}`)
      .join(', ');
    lines.push(`- ${layer.icon} ${layer.name}: ${nodeList}`);
  }
  
  // 회로 요약
  lines.push('\n## 5 Circuits');
  for (const circuit of CIRCUITS_SPEC) {
    const flow = circuit.nodeIds.map(id => NODES_SPEC[id].name).join(' → ');
    lines.push(`- ${circuit.icon} ${circuit.nameKr}: ${flow}`);
  }
  
  // 알고리즘
  lines.push('\n## Algorithms');
  lines.push('- Pressure: (value - ideal) / (danger - ideal), [0,1]');
  lines.push('- State: ≥0.7 IRREVERSIBLE, ≥0.3 PRESSURING, else IGNORABLE');
  lines.push('- Top-1: max(active_nodes, key=pressure)');
  
  return lines.join('\n');
}

/**
 * 최소 컨텍스트 생성
 */
export function generateMinimalContext(): string {
  return `
AUTUS v2.1 - 붕괴 방지 시스템

36노드(5레이어): L1재무(8) L2생체(6) L3운영(8) L4고객(7) L5외부(7)
5회로: 생존, 피로, 반복자본, 인력, 성장
상태: IGNORABLE(<0.3) | PRESSURING(0.3-0.7) | IRREVERSIBLE(≥0.7)
원칙: Top-1 집중, 3단계 개입(자동화/외주/지시), 침묵 우선
`.trim();
}

/**
 * JSON 컨텍스트 생성
 */
export function generateJSONContext(): object {
  return {
    version: '2.1',
    name: 'AUTUS',
    nodes: NODES_SPEC,
    layers: LAYERS_SPEC,
    circuits: CIRCUITS_SPEC,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 📌 EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export const AUTUS_SYSTEM = {
  version: '2.1',
  nodes: NODES_SPEC,
  layers: LAYERS_SPEC,
  circuits: CIRCUITS_SPEC,
  generateLLMContext,
  generateMinimalContext,
  generateJSONContext,
  calculatePressure,
  determineState,
  getStateColor,
  getPressureColor,
};

export default AUTUS_SYSTEM;
