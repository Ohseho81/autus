// ═══════════════════════════════════════════════════════════════════════════════
// AUTUS Regulation Engine - 규제 자동 집행 레이어
// ═══════════════════════════════════════════════════════════════════════════════
//
// 핵심 원칙:
// 1. 법 위에 서지 않는다
// 2. 법을 해석하지 않는다
// 3. 법을 실행만 한다
//
// AUTUS는 재량 이전(pre-discretion) 레이어다.
//
// ═══════════════════════════════════════════════════════════════════════════════

import { 
  DecisionVector, 
  RegulationConstraint, 
  AuthorityLevel 
} from './gate';
import { KScale } from '../schema';

// ═══════════════════════════════════════════════════════════════════════════════
// 1. 규제 유형 정의
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 법률/규정 원본
 * 인간이 해석하고 1회 변환
 */
export interface LegalSource {
  id: string;
  name: string;
  nameKo: string;
  jurisdiction: string;          // 관할권
  effectiveDate: Date;
  category: RegulationCategory;
  originalText: string;          // 원문 (참조용)
  compiledAt: Date;              // 컴파일 시점
  compiledBy: string;            // 컴파일 담당자
}

export type RegulationCategory =
  | 'financial'       // 금융 규제
  | 'corporate'       // 기업법
  | 'labor'           // 노동법
  | 'tax'             // 세법
  | 'privacy'         // 개인정보
  | 'industry'        // 산업 규제
  | 'international';  // 국제법

/**
 * 컴파일된 규제 함수
 * 한 번 등록 후 수정 불가
 */
export interface CompiledRegulation extends RegulationConstraint {
  source: LegalSource;
  version: string;
  immutable: true;               // 불변성 표시
  compilationHash: string;       // 컴파일 해시
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. Regulation Engine
// ═══════════════════════════════════════════════════════════════════════════════

export class RegulationEngine {
  private compiledRegulations: Map<string, CompiledRegulation> = new Map();
  private compilationLog: CompilationEntry[] = [];
  
  /**
   * 법률 해석 → 규칙화 (1회)
   * 
   * 집행 순서:
   * 1. 법률 해석 (인간)
   * 2. 규칙화 (1회)
   * 3. AUTUS 규제 함수 등록
   * 4. 이후 해석 개입 불가
   */
  compileRegulation(
    source: LegalSource,
    evaluator: (d: DecisionVector) => boolean,
    violationMessage: string,
    compilerId: string
  ): CompiledRegulation {
    // 이미 등록된 규제인지 확인
    if (this.compiledRegulations.has(source.id)) {
      throw new Error(
        `규제 ${source.id}는 이미 컴파일됨. ` +
        `AUTUS 규제는 수정 불가. 새 버전이 필요하면 새 ID로 등록.`
      );
    }
    
    const compiled: CompiledRegulation = {
      id: source.id,
      name: source.name,
      nameKo: source.nameKo,
      category: this.mapCategory(source.category),
      source,
      version: '1.0.0',
      immutable: true,
      compilationHash: this.generateCompilationHash(source, evaluator),
      evaluate: evaluator,
      violationMessage,
    };
    
    // 등록
    this.compiledRegulations.set(source.id, compiled);
    
    // 컴파일 로그 (영구 기록)
    this.compilationLog.push({
      regulationId: source.id,
      timestamp: new Date(),
      compilerId,
      hash: compiled.compilationHash,
      action: 'compiled',
    });
    
    return compiled;
  }
  
  /**
   * 모든 컴파일된 규제 반환
   */
  getAllRegulations(): CompiledRegulation[] {
    return Array.from(this.compiledRegulations.values());
  }
  
  /**
   * 특정 카테고리 규제 반환
   */
  getRegulationsByCategory(category: RegulationConstraint['category']): CompiledRegulation[] {
    return this.getAllRegulations().filter(r => r.category === category);
  }
  
  /**
   * 결정에 적용 가능한 규제 필터링
   */
  getApplicableRegulations(d: Omit<DecisionVector, 'R'>): CompiledRegulation[] {
    // 모든 규제를 반환 (필터링 로직은 확장 가능)
    return this.getAllRegulations();
  }
  
  /**
   * 규제 수정 시도 (항상 실패)
   */
  attemptModify(regulationId: string, _newEvaluator: any): never {
    const regulation = this.compiledRegulations.get(regulationId);
    
    if (!regulation) {
      throw new Error(`규제 ${regulationId}를 찾을 수 없음`);
    }
    
    // AUTUS의 핵심: 규제 수정은 구조적으로 불가능
    throw new Error(
      `규제 ${regulationId}는 ${regulation.source.compiledAt.toISOString()}에 컴파일됨. ` +
      `immutable: true - 수정 불가. ` +
      `변경이 필요하면 새 버전의 법률 소스로 새 규제를 등록해야 함.`
    );
  }
  
  /**
   * 컴파일 로그 조회
   */
  getCompilationLog(): readonly CompilationEntry[] {
    return Object.freeze([...this.compilationLog]);
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // 내부 메서드
  // ═══════════════════════════════════════════════════════════════════════════
  
  private mapCategory(legalCategory: RegulationCategory): RegulationConstraint['category'] {
    const mapping: Record<RegulationCategory, RegulationConstraint['category']> = {
      financial: 'payment',
      corporate: 'approval',
      labor: 'compliance',
      tax: 'payment',
      privacy: 'compliance',
      industry: 'regional',
      international: 'regional',
    };
    return mapping[legalCategory];
  }
  
  private generateCompilationHash(source: LegalSource, evaluator: Function): string {
    const data = `${source.id}:${source.effectiveDate}:${evaluator.toString()}`;
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      hash = ((hash << 5) - hash) + data.charCodeAt(i);
      hash = hash & hash;
    }
    return `REG-${Math.abs(hash).toString(16).toUpperCase().padStart(12, '0')}`;
  }
}

interface CompilationEntry {
  regulationId: string;
  timestamp: Date;
  compilerId: string;
  hash: string;
  action: 'compiled' | 'deprecated';
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. 기본 한국 규제 세트 (예시)
// ═══════════════════════════════════════════════════════════════════════════════

export const KOREAN_REGULATIONS: {
  source: LegalSource;
  evaluator: (d: DecisionVector) => boolean;
  violationMessage: string;
}[] = [
  // 전자금융거래법 - 1회 이체 한도
  {
    source: {
      id: 'kr-eft-transfer-limit',
      name: 'Electronic Financial Transaction Act - Transfer Limit',
      nameKo: '전자금융거래법 - 이체 한도',
      jurisdiction: 'KR',
      effectiveDate: new Date('2020-01-01'),
      category: 'financial',
      originalText: '1회 이체 한도 1억원 (기업: 10억원)',
      compiledAt: new Date(),
      compiledBy: 'legal-team',
    },
    evaluator: (d) => {
      // 개인: 1억, 기업(K4+): 10억
      const limit = d.K >= 4 ? 10_000_000_000 : 100_000_000;
      return d.Cm <= limit;
    },
    violationMessage: '전자금융거래법 이체 한도 초과',
  },
  
  // 자본시장법 - 대규모 거래 신고
  {
    source: {
      id: 'kr-capital-large-transaction',
      name: 'Capital Market Act - Large Transaction Report',
      nameKo: '자본시장법 - 대량거래 신고',
      jurisdiction: 'KR',
      effectiveDate: new Date('2021-01-01'),
      category: 'financial',
      originalText: '50억원 이상 거래 시 사전 신고',
      compiledAt: new Date(),
      compiledBy: 'legal-team',
    },
    evaluator: (d) => {
      // 50억 이상은 K7+ 권한 필요 (신고 의무 반영)
      if (d.Cm >= 5_000_000_000) {
        return d.K >= 7 && d.A >= 7;
      }
      return true;
    },
    violationMessage: '대량거래 신고 요건 미충족',
  },
  
  // 근로기준법 - 인원 감축 절차
  {
    source: {
      id: 'kr-labor-layoff',
      name: 'Labor Standards Act - Layoff Procedure',
      nameKo: '근로기준법 - 정리해고 절차',
      jurisdiction: 'KR',
      effectiveDate: new Date('2019-01-01'),
      category: 'labor',
      originalText: '50인 이상 해고 시 60일 전 신고',
      compiledAt: new Date(),
      compiledBy: 'legal-team',
    },
    evaluator: (d) => {
      // HR 관련 결정 + 대규모 비용 → K6+ 필요
      if (d.Ct >= 24 * 60) { // 60일 이상 영향
        return d.K >= 6;
      }
      return true;
    },
    violationMessage: '정리해고 절차 요건 미충족',
  },
  
  // 개인정보보호법 - 민감정보 처리
  {
    source: {
      id: 'kr-privacy-sensitive',
      name: 'Personal Information Protection Act',
      nameKo: '개인정보보호법 - 민감정보',
      jurisdiction: 'KR',
      effectiveDate: new Date('2020-08-05'),
      category: 'privacy',
      originalText: '민감정보 처리 시 별도 동의',
      compiledAt: new Date(),
      compiledBy: 'legal-team',
    },
    evaluator: (d) => {
      // 비가역성 높은 개인정보 결정 → K5+ 필요
      if (d.I >= 70) {
        return d.K >= 5;
      }
      return true;
    },
    violationMessage: '민감정보 처리 승인 요건 미충족',
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// 4. Regulation Engine 초기화 헬퍼
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 한국 규제가 적용된 엔진 생성
 */
export function createKoreanRegulationEngine(): RegulationEngine {
  const engine = new RegulationEngine();
  
  for (const reg of KOREAN_REGULATIONS) {
    engine.compileRegulation(
      reg.source,
      reg.evaluator,
      reg.violationMessage,
      'system-init'
    );
  }
  
  return engine;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. 책임 귀속 자동화
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 책임 체인 (변경 불가)
 * 
 * Liability(d) = A
 * - 승인 주체 = 자동 책임자
 * - 분산 책임/전가 불가
 * - 사후 "몰랐다" 불가
 */
export interface LiabilityRecord {
  decisionHash: string;
  authorityLevel: AuthorityLevel;
  authorityId: string;
  authorityName: string;
  timestamp: Date;
  
  // 불변 증명
  sealed: true;
  
  // 책임 범위
  scope: {
    timeCost: number;
    moneyCost: number;
    irreversibility: number;
  };
}

export class LiabilityChain {
  private records: Map<string, LiabilityRecord> = new Map();
  
  /**
   * 책임 바인딩 (봉인 시 자동 호출)
   */
  bindLiability(
    decisionHash: string,
    authority: { level: AuthorityLevel; id: string; name: string },
    scope: LiabilityRecord['scope']
  ): LiabilityRecord {
    if (this.records.has(decisionHash)) {
      throw new Error(`결정 ${decisionHash}의 책임은 이미 바인딩됨`);
    }
    
    const record: LiabilityRecord = {
      decisionHash,
      authorityLevel: authority.level,
      authorityId: authority.id,
      authorityName: authority.name,
      timestamp: new Date(),
      sealed: true,
      scope,
    };
    
    this.records.set(decisionHash, record);
    return record;
  }
  
  /**
   * 책임 조회
   */
  getLiability(decisionHash: string): LiabilityRecord | undefined {
    return this.records.get(decisionHash);
  }
  
  /**
   * 책임 이전 시도 (항상 실패)
   */
  attemptTransfer(decisionHash: string, _newAuthority: any): never {
    const record = this.records.get(decisionHash);
    
    if (!record) {
      throw new Error(`결정 ${decisionHash}를 찾을 수 없음`);
    }
    
    throw new Error(
      `결정 ${decisionHash}의 책임은 ${record.authorityName}(K${record.authorityLevel})에 ` +
      `${record.timestamp.toISOString()}에 봉인됨. ` +
      `sealed: true - 이전/분산/전가 불가.`
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Export
// ═══════════════════════════════════════════════════════════════════════════════

export default RegulationEngine;
