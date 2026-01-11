/**
 * AUTUS - Human Type ↔ 72 Node 매핑
 * ==================================
 * 
 * Frontend의 72 Human Types와 Backend의 72 Nodes를 연결
 * 
 * 각 Human Type은 72개 Node 중 12개가 "활성화"됨
 * - 6개 Core Nodes (모든 타입 공통)
 * - 6개 Domain Nodes (타입별 특화)
 */

import { NodeType, ALL_72_TYPES } from './node72Types';

// ═══════════════════════════════════════════════════════════════════════════
// 72 Node 정의 (Backend와 동기화)
// ═══════════════════════════════════════════════════════════════════════════

export interface Node72 {
  id: string;         // n01-n72
  name: string;
  nameKr: string;
  law: string;        // L1-L6
  property: string;   // P01-P12
  category: string;   // Conservation, Flow, Inertia, Acceleration, Friction, Gravity
}

// 6 Laws × 12 Properties = 72 Nodes
export const ALL_72_NODES: Node72[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // L1: Conservation (보존) - 재무/자산 (n01-n12)
  // ═══════════════════════════════════════════════════════════════════════════
  { id: 'n01', name: 'Cash', nameKr: '현금', law: 'L1', property: 'P01', category: 'Conservation' },
  { id: 'n02', name: 'Assets', nameKr: '자산', law: 'L1', property: 'P02', category: 'Conservation' },
  { id: 'n03', name: 'Liabilities', nameKr: '부채', law: 'L1', property: 'P03', category: 'Conservation' },
  { id: 'n04', name: 'Equity', nameKr: '자본', law: 'L1', property: 'P04', category: 'Conservation' },
  { id: 'n05', name: 'Revenue', nameKr: '수익', law: 'L1', property: 'P05', category: 'Conservation' },
  { id: 'n06', name: 'Expense', nameKr: '비용', law: 'L1', property: 'P06', category: 'Conservation' },
  { id: 'n07', name: 'Profit', nameKr: '이익', law: 'L1', property: 'P07', category: 'Conservation' },
  { id: 'n08', name: 'Inventory', nameKr: '재고', law: 'L1', property: 'P08', category: 'Conservation' },
  { id: 'n09', name: 'Customers', nameKr: '고객', law: 'L1', property: 'P09', category: 'Conservation' },
  { id: 'n10', name: 'Employees', nameKr: '직원', law: 'L1', property: 'P10', category: 'Conservation' },
  { id: 'n11', name: 'Products', nameKr: '제품', law: 'L1', property: 'P11', category: 'Conservation' },
  { id: 'n12', name: 'Reserves', nameKr: '적립금', law: 'L1', property: 'P12', category: 'Conservation' },

  // ═══════════════════════════════════════════════════════════════════════════
  // L2: Flow (흐름) - 이동/변화 (n13-n24)
  // ═══════════════════════════════════════════════════════════════════════════
  { id: 'n13', name: 'CashFlow', nameKr: '현금흐름', law: 'L2', property: 'P01', category: 'Flow' },
  { id: 'n14', name: 'DataFlow', nameKr: '데이터흐름', law: 'L2', property: 'P02', category: 'Flow' },
  { id: 'n15', name: 'WorkFlow', nameKr: '업무흐름', law: 'L2', property: 'P03', category: 'Flow' },
  { id: 'n16', name: 'Traffic', nameKr: '트래픽', law: 'L2', property: 'P04', category: 'Flow' },
  { id: 'n17', name: 'GrowthRate', nameKr: '성장률', law: 'L2', property: 'P05', category: 'Flow' },
  { id: 'n18', name: 'ChurnRate', nameKr: '이탈률', law: 'L2', property: 'P06', category: 'Flow' },
  { id: 'n19', name: 'ConversionRate', nameKr: '전환율', law: 'L2', property: 'P07', category: 'Flow' },
  { id: 'n20', name: 'Velocity', nameKr: '속도', law: 'L2', property: 'P08', category: 'Flow' },
  { id: 'n21', name: 'AcquisitionRate', nameKr: '획득률', law: 'L2', property: 'P09', category: 'Flow' },
  { id: 'n22', name: 'RetentionRate', nameKr: '유지율', law: 'L2', property: 'P10', category: 'Flow' },
  { id: 'n23', name: 'Throughput', nameKr: '처리량', law: 'L2', property: 'P11', category: 'Flow' },
  { id: 'n24', name: 'Pipeline', nameKr: '파이프라인', law: 'L2', property: 'P12', category: 'Flow' },

  // ═══════════════════════════════════════════════════════════════════════════
  // L3: Inertia (관성) - 안정/지속 (n25-n36)
  // ═══════════════════════════════════════════════════════════════════════════
  { id: 'n25', name: 'Habits', nameKr: '습관', law: 'L3', property: 'P01', category: 'Inertia' },
  { id: 'n26', name: 'Culture', nameKr: '문화', law: 'L3', property: 'P02', category: 'Inertia' },
  { id: 'n27', name: 'Brand', nameKr: '브랜드', law: 'L3', property: 'P03', category: 'Inertia' },
  { id: 'n28', name: 'Recurring', nameKr: '반복수익', law: 'L3', property: 'P04', category: 'Inertia' },
  { id: 'n29', name: 'Contracts', nameKr: '계약', law: 'L3', property: 'P05', category: 'Inertia' },
  { id: 'n30', name: 'Relationships', nameKr: '관계', law: 'L3', property: 'P06', category: 'Inertia' },
  { id: 'n31', name: 'Reputation', nameKr: '평판', law: 'L3', property: 'P07', category: 'Inertia' },
  { id: 'n32', name: 'Stability', nameKr: '안정성', law: 'L3', property: 'P08', category: 'Inertia' },
  { id: 'n33', name: 'Loyalty', nameKr: '충성도', law: 'L3', property: 'P09', category: 'Inertia' },
  { id: 'n34', name: 'Engagement', nameKr: '참여도', law: 'L3', property: 'P10', category: 'Inertia' },
  { id: 'n35', name: 'Commitment', nameKr: '몰입도', law: 'L3', property: 'P11', category: 'Inertia' },
  { id: 'n36', name: 'Resilience', nameKr: '회복력', law: 'L3', property: 'P12', category: 'Inertia' },

  // ═══════════════════════════════════════════════════════════════════════════
  // L4: Acceleration (가속) - 변화/성장 (n37-n48)
  // ═══════════════════════════════════════════════════════════════════════════
  { id: 'n37', name: 'Momentum', nameKr: '모멘텀', law: 'L4', property: 'P01', category: 'Acceleration' },
  { id: 'n38', name: 'Innovation', nameKr: '혁신', law: 'L4', property: 'P02', category: 'Acceleration' },
  { id: 'n39', name: 'Learning', nameKr: '학습', law: 'L4', property: 'P03', category: 'Acceleration' },
  { id: 'n40', name: 'NetworkEffect', nameKr: '네트워크효과', law: 'L4', property: 'P04', category: 'Acceleration' },
  { id: 'n41', name: 'ViralCoeff', nameKr: '바이럴계수', law: 'L4', property: 'P05', category: 'Acceleration' },
  { id: 'n42', name: 'Productivity', nameKr: '생산성', law: 'L4', property: 'P06', category: 'Acceleration' },
  { id: 'n43', name: 'Efficiency', nameKr: '효율성', law: 'L4', property: 'P07', category: 'Acceleration' },
  { id: 'n44', name: 'Volatility', nameKr: '변동성', law: 'L4', property: 'P08', category: 'Acceleration' },
  { id: 'n45', name: 'Trends', nameKr: '트렌드', law: 'L4', property: 'P09', category: 'Acceleration' },
  { id: 'n46', name: 'Signals', nameKr: '신호', law: 'L4', property: 'P10', category: 'Acceleration' },
  { id: 'n47', name: 'Catalysts', nameKr: '촉매', law: 'L4', property: 'P11', category: 'Acceleration' },
  { id: 'n48', name: 'Leverage', nameKr: '레버리지', law: 'L4', property: 'P12', category: 'Acceleration' },

  // ═══════════════════════════════════════════════════════════════════════════
  // L5: Friction (마찰) - 비용/저항 (n49-n60)
  // ═══════════════════════════════════════════════════════════════════════════
  { id: 'n49', name: 'Competition', nameKr: '경쟁', law: 'L5', property: 'P01', category: 'Friction' },
  { id: 'n50', name: 'Regulation', nameKr: '규제', law: 'L5', property: 'P02', category: 'Friction' },
  { id: 'n51', name: 'Complexity', nameKr: '복잡성', law: 'L5', property: 'P03', category: 'Friction' },
  { id: 'n52', name: 'Bureaucracy', nameKr: '관료주의', law: 'L5', property: 'P04', category: 'Friction' },
  { id: 'n53', name: 'TechDebt', nameKr: '기술부채', law: 'L5', property: 'P05', category: 'Friction' },
  { id: 'n54', name: 'Inefficiency', nameKr: '비효율', law: 'L5', property: 'P06', category: 'Friction' },
  { id: 'n55', name: 'Bottleneck', nameKr: '병목', law: 'L5', property: 'P07', category: 'Friction' },
  { id: 'n56', name: 'Debt', nameKr: '부채', law: 'L5', property: 'P08', category: 'Friction' },
  { id: 'n57', name: 'Burnout', nameKr: '번아웃', law: 'L5', property: 'P09', category: 'Friction' },
  { id: 'n58', name: 'Cost', nameKr: '비용', law: 'L5', property: 'P10', category: 'Friction' },
  { id: 'n59', name: 'Barriers', nameKr: '장벽', law: 'L5', property: 'P11', category: 'Friction' },
  { id: 'n60', name: 'Risk', nameKr: '위험', law: 'L5', property: 'P12', category: 'Friction' },

  // ═══════════════════════════════════════════════════════════════════════════
  // L6: Gravity (중력) - 잠재력/인력 (n61-n72)
  // ═══════════════════════════════════════════════════════════════════════════
  { id: 'n61', name: 'Market', nameKr: '시장', law: 'L6', property: 'P01', category: 'Gravity' },
  { id: 'n62', name: 'Opportunity', nameKr: '기회', law: 'L6', property: 'P02', category: 'Gravity' },
  { id: 'n63', name: 'Vision', nameKr: '비전', law: 'L6', property: 'P03', category: 'Gravity' },
  { id: 'n64', name: 'Mission', nameKr: '미션', law: 'L6', property: 'P04', category: 'Gravity' },
  { id: 'n65', name: 'Purpose', nameKr: '목적', law: 'L6', property: 'P05', category: 'Gravity' },
  { id: 'n66', name: 'Values', nameKr: '가치관', law: 'L6', property: 'P06', category: 'Gravity' },
  { id: 'n67', name: 'Trust', nameKr: '신뢰', law: 'L6', property: 'P07', category: 'Gravity' },
  { id: 'n68', name: 'Influence', nameKr: '영향력', law: 'L6', property: 'P08', category: 'Gravity' },
  { id: 'n69', name: 'Authority', nameKr: '권위', law: 'L6', property: 'P09', category: 'Gravity' },
  { id: 'n70', name: 'Dependency', nameKr: '의존성', law: 'L6', property: 'P10', category: 'Gravity' },
  { id: 'n71', name: 'Centrality', nameKr: '중심성', law: 'L6', property: 'P11', category: 'Gravity' },
  { id: 'n72', name: 'Potential', nameKr: '잠재력', law: 'L6', property: 'P12', category: 'Gravity' },
];

// ═══════════════════════════════════════════════════════════════════════════
// 공통 Core Nodes (모든 타입 공통 6개)
// ═══════════════════════════════════════════════════════════════════════════

export const CORE_NODES = ['n01', 'n05', 'n06', 'n09', 'n33', 'n60'] as const;
// n01: Cash (현금) - 모든 경제 활동의 기반
// n05: Revenue (수익) - 모든 타입의 수입
// n06: Expense (비용) - 모든 타입의 지출
// n09: Customers (고객) - 가치 교환 대상
// n33: Loyalty (충성도) - 관계의 강도
// n60: Risk (위험) - 모든 타입이 관리해야 할 요소

// ═══════════════════════════════════════════════════════════════════════════
// Human Type → Active Nodes 매핑 (72 타입 × 12 노드)
// ═══════════════════════════════════════════════════════════════════════════

export interface TypeNodeMapping {
  typeId: string;
  activeNodes: string[];  // 12개의 활성 노드 ID
  primaryNode: string;    // 가장 중요한 노드
  physicsNode: 'BIO' | 'CAPITAL' | 'NETWORK' | 'KNOWLEDGE' | 'TIME' | 'EMOTION';
}

export const TYPE_NODE_MAPPINGS: TypeNodeMapping[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // T: 투자자 (24타입) - 주로 CAPITAL 중심
  // ═══════════════════════════════════════════════════════════════════════════
  
  // 공격적 투자자 그룹 (T01-T06)
  { typeId: 'T01', primaryNode: 'n48', physicsNode: 'CAPITAL',
    activeNodes: [...CORE_NODES, 'n02', 'n07', 'n17', 'n44', 'n48', 'n72'] },
  { typeId: 'T02', primaryNode: 'n72', physicsNode: 'CAPITAL',
    activeNodes: [...CORE_NODES, 'n17', 'n30', 'n38', 'n62', 'n68', 'n72'] },
  { typeId: 'T03', primaryNode: 'n44', physicsNode: 'CAPITAL',
    activeNodes: [...CORE_NODES, 'n13', 'n20', 'n44', 'n45', 'n46', 'n48'] },
  { typeId: 'T04', primaryNode: 'n68', physicsNode: 'CAPITAL',
    activeNodes: [...CORE_NODES, 'n02', 'n04', 'n29', 'n47', 'n68', 'n71'] },
  { typeId: 'T05', primaryNode: 'n32', physicsNode: 'CAPITAL',
    activeNodes: [...CORE_NODES, 'n02', 'n12', 'n22', 'n28', 'n32', 'n36'] },
  { typeId: 'T06', primaryNode: 'n28', physicsNode: 'CAPITAL',
    activeNodes: [...CORE_NODES, 'n07', 'n12', 'n13', 'n22', 'n28', 'n32'] },
  
  // 전략적 투자자 그룹 (T07-T12)
  { typeId: 'T07', primaryNode: 'n02', physicsNode: 'CAPITAL',
    activeNodes: [...CORE_NODES, 'n02', 'n13', 'n48', 'n56', 'n61', 'n72'] },
  { typeId: 'T08', primaryNode: 'n30', physicsNode: 'NETWORK',
    activeNodes: [...CORE_NODES, 'n30', 'n38', 'n39', 'n62', 'n68', 'n72'] },
  { typeId: 'T09', primaryNode: 'n02', physicsNode: 'CAPITAL',
    activeNodes: [...CORE_NODES, 'n02', 'n12', 'n32', 'n36', 'n50', 'n69'] },
  { typeId: 'T10', primaryNode: 'n65', physicsNode: 'EMOTION',
    activeNodes: [...CORE_NODES, 'n27', 'n31', 'n64', 'n65', 'n66', 'n68'] },
  { typeId: 'T11', primaryNode: 'n48', physicsNode: 'CAPITAL',
    activeNodes: [...CORE_NODES, 'n07', 'n44', 'n46', 'n47', 'n48', 'n51'] },
  { typeId: 'T12', primaryNode: 'n12', physicsNode: 'CAPITAL',
    activeNodes: [...CORE_NODES, 'n02', 'n04', 'n12', 'n32', 'n36', 'n66'] },
  
  // 전문 투자자 그룹 (T13-T18)
  { typeId: 'T13', primaryNode: 'n14', physicsNode: 'KNOWLEDGE',
    activeNodes: [...CORE_NODES, 'n14', 'n38', 'n39', 'n43', 'n46', 'n51'] },
  { typeId: 'T14', primaryNode: 'n39', physicsNode: 'KNOWLEDGE',
    activeNodes: [...CORE_NODES, 'n07', 'n39', 'n32', 'n36', 'n45', 'n72'] },
  { typeId: 'T15', primaryNode: 'n17', physicsNode: 'CAPITAL',
    activeNodes: [...CORE_NODES, 'n17', 'n37', 'n38', 'n45', 'n62', 'n72'] },
  { typeId: 'T16', primaryNode: 'n44', physicsNode: 'CAPITAL',
    activeNodes: [...CORE_NODES, 'n14', 'n38', 'n40', 'n44', 'n45', 'n72'] },
  { typeId: 'T17', primaryNode: 'n61', physicsNode: 'CAPITAL',
    activeNodes: [...CORE_NODES, 'n08', 'n45', 'n46', 'n50', 'n58', 'n61'] },
  { typeId: 'T18', primaryNode: 'n32', physicsNode: 'CAPITAL',
    activeNodes: [...CORE_NODES, 'n13', 'n28', 'n29', 'n32', 'n50', 'n56'] },
  
  // 특수 투자자 그룹 (T19-T24)
  { typeId: 'T19', primaryNode: 'n68', physicsNode: 'NETWORK',
    activeNodes: [...CORE_NODES, 'n26', 'n29', 'n47', 'n68', 'n69', 'n71'] },
  { typeId: 'T20', primaryNode: 'n72', physicsNode: 'CAPITAL',
    activeNodes: [...CORE_NODES, 'n30', 'n38', 'n62', 'n63', 'n68', 'n72'] },
  { typeId: 'T21', primaryNode: 'n13', physicsNode: 'CAPITAL',
    activeNodes: [...CORE_NODES, 'n04', 'n13', 'n29', 'n47', 'n58', 'n62'] },
  { typeId: 'T22', primaryNode: 'n40', physicsNode: 'NETWORK',
    activeNodes: [...CORE_NODES, 'n30', 'n34', 'n40', 'n41', 'n67', 'n68'] },
  { typeId: 'T23', primaryNode: 'n36', physicsNode: 'CAPITAL',
    activeNodes: [...CORE_NODES, 'n04', 'n29', 'n32', 'n36', 'n44', 'n72'] },
  { typeId: 'T24', primaryNode: 'n69', physicsNode: 'CAPITAL',
    activeNodes: [...CORE_NODES, 'n02', 'n12', 'n32', 'n66', 'n68', 'n69'] },

  // ═══════════════════════════════════════════════════════════════════════════
  // B: 사업가 (24타입) - 주로 NETWORK/TIME 중심
  // ═══════════════════════════════════════════════════════════════════════════
  
  // 성장형 사업가 (B01-B06)
  { typeId: 'B01', primaryNode: 'n68', physicsNode: 'NETWORK',
    activeNodes: [...CORE_NODES, 'n10', 'n26', 'n63', 'n64', 'n68', 'n69'] },
  { typeId: 'B02', primaryNode: 'n17', physicsNode: 'TIME',
    activeNodes: [...CORE_NODES, 'n17', 'n21', 'n37', 'n40', 'n48', 'n62'] },
  { typeId: 'B03', primaryNode: 'n43', physicsNode: 'TIME',
    activeNodes: [...CORE_NODES, 'n15', 'n23', 'n25', 'n42', 'n43', 'n54'] },
  { typeId: 'B04', primaryNode: 'n40', physicsNode: 'NETWORK',
    activeNodes: [...CORE_NODES, 'n16', 'n19', 'n30', 'n40', 'n41', 'n71'] },
  { typeId: 'B05', primaryNode: 'n27', physicsNode: 'NETWORK',
    activeNodes: [...CORE_NODES, 'n25', 'n26', 'n27', 'n28', 'n29', 'n43'] },
  { typeId: 'B06', primaryNode: 'n30', physicsNode: 'NETWORK',
    activeNodes: [...CORE_NODES, 'n26', 'n27', 'n30', 'n50', 'n61', 'n68'] },
  
  // 혁신형 사업가 (B07-B12)
  { typeId: 'B07', primaryNode: 'n38', physicsNode: 'EMOTION',
    activeNodes: [...CORE_NODES, 'n37', 'n38', 'n44', 'n62', 'n63', 'n72'] },
  { typeId: 'B08', primaryNode: 'n38', physicsNode: 'KNOWLEDGE',
    activeNodes: [...CORE_NODES, 'n11', 'n38', 'n39', 'n40', 'n53', 'n72'] },
  { typeId: 'B09', primaryNode: 'n65', physicsNode: 'EMOTION',
    activeNodes: [...CORE_NODES, 'n27', 'n31', 'n64', 'n65', 'n66', 'n68'] },
  { typeId: 'B10', primaryNode: 'n38', physicsNode: 'KNOWLEDGE',
    activeNodes: [...CORE_NODES, 'n11', 'n27', 'n34', 'n38', 'n45', 'n66'] },
  { typeId: 'B11', primaryNode: 'n27', physicsNode: 'NETWORK',
    activeNodes: [...CORE_NODES, 'n16', 'n27', 'n34', 'n41', 'n45', 'n68'] },
  { typeId: 'B12', primaryNode: 'n37', physicsNode: 'TIME',
    activeNodes: [...CORE_NODES, 'n30', 'n37', 'n38', 'n39', 'n47', 'n72'] },
  
  // 운영형 사업가 (B13-B18)
  { typeId: 'B13', primaryNode: 'n43', physicsNode: 'TIME',
    activeNodes: [...CORE_NODES, 'n15', 'n23', 'n42', 'n43', 'n54', 'n55'] },
  { typeId: 'B14', primaryNode: 'n66', physicsNode: 'EMOTION',
    activeNodes: [...CORE_NODES, 'n12', 'n26', 'n32', 'n35', 'n36', 'n66'] },
  { typeId: 'B15', primaryNode: 'n30', physicsNode: 'NETWORK',
    activeNodes: [...CORE_NODES, 'n08', 'n21', 'n30', 'n31', 'n49', 'n58'] },
  { typeId: 'B16', primaryNode: 'n23', physicsNode: 'TIME',
    activeNodes: [...CORE_NODES, 'n08', 'n15', 'n20', 'n23', 'n55', 'n58'] },
  { typeId: 'B17', primaryNode: 'n31', physicsNode: 'NETWORK',
    activeNodes: [...CORE_NODES, 'n10', 'n22', 'n30', 'n31', 'n34', 'n67'] },
  { typeId: 'B18', primaryNode: 'n11', physicsNode: 'BIO',
    activeNodes: [...CORE_NODES, 'n08', 'n10', 'n11', 'n23', 'n42', 'n58'] },
  
  // 전략형 사업가 (B19-B24)
  { typeId: 'B19', primaryNode: 'n39', physicsNode: 'KNOWLEDGE',
    activeNodes: [...CORE_NODES, 'n29', 'n30', 'n31', 'n39', 'n67', 'n68'] },
  { typeId: 'B20', primaryNode: 'n47', physicsNode: 'CAPITAL',
    activeNodes: [...CORE_NODES, 'n02', 'n07', 'n30', 'n47', 'n68', 'n72'] },
  { typeId: 'B21', primaryNode: 'n04', physicsNode: 'CAPITAL',
    activeNodes: [...CORE_NODES, 'n02', 'n04', 'n29', 'n47', 'n68', 'n71'] },
  { typeId: 'B22', primaryNode: 'n29', physicsNode: 'KNOWLEDGE',
    activeNodes: [...CORE_NODES, 'n11', 'n27', 'n28', 'n29', 'n50', 'n67'] },
  { typeId: 'B23', primaryNode: 'n30', physicsNode: 'NETWORK',
    activeNodes: [...CORE_NODES, 'n29', 'n30', 'n40', 'n47', 'n67', 'n68'] },
  { typeId: 'B24', primaryNode: 'n71', physicsNode: 'CAPITAL',
    activeNodes: [...CORE_NODES, 'n02', 'n04', 'n26', 'n47', 'n68', 'n71'] },

  // ═══════════════════════════════════════════════════════════════════════════
  // L: 근로자 (24타입) - 주로 TIME/KNOWLEDGE 중심
  // ═══════════════════════════════════════════════════════════════════════════
  
  // 창의형 근로자 (L01-L06)
  { typeId: 'L01', primaryNode: 'n38', physicsNode: 'KNOWLEDGE',
    activeNodes: [...CORE_NODES, 'n37', 'n38', 'n39', 'n45', 'n63', 'n72'] },
  { typeId: 'L02', primaryNode: 'n39', physicsNode: 'KNOWLEDGE',
    activeNodes: [...CORE_NODES, 'n14', 'n15', 'n39', 'n42', 'n46', 'n63'] },
  { typeId: 'L03', primaryNode: 'n38', physicsNode: 'KNOWLEDGE',
    activeNodes: [...CORE_NODES, 'n11', 'n27', 'n34', 'n38', 'n45', 'n66'] },
  { typeId: 'L04', primaryNode: 'n39', physicsNode: 'KNOWLEDGE',
    activeNodes: [...CORE_NODES, 'n14', 'n38', 'n39', 'n42', 'n51', 'n53'] },
  { typeId: 'L05', primaryNode: 'n39', physicsNode: 'KNOWLEDGE',
    activeNodes: [...CORE_NODES, 'n14', 'n38', 'n39', 'n46', 'n51', 'n72'] },
  { typeId: 'L06', primaryNode: 'n38', physicsNode: 'EMOTION',
    activeNodes: [...CORE_NODES, 'n27', 'n34', 'n38', 'n41', 'n45', 'n68'] },
  
  // 관리형 근로자 (L07-L12)
  { typeId: 'L07', primaryNode: 'n15', physicsNode: 'TIME',
    activeNodes: [...CORE_NODES, 'n10', 'n15', 'n23', 'n42', 'n55', 'n68'] },
  { typeId: 'L08', primaryNode: 'n68', physicsNode: 'NETWORK',
    activeNodes: [...CORE_NODES, 'n10', 'n26', 'n34', 'n35', 'n67', 'n68'] },
  { typeId: 'L09', primaryNode: 'n30', physicsNode: 'NETWORK',
    activeNodes: [...CORE_NODES, 'n14', 'n15', 'n30', 'n34', 'n55', 'n67'] },
  { typeId: 'L10', primaryNode: 'n15', physicsNode: 'TIME',
    activeNodes: [...CORE_NODES, 'n10', 'n14', 'n15', 'n25', 'n32', 'n43'] },
  { typeId: 'L11', primaryNode: 'n14', physicsNode: 'KNOWLEDGE',
    activeNodes: [...CORE_NODES, 'n14', 'n39', 'n42', 'n43', 'n46', 'n51'] },
  { typeId: 'L12', primaryNode: 'n43', physicsNode: 'TIME',
    activeNodes: [...CORE_NODES, 'n11', 'n23', 'n25', 'n32', 'n42', 'n43'] },
  
  // 실행형 근로자 (L13-L18)
  { typeId: 'L13', primaryNode: 'n21', physicsNode: 'NETWORK',
    activeNodes: [...CORE_NODES, 'n19', 'n21', 'n24', 'n30', 'n37', 'n67'] },
  { typeId: 'L14', primaryNode: 'n41', physicsNode: 'NETWORK',
    activeNodes: [...CORE_NODES, 'n16', 'n27', 'n34', 'n41', 'n45', 'n68'] },
  { typeId: 'L15', primaryNode: 'n67', physicsNode: 'EMOTION',
    activeNodes: [...CORE_NODES, 'n22', 'n30', 'n31', 'n34', 'n36', 'n67'] },
  { typeId: 'L16', primaryNode: 'n39', physicsNode: 'KNOWLEDGE',
    activeNodes: [...CORE_NODES, 'n14', 'n39', 'n42', 'n51', 'n53', 'n55'] },
  { typeId: 'L17', primaryNode: 'n23', physicsNode: 'TIME',
    activeNodes: [...CORE_NODES, 'n08', 'n15', 'n20', 'n23', 'n43', 'n55'] },
  { typeId: 'L18', primaryNode: 'n42', physicsNode: 'BIO',
    activeNodes: [...CORE_NODES, 'n08', 'n11', 'n23', 'n32', 'n42', 'n58'] },
  
  // 전문형 근로자 (L19-L24)
  { typeId: 'L19', primaryNode: 'n50', physicsNode: 'KNOWLEDGE',
    activeNodes: [...CORE_NODES, 'n29', 'n39', 'n50', 'n51', 'n67', 'n69'] },
  { typeId: 'L20', primaryNode: 'n13', physicsNode: 'KNOWLEDGE',
    activeNodes: [...CORE_NODES, 'n02', 'n07', 'n13', 'n39', 'n50', 'n56'] },
  { typeId: 'L21', primaryNode: 'n25', physicsNode: 'TIME',
    activeNodes: [...CORE_NODES, 'n15', 'n23', 'n25', 'n32', 'n42', 'n43'] },
  { typeId: 'L22', primaryNode: 'n10', physicsNode: 'NETWORK',
    activeNodes: [...CORE_NODES, 'n10', 'n26', 'n30', 'n34', 'n39', 'n67'] },
  { typeId: 'L23', primaryNode: 'n39', physicsNode: 'KNOWLEDGE',
    activeNodes: [...CORE_NODES, 'n26', 'n34', 'n35', 'n39', 'n67', 'n68'] },
  { typeId: 'L24', primaryNode: 'n37', physicsNode: 'TIME',
    activeNodes: [...CORE_NODES, 'n24', 'n29', 'n30', 'n37', 'n42', 'n72'] },
];

// ═══════════════════════════════════════════════════════════════════════════
// 유틸리티 함수
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Human Type ID로 활성 노드 매핑 조회
 */
export function getActiveNodesForType(typeId: string): string[] {
  const mapping = TYPE_NODE_MAPPINGS.find(m => m.typeId === typeId);
  return mapping?.activeNodes || [...CORE_NODES];
}

/**
 * Human Type ID로 주요 노드 조회
 */
export function getPrimaryNodeForType(typeId: string): string {
  const mapping = TYPE_NODE_MAPPINGS.find(m => m.typeId === typeId);
  return mapping?.primaryNode || 'n01';
}

/**
 * Human Type ID로 Physics Node 조회
 */
export function getPhysicsNodeForType(typeId: string): string {
  const mapping = TYPE_NODE_MAPPINGS.find(m => m.typeId === typeId);
  return mapping?.physicsNode || 'CAPITAL';
}

/**
 * Node ID로 Node 정보 조회
 */
export function getNodeById(nodeId: string): Node72 | undefined {
  return ALL_72_NODES.find(n => n.id === nodeId);
}

/**
 * 특정 노드가 특정 타입에서 활성인지 확인
 */
export function isNodeActiveForType(typeId: string, nodeId: string): boolean {
  const activeNodes = getActiveNodesForType(typeId);
  return activeNodes.includes(nodeId);
}

/**
 * 특정 타입의 활성 노드 상세 정보 조회
 */
export function getActiveNodeDetailsForType(typeId: string): Node72[] {
  const activeNodeIds = getActiveNodesForType(typeId);
  return activeNodeIds.map(id => getNodeById(id)).filter((n): n is Node72 => n !== undefined);
}

/**
 * 두 타입 간 공유하는 활성 노드 조회
 */
export function getSharedActiveNodes(typeIdA: string, typeIdB: string): string[] {
  const nodesA = getActiveNodesForType(typeIdA);
  const nodesB = getActiveNodesForType(typeIdB);
  return nodesA.filter(n => nodesB.includes(n));
}

/**
 * 카테고리별 가장 많이 활성화되는 노드 통계
 */
export function getNodeActivationStats(): Record<string, { count: number; types: string[] }> {
  const stats: Record<string, { count: number; types: string[] }> = {};
  
  for (const node of ALL_72_NODES) {
    stats[node.id] = { count: 0, types: [] };
  }
  
  for (const mapping of TYPE_NODE_MAPPINGS) {
    for (const nodeId of mapping.activeNodes) {
      if (stats[nodeId]) {
        stats[nodeId].count++;
        stats[nodeId].types.push(mapping.typeId);
      }
    }
  }
  
  return stats;
}

// ═══════════════════════════════════════════════════════════════════════════
// 72⁴ Event 인터페이스 (Backend 호환)
// ═══════════════════════════════════════════════════════════════════════════

export interface Event72_4 {
  code: string;         // n01m05w13t01 형식
  index: number;        // 0 ~ 26,873,855
  node: string;         // n01-n72
  motion: string;       // m01-m72
  work: string;         // w01-w72
  time: string;         // t01-t72
  value: number;
  timestamp: string;
  userId: string;
  humanType: string;    // T01, B05, L24 등
}

/**
 * Human Type 기반으로 Event 필터링
 * (해당 타입의 활성 노드와 관련된 이벤트만 반환)
 */
export function filterEventsForType(events: Event72_4[], typeId: string): Event72_4[] {
  const activeNodes = getActiveNodesForType(typeId);
  return events.filter(e => activeNodes.includes(e.node));
}

/**
 * Event의 중요도 계산 (해당 타입 기준)
 */
export function calculateEventImportance(event: Event72_4, typeId: string): number {
  const mapping = TYPE_NODE_MAPPINGS.find(m => m.typeId === typeId);
  if (!mapping) return 0.5;
  
  const isActive = mapping.activeNodes.includes(event.node);
  const isPrimary = mapping.primaryNode === event.node;
  const isCore = CORE_NODES.includes(event.node as typeof CORE_NODES[number]);
  
  if (isPrimary) return 1.0;
  if (isCore) return 0.8;
  if (isActive) return 0.6;
  return 0.3;
}

// ═══════════════════════════════════════════════════════════════════════════
// 통계 및 메타데이터
// ═══════════════════════════════════════════════════════════════════════════

export const MAPPING_STATS = {
  totalTypes: 72,
  totalNodes: 72,
  coreNodesCount: CORE_NODES.length,
  activeNodesPerType: 12,
  totalMappings: TYPE_NODE_MAPPINGS.length,
  
  physicsNodeDistribution: {
    CAPITAL: TYPE_NODE_MAPPINGS.filter(m => m.physicsNode === 'CAPITAL').length,
    NETWORK: TYPE_NODE_MAPPINGS.filter(m => m.physicsNode === 'NETWORK').length,
    TIME: TYPE_NODE_MAPPINGS.filter(m => m.physicsNode === 'TIME').length,
    KNOWLEDGE: TYPE_NODE_MAPPINGS.filter(m => m.physicsNode === 'KNOWLEDGE').length,
    EMOTION: TYPE_NODE_MAPPINGS.filter(m => m.physicsNode === 'EMOTION').length,
    BIO: TYPE_NODE_MAPPINGS.filter(m => m.physicsNode === 'BIO').length,
  },
  
  categoryStats: {
    T: TYPE_NODE_MAPPINGS.filter(m => m.typeId.startsWith('T')).length,
    B: TYPE_NODE_MAPPINGS.filter(m => m.typeId.startsWith('B')).length,
    L: TYPE_NODE_MAPPINGS.filter(m => m.typeId.startsWith('L')).length,
  },
};
