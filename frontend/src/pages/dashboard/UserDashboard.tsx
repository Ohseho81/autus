/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS User Dashboard - 사용자 핵심 화면
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * 핵심 기능:
 * 1. 트리거 발동 (결제, 수업 등)
 * 2. 실행 결과 확인
 * 3. K/I/Ω 메트릭 모니터링
 * 4. 삭제된 업무/절감액 확인
 */

'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// =============================================================================
// Types
// =============================================================================

interface TriggerChain {
  trigger_type: string;
  trigger_name: string;
  action_count: number;
  absorbed_tasks: number;
}

interface BusinessInfo {
  industry: string;
  solution_name: string;
  trigger_chains: TriggerChain[];
  eliminated_count: number;
  elimination_rate: number;
  annual_savings: number;
}

interface ExecutionResult {
  chain_id: string;
  trigger_type: string;
  success: boolean;
  eliminated_count: number;
  duration_ms: number;
  timestamp: string;
}

interface PhysicsMetrics {
  k: number;  // 효율
  i: number;  // 상호작용
  omega: number;  // 엔트로피
  health_score: number;
}

// =============================================================================
// API Functions
// =============================================================================

const API_BASE = '/api';

async function fetchBusinessInfo(industry: string): Promise<BusinessInfo> {
  const res = await fetch(`${API_BASE}/turnkey/industries/${industry}`);
  if (!res.ok) throw new Error('Failed to fetch business info');
  return res.json();
}

async function executeTrigger(
  industry: string, 
  triggerType: string, 
  payload: Record<string, any>
): Promise<ExecutionResult> {
  const res = await fetch(`${API_BASE}/turnkey/industries/${industry}/trigger`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ trigger_type: triggerType, payload })
  });
  if (!res.ok) throw new Error('Failed to execute trigger');
  return res.json();
}

async function fetchRecentExecutions(industry: string): Promise<ExecutionResult[]> {
  const res = await fetch(`${API_BASE}/turnkey/industries/${industry}/executions?limit=10`);
  if (!res.ok) throw new Error('Failed to fetch executions');
  const data = await res.json();
  return data.executions || [];
}

// =============================================================================
// Components
// =============================================================================

// 메트릭 게이지
function MetricGauge({ 
  label, 
  value, 
  max = 2, 
  color,
  description 
}: { 
  label: string; 
  value: number; 
  max?: number;
  color: string;
  description: string;
}) {
  const percentage = Math.min((value + 1) / (max + 1) * 100, 100);
  
  return (
    <div className="flex flex-col items-center p-4 bg-white/5 rounded-2xl backdrop-blur-sm border border-white/10">
      <span className="text-xs text-white/60 mb-2">{label}</span>
      <div className="relative w-20 h-20">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
          <path
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="3"
          />
          <motion.path
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeDasharray={`${percentage}, 100`}
            initial={{ strokeDasharray: '0, 100' }}
            animate={{ strokeDasharray: `${percentage}, 100` }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold text-white">
            {value.toFixed(2)}
          </span>
        </div>
      </div>
      <span className="text-xs text-white/40 mt-2 text-center">{description}</span>
    </div>
  );
}

// 트리거 버튼
function TriggerButton({
  trigger,
  onClick,
  isLoading,
  icon
}: {
  trigger: TriggerChain;
  onClick: () => void;
  isLoading: boolean;
  icon: string;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      disabled={isLoading}
      className={`
        relative p-6 rounded-2xl
        bg-gradient-to-br from-white/10 to-white/5
        border border-white/20
        backdrop-blur-xl
        transition-all duration-300
        hover:border-amber-400/50 hover:shadow-lg hover:shadow-amber-500/20
        disabled:opacity-50 disabled:cursor-not-allowed
        group
      `}
    >
      {/* 배경 글로우 */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-500/0 to-amber-600/0 group-hover:from-amber-500/10 group-hover:to-amber-600/5 transition-all duration-500" />
      
      <div className="relative z-10 flex flex-col items-center gap-3">
        <span className="text-4xl">{icon}</span>
        <span className="text-lg font-semibold text-white">{trigger.trigger_name}</span>
        <div className="flex gap-2 text-xs text-white/60">
          <span className="px-2 py-1 bg-white/10 rounded-full">
            {trigger.action_count}개 액션
          </span>
          <span className="px-2 py-1 bg-amber-500/20 text-amber-300 rounded-full">
            {trigger.absorbed_tasks}개 업무 삭제
          </span>
        </div>
      </div>
      
      {isLoading && (
        <motion.div
          className="absolute inset-0 rounded-2xl bg-amber-500/20 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
        </motion.div>
      )}
    </motion.button>
  );
}

// 실행 결과 카드
function ExecutionCard({ execution }: { execution: ExecutionResult }) {
  const time = new Date(execution.timestamp).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit'
  });
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center gap-4 p-4 bg-white/5 rounded-xl border border-white/10"
    >
      <span className={`text-2xl ${execution.success ? '' : 'grayscale'}`}>
        {execution.success ? '✅' : '❌'}
      </span>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-white">{execution.trigger_type}</span>
          <span className="text-xs text-white/40">{time}</span>
        </div>
        <div className="flex gap-2 mt-1 text-xs text-white/60">
          <span>{execution.eliminated_count}개 업무 삭제</span>
          <span>•</span>
          <span>{execution.duration_ms.toFixed(0)}ms</span>
        </div>
      </div>
      <span className="text-xs px-2 py-1 bg-green-500/20 text-green-300 rounded-full">
        {execution.chain_id.slice(0, 8)}
      </span>
    </motion.div>
  );
}

// =============================================================================
// Main Dashboard
// =============================================================================

export default function UserDashboard() {
  // State
  const [industry, setIndustry] = useState('교육');
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo | null>(null);
  const [executions, setExecutions] = useState<ExecutionResult[]>([]);
  const [metrics, setMetrics] = useState<PhysicsMetrics>({
    k: 1.12,
    i: 0.35,
    omega: 0.42,
    health_score: 78
  });
  const [loadingTrigger, setLoadingTrigger] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalTrigger, setModalTrigger] = useState<TriggerChain | null>(null);

  // Effects
  useEffect(() => {
    loadBusinessInfo();
    loadExecutions();
  }, [industry]);

  // Handlers
  async function loadBusinessInfo() {
    try {
      const info = await fetchBusinessInfo(industry);
      setBusinessInfo(info);
    } catch (error) {
      console.error('Failed to load business info:', error);
      // Mock data for demo
      setBusinessInfo({
        industry: '교육',
        solution_name: 'EduOS - 교육 운영 시스템',
        trigger_chains: [
          { trigger_type: '결제', trigger_name: '결제 완료', action_count: 6, absorbed_tasks: 15 },
          { trigger_type: '서비스수행', trigger_name: '수업 수행', action_count: 7, absorbed_tasks: 14 }
        ],
        eliminated_count: 28,
        elimination_rate: 0.7,
        annual_savings: 43320000
      });
    }
  }

  async function loadExecutions() {
    try {
      const execs = await fetchRecentExecutions(industry);
      setExecutions(execs);
    } catch (error) {
      console.error('Failed to load executions:', error);
    }
  }

  function handleTriggerClick(trigger: TriggerChain) {
    setModalTrigger(trigger);
    setShowModal(true);
  }

  async function handleExecuteTrigger(payload: Record<string, any>) {
    if (!modalTrigger) return;
    
    setLoadingTrigger(modalTrigger.trigger_type);
    setShowModal(false);
    
    try {
      const result = await executeTrigger(industry, modalTrigger.trigger_type, payload);
      setExecutions(prev => [result, ...prev.slice(0, 9)]);
      
      // 메트릭 업데이트 (시뮬레이션)
      setMetrics(prev => ({
        k: Math.min(prev.k + 0.02, 2),
        i: Math.min(prev.i + 0.01, 1),
        omega: Math.max(prev.omega - 0.01, 0),
        health_score: Math.min(prev.health_score + 1, 100)
      }));
    } catch (error) {
      console.error('Failed to execute trigger:', error);
      // Demo: Add mock result
      const mockResult: ExecutionResult = {
        chain_id: Math.random().toString(36).slice(2, 10),
        trigger_type: modalTrigger.trigger_name,
        success: true,
        eliminated_count: modalTrigger.absorbed_tasks,
        duration_ms: Math.random() * 500 + 300,
        timestamp: new Date().toISOString()
      };
      setExecutions(prev => [mockResult, ...prev.slice(0, 9)]);
    } finally {
      setLoadingTrigger(null);
    }
  }

  const triggerIcons: Record<string, string> = {
    '결제': '💳',
    '서비스수행': '📖',
    '예약': '📅',
    '진료': '🩺',
    '주문': '🛒',
    '배송': '🚚',
    '체크인': '🏨',
    '계약': '📝'
  };

  if (!businessInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <motion.div
          className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-xl bg-black/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
              AUTUS
            </span>
            <span className="text-white/40">|</span>
            <span className="text-white/60">{businessInfo.solution_name}</span>
          </div>
          
          {/* Industry Selector */}
          <select
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white outline-none focus:border-amber-400"
          >
            <option value="교육">📚 교육</option>
            <option value="의료">🏥 의료</option>
            <option value="물류">📦 물류</option>
            <option value="호텔">🏨 호텔</option>
            <option value="제조">🏭 제조</option>
            <option value="유통">🏪 유통</option>
            <option value="서비스">💼 서비스</option>
          </select>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        
        {/* Stats Overview */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30"
          >
            <span className="text-amber-300 text-sm">삭제된 업무</span>
            <div className="text-3xl font-bold mt-2">{businessInfo.eliminated_count}개</div>
            <span className="text-amber-300/60 text-sm">
              {(businessInfo.elimination_rate * 100).toFixed(0)}% 감소
            </span>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-6 rounded-2xl bg-gradient-to-br from-green-500/20 to-green-600/10 border border-green-500/30"
          >
            <span className="text-green-300 text-sm">연간 절감</span>
            <div className="text-3xl font-bold mt-2">
              ₩{(businessInfo.annual_savings / 10000).toFixed(0)}만
            </div>
            <span className="text-green-300/60 text-sm">비용 절감</span>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-6 rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 border border-blue-500/30"
          >
            <span className="text-blue-300 text-sm">핵심 트리거</span>
            <div className="text-3xl font-bold mt-2">
              {businessInfo.trigger_chains.length}개
            </div>
            <span className="text-blue-300/60 text-sm">
              {businessInfo.trigger_chains.map(t => t.trigger_name).join(' + ')}
            </span>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="p-6 rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30"
          >
            <span className="text-purple-300 text-sm">건강 점수</span>
            <div className="text-3xl font-bold mt-2">{metrics.health_score}</div>
            <span className="text-purple-300/60 text-sm">100점 만점</span>
          </motion.div>
        </section>

        {/* K/I/Ω Metrics */}
        <section className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl">
          <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <span>⚡</span> 물리 엔진 메트릭 (K/I/Ω)
          </h2>
          <div className="grid grid-cols-3 gap-6">
            <MetricGauge
              label="K (효율)"
              value={metrics.k}
              max={2}
              color="#f59e0b"
              description="K>1 번영, K<1 쇠퇴"
            />
            <MetricGauge
              label="I (상호작용)"
              value={metrics.i}
              max={1}
              color="#3b82f6"
              description="I>0 시너지, I<0 마찰"
            />
            <MetricGauge
              label="Ω (엔트로피)"
              value={metrics.omega}
              max={1}
              color="#8b5cf6"
              description="Ω→0 질서, Ω→1 혼란"
            />
          </div>
        </section>

        {/* Trigger Section */}
        <section className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl">
          <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <span>🎯</span> 트리거 발동
          </h2>
          <p className="text-white/60 mb-6">
            트리거 한 번으로 연쇄 작업이 자동 완료되고, 관련 업무가 삭제됩니다.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {businessInfo.trigger_chains.map((trigger) => (
              <TriggerButton
                key={trigger.trigger_type}
                trigger={trigger}
                onClick={() => handleTriggerClick(trigger)}
                isLoading={loadingTrigger === trigger.trigger_type}
                icon={triggerIcons[trigger.trigger_type] || '⚡'}
              />
            ))}
          </div>
        </section>

        {/* Recent Executions */}
        <section className="p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl">
          <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <span>📋</span> 최근 실행
          </h2>
          
          {executions.length === 0 ? (
            <div className="text-center py-12 text-white/40">
              <span className="text-4xl mb-4 block">🚀</span>
              <p>아직 실행된 트리거가 없습니다.</p>
              <p className="text-sm">위의 트리거 버튼을 클릭하여 시작하세요!</p>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {executions.map((exec, index) => (
                  <ExecutionCard key={exec.chain_id + index} execution={exec} />
                ))}
              </AnimatePresence>
            </div>
          )}
        </section>

        {/* Before/After Comparison */}
        <section className="p-6 rounded-2xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 border border-white/10">
          <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <span>📊</span> Before vs After
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-red-500/10 rounded-xl border border-red-500/20">
              <h3 className="text-red-400 font-medium mb-3">❌ Before</h3>
              <ul className="space-y-2 text-sm text-white/60">
                <li>• 6개 부서 릴레이</li>
                <li>• 40개 수동 업무</li>
                <li>• 180분/건 소요</li>
                <li>• 다중 핸드오프 오류</li>
              </ul>
            </div>
            
            <div className="p-4 bg-green-500/10 rounded-xl border border-green-500/20">
              <h3 className="text-green-400 font-medium mb-3">✅ After (AUTUS)</h3>
              <ul className="space-y-2 text-sm text-white/60">
                <li>• 0개 부서 개입</li>
                <li>• 2개 트리거만</li>
                <li>• 즉시 완료</li>
                <li>• 28개 업무 자연소멸</li>
              </ul>
            </div>
          </div>
        </section>
      </main>

      {/* Trigger Modal */}
      <AnimatePresence>
        {showModal && modalTrigger && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-800 rounded-2xl p-6 max-w-md w-full border border-white/20"
            >
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <span>{triggerIcons[modalTrigger.trigger_type] || '⚡'}</span>
                {modalTrigger.trigger_name} 실행
              </h3>
              
              <p className="text-white/60 mb-6">
                이 트리거를 실행하면 {modalTrigger.action_count}개 액션이 자동으로 수행되고,
                {modalTrigger.absorbed_tasks}개 업무가 삭제됩니다.
              </p>
              
              <div className="bg-white/5 rounded-xl p-4 mb-6">
                <span className="text-sm text-white/40">실행될 액션:</span>
                <ul className="mt-2 text-sm space-y-1">
                  {modalTrigger.trigger_type === '결제' && (
                    <>
                      <li>• 수납/증빙 자동처리</li>
                      <li>• 스케줄 자동생성</li>
                      <li>• 학습환경 자동구축</li>
                      <li>• 온보딩 자동발송</li>
                      <li>• CRM 자동연동</li>
                      <li>• CS 자동예약</li>
                    </>
                  )}
                  {modalTrigger.trigger_type === '서비스수행' && (
                    <>
                      <li>• 출결 자동처리</li>
                      <li>• 수업기록 자동화</li>
                      <li>• 학습데이터 자동수집</li>
                      <li>• 발달기록 자동갱신</li>
                      <li>• 학부모리포트 자동발송</li>
                      <li>• AI학습분석</li>
                      <li>• 강사피드백 자동수집</li>
                    </>
                  )}
                </ul>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={() => handleExecuteTrigger({ demo: true })}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 font-semibold transition-colors"
                >
                  실행하기
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="border-t border-white/10 mt-12 py-6">
        <div className="max-w-7xl mx-auto px-6 text-center text-white/40 text-sm">
          <p>AUTUS - Universal Engine for 8 Billion Humans</p>
          <p className="mt-1">"트리거 → 전체 체인 자동 완료 → 업무 자연소멸"</p>
        </div>
      </footer>
    </div>
  );
}
