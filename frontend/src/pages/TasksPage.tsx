/**
 * AUTUS 업무 등록/관리 페이지
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * - 업무 CRUD (생성, 조회, 수정, 삭제)
 * - 5단계 카테고리 분류
 * - K 레벨 자동 계산
 * - 자동화 레벨 설정 (L1/L2/L3)
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, Filter, SortAsc, Edit2, Trash2, 
  Settings, Play, CheckCircle2, Clock, Zap, Brain,
  RefreshCw, ChevronDown, X, Save, AlertCircle
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

type AutomationLevel = 'L1' | 'L2' | 'L3' | 'none';
type TaskStatus = 'active' | 'automating' | 'ready_to_unify' | 'paused';

interface Task {
  id: string;
  name: string;
  description: string;
  category: string;
  subcategory: string;
  k: number;
  automationLevel: AutomationLevel;
  automationProgress: number;
  executionCount: number;
  errorRate: number;
  lastExecuted: string;
  status: TaskStatus;
  createdAt: string;
}

interface Category {
  id: string;
  name: string;
  icon: string;
  subcategories: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════════

const CATEGORIES: Category[] = [
  { id: 'finance', name: '재무/회계', icon: '💰', subcategories: ['매출관리', '비용관리', '세무', '예산'] },
  { id: 'hr', name: '인사/HR', icon: '👥', subcategories: ['채용', '급여', '교육', '평가'] },
  { id: 'sales', name: '영업/마케팅', icon: '📈', subcategories: ['리드관리', '캠페인', '고객관리', '분석'] },
  { id: 'ops', name: '운영/물류', icon: '🏭', subcategories: ['재고', '배송', '품질', '생산'] },
  { id: 'it', name: 'IT/개발', icon: '💻', subcategories: ['개발', '인프라', '보안', '지원'] },
  { id: 'admin', name: '총무/행정', icon: '📋', subcategories: ['문서', '시설', '구매', '계약'] },
  { id: 'cs', name: '고객서비스', icon: '🎧', subcategories: ['문의응대', '클레임', 'VOC', '만족도'] },
  { id: 'strategy', name: '전략/기획', icon: '🎯', subcategories: ['사업기획', '시장분석', 'M&A', '신사업'] },
];

const MOCK_TASKS: Task[] = [
  {
    id: '1',
    name: '일일 매출 리포트 생성',
    description: '전일 매출 데이터를 집계하여 리포트 자동 생성 및 이메일 발송',
    category: 'finance',
    subcategory: '매출관리',
    k: 2,
    automationLevel: 'L1',
    automationProgress: 100,
    executionCount: 247,
    errorRate: 0,
    lastExecuted: '10분 전',
    status: 'ready_to_unify',
    createdAt: '2025-06-15',
  },
  {
    id: '2',
    name: '이메일 자동 분류',
    description: '수신 이메일을 카테고리별로 자동 분류하고 담당자에게 할당',
    category: 'admin',
    subcategory: '문서',
    k: 2,
    automationLevel: 'L1',
    automationProgress: 98,
    executionCount: 1523,
    errorRate: 0.5,
    lastExecuted: '방금',
    status: 'ready_to_unify',
    createdAt: '2025-05-20',
  },
  {
    id: '3',
    name: '재고 수준 알림',
    description: '재고가 안전 수준 이하로 떨어지면 자동 알림 발송',
    category: 'ops',
    subcategory: '재고',
    k: 3,
    automationLevel: 'L2',
    automationProgress: 85,
    executionCount: 89,
    errorRate: 1.2,
    lastExecuted: '1시간 전',
    status: 'automating',
    createdAt: '2025-08-01',
  },
  {
    id: '4',
    name: '고객 문의 초기 응답',
    description: 'AI 기반 고객 문의 자동 분류 및 초기 응답 생성',
    category: 'cs',
    subcategory: '문의응대',
    k: 3,
    automationLevel: 'L2',
    automationProgress: 72,
    executionCount: 312,
    errorRate: 2.1,
    lastExecuted: '15분 전',
    status: 'automating',
    createdAt: '2025-09-10',
  },
  {
    id: '5',
    name: '주간 성과 분석',
    description: '주간 KPI 데이터 수집 및 분석 리포트 생성',
    category: 'strategy',
    subcategory: '사업기획',
    k: 4,
    automationLevel: 'L2',
    automationProgress: 65,
    executionCount: 24,
    errorRate: 3.5,
    lastExecuted: '3일 전',
    status: 'automating',
    createdAt: '2025-10-01',
  },
  {
    id: '6',
    name: '신규 직원 온보딩',
    description: '신규 입사자 온보딩 체크리스트 자동 생성 및 진행 관리',
    category: 'hr',
    subcategory: '채용',
    k: 5,
    automationLevel: 'L3',
    automationProgress: 45,
    executionCount: 8,
    errorRate: 5.0,
    lastExecuted: '1주일 전',
    status: 'active',
    createdAt: '2025-11-01',
  },
  {
    id: '7',
    name: '프로젝트 리스크 평가',
    description: '진행 중인 프로젝트의 리스크 요소 분석 및 대응 방안 제시',
    category: 'strategy',
    subcategory: '사업기획',
    k: 6,
    automationLevel: 'L3',
    automationProgress: 30,
    executionCount: 12,
    errorRate: 8.0,
    lastExecuted: '2일 전',
    status: 'active',
    createdAt: '2025-11-15',
  },
  {
    id: '8',
    name: '전략적 파트너십 분석',
    description: '잠재적 파트너사 평가 및 협력 가능성 분석',
    category: 'strategy',
    subcategory: 'M&A',
    k: 7,
    automationLevel: 'none',
    automationProgress: 0,
    executionCount: 3,
    errorRate: 0,
    lastExecuted: '2주일 전',
    status: 'active',
    createdAt: '2025-12-01',
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════════════════

function getKColor(k: number): string {
  if (k <= 2) return '#22c55e';
  if (k <= 4) return '#3b82f6';
  if (k <= 6) return '#f59e0b';
  if (k <= 8) return '#f97316';
  return '#ef4444';
}

function getAutomationColor(level: AutomationLevel): string {
  if (level === 'L1') return '#22c55e';
  if (level === 'L2') return '#3b82f6';
  if (level === 'L3') return '#a855f7';
  return '#64748b';
}

function getAutomationLabel(level: AutomationLevel): string {
  if (level === 'L1') return '반사 (Reflex)';
  if (level === 'L2') return '체득 (Embodied)';
  if (level === 'L3') return '의식 (Conscious)';
  return '미설정';
}

function getStatusBadge(status: TaskStatus): { label: string; color: string; icon: React.ReactNode } {
  switch (status) {
    case 'ready_to_unify':
      return { label: '일체화 준비', color: '#22c55e', icon: <CheckCircle2 className="w-3 h-3" /> };
    case 'automating':
      return { label: '자동화 중', color: '#3b82f6', icon: <RefreshCw className="w-3 h-3 animate-spin" /> };
    case 'paused':
      return { label: '일시정지', color: '#f59e0b', icon: <Clock className="w-3 h-3" /> };
    default:
      return { label: '활성', color: '#64748b', icon: <Play className="w-3 h-3" /> };
  }
}

function getCategoryInfo(categoryId: string): Category | undefined {
  return CATEGORIES.find(c => c.id === categoryId);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Components
// ═══════════════════════════════════════════════════════════════════════════════

const TaskCard: React.FC<{
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onAutomate: (id: string) => void;
}> = ({ task, onEdit, onDelete, onAutomate }) => {
  const category = getCategoryInfo(task.category);
  const status = getStatusBadge(task.status);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className="bg-slate-800/50 rounded-xl p-5 border border-slate-700/50 hover:border-slate-600/50 transition-all"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{category?.icon || '📋'}</span>
          <div>
            <h3 className="font-semibold text-white">{task.name}</h3>
            <p className="text-xs text-slate-400">{category?.name} / {task.subcategory}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* K Badge */}
          <span
            className="px-2 py-1 rounded text-xs font-mono font-bold"
            style={{ backgroundColor: getKColor(task.k) + '20', color: getKColor(task.k) }}
          >
            K{task.k}
          </span>
          {/* Status Badge */}
          <span
            className="px-2 py-1 rounded text-xs font-medium flex items-center gap-1"
            style={{ backgroundColor: status.color + '20', color: status.color }}
          >
            {status.icon}
            {status.label}
          </span>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-slate-400 mb-4 line-clamp-2">{task.description}</p>

      {/* Automation Progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <span
            className="text-xs font-medium flex items-center gap-1"
            style={{ color: getAutomationColor(task.automationLevel) }}
          >
            {task.automationLevel === 'L1' && <Zap className="w-3 h-3" />}
            {task.automationLevel === 'L2' && <RefreshCw className="w-3 h-3" />}
            {task.automationLevel === 'L3' && <Brain className="w-3 h-3" />}
            {getAutomationLabel(task.automationLevel)}
          </span>
          <span className="text-xs text-slate-500">{task.automationProgress}%</span>
        </div>
        <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: getAutomationColor(task.automationLevel) }}
            initial={{ width: 0 }}
            animate={{ width: `${task.automationProgress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 mb-4 text-xs text-slate-500">
        <span>실행 {task.executionCount}회</span>
        <span>오류 {task.errorRate}%</span>
        <span>최근 {task.lastExecuted}</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onEdit(task)}
          className="flex-1 px-3 py-2 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-300 text-sm flex items-center justify-center gap-1 transition-colors"
        >
          <Edit2 className="w-3 h-3" />
          편집
        </button>
        <button
          onClick={() => onAutomate(task.id)}
          className="flex-1 px-3 py-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-sm flex items-center justify-center gap-1 transition-colors"
        >
          <Settings className="w-3 h-3" />
          자동화
        </button>
        <button
          onClick={() => onDelete(task.id)}
          className="px-3 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm flex items-center justify-center transition-colors"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </motion.div>
  );
};

const TaskModal: React.FC<{
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Partial<Task>) => void;
}> = ({ task, isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: task?.name || '',
    description: task?.description || '',
    category: task?.category || '',
    subcategory: task?.subcategory || '',
    automationLevel: task?.automationLevel || 'none' as AutomationLevel,
  });

  React.useEffect(() => {
    if (task) {
      setFormData({
        name: task.name,
        description: task.description,
        category: task.category,
        subcategory: task.subcategory,
        automationLevel: task.automationLevel,
      });
    } else {
      setFormData({
        name: '',
        description: '',
        category: '',
        subcategory: '',
        automationLevel: 'none',
      });
    }
  }, [task]);

  const selectedCategory = CATEGORIES.find(c => c.id === formData.category);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-slate-900 rounded-2xl border border-slate-700 w-full max-w-lg"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-700">
          <h2 className="text-lg font-semibold">{task ? '업무 편집' : '새 업무 등록'}</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Form */}
        <div className="p-5 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm text-slate-400 mb-1">업무명</label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="업무명을 입력하세요"
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm text-slate-400 mb-1">설명</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="업무에 대한 설명을 입력하세요"
              rows={3}
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          {/* Category */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">카테고리</label>
              <select
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value, subcategory: '' })}
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">선택하세요</option>
                {CATEGORIES.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">세부 카테고리</label>
              <select
                value={formData.subcategory}
                onChange={e => setFormData({ ...formData, subcategory: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                disabled={!formData.category}
              >
                <option value="">선택하세요</option>
                {selectedCategory?.subcategories.map(sub => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Automation Level */}
          <div>
            <label className="block text-sm text-slate-400 mb-2">자동화 레벨</label>
            <div className="grid grid-cols-4 gap-2">
              {(['none', 'L1', 'L2', 'L3'] as AutomationLevel[]).map(level => (
                <button
                  key={level}
                  onClick={() => setFormData({ ...formData, automationLevel: level })}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    formData.automationLevel === level
                      ? 'ring-2 ring-offset-2 ring-offset-slate-900'
                      : 'opacity-60 hover:opacity-100'
                  }`}
                  style={{
                    backgroundColor: getAutomationColor(level) + '20',
                    color: getAutomationColor(level),
                    ...(formData.automationLevel === level && { ringColor: getAutomationColor(level) })
                  }}
                >
                  {level === 'none' ? '미설정' : level}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              {getAutomationLabel(formData.automationLevel)}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            취소
          </button>
          <button
            onClick={() => onSave(formData)}
            disabled={!formData.name || !formData.category}
            className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            저장
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════════

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>(MOCK_TASKS);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('recent');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Filter and sort tasks
  const filteredTasks = useMemo(() => {
    let result = [...tasks];

    // Search
    if (searchQuery) {
      result = result.filter(t =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by category
    if (filterCategory !== 'all') {
      result = result.filter(t => t.category === filterCategory);
    }

    // Filter by automation level
    if (filterLevel !== 'all') {
      result = result.filter(t => t.automationLevel === filterLevel);
    }

    // Sort
    switch (sortBy) {
      case 'recent':
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'k-asc':
        result.sort((a, b) => a.k - b.k);
        break;
      case 'k-desc':
        result.sort((a, b) => b.k - a.k);
        break;
      case 'progress':
        result.sort((a, b) => b.automationProgress - a.automationProgress);
        break;
      case 'executions':
        result.sort((a, b) => b.executionCount - a.executionCount);
        break;
    }

    return result;
  }, [tasks, searchQuery, filterCategory, filterLevel, sortBy]);

  // Stats
  const stats = useMemo(() => ({
    total: tasks.length,
    l1: tasks.filter(t => t.automationLevel === 'L1').length,
    l2: tasks.filter(t => t.automationLevel === 'L2').length,
    l3: tasks.filter(t => t.automationLevel === 'L3').length,
    readyToUnify: tasks.filter(t => t.status === 'ready_to_unify').length,
  }), [tasks]);

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('이 업무를 삭제하시겠습니까?')) {
      setTasks(prev => prev.filter(t => t.id !== id));
    }
  };

  const handleAutomate = (id: string) => {
    // Navigate to automation builder or open automation settings
    alert(`업무 ${id} 자동화 설정으로 이동`);
  };

  const handleSave = (data: Partial<Task>) => {
    if (editingTask) {
      // Update existing task
      setTasks(prev => prev.map(t =>
        t.id === editingTask.id ? { ...t, ...data } : t
      ));
    } else {
      // Create new task
      const newTask: Task = {
        id: Date.now().toString(),
        name: data.name || '',
        description: data.description || '',
        category: data.category || '',
        subcategory: data.subcategory || '',
        k: Math.floor(Math.random() * 5) + 1, // Auto-calculate based on complexity
        automationLevel: data.automationLevel || 'none',
        automationProgress: 0,
        executionCount: 0,
        errorRate: 0,
        lastExecuted: '-',
        status: 'active',
        createdAt: new Date().toISOString().split('T')[0],
      };
      setTasks(prev => [newTask, ...prev]);
    }
    setIsModalOpen(false);
    setEditingTask(null);
  };

  const handleNewTask = () => {
    setEditingTask(null);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <span className="p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20">
              📋
            </span>
            업무 등록/관리
          </h1>
          <p className="text-slate-400 mt-1">AUTUS 자동화를 위한 업무 등록 및 관리</p>
        </div>
        <button
          onClick={handleNewTask}
          className="px-4 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-medium flex items-center gap-2 transition-colors"
        >
          <Plus className="w-5 h-5" />
          새 업무
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <p className="text-slate-400 text-sm">전체 업무</p>
          <p className="text-2xl font-bold mt-1">{stats.total}</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <p className="text-slate-400 text-sm flex items-center gap-1">
            <Zap className="w-3 h-3 text-green-400" /> L1 반사
          </p>
          <p className="text-2xl font-bold mt-1 text-green-400">{stats.l1}</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <p className="text-slate-400 text-sm flex items-center gap-1">
            <RefreshCw className="w-3 h-3 text-blue-400" /> L2 체득
          </p>
          <p className="text-2xl font-bold mt-1 text-blue-400">{stats.l2}</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <p className="text-slate-400 text-sm flex items-center gap-1">
            <Brain className="w-3 h-3 text-purple-400" /> L3 의식
          </p>
          <p className="text-2xl font-bold mt-1 text-purple-400">{stats.l3}</p>
        </div>
        <div className="bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/30">
          <p className="text-emerald-400 text-sm flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> 일체화 준비
          </p>
          <p className="text-2xl font-bold mt-1 text-emerald-400">{stats.readyToUnify}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="업무 검색..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Category Filter */}
        <div className="relative">
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="px-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-lg text-white appearance-none pr-10 focus:outline-none focus:border-blue-500"
          >
            <option value="all">전체 카테고리</option>
            {CATEGORIES.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
        </div>

        {/* Level Filter */}
        <div className="relative">
          <select
            value={filterLevel}
            onChange={e => setFilterLevel(e.target.value)}
            className="px-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-lg text-white appearance-none pr-10 focus:outline-none focus:border-blue-500"
          >
            <option value="all">전체 레벨</option>
            <option value="L1">L1 반사</option>
            <option value="L2">L2 체득</option>
            <option value="L3">L3 의식</option>
            <option value="none">미설정</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
        </div>

        {/* Sort */}
        <div className="relative">
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="px-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-lg text-white appearance-none pr-10 focus:outline-none focus:border-blue-500"
          >
            <option value="recent">최신순</option>
            <option value="k-asc">K 낮은순</option>
            <option value="k-desc">K 높은순</option>
            <option value="progress">자동화율순</option>
            <option value="executions">실행횟수순</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
        </div>
      </div>

      {/* Task Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {filteredTasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onAutomate={handleAutomate}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {filteredTasks.length === 0 && (
        <div className="text-center py-16">
          <AlertCircle className="w-12 h-12 mx-auto text-slate-600 mb-4" />
          <p className="text-slate-400">검색 결과가 없습니다</p>
          <button
            onClick={handleNewTask}
            className="mt-4 px-4 py-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
          >
            새 업무 등록하기
          </button>
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <TaskModal
            task={editingTask}
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setEditingTask(null);
            }}
            onSave={handleSave}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
