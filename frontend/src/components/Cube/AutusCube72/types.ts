/**
 * AUTUS 72³ Cube Types & Constants
 */

// ===================================================================
// Types
// ===================================================================

export type NodeState = 'NORMAL' | 'TENSION' | 'CRITICAL';

export interface Node72 {
  x: number;  // WHO (Node Type)
  y: number;  // WHAT (Motion Type)
  z: number;  // HOW (Work Type)
}

export interface HRState {
  workload: number;
  relation_density: number;
  exit_risk: number;
}

export interface Motion {
  velocity: number;
  acceleration: number;
  inertia: number;
  cpd: boolean;  // Critical Phase Detected
}

export interface Phenomenon {
  node: Node72;
  state: NodeState;
  motion: Motion;
  hr: HRState;
  attention_score: number;
  // 72³ 해석
  interpretation: {
    nodeId: string;
    nodeName: string;
    nodeCategory: 'T' | 'B' | 'L';
    motionId: string;
    motionName: string;
    motionDomain: string;
    workId: string;
    workName: string;
    workDomain: string;
    resonance: number;
  };
}

// ===================================================================
// Codebook (우리 시스템에 맞춤)
// ===================================================================

export const CODEBOOK = {
  WHO: {
    T: { range: [0, 23], label: '투자자', color: '#ffd700' },
    B: { range: [24, 47], label: '사업가', color: '#00d4ff' },
    L: { range: [48, 71], label: '근로자', color: '#00ff87' },
  },
  WHAT: {
    BIO: { range: [0, 11], label: '생체', color: '#ef4444' },
    CAPITAL: { range: [12, 23], label: '자본', color: '#f59e0b' },
    NETWORK: { range: [24, 35], label: '네트워크', color: '#3b82f6' },
    KNOWLEDGE: { range: [36, 47], label: '지식', color: '#8b5cf6' },
    TIME: { range: [48, 59], label: '시간', color: '#10b981' },
    EMOTION: { range: [60, 71], label: '감정', color: '#ec4899' },
  },
  HOW: {
    BIO: { range: [0, 11], label: '생체 업무', color: '#ef4444' },
    CAPITAL: { range: [12, 23], label: '자본 업무', color: '#f59e0b' },
    NETWORK: { range: [24, 35], label: '네트워크 업무', color: '#3b82f6' },
    KNOWLEDGE: { range: [36, 47], label: '지식 업무', color: '#8b5cf6' },
    TIME: { range: [48, 59], label: '시간 업무', color: '#10b981' },
    EMOTION: { range: [60, 71], label: '감정 업무', color: '#ec4899' },
  },
  ACTION_FORCE: {
    BLOCK: { workload: -0.3, exit_risk: -0.2, label: '차단' },
    MITIGATE: { workload: -0.2, exit_risk: -0.15, label: '완화' },
    REDIRECT: { workload: -0.1, exit_risk: -0.1, label: '유도' },
    AMPLIFY: { workload: 0.1, exit_risk: -0.25, label: '증폭' },
  },
};

// ===================================================================
// State Colors
// ===================================================================

export const STATE_COLORS: Record<NodeState, string> = {
  NORMAL: '#00d4ff',
  TENSION: '#ff9500',
  CRITICAL: '#ff2d55',
};
