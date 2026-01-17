/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS Node Store (Zustand)
 * 36개 노드의 실시간 데이터(K/I/r) 동기화
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface NodeData {
  id: string;
  code: string;
  name: string;
  description: string;
  
  // K/I/r 물리 지표
  k: number;      // 자본 계수 (0.0 ~ 2.0)
  i: number;      // 정보 계수 (-1.0 ~ 1.0)
  r: number;      // 변화율 (-0.1 ~ 0.1)
  
  // 자동화 상태
  automationLevel: number;  // 0.0 ~ 1.0
  status: 'active' | 'pending_delete' | 'eliminated' | 'merged';
  
  // 3D 위치
  position: { x: number; y: number; z: number };
  
  // 연결
  connections: string[];  // 연결된 노드 ID
  
  // 메타데이터
  domain: string;
  tier: number;
  lastUpdated: number;
}

export interface Connection {
  id: string;
  source: string;
  target: string;
  strength: number;  // 연결 강도 0.0 ~ 1.0
  type: 'dependency' | 'flow' | 'merge';
}

interface NodeState {
  // 데이터
  nodes: Record<string, NodeData>;
  connections: Connection[];
  
  // 선택 상태
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  
  // 필터
  visibleDomains: string[];
  minAutomationLevel: number;
  
  // 통계
  stats: {
    totalNodes: number;
    activeNodes: number;
    eliminatedNodes: number;
    avgK: number;
    avgAutomation: number;
  };
  
  // Actions
  initializeNodes: () => void;
  updateNode: (id: string, updates: Partial<NodeData>) => void;
  updateNodeKIR: (id: string, k: number, i: number, r: number) => void;
  selectNode: (id: string | null) => void;
  hoverNode: (id: string | null) => void;
  eliminateNode: (id: string) => void;
  mergeNodes: (sourceIds: string[], targetId: string) => void;
  addConnection: (source: string, target: string, type: Connection['type']) => void;
  removeConnection: (id: string) => void;
  setVisibleDomains: (domains: string[]) => void;
  recalculateStats: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 36 Node Definitions
// ═══════════════════════════════════════════════════════════════════════════════

const DOMAINS = [
  'FIN', 'HR', 'SAL', 'MKT', 'OPS', 'IT',
  'LEG', 'R&D', 'CS', 'LOG', 'QA', 'ADMIN'
];

const NODE_TEMPLATES: Array<{ code: string; name: string; domain: string; tier: number }> = [
  // Financial (FIN)
  { code: 'FIN.AR', name: '매출채권 관리', domain: 'FIN', tier: 1 },
  { code: 'FIN.AP', name: '매입채무 관리', domain: 'FIN', tier: 1 },
  { code: 'FIN.GL', name: '총계정원장', domain: 'FIN', tier: 2 },
  
  // Human Resources (HR)
  { code: 'HR.PAY', name: '급여 처리', domain: 'HR', tier: 1 },
  { code: 'HR.ATT', name: '근태 관리', domain: 'HR', tier: 2 },
  { code: 'HR.REC', name: '채용 관리', domain: 'HR', tier: 2 },
  
  // Sales (SAL)
  { code: 'SAL.ORD', name: '주문 처리', domain: 'SAL', tier: 1 },
  { code: 'SAL.QUO', name: '견적 관리', domain: 'SAL', tier: 2 },
  { code: 'SAL.CRM', name: '고객 관리', domain: 'SAL', tier: 1 },
  
  // Marketing (MKT)
  { code: 'MKT.CAM', name: '캠페인 관리', domain: 'MKT', tier: 2 },
  { code: 'MKT.ANA', name: '마케팅 분석', domain: 'MKT', tier: 2 },
  { code: 'MKT.CON', name: '콘텐츠 관리', domain: 'MKT', tier: 3 },
  
  // Operations (OPS)
  { code: 'OPS.PRD', name: '생산 관리', domain: 'OPS', tier: 1 },
  { code: 'OPS.INV', name: '재고 관리', domain: 'OPS', tier: 1 },
  { code: 'OPS.SCH', name: '일정 관리', domain: 'OPS', tier: 2 },
  
  // IT
  { code: 'IT.DEV', name: '개발 관리', domain: 'IT', tier: 2 },
  { code: 'IT.SEC', name: '보안 관리', domain: 'IT', tier: 1 },
  { code: 'IT.INF', name: '인프라 관리', domain: 'IT', tier: 2 },
  
  // Legal (LEG)
  { code: 'LEG.CON', name: '계약 관리', domain: 'LEG', tier: 1 },
  { code: 'LEG.COM', name: '컴플라이언스', domain: 'LEG', tier: 2 },
  { code: 'LEG.IP', name: '지적재산 관리', domain: 'LEG', tier: 3 },
  
  // R&D
  { code: 'RND.PRJ', name: '프로젝트 관리', domain: 'R&D', tier: 2 },
  { code: 'RND.DOC', name: '기술 문서화', domain: 'R&D', tier: 3 },
  { code: 'RND.TST', name: '테스트 관리', domain: 'R&D', tier: 2 },
  
  // Customer Service (CS)
  { code: 'CS.TKT', name: '티켓 관리', domain: 'CS', tier: 1 },
  { code: 'CS.FAQ', name: 'FAQ 관리', domain: 'CS', tier: 3 },
  { code: 'CS.FBK', name: '피드백 관리', domain: 'CS', tier: 2 },
  
  // Logistics (LOG)
  { code: 'LOG.SHP', name: '배송 관리', domain: 'LOG', tier: 1 },
  { code: 'LOG.WHS', name: '창고 관리', domain: 'LOG', tier: 2 },
  { code: 'LOG.TRK', name: '추적 관리', domain: 'LOG', tier: 2 },
  
  // Quality Assurance (QA)
  { code: 'QA.INS', name: '품질 검사', domain: 'QA', tier: 2 },
  { code: 'QA.AUD', name: '감사 관리', domain: 'QA', tier: 2 },
  { code: 'QA.RPT', name: '품질 보고', domain: 'QA', tier: 3 },
  
  // Admin
  { code: 'ADM.DOC', name: '문서 관리', domain: 'ADMIN', tier: 3 },
  { code: 'ADM.MTG', name: '회의 관리', domain: 'ADMIN', tier: 3 },
  { code: 'ADM.EXP', name: '경비 처리', domain: 'ADMIN', tier: 2 },
];

// ═══════════════════════════════════════════════════════════════════════════════
// Store
// ═══════════════════════════════════════════════════════════════════════════════

export const useNodeStore = create<NodeState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    nodes: {},
    connections: [],
    selectedNodeId: null,
    hoveredNodeId: null,
    visibleDomains: DOMAINS,
    minAutomationLevel: 0,
    stats: {
      totalNodes: 0,
      activeNodes: 0,
      eliminatedNodes: 0,
      avgK: 1.0,
      avgAutomation: 0,
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // Initialize 36 Nodes
    // ═══════════════════════════════════════════════════════════════════════════
    
    initializeNodes: () => {
      const nodes: Record<string, NodeData> = {};
      const goldenAngle = Math.PI * (3 - Math.sqrt(5));
      
      NODE_TEMPLATES.forEach((template, index) => {
        // 황금비 기반 3D 구면 분포
        const y = 1 - (index / (NODE_TEMPLATES.length - 1)) * 2;
        const radius = Math.sqrt(1 - y * y);
        const theta = goldenAngle * index;
        
        const scale = 5;
        
        nodes[template.code] = {
          id: template.code,
          code: template.code,
          name: template.name,
          description: `${template.domain} 도메인의 ${template.name}`,
          
          // 랜덤 초기값
          k: 0.8 + Math.random() * 0.4,  // 0.8 ~ 1.2
          i: (Math.random() - 0.5) * 0.4, // -0.2 ~ 0.2
          r: (Math.random() - 0.5) * 0.02, // -0.01 ~ 0.01
          
          automationLevel: Math.random() * 0.3 + (template.tier === 3 ? 0.6 : template.tier === 2 ? 0.4 : 0.2),
          status: 'active',
          
          position: {
            x: Math.cos(theta) * radius * scale,
            y: y * scale,
            z: Math.sin(theta) * radius * scale,
          },
          
          connections: [],
          domain: template.domain,
          tier: template.tier,
          lastUpdated: Date.now(),
        };
      });
      
      // 기본 연결 생성 (같은 도메인 내)
      const connections: Connection[] = [];
      Object.values(nodes).forEach(node => {
        const sameDomain = Object.values(nodes).filter(
          n => n.domain === node.domain && n.id !== node.id
        );
        
        sameDomain.forEach(target => {
          if (!connections.find(c => 
            (c.source === node.id && c.target === target.id) ||
            (c.source === target.id && c.target === node.id)
          )) {
            connections.push({
              id: `${node.id}-${target.id}`,
              source: node.id,
              target: target.id,
              strength: 0.5 + Math.random() * 0.5,
              type: 'flow',
            });
            node.connections.push(target.id);
            target.connections.push(node.id);
          }
        });
      });
      
      set({ nodes, connections });
      get().recalculateStats();
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // Node Updates
    // ═══════════════════════════════════════════════════════════════════════════
    
    updateNode: (id, updates) => {
      set(state => ({
        nodes: {
          ...state.nodes,
          [id]: {
            ...state.nodes[id],
            ...updates,
            lastUpdated: Date.now(),
          },
        },
      }));
      get().recalculateStats();
    },
    
    updateNodeKIR: (id, k, i, r) => {
      set(state => ({
        nodes: {
          ...state.nodes,
          [id]: {
            ...state.nodes[id],
            k: Math.max(0, Math.min(2, k)),
            i: Math.max(-1, Math.min(1, i)),
            r: Math.max(-0.1, Math.min(0.1, r)),
            lastUpdated: Date.now(),
          },
        },
      }));
      get().recalculateStats();
    },
    
    selectNode: (id) => set({ selectedNodeId: id }),
    hoverNode: (id) => set({ hoveredNodeId: id }),
    
    // ═══════════════════════════════════════════════════════════════════════════
    // Elimination & Merge
    // ═══════════════════════════════════════════════════════════════════════════
    
    eliminateNode: (id) => {
      set(state => ({
        nodes: {
          ...state.nodes,
          [id]: {
            ...state.nodes[id],
            status: 'eliminated',
            lastUpdated: Date.now(),
          },
        },
      }));
      get().recalculateStats();
    },
    
    mergeNodes: (sourceIds, targetId) => {
      set(state => {
        const newNodes = { ...state.nodes };
        
        // 소스 노드들을 merged 상태로
        sourceIds.forEach(sourceId => {
          if (newNodes[sourceId]) {
            newNodes[sourceId] = {
              ...newNodes[sourceId],
              status: 'merged',
              lastUpdated: Date.now(),
            };
          }
        });
        
        // 타겟 노드의 K 증가
        if (newNodes[targetId]) {
          const kBoost = sourceIds.length * 0.1;
          newNodes[targetId] = {
            ...newNodes[targetId],
            k: Math.min(2, newNodes[targetId].k + kBoost),
            automationLevel: Math.min(1, newNodes[targetId].automationLevel + 0.1),
            lastUpdated: Date.now(),
          };
        }
        
        return { nodes: newNodes };
      });
      get().recalculateStats();
    },
    
    // ═══════════════════════════════════════════════════════════════════════════
    // Connections
    // ═══════════════════════════════════════════════════════════════════════════
    
    addConnection: (source, target, type) => {
      const id = `${source}-${target}`;
      set(state => {
        if (state.connections.find(c => c.id === id)) return state;
        
        return {
          connections: [
            ...state.connections,
            { id, source, target, strength: 0.5, type },
          ],
          nodes: {
            ...state.nodes,
            [source]: {
              ...state.nodes[source],
              connections: [...state.nodes[source].connections, target],
            },
            [target]: {
              ...state.nodes[target],
              connections: [...state.nodes[target].connections, source],
            },
          },
        };
      });
    },
    
    removeConnection: (id) => {
      set(state => ({
        connections: state.connections.filter(c => c.id !== id),
      }));
    },
    
    setVisibleDomains: (domains) => set({ visibleDomains: domains }),
    
    // ═══════════════════════════════════════════════════════════════════════════
    // Statistics
    // ═══════════════════════════════════════════════════════════════════════════
    
    recalculateStats: () => {
      const { nodes } = get();
      const nodeList = Object.values(nodes);
      
      const activeNodes = nodeList.filter(n => n.status === 'active');
      const eliminatedNodes = nodeList.filter(n => n.status === 'eliminated' || n.status === 'merged');
      
      const avgK = activeNodes.length > 0
        ? activeNodes.reduce((sum, n) => sum + n.k, 0) / activeNodes.length
        : 1.0;
      
      const avgAutomation = activeNodes.length > 0
        ? activeNodes.reduce((sum, n) => sum + n.automationLevel, 0) / activeNodes.length
        : 0;
      
      set({
        stats: {
          totalNodes: nodeList.length,
          activeNodes: activeNodes.length,
          eliminatedNodes: eliminatedNodes.length,
          avgK,
          avgAutomation,
        },
      });
    },
  }))
);

// ═══════════════════════════════════════════════════════════════════════════════
// Selectors
// ═══════════════════════════════════════════════════════════════════════════════

export const selectActiveNodes = (state: NodeState) =>
  Object.values(state.nodes).filter(n => n.status === 'active');

export const selectNodesByDomain = (domain: string) => (state: NodeState) =>
  Object.values(state.nodes).filter(n => n.domain === domain);

export const selectHighAutomationNodes = (threshold = 0.9) => (state: NodeState) =>
  Object.values(state.nodes).filter(n => n.automationLevel >= threshold);

export const selectEliminationCandidates = (state: NodeState) =>
  Object.values(state.nodes).filter(n => n.automationLevel >= 0.95 && n.status === 'active');
