/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🏛️ AUTUS AFTERIMAGE LEDGER
 * Append-only 불변 기록 시스템
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * 규칙:
 * - UPDATE 없음
 * - DELETE 없음
 * - 모든 기록은 결정론적 재현 해시 포함
 * - 동일 입력 = 동일 해시
 * - 설명/평가/주석 필드 없음
 */

import { GateState } from '../physics/constants';

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface AfterimageRecord {
  readonly id: string;
  readonly timestamp: number;
  readonly nodeId: string;
  readonly gateState: GateState;
  readonly entropyDelta: number;
  readonly inertiaDelta: number;
  readonly lat: number;
  readonly lng: number;
  readonly replayHash: string;
  readonly previousHash: string;
}

export interface AfterimageInput {
  nodeId: string;
  gateState: GateState;
  entropyDelta: number;
  inertiaDelta: number;
  lat: number;
  lng: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// DETERMINISTIC HASH FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 결정론적 해시 생성
 * 동일 입력 = 동일 출력 (항상)
 */
function computeReplayHash(
  nodeId: string,
  gateState: GateState,
  entropyDelta: number,
  inertiaDelta: number,
  lat: number,
  lng: number,
  timestamp: number,
  previousHash: string
): string {
  const data = `${nodeId}|${gateState}|${entropyDelta.toFixed(8)}|${inertiaDelta.toFixed(8)}|${lat.toFixed(6)}|${lng.toFixed(6)}|${timestamp}|${previousHash}`;
  
  // Simple deterministic hash (실제로는 SHA-256 등 사용)
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Convert to hex string
  const hashHex = Math.abs(hash).toString(16).padStart(8, '0');
  return `${hashHex}${timestamp.toString(16).slice(-8)}`;
}

/**
 * UUID v4 생성 (결정론적이지 않음 - ID 용도만)
 */
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// LEDGER CLASS (Append-Only)
// ─────────────────────────────────────────────────────────────────────────────

export class AfterImageLedger {
  private readonly records: AfterimageRecord[] = [];
  private readonly GENESIS_HASH = '0000000000000000';

  /**
   * 새 기록 추가 (유일한 쓰기 작업)
   */
  append(input: AfterimageInput): AfterimageRecord {
    const timestamp = Date.now();
    const previousHash = this.records.length > 0 
      ? this.records[this.records.length - 1].replayHash 
      : this.GENESIS_HASH;

    const replayHash = computeReplayHash(
      input.nodeId,
      input.gateState,
      input.entropyDelta,
      input.inertiaDelta,
      input.lat,
      input.lng,
      timestamp,
      previousHash
    );

    const record: AfterimageRecord = Object.freeze({
      id: generateId(),
      timestamp,
      nodeId: input.nodeId,
      gateState: input.gateState,
      entropyDelta: input.entropyDelta,
      inertiaDelta: input.inertiaDelta,
      lat: input.lat,
      lng: input.lng,
      replayHash,
      previousHash
    });

    this.records.push(record);
    return record;
  }

  /**
   * 모든 기록 조회 (읽기 전용)
   */
  getAll(): readonly AfterimageRecord[] {
    return Object.freeze([...this.records]);
  }

  /**
   * 특정 노드의 기록 조회
   */
  getByNode(nodeId: string): readonly AfterimageRecord[] {
    return Object.freeze(this.records.filter(r => r.nodeId === nodeId));
  }

  /**
   * 특정 Gate 상태의 기록 조회
   */
  getByGateState(state: GateState): readonly AfterimageRecord[] {
    return Object.freeze(this.records.filter(r => r.gateState === state));
  }

  /**
   * 시간 범위 조회
   */
  getByTimeRange(start: number, end: number): readonly AfterimageRecord[] {
    return Object.freeze(
      this.records.filter(r => r.timestamp >= start && r.timestamp <= end)
    );
  }

  /**
   * 특정 해시로 기록 조회
   */
  getByHash(hash: string): AfterimageRecord | undefined {
    return this.records.find(r => r.replayHash === hash);
  }

  /**
   * 체인 무결성 검증
   */
  verifyChain(): boolean {
    if (this.records.length === 0) return true;

    // 첫 기록의 previousHash 확인
    if (this.records[0].previousHash !== this.GENESIS_HASH) {
      return false;
    }

    // 체인 연결 검증
    for (let i = 1; i < this.records.length; i++) {
      if (this.records[i].previousHash !== this.records[i - 1].replayHash) {
        return false;
      }
    }

    return true;
  }

  /**
   * 기록 수
   */
  get length(): number {
    return this.records.length;
  }

  /**
   * 마지막 기록
   */
  get lastRecord(): AfterimageRecord | undefined {
    return this.records[this.records.length - 1];
  }

  /**
   * 마지막 해시
   */
  get lastHash(): string {
    return this.lastRecord?.replayHash ?? this.GENESIS_HASH;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SINGLETON INSTANCE
// ─────────────────────────────────────────────────────────────────────────────

let ledgerInstance: AfterImageLedger | null = null;

export function getLedger(): AfterImageLedger {
  if (!ledgerInstance) {
    ledgerInstance = new AfterImageLedger();
  }
  return ledgerInstance;
}

// ─────────────────────────────────────────────────────────────────────────────
// REPLAY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 기록 재현 가능 여부 확인
 */
export function canReplay(record: AfterimageRecord): boolean {
  const computedHash = computeReplayHash(
    record.nodeId,
    record.gateState,
    record.entropyDelta,
    record.inertiaDelta,
    record.lat,
    record.lng,
    record.timestamp,
    record.previousHash
  );
  return computedHash === record.replayHash;
}

/**
 * 전체 체인 재현 검증
 */
export function verifyReplayChain(records: readonly AfterimageRecord[]): boolean {
  return records.every(canReplay);
}
