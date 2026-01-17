/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS 2026 Solution Dashboard
 * 30개 솔루션 모듈 시각화 대시보드
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useMemo } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

type Category = 'INFRA' | 'DATA' | 'CORE' | 'UX' | 'SECURITY';
type Priority = 'P0' | 'P1' | 'P2' | 'P3';

interface SolutionModule {
  id: number;
  code: string;
  name: string;
  name_ko: string;
  category: Category;
  description: string;
  trend_keywords: string[];
  tech_stack: string[];
  priority: Priority;
  complexity: number;
  estimated_days: number;
  depends_on: string[];
  affects_k: boolean;
  affects_i: boolean;
  affects_r: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 30개 솔루션 모듈 데이터
// ═══════════════════════════════════════════════════════════════════════════════

const SOLUTION_MODULES: SolutionModule[] = [
  // INFRA (6개)
  { id: 1, code: 'M01', name: 'Governance-as-Code Engine', name_ko: '거버넌스 코드 엔진', category: 'INFRA', description: '정책·컴플라이언스 자동 적용', trend_keywords: ['governance-as-code'], tech_stack: ['TypeDB', 'LangGraph'], priority: 'P0', complexity: 4, estimated_days: 7, depends_on: [], affects_k: true, affects_i: false, affects_r: true },
  { id: 2, code: 'M02', name: 'Multi-Agent Orchestrator', name_ko: '멀티 에이전트 오케스트레이터', category: 'INFRA', description: '에이전트 간 협업·태스크 분배', trend_keywords: ['agentic-ai', 'multi-agent'], tech_stack: ['LangGraph', 'CrewAI'], priority: 'P0', complexity: 5, estimated_days: 10, depends_on: [], affects_k: true, affects_i: true, affects_r: false },
  { id: 3, code: 'M03', name: 'Human-in-the-Loop Gateway', name_ko: '휴먼 인 더 루프 게이트웨이', category: 'INFRA', description: '위험 시 human escalation', trend_keywords: ['human-in-loop'], tech_stack: ['Socket.io', 'LangSmith'], priority: 'P0', complexity: 3, estimated_days: 5, depends_on: ['M02'], affects_k: false, affects_i: true, affects_r: true },
  { id: 4, code: 'M04', name: 'Audit & Observability Hub', name_ko: '감사 & 관측성 허브', category: 'INFRA', description: '모든 워크플로우 로그·메트릭 추적', trend_keywords: ['observability'], tech_stack: ['LangSmith', 'Prometheus', 'TypeDB'], priority: 'P0', complexity: 4, estimated_days: 7, depends_on: [], affects_k: true, affects_i: false, affects_r: true },
  { id: 5, code: 'M05', name: 'Rollback & Canary Manager', name_ko: '롤백 & 카나리 매니저', category: 'INFRA', description: '자동 롤백 + Canary 배포', trend_keywords: ['canary-deployment'], tech_stack: ['Airflow', 'Kubernetes'], priority: 'P1', complexity: 4, estimated_days: 6, depends_on: ['M04'], affects_k: true, affects_i: false, affects_r: true },
  { id: 6, code: 'M06', name: 'Version & Drift Detector', name_ko: '버전 & 드리프트 감지기', category: 'INFRA', description: 'LLM/기술 drift 감지', trend_keywords: ['drift-detection'], tech_stack: ['Pinecone', 'DeepSeek-R1'], priority: 'P1', complexity: 4, estimated_days: 5, depends_on: [], affects_k: true, affects_i: false, affects_r: false },
  
  // DATA (6개)
  { id: 7, code: 'M07', name: 'Hybrid Retrieval Engine', name_ko: '하이브리드 검색 엔진', category: 'DATA', description: 'Pinecone + TypeDB 결합 검색', trend_keywords: ['hybrid-search', 'rag'], tech_stack: ['Pinecone', 'TypeDB'], priority: 'P1', complexity: 4, estimated_days: 7, depends_on: [], affects_k: true, affects_i: false, affects_r: false },
  { id: 8, code: 'M08', name: 'RAG Knowledge Refresher', name_ko: 'RAG 지식 갱신기', category: 'DATA', description: '실시간 지식 업데이트', trend_keywords: ['rag', 'knowledge-update'], tech_stack: ['Airflow', 'Pinecone'], priority: 'P1', complexity: 3, estimated_days: 4, depends_on: ['M07'], affects_k: true, affects_i: false, affects_r: false },
  { id: 9, code: 'M09', name: 'Entity Graph Builder', name_ko: '엔티티 그래프 빌더', category: 'DATA', description: 'TypeDB 자동 엔티티·관계 추출', trend_keywords: ['knowledge-graph'], tech_stack: ['TypeDB', 'Llama-3.3'], priority: 'P2', complexity: 4, estimated_days: 6, depends_on: [], affects_k: true, affects_i: true, affects_r: false },
  { id: 10, code: 'M10', name: 'Inertia Debt Forecaster', name_ko: '관성 부채 예측기', category: 'DATA', description: 'ΔṠ·Inertia Debt 예측', trend_keywords: ['forecasting'], tech_stack: ['DeepSeek-R1', 'TypeDB'], priority: 'P2', complexity: 5, estimated_days: 8, depends_on: [], affects_k: true, affects_i: true, affects_r: true },
  { id: 11, code: 'M11', name: 'Metric Dashboard Aggregator', name_ko: '메트릭 대시보드 집계기', category: 'DATA', description: 'K/I Physics 실시간 집계', trend_keywords: ['metrics', 'real-time'], tech_stack: ['Prometheus', 'Socket.io'], priority: 'P1', complexity: 3, estimated_days: 4, depends_on: [], affects_k: true, affects_i: true, affects_r: false },
  { id: 12, code: 'M12', name: 'Breaking Change Simulator', name_ko: '브레이킹 체인지 시뮬레이터', category: 'DATA', description: '업데이트 전 Sandbox 시뮬레이션', trend_keywords: ['simulation', 'sandbox'], tech_stack: ['CrewAI', 'LangGraph'], priority: 'P2', complexity: 4, estimated_days: 6, depends_on: ['M06'], affects_k: true, affects_i: false, affects_r: true },
  
  // CORE (10개)
  { id: 13, code: 'M13', name: 'Monthly Tech Update Agent', name_ko: '월간 기술 업데이트 에이전트', category: 'CORE', description: '외부 기술 월 1회 자동 체크·적용', trend_keywords: ['auto-update'], tech_stack: ['Airflow', 'LangGraph', 'CrewAI'], priority: 'P0', complexity: 4, estimated_days: 7, depends_on: ['M06', 'M08'], affects_k: true, affects_i: false, affects_r: false },
  { id: 14, code: 'M14', name: 'Command Center Processor', name_ko: '커맨드 센터 프로세서', category: 'CORE', description: '자연어 명령 → 워크플로우 매핑', trend_keywords: ['nlp', 'voice-control'], tech_stack: ['Llama-3.3', 'DeepSeek-R1', 'Socket.io'], priority: 'P1', complexity: 4, estimated_days: 6, depends_on: [], affects_k: true, affects_i: true, affects_r: false },
  { id: 15, code: 'M15', name: 'Task Prioritization & Routing', name_ko: '업무 우선순위 & 라우팅', category: 'CORE', description: '업무 자동 분배', trend_keywords: ['task-routing'], tech_stack: ['LangGraph', 'DeepSeek-R1'], priority: 'P0', complexity: 3, estimated_days: 5, depends_on: ['M02'], affects_k: true, affects_i: true, affects_r: false },
  { id: 16, code: 'M16', name: 'Workflow Pipeline Builder', name_ko: '워크플로우 파이프라인 빌더', category: 'CORE', description: 'drag-and-drop workflow 생성', trend_keywords: ['low-code'], tech_stack: ['LangGraph'], priority: 'P1', complexity: 4, estimated_days: 8, depends_on: [], affects_k: true, affects_i: false, affects_r: false },
  { id: 17, code: 'M17', name: 'Predictive Forecasting Agent', name_ko: '예측 에이전트', category: 'CORE', description: '트렌드·예측', trend_keywords: ['forecasting'], tech_stack: ['DeepSeek-R1', 'Pinecone'], priority: 'P2', complexity: 4, estimated_days: 6, depends_on: [], affects_k: true, affects_i: false, affects_r: true },
  { id: 18, code: 'M18', name: 'MoneyFlow & Resource Optimizer', name_ko: '자금 흐름 & 리소스 최적화기', category: 'CORE', description: '자금·리소스 흐름 자동 최적화', trend_keywords: ['resource-optimization'], tech_stack: ['DeepSeek-R1', 'Pinecone'], priority: 'P2', complexity: 5, estimated_days: 8, depends_on: [], affects_k: true, affects_i: false, affects_r: true },
  { id: 19, code: 'M19', name: 'Learning & Self-Evolution Loop', name_ko: '학습 & 자기 진화 루프', category: 'CORE', description: '피드백 → 상수·계수 자동 재계산', trend_keywords: ['self-learning', 'meta-loop'], tech_stack: ['TypeDB', 'LangGraph'], priority: 'P0', complexity: 5, estimated_days: 10, depends_on: ['M10', 'M11'], affects_k: true, affects_i: true, affects_r: true },
  { id: 20, code: 'M20', name: 'Onboarding & Archetype Adapter', name_ko: '온보딩 & 아키타입 어댑터', category: 'CORE', description: '사용자 유형별 자동 맞춤 온보딩', trend_keywords: ['personalization'], tech_stack: ['Llama-3.3', 'TypeDB'], priority: 'P2', complexity: 3, estimated_days: 5, depends_on: [], affects_k: true, affects_i: true, affects_r: false },
  { id: 21, code: 'M21', name: 'Log & Anomaly Analyzer', name_ko: '로그 & 이상 탐지 분석기', category: 'CORE', description: '실시간 이상 탐지·요약', trend_keywords: ['anomaly-detection'], tech_stack: ['LangSmith', 'Llama-3.3'], priority: 'P1', complexity: 3, estimated_days: 4, depends_on: ['M04'], affects_k: true, affects_i: false, affects_r: true },
  { id: 22, code: 'M22', name: 'Integration Health Checker', name_ko: '연동 상태 체커', category: 'CORE', description: '외부 API·LLM 연결 상태 점검', trend_keywords: ['health-check'], tech_stack: ['Prometheus', 'Socket.io'], priority: 'P1', complexity: 2, estimated_days: 3, depends_on: [], affects_k: true, affects_i: false, affects_r: false },
  
  // UX (5개)
  { id: 23, code: 'M23', name: 'Trinity Engine Dashboard', name_ko: '트리니티 엔진 대시보드', category: 'UX', description: '전체 시스템 상태 한눈에', trend_keywords: ['dashboard'], tech_stack: ['Socket.io'], priority: 'P0', complexity: 4, estimated_days: 6, depends_on: [], affects_k: false, affects_i: false, affects_r: false },
  { id: 24, code: 'M24', name: 'Cosmos / Universe View', name_ko: '코스모스 / 유니버스 뷰', category: 'UX', description: '시스템 전체를 우주 메타포로', trend_keywords: ['3d-visualization'], tech_stack: ['Socket.io'], priority: 'P2', complexity: 5, estimated_days: 8, depends_on: [], affects_k: false, affects_i: false, affects_r: false },
  { id: 25, code: 'M25', name: 'Node Detail & Relationship Explorer', name_ko: '노드 상세 & 관계 탐색기', category: 'UX', description: '노드 클릭 시 상세·관계 그래프', trend_keywords: ['graph-exploration'], tech_stack: ['TypeDB', 'Socket.io'], priority: 'P2', complexity: 4, estimated_days: 5, depends_on: ['M09'], affects_k: false, affects_i: false, affects_r: false },
  { id: 26, code: 'M26', name: 'GameUI & Engagement Layer', name_ko: '게임 UI & 인게이지먼트 레이어', category: 'UX', description: '포인트·뱃지·리더보드', trend_keywords: ['gamification'], tech_stack: ['Socket.io', 'TypeDB'], priority: 'P3', complexity: 3, estimated_days: 5, depends_on: [], affects_k: false, affects_i: true, affects_r: false },
  { id: 27, code: 'M27', name: 'Mobile & Voice Adaptive UI', name_ko: '모바일 & 음성 적응형 UI', category: 'UX', description: '모바일 드로어 + 음성 명령', trend_keywords: ['mobile', 'voice-ui'], tech_stack: ['Socket.io'], priority: 'P2', complexity: 3, estimated_days: 5, depends_on: ['M14'], affects_k: false, affects_i: true, affects_r: false },
  
  // SECURITY (3개)
  { id: 28, code: 'M28', name: 'RBAC & Access Control Layer', name_ko: 'RBAC & 접근 제어 레이어', category: 'SECURITY', description: '역할 기반 접근 제어', trend_keywords: ['rbac'], tech_stack: ['TypeDB'], priority: 'P0', complexity: 3, estimated_days: 5, depends_on: [], affects_k: false, affects_i: true, affects_r: true },
  { id: 29, code: 'M29', name: 'Compliance & Encryption Wrapper', name_ko: '컴플라이언스 & 암호화 래퍼', category: 'SECURITY', description: '데이터 암호화·감사 추적', trend_keywords: ['encryption', 'compliance'], tech_stack: ['TypeDB'], priority: 'P1', complexity: 4, estimated_days: 6, depends_on: ['M01', 'M04'], affects_k: false, affects_i: false, affects_r: true },
  { id: 30, code: 'M30', name: 'Scalable Deployment Manager', name_ko: '스케일러블 배포 매니저', category: 'SECURITY', description: 'K8s manifest 자동 생성·배포', trend_keywords: ['kubernetes', 'scaling'], tech_stack: ['Kubernetes', 'Airflow'], priority: 'P2', complexity: 5, estimated_days: 8, depends_on: ['M05'], affects_k: true, affects_i: false, affects_r: false },
];

// ═══════════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════════

const CATEGORY_CONFIG: Record<Category, { color: string; icon: string; name: string }> = {
  INFRA: { color: '#3B82F6', icon: '🏗️', name: '인프라 & 거버넌스' },
  DATA: { color: '#10B981', icon: '📊', name: '데이터 & 지식' },
  CORE: { color: '#F59E0B', icon: '⚙️', name: '핵심 업무 자동화' },
  UX: { color: '#8B5CF6', icon: '🎨', name: '시각화 & UX' },
  SECURITY: { color: '#EF4444', icon: '🔒', name: '보안 & 확장성' },
};

const PRIORITY_CONFIG: Record<Priority, { color: string; name: string }> = {
  P0: { color: '#EF4444', name: '즉시' },
  P1: { color: '#F59E0B', name: '높음' },
  P2: { color: '#10B981', name: '중간' },
  P3: { color: '#6B7280', name: '낮음' },
};

// ═══════════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════════

export function SolutionDashboard() {
  const [selectedModule, setSelectedModule] = useState<SolutionModule | null>(null);
  const [filterCategory, setFilterCategory] = useState<Category | 'ALL'>('ALL');
  const [filterPriority, setFilterPriority] = useState<Priority | 'ALL'>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'roadmap'>('grid');

  const filteredModules = useMemo(() => {
    return SOLUTION_MODULES.filter(m => {
      if (filterCategory !== 'ALL' && m.category !== filterCategory) return false;
      if (filterPriority !== 'ALL' && m.priority !== filterPriority) return false;
      return true;
    });
  }, [filterCategory, filterPriority]);

  const stats = useMemo(() => {
    const totalDays = SOLUTION_MODULES.reduce((sum, m) => sum + m.estimated_days, 0);
    const byPriority = {
      P0: SOLUTION_MODULES.filter(m => m.priority === 'P0'),
      P1: SOLUTION_MODULES.filter(m => m.priority === 'P1'),
      P2: SOLUTION_MODULES.filter(m => m.priority === 'P2'),
      P3: SOLUTION_MODULES.filter(m => m.priority === 'P3'),
    };
    return { totalDays, byPriority };
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">🚀 2026 Solution Modules</h1>
        <p className="text-gray-400">
          Agentic AI · Multi-Agent · Hyperautomation · Governance-as-Code
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {Object.entries(CATEGORY_CONFIG).map(([cat, config]) => {
          const count = SOLUTION_MODULES.filter(m => m.category === cat).length;
          return (
            <div 
              key={cat}
              className="bg-gray-800 rounded-xl p-4 cursor-pointer hover:bg-gray-700 transition-colors"
              onClick={() => setFilterCategory(filterCategory === cat ? 'ALL' : cat as Category)}
              style={{ borderLeft: `4px solid ${config.color}` }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{config.icon}</span>
                <span className="text-2xl font-bold">{count}</span>
              </div>
              <p className="text-xs text-gray-400">{config.name}</p>
            </div>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex gap-2">
          <span className="text-gray-400 self-center">우선순위:</span>
          <button
            onClick={() => setFilterPriority('ALL')}
            className={`px-3 py-1.5 rounded-lg text-sm ${
              filterPriority === 'ALL' ? 'bg-white/20' : 'bg-gray-800'
            }`}
          >
            전체
          </button>
          {Object.entries(PRIORITY_CONFIG).map(([pri, config]) => (
            <button
              key={pri}
              onClick={() => setFilterPriority(filterPriority === pri ? 'ALL' : pri as Priority)}
              className={`px-3 py-1.5 rounded-lg text-sm flex items-center gap-1 ${
                filterPriority === pri ? 'bg-white/20' : 'bg-gray-800'
              }`}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: config.color }} />
              {config.name}
            </button>
          ))}
        </div>

        <div className="ml-auto flex gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-4 py-2 rounded-lg ${viewMode === 'grid' ? 'bg-blue-500' : 'bg-gray-800'}`}
          >
            그리드
          </button>
          <button
            onClick={() => setViewMode('roadmap')}
            className={`px-4 py-2 rounded-lg ${viewMode === 'roadmap' ? 'bg-blue-500' : 'bg-gray-800'}`}
          >
            로드맵
          </button>
        </div>
      </div>

      {/* Module Grid */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredModules.map(module => {
            const catConfig = CATEGORY_CONFIG[module.category];
            const priConfig = PRIORITY_CONFIG[module.priority];
            
            return (
              <div
                key={module.code}
                onClick={() => setSelectedModule(module)}
                className="bg-gray-800 rounded-xl p-4 cursor-pointer hover:bg-gray-700 transition-all hover:scale-[1.02]"
                style={{ borderLeft: `4px solid ${catConfig.color}` }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{catConfig.icon}</span>
                    <span className="text-xs text-gray-500">{module.code}</span>
                  </div>
                  <span 
                    className="px-2 py-0.5 rounded text-xs"
                    style={{ backgroundColor: `${priConfig.color}20`, color: priConfig.color }}
                  >
                    {priConfig.name}
                  </span>
                </div>
                
                <h3 className="font-semibold mb-1">{module.name_ko}</h3>
                <p className="text-sm text-gray-400 mb-3">{module.description}</p>
                
                <div className="flex flex-wrap gap-1 mb-3">
                  {module.tech_stack.slice(0, 3).map(tech => (
                    <span key={tech} className="px-2 py-0.5 bg-gray-700 rounded text-xs">
                      {tech}
                    </span>
                  ))}
                  {module.tech_stack.length > 3 && (
                    <span className="px-2 py-0.5 bg-gray-700 rounded text-xs">
                      +{module.tech_stack.length - 3}
                    </span>
                  )}
                </div>
                
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>복잡도: {'⬛'.repeat(module.complexity)}{'⬜'.repeat(5 - module.complexity)}</span>
                  <span>{module.estimated_days}일</span>
                </div>
                
                {module.depends_on.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-700 text-xs text-gray-500">
                    의존: {module.depends_on.join(', ')}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Roadmap View */}
      {viewMode === 'roadmap' && (
        <div className="space-y-4">
          {(['P0', 'P1', 'P2', 'P3'] as Priority[]).map(priority => {
            const modules = filteredModules.filter(m => m.priority === priority);
            if (modules.length === 0) return null;
            
            const priConfig = PRIORITY_CONFIG[priority];
            const totalDays = modules.reduce((sum, m) => sum + m.estimated_days, 0);
            
            return (
              <div key={priority} className="bg-gray-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: priConfig.color }}
                    />
                    <h3 className="font-semibold">{priConfig.name} ({modules.length}개)</h3>
                  </div>
                  <span className="text-gray-400">{totalDays}일</span>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                  {modules.map(module => {
                    const catConfig = CATEGORY_CONFIG[module.category];
                    return (
                      <div
                        key={module.code}
                        onClick={() => setSelectedModule(module)}
                        className="p-3 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600 transition-colors"
                      >
                        <div className="flex items-center gap-1 mb-1">
                          <span>{catConfig.icon}</span>
                          <span className="text-xs text-gray-400">{module.code}</span>
                        </div>
                        <p className="text-sm font-medium truncate">{module.name_ko}</p>
                        <p className="text-xs text-gray-500">{module.estimated_days}일</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Module Detail Modal */}
      {selectedModule && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedModule(null)}
        >
          <div 
            className="bg-gray-800 rounded-2xl p-6 max-w-lg w-full max-h-[80vh] overflow-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">{CATEGORY_CONFIG[selectedModule.category].icon}</span>
                  <span className="text-gray-400">{selectedModule.code}</span>
                </div>
                <h2 className="text-xl font-bold">{selectedModule.name_ko}</h2>
                <p className="text-sm text-gray-400">{selectedModule.name}</p>
              </div>
              <button 
                onClick={() => setSelectedModule(null)}
                className="p-2 hover:bg-gray-700 rounded-lg"
              >
                ✕
              </button>
            </div>
            
            <p className="text-gray-300 mb-4">{selectedModule.description}</p>
            
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="text-center p-3 bg-gray-700 rounded-lg">
                <p className="text-2xl font-bold" style={{ color: PRIORITY_CONFIG[selectedModule.priority].color }}>
                  {PRIORITY_CONFIG[selectedModule.priority].name}
                </p>
                <p className="text-xs text-gray-400">우선순위</p>
              </div>
              <div className="text-center p-3 bg-gray-700 rounded-lg">
                <p className="text-2xl font-bold">{selectedModule.complexity}/5</p>
                <p className="text-xs text-gray-400">복잡도</p>
              </div>
              <div className="text-center p-3 bg-gray-700 rounded-lg">
                <p className="text-2xl font-bold">{selectedModule.estimated_days}일</p>
                <p className="text-xs text-gray-400">예상 공수</p>
              </div>
            </div>
            
            <div className="mb-4">
              <h4 className="text-sm font-semibold mb-2">기술 스택</h4>
              <div className="flex flex-wrap gap-2">
                {selectedModule.tech_stack.map(tech => (
                  <span key={tech} className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-lg text-sm">
                    {tech}
                  </span>
                ))}
              </div>
            </div>
            
            <div className="mb-4">
              <h4 className="text-sm font-semibold mb-2">트렌드 키워드</h4>
              <div className="flex flex-wrap gap-2">
                {selectedModule.trend_keywords.map(keyword => (
                  <span key={keyword} className="px-3 py-1 bg-green-500/20 text-green-300 rounded-lg text-sm">
                    #{keyword}
                  </span>
                ))}
              </div>
            </div>
            
            <div className="mb-4">
              <h4 className="text-sm font-semibold mb-2">물리 상수 영향</h4>
              <div className="flex gap-4">
                <span className={selectedModule.affects_k ? 'text-blue-400' : 'text-gray-600'}>
                  K {selectedModule.affects_k ? '✓' : '✗'}
                </span>
                <span className={selectedModule.affects_i ? 'text-green-400' : 'text-gray-600'}>
                  I {selectedModule.affects_i ? '✓' : '✗'}
                </span>
                <span className={selectedModule.affects_r ? 'text-amber-400' : 'text-gray-600'}>
                  r {selectedModule.affects_r ? '✓' : '✗'}
                </span>
              </div>
            </div>
            
            {selectedModule.depends_on.length > 0 && (
              <div className="p-3 bg-amber-500/10 rounded-lg">
                <h4 className="text-sm font-semibold text-amber-400 mb-1">의존성</h4>
                <p className="text-sm text-gray-300">
                  {selectedModule.depends_on.map(dep => {
                    const m = SOLUTION_MODULES.find(x => x.code === dep);
                    return m ? `${dep}: ${m.name_ko}` : dep;
                  }).join(' → ')}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Summary Footer */}
      <div className="mt-8 p-4 bg-gray-800 rounded-xl text-center">
        <p className="text-gray-400">
          총 <span className="text-white font-bold">30개</span> 모듈 · 
          예상 공수 <span className="text-white font-bold">{stats.totalDays}일</span> · 
          P0 (즉시) <span className="text-red-400 font-bold">{stats.byPriority.P0.length}개</span>
        </p>
      </div>
    </div>
  );
}

export default SolutionDashboard;
