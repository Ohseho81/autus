/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚠️ KRATON Risk Queue Manager
 * FSD의 핵심 판단 인터페이스 - 위기 감지 및 대응 관리
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useMemo, memo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStudents } from '../../hooks/useSupabaseData';

// ============================================
// MOCK DATA
// ============================================

const generateMockRisks = () => [
  {
    id: 'r1',
    priority: 'CRITICAL',
    status: 'OPEN',
    targetNode: { id: 's1', name: '오연우', type: 'student', grade: '중2', avatar: '👦' },
    relatedNodes: [
      { id: 't1', name: '김선생', type: 'teacher', relation: 'T-S' },
      { id: 'p1', name: '오연우 어머니', type: 'parent', relation: 'S-P' },
    ],
    riskType: 'churn_imminent',
    metrics: {
      sIndex: 0.32,
      sIndexDelta: -0.25,
      mScore: 45,
      churnProbability: 0.72,
      daysToChurn: 14,
      lastContact: 8,
    },
    triggerReason: '성취도 하락 + 학부모 불안 지수 급증',
    aiAnalysis: {
      rootCause: '담당 선생님과의 Chemistry 불일치 (-35%)',
      pattern: '최근 3회 상담 모두 "불안" 태그 발생',
      similarCases: 12,
      successRate: 0.67,
    },
    recommendedActions: [
      { id: 'a1', action: '담당 선생님 변경 (이선생 추천)', impact: '+25% s-Index 예상', urgency: 'HIGH' },
      { id: 'a2', action: '원장 직접 학부모 통화', impact: 'Trust Score 회복', urgency: 'HIGH' },
      { id: 'a3', action: '무료 보충 수업 1회 제공', impact: '+15% m-Score 예상', urgency: 'MEDIUM' },
    ],
    timeline: [
      { time: '8일 전', event: 's-Index 첫 하락 감지 (-10%)', type: 'warning' },
      { time: '5일 전', event: '학부모 "비용" 관련 상담 요청', type: 'info' },
      { time: '3일 전', event: 'm-Score 연속 하락', type: 'warning' },
      { time: '1일 전', event: 'Churn 확률 70% 돌파', type: 'critical' },
    ],
    createdAt: Date.now() - 86400000,
  },
  {
    id: 'r2',
    priority: 'HIGH',
    status: 'ASSIGNED',
    assignedTo: { name: '이선생', role: 'teacher' },
    targetNode: { id: 's4', name: '박민수', type: 'student', grade: '고1', avatar: '👦' },
    relatedNodes: [
      { id: 't2', name: '이선생', type: 'teacher', relation: 'T-S' },
      { id: 'p4', name: '박민수 어머니', type: 'parent', relation: 'S-P' },
    ],
    riskType: 'satisfaction_drop',
    metrics: {
      sIndex: 0.41,
      sIndexDelta: -0.15,
      mScore: 52,
      churnProbability: 0.45,
      daysToChurn: 45,
      lastContact: 3,
    },
    triggerReason: '만족도 지수 급락 (3주간 -15%)',
    aiAnalysis: {
      rootCause: '진로 상담 부족 - Career Pressure 감지',
      pattern: '고등학생 진로 불안 전형적 패턴',
      similarCases: 28,
      successRate: 0.82,
    },
    recommendedActions: [
      { id: 'a1', action: '진로 상담 세션 예약', impact: '+20% s-Index 예상', urgency: 'HIGH' },
      { id: 'a2', action: '대학 입시 설명회 초대', impact: '학부모 Trust 상승', urgency: 'MEDIUM' },
    ],
    timeline: [
      { time: '3주 전', event: 's-Index 하락 시작', type: 'warning' },
      { time: '1주 전', event: '"진로" 키워드 상담 요청', type: 'info' },
      { time: '3일 전', event: '담당자 배정 완료', type: 'success' },
    ],
    createdAt: Date.now() - 172800000,
  },
  {
    id: 'r3',
    priority: 'MEDIUM',
    status: 'IN_PROGRESS',
    assignedTo: { name: '박선생', role: 'teacher' },
    targetNode: { id: 'p3', name: '이영희 아버지', type: 'parent', avatar: '👨' },
    relatedNodes: [
      { id: 's3', name: '이영희', type: 'student', relation: 'S-P' },
    ],
    riskType: 'trust_decline',
    metrics: {
      sIndex: 0.58,
      sIndexDelta: -0.08,
      trustScore: 0.52,
    },
    triggerReason: 'Trust Score 감소 추세 감지',
    aiAnalysis: {
      rootCause: '성적 리포트 확인 빈도 감소',
      pattern: '관심 이탈 초기 단계',
      similarCases: 45,
      successRate: 0.91,
    },
    recommendedActions: [
      { id: 'a1', action: '맞춤형 리포트 발송', impact: 'Attention Mass 회복', urgency: 'MEDIUM' },
    ],
    timeline: [
      { time: '2주 전', event: '앱 열기 빈도 50% 감소', type: 'warning' },
      { time: '1주 전', event: '대응 시작', type: 'info' },
    ],
    createdAt: Date.now() - 604800000,
  },
  {
    id: 'r4',
    priority: 'LOW',
    status: 'RESOLVED',
    resolvedBy: { name: '김선생', role: 'teacher' },
    resolvedAt: Date.now() - 86400000,
    targetNode: { id: 's2', name: '김철수', type: 'student', grade: '중2', avatar: '👦' },
    relatedNodes: [],
    riskType: 'performance_decline',
    metrics: {
      sIndex: 0.78,
      mScore: 72,
    },
    triggerReason: '성과 지수 일시적 하락',
    resolution: '학업 스트레스 해소를 위한 상담 진행, 정상화 확인',
    createdAt: Date.now() - 1209600000,
  },
];

// ============================================
// CONSTANTS
// ============================================

const PRIORITY_CONFIG = {
  CRITICAL: { color: 'red', bg: 'bg-red-500/10', border: 'border-red-500/50', text: 'text-red-400', icon: '🔴' },
  HIGH: { color: 'orange', bg: 'bg-orange-500/10', border: 'border-orange-500/50', text: 'text-orange-400', icon: '🟠' },
  MEDIUM: { color: 'yellow', bg: 'bg-yellow-500/10', border: 'border-yellow-500/50', text: 'text-yellow-400', icon: '🟡' },
  LOW: { color: 'gray', bg: 'bg-gray-500/10', border: 'border-gray-500/50', text: 'text-gray-400', icon: '⚪' },
};

const STATUS_CONFIG = {
  OPEN: { label: '신규', color: 'text-red-400', bg: 'bg-red-500/20' },
  ASSIGNED: { label: '배정됨', color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
  IN_PROGRESS: { label: '처리중', color: 'text-cyan-400', bg: 'bg-cyan-500/20' },
  ESCALATED: { label: '상위보고', color: 'text-purple-400', bg: 'bg-purple-500/20' },
  RESOLVED: { label: '해결됨', color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
  CLOSED: { label: '종료', color: 'text-gray-400', bg: 'bg-gray-500/20' },
};

const RISK_TYPE_LABELS = {
  churn_imminent: '임박한 이탈',
  satisfaction_drop: '만족도 급락',
  performance_decline: '성과 하락',
  bond_weakening: '관계 약화',
  trust_decline: '신뢰도 하락',
  payment_risk: '결제 위험',
};

// ============================================
// SUB COMPONENTS
// ============================================

// 위험 카드 (리스트용)
const RiskListItem = memo(function RiskListItem({ risk, selected, onClick }) {
  const priority = PRIORITY_CONFIG[risk.priority];
  const status = STATUS_CONFIG[risk.status];

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={onClick}
      className={`
        p-4 rounded-xl border-2 cursor-pointer transition-all duration-200
        ${selected ? `${priority.bg} ${priority.border}` : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'}
      `}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span>{priority.icon}</span>
          <span className={`text-xs font-mono ${priority.text}`}>{risk.priority}</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${status.bg} ${status.color}`}>
            {status.label}
          </span>
        </div>
        <span className="text-gray-500 text-xs">
          {new Date(risk.createdAt).toLocaleDateString()}
        </span>
      </div>

      <div className="flex items-center gap-3 mb-2">
        <span className="text-2xl">{risk.targetNode.avatar}</span>
        <div>
          <p className="text-white font-medium">{risk.targetNode.name}</p>
          <p className="text-gray-500 text-xs">
            {risk.targetNode.grade || risk.targetNode.type}
          </p>
        </div>
      </div>

      <p className="text-gray-400 text-sm mb-2">{risk.triggerReason}</p>

      {risk.metrics && (
        <div className="flex gap-3 text-xs">
          <span className={risk.metrics.sIndex < 0.5 ? 'text-red-400' : 'text-emerald-400'}>
            s: {(risk.metrics.sIndex * 100).toFixed(0)}%
          </span>
          {risk.metrics.churnProbability && (
            <span className="text-orange-400">
              이탈: {(risk.metrics.churnProbability * 100).toFixed(0)}%
            </span>
          )}
          {risk.metrics.daysToChurn && (
            <span className="text-yellow-400">
              D-{risk.metrics.daysToChurn}
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
});

// 상세 패널
const RiskDetailPanel = memo(function RiskDetailPanel({ risk, onAction, onStatusChange }) {
  const [selectedAction, setSelectedAction] = useState(null);
  const [notes, setNotes] = useState('');

  if (!risk) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <div className="text-center">
          <span className="text-4xl">⚠️</span>
          <p className="mt-2">위험 항목을 선택하세요</p>
        </div>
      </div>
    );
  }

  const priority = PRIORITY_CONFIG[risk.priority];
  const status = STATUS_CONFIG[risk.status];

  return (
    <div className="space-y-6 overflow-y-auto max-h-[calc(100vh-200px)]">
      {/* 헤더 */}
      <div className={`p-4 rounded-xl ${priority.bg} border ${priority.border}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{priority.icon}</span>
            <span className={`font-bold ${priority.text}`}>{risk.priority} RISK</span>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs ${status.bg} ${status.color}`}>
            {status.label}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-4xl">{risk.targetNode.avatar}</span>
          <div>
            <h3 className="text-xl font-bold text-white">{risk.targetNode.name}</h3>
            <p className="text-gray-400">
              {risk.targetNode.type === 'student' ? `${risk.targetNode.grade} 학생` : risk.targetNode.type}
            </p>
          </div>
        </div>
      </div>

      {/* 관련 노드 */}
      {risk.relatedNodes.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-400 mb-2">관련 노드</h4>
          <div className="flex flex-wrap gap-2">
            {risk.relatedNodes.map(node => (
              <div key={node.id} className="px-3 py-1.5 bg-gray-800 rounded-lg text-sm flex items-center gap-2">
                <span className={node.type === 'teacher' ? 'text-blue-400' : 'text-purple-400'}>
                  {node.type === 'teacher' ? '👨‍🏫' : '👨‍👩‍👧'}
                </span>
                <span className="text-white">{node.name}</span>
                <span className="text-gray-500 text-xs">({node.relation})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 핵심 지표 */}
      {risk.metrics && (
        <div>
          <h4 className="text-sm font-medium text-gray-400 mb-2">핵심 지표</h4>
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-gray-800/50 rounded-xl text-center">
              <p className={`text-2xl font-bold ${risk.metrics.sIndex < 0.5 ? 'text-red-400' : 'text-emerald-400'}`}>
                {(risk.metrics.sIndex * 100).toFixed(0)}%
              </p>
              <p className="text-xs text-gray-500">s-Index</p>
              {risk.metrics.sIndexDelta && (
                <p className={`text-xs ${risk.metrics.sIndexDelta < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                  {risk.metrics.sIndexDelta > 0 ? '+' : ''}{(risk.metrics.sIndexDelta * 100).toFixed(0)}%
                </p>
              )}
            </div>
            {risk.metrics.churnProbability && (
              <div className="p-3 bg-gray-800/50 rounded-xl text-center">
                <p className="text-2xl font-bold text-orange-400">
                  {(risk.metrics.churnProbability * 100).toFixed(0)}%
                </p>
                <p className="text-xs text-gray-500">이탈 확률</p>
              </div>
            )}
            {risk.metrics.daysToChurn && (
              <div className="p-3 bg-gray-800/50 rounded-xl text-center">
                <p className="text-2xl font-bold text-yellow-400">
                  D-{risk.metrics.daysToChurn}
                </p>
                <p className="text-xs text-gray-500">예상 이탈일</p>
              </div>
            )}
            {risk.metrics.mScore && (
              <div className="p-3 bg-gray-800/50 rounded-xl text-center">
                <p className="text-2xl font-bold text-cyan-400">{risk.metrics.mScore}</p>
                <p className="text-xs text-gray-500">m-Score</p>
              </div>
            )}
            {risk.metrics.lastContact !== undefined && (
              <div className="p-3 bg-gray-800/50 rounded-xl text-center">
                <p className="text-2xl font-bold text-purple-400">{risk.metrics.lastContact}일</p>
                <p className="text-xs text-gray-500">최근 접촉</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI 분석 */}
      {risk.aiAnalysis && (
        <div className="p-4 bg-gradient-to-r from-purple-500/10 via-cyan-500/10 to-purple-500/10 rounded-xl border border-purple-500/30">
          <h4 className="text-sm font-medium text-purple-400 mb-3 flex items-center gap-2">
            <span>🤖</span> AI 분석
          </h4>
          <div className="space-y-2 text-sm">
            <p className="text-white">
              <span className="text-gray-500">근본 원인:</span> {risk.aiAnalysis.rootCause}
            </p>
            <p className="text-white">
              <span className="text-gray-500">패턴:</span> {risk.aiAnalysis.pattern}
            </p>
            <div className="flex gap-4 mt-2 text-xs">
              <span className="text-cyan-400">유사 사례: {risk.aiAnalysis.similarCases}건</span>
              <span className="text-emerald-400">
                성공률: {(risk.aiAnalysis.successRate * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 권장 조치 */}
      {risk.recommendedActions && risk.status !== 'RESOLVED' && (
        <div>
          <h4 className="text-sm font-medium text-gray-400 mb-2">권장 조치</h4>
          <div className="space-y-2">
            {risk.recommendedActions.map(action => (
              <motion.div
                key={action.id}
                whileHover={{ scale: 1.01 }}
                onClick={() => setSelectedAction(selectedAction === action.id ? null : action.id)}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  selectedAction === action.id
                    ? 'bg-cyan-500/20 border-cyan-500/50'
                    : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-white text-sm">{action.action}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    action.urgency === 'HIGH' ? 'bg-red-500/20 text-red-400' :
                    action.urgency === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {action.urgency}
                  </span>
                </div>
                <p className="text-emerald-400 text-xs mt-1">{action.impact}</p>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* 타임라인 */}
      {risk.timeline && (
        <div>
          <h4 className="text-sm font-medium text-gray-400 mb-2">타임라인</h4>
          <div className="space-y-2">
            {risk.timeline.map((event, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-1.5 ${
                  event.type === 'critical' ? 'bg-red-500' :
                  event.type === 'warning' ? 'bg-yellow-500' :
                  event.type === 'success' ? 'bg-emerald-500' :
                  'bg-gray-500'
                }`} />
                <div>
                  <p className="text-gray-500 text-xs">{event.time}</p>
                  <p className="text-white text-sm">{event.event}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 해결 내역 */}
      {risk.status === 'RESOLVED' && risk.resolution && (
        <div className="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/30">
          <h4 className="text-sm font-medium text-emerald-400 mb-2">✅ 해결 완료</h4>
          <p className="text-white text-sm">{risk.resolution}</p>
          {risk.resolvedBy && (
            <p className="text-gray-400 text-xs mt-2">
              처리: {risk.resolvedBy.name} · {new Date(risk.resolvedAt).toLocaleDateString()}
            </p>
          )}
        </div>
      )}

      {/* 액션 버튼 */}
      {risk.status !== 'RESOLVED' && risk.status !== 'CLOSED' && (
        <div className="space-y-3">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="처리 노트..."
            className="w-full h-20 px-4 py-2 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 resize-none focus:border-cyan-500 focus:outline-none"
          />
          
          <div className="grid grid-cols-2 gap-3">
            {risk.status === 'OPEN' && (
              <button
                onClick={() => onStatusChange(risk.id, 'ASSIGNED')}
                className="py-3 bg-yellow-500/20 text-yellow-400 rounded-xl text-sm font-medium hover:bg-yellow-500/30 transition-colors border border-yellow-500/30"
              >
                담당자 배정
              </button>
            )}
            {(risk.status === 'OPEN' || risk.status === 'ASSIGNED') && (
              <button
                onClick={() => onStatusChange(risk.id, 'IN_PROGRESS')}
                className="py-3 bg-cyan-500/20 text-cyan-400 rounded-xl text-sm font-medium hover:bg-cyan-500/30 transition-colors border border-cyan-500/30"
              >
                처리 시작
              </button>
            )}
            <button
              onClick={() => onStatusChange(risk.id, 'ESCALATED')}
              className="py-3 bg-purple-500/20 text-purple-400 rounded-xl text-sm font-medium hover:bg-purple-500/30 transition-colors border border-purple-500/30"
            >
              상위 보고
            </button>
            <button
              onClick={() => onStatusChange(risk.id, 'RESOLVED')}
              className="py-3 bg-emerald-500/20 text-emerald-400 rounded-xl text-sm font-medium hover:bg-emerald-500/30 transition-colors border border-emerald-500/30"
            >
              해결 완료
            </button>
          </div>

          {selectedAction && (
            <button
              onClick={() => onAction(risk.id, selectedAction)}
              className="w-full py-3 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-xl text-sm font-bold hover:opacity-90 transition-opacity"
            >
              🚀 선택한 조치 실행
            </button>
          )}
        </div>
      )}
    </div>
  );
});

// 통계 카드
const StatCard = memo(function StatCard({ label, value, icon, color }) {
  return (
    <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
      <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
        <span>{icon}</span> {label}
      </div>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
    </div>
  );
});

// ============================================
// MAIN COMPONENT
// ============================================

export default function RiskQueueManager() {
  // Supabase hook
  const { data: students, loading: studentsLoading, isLive } = useStudents();

  // Transform high/critical risk students into risk queue format
  const liveRisks = useMemo(() => {
    if (!students || students.length === 0) return null;
    const atRiskStudents = students.filter(s => s.riskLevel === 'high' || s.riskLevel === 'critical');
    if (atRiskStudents.length === 0) return null;

    return atRiskStudents.map((s, idx) => ({
      id: `r-live-${s.id || idx}`,
      priority: s.riskLevel === 'critical' ? 'CRITICAL' : 'HIGH',
      status: 'OPEN',
      targetNode: {
        id: s.id || `s-${idx}`,
        name: s.name || `Student ${idx + 1}`,
        type: 'student',
        grade: s.grade || '',
        avatar: '👦',
      },
      relatedNodes: s.parent_name ? [
        { id: `p-${s.id || idx}`, name: s.parent_name, type: 'parent', relation: 'S-P' },
      ] : [],
      riskType: (s.engagement_score || 70) < 40 ? 'churn_imminent' : 'satisfaction_drop',
      metrics: {
        sIndex: (s.engagement_score || 70) / 100,
        sIndexDelta: -((100 - (s.engagement_score || 70)) / 100 * 0.3),
        mScore: s.skill_score || 50,
        churnProbability: s.riskLevel === 'critical'
          ? Math.min(0.95, 0.70 + Math.random() * 0.2)
          : Math.min(0.70, 0.40 + Math.random() * 0.2),
        daysToChurn: s.riskLevel === 'critical' ? 14 : 45,
        lastContact: Math.floor(Math.random() * 10) + 1,
      },
      triggerReason: s.riskLevel === 'critical'
        ? `${s.name}: 참여도 ${s.engagement_score || 0}% - 즉각 개입 필요`
        : `${s.name}: 만족도 하락 추세 감지`,
      aiAnalysis: {
        rootCause: (s.engagement_score || 70) < 40
          ? '참여도 급락 - 수업 흥미 상실 패턴'
          : '만족도 감소 - 추가 관리 필요',
        pattern: s.riskLevel === 'critical' ? '연속 하락 패턴 감지' : '점진적 하락 추세',
        similarCases: Math.floor(Math.random() * 30) + 5,
        successRate: 0.72,
      },
      recommendedActions: [
        { id: 'a1', action: '학부모 상담 전화', impact: '+20% s-Index 예상', urgency: s.riskLevel === 'critical' ? 'HIGH' : 'MEDIUM' },
        { id: 'a2', action: '맞춤형 수업 플랜 제공', impact: '+15% m-Score 예상', urgency: 'MEDIUM' },
      ],
      timeline: [
        { time: '최근', event: `참여도 ${s.engagement_score || 0}% 감지`, type: s.riskLevel === 'critical' ? 'critical' : 'warning' },
      ],
      createdAt: Date.now() - (idx * 86400000),
    }));
  }, [students]);

  // Use live risks if available, otherwise fallback to mock
  const [risks, setRisks] = useState(generateMockRisks);

  useEffect(() => {
    if (liveRisks && liveRisks.length > 0) {
      setRisks(liveRisks);
    }
  }, [liveRisks]);

  const [selectedRisk, setSelectedRisk] = useState(null);
  const [filter, setFilter] = useState('all'); // all, open, in_progress, resolved
  const [sortBy, setSortBy] = useState('priority'); // priority, date, churn

  // 필터링된 위험 목록
  const filteredRisks = risks.filter(risk => {
    if (filter === 'all') return true;
    if (filter === 'open') return ['OPEN', 'ASSIGNED'].includes(risk.status);
    if (filter === 'in_progress') return risk.status === 'IN_PROGRESS';
    if (filter === 'resolved') return ['RESOLVED', 'CLOSED'].includes(risk.status);
    return true;
  }).sort((a, b) => {
    if (sortBy === 'priority') {
      const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    if (sortBy === 'date') return b.createdAt - a.createdAt;
    if (sortBy === 'churn') {
      const aChurn = a.metrics?.churnProbability || 0;
      const bChurn = b.metrics?.churnProbability || 0;
      return bChurn - aChurn;
    }
    return 0;
  });

  // 통계
  const stats = {
    total: risks.length,
    critical: risks.filter(r => r.priority === 'CRITICAL' && r.status !== 'RESOLVED').length,
    open: risks.filter(r => ['OPEN', 'ASSIGNED'].includes(r.status)).length,
    resolved: risks.filter(r => r.status === 'RESOLVED').length,
  };

  // 상태 변경
  const handleStatusChange = useCallback((riskId, newStatus) => {
    setRisks(prev => prev.map(r => 
      r.id === riskId ? { ...r, status: newStatus } : r
    ));
    if (newStatus === 'RESOLVED') {
      setSelectedRisk(null);
    }
  }, []);

  // 액션 실행
  const handleAction = useCallback((riskId, actionId) => {
    console.log('🚀 Executing action:', { riskId, actionId });
    // n8n 워크플로우 트리거
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <span className="text-3xl">⚠️</span>
              Risk Queue Manager
              {isLive && <span className="text-xs font-normal bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-full">🟢 LIVE</span>}
            </h1>
            <p className="text-gray-400 mt-1">
              FSD 위기 판단 및 대응 관리 시스템
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-400 text-sm focus:outline-none focus:border-cyan-500"
            >
              <option value="priority">우선순위</option>
              <option value="date">최신순</option>
              <option value="churn">이탈 확률</option>
            </select>
          </div>
        </div>

        {/* 통계 */}
        <div className="grid grid-cols-4 gap-4">
          <StatCard label="전체 위험" value={stats.total} icon="📊" color="text-white" />
          <StatCard label="긴급 (CRITICAL)" value={stats.critical} icon="🔴" color="text-red-400" />
          <StatCard label="대기중" value={stats.open} icon="⏳" color="text-yellow-400" />
          <StatCard label="해결됨" value={stats.resolved} icon="✅" color="text-emerald-400" />
        </div>

        {/* 필터 탭 */}
        <div className="flex gap-2">
          {[
            { id: 'all', label: '전체' },
            { id: 'open', label: '대기중' },
            { id: 'in_progress', label: '처리중' },
            { id: 'resolved', label: '해결됨' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                filter === tab.id
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                  : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-2 gap-6">
          {/* Left: 위험 목록 */}
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {filteredRisks.map(risk => (
              <RiskListItem
                key={risk.id}
                risk={risk}
                selected={selectedRisk?.id === risk.id}
                onClick={() => setSelectedRisk(risk)}
              />
            ))}
            {filteredRisks.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                <span className="text-4xl">✅</span>
                <p className="mt-2">해당 조건의 위험이 없습니다</p>
              </div>
            )}
          </div>

          {/* Right: 상세 정보 */}
          <div className="bg-gray-800/30 rounded-xl border border-gray-700/50 p-4">
            <RiskDetailPanel
              risk={selectedRisk}
              onAction={handleAction}
              onStatusChange={handleStatusChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
