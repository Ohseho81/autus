/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 학습 루프 데모 컴포넌트
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { useState, useCallback, useMemo } from 'react';
import {
  LearningLoop72,
  SAMPLE_ACADEMY_STATES,
  State72,
  LearningStep,
  NODE_NAMES,
} from '../engine';

// ═══════════════════════════════════════════════════════════════════════════════
// 컴포넌트
// ═══════════════════════════════════════════════════════════════════════════════

export default function LearningLoopDemo() {
  const [loop] = useState(() => new LearningLoop72());
  const [history, setHistory] = useState<LearningStep[]>([]);
  const [isTraining, setIsTraining] = useState(false);
  const [epochs, setEpochs] = useState(5);
  const [learningRate, setLearningRate] = useState(0.1);
  const [selectedStep, setSelectedStep] = useState<LearningStep | null>(null);
  
  // 학습 실행
  const runTraining = useCallback(async () => {
    setIsTraining(true);
    
    try {
      loop.reset();
      loop.setConfig({ learningRate });
      
      const result = loop.epochLearn(SAMPLE_ACADEMY_STATES, epochs);
      setHistory(loop.getHistory());
      
      console.log('🎯 Training Complete:', result);
    } finally {
      setIsTraining(false);
    }
  }, [loop, epochs, learningRate]);
  
  // 진행 분석
  const progress = useMemo(() => {
    if (history.length === 0) return null;
    
    const mseTrend = history.map(h => h.mse);
    const firstMse = mseTrend[0] || 0;
    const lastMse = mseTrend[mseTrend.length - 1] || 0;
    const improvement = firstMse > 0 ? ((firstMse - lastMse) / firstMse * 100) : 0;
    
    const topAdjusted = new Map<string, number>();
    for (const step of history) {
      for (const adj of step.adjustments) {
        const key = `${adj.from}→${adj.to}`;
        topAdjusted.set(key, (topAdjusted.get(key) || 0) + Math.abs(adj.delta));
      }
    }
    
    const sortedLinks = Array.from(topAdjusted.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    
    return {
      totalSteps: history.length,
      firstMse,
      lastMse,
      improvement,
      topLinks: sortedLinks,
    };
  }, [history]);
  
  // 평가
  const evaluation = useMemo(() => {
    if (history.length === 0) return null;
    return loop.evaluate(SAMPLE_ACADEMY_STATES);
  }, [loop, history.length]);
  
  return (
    <div style={{
      padding: 20,
      backgroundColor: '#0a0a0a',
      color: '#fff',
      minHeight: '100%',
      height: '100%',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      boxSizing: 'border-box',
    }}>
      <h1 style={{ marginBottom: 20 }}>
        🔄 AUTUS 72×72 학습 루프
      </h1>
      
      {/* 컨트롤 */}
      <div style={{
        display: 'flex',
        gap: 20,
        marginBottom: 20,
        padding: 15,
        backgroundColor: '#1a1a1a',
        borderRadius: 8,
      }}>
        <div>
          <label style={{ marginRight: 8 }}>Epochs:</label>
          <input
            type="number"
            value={epochs}
            onChange={(e) => setEpochs(Number(e.target.value))}
            min={1}
            max={100}
            style={{
              width: 60,
              padding: 5,
              backgroundColor: '#333',
              color: '#fff',
              border: '1px solid #444',
              borderRadius: 4,
            }}
          />
        </div>
        
        <div>
          <label style={{ marginRight: 8 }}>Learning Rate:</label>
          <input
            type="number"
            value={learningRate}
            onChange={(e) => setLearningRate(Number(e.target.value))}
            min={0.01}
            max={0.5}
            step={0.01}
            style={{
              width: 70,
              padding: 5,
              backgroundColor: '#333',
              color: '#fff',
              border: '1px solid #444',
              borderRadius: 4,
            }}
          />
        </div>
        
        <button
          onClick={runTraining}
          disabled={isTraining}
          style={{
            padding: '8px 20px',
            backgroundColor: isTraining ? '#333' : '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            cursor: isTraining ? 'not-allowed' : 'pointer',
            fontWeight: 600,
          }}
        >
          {isTraining ? '학습 중...' : '🚀 학습 시작'}
        </button>
        
        <div style={{ color: '#888', fontSize: 14, alignSelf: 'center' }}>
          📊 샘플 데이터: 학원 12개월 ({SAMPLE_ACADEMY_STATES.length}개 스냅샷)
        </div>
      </div>
      
      {/* 결과 */}
      {progress && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 15,
          marginBottom: 20,
        }}>
          <MetricCard
            label="총 학습 스텝"
            value={progress.totalSteps}
            unit="steps"
          />
          <MetricCard
            label="초기 MSE"
            value={progress.firstMse.toFixed(6)}
            color="#ef4444"
          />
          <MetricCard
            label="최종 MSE"
            value={progress.lastMse.toFixed(6)}
            color="#22c55e"
          />
          <MetricCard
            label="개선율"
            value={progress.improvement.toFixed(1)}
            unit="%"
            color="#3b82f6"
          />
        </div>
      )}
      
      {/* 평가 결과 */}
      {evaluation && (
        <div style={{
          padding: 15,
          backgroundColor: '#1a1a1a',
          borderRadius: 8,
          marginBottom: 20,
        }}>
          <h3 style={{ marginBottom: 10 }}>📈 모델 평가</h3>
          <div style={{ display: 'flex', gap: 30 }}>
            <div>
              <span style={{ color: '#888' }}>MSE: </span>
              <span style={{ color: '#22c55e' }}>{evaluation.mse.toFixed(8)}</span>
            </div>
            <div>
              <span style={{ color: '#888' }}>MAE: </span>
              <span style={{ color: '#3b82f6' }}>{evaluation.mae.toFixed(8)}</span>
            </div>
            <div>
              <span style={{ color: '#888' }}>R²: </span>
              <span style={{ color: '#f59e0b' }}>{(evaluation.r2 * 100).toFixed(2)}%</span>
            </div>
          </div>
        </div>
      )}
      
      {/* 가장 많이 조정된 연결 */}
      {progress && progress.topLinks.length > 0 && (
        <div style={{
          padding: 15,
          backgroundColor: '#1a1a1a',
          borderRadius: 8,
          marginBottom: 20,
        }}>
          <h3 style={{ marginBottom: 10 }}>🔗 가장 많이 조정된 인과 연결</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {progress.topLinks.map(([link, delta], i) => {
              const [from, to] = link.split('→');
              return (
                <div key={link} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ color: '#888', width: 20 }}>{i + 1}.</span>
                  <span style={{ color: '#f59e0b', width: 40 }}>{from}</span>
                  <span style={{ color: '#666' }}>→</span>
                  <span style={{ color: '#22c55e', width: 40 }}>{to}</span>
                  <span style={{ color: '#888', fontSize: 12 }}>
                    ({NODE_NAMES[from]} → {NODE_NAMES[to]})
                  </span>
                  <div style={{
                    flex: 1,
                    height: 6,
                    backgroundColor: '#333',
                    borderRadius: 3,
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.min(100, delta * 1000)}%`,
                      backgroundColor: '#3b82f6',
                    }} />
                  </div>
                  <span style={{ color: '#3b82f6', width: 60, textAlign: 'right' }}>
                    Δ{delta.toFixed(4)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* 학습 히스토리 */}
      {history.length > 0 && (
        <div style={{
          padding: 15,
          backgroundColor: '#1a1a1a',
          borderRadius: 8,
        }}>
          <h3 style={{ marginBottom: 10 }}>📜 학습 히스토리</h3>
          
          {/* MSE 추세 그래프 */}
          <div style={{
            height: 100,
            display: 'flex',
            alignItems: 'flex-end',
            gap: 2,
            marginBottom: 15,
            padding: 10,
            backgroundColor: '#0a0a0a',
            borderRadius: 6,
          }}>
            {history.map((step, i) => {
              const maxMse = Math.max(...history.map(h => h.mse));
              const height = maxMse > 0 ? (step.mse / maxMse * 80) : 0;
              
              return (
                <div
                  key={step.step}
                  style={{
                    flex: 1,
                    height: Math.max(2, height),
                    backgroundColor: selectedStep?.step === step.step ? '#f59e0b' : '#3b82f6',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onClick={() => setSelectedStep(step)}
                  title={`Step ${step.step}: MSE ${step.mse.toFixed(6)}`}
                />
              );
            })}
          </div>
          
          {/* 선택된 스텝 상세 */}
          {selectedStep && (
            <div style={{
              padding: 10,
              backgroundColor: '#0a0a0a',
              borderRadius: 6,
            }}>
              <h4 style={{ marginBottom: 10 }}>
                Step {selectedStep.step} 상세
              </h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div>
                  <div style={{ color: '#888', marginBottom: 5 }}>MSE: {selectedStep.mse.toFixed(8)}</div>
                  <div style={{ color: '#888', marginBottom: 5 }}>MAE: {selectedStep.mae.toFixed(8)}</div>
                  <div style={{ color: '#888' }}>조정 수: {selectedStep.adjustments.length}</div>
                </div>
                
                <div>
                  <div style={{ color: '#888', marginBottom: 5 }}>주요 조정:</div>
                  {selectedStep.adjustments.slice(0, 3).map((adj, i) => (
                    <div key={i} style={{ fontSize: 12, color: '#666' }}>
                      {adj.from}→{adj.to}: {adj.oldCoef.toFixed(3)} → {adj.newCoef.toFixed(3)}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* 사용법 안내 */}
      {history.length === 0 && (
        <div style={{
          padding: 30,
          backgroundColor: '#1a1a1a',
          borderRadius: 8,
          textAlign: 'center',
          color: '#888',
        }}>
          <h3 style={{ marginBottom: 15 }}>🎓 학습 루프 사용법</h3>
          <ol style={{ textAlign: 'left', maxWidth: 500, margin: '0 auto' }}>
            <li style={{ marginBottom: 10 }}>
              <strong>Epochs</strong>: 전체 데이터를 몇 번 반복 학습할지
            </li>
            <li style={{ marginBottom: 10 }}>
              <strong>Learning Rate</strong>: 각 스텝에서 계수 조정 폭 (높을수록 빠르게 변화)
            </li>
            <li style={{ marginBottom: 10 }}>
              <strong>학습 시작</strong> 버튼 클릭
            </li>
            <li>
              MSE가 감소하면 모델이 개선되고 있는 것
            </li>
          </ol>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 헬퍼 컴포넌트
// ═══════════════════════════════════════════════════════════════════════════════

function MetricCard({
  label,
  value,
  unit,
  color = '#fff',
}: {
  label: string;
  value: string | number;
  unit?: string;
  color?: string;
}) {
  return (
    <div style={{
      padding: 15,
      backgroundColor: '#1a1a1a',
      borderRadius: 8,
      textAlign: 'center',
    }}>
      <div style={{ color: '#888', fontSize: 12, marginBottom: 5 }}>{label}</div>
      <div style={{ color, fontSize: 24, fontWeight: 700 }}>
        {value}
        {unit && <span style={{ fontSize: 14, fontWeight: 400, marginLeft: 4 }}>{unit}</span>}
      </div>
    </div>
  );
}
