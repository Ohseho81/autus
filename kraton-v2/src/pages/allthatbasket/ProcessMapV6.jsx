import React, { useState } from 'react';

/**
 * ProcessMapV6 - 강력한 올댓바스켓 진화 맵
 *
 * 핵심: "도구는 버려진다. 비가역 노드를 함께 투입한 자는 버릴 수 없다."
 *
 * Lv.1: 도구 (내부/통제 관리) - 대체 가능
 * Lv.2: 인프라 (학부모 접점 확장) - 대체 어려움
 * Lv.3: 파트너 (비가역 노드 공동 투입) - 대체 불가
 */

const EVOLUTION_LEVELS = {
  lv1: {
    id: 'lv1',
    level: 1,
    name: '도구',
    nameEn: 'Tool',
    description: '내부관리 + 통제관리',
    autusRole: '대체 가능한 소프트웨어',
    ownerRisk: '100%',
    autusRisk: '0%',
    lockIn: '낮음',
    color: '#6b7280',
    features: [
      '일정 관리',
      '출결 체크',
      '수강료 관리',
      '코치 스케줄',
    ],
    autusNodes: [],
    ownerNodes: ['자본', '법적책임', '기회비용', '시간'],
  },
  lv2: {
    id: 'lv2',
    level: 2,
    name: '인프라',
    nameEn: 'Infrastructure',
    description: '학부모 접점까지 확장',
    autusRole: '필수 인프라',
    ownerRisk: '70%',
    autusRisk: '30%',
    lockIn: '중간',
    color: '#3b82f6',
    features: [
      'Lv.1 전체 +',
      '학부모 앱/알림',
      '자동 리포트',
      '결제 시스템',
      '피드백 수집',
    ],
    autusNodes: ['시간 (자동화)', '데이터'],
    ownerNodes: ['자본', '법적책임', '기회비용'],
  },
  lv3: {
    id: 'lv3',
    level: 3,
    name: '파트너',
    nameEn: 'Partner',
    description: '비가역 노드 공동 투입',
    autusRole: '대체 불가능한 파트너',
    ownerRisk: '40%',
    autusRisk: '60%',
    lockIn: '매우 높음',
    color: '#22c55e',
    features: [
      'Lv.2 전체 +',
      '올댓바스켓 인증 브랜드',
      '24/7 AI 운영',
      '책임 분담 계약',
      '공동 마케팅',
      '수익 공유',
    ],
    autusNodes: ['시간 (24/7)', '신용/브랜드', '법적책임 일부', '마케팅 비용'],
    ownerNodes: ['실행력', '현장 책임'],
  },
};

const NODE_COLORS = {
  '자본': '#ef4444',
  '법적책임': '#f59e0b',
  '기회비용': '#8b5cf6',
  '시간': '#3b82f6',
  '시간 (자동화)': '#3b82f6',
  '시간 (24/7)': '#3b82f6',
  '데이터': '#06b6d4',
  '신용/브랜드': '#22c55e',
  '법적책임 일부': '#f59e0b',
  '마케팅 비용': '#ec4899',
  '실행력': '#10b981',
  '현장 책임': '#f59e0b',
};

const ProcessMapV6 = () => {
  const [selectedLevel, setSelectedLevel] = useState('lv3');
  const [showComparison, setShowComparison] = useState(true);

  const currentLevel = EVOLUTION_LEVELS[selectedLevel];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      color: '#f8fafc',
      padding: '24px',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => window.location.hash = '#processv5'}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              color: '#94a3b8',
              padding: '8px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            ← 고객맵
          </button>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>
            🚀 강력한 올댓바스켓 진화 맵
          </h1>
        </div>
        <button
          onClick={() => setShowComparison(!showComparison)}
          style={{
            background: showComparison ? '#3b82f6' : 'rgba(255,255,255,0.1)',
            border: 'none',
            color: '#fff',
            padding: '8px 16px',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          {showComparison ? '비교 모드 ON' : '비교 모드 OFF'}
        </button>
      </div>

      {/* Core Message */}
      <div style={{
        background: 'rgba(239, 68, 68, 0.1)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        borderRadius: '12px',
        padding: '16px 24px',
        marginBottom: '32px',
        textAlign: 'center',
      }}>
        <p style={{ margin: 0, fontSize: '18px', color: '#fca5a5' }}>
          💀 "도구는 버려진다. <strong style={{ color: '#ef4444' }}>비가역 노드를 함께 투입한 자</strong>는 버릴 수 없다."
        </p>
      </div>

      {/* Level Selector */}
      <div style={{
        display: 'flex',
        gap: '16px',
        marginBottom: '32px',
        justifyContent: 'center',
      }}>
        {Object.values(EVOLUTION_LEVELS).map((level) => (
          <button
            key={level.id}
            onClick={() => setSelectedLevel(level.id)}
            style={{
              background: selectedLevel === level.id
                ? level.color
                : 'rgba(255,255,255,0.05)',
              border: `2px solid ${level.color}`,
              color: selectedLevel === level.id ? '#fff' : level.color,
              padding: '16px 32px',
              borderRadius: '12px',
              cursor: 'pointer',
              transition: 'all 0.3s',
              minWidth: '160px',
            }}
          >
            <div style={{ fontSize: '14px', opacity: 0.8 }}>Level {level.level}</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{level.name}</div>
            <div style={{ fontSize: '12px', opacity: 0.7 }}>{level.nameEn}</div>
          </button>
        ))}
      </div>

      {/* Evolution Arrow */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '32px',
        fontSize: '14px',
        color: '#64748b',
      }}>
        <span style={{ color: EVOLUTION_LEVELS.lv1.color }}>도구</span>
        <span>→</span>
        <span style={{ color: EVOLUTION_LEVELS.lv2.color }}>인프라</span>
        <span>→</span>
        <span style={{ color: EVOLUTION_LEVELS.lv3.color }}>파트너</span>
        <span style={{ marginLeft: '16px', color: '#22c55e' }}>= Lock-in ↑</span>
      </div>

      {/* Main Content */}
      {showComparison ? (
        // Comparison View
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '24px',
          marginBottom: '32px',
        }}>
          {Object.values(EVOLUTION_LEVELS).map((level) => (
            <div
              key={level.id}
              style={{
                background: selectedLevel === level.id
                  ? `rgba(${level.color === '#6b7280' ? '107,114,128' : level.color === '#3b82f6' ? '59,130,246' : '34,197,94'}, 0.2)`
                  : 'rgba(255,255,255,0.02)',
                border: `2px solid ${selectedLevel === level.id ? level.color : 'rgba(255,255,255,0.1)'}`,
                borderRadius: '16px',
                padding: '24px',
                transition: 'all 0.3s',
              }}
            >
              {/* Level Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '16px',
              }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: level.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  fontWeight: 'bold',
                }}>
                  {level.level}
                </div>
                <div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{level.name}</div>
                  <div style={{ fontSize: '12px', color: '#94a3b8' }}>{level.description}</div>
                </div>
              </div>

              {/* AUTUS Role */}
              <div style={{
                background: 'rgba(0,0,0,0.3)',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '16px',
              }}>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>AUTUS 위치</div>
                <div style={{ fontSize: '16px', fontWeight: '600', color: level.color }}>{level.autusRole}</div>
              </div>

              {/* Risk Distribution */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>리스크 분배</div>
                <div style={{ display: 'flex', height: '24px', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{
                    width: level.ownerRisk,
                    background: '#ef4444',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: 'bold',
                  }}>
                    원장 {level.ownerRisk}
                  </div>
                  <div style={{
                    width: level.autusRisk,
                    background: '#22c55e',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: 'bold',
                  }}>
                    {level.autusRisk !== '0%' && `AUTUS ${level.autusRisk}`}
                  </div>
                </div>
              </div>

              {/* Lock-in Level */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
                padding: '8px 12px',
                background: 'rgba(0,0,0,0.2)',
                borderRadius: '8px',
              }}>
                <span style={{ fontSize: '12px', color: '#94a3b8' }}>Lock-in</span>
                <span style={{
                  fontSize: '14px',
                  fontWeight: 'bold',
                  color: level.lockIn === '매우 높음' ? '#22c55e' : level.lockIn === '중간' ? '#f59e0b' : '#94a3b8'
                }}>
                  {level.lockIn}
                </span>
              </div>

              {/* Features */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>기능</div>
                <div style={{ fontSize: '13px', lineHeight: '1.6' }}>
                  {level.features.map((feature, idx) => (
                    <div key={idx} style={{
                      color: feature.includes('+') ? '#64748b' : '#e2e8f0',
                      fontStyle: feature.includes('+') ? 'italic' : 'normal',
                    }}>
                      {feature.includes('+') ? feature : `• ${feature}`}
                    </div>
                  ))}
                </div>
              </div>

              {/* Node Investment */}
              <div>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>비가역 노드 투입</div>

                {/* Owner Nodes */}
                <div style={{ marginBottom: '8px' }}>
                  <div style={{ fontSize: '11px', color: '#ef4444', marginBottom: '4px' }}>원장 →</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {level.ownerNodes.map((node, idx) => (
                      <span key={idx} style={{
                        background: NODE_COLORS[node] || '#6b7280',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                      }}>
                        {node}
                      </span>
                    ))}
                  </div>
                </div>

                {/* AUTUS Nodes */}
                <div>
                  <div style={{ fontSize: '11px', color: '#22c55e', marginBottom: '4px' }}>AUTUS →</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {level.autusNodes.length > 0 ? (
                      level.autusNodes.map((node, idx) => (
                        <span key={idx} style={{
                          background: NODE_COLORS[node] || '#6b7280',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                        }}>
                          {node}
                        </span>
                      ))
                    ) : (
                      <span style={{ color: '#64748b', fontSize: '11px' }}>없음 (도구일 뿐)</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Single Level Detail View
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: `2px solid ${currentLevel.color}`,
          borderRadius: '16px',
          padding: '32px',
          marginBottom: '32px',
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '32px',
          }}>
            {/* Left: Level Info */}
            <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                marginBottom: '24px',
              }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: currentLevel.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '28px',
                  fontWeight: 'bold',
                }}>
                  {currentLevel.level}
                </div>
                <div>
                  <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{currentLevel.name}</div>
                  <div style={{ fontSize: '16px', color: '#94a3b8' }}>{currentLevel.description}</div>
                </div>
              </div>

              <div style={{ fontSize: '18px', marginBottom: '24px' }}>
                AUTUS = <strong style={{ color: currentLevel.color }}>{currentLevel.autusRole}</strong>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '8px' }}>제공 기능</div>
                {currentLevel.features.map((feature, idx) => (
                  <div key={idx} style={{
                    padding: '8px 0',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    color: feature.includes('+') ? '#64748b' : '#e2e8f0',
                  }}>
                    {feature}
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Node Investment Diagram */}
            <div>
              <svg viewBox="0 0 400 300" style={{ width: '100%', height: 'auto' }}>
                {/* Background */}
                <rect x="0" y="0" width="400" height="300" fill="transparent" />

                {/* Center System */}
                <rect x="150" y="120" width="100" height="60" rx="8" fill={currentLevel.color} fillOpacity="0.3" stroke={currentLevel.color} strokeWidth="2" />
                <text x="200" y="145" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="bold">올댓바스켓</text>
                <text x="200" y="165" textAnchor="middle" fill="#94a3b8" fontSize="10">Lv.{currentLevel.level}</text>

                {/* Owner (Top) */}
                <circle cx="200" cy="40" r="30" fill="#ef4444" fillOpacity="0.3" stroke="#ef4444" strokeWidth="2" />
                <text x="200" y="44" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="bold">원장</text>

                {/* Arrow from Owner to System */}
                <path d="M200 70 L200 115" stroke="#ef4444" strokeWidth="2" fill="none" markerEnd="url(#arrowRed)" />
                <defs>
                  <marker id="arrowRed" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                    <path d="M0,0 L0,6 L9,3 z" fill="#ef4444" />
                  </marker>
                  <marker id="arrowGreen" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                    <path d="M0,0 L0,6 L9,3 z" fill="#22c55e" />
                  </marker>
                </defs>

                {/* Owner Nodes */}
                {currentLevel.ownerNodes.map((node, idx) => {
                  const startX = 100 + (idx * 50);
                  return (
                    <g key={idx}>
                      <rect x={startX - 20} y="75" width="40" height="18" rx="4" fill={NODE_COLORS[node] || '#6b7280'} />
                      <text x={startX} y="87" textAnchor="middle" fill="#fff" fontSize="8">{node.substring(0, 4)}</text>
                    </g>
                  );
                })}

                {/* AUTUS (Bottom) */}
                <circle cx="200" cy="260" r="30" fill="#22c55e" fillOpacity="0.3" stroke="#22c55e" strokeWidth="2" />
                <text x="200" y="264" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="bold">AUTUS</text>

                {/* Arrow from AUTUS to System */}
                {currentLevel.autusNodes.length > 0 && (
                  <path d="M200 230 L200 185" stroke="#22c55e" strokeWidth="2" fill="none" markerEnd="url(#arrowGreen)" />
                )}

                {/* AUTUS Nodes */}
                {currentLevel.autusNodes.map((node, idx) => {
                  const startX = 120 + (idx * 45);
                  return (
                    <g key={idx}>
                      <rect x={startX - 18} y="205" width="36" height="18" rx="4" fill={NODE_COLORS[node] || '#6b7280'} />
                      <text x={startX} y="217" textAnchor="middle" fill="#fff" fontSize="7">{node.substring(0, 5)}</text>
                    </g>
                  );
                })}

                {/* No AUTUS contribution indicator for Lv1 */}
                {currentLevel.autusNodes.length === 0 && (
                  <text x="200" y="215" textAnchor="middle" fill="#64748b" fontSize="10">투입 없음</text>
                )}
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* Bottom: Strategic Insight */}
      <div style={{
        background: 'rgba(34, 197, 94, 0.1)',
        border: '1px solid rgba(34, 197, 94, 0.3)',
        borderRadius: '12px',
        padding: '24px',
      }}>
        <h3 style={{ margin: '0 0 16px 0', color: '#22c55e' }}>🎯 Lv.3 달성 전략</h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px',
        }}>
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '8px' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>⏰</div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>시간 대신 투입</div>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>AI 24시간 운영으로 원장 시간 회수</div>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '8px' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>⭐</div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>신용 대신 투입</div>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>"올댓바스켓 인증" 브랜드 파워</div>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '8px' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>⚖️</div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>책임 일부 이전</div>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>데이터/시스템 사고 시 AUTUS 책임</div>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '8px' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>💰</div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>수익 공유</div>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>성과 연동 → 운명 공동체</div>
          </div>
        </div>

        <div style={{
          marginTop: '24px',
          padding: '16px',
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '8px',
          textAlign: 'center',
        }}>
          <p style={{ margin: 0, fontSize: '16px' }}>
            <strong style={{ color: '#22c55e' }}>결론:</strong> 원장이 AUTUS 없이는{' '}
            <strong style={{ color: '#ef4444' }}>되돌릴 수 없는 상태</strong>가 되어야 진정한 파트너
          </p>
        </div>
      </div>

      {/* Navigation */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '16px',
        marginTop: '32px',
      }}>
        <button
          onClick={() => window.location.hash = '#process'}
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            color: '#94a3b8',
            padding: '12px 24px',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          역할 맵 (V2)
        </button>
        <button
          onClick={() => window.location.hash = '#processv4'}
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            color: '#94a3b8',
            padding: '12px 24px',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          포스 맵 (V4)
        </button>
        <button
          onClick={() => window.location.hash = '#processv5'}
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.2)',
            color: '#94a3b8',
            padding: '12px 24px',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          고객 맵 (V5)
        </button>
      </div>
    </div>
  );
};

export default ProcessMapV6;
