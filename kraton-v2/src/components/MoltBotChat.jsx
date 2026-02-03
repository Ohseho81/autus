import React, { useState, useRef, useEffect } from 'react';
import { analyzePainSignal, recordVCreation, recordMistake, getEngineStats } from '../core/PainSignalEngine';

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * MoltBot 플로팅 챗봇 v2.0
 *
 * 학습형 Pain Signal Engine 적용
 * - 헌법 (K1-K5): 고정 불변
 * - 키워드/가중치: 데이터 기반 학습
 * - 임계값: 산업별 자동 조정
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// Claude 엔진 (K1-K5 평가)
const Claude = {
  evaluate: (painSignal, analysisResult) => {
    const actions = [
      { action: '📋 업무 자동 생성', k: ['K1', 'K3'] },
      { action: '⚙️ 자동화 규칙 추가', k: ['K1', 'K5'] },
      { action: '🔔 담당자 알림 발송', k: ['K2', 'K3'] },
      { action: '📊 데이터 수집 시작', k: ['K3', 'K4'] },
      { action: '🎯 정책 개선 제안', k: ['K1', 'K4', 'K5'] },
    ];

    const selected = actions[Math.floor(Math.random() * actions.length)];
    const baseV = 10000 + Math.random() * 50000;
    const scoreMultiplier = 1 + analysisResult.score;
    const v = Math.round(baseV * scoreMultiplier);

    return {
      from: 'claude',
      type: 'proposal',
      signalId: analysisResult.id,
      action: selected.action,
      text: `🤖 Claude 평가 완료\n\n${selected.action}\n\n예측 V: ₩${v.toLocaleString()}\nPain Score: ${(analysisResult.score * 100).toFixed(0)}%\nConfidence: ${(analysisResult.confidence * 100).toFixed(0)}%\n\n[${selected.k.join(' ✓][')} ✓]`,
      v,
      ks: selected.k,
    };
  },
};

export default function MoltBotChat({ onPainSignal, userId = 'user_default', industry = '교육' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { from: 'system', text: '🦎 MoltBot v2.0 (학습형)\n\n불편한 점이나 문제를 말씀해주세요.\n학습된 기준으로 Pain Signal을 분류합니다.' }
  ]);
  const [input, setInput] = useState('');
  const [stats, setStats] = useState({ total: 0, pain: 0, request: 0, noise: 0 });
  const [showStats, setShowStats] = useState(false);
  const [pendingFeedback, setPendingFeedback] = useState(null);
  const messagesEndRef = useRef(null);

  // 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMsg = { from: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);

    // 🦎 이벤트/워크플로우 명령어 감지 - Pain Engine 우회
    const eventPatterns = [
      /^이벤트[:\s]/i,
      /^상품[:\s]/i,
      /^event[:\s]/i,
      /^product[:\s]/i,
      /^워크플로우[:\s]/i,
      /^workflow[:\s]/i,
    ];

    const isEventCommand = eventPatterns.some(p => p.test(input));
    if (isEventCommand && onPainSignal) {
      console.log('🦎 Event command detected:', input);
      // 이벤트 명령은 바로 콜백으로 전달
      onPainSignal({ original: input, text: input, type: 'event' });
      setMessages(prev => [...prev, {
        from: 'moltbot',
        type: 'accepted',
        text: `🦎 이벤트 명령 감지!\n\n"${input}"\n\n→ 워크플로우 생성 중...`,
      }]);
      setInput('');
      return;
    }

    // Pain Signal Engine 분석
    const result = analyzePainSignal(input, userId, { industry });

    // 통계 업데이트
    setStats(prev => ({
      ...prev,
      total: prev.total + 1,
      [result.classification.toLowerCase()]: prev[result.classification.toLowerCase()] + 1,
    }));

    setTimeout(() => {
      // MoltBot 응답
      const moltResponse = createMoltResponse(result, input);
      setMessages(prev => [...prev, moltResponse]);

      // Pain이면 Claude로 전달
      if (result.classification === 'PAIN') {
        setTimeout(() => {
          const claudeResponse = Claude.evaluate(input, result);
          setMessages(prev => [...prev, claudeResponse]);
          setPendingFeedback({ signalId: result.id, v: claudeResponse.v });

          // 콜백
          if (onPainSignal) {
            onPainSignal({
              original: input,
              analysis: result,
              proposal: claudeResponse,
            });
          }
        }, 1500);
      } else if (result.classification === 'REQUEST') {
        setTimeout(() => {
          setMessages(prev => [...prev, {
            from: 'claude',
            type: 'request',
            text: `📝 요청 접수됨\n\n관리자 경로로 전달됩니다.\nPain Score: ${(result.score * 100).toFixed(0)}%\n\n[K2 적용] 신호로 처리`,
          }]);
        }, 1000);
      }
    }, 500);

    setInput('');
  };

  // V 창출 피드백
  const handleVCreated = () => {
    if (pendingFeedback) {
      recordVCreation(pendingFeedback.signalId, pendingFeedback.v);
      setMessages(prev => [...prev, {
        from: 'system',
        type: 'feedback',
        text: `✅ V 창출 확인!\n학습 데이터에 반영되었습니다.\n(키워드 가중치 ↑)`,
      }]);
      setPendingFeedback(null);
    }
  };

  // 잘못된 판단 피드백
  const handleMistake = (type) => {
    if (pendingFeedback) {
      recordMistake(pendingFeedback.signalId, type);
      setMessages(prev => [...prev, {
        from: 'system',
        type: 'feedback',
        text: type === 'false_positive'
          ? `⚠️ 잘못된 Pain 판정 기록\n임계값이 조정됩니다.\n(가중치 ↓)`
          : `⚠️ 놓친 Pain 기록\n임계값이 조정됩니다.\n(임계값 ↓)`,
      }]);
      setPendingFeedback(null);
    }
  };

  const discardRate = stats.total > 0
    ? ((stats.noise) / stats.total * 100).toFixed(0)
    : 0;

  const engineStats = getEngineStats();

  return (
    <>
      {/* 플로팅 버튼 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 60,
          height: 60,
          borderRadius: '50%',
          background: isOpen ? '#EF4444' : 'linear-gradient(135deg, #F59E0B, #F97316)',
          border: 'none',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 28,
          transition: 'all 0.3s',
          zIndex: 1000,
        }}
      >
        {isOpen ? '✕' : '🦎'}
      </button>

      {/* 챗 윈도우 */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          bottom: 100,
          right: 24,
          width: 380,
          height: 560,
          background: '#0A0A0F',
          borderRadius: 16,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          zIndex: 999,
          border: '1px solid #2E2E3E',
        }}>
          {/* 헤더 */}
          <div style={{
            padding: '12px 16px',
            background: 'linear-gradient(135deg, #F59E0B20, #F9731620)',
            borderBottom: '1px solid #2E2E3E',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 24 }}>🦎</span>
                <div>
                  <div style={{ fontWeight: 700, color: '#F8FAFC', fontSize: 14 }}>MoltBot v2.0</div>
                  <div style={{ fontSize: 10, color: '#94A3B8' }}>학습형 Pain Signal Engine</div>
                </div>
              </div>
              <button
                onClick={() => setShowStats(!showStats)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 8,
                  background: showStats ? '#3B82F6' : '#1A1A2E',
                  color: showStats ? 'white' : '#94A3B8',
                  border: 'none',
                  fontSize: 10,
                  cursor: 'pointer',
                }}
              >
                📊 Stats
              </button>
            </div>

            {/* 학습 상태 바 */}
            <div style={{
              display: 'flex', gap: 8, marginTop: 8,
              fontSize: 10, color: '#94A3B8',
            }}>
              <span style={{ color: '#EF4444' }}>Pain {stats.pain}</span>
              <span style={{ color: '#F59E0B' }}>Request {stats.request}</span>
              <span style={{ color: '#6B7280' }}>Noise {stats.noise}</span>
              <span style={{ marginLeft: 'auto', color: '#10B981' }}>{discardRate}% 필터링</span>
            </div>
          </div>

          {/* 학습 통계 패널 */}
          {showStats && (
            <div style={{
              padding: 12,
              background: '#0D0D12',
              borderBottom: '1px solid #2E2E3E',
              fontSize: 10,
            }}>
              <div style={{ color: '#94A3B8', marginBottom: 8 }}>📈 학습 현황</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div style={{ padding: 8, background: '#1A1A2E', borderRadius: 6 }}>
                  <div style={{ color: '#6B7280' }}>현재 임계값</div>
                  <div style={{ color: '#F8FAFC', fontWeight: 600 }}>
                    Pain: {(engineStats.thresholds.PAIN * 100).toFixed(0)}%
                  </div>
                  <div style={{ color: '#F8FAFC', fontWeight: 600 }}>
                    Request: {(engineStats.thresholds.REQUEST * 100).toFixed(0)}%
                  </div>
                </div>
                <div style={{ padding: 8, background: '#1A1A2E', borderRadius: 6 }}>
                  <div style={{ color: '#6B7280' }}>검증된 Pain</div>
                  <div style={{ color: '#10B981', fontWeight: 600, fontSize: 16 }}>
                    {engineStats.validatedPains}
                  </div>
                </div>
              </div>
              {engineStats.topKeywords.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ color: '#6B7280', marginBottom: 4 }}>Top Keywords</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {engineStats.topKeywords.slice(0, 5).map((kw, i) => (
                      <span key={i} style={{
                        padding: '2px 6px', borderRadius: 4,
                        background: '#3B82F620', color: '#93C5FD',
                        fontSize: 9,
                      }}>
                        {kw.keyword} ({kw.weight})
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 메시지 영역 */}
          <div style={{
            flex: 1,
            padding: 12,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}>
            {messages.map((msg, i) => (
              <MessageBubble key={i} message={msg} />
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* 피드백 버튼 */}
          {pendingFeedback && (
            <div style={{
              padding: '8px 12px',
              background: '#1A1A2E',
              borderTop: '1px solid #2E2E3E',
              display: 'flex',
              gap: 8,
              justifyContent: 'center',
            }}>
              <button
                onClick={handleVCreated}
                style={{
                  padding: '6px 12px', borderRadius: 6,
                  background: '#10B98120', border: '1px solid #10B981',
                  color: '#10B981', fontSize: 10, cursor: 'pointer',
                }}
              >
                ✅ V 창출됨
              </button>
              <button
                onClick={() => handleMistake('false_positive')}
                style={{
                  padding: '6px 12px', borderRadius: 6,
                  background: '#EF444420', border: '1px solid #EF4444',
                  color: '#EF4444', fontSize: 10, cursor: 'pointer',
                }}
              >
                ❌ 잘못된 판단
              </button>
            </div>
          )}

          {/* 입력 영역 */}
          <div style={{
            padding: 12,
            borderTop: '1px solid #2E2E3E',
            background: '#0D0D12',
          }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder="불편한 점을 말씀해주세요..."
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  background: '#1A1A2E',
                  border: '1px solid #2E2E3E',
                  borderRadius: 24,
                  color: '#F8FAFC',
                  fontSize: 13,
                  outline: 'none',
                }}
              />
              <button
                onClick={handleSend}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: '#F97316',
                  border: 'none',
                  color: 'white',
                  fontSize: 18,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ↑
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// MoltBot 응답 생성
function createMoltResponse(result, original) {
  const truncated = original.length > 40 ? original.slice(0, 40) + '...' : original;

  if (result.classification === 'PAIN') {
    return {
      from: 'moltbot',
      type: 'accepted',
      text: `🦎 Pain Signal 감지!\n\n"${truncated}"\n\nScore: ${(result.score * 100).toFixed(0)}% (임계값: ${(result.confidence * 100).toFixed(0)}%)\n키워드: ${result.keywordsFound.map(k => k.keyword).join(', ') || 'N/A'}\n\n→ Claude에게 전달합니다...`,
    };
  } else if (result.classification === 'REQUEST') {
    return {
      from: 'moltbot',
      type: 'request',
      text: `🦎 요청으로 분류됨\n\n"${truncated}"\n\nScore: ${(result.score * 100).toFixed(0)}%\n\n→ 관리자 경로로 전달`,
    };
  } else {
    return {
      from: 'moltbot',
      type: 'filtered',
      text: `🦎 노이즈로 분류됨\n\nScore: ${(result.score * 100).toFixed(0)}%\n\n더 구체적인 문제가 있나요?\n(Pain 키워드: 안됨, 불편, 오류, 실패 등)`,
    };
  }
}

function MessageBubble({ message }) {
  const styles = {
    user: {
      alignSelf: 'flex-end',
      background: '#3B82F6',
      color: 'white',
      borderRadius: '16px 16px 4px 16px',
    },
    system: {
      alignSelf: 'center',
      background: message.type === 'feedback' ? '#10B98110' : '#1A1A2E',
      color: message.type === 'feedback' ? '#10B981' : '#94A3B8',
      borderRadius: 12,
      textAlign: 'center',
      fontSize: 11,
      border: message.type === 'feedback' ? '1px solid #10B98130' : 'none',
    },
    moltbot: {
      alignSelf: 'flex-start',
      background: message.type === 'accepted' ? '#F59E0B20' : message.type === 'request' ? '#8B5CF620' : '#1A1A2E',
      color: message.type === 'accepted' ? '#F59E0B' : message.type === 'request' ? '#A78BFA' : '#94A3B8',
      borderRadius: '16px 16px 16px 4px',
      border: message.type === 'accepted' ? '1px solid #F59E0B40' : message.type === 'request' ? '1px solid #8B5CF640' : '1px solid #2E2E3E',
    },
    claude: {
      alignSelf: 'flex-start',
      background: message.type === 'request' ? '#8B5CF620' : '#3B82F620',
      color: message.type === 'request' ? '#A78BFA' : '#93C5FD',
      borderRadius: '16px 16px 16px 4px',
      border: message.type === 'request' ? '1px solid #8B5CF640' : '1px solid #3B82F640',
    },
  };

  return (
    <div style={{
      maxWidth: '85%',
      padding: '10px 14px',
      fontSize: 12,
      lineHeight: 1.5,
      whiteSpace: 'pre-wrap',
      ...styles[message.from],
    }}>
      {message.text}
    </div>
  );
}
