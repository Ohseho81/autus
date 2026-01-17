/**
 * 📋 TaskPrioritizer — 할 일 우선순위 자동 정렬 UI
 */
import React, { useState, useCallback } from 'react';
import { prioritizeTasks, prioritizeTasksOffline, Task, PrioritizeResult } from '../../api/automation';

// 쿼드런트 스타일
const QUADRANT_STYLES: Record<string, { emoji: string; color: string; bg: string; label: string }> = {
  Q1: { emoji: '🔴', color: '#ef4444', bg: 'rgba(239,68,68,0.1)', label: '즉시' },
  Q2: { emoji: '🟢', color: '#10b981', bg: 'rgba(16,185,129,0.1)', label: '계획' },
  Q3: { emoji: '🟡', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', label: '위임' },
  Q4: { emoji: '⚪', color: '#6b7280', bg: 'rgba(107,114,128,0.1)', label: '제거' },
};

interface TaskPrioritizerProps {
  onTasksAccepted?: (tasks: Task[]) => void;
}

export const TaskPrioritizer: React.FC<TaskPrioritizerProps> = ({ onTasksAccepted }) => {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<PrioritizeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  const handlePrioritize = useCallback(async () => {
    const tasks = input
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (tasks.length === 0) {
      setError('할 일을 입력해주세요');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 온라인 API 시도
      const response = await prioritizeTasks(tasks);
      setResult(response.data);
      setIsOffline(false);
    } catch (err) {
      // 오프라인 폴백
      console.warn('API 실패, 오프라인 모드 사용:', err);
      const offlineResult = prioritizeTasksOffline(tasks);
      setResult(offlineResult);
      setIsOffline(true);
    } finally {
      setLoading(false);
    }
  }, [input]);

  const handleAccept = useCallback(() => {
    if (result && onTasksAccepted) {
      onTasksAccepted(result.prioritized);
    }
  }, [result, onTasksAccepted]);

  const handleReset = useCallback(() => {
    setInput('');
    setResult(null);
    setError(null);
  }, []);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>📋 할 일 우선순위</h2>
        {isOffline && <span style={styles.offlineBadge}>오프라인</span>}
      </div>

      {!result ? (
        // 입력 화면
        <div style={styles.inputSection}>
          <textarea
            style={styles.textarea}
            placeholder="할 일을 입력하세요 (줄바꿈으로 구분)&#10;&#10;예시:&#10;프로젝트 제안서 작성 (오늘 마감)&#10;팀 미팅 준비&#10;이메일 답장 - 긴급"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={8}
          />
          {error && <p style={styles.error}>{error}</p>}
          <button
            style={styles.primaryButton}
            onClick={handlePrioritize}
            disabled={loading}
          >
            {loading ? '분석 중...' : '정렬하기'}
          </button>
        </div>
      ) : (
        // 결과 화면
        <div style={styles.resultSection}>
          <div style={styles.summary}>
            <span>총 {result.summary.total_tasks}개</span>
            <span style={{ color: QUADRANT_STYLES.Q1.color }}>
              🔴 {result.summary.quadrant_distribution.Q1 || 0}
            </span>
            <span style={{ color: QUADRANT_STYLES.Q2.color }}>
              🟢 {result.summary.quadrant_distribution.Q2 || 0}
            </span>
            <span style={{ color: QUADRANT_STYLES.Q3.color }}>
              🟡 {result.summary.quadrant_distribution.Q3 || 0}
            </span>
            <span style={{ color: QUADRANT_STYLES.Q4.color }}>
              ⚪ {result.summary.quadrant_distribution.Q4 || 0}
            </span>
          </div>

          <ul style={styles.taskList}>
            {result.prioritized.map((task, idx) => {
              const style = QUADRANT_STYLES[task.quadrant];
              return (
                <li
                  key={task.id}
                  style={{
                    ...styles.taskItem,
                    backgroundColor: style.bg,
                    borderLeft: `4px solid ${style.color}`
                  }}
                >
                  <span style={styles.taskIndex}>{idx + 1}</span>
                  <span style={styles.taskEmoji}>{style.emoji}</span>
                  <span style={styles.taskContent}>{task.content}</span>
                  <span style={{ ...styles.taskQuadrant, color: style.color }}>
                    [{task.quadrant}]
                  </span>
                </li>
              );
            })}
          </ul>

          <div style={styles.actions}>
            <button style={styles.secondaryButton} onClick={handleReset}>
              다시 입력
            </button>
            <button style={styles.primaryButton} onClick={handleAccept}>
              Accept
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// 스타일
const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '16px',
    maxWidth: '600px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
  },
  title: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 600,
  },
  offlineBadge: {
    fontSize: '12px',
    padding: '4px 8px',
    backgroundColor: '#fef3c7',
    color: '#92400e',
    borderRadius: '12px',
  },
  inputSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  textarea: {
    width: '100%',
    padding: '12px',
    fontSize: '15px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    resize: 'vertical',
    fontFamily: 'inherit',
    lineHeight: 1.5,
  },
  error: {
    color: '#ef4444',
    fontSize: '14px',
    margin: 0,
  },
  primaryButton: {
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: 600,
    color: '#fff',
    backgroundColor: '#10b981',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  secondaryButton: {
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: 600,
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  resultSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  summary: {
    display: 'flex',
    gap: '16px',
    fontSize: '14px',
    color: '#6b7280',
  },
  taskList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  taskItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    borderRadius: '8px',
  },
  taskIndex: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#9ca3af',
    minWidth: '20px',
  },
  taskEmoji: {
    fontSize: '16px',
  },
  taskContent: {
    flex: 1,
    fontSize: '15px',
  },
  taskQuadrant: {
    fontSize: '12px',
    fontWeight: 500,
  },
  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  },
};

export default TaskPrioritizer;
