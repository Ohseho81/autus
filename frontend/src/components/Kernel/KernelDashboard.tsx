import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface KernelTask {
  id: string;
  name: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  progress?: number;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

interface KernelMetrics {
  tasksProcessed: number;
  avgProcessingTime: number;
  successRate: number;
  queueLength: number;
  uptime: number;
}

interface KernelDashboardProps {
  tasks: KernelTask[];
  metrics: KernelMetrics;
  onRetryTask?: (taskId: string) => void;
  onCancelTask?: (taskId: string) => void;
}

const statusConfig = {
  queued: { icon: '⏳', color: 'text-gray-400', bg: 'bg-gray-500/10' },
  running: { icon: '⚙️', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  completed: { icon: '✅', color: 'text-green-400', bg: 'bg-green-500/10' },
  failed: { icon: '❌', color: 'text-red-400', bg: 'bg-red-500/10' },
};

/**
 * 커널 대시보드 컴포넌트
 * 백그라운드 작업 및 시스템 커널 상태 모니터링
 */
export const KernelDashboard: React.FC<KernelDashboardProps> = ({
  tasks,
  metrics,
  onRetryTask,
  onCancelTask,
}) => {
  const [filter, setFilter] = useState<string>('all');

  const filteredTasks = tasks.filter((t) => filter === 'all' || t.status === filter);

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${days}일 ${hours}시간 ${mins}분`;
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  return (
    <div className="bg-gray-900/50 rounded-xl border border-gray-700/50 overflow-hidden">
      {/* 헤더 */}
      <div className="p-4 border-b border-gray-700/50">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-white flex items-center gap-2">
            🔧 커널 대시보드
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs text-green-400">Active</span>
            </span>
          </h3>
          <span className="text-xs text-gray-500">
            Uptime: {formatUptime(metrics.uptime)}
          </span>
        </div>
      </div>

      {/* 메트릭스 */}
      <div className="grid grid-cols-4 gap-2 p-4 border-b border-gray-700/50">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-400">
            {metrics.tasksProcessed.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500">처리됨</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-yellow-400">
            {metrics.queueLength}
          </div>
          <div className="text-xs text-gray-500">대기중</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-400">
            {metrics.successRate.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500">성공률</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-400">
            {formatDuration(metrics.avgProcessingTime)}
          </div>
          <div className="text-xs text-gray-500">평균 처리</div>
        </div>
      </div>

      {/* 필터 */}
      <div className="flex gap-2 p-3 border-b border-gray-700/50 overflow-x-auto">
        {['all', 'running', 'queued', 'completed', 'failed'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-3 py-1 rounded-full text-xs whitespace-nowrap transition-colors ${
              filter === status
                ? 'bg-blue-500 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {status === 'all' ? '전체' : status.charAt(0).toUpperCase() + status.slice(1)}
            {status !== 'all' && (
              <span className="ml-1">
                ({tasks.filter((t) => t.status === status).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 작업 리스트 */}
      <div className="max-h-[300px] overflow-y-auto">
        {filteredTasks.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <div className="text-3xl mb-2">📭</div>
            작업이 없습니다
          </div>
        ) : (
          filteredTasks.map((task) => {
            const config = statusConfig[task.status];
            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`p-3 border-b border-gray-800/50 ${config.bg}`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{config.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className={`font-medium truncate ${config.color}`}>
                      {task.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      ID: {task.id}
                      {task.startedAt && (
                        <span className="ml-2">
                          시작: {task.startedAt.toLocaleTimeString('ko-KR')}
                        </span>
                      )}
                    </div>
                    {task.error && (
                      <div className="text-xs text-red-400 mt-1">{task.error}</div>
                    )}
                  </div>

                  {/* 진행률 또는 액션 */}
                  {task.status === 'running' && task.progress !== undefined && (
                    <div className="w-16">
                      <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${task.progress}%` }}
                          className="h-full bg-blue-500 rounded-full"
                        />
                      </div>
                      <div className="text-xs text-center text-gray-500 mt-1">
                        {task.progress}%
                      </div>
                    </div>
                  )}

                  {task.status === 'failed' && onRetryTask && (
                    <button
                      onClick={() => onRetryTask(task.id)}
                      className="px-2 py-1 bg-orange-500/20 text-orange-400 rounded text-xs hover:bg-orange-500/30"
                    >
                      재시도
                    </button>
                  )}

                  {(task.status === 'queued' || task.status === 'running') && onCancelTask && (
                    <button
                      onClick={() => onCancelTask(task.id)}
                      className="px-2 py-1 bg-gray-700 text-gray-400 rounded text-xs hover:bg-gray-600"
                    >
                      취소
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default KernelDashboard;
