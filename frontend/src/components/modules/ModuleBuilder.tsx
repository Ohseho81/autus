/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS ModuleBuilder - 30개 모듈 조합 빌더
 * 드래그 앤 드롭으로 업무 파이프라인 생성
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useCallback } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export type ModuleCategory = 'INPUT' | 'PROCESS' | 'OUTPUT' | 'DECISION' | 'COMM';

export interface AtomicModule {
  id: string;
  name: string;
  name_ko: string;
  category: ModuleCategory;
  description: string;
  base_k: number;
  base_i: number;
  is_async: boolean;
  requires_human: boolean;
  can_connect_to: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// 30개 모듈 데이터
// ═══════════════════════════════════════════════════════════════════════════════

const MODULES: AtomicModule[] = [
  // INPUT (6개)
  { id: 'IN_FORM', name: 'Form Input', name_ko: '폼 입력', category: 'INPUT', description: '사용자 입력 폼 데이터 수집', base_k: 0.9, base_i: 0.2, is_async: false, requires_human: true, can_connect_to: ['PR_VALIDATE', 'PR_TRANSFORM', 'PR_CALCULATE'] },
  { id: 'IN_API', name: 'API Fetch', name_ko: 'API 수집', category: 'INPUT', description: '외부 API에서 데이터 수집', base_k: 1.1, base_i: 0.0, is_async: true, requires_human: false, can_connect_to: ['PR_VALIDATE', 'PR_TRANSFORM', 'PR_PARSE'] },
  { id: 'IN_FILE', name: 'File Upload', name_ko: '파일 업로드', category: 'INPUT', description: '파일 업로드 및 추출', base_k: 1.0, base_i: 0.1, is_async: false, requires_human: false, can_connect_to: ['PR_PARSE', 'PR_VALIDATE', 'PR_TRANSFORM'] },
  { id: 'IN_SCAN', name: 'Document Scan', name_ko: '문서 스캔', category: 'INPUT', description: '문서 스캔 및 OCR', base_k: 0.9, base_i: 0.0, is_async: false, requires_human: false, can_connect_to: ['PR_PARSE', 'PR_VALIDATE', 'PR_EXTRACT'] },
  { id: 'IN_STREAM', name: 'Stream Listen', name_ko: '스트림 수신', category: 'INPUT', description: '실시간 데이터 스트림 수신', base_k: 1.2, base_i: 0.0, is_async: true, requires_human: false, can_connect_to: ['PR_FILTER', 'PR_TRANSFORM', 'PR_AGGREGATE'] },
  { id: 'IN_SCHEDULE', name: 'Scheduled Trigger', name_ko: '예약 트리거', category: 'INPUT', description: '시간 기반 자동 트리거', base_k: 1.1, base_i: 0.0, is_async: false, requires_human: false, can_connect_to: ['PR_CALCULATE', 'PR_AGGREGATE', 'OUT_REPORT'] },
  
  // PROCESS (8개)
  { id: 'PR_VALIDATE', name: 'Data Validation', name_ko: '데이터 검증', category: 'PROCESS', description: '데이터 형식 및 규칙 검증', base_k: 1.2, base_i: 0.0, is_async: false, requires_human: false, can_connect_to: ['PR_TRANSFORM', 'DE_RULE', 'OUT_ERROR'] },
  { id: 'PR_TRANSFORM', name: 'Data Transform', name_ko: '데이터 변환', category: 'PROCESS', description: '데이터 형식/구조 변환', base_k: 1.1, base_i: 0.0, is_async: false, requires_human: false, can_connect_to: ['PR_CALCULATE', 'PR_MERGE', 'OUT_DATA'] },
  { id: 'PR_CALCULATE', name: 'Calculate', name_ko: '계산', category: 'PROCESS', description: '수치 연산 및 집계', base_k: 1.2, base_i: 0.0, is_async: false, requires_human: false, can_connect_to: ['DE_THRESHOLD', 'OUT_REPORT', 'PR_AGGREGATE'] },
  { id: 'PR_PARSE', name: 'Parse', name_ko: '파싱', category: 'PROCESS', description: '비정형 데이터 파싱', base_k: 1.0, base_i: 0.0, is_async: false, requires_human: false, can_connect_to: ['PR_EXTRACT', 'PR_VALIDATE', 'PR_TRANSFORM'] },
  { id: 'PR_EXTRACT', name: 'Extract', name_ko: '추출', category: 'PROCESS', description: '특정 필드/패턴 추출', base_k: 1.1, base_i: 0.0, is_async: false, requires_human: false, can_connect_to: ['PR_VALIDATE', 'PR_TRANSFORM', 'DE_MATCH'] },
  { id: 'PR_MERGE', name: 'Merge', name_ko: '병합', category: 'PROCESS', description: '다중 소스 데이터 병합', base_k: 1.0, base_i: 0.1, is_async: false, requires_human: false, can_connect_to: ['PR_CALCULATE', 'PR_VALIDATE', 'OUT_DATA'] },
  { id: 'PR_FILTER', name: 'Filter', name_ko: '필터링', category: 'PROCESS', description: '조건 기반 데이터 필터링', base_k: 1.1, base_i: 0.0, is_async: false, requires_human: false, can_connect_to: ['PR_TRANSFORM', 'DE_RULE', 'PR_AGGREGATE'] },
  { id: 'PR_AGGREGATE', name: 'Aggregate', name_ko: '집계', category: 'PROCESS', description: '데이터 그룹화 및 집계', base_k: 1.1, base_i: 0.0, is_async: false, requires_human: false, can_connect_to: ['PR_CALCULATE', 'OUT_REPORT', 'DE_THRESHOLD'] },
  
  // OUTPUT (6개)
  { id: 'OUT_DATA', name: 'Data Output', name_ko: '데이터 출력', category: 'OUTPUT', description: '구조화된 데이터 출력', base_k: 1.0, base_i: 0.0, is_async: false, requires_human: false, can_connect_to: ['CM_API', 'CM_STORE', 'CM_NOTIFY'] },
  { id: 'OUT_REPORT', name: 'Report Generate', name_ko: '보고서 생성', category: 'OUTPUT', description: '보고서/문서 생성', base_k: 0.9, base_i: 0.1, is_async: false, requires_human: false, can_connect_to: ['CM_EMAIL', 'CM_STORE', 'DE_APPROVE'] },
  { id: 'OUT_DOC', name: 'Document Generate', name_ko: '문서 생성', category: 'OUTPUT', description: '계약서/인보이스 등 문서 생성', base_k: 0.9, base_i: 0.0, is_async: false, requires_human: false, can_connect_to: ['DE_APPROVE', 'CM_EMAIL', 'CM_STORE'] },
  { id: 'OUT_VISUAL', name: 'Visualization', name_ko: '시각화', category: 'OUTPUT', description: '차트/그래프 생성', base_k: 1.0, base_i: 0.1, is_async: false, requires_human: false, can_connect_to: ['OUT_REPORT', 'CM_NOTIFY', 'CM_STORE'] },
  { id: 'OUT_ERROR', name: 'Error Output', name_ko: '오류 출력', category: 'OUTPUT', description: '오류/예외 리포트', base_k: 0.8, base_i: 0.0, is_async: false, requires_human: false, can_connect_to: ['CM_NOTIFY', 'CM_ESCALATE', 'DE_MANUAL'] },
  { id: 'OUT_LOG', name: 'Audit Log', name_ko: '감사 로그', category: 'OUTPUT', description: '감사 추적 로그 생성', base_k: 1.2, base_i: 0.0, is_async: false, requires_human: false, can_connect_to: ['CM_STORE', 'DE_APPROVE'] },
  
  // DECISION (5개)
  { id: 'DE_RULE', name: 'Rule Engine', name_ko: '규칙 엔진', category: 'DECISION', description: '비즈니스 규칙 기반 판단', base_k: 1.1, base_i: 0.0, is_async: false, requires_human: false, can_connect_to: ['DE_APPROVE', 'OUT_ERROR', 'CM_NOTIFY'] },
  { id: 'DE_THRESHOLD', name: 'Threshold Check', name_ko: '임계값 체크', category: 'DECISION', description: '수치 임계값 기반 판단', base_k: 1.2, base_i: 0.0, is_async: false, requires_human: false, can_connect_to: ['DE_APPROVE', 'CM_ESCALATE', 'OUT_ERROR'] },
  { id: 'DE_MATCH', name: 'Pattern Match', name_ko: '패턴 매칭', category: 'DECISION', description: '패턴/템플릿 매칭 판단', base_k: 1.1, base_i: 0.0, is_async: false, requires_human: false, can_connect_to: ['DE_RULE', 'PR_TRANSFORM', 'OUT_DATA'] },
  { id: 'DE_APPROVE', name: 'Approval Request', name_ko: '승인 요청', category: 'DECISION', description: '인간 승인 요청', base_k: 0.7, base_i: 0.3, is_async: false, requires_human: true, can_connect_to: ['CM_NOTIFY', 'OUT_LOG', 'CM_STORE'] },
  { id: 'DE_MANUAL', name: 'Manual Override', name_ko: '수동 개입', category: 'DECISION', description: '수동 처리 요청', base_k: 0.5, base_i: 0.4, is_async: false, requires_human: true, can_connect_to: ['CM_NOTIFY', 'OUT_LOG'] },
  
  // COMM (5개)
  { id: 'CM_NOTIFY', name: 'Notification', name_ko: '알림 발송', category: 'COMM', description: '알림/메시지 발송', base_k: 1.0, base_i: 0.2, is_async: true, requires_human: false, can_connect_to: [] },
  { id: 'CM_EMAIL', name: 'Email Send', name_ko: '이메일 발송', category: 'COMM', description: '이메일 발송', base_k: 1.0, base_i: 0.1, is_async: true, requires_human: false, can_connect_to: [] },
  { id: 'CM_API', name: 'API Call', name_ko: 'API 호출', category: 'COMM', description: '외부 시스템 API 호출', base_k: 1.1, base_i: 0.0, is_async: true, requires_human: false, can_connect_to: ['IN_API', 'PR_TRANSFORM'] },
  { id: 'CM_STORE', name: 'Data Store', name_ko: '데이터 저장', category: 'COMM', description: '데이터베이스/스토리지 저장', base_k: 1.1, base_i: 0.0, is_async: false, requires_human: false, can_connect_to: [] },
  { id: 'CM_ESCALATE', name: 'Escalation', name_ko: '에스컬레이션', category: 'COMM', description: '상위 레벨로 에스컬레이션', base_k: 0.8, base_i: 0.3, is_async: false, requires_human: false, can_connect_to: ['CM_NOTIFY', 'DE_MANUAL'] },
];

const CATEGORY_CONFIG: Record<ModuleCategory, { color: string; label: string; icon: string }> = {
  INPUT: { color: '#3B82F6', label: '입력', icon: '📥' },
  PROCESS: { color: '#10B981', label: '처리', icon: '⚙️' },
  OUTPUT: { color: '#F59E0B', label: '출력', icon: '📤' },
  DECISION: { color: '#8B5CF6', label: '판단', icon: '🎯' },
  COMM: { color: '#EF4444', label: '통신', icon: '📡' },
};

// ═══════════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════════

interface ModuleBuilderProps {
  onPipelineCreate?: (modules: string[]) => void;
}

export function ModuleBuilder({ onPipelineCreate }: ModuleBuilderProps) {
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [pipelineName, setPipelineName] = useState('');
  const [activeCategory, setActiveCategory] = useState<ModuleCategory | 'ALL'>('ALL');

  const filteredModules = activeCategory === 'ALL' 
    ? MODULES 
    : MODULES.filter(m => m.category === activeCategory);

  const addModule = useCallback((moduleId: string) => {
    if (selectedModules.length >= 7) return;
    if (selectedModules.includes(moduleId)) return;
    
    setSelectedModules(prev => [...prev, moduleId]);
  }, [selectedModules]);

  const removeModule = useCallback((index: number) => {
    setSelectedModules(prev => prev.filter((_, i) => i !== index));
  }, []);

  const getModule = (id: string) => MODULES.find(m => m.id === id);

  const computePhysics = () => {
    if (selectedModules.length === 0) return { k: 1.0, i: 0.0 };
    
    let totalK = 0, totalI = 0;
    selectedModules.forEach(id => {
      const m = getModule(id);
      if (m) {
        totalK += m.base_k;
        totalI += m.base_i;
      }
    });
    
    const n = selectedModules.length;
    return {
      k: Math.round((totalK / n) * 100) / 100,
      i: Math.round((totalI / n) * 100) / 100,
    };
  };

  const isValidConnection = (fromId: string, toId: string) => {
    const from = getModule(fromId);
    return from?.can_connect_to.includes(toId);
  };

  const validatePipeline = () => {
    if (selectedModules.length < 2) return { valid: false, error: '최소 2개 모듈 필요' };
    
    for (let i = 0; i < selectedModules.length - 1; i++) {
      if (!isValidConnection(selectedModules[i], selectedModules[i + 1])) {
        return { valid: false, error: `${selectedModules[i]} → ${selectedModules[i+1]} 연결 불가` };
      }
    }
    
    return { valid: true, error: '' };
  };

  const handleCreate = () => {
    const validation = validatePipeline();
    if (!validation.valid) {
      alert(validation.error);
      return;
    }
    onPipelineCreate?.(selectedModules);
  };

  const physics = computePhysics();
  const validation = validatePipeline();

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">🧩 모듈 빌더</h1>
        <p className="text-gray-400">30개 원자 모듈을 조합하여 업무 파이프라인 생성</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 모듈 팔레트 */}
        <div className="lg:col-span-2 space-y-4">
          {/* 카테고리 필터 */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setActiveCategory('ALL')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeCategory === 'ALL' ? 'bg-white/20' : 'bg-gray-800 hover:bg-gray-700'
              }`}
            >
              전체 (30)
            </button>
            {Object.entries(CATEGORY_CONFIG).map(([cat, config]) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat as ModuleCategory)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  activeCategory === cat ? 'bg-white/20' : 'bg-gray-800 hover:bg-gray-700'
                }`}
                style={{ borderLeft: `3px solid ${config.color}` }}
              >
                <span>{config.icon}</span>
                <span>{config.label}</span>
                <span className="text-gray-500">
                  ({MODULES.filter(m => m.category === cat).length})
                </span>
              </button>
            ))}
          </div>

          {/* 모듈 그리드 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {filteredModules.map(module => {
              const config = CATEGORY_CONFIG[module.category];
              const isSelected = selectedModules.includes(module.id);
              const canAdd = selectedModules.length < 7 && !isSelected;
              
              return (
                <button
                  key={module.id}
                  onClick={() => addModule(module.id)}
                  disabled={!canAdd}
                  className={`
                    p-3 rounded-xl text-left transition-all
                    ${isSelected 
                      ? 'bg-gray-700 opacity-50 cursor-not-allowed' 
                      : canAdd 
                        ? 'bg-gray-800 hover:bg-gray-700 hover:scale-105' 
                        : 'bg-gray-800 opacity-30 cursor-not-allowed'
                    }
                  `}
                  style={{ borderLeft: `4px solid ${config.color}` }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span>{config.icon}</span>
                    <span className="text-xs text-gray-400">{module.id}</span>
                  </div>
                  <p className="font-medium text-sm">{module.name_ko}</p>
                  <p className="text-xs text-gray-500 truncate">{module.description}</p>
                  <div className="flex gap-2 mt-2 text-xs">
                    <span className="text-blue-400">K:{module.base_k}</span>
                    <span className="text-green-400">I:{module.base_i}</span>
                    {module.requires_human && <span className="text-amber-400">👤</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 파이프라인 빌더 */}
        <div className="space-y-4">
          {/* 선택된 모듈 */}
          <div className="bg-gray-800 rounded-xl p-4">
            <h3 className="font-semibold mb-3">파이프라인 ({selectedModules.length}/7)</h3>
            
            {selectedModules.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>모듈을 클릭하여 추가하세요</p>
                <p className="text-xs mt-1">최소 2개, 최대 7개</p>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedModules.map((moduleId, index) => {
                  const module = getModule(moduleId);
                  if (!module) return null;
                  
                  const config = CATEGORY_CONFIG[module.category];
                  const isLastValid = index === selectedModules.length - 1 || 
                    isValidConnection(moduleId, selectedModules[index + 1]);
                  
                  return (
                    <div key={`${moduleId}-${index}`}>
                      <div 
                        className={`
                          flex items-center justify-between p-3 rounded-lg
                          ${isLastValid ? 'bg-gray-700' : 'bg-red-900/30'}
                        `}
                        style={{ borderLeft: `4px solid ${config.color}` }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{config.icon}</span>
                          <div>
                            <p className="font-medium text-sm">{module.name_ko}</p>
                            <p className="text-xs text-gray-400">{module.id}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => removeModule(index)}
                          className="p-1 hover:bg-gray-600 rounded"
                        >
                          ✕
                        </button>
                      </div>
                      
                      {index < selectedModules.length - 1 && (
                        <div className="flex justify-center py-1">
                          <span className={isLastValid ? 'text-gray-500' : 'text-red-400'}>
                            {isLastValid ? '↓' : '⚠️'}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 물리 상수 */}
          <div className="bg-gray-800 rounded-xl p-4">
            <h3 className="font-semibold mb-3">계산된 물리 상수</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-blue-500/10 rounded-lg">
                <p className="text-2xl font-bold text-blue-400">{physics.k}</p>
                <p className="text-xs text-gray-400">K (숙련도)</p>
              </div>
              <div className="text-center p-3 bg-green-500/10 rounded-lg">
                <p className="text-2xl font-bold text-green-400">{physics.i}</p>
                <p className="text-xs text-gray-400">I (협업도)</p>
              </div>
            </div>
          </div>

          {/* 유효성 검사 */}
          <div className={`p-4 rounded-xl ${validation.valid ? 'bg-green-900/20' : 'bg-red-900/20'}`}>
            <div className="flex items-center gap-2">
              <span>{validation.valid ? '✅' : '⚠️'}</span>
              <span className={validation.valid ? 'text-green-400' : 'text-red-400'}>
                {validation.valid ? '유효한 파이프라인' : validation.error}
              </span>
            </div>
          </div>

          {/* 생성 버튼 */}
          <input
            type="text"
            value={pipelineName}
            onChange={(e) => setPipelineName(e.target.value)}
            placeholder="파이프라인 이름"
            className="w-full px-4 py-3 bg-gray-800 rounded-xl border border-gray-700 focus:border-blue-500 outline-none"
          />
          
          <button
            onClick={handleCreate}
            disabled={!validation.valid || !pipelineName}
            className={`
              w-full py-4 rounded-xl font-semibold transition-all
              ${validation.valid && pipelineName
                ? 'bg-blue-500 hover:bg-blue-600'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            파이프라인 생성
          </button>

          {/* 통계 */}
          <div className="text-center text-xs text-gray-500">
            <p>30개 모듈 × 조합 = 1,000+ 업무 자동화 가능</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ModuleBuilder;
