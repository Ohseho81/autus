import React, { useState, useCallback } from 'react';

/**
 * ProcessMapV4 - AUTUS Force-Based Process Map
 *
 * 핵심 철학:
 * - AUTUS는 '사람'을 상대하지 않는다
 * - AUTUS는 '결과에 영향을 주는 힘(Force)'을 상대한다
 * - 모든 Force는 시스템을 흔들고, 신뢰 가능한 Force는 없다
 * - AUTUS는 설득하지 않고, 대응하지 않고, 구조로 흡수한다
 */

// ============================================
// 🔴 5대 FORCE 정의 (11개를 5개로 압축)
// ============================================
const FORCES = {
  PRODUCTION: {
    id: 'production',
    name: 'PRODUCTION',
    nameKo: '생산 압력',
    icon: '⚙️',
    color: '#ef4444',
    bgColor: '#dc2626',
    description: '실제로 일을 발생시키는 힘',
    includes: ['원장', '관리자', '강사/코치', '기술/AI', '운영 스태프'],
    characteristics: ['피로 누적', '즉흥 판단', '편의 추구', '예외 생성'],
    autusView: '신뢰 ❌ → 통제 대상',
    responseSpeed: '⚡ 실시간',
    responseSpeedValue: 'realtime',
    requiredNodes: ['Eligibility', 'Approval', 'Kill', 'Input Control'],
  },
  ENTROPY: {
    id: 'entropy',
    name: 'ENTROPY',
    nameKo: '엔트로피',
    icon: '🌀',
    color: '#8b5cf6',
    bgColor: '#7c3aed',
    description: '시간이 지나며 자연스럽게 생기는 혼란',
    includes: ['예외 누적', '임시 조치', '"원래 이랬어"', '규칙 해이'],
    characteristics: ['눈치 못 챔', '서서히 진행', '어느 순간 폭발'],
    autusView: '즉각 대응 ❌ → 주기적 제거',
    responseSpeed: '📅 주기적',
    responseSpeedValue: 'periodic',
    requiredNodes: ['Kill', 'Shadow', 'Process Template'],
  },
  MARKET: {
    id: 'market',
    name: 'MARKET',
    nameKo: '시장 압력',
    icon: '📊',
    color: '#f59e0b',
    bgColor: '#d97706',
    description: '외부 비교와 평가가 만드는 자극',
    includes: ['학부모/고객', '경쟁자', '평판/리뷰', 'SNS 여론'],
    characteristics: ['감정 기반', '비교 심리', '과잉 대응 유발'],
    autusView: '실시간 대응 🚫 절대 금지',
    responseSpeed: '🚫 금지',
    responseSpeedValue: 'forbidden',
    requiredNodes: ['Friction Delta', 'Long-term Check', 'Kill'],
  },
  INSTITUTION: {
    id: 'institution',
    name: 'INSTITUTION',
    nameKo: '제도 압력',
    icon: '⚖️',
    color: '#06b6d4',
    bgColor: '#0891b2',
    description: '위반 시 즉시 치명타가 되는 강제력',
    includes: ['법규', '세무', '행정기관', '계약/소송'],
    characteristics: ['감정 없음', '예외 없음', '소급 가능'],
    autusView: '자동화 ❌ → 항상 사람 승인',
    responseSpeed: '🔒 사람승인',
    responseSpeedValue: 'human',
    requiredNodes: ['Approval Gate', 'Fact Ledger', 'Input Control'],
  },
  TIME: {
    id: 'time',
    name: 'TIME',
    nameKo: '시간 압력',
    icon: '⏱️',
    color: '#22c55e',
    bgColor: '#16a34a',
    description: '급함/지연/환경이 만드는 왜곡',
    includes: ['마감', '환경 변화', '데이터/KPI', '시즌성'],
    characteristics: ['나쁜 결정 정당화', '"지금만 예외"', '부분 최적화'],
    autusView: '급할수록 지연 → TTL 강제',
    responseSpeed: '⏸️ 지연',
    responseSpeedValue: 'delayed',
    requiredNodes: ['TTL', 'Decision Cost', 'Long-term Check'],
  },
};

// ============================================
// 🎯 모션 타입 (Force 반응 속도 기반)
// ============================================
const MOTION_TYPES = {
  realtime: { id: 'realtime', name: '실시간', icon: '⚡', color: '#22c55e' },
  periodic: { id: 'periodic', name: '주기적', icon: '📅', color: '#8b5cf6' },
  forbidden: { id: 'forbidden', name: '금지', icon: '🚫', color: '#ef4444' },
  human: { id: 'human', name: '사람승인', icon: '✋', color: '#f59e0b' },
  delayed: { id: 'delayed', name: '지연', icon: '⏸️', color: '#06b6d4' },
};

// ============================================
// 📍 Force 위치 (펜타곤 배치)
// ============================================
const FORCE_POSITIONS = {
  production: { x: 300, y: 80 },   // 상단 중앙
  entropy: { x: 520, y: 180 },     // 우측 상단
  market: { x: 450, y: 350 },      // 우측 하단
  institution: { x: 150, y: 350 }, // 좌측 하단
  time: { x: 80, y: 180 },         // 좌측 상단
};

// ============================================
// 🔗 Force 간 상호작용 (모션)
// ============================================
const FORCE_INTERACTIONS = [
  {
    id: 'prod-to-market',
    from: 'production',
    to: 'market',
    value: '결과물 전달',
    essence: '가치',
    risk: '품질 저하 → 평판 하락',
    responseType: 'realtime',
  },
  {
    id: 'market-to-prod',
    from: 'market',
    to: 'production',
    value: '요구/불만',
    essence: '압력',
    risk: '과잉 대응 → 예외 남발',
    responseType: 'forbidden',
  },
  {
    id: 'prod-to-entropy',
    from: 'production',
    to: 'entropy',
    value: '예외 누적',
    essence: '혼란',
    risk: '시스템 오염',
    responseType: 'periodic',
  },
  {
    id: 'time-to-prod',
    from: 'time',
    to: 'production',
    value: '마감 압박',
    essence: '급함',
    risk: '"지금만 예외" 남발',
    responseType: 'delayed',
  },
  {
    id: 'inst-to-prod',
    from: 'institution',
    to: 'production',
    value: '규정 준수',
    essence: '제약',
    risk: '위반 시 치명타',
    responseType: 'human',
  },
  {
    id: 'entropy-to-inst',
    from: 'entropy',
    to: 'institution',
    value: '증빙 누락',
    essence: '위험',
    risk: '감사 시 폭발',
    responseType: 'periodic',
  },
  {
    id: 'market-to-time',
    from: 'market',
    to: 'time',
    value: '경쟁 자극',
    essence: '조급함',
    risk: '성급한 대응',
    responseType: 'forbidden',
  },
];

// ============================================
// 📐 곡선 경로 계산
// ============================================
const calculateCurvePath = (fromId, toId) => {
  const from = FORCE_POSITIONS[fromId];
  const to = FORCE_POSITIONS[toId];

  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;

  // 중심을 향해 곡선
  const centerX = 300;
  const centerY = 220;

  const controlX = midX + (centerX - midX) * 0.3;
  const controlY = midY + (centerY - midY) * 0.3;

  return {
    path: `M ${from.x} ${from.y} Q ${controlX} ${controlY} ${to.x} ${to.y}`,
    labelPos: { x: controlX, y: controlY },
  };
};

// ============================================
// 🎨 메인 컴포넌트
// ============================================
const ProcessMapV4 = () => {
  const [selectedForce, setSelectedForce] = useState(null);
  const [selectedInteraction, setSelectedInteraction] = useState(null);
  const [viewMode, setViewMode] = useState('overview'); // overview, detail
  const [hoveredInteraction, setHoveredInteraction] = useState(null);

  const handleForceClick = useCallback((force) => {
    setSelectedForce(force);
    setSelectedInteraction(null);
    setViewMode('detail');
  }, []);

  const handleInteractionClick = useCallback((interaction) => {
    setSelectedInteraction(interaction);
  }, []);

  const handleBack = useCallback(() => {
    if (selectedInteraction) {
      setSelectedInteraction(null);
    } else if (viewMode === 'detail') {
      setViewMode('overview');
      setSelectedForce(null);
    } else {
      window.location.hash = '';
    }
  }, [selectedInteraction, viewMode]);

  // Force 노드 렌더링
  const renderForceNode = (forceKey) => {
    const force = FORCES[forceKey.toUpperCase()];
    const pos = FORCE_POSITIONS[forceKey.toLowerCase()];
    if (!force || !pos) return null;
    const motionType = MOTION_TYPES[force.responseSpeedValue];

    return (
      <g
        key={force.id}
        style={{ cursor: 'pointer' }}
        onClick={() => handleForceClick(force)}
      >
        {/* 외곽 글로우 */}
        <circle
          cx={pos.x}
          cy={pos.y}
          r={58}
          fill="none"
          stroke={force.color}
          strokeWidth={2}
          opacity={0.3}
        />

        {/* 메인 원 */}
        <circle
          cx={pos.x}
          cy={pos.y}
          r={50}
          fill={force.bgColor}
          stroke={force.color}
          strokeWidth={3}
          style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.4))' }}
        />

        {/* 아이콘 */}
        <text x={pos.x} y={pos.y - 5} textAnchor="middle" fontSize={24}>
          {force.icon}
        </text>

        {/* 이름 */}
        <text
          x={pos.x}
          y={pos.y + 20}
          textAnchor="middle"
          fill="white"
          fontSize={11}
          fontWeight="bold"
        >
          {force.name}
        </text>

        {/* 반응 속도 뱃지 */}
        <g transform={`translate(${pos.x + 35}, ${pos.y - 35})`}>
          <circle r={14} fill="#1e293b" stroke={motionType.color} strokeWidth={2} />
          <text textAnchor="middle" y={5} fontSize={12}>
            {motionType.icon}
          </text>
        </g>

        {/* 설명 */}
        <text
          x={pos.x}
          y={pos.y + 75}
          textAnchor="middle"
          fill="#9ca3af"
          fontSize={10}
        >
          {force.nameKo}
        </text>
      </g>
    );
  };

  // 상호작용 화살표 렌더링
  const renderInteraction = (interaction) => {
    const { path, labelPos } = calculateCurvePath(interaction.from, interaction.to);
    const motionType = MOTION_TYPES[interaction.responseType];
    const isHovered = hoveredInteraction === interaction.id;
    const isForbidden = interaction.responseType === 'forbidden';

    return (
      <g
        key={interaction.id}
        style={{ cursor: 'pointer' }}
        onClick={() => handleInteractionClick(interaction)}
        onMouseEnter={() => setHoveredInteraction(interaction.id)}
        onMouseLeave={() => setHoveredInteraction(null)}
      >
        {/* 경로 */}
        <path
          d={path}
          fill="none"
          stroke={isHovered ? motionType.color : '#4b5563'}
          strokeWidth={isHovered ? 3 : 2}
          strokeDasharray={isForbidden ? '8,4' : 'none'}
          markerEnd="url(#arrowhead)"
          opacity={isForbidden ? 0.6 : 1}
        />

        {/* 애니메이션 점 */}
        {!isForbidden && (
          <circle r={4} fill={motionType.color}>
            <animateMotion dur="3s" repeatCount="indefinite" path={path} />
          </circle>
        )}

        {/* 금지 표시 */}
        {isForbidden && (
          <text
            x={labelPos.x}
            y={labelPos.y - 15}
            textAnchor="middle"
            fill="#ef4444"
            fontSize={16}
          >
            🚫
          </text>
        )}

        {/* 라벨 */}
        <rect
          x={labelPos.x - 40}
          y={labelPos.y - 10}
          width={80}
          height={24}
          rx={4}
          fill={isHovered ? '#1f2937' : '#111827'}
          stroke={isHovered ? motionType.color : '#374151'}
          opacity={0.9}
        />
        <text
          x={labelPos.x}
          y={labelPos.y + 5}
          textAnchor="middle"
          fill="white"
          fontSize={9}
        >
          {interaction.value}
        </text>
      </g>
    );
  };

  // 상세 뷰
  const renderDetailView = () => {
    if (!selectedForce) return null;

    const relatedInteractions = FORCE_INTERACTIONS.filter(
      i => i.from === selectedForce.id || i.to === selectedForce.id
    );
    const inbound = relatedInteractions.filter(i => i.to === selectedForce.id);
    const outbound = relatedInteractions.filter(i => i.from === selectedForce.id);

    return (
      <div style={{ padding: '20px' }}>
        {/* 헤더 카드 */}
        <div style={{
          padding: '24px',
          background: `linear-gradient(135deg, ${selectedForce.bgColor}44, transparent)`,
          borderRadius: '16px',
          border: `2px solid ${selectedForce.bgColor}`,
          marginBottom: '24px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              backgroundColor: selectedForce.bgColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '40px',
            }}>
              {selectedForce.icon}
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '28px', color: 'white' }}>
                {selectedForce.name}
              </h2>
              <p style={{ margin: '4px 0', color: '#9ca3af' }}>
                {selectedForce.nameKo} - {selectedForce.description}
              </p>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                backgroundColor: MOTION_TYPES[selectedForce.responseSpeedValue].color + '33',
                borderRadius: '12px',
                marginTop: '8px',
              }}>
                <span>{MOTION_TYPES[selectedForce.responseSpeedValue].icon}</span>
                <span style={{ color: MOTION_TYPES[selectedForce.responseSpeedValue].color, fontSize: '12px', fontWeight: 'bold' }}>
                  {selectedForce.responseSpeed}
                </span>
              </div>
            </div>
          </div>

          {/* 포함 요소 */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ color: '#6b7280', fontSize: '11px', marginBottom: '8px' }}>포함 요소</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {selectedForce.includes.map((item, idx) => (
                <span key={idx} style={{
                  padding: '4px 12px',
                  backgroundColor: '#374151',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: '#d1d5db',
                }}>
                  {item}
                </span>
              ))}
            </div>
          </div>

          {/* 특성 */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ color: '#6b7280', fontSize: '11px', marginBottom: '8px' }}>특성</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {selectedForce.characteristics.map((char, idx) => (
                <span key={idx} style={{
                  padding: '4px 12px',
                  backgroundColor: selectedForce.color + '22',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: selectedForce.color,
                }}>
                  {char}
                </span>
              ))}
            </div>
          </div>

          {/* AUTUS 관점 */}
          <div style={{
            padding: '12px 16px',
            backgroundColor: '#111827',
            borderRadius: '8px',
            border: '1px solid #374151',
          }}>
            <div style={{ color: '#6b7280', fontSize: '10px', marginBottom: '4px' }}>AUTUS 관점</div>
            <div style={{ color: 'white', fontWeight: 'bold' }}>{selectedForce.autusView}</div>
          </div>
        </div>

        {/* 필수 노드 */}
        <div style={{
          padding: '16px',
          backgroundColor: '#1e293b',
          borderRadius: '12px',
          marginBottom: '24px',
        }}>
          <div style={{ color: '#9ca3af', fontSize: '12px', marginBottom: '12px' }}>🔧 필수 노드</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {selectedForce.requiredNodes.map((node, idx) => (
              <div key={idx} style={{
                padding: '8px 16px',
                backgroundColor: selectedForce.bgColor,
                borderRadius: '8px',
                color: 'white',
                fontSize: '12px',
                fontWeight: 'bold',
              }}>
                {node}
              </div>
            ))}
          </div>
        </div>

        {/* 들어오는 압력 */}
        {inbound.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ color: '#22c55e', fontSize: '14px', marginBottom: '12px' }}>
              📥 받는 압력 ({inbound.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {inbound.map(interaction => {
                const fromForce = FORCES[interaction.from.toUpperCase()];
                const motionType = MOTION_TYPES[interaction.responseType];
                return (
                  <div
                    key={interaction.id}
                    onClick={() => handleInteractionClick(interaction)}
                    style={{
                      padding: '12px 16px',
                      backgroundColor: '#1f2937',
                      borderRadius: '12px',
                      border: '1px solid #374151',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '16px' }}>{fromForce?.icon}</span>
                        <span style={{ color: '#9ca3af', fontSize: '12px' }}>{fromForce?.name}</span>
                        <span style={{ color: '#6b7280' }}>→</span>
                        <span style={{ color: 'white', fontWeight: 'bold' }}>{interaction.value}</span>
                      </div>
                      <div style={{
                        padding: '2px 8px',
                        backgroundColor: motionType.color + '22',
                        borderRadius: '6px',
                        fontSize: '11px',
                        color: motionType.color,
                      }}>
                        {motionType.icon} {motionType.name}
                      </div>
                    </div>
                    <div style={{ fontSize: '11px', color: '#ef4444', marginTop: '4px' }}>
                      ⚠️ {interaction.risk}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 나가는 압력 */}
        {outbound.length > 0 && (
          <div>
            <h3 style={{ color: '#f59e0b', fontSize: '14px', marginBottom: '12px' }}>
              📤 주는 압력 ({outbound.length})
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {outbound.map(interaction => {
                const toForce = FORCES[interaction.to.toUpperCase()];
                const motionType = MOTION_TYPES[interaction.responseType];
                return (
                  <div
                    key={interaction.id}
                    onClick={() => handleInteractionClick(interaction)}
                    style={{
                      padding: '12px 16px',
                      backgroundColor: '#1f2937',
                      borderRadius: '12px',
                      border: '1px solid #374151',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: 'white', fontWeight: 'bold' }}>{interaction.value}</span>
                        <span style={{ color: '#6b7280' }}>→</span>
                        <span style={{ fontSize: '16px' }}>{toForce?.icon}</span>
                        <span style={{ color: '#9ca3af', fontSize: '12px' }}>{toForce?.name}</span>
                      </div>
                      <div style={{
                        padding: '2px 8px',
                        backgroundColor: motionType.color + '22',
                        borderRadius: '6px',
                        fontSize: '11px',
                        color: motionType.color,
                      }}>
                        {motionType.icon} {motionType.name}
                      </div>
                    </div>
                    <div style={{ fontSize: '11px', color: '#ef4444', marginTop: '4px' }}>
                      ⚠️ {interaction.risk}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  // 상호작용 상세 모달
  const renderInteractionModal = () => {
    if (!selectedInteraction) return null;

    const fromForce = FORCES[selectedInteraction.from.toUpperCase()];
    const toForce = FORCES[selectedInteraction.to.toUpperCase()];
    const motionType = MOTION_TYPES[selectedInteraction.responseType];
    const isForbidden = selectedInteraction.responseType === 'forbidden';

    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
        }}
        onClick={() => setSelectedInteraction(null)}
      >
        <div
          style={{
            backgroundColor: '#1f2937',
            borderRadius: '20px',
            padding: '24px',
            maxWidth: '420px',
            width: '90%',
            border: `2px solid ${isForbidden ? '#ef4444' : motionType.color}`,
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* 헤더 */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
          }}>
            <h3 style={{ margin: 0, color: 'white', fontSize: '18px' }}>
              {selectedInteraction.value}
            </h3>
            <span style={{
              padding: '4px 12px',
              backgroundColor: motionType.color + '33',
              borderRadius: '8px',
              color: motionType.color,
              fontSize: '12px',
              fontWeight: 'bold',
            }}>
              {motionType.icon} {motionType.name}
            </span>
          </div>

          {/* 플로우 시각화 */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px',
            backgroundColor: '#111827',
            borderRadius: '12px',
            marginBottom: '16px',
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                backgroundColor: fromForce?.bgColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '28px',
                margin: '0 auto 8px',
              }}>
                {fromForce?.icon}
              </div>
              <div style={{ color: 'white', fontSize: '11px', fontWeight: 'bold' }}>{fromForce?.name}</div>
            </div>

            <div style={{ flex: 1, textAlign: 'center', padding: '0 16px' }}>
              {isForbidden ? (
                <div style={{ color: '#ef4444', fontSize: '24px' }}>🚫</div>
              ) : (
                <div style={{ color: motionType.color, fontSize: '20px' }}>→→→</div>
              )}
              <div style={{ color: '#6b7280', fontSize: '10px', marginTop: '4px' }}>
                {selectedInteraction.essence}
              </div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                backgroundColor: toForce?.bgColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '28px',
                margin: '0 auto 8px',
              }}>
                {toForce?.icon}
              </div>
              <div style={{ color: 'white', fontSize: '11px', fontWeight: 'bold' }}>{toForce?.name}</div>
            </div>
          </div>

          {/* 리스크 경고 */}
          <div style={{
            padding: '12px 16px',
            backgroundColor: '#7f1d1d33',
            borderRadius: '8px',
            border: '1px solid #ef4444',
            marginBottom: '16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span>⚠️</span>
              <span style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '12px' }}>리스크</span>
            </div>
            <div style={{ color: '#fca5a5', fontSize: '13px' }}>
              {selectedInteraction.risk}
            </div>
          </div>

          {/* AUTUS 대응 */}
          <div style={{
            padding: '12px 16px',
            backgroundColor: motionType.color + '22',
            borderRadius: '8px',
            border: `1px solid ${motionType.color}44`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '16px' }}>{motionType.icon}</span>
              <span style={{ color: motionType.color, fontWeight: 'bold', fontSize: '12px' }}>
                AUTUS 대응: {motionType.name}
              </span>
            </div>
            <div style={{ color: '#d1d5db', fontSize: '12px' }}>
              {isForbidden ? (
                '이 압력에는 절대 실시간 대응하지 않습니다. Δ가 3회 연속 같은 방향일 때만 검토합니다.'
              ) : selectedInteraction.responseType === 'human' ? (
                '자동화 금지. 항상 사람의 승인을 거쳐야 합니다.'
              ) : selectedInteraction.responseType === 'delayed' ? (
                'TTL 24시간 강제 대기 후 재검토합니다.'
              ) : selectedInteraction.responseType === 'periodic' ? (
                '주기적(월 1회) Kill 프로세스에서만 처리합니다.'
              ) : (
                '실시간 모니터링 및 대응이 가능합니다.'
              )}
            </div>
          </div>

          {/* 닫기 */}
          <button
            onClick={() => setSelectedInteraction(null)}
            style={{
              width: '100%',
              marginTop: '16px',
              padding: '12px',
              backgroundColor: '#374151',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            닫기
          </button>
        </div>
      </div>
    );
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: 'white' }}>
      {/* 헤더 */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid #1e293b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={handleBack}
            style={{
              padding: '8px 12px',
              backgroundColor: '#1e293b',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            ← {viewMode === 'detail' ? '전체 보기' : '대시보드'}
          </button>
          <h1 style={{ margin: 0, fontSize: '18px' }}>
            ⚡ {viewMode === 'detail' && selectedForce ? `${selectedForce.name} Force` : 'AUTUS Force Map'}
          </h1>
        </div>

        {/* 범례 */}
        <div style={{ display: 'flex', gap: '12px' }}>
          {Object.values(MOTION_TYPES).map(type => (
            <div key={type.id} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '12px' }}>{type.icon}</span>
              <span style={{ fontSize: '10px', color: type.color }}>{type.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 철학 배너 */}
      <div style={{
        padding: '10px 20px',
        backgroundColor: '#1e293b',
        fontSize: '12px',
        color: '#9ca3af',
        textAlign: 'center',
        borderBottom: '1px solid #374151',
      }}>
        <span style={{ color: '#ef4444' }}>AUTUS는 사람을 상대하지 않는다</span>
        {' → '}
        <span style={{ color: '#22c55e' }}>결과에 영향을 주는 힘(Force)을 상대한다</span>
        {' → '}
        <span style={{ color: '#f59e0b' }}>설득 ❌ 대응 ❌ 구조로 흡수 ⭕</span>
      </div>

      {/* 메인 컨텐츠 */}
      {viewMode === 'overview' ? (
        <div style={{ padding: '20px' }}>
          {/* SVG 다이어그램 */}
          <svg
            width="100%"
            height="450"
            viewBox="0 0 600 450"
            style={{ maxWidth: '800px', margin: '0 auto', display: 'block' }}
          >
            {/* 화살표 마커 */}
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#6b7280" />
              </marker>
            </defs>

            {/* 중앙 라벨 */}
            <text x="300" y="210" textAnchor="middle" fill="#374151" fontSize="12" fontWeight="bold">
              AUTUS
            </text>
            <text x="300" y="228" textAnchor="middle" fill="#4b5563" fontSize="10">
              Force Absorber
            </text>

            {/* 상호작용 렌더링 */}
            {FORCE_INTERACTIONS.map(renderInteraction)}

            {/* Force 노드 렌더링 */}
            {Object.keys(FORCES).map(key => renderForceNode(key.toLowerCase()))}
          </svg>

          {/* 통계 */}
          <div style={{
            marginTop: '20px',
            padding: '16px',
            backgroundColor: '#1e293b',
            borderRadius: '12px',
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: '16px',
          }}>
            {Object.values(MOTION_TYPES).map(type => {
              const count = FORCE_INTERACTIONS.filter(i => i.responseType === type.id).length;
              return (
                <div key={type.id} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', marginBottom: '4px' }}>{type.icon}</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: type.color }}>{count}</div>
                  <div style={{ fontSize: '10px', color: '#9ca3af' }}>{type.name}</div>
                </div>
              );
            })}
          </div>

          {/* 핵심 규칙 */}
          <div style={{
            marginTop: '16px',
            padding: '16px',
            backgroundColor: '#7f1d1d22',
            borderRadius: '12px',
            border: '1px solid #ef4444',
          }}>
            <div style={{ color: '#ef4444', fontWeight: 'bold', marginBottom: '8px' }}>
              🚫 절대 실시간 반응 금지 TOP 3
            </div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <span style={{ padding: '4px 12px', backgroundColor: '#ef444433', borderRadius: '6px', fontSize: '12px', color: '#fca5a5' }}>
                1. MARKET (시장 압력)
              </span>
              <span style={{ padding: '4px 12px', backgroundColor: '#ef444433', borderRadius: '6px', fontSize: '12px', color: '#fca5a5' }}>
                2. TIME (시간 압력)
              </span>
              <span style={{ padding: '4px 12px', backgroundColor: '#ef444433', borderRadius: '6px', fontSize: '12px', color: '#fca5a5' }}>
                3. ENTROPY (엔트로피)
              </span>
            </div>
          </div>

          {/* 힌트 */}
          <div style={{
            marginTop: '12px',
            textAlign: 'center',
            fontSize: '12px',
            color: '#6b7280',
          }}>
            👆 Force 노드를 클릭하면 상세 정보 | 화살표를 클릭하면 리스크 분석
          </div>
        </div>
      ) : (
        renderDetailView()
      )}

      {/* 모달 */}
      {renderInteractionModal()}
    </div>
  );
};

export default ProcessMapV4;
