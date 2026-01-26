/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🤖 KRATON Auto-Actuation System
 * 자동 실행 시스템 - 사람 개입 없이 자동 대응
 * n8n 워크플로우 연동 + 조건부 자동 실행
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useRef, memo, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// MOCK DATA GENERATORS
// ============================================

const generateActuationRules = () => [
  {
    id: 'RULE-001',
    name: '이탈 위험 자동 알림',
    description: 's-Index < 40% + 결석 2회 이상 시 담당자에게 즉시 알림',
    trigger: { type: 'compound', conditions: [
      { field: 's_index', operator: '<', value: 0.4 },
      { field: 'absent_count', operator: '>=', value: 2 }
    ]},
    action: { type: 'notify', target: 'teacher', method: 'push', priority: 'high' },
    status: 'active',
    executions: 47,
    lastExec: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    successRate: 0.94,
  },
  {
    id: 'RULE-002',
    name: '자동 상담 스케줄링',
    description: '만족도 하락 감지 시 48시간 내 상담 자동 예약',
    trigger: { type: 'delta', field: 's_index', operator: 'decrease', value: 0.15, period: '7d' },
    action: { type: 'schedule', target: 'consultation', within: '48h' },
    status: 'active',
    executions: 23,
    lastExec: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    successRate: 0.87,
  },
  {
    id: 'RULE-003',
    name: '결제 리마인더',
    description: '납부일 3일 전 자동 알림 발송',
    trigger: { type: 'schedule', field: 'payment_due', operator: 'before', value: 3, unit: 'days' },
    action: { type: 'message', target: 'parent', template: 'payment_reminder' },
    status: 'active',
    executions: 156,
    lastExec: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    successRate: 0.99,
  },
  {
    id: 'RULE-004',
    name: '케미 부조화 재배치',
    description: 'Chemistry Score < -30% 시 FSD에 재배치 요청',
    trigger: { type: 'threshold', field: 'chemistry_score', operator: '<', value: -0.3 },
    action: { type: 'escalate', target: 'fsd', request: 'reassignment' },
    status: 'active',
    executions: 8,
    lastExec: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    successRate: 1.0,
  },
  {
    id: 'RULE-005',
    name: '성취 보상 자동 지급',
    description: '목표 달성 시 포인트 자동 지급 + 축하 메시지',
    trigger: { type: 'event', field: 'goal_achieved', value: true },
    action: { type: 'reward', points: 100, message: 'congratulation' },
    status: 'active',
    executions: 312,
    lastExec: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    successRate: 1.0,
  },
  {
    id: 'RULE-006',
    name: '긴급 이탈 방지',
    description: '이탈 확률 > 80% 시 Principal에 즉시 에스컬레이션',
    trigger: { type: 'threshold', field: 'churn_probability', operator: '>', value: 0.8 },
    action: { type: 'escalate', target: 'principal', priority: 'critical' },
    status: 'active',
    executions: 12,
    lastExec: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    successRate: 0.92,
  },
];

const generateExecutionLogs = () => [
  { id: 1, ruleId: 'RULE-001', ruleName: '이탈 위험 자동 알림', target: '오연우', action: '담당자 알림', status: 'success', time: '15분 전' },
  { id: 2, ruleId: 'RULE-006', ruleName: '긴급 이탈 방지', target: '오연우', action: 'Principal 에스컬레이션', status: 'success', time: '15분 전' },
  { id: 3, ruleId: 'RULE-005', ruleName: '성취 보상 자동 지급', target: '김서연', action: '100P 지급', status: 'success', time: '45분 전' },
  { id: 4, ruleId: 'RULE-003', ruleName: '결제 리마인더', target: '박지민 학부모', action: '알림 발송', status: 'success', time: '1시간 전' },
  { id: 5, ruleId: 'RULE-002', ruleName: '자동 상담 스케줄링', target: '이준혁', action: '상담 예약', status: 'success', time: '2시간 전' },
  { id: 6, ruleId: 'RULE-003', ruleName: '결제 리마인더', target: '최민수 학부모', action: '알림 발송', status: 'success', time: '5시간 전' },
  { id: 7, ruleId: 'RULE-001', ruleName: '이탈 위험 자동 알림', target: '강예은', action: '담당자 알림', status: 'failed', time: '6시간 전', error: '담당자 미지정' },
];

const generateSystemMetrics = () => ({
  totalRules: 6,
  activeRules: 6,
  todayExecutions: 24,
  successRate: 0.96,
  avgResponseTime: 0.8,
  automationRate: 0.73,
  savedHours: 18.5,
  pendingActions: 3,
});

// ============================================
// UTILITY FUNCTIONS
// ============================================

const formatTime = (isoString) => {
  const date = new Date(isoString);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000 / 60);
  if (diff < 60) return `${diff}분 전`;
  if (diff < 1440) return `${Math.floor(diff / 60)}시간 전`;
  return date.toLocaleDateString('ko-KR');
};

const getActionTypeConfig = (type) => ({
  notify: { icon: '🔔', label: '알림', color: 'cyan' },
  message: { icon: '💬', label: '메시지', color: 'blue' },
  schedule: { icon: '📅', label: '스케줄', color: 'purple' },
  escalate: { icon: '⬆️', label: '에스컬레이션', color: 'orange' },
  reward: { icon: '🎁', label: '보상', color: 'emerald' },
}[type] || { icon: '⚡', label: '액션', color: 'gray' });

const getTriggerDescription = (trigger) => {
  switch (trigger.type) {
    case 'threshold':
      return `${trigger.field} ${trigger.operator} ${trigger.value}`;
    case 'compound':
      return trigger.conditions.map(c => `${c.field} ${c.operator} ${c.value}`).join(' AND ');
    case 'delta':
      return `${trigger.field} ${trigger.operator} ${(trigger.value * 100).toFixed(0)}% (${trigger.period})`;
    case 'schedule':
      return `${trigger.field} ${trigger.operator} ${trigger.value} ${trigger.unit}`;
    case 'event':
      return `${trigger.field} = ${trigger.value}`;
    default:
      return 'Unknown trigger';
  }
};

// ============================================
// SUB COMPONENTS
// ============================================

// System Metrics
const SystemMetrics = memo(function SystemMetrics({ metrics }) {
  return (
    <div className="grid grid-cols-4 gap-4">
      <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-400 text-sm">자동화율</span>
          <span className="text-2xl">🤖</span>
        </div>
        <p className="text-2xl font-bold text-cyan-400">{(metrics.automationRate * 100).toFixed(0)}%</p>
        <p className="text-gray-500 text-xs">사람 개입 없는 처리</p>
      </div>

      <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-400 text-sm">오늘 실행</span>
          <span className="text-2xl">⚡</span>
        </div>
        <p className="text-2xl font-bold text-purple-400">{metrics.todayExecutions}회</p>
        <p className="text-emerald-400 text-xs">성공률 {(metrics.successRate * 100).toFixed(0)}%</p>
      </div>

      <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-400 text-sm">응답 시간</span>
          <span className="text-2xl">⏱️</span>
        </div>
        <p className="text-2xl font-bold text-emerald-400">{metrics.avgResponseTime}초</p>
        <p className="text-gray-500 text-xs">평균 반응 속도</p>
      </div>

      <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-400 text-sm">절감 시간</span>
          <span className="text-2xl">💰</span>
        </div>
        <p className="text-2xl font-bold text-yellow-400">{metrics.savedHours}h</p>
        <p className="text-gray-500 text-xs">오늘 절감된 인력 시간</p>
      </div>
    </div>
  );
});

// Rule Card
const RuleCard = memo(function RuleCard({ rule, onToggle, onEdit, selected, onClick }) {
  const actionConfig = getActionTypeConfig(rule.action.type);
  
  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      onClick={onClick}
      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
        selected
          ? 'bg-cyan-500/10 border-cyan-500/50'
          : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl bg-${actionConfig.color}-500/20 flex items-center justify-center`}>
            <span className="text-xl">{actionConfig.icon}</span>
          </div>
          <div>
            <p className="text-white font-medium">{rule.name}</p>
            <p className="text-gray-500 text-xs">{rule.id}</p>
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(rule.id); }}
          className={`w-12 h-6 rounded-full transition-colors relative ${
            rule.status === 'active' ? 'bg-emerald-500' : 'bg-gray-600'
          }`}
        >
          <motion.div
            animate={{ x: rule.status === 'active' ? 24 : 2 }}
            className="absolute top-1 w-4 h-4 bg-white rounded-full"
          />
        </button>
      </div>

      <p className="text-gray-400 text-sm mb-3">{rule.description}</p>

      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <span className="px-2 py-1 bg-gray-700/50 rounded text-gray-400">
            실행 {rule.executions}회
          </span>
          <span className={`px-2 py-1 rounded ${
            rule.successRate >= 0.95 ? 'bg-emerald-500/20 text-emerald-400' :
            rule.successRate >= 0.8 ? 'bg-yellow-500/20 text-yellow-400' :
            'bg-red-500/20 text-red-400'
          }`}>
            성공률 {(rule.successRate * 100).toFixed(0)}%
          </span>
        </div>
        <span className="text-gray-500">{formatTime(rule.lastExec)}</span>
      </div>
    </motion.div>
  );
});

// Rule Detail Panel
const RuleDetailPanel = memo(function RuleDetailPanel({ rule, onTestRun }) {
  if (!rule) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <div className="text-center">
          <span className="text-4xl mb-4 block">🤖</span>
          <p>규칙을 선택하면 상세 정보가 표시됩니다</p>
        </div>
      </div>
    );
  }

  const actionConfig = getActionTypeConfig(rule.action.type);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 rounded-xl border border-cyan-500/30">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">{actionConfig.icon}</span>
          <div>
            <h3 className="text-white font-bold text-lg">{rule.name}</h3>
            <p className="text-gray-400 text-sm">{rule.id}</p>
          </div>
        </div>
        <p className="text-gray-300">{rule.description}</p>
      </div>

      {/* Trigger */}
      <div className="p-4 bg-gray-800/50 rounded-xl">
        <h4 className="text-white font-medium mb-3 flex items-center gap-2">
          <span className="text-yellow-400">⚡</span> 트리거 조건
        </h4>
        <div className="p-3 bg-gray-900/50 rounded-lg font-mono text-sm">
          <span className="text-purple-400">WHEN</span>
          <span className="text-gray-300 ml-2">{getTriggerDescription(rule.trigger)}</span>
        </div>
      </div>

      {/* Action */}
      <div className="p-4 bg-gray-800/50 rounded-xl">
        <h4 className="text-white font-medium mb-3 flex items-center gap-2">
          <span className="text-cyan-400">🎯</span> 실행 액션
        </h4>
        <div className="p-3 bg-gray-900/50 rounded-lg font-mono text-sm">
          <span className="text-cyan-400">THEN</span>
          <span className="text-gray-300 ml-2">
            {actionConfig.label} → {rule.action.target}
            {rule.action.priority && ` (${rule.action.priority})`}
            {rule.action.within && ` within ${rule.action.within}`}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="p-4 bg-gray-800/50 rounded-xl">
        <h4 className="text-white font-medium mb-3 flex items-center gap-2">
          <span className="text-emerald-400">📊</span> 실행 통계
        </h4>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-2 bg-gray-900/50 rounded-lg">
            <p className="text-xl font-bold text-purple-400">{rule.executions}</p>
            <p className="text-gray-500 text-xs">총 실행</p>
          </div>
          <div className="p-2 bg-gray-900/50 rounded-lg">
            <p className="text-xl font-bold text-emerald-400">{(rule.successRate * 100).toFixed(0)}%</p>
            <p className="text-gray-500 text-xs">성공률</p>
          </div>
          <div className="p-2 bg-gray-900/50 rounded-lg">
            <p className="text-xl font-bold text-cyan-400">{formatTime(rule.lastExec)}</p>
            <p className="text-gray-500 text-xs">마지막 실행</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => onTestRun(rule.id)}
          className="p-3 bg-cyan-500/20 text-cyan-400 rounded-xl font-medium hover:bg-cyan-500/30 transition-colors flex items-center justify-center gap-2"
        >
          <span>🧪</span> 테스트 실행
        </button>
        <button className="p-3 bg-purple-500/20 text-purple-400 rounded-xl font-medium hover:bg-purple-500/30 transition-colors flex items-center justify-center gap-2">
          <span>✏️</span> 규칙 편집
        </button>
      </div>
    </div>
  );
});

// Execution Log
const ExecutionLog = memo(function ExecutionLog({ logs }) {
  return (
    <div className="space-y-2 max-h-64 overflow-y-auto">
      {logs.map(log => (
        <div 
          key={log.id}
          className="p-3 bg-gray-800/50 rounded-lg flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <span className={`w-2 h-2 rounded-full ${
              log.status === 'success' ? 'bg-emerald-400' : 'bg-red-400'
            }`} />
            <div>
              <p className="text-white text-sm">{log.ruleName}</p>
              <p className="text-gray-500 text-xs">
                {log.target} → {log.action}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className={`text-xs ${log.status === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
              {log.status === 'success' ? '성공' : '실패'}
            </p>
            <p className="text-gray-600 text-xs">{log.time}</p>
          </div>
        </div>
      ))}
    </div>
  );
});

// Automation Flow Visualization
const AutomationFlow = memo(function AutomationFlow() {
  const canvasRef = useRef(null);
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setParticles(prev => {
        const newParticles = prev
          .map(p => ({ ...p, x: p.x + p.vx, opacity: p.opacity - 0.02 }))
          .filter(p => p.opacity > 0);
        
        if (Math.random() > 0.7) {
          newParticles.push({
            id: Date.now(),
            x: 50,
            y: 60 + Math.random() * 80,
            vx: 2 + Math.random(),
            opacity: 1,
          });
        }
        return newParticles;
      });
    }, 50);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative h-48 bg-gray-900/50 rounded-xl overflow-hidden">
      {/* Nodes */}
      <div className="absolute left-8 top-1/2 -translate-y-1/2 flex flex-col gap-4">
        <div className="px-3 py-2 bg-blue-500/20 border border-blue-500/50 rounded-lg text-blue-400 text-xs">
          📊 Data Input
        </div>
      </div>

      <div className="absolute left-1/3 top-1/2 -translate-y-1/2">
        <div className="px-3 py-2 bg-purple-500/20 border border-purple-500/50 rounded-lg text-purple-400 text-xs">
          ⚡ Trigger Engine
        </div>
      </div>

      <div className="absolute left-2/3 top-1/2 -translate-y-1/2 -translate-x-1/2">
        <div className="px-3 py-2 bg-cyan-500/20 border border-cyan-500/50 rounded-lg text-cyan-400 text-xs">
          🎯 Action Executor
        </div>
      </div>

      <div className="absolute right-8 top-1/2 -translate-y-1/2 flex flex-col gap-2">
        <div className="px-2 py-1 bg-emerald-500/20 border border-emerald-500/50 rounded text-emerald-400 text-[10px]">
          🔔 Notify
        </div>
        <div className="px-2 py-1 bg-emerald-500/20 border border-emerald-500/50 rounded text-emerald-400 text-[10px]">
          💬 Message
        </div>
        <div className="px-2 py-1 bg-emerald-500/20 border border-emerald-500/50 rounded text-emerald-400 text-[10px]">
          📅 Schedule
        </div>
      </div>

      {/* Particles */}
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute w-2 h-2 bg-cyan-400 rounded-full"
          style={{ 
            left: p.x, 
            top: p.y,
            opacity: p.opacity,
            boxShadow: '0 0 10px rgba(0, 255, 255, 0.5)'
          }}
        />
      ))}

      {/* Connection Lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <line x1="100" y1="50%" x2="33%" y2="50%" stroke="rgba(100,200,255,0.2)" strokeDasharray="5,5" />
        <line x1="40%" y1="50%" x2="60%" y2="50%" stroke="rgba(100,200,255,0.2)" strokeDasharray="5,5" />
        <line x1="70%" y1="50%" x2="85%" y2="30%" stroke="rgba(100,200,255,0.2)" strokeDasharray="5,5" />
        <line x1="70%" y1="50%" x2="85%" y2="50%" stroke="rgba(100,200,255,0.2)" strokeDasharray="5,5" />
        <line x1="70%" y1="50%" x2="85%" y2="70%" stroke="rgba(100,200,255,0.2)" strokeDasharray="5,5" />
      </svg>
    </div>
  );
});

// Create Rule Modal
const CreateRuleModal = memo(function CreateRuleModal({ onClose, onCreate }) {
  const [formData, setFormData] = useState({
    name: '',
    triggerField: 's_index',
    triggerOperator: '<',
    triggerValue: '',
    actionType: 'notify',
    actionTarget: 'teacher',
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.9 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-gray-800 rounded-2xl p-6 max-w-md w-full border border-gray-700"
      >
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <span>➕</span> 새 자동화 규칙
        </h3>

        <div className="space-y-4">
          <div>
            <label className="text-gray-400 text-sm block mb-1">규칙 이름</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="예: 이탈 위험 알림"
              className="w-full p-3 bg-gray-900 border border-gray-700 rounded-xl text-white focus:border-cyan-500 outline-none"
            />
          </div>

          <div className="p-3 bg-gray-900/50 rounded-xl">
            <p className="text-yellow-400 text-sm mb-2">⚡ 트리거 조건</p>
            <div className="grid grid-cols-3 gap-2">
              <select
                value={formData.triggerField}
                onChange={(e) => setFormData(prev => ({ ...prev, triggerField: e.target.value }))}
                className="p-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
              >
                <option value="s_index">s-Index</option>
                <option value="churn_probability">이탈 확률</option>
                <option value="chemistry_score">케미 점수</option>
                <option value="absent_count">결석 횟수</option>
              </select>
              <select
                value={formData.triggerOperator}
                onChange={(e) => setFormData(prev => ({ ...prev, triggerOperator: e.target.value }))}
                className="p-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
              >
                <option value="<">&lt;</option>
                <option value=">">&gt;</option>
                <option value="=">=</option>
              </select>
              <input
                type="text"
                value={formData.triggerValue}
                onChange={(e) => setFormData(prev => ({ ...prev, triggerValue: e.target.value }))}
                placeholder="값"
                className="p-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
              />
            </div>
          </div>

          <div className="p-3 bg-gray-900/50 rounded-xl">
            <p className="text-cyan-400 text-sm mb-2">🎯 실행 액션</p>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={formData.actionType}
                onChange={(e) => setFormData(prev => ({ ...prev, actionType: e.target.value }))}
                className="p-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
              >
                <option value="notify">알림 발송</option>
                <option value="message">메시지 전송</option>
                <option value="schedule">상담 예약</option>
                <option value="escalate">에스컬레이션</option>
              </select>
              <select
                value={formData.actionTarget}
                onChange={(e) => setFormData(prev => ({ ...prev, actionTarget: e.target.value }))}
                className="p-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
              >
                <option value="teacher">담당 선생님</option>
                <option value="parent">학부모</option>
                <option value="principal">Principal</option>
                <option value="fsd">FSD</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 p-3 bg-gray-700 text-gray-300 rounded-xl hover:bg-gray-600 transition-colors"
          >
            취소
          </button>
          <button
            onClick={() => onCreate(formData)}
            className="flex-1 p-3 bg-cyan-500 text-white rounded-xl hover:bg-cyan-600 transition-colors font-medium"
          >
            생성
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
});

// ============================================
// MAIN COMPONENT
// ============================================

export default function AutoActuationSystem() {
  const [rules, setRules] = useState(generateActuationRules);
  const [logs] = useState(generateExecutionLogs);
  const [metrics] = useState(generateSystemMetrics);
  const [selectedRule, setSelectedRule] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Toggle rule
  const handleToggleRule = useCallback((ruleId) => {
    setRules(prev => prev.map(r =>
      r.id === ruleId
        ? { ...r, status: r.status === 'active' ? 'inactive' : 'active' }
        : r
    ));
  }, []);

  // Test run
  const handleTestRun = useCallback((ruleId) => {
    console.log(`Test run: ${ruleId}`);
    // Mock test run
  }, []);

  // Create rule
  const handleCreateRule = useCallback((formData) => {
    const newRule = {
      id: `RULE-00${rules.length + 1}`,
      name: formData.name,
      description: `${formData.triggerField} ${formData.triggerOperator} ${formData.triggerValue} 시 ${formData.actionTarget}에게 ${formData.actionType}`,
      trigger: {
        type: 'threshold',
        field: formData.triggerField,
        operator: formData.triggerOperator,
        value: parseFloat(formData.triggerValue) || 0,
      },
      action: {
        type: formData.actionType,
        target: formData.actionTarget,
      },
      status: 'active',
      executions: 0,
      lastExec: new Date().toISOString(),
      successRate: 1.0,
    };
    setRules(prev => [...prev, newRule]);
    setShowCreateModal(false);
  }, [rules.length]);

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <span className="text-3xl">🤖</span>
              Auto-Actuation System
            </h1>
            <p className="text-gray-400 mt-1">자동 실행 시스템 - 무인화 자동 대응</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-cyan-500 text-white rounded-xl font-medium hover:bg-cyan-600 transition-colors flex items-center gap-2"
          >
            <span>➕</span> 새 규칙
          </button>
        </div>

        {/* System Metrics */}
        <SystemMetrics metrics={metrics} />

        {/* Automation Flow */}
        <div className="bg-gray-800/30 rounded-xl border border-gray-700/50 p-4">
          <h3 className="text-white font-medium mb-4 flex items-center gap-2">
            <span className="text-cyan-400">🔄</span>
            Automation Pipeline
          </h3>
          <AutomationFlow />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-3 gap-6">
          {/* Rules List */}
          <div className="col-span-2 space-y-4">
            <h3 className="text-white font-medium flex items-center gap-2">
              <span className="text-purple-400">📋</span>
              자동화 규칙 ({rules.length}개)
            </h3>
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
              {rules.map(rule => (
                <RuleCard
                  key={rule.id}
                  rule={rule}
                  selected={selectedRule?.id === rule.id}
                  onClick={() => setSelectedRule(rule)}
                  onToggle={handleToggleRule}
                  onEdit={() => {}}
                />
              ))}
            </div>
          </div>

          {/* Side Panel */}
          <div className="space-y-4">
            {/* Rule Detail */}
            <div className="bg-gray-800/30 rounded-xl border border-gray-700/50 p-4">
              <h3 className="text-white font-medium mb-4">규칙 상세</h3>
              <RuleDetailPanel rule={selectedRule} onTestRun={handleTestRun} />
            </div>

            {/* Execution Log */}
            <div className="bg-gray-800/30 rounded-xl border border-gray-700/50 p-4">
              <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                <span className="text-emerald-400">📜</span>
                실행 로그
              </h3>
              <ExecutionLog logs={logs} />
            </div>
          </div>
        </div>
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateRuleModal
            onClose={() => setShowCreateModal(false)}
            onCreate={handleCreateRule}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
