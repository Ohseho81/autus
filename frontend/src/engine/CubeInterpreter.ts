/**
 * AUTUS 72³ Cube Interpreter
 * ===========================
 * 
 * coords = [35, 12, 60] → "B11(시스템 구축가) + F12(생체 가속) + W60(지식 전환)"
 * 
 * X축 (노드/Who): 72종 개체 (T01-T24, B01-B24, L01-L24)
 * Y축 (모션/What): 72종 작용 (F01-F72)
 * Z축 (업무/How): 72종 업무 (W01-W72)
 */

import { ALL_72_TYPES } from '../components/Trinity/data/node72Types';
import { ALL_72_FORCES, PHYSICS_NODES, ACTION_TYPES } from '../components/Trinity/data/forceTypes';
import { ALL_72_WORKS, WORK_DOMAINS, WORK_PATTERNS } from '../components/Trinity/data/workTypes';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export type NodeID = [number, number, number];

export interface CubeCoordinate {
  raw: NodeID;          // [35, 12, 60]
  node: {
    index: number;      // 35
    id: string;         // B11
    name: string;       // 시스템 구축가
    category: 'T' | 'B' | 'L';
    desc: string;
  };
  motion: {
    index: number;      // 12
    id: string;         // F12
    name: string;       // 생체 가속
    node: string;       // BIO
    action: string;     // ACCELERATE
    desc: string;
  };
  work: {
    index: number;      // 60
    id: string;         // W60
    name: string;       // 지식 전환
    domain: string;     // KNOWLEDGE
    pattern: string;    // TRANSFORM
    desc: string;
  };
  interpretation: string;  // 전체 해석
}

export interface DomainPhysics {
  friction: number;       // 마찰 계수 (0-1)
  gravity: number;        // 중력 강도
  elasticity: number;     // 탄성
  inertia: number;        // 관성 (변화 저항)
  acceleration: number;   // 가속 용이도
  clustering: number;     // 클러스터링 경향
}

// ═══════════════════════════════════════════════════════════════════════════
// Domain Physics Constants
// ═══════════════════════════════════════════════════════════════════════════

export const DOMAIN_PHYSICS: Record<string, DomainPhysics> = {
  // 금융 (CAPITAL) - 빠른 변화, 낮은 마찰
  CAPITAL: {
    friction: 0.01,
    gravity: 0.002,
    elasticity: 0.9,
    inertia: 0.3,
    acceleration: 1.5,
    clustering: 0.7,
  },
  
  // 건강 (BIO) - 느린 변화, 높은 관성
  BIO: {
    friction: 0.05,
    gravity: 0.001,
    elasticity: 0.4,
    inertia: 0.9,
    acceleration: 0.3,
    clustering: 0.2,
  },
  
  // 인맥 (NETWORK) - 강한 중력, 클러스터링
  NETWORK: {
    friction: 0.02,
    gravity: 0.003,
    elasticity: 0.6,
    inertia: 0.5,
    acceleration: 0.8,
    clustering: 0.95,
  },
  
  // 지식 (KNOWLEDGE) - 중간 특성, 복리 효과
  KNOWLEDGE: {
    friction: 0.03,
    gravity: 0.001,
    elasticity: 0.7,
    inertia: 0.6,
    acceleration: 0.6,
    clustering: 0.5,
  },
  
  // 시간 (TIME) - 일정한 흐름, 비탄성
  TIME: {
    friction: 0.001,
    gravity: 0.005,
    elasticity: 0.1,
    inertia: 0.99,
    acceleration: 1.0,
    clustering: 0.1,
  },
  
  // 감정 (EMOTION) - 불안정, 높은 탄성
  EMOTION: {
    friction: 0.04,
    gravity: 0.002,
    elasticity: 0.95,
    inertia: 0.2,
    acceleration: 2.0,
    clustering: 0.8,
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// Node Category Physics (T/B/L)
// ═══════════════════════════════════════════════════════════════════════════

export const CATEGORY_PHYSICS: Record<'T' | 'B' | 'L', Partial<DomainPhysics>> = {
  T: { // 투자자 - 빠른 움직임, 높은 리스크
    acceleration: 1.3,
    elasticity: 0.8,
    inertia: 0.4,
  },
  B: { // 사업가 - 중간 특성
    acceleration: 1.0,
    elasticity: 0.6,
    inertia: 0.6,
  },
  L: { // 근로자 - 안정적, 느린 변화
    acceleration: 0.7,
    elasticity: 0.5,
    inertia: 0.8,
  },
};

// ═══════════════════════════════════════════════════════════════════════════
// Interpreter Class
// ═══════════════════════════════════════════════════════════════════════════

export class CubeInterpreter {
  /**
   * 좌표 → 의미 해석
   */
  interpret(coords: NodeID): CubeCoordinate {
    const [nodeIdx, motionIdx, workIdx] = coords;
    
    // 범위 체크 (0-71)
    const safeNode = Math.max(0, Math.min(71, nodeIdx));
    const safeMotion = Math.max(0, Math.min(71, motionIdx));
    const safeWork = Math.max(0, Math.min(71, workIdx));
    
    // 각 축 해석
    const node = this.interpretNode(safeNode);
    const motion = this.interpretMotion(safeMotion);
    const work = this.interpretWork(safeWork);
    
    // 전체 해석
    const interpretation = this.generateInterpretation(node, motion, work);
    
    return {
      raw: coords,
      node,
      motion,
      work,
      interpretation,
    };
  }
  
  /**
   * X축: 노드(Who) 해석
   */
  private interpretNode(idx: number): CubeCoordinate['node'] {
    const nodeData = ALL_72_TYPES[idx];
    
    if (!nodeData) {
      // Fallback
      const category = idx < 24 ? 'T' : idx < 48 ? 'B' : 'L';
      const localIdx = (idx % 24) + 1;
      return {
        index: idx,
        id: `${category}${String(localIdx).padStart(2, '0')}`,
        name: `Unknown Node ${idx}`,
        category,
        desc: 'No description',
      };
    }
    
    return {
      index: idx,
      id: nodeData.id,
      name: nodeData.name,
      category: nodeData.category,
      desc: nodeData.desc,
    };
  }
  
  /**
   * Y축: 모션(What) 해석
   */
  private interpretMotion(idx: number): CubeCoordinate['motion'] {
    const forceData = ALL_72_FORCES[idx];
    
    if (!forceData) {
      // Fallback
      const nodeKeys = Object.keys(PHYSICS_NODES);
      const actionKeys = Object.keys(ACTION_TYPES);
      const nodeIdx = Math.floor(idx / 12);
      const actionIdx = idx % 12;
      
      return {
        index: idx,
        id: `F${String(idx + 1).padStart(2, '0')}`,
        name: `Unknown Force ${idx}`,
        node: nodeKeys[nodeIdx] || 'UNKNOWN',
        action: actionKeys[actionIdx] || 'UNKNOWN',
        desc: 'No description',
      };
    }
    
    return {
      index: idx,
      id: forceData.id,
      name: forceData.name,
      node: forceData.node,
      action: forceData.action,
      desc: forceData.desc,
    };
  }
  
  /**
   * Z축: 업무(How) 해석
   */
  private interpretWork(idx: number): CubeCoordinate['work'] {
    const workData = ALL_72_WORKS[idx];
    
    if (!workData) {
      // Fallback
      const domainKeys = Object.keys(WORK_DOMAINS);
      const patternKeys = Object.keys(WORK_PATTERNS);
      const domainIdx = Math.floor(idx / 12);
      const patternIdx = idx % 12;
      
      return {
        index: idx,
        id: `W${String(idx + 1).padStart(2, '0')}`,
        name: `Unknown Work ${idx}`,
        domain: domainKeys[domainIdx] || 'UNKNOWN',
        pattern: patternKeys[patternIdx] || 'UNKNOWN',
        desc: 'No description',
      };
    }
    
    return {
      index: idx,
      id: workData.id,
      name: workData.name,
      domain: workData.domain,
      pattern: workData.pattern,
      desc: workData.desc,
    };
  }
  
  /**
   * 통합 해석 생성
   */
  private generateInterpretation(
    node: CubeCoordinate['node'],
    motion: CubeCoordinate['motion'],
    work: CubeCoordinate['work']
  ): string {
    const categoryLabel = {
      T: '투자자',
      B: '사업가',
      L: '근로자',
    }[node.category];
    
    return `${categoryLabel} "${node.name}"가 "${motion.name}"의 힘으로 "${work.name}"을 수행`;
  }
  
  /**
   * 좌표에 적용할 물리 상수 계산
   */
  getPhysicsConstants(coords: NodeID): DomainPhysics {
    const interpreted = this.interpret(coords);
    
    // 기본값: Motion의 물리 노드 기반
    const baseDomain = DOMAIN_PHYSICS[interpreted.motion.node] || DOMAIN_PHYSICS.CAPITAL;
    
    // 카테고리 보정
    const categoryMod = CATEGORY_PHYSICS[interpreted.node.category] || {};
    
    // 업무 도메인 영향 (20% 가중치)
    const workDomain = DOMAIN_PHYSICS[interpreted.work.domain] || DOMAIN_PHYSICS.CAPITAL;
    
    return {
      friction: baseDomain.friction * (1 + (workDomain.friction - baseDomain.friction) * 0.2),
      gravity: baseDomain.gravity,
      elasticity: (categoryMod.elasticity || baseDomain.elasticity),
      inertia: (categoryMod.inertia || baseDomain.inertia),
      acceleration: (categoryMod.acceleration || baseDomain.acceleration),
      clustering: baseDomain.clustering,
    };
  }
  
  /**
   * 공명 점수 계산 (Node와 Motion의 궁합)
   */
  calculateResonance(coords: NodeID): number {
    const interpreted = this.interpret(coords);
    
    // 카테고리별 선호 도메인
    const categoryPreference: Record<string, string[]> = {
      T: ['CAPITAL', 'NETWORK'],     // 투자자: 자본, 네트워크 선호
      B: ['KNOWLEDGE', 'TIME'],      // 사업가: 지식, 시간 선호
      L: ['BIO', 'EMOTION'],         // 근로자: 생체, 감정 선호
    };
    
    const preferred = categoryPreference[interpreted.node.category] || [];
    
    // Motion 도메인이 선호 도메인인지 체크
    const motionMatch = preferred.includes(interpreted.motion.node) ? 30 : 0;
    
    // Work 도메인이 선호 도메인인지 체크
    const workMatch = preferred.includes(interpreted.work.domain) ? 20 : 0;
    
    // Motion과 Work의 도메인이 같으면 시너지
    const synergy = interpreted.motion.node === interpreted.work.domain ? 25 : 0;
    
    // 기본 점수 + 보너스
    const base = 25 + Math.random() * 20; // 25-45 랜덤
    
    return Math.min(100, Math.max(0, base + motionMatch + workMatch + synergy));
  }
  
  /**
   * 랜덤 좌표 생성 (의미 있는)
   */
  generateRandomCoords(): NodeID {
    return [
      Math.floor(Math.random() * 72),
      Math.floor(Math.random() * 72),
      Math.floor(Math.random() * 72),
    ];
  }
  
  /**
   * 특정 조건의 좌표 생성
   */
  generateCoordsByCondition(options: {
    category?: 'T' | 'B' | 'L';
    motionDomain?: string;
    workDomain?: string;
  }): NodeID {
    let nodeIdx = Math.floor(Math.random() * 72);
    let motionIdx = Math.floor(Math.random() * 72);
    let workIdx = Math.floor(Math.random() * 72);
    
    // 카테고리 필터
    if (options.category) {
      const base = { T: 0, B: 24, L: 48 }[options.category];
      nodeIdx = base + Math.floor(Math.random() * 24);
    }
    
    // Motion 도메인 필터
    if (options.motionDomain) {
      const domainKeys = ['BIO', 'CAPITAL', 'NETWORK', 'KNOWLEDGE', 'TIME', 'EMOTION'];
      const domainIdx = domainKeys.indexOf(options.motionDomain);
      if (domainIdx >= 0) {
        motionIdx = domainIdx * 12 + Math.floor(Math.random() * 12);
      }
    }
    
    // Work 도메인 필터
    if (options.workDomain) {
      const domainKeys = ['BIO', 'CAPITAL', 'NETWORK', 'KNOWLEDGE', 'TIME', 'EMOTION'];
      const domainIdx = domainKeys.indexOf(options.workDomain);
      if (domainIdx >= 0) {
        workIdx = domainIdx * 12 + Math.floor(Math.random() * 12);
      }
    }
    
    return [nodeIdx, motionIdx, workIdx];
  }
}

// Singleton export
export const cubeInterpreter = new CubeInterpreter();
export default CubeInterpreter;
