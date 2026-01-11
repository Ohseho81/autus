/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS 72 노드 계산기
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * 실제 데이터에서 72개 노드 값을 계산하는 엔진
 * Math.random() 대신 실제 계산식 적용
 * 
 * 입력: 원시 비즈니스 데이터 (RawData)
 * 출력: 72개 노드 값 (0~1 정규화)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { ALL_72_NODES, Node72 } from './Physics72Definition';

// ═══════════════════════════════════════════════════════════════════════════════
// 입력 데이터 타입
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 원시 비즈니스 데이터 (학원 기준)
 * - 실제로는 DB에서 조회
 * - 여기서는 타입 정의만
 */
export interface RawBusinessData {
  // 기간 정보
  period: {
    type: 'daily' | 'weekly' | 'monthly';
    startDate: string;  // ISO date
    endDate: string;
  };
  
  // 현금/은행
  cash: {
    opening: number;      // 기초 잔액
    closing: number;      // 기말 잔액
    totalIn: number;      // 총 입금
    totalOut: number;     // 총 출금
    transferFee: number;  // 송금 수수료
  };
  
  // 채권 (받을 돈)
  receivable: {
    opening: number;
    newAmount: number;    // 신규 발생
    collected: number;    // 회수
    overdue: number;      // 연체
    collectionCost: number; // 추심 비용
  };
  
  // 부채 (줄 돈)
  payable: {
    opening: number;
    newAmount: number;
    paid: number;
    interest: number;     // 이자
    longTerm: number;     // 장기부채
  };
  
  // 수입/매출
  income: {
    total: number;
    recurring: number;    // 반복 수입 (재등록)
    newCustomer: number;  // 신규 고객 수입
    costOfRevenue: number; // 매출 원가
    previousPeriod: number; // 전기 수입
  };
  
  // 지출/비용
  expense: {
    total: number;
    fixed: number;        // 고정비
    variable: number;     // 변동비
    waste: number;        // 낭비
    previousPeriod: number;
  };
  
  // 투자
  investment: {
    total: number;
    continuous: number;   // 지속 투자
    fee: number;          // 수수료
    previousPeriod: number;
  };
  
  // 회수
  return: {
    total: number;
    grossReturn: number;
    tax: number;          // 세금
    previousPeriod: number;
  };
  
  // 고객
  customer: {
    opening: number;      // 기초 고객 수
    new: number;          // 신규
    lost: number;         // 이탈
    repeat: number;       // 재구매 고객
    referral: number;     // 추천 고객
    acquisitionCost: number; // 획득 비용 (광고비 등)
  };
  
  // 공급자
  supplier: {
    opening: number;
    new: number;
    lost: number;
    longTerm: number;     // 장기 거래
    totalPurchase: number;
    topSupplierShare: number; // 최대 공급자 비중
    transactionCost: number;
  };
  
  // 경쟁자
  competitor: {
    total: number;        // 경쟁자 수
    new: number;
    exit: number;
    myMarketShare: number;  // 내 점유율 (0~1)
    top3Share: number;      // 상위 3개 점유율
    competitiveSpend: number; // 경쟁 대응 비용
    stable: number;         // 안정적 경쟁자 수
  };
  
  // 협력자
  partner: {
    opening: number;
    new: number;
    lost: number;
    longTerm: number;
    jointRevenue: number;   // 공동 매출
    topPartnerShare: number; // 최대 파트너 비중
    partnershipCost: number;
  };
  
  // 과거 데이터 (관성/가속 계산용)
  history?: {
    cash: number[];        // 과거 N개월 현금
    equity: number[];      // 과거 N개월 자본
    income: number[];      // 과거 N개월 수입
    customer: number[];    // 과거 N개월 고객수
    return: number[];      // 과거 N개월 회수
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 72 노드 스냅샷 타입
// ═══════════════════════════════════════════════════════════════════════════════

export interface NodeSnapshot {
  entityType: 'academy' | 'teacher' | 'student';
  entityId: string;
  periodType: 'daily' | 'weekly' | 'monthly';
  periodDate: string;
  values: Record<string, number>;  // n01_cash_balance: 0.5
  rawValues: Record<string, number>; // 정규화 전 원래 값
}

// ═══════════════════════════════════════════════════════════════════════════════
// NodeCalculator 클래스
// ═══════════════════════════════════════════════════════════════════════════════

export class NodeCalculator {
  
  /**
   * 72개 노드 값 계산 (메인 함수)
   */
  calculate(data: RawBusinessData): NodeSnapshot {
    const values: Record<string, number> = {};
    const rawValues: Record<string, number> = {};
    
    // Conservation (01-12)
    this.calculateConservation(data, values, rawValues);
    
    // Flow (13-24)
    this.calculateFlow(data, values, rawValues);
    
    // Inertia (25-36)
    this.calculateInertia(data, values, rawValues);
    
    // Acceleration (37-48)
    this.calculateAcceleration(data, values, rawValues);
    
    // Friction (49-60)
    this.calculateFriction(data, values, rawValues);
    
    // Gravity (61-72)
    this.calculateGravity(data, values, rawValues);
    
    return {
      entityType: 'academy',
      entityId: '',
      periodType: data.period.type,
      periodDate: data.period.endDate,
      values,
      rawValues,
    };
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // Conservation (보존) - 01~12
  // Δ = In - Out
  // ═══════════════════════════════════════════════════════════════════════════
  
  private calculateConservation(
    data: RawBusinessData, 
    values: Record<string, number>,
    rawValues: Record<string, number>
  ): void {
    // N01: cash_balance = cash_in - cash_out
    const n01 = data.cash.totalIn - data.cash.totalOut;
    rawValues['n01_cash_balance'] = n01;
    values['n01_cash_balance'] = this.normalize(n01, -10000000, 10000000);
    
    // N02: receivable_balance = new_receivable - collected
    const n02 = data.receivable.newAmount - data.receivable.collected;
    rawValues['n02_receivable_balance'] = n02;
    values['n02_receivable_balance'] = this.normalize(n02, -5000000, 5000000);
    
    // N03: payable_balance = new_payable - paid
    const n03 = data.payable.newAmount - data.payable.paid;
    rawValues['n03_payable_balance'] = n03;
    values['n03_payable_balance'] = this.normalize(n03, -5000000, 5000000);
    
    // N04: equity_balance = (n01) - (n03)
    const n04 = n01 - n03;
    rawValues['n04_equity_balance'] = n04;
    values['n04_equity_balance'] = this.normalize(n04, -10000000, 10000000);
    
    // N05: income_total = sum(all_income)
    const n05 = data.income.total;
    rawValues['n05_income_total'] = n05;
    values['n05_income_total'] = this.normalize(n05, 0, 50000000);
    
    // N06: expense_total = sum(all_expense)
    const n06 = data.expense.total;
    rawValues['n06_expense_total'] = n06;
    values['n06_expense_total'] = this.normalize(n06, 0, 50000000);
    
    // N07: investment_total = sum(all_investment)
    const n07 = data.investment.total;
    rawValues['n07_investment_total'] = n07;
    values['n07_investment_total'] = this.normalize(n07, 0, 20000000);
    
    // N08: return_total = sum(all_return)
    const n08 = data.return.total;
    rawValues['n08_return_total'] = n08;
    values['n08_return_total'] = this.normalize(n08, 0, 20000000);
    
    // N09: customer_count = new_customer - lost_customer
    const n09 = data.customer.new - data.customer.lost;
    rawValues['n09_customer_count'] = n09;
    values['n09_customer_count'] = this.normalize(n09, -50, 50);
    
    // N10: supplier_count = new_supplier - lost_supplier
    const n10 = data.supplier.new - data.supplier.lost;
    rawValues['n10_supplier_count'] = n10;
    values['n10_supplier_count'] = this.normalize(n10, -10, 10);
    
    // N11: competitor_count = new_competitor - exit_competitor
    const n11 = data.competitor.new - data.competitor.exit;
    rawValues['n11_competitor_count'] = n11;
    values['n11_competitor_count'] = this.normalize(n11, -10, 10);
    
    // N12: partner_count = new_partner - lost_partner
    const n12 = data.partner.new - data.partner.lost;
    rawValues['n12_partner_count'] = n12;
    values['n12_partner_count'] = this.normalize(n12, -5, 5);
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // Flow (흐름) - 13~24
  // Direction × Amount (비율)
  // ═══════════════════════════════════════════════════════════════════════════
  
  private calculateFlow(
    data: RawBusinessData, 
    values: Record<string, number>,
    rawValues: Record<string, number>
  ): void {
    // N13: cash_flow = cash_in / cash_out
    const n13 = this.safeDiv(data.cash.totalIn, data.cash.totalOut);
    rawValues['n13_cash_flow'] = n13;
    values['n13_cash_flow'] = this.normalize(n13, 0, 3);
    
    // N14: receivable_flow = collected / total_receivable
    const totalReceivable = data.receivable.opening + data.receivable.newAmount;
    const n14 = this.safeDiv(data.receivable.collected, totalReceivable);
    rawValues['n14_receivable_flow'] = n14;
    values['n14_receivable_flow'] = n14; // 이미 0~1
    
    // N15: payable_flow = paid / total_payable
    const totalPayable = data.payable.opening + data.payable.newAmount;
    const n15 = this.safeDiv(data.payable.paid, totalPayable);
    rawValues['n15_payable_flow'] = n15;
    values['n15_payable_flow'] = n15;
    
    // N16: equity_flow = Δequity / equity
    const equityChange = (data.cash.closing - data.payable.opening - data.payable.newAmount + data.payable.paid) 
                       - (data.cash.opening - data.payable.opening);
    const n16 = this.safeDiv(equityChange, data.cash.opening - data.payable.opening);
    rawValues['n16_equity_flow'] = n16;
    values['n16_equity_flow'] = this.normalize(n16, -1, 1);
    
    // N17: income_flow = income_this / income_last
    const n17 = this.safeDiv(data.income.total, data.income.previousPeriod || data.income.total);
    rawValues['n17_income_flow'] = n17;
    values['n17_income_flow'] = this.normalize(n17, 0, 3);
    
    // N18: expense_flow = expense_this / expense_last
    const n18 = this.safeDiv(data.expense.total, data.expense.previousPeriod || data.expense.total);
    rawValues['n18_expense_flow'] = n18;
    values['n18_expense_flow'] = this.normalize(n18, 0, 3);
    
    // N19: investment_flow = investment_this / investment_last
    const n19 = this.safeDiv(data.investment.total, data.investment.previousPeriod || 1);
    rawValues['n19_investment_flow'] = n19;
    values['n19_investment_flow'] = this.normalize(n19, 0, 5);
    
    // N20: return_flow = return_this / return_last
    const n20 = this.safeDiv(data.return.total, data.return.previousPeriod || 1);
    rawValues['n20_return_flow'] = n20;
    values['n20_return_flow'] = this.normalize(n20, 0, 5);
    
    // N21: customer_flow = new_customer / total_customer
    const totalCustomer = data.customer.opening + data.customer.new - data.customer.lost;
    const n21 = this.safeDiv(data.customer.new, totalCustomer);
    rawValues['n21_customer_flow'] = n21;
    values['n21_customer_flow'] = n21;
    
    // N22: supplier_flow = Δsupplier / total_supplier
    const n22 = this.safeDiv(data.supplier.new - data.supplier.lost, data.supplier.opening);
    rawValues['n22_supplier_flow'] = n22;
    values['n22_supplier_flow'] = this.normalize(n22, -1, 1);
    
    // N23: competitor_flow = my_share / total_market
    const n23 = data.competitor.myMarketShare;
    rawValues['n23_competitor_flow'] = n23;
    values['n23_competitor_flow'] = n23;
    
    // N24: partner_flow = joint_revenue / total_revenue
    const n24 = this.safeDiv(data.partner.jointRevenue, data.income.total);
    rawValues['n24_partner_flow'] = n24;
    values['n24_partner_flow'] = n24;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // Inertia (관성) - 25~36
  // Avg(past N periods) - 유지력/안정성
  // ═══════════════════════════════════════════════════════════════════════════
  
  private calculateInertia(
    data: RawBusinessData, 
    values: Record<string, number>,
    rawValues: Record<string, number>
  ): void {
    const history = data.history || { cash: [], equity: [], income: [], customer: [], return: [] };
    
    // N25: cash_inertia = avg(cash, 3month) / cash
    const avgCash = this.average(history.cash.slice(-3)) || data.cash.closing;
    const n25 = this.safeDiv(avgCash, data.cash.closing);
    rawValues['n25_cash_inertia'] = n25;
    values['n25_cash_inertia'] = this.normalize(n25, 0, 2);
    
    // N26: receivable_inertia = overdue_receivable / total
    const totalRec = data.receivable.opening + data.receivable.newAmount;
    const n26 = this.safeDiv(data.receivable.overdue, totalRec);
    rawValues['n26_receivable_inertia'] = n26;
    values['n26_receivable_inertia'] = n26;
    
    // N27: payable_inertia = long_term_debt / total_debt
    const totalDebt = data.payable.opening + data.payable.newAmount - data.payable.paid;
    const n27 = this.safeDiv(data.payable.longTerm, totalDebt);
    rawValues['n27_payable_inertia'] = n27;
    values['n27_payable_inertia'] = n27;
    
    // N28: equity_inertia = std(equity, 12month) - 낮을수록 안정
    const equityStd = this.standardDeviation(history.equity) || 0;
    const n28 = equityStd;
    rawValues['n28_equity_inertia'] = n28;
    values['n28_equity_inertia'] = this.normalize(n28, 0, 5000000);
    
    // N29: income_inertia = recurring_income / total_income
    const n29 = this.safeDiv(data.income.recurring, data.income.total);
    rawValues['n29_income_inertia'] = n29;
    values['n29_income_inertia'] = n29;
    
    // N30: expense_inertia = fixed_expense / total_expense
    const n30 = this.safeDiv(data.expense.fixed, data.expense.total);
    rawValues['n30_expense_inertia'] = n30;
    values['n30_expense_inertia'] = n30;
    
    // N31: investment_inertia = continuous_investment / total
    const n31 = this.safeDiv(data.investment.continuous, data.investment.total);
    rawValues['n31_investment_inertia'] = n31;
    values['n31_investment_inertia'] = n31;
    
    // N32: return_inertia = avg(return, 6month) / return
    const avgReturn = this.average(history.return.slice(-6)) || data.return.total;
    const n32 = this.safeDiv(avgReturn, data.return.total || 1);
    rawValues['n32_return_inertia'] = n32;
    values['n32_return_inertia'] = this.normalize(n32, 0, 2);
    
    // N33: customer_inertia = repeat_customer / total_customer
    const n33 = this.safeDiv(data.customer.repeat, data.customer.opening + data.customer.new - data.customer.lost);
    rawValues['n33_customer_inertia'] = n33;
    values['n33_customer_inertia'] = n33;
    
    // N34: supplier_inertia = long_term_supplier / total
    const n34 = this.safeDiv(data.supplier.longTerm, data.supplier.opening);
    rawValues['n34_supplier_inertia'] = n34;
    values['n34_supplier_inertia'] = n34;
    
    // N35: competitor_inertia = stable_competitor / total
    const n35 = this.safeDiv(data.competitor.stable, data.competitor.total);
    rawValues['n35_competitor_inertia'] = n35;
    values['n35_competitor_inertia'] = n35;
    
    // N36: partner_inertia = long_term_partner / total
    const n36 = this.safeDiv(data.partner.longTerm, data.partner.opening + data.partner.new - data.partner.lost);
    rawValues['n36_partner_inertia'] = n36;
    values['n36_partner_inertia'] = n36;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // Acceleration (가속) - 37~48
  // Δ(t) - Δ(t-1) - 변화의 속도
  // ═══════════════════════════════════════════════════════════════════════════
  
  private calculateAcceleration(
    data: RawBusinessData, 
    values: Record<string, number>,
    rawValues: Record<string, number>
  ): void {
    const history = data.history || { cash: [], equity: [], income: [], customer: [], return: [] };
    
    // 현재 변화와 이전 변화 계산 헬퍼
    const calcAccel = (current: number, prev: number, prevPrev: number): number => {
      const deltaCurrent = current - prev;
      const deltaPrev = prev - prevPrev;
      return deltaCurrent - deltaPrev;
    };
    
    // N37: cash_accel = Δcash(t) - Δcash(t-1)
    const cashHistory = history.cash.length >= 3 ? history.cash : [data.cash.opening, data.cash.opening, data.cash.closing];
    const n37 = calcAccel(cashHistory[cashHistory.length - 1], cashHistory[cashHistory.length - 2] || cashHistory[0], cashHistory[cashHistory.length - 3] || cashHistory[0]);
    rawValues['n37_cash_accel'] = n37;
    values['n37_cash_accel'] = this.normalize(n37, -5000000, 5000000);
    
    // N38-N48: 같은 패턴으로 계산 (간략화)
    // 실제 구현에서는 각 항목별로 상세 계산
    
    // N41: income_accel = growth(t) - growth(t-1)
    const incomeHistory = history.income.length >= 3 ? history.income : [data.income.previousPeriod, data.income.previousPeriod, data.income.total];
    const growthCurrent = this.safeDiv(incomeHistory[incomeHistory.length - 1], incomeHistory[incomeHistory.length - 2] || 1) - 1;
    const growthPrev = this.safeDiv(incomeHistory[incomeHistory.length - 2] || 1, incomeHistory[incomeHistory.length - 3] || 1) - 1;
    const n41 = growthCurrent - growthPrev;
    rawValues['n41_income_accel'] = n41;
    values['n41_income_accel'] = this.normalize(n41, -0.5, 0.5);
    
    // N45: customer_accel = Δcustomer(t) - Δcustomer(t-1)
    const customerHistory = history.customer.length >= 3 ? history.customer : [data.customer.opening, data.customer.opening, data.customer.opening + data.customer.new - data.customer.lost];
    const n45 = calcAccel(customerHistory[customerHistory.length - 1], customerHistory[customerHistory.length - 2] || customerHistory[0], customerHistory[customerHistory.length - 3] || customerHistory[0]);
    rawValues['n45_customer_accel'] = n45;
    values['n45_customer_accel'] = this.normalize(n45, -20, 20);
    
    // 나머지 노드들 기본값 (실제 구현 시 계산)
    const defaultAccelNodes = ['n38', 'n39', 'n40', 'n42', 'n43', 'n44', 'n46', 'n47', 'n48'];
    defaultAccelNodes.forEach(node => {
      rawValues[`${node}_accel`] = 0;
      values[`${node}_accel`] = 0.5;
    });
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // Friction (마찰) - 49~60
  // Loss / Transfer - 손실률/비용률
  // ═══════════════════════════════════════════════════════════════════════════
  
  private calculateFriction(
    data: RawBusinessData, 
    values: Record<string, number>,
    rawValues: Record<string, number>
  ): void {
    // N49: cash_friction = transfer_fee / transfer_amount
    const n49 = this.safeDiv(data.cash.transferFee, data.cash.totalOut);
    rawValues['n49_cash_friction'] = n49;
    values['n49_cash_friction'] = this.normalize(n49, 0, 0.05);
    
    // N50: receivable_friction = collection_cost / collected
    const n50 = this.safeDiv(data.receivable.collectionCost, data.receivable.collected);
    rawValues['n50_receivable_friction'] = n50;
    values['n50_receivable_friction'] = this.normalize(n50, 0, 0.1);
    
    // N51: payable_friction = interest / principal
    const principal = data.payable.opening + data.payable.newAmount - data.payable.paid;
    const n51 = this.safeDiv(data.payable.interest, principal);
    rawValues['n51_payable_friction'] = n51;
    values['n51_payable_friction'] = this.normalize(n51, 0, 0.2);
    
    // N52: equity_friction (자본 조달 비용 - 학원은 보통 낮음)
    const n52 = 0;
    rawValues['n52_equity_friction'] = n52;
    values['n52_equity_friction'] = 0;
    
    // N53: income_friction = cost_of_revenue / revenue
    const n53 = this.safeDiv(data.income.costOfRevenue, data.income.total);
    rawValues['n53_income_friction'] = n53;
    values['n53_income_friction'] = n53;
    
    // N54: expense_friction = waste / total_expense
    const n54 = this.safeDiv(data.expense.waste, data.expense.total);
    rawValues['n54_expense_friction'] = n54;
    values['n54_expense_friction'] = n54;
    
    // N55: investment_friction = investment_fee / investment
    const n55 = this.safeDiv(data.investment.fee, data.investment.total);
    rawValues['n55_investment_friction'] = n55;
    values['n55_investment_friction'] = this.normalize(n55, 0, 0.1);
    
    // N56: return_friction = tax_on_return / gross_return
    const n56 = this.safeDiv(data.return.tax, data.return.grossReturn);
    rawValues['n56_return_friction'] = n56;
    values['n56_return_friction'] = n56;
    
    // N57: customer_friction = acquisition_cost / new_customer (CAC)
    const n57 = this.safeDiv(data.customer.acquisitionCost, data.customer.new);
    rawValues['n57_customer_friction'] = n57;
    values['n57_customer_friction'] = this.normalize(n57, 0, 1000000);
    
    // N58: supplier_friction = transaction_cost / purchase
    const n58 = this.safeDiv(data.supplier.transactionCost, data.supplier.totalPurchase);
    rawValues['n58_supplier_friction'] = n58;
    values['n58_supplier_friction'] = this.normalize(n58, 0, 0.1);
    
    // N59: competitor_friction = competitive_spend / revenue
    const n59 = this.safeDiv(data.competitor.competitiveSpend, data.income.total);
    rawValues['n59_competitor_friction'] = n59;
    values['n59_competitor_friction'] = this.normalize(n59, 0, 0.3);
    
    // N60: partner_friction = partnership_cost / joint_revenue
    const n60 = this.safeDiv(data.partner.partnershipCost, data.partner.jointRevenue);
    rawValues['n60_partner_friction'] = n60;
    values['n60_partner_friction'] = this.normalize(n60, 0, 0.5);
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // Gravity (인력) - 61~72
  // 집중도/의존도
  // ═══════════════════════════════════════════════════════════════════════════
  
  private calculateGravity(
    data: RawBusinessData, 
    values: Record<string, number>,
    rawValues: Record<string, number>
  ): void {
    // N61: cash_gravity = largest_account / total_cash (보통 1에 가까움)
    const n61 = 1;  // 대부분 단일 계좌
    rawValues['n61_cash_gravity'] = n61;
    values['n61_cash_gravity'] = n61;
    
    // N62-N68: 기본값 (실제 구현 시 계산)
    ['n62', 'n63', 'n64', 'n65', 'n66', 'n67', 'n68'].forEach(node => {
      rawValues[`${node}_gravity`] = 0.5;
      values[`${node}_gravity`] = 0.5;
    });
    
    // N69: customer_gravity = referral_customer / new_customer
    const n69 = this.safeDiv(data.customer.referral, data.customer.new);
    rawValues['n69_customer_gravity'] = n69;
    values['n69_customer_gravity'] = n69;
    
    // N70: supplier_gravity = top_supplier / total_purchase
    const n70 = data.supplier.topSupplierShare;
    rawValues['n70_supplier_gravity'] = n70;
    values['n70_supplier_gravity'] = n70;
    
    // N71: competitor_gravity = top3_competitor_share
    const n71 = data.competitor.top3Share;
    rawValues['n71_competitor_gravity'] = n71;
    values['n71_competitor_gravity'] = n71;
    
    // N72: partner_gravity = top_partner_revenue / joint_total
    const n72 = data.partner.topPartnerShare;
    rawValues['n72_partner_gravity'] = n72;
    values['n72_partner_gravity'] = n72;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 유틸리티 함수
  // ═══════════════════════════════════════════════════════════════════════════
  
  private safeDiv(a: number, b: number, fallback: number = 0): number {
    if (b === 0 || isNaN(b) || isNaN(a)) return fallback;
    return a / b;
  }
  
  private normalize(value: number, min: number, max: number): number {
    if (max === min) return 0.5;
    const normalized = (value - min) / (max - min);
    return Math.max(0, Math.min(1, normalized));
  }
  
  private average(arr: number[]): number {
    if (arr.length === 0) return 0;
    return arr.reduce((sum, v) => sum + v, 0) / arr.length;
  }
  
  private standardDeviation(arr: number[]): number {
    if (arr.length < 2) return 0;
    const avg = this.average(arr);
    const squareDiffs = arr.map(v => Math.pow(v - avg, 2));
    return Math.sqrt(this.average(squareDiffs));
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Singleton Export
// ═══════════════════════════════════════════════════════════════════════════════

export const nodeCalculator = new NodeCalculator();
export default NodeCalculator;

console.log('📊 NodeCalculator Loaded - 72 node calculation engine');
