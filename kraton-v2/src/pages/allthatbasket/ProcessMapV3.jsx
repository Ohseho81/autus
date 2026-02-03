import React, { useState, useCallback } from 'react';

// 모션 특성 타입 정의
const MOTION_TYPES = {
  INTEGRATED: { id: 'integrated', name: '일체화', icon: '🔗', color: '#8b5cf6', description: '시스템 완전 통합' },
  AUTOMATED: { id: 'automated', name: '자동화', icon: '⚡', color: '#22c55e', description: 'AI/로직 자동 처리' },
  TRIGGER: { id: 'trigger', name: '트리거', icon: '🎯', color: '#f59e0b', description: '조건 충족시 자동 실행' },
  HUMAN: { id: 'human', name: '사람승인', icon: '✋', color: '#ef4444', description: '사람 확인 필요' },
};

// 산업별 템플릿
const INDUSTRY_TEMPLATES = {
  education: {
    id: 'education',
    name: '교육/학원',
    icon: '🎓',
    roles: ['원장', '관리자', '강사/코치', '학부모/학생'],
    essentialMotions: ['수강료', '출석데이터', '성적/피드백', '일정'],
  },
  retail: {
    id: 'retail',
    name: '유통/소매',
    icon: '🛒',
    roles: ['대표', '매니저', '직원', '고객'],
    essentialMotions: ['결제', '재고', '주문', '배송'],
  },
  service: {
    id: 'service',
    name: '서비스업',
    icon: '🛎️',
    roles: ['대표', '관리자', '실무자', '고객'],
    essentialMotions: ['예약', '서비스제공', '결제', '피드백'],
  },
  healthcare: {
    id: 'healthcare',
    name: '의료/헬스케어',
    icon: '🏥',
    roles: ['원장', '관리자', '의료진', '환자'],
    essentialMotions: ['진료', '처방', '수납', '예약'],
  },
};

// 올댓바스켓 역할 노드 (상세 정보 포함)
const ROLE_NODES = [
  {
    id: 'owner',
    name: '원장님',
    emoji: '👔',
    color: '#312e81',
    bgColor: '#4338ca',
    description: '의사결정자',
    kpis: ['매출', '회원수', '만족도'],
    tools: ['대시보드', '리포트'],
  },
  {
    id: 'admin',
    name: '관리자',
    emoji: '💼',
    color: '#1e40af',
    bgColor: '#3b82f6',
    description: '운영 책임자',
    kpis: ['운영효율', '응대시간', '처리건수'],
    tools: ['CRM', '스케줄러', '알림'],
  },
  {
    id: 'coach',
    name: '코치',
    emoji: '🏀',
    color: '#c2410c',
    bgColor: '#f97316',
    description: '현장 실무자',
    kpis: ['수업품질', '출석률', '피드백'],
    tools: ['출석체크', '피드백앱'],
  },
  {
    id: 'parent',
    name: '학부모',
    emoji: '👨‍👩‍👧',
    color: '#166534',
    bgColor: '#22c55e',
    description: '서비스 수혜자',
    kpis: ['만족도', '재등록률'],
    tools: ['앱', '알림톡'],
  },
];

// 모션 정의 (특성 포함)
const MOTIONS = [
  // 코치 → 관리자
  {
    id: 'm1',
    from: 'coach',
    to: 'admin',
    value: '출석 데이터',
    essence: '정보',
    time: '실시간',
    cost: '₩0',
    type: MOTION_TYPES.INTEGRATED,
    detail: '앱에서 자동 동기화',
  },
  {
    id: 'm2',
    from: 'coach',
    to: 'admin',
    value: '수업 피드백',
    essence: '가치',
    time: '수업 후',
    cost: '₩0',
    type: MOTION_TYPES.TRIGGER,
    detail: '수업 종료시 자동 요청',
  },
  // 관리자 → 원장
  {
    id: 'm3',
    from: 'admin',
    to: 'owner',
    value: '일일 보고서',
    essence: '정보',
    time: '1일',
    cost: '₩50,000',
    type: MOTION_TYPES.AUTOMATED,
    detail: 'AI 자동 생성 리포트',
  },
  {
    id: 'm4',
    from: 'admin',
    to: 'owner',
    value: '이상 징후 알림',
    essence: '위험',
    time: '즉시',
    cost: '₩0',
    type: MOTION_TYPES.TRIGGER,
    detail: '임계치 초과시 자동 알림',
  },
  // 원장 → 관리자
  {
    id: 'm5',
    from: 'owner',
    to: 'admin',
    value: '운영 지시',
    essence: '의사결정',
    time: '주 1회',
    cost: '₩100,000',
    type: MOTION_TYPES.HUMAN,
    detail: '원장 승인 필요',
  },
  // 관리자 → 코치
  {
    id: 'm6',
    from: 'admin',
    to: 'coach',
    value: '스케줄 배정',
    essence: '업무',
    time: '즉시',
    cost: '₩0',
    type: MOTION_TYPES.AUTOMATED,
    detail: 'AI 최적 배정',
  },
  // 관리자 → 학부모
  {
    id: 'm7',
    from: 'admin',
    to: 'parent',
    value: '출석 알림',
    essence: '정보',
    time: '실시간',
    cost: '₩50',
    type: MOTION_TYPES.INTEGRATED,
    detail: '알림톡 자동 발송',
  },
  {
    id: 'm8',
    from: 'admin',
    to: 'parent',
    value: '수강료 청구',
    essence: '돈',
    time: '월 1회',
    cost: '₩500',
    type: MOTION_TYPES.TRIGGER,
    detail: '매월 1일 자동 청구',
  },
  // 학부모 → 관리자
  {
    id: 'm9',
    from: 'parent',
    to: 'admin',
    value: '수강료 결제',
    essence: '돈',
    time: '3일 내',
    cost: '₩0',
    type: MOTION_TYPES.HUMAN,
    detail: '학부모 결제 승인',
  },
  {
    id: 'm10',
    from: 'parent',
    to: 'admin',
    value: '문의/요청',
    essence: '요청',
    time: '비정기',
    cost: '₩0',
    type: MOTION_TYPES.HUMAN,
    detail: '앱/카톡 통한 문의',
  },
  // 코치 → 학부모
  {
    id: 'm11',
    from: 'coach',
    to: 'parent',
    value: '수업 피드백',
    essence: '가치',
    time: '60분',
    cost: '₩0',
    type: MOTION_TYPES.TRIGGER,
    detail: '수업 후 자동 발송',
  },
];

// 노드 위치 계산 (사각형 배치)
const NODE_POSITIONS = {
  owner: { x: 150, y: 100 },
  admin: { x: 450, y: 100 },
  coach: { x: 450, y: 320 },
  parent: { x: 150, y: 320 },
};

// 곡선 경로 계산
const calculateCurvePath = (from, to, offset = 0) => {
  const fromPos = NODE_POSITIONS[from];
  const toPos = NODE_POSITIONS[to];

  const midX = (fromPos.x + toPos.x) / 2;
  const midY = (fromPos.y + toPos.y) / 2;

  // 곡선 방향 결정
  let controlOffset = 40 + offset * 25;

  // 같은 행이면 위/아래로 곡선
  if (Math.abs(fromPos.y - toPos.y) < 50) {
    return {
      path: `M ${fromPos.x + 50} ${fromPos.y} Q ${midX} ${midY - controlOffset} ${toPos.x - 50} ${toPos.y}`,
      labelPos: { x: midX, y: midY - controlOffset + 10 },
    };
  }
  // 같은 열이면 좌/우로 곡선
  if (Math.abs(fromPos.x - toPos.x) < 50) {
    const dir = from === 'parent' || to === 'parent' ? -1 : 1;
    return {
      path: `M ${fromPos.x} ${fromPos.y + 50} Q ${midX + controlOffset * dir} ${midY} ${toPos.x} ${toPos.y - 50}`,
      labelPos: { x: midX + controlOffset * dir, y: midY },
    };
  }
  // 대각선
  const isTopLeft = (fromPos.x < toPos.x && fromPos.y < toPos.y) || (fromPos.x > toPos.x && fromPos.y > toPos.y);
  return {
    path: `M ${fromPos.x + (fromPos.x < toPos.x ? 50 : -50)} ${fromPos.y + (fromPos.y < toPos.y ? 30 : -30)} Q ${midX + (isTopLeft ? -controlOffset : controlOffset)} ${midY} ${toPos.x + (fromPos.x < toPos.x ? -50 : 50)} ${toPos.y + (fromPos.y < toPos.y ? -30 : 30)}`,
    labelPos: { x: midX + (isTopLeft ? -controlOffset : controlOffset), y: midY },
  };
};

// 그룹화된 모션 (같은 from-to 쌍)
const groupMotions = () => {
  const groups = {};
  MOTIONS.forEach(motion => {
    const key = `${motion.from}-${motion.to}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(motion);
  });
  return groups;
};

const ProcessMapV3 = () => {
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedMotion, setSelectedMotion] = useState(null);
  const [viewMode, setViewMode] = useState('overview'); // overview, detail, industry
  const [selectedIndustry, setSelectedIndustry] = useState('education');
  const [hoveredMotion, setHoveredMotion] = useState(null);

  const motionGroups = groupMotions();

  // 노드 클릭 → 상세 페이지
  const handleNodeClick = useCallback((node) => {
    setSelectedNode(node);
    setSelectedMotion(null);
    setViewMode('detail');
  }, []);

  // 모션 클릭 → 모션 상세
  const handleMotionClick = useCallback((motion) => {
    setSelectedMotion(motion);
    setSelectedNode(null);
  }, []);

  // 뒤로가기
  const handleBack = useCallback(() => {
    if (selectedMotion) {
      setSelectedMotion(null);
    } else if (viewMode === 'detail') {
      setViewMode('overview');
      setSelectedNode(null);
    } else {
      window.location.hash = '';
    }
  }, [selectedMotion, viewMode]);

  // 모션 특성 아이콘 렌더링
  const renderMotionTypeIcon = (type, small = false) => (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: small ? 16 : 24,
        height: small ? 16 : 24,
        borderRadius: '50%',
        backgroundColor: type.color + '33',
        fontSize: small ? 10 : 14,
      }}
      title={`${type.name}: ${type.description}`}
    >
      {type.icon}
    </span>
  );

  // 개요 뷰 렌더링
  const renderOverview = () => (
    <>
      {/* 노드 렌더링 */}
      {ROLE_NODES.map(node => {
        const pos = NODE_POSITIONS[node.id];
        return (
          <g key={node.id} style={{ cursor: 'pointer' }} onClick={() => handleNodeClick(node)}>
            {/* 노드 원 */}
            <circle
              cx={pos.x}
              cy={pos.y}
              r={55}
              fill={node.bgColor}
              stroke={node.color}
              strokeWidth={3}
              style={{
                filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))',
                transition: 'all 0.3s ease',
              }}
            />
            {/* 이모지 */}
            <text x={pos.x} y={pos.y - 8} textAnchor="middle" fontSize={28}>
              {node.emoji}
            </text>
            {/* 이름 */}
            <text x={pos.x} y={pos.y + 22} textAnchor="middle" fill="white" fontSize={14} fontWeight="bold">
              {node.name}
            </text>
            {/* 설명 */}
            <text x={pos.x} y={pos.y + 80} textAnchor="middle" fill="#9ca3af" fontSize={11}>
              {node.description}
            </text>
            {/* 클릭 힌트 */}
            <text x={pos.x} y={pos.y + 95} textAnchor="middle" fill="#6b7280" fontSize={9}>
              클릭하여 상세보기 →
            </text>
          </g>
        );
      })}

      {/* 모션 렌더링 */}
      {Object.entries(motionGroups).map(([key, motions]) => {
        const [from, to] = key.split('-');
        return motions.map((motion, idx) => {
          const { path, labelPos } = calculateCurvePath(from, to, idx);
          const isHovered = hoveredMotion === motion.id;

          return (
            <g
              key={motion.id}
              style={{ cursor: 'pointer' }}
              onClick={() => handleMotionClick(motion)}
              onMouseEnter={() => setHoveredMotion(motion.id)}
              onMouseLeave={() => setHoveredMotion(null)}
            >
              {/* 화살표 경로 */}
              <path
                d={path}
                fill="none"
                stroke={isHovered ? motion.type.color : '#4b5563'}
                strokeWidth={isHovered ? 3 : 2}
                strokeDasharray={motion.type.id === 'human' ? '8,4' : 'none'}
                markerEnd="url(#arrowhead)"
                style={{ transition: 'all 0.3s ease' }}
              />

              {/* 애니메이션 점 */}
              <circle r={4} fill={motion.type.color}>
                <animateMotion dur="3s" repeatCount="indefinite" path={path} />
              </circle>

              {/* 라벨 배경 */}
              <rect
                x={labelPos.x - 45}
                y={labelPos.y - 22}
                width={90}
                height={44}
                rx={6}
                fill={isHovered ? '#1f2937' : '#111827'}
                stroke={isHovered ? motion.type.color : '#374151'}
                strokeWidth={1}
                style={{ transition: 'all 0.3s ease' }}
              />

              {/* 특성 아이콘 */}
              <foreignObject x={labelPos.x - 40} y={labelPos.y - 18} width={20} height={20}>
                {renderMotionTypeIcon(motion.type, true)}
              </foreignObject>

              {/* 값 라벨 */}
              <text x={labelPos.x + 5} y={labelPos.y - 5} textAnchor="middle" fill="white" fontSize={10} fontWeight="bold">
                {motion.value}
              </text>

              {/* 시간 라벨 */}
              <text x={labelPos.x} y={labelPos.y + 12} textAnchor="middle" fill="#9ca3af" fontSize={9}>
                ⏱ {motion.time}
              </text>
            </g>
          );
        });
      })}

      {/* 화살표 마커 정의 */}
      <defs>
        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#6b7280" />
        </marker>
      </defs>
    </>
  );

  // 상세 뷰 렌더링 (노드 클릭시)
  const renderDetailView = () => {
    if (!selectedNode) return null;

    const nodeMotions = MOTIONS.filter(m => m.from === selectedNode.id || m.to === selectedNode.id);
    const incomingMotions = nodeMotions.filter(m => m.to === selectedNode.id);
    const outgoingMotions = nodeMotions.filter(m => m.from === selectedNode.id);

    return (
      <div style={{ padding: '20px' }}>
        {/* 헤더 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          marginBottom: '24px',
          padding: '20px',
          background: `linear-gradient(135deg, ${selectedNode.bgColor}33, transparent)`,
          borderRadius: '16px',
          border: `2px solid ${selectedNode.bgColor}`,
        }}>
          <div style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            backgroundColor: selectedNode.bgColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '40px',
          }}>
            {selectedNode.emoji}
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '28px', color: 'white' }}>{selectedNode.name}</h2>
            <p style={{ margin: '4px 0 0', color: '#9ca3af' }}>{selectedNode.description}</p>
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              {selectedNode.kpis.map(kpi => (
                <span key={kpi} style={{
                  padding: '4px 12px',
                  backgroundColor: '#374151',
                  borderRadius: '12px',
                  fontSize: '12px',
                  color: '#d1d5db',
                }}>
                  {kpi}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* 들어오는 모션 */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ color: '#22c55e', fontSize: '16px', marginBottom: '12px' }}>
            📥 받는 가치 ({incomingMotions.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {incomingMotions.map(motion => {
              const fromNode = ROLE_NODES.find(n => n.id === motion.from);
              return (
                <div
                  key={motion.id}
                  onClick={() => handleMotionClick(motion)}
                  style={{
                    padding: '12px 16px',
                    backgroundColor: '#1f2937',
                    borderRadius: '12px',
                    border: '1px solid #374151',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  {renderMotionTypeIcon(motion.type)}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: '#9ca3af', fontSize: '12px' }}>{fromNode?.name}</span>
                      <span style={{ color: '#6b7280' }}>→</span>
                      <span style={{ color: 'white', fontWeight: 'bold' }}>{motion.value}</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                      {motion.detail}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: motion.type.color, fontSize: '11px' }}>{motion.type.name}</div>
                    <div style={{ color: '#9ca3af', fontSize: '10px' }}>⏱ {motion.time}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 나가는 모션 */}
        <div>
          <h3 style={{ color: '#f59e0b', fontSize: '16px', marginBottom: '12px' }}>
            📤 보내는 가치 ({outgoingMotions.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {outgoingMotions.map(motion => {
              const toNode = ROLE_NODES.find(n => n.id === motion.to);
              return (
                <div
                  key={motion.id}
                  onClick={() => handleMotionClick(motion)}
                  style={{
                    padding: '12px 16px',
                    backgroundColor: '#1f2937',
                    borderRadius: '12px',
                    border: '1px solid #374151',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  {renderMotionTypeIcon(motion.type)}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: 'white', fontWeight: 'bold' }}>{motion.value}</span>
                      <span style={{ color: '#6b7280' }}>→</span>
                      <span style={{ color: '#9ca3af', fontSize: '12px' }}>{toNode?.name}</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                      {motion.detail}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: motion.type.color, fontSize: '11px' }}>{motion.type.name}</div>
                    <div style={{ color: '#9ca3af', fontSize: '10px' }}>⏱ {motion.time}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // 모션 상세 모달
  const renderMotionDetail = () => {
    if (!selectedMotion) return null;

    const fromNode = ROLE_NODES.find(n => n.id === selectedMotion.from);
    const toNode = ROLE_NODES.find(n => n.id === selectedMotion.to);

    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
      onClick={() => setSelectedMotion(null)}
      >
        <div
          style={{
            backgroundColor: '#1f2937',
            borderRadius: '20px',
            padding: '24px',
            maxWidth: '400px',
            width: '90%',
            border: `2px solid ${selectedMotion.type.color}`,
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* 헤더 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            {renderMotionTypeIcon(selectedMotion.type)}
            <div>
              <h3 style={{ margin: 0, color: 'white' }}>{selectedMotion.value}</h3>
              <span style={{
                color: selectedMotion.type.color,
                fontSize: '12px',
                padding: '2px 8px',
                backgroundColor: selectedMotion.type.color + '22',
                borderRadius: '8px',
              }}>
                {selectedMotion.type.name}
              </span>
            </div>
          </div>

          {/* 플로우 시각화 */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px',
            backgroundColor: '#111827',
            borderRadius: '12px',
            marginBottom: '16px',
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px' }}>{fromNode?.emoji}</div>
              <div style={{ color: 'white', fontSize: '12px' }}>{fromNode?.name}</div>
            </div>
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '0 12px',
            }}>
              <div style={{ color: selectedMotion.type.color, fontSize: '20px' }}>→→→</div>
              <div style={{ color: '#9ca3af', fontSize: '10px' }}>{selectedMotion.essence}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px' }}>{toNode?.emoji}</div>
              <div style={{ color: 'white', fontSize: '12px' }}>{toNode?.name}</div>
            </div>
          </div>

          {/* 상세 정보 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div style={{ padding: '12px', backgroundColor: '#111827', borderRadius: '8px' }}>
              <div style={{ color: '#6b7280', fontSize: '10px', marginBottom: '4px' }}>소요 시간</div>
              <div style={{ color: 'white', fontWeight: 'bold' }}>⏱ {selectedMotion.time}</div>
            </div>
            <div style={{ padding: '12px', backgroundColor: '#111827', borderRadius: '8px' }}>
              <div style={{ color: '#6b7280', fontSize: '10px', marginBottom: '4px' }}>비용</div>
              <div style={{ color: 'white', fontWeight: 'bold' }}>💰 {selectedMotion.cost}</div>
            </div>
          </div>

          {/* 설명 */}
          <div style={{
            padding: '12px',
            backgroundColor: '#111827',
            borderRadius: '8px',
            marginBottom: '16px',
          }}>
            <div style={{ color: '#6b7280', fontSize: '10px', marginBottom: '4px' }}>처리 방식</div>
            <div style={{ color: 'white', fontSize: '13px' }}>{selectedMotion.detail}</div>
          </div>

          {/* 특성 설명 */}
          <div style={{
            padding: '12px',
            backgroundColor: selectedMotion.type.color + '22',
            borderRadius: '8px',
            border: `1px solid ${selectedMotion.type.color}44`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '16px' }}>{selectedMotion.type.icon}</span>
              <span style={{ color: selectedMotion.type.color, fontWeight: 'bold' }}>
                {selectedMotion.type.name}
              </span>
            </div>
            <div style={{ color: '#d1d5db', fontSize: '12px' }}>
              {selectedMotion.type.description}
            </div>
          </div>

          {/* 닫기 버튼 */}
          <button
            onClick={() => setSelectedMotion(null)}
            style={{
              width: '100%',
              marginTop: '16px',
              padding: '12px',
              backgroundColor: '#374151',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            닫기
          </button>
        </div>
      </div>
    );
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0f172a',
      color: 'white',
    }}>
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
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            ← {viewMode === 'detail' ? '전체 보기' : '대시보드'}
          </button>
          <h1 style={{ margin: 0, fontSize: '18px' }}>
            🏀 {viewMode === 'detail' && selectedNode ? `${selectedNode.name} 상세` : '올댓바스켓 프로세스 맵'}
          </h1>
        </div>

        {/* 범례 */}
        <div style={{ display: 'flex', gap: '12px' }}>
          {Object.values(MOTION_TYPES).map(type => (
            <div key={type.id} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {renderMotionTypeIcon(type, true)}
              <span style={{ fontSize: '11px', color: '#9ca3af' }}>{type.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 서브헤더 - 철학 */}
      <div style={{
        padding: '8px 20px',
        backgroundColor: '#1e293b',
        fontSize: '12px',
        color: '#9ca3af',
        textAlign: 'center',
      }}>
        노드 = 사람(역할) | 모션 = 시간(돈, 가치) |
        <span style={{ color: '#22c55e' }}> 🔗일체화 </span>
        <span style={{ color: '#22c55e' }}> ⚡자동화 </span>
        <span style={{ color: '#f59e0b' }}> 🎯트리거 </span>
        <span style={{ color: '#ef4444' }}> ✋사람승인 </span>
      </div>

      {/* 메인 컨텐츠 */}
      {viewMode === 'overview' ? (
        <div style={{ padding: '20px' }}>
          {/* SVG 다이어그램 */}
          <svg width="100%" height="450" viewBox="0 0 600 450" style={{ maxWidth: '800px', margin: '0 auto', display: 'block' }}>
            {/* 중앙 라벨 */}
            <text x="300" y="210" textAnchor="middle" fill="#4b5563" fontSize="14" fontWeight="bold">
              가치 흐름
            </text>
            <text x="300" y="228" textAnchor="middle" fill="#6b7280" fontSize="10">
              Value Flow
            </text>

            {renderOverview()}
          </svg>

          {/* 하단 통계 */}
          <div style={{
            marginTop: '20px',
            padding: '16px',
            backgroundColor: '#1e293b',
            borderRadius: '12px',
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '16px',
          }}>
            {Object.values(MOTION_TYPES).map(type => {
              const count = MOTIONS.filter(m => m.type.id === type.id).length;
              return (
                <div key={type.id} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', marginBottom: '4px' }}>{type.icon}</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: type.color }}>{count}</div>
                  <div style={{ fontSize: '11px', color: '#9ca3af' }}>{type.name}</div>
                </div>
              );
            })}
          </div>

          {/* 힌트 */}
          <div style={{
            marginTop: '16px',
            padding: '12px',
            backgroundColor: '#374151',
            borderRadius: '8px',
            textAlign: 'center',
            fontSize: '13px',
            color: '#d1d5db',
          }}>
            👆 노드(역할)를 클릭하면 상세 페이지로 이동 | 모션(화살표)를 클릭하면 상세 정보 확인
          </div>
        </div>
      ) : (
        renderDetailView()
      )}

      {/* 모션 상세 모달 */}
      {renderMotionDetail()}
    </div>
  );
};

export default ProcessMapV3;
