/**
 * 📊 ReportGenerator — 일일 보고서 자동 생성 UI
 */
import React, { useState, useCallback } from 'react';
import { generateDailyReport, generateDailyReportOffline, ReportResult } from '../../api/automation';

interface ReportGeneratorProps {
  onReportGenerated?: (report: ReportResult) => void;
}

export const ReportGenerator: React.FC<ReportGeneratorProps> = ({ onReportGenerated }) => {
  const [completed, setCompleted] = useState('');
  const [tomorrow, setTomorrow] = useState('');
  const [issues, setIssues] = useState('');
  const [result, setResult] = useState<ReportResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  const handleGenerate = useCallback(async () => {
    const completedList = completed
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (completedList.length === 0) {
      setError('완료한 작업을 입력해주세요');
      return;
    }

    const tomorrowList = tomorrow
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    const issuesList = issues
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    setLoading(true);
    setError(null);

    try {
      const response = await generateDailyReport(completedList, tomorrowList, issuesList);
      setResult(response.data);
      setIsOffline(false);
    } catch (err) {
      console.warn('API 실패, 오프라인 모드:', err);
      const offlineResult = generateDailyReportOffline(completedList, tomorrowList, issuesList);
      setResult(offlineResult);
      setIsOffline(true);
    } finally {
      setLoading(false);
    }
  }, [completed, tomorrow, issues]);

  const handleReset = useCallback(() => {
    setCompleted('');
    setTomorrow('');
    setIssues('');
    setResult(null);
    setError(null);
  }, []);

  const copyToClipboard = useCallback(() => {
    if (!result) return;
    navigator.clipboard.writeText(result.report_text);
    alert('보고서가 복사되었습니다');
  }, [result]);

  const sendByEmail = useCallback(() => {
    if (!result) return;
    const subject = encodeURIComponent(`일일 보고서 - ${result.date}`);
    const body = encodeURIComponent(result.report_text);
    window.open(`mailto:?subject=${subject}&body=${body}`);
  }, [result]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>📊 일일 보고서</h2>
        {isOffline && <span style={styles.offlineBadge}>오프라인</span>}
      </div>

      {!result ? (
        <div style={styles.inputSection}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>✅ 오늘 완료한 작업</label>
            <textarea
              style={styles.textarea}
              placeholder="완료한 작업 (줄바꿈으로 구분)&#10;&#10;예시:&#10;프로젝트 제안서 초안 완성 (3h)&#10;클라이언트 피드백 반영&#10;팀 미팅 참석"
              value={completed}
              onChange={(e) => setCompleted(e.target.value)}
              rows={5}
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>📅 내일 계획 (선택)</label>
            <textarea
              style={styles.textareaSmall}
              placeholder="내일 할 일..."
              value={tomorrow}
              onChange={(e) => setTomorrow(e.target.value)}
              rows={3}
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>⚠️ 이슈 (선택)</label>
            <textarea
              style={styles.textareaSmall}
              placeholder="이슈나 블로커가 있다면..."
              value={issues}
              onChange={(e) => setIssues(e.target.value)}
              rows={2}
            />
          </div>

          {error && <p style={styles.error}>{error}</p>}
          
          <button
            style={styles.primaryButton}
            onClick={handleGenerate}
            disabled={loading}
          >
            {loading ? '생성 중...' : '보고서 생성'}
          </button>
        </div>
      ) : (
        <div style={styles.resultSection}>
          <div style={styles.reportCard}>
            <div style={styles.reportHeader}>
              <span style={styles.reportDate}>{result.date}</span>
              <span style={styles.reportHours}>총 {result.total_hours}시간</span>
            </div>
            <pre style={styles.reportText}>{result.report_text}</pre>
          </div>

          <div style={styles.taskSummary}>
            {result.completed_tasks.map((task) => (
              <div key={task.id} style={styles.taskChip}>
                <span style={styles.taskCategory}>{task.category}</span>
                <span>{task.estimated_hours}h</span>
              </div>
            ))}
          </div>

          <div style={styles.actions}>
            <button style={styles.secondaryButton} onClick={handleReset}>
              다시 작성
            </button>
            <button style={styles.secondaryButton} onClick={copyToClipboard}>
              복사
            </button>
            <button style={styles.primaryButton} onClick={sendByEmail}>
              이메일 전송
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

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
    gap: '16px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
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
  textareaSmall: {
    width: '100%',
    padding: '10px',
    fontSize: '14px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    resize: 'vertical',
    fontFamily: 'inherit',
    lineHeight: 1.4,
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
    backgroundColor: '#8b5cf6',
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
  reportCard: {
    backgroundColor: '#f9fafb',
    borderRadius: '12px',
    padding: '16px',
    border: '1px solid #e5e7eb',
  },
  reportHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
    paddingBottom: '12px',
    borderBottom: '1px solid #e5e7eb',
  },
  reportDate: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1f2937',
  },
  reportHours: {
    fontSize: '14px',
    color: '#6b7280',
    backgroundColor: '#e5e7eb',
    padding: '4px 10px',
    borderRadius: '12px',
  },
  reportText: {
    margin: 0,
    fontSize: '14px',
    lineHeight: 1.6,
    whiteSpace: 'pre-wrap',
    fontFamily: 'inherit',
    color: '#374151',
  },
  taskSummary: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  taskChip: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    padding: '6px 12px',
    backgroundColor: '#f3f4f6',
    borderRadius: '16px',
    fontSize: '13px',
  },
  taskCategory: {
    color: '#8b5cf6',
    fontWeight: 500,
  },
  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  },
};

export default ReportGenerator;
