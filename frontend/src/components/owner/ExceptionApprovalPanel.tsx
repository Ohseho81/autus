// ═══════════════════════════════════════════════════════════════════════════════
// ⚠️ 예외 승인 패널 (Exception Approval Panel)
// 오너가 예외 상황에 대해 원클릭으로 의사결정
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Exception, ExceptionAlternative } from './index';

interface ExceptionApprovalPanelProps {
  exceptions: Exception[];
  onApprove: (exceptionId: string, alternativeId: string) => void;
  onDelegate: (exceptionId: string, delegateTo: string) => void;
  onDirect: (exceptionId: string) => void;
}

const MOCK_EXCEPTIONS: Exception[] = [
  {
    id: 'EX-2025-0128-001',
    createdAt: new Date().toISOString(),
    customerId: 'cust-001',
    customerName: '김민수',
    situation: '경쟁사(D학원) 할인 제안을 받았다고 언급',
    analysis: '비용 민감 Voice + 경쟁사 노출 + 성적 하락 삼중고',
    churnProbabilityBefore: 42,
    churnProbabilityAfter: 68,
    policyReference: 'P-007 (할인 10% 이상 오너 승인)',
    urgency: 'critical',
    alternatives: [
      { id: 'A', label: '10% 할인', description: '월 -3만원', cost: 30000, retentionProbability: 85, recommended: true },
      { id: 'B', label: '무료 보충수업', description: '주 1회 추가', cost: 0, retentionProbability: 70 },
      { id: 'C', label: '가치 상담만', description: '비용 없음', cost: 0, retentionProbability: 55 },
    ],
  },
  {
    id: 'EX-2025-0128-002',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    customerId: 'cust-002',
    customerName: '이서연',
    situation: '학부모가 "성적이 안 오른다"며 불만 표시',
    analysis: 'Trust 점수 급락, Voice stage: complaint',
    churnProbabilityBefore: 25,
    churnProbabilityAfter: 45,
    policyReference: 'P-012 (불만 접수 시 긴급 상담)',
    urgency: 'high',
    alternatives: [
      { id: 'A', label: '원장 직접 상담', description: '특별 면담', cost: 0, retentionProbability: 80, recommended: true },
      { id: 'B', label: '담임 강화 상담', description: '2주간 집중', cost: 0, retentionProbability: 65 },
      { id: 'C', label: '성적 분석 리포트', description: '데이터 기반', cost: 0, retentionProbability: 50 },
    ],
  },
];

const URGENCY_STYLES = {
  critical: { bg: 'bg-red-50 dark:bg-red-900/30', border: 'border-red-500', badge: 'bg-red-500 text-white', icon: '🚨' },
  high: { bg: 'bg-orange-50 dark:bg-orange-900/30', border: 'border-orange-500', badge: 'bg-orange-500 text-white', icon: '⚠️' },
  medium: { bg: 'bg-yellow-50 dark:bg-yellow-900/30', border: 'border-yellow-500', badge: 'bg-yellow-500 text-white', icon: '📢' },
  low: { bg: 'bg-blue-50 dark:bg-blue-900/30', border: 'border-blue-500', badge: 'bg-blue-500 text-white', icon: 'ℹ️' },
};

export function ExceptionApprovalPanel({ 
  exceptions = MOCK_EXCEPTIONS,
  onApprove,
  onDelegate,
  onDirect,
}: ExceptionApprovalPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(exceptions[0]?.id || null);
  const [approving, setApproving] = useState<string | null>(null);

  const handleApprove = async (exceptionId: string, alternativeId: string) => {
    setApproving(`${exceptionId}-${alternativeId}`);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    onApprove?.(exceptionId, alternativeId);
    setApproving(null);
  };

  if (exceptions.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg text-center">
        <div className="text-6xl mb-4">✅</div>
        <h3 className="text-xl font-bold text-green-600 dark:text-green-400">
          모든 예외 처리 완료
        </h3>
        <p className="text-gray-500 mt-2">
          승인 대기 중인 예외가 없습니다
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <span>⚠️</span> 예외 승인
          <span className="px-2 py-0.5 bg-red-500 text-white text-sm rounded-full">
            {exceptions.length}
          </span>
        </h2>
      </div>

      <AnimatePresence>
        {exceptions.map((exception, index) => {
          const style = URGENCY_STYLES[exception.urgency];
          const isExpanded = expandedId === exception.id;

          return (
            <motion.div
              key={exception.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ delay: index * 0.1 }}
              className={`${style.bg} border-l-4 ${style.border} rounded-xl overflow-hidden`}
            >
              {/* Header */}
              <div 
                className="p-4 cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : exception.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{style.icon}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs ${style.badge}`}>
                          {exception.urgency.toUpperCase()}
                        </span>
                        <span className="text-sm text-gray-500">{exception.id}</span>
                      </div>
                      <h3 className="font-semibold mt-1">{exception.customerName}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {exception.situation}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-sm text-gray-500">이탈 확률</div>
                    <div className="text-xl font-bold text-red-500">
                      {exception.churnProbabilityBefore}% → {exception.churnProbabilityAfter}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Expanded Content */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="border-t dark:border-gray-700"
                  >
                    <div className="p-4">
                      {/* Analysis */}
                      <div className="mb-4">
                        <div className="text-sm font-medium text-gray-500 mb-1">분석</div>
                        <p className="text-sm">{exception.analysis}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          정책: {exception.policyReference}
                        </p>
                      </div>

                      {/* Alternatives */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {exception.alternatives.map((alt) => (
                          <motion.button
                            key={alt.id}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleApprove(exception.id, alt.id)}
                            disabled={!!approving}
                            className={`p-4 rounded-xl border-2 transition-all text-left ${
                              alt.recommended 
                                ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                                : 'border-gray-200 dark:border-gray-700 hover:border-blue-500'
                            } ${approving === `${exception.id}-${alt.id}` ? 'opacity-50' : ''}`}
                          >
                            {alt.recommended && (
                              <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded mb-2 inline-block">
                                🤖 추천
                              </span>
                            )}
                            <div className="font-bold text-lg">{alt.label}</div>
                            <div className="text-sm text-gray-500">{alt.description}</div>
                            <div className="mt-2 flex justify-between text-sm">
                              <span className={alt.cost > 0 ? 'text-red-500' : 'text-green-500'}>
                                {alt.cost > 0 ? `-${alt.cost.toLocaleString()}원/월` : '비용 없음'}
                              </span>
                              <span className="text-blue-500">
                                유지 {alt.retentionProbability}%
                              </span>
                            </div>
                            {approving === `${exception.id}-${alt.id}` && (
                              <div className="mt-2 flex items-center justify-center">
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500" />
                              </div>
                            )}
                          </motion.button>
                        ))}
                      </div>

                      {/* Other Actions */}
                      <div className="flex gap-2 mt-4 pt-4 border-t dark:border-gray-700">
                        <button
                          onClick={() => onDirect?.(exception.id)}
                          className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                          직접 처리
                        </button>
                        <button
                          onClick={() => onDelegate?.(exception.id, 'manager')}
                          className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                          관리자에게 위임
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

export default ExceptionApprovalPanel;
