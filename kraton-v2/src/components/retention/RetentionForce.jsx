/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🛡️ KRATON Retention Force
 * 이탈 방지 시스템 - 고객 이탈 예측 및 자동 방어
 * 관계의 결속력을 측정하고 이탈 전 선제 대응
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useRef, memo, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStudents } from '../../hooks/useSupabaseData';

// ============================================
// MOCK DATA GENERATORS
// ============================================

const generateAtRiskStudents = () => [
  {
    id: 'STU-2013',
    name: '오연우',
    grade: '중2',
    teacher: '이선생',
    joinDate: '2024-03-15',
    monthsEnrolled: 10,
    churnProb: 0.82,
    churnDays: 14,
    sIndex: 0.32,
    sIndexTrend: -0.18,
    lastContact: 7,
    absentCount: 3,
    paymentStatus: 'normal',
    riskFactors: ['결석 증가', '만족도 하락', '학부모 앱 미접속'],
    ltv: 3200000,
    defenseStatus: 'pending',
  },
  {
    id: 'STU-1087',
    name: '김민지',
    grade: '중3',
    teacher: '박선생',
    joinDate: '2023-09-01',
    monthsEnrolled: 16,
    churnProb: 0.68,
    churnDays: 28,
    sIndex: 0.45,
    sIndexTrend: -0.12,
    lastContact: 14,
    absentCount: 1,
    paymentStatus: 'overdue',
    riskFactors: ['수강료 연체', '진로 고민'],
    ltv: 5120000,
    defenseStatus: 'in_progress',
  },
  {
    id: 'STU-0892',
    name: '이준혁',
    grade: '고1',
    teacher: '최선생',
    joinDate: '2024-01-10',
    monthsEnrolled: 12,
    churnProb: 0.55,
    churnDays: 45,
    sIndex: 0.48,
    sIndexTrend: -0.08,
    lastContact: 5,
    absentCount: 0,
    paymentStatus: 'normal',
    riskFactors: ['성적 정체', '동기 저하'],
    ltv: 3840000,
    defenseStatus: 'pending',
  },
  {
    id: 'STU-1456',
    name: '박서윤',
    grade: '초6',
    teacher: '정선생',
    joinDate: '2024-06-20',
    monthsEnrolled: 7,
    churnProb: 0.42,
    churnDays: 60,
    sIndex: 0.58,
    sIndexTrend: -0.05,
    lastContact: 3,
    absentCount: 0,
    paymentStatus: 'normal',
    riskFactors: ['케미 부조화'],
    ltv: 2240000,
    defenseStatus: 'resolved',
  },
];

const generateDefenseStrategies = () => [
  { id: 'DEF-001', name: '긴급 상담 콜', type: 'contact', priority: 'critical', successRate: 0.72, avgCost: 0 },
  { id: 'DEF-002', name: '맞춤 학습 플랜', type: 'service', priority: 'high', successRate: 0.65, avgCost: 0 },
  { id: 'DEF-003', name: '담당 선생님 변경', type: 'reassign', priority: 'medium', successRate: 0.58, avgCost: 0 },
  { id: 'DEF-004', name: '할인 프로모션', type: 'discount', priority: 'medium', successRate: 0.45, avgCost: 50000 },
  { id: 'DEF-005', name: '특별 케어 프로그램', type: 'premium', priority: 'high', successRate: 0.78, avgCost: 100000 },
];

const generateRetentionMetrics = () => ({
  totalAtRisk: 12,
  criticalCount: 4,
  avgChurnProb: 0.52,
  monthlyChurnRate: 0.08,
  retentionRate: 0.92,
  savedThisMonth: 8,
  ltvAtRisk: 45600000,
  defenseSuccessRate: 0.68,
});

const generateDefenseHistory = () => [
  { id: 1, student: '강예은', strategy: '긴급 상담 콜', result: 'success', date: '1일 전', ltv: '₩2.8M' },
  { id: 2, student: '최민수', strategy: '할인 프로모션', result: 'success', date: '3일 전', ltv: '₩3.2M' },
  { id: 3, student: '정유진', strategy: '담당 선생님 변경', result: 'success', date: '5일 전', ltv: '₩4.1M' },
  { id: 4, student: '한소희', strategy: '맞춤 학습 플랜', result: 'failed', date: '7일 전', ltv: '₩2.5M' },
  { id: 5, student: '윤서준', strategy: '특별 케어 프로그램', result: 'success', date: '10일 전', ltv: '₩5.6M' },
];

// ============================================
// UTILITY FUNCTIONS
// ============================================

const formatCurrency = (value) => {
  if (value >= 1e6) return `₩${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `₩${(value / 1e3).toFixed(0)}K`;
  return `₩${value.toLocaleString()}`;
};

const getChurnRiskLevel = (prob) => {
  if (prob >= 0.7) return { level: 'critical', color: 'red', label: '위험' };
  if (prob >= 0.5) return { level: 'high', color: 'orange', label: '주의' };
  if (prob >= 0.3) return { level: 'medium', color: 'yellow', label: '관찰' };
  return { level: 'low', color: 'green', label: '안정' };
};

// ============================================
// SUB COMPONENTS
// ============================================

// Retention Metrics
const RetentionMetrics = memo(function RetentionMetrics({ metrics }) {
  return (
    <div className="grid grid-cols-4 gap-4">
      <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-400 text-sm">유지율</span>
          <span className="text-2xl">🛡️</span>
        </div>
        <p className={`text-2xl font-bold ${metrics.retentionRate >= 0.9 ? 'text-emerald-400' : 'text-yellow-400'}`}>
          {(metrics.retentionRate * 100).toFixed(0)}%
        </p>
        <p className="text-gray-500 text-xs">이번 달 유지율</p>
      </div>

      <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-400 text-sm">위험 학생</span>
          <span className="text-2xl">⚠️</span>
        </div>
        <p className="text-2xl font-bold text-red-400">{metrics.criticalCount}명</p>
        <p className="text-gray-500 text-xs">즉시 개입 필요</p>
      </div>

      <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-400 text-sm">방어 성공</span>
          <span className="text-2xl">✅</span>
        </div>
        <p className="text-2xl font-bold text-emerald-400">{metrics.savedThisMonth}명</p>
        <p className="text-gray-500 text-xs">이번 달 이탈 방지</p>
      </div>

      <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-400 text-sm">위험 LTV</span>
          <span className="text-2xl">💰</span>
        </div>
        <p className="text-2xl font-bold text-yellow-400">{formatCurrency(metrics.ltvAtRisk)}</p>
        <p className="text-gray-500 text-xs">이탈 시 손실 예상</p>
      </div>
    </div>
  );
});

// Churn Probability Gauge
const ChurnGauge = memo(function ChurnGauge({ probability, size = 80 }) {
  const risk = getChurnRiskLevel(probability);
  const percentage = probability * 100;
  const circumference = 2 * Math.PI * 35;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 80 80" className="transform -rotate-90">
        <circle
          cx="40"
          cy="40"
          r="35"
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="6"
        />
        <motion.circle
          cx="40"
          cy="40"
          r="35"
          fill="none"
          stroke={risk.color === 'red' ? '#ef4444' : risk.color === 'orange' ? '#f97316' : risk.color === 'yellow' ? '#eab308' : '#22c55e'}
          strokeWidth="6"
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          style={{ strokeDasharray: circumference }}
          transition={{ duration: 1 }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-lg font-bold ${
          risk.color === 'red' ? 'text-red-400' : 
          risk.color === 'orange' ? 'text-orange-400' : 
          risk.color === 'yellow' ? 'text-yellow-400' : 'text-emerald-400'
        }`}>
          {percentage.toFixed(0)}%
        </span>
      </div>
    </div>
  );
});

// Student Risk Card
const StudentRiskCard = memo(function StudentRiskCard({ student, selected, onClick, onDefense }) {
  const risk = getChurnRiskLevel(student.churnProb);

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      onClick={onClick}
      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
        selected
          ? `bg-${risk.color}-500/10 border-${risk.color}-500/50`
          : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
      }`}
    >
      <div className="flex items-start gap-4">
        <ChurnGauge probability={student.churnProb} size={70} />
        
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-white font-medium">{student.name}</p>
              <p className="text-gray-500 text-xs">{student.grade} · {student.teacher} · {student.monthsEnrolled}개월</p>
            </div>
            <span className={`px-2 py-1 rounded-lg text-xs ${
              risk.color === 'red' ? 'bg-red-500/20 text-red-400' :
              risk.color === 'orange' ? 'bg-orange-500/20 text-orange-400' :
              risk.color === 'yellow' ? 'bg-yellow-500/20 text-yellow-400' :
              'bg-emerald-500/20 text-emerald-400'
            }`}>
              {risk.label}
            </span>
          </div>

          <div className="flex flex-wrap gap-1 mb-3">
            {student.riskFactors.map((factor, idx) => (
              <span key={idx} className="px-2 py-0.5 bg-gray-700/50 rounded text-gray-400 text-xs">
                {factor}
              </span>
            ))}
          </div>

          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-3">
              <span className="text-gray-500">예상 이탈: <span className="text-red-400">{student.churnDays}일</span></span>
              <span className="text-gray-500">LTV: <span className="text-cyan-400">{formatCurrency(student.ltv)}</span></span>
            </div>
            {student.defenseStatus === 'pending' && (
              <button
                onClick={(e) => { e.stopPropagation(); onDefense(student.id); }}
                className="px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors"
              >
                방어 시작
              </button>
            )}
            {student.defenseStatus === 'in_progress' && (
              <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-lg">방어 중</span>
            )}
            {student.defenseStatus === 'resolved' && (
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-lg">방어 완료</span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
});

// Student Detail Panel
const StudentDetailPanel = memo(function StudentDetailPanel({ student, strategies, onApplyStrategy }) {
  if (!student) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <div className="text-center">
          <span className="text-4xl mb-4 block">🛡️</span>
          <p>학생을 선택하면 상세 정보가 표시됩니다</p>
        </div>
      </div>
    );
  }

  const risk = getChurnRiskLevel(student.churnProb);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className={`p-4 rounded-xl bg-gradient-to-r ${
        risk.color === 'red' ? 'from-red-500/10 to-orange-500/10 border-red-500/30' :
        risk.color === 'orange' ? 'from-orange-500/10 to-yellow-500/10 border-orange-500/30' :
        'from-yellow-500/10 to-emerald-500/10 border-yellow-500/30'
      } border`}>
        <div className="flex items-center gap-4">
          <ChurnGauge probability={student.churnProb} size={80} />
          <div>
            <h3 className="text-white font-bold text-lg">{student.name}</h3>
            <p className="text-gray-400">{student.grade} · {student.id}</p>
            <p className={`text-sm ${risk.color === 'red' ? 'text-red-400' : risk.color === 'orange' ? 'text-orange-400' : 'text-yellow-400'}`}>
              예상 이탈까지 {student.churnDays}일
            </p>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="p-4 bg-gray-800/50 rounded-xl">
        <h4 className="text-white font-medium mb-3">핵심 지표</h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="p-2 bg-gray-900/50 rounded-lg">
            <p className="text-gray-500 text-xs">s-Index</p>
            <p className={`text-lg font-bold ${student.sIndex < 0.5 ? 'text-red-400' : 'text-emerald-400'}`}>
              {(student.sIndex * 100).toFixed(0)}%
            </p>
            <p className="text-red-400 text-xs">{(student.sIndexTrend * 100).toFixed(0)}% ↓</p>
          </div>
          <div className="p-2 bg-gray-900/50 rounded-lg">
            <p className="text-gray-500 text-xs">마지막 연락</p>
            <p className={`text-lg font-bold ${student.lastContact > 7 ? 'text-yellow-400' : 'text-emerald-400'}`}>
              {student.lastContact}일 전
            </p>
          </div>
          <div className="p-2 bg-gray-900/50 rounded-lg">
            <p className="text-gray-500 text-xs">결석 횟수</p>
            <p className={`text-lg font-bold ${student.absentCount > 2 ? 'text-red-400' : 'text-emerald-400'}`}>
              {student.absentCount}회
            </p>
          </div>
          <div className="p-2 bg-gray-900/50 rounded-lg">
            <p className="text-gray-500 text-xs">LTV</p>
            <p className="text-lg font-bold text-cyan-400">{formatCurrency(student.ltv)}</p>
          </div>
        </div>
      </div>

      {/* Risk Factors */}
      <div className="p-4 bg-gray-800/50 rounded-xl">
        <h4 className="text-white font-medium mb-3 flex items-center gap-2">
          <span className="text-red-400">⚠️</span> 위험 요인
        </h4>
        <div className="space-y-2">
          {student.riskFactors.map((factor, idx) => (
            <div key={idx} className="p-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {factor}
            </div>
          ))}
        </div>
      </div>

      {/* Defense Strategies */}
      <div className="p-4 bg-gray-800/50 rounded-xl">
        <h4 className="text-white font-medium mb-3 flex items-center gap-2">
          <span className="text-cyan-400">🛡️</span> 방어 전략
        </h4>
        <div className="space-y-2">
          {strategies.slice(0, 3).map(strategy => (
            <button
              key={strategy.id}
              onClick={() => onApplyStrategy(student.id, strategy.id)}
              className="w-full p-3 bg-gray-900/50 rounded-lg flex items-center justify-between hover:bg-gray-900/80 transition-colors"
            >
              <div className="text-left">
                <p className="text-white text-sm">{strategy.name}</p>
                <p className="text-gray-500 text-xs">성공률 {(strategy.successRate * 100).toFixed(0)}%</p>
              </div>
              <span className={`px-2 py-1 rounded text-xs ${
                strategy.priority === 'critical' ? 'bg-red-500/20 text-red-400' :
                strategy.priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                'bg-yellow-500/20 text-yellow-400'
              }`}>
                {strategy.priority === 'critical' ? '긴급' : strategy.priority === 'high' ? '높음' : '보통'}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
});

// Retention Funnel
const RetentionFunnel = memo(function RetentionFunnel({ metrics }) {
  const stages = [
    { label: '전체 학생', count: 245, color: 'cyan' },
    { label: '관찰 대상', count: 45, color: 'yellow' },
    { label: '주의 필요', count: 18, color: 'orange' },
    { label: '위험', count: metrics.criticalCount, color: 'red' },
  ];

  return (
    <div className="space-y-2">
      {stages.map((stage, idx) => (
        <div key={stage.label} className="relative">
          <div 
            className={`h-10 rounded-lg bg-${stage.color}-500/20 border border-${stage.color}-500/30 flex items-center justify-between px-4`}
            style={{ width: `${100 - idx * 15}%` }}
          >
            <span className={`text-${stage.color}-400 text-sm`}>{stage.label}</span>
            <span className={`text-${stage.color}-400 font-bold`}>{stage.count}명</span>
          </div>
        </div>
      ))}
    </div>
  );
});

// Defense History
const DefenseHistory = memo(function DefenseHistory({ history }) {
  return (
    <div className="space-y-2 max-h-48 overflow-y-auto">
      {history.map(item => (
        <div key={item.id} className="p-3 bg-gray-800/50 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={`w-2 h-2 rounded-full ${item.result === 'success' ? 'bg-emerald-400' : 'bg-red-400'}`} />
            <div>
              <p className="text-white text-sm">{item.student}</p>
              <p className="text-gray-500 text-xs">{item.strategy}</p>
            </div>
          </div>
          <div className="text-right">
            <p className={`text-xs ${item.result === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
              {item.result === 'success' ? '방어 성공' : '방어 실패'}
            </p>
            <p className="text-gray-600 text-xs">{item.date}</p>
          </div>
        </div>
      ))}
    </div>
  );
});

// AI Recommendation
const AIRecommendation = memo(function AIRecommendation({ student }) {
  if (!student) return null;

  const recommendations = [
    student.churnProb > 0.7 && '⚡ 24시간 내 학부모 긴급 상담 필요',
    student.lastContact > 7 && '📞 즉시 연락 시도 권장',
    student.absentCount > 2 && '🏠 가정 방문 고려',
    student.sIndexTrend < -0.1 && '📊 맞춤 학습 플랜 재설계 필요',
  ].filter(Boolean);

  return (
    <div className="p-4 bg-gradient-to-r from-purple-500/10 to-cyan-500/10 rounded-xl border border-purple-500/30">
      <h4 className="text-purple-400 font-medium mb-3 flex items-center gap-2">
        <span>🤖</span> AI 권장 사항
      </h4>
      <div className="space-y-2">
        {recommendations.map((rec, idx) => (
          <p key={idx} className="text-white text-sm">{rec}</p>
        ))}
      </div>
    </div>
  );
});

// ============================================
// MAIN COMPONENT
// ============================================

export default function RetentionForce() {
  // === Supabase Live Data ===
  const { data: liveStudents, loading: studentsLoading, isLive } = useStudents();

  // Transform live students with engagement_score < 75 into at-risk format
  const liveAtRiskStudents = useMemo(() => {
    if (!liveStudents || liveStudents.length === 0) return null;
    const atRisk = liveStudents
      .filter(s => s.engagement_score < 75 || s.riskLevel !== 'normal')
      .map(s => {
        const engagement = s.engagement_score || 70;
        const churnProb = Math.min(Math.max((100 - engagement) / 100, 0), 1);
        const riskFactorsList = [];
        if (engagement < 50) riskFactorsList.push('참여도 급감');
        if (engagement < 65) riskFactorsList.push('동기 저하');
        if ((s.parent_nps || 50) < 40) riskFactorsList.push('학부모 만족도 하락');
        if ((s.game_performance || 50) < 40) riskFactorsList.push('성적 정체');
        if ((s.skill_score || 50) < 40) riskFactorsList.push('실력 부진');
        if (riskFactorsList.length === 0) riskFactorsList.push('관찰 필요');

        return {
          id: s.id || `STU-${Math.random().toString(36).substr(2, 4)}`,
          name: s.name || '이름 없음',
          grade: s.grade || '-',
          teacher: '-',
          joinDate: s.created_at || new Date().toISOString(),
          monthsEnrolled: s.created_at
            ? Math.max(1, Math.floor((Date.now() - new Date(s.created_at).getTime()) / (30 * 24 * 60 * 60 * 1000)))
            : 6,
          churnProb,
          churnDays: Math.max(7, Math.round((engagement / 100) * 90)),
          sIndex: engagement / 100,
          sIndexTrend: engagement < 60 ? -0.15 : engagement < 75 ? -0.08 : -0.03,
          lastContact: Math.round(Math.random() * 14) + 1,
          absentCount: engagement < 50 ? 3 : engagement < 65 ? 1 : 0,
          paymentStatus: 'normal',
          riskFactors: riskFactorsList,
          ltv: (s.vIndex || 1000) * 1000,
          defenseStatus: s.riskLevel === 'critical' ? 'pending' : s.riskLevel === 'high' ? 'pending' : 'resolved',
        };
      })
      .sort((a, b) => b.churnProb - a.churnProb);
    return atRisk.length > 0 ? atRisk : null;
  }, [liveStudents]);

  // Compute live metrics from student data
  const liveMetrics = useMemo(() => {
    if (!liveStudents || liveStudents.length === 0) return null;
    const atRiskList = liveStudents.filter(s => s.riskLevel !== 'normal');
    const criticals = liveStudents.filter(s => s.riskLevel === 'critical' || s.riskLevel === 'high');
    const avgEngagement = liveStudents.reduce((sum, s) => sum + (s.engagement_score || 70), 0) / liveStudents.length;
    const totalLtv = atRiskList.reduce((sum, s) => sum + (s.vIndex || 1000) * 1000, 0);
    return {
      totalAtRisk: atRiskList.length,
      criticalCount: criticals.length,
      avgChurnProb: Math.max(0, (100 - avgEngagement) / 100),
      monthlyChurnRate: criticals.length / Math.max(liveStudents.length, 1),
      retentionRate: 1 - (criticals.length / Math.max(liveStudents.length, 1)),
      savedThisMonth: Math.max(0, atRiskList.length - criticals.length),
      ltvAtRisk: totalLtv,
      defenseSuccessRate: 0.68,
    };
  }, [liveStudents]);

  const [students, setStudents] = useState(generateAtRiskStudents);
  const [strategies] = useState(generateDefenseStrategies);
  const [metrics] = useState(generateRetentionMetrics);
  const [history] = useState(generateDefenseHistory);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [filter, setFilter] = useState('all');

  // Sync live data into local state when available
  useEffect(() => {
    if (liveAtRiskStudents) {
      setStudents(liveAtRiskStudents);
    }
  }, [liveAtRiskStudents]);

  // Use live metrics if available, otherwise fallback
  const activeMetrics = liveMetrics || metrics;

  // Filter students
  const filteredStudents = useMemo(() => {
    if (filter === 'all') return students;
    if (filter === 'critical') return students.filter(s => s.churnProb >= 0.7);
    if (filter === 'pending') return students.filter(s => s.defenseStatus === 'pending');
    return students;
  }, [students, filter]);

  // Start defense
  const handleStartDefense = useCallback((studentId) => {
    setStudents(prev => prev.map(s =>
      s.id === studentId ? { ...s, defenseStatus: 'in_progress' } : s
    ));
  }, []);

  // Apply strategy
  const handleApplyStrategy = useCallback((studentId, strategyId) => {
    console.log(`Apply strategy ${strategyId} to student ${studentId}`);
    setStudents(prev => prev.map(s =>
      s.id === studentId ? { ...s, defenseStatus: 'in_progress' } : s
    ));
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <span className="text-3xl">🛡️</span>
              Retention Force
            </h1>
            <p className="text-gray-400 mt-1">이탈 방지 시스템 - 고객 유지 전선</p>
          </div>
          <div className="flex items-center gap-3">
            {isLive && (
              <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-400 text-xs font-medium">LIVE</span>
              </div>
            )}
            <div className="px-4 py-2 bg-emerald-500/20 border border-emerald-500/50 rounded-xl">
              <span className="text-emerald-400 font-medium">
                이번 달 {activeMetrics.savedThisMonth}명 방어 성공
              </span>
            </div>
          </div>
        </div>

        {/* Metrics */}
        <RetentionMetrics metrics={activeMetrics} />

        {/* Main Content */}
        <div className="grid grid-cols-3 gap-6">
          {/* At-Risk Students */}
          <div className="col-span-2 space-y-4">
            {/* Filter */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {[
                  { id: 'all', label: '전체' },
                  { id: 'critical', label: '위험' },
                  { id: 'pending', label: '대기 중' },
                ].map(f => (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id)}
                    className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                      filter === f.id
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                        : 'bg-gray-800 text-gray-400 border border-gray-700'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <span className="text-gray-500 text-sm">{filteredStudents.length}명</span>
            </div>

            {/* Student List */}
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
              {filteredStudents.map(student => (
                <StudentRiskCard
                  key={student.id}
                  student={student}
                  selected={selectedStudent?.id === student.id}
                  onClick={() => setSelectedStudent(student)}
                  onDefense={handleStartDefense}
                />
              ))}
            </div>
          </div>

          {/* Side Panel */}
          <div className="space-y-4">
            {/* Funnel */}
            <div className="bg-gray-800/30 rounded-xl border border-gray-700/50 p-4">
              <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                <span className="text-cyan-400">📊</span>
                Retention Funnel
              </h3>
              <RetentionFunnel metrics={activeMetrics} />
            </div>

            {/* Student Detail */}
            <div className="bg-gray-800/30 rounded-xl border border-gray-700/50 p-4 max-h-[400px] overflow-y-auto">
              <h3 className="text-white font-medium mb-4">학생 상세</h3>
              <StudentDetailPanel
                student={selectedStudent}
                strategies={strategies}
                onApplyStrategy={handleApplyStrategy}
              />
            </div>

            {/* AI Recommendation */}
            {selectedStudent && <AIRecommendation student={selectedStudent} />}

            {/* Defense History */}
            <div className="bg-gray-800/30 rounded-xl border border-gray-700/50 p-4">
              <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                <span className="text-emerald-400">📜</span>
                방어 이력
              </h3>
              <DefenseHistory history={history} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
