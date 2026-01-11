/**
 * AUTUS Trinity - TaskList Component
 * Right panel task list with progress tracking
 */

import React, { memo, useCallback } from 'react';
import { useTrinityStore, selectCurrentTasks, selectTaskCount } from '../../stores/trinityStore';
import { useTaskActions } from './hooks';
import { TaskListProps, Task } from './types';

// Individual task item component
const TaskItem = memo(function TaskItem({ 
  task, 
  isOpen, 
  onToggle,
  onComplete,
  onDelegate
}: { 
  task: Task; 
  isOpen: boolean; 
  onToggle: () => void;
  onComplete: (id: string) => void;
  onDelegate: (id: string) => void;
}) {
  const progressColor = task.progress !== undefined
    ? task.progress > 70 
      ? '#4ade80' 
      : task.progress > 30 
        ? '#fbbf24' 
        : '#f87171'
    : '#4ade80';

  return (
    <div
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggle();
        }
      }}
      role="button"
      tabIndex={0}
      className={`p-3 bg-white/[0.02] border rounded-[10px] mb-2 cursor-pointer transition-all ${
        isOpen
          ? 'bg-[rgba(139,92,246,0.08)] border-[rgba(139,92,246,0.3)]'
          : 'border-transparent hover:bg-white/[0.04] hover:border-[rgba(139,92,246,0.2)]'
      }`}
    >
      <div className="flex items-start gap-2.5">
        <span className="text-lg">{task.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-medium mb-1 truncate">{task.text}</div>
          <div className="flex gap-1 flex-wrap">
            <span className="text-[8px] px-1.5 py-0.5 rounded bg-[rgba(139,92,246,0.15)] text-[#a78bfa]">
              {task.type}
            </span>
            <span className="text-[8px] px-1.5 py-0.5 rounded bg-white/5 text-white/50">
              📅 {task.deadline}
            </span>
          </div>
        </div>
        <span
          className={`text-[10px] text-white/20 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        >
          ▼
        </span>
      </div>

      {/* Expanded content */}
      {isOpen && task.progress !== undefined && (
        <div className="pt-3 mt-3 border-t border-white/5">
          {/* Progress bar */}
          <div className="h-1 bg-white/10 rounded-sm mb-2 overflow-hidden">
            <div
              className="h-full rounded-sm transition-all duration-500"
              style={{ width: `${task.progress}%`, background: progressColor }}
            />
          </div>
          <div className="text-[9px] text-white/40 mb-2">진행률 {task.progress}%</div>
          
          {/* Action buttons */}
          <div className="flex gap-1.5">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onComplete(task.id);
              }}
              className="flex-1 py-1.5 border-none rounded-[5px] text-[9px] font-medium cursor-pointer bg-[rgba(74,222,128,0.2)] text-[#4ade80] hover:bg-[rgba(74,222,128,0.3)] transition-colors"
            >
              ✓ 완료
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelegate(task.id);
              }}
              className="flex-1 py-1.5 border-none rounded-[5px] text-[9px] font-medium cursor-pointer bg-[rgba(139,92,246,0.2)] text-[#a78bfa] hover:bg-[rgba(139,92,246,0.3)] transition-colors"
            >
              👤 위임
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

const TaskList = memo(function TaskList({ isMobile = false }: TaskListProps) {
  const tasks = useTrinityStore(selectCurrentTasks);
  const taskCount = useTrinityStore(selectTaskCount);
  const openTaskId = useTrinityStore(state => state.openTaskId);
  const setOpenTaskId = useTrinityStore(state => state.setOpenTaskId);
  
  const { completeTask } = useTaskActions();

  const handleToggle = useCallback((id: string) => {
    setOpenTaskId(openTaskId === id ? null : id);
  }, [openTaskId, setOpenTaskId]);

  const handleDelegate = useCallback((id: string) => {
    // In a real app, this would open a delegate modal
    console.log('Delegate task:', id);
  }, []);

  return (
    <div className={`flex flex-col ${isMobile ? 'h-[50vh]' : 'flex-1'} overflow-hidden`}>
      {/* Header */}
      <div className="flex justify-between items-center px-4 py-3.5 border-b border-white/5">
        <span className="text-[11px] font-semibold">통합 과제</span>
        <span className="text-[9px] px-2 py-0.5 bg-[rgba(139,92,246,0.15)] text-[#a78bfa] rounded-lg">
          {taskCount}
        </span>
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto px-3 py-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-white/30">
            <span className="text-2xl mb-2">📋</span>
            <span className="text-[11px]">과제가 없습니다</span>
          </div>
        ) : (
          tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              isOpen={openTaskId === task.id}
              onToggle={() => handleToggle(task.id)}
              onComplete={completeTask}
              onDelegate={handleDelegate}
            />
          ))
        )}
      </div>

      {/* Add task button */}
      <div className="p-3 border-t border-white/5">
        <button
          className="w-full py-2.5 border border-dashed border-white/10 rounded-lg text-[10px] text-white/40 hover:border-[#a78bfa]/50 hover:text-[#a78bfa] transition-colors focus:outline-none focus:ring-2 focus:ring-[#a78bfa]/50"
        >
          + 새 과제 추가
        </button>
      </div>
    </div>
  );
});

export default TaskList;
