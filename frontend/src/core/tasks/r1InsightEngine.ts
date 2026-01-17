// ═══════════════════════════════════════════════════════════════════════════════
// AUTUS v2.0 - R1 Insight Engine
// DeepSeek R1 / Alpamayo R1 스타일 추론 통찰 생성
// ═══════════════════════════════════════════════════════════════════════════════

import { TaskDNA, TaskPhysics, R1Insight, RiskZone, classifyRiskZone } from './taskDNA';
import { ScaleLevel } from '../physics';

// ═══════════════════════════════════════════════════════════════════════════════
// 통찰 템플릿 (The Physicist 사고 체계)
// ═══════════════════════════════════════════════════════════════════════════════

interface InsightTemplate {
  condition: (task: TaskDNA) => boolean;
  core: (task: TaskDNA) => string;
  risks: string[];
  opportunities: string[];
  causalChain: string[];
  failureImpact: (task: TaskDNA) => string;
}

const INSIGHT_TEMPLATES: InsightTemplate[] = [
  // 사건의 지평선 (ψ ≥ 9.0)
  {
    condition: (t) => t.physics.psi >= 9.0,
    core: (t) => `${t.name}은(는) 비가역적 결정의 임계점. 한번 실행되면 되돌릴 수 없는 궤도에 진입함. 중력 잠금 필수.`,
    risks: ['돌이킬 수 없는 손실', '파급 효과의 불확실성', '의사결정 압박'],
    opportunities: ['선점 우위 확보', '경쟁자 진입 장벽', '장기 가치 창출'],
    causalChain: ['결정 → 실행 → 고정 → 파급 → 불가역'],
    failureImpact: (t) => `${t.name} 실패 시 ${Math.round(t.physics.psi * 10)}개월 이상의 복구 기간 예상. 조직 신뢰도 심각한 훼손.`,
  },
  // 고중력 구역 (K ≥ 8.0)
  {
    condition: (t) => t.physics.mass >= 8.0,
    core: (t) => `${t.name}은(는) 조직의 중력 중심. 이 업무의 지연은 연결된 모든 업무의 궤도를 교란시킴.`,
    risks: ['병목 현상', '연쇄 지연', '자원 집중 요구'],
    opportunities: ['레버리지 효과', '통합 시너지', '전략적 우선순위'],
    causalChain: ['중력 증가 → 주변 업무 흡수 → 의존성 강화 → 리스크 집중'],
    failureImpact: (t) => `${t.name} 실패 시 최소 ${Math.round(t.physics.mass * 5)}개 연관 업무에 영향. 조직 전체 효율 ${Math.round(t.physics.mass * 3)}% 저하.`,
  },
  // 간섭 조밀 구역 (I ≥ 8.0)
  {
    condition: (t) => t.physics.interference >= 8.0,
    core: (t) => `${t.name}은(는) 에너지 전파의 핵심 매개체. 질량은 낮을 수 있으나 타 부서와의 간섭선이 매우 조밀함.`,
    risks: ['커뮤니케이션 오버헤드', '조정 비용', '다중 이해관계자'],
    opportunities: ['네트워크 효과', '정보 허브', '협업 촉진'],
    causalChain: ['연결 → 전파 → 증폭 → 조직 전체 영향'],
    failureImpact: (t) => `${t.name} 실패 시 ${Math.round(t.physics.interference * 3)}개 부서에 동시 충격. 조정 비용 급증.`,
  },
  // 고엔트로피 구역 (Ω ≥ 0.7)
  {
    condition: (t) => t.physics.omega >= 0.7,
    core: (t) => `${t.name}은(는) 높은 불확실성과 변동성을 내재. 주기적 진동(Periodic Vibration) 관측 및 실시간 조정 필요.`,
    risks: ['예측 불가', '계획 이탈', '자원 낭비'],
    opportunities: ['유연성 확보', '학습 기회', '적응력 강화'],
    causalChain: ['불확실성 → 변동 → 조정 → 학습 → 적응'],
    failureImpact: (t) => `${t.name} 실패 시 예측 불가한 2차 피해 발생 가능. 위기 대응 계획 필수.`,
  },
  // 안정 구역 (기본)
  {
    condition: () => true,
    core: (t) => `${t.name}은(는) 조직 운영의 기반 업무. 안정적 수행이 전체 시스템의 기초를 형성.`,
    risks: ['과소평가', '자원 부족', '관성적 수행'],
    opportunities: ['최적화 여지', '자동화 가능', '표준화 대상'],
    causalChain: ['입력 → 처리 → 출력 → 피드백 → 개선'],
    failureImpact: (t) => `${t.name} 실패 시 일시적 운영 차질. 복구 가능하나 신뢰도 저하.`,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// R1 Insight Engine
// ═══════════════════════════════════════════════════════════════════════════════

export class R1InsightEngine {
  private templates: InsightTemplate[];
  private confidenceBase: number;
  
  constructor() {
    this.templates = INSIGHT_TEMPLATES;
    this.confidenceBase = 0.85;
  }
  
  /**
   * 단일 업무에 대한 R1 통찰 생성
   */
  generateInsight(task: TaskDNA): R1Insight {
    // 적합한 템플릿 선택 (첫 번째 매칭)
    const template = this.templates.find(t => t.condition(task)) || this.templates[this.templates.length - 1];
    
    // 기본 통찰 생성
    const baseInsight: R1Insight = {
      core: template.core(task),
      risks: [...template.risks],
      opportunities: [...template.opportunities],
      causalChain: [...template.causalChain],
      optimalConditions: this.generateOptimalConditions(task),
      failureImpact: template.failureImpact(task),
      confidence: this.calculateConfidence(task),
    };
    
    // 도메인별 추가 통찰
    this.enrichWithDomainInsight(baseInsight, task);
    
    // 고도별 추가 통찰
    this.enrichWithAltitudeInsight(baseInsight, task);
    
    return baseInsight;
  }
  
  /**
   * 복수 업무 간 간섭 분석
   */
  analyzeInterference(taskA: TaskDNA, taskB: TaskDNA): {
    type: 'amplify' | 'dampen' | 'neutral';
    strength: number;
    description: string;
  } {
    // 같은 도메인이면 강한 상관관계
    const sameDomain = taskA.domain === taskB.domain;
    
    // 고도 차이 계산
    const altDiff = Math.abs(
      parseInt(taskA.altitude.substring(1)) - parseInt(taskB.altitude.substring(1))
    );
    
    // 간섭 강도 계산
    const baseStrength = (taskA.physics.interference + taskB.physics.interference) / 20;
    const domainFactor = sameDomain ? 1.5 : 1.0;
    const altFactor = Math.max(0.5, 1 - altDiff * 0.1);
    
    const strength = Math.min(1, baseStrength * domainFactor * altFactor);
    
    // 타입 결정
    let type: 'amplify' | 'dampen' | 'neutral';
    if (strength > 0.6) {
      type = sameDomain ? 'amplify' : 'dampen';
    } else if (strength > 0.3) {
      type = 'neutral';
    } else {
      type = 'neutral';
    }
    
    const description = type === 'amplify'
      ? `${taskA.name}와 ${taskB.name}는 상호 촉진 관계. 동시 진행 시 시너지 효과.`
      : type === 'dampen'
      ? `${taskA.name}와 ${taskB.name}는 자원 경합 관계. 우선순위 설정 필요.`
      : `${taskA.name}와 ${taskB.name}는 독립적 관계. 병렬 진행 가능.`;
    
    return { type, strength, description };
  }
  
  /**
   * 조직 전체의 에너지 밀도 맵 생성
   */
  generateEnergyDensityMap(tasks: TaskDNA[]): Map<ScaleLevel, {
    totalMass: number;
    avgPsi: number;
    avgInterference: number;
    riskZones: RiskZone[];
    hotspots: TaskDNA[];
  }> {
    const map = new Map<ScaleLevel, {
      totalMass: number;
      avgPsi: number;
      avgInterference: number;
      riskZones: RiskZone[];
      hotspots: TaskDNA[];
    }>();
    
    const altitudes: ScaleLevel[] = ['K1', 'K2', 'K3', 'K4', 'K5', 'K6', 'K7', 'K8', 'K9', 'K10'];
    
    for (const alt of altitudes) {
      const tasksAtAlt = tasks.filter(t => t.altitude === alt);
      if (tasksAtAlt.length === 0) {
        map.set(alt, {
          totalMass: 0,
          avgPsi: 0,
          avgInterference: 0,
          riskZones: [],
          hotspots: [],
        });
        continue;
      }
      
      const totalMass = tasksAtAlt.reduce((sum, t) => sum + t.physics.mass, 0);
      const avgPsi = tasksAtAlt.reduce((sum, t) => sum + t.physics.psi, 0) / tasksAtAlt.length;
      const avgInterference = tasksAtAlt.reduce((sum, t) => sum + t.physics.interference, 0) / tasksAtAlt.length;
      
      // 위험 구역 식별
      const riskZones = [...new Set(tasksAtAlt.map(t => classifyRiskZone(t.physics, 0.9)))];
      
      // 핫스팟 (질량 상위 3개)
      const hotspots = [...tasksAtAlt]
        .sort((a, b) => b.physics.mass - a.physics.mass)
        .slice(0, 3);
      
      map.set(alt, {
        totalMass,
        avgPsi,
        avgInterference,
        riskZones,
        hotspots,
      });
    }
    
    return map;
  }
  
  /**
   * 암흑 물질(Dark Matter) 영역 탐지
   */
  detectDarkMatter(tasks: TaskDNA[]): {
    unknownAreas: string[];
    recommendations: string[];
  } {
    const unknownAreas: string[] = [];
    const recommendations: string[] = [];
    
    // 통찰 신뢰도가 낮은 업무 탐지
    const lowConfidenceTasks = tasks.filter(t => t.insight.confidence < 0.7);
    
    if (lowConfidenceTasks.length > 0) {
      unknownAreas.push(`${lowConfidenceTasks.length}개 업무의 물성치 불확실`);
      recommendations.push('집단지성을 투여하여 업무 특성 데이터 수집 필요');
    }
    
    // 간섭 관계가 정의되지 않은 업무 탐지
    const isolatedTasks = tasks.filter(t => 
      t.interference.amplifies.length === 0 &&
      t.interference.dampens.length === 0 &&
      t.interference.dependsOn.length === 0
    );
    
    if (isolatedTasks.length > 0) {
      unknownAreas.push(`${isolatedTasks.length}개 업무의 간섭 관계 미정의`);
      recommendations.push('업무 간 연결 관계 매핑 프로젝트 실행 권장');
    }
    
    // 도메인별 커버리지 체크
    const domainCoverage = new Map<string, number>();
    tasks.forEach(t => {
      domainCoverage.set(t.domain, (domainCoverage.get(t.domain) || 0) + 1);
    });
    
    const avgCoverage = tasks.length / 12;
    domainCoverage.forEach((count, domain) => {
      if (count < avgCoverage * 0.5) {
        unknownAreas.push(`${domain} 도메인의 업무 정의 부족`);
        recommendations.push(`${domain} 도메인 전문가 인터뷰 및 업무 발굴 필요`);
      }
    });
    
    return { unknownAreas, recommendations };
  }
  
  /**
   * 최적 실행 조건 생성
   */
  private generateOptimalConditions(task: TaskDNA): string[] {
    const conditions: string[] = [];
    
    // 고도별 조건
    const altNum = parseInt(task.altitude.substring(1));
    if (altNum >= 7) {
      conditions.push('이사회/경영진 승인 필수');
      conditions.push('전략적 정렬 확인');
    } else if (altNum >= 5) {
      conditions.push('부서장급 승인 필요');
      conditions.push('관련 부서 협의 완료');
    } else {
      conditions.push('팀장 승인으로 실행 가능');
      conditions.push('표준 프로세스 준수');
    }
    
    // 비가역성 조건
    if (task.physics.psi >= 8.0) {
      conditions.push('비가역적 결정 사전 검토 완료');
      conditions.push('롤백 계획 수립');
    }
    
    // 간섭 조건
    if (task.physics.interference >= 7.0) {
      conditions.push('이해관계자 사전 커뮤니케이션');
      conditions.push('영향 받는 부서 일정 조율');
    }
    
    // 엔트로피 조건
    if (task.physics.omega >= 0.6) {
      conditions.push('유연한 일정 버퍼 확보');
      conditions.push('실시간 모니터링 체계 가동');
    }
    
    return conditions;
  }
  
  /**
   * 신뢰도 계산
   */
  private calculateConfidence(task: TaskDNA): number {
    let confidence = this.confidenceBase;
    
    // 메타데이터 충실도에 따른 보정
    if (task.metadata.globalStandard) confidence += 0.05;
    if (task.metadata.legalRequirements?.length) confidence += 0.03;
    if (task.metadata.kpis.length > 0) confidence += 0.02;
    
    // 극단값에 대한 신뢰도 감소
    if (task.physics.psi >= 9.0 || task.physics.mass >= 9.0) {
      confidence -= 0.05;
    }
    
    return Math.min(0.95, Math.max(0.5, confidence));
  }
  
  /**
   * 도메인별 추가 통찰
   */
  private enrichWithDomainInsight(insight: R1Insight, task: TaskDNA): void {
    const domainInsights: Record<string, { risk: string; opportunity: string }> = {
      LEGAL: { risk: '법적 책임 및 소송 리스크', opportunity: '법적 보호 체계 구축' },
      FINANCE: { risk: '재무적 손실 및 유동성 위기', opportunity: '자본 효율성 극대화' },
      HR: { risk: '인재 이탈 및 조직 문화 훼손', opportunity: '인적 자본 가치 증대' },
      STRATEGY: { risk: '전략적 방향 상실', opportunity: '경쟁 우위 선점' },
      OPERATIONS: { risk: '운영 중단 및 품질 저하', opportunity: '운영 효율성 향상' },
      SALES: { risk: '매출 감소 및 고객 이탈', opportunity: '시장 점유율 확대' },
      MARKETING: { risk: '브랜드 가치 훼손', opportunity: '브랜드 자산 축적' },
      PRODUCT: { risk: '제품 실패 및 시장 외면', opportunity: '혁신 제품으로 시장 창출' },
      TECHNOLOGY: { risk: '시스템 장애 및 보안 사고', opportunity: '기술 경쟁력 강화' },
      COMPLIANCE: { risk: '규제 위반 및 과징금', opportunity: '신뢰 기반 사업 확대' },
      CUSTOMER: { risk: '고객 신뢰 상실', opportunity: '고객 생애 가치 극대화' },
      GOVERNANCE: { risk: '거버넌스 실패 및 신뢰 위기', opportunity: '이해관계자 가치 정렬' },
    };
    
    const domainInsight = domainInsights[task.domain];
    if (domainInsight) {
      insight.risks.push(domainInsight.risk);
      insight.opportunities.push(domainInsight.opportunity);
    }
  }
  
  /**
   * 고도별 추가 통찰
   */
  private enrichWithAltitudeInsight(insight: R1Insight, task: TaskDNA): void {
    const altNum = parseInt(task.altitude.substring(1));
    
    if (altNum >= 8) {
      insight.causalChain.push('전략 → 조직 → 문화 → 장기 가치');
      insight.risks.push('의사결정 지연 시 기회 비용');
    } else if (altNum >= 5) {
      insight.causalChain.push('계획 → 실행 → 측정 → 조정');
      insight.risks.push('부서 간 조정 실패');
    } else {
      insight.causalChain.push('입력 → 처리 → 출력');
      insight.risks.push('실행 품질 저하');
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 싱글톤 인스턴스
// ═══════════════════════════════════════════════════════════════════════════════

let insightEngineInstance: R1InsightEngine | null = null;

export function getR1InsightEngine(): R1InsightEngine {
  if (!insightEngineInstance) {
    insightEngineInstance = new R1InsightEngine();
  }
  return insightEngineInstance;
}

// ═══════════════════════════════════════════════════════════════════════════════
// React Hook
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useCallback, useMemo } from 'react';

export function useR1Insight() {
  const [engine] = useState(() => getR1InsightEngine());
  
  const generateInsight = useCallback(
    (task: TaskDNA) => engine.generateInsight(task),
    [engine]
  );
  
  const analyzeInterference = useCallback(
    (taskA: TaskDNA, taskB: TaskDNA) => engine.analyzeInterference(taskA, taskB),
    [engine]
  );
  
  const generateEnergyMap = useCallback(
    (tasks: TaskDNA[]) => engine.generateEnergyDensityMap(tasks),
    [engine]
  );
  
  const detectDarkMatter = useCallback(
    (tasks: TaskDNA[]) => engine.detectDarkMatter(tasks),
    [engine]
  );
  
  return useMemo(() => ({
    engine,
    generateInsight,
    analyzeInterference,
    generateEnergyMap,
    detectDarkMatter,
  }), [engine, generateInsight, analyzeInterference, generateEnergyMap, detectDarkMatter]);
}
