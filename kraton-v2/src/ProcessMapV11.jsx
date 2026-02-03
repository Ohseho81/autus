/**
 * 🎛️ ProcessMapV11 - Interactive Node Editor
 *
 * 기능:
 * 1. 노드 추가/삭제 (드래그 가능)
 * 2. 역할 추가/삭제 + 설정 (자동화/승인/행위)
 * 3. 드래그로 위치 변경
 * 4. 클릭 시 객관식+주관식 설정
 * 5. 실시간 V(가치) 흐름 표시
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';

// ============================================
// 초기 데이터
// ============================================

const INITIAL_NODES = [
  {
    id: 'customer',
    type: 'customer',
    label: '고객',
    emoji: '👨‍👩‍👧',
    x: 400,
    y: 50,
    fixed: true, // 고객은 항상 최상단
    value: 100,
  },
  {
    id: 'owner',
    type: 'producer',
    label: '원장',
    emoji: '👔',
    x: 200,
    y: 250,
    roles: [
      { id: 'approve', label: '승인', mode: 'manual', enabled: true },
      { id: 'kill', label: 'Kill', mode: 'manual', enabled: true },
    ],
    value: 0,
  },
  {
    id: 'admin',
    type: 'producer',
    label: '관리자',
    emoji: '💼',
    x: 400,
    y: 250,
    roles: [
      { id: 'monitor', label: '모니터', mode: 'auto', enabled: true },
      { id: 'escalate', label: '에스컬레이션', mode: 'manual', enabled: true },
    ],
    value: 0,
  },
  {
    id: 'coach',
    type: 'producer',
    label: '코치',
    emoji: '🏃',
    x: 600,
    y: 250,
    roles: [
      { id: 'class', label: '수업', mode: 'auto', enabled: true },
      { id: 'attendance', label: '출석', mode: 'auto', enabled: true },
    ],
    value: 0,
  },
];

const ROLE_MODES = [
  { id: 'auto', label: '자동화', color: '#10B981' },
  { id: 'manual', label: '수동', color: '#F59E0B' },
  { id: 'approval', label: '승인필요', color: '#EF4444' },
  { id: 'disabled', label: '비활성', color: '#9CA3AF' },
];

const PRESET_ROLES = [
  { id: 'approve', label: '승인' },
  { id: 'reject', label: '반려' },
  { id: 'monitor', label: '모니터' },
  { id: 'escalate', label: '에스컬레이션' },
  { id: 'notify', label: '알림' },
  { id: 'report', label: '보고' },
];

// ============================================
// 메인 컴포넌트
// ============================================

export default function ProcessMapV11() {
  const [nodes, setNodes] = useState(INITIAL_NODES);
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  const [showNodeModal, setShowNodeModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [dragging, setDragging] = useState(null);
  const [connections, setConnections] = useState([]);
  const containerRef = useRef(null);

  // 연결선 계산
  useEffect(() => {
    const customerNode = nodes.find(n => n.id === 'customer');
    const producerNodes = nodes.filter(n => n.type === 'producer');

    const newConnections = producerNodes.map(node => ({
      from: customerNode,
      to: node,
      value: node.value,
    }));

    setConnections(newConnections);
  }, [nodes]);

  // 실시간 V(가치) 계산
  useEffect(() => {
    const interval = setInterval(() => {
      setNodes(prev => prev.map(node => {
        if (node.type === 'producer') {
          const activeRoles = node.roles?.filter(r => r.enabled && r.mode !== 'disabled').length || 0;
          const newValue = Math.min(100, node.value + activeRoles * 2);
          return { ...node, value: Math.random() > 0.5 ? newValue : Math.max(0, node.value - 1) };
        }
        return node;
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // 드래그 핸들러
  const handleMouseDown = useCallback((e, nodeId) => {
    const node = nodes.find(n => n.id === nodeId);
    if (node?.fixed) return;

    setDragging({
      id: nodeId,
      offsetX: e.clientX - node.x,
      offsetY: e.clientY - node.y,
    });
  }, [nodes]);

  const handleMouseMove = useCallback((e) => {
    if (!dragging) return;

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    setNodes(prev => prev.map(node => {
      if (node.id === dragging.id) {
        return {
          ...node,
          x: Math.max(50, Math.min(rect.width - 100, e.clientX - rect.left - 50)),
          y: Math.max(50, Math.min(rect.height - 80, e.clientY - rect.top - 40)),
        };
      }
      return node;
    }));
  }, [dragging]);

  const handleMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  // 노드 추가
  const addNode = (label, emoji) => {
    const newNode = {
      id: `node_${Date.now()}`,
      type: 'producer',
      label,
      emoji,
      x: 300 + Math.random() * 200,
      y: 350,
      roles: [],
      value: 0,
    };
    setNodes(prev => [...prev, newNode]);
    setShowNodeModal(false);
  };

  // 노드 삭제
  const deleteNode = (nodeId) => {
    if (nodes.find(n => n.id === nodeId)?.fixed) return;
    setNodes(prev => prev.filter(n => n.id !== nodeId));
    setSelectedNode(null);
  };

  // 역할 추가
  const addRole = (nodeId, roleLabel, mode = 'manual') => {
    setNodes(prev => prev.map(node => {
      if (node.id === nodeId) {
        return {
          ...node,
          roles: [...(node.roles || []), {
            id: `role_${Date.now()}`,
            label: roleLabel,
            mode,
            enabled: true,
          }],
        };
      }
      return node;
    }));
  };

  // 역할 설정 변경
  const updateRole = (nodeId, roleId, updates) => {
    setNodes(prev => prev.map(node => {
      if (node.id === nodeId) {
        return {
          ...node,
          roles: node.roles?.map(role =>
            role.id === roleId ? { ...role, ...updates } : role
          ),
        };
      }
      return node;
    }));
  };

  // 역할 삭제
  const deleteRole = (nodeId, roleId) => {
    setNodes(prev => prev.map(node => {
      if (node.id === nodeId) {
        return {
          ...node,
          roles: node.roles?.filter(r => r.id !== roleId),
        };
      }
      return node;
    }));
    setSelectedRole(null);
  };

  // 총 가치 계산
  const totalValue = nodes.filter(n => n.type === 'producer').reduce((sum, n) => sum + n.value, 0);

  return (
    <div
      ref={containerRef}
      style={styles.container}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* 헤더 */}
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>🎛️ Interactive Node Editor</h1>
          <p style={styles.subtitle}>드래그로 이동 | 클릭으로 설정 | 실시간 가치 흐름</p>
        </div>
        <div style={styles.valueDisplay}>
          <div style={styles.valueLabel}>Total V</div>
          <div style={styles.valueNumber}>{totalValue}</div>
        </div>
      </header>

      {/* 캔버스 */}
      <div style={styles.canvas}>
        {/* 연결선 */}
        <svg style={styles.svgLayer}>
          {connections.map((conn, idx) => (
            <g key={idx}>
              <line
                x1={conn.from.x + 50}
                y1={conn.from.y + 40}
                x2={conn.to.x + 50}
                y2={conn.to.y}
                stroke={`rgba(59, 130, 246, ${0.3 + conn.value / 200})`}
                strokeWidth={2 + conn.value / 20}
                strokeDasharray={conn.value > 50 ? 'none' : '5,5'}
              />
              {/* 가치 흐름 표시 */}
              <circle
                cx={conn.from.x + 50 + (conn.to.x - conn.from.x) * 0.5}
                cy={conn.from.y + 40 + (conn.to.y - conn.from.y - 40) * 0.5}
                r={8}
                fill="#3B82F6"
              />
              <text
                x={conn.from.x + 50 + (conn.to.x - conn.from.x) * 0.5}
                y={conn.from.y + 40 + (conn.to.y - conn.from.y - 40) * 0.5 + 4}
                textAnchor="middle"
                fill="white"
                fontSize="10"
                fontWeight="bold"
              >
                {conn.value}
              </text>
            </g>
          ))}
        </svg>

        {/* 노드들 */}
        {nodes.map(node => (
          <div
            key={node.id}
            style={{
              ...styles.node,
              left: node.x,
              top: node.y,
              borderColor: node.type === 'customer' ? '#10B981' : '#3B82F6',
              backgroundColor: selectedNode?.id === node.id ? '#EFF6FF' : 'white',
              cursor: node.fixed ? 'default' : 'move',
            }}
            onMouseDown={(e) => handleMouseDown(e, node.id)}
            onClick={() => setSelectedNode(node)}
          >
            <div style={styles.nodeEmoji}>{node.emoji}</div>
            <div style={styles.nodeLabel}>{node.label}</div>

            {/* 역할 뱃지 */}
            {node.roles && node.roles.length > 0 && (
              <div style={styles.roleBadges}>
                {node.roles.map(role => (
                  <span
                    key={role.id}
                    style={{
                      ...styles.roleBadge,
                      backgroundColor: ROLE_MODES.find(m => m.id === role.mode)?.color || '#9CA3AF',
                      opacity: role.enabled ? 1 : 0.5,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedRole({ nodeId: node.id, role });
                      setShowRoleModal(true);
                    }}
                  >
                    {role.label}
                  </span>
                ))}
              </div>
            )}

            {/* 가치 표시 */}
            {node.type === 'producer' && (
              <div style={styles.nodeValue}>
                <div style={{
                  ...styles.nodeValueBar,
                  width: `${node.value}%`,
                  backgroundColor: node.value > 70 ? '#10B981' : node.value > 30 ? '#F59E0B' : '#EF4444',
                }} />
              </div>
            )}
          </div>
        ))}

        {/* 노드 추가 버튼 */}
        <button
          style={styles.addButton}
          onClick={() => setShowNodeModal(true)}
        >
          + 노드 추가
        </button>
      </div>

      {/* 노드 설정 패널 */}
      {selectedNode && (
        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <span style={styles.panelEmoji}>{selectedNode.emoji}</span>
            <span style={styles.panelTitle}>{selectedNode.label}</span>
            {!selectedNode.fixed && (
              <button
                style={styles.deleteButton}
                onClick={() => deleteNode(selectedNode.id)}
              >
                삭제
              </button>
            )}
          </div>

          {/* 역할 목록 */}
          <div style={styles.panelSection}>
            <div style={styles.panelSectionTitle}>역할 목록</div>
            {selectedNode.roles?.map(role => (
              <div key={role.id} style={styles.roleItem}>
                <span>{role.label}</span>
                <select
                  value={role.mode}
                  onChange={(e) => updateRole(selectedNode.id, role.id, { mode: e.target.value })}
                  style={styles.modeSelect}
                >
                  {ROLE_MODES.map(mode => (
                    <option key={mode.id} value={mode.id}>{mode.label}</option>
                  ))}
                </select>
                <button
                  style={styles.smallButton}
                  onClick={() => deleteRole(selectedNode.id, role.id)}
                >
                  ×
                </button>
              </div>
            ))}

            {/* 역할 추가 */}
            <div style={styles.addRoleSection}>
              <select
                id="preset-role"
                style={styles.roleSelect}
                defaultValue=""
              >
                <option value="" disabled>프리셋 선택...</option>
                {PRESET_ROLES.map(r => (
                  <option key={r.id} value={r.label}>{r.label}</option>
                ))}
              </select>
              <button
                style={styles.addRoleButton}
                onClick={() => {
                  const select = document.getElementById('preset-role');
                  if (select.value) {
                    addRole(selectedNode.id, select.value);
                    select.value = '';
                  }
                }}
              >
                추가
              </button>
            </div>

            {/* 커스텀 역할 입력 */}
            <div style={styles.customRoleSection}>
              <input
                id="custom-role"
                type="text"
                placeholder="커스텀 역할 입력..."
                style={styles.customInput}
              />
              <button
                style={styles.addRoleButton}
                onClick={() => {
                  const input = document.getElementById('custom-role');
                  if (input.value.trim()) {
                    addRole(selectedNode.id, input.value.trim());
                    input.value = '';
                  }
                }}
              >
                추가
              </button>
            </div>
          </div>

          <button
            style={styles.closeButton}
            onClick={() => setSelectedNode(null)}
          >
            닫기
          </button>
        </div>
      )}

      {/* 노드 추가 모달 */}
      {showNodeModal && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <h3 style={styles.modalTitle}>노드 추가</h3>

            {/* 프리셋 */}
            <div style={styles.modalSection}>
              <div style={styles.modalSectionTitle}>프리셋 선택</div>
              <div style={styles.presetGrid}>
                {[
                  { emoji: '📞', label: '상담사' },
                  { emoji: '📊', label: '분석가' },
                  { emoji: '🛡️', label: '안전관리자' },
                  { emoji: '📢', label: '마케터' },
                ].map(preset => (
                  <button
                    key={preset.label}
                    style={styles.presetButton}
                    onClick={() => addNode(preset.label, preset.emoji)}
                  >
                    <span style={{ fontSize: '24px' }}>{preset.emoji}</span>
                    <span>{preset.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 커스텀 */}
            <div style={styles.modalSection}>
              <div style={styles.modalSectionTitle}>커스텀 입력</div>
              <div style={styles.customNodeInputs}>
                <input
                  id="custom-emoji"
                  type="text"
                  placeholder="이모지"
                  style={{ ...styles.customInput, width: '60px' }}
                  maxLength={2}
                />
                <input
                  id="custom-label"
                  type="text"
                  placeholder="노드 이름"
                  style={{ ...styles.customInput, flex: 1 }}
                />
                <button
                  style={styles.addRoleButton}
                  onClick={() => {
                    const emoji = document.getElementById('custom-emoji').value || '📌';
                    const label = document.getElementById('custom-label').value;
                    if (label.trim()) {
                      addNode(label.trim(), emoji);
                    }
                  }}
                >
                  추가
                </button>
              </div>
            </div>

            <button
              style={styles.closeButton}
              onClick={() => setShowNodeModal(false)}
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* 범례 */}
      <div style={styles.legend}>
        <div style={styles.legendTitle}>역할 모드</div>
        <div style={styles.legendItems}>
          {ROLE_MODES.map(mode => (
            <div key={mode.id} style={styles.legendItem}>
              <span style={{ ...styles.legendDot, backgroundColor: mode.color }} />
              <span>{mode.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================
// 스타일
// ============================================

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#F1F5F9',
    padding: '24px',
    position: 'relative',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 700,
    color: '#1E293B',
    margin: 0,
  },
  subtitle: {
    fontSize: '14px',
    color: '#64748B',
    margin: '4px 0 0 0',
  },
  valueDisplay: {
    backgroundColor: '#1E293B',
    borderRadius: '12px',
    padding: '12px 24px',
    textAlign: 'center',
  },
  valueLabel: {
    fontSize: '12px',
    color: '#94A3B8',
    marginBottom: '4px',
  },
  valueNumber: {
    fontSize: '32px',
    fontWeight: 700,
    color: '#10B981',
  },
  canvas: {
    position: 'relative',
    height: 'calc(100vh - 200px)',
    backgroundColor: 'white',
    borderRadius: '16px',
    border: '2px solid #E2E8F0',
    overflow: 'hidden',
  },
  svgLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
  },
  node: {
    position: 'absolute',
    width: '100px',
    padding: '12px',
    backgroundColor: 'white',
    border: '2px solid',
    borderRadius: '12px',
    textAlign: 'center',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    transition: 'box-shadow 0.2s',
    userSelect: 'none',
  },
  nodeEmoji: {
    fontSize: '32px',
    marginBottom: '4px',
  },
  nodeLabel: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#1E293B',
  },
  roleBadges: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
    marginTop: '8px',
    justifyContent: 'center',
  },
  roleBadge: {
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '10px',
    color: 'white',
    cursor: 'pointer',
  },
  nodeValue: {
    marginTop: '8px',
    height: '4px',
    backgroundColor: '#E2E8F0',
    borderRadius: '2px',
    overflow: 'hidden',
  },
  nodeValueBar: {
    height: '100%',
    transition: 'width 0.3s, background-color 0.3s',
  },
  addButton: {
    position: 'absolute',
    bottom: '20px',
    right: '20px',
    padding: '12px 24px',
    backgroundColor: '#3B82F6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  panel: {
    position: 'fixed',
    right: '24px',
    top: '100px',
    width: '280px',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
    padding: '20px',
    zIndex: 100,
  },
  panelHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '16px',
    paddingBottom: '12px',
    borderBottom: '1px solid #E2E8F0',
  },
  panelEmoji: {
    fontSize: '24px',
  },
  panelTitle: {
    fontSize: '18px',
    fontWeight: 600,
    flex: 1,
  },
  deleteButton: {
    padding: '4px 8px',
    backgroundColor: '#FEE2E2',
    color: '#DC2626',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
  },
  panelSection: {
    marginBottom: '16px',
  },
  panelSectionTitle: {
    fontSize: '12px',
    color: '#64748B',
    marginBottom: '8px',
    textTransform: 'uppercase',
  },
  roleItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px',
    backgroundColor: '#F8FAFC',
    borderRadius: '6px',
    marginBottom: '6px',
    fontSize: '13px',
  },
  modeSelect: {
    marginLeft: 'auto',
    padding: '4px 8px',
    border: '1px solid #E2E8F0',
    borderRadius: '4px',
    fontSize: '12px',
  },
  smallButton: {
    padding: '2px 6px',
    backgroundColor: '#FEE2E2',
    color: '#DC2626',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  addRoleSection: {
    display: 'flex',
    gap: '8px',
    marginTop: '12px',
  },
  roleSelect: {
    flex: 1,
    padding: '8px',
    border: '1px solid #E2E8F0',
    borderRadius: '6px',
    fontSize: '13px',
  },
  addRoleButton: {
    padding: '8px 12px',
    backgroundColor: '#3B82F6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  customRoleSection: {
    display: 'flex',
    gap: '8px',
    marginTop: '8px',
  },
  customInput: {
    flex: 1,
    padding: '8px',
    border: '1px solid #E2E8F0',
    borderRadius: '6px',
    fontSize: '13px',
  },
  closeButton: {
    width: '100%',
    padding: '10px',
    backgroundColor: '#F1F5F9',
    color: '#475569',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
    marginTop: '12px',
  },
  modal: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 200,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '24px',
    width: '400px',
    maxWidth: '90vw',
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: 600,
    marginBottom: '20px',
    margin: '0 0 20px 0',
  },
  modalSection: {
    marginBottom: '20px',
  },
  modalSectionTitle: {
    fontSize: '12px',
    color: '#64748B',
    marginBottom: '12px',
    textTransform: 'uppercase',
  },
  presetGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '8px',
  },
  presetButton: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    padding: '16px',
    backgroundColor: '#F8FAFC',
    border: '2px solid #E2E8F0',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
  },
  customNodeInputs: {
    display: 'flex',
    gap: '8px',
  },
  legend: {
    position: 'fixed',
    bottom: '24px',
    left: '24px',
    backgroundColor: 'white',
    borderRadius: '8px',
    padding: '12px 16px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  legendTitle: {
    fontSize: '11px',
    color: '#64748B',
    marginBottom: '8px',
    textTransform: 'uppercase',
  },
  legendItems: {
    display: 'flex',
    gap: '12px',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '12px',
  },
  legendDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
};
