/**
 * 📝 MeetingExtractor — 회의록 핵심 결정 추출 UI
 */
import React, { useState, useCallback } from 'react';
import { extractMeetingDecisions, extractMeetingDecisionsOffline, Decision, MeetingResult } from '../../api/automation';

interface MeetingExtractorProps {
  onDecisionsExtracted?: (decisions: Decision[]) => void;
}

export const MeetingExtractor: React.FC<MeetingExtractorProps> = ({ onDecisionsExtracted }) => {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<MeetingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  const handleExtract = useCallback(async () => {
    if (input.trim().length < 10) {
      setError('회의 내용을 더 입력해주세요');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await extractMeetingDecisions(input);
      setResult(response.data);
      setIsOffline(false);
    } catch (err) {
      console.warn('API 실패, 오프라인 모드:', err);
      const offlineResult = extractMeetingDecisionsOffline(input);
      setResult(offlineResult);
      setIsOffline(true);
    } finally {
      setLoading(false);
    }
  }, [input]);

  const handleAddToTasks = useCallback(() => {
    if (result && onDecisionsExtracted) {
      onDecisionsExtracted(result.decisions);
    }
  }, [result, onDecisionsExtracted]);

  const handleReset = useCallback(() => {
    setInput('');
    setResult(null);
    setError(null);
  }, []);

  const copyToClipboard = useCallback(() => {
    if (!result) return;
    
    const text = result.decisions
      .map((d, i) => {
        let line = `${i + 1}. ${d.content}`;
        if (d.assignee) line += ` (담당: ${d.assignee})`;
        if (d.deadline_text) line += ` [${d.deadline_text}]`;
        return line;
      })
      .join('\n');
    
    navigator.clipboard.writeText(text);
    alert('복사되었습니다');
  }, [result]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>📝 회의록 결정 추출</h2>
        {isOffline && <span style={styles.offlineBadge}>오프라인</span>}
      </div>

      {!result ? (
        <div style={styles.inputSection}>
          <textarea
            style={styles.textarea}
            placeholder="회의 내용을 붙여넣기 하세요...&#10;&#10;예시:&#10;오늘 팀 회의에서 Q1 프로젝트 일정을 논의했습니다.&#10;김대리가 디자인 시안을 다음 주 수요일까지 완료하기로 했고,&#10;박팀장님이 클라이언트 미팅을 금요일로 확정했습니다."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={10}
          />
          {error && <p style={styles.error}>{error}</p>}
          <button
            style={styles.primaryButton}
            onClick={handleExtract}
            disabled={loading}
          >
            {loading ? '분석 중...' : '결정 추출'}
          </button>
        </div>
      ) : (
        <div style={styles.resultSection}>
          <div style={styles.summaryBanner}>
            📋 핵심 결정 {result.decision_count}건 추출됨
          </div>

          <ul style={styles.decisionList}>
            {result.decisions.map((decision, idx) => (
              <li key={decision.id} style={styles.decisionItem}>
                <div style={styles.decisionHeader}>
                  <span style={styles.decisionIndex}>{idx + 1}</span>
                  <span style={styles.decisionContent}>{decision.content}</span>
                </div>
                <div style={styles.decisionMeta}>
                  {decision.assignee && (
                    <span style={styles.metaTag}>
                      👤 {decision.assignee}
                    </span>
                  )}
                  {decision.deadline && (
                    <span style={styles.metaTag}>
                      📅 {decision.deadline} ({decision.deadline_text})
                    </span>
                  )}
                  <span style={styles.confidence}>
                    {Math.round(decision.confidence * 100)}%
                  </span>
                </div>
              </li>
            ))}
          </ul>

          <div style={styles.actions}>
            <button style={styles.secondaryButton} onClick={handleReset}>
              다시 입력
            </button>
            <button style={styles.secondaryButton} onClick={copyToClipboard}>
              복사
            </button>
            <button style={styles.primaryButton} onClick={handleAddToTasks}>
              할 일에 추가
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
    backgroundColor: '#3b82f6',
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
  summaryBanner: {
    padding: '12px',
    backgroundColor: '#eff6ff',
    color: '#1e40af',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: 500,
  },
  decisionList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  decisionItem: {
    padding: '12px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    borderLeft: '4px solid #3b82f6',
  },
  decisionHeader: {
    display: 'flex',
    gap: '12px',
    marginBottom: '8px',
  },
  decisionIndex: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#3b82f6',
    minWidth: '20px',
  },
  decisionContent: {
    flex: 1,
    fontSize: '15px',
    lineHeight: 1.4,
  },
  decisionMeta: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  metaTag: {
    fontSize: '13px',
    color: '#6b7280',
    backgroundColor: '#fff',
    padding: '4px 8px',
    borderRadius: '4px',
  },
  confidence: {
    fontSize: '12px',
    color: '#9ca3af',
    marginLeft: 'auto',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  },
};

export default MeetingExtractor;
