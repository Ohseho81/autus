/**
 * AUTUS Trinity - TaskStatusPanel (Palantir Style)
 * =================================================
 * 
 * 과제 현황 패널
 * - 외부승인, 외부제출, 외주, 삭제, 자동화
 * - 실시간 진행 현황
 */

import React, { memo, useState, useEffect, useMemo } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// 타입
// ═══════════════════════════════════════════════════════════════════════════

export type TaskCategory = 'approval' | 'submission' | 'outsource' | 'delete' | 'automate';

export interface TaskItem {
  id: string;
  title: string;
  category: TaskCategory;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  progress: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  dueDate?: string;
  assignee?: string;
  automationRate?: number;
}

interface TaskStatusPanelProps {
  tasks?: TaskItem[];
  onTaskClick?: (task: TaskItem) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// 상수
// ═══════════════════════════════════════════════════════════════════════════

const CATEGORIES: { id: TaskCategory; label: string; icon: string; color: string }[] = [
  { id: 'approval', label: '외부승인', icon: '✅', color: '#4ade80' },
  { id: 'submission', label: '외부제출', icon: '📤', color: '#06b6d4' },
  { id: 'outsource', label: '외주', icon: '🤝', color: '#a78bfa' },
  { id: 'delete', label: '삭제', icon: '🗑️', color: '#f87171' },
  { id: 'automate', label: '자동화', icon: '🤖', color: '#fbbf24' },
];

const PRIORITY_COLORS = {
  low: '#64748b',
  medium: '#06b6d4',
  high: '#fbbf24',
  critical: '#f87171'
};

// ═══════════════════════════════════════════════════════════════════════════
// Mock 데이터
// ═══════════════════════════════════════════════════════════════════════════

const MOCK_TASKS: TaskItem[] = [
  { id: '1', title: '정부지원금 신청서', category: 'submission', status: 'in_progress', progress: 65, priority: 'high', dueDate: '2/18' },
  { id: '2', title: 'A사 계약서 검토', category: 'approval', status: 'pending', progress: 0, priority: 'critical', dueDate: '2/15' },
  { id: '3', title: '월간 리포트 자동화', category: 'automate', status: 'in_progress', progress: 85, priority: 'medium', automationRate: 85 },
  { id: '4', title: '레거시 코드 삭제', category: 'delete', status: 'in_progress', progress: 40, priority: 'low' },
  { id: '5', title: '디자인 외주', category: 'outsource', status: 'pending', progress: 0, priority: 'medium', dueDate: '2/28' },
  { id: '6', title: '세금 신고', category: 'submission', status: 'completed', progress: 100, priority: 'high' },
  { id: '7', title: '백업 자동화', category: 'automate', status: 'completed', progress: 100, priority: 'medium', automationRate: 100 },
  { id: '8', title: '불필요 구독 해지', category: 'delete', status: 'pending', progress: 0, priority: 'low' },
];

// ═══════════════════════════════════════════════════════════════════════════
// 서브 컴포넌트
// ═══════════════════════════════════════════════════════════════════════════

// 실시간 진행 표시기
const LiveProgress = memo(function LiveProgress({ 
  label, 
  current, 
  total, 
  color 
}: { 
  label: string; 
  current: number; 
  total: number; 
  color: string;
}) {
  const [animatedValue, setAnimatedValue] = useState(0);
  
  useEffect(() => {
    const target = (current / total) * 100;
    const step = target / 20;
    let value = 0;
    
    const interval = setInterval(() => {
      value += step;
      if (value >= target) {
        value = target;
        clearInterval(interval);
      }
      setAnimatedValue(value);
    }, 50);
    
    return () => clearInterval(interval);
  }, [current, total]);

  return (
    <div className="mb-3">
      <div className="flex justify-between text-[9px] mb-1">
        <span className="text-white/50">{label}</span>
        <span style={{ color }}>{current}/{total}</span>
      </div>
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div 
          className="h-full rounded-full transition-all duration-500"
          style={{ 
            width: `${animatedValue}%`,
            background: `linear-gradient(90deg, ${color}80, ${color})`
          }}
        />
      </div>
    </div>
  );
});

// 실시간 활동 피드
const ActivityFeed = memo(function ActivityFeed() {
  const [activities, setActivities] = useState([
    { id: 1, type: 'automate', message: '백업 자동화 완료', time: '방금' },
    { id: 2, type: 'delete', message: '임시파일 2.3GB 삭제', time: '2분 전' },
    { id: 3, type: 'automate', message: '리포트 생성 중...', time: '5분 전' },
  ]);

  // 실시간 업데이트 시뮬레이션
  useEffect(() => {
    const messages = [
      { type: 'automate', message: '데이터 동기화 완료' },
      { type: 'delete', message: '캐시 정리 완료' },
      { type: 'automate', message: 'API 호출 최적화' },
      { type: 'delete', message: '중복 파일 제거' },
    ];
    
    const interval = setInterval(() => {
      const randomMsg = messages[Math.floor(Math.random() * messages.length)];
      setActivities(prev => [
        { id: Date.now(), ...randomMsg, time: '방금' },
        ...prev.slice(0, 4).map(a => ({ ...a, time: updateTime(a.time) }))
      ]);
    }, 8000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-2">
      {activities.map((activity, i) => (
        <div 
          key={activity.id}
          className={`flex items-center gap-2 p-2 rounded-lg transition-all ${
            i === 0 ? 'bg-[rgba(74,222,128,0.1)] animate-pulse' : 'bg-white/[0.02]'
          }`}
        >
          <span className="text-sm">
            {activity.type === 'automate' ? '🤖' : '🗑️'}
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] text-white/70 truncate">{activity.message}</div>
          </div>
          <span className="text-[8px] text-white/30">{activity.time}</span>
        </div>
      ))}
    </div>
  );
});

function updateTime(time: string): string {
  if (time === '방금') return '1분 전';
  const match = time.match(/(\d+)분 전/);
  if (match) {
    const mins = parseInt(match[1]) + 1;
    return mins >= 60 ? '1시간 전' : `${mins}분 전`;
  }
  return time;
}

// 카테고리별 요약 카드
const CategoryCard = memo(function CategoryCard({
  category,
  tasks,
  onClick
}: {
  category: typeof CATEGORIES[0];
  tasks: TaskItem[];
  onClick?: () => void;
}) {
  const completed = tasks.filter(t => t.status === 'completed').length;
  const inProgress = tasks.filter(t => t.status === 'in_progress').length;
  const pending = tasks.filter(t => t.status === 'pending').length;
  
  return (
    <button
      onClick={onClick}
      className="p-3 bg-white/[0.02] rounded-xl border border-transparent hover:border-white/10 hover:bg-white/[0.04] transition-all text-left w-full"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{category.icon}</span>
          <span className="text-[11px] font-medium">{category.label}</span>
        </div>
        <span 
          className="text-xs font-bold"
          style={{ color: category.color }}
        >
          {tasks.length}
        </span>
      </div>
      
      {/* 미니 진행 바 */}
      <div className="flex gap-0.5 h-1">
        {completed > 0 && (
          <div 
            className="rounded-full"
            style={{ 
              width: `${(completed / tasks.length) * 100}%`,
              background: '#4ade80'
            }}
          />
        )}
        {inProgress > 0 && (
          <div 
            className="rounded-full"
            style={{ 
              width: `${(inProgress / tasks.length) * 100}%`,
              background: category.color
            }}
          />
        )}
        {pending > 0 && (
          <div 
            className="rounded-full bg-white/10"
            style={{ width: `${(pending / tasks.length) * 100}%` }}
          />
        )}
      </div>
      
      <div className="flex gap-2 mt-2 text-[8px] text-white/40">
        <span>완료 {completed}</span>
        <span>진행 {inProgress}</span>
        <span>대기 {pending}</span>
      </div>
    </button>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// 메인 컴포넌트
// ═══════════════════════════════════════════════════════════════════════════

const TaskStatusPanel = memo(function TaskStatusPanel({
  tasks = MOCK_TASKS,
  onTaskClick
}: TaskStatusPanelProps) {
  const [selectedCategory, setSelectedCategory] = useState<TaskCategory | null>(null);
  const [viewMode, setViewMode] = useState<'summary' | 'list'>('summary');

  // 카테고리별 분류
  const tasksByCategory = useMemo(() => {
    return CATEGORIES.reduce((acc, cat) => {
      acc[cat.id] = tasks.filter(t => t.category === cat.id);
      return acc;
    }, {} as Record<TaskCategory, TaskItem[]>);
  }, [tasks]);

  // 통계
  const stats = useMemo(() => {
    const completed = tasks.filter(t => t.status === 'completed').length;
    const automated = tasks.filter(t => t.category === 'automate' && t.status === 'completed').length;
    const deleted = tasks.filter(t => t.category === 'delete').length;
    const avgAutomation = tasks
      .filter(t => t.automationRate !== undefined)
      .reduce((sum, t) => sum + (t.automationRate || 0), 0) / 
      tasks.filter(t => t.automationRate !== undefined).length || 0;
    
    return { completed, automated, deleted, avgAutomation, total: tasks.length };
  }, [tasks]);

  const filteredTasks = selectedCategory 
    ? tasksByCategory[selectedCategory]
    : tasks.filter(t => t.status !== 'completed').slice(0, 5);

  return (
    <div className="bg-black/60 backdrop-blur-xl rounded-xl border border-white/5 h-full flex flex-col">
      {/* 헤더 */}
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <span>📋</span> 과제 현황
          </h3>
          <div className="flex gap-1">
            <button
              onClick={() => setViewMode('summary')}
              className={`px-2 py-1 text-[9px] rounded ${
                viewMode === 'summary' ? 'bg-[#a78bfa] text-white' : 'bg-white/5 text-white/50'
              }`}
            >
              요약
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-2 py-1 text-[9px] rounded ${
                viewMode === 'list' ? 'bg-[#a78bfa] text-white' : 'bg-white/5 text-white/50'
              }`}
            >
              목록
            </button>
          </div>
        </div>
        
        {/* 전체 진행률 */}
        <LiveProgress 
          label="전체 완료율" 
          current={stats.completed} 
          total={stats.total} 
          color="#4ade80"
        />
        <LiveProgress 
          label="자동화율" 
          current={Math.round(stats.avgAutomation)} 
          total={100} 
          color="#fbbf24"
        />
      </div>

      {/* 콘텐츠 */}
      <div className="flex-1 overflow-y-auto p-4">
        {viewMode === 'summary' ? (
          <>
            {/* 카테고리 그리드 */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              {CATEGORIES.map(cat => (
                <CategoryCard
                  key={cat.id}
                  category={cat}
                  tasks={tasksByCategory[cat.id]}
                  onClick={() => setSelectedCategory(
                    selectedCategory === cat.id ? null : cat.id
                  )}
                />
              ))}
            </div>
            
            {/* 실시간 활동 */}
            <div className="mt-4">
              <div className="text-[10px] text-white/40 mb-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#4ade80] animate-pulse" />
                실시간 자동화
              </div>
              <ActivityFeed />
            </div>
          </>
        ) : (
          /* 목록 뷰 */
          <div className="space-y-2">
            {/* 필터 탭 */}
            <div className="flex gap-1 mb-3 flex-wrap">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-2 py-1 text-[9px] rounded ${
                  !selectedCategory ? 'bg-white/10 text-white' : 'bg-white/5 text-white/40'
                }`}
              >
                전체
              </button>
              {CATEGORIES.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-2 py-1 text-[9px] rounded flex items-center gap-1 ${
                    selectedCategory === cat.id 
                      ? 'text-white' 
                      : 'bg-white/5 text-white/40'
                  }`}
                  style={{
                    background: selectedCategory === cat.id ? `${cat.color}30` : undefined
                  }}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
            
            {/* 태스크 리스트 */}
            {filteredTasks.map(task => {
              const cat = CATEGORIES.find(c => c.id === task.category)!;
              return (
                <div
                  key={task.id}
                  onClick={() => onTaskClick?.(task)}
                  className="p-3 bg-white/[0.02] rounded-lg border border-transparent hover:border-white/10 cursor-pointer transition-all"
                >
                  <div className="flex items-start gap-2">
                    <span className="text-lg">{cat.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-medium truncate">{task.title}</span>
                        <span 
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ background: PRIORITY_COLORS[task.priority] }}
                        />
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span 
                          className="text-[8px] px-1.5 py-0.5 rounded"
                          style={{ 
                            background: `${cat.color}20`,
                            color: cat.color
                          }}
                        >
                          {cat.label}
                        </span>
                        {task.dueDate && (
                          <span className="text-[8px] text-white/40">📅 {task.dueDate}</span>
                        )}
                      </div>
                      
                      {/* 진행 바 */}
                      {task.progress > 0 && task.progress < 100 && (
                        <div className="mt-2">
                          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full"
                              style={{ 
                                width: `${task.progress}%`,
                                background: cat.color
                              }}
                            />
                          </div>
                          <div className="text-[8px] text-white/30 mt-0.5">{task.progress}%</div>
                        </div>
                      )}
                    </div>
                    
                    {task.status === 'completed' && (
                      <span className="text-[#4ade80] text-sm">✓</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 푸터 통계 */}
      <div className="p-3 border-t border-white/5 grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="text-lg font-bold text-[#4ade80]">{stats.completed}</div>
          <div className="text-[8px] text-white/40">완료</div>
        </div>
        <div>
          <div className="text-lg font-bold text-[#fbbf24]">{stats.automated}</div>
          <div className="text-[8px] text-white/40">자동화</div>
        </div>
        <div>
          <div className="text-lg font-bold text-[#f87171]">{stats.deleted}</div>
          <div className="text-[8px] text-white/40">삭제</div>
        </div>
      </div>
    </div>
  );
});

export default TaskStatusPanel;
