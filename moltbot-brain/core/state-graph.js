/**
 * 🧠 MoltBot Brain - State Graph
 *
 * "LLM은 상태를 잊는다. 그래프만이 '운영 맥락'을 유지한다."
 * 학생–수업–강사–시간 관계 모델링
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATE_FILE = path.join(__dirname, '../state/graph.json');

// ============================================
// 노드 타입
// ============================================
export const NODE_TYPES = {
  STUDENT: 'student',
  CLASS: 'class',
  COACH: 'coach',
  PARENT: 'parent',
  SCHEDULE: 'schedule',
  PAYMENT: 'payment',
};

// ============================================
// 관계 타입
// ============================================
export const RELATION_TYPES = {
  ENROLLED_IN: 'enrolled_in',     // student → class
  TEACHES: 'teaches',             // coach → class
  PARENT_OF: 'parent_of',         // parent → student
  SCHEDULED_AT: 'scheduled_at',   // class → schedule
  OWES: 'owes',                   // student → payment
  PAID: 'paid',                   // student → payment
};

// ============================================
// 상태 레벨 (학생 기준)
// ============================================
export const STATE_LEVELS = {
  OPTIMAL: 'optimal',       // 출석률 90%+, 미수금 0, 참여도 높음
  STABLE: 'stable',         // 출석률 80%+, 미수금 적음
  WATCH: 'watch',           // 출석률 70%+, 약간의 위험 신호
  ALERT: 'alert',           // 출석률 60%+, 개입 필요
  CRITICAL: 'critical',     // 출석률 60% 미만, 즉시 개입
  PROTECTED: 'protected',   // 보호 모드 (집중 관리)
};

// ============================================
// State Graph (In-Memory + Persistence)
// ============================================
export class StateGraph {
  constructor() {
    this.nodes = new Map();
    this.edges = [];
    this.stateHistory = [];
    this.load();
  }

  // ============================================
  // 기본 CRUD
  // ============================================

  /**
   * 노드 추가/업데이트
   */
  setNode(type, id, data) {
    const nodeId = `${type}:${id}`;
    const existing = this.nodes.get(nodeId);

    const node = {
      id: nodeId,
      type,
      entity_id: id,
      data: { ...existing?.data, ...data },
      state: data.state || existing?.state || STATE_LEVELS.STABLE,
      updated_at: new Date().toISOString(),
      created_at: existing?.created_at || new Date().toISOString(),
    };

    // 상태 변경 시 히스토리 기록
    if (existing && existing.state !== node.state) {
      this.recordStateChange(nodeId, existing.state, node.state);
    }

    this.nodes.set(nodeId, node);
    this.save();
    return node;
  }

  /**
   * 노드 조회
   */
  getNode(type, id) {
    return this.nodes.get(`${type}:${id}`);
  }

  /**
   * 관계 추가
   */
  addEdge(fromType, fromId, toType, toId, relationType, data = {}) {
    const edge = {
      from: `${fromType}:${fromId}`,
      to: `${toType}:${toId}`,
      type: relationType,
      data,
      created_at: new Date().toISOString(),
    };

    // 중복 체크
    const exists = this.edges.find(
      e => e.from === edge.from && e.to === edge.to && e.type === edge.type
    );

    if (!exists) {
      this.edges.push(edge);
      this.save();
    }

    return edge;
  }

  /**
   * 관계 조회
   */
  getEdges(nodeId, relationType = null, direction = 'out') {
    return this.edges.filter(e => {
      const matchesNode = direction === 'out' ? e.from === nodeId : e.to === nodeId;
      const matchesType = relationType ? e.type === relationType : true;
      return matchesNode && matchesType;
    });
  }

  // ============================================
  // 상태 관리
  // ============================================

  /**
   * 상태 변경 기록
   */
  recordStateChange(nodeId, fromState, toState) {
    this.stateHistory.push({
      node_id: nodeId,
      from: fromState,
      to: toState,
      timestamp: new Date().toISOString(),
    });

    console.log(`[STATE] ${nodeId}: ${fromState} → ${toState}`);
  }

  /**
   * 학생 상태 계산 (V-Index 기반)
   */
  calculateStudentState(studentId) {
    const node = this.getNode(NODE_TYPES.STUDENT, studentId);
    if (!node) return null;

    const { attendance_rate = 0, total_outstanding = 0, engagement_score = 50 } = node.data;

    let state;
    if (attendance_rate >= 90 && total_outstanding === 0 && engagement_score >= 80) {
      state = STATE_LEVELS.OPTIMAL;
    } else if (attendance_rate >= 80 && total_outstanding <= 100000) {
      state = STATE_LEVELS.STABLE;
    } else if (attendance_rate >= 70) {
      state = STATE_LEVELS.WATCH;
    } else if (attendance_rate >= 60) {
      state = STATE_LEVELS.ALERT;
    } else {
      state = STATE_LEVELS.CRITICAL;
    }

    // 상태 업데이트
    this.setNode(NODE_TYPES.STUDENT, studentId, { ...node.data, state });

    return state;
  }

  /**
   * 보호 모드 진입
   */
  enterProtectedMode(studentId, reason) {
    const node = this.getNode(NODE_TYPES.STUDENT, studentId);
    if (node) {
      this.setNode(NODE_TYPES.STUDENT, studentId, {
        ...node.data,
        state: STATE_LEVELS.PROTECTED,
        protected_reason: reason,
        protected_at: new Date().toISOString(),
      });
      return true;
    }
    return false;
  }

  // ============================================
  // 쿼리
  // ============================================

  /**
   * 특정 상태의 학생들 조회
   */
  getStudentsByState(state) {
    const result = [];
    for (const [nodeId, node] of this.nodes) {
      if (node.type === NODE_TYPES.STUDENT && node.state === state) {
        result.push(node);
      }
    }
    return result;
  }

  /**
   * 수업의 모든 학생 조회
   */
  getStudentsInClass(classId) {
    const edges = this.edges.filter(
      e => e.to === `${NODE_TYPES.CLASS}:${classId}` && e.type === RELATION_TYPES.ENROLLED_IN
    );
    return edges.map(e => this.nodes.get(e.from)).filter(Boolean);
  }

  /**
   * 학생의 모든 관계 조회
   */
  getStudentContext(studentId) {
    const nodeId = `${NODE_TYPES.STUDENT}:${studentId}`;
    const node = this.nodes.get(nodeId);
    if (!node) return null;

    const outEdges = this.getEdges(nodeId, null, 'out');
    const inEdges = this.getEdges(nodeId, null, 'in');

    return {
      student: node,
      classes: outEdges
        .filter(e => e.type === RELATION_TYPES.ENROLLED_IN)
        .map(e => this.nodes.get(e.to)),
      parents: inEdges
        .filter(e => e.type === RELATION_TYPES.PARENT_OF)
        .map(e => this.nodes.get(e.from)),
      payments: outEdges
        .filter(e => e.type === RELATION_TYPES.OWES || e.type === RELATION_TYPES.PAID)
        .map(e => ({ ...this.nodes.get(e.to), relation: e.type })),
    };
  }

  /**
   * 위험 학생 목록
   */
  getAtRiskStudents() {
    const atRisk = [];
    for (const [nodeId, node] of this.nodes) {
      if (node.type === NODE_TYPES.STUDENT) {
        if ([STATE_LEVELS.ALERT, STATE_LEVELS.CRITICAL, STATE_LEVELS.PROTECTED].includes(node.state)) {
          atRisk.push(node);
        }
      }
    }
    return atRisk.sort((a, b) => {
      const order = { critical: 0, protected: 1, alert: 2 };
      return (order[a.state] ?? 3) - (order[b.state] ?? 3);
    });
  }

  // ============================================
  // 변화 감지
  // ============================================

  /**
   * 상태 변화 비교 (before/after)
   */
  compareStates(studentId, beforeSnapshot) {
    const current = this.getNode(NODE_TYPES.STUDENT, studentId);
    if (!current || !beforeSnapshot) return null;

    const changes = {};
    const compareKeys = ['attendance_rate', 'total_outstanding', 'engagement_score', 'state'];

    for (const key of compareKeys) {
      if (beforeSnapshot[key] !== current.data[key]) {
        changes[key] = {
          before: beforeSnapshot[key],
          after: current.data[key],
          delta: typeof current.data[key] === 'number'
            ? current.data[key] - (beforeSnapshot[key] || 0)
            : null,
        };
      }
    }

    return Object.keys(changes).length > 0 ? changes : null;
  }

  // ============================================
  // 영속성
  // ============================================

  save() {
    const stateDir = path.dirname(STATE_FILE);
    if (!fs.existsSync(stateDir)) {
      fs.mkdirSync(stateDir, { recursive: true });
    }

    const data = {
      nodes: Array.from(this.nodes.entries()),
      edges: this.edges,
      stateHistory: this.stateHistory.slice(-1000), // 최근 1000개만
      saved_at: new Date().toISOString(),
    };

    fs.writeFileSync(STATE_FILE, JSON.stringify(data, null, 2));
  }

  load() {
    if (fs.existsSync(STATE_FILE)) {
      try {
        const data = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
        this.nodes = new Map(data.nodes || []);
        this.edges = data.edges || [];
        this.stateHistory = data.stateHistory || [];
        console.log(`[STATE GRAPH] Loaded ${this.nodes.size} nodes, ${this.edges.length} edges`);
      } catch (e) {
        console.error('[STATE GRAPH] Failed to load:', e.message);
      }
    }
  }

  /**
   * 통계
   */
  getStats() {
    const nodesByType = {};
    const statesByCount = {};

    for (const [_, node] of this.nodes) {
      nodesByType[node.type] = (nodesByType[node.type] || 0) + 1;
      if (node.type === NODE_TYPES.STUDENT) {
        statesByCount[node.state] = (statesByCount[node.state] || 0) + 1;
      }
    }

    return {
      total_nodes: this.nodes.size,
      total_edges: this.edges.length,
      nodes_by_type: nodesByType,
      student_states: statesByCount,
      history_length: this.stateHistory.length,
    };
  }
}

// 싱글톤
export const stateGraph = new StateGraph();
export default StateGraph;
