import React, { useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';

interface Node {
  id: string;
  label: string;
  tier: 'T1' | 'T2' | 'T3' | 'T4' | 'Ghost';
  value: number;
  connections: string[];
  x?: number;
  y?: number;
}

interface NodeMapProps {
  nodes: Node[];
  selectedNodeId?: string;
  onNodeClick?: (nodeId: string) => void;
  width?: number;
  height?: number;
}

const tierColors = {
  T1: { fill: '#FFD700', stroke: '#B8860B', label: '허브' },
  T2: { fill: '#00AAFF', stroke: '#0077B3', label: '커넥터' },
  T3: { fill: '#00CC66', stroke: '#009947', label: '액티브' },
  T4: { fill: '#888888', stroke: '#666666', label: '일반' },
  Ghost: { fill: '#333333', stroke: '#222222', label: '비활성' },
};

/**
 * 노드맵 컴포넌트
 * 네트워크 노드를 SVG로 시각화
 */
export const NodeMap: React.FC<NodeMapProps> = ({
  nodes,
  selectedNodeId,
  onNodeClick,
  width = 600,
  height = 400,
}) => {
  // 노드 위치 계산 (없으면 원형 배치)
  const positionedNodes = useMemo(() => {
    return nodes.map((node, index) => {
      if (node.x !== undefined && node.y !== undefined) {
        return node;
      }
      // 원형 배치
      const angle = (2 * Math.PI * index) / nodes.length;
      const radius = Math.min(width, height) * 0.35;
      return {
        ...node,
        x: width / 2 + radius * Math.cos(angle),
        y: height / 2 + radius * Math.sin(angle),
      };
    });
  }, [nodes, width, height]);

  // 연결선 생성
  const edges = useMemo(() => {
    const result: Array<{ from: Node; to: Node }> = [];
    const nodeMap = new Map(positionedNodes.map((n) => [n.id, n]));

    positionedNodes.forEach((node) => {
      node.connections.forEach((targetId) => {
        const target = nodeMap.get(targetId);
        if (target && node.id < targetId) {
          result.push({ from: node, to: target });
        }
      });
    });

    return result;
  }, [positionedNodes]);

  const getNodeSize = useCallback((tier: string, value: number) => {
    const baseSize = tier === 'T1' ? 24 : tier === 'T2' ? 20 : tier === 'T3' ? 16 : 12;
    return baseSize + Math.min(value / 100, 10);
  }, []);

  return (
    <div className="bg-gray-900/50 rounded-xl border border-gray-700/50 p-4">
      <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
        🗺️ 노드 맵
      </h3>

      {/* 범례 */}
      <div className="flex flex-wrap gap-3 mb-4">
        {Object.entries(tierColors).map(([tier, config]) => (
          <div key={tier} className="flex items-center gap-1 text-xs">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: config.fill }}
            />
            <span className="text-gray-400">
              {tier} ({config.label})
            </span>
          </div>
        ))}
      </div>

      {/* SVG 맵 */}
      <svg width={width} height={height} className="bg-gray-800/50 rounded-lg">
        {/* 연결선 */}
        {edges.map(({ from, to }, index) => (
          <line
            key={`edge-${index}`}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke="#444"
            strokeWidth={1}
            opacity={0.5}
          />
        ))}

        {/* 노드 */}
        {positionedNodes.map((node) => {
          const color = tierColors[node.tier];
          const size = getNodeSize(node.tier, node.value);
          const isSelected = node.id === selectedNodeId;

          return (
            <motion.g
              key={node.id}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              whileHover={{ scale: 1.2 }}
              style={{ cursor: 'pointer' }}
              onClick={() => onNodeClick?.(node.id)}
            >
              {/* 선택 표시 */}
              {isSelected && (
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={size + 6}
                  fill="none"
                  stroke="#fff"
                  strokeWidth={2}
                  strokeDasharray="4 2"
                />
              )}

              {/* 노드 원 */}
              <circle
                cx={node.x}
                cy={node.y}
                r={size}
                fill={color.fill}
                stroke={color.stroke}
                strokeWidth={2}
              />

              {/* 라벨 */}
              <text
                x={node.x}
                y={(node.y || 0) + size + 14}
                textAnchor="middle"
                fill="#ccc"
                fontSize={10}
              >
                {node.label}
              </text>
            </motion.g>
          );
        })}
      </svg>

      {/* 선택된 노드 정보 */}
      {selectedNodeId && (
        <div className="mt-4 p-3 bg-gray-800/50 rounded-lg">
          {(() => {
            const node = positionedNodes.find((n) => n.id === selectedNodeId);
            if (!node) return null;
            return (
              <div className="text-sm">
                <div className="font-medium text-white">{node.label}</div>
                <div className="text-gray-400">
                  티어: {node.tier} | 가치: {node.value.toLocaleString()} |
                  연결: {node.connections.length}개
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export default NodeMap;
