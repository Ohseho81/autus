/**
 * AUTUS Work Page
 * =================
 * 업무 관리 - 삭제/자동화/업무지시/외주 선택 및 실시간 진행현황
 */

import React, { useState } from 'react';

// ============================================
// Types
// ============================================

interface WorkItem {
  id: string;
  title: string;
  description: string;
  category: '개발' | '기획' | '디자인' | '마케팅' | '운영' | '기타';
  status: 'todo' | 'in_progress' | 'review' | 'done';
  action: 'do' | 'delete' | 'automate' | 'delegate' | 'outsource' | null;
  priority: 1 | 2 | 3 | 4; // Eisenhower Matrix
  estimatedTime: number; // 분
  actualTime: number;
  deadline: string;
  assignee: string;
  progress: number; // 0-100
  createdAt: string;
}

type ActionType = 'do' | 'delete' | 'automate' | 'delegate' | 'outsource';

// ============================================
// Mock Data
// ============================================

const MOCK_WORKS: WorkItem[] = [
  {
    id: 'w1',
    title: 'API 엔드포인트 개발',
    description: '/api/users 엔드포인트 구현',
    category: '개발',
    status: 'in_progress',
    action: 'do',
    priority: 1,
    estimatedTime: 240,
    actualTime: 120,
    deadline: '2026-01-10',
    assignee: 'me',
    progress: 60,
    createdAt: '2026-01-05',
  },
  {
    id: 'w2',
    title: '주간 리포트 작성',
    description: '팀 주간 업무 보고서',
    category: '기획',
    status: 'todo',
    action: 'automate',
    priority: 2,
    estimatedTime: 60,
    actualTime: 0,
    deadline: '2026-01-09',
    assignee: 'me',
    progress: 0,
    createdAt: '2026-01-06',
  },
  {
    id: 'w3',
    title: '로고 리디자인',
    description: '브랜드 로고 개선',
    category: '디자인',
    status: 'todo',
    action: 'outsource',
    priority: 3,
    estimatedTime: 480,
    actualTime: 0,
    deadline: '2026-01-31',
    assignee: 'external',
    progress: 0,
    createdAt: '2026-01-01',
  },
  {
    id: 'w4',
    title: '고객 문의 응답',
    description: '미응답 고객 문의 처리',
    category: '운영',
    status: 'in_progress',
    action: 'delegate',
    priority: 2,
    estimatedTime: 30,
    actualTime: 15,
    deadline: '2026-01-08',
    assignee: 'team',
    progress: 50,
    createdAt: '2026-01-07',
  },
  {
    id: 'w5',
    title: '오래된 문서 정리',
    description: '사용하지 않는 문서 삭제',
    category: '기타',
    status: 'todo',
    action: 'delete',
    priority: 4,
    estimatedTime: 60,
    actualTime: 0,
    deadline: '2026-01-15',
    assignee: 'me',
    progress: 0,
    createdAt: '2025-12-20',
  },
];

// ============================================
// Action Configuration
// ============================================

const ACTION_CONFIG: Record<ActionType, { 
  icon: string; 
  label: string; 
  color: string; 
  bgColor: string;
  description: string;
}> = {
  do: { 
    icon: '✅', 
    label: '직접 수행', 
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    description: '내가 직접 처리'
  },
  delete: { 
    icon: '🗑️', 
    label: '삭제', 
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    description: '불필요한 업무 제거'
  },
  automate: { 
    icon: '🤖', 
    label: '자동화', 
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    description: '시스템으로 자동 처리'
  },
  delegate: { 
    icon: '👥', 
    label: '업무지시', 
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
    description: '팀원에게 위임'
  },
  outsource: { 
    icon: '🌐', 
    label: '외주', 
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
    description: '외부 전문가에게 의뢰'
  },
};

const PRIORITY_CONFIG = {
  1: { label: '긴급+중요', color: 'bg-red-500', icon: '🔴' },
  2: { label: '중요', color: 'bg-yellow-500', icon: '🟡' },
  3: { label: '긴급', color: 'bg-blue-500', icon: '🔵' },
  4: { label: '나중에', color: 'bg-slate-500', icon: '⚪' },
};

// ============================================
// Components
// ============================================

const ActionSelector = ({ 
  selectedAction, 
  onSelect 
}: { 
  selectedAction: ActionType | null;
  onSelect: (action: ActionType) => void;
}) => {
  return (
    <div className="flex gap-2 flex-wrap">
      {(Object.keys(ACTION_CONFIG) as ActionType[]).map((action) => {
        const config = ACTION_CONFIG[action];
        const isSelected = selectedAction === action;
        
        return (
          <button
            key={action}
            onClick={() => onSelect(action)}
            className={`px-3 py-2 rounded-lg border transition-all flex items-center gap-2 ${
              isSelected
                ? `${config.bgColor} border-current ${config.color}`
                : 'border-slate-600 text-slate-400 hover:border-slate-500'
            }`}
            title={config.description}
          >
            <span>{config.icon}</span>
            <span className="text-sm">{config.label}</span>
          </button>
        );
      })}
    </div>
  );
};

const WorkCard = ({ 
  item, 
  onActionChange,
  onStatusChange,
}: { 
  item: WorkItem;
  onActionChange: (action: ActionType) => void;
  onStatusChange: (status: WorkItem['status']) => void;
}) => {
  const actionConfig = item.action ? ACTION_CONFIG[item.action] : null;
  const priorityConfig = PRIORITY_CONFIG[item.priority];
  const daysLeft = Math.ceil(
    (new Date(item.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  
  return (
    <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700 hover:border-slate-500 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span title={priorityConfig.label}>{priorityConfig.icon}</span>
          <h3 className="font-medium text-white">{item.title}</h3>
        </div>
        <span className={`px-2 py-0.5 rounded text-xs ${
          item.status === 'done' ? 'bg-green-500' :
          item.status === 'in_progress' ? 'bg-blue-500' :
          item.status === 'review' ? 'bg-yellow-500' : 'bg-slate-600'
        } text-white`}>
          {item.status === 'todo' ? '대기' : 
           item.status === 'in_progress' ? '진행중' :
           item.status === 'review' ? '검토' : '완료'}
        </span>
      </div>
      
      <p className="text-sm text-slate-400 mb-3">{item.description}</p>
      
      {/* Progress */}
      <div className="mb-3">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-slate-500">진행률</span>
          <span className="text-slate-400">{item.progress}%</span>
        </div>
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${item.progress}%` }}
          />
        </div>
      </div>
      
      {/* Info */}
      <div className="flex items-center gap-4 text-sm text-slate-400 mb-4">
        <span className={daysLeft < 2 ? 'text-red-400' : ''}>
          📅 D-{daysLeft}
        </span>
        <span>⏱️ {item.estimatedTime}분 예상</span>
        <span className="px-2 py-0.5 bg-slate-700 rounded">{item.category}</span>
      </div>
      
      {/* Action Selection */}
      <div className="pt-3 border-t border-slate-700">
        <div className="text-xs text-slate-500 mb-2">어떻게 처리할까요?</div>
        <ActionSelector 
          selectedAction={item.action}
          onSelect={onActionChange}
        />
      </div>
      
      {/* Action Info */}
      {actionConfig && (
        <div className={`mt-3 p-2 rounded-lg ${actionConfig.bgColor}`}>
          <span className={`text-sm ${actionConfig.color}`}>
            {actionConfig.icon} {actionConfig.description}
          </span>
        </div>
      )}
    </div>
  );
};

const EisenhowerMatrix = ({ items }: { items: WorkItem[] }) => {
  const quadrants = [
    { priority: 1, title: '🔴 긴급 + 중요', action: '지금 하기', color: 'border-red-500' },
    { priority: 2, title: '🟡 중요', action: '일정 잡기', color: 'border-yellow-500' },
    { priority: 3, title: '🔵 긴급', action: '위임하기', color: 'border-blue-500' },
    { priority: 4, title: '⚪ 나중에', action: '삭제 검토', color: 'border-slate-500' },
  ];
  
  return (
    <div className="bg-slate-800/80 rounded-xl p-6 border border-slate-700">
      <h2 className="text-lg font-bold text-white mb-4">📊 아이젠하워 매트릭스</h2>
      
      <div className="grid grid-cols-2 gap-4">
        {quadrants.map(({ priority, title, action, color }) => {
          const count = items.filter(i => i.priority === priority).length;
          
          return (
            <div key={priority} className={`p-4 rounded-lg border-2 ${color} bg-slate-700/30`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-white">{title}</span>
                <span className="text-lg font-bold text-white">{count}</span>
              </div>
              <div className="text-xs text-slate-400">{action}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const RealTimeProgress = ({ items }: { items: WorkItem[] }) => {
  const inProgress = items.filter(i => i.status === 'in_progress');
  const today = items.filter(i => {
    const deadline = new Date(i.deadline);
    const now = new Date();
    return deadline.toDateString() === now.toDateString();
  });
  
  return (
    <div className="bg-slate-800/80 rounded-xl p-6 border border-slate-700">
      <h2 className="text-lg font-bold text-white mb-4">⚡ 실시간 진행현황</h2>
      
      <div className="space-y-4">
        {inProgress.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            진행 중인 업무가 없습니다
          </div>
        ) : (
          inProgress.map((item) => (
            <div key={item.id} className="flex items-center gap-4">
              <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
              <div className="flex-1">
                <div className="text-white text-sm">{item.title}</div>
                <div className="h-1.5 bg-slate-700 rounded-full mt-1 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all"
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              </div>
              <span className="text-sm text-slate-400">{item.progress}%</span>
            </div>
          ))
        )}
      </div>
      
      {/* Today's Deadline */}
      {today.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-700">
          <div className="text-sm text-red-400 font-medium">
            🚨 오늘 마감: {today.length}건
          </div>
        </div>
      )}
    </div>
  );
};

const ActionSummary = ({ items }: { items: WorkItem[] }) => {
  const summary = {
    do: items.filter(i => i.action === 'do').length,
    delete: items.filter(i => i.action === 'delete').length,
    automate: items.filter(i => i.action === 'automate').length,
    delegate: items.filter(i => i.action === 'delegate').length,
    outsource: items.filter(i => i.action === 'outsource').length,
    unassigned: items.filter(i => i.action === null).length,
  };
  
  return (
    <div className="bg-slate-800/80 rounded-xl p-6 border border-slate-700">
      <h2 className="text-lg font-bold text-white mb-4">📋 액션 분류</h2>
      
      <div className="space-y-3">
        {(Object.keys(ACTION_CONFIG) as ActionType[]).map((action) => {
          const config = ACTION_CONFIG[action];
          const count = summary[action];
          
          return (
            <div key={action} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>{config.icon}</span>
                <span className="text-sm text-slate-300">{config.label}</span>
              </div>
              <span className={`font-medium ${config.color}`}>{count}</span>
            </div>
          );
        })}
        
        {summary.unassigned > 0 && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-700">
            <span className="text-sm text-slate-400">❓ 미분류</span>
            <span className="text-orange-400 font-medium">{summary.unassigned}</span>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================
// Main Component
// ============================================

export default function WorkPage() {
  const [items, setItems] = useState<WorkItem[]>(MOCK_WORKS);
  const [filter, setFilter] = useState<'all' | 'todo' | 'in_progress' | 'done'>('all');
  const [sortBy, setSortBy] = useState<'priority' | 'deadline'>('priority');
  
  const handleActionChange = (itemId: string, action: ActionType) => {
    setItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, action } : item
    ));
  };
  
  const handleStatusChange = (itemId: string, status: WorkItem['status']) => {
    setItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, status, progress: status === 'done' ? 100 : item.progress } : item
    ));
  };
  
  const filteredItems = items
    .filter(item => filter === 'all' || item.status === filter)
    .sort((a, b) => {
      if (sortBy === 'priority') return a.priority - b.priority;
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    });
  
  return (
    <div className="min-h-full bg-slate-900 text-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">📋 업무 관리</h1>
          <p className="text-slate-400 mt-1">
            삭제 / 자동화 / 업무지시 / 외주 - 현명하게 선택하세요
          </p>
        </div>
        <button className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium">
          + 새 업무 추가
        </button>
      </div>
      
      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex gap-2">
          {(['all', 'todo', 'in_progress', 'done'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                filter === f
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
              }`}
            >
              {f === 'all' ? '전체' : f === 'todo' ? '대기' : f === 'in_progress' ? '진행중' : '완료'}
            </button>
          ))}
        </div>
        
        <div className="flex items-center gap-2 ml-auto text-sm">
          <span className="text-slate-400">정렬:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'priority' | 'deadline')}
            className="bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-white"
          >
            <option value="priority">우선순위</option>
            <option value="deadline">마감일</option>
          </select>
        </div>
      </div>
      
      {/* Main Grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left: Work Items */}
        <div className="col-span-8">
          <div className="grid grid-cols-2 gap-4">
            {filteredItems.map((item) => (
              <WorkCard
                key={item.id}
                item={item}
                onActionChange={(action) => handleActionChange(item.id, action)}
                onStatusChange={(status) => handleStatusChange(item.id, status)}
              />
            ))}
          </div>
        </div>
        
        {/* Right: Sidebar */}
        <div className="col-span-4 space-y-6">
          <RealTimeProgress items={items} />
          <EisenhowerMatrix items={items} />
          <ActionSummary items={items} />
        </div>
      </div>
    </div>
  );
}
