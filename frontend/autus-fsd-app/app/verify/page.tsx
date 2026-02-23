'use client';

import { useState, useCallback, useRef, DragEvent } from 'react';

/**
 * /verify — 검증 가능한 리포트 페이지
 *
 * 기능:
 * 1. 리포트 파일(JSON) 드래그앤드롭 업로드 → proof_payload 재생성 → leaf_hash 계산
 * 2. 리포트 ID 또는 leaf_hash 직접 입력
 * 3. proof_records에서 해시 조회
 * 4. proof_anchors에서 merkle_root + tx_hash 확인
 * 5. "검증 완료 ✅" or "검증 실패 ❌" 표시
 *
 * ⚠️ 외부 공개 여부 TBD — 코드는 미리 구현
 *
 * 브랜딩 원칙:
 * ❌ "블록체인" → ✅ "검증 가능한 리포트"
 * ❌ "온체인"   → ✅ "위변조 방지 기록"
 */

const SUPABASE_URL = 'https://pphzvnaedmzcvpxjulti.supabase.co';
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

type VerifyStep = 'idle' | 'verifying' | 'success' | 'anchored' | 'failed' | 'error';
type InputMode = 'file' | 'manual';

interface ProofRecord {
  id: string;
  leaf_hash: string;
  proof_payload: {
    schema_version: string;
    tenant_id_hash: string;
    report_id_hash: string;
    period: string;
    metrics_summary: {
      attendance_rate: number;
      shooting_delta: number;
      mdi_band: string;
    };
    policy_version: string;
    generated_at: string;
  };
  created_at: string;
  proof_anchors?: {
    merkle_root: string;
    tx_hash: string | null;
    anchor_date: string;
    anchored_at: string | null;
  } | null;
}

// ============================================================
// leaf_hash 재계산 (클라이언트 사이드)
// proof-generator와 동일 알고리즘: canonical JSON → SHA-256
// ============================================================
async function computeLeafHash(payload: Record<string, any>): Promise<string> {
  const canonical = JSON.stringify(payload, Object.keys(payload).sort());
  const data = new TextEncoder().encode(canonical);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export default function VerifyPage() {
  const [input, setInput] = useState('');
  const [inputType, setInputType] = useState<'report_id' | 'leaf_hash'>('leaf_hash');
  const [inputMode, setInputMode] = useState<InputMode>('file');
  const [step, setStep] = useState<VerifyStep>('idle');
  const [record, setRecord] = useState<ProofRecord | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 파일에서 proof_payload 추출 → leaf_hash 재계산 → DB 조회
  const verifyFromFile = useCallback(async (file: File) => {
    setStep('verifying');
    setRecord(null);
    setErrorMsg('');
    setFileName(file.name);

    try {
      const text = await file.text();
      const json = JSON.parse(text);

      // proof_payload 추출: 파일이 payload 자체이거나, proof_payload 키를 포함
      const payload = json.proof_payload || json;

      // 필수 필드 검증
      if (!payload.schema_version || !payload.tenant_id_hash || !payload.period) {
        throw new Error('유효한 증명 데이터가 아닙니다. schema_version, tenant_id_hash, period 필드가 필요합니다.');
      }

      // leaf_hash 재계산
      const computedHash = await computeLeafHash(payload);

      // DB에서 조회
      await lookupProof(`leaf_hash=eq.${computedHash}`);
    } catch (err: any) {
      if (err.message?.includes('JSON')) {
        setStep('error');
        setErrorMsg('JSON 파일 형식이 올바르지 않습니다.');
      } else {
        setStep('error');
        setErrorMsg(err.message || '파일 검증 중 오류가 발생했습니다.');
      }
    }
  }, []);

  // DB 조회 공통 함수
  const lookupProof = useCallback(async (queryParam: string) => {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/proof_records?${queryParam}&select=*,proof_anchors(merkle_root,tx_hash,anchor_date,anchored_at)`,
      {
        headers: {
          'apikey': ANON_KEY,
          'Authorization': `Bearer ${ANON_KEY}`,
        },
      }
    );

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();

    if (!data || data.length === 0) {
      setStep('failed');
      setErrorMsg('해당 해시에 대한 증명 기록을 찾을 수 없습니다.');
      return;
    }

    const proof = data[0] as ProofRecord;
    setRecord(proof);

    if (proof.proof_anchors?.tx_hash) {
      setStep('anchored');
    } else {
      setStep('success');
    }
  }, []);

  // 수동 입력으로 검증
  const verifyManual = useCallback(async () => {
    if (!input.trim()) return;

    setStep('verifying');
    setRecord(null);
    setErrorMsg('');

    try {
      const param = inputType === 'leaf_hash'
        ? `leaf_hash=eq.${input.trim()}`
        : `report_id=eq.${input.trim()}`;

      await lookupProof(param);
    } catch (err: any) {
      setStep('error');
      setErrorMsg(err.message || '검증 중 오류가 발생했습니다.');
    }
  }, [input, inputType, lookupProof]);

  // 드래그앤드롭 핸들러
  const handleDragOver = (e: DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.json') || file.type === 'application/json')) {
      verifyFromFile(file);
    } else {
      setErrorMsg('JSON 파일만 지원합니다.');
      setStep('error');
    }
  };
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) verifyFromFile(file);
  };

  const resetState = () => {
    setStep('idle');
    setInput('');
    setRecord(null);
    setErrorMsg('');
    setFileName('');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-lg p-6 space-y-6">
        {/* 헤더 */}
        <div className="text-center space-y-2">
          <div className="text-3xl">🔐</div>
          <h1 className="text-xl font-bold text-gray-900">리포트 검증</h1>
          <p className="text-sm text-gray-500">
            훈련 결과 리포트의 위변조 여부를 검증합니다
          </p>
        </div>

        {/* 입력 모드 선택 + 입력 영역 */}
        {(step === 'idle' || step === 'failed' || step === 'error') && (
          <div className="space-y-4">
            {/* 모드 토글: 파일 / 수동 */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setInputMode('file')}
                className={`flex-1 py-2 text-sm rounded-md transition-all ${
                  inputMode === 'file'
                    ? 'bg-white shadow text-blue-600 font-medium'
                    : 'text-gray-500'
                }`}
              >
                파일 검증
              </button>
              <button
                onClick={() => setInputMode('manual')}
                className={`flex-1 py-2 text-sm rounded-md transition-all ${
                  inputMode === 'manual'
                    ? 'bg-white shadow text-blue-600 font-medium'
                    : 'text-gray-500'
                }`}
              >
                직접 입력
              </button>
            </div>

            {/* 파일 드래그앤드롭 */}
            {inputMode === 'file' && (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <div className="text-3xl mb-2">{isDragging ? '📂' : '📄'}</div>
                <p className="text-sm font-medium text-gray-700">
                  {isDragging ? '여기에 놓으세요' : '리포트 파일을 드래그하거나 클릭하세요'}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  JSON 형식 지원 (.json)
                </p>
                <p className="text-[10px] text-gray-300 mt-2">
                  파일 내용은 서버에 전송되지 않습니다. 해시만 비교합니다.
                </p>
              </div>
            )}

            {/* 수동 입력 */}
            {inputMode === 'manual' && (
              <>
                <div className="flex bg-gray-50 rounded-lg p-1">
                  <button
                    onClick={() => setInputType('leaf_hash')}
                    className={`flex-1 py-1.5 text-xs rounded-md transition-all ${
                      inputType === 'leaf_hash'
                        ? 'bg-white shadow text-blue-600 font-medium'
                        : 'text-gray-500'
                    }`}
                  >
                    Leaf Hash
                  </button>
                  <button
                    onClick={() => setInputType('report_id')}
                    className={`flex-1 py-1.5 text-xs rounded-md transition-all ${
                      inputType === 'report_id'
                        ? 'bg-white shadow text-blue-600 font-medium'
                        : 'text-gray-500'
                    }`}
                  >
                    Report ID
                  </button>
                </div>

                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={
                    inputType === 'leaf_hash'
                      ? 'SHA-256 해시값을 입력하세요'
                      : 'Report UUID를 입력하세요'
                  }
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onKeyDown={(e) => e.key === 'Enter' && verifyManual()}
                />

                <button
                  onClick={verifyManual}
                  disabled={!input.trim()}
                  className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
                >
                  검증하기
                </button>
              </>
            )}

            {/* 에러 메시지 */}
            {(step === 'failed' || step === 'error') && errorMsg && (
              <div className={`p-3 rounded-lg text-sm ${
                step === 'failed'
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
              }`}>
                {step === 'failed' ? '❌ ' : '⚠️ '}{errorMsg}
              </div>
            )}
          </div>
        )}

        {/* 로딩 */}
        {step === 'verifying' && (
          <div className="text-center py-8 space-y-4">
            <div className="animate-spin text-4xl">🔍</div>
            <p className="text-gray-600 text-sm">증명 기록을 검색하고 있습니다...</p>
            {fileName && (
              <p className="text-xs text-gray-400">파일: {fileName}</p>
            )}
          </div>
        )}

        {/* 검증 성공 (아직 미앵커) */}
        {step === 'success' && record && (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <div className="text-5xl">✅</div>
              <h2 className="text-lg font-bold text-green-700">증명 기록 확인됨</h2>
              <p className="text-xs text-gray-500">
                이 리포트의 해시가 증명 기록에 등록되어 있습니다
              </p>
            </div>

            <ProofDetails record={record} />

            <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-xs text-yellow-700">
                ⏳ 위변조 방지 기록 대기 중입니다. 일일 배치 처리 후 완전 검증됩니다.
              </p>
            </div>

            <button onClick={resetState} className="w-full py-2 text-sm text-blue-600 hover:underline">
              다른 리포트 검증하기
            </button>
          </div>
        )}

        {/* 완전 검증 (앵커링 완료) */}
        {step === 'anchored' && record && (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <div className="text-5xl">🛡️</div>
              <h2 className="text-lg font-bold text-green-700">검증 완료</h2>
              <p className="text-xs text-gray-500">
                이 리포트는 위변조 방지 시스템에 기록되어 무결성이 보장됩니다
              </p>
            </div>

            <ProofDetails record={record} />

            {/* 앵커 정보 */}
            {record.proof_anchors && (
              <div className="bg-indigo-50 rounded-xl p-4 space-y-2 border border-indigo-200">
                <h3 className="text-sm font-semibold text-indigo-800">검증 앵커</h3>
                <InfoRow label="앵커 일자" value={record.proof_anchors.anchor_date} />
                <InfoRow
                  label="Merkle Root"
                  value={record.proof_anchors.merkle_root}
                  mono
                  truncate
                />
                <InfoRow
                  label="트랜잭션"
                  value={record.proof_anchors.tx_hash || '-'}
                  mono
                  truncate
                />
                {record.proof_anchors.anchored_at && (
                  <InfoRow
                    label="앵커 시간"
                    value={new Date(record.proof_anchors.anchored_at).toLocaleString('ko-KR')}
                  />
                )}
              </div>
            )}

            <button onClick={resetState} className="w-full py-2 text-sm text-blue-600 hover:underline">
              다른 리포트 검증하기
            </button>
          </div>
        )}

        {/* 푸터 */}
        <div className="text-center pt-2 border-t border-gray-100">
          <p className="text-[10px] text-gray-400">
            Powered by AUTUS Decision Physics OS
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 서브 컴포넌트
// ============================================================
function ProofDetails({ record }: { record: ProofRecord }) {
  const p = record.proof_payload;
  return (
    <div className="bg-gray-50 rounded-xl p-4 space-y-2 border border-gray-200">
      <h3 className="text-sm font-semibold text-gray-800">증명 상세</h3>
      <InfoRow label="스키마" value={p.schema_version} />
      <InfoRow label="기간" value={p.period} />
      <InfoRow label="정책 버전" value={p.policy_version} />
      <InfoRow label="생성 시각" value={new Date(p.generated_at).toLocaleString('ko-KR')} />
      <InfoRow label="Leaf Hash" value={record.leaf_hash} mono truncate />
      <div className="pt-1 border-t border-gray-200 mt-2">
        <p className="text-[10px] text-gray-400 mb-1">익명화된 지표 요약</p>
        <div className="grid grid-cols-3 gap-2">
          <MetricBadge label="출석률" value={`${(p.metrics_summary.attendance_rate * 100).toFixed(0)}%`} />
          <MetricBadge label="성장 델타" value={`${p.metrics_summary.shooting_delta > 0 ? '+' : ''}${p.metrics_summary.shooting_delta}`} />
          <MetricBadge label="MDI 밴드" value={p.metrics_summary.mdi_band} />
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, mono, truncate }: {
  label: string; value: string; mono?: boolean; truncate?: boolean;
}) {
  return (
    <div className="flex items-start gap-2 text-xs">
      <span className="text-gray-500 shrink-0 w-20">{label}</span>
      <span className={`text-gray-800 break-all ${mono ? 'font-mono text-[10px]' : ''} ${truncate ? 'line-clamp-1' : ''}`}>
        {value}
      </span>
    </div>
  );
}

function MetricBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-lg p-2 text-center border border-gray-100">
      <div className="text-[10px] text-gray-400">{label}</div>
      <div className="text-sm font-semibold text-gray-800">{value}</div>
    </div>
  );
}
