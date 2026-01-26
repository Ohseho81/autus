/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🎯 AUTUS Owner Goals System
 * 오너의 명확한 목표 설정 및 진행 상황 추적
 * 
 * 목표 유형:
 * 1. 매출 목표 (Revenue Target)
 * 2. 지점 확장 (Branch Expansion)
 * 3. 이익률 향상 (Margin Improvement)
 * 4. 지점 폐쇄 최적화 (Efficient Closure)
 * 5. 인수합병 (M&A)
 * 6. 비용 절감 (Cost Reduction)
 * 7. 학생 수 목표 (Student Count)
 * 8. 커스텀 목표 (Custom)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useCallback, memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// 목표 타입 정의
// ============================================
const GOAL_TYPES = {
  revenue: {
    id: 'revenue',
    name: '매출 목표',
    icon: '💰',
    color: 'emerald',
    unit: '원',
    format: (v) => `₩${(v / 1e8).toFixed(1)}억`,
    description: '월/분기/연간 매출 목표',
    examples: ['월매출 1억원 달성', '연매출 12억원 달성'],
  },
  branch_expand: {
    id: 'branch_expand',
    name: '지점 확장',
    icon: '🏢',
    color: 'blue',
    unit: '개',
    format: (v) => `${v}개`,
    description: '신규 지점 개설 목표',
    examples: ['올해 3개 지점 추가', '분당 지역 진출'],
  },
  margin: {
    id: 'margin',
    name: '이익률 향상',
    icon: '📈',
    color: 'purple',
    unit: '%',
    format: (v) => `${v}%`,
    description: '영업이익률/순이익률 목표',
    examples: ['영업이익률 25% 달성', '순이익률 15%로 상승'],
  },
  closure: {
    id: 'closure',
    name: '효율적 폐쇄',
    icon: '🔄',
    color: 'orange',
    unit: '',
    format: (v) => v,
    description: '비효율 지점 최적화 폐쇄',
    examples: ['A지점 효율적 폐쇄', '손실 지점 정리'],
  },
  mna: {
    id: 'mna',
    name: '인수합병',
    icon: '🤝',
    color: 'cyan',
    unit: '건',
    format: (v) => `${v}건`,
    description: 'M&A 및 전략적 제휴',
    examples: ['경쟁 학원 2개 인수', '프랜차이즈 가맹'],
  },
  cost_reduction: {
    id: 'cost_reduction',
    name: '비용 절감',
    icon: '✂️',
    color: 'yellow',
    unit: '%',
    format: (v) => `${v}%`,
    description: '운영비용 절감 목표',
    examples: ['인건비 10% 절감', '임대료 협상'],
  },
  student_count: {
    id: 'student_count',
    name: '학생 수',
    icon: '👩‍🎓',
    color: 'pink',
    unit: '명',
    format: (v) => `${v}명`,
    description: '재원생/신규 등록 목표',
    examples: ['재원생 500명 달성', '신규 등록 50명/월'],
  },
  custom: {
    id: 'custom',
    name: '커스텀',
    icon: '⭐',
    color: 'gray',
    unit: '',
    format: (v) => v,
    description: '직접 입력하는 목표',
    examples: ['브랜드 인지도 향상', '직원 만족도 개선'],
  },
};

// ============================================
// 목표 상태
// ============================================
const GOAL_STATUS = {
  draft: { label: '초안', color: 'gray', icon: '📝' },
  active: { label: '진행중', color: 'blue', icon: '🔄' },
  on_track: { label: '순조로움', color: 'emerald', icon: '✅' },
  at_risk: { label: '위험', color: 'yellow', icon: '⚠️' },
  behind: { label: '지연', color: 'red', icon: '🔴' },
  achieved: { label: '달성', color: 'purple', icon: '🎉' },
  cancelled: { label: '취소', color: 'gray', icon: '❌' },
};

// ============================================
// 시간 프레임
// ============================================
const TIME_FRAMES = [
  { id: 'monthly', label: '월간', months: 1 },
  { id: 'quarterly', label: '분기', months: 3 },
  { id: 'half_year', label: '반기', months: 6 },
  { id: 'yearly', label: '연간', months: 12 },
  { id: 'custom', label: '직접 설정', months: null },
];

// ============================================
// Mock 데이터
// ============================================
const generateMockGoals = () => [
  {
    id: 'goal-1',
    type: 'revenue',
    title: '월매출 1.5억원 달성',
    target: 150000000,
    current: 127500000,
    unit: '원',
    timeframe: 'monthly',
    startDate: '2026-01-01',
    endDate: '2026-01-31',
    status: 'on_track',
    progress: 85,
    milestones: [
      { label: '1주차', target: 37500000, actual: 38000000, achieved: true },
      { label: '2주차', target: 75000000, actual: 72000000, achieved: false },
      { label: '3주차', target: 112500000, actual: 115000000, achieved: true },
      { label: '4주차', target: 150000000, actual: null, achieved: false },
    ],
    strategies: ['신규 등록 캠페인', '재등록 할인', '추천 인센티브'],
    assignedTo: 'FSD',
    createdAt: '2026-01-01',
  },
  {
    id: 'goal-2',
    type: 'branch_expand',
    title: '분당 지역 신규 지점 개설',
    target: 1,
    current: 0,
    unit: '개',
    timeframe: 'quarterly',
    startDate: '2026-01-01',
    endDate: '2026-03-31',
    status: 'active',
    progress: 35,
    milestones: [
      { label: '부지 선정', target: 1, actual: 1, achieved: true },
      { label: '계약 체결', target: 1, actual: 0, achieved: false },
      { label: '인테리어', target: 1, actual: 0, achieved: false },
      { label: '개원', target: 1, actual: 0, achieved: false },
    ],
    strategies: ['상권 분석 완료', '부동산 협상 중', '인테리어 업체 선정'],
    assignedTo: 'C-Level',
    createdAt: '2026-01-01',
  },
  {
    id: 'goal-3',
    type: 'margin',
    title: '영업이익률 25% 달성',
    target: 25,
    current: 21.5,
    unit: '%',
    timeframe: 'yearly',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    status: 'at_risk',
    progress: 86,
    milestones: [
      { label: 'Q1', target: 22, actual: 21.5, achieved: false },
      { label: 'Q2', target: 23, actual: null, achieved: false },
      { label: 'Q3', target: 24, actual: null, achieved: false },
      { label: 'Q4', target: 25, actual: null, achieved: false },
    ],
    strategies: ['강사비 효율화', '시설 공유', '디지털 전환'],
    assignedTo: 'FSD',
    createdAt: '2026-01-01',
  },
  {
    id: 'goal-4',
    type: 'closure',
    title: '역삼 지점 효율적 폐쇄',
    target: '손실 최소화 폐쇄',
    current: '학생 이전 50% 완료',
    unit: '',
    timeframe: 'quarterly',
    startDate: '2026-01-01',
    endDate: '2026-03-31',
    status: 'active',
    progress: 50,
    milestones: [
      { label: '학생 이전 계획', target: 1, actual: 1, achieved: true },
      { label: '학생 이전 50%', target: 1, actual: 1, achieved: true },
      { label: '학생 이전 100%', target: 1, actual: 0, achieved: false },
      { label: '계약 해지', target: 1, actual: 0, achieved: false },
    ],
    strategies: ['학생 이전 인센티브', '강사 재배치', '시설 양도 협상'],
    assignedTo: 'Optimus',
    createdAt: '2026-01-01',
  },
  {
    id: 'goal-5',
    type: 'mna',
    title: '경쟁 학원 2개 인수',
    target: 2,
    current: 1,
    unit: '건',
    timeframe: 'yearly',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    status: 'on_track',
    progress: 50,
    milestones: [
      { label: '타겟 선정', target: 3, actual: 3, achieved: true },
      { label: '실사 진행', target: 2, actual: 2, achieved: true },
      { label: '인수 협상', target: 2, actual: 1, achieved: false },
      { label: '인수 완료', target: 2, actual: 1, achieved: false },
    ],
    strategies: ['A학원 인수 완료', 'B학원 협상 중', 'C학원 백업'],
    assignedTo: 'C-Level',
    createdAt: '2026-01-01',
  },
];

// ============================================
// 목표 카드 컴포넌트
// ============================================
const GoalCard = memo(function GoalCard({ goal, onEdit, onDelete }) {
  const typeConfig = GOAL_TYPES[goal.type];
  const statusConfig = GOAL_STATUS[goal.status];
  
  const progressColor = goal.progress >= 80 ? 'emerald' : 
                        goal.progress >= 50 ? 'yellow' : 'red';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-5 bg-gray-800/50 rounded-xl border border-${typeConfig.color}-500/30 hover:border-${typeConfig.color}-500/50 transition-all`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{typeConfig.icon}</span>
          <div>
            <h3 className="text-white font-bold">{goal.title}</h3>
            <p className={`text-${typeConfig.color}-400 text-sm`}>{typeConfig.name}</p>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs bg-${statusConfig.color}-500/20 text-${statusConfig.color}-400 border border-${statusConfig.color}-500/30`}>
          {statusConfig.icon} {statusConfig.label}
        </div>
      </div>

      {/* Progress */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-400 text-sm">진행률</span>
          <span className={`text-${progressColor}-400 font-bold`}>{goal.progress}%</span>
        </div>
        <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${goal.progress}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className={`h-full bg-gradient-to-r from-${typeConfig.color}-600 to-${typeConfig.color}-400 rounded-full`}
          />
        </div>
      </div>

      {/* Target vs Current */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="p-3 bg-gray-900/50 rounded-lg">
          <p className="text-gray-500 text-xs mb-1">목표</p>
          <p className={`text-${typeConfig.color}-400 font-bold text-lg`}>
            {typeof goal.target === 'number' ? typeConfig.format(goal.target) : goal.target}
          </p>
        </div>
        <div className="p-3 bg-gray-900/50 rounded-lg">
          <p className="text-gray-500 text-xs mb-1">현재</p>
          <p className="text-white font-bold text-lg">
            {typeof goal.current === 'number' ? typeConfig.format(goal.current) : goal.current}
          </p>
        </div>
      </div>

      {/* Timeline */}
      <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
        <span>📅 {goal.startDate} ~ {goal.endDate}</span>
        <span>👤 {goal.assignedTo}</span>
      </div>

      {/* Milestones */}
      <div className="mb-4">
        <p className="text-gray-400 text-xs mb-2">마일스톤</p>
        <div className="flex gap-1">
          {goal.milestones.map((ms, idx) => (
            <div
              key={idx}
              className={`flex-1 h-2 rounded ${
                ms.achieved ? `bg-${typeConfig.color}-500` : 'bg-gray-700'
              }`}
              title={ms.label}
            />
          ))}
        </div>
        <div className="flex justify-between mt-1">
          {goal.milestones.map((ms, idx) => (
            <span key={idx} className="text-[10px] text-gray-600">{ms.label}</span>
          ))}
        </div>
      </div>

      {/* Strategies */}
      <div className="mb-4">
        <p className="text-gray-400 text-xs mb-2">실행 전략</p>
        <div className="flex flex-wrap gap-1">
          {goal.strategies.map((strategy, idx) => (
            <span
              key={idx}
              className="px-2 py-1 bg-gray-700/50 text-gray-300 text-xs rounded"
            >
              {strategy}
            </span>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => onEdit(goal)}
          className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm transition-colors"
        >
          ✏️ 수정
        </button>
        <button
          onClick={() => onDelete(goal.id)}
          className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm transition-colors"
        >
          🗑️
        </button>
      </div>
    </motion.div>
  );
});

// ============================================
// 목표 생성 모달
// ============================================
const GoalCreationModal = memo(function GoalCreationModal({ isOpen, onClose, onSave, editingGoal }) {
  const [formData, setFormData] = useState(editingGoal || {
    type: 'revenue',
    title: '',
    target: '',
    current: 0,
    timeframe: 'monthly',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    strategies: [],
    assignedTo: 'FSD',
  });
  const [newStrategy, setNewStrategy] = useState('');

  const selectedType = GOAL_TYPES[formData.type];

  const handleSave = () => {
    if (!formData.title || !formData.target) {
      alert('목표 제목과 목표값을 입력하세요');
      return;
    }
    
    const goal = {
      ...formData,
      id: editingGoal?.id || `goal-${Date.now()}`,
      progress: editingGoal?.progress || 0,
      status: editingGoal?.status || 'active',
      milestones: editingGoal?.milestones || [],
      createdAt: editingGoal?.createdAt || new Date().toISOString().split('T')[0],
    };
    
    onSave(goal);
    onClose();
  };

  const addStrategy = () => {
    if (newStrategy.trim()) {
      setFormData(prev => ({
        ...prev,
        strategies: [...prev.strategies, newStrategy.trim()],
      }));
      setNewStrategy('');
    }
  };

  const removeStrategy = (idx) => {
    setFormData(prev => ({
      ...prev,
      strategies: prev.strategies.filter((_, i) => i !== idx),
    }));
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-gray-900 rounded-2xl p-6 w-full max-w-2xl border border-gray-800 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <span>🎯</span>
          {editingGoal ? '목표 수정' : '새 목표 설정'}
        </h2>

        {/* Goal Type Selection */}
        <div className="mb-6">
          <label className="text-gray-400 text-sm mb-2 block">목표 유형</label>
          <div className="grid grid-cols-4 gap-2">
            {Object.values(GOAL_TYPES).map(type => (
              <button
                key={type.id}
                onClick={() => setFormData(prev => ({ ...prev, type: type.id }))}
                className={`p-3 rounded-xl border text-center transition-all ${
                  formData.type === type.id
                    ? `bg-${type.color}-500/20 border-${type.color}-500 text-${type.color}-400`
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                }`}
              >
                <span className="text-xl block mb-1">{type.icon}</span>
                <span className="text-xs">{type.name}</span>
              </button>
            ))}
          </div>
          {selectedType && (
            <p className="text-gray-500 text-xs mt-2">
              예: {selectedType.examples.join(', ')}
            </p>
          )}
        </div>

        {/* Goal Title */}
        <div className="mb-4">
          <label className="text-gray-400 text-sm mb-2 block">목표 제목</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            placeholder={`예: ${selectedType?.examples[0] || '목표를 입력하세요'}`}
            className="w-full p-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:border-purple-500 outline-none"
          />
        </div>

        {/* Target Value */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-gray-400 text-sm mb-2 block">목표값</label>
            <div className="relative">
              <input
                type={selectedType?.unit === '%' || selectedType?.unit === '개' || selectedType?.unit === '명' || selectedType?.unit === '건' ? 'number' : 'text'}
                value={formData.target}
                onChange={(e) => setFormData(prev => ({ ...prev, target: selectedType?.unit ? Number(e.target.value) || e.target.value : e.target.value }))}
                placeholder="목표값 입력"
                className="w-full p-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:border-purple-500 outline-none pr-12"
              />
              {selectedType?.unit && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                  {selectedType.unit}
                </span>
              )}
            </div>
          </div>
          <div>
            <label className="text-gray-400 text-sm mb-2 block">현재값</label>
            <input
              type={selectedType?.unit === '%' || selectedType?.unit === '개' || selectedType?.unit === '명' || selectedType?.unit === '건' ? 'number' : 'text'}
              value={formData.current}
              onChange={(e) => setFormData(prev => ({ ...prev, current: selectedType?.unit ? Number(e.target.value) || e.target.value : e.target.value }))}
              placeholder="현재 상태"
              className="w-full p-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:border-purple-500 outline-none"
            />
          </div>
        </div>

        {/* Timeframe */}
        <div className="mb-4">
          <label className="text-gray-400 text-sm mb-2 block">기간</label>
          <div className="grid grid-cols-5 gap-2 mb-3">
            {TIME_FRAMES.map(tf => (
              <button
                key={tf.id}
                onClick={() => setFormData(prev => ({ ...prev, timeframe: tf.id }))}
                className={`p-2 rounded-lg border text-sm transition-all ${
                  formData.timeframe === tf.id
                    ? 'bg-purple-500/20 border-purple-500 text-purple-400'
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                }`}
              >
                {tf.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-gray-500 text-xs mb-1 block">시작일</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full p-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-purple-500 outline-none"
              />
            </div>
            <div>
              <label className="text-gray-500 text-xs mb-1 block">종료일</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full p-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-purple-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Assigned To */}
        <div className="mb-4">
          <label className="text-gray-400 text-sm mb-2 block">담당</label>
          <div className="flex gap-2">
            {['C-Level', 'FSD', 'Optimus'].map(role => (
              <button
                key={role}
                onClick={() => setFormData(prev => ({ ...prev, assignedTo: role }))}
                className={`px-4 py-2 rounded-lg border text-sm transition-all ${
                  formData.assignedTo === role
                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400'
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                }`}
              >
                {role}
              </button>
            ))}
          </div>
        </div>

        {/* Strategies */}
        <div className="mb-6">
          <label className="text-gray-400 text-sm mb-2 block">실행 전략</label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={newStrategy}
              onChange={(e) => setNewStrategy(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addStrategy()}
              placeholder="전략 추가..."
              className="flex-1 p-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-purple-500 outline-none"
            />
            <button
              onClick={addStrategy}
              className="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30"
            >
              추가
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.strategies.map((strategy, idx) => (
              <span
                key={idx}
                className="px-3 py-1 bg-gray-700 text-gray-300 rounded-full text-sm flex items-center gap-2"
              >
                {strategy}
                <button
                  onClick={() => removeStrategy(idx)}
                  className="text-gray-500 hover:text-red-400"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-xl font-medium transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-medium transition-colors"
          >
            {editingGoal ? '수정 완료' : '🎯 목표 설정'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
});

// ============================================
// 목표 요약 위젯
// ============================================
const GoalSummaryWidget = memo(function GoalSummaryWidget({ goals }) {
  const summary = useMemo(() => {
    const total = goals.length;
    const achieved = goals.filter(g => g.status === 'achieved').length;
    const onTrack = goals.filter(g => g.status === 'on_track').length;
    const atRisk = goals.filter(g => g.status === 'at_risk' || g.status === 'behind').length;
    const avgProgress = total > 0 
      ? Math.round(goals.reduce((sum, g) => sum + g.progress, 0) / total)
      : 0;

    return { total, achieved, onTrack, atRisk, avgProgress };
  }, [goals]);

  return (
    <div className="grid grid-cols-5 gap-4 mb-6">
      <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700">
        <p className="text-gray-500 text-xs mb-1">전체 목표</p>
        <p className="text-white text-2xl font-bold">{summary.total}</p>
      </div>
      <div className="p-4 bg-purple-500/10 rounded-xl border border-purple-500/30">
        <p className="text-gray-500 text-xs mb-1">달성</p>
        <p className="text-purple-400 text-2xl font-bold">{summary.achieved}</p>
      </div>
      <div className="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/30">
        <p className="text-gray-500 text-xs mb-1">순조로움</p>
        <p className="text-emerald-400 text-2xl font-bold">{summary.onTrack}</p>
      </div>
      <div className="p-4 bg-red-500/10 rounded-xl border border-red-500/30">
        <p className="text-gray-500 text-xs mb-1">위험/지연</p>
        <p className="text-red-400 text-2xl font-bold">{summary.atRisk}</p>
      </div>
      <div className="p-4 bg-cyan-500/10 rounded-xl border border-cyan-500/30">
        <p className="text-gray-500 text-xs mb-1">평균 진행률</p>
        <p className="text-cyan-400 text-2xl font-bold">{summary.avgProgress}%</p>
      </div>
    </div>
  );
});

// ============================================
// 메인 컴포넌트
// ============================================
export default function OwnerGoals() {
  const [goals, setGoals] = useState(generateMockGoals);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const filteredGoals = useMemo(() => {
    return goals.filter(goal => {
      if (filterType !== 'all' && goal.type !== filterType) return false;
      if (filterStatus !== 'all' && goal.status !== filterStatus) return false;
      return true;
    });
  }, [goals, filterType, filterStatus]);

  const handleSaveGoal = useCallback((goal) => {
    setGoals(prev => {
      const existing = prev.find(g => g.id === goal.id);
      if (existing) {
        return prev.map(g => g.id === goal.id ? goal : g);
      }
      return [...prev, goal];
    });
    setEditingGoal(null);
  }, []);

  const handleEditGoal = useCallback((goal) => {
    setEditingGoal(goal);
    setIsModalOpen(true);
  }, []);

  const handleDeleteGoal = useCallback((goalId) => {
    if (window.confirm('정말 이 목표를 삭제하시겠습니까?')) {
      setGoals(prev => prev.filter(g => g.id !== goalId));
    }
  }, []);

  const handleOpenModal = useCallback(() => {
    setEditingGoal(null);
    setIsModalOpen(true);
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <span className="text-3xl">🎯</span>
              Owner Goals
            </h1>
            <p className="text-gray-400 mt-1">명확한 목표 설정 · 전략적 실행 · 결과 추적</p>
          </div>
          <button
            onClick={handleOpenModal}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-cyan-500 text-white rounded-xl font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            <span>➕</span>
            새 목표 추가
          </button>
        </div>

        {/* Summary */}
        <GoalSummaryWidget goals={goals} />

        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <span className="text-gray-500 text-sm">유형:</span>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="p-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-purple-500 outline-none"
            >
              <option value="all">전체</option>
              {Object.values(GOAL_TYPES).map(type => (
                <option key={type.id} value={type.id}>{type.icon} {type.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-500 text-sm">상태:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="p-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:border-purple-500 outline-none"
            >
              <option value="all">전체</option>
              {Object.entries(GOAL_STATUS).map(([key, status]) => (
                <option key={key} value={key}>{status.icon} {status.label}</option>
              ))}
            </select>
          </div>
          <div className="ml-auto text-gray-500 text-sm">
            {filteredGoals.length}개 목표
          </div>
        </div>

        {/* Goals Grid */}
        <div className="grid grid-cols-2 gap-6">
          <AnimatePresence>
            {filteredGoals.map(goal => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onEdit={handleEditGoal}
                onDelete={handleDeleteGoal}
              />
            ))}
          </AnimatePresence>
        </div>

        {/* Empty State */}
        {filteredGoals.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg mb-4">설정된 목표가 없습니다</p>
            <button
              onClick={handleOpenModal}
              className="px-6 py-3 bg-purple-500/20 text-purple-400 rounded-xl hover:bg-purple-500/30 transition-colors"
            >
              🎯 첫 번째 목표 설정하기
            </button>
          </div>
        )}

        {/* Modal */}
        <AnimatePresence>
          {isModalOpen && (
            <GoalCreationModal
              isOpen={isModalOpen}
              onClose={() => {
                setIsModalOpen(false);
                setEditingGoal(null);
              }}
              onSave={handleSaveGoal}
              editingGoal={editingGoal}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
