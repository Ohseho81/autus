import React, { useMemo, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

interface CausalNode {
  id: string;
  label: string;
  type: 'cause' | 'effect' | 'mediator';
  weight?: number;
}

interface CausalEdge {
  source: string;
  target: string;
  strength: number; // -1 to 1
  label?: string;
}

interface CausalGraphProps {
  nodes: CausalNode[];
  edges: CausalEdge[];
  width?: number;
  height?: number;
  onNodeClick?: (nodeId: string) => void;
}

const nodeTypeStyles = {
  cause: { color: '#3B82F6', label: '원인' },
  effect: { color: '#10B981', label: '결과' },
  mediator: { color: '#F59E0B', label: '매개' },
};

/**
 * 인과관계 그래프 컴포넌트
 * 원인-결과 관계를 시각화
 */
export const CausalGraph: React.FC<CausalGraphProps> = ({
  nodes,
  edges,
  width = 600,
  height = 400,
  onNodeClick,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  // 노드 위치 계산 (계층형 배치)
  const layoutNodes = useMemo(() => {
    const causes = nodes.filter((n) => n.type === 'cause');
    const mediators = nodes.filter((n) => n.type === 'mediator');
    const effects = nodes.filter((n) => n.type === 'effect');

    const layerX = {
      cause: width * 0.15,
      mediator: width * 0.5,
      effect: width * 0.85,
    };

    const positionLayer = (layer: CausalNode[], x: number) => {
      return layer.map((node, i) => ({
        ...node,
        x,
        y: (height / (layer.length + 1)) * (i + 1),
      }));
    };

    return [
      ...positionLayer(causes, layerX.cause),
      ...positionLayer(mediators, layerX.mediator),
      ...positionLayer(effects, layerX.effect),
    ];
  }, [nodes, width, height]);

  const nodeMap = useMemo(() => {
    return new Map(layoutNodes.map((n) => [n.id, n]));
  }, [layoutNodes]);

  // 엣지 경로 생성
  const createEdgePath = (source: typeof layoutNodes[0], target: typeof layoutNodes[0]) => {
    const midX = (source.x + target.x) / 2;
    return `M ${source.x} ${source.y} C ${midX} ${source.y}, ${midX} ${target.y}, ${target.x} ${target.y}`;
  };

  return (
    <div className="bg-gray-900/50 rounded-xl border border-gray-700/50 p-4">
      <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
        🔗 인과관계 그래프
      </h3>

      {/* 범례 */}
      <div className="flex gap-4 mb-4">
        {Object.entries(nodeTypeStyles).map(([type, style]) => (
          <div key={type} className="flex items-center gap-2 text-xs">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: style.color }}
            />
            <span className="text-gray-400">{style.label}</span>
          </div>
        ))}
        <div className="flex items-center gap-2 text-xs ml-4">
          <div className="w-8 h-0.5 bg-green-500" />
          <span className="text-gray-400">양의 관계</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="w-8 h-0.5 bg-red-500" style={{ borderStyle: 'dashed' }} />
          <span className="text-gray-400">음의 관계</span>
        </div>
      </div>

      <svg ref={svgRef} width={width} height={height} className="bg-gray-800/30 rounded-lg">
        <defs>
          {/* 화살표 마커 */}
          <marker
            id="arrow-positive"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#10B981" />
          </marker>
          <marker
            id="arrow-negative"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#EF4444" />
          </marker>
        </defs>

        {/* 엣지 */}
        {edges.map((edge, i) => {
          const source = nodeMap.get(edge.source);
          const target = nodeMap.get(edge.target);
          if (!source || !target) return null;

          const isPositive = edge.strength > 0;
          const strokeWidth = Math.abs(edge.strength) * 3 + 1;

          return (
            <g key={`edge-${i}`}>
              <motion.path
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                d={createEdgePath(source, target)}
                fill="none"
                stroke={isPositive ? '#10B981' : '#EF4444'}
                strokeWidth={strokeWidth}
                strokeDasharray={isPositive ? 'none' : '5,5'}
                markerEnd={`url(#arrow-${isPositive ? 'positive' : 'negative'})`}
                opacity={0.7}
              />
              {edge.label && (
                <text
                  x={(source.x + target.x) / 2}
                  y={(source.y + target.y) / 2 - 10}
                  textAnchor="middle"
                  fill="#9CA3AF"
                  fontSize={10}
                >
                  {edge.label}
                </text>
              )}
            </g>
          );
        })}

        {/* 노드 */}
        {layoutNodes.map((node) => {
          const style = nodeTypeStyles[node.type];
          const size = 20 + (node.weight || 0) * 10;

          return (
            <motion.g
              key={node.id}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              whileHover={{ scale: 1.15 }}
              onClick={() => onNodeClick?.(node.id)}
              style={{ cursor: 'pointer' }}
            >
              {/* 노드 원 */}
              <circle
                cx={node.x}
                cy={node.y}
                r={size}
                fill={style.color}
                fillOpacity={0.8}
                stroke={style.color}
                strokeWidth={2}
              />
              {/* 노드 라벨 */}
              <text
                x={node.x}
                y={node.y + size + 15}
                textAnchor="middle"
                fill="#D1D5DB"
                fontSize={11}
                fontWeight={500}
              >
                {node.label}
              </text>
            </motion.g>
          );
        })}
      </svg>
    </div>
  );
};

export default CausalGraph;
