/**
 * AUTUS Trinity - WorkflowPipeline Component
 * ===========================================
 * 
 * 전체 업무 과정을 가로 파이프라인으로 시각화
 * - 외부승인 → 외부제출 → 외주 → 삭제 → 자동화
 * - 병목 발생 시 반짝거림 효과
 */

import React, { memo, useMemo, useEffect, useState } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// 타입
// ═══════════════════════════════════════════════════════════════════════════

export interface WorkflowStage {
  id: string;
  label: string;
  icon: string;
  color: string;
  count: number;
  inProgress: number;
  completed: number;
  blocked: number;
  isBottleneck?: boolean;
}

interface WorkflowPipelineProps {
  stages?: WorkflowStage[];
  onStageClick?: (stageId: string) => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// 기본 스테이지 데이터
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_STAGES: WorkflowStage[] = [
  { 
    id: 'approval', 
    label: '외부승인', 
    icon: '✅', 
    color: '#4ade80',
    count: 3,
    inProgress: 1,
    completed: 1,
    blocked: 1,
    isBottleneck: true
  },
  { 
    id: 'submission', 
    label: '외부제출', 
    icon: '📤', 
    color: '#06b6d4',
    count: 2,
    inProgress: 2,
    completed: 0,
    blocked: 0
  },
  { 
    id: 'outsource', 
    label: '외주', 
    icon: '🤝', 
    color: '#a78bfa',
    count: 2,
    inProgress: 1,
    completed: 1,
    blocked: 0
  },
  { 
    id: 'delete', 
    label: '삭제', 
    icon: '🗑️', 
    color: '#f87171',
    count: 4,
    inProgress: 2,
    completed: 2,
    blocked: 0
  },
  { 
    id: 'automate', 
    label: '자동화', 
    icon: '🤖', 
    color: '#fbbf24',
    count: 3,
    inProgress: 1,
    completed: 2,
    blocked: 0
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// 스테이지 노드 컴포넌트
// ═══════════════════════════════════════════════════════════════════════════

const StageNode = memo(function StageNode({
  stage,
  isLast,
  onClick
}: {
  stage: WorkflowStage;
  isLast: boolean;
  onClick?: () => void;
}) {
  const [isBlinking, setIsBlinking] = useState(false);
  
  // 병목 시 반짝임 효과
  useEffect(() => {
    if (stage.isBottleneck) {
      const interval = setInterval(() => {
        setIsBlinking(prev => !prev);
      }, 800);
      return () => clearInterval(interval);
    }
  }, [stage.isBottleneck]);

  const completionRate = stage.count > 0 
    ? Math.round((stage.completed / stage.count) * 100) 
    : 0;

  return (
    <div className="flex items-center flex-1">
      {/* 스테이지 박스 */}
      <button
        onClick={onClick}
        className={`
          relative flex-1 px-3 py-2 rounded-lg border transition-all cursor-pointer
          hover:scale-[1.02] hover:z-10
          ${stage.isBottleneck 
            ? isBlinking 
              ? 'bg-[rgba(248,113,113,0.25)] border-[#f87171] shadow-[0_0_15px_rgba(248,113,113,0.4)]' 
              : 'bg-[rgba(248,113,113,0.15)] border-[#f87171]/50'
            : 'bg-white/[0.03] border-white/10 hover:border-white/20'
          }
        `}
      >
        {/* 병목 경고 아이콘 */}
        {stage.isBottleneck && (
          <div className={`absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[#f87171] flex items-center justify-center text-[10px] z-10 ${
            isBlinking ? 'animate-bounce' : ''
          }`}>
            ⚠️
          </div>
        )}

        {/* 상단: 아이콘 + 라벨 */}
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-base">{stage.icon}</span>
          <span className="text-[10px] font-medium text-white/80">{stage.label}</span>
        </div>

        {/* 진행 바 */}
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden mb-1.5">
          <div 
            className="h-full rounded-full transition-all duration-500"
            style={{ 
              width: `${completionRate}%`,
              background: `linear-gradient(90deg, ${stage.color}80, ${stage.color})`
            }}
          />
        </div>

        {/* 통계 */}
        <div className="flex justify-between text-[8px]">
          <span className="text-white/40">{stage.inProgress} 진행</span>
          <span style={{ color: stage.color }}>{stage.completed}/{stage.count}</span>
        </div>

        {/* 블록된 항목 표시 */}
        {stage.blocked > 0 && (
          <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-[#f87171] rounded text-[7px] text-white font-medium">
            {stage.blocked} 블록
          </div>
        )}
      </button>

      {/* 화살표 연결선 */}
      {!isLast && (
        <div className="flex items-center px-1">
          <div className="w-4 h-[2px] bg-gradient-to-r from-white/20 to-white/10" />
          <div className="w-0 h-0 border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent border-l-[6px] border-l-white/20" />
        </div>
      )}
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// 메인 컴포넌트
// ═══════════════════════════════════════════════════════════════════════════

const WorkflowPipeline = memo(function WorkflowPipeline({
  stages = DEFAULT_STAGES,
  onStageClick
}: WorkflowPipelineProps) {
  // 전체 통계 계산
  const stats = useMemo(() => {
    const total = stages.reduce((sum, s) => sum + s.count, 0);
    const completed = stages.reduce((sum, s) => sum + s.completed, 0);
    const blocked = stages.reduce((sum, s) => sum + s.blocked, 0);
    const bottlenecks = stages.filter(s => s.isBottleneck).length;
    
    return { total, completed, blocked, bottlenecks };
  }, [stages]);

  return (
    <div className="px-6 py-3 border-t border-white/5 bg-black/20">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-white/40">📋 업무 파이프라인</span>
          {stats.bottlenecks > 0 && (
            <span className="px-1.5 py-0.5 bg-[rgba(248,113,113,0.2)] rounded text-[8px] text-[#f87171] animate-pulse">
              ⚠️ {stats.bottlenecks} 병목
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-[9px] text-white/40">
          <span>완료 {stats.completed}/{stats.total}</span>
          {stats.blocked > 0 && (
            <span className="text-[#f87171]">블록 {stats.blocked}</span>
          )}
        </div>
      </div>

      {/* 파이프라인 */}
      <div className="flex items-stretch gap-0">
        {stages.map((stage, idx) => (
          <StageNode
            key={stage.id}
            stage={stage}
            isLast={idx === stages.length - 1}
            onClick={() => onStageClick?.(stage.id)}
          />
        ))}
      </div>

      {/* 전체 진행률 바 */}
      <div className="mt-2 h-1 bg-white/5 rounded-full overflow-hidden">
        <div 
          className="h-full rounded-full transition-all duration-500"
          style={{ 
            width: `${(stats.completed / stats.total) * 100}%`,
            background: 'linear-gradient(90deg, #4ade80, #06b6d4, #a78bfa, #f87171, #fbbf24)'
          }}
        />
      </div>
    </div>
  );
});

export default WorkflowPipeline;
