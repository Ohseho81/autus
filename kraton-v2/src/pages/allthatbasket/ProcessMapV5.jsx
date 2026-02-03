import React, { useState, useCallback } from 'react';

/**
 * ProcessMapV5 - AUTUS Customer & Node Injection Map
 *
 * 핵심 정의:
 * Customer = Entity that injects irreversible nodes
 *            (time | money | reputation | liability | opportunity cost)
 *            into the system right now.
 *
 * 고객 계층:
 * - AUTUS Customer = Owner (자본 + 법적책임 + 기회비용)
 * - Service Customer = Parent (돈 + 시간 + 신뢰)
 * - Output = Student (시간 + 주의)
 */

// ============================================
// 📊 노드 타입 정의 (회수 불가능 자원)
// ============================================
const NODE_TYPES = {
  MONEY: { id: 'money', name: '돈', icon: '💰', color: '#22c55e', reversible: true },
  TIME: { id: 'time', name: '시간', icon: '⏱️', color: '#3b82f6', reversible: false },
  REPUTATION: { id: 'reputation', name: '평판/신뢰', icon: '⭐', color: '#f59e0b', reversible: false },
  LIABILITY: { id: 'liability', name: '법적 책임', icon: '⚖️', color: '#ef4444', reversible: false },
  OPPORTUNITY: { id: 'opportunity', name: '기회비용', icon: '🚪', color: '#8b5cf6', reversible: false },
  ATTENTION: { id: 'attention', name: '주의/집중', icon: '👁️', color: '#06b6d4', reversible: true },
};

// ============================================
// 👥 주체 정의
// ============================================
const ENTITIES = {
  owner: {
    id: 'owner',
    name: '원장',
    emoji: '👔',
    color: '#1e1b4b',
    bgColor: '#4338ca',
    layer: 'AUTUS',
    isCustomer: true,
    customerType: 'AUTUS Customer',
    description: '시스템에 회수 불가능 노드를 투입하는 핵심 주체',
    nodes: [
      { type: 'MONEY', amount: '₩억 단위', reversible: false, note: '자본금 - 완전 회수 불가' },
      { type: 'LIABILITY', amount: '무한', reversible: false, note: '법적 책임 - 사업자 등록' },
      { type: 'OPPORTUNITY', amount: '∞', reversible: false, note: '다른 사업 포기' },
      { type: 'TIME', amount: '24/7', reversible: false, note: '생애 시간 투입' },
    ],
  },
  parent: {
    id: 'parent',
    name: '학부모',
    emoji: '👨‍👩‍👧',
    color: '#166534',
    bgColor: '#22c55e',
    layer: 'Service',
    isCustomer: true,
    customerType: 'Service Customer',
    description: '서비스에 비용을 지불하는 외부 주체 (이탈 가능)',
    nodes: [
      { type: 'MONEY', amount: '₩30~50만/월', reversible: true, note: '월 수강료 - 이탈 가능' },
      { type: 'TIME', amount: '주 5시간', reversible: true, note: '등하원 시간' },
      { type: 'REPUTATION', amount: '신뢰', reversible: true, note: '학원 신뢰 - 철회 가능' },
    ],
  },
  coach: {
    id: 'coach',
    name: '코치',
    emoji: '🏀',
    color: '#c2410c',
    bgColor: '#f97316',
    layer: 'Production',
    isCustomer: false,
    customerType: 'Resource',
    description: '생산을 담당하는 내부 자원 (통제 대상)',
    nodes: [
      { type: 'TIME', amount: '하루 8시간', reversible: true, note: '근무 시간 - 이직 가능' },
      { type: 'REPUTATION', amount: '커리어', reversible: true, note: '경력 - 이동 가능' },
    ],
  },
  student: {
    id: 'student',
    name: '학생',
    emoji: '🧒',
    color: '#0369a1',
    bgColor: '#0ea5e9',
    layer: 'Output',
    isCustomer: false,
    customerType: 'Output',
    description: '서비스의 결과물 (소비되는 시간과 주의)',
    nodes: [
      { type: 'TIME', amount: '주 3~5시간', reversible: false, note: '수업 시간' },
      { type: 'ATTENTION', amount: '집중력', reversible: false, note: '수업 중 주의' },
    ],
  },
};

// ============================================
// 📍 위치 정의
// ============================================
const POSITIONS = {
  owner: { x: 150, y: 100 },
  parent: { x: 450, y: 100 },
  coach: { x: 150, y: 320 },
  student: { x: 450, y: 320 },
};

// ============================================
// 🔄 노드 흐름 정의
// ============================================
const NODE_FLOWS = [
  {
    id: 'owner-to-system',
    from: 'owner',
    to: 'system',
    nodes: ['MONEY', 'LIABILITY', 'OPPORTUNITY'],
    label: '자본 + 책임 + 기회비용',
    reversible: false,
  },
  {
    id: 'parent-to-service',
    from: 'parent',
    to: 'service',
    nodes: ['MONEY', 'TIME', 'REPUTATION'],
    label: '수강료 + 시간 + 신뢰',
    reversible: true,
  },
  {
    id: 'coach-to-production',
    from: 'coach',
    to: 'production',
    nodes: ['TIME', 'REPUTATION'],
    label: '노동력 + 커리어',
    reversible: true,
  },
  {
    id: 'service-to-student',
    from: 'service',
    to: 'student',
    nodes: ['TIME', 'ATTENTION'],
    label: '수업 → 성장',
    reversible: false,
  },
];

// ============================================
// 🎨 메인 컴포넌트
// ============================================
const ProcessMapV5 = () => {
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [viewMode, setViewMode] = useState('overview');
  const [showNodeDetail, setShowNodeDetail] = useState(null);

  const handleEntityClick = useCallback((entity) => {
    setSelectedEntity(entity);
    setViewMode('detail');
  }, []);

  const handleBack = useCallback(() => {
    if (showNodeDetail) {
      setShowNodeDetail(null);
    } else if (viewMode === 'detail') {
      setViewMode('overview');
      setSelectedEntity(null);
    } else {
      window.location.hash = '';
    }
  }, [showNodeDetail, viewMode]);

  // 엔티티 노드 렌더링
  const renderEntity = (entityKey) => {
    const entity = ENTITIES[entityKey];
    const pos = POSITIONS[entityKey];

    return (
      <g
        key={entity.id}
        style={{ cursor: 'pointer' }}
        onClick={() => handleEntityClick(entity)}
      >
        {/* 고객 여부 표시 글로우 */}
        {entity.isCustomer && (
          <circle
            cx={pos.x}
            cy={pos.y}
            r={65}
            fill="none"
            stroke={entity.customerType === 'AUTUS Customer' ? '#fbbf24' : '#22c55e'}
            strokeWidth={3}
            strokeDasharray="8,4"
            opacity={0.6}
          >
            <animate attributeName="stroke-dashoffset" from="0" to="24" dur="2s" repeatCount="indefinite" />
          </circle>
        )}

        {/* 메인 원 */}
        <circle
          cx={pos.x}
          cy={pos.y}
          r={55}
          fill={entity.bgColor}
          stroke={entity.color}
          strokeWidth={3}
          style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.4))' }}
        />

        {/* 이모지 */}
        <text x={pos.x} y={pos.y - 5} textAnchor="middle" fontSize={28}>
          {entity.emoji}
        </text>

        {/* 이름 */}
        <text x={pos.x} y={pos.y + 22} textAnchor="middle" fill="white" fontSize={14} fontWeight="bold">
          {entity.name}
        </text>

        {/* 레이어 뱃지 */}
        <g transform={`translate(${pos.x + 40}, ${pos.y - 40})`}>
          <rect
            x={-25}
            y={-10}
            width={50}
            height={20}
            rx={10}
            fill={entity.isCustomer ? (entity.customerType === 'AUTUS Customer' ? '#fbbf24' : '#22c55e') : '#6b7280'}
          />
          <text textAnchor="middle" y={5} fontSize={9} fill={entity.isCustomer ? '#000' : '#fff'} fontWeight="bold">
            {entity.layer}
          </text>
        </g>

        {/* 노드 투입 표시 */}
        <text x={pos.x} y={pos.y + 80} textAnchor="middle" fill="#9ca3af" fontSize={10}>
          {entity.nodes.length}개 노드 투입
        </text>

        {/* 회수 불가 표시 */}
        {entity.nodes.filter(n => !n.reversible).length > 0 && (
          <text x={pos.x} y={pos.y + 95} textAnchor="middle" fill="#ef4444" fontSize={9}>
            ⚠️ {entity.nodes.filter(n => !n.reversible).length}개 회수 불가
          </text>
        )}
      </g>
    );
  };

  // 상세 뷰
  const renderDetailView = () => {
    if (!selectedEntity) return null;

    return (
      <div style={{ padding: '20px' }}>
        {/* 헤더 */}
        <div style={{
          padding: '24px',
          background: `linear-gradient(135deg, ${selectedEntity.bgColor}44, transparent)`,
          borderRadius: '16px',
          border: `2px solid ${selectedEntity.bgColor}`,
          marginBottom: '24px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              backgroundColor: selectedEntity.bgColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '40px',
            }}>
              {selectedEntity.emoji}
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '28px', color: 'white' }}>
                {selectedEntity.name}
              </h2>
              <p style={{ margin: '4px 0', color: '#9ca3af' }}>
                {selectedEntity.description}
              </p>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                backgroundColor: selectedEntity.isCustomer
                  ? (selectedEntity.customerType === 'AUTUS Customer' ? '#fbbf24' : '#22c55e')
                  : '#6b7280',
                borderRadius: '12px',
                marginTop: '8px',
              }}>
                <span style={{
                  color: selectedEntity.isCustomer ? '#000' : '#fff',
                  fontSize: '12px',
                  fontWeight: 'bold',
                }}>
                  {selectedEntity.isCustomer ? `✓ ${selectedEntity.customerType}` : `× ${selectedEntity.customerType}`}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 노드 투입 현황 */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ color: '#f59e0b', fontSize: '16px', marginBottom: '12px' }}>
            📥 투입 노드 ({selectedEntity.nodes.length})
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {selectedEntity.nodes.map((node, idx) => {
              const nodeType = NODE_TYPES[node.type];
              return (
                <div
                  key={idx}
                  style={{
                    padding: '16px',
                    backgroundColor: '#1f2937',
                    borderRadius: '12px',
                    border: `1px solid ${node.reversible ? '#374151' : '#ef4444'}`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        backgroundColor: nodeType.color + '33',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '20px',
                      }}>
                        {nodeType.icon}
                      </span>
                      <div>
                        <div style={{ color: 'white', fontWeight: 'bold' }}>{nodeType.name}</div>
                        <div style={{ color: nodeType.color, fontSize: '18px', fontWeight: 'bold' }}>
                          {node.amount}
                        </div>
                      </div>
                    </div>
                    <div style={{
                      padding: '4px 12px',
                      backgroundColor: node.reversible ? '#22c55e22' : '#ef444422',
                      borderRadius: '8px',
                      border: `1px solid ${node.reversible ? '#22c55e' : '#ef4444'}`,
                    }}>
                      <span style={{
                        color: node.reversible ? '#22c55e' : '#ef4444',
                        fontSize: '11px',
                        fontWeight: 'bold',
                      }}>
                        {node.reversible ? '⭕ 회수 가능' : '❌ 회수 불가'}
                      </span>
                    </div>
                  </div>
                  <div style={{
                    padding: '8px 12px',
                    backgroundColor: '#111827',
                    borderRadius: '6px',
                    fontSize: '12px',
                    color: '#9ca3af',
                  }}>
                    {node.note}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 고객 판정 로직 */}
        <div style={{
          padding: '16px',
          backgroundColor: selectedEntity.isCustomer ? '#22c55e11' : '#ef444411',
          borderRadius: '12px',
          border: `1px solid ${selectedEntity.isCustomer ? '#22c55e' : '#ef4444'}`,
        }}>
          <div style={{ color: selectedEntity.isCustomer ? '#22c55e' : '#ef4444', fontWeight: 'bold', marginBottom: '8px' }}>
            {selectedEntity.isCustomer ? '✓ 고객 판정: YES' : '✗ 고객 판정: NO'}
          </div>
          <div style={{ color: '#d1d5db', fontSize: '13px' }}>
            {selectedEntity.isCustomer ? (
              selectedEntity.customerType === 'AUTUS Customer' ? (
                '회수 불가능한 노드(자본, 법적 책임, 기회비용)를 시스템에 투입 → AUTUS의 최적화 대상'
              ) : (
                '비용(돈, 시간, 신뢰)을 서비스에 투입하지만 이탈 가능 → 관측 및 유지 대상'
              )
            ) : (
              selectedEntity.customerType === 'Resource' ? (
                '노동력을 제공하지만 이직 가능 → 통제 및 표준화 대상'
              ) : (
                '시간과 주의를 소비 → 서비스의 결과물'
              )
            )}
          </div>
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
            👥 {viewMode === 'detail' && selectedEntity ? `${selectedEntity.name} 상세` : '고객 & 노드 맵'}
          </h1>
        </div>

        {/* 범례 */}
        <div style={{ display: 'flex', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#fbbf24' }} />
            <span style={{ fontSize: '11px', color: '#fbbf24' }}>AUTUS 고객</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#22c55e' }} />
            <span style={{ fontSize: '11px', color: '#22c55e' }}>서비스 고객</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#6b7280' }} />
            <span style={{ fontSize: '11px', color: '#6b7280' }}>비고객</span>
          </div>
        </div>
      </div>

      {/* 핵심 정의 배너 */}
      <div style={{
        padding: '12px 20px',
        backgroundColor: '#1e293b',
        fontSize: '12px',
        textAlign: 'center',
        borderBottom: '1px solid #374151',
      }}>
        <span style={{ color: '#fbbf24' }}>Customer</span>
        <span style={{ color: '#9ca3af' }}> = Entity that injects </span>
        <span style={{ color: '#ef4444' }}>irreversible nodes</span>
        <span style={{ color: '#9ca3af' }}> (time | money | reputation | liability | opportunity cost) </span>
        <span style={{ color: '#22c55e' }}>into the system right now</span>
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
            {/* 레이어 배경 */}
            {/* AUTUS Layer */}
            <rect x="20" y="40" width="270" height="140" rx="12" fill="#fbbf2411" stroke="#fbbf24" strokeWidth="1" strokeDasharray="4,4" />
            <text x="35" y="65" fill="#fbbf24" fontSize="11" fontWeight="bold">AUTUS CUSTOMER</text>

            {/* Service Layer */}
            <rect x="310" y="40" width="270" height="140" rx="12" fill="#22c55e11" stroke="#22c55e" strokeWidth="1" strokeDasharray="4,4" />
            <text x="325" y="65" fill="#22c55e" fontSize="11" fontWeight="bold">SERVICE CUSTOMER</text>

            {/* Production Layer */}
            <rect x="20" y="260" width="270" height="140" rx="12" fill="#6b728011" stroke="#6b7280" strokeWidth="1" strokeDasharray="4,4" />
            <text x="35" y="285" fill="#6b7280" fontSize="11" fontWeight="bold">RESOURCE (통제 대상)</text>

            {/* Output Layer */}
            <rect x="310" y="260" width="270" height="140" rx="12" fill="#0ea5e911" stroke="#0ea5e9" strokeWidth="1" strokeDasharray="4,4" />
            <text x="325" y="285" fill="#0ea5e9" fontSize="11" fontWeight="bold">OUTPUT (결과물)</text>

            {/* 중앙 시스템 */}
            <rect x="240" y="185" width="120" height="50" rx="8" fill="#1e293b" stroke="#374151" strokeWidth="2" />
            <text x="300" y="205" textAnchor="middle" fill="#fbbf24" fontSize="11" fontWeight="bold">AUTUS</text>
            <text x="300" y="220" textAnchor="middle" fill="#9ca3af" fontSize="9">System</text>

            {/* 화살표 마커 */}
            <defs>
              <marker id="arrow-gold" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#fbbf24" />
              </marker>
              <marker id="arrow-green" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#22c55e" />
              </marker>
              <marker id="arrow-gray" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                <polygon points="0 0, 10 3.5, 0 7" fill="#6b7280" />
              </marker>
            </defs>

            {/* 노드 흐름 화살표 */}
            {/* Owner → System */}
            <path d="M 200 120 Q 250 150 250 185" fill="none" stroke="#fbbf24" strokeWidth="2" markerEnd="url(#arrow-gold)" />
            <text x="210" y="150" fill="#fbbf24" fontSize="9">자본+책임</text>

            {/* Parent → System */}
            <path d="M 400 120 Q 350 150 350 185" fill="none" stroke="#22c55e" strokeWidth="2" markerEnd="url(#arrow-green)" />
            <text x="360" y="150" fill="#22c55e" fontSize="9">수강료</text>

            {/* System → Coach */}
            <path d="M 250 235 Q 200 270 150 280" fill="none" stroke="#6b7280" strokeWidth="2" markerEnd="url(#arrow-gray)" />
            <text x="180" y="260" fill="#6b7280" fontSize="9">급여</text>

            {/* Coach → Student (via System) */}
            <path d="M 200 340 Q 300 380 400 340" fill="none" stroke="#0ea5e9" strokeWidth="2" markerEnd="url(#arrow-gray)" strokeDasharray="4,4" />
            <text x="300" y="395" textAnchor="middle" fill="#0ea5e9" fontSize="9">수업 제공</text>

            {/* 엔티티 렌더링 */}
            {Object.keys(ENTITIES).map(key => renderEntity(key))}
          </svg>

          {/* 고객 판별 규칙 */}
          <div style={{
            marginTop: '20px',
            padding: '16px',
            backgroundColor: '#1e293b',
            borderRadius: '12px',
          }}>
            <div style={{ color: 'white', fontWeight: 'bold', marginBottom: '12px' }}>
              ⚖️ 고객 판별 규칙
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <div style={{ padding: '12px', backgroundColor: '#22c55e22', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#22c55e', marginBottom: '4px' }}>Rule 1</div>
                <div style={{ fontSize: '12px', color: 'white' }}>고객은 동시에 하나만</div>
              </div>
              <div style={{ padding: '12px', backgroundColor: '#f59e0b22', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#f59e0b', marginBottom: '4px' }}>Rule 2</div>
                <div style={{ fontSize: '12px', color: 'white' }}>노드가 바뀌면 UI도 변경</div>
              </div>
              <div style={{ padding: '12px', backgroundColor: '#ef444422', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: '#ef4444', marginBottom: '4px' }}>Rule 3</div>
                <div style={{ fontSize: '12px', color: 'white' }}>투입 중단 = 고객 박탈</div>
              </div>
            </div>
          </div>

          {/* 핵심 결론 */}
          <div style={{
            marginTop: '16px',
            padding: '16px',
            backgroundColor: '#fbbf2411',
            borderRadius: '12px',
            border: '1px solid #fbbf24',
          }}>
            <div style={{ color: '#fbbf24', fontWeight: 'bold', marginBottom: '8px' }}>
              🎯 올댓바스켓의 고객
            </div>
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ flex: 1, padding: '12px', backgroundColor: '#1e293b', borderRadius: '8px' }}>
                <div style={{ color: '#fbbf24', fontSize: '12px', marginBottom: '4px' }}>AUTUS 고객</div>
                <div style={{ color: 'white', fontSize: '18px', fontWeight: 'bold' }}>👔 원장</div>
                <div style={{ color: '#9ca3af', fontSize: '11px', marginTop: '4px' }}>자본 + 법적책임 + 기회비용</div>
              </div>
              <div style={{ flex: 1, padding: '12px', backgroundColor: '#1e293b', borderRadius: '8px' }}>
                <div style={{ color: '#22c55e', fontSize: '12px', marginBottom: '4px' }}>서비스 고객</div>
                <div style={{ color: 'white', fontSize: '18px', fontWeight: 'bold' }}>👨‍👩‍👧 학부모</div>
                <div style={{ color: '#9ca3af', fontSize: '11px', marginTop: '4px' }}>수강료 + 시간 + 신뢰</div>
              </div>
            </div>
          </div>

          {/* 힌트 */}
          <div style={{
            marginTop: '12px',
            textAlign: 'center',
            fontSize: '12px',
            color: '#6b7280',
          }}>
            👆 각 주체를 클릭하면 투입 노드 상세 정보 확인
          </div>
        </div>
      ) : (
        renderDetailView()
      )}
    </div>
  );
};

export default ProcessMapV5;
