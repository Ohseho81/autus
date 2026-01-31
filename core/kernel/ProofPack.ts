/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PROOF PACK GENERATOR - K3 헌법 준수 모듈
 *
 * K3: "Proof 없는 결과는 존재하지 않는다"
 *
 * 5종 필수 증거:
 * 1. INPUT_LOG - 입력 기록
 * 2. PROCESS_TRACE - 처리 과정
 * 3. OUTPUT_HASH - 결과 해시
 * 4. TIMESTAMP - 시간 증명
 * 5. VALIDATOR_SIG - 검증자 서명
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { K3_NO_PROOF_NO_RESULT, ProofType } from './CONSTITUTION';

// ============================================
// 타입 정의
// ============================================
export interface InputLog {
  source: string;           // 입력 출처
  inputId: string;          // 입력 ID
  inputType: string;        // 입력 타입
  content: string;          // 입력 내용 (해시화)
  receivedAt: number;       // 수신 시간
  userId?: string;          // 사용자 ID (익명화)
  metadata?: Record<string, unknown>;
}

export interface ProcessTrace {
  stages: ProcessStage[];   // 처리 단계들
  totalDuration: number;    // 전체 처리 시간 (ms)
  decision: string;         // 최종 결정
  lawsApplied: string[];    // 적용된 헌법
}

export interface ProcessStage {
  name: string;             // 단계 이름
  enteredAt: number;        // 진입 시간
  exitedAt: number;         // 종료 시간
  result: string;           // 결과
  data?: Record<string, unknown>;
}

export interface CompleteProofPack {
  version: string;
  INPUT_LOG: InputLog;
  PROCESS_TRACE: ProcessTrace;
  OUTPUT_HASH: string;
  TIMESTAMP: number;
  VALIDATOR_SIG: string;
  integrityHash: string;    // 전체 무결성 해시
}

// ============================================
// ProofPack Builder
// ============================================
export class ProofPackBuilder {
  private inputLog: InputLog | null = null;
  private processTrace: ProcessTrace | null = null;
  private stages: ProcessStage[] = [];
  private startTime: number = 0;

  // ----------------------------------------
  // 빌더 시작
  // ----------------------------------------
  static create(): ProofPackBuilder {
    return new ProofPackBuilder();
  }

  // ----------------------------------------
  // Stage 1: 입력 기록
  // ----------------------------------------
  recordInput(params: {
    source: string;
    inputId: string;
    inputType: string;
    content: string;
    userId?: string;
    metadata?: Record<string, unknown>;
  }): ProofPackBuilder {
    this.startTime = Date.now();

    this.inputLog = {
      source: params.source,
      inputId: params.inputId,
      inputType: params.inputType,
      content: this.hashContent(params.content),
      receivedAt: this.startTime,
      userId: params.userId ? this.anonymizeUserId(params.userId) : undefined,
      metadata: params.metadata,
    };

    return this;
  }

  // ----------------------------------------
  // Stage 2: 처리 단계 추가
  // ----------------------------------------
  addStage(name: string, result: string, data?: Record<string, unknown>): ProofPackBuilder {
    const now = Date.now();
    const previousStage = this.stages[this.stages.length - 1];

    this.stages.push({
      name,
      enteredAt: previousStage?.exitedAt || this.startTime,
      exitedAt: now,
      result,
      data,
    });

    return this;
  }

  // ----------------------------------------
  // Stage 3: 처리 완료 및 결정
  // ----------------------------------------
  complete(decision: string, lawsApplied: string[]): ProofPackBuilder {
    const endTime = Date.now();

    this.processTrace = {
      stages: this.stages,
      totalDuration: endTime - this.startTime,
      decision,
      lawsApplied,
    };

    return this;
  }

  // ----------------------------------------
  // Stage 4: ProofPack 빌드
  // ----------------------------------------
  build(): CompleteProofPack {
    if (!this.inputLog) {
      throw new Error('ProofPack build failed: INPUT_LOG is missing');
    }
    if (!this.processTrace) {
      throw new Error('ProofPack build failed: PROCESS_TRACE is missing');
    }

    const timestamp = Date.now();

    // OUTPUT_HASH 생성
    const outputHash = this.generateOutputHash();

    // VALIDATOR_SIG 생성
    const validatorSig = this.generateValidatorSignature(timestamp);

    // 전체 무결성 해시
    const integrityHash = this.generateIntegrityHash(
      this.inputLog,
      this.processTrace,
      outputHash,
      timestamp,
      validatorSig
    );

    return {
      version: '1.0.0',
      INPUT_LOG: this.inputLog,
      PROCESS_TRACE: this.processTrace,
      OUTPUT_HASH: outputHash,
      TIMESTAMP: timestamp,
      VALIDATOR_SIG: validatorSig,
      integrityHash,
    };
  }

  // ----------------------------------------
  // 헬퍼: 콘텐츠 해시화
  // ----------------------------------------
  private hashContent(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `CONTENT_${Math.abs(hash).toString(16).toUpperCase().padStart(8, '0')}`;
  }

  // ----------------------------------------
  // 헬퍼: 사용자 ID 익명화
  // ----------------------------------------
  private anonymizeUserId(userId: string): string {
    // 앞 3자리 + *** + 뒤 3자리
    if (userId.length <= 6) {
      return '***';
    }
    return userId.slice(0, 3) + '***' + userId.slice(-3);
  }

  // ----------------------------------------
  // 헬퍼: 출력 해시 생성
  // ----------------------------------------
  private generateOutputHash(): string {
    const data = JSON.stringify({
      input: this.inputLog,
      trace: this.processTrace,
    });

    let hash = 5381;
    for (let i = 0; i < data.length; i++) {
      hash = ((hash << 5) + hash) + data.charCodeAt(i);
    }

    return `OUT_${Math.abs(hash).toString(16).toUpperCase().padStart(12, '0')}`;
  }

  // ----------------------------------------
  // 헬퍼: 검증자 서명 생성
  // ----------------------------------------
  private generateValidatorSignature(timestamp: number): string {
    const signatureData = `${this.inputLog?.inputId}_${timestamp}_AUTUS_CORE`;
    let sig = 0;
    for (let i = 0; i < signatureData.length; i++) {
      sig = ((sig << 3) - sig) + signatureData.charCodeAt(i);
    }
    return `SIG_AUTUS_${Math.abs(sig).toString(36).toUpperCase()}`;
  }

  // ----------------------------------------
  // 헬퍼: 전체 무결성 해시
  // ----------------------------------------
  private generateIntegrityHash(
    inputLog: InputLog,
    processTrace: ProcessTrace,
    outputHash: string,
    timestamp: number,
    validatorSig: string
  ): string {
    const combined = JSON.stringify({
      inputLog,
      processTrace,
      outputHash,
      timestamp,
      validatorSig,
    });

    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      hash = ((hash << 7) - hash) + combined.charCodeAt(i);
    }

    return `INTEGRITY_${Math.abs(hash).toString(16).toUpperCase().padStart(16, '0')}`;
  }

  // ----------------------------------------
  // 리셋
  // ----------------------------------------
  reset(): ProofPackBuilder {
    this.inputLog = null;
    this.processTrace = null;
    this.stages = [];
    this.startTime = 0;
    return this;
  }
}

// ============================================
// ProofPack 검증기
// ============================================
export class ProofPackValidator {
  // ----------------------------------------
  // K3 준수 여부 검증
  // ----------------------------------------
  static validate(proofPack: CompleteProofPack): {
    valid: boolean;
    missing: string[];
    errors: string[];
  } {
    const missing: string[] = [];
    const errors: string[] = [];

    // 5종 필수 증거 확인
    const requiredProofs = K3_NO_PROOF_NO_RESULT.requiredProofs;

    for (const proofType of requiredProofs) {
      const value = proofPack[proofType as keyof CompleteProofPack];
      if (value === undefined || value === null) {
        missing.push(proofType);
      }
    }

    // INPUT_LOG 검증
    if (proofPack.INPUT_LOG) {
      if (!proofPack.INPUT_LOG.inputId) {
        errors.push('INPUT_LOG: inputId is required');
      }
      if (!proofPack.INPUT_LOG.content) {
        errors.push('INPUT_LOG: content is required');
      }
    }

    // PROCESS_TRACE 검증
    if (proofPack.PROCESS_TRACE) {
      if (!proofPack.PROCESS_TRACE.stages || proofPack.PROCESS_TRACE.stages.length === 0) {
        errors.push('PROCESS_TRACE: at least one stage is required');
      }
      if (!proofPack.PROCESS_TRACE.decision) {
        errors.push('PROCESS_TRACE: decision is required');
      }
    }

    // TIMESTAMP 검증
    if (proofPack.TIMESTAMP) {
      const now = Date.now();
      const oneHour = 60 * 60 * 1000;
      if (proofPack.TIMESTAMP > now + oneHour) {
        errors.push('TIMESTAMP: cannot be in the future');
      }
    }

    return {
      valid: missing.length === 0 && errors.length === 0,
      missing,
      errors,
    };
  }

  // ----------------------------------------
  // 무결성 해시 재계산 및 검증
  // ----------------------------------------
  static verifyIntegrity(proofPack: CompleteProofPack): boolean {
    // 무결성 해시 재계산
    const combined = JSON.stringify({
      inputLog: proofPack.INPUT_LOG,
      processTrace: proofPack.PROCESS_TRACE,
      outputHash: proofPack.OUTPUT_HASH,
      timestamp: proofPack.TIMESTAMP,
      validatorSig: proofPack.VALIDATOR_SIG,
    });

    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      hash = ((hash << 7) - hash) + combined.charCodeAt(i);
    }

    const expectedHash = `INTEGRITY_${Math.abs(hash).toString(16).toUpperCase().padStart(16, '0')}`;

    return proofPack.integrityHash === expectedHash;
  }
}

// ============================================
// 편의 함수
// ============================================

/**
 * 빠른 ProofPack 생성
 */
export function createQuickProofPack(params: {
  source: string;
  inputId: string;
  inputType: string;
  content: string;
  decision: string;
  lawsApplied: string[];
}): CompleteProofPack {
  return ProofPackBuilder.create()
    .recordInput({
      source: params.source,
      inputId: params.inputId,
      inputType: params.inputType,
      content: params.content,
    })
    .addStage('RECEIVE', 'OK')
    .addStage('PROCESS', 'OK')
    .addStage('DECIDE', params.decision)
    .complete(params.decision, params.lawsApplied)
    .build();
}

/**
 * ProofPack 검증 (K3 준수)
 */
export function validateProofPack(proofPack: CompleteProofPack): boolean {
  const validation = ProofPackValidator.validate(proofPack);
  return validation.valid && ProofPackValidator.verifyIntegrity(proofPack);
}

export default ProofPackBuilder;
