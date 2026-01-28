/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ✅ 액션 뷰 (Actions View) - AUTUS 2.0
 * 오늘의 할 일 관리
 * "오늘 뭘 해야 하나?"
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckSquare, Plus, ChevronDown, ChevronRight, Clock, User, 
  CheckCircle2, Circle, ArrowRight, MoreHorizontal, Calendar,
  AlertTriangle, Star
} from 'lucide-react';
import { useModal } from './modals';
import { RoleId, hasPermission } from './config/roles';

// ─────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────

interface Action {
  id: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  title: string;
  context: string;
  assignee: string;
  dueTime?: string;
  customerId?: string;
  customerName?: string;
  completed: boolean;
  completedAt?: string;
  aiRecommended?: boolean;
}

interface ActionStats {
  total: number;
  completed: number;
  percentage: number;
}

// ─────────────────────────────────────────────────────────────────────
// Mock Data
// ─────────────────────────────────────────────────────────────────────

const MOCK_ACTIONS: Action[] = [
  { id: 'a1', priority: 'urgent', title: '김민수 학부모 상담', context: '온도 38° 위험', assignee: '박강사', dueTime: '오늘 17:00', customerId: 'c1', customerName: '김민수', completed: false, aiRecommended: true },
  { id: 'a2', priority: 'high', title: 'D학원 대응 전략 수립', context: '경쟁사 프로모션', assignee: '관리자', dueTime: '오늘', completed: false },
  { id: 'a3', priority: 'high', title: '이서연 성적 향상 축하', context: 'A등급 달성', assignee: '최강사', dueTime: '오늘', customerId: 'c2', customerName: '이서연', completed: false },
  { id: 'a4', priority: 'medium', title: '신규 문의 3건 응답', context: '리드 관리', assignee: '상담사', dueTime: '오늘', completed: false },
  { id: 'a5', priority: 'low', title: '박지훈 출석 확인', context: '정기 체크', assignee: '박강사', completed: true, completedAt: '10:30' },
  { id: 'a6', priority: 'low', title: '월간 리포트 제출', context: '관리', assignee: '관리자', completed: true, completedAt: '09:00' },
];

// ─────────────────────────────────────────────────────────────────────
// Components
// ─────────────────────────────────────────────────────────────────────

const PriorityBadge: React.FC<{ priority: Action['priority'] }> = ({ priority }) => {
  const styles = {
    urgent: 'bg-red-500 text-white',
    high: 'bg-amber-500 text-white',
    medium: 'bg-blue-500 text-white',
    low: 'bg-slate-500 text-white',
  };
  const labels = { urgent: '긴급', high: '높음', medium: '보통', low: '낮음' };
  
  return (
    <span className={`px-2 py-0.5 rounded text-[9px] font-medium ${styles[priority]}`}>
      {labels[priority]}
    </span>
  );
};

const ActionCard: React.FC<{
  action: Action;
  onToggle: () => void;
  onViewCustomer: () => void;
  onViewDetail: () => void;
  onDelegate: () => void;
  onPostpone: () => void;
}> = ({ action, onToggle, onViewCustomer, onViewDetail, onDelegate, onPostpone }) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      whileHover={{ x: 4 }}
      className={`p-3 rounded-xl border transition-all ${
        action.completed 
          ? 'bg-slate-800/30 border-slate-700/30 opacity-60'
          : action.priority === 'urgent'
            ? 'bg-red-500/10 border-red-500/30'
            : action.priority === 'high'
              ? 'bg-amber-500/10 border-amber-500/30'
              : 'bg-slate-800/50 border-slate-700/50'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <motion.button
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.9 }}
          onClick={onToggle}
          className="mt-0.5"
        >
          {action.completed ? (
            <CheckCircle2 className="text-emerald-400" size={20} />
          ) : (
            <Circle className="text-slate-500 hover:text-white" size={20} />
          )}
        </motion.button>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {action.aiRecommended && (
              <Star className="text-purple-400" size={12} />
            )}
            <span className={`text-sm font-medium ${action.completed ? 'line-through text-slate-500' : ''}`}>
              {action.title}
            </span>
            <PriorityBadge priority={action.priority} />
          </div>
          
          <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-400">
            <span className="flex items-center gap-1">
              <AlertTriangle size={10} />
              {action.context}
            </span>
            <span className="flex items-center gap-1">
              <User size={10} />
              {action.assignee}
            </span>
            {action.dueTime && (
              <span className="flex items-center gap-1">
                <Clock size={10} />
                {action.dueTime}
              </span>
            )}
          </div>
          
          {action.customerName && (
            <motion.button
              whileHover={{ x: 2 }}
              onClick={onViewCustomer}
              className="mt-2 text-[10px] text-blue-400 flex items-center gap-1"
            >
              {action.customerName} <ChevronRight size={10} />
            </motion.button>
          )}
        </div>
        
        {/* Actions */}
        {!action.completed && (
          <div className="relative">
            <motion.button
              whileHover={{ scale: 1.1 }}
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 rounded hover:bg-slate-700/50"
            >
              <MoreHorizontal size={16} className="text-slate-400" />
            </motion.button>
            
            <AnimatePresence>
              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute right-0 mt-1 w-32 bg-slate-800 rounded-lg border border-slate-700 shadow-xl z-10"
                >
                  <button onClick={() => { onViewDetail(); setShowMenu(false); }} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-700/50">
                    상세
                  </button>
                  <button onClick={() => { onToggle(); setShowMenu(false); }} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-700/50 text-emerald-400">
                    완료
                  </button>
                  <button onClick={() => { onDelegate(); setShowMenu(false); }} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-700/50">
                    위임
                  </button>
                  <button onClick={() => { onPostpone(); setShowMenu(false); }} className="w-full text-left px-3 py-2 text-xs hover:bg-slate-700/50">
                    연기
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
        
        {action.completed && action.completedAt && (
          <span className="text-[10px] text-emerald-400">✓ {action.completedAt}</span>
        )}
      </div>
    </motion.div>
  );
};

const ActionGroup: React.FC<{
  title: string;
  icon: React.ReactNode;
  actions: Action[];
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onToggleAction: (id: string) => void;
  onViewCustomer: (customerId: string) => void;
  onViewDetail: (id: string) => void;
  onDelegate: (id: string) => void;
  onPostpone: (id: string) => void;
}> = ({ 
  title, icon, actions, collapsed, onToggleCollapse, 
  onToggleAction, onViewCustomer, onViewDetail, onDelegate, onPostpone 
}) => (
  <div className="mb-4">
    <button 
      onClick={onToggleCollapse}
      className="flex items-center gap-2 mb-2 text-sm font-medium"
    >
      {icon}
      <span>{title}</span>
      <span className="text-xs text-slate-500">({actions.length})</span>
      {onToggleCollapse && (
        <ChevronDown size={14} className={`transition-transform ${collapsed ? '-rotate-90' : ''}`} />
      )}
    </button>
    
    <AnimatePresence>
      {!collapsed && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="space-y-2 overflow-hidden"
        >
          {actions.map((action) => (
            <ActionCard
              key={action.id}
              action={action}
              onToggle={() => onToggleAction(action.id)}
              onViewCustomer={() => action.customerId && onViewCustomer(action.customerId)}
              onViewDetail={() => onViewDetail(action.id)}
              onDelegate={() => onDelegate(action.id)}
              onPostpone={() => onPostpone(action.id)}
            />
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

// ─────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────

interface ActionsViewProps {
  actionId?: string;
  create?: boolean;
  role?: RoleId;
  onNavigate?: (view: string, params?: any) => void;
}

export function ActionsView({ actionId, create, role = 'owner', onNavigate = () => {} }: ActionsViewProps) {
  const [actions, setActions] = useState<Action[]>(MOCK_ACTIONS);
  const [filter, setFilter] = useState<'today' | 'week' | 'all'>('today');
  const [completedCollapsed, setCompletedCollapsed] = useState(false);
  const { openModal } = useModal();
  
  const canAssign = hasPermission(role, 'canAssignAction');
  const canCreate = hasPermission(role, 'canCreateAction');

  const urgentActions = actions.filter(a => !a.completed && a.priority === 'urgent');
  const highActions = actions.filter(a => !a.completed && a.priority === 'high');
  const mediumActions = actions.filter(a => !a.completed && a.priority === 'medium');
  const completedActions = actions.filter(a => a.completed);
  
  const stats: ActionStats = {
    total: actions.filter(a => !a.completed).length,
    completed: completedActions.length,
    percentage: Math.round((completedActions.length / actions.length) * 100),
  };

  // ───────────────────────────────────────────────────────────────────
  // 설계 문서 기반 버튼 핸들러
  // ───────────────────────────────────────────────────────────────────

  // ☐ 체크박스 클릭 → 완료 토글
  const handleToggleAction = (id: string) => {
    setActions(prev => prev.map(a => 
      a.id === id ? { ...a, completed: !a.completed, completedAt: !a.completed ? new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : undefined } : a
    ));
  };

  // 고객명 클릭 → 현미경 뷰
  const handleViewCustomer = (customerId: string) => {
    onNavigate('microscope', { customerId });
  };

  // [상세] 클릭 → 액션 상세 모달
  const handleViewDetail = (id: string) => {
    const action = actions.find(a => a.id === id);
    openModal({
      type: 'action-detail',
      data: action,
    });
  };

  // [위임] 클릭 → 위임 모달
  const handleDelegate = (id: string) => {
    if (!canAssign) return;
    
    openModal({
      type: 'action-delegate',
      data: { actionId: id },
      onConfirm: (newAssignee) => {
        setActions(prev => prev.map(a => 
          a.id === id ? { ...a, assignee: newAssignee } : a
        ));
      },
    });
  };

  // [연기] 클릭 → 연기 모달
  const handlePostpone = (id: string) => {
    openModal({
      type: 'action-postpone',
      data: { actionId: id },
      onConfirm: (newDate) => {
        setActions(prev => prev.map(a => 
          a.id === id ? { ...a, dueTime: newDate } : a
        ));
      },
    });
  };

  // [+ 새 액션] 클릭 → 액션 생성 모달
  const handleCreateAction = () => {
    if (!canCreate) return;
    
    openModal({
      type: 'action-create',
      data: {},
      onConfirm: (newAction) => {
        const action: Action = {
          id: `a${actions.length + 1}`,
          priority: newAction.priority,
          title: newAction.title,
          context: newAction.notes || '',
          assignee: newAction.assignee || '미지정',
          dueTime: newAction.dueDate,
          completed: false,
        };
        setActions(prev => [action, ...prev]);
      },
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <CheckSquare size={20} />
          </div>
          <div>
            <div className="text-lg font-bold">액션</div>
            <div className="text-[10px] text-slate-500">오늘의 할 일</div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Filter */}
          <div className="flex bg-slate-800/50 rounded-lg p-1">
            {(['today', 'week', 'all'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-2 py-1 text-xs rounded ${
                  filter === f ? 'bg-emerald-500 text-white' : 'text-slate-400'
                }`}
              >
                {f === 'today' ? '오늘' : f === 'week' ? '이번주' : '전체'}
              </button>
            ))}
          </div>
          
          {/* [+ 새 액션] → 액션 생성 모달 */}
          {canCreate && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleCreateAction}
              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 rounded-lg text-sm"
            >
              <Plus size={14} />
              <span>새 액션</span>
            </motion.button>
          )}
        </div>
      </div>

      {/* Action Groups */}
      <div className="space-y-2">
        {urgentActions.length > 0 && (
          <ActionGroup
            title="긴급"
            icon={<span className="w-2 h-2 rounded-full bg-red-500" />}
            actions={urgentActions}
            onToggleAction={handleToggleAction}
            onViewCustomer={handleViewCustomer}
            onViewDetail={handleViewDetail}
            onDelegate={handleDelegate}
            onPostpone={handlePostpone}
          />
        )}
        
        {highActions.length > 0 && (
          <ActionGroup
            title="높음"
            icon={<span className="w-2 h-2 rounded-full bg-amber-500" />}
            actions={highActions}
            onToggleAction={handleToggleAction}
            onViewCustomer={handleViewCustomer}
            onViewDetail={handleViewDetail}
            onDelegate={handleDelegate}
            onPostpone={handlePostpone}
          />
        )}
        
        {mediumActions.length > 0 && (
          <ActionGroup
            title="보통"
            icon={<span className="w-2 h-2 rounded-full bg-blue-500" />}
            actions={mediumActions}
            onToggleAction={handleToggleAction}
            onViewCustomer={handleViewCustomer}
            onViewDetail={handleViewDetail}
            onDelegate={handleDelegate}
            onPostpone={handlePostpone}
          />
        )}
        
        {completedActions.length > 0 && (
          <ActionGroup
            title="완료됨"
            icon={<CheckCircle2 className="text-emerald-400" size={14} />}
            actions={completedActions}
            collapsed={completedCollapsed}
            onToggleCollapse={() => setCompletedCollapsed(!completedCollapsed)}
            onToggleAction={handleToggleAction}
            onViewCustomer={handleViewCustomer}
            onViewDetail={handleViewDetail}
            onDelegate={handleDelegate}
            onPostpone={handlePostpone}
          />
        )}
      </div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-6 p-4 bg-slate-800/40 rounded-xl border border-slate-700/50"
      >
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">📊 오늘 현황:</span>
          <div className="flex items-center gap-4">
            <span>총 <span className="font-bold">{stats.total + stats.completed}</span>개</span>
            <span>완료 <span className="font-bold text-emerald-400">{stats.completed}</span>개</span>
            <span>달성률 <span className="font-bold text-amber-400">{stats.percentage}%</span></span>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-2 h-2 bg-slate-700 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${stats.percentage}%` }}
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
          />
        </div>
      </motion.div>
    </div>
  );
}

export default ActionsView;
