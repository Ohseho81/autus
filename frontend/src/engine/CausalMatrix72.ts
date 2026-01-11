/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS 72×72 인과 행렬 (Causal Matrix)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * A[i][j] = 노드 i → 노드 j 영향 계수
 * 
 * 희소 행렬 (Sparse Matrix):
 * - 총: 72 × 72 = 5,184
 * - 유의미한 연결: ~200개
 * - 나머지: 0 (관계 없음)
 * 
 * 6개 법칙 기반 연결:
 * 1. 보존: 회계 항등식 (Asset = Liability + Equity)
 * 2. 흐름: 방향성 (Income → Cash)
 * 3. 관성: 자기 자신 유지 (diagonal)
 * 4. 가속: 변화율 관계
 * 5. 마찰: 비용 관계
 * 6. 중력: 집중도 관계
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// 타입 정의
// ═══════════════════════════════════════════════════════════════════════════════

export type CausalSource = 
  | 'ACCOUNTING'     // 회계 원칙 (100% 신뢰)
  | 'PHYSICS'        // 물리 법칙 유추
  | 'RESEARCH'       // 경영학 연구
  | 'BENCHMARK'      // 산업 벤치마크
  | 'EMPIRICAL'      // 경험적 관찰
  | 'ESTIMATED';     // 추정

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface CausalLink {
  from: string;              // 원인 노드 (n01~n72)
  to: string;                // 결과 노드 (n01~n72)
  coefficient: number;       // 계수 (-1 ~ 1)
  source: CausalSource;      // 근거
  confidence: ConfidenceLevel;
  rationale: string;         // 설명
  law: string;               // 적용 법칙
}

// ═══════════════════════════════════════════════════════════════════════════════
// 72개 노드 ID
// ═══════════════════════════════════════════════════════════════════════════════

export const NODE_IDS = Array.from({ length: 72 }, (_, i) => `n${String(i + 1).padStart(2, '0')}`);

// 노드 이름 매핑
export const NODE_NAMES: Record<string, string> = {
  // Conservation (01-12)
  n01: 'cash_balance',
  n02: 'receivable_balance',
  n03: 'payable_balance',
  n04: 'equity_balance',
  n05: 'income_total',
  n06: 'expense_total',
  n07: 'investment_total',
  n08: 'return_total',
  n09: 'customer_count',
  n10: 'supplier_count',
  n11: 'competitor_count',
  n12: 'partner_count',
  
  // Flow (13-24)
  n13: 'cash_flow',
  n14: 'receivable_flow',
  n15: 'payable_flow',
  n16: 'equity_flow',
  n17: 'income_flow',
  n18: 'expense_flow',
  n19: 'investment_flow',
  n20: 'return_flow',
  n21: 'customer_flow',
  n22: 'supplier_flow',
  n23: 'competitor_flow',
  n24: 'partner_flow',
  
  // Inertia (25-36)
  n25: 'cash_inertia',
  n26: 'receivable_inertia',
  n27: 'payable_inertia',
  n28: 'equity_inertia',
  n29: 'income_inertia',
  n30: 'expense_inertia',
  n31: 'investment_inertia',
  n32: 'return_inertia',
  n33: 'customer_inertia',
  n34: 'supplier_inertia',
  n35: 'competitor_inertia',
  n36: 'partner_inertia',
  
  // Acceleration (37-48)
  n37: 'cash_accel',
  n38: 'receivable_accel',
  n39: 'payable_accel',
  n40: 'equity_accel',
  n41: 'income_accel',
  n42: 'expense_accel',
  n43: 'investment_accel',
  n44: 'return_accel',
  n45: 'customer_accel',
  n46: 'supplier_accel',
  n47: 'competitor_accel',
  n48: 'partner_accel',
  
  // Friction (49-60)
  n49: 'cash_friction',
  n50: 'receivable_friction',
  n51: 'payable_friction',
  n52: 'equity_friction',
  n53: 'income_friction',
  n54: 'expense_friction',
  n55: 'investment_friction',
  n56: 'return_friction',
  n57: 'customer_friction',
  n58: 'supplier_friction',
  n59: 'competitor_friction',
  n60: 'partner_friction',
  
  // Gravity (61-72)
  n61: 'cash_gravity',
  n62: 'receivable_gravity',
  n63: 'payable_gravity',
  n64: 'equity_gravity',
  n65: 'income_gravity',
  n66: 'expense_gravity',
  n67: 'investment_gravity',
  n68: 'return_gravity',
  n69: 'customer_gravity',
  n70: 'supplier_gravity',
  n71: 'competitor_gravity',
  n72: 'partner_gravity',
};

// ═══════════════════════════════════════════════════════════════════════════════
// 72×72 인과 연결 정의 (희소 행렬)
// ═══════════════════════════════════════════════════════════════════════════════

export const CAUSAL_LINKS: CausalLink[] = [
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 1. 보존 법칙 (Conservation) - 회계 항등식
  // ═══════════════════════════════════════════════════════════════════════════
  
  // 수입 → 현금 (수입이 현금으로 전환)
  { from: 'n05', to: 'n01', coefficient: 0.90, source: 'ACCOUNTING', confidence: 'HIGH',
    rationale: '수입의 90%가 현금화 (미수금 10% 제외)', law: 'CONSERVATION' },
  
  // 지출 → 현금 (지출은 현금 감소)
  { from: 'n06', to: 'n01', coefficient: -1.00, source: 'ACCOUNTING', confidence: 'HIGH',
    rationale: '지출은 현금을 감소시킴 (회계 항등식)', law: 'CONSERVATION' },
  
  // 투자 → 현금 (투자는 현금 유출)
  { from: 'n07', to: 'n01', coefficient: -1.00, source: 'ACCOUNTING', confidence: 'HIGH',
    rationale: '투자는 현금 유출', law: 'CONSERVATION' },
  
  // 회수 → 현금 (회수는 현금 유입)
  { from: 'n08', to: 'n01', coefficient: 0.95, source: 'ACCOUNTING', confidence: 'HIGH',
    rationale: '투자 회수의 95%가 현금화', law: 'CONSERVATION' },
  
  // 미수금 회수 → 현금
  { from: 'n14', to: 'n01', coefficient: 0.85, source: 'ACCOUNTING', confidence: 'HIGH',
    rationale: '미수금 회수율만큼 현금 증가', law: 'CONSERVATION' },
  
  // 부채 상환 → 현금
  { from: 'n15', to: 'n01', coefficient: -0.90, source: 'ACCOUNTING', confidence: 'HIGH',
    rationale: '부채 상환은 현금 감소', law: 'CONSERVATION' },
  
  // 자본 = 자산 - 부채
  { from: 'n01', to: 'n04', coefficient: 1.00, source: 'ACCOUNTING', confidence: 'HIGH',
    rationale: '현금 증가 → 자본 증가', law: 'CONSERVATION' },
  { from: 'n03', to: 'n04', coefficient: -1.00, source: 'ACCOUNTING', confidence: 'HIGH',
    rationale: '부채 증가 → 자본 감소', law: 'CONSERVATION' },
  
  // 고객수 → 수입
  { from: 'n09', to: 'n05', coefficient: 0.80, source: 'RESEARCH', confidence: 'HIGH',
    rationale: '고객 1% 증가 → 수입 0.8% 증가 (객단가 고려)', law: 'CONSERVATION' },
  
  // 고객수 변화
  { from: 'n21', to: 'n09', coefficient: 0.70, source: 'EMPIRICAL', confidence: 'MEDIUM',
    rationale: '신규율 10% → 고객 7% 증가 (이탈 제외)', law: 'CONSERVATION' },
  
  // 공급자(강사) 수
  { from: 'n22', to: 'n10', coefficient: 0.90, source: 'EMPIRICAL', confidence: 'MEDIUM',
    rationale: '강사 변동률이 강사 수에 반영', law: 'CONSERVATION' },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 2. 흐름 법칙 (Flow) - 방향과 양
  // ═══════════════════════════════════════════════════════════════════════════
  
  // 수입 → 수입흐름
  { from: 'n05', to: 'n17', coefficient: 1.00, source: 'ACCOUNTING', confidence: 'HIGH',
    rationale: '수입이 흐름 계산의 기준', law: 'FLOW' },
  
  // 지출 → 지출흐름
  { from: 'n06', to: 'n18', coefficient: 1.00, source: 'ACCOUNTING', confidence: 'HIGH',
    rationale: '지출이 흐름 계산의 기준', law: 'FLOW' },
  
  // 현금 → 현금흐름
  { from: 'n01', to: 'n13', coefficient: 1.00, source: 'ACCOUNTING', confidence: 'HIGH',
    rationale: '현금 잔고가 흐름 계산의 기준', law: 'FLOW' },
  
  // 고객수 → 고객흐름
  { from: 'n09', to: 'n21', coefficient: 0.50, source: 'EMPIRICAL', confidence: 'MEDIUM',
    rationale: '고객 기반이 클수록 신규 유입 용이', law: 'FLOW' },
  
  // 수입흐름 → 수입가속
  { from: 'n17', to: 'n41', coefficient: 0.80, source: 'PHYSICS', confidence: 'HIGH',
    rationale: '흐름의 변화가 가속도 (미분 관계)', law: 'FLOW' },
  
  // 고객흐름 → 고객가속
  { from: 'n21', to: 'n45', coefficient: 0.75, source: 'PHYSICS', confidence: 'HIGH',
    rationale: '고객 유입률의 변화가 가속도', law: 'FLOW' },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 3. 관성 법칙 (Inertia) - 자기 유지
  // ═══════════════════════════════════════════════════════════════════════════
  
  // 현금 관성 (자기 자신)
  { from: 'n01', to: 'n25', coefficient: 0.95, source: 'EMPIRICAL', confidence: 'MEDIUM',
    rationale: '현금 유지력', law: 'INERTIA' },
  
  // 수입 관성
  { from: 'n05', to: 'n29', coefficient: 0.85, source: 'BENCHMARK', confidence: 'MEDIUM',
    rationale: '수입 안정성 (재등록률)', law: 'INERTIA' },
  
  // 지출 관성 (고정비)
  { from: 'n06', to: 'n30', coefficient: 0.90, source: 'BENCHMARK', confidence: 'HIGH',
    rationale: '고정비 비율이 높아 지출 관성 강함', law: 'INERTIA' },
  
  // 고객 충성도 (관성)
  { from: 'n09', to: 'n33', coefficient: 0.80, source: 'RESEARCH', confidence: 'MEDIUM',
    rationale: '고객 기반이 충성도에 영향', law: 'INERTIA' },
  
  // 충성도 → 충성도 (자기 유지)
  { from: 'n33', to: 'n33', coefficient: 0.85, source: 'BENCHMARK', confidence: 'MEDIUM',
    rationale: '충성도 관성 (자연 감소 15%/년)', law: 'INERTIA' },
  
  // 강사 근속 관성
  { from: 'n34', to: 'n34', coefficient: 0.90, source: 'BENCHMARK', confidence: 'MEDIUM',
    rationale: '강사 근속 관성 (연 이직률 20-30%)', law: 'INERTIA' },
  
  // 강사 근속 → 충성도
  { from: 'n34', to: 'n33', coefficient: 0.30, source: 'RESEARCH', confidence: 'MEDIUM',
    rationale: '강사 안정성이 고객 충성도에 영향', law: 'INERTIA' },
  
  // 경쟁 고착도
  { from: 'n35', to: 'n35', coefficient: 0.95, source: 'EMPIRICAL', confidence: 'LOW',
    rationale: '시장 경쟁 구도는 쉽게 변하지 않음', law: 'INERTIA' },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 4. 가속 법칙 (Acceleration) - 변화의 속도
  // ═══════════════════════════════════════════════════════════════════════════
  
  // 가속도 자기 유지 (관성)
  { from: 'n41', to: 'n41', coefficient: 0.50, source: 'PHYSICS', confidence: 'MEDIUM',
    rationale: '가속도 관성 (급격한 변화 후 안정화)', law: 'ACCELERATION' },
  
  { from: 'n45', to: 'n45', coefficient: 0.50, source: 'PHYSICS', confidence: 'MEDIUM',
    rationale: '고객 가속 관성', law: 'ACCELERATION' },
  
  // 수입 가속 → 고객 가속
  { from: 'n41', to: 'n45', coefficient: 0.40, source: 'EMPIRICAL', confidence: 'LOW',
    rationale: '성장하는 곳에 사람이 모임', law: 'ACCELERATION' },
  
  // 고객 가속 → 수입 가속
  { from: 'n45', to: 'n41', coefficient: 0.60, source: 'RESEARCH', confidence: 'MEDIUM',
    rationale: '고객 증가 가속이 수입 가속으로 이어짐', law: 'ACCELERATION' },
  
  // 경쟁 가속 → 고객 가속 (역관계)
  { from: 'n47', to: 'n45', coefficient: -0.30, source: 'EMPIRICAL', confidence: 'MEDIUM',
    rationale: '경쟁 심화 시 고객 성장 둔화', law: 'ACCELERATION' },
  
  // 경쟁 가속 → 충성도
  { from: 'n47', to: 'n33', coefficient: -0.20, source: 'EMPIRICAL', confidence: 'MEDIUM',
    rationale: '경쟁 심화 시 충성도 감소', law: 'ACCELERATION' },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 5. 마찰 법칙 (Friction) - 비용과 손실
  // ═══════════════════════════════════════════════════════════════════════════
  
  // 현금 마찰 (수수료) → 현금 감소
  { from: 'n49', to: 'n01', coefficient: -0.03, source: 'ACCOUNTING', confidence: 'HIGH',
    rationale: '수수료율만큼 현금 손실', law: 'FRICTION' },
  
  // 수입 마찰 (원가) → 순이익 감소
  { from: 'n53', to: 'n04', coefficient: -0.50, source: 'ACCOUNTING', confidence: 'HIGH',
    rationale: '원가율이 자본 증가를 감소시킴', law: 'FRICTION' },
  
  // CAC → 고객당 비용
  { from: 'n57', to: 'n06', coefficient: 0.10, source: 'ACCOUNTING', confidence: 'MEDIUM',
    rationale: 'CAC가 지출에 반영', law: 'FRICTION' },
  
  // CAC → 신규 고객 (역관계)
  { from: 'n57', to: 'n21', coefficient: -0.20, source: 'RESEARCH', confidence: 'MEDIUM',
    rationale: 'CAC 상승 시 마케팅 효율 저하', law: 'FRICTION' },
  
  // 강사 비용률 → 지출
  { from: 'n58', to: 'n06', coefficient: 0.45, source: 'BENCHMARK', confidence: 'HIGH',
    rationale: '강사 인건비가 지출의 45%', law: 'FRICTION' },
  
  // 경쟁 비용 → 지출
  { from: 'n59', to: 'n06', coefficient: 0.08, source: 'EMPIRICAL', confidence: 'MEDIUM',
    rationale: '경쟁 대응 마케팅 비용', law: 'FRICTION' },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 6. 중력 법칙 (Gravity) - 집중과 의존
  // ═══════════════════════════════════════════════════════════════════════════
  
  // 고객 집중도 (추천) → 신규
  { from: 'n69', to: 'n21', coefficient: 0.35, source: 'RESEARCH', confidence: 'MEDIUM',
    rationale: '추천율이 높을수록 신규 유입 증가', law: 'GRAVITY' },
  
  // 충성도 → 추천율
  { from: 'n33', to: 'n69', coefficient: 0.50, source: 'RESEARCH', confidence: 'HIGH',
    rationale: '충성 고객이 추천을 많이 함', law: 'GRAVITY' },
  
  // 매출 집중도 → 위험 (역관계로 충성도에 영향)
  { from: 'n65', to: 'n33', coefficient: -0.15, source: 'EMPIRICAL', confidence: 'LOW',
    rationale: '매출 집중도가 높으면 이탈 시 충격', law: 'GRAVITY' },
  
  // 핵심 강사 의존도 → 충성도 (역관계)
  { from: 'n70', to: 'n33', coefficient: -0.30, source: 'EMPIRICAL', confidence: 'MEDIUM',
    rationale: '의존도 10% 상승 → 충성도 3% 하락 (불안 요인)', law: 'GRAVITY' },
  
  // 핵심 강사 의존도 → 자기 유지
  { from: 'n70', to: 'n70', coefficient: 0.95, source: 'EMPIRICAL', confidence: 'HIGH',
    rationale: '의존도는 의도적 분산 없으면 유지/증가', law: 'GRAVITY' },
  
  // 강사 근속 → 의존도 분산
  { from: 'n34', to: 'n70', coefficient: -0.20, source: 'EMPIRICAL', confidence: 'MEDIUM',
    rationale: '근속률 높으면 여러 강사가 성장하여 의존도 분산', law: 'GRAVITY' },
  
  // 시장 집중도 (경쟁)
  { from: 'n71', to: 'n47', coefficient: 0.40, source: 'RESEARCH', confidence: 'MEDIUM',
    rationale: '시장 집중도가 경쟁 강도에 영향', law: 'GRAVITY' },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 7. 복합 인과 관계
  // ═══════════════════════════════════════════════════════════════════════════
  
  // 충성도 → 수입 (재등록)
  { from: 'n33', to: 'n05', coefficient: 0.40, source: 'RESEARCH', confidence: 'MEDIUM',
    rationale: '충성 고객이 객단가 높고 재등록', law: 'CONSERVATION' },
  
  // 충성도 → 고객수 (이탈 방지)
  { from: 'n33', to: 'n09', coefficient: 0.50, source: 'RESEARCH', confidence: 'HIGH',
    rationale: '충성도 10% 하락 → 고객 5% 이탈', law: 'CONSERVATION' },
  
  // 수입흐름 → 충성도
  { from: 'n17', to: 'n33', coefficient: 0.20, source: 'EMPIRICAL', confidence: 'LOW',
    rationale: '성장하는 학원에 대한 신뢰 증가', law: 'FLOW' },
  
  // 고객수 → 지출 (변동비)
  { from: 'n09', to: 'n06', coefficient: 0.15, source: 'EMPIRICAL', confidence: 'MEDIUM',
    rationale: '학생 증가 시 변동비 소폭 증가', law: 'CONSERVATION' },
  
  // 지출 → CAC
  { from: 'n06', to: 'n57', coefficient: 0.30, source: 'ACCOUNTING', confidence: 'MEDIUM',
    rationale: '마케팅 지출 일부가 CAC에 반영', law: 'FRICTION' },
  
  // 강사 근속 → 수입
  { from: 'n34', to: 'n05', coefficient: 0.10, source: 'EMPIRICAL', confidence: 'LOW',
    rationale: '안정적 강사진이 소폭 매출 상승 기여', law: 'CONSERVATION' },
  
  // 수입가속 → 고객수
  { from: 'n41', to: 'n09', coefficient: 0.20, source: 'ESTIMATED', confidence: 'LOW',
    rationale: '성장 가속 중인 학원에 학생 유입', law: 'ACCELERATION' },
  
  // 경쟁자수 → 경쟁강도
  { from: 'n11', to: 'n47', coefficient: 0.50, source: 'EMPIRICAL', confidence: 'MEDIUM',
    rationale: '경쟁자 증가 시 경쟁 강도 상승', law: 'CONSERVATION' },
  
  // 협력자 → 경쟁강도 감소
  { from: 'n12', to: 'n47', coefficient: -0.15, source: 'EMPIRICAL', confidence: 'LOW',
    rationale: '협력 학원이 많을수록 경쟁 완화', law: 'GRAVITY' },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 8. 추가 인과 관계 (72×72 확장)
  // ═══════════════════════════════════════════════════════════════════════════
  
  // --- 미수금 관계 ---
  { from: 'n02', to: 'n01', coefficient: -0.10, source: 'ACCOUNTING', confidence: 'HIGH',
    rationale: '미수금 증가 → 현금 감소', law: 'CONSERVATION' },
  { from: 'n02', to: 'n14', coefficient: 1.00, source: 'ACCOUNTING', confidence: 'HIGH',
    rationale: '미수금이 회수율 계산 기준', law: 'FLOW' },
  { from: 'n26', to: 'n02', coefficient: 0.80, source: 'EMPIRICAL', confidence: 'MEDIUM',
    rationale: '미수금 고착도 → 미수금 유지', law: 'INERTIA' },
  { from: 'n38', to: 'n02', coefficient: 0.30, source: 'PHYSICS', confidence: 'LOW',
    rationale: '채권 가속 → 미수금 변화', law: 'ACCELERATION' },
  
  // --- 부채 관계 ---
  { from: 'n03', to: 'n01', coefficient: -0.15, source: 'ACCOUNTING', confidence: 'HIGH',
    rationale: '부채 증가 → 현금 압박', law: 'CONSERVATION' },
  { from: 'n03', to: 'n15', coefficient: 1.00, source: 'ACCOUNTING', confidence: 'HIGH',
    rationale: '부채가 상환율 계산 기준', law: 'FLOW' },
  { from: 'n27', to: 'n03', coefficient: 0.90, source: 'EMPIRICAL', confidence: 'MEDIUM',
    rationale: '부채 고착도 → 부채 유지', law: 'INERTIA' },
  { from: 'n51', to: 'n06', coefficient: 0.05, source: 'ACCOUNTING', confidence: 'HIGH',
    rationale: '이자 비용 → 지출 증가', law: 'FRICTION' },
  
  // --- 자본 관계 ---
  { from: 'n04', to: 'n16', coefficient: 1.00, source: 'ACCOUNTING', confidence: 'HIGH',
    rationale: '자본이 증감률 계산 기준', law: 'FLOW' },
  { from: 'n28', to: 'n04', coefficient: 0.85, source: 'EMPIRICAL', confidence: 'MEDIUM',
    rationale: '자본 안정성 → 자본 유지', law: 'INERTIA' },
  { from: 'n40', to: 'n04', coefficient: 0.40, source: 'PHYSICS', confidence: 'MEDIUM',
    rationale: '자본 가속 → 자본 변화', law: 'ACCELERATION' },
  { from: 'n64', to: 'n04', coefficient: -0.10, source: 'EMPIRICAL', confidence: 'LOW',
    rationale: '자본 집중도 높으면 위험', law: 'GRAVITY' },
  
  // --- 투자/회수 관계 ---
  { from: 'n07', to: 'n19', coefficient: 1.00, source: 'ACCOUNTING', confidence: 'HIGH',
    rationale: '투자가 흐름 계산 기준', law: 'FLOW' },
  { from: 'n08', to: 'n20', coefficient: 1.00, source: 'ACCOUNTING', confidence: 'HIGH',
    rationale: '회수가 흐름 계산 기준', law: 'FLOW' },
  { from: 'n31', to: 'n07', coefficient: 0.80, source: 'EMPIRICAL', confidence: 'LOW',
    rationale: '투자 지속성 → 투자 유지', law: 'INERTIA' },
  { from: 'n32', to: 'n08', coefficient: 0.75, source: 'EMPIRICAL', confidence: 'LOW',
    rationale: '회수 안정성 → 회수 유지', law: 'INERTIA' },
  { from: 'n55', to: 'n08', coefficient: -0.10, source: 'ACCOUNTING', confidence: 'MEDIUM',
    rationale: '투자 수수료 → 순회수 감소', law: 'FRICTION' },
  { from: 'n56', to: 'n08', coefficient: -0.15, source: 'ACCOUNTING', confidence: 'HIGH',
    rationale: '회수 세금 → 순회수 감소', law: 'FRICTION' },
  
  // --- 공급자(강사) 관계 확장 ---
  { from: 'n10', to: 'n22', coefficient: 1.00, source: 'ACCOUNTING', confidence: 'HIGH',
    rationale: '강사 수가 변동률 계산 기준', law: 'FLOW' },
  { from: 'n10', to: 'n06', coefficient: 0.35, source: 'BENCHMARK', confidence: 'HIGH',
    rationale: '강사 수 → 인건비', law: 'CONSERVATION' },
  { from: 'n22', to: 'n46', coefficient: 0.70, source: 'PHYSICS', confidence: 'MEDIUM',
    rationale: '강사 변동률 → 변동 가속', law: 'FLOW' },
  { from: 'n46', to: 'n34', coefficient: -0.25, source: 'EMPIRICAL', confidence: 'MEDIUM',
    rationale: '변동 가속 → 근속률 감소', law: 'ACCELERATION' },
  
  // --- 경쟁자 관계 확장 ---
  { from: 'n11', to: 'n23', coefficient: 0.80, source: 'EMPIRICAL', confidence: 'MEDIUM',
    rationale: '경쟁자 수 → 점유율 변화', law: 'FLOW' },
  { from: 'n23', to: 'n21', coefficient: -0.20, source: 'RESEARCH', confidence: 'MEDIUM',
    rationale: '점유율 감소 → 신규 유입 감소', law: 'FLOW' },
  { from: 'n35', to: 'n11', coefficient: 0.90, source: 'EMPIRICAL', confidence: 'MEDIUM',
    rationale: '경쟁 고착도 → 경쟁자 수 유지', law: 'INERTIA' },
  { from: 'n47', to: 'n59', coefficient: 0.50, source: 'EMPIRICAL', confidence: 'MEDIUM',
    rationale: '경쟁 강도 → 경쟁 비용 증가', law: 'FRICTION' },
  
  // --- 협력자 관계 확장 ---
  { from: 'n12', to: 'n24', coefficient: 1.00, source: 'ACCOUNTING', confidence: 'HIGH',
    rationale: '협력자 수가 협력 강도 기준', law: 'FLOW' },
  { from: 'n24', to: 'n05', coefficient: 0.15, source: 'EMPIRICAL', confidence: 'LOW',
    rationale: '협력 강화 → 수입 증가', law: 'FLOW' },
  { from: 'n36', to: 'n12', coefficient: 0.85, source: 'EMPIRICAL', confidence: 'MEDIUM',
    rationale: '협력 지속성 → 협력자 유지', law: 'INERTIA' },
  { from: 'n48', to: 'n24', coefficient: 0.60, source: 'PHYSICS', confidence: 'LOW',
    rationale: '협력 가속 → 협력 강도 변화', law: 'ACCELERATION' },
  { from: 'n60', to: 'n08', coefficient: -0.05, source: 'ACCOUNTING', confidence: 'LOW',
    rationale: '협력 비용 → 순회수 감소', law: 'FRICTION' },
  { from: 'n72', to: 'n12', coefficient: 0.30, source: 'EMPIRICAL', confidence: 'LOW',
    rationale: '협력 집중도 → 핵심 협력 의존', law: 'GRAVITY' },
  
  // --- 흐름 → 관성 연결 ---
  { from: 'n13', to: 'n25', coefficient: 0.70, source: 'PHYSICS', confidence: 'MEDIUM',
    rationale: '현금 흐름이 안정적이면 관성 증가', law: 'FLOW' },
  { from: 'n17', to: 'n29', coefficient: 0.75, source: 'PHYSICS', confidence: 'MEDIUM',
    rationale: '수입 성장이 안정적이면 관성 증가', law: 'FLOW' },
  { from: 'n18', to: 'n30', coefficient: 0.80, source: 'PHYSICS', confidence: 'MEDIUM',
    rationale: '지출 패턴이 안정적이면 관성 증가', law: 'FLOW' },
  
  // --- 관성 → 가속 연결 ---
  { from: 'n25', to: 'n37', coefficient: -0.30, source: 'PHYSICS', confidence: 'MEDIUM',
    rationale: '관성이 높으면 가속 어려움', law: 'INERTIA' },
  { from: 'n29', to: 'n41', coefficient: -0.25, source: 'PHYSICS', confidence: 'MEDIUM',
    rationale: '수입 관성이 높으면 성장 가속 어려움', law: 'INERTIA' },
  { from: 'n30', to: 'n42', coefficient: -0.35, source: 'PHYSICS', confidence: 'MEDIUM',
    rationale: '고정비 관성이 높으면 비용 조정 어려움', law: 'INERTIA' },
  { from: 'n33', to: 'n45', coefficient: 0.35, source: 'RESEARCH', confidence: 'MEDIUM',
    rationale: '충성도가 높으면 성장 가속 용이', law: 'INERTIA' },
  
  // --- 가속 → 흐름 피드백 ---
  { from: 'n37', to: 'n13', coefficient: 0.40, source: 'PHYSICS', confidence: 'MEDIUM',
    rationale: '현금 가속 → 현금 흐름 변화', law: 'ACCELERATION' },
  { from: 'n42', to: 'n18', coefficient: 0.50, source: 'PHYSICS', confidence: 'MEDIUM',
    rationale: '지출 가속 → 지출 흐름 변화', law: 'ACCELERATION' },
  { from: 'n43', to: 'n19', coefficient: 0.45, source: 'PHYSICS', confidence: 'LOW',
    rationale: '투자 가속 → 투자 흐름 변화', law: 'ACCELERATION' },
  { from: 'n44', to: 'n20', coefficient: 0.45, source: 'PHYSICS', confidence: 'LOW',
    rationale: '회수 가속 → 회수 흐름 변화', law: 'ACCELERATION' },
  
  // --- 마찰 관계 확장 ---
  { from: 'n50', to: 'n02', coefficient: 0.20, source: 'ACCOUNTING', confidence: 'MEDIUM',
    rationale: '채권 회수 비용 → 미수금 증가', law: 'FRICTION' },
  { from: 'n52', to: 'n04', coefficient: -0.08, source: 'ACCOUNTING', confidence: 'MEDIUM',
    rationale: '자본 조달 비용 → 자본 감소', law: 'FRICTION' },
  { from: 'n54', to: 'n06', coefficient: 0.05, source: 'EMPIRICAL', confidence: 'LOW',
    rationale: '지출 낭비율 → 총 지출 증가', law: 'FRICTION' },
  { from: 'n53', to: 'n05', coefficient: -0.30, source: 'ACCOUNTING', confidence: 'HIGH',
    rationale: '원가율 → 순수입 감소', law: 'FRICTION' },
  
  // --- 중력 관계 확장 ---
  { from: 'n61', to: 'n01', coefficient: -0.05, source: 'EMPIRICAL', confidence: 'LOW',
    rationale: '현금 집중도 높으면 유동성 위험', law: 'GRAVITY' },
  { from: 'n62', to: 'n02', coefficient: 0.20, source: 'EMPIRICAL', confidence: 'MEDIUM',
    rationale: '채권 집중도 → 미수금 위험', law: 'GRAVITY' },
  { from: 'n63', to: 'n03', coefficient: 0.15, source: 'EMPIRICAL', confidence: 'MEDIUM',
    rationale: '부채 집중도 → 상환 압박', law: 'GRAVITY' },
  { from: 'n66', to: 'n06', coefficient: -0.10, source: 'EMPIRICAL', confidence: 'LOW',
    rationale: '지출 집중도 높으면 비용 최적화 여지', law: 'GRAVITY' },
  { from: 'n67', to: 'n07', coefficient: 0.25, source: 'EMPIRICAL', confidence: 'LOW',
    rationale: '투자 집중도 → 투자 패턴 유지', law: 'GRAVITY' },
  { from: 'n68', to: 'n08', coefficient: 0.20, source: 'EMPIRICAL', confidence: 'LOW',
    rationale: '회수 집중도 → 회수 패턴 유지', law: 'GRAVITY' },
  { from: 'n71', to: 'n23', coefficient: -0.25, source: 'RESEARCH', confidence: 'MEDIUM',
    rationale: '시장 집중도 → 점유율 변화 제한', law: 'GRAVITY' },
  
  // --- 자기 유지 (Diagonal) ---
  { from: 'n01', to: 'n01', coefficient: 0.95, source: 'ACCOUNTING', confidence: 'HIGH',
    rationale: '현금 잔고 유지', law: 'INERTIA' },
  { from: 'n02', to: 'n02', coefficient: 0.90, source: 'ACCOUNTING', confidence: 'HIGH',
    rationale: '미수금 유지', law: 'INERTIA' },
  { from: 'n03', to: 'n03', coefficient: 0.95, source: 'ACCOUNTING', confidence: 'HIGH',
    rationale: '부채 유지', law: 'INERTIA' },
  { from: 'n04', to: 'n04', coefficient: 0.90, source: 'ACCOUNTING', confidence: 'HIGH',
    rationale: '자본 유지', law: 'INERTIA' },
  { from: 'n05', to: 'n05', coefficient: 0.70, source: 'BENCHMARK', confidence: 'MEDIUM',
    rationale: '수입 관성 (재등록 기반)', law: 'INERTIA' },
  { from: 'n06', to: 'n06', coefficient: 0.80, source: 'BENCHMARK', confidence: 'HIGH',
    rationale: '지출 관성 (고정비)', law: 'INERTIA' },
  { from: 'n09', to: 'n09', coefficient: 0.90, source: 'BENCHMARK', confidence: 'MEDIUM',
    rationale: '고객 유지 (월 이탈 10%)', law: 'INERTIA' },
  { from: 'n10', to: 'n10', coefficient: 0.92, source: 'BENCHMARK', confidence: 'MEDIUM',
    rationale: '강사 유지 (월 이탈 8%)', law: 'INERTIA' },
  { from: 'n11', to: 'n11', coefficient: 0.98, source: 'EMPIRICAL', confidence: 'HIGH',
    rationale: '경쟁자 수 유지', law: 'INERTIA' },
  { from: 'n12', to: 'n12', coefficient: 0.95, source: 'EMPIRICAL', confidence: 'MEDIUM',
    rationale: '협력자 수 유지', law: 'INERTIA' },
  
  // --- 핵심 피드백 루프 ---
  { from: 'n05', to: 'n33', coefficient: 0.15, source: 'EMPIRICAL', confidence: 'LOW',
    rationale: '수입 안정 → 서비스 품질 → 충성도', law: 'CONSERVATION' },
  { from: 'n09', to: 'n69', coefficient: 0.40, source: 'RESEARCH', confidence: 'MEDIUM',
    rationale: '고객 많을수록 추천 네트워크 효과', law: 'GRAVITY' },
  { from: 'n69', to: 'n09', coefficient: 0.25, source: 'RESEARCH', confidence: 'MEDIUM',
    rationale: '추천율 → 신규 고객 유입', law: 'GRAVITY' },
  { from: 'n21', to: 'n33', coefficient: -0.10, source: 'EMPIRICAL', confidence: 'LOW',
    rationale: '신규 급증 → 기존 고객 관심 분산', law: 'FLOW' },
  { from: 'n10', to: 'n33', coefficient: 0.15, source: 'EMPIRICAL', confidence: 'LOW',
    rationale: '강사 수 충분 → 서비스 품질 → 충성도', law: 'CONSERVATION' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 행렬 유틸리티
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 희소 연결을 72×72 밀집 행렬로 변환
 */
export function toDenseMatrix(): number[][] {
  const matrix: number[][] = Array(72).fill(null).map(() => Array(72).fill(0));
  
  for (const link of CAUSAL_LINKS) {
    const fromIdx = parseInt(link.from.slice(1)) - 1;
    const toIdx = parseInt(link.to.slice(1)) - 1;
    matrix[fromIdx][toIdx] = link.coefficient;
  }
  
  return matrix;
}

/**
 * 특정 노드의 원인 노드들 조회
 */
export function getCauses(nodeId: string): CausalLink[] {
  return CAUSAL_LINKS.filter(link => link.to === nodeId);
}

/**
 * 특정 노드의 결과 노드들 조회
 */
export function getEffects(nodeId: string): CausalLink[] {
  return CAUSAL_LINKS.filter(link => link.from === nodeId);
}

/**
 * 법칙별 연결 조회
 */
export function getLinksByLaw(law: string): CausalLink[] {
  return CAUSAL_LINKS.filter(link => link.law === law);
}

/**
 * 신뢰도별 연결 조회
 */
export function getLinksByConfidence(confidence: ConfidenceLevel): CausalLink[] {
  return CAUSAL_LINKS.filter(link => link.confidence === confidence);
}

/**
 * 연결 통계
 */
export function getStatistics() {
  const total = CAUSAL_LINKS.length;
  const byLaw: Record<string, number> = {};
  const byConfidence: Record<string, number> = {};
  const bySource: Record<string, number> = {};
  
  for (const link of CAUSAL_LINKS) {
    byLaw[link.law] = (byLaw[link.law] || 0) + 1;
    byConfidence[link.confidence] = (byConfidence[link.confidence] || 0) + 1;
    bySource[link.source] = (bySource[link.source] || 0) + 1;
  }
  
  return {
    total,
    maxPossible: 72 * 72,
    sparsity: 1 - total / (72 * 72),
    byLaw,
    byConfidence,
    bySource,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 72×72 행렬 클래스
// ═══════════════════════════════════════════════════════════════════════════════

export class CausalMatrix72 {
  private links: Map<string, CausalLink>;
  private matrix: number[][] | null = null;
  
  constructor() {
    this.links = new Map();
    for (const link of CAUSAL_LINKS) {
      const key = `${link.from}->${link.to}`;
      this.links.set(key, link);
    }
  }
  
  /**
   * 계수 조회
   */
  get(from: string, to: string): number {
    const key = `${from}->${to}`;
    const link = this.links.get(key);
    return link?.coefficient ?? 0;
  }
  
  /**
   * 연결 정보 조회
   */
  getLink(from: string, to: string): CausalLink | undefined {
    const key = `${from}->${to}`;
    return this.links.get(key);
  }
  
  /**
   * 계수 업데이트 (학습)
   */
  update(from: string, to: string, newCoefficient: number): void {
    const key = `${from}->${to}`;
    const link = this.links.get(key);
    if (link) {
      link.coefficient = Math.max(-1, Math.min(1, newCoefficient));
    }
    this.matrix = null; // 캐시 무효화
  }
  
  /**
   * 밀집 행렬 반환
   */
  toMatrix(): number[][] {
    if (!this.matrix) {
      this.matrix = toDenseMatrix();
    }
    return this.matrix;
  }
  
  /**
   * 상태 전이: X(t+1) = A × X(t)
   */
  transition(state: number[]): number[] {
    const A = this.toMatrix();
    const nextState = new Array(72).fill(0);
    
    for (let i = 0; i < 72; i++) {
      for (let j = 0; j < 72; j++) {
        nextState[i] += A[j][i] * state[j];
      }
      // 관성 적용 (자기 자신 유지)
      nextState[i] = nextState[i] * 0.3 + state[i] * 0.7;
    }
    
    return nextState;
  }
  
  /**
   * 영향도 분석: 특정 노드 변화 시 다른 노드들의 영향
   */
  analyzeImpact(nodeId: string, delta: number): Record<string, number> {
    const effects = getEffects(nodeId);
    const impact: Record<string, number> = {};
    
    for (const effect of effects) {
      impact[effect.to] = delta * effect.coefficient;
    }
    
    return impact;
  }
  
  /**
   * 경로 탐색: A → ... → B 간접 경로
   */
  findPaths(from: string, to: string, maxDepth: number = 3): string[][] {
    const paths: string[][] = [];
    
    const dfs = (current: string, path: string[], depth: number) => {
      if (depth > maxDepth) return;
      if (current === to && path.length > 1) {
        paths.push([...path]);
        return;
      }
      
      const effects = getEffects(current);
      for (const effect of effects) {
        if (!path.includes(effect.to)) {
          path.push(effect.to);
          dfs(effect.to, path, depth + 1);
          path.pop();
        }
      }
    };
    
    dfs(from, [from], 0);
    return paths;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Export
// ═══════════════════════════════════════════════════════════════════════════════

export const causalMatrix72 = new CausalMatrix72();

// 통계 출력
const stats = getStatistics();
console.log('📊 72×72 Causal Matrix Loaded');
console.log(`  - Total Links: ${stats.total} / ${stats.maxPossible} (${(stats.sparsity * 100).toFixed(1)}% sparse)`);
console.log(`  - By Law: ${JSON.stringify(stats.byLaw)}`);
console.log(`  - By Confidence: ${JSON.stringify(stats.byConfidence)}`);
