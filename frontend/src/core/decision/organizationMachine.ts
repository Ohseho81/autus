// ═══════════════════════════════════════════════════════════════════════════════
// AUTUS Organization State Machine - 조직 재편 상태 기계
// ═══════════════════════════════════════════════════════════════════════════════
//
// AUTUS 도입 조직은 선택지가 없다.
// 아래 5단계를 반드시 순서대로 밟는다.
//
// Stage 1: 충격 (Decision Shock)
// Stage 2: 권한 재배치
// Stage 3: 조직 압축
// Stage 4: 외부 확장
// Stage 5: 자율 봉인 조직 (Sealed Organization)
//
// ═══════════════════════════════════════════════════════════════════════════════

import { AuthorityLevel } from './gate';

// ═══════════════════════════════════════════════════════════════════════════════
// 1. 조직 상태 정의
// ═══════════════════════════════════════════════════════════════════════════════

export type OrganizationStage = 1 | 2 | 3 | 4 | 5;

export interface OrganizationState {
  stage: OrganizationStage;
  stageName: string;
  stageNameKo: string;
  
  // 구조 메트릭스
  metrics: {
    hierarchyLevels: number;        // 조직 계층 수 (Stage 1: 5~7, Stage 5: 2~3)
    approverCount: number;          // 승인자 수
    operatorCount: number;          // Operator 수
    meetingFrequency: number;       // 주간 회의 수
    reportCycles: number;           // 보고 주기 (일)
  };
  
  // 직무 분포
  roles: {
    managers: number;               // 관리자 (Stage 5: 0)
    owners: number;                 // Owner (결정권자)
    operators: number;              // Operator (입력자)
    interpreters: number;           // 해석 담당자 (Stage 5: 0)
    coordinators: number;           // 조정자 (Stage 5: 0)
  };
  
  // 진행률
  progress: {
    currentStageProgress: number;   // 현재 단계 진행률 (0~100)
    totalProgress: number;          // 전체 진행률 (0~100)
    estimatedCompletion: Date | null;
  };
  
  // 징후
  symptoms: Symptom[];
}

export interface Symptom {
  id: string;
  description: string;
  descriptionKo: string;
  severity: 'info' | 'warning' | 'critical';
  detectedAt: Date;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. 단계별 정의
// ═══════════════════════════════════════════════════════════════════════════════

export const ORGANIZATION_STAGES: Record<OrganizationStage, {
  name: string;
  nameKo: string;
  description: string;
  targetMetrics: Partial<OrganizationState['metrics']>;
  targetRoles: Partial<OrganizationState['roles']>;
  symptoms: string[];
  symptomsKo: string[];
}> = {
  1: {
    name: 'Decision Shock',
    nameKo: '충격',
    description: '결정 속도 급증, 변명·조정 불가, 기존 관리자 저항 발생',
    targetMetrics: {
      meetingFrequency: 5,    // 여전히 높음
      reportCycles: 7,        // 주간 보고
    },
    targetRoles: {
      managers: 50,           // 여전히 많음
      interpreters: 20,       // 여전히 존재
    },
    symptoms: [
      'This is too fast',
      'We need exceptions',
      'Resistance from middle management',
    ],
    symptomsKo: [
      '이건 너무 빠르다',
      '예외가 필요하다',
      '중간 관리자의 저항',
    ],
  },
  2: {
    name: 'Authority Redistribution',
    nameKo: '권한 재배치',
    description: '승인자 수 급감, 보상/연봉 구조 변화, 소수 고연봉 Owner + 다수 저권한 Operator',
    targetMetrics: {
      approverCount: 10,      // 급감
    },
    targetRoles: {
      managers: 30,           // 감소 시작
      owners: 10,             // 명확해짐
      operators: 60,          // 증가
    },
    symptoms: [
      'Salary restructuring',
      'Authority centralization',
      'Role clarification',
    ],
    symptomsKo: [
      '연봉 구조 변화',
      '권한 집중화',
      '역할 명확화',
    ],
  },
  3: {
    name: 'Organizational Compression',
    nameKo: '조직 압축',
    description: '계층 붕괴, 5~7단계 → 2~3단계 수렴, 보고 라인 삭제, 회의 소멸',
    targetMetrics: {
      hierarchyLevels: 3,     // 급감
      meetingFrequency: 1,    // 거의 없음
      reportCycles: 0,        // 보고 불필요
    },
    targetRoles: {
      managers: 10,           // 대폭 감소
      interpreters: 5,        // 거의 없음
      coordinators: 5,        // 거의 없음
    },
    symptoms: [
      'Reporting lines deleted',
      'Meetings disappearing',
      'Hierarchy collapse',
    ],
    symptomsKo: [
      '보고 라인 삭제',
      '회의 소멸',
      '계층 붕괴',
    ],
  },
  4: {
    name: 'External Expansion',
    nameKo: '외부 확장',
    description: '내부 조직 최소화, 외주/파트너/노드화, 계약이 코드로 대체',
    targetMetrics: {
      approverCount: 5,       // 최소화
    },
    targetRoles: {
      managers: 5,            // 거의 없음
      owners: 5,              // 소수 핵심
      operators: 30,          // 외주화
    },
    symptoms: [
      'Contracts becoming code',
      'Dispute reduction',
      'Partner network growth',
    ],
    symptomsKo: [
      '계약이 코드로 대체',
      '분쟁 감소',
      '파트너 네트워크 확장',
    ],
  },
  5: {
    name: 'Sealed Organization',
    nameKo: '자율 봉인 조직',
    description: '인간은 결정하지 않음, 시스템이 결정 조건 강제, 조직은 상태 기계가 됨',
    targetMetrics: {
      hierarchyLevels: 2,     // Owner + Operator만
      meetingFrequency: 0,    // 불필요
      reportCycles: 0,        // 불필요
    },
    targetRoles: {
      managers: 0,            // 존재 불가
      owners: 3,              // 최소 핵심
      operators: 20,          // 입력 담당
      interpreters: 0,        // 존재 불가
      coordinators: 0,        // 존재 불가
    },
    symptoms: [
      'New hires immediately at full performance',
      'Individual capability variance → 0',
      'Organization as state machine',
    ],
    symptomsKo: [
      '신규 인력도 즉시 동일 성능',
      '개인 역량 편차 영향 0에 수렴',
      '조직이 상태 기계가 됨',
    ],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 3. Organization State Machine
// ═══════════════════════════════════════════════════════════════════════════════

export class OrganizationMachine {
  private state: OrganizationState;
  private transitionLog: TransitionEntry[] = [];
  
  constructor(initialStage: OrganizationStage = 1) {
    this.state = this.createInitialState(initialStage);
  }
  
  /**
   * 현재 상태 반환
   */
  getState(): Readonly<OrganizationState> {
    return { ...this.state };
  }
  
  /**
   * 메트릭스 업데이트 (외부 측정값 주입)
   */
  updateMetrics(metrics: Partial<OrganizationState['metrics']>): void {
    this.state.metrics = { ...this.state.metrics, ...metrics };
    this.evaluateProgress();
    this.checkTransition();
  }
  
  /**
   * 역할 분포 업데이트
   */
  updateRoles(roles: Partial<OrganizationState['roles']>): void {
    this.state.roles = { ...this.state.roles, ...roles };
    this.evaluateProgress();
    this.checkTransition();
  }
  
  /**
   * 강제 단계 이동 (테스트/시뮬레이션용)
   */
  forceTransition(targetStage: OrganizationStage): void {
    if (targetStage < this.state.stage) {
      throw new Error(
        `AUTUS 조직 진화는 비가역적. Stage ${this.state.stage} → Stage ${targetStage} 불가.`
      );
    }
    
    this.transitionTo(targetStage);
  }
  
  /**
   * 전이 로그 반환
   */
  getTransitionLog(): readonly TransitionEntry[] {
    return Object.freeze([...this.transitionLog]);
  }
  
  /**
   * 다음 단계까지 예상 시간
   */
  getEstimatedTimeToNextStage(): { days: number; confidence: number } | null {
    if (this.state.stage === 5) return null;
    
    const progress = this.state.progress.currentStageProgress;
    const remainingProgress = 100 - progress;
    
    // 간단한 선형 추정 (실제로는 더 복잡한 모델 필요)
    const dailyProgress = 2; // 일 2% 가정
    const estimatedDays = remainingProgress / dailyProgress;
    
    return {
      days: Math.round(estimatedDays),
      confidence: 0.7, // 70% 신뢰도
    };
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 내부 메서드
  // ═══════════════════════════════════════════════════════════════════════════
  
  private createInitialState(stage: OrganizationStage): OrganizationState {
    const stageConfig = ORGANIZATION_STAGES[stage];
    
    return {
      stage,
      stageName: stageConfig.name,
      stageNameKo: stageConfig.nameKo,
      metrics: {
        hierarchyLevels: 6,
        approverCount: 30,
        operatorCount: 100,
        meetingFrequency: 10,
        reportCycles: 7,
      },
      roles: {
        managers: 50,
        owners: 5,
        operators: 50,
        interpreters: 20,
        coordinators: 15,
      },
      progress: {
        currentStageProgress: 0,
        totalProgress: ((stage - 1) / 4) * 100,
        estimatedCompletion: null,
      },
      symptoms: [],
    };
  }
  
  private evaluateProgress(): void {
    const target = ORGANIZATION_STAGES[this.state.stage];
    let matchScore = 0;
    let totalChecks = 0;
    
    // 메트릭스 체크
    if (target.targetMetrics.hierarchyLevels !== undefined) {
      totalChecks++;
      if (this.state.metrics.hierarchyLevels <= target.targetMetrics.hierarchyLevels) {
        matchScore++;
      }
    }
    
    if (target.targetMetrics.meetingFrequency !== undefined) {
      totalChecks++;
      if (this.state.metrics.meetingFrequency <= target.targetMetrics.meetingFrequency) {
        matchScore++;
      }
    }
    
    // 역할 체크
    if (target.targetRoles.managers !== undefined) {
      totalChecks++;
      if (this.state.roles.managers <= target.targetRoles.managers) {
        matchScore++;
      }
    }
    
    if (target.targetRoles.interpreters !== undefined) {
      totalChecks++;
      if (this.state.roles.interpreters <= target.targetRoles.interpreters) {
        matchScore++;
      }
    }
    
    // 진행률 계산
    const stageProgress = totalChecks > 0 ? (matchScore / totalChecks) * 100 : 0;
    this.state.progress.currentStageProgress = Math.round(stageProgress);
    this.state.progress.totalProgress = Math.round(
      ((this.state.stage - 1) / 4) * 100 + (stageProgress / 5)
    );
  }
  
  private checkTransition(): void {
    // 현재 단계 진행률이 90% 이상이면 다음 단계로 전이
    if (this.state.progress.currentStageProgress >= 90 && this.state.stage < 5) {
      this.transitionTo((this.state.stage + 1) as OrganizationStage);
    }
    
    // 징후 체크
    this.detectSymptoms();
  }
  
  private transitionTo(newStage: OrganizationStage): void {
    const previousStage = this.state.stage;
    const newConfig = ORGANIZATION_STAGES[newStage];
    
    // 전이 기록
    this.transitionLog.push({
      from: previousStage,
      to: newStage,
      timestamp: new Date(),
      metrics: { ...this.state.metrics },
      roles: { ...this.state.roles },
    });
    
    // 상태 업데이트
    this.state.stage = newStage;
    this.state.stageName = newConfig.name;
    this.state.stageNameKo = newConfig.nameKo;
    this.state.progress.currentStageProgress = 0;
    
    console.log(`[AUTUS Organization] Stage ${previousStage} → Stage ${newStage}: ${newConfig.nameKo}`);
  }
  
  private detectSymptoms(): void {
    const stageConfig = ORGANIZATION_STAGES[this.state.stage];
    
    // 현재 단계 징후 체크
    stageConfig.symptomsKo.forEach((symptomKo, index) => {
      const existingSymptom = this.state.symptoms.find(s => s.descriptionKo === symptomKo);
      
      if (!existingSymptom) {
        // 간단한 발생 확률 (실제로는 더 복잡한 로직)
        if (this.state.progress.currentStageProgress > index * 30) {
          this.state.symptoms.push({
            id: `symptom-${this.state.stage}-${index}`,
            description: stageConfig.symptoms[index],
            descriptionKo: symptomKo,
            severity: index < 1 ? 'info' : index < 2 ? 'warning' : 'critical',
            detectedAt: new Date(),
          });
        }
      }
    });
  }
}

interface TransitionEntry {
  from: OrganizationStage;
  to: OrganizationStage;
  timestamp: Date;
  metrics: OrganizationState['metrics'];
  roles: OrganizationState['roles'];
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. 직무 재정의
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * AUTUS 이후 직무 정의
 * 
 * "매니저"라는 직무는 구조적으로 불가능해진다.
 */
export interface AutusRole {
  type: 'operator' | 'owner' | 'system';
  definition: string;
  definitionKo: string;
  hasAuthority: boolean;
  hasLiability: boolean;
}

export const AUTUS_ROLES: Record<AutusRole['type'], AutusRole> = {
  operator: {
    type: 'operator',
    definition: 'Fact input handler (no authority)',
    definitionKo: 'Fact 입력 담당 (권한 없음)',
    hasAuthority: false,
    hasLiability: false,
  },
  owner: {
    type: 'owner',
    definition: 'Approval and liability holder (decision maker)',
    definitionKo: '승인·책임 담당 (결정권자)',
    hasAuthority: true,
    hasLiability: true,
  },
  system: {
    type: 'system',
    definition: 'Execution, recording, propagation',
    definitionKo: '집행·기록·전파 담당',
    hasAuthority: false,
    hasLiability: false,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 5. 조직 변환 예측기
// ═══════════════════════════════════════════════════════════════════════════════

export function predictOrganizationTransform(
  currentEmployees: number,
  currentHierarchyLevels: number
): {
  finalOwners: number;
  finalOperators: number;
  eliminatedRoles: number;
  timelineMonths: number;
} {
  // Stage 5 목표: Owner + Operator + System만 남음
  
  // Owner: 전체의 5% (최소 1명)
  const finalOwners = Math.max(1, Math.round(currentEmployees * 0.05));
  
  // Operator: 전체의 30%
  const finalOperators = Math.round(currentEmployees * 0.30);
  
  // 제거되는 역할: 관리자 + 해석자 + 조정자
  const eliminatedRoles = currentEmployees - finalOwners - finalOperators;
  
  // 예상 기간: 계층당 6개월
  const timelineMonths = (currentHierarchyLevels - 2) * 6;
  
  return {
    finalOwners,
    finalOperators,
    eliminatedRoles,
    timelineMonths: Math.max(12, timelineMonths), // 최소 1년
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Export
// ═══════════════════════════════════════════════════════════════════════════════

export default OrganizationMachine;
