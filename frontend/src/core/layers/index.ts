// ═══════════════════════════════════════════════════════════════════════════════
// AUTUS CONSTITUTION - 8단계 계층 구조
// "하위는 상위를 변경할 수 없다"
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * AUTUS 8단계 계층 (불변 순서)
 * 
 * 0. 우주 (Universe)      - 판단 이전의 법칙
 * 1. 은하 (Galaxy)        - 업무 DNA
 * 2. 지구 (Earth)         - 좌표 고정
 * 3. 지역 (Region)        - 중력 프리셋
 * 4. 도시 (City)          - 연쇄 시뮬레이션
 * 5. 건물 (Building)      - 공간 최적화
 * 6. 사무실 (Office)      - Scale Lock
 * 7. 책상 (Desk)          - 최소 행동
 * ∞. 잔상 (Afterimage)    - 불변 기록
 */
export enum Layer {
  UNIVERSE = 0,
  GALAXY = 1,
  EARTH = 2,
  REGION = 3,
  CITY = 4,
  BUILDING = 5,
  OFFICE = 6,
  DESK = 7,
  AFTERIMAGE = 8,
}

export const LAYER_NAMES: Record<Layer, string> = {
  [Layer.UNIVERSE]: '우주',
  [Layer.GALAXY]: '은하',
  [Layer.EARTH]: '지구',
  [Layer.REGION]: '지역',
  [Layer.CITY]: '도시',
  [Layer.BUILDING]: '건물',
  [Layer.OFFICE]: '사무실',
  [Layer.DESK]: '책상',
  [Layer.AFTERIMAGE]: '잔상',
};

export const LAYER_PRINCIPLES: Record<Layer, string> = {
  [Layer.UNIVERSE]: '판단 이전의 법칙',
  [Layer.GALAXY]: '업무는 설계되지 않는다, 선별된다',
  [Layer.EARTH]: '추상은 허용되지 않는다',
  [Layer.REGION]: '명령이 아니라 비용이 행동을 바꾼다',
  [Layer.CITY]: '연쇄 반응을 본다',
  [Layer.BUILDING]: '조직은 구조다',
  [Layer.OFFICE]: '권력은 없다, 시야만 있다',
  [Layer.DESK]: '현상만 남긴다',
  [Layer.AFTERIMAGE]: '되돌림 불가',
};

// ═══════════════════════════════════════════════════════════════════════════════
// 0단계: 우주 (Universal Physics)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 우주 물리 상수
 */
export interface UniversalPhysics {
  /** ψ: 비가역성 (0~10) */
  psi: number;
  
  /** ΔṠ: 엔트로피 가속 */
  entropyAcceleration: number;
  
  /** UC: 책임 수용 한계 */
  responsibilityCapacity: number;
  
  /** E: 에너지 예산 */
  energyBudget: number;
  
  /** θ: 종결 임계 */
  closureThreshold: number;
}

/**
 * Gate 규칙 (자동 잠금 조건)
 */
export interface GateRule {
  id: 'G1' | 'G2' | 'G3';
  condition: string;
  check: (physics: UniversalPhysics, load: number) => boolean;
}

export const GATE_RULES: GateRule[] = [
  {
    id: 'G1',
    condition: 'ΔṠ > θ (엔트로피 임계 초과)',
    check: (p) => p.entropyAcceleration > p.closureThreshold,
  },
  {
    id: 'G2',
    condition: 'Load > UC (책임 한계 초과)',
    check: (p, load) => load > p.responsibilityCapacity,
  },
  {
    id: 'G3',
    condition: 'E < 0 (에너지 고갈)',
    check: (p) => p.energyBudget < 0,
  },
];

/**
 * Gate 체크 실행
 */
export function checkGates(physics: UniversalPhysics, load: number): {
  triggered: boolean;
  gates: string[];
} {
  const triggeredGates: string[] = [];
  
  for (const rule of GATE_RULES) {
    if (rule.check(physics, load)) {
      triggeredGates.push(rule.id);
    }
  }
  
  return {
    triggered: triggeredGates.length > 0,
    gates: triggeredGates,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1단계: 은하 (Work Genome)
// ═══════════════════════════════════════════════════════════════════════════════

// → tasks/physicsClassification.ts에서 가져옴

// ═══════════════════════════════════════════════════════════════════════════════
// 2단계: 지구 (Geo Twin)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 지리적 좌표 (필수)
 */
export interface GeoCoordinate {
  lat: number;
  lng: number;
}

/**
 * 지리 기반 노드
 */
export interface GeoNode {
  id: number;
  coordinate: GeoCoordinate;
  boundary?: GeoCoordinate[]; // 다각형 경계
  jurisdictions: string[];    // 행정/규제 구역
}

/**
 * 좌표 없는 결정은 존재 불가
 */
export function validateGeoDecision(node: GeoNode): boolean {
  return (
    typeof node.coordinate.lat === 'number' &&
    typeof node.coordinate.lng === 'number' &&
    !isNaN(node.coordinate.lat) &&
    !isNaN(node.coordinate.lng)
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3단계: 지역 (Regional Gravity)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 중력 프리셋
 */
export type GravityPreset = 
  | 'STARTUP'        // 낮은 마찰, 높은 속도
  | 'REGULATED'      // 높은 마찰, 법적 구속
  | 'CRISIS'         // 높은 엔트로피, 빠른 결정
  | 'EXPLORATION'    // 불확실성 허용
  | 'SOVEREIGN_LOCK'; // 최고 권한, 비가역

export interface RegionalGravity {
  preset: GravityPreset;
  frictionMultiplier: number;
  velocityMultiplier: number;
  entropyMultiplier: number;
  lockThreshold: number;
}

export const GRAVITY_PRESETS: Record<GravityPreset, RegionalGravity> = {
  STARTUP: {
    preset: 'STARTUP',
    frictionMultiplier: 0.3,
    velocityMultiplier: 2.0,
    entropyMultiplier: 1.2,
    lockThreshold: 9.0,
  },
  REGULATED: {
    preset: 'REGULATED',
    frictionMultiplier: 2.0,
    velocityMultiplier: 0.5,
    entropyMultiplier: 0.8,
    lockThreshold: 6.0,
  },
  CRISIS: {
    preset: 'CRISIS',
    frictionMultiplier: 0.5,
    velocityMultiplier: 3.0,
    entropyMultiplier: 2.0,
    lockThreshold: 5.0,
  },
  EXPLORATION: {
    preset: 'EXPLORATION',
    frictionMultiplier: 0.7,
    velocityMultiplier: 1.5,
    entropyMultiplier: 1.5,
    lockThreshold: 8.0,
  },
  SOVEREIGN_LOCK: {
    preset: 'SOVEREIGN_LOCK',
    frictionMultiplier: 5.0,
    velocityMultiplier: 0.1,
    entropyMultiplier: 0.5,
    lockThreshold: 3.0,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 4단계: 도시 (City Twin)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 도시 시뮬레이션 경계
 */
export interface CityBoundary {
  center: GeoCoordinate;
  radiusKm: number; // 2-3km
  maxNodes: number;
}

/**
 * Geo-Causal 시뮬레이션 경로
 */
export interface CausalPath {
  sourceId: number;
  targetId: number;
  distance: number;
  propagationTime: number;
  gateTriggered: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5단계: 건물 (Building Physics)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 건물 물리
 */
export interface BuildingPhysics {
  floors: number;
  pathways: PathwayNode[];
  frictionPoints: FrictionPoint[];
  densityMultiplier: number;
}

export interface PathwayNode {
  id: string;
  floor: number;
  position: { x: number; y: number };
  connections: string[];
}

export interface FrictionPoint {
  id: string;
  location: { floor: number; x: number; y: number };
  frictionValue: number;
  cause: 'bottleneck' | 'congestion' | 'distance' | 'elevation';
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6단계: 사무실 (Office Field / Scale Lock)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Scale Lock 설정
 */
export interface ScaleLockConfig {
  operatorScale: 'K2' | 'K4' | 'K10';
  visibleScales: string[];
  hiddenScales: string[];
  numericBlocked: boolean;
  explanationBlocked: boolean;
}

export const SCALE_LOCK_CONFIGS: Record<'K2' | 'K4' | 'K10', ScaleLockConfig> = {
  K2: {
    operatorScale: 'K2',
    visibleScales: ['K1', 'K2'],
    hiddenScales: ['K3', 'K4', 'K5', 'K6', 'K7', 'K8', 'K9', 'K10'],
    numericBlocked: true,
    explanationBlocked: true,
  },
  K4: {
    operatorScale: 'K4',
    visibleScales: ['K1', 'K2', 'K3', 'K4'],
    hiddenScales: ['K5', 'K6', 'K7', 'K8', 'K9', 'K10'],
    numericBlocked: true,
    explanationBlocked: false,
  },
  K10: {
    operatorScale: 'K10',
    visibleScales: ['K1', 'K2', 'K3', 'K4', 'K5', 'K6', 'K7', 'K8', 'K9', 'K10'],
    hiddenScales: [],
    numericBlocked: false,
    explanationBlocked: false,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 7단계: 책상 (Desk-Level Execution)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 최소 행동 단위
 */
export interface DeskAction {
  id: string;
  taskId: number;
  /** 버튼 ≤ 2 */
  buttons: ['execute'] | ['execute', 'defer'];
  autoClose: boolean;
  timestamp: number;
}

/**
 * 책상 수준 UI 제약
 */
export const DESK_CONSTRAINTS = {
  maxButtons: 2,
  maxVisibleTasks: 1,
  autoCloseEnabled: true,
  undoAllowed: false,
};

// ═══════════════════════════════════════════════════════════════════════════════
// ∞단계: 잔상 (Afterimage Ledger)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 잔상 기록 (불변)
 */
export interface Afterimage {
  id: string;
  taskId: number;
  actionId: string;
  timestamp: number;
  layer: Layer;
  coordinate?: GeoCoordinate;
  physics: UniversalPhysics;
  gatesTriggered: string[];
  result: 'LOCKED' | 'EXECUTED' | 'DEFERRED';
  /** 변경 불가 */
  immutable: true;
}

/**
 * Afterimage 생성 (한번 생성되면 변경 불가)
 */
export function createAfterimage(
  taskId: number,
  actionId: string,
  layer: Layer,
  physics: UniversalPhysics,
  gatesTriggered: string[],
  result: 'LOCKED' | 'EXECUTED' | 'DEFERRED',
  coordinate?: GeoCoordinate
): Afterimage {
  return Object.freeze({
    id: `AFT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    taskId,
    actionId,
    timestamp: Date.now(),
    layer,
    coordinate,
    physics,
    gatesTriggered,
    result,
    immutable: true as const,
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 계층 간 불변 규칙
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 하위 계층이 상위 계층을 수정하려 할 때 차단
 */
export function enforceLayerHierarchy(
  sourceLayer: Layer,
  targetLayer: Layer,
  action: 'read' | 'write'
): boolean {
  // 읽기는 항상 허용
  if (action === 'read') return true;
  
  // 쓰기는 같은 계층 또는 하위 계층만 허용
  return sourceLayer <= targetLayer;
}

/**
 * 계층 위반 시 에러
 */
export class LayerViolationError extends Error {
  constructor(sourceLayer: Layer, targetLayer: Layer) {
    super(
      `Layer violation: ${LAYER_NAMES[sourceLayer]}(${sourceLayer}) cannot modify ${LAYER_NAMES[targetLayer]}(${targetLayer}). ` +
      `하위는 상위를 변경할 수 없다.`
    );
    this.name = 'LayerViolationError';
  }
}
