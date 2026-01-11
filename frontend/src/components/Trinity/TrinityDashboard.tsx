/**
 * AUTUS - 업무 최적화 엔진
 * =========================
 * 
 * 핵심 목적:
 * 1. 업무 삭제 & 자동화
 * 2. 누구에게 무엇을 맡길지 (위임)
 * 3. 목표까지 최적 경로
 * 
 * 2계층: 리더(선행) / 팔로우(후행)
 */

import React, { useState, useCallback, useMemo } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// 타입 정의
// ═══════════════════════════════════════════════════════════════════════════

interface Task {
  id: string;
  name: string;
  category: 'delete' | 'automate' | 'delegate' | 'do';
  assignee?: string;
  status: 'todo' | 'progress' | 'done';
  impact: number; // 1-10
  effort: number; // 1-10
}

interface Milestone {
  id: string;
  name: string;
  target: string;
  current: string;
  progress: number;
  deadline: string;
}

interface Person {
  id: string;
  name: string;
  role: string;
  tasks: string[];
  capacity: number; // 0-100%
}

// ═══════════════════════════════════════════════════════════════════════════
// 초기 데이터
// ═══════════════════════════════════════════════════════════════════════════

const INITIAL_TASKS: Task[] = [
  { id: '1', name: '월간 보고서 작성', category: 'automate', status: 'progress', impact: 6, effort: 8 },
  { id: '2', name: '이메일 분류', category: 'automate', status: 'done', impact: 4, effort: 3 },
  { id: '3', name: '고객 미팅', category: 'do', status: 'todo', impact: 9, effort: 5 },
  { id: '4', name: '비용 정산', category: 'delegate', assignee: '김대리', status: 'progress', impact: 5, effort: 7 },
  { id: '5', name: '주간 회의', category: 'delete', status: 'done', impact: 2, effort: 4 },
  { id: '6', name: 'SNS 관리', category: 'delegate', assignee: '에이전시', status: 'progress', impact: 5, effort: 6 },
  { id: '7', name: '재고 확인', category: 'automate', status: 'todo', impact: 4, effort: 5 },
  { id: '8', name: '불필요한 미팅', category: 'delete', status: 'todo', impact: 1, effort: 3 },
];

const MILESTONES: Milestone[] = [
  { id: '1', name: '주 40시간 → 30시간', target: '30h', current: '38h', progress: 20, deadline: '1개월' },
  { id: '2', name: '월 매출 2000만', target: '₩20M', current: '₩12M', progress: 60, deadline: '2개월' },
  { id: '3', name: '자동화율 50%', target: '50%', current: '25%', progress: 50, deadline: '3개월' },
];

const PEOPLE: Person[] = [
  { id: '1', name: '김대리', role: '회계/정산', tasks: ['비용 정산', '세금 처리'], capacity: 70 },
  { id: '2', name: '에이전시', role: '마케팅', tasks: ['SNS 관리', '광고 운영'], capacity: 40 },
  { id: '3', name: 'Zapier', role: '자동화', tasks: ['이메일 분류', '알림 발송'], capacity: 10 },
];

// ═══════════════════════════════════════════════════════════════════════════
// 색상 & 스타일
// ═══════════════════════════════════════════════════════════════════════════

const CATEGORY_COLORS = {
  delete: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', icon: '🗑️', label: '삭제' },
  automate: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-400', icon: '⚡', label: '자동화' },
  delegate: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400', icon: '👥', label: '위임' },
  do: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', icon: '✋', label: '직접' },
};

// ═══════════════════════════════════════════════════════════════════════════
// 메인 대시보드
// ═══════════════════════════════════════════════════════════════════════════

export default function TrinityDashboard() {
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [view, setView] = useState<'matrix' | 'timeline' | 'people'>('matrix');

  // 카테고리별 통계
  const stats = useMemo(() => {
    const counts = { delete: 0, automate: 0, delegate: 0, do: 0, total: tasks.length };
    const done = { delete: 0, automate: 0, delegate: 0, do: 0 };
    
    tasks.forEach(t => {
      counts[t.category]++;
      if (t.status === 'done') done[t.category]++;
    });

    // 시간 절약 추정 (삭제 + 자동화 + 위임된 업무)
    const savedTasks = tasks.filter(t => 
      (t.category === 'delete' || t.category === 'automate' || t.category === 'delegate') 
      && t.status === 'done'
    );
    const savedHours = savedTasks.reduce((sum, t) => sum + t.effort, 0);

    return { counts, done, savedHours };
  }, [tasks]);

  // 리더/팔로우 지표
  const indicators = useMemo(() => ({
    leader: { 
      label: '업무 최적화율', 
      value: Math.round(((stats.done.delete + stats.done.automate + stats.done.delegate) / stats.counts.total) * 100),
      desc: '삭제/자동화/위임 완료'
    },
    follow: { 
      label: '주당 절약 시간', 
      value: stats.savedHours,
      unit: 'h',
      desc: '자동화로 확보한 시간'
    }
  }), [stats]);

  // 업무 카테고리 변경
  const handleCategoryChange = useCallback((taskId: string, newCategory: Task['category']) => {
    setTasks(prev => prev.map(t => 
      t.id === taskId ? { ...t, category: newCategory } : t
    ));
  }, []);

  // 업무 상태 변경
  const handleStatusChange = useCallback((taskId: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t;
      const nextStatus = t.status === 'todo' ? 'progress' : t.status === 'progress' ? 'done' : 'todo';
      return { ...t, status: nextStatus };
    }));
  }, []);

  return (
    <div className="h-full bg-[#08080c] text-white flex flex-col overflow-hidden">
      
      {/* ═══════════════════════════════════════════════════════════════════
          헤더 - 미니멀
      ═══════════════════════════════════════════════════════════════════ */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <div className="flex items-center gap-4">
          <span className="text-lg font-light tracking-wider">AUTUS</span>
          <div className="h-4 w-px bg-white/20" />
          <span className="text-sm text-white/50">업무 최적화 엔진</span>
        </div>

        {/* 뷰 전환 */}
        <div className="flex gap-1 p-1 rounded-xl bg-white/5">
          {[
            { id: 'matrix', label: '매트릭스', icon: '⊞' },
            { id: 'timeline', label: '목표경로', icon: '→' },
            { id: 'people', label: '위임현황', icon: '👥' },
          ].map(v => (
            <button
              key={v.id}
              onClick={() => setView(v.id as typeof view)}
              className={`px-4 py-2 rounded-lg text-sm transition-all ${
                view === v.id 
                  ? 'bg-white/10 text-white' 
                  : 'text-white/50 hover:text-white/80'
              }`}
            >
              <span className="mr-2">{v.icon}</span>
              {v.label}
            </button>
          ))}
        </div>

        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-sm font-medium">
          O
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════════
          상단 지표 - 리더/팔로우
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex gap-4 px-6 py-4">
        {/* 리더 지표 */}
        <div className="flex-1 p-4 rounded-2xl bg-gradient-to-br from-purple-500/10 to-transparent border border-purple-500/20">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400">리더</span>
            <span className="text-xs text-white/40">{indicators.leader.desc}</span>
          </div>
          <div className="text-4xl font-light">
            {indicators.leader.value}
            <span className="text-xl text-white/40">%</span>
          </div>
          <div className="text-sm text-white/50 mt-1">{indicators.leader.label}</div>
        </div>

        {/* 팔로우 지표 */}
        <div className="flex-1 p-4 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-transparent border border-cyan-500/20">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400">팔로우</span>
            <span className="text-xs text-white/40">{indicators.follow.desc}</span>
          </div>
          <div className="text-4xl font-light">
            {indicators.follow.value}
            <span className="text-xl text-white/40">{indicators.follow.unit}</span>
          </div>
          <div className="text-sm text-white/50 mt-1">{indicators.follow.label}</div>
        </div>

        {/* 카테고리 요약 */}
        <div className="flex gap-2">
          {(['delete', 'automate', 'delegate', 'do'] as const).map(cat => {
            const c = CATEGORY_COLORS[cat];
            const count = stats.counts[cat];
            const doneCount = stats.done[cat];
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                className={`p-4 rounded-2xl border transition-all ${c.bg} ${c.border} ${
                  selectedCategory === cat ? 'ring-2 ring-white/20' : ''
                }`}
              >
                <div className="text-2xl mb-1">{c.icon}</div>
                <div className={`text-lg font-semibold ${c.text}`}>{doneCount}/{count}</div>
                <div className="text-xs text-white/40">{c.label}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          메인 컨텐츠
      ═══════════════════════════════════════════════════════════════════ */}
      <main className="flex-1 px-6 pb-6 overflow-hidden">
        
        {/* 매트릭스 뷰 */}
        {view === 'matrix' && (
          <div className="h-full grid grid-cols-4 gap-4">
            {(['delete', 'automate', 'delegate', 'do'] as const).map(cat => {
              const c = CATEGORY_COLORS[cat];
              const categoryTasks = tasks.filter(t => 
                t.category === cat && (selectedCategory === null || selectedCategory === cat)
              );
              
              return (
                <div 
                  key={cat}
                  className={`rounded-2xl border ${c.border} ${c.bg} flex flex-col overflow-hidden`}
                >
                  {/* 카테고리 헤더 */}
                  <div className="p-4 border-b border-white/5">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{c.icon}</span>
                      <span className={`font-medium ${c.text}`}>{c.label}</span>
                      <span className="ml-auto text-sm text-white/40">{categoryTasks.length}</span>
                    </div>
                    <div className="text-xs text-white/30 mt-1">
                      {cat === 'delete' && '안 해도 되는 일'}
                      {cat === 'automate' && '시스템이 대신할 일'}
                      {cat === 'delegate' && '다른 사람에게 맡길 일'}
                      {cat === 'do' && '내가 직접 해야 할 일'}
                    </div>
                  </div>

                  {/* 업무 리스트 */}
                  <div className="flex-1 p-2 overflow-y-auto space-y-2">
                    {categoryTasks.map(task => (
                      <div
                        key={task.id}
                        onClick={() => handleStatusChange(task.id)}
                        className={`p-3 rounded-xl bg-black/30 border border-white/5 cursor-pointer transition-all hover:bg-white/5 ${
                          task.status === 'done' ? 'opacity-50' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`w-2 h-2 rounded-full ${
                            task.status === 'todo' ? 'bg-white/30' :
                            task.status === 'progress' ? 'bg-amber-400' : 'bg-green-400'
                          }`} />
                          <span className={`text-sm ${task.status === 'done' ? 'line-through text-white/40' : ''}`}>
                            {task.name}
                          </span>
                        </div>
                        
                        {task.assignee && (
                          <div className="text-xs text-purple-400">→ {task.assignee}</div>
                        )}
                        
                        <div className="flex gap-2 mt-2">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/40">
                            영향력 {task.impact}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/40">
                            노력 {task.effort}
                          </span>
                        </div>
                      </div>
                    ))}

                    {categoryTasks.length === 0 && (
                      <div className="text-center text-white/20 py-8 text-sm">
                        업무 없음
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 목표경로 뷰 */}
        {view === 'timeline' && (
          <div className="h-full flex flex-col gap-6">
            {/* 궁극적 목표 */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-cyan-500/10 border border-white/10">
              <div className="text-xs text-white/40 mb-2">🎯 궁극적 목표</div>
              <div className="text-2xl font-light mb-4">주 20시간 일하고, 월 5000만 벌기</div>
              
              {/* 타임라인 */}
              <div className="flex items-center gap-2">
                <div className="text-xs text-white/40">현재</div>
                <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full rounded-full"
                    style={{ 
                      width: '35%',
                      background: 'linear-gradient(90deg, #fbbf24, #a78bfa, #06b6d4)'
                    }}
                  />
                </div>
                <div className="text-xs text-white/40">목표</div>
              </div>
            </div>

            {/* 마일스톤 */}
            <div className="flex-1 grid grid-cols-3 gap-4">
              {MILESTONES.map((m, i) => (
                <div 
                  key={m.id}
                  className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm">
                      {i + 1}
                    </span>
                    <span className="text-white/40 text-xs">{m.deadline}</span>
                  </div>
                  
                  <div className="text-lg mb-2">{m.name}</div>
                  
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-2xl font-light text-cyan-400">{m.current}</span>
                    <span className="text-white/30">→</span>
                    <span className="text-lg text-white/50">{m.target}</span>
                  </div>
                  
                  <div className="mt-auto">
                    <div className="flex justify-between text-xs text-white/40 mb-1">
                      <span>진행률</span>
                      <span>{m.progress}%</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-cyan-400 rounded-full transition-all"
                        style={{ width: `${m.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 다음 액션 */}
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-center gap-3">
                <span className="text-2xl">⚡</span>
                <div className="flex-1">
                  <div className="text-xs text-amber-400 mb-1">다음 액션</div>
                  <div className="text-sm">월간 보고서 자동화 완료하기 → 주 2시간 절약 예상</div>
                </div>
                <button className="px-4 py-2 rounded-xl bg-amber-500/20 text-amber-400 text-sm hover:bg-amber-500/30 transition-colors">
                  시작
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 위임현황 뷰 */}
        {view === 'people' && (
          <div className="h-full grid grid-cols-3 gap-6">
            {PEOPLE.map(person => (
              <div 
                key={person.id}
                className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col"
              >
                {/* 프로필 */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-lg font-medium">
                    {person.name[0]}
                  </div>
                  <div>
                    <div className="font-medium">{person.name}</div>
                    <div className="text-xs text-white/40">{person.role}</div>
                  </div>
                </div>

                {/* 용량 */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-white/40 mb-1">
                    <span>업무 용량</span>
                    <span>{person.capacity}%</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all ${
                        person.capacity > 80 ? 'bg-red-400' :
                        person.capacity > 50 ? 'bg-amber-400' : 'bg-green-400'
                      }`}
                      style={{ width: `${person.capacity}%` }}
                    />
                  </div>
                </div>

                {/* 맡은 업무 */}
                <div className="flex-1">
                  <div className="text-xs text-white/40 mb-2">맡은 업무</div>
                  <div className="space-y-2">
                    {person.tasks.map((task, i) => (
                      <div 
                        key={i}
                        className="p-2 rounded-lg bg-white/5 text-sm flex items-center gap-2"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                        {task}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 추가 위임 */}
                <button className="mt-4 w-full py-2 rounded-xl border border-dashed border-white/20 text-white/40 text-sm hover:border-white/40 hover:text-white/60 transition-colors">
                  + 업무 위임
                </button>
              </div>
            ))}

            {/* 새 담당자 추가 */}
            <div className="p-5 rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center text-white/30 hover:border-white/20 hover:text-white/50 transition-colors cursor-pointer">
              <span className="text-4xl mb-2">+</span>
              <span className="text-sm">담당자 추가</span>
              <span className="text-xs mt-1">(사람 또는 시스템)</span>
            </div>
          </div>
        )}
      </main>

      {/* ═══════════════════════════════════════════════════════════════════
          하단 추세선
      ═══════════════════════════════════════════════════════════════════ */}
      <footer className="px-6 py-4 border-t border-white/5">
        <div className="flex items-center gap-4">
          <span className="text-xs text-white/40">📈 주간 추세</span>
          <div className="flex-1 h-8 flex items-end gap-1">
            {[40, 35, 38, 32, 30, 28, 25].map((v, i) => (
              <div 
                key={i}
                className="flex-1 bg-gradient-to-t from-cyan-500/50 to-cyan-500/20 rounded-t transition-all hover:from-cyan-400/60"
                style={{ height: `${v}%` }}
                title={`W${i+1}: ${v}h`}
              />
            ))}
          </div>
          <div className="text-right">
            <div className="text-xs text-white/40">이번 주</div>
            <div className="text-lg font-light">25<span className="text-xs text-white/40">h</span></div>
          </div>
        </div>
      </footer>
    </div>
  );
}
