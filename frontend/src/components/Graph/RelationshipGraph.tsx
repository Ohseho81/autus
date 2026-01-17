/**
 * AUTUS 1-12-144 관계 그래프 컴포넌트
 * vis-network 기반 인터랙티브 네트워크 시각화
 * 
 * 기능:
 * - 중심 노드 (CORE) + 1차 연결 (INNER 12명) + 2차 연결 (OUTER 144명)
 * - 실시간 WebSocket 데이터 업데이트
 * - 노드 호버 시 상세 정보 표시
 * - 2D/3D 모드 토글
 */

import { useEffect, useRef, useState, useCallback } from "react";

// vis-network 타입
interface GraphNode {
  id: string | number;
  label: string;
  color?: string;
  size?: number;
  tier?: "CORE" | "INNER" | "OUTER";
  stabilityScore?: number;
  inertiaDebt?: number;
  group?: string;
}

interface GraphEdge {
  from: string | number;
  to: string | number;
  label?: string;
  width?: number;
  color?: string | { color: string; opacity?: number };
  weight?: number;
}

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

interface RelationshipGraphProps {
  data: GraphData;
  mode?: "2d" | "3d";
  onNodeClick?: (nodeId: string | number) => void;
  onNodeHover?: (node: GraphNode | null) => void;
  height?: string;
  className?: string;
}

// 티어별 색상
const TIER_COLORS = {
  CORE: "#FF6B6B",   // 중심 노드 - 빨강
  INNER: "#4ECDC4",  // 1차 연결 - 청록
  OUTER: "#94A3B8",  // 2차 연결 - 회색
};

// vis-network 옵션
const NETWORK_OPTIONS = {
  nodes: {
    shape: "dot",
    size: 16,
    font: {
      size: 12,
      color: "#ffffff",
      face: "Inter, sans-serif",
    },
    borderWidth: 2,
    borderWidthSelected: 4,
    shadow: {
      enabled: true,
      color: "rgba(0, 0, 0, 0.3)",
      size: 10,
      x: 0,
      y: 3,
    },
  },
  edges: {
    width: 2,
    color: {
      color: "rgba(255, 255, 255, 0.4)",
      highlight: "#4ECDC4",
      hover: "#4ECDC4",
    },
    smooth: {
      type: "continuous",
      roundness: 0.5,
    },
    arrows: {
      to: {
        enabled: false,
      },
    },
  },
  physics: {
    enabled: true,
    forceAtlas2Based: {
      gravitationalConstant: -50,
      centralGravity: 0.01,
      springLength: 100,
      springConstant: 0.08,
      damping: 0.4,
      avoidOverlap: 0.5,
    },
    maxVelocity: 50,
    solver: "forceAtlas2Based",
    timestep: 0.35,
    stabilization: {
      enabled: true,
      iterations: 150,
      updateInterval: 25,
    },
  },
  interaction: {
    hover: true,
    tooltipDelay: 200,
    hideEdgesOnDrag: true,
    hideEdgesOnZoom: true,
    navigationButtons: true,
    keyboard: {
      enabled: true,
      bindToWindow: false,
    },
    zoomView: true,
    dragView: true,
  },
  layout: {
    improvedLayout: true,
    hierarchical: false,
  },
};

export function RelationshipGraph({
  data,
  mode = "2d",
  onNodeClick,
  onNodeHover,
  height = "500px",
  className = "",
}: RelationshipGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);

  // 노드 데이터 변환 (티어별 색상 적용)
  const transformNodes = useCallback((nodes: GraphNode[]) => {
    return nodes.map((node) => ({
      ...node,
      color: node.color || TIER_COLORS[node.tier || "OUTER"],
      size: node.tier === "CORE" ? 30 : node.tier === "INNER" ? 20 : 12,
      font: {
        color: "#ffffff",
        size: node.tier === "CORE" ? 14 : 11,
      },
    }));
  }, []);

  // 엣지 데이터 변환
  const transformEdges = useCallback((edges: GraphEdge[]) => {
    return edges.map((edge) => ({
      ...edge,
      width: edge.weight ? edge.weight * 3 : 2,
      color: {
        color: `rgba(255, 255, 255, ${(edge.weight || 0.5) * 0.8})`,
        highlight: "#4ECDC4",
      },
    }));
  }, []);

  // vis-network 초기화
  useEffect(() => {
    if (!containerRef.current) return;
    
    const initNetwork = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // 동적 임포트 (SSR 방지)
        const { Network } = await import("vis-network/standalone");
        const { DataSet } = await import("vis-data/standalone");

        const nodes = new DataSet(transformNodes(data.nodes) as any);
        const edges = new DataSet(transformEdges(data.edges) as any);

        // 네트워크 생성
        networkRef.current = new Network(
          containerRef.current!,
          { nodes, edges },
          NETWORK_OPTIONS as any
        );

        // 이벤트 리스너
        networkRef.current.on("click", (params: any) => {
          if (params.nodes.length > 0) {
            const nodeId = params.nodes[0];
            const node = data.nodes.find((n) => n.id === nodeId);
            onNodeClick?.(nodeId);
          }
        });

        networkRef.current.on("hoverNode", (params: any) => {
          const node = data.nodes.find((n) => n.id === params.node);
          setHoveredNode(node || null);
          onNodeHover?.(node || null);
        });

        networkRef.current.on("blurNode", () => {
          setHoveredNode(null);
          onNodeHover?.(null);
        });

        networkRef.current.once("stabilizationIterationsDone", () => {
          setIsLoading(false);
        });
      } catch (err) {
        console.error("vis-network 초기화 실패:", err);
        setError("그래프 로드 실패");
        setIsLoading(false);
      }
    };

    initNetwork();

    return () => {
      if (networkRef.current) {
        networkRef.current.destroy();
        networkRef.current = null;
      }
    };
  }, [data, transformNodes, transformEdges, onNodeClick, onNodeHover]);

  // 데이터 업데이트 (WebSocket용)
  const updateData = useCallback((newData: GraphData) => {
    if (!networkRef.current) return;

    try {
      const nodes = networkRef.current.body.data.nodes;
      const edges = networkRef.current.body.data.edges;

      // 노드 업데이트
      newData.nodes.forEach((node) => {
        const existing = nodes.get(node.id);
        if (existing) {
          nodes.update(transformNodes([node])[0]);
        } else {
          nodes.add(transformNodes([node])[0]);
        }
      });

      // 엣지 업데이트
      newData.edges.forEach((edge) => {
        edges.update(transformEdges([edge])[0]);
      });
    } catch (err) {
      console.error("그래프 업데이트 실패:", err);
    }
  }, [transformNodes, transformEdges]);

  // 줌 리셋
  const resetZoom = useCallback(() => {
    if (networkRef.current) {
      networkRef.current.fit({
        animation: {
          duration: 500,
          easingFunction: "easeInOutQuad",
        },
      });
    }
  }, []);

  return (
    <div className={`relative ${className}`}>
      {/* 로딩 오버레이 */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-10 rounded-xl">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
            <span className="text-sm text-white/70">그래프 생성 중...</span>
          </div>
        </div>
      )}

      {/* 에러 표시 */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-900/20 z-10 rounded-xl">
          <span className="text-red-400">{error}</span>
        </div>
      )}

      {/* 그래프 컨테이너 */}
      <div
        ref={containerRef}
        style={{ height }}
        className="w-full rounded-xl bg-black/40 border border-white/10"
      />

      {/* 호버 정보 패널 */}
      {hoveredNode && (
        <div className="absolute top-4 right-4 p-4 bg-black/80 backdrop-blur-xl border border-white/20 rounded-xl z-20 min-w-[200px]">
          <h4 className="font-semibold text-white mb-2">{hoveredNode.label}</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-white/60">계층</span>
              <span
                className="px-2 py-0.5 rounded text-xs"
                style={{ backgroundColor: TIER_COLORS[hoveredNode.tier || "OUTER"] }}
              >
                {hoveredNode.tier || "OUTER"}
              </span>
            </div>
            {hoveredNode.stabilityScore !== undefined && (
              <div className="flex justify-between">
                <span className="text-white/60">안정성</span>
                <span className="text-cyan-400">
                  {(hoveredNode.stabilityScore * 100).toFixed(0)}%
                </span>
              </div>
            )}
            {hoveredNode.inertiaDebt !== undefined && (
              <div className="flex justify-between">
                <span className="text-white/60">관성부채</span>
                <span className="text-orange-400">
                  {(hoveredNode.inertiaDebt * 100).toFixed(0)}%
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 컨트롤 버튼 */}
      <div className="absolute bottom-4 left-4 flex gap-2 z-20">
        <button
          onClick={resetZoom}
          className="px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm text-white transition-colors"
        >
          리셋
        </button>
      </div>

      {/* 범례 */}
      <div className="absolute bottom-4 right-4 flex gap-4 text-xs z-20">
        {Object.entries(TIER_COLORS).map(([tier, color]) => (
          <div key={tier} className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="text-white/60">{tier}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// 샘플 데이터 생성 유틸리티
export function generateSampleGraphData(centerUserId: string = "user_001"): GraphData {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  // 중심 노드
  nodes.push({
    id: centerUserId,
    label: "You",
    tier: "CORE",
    stabilityScore: 0.82,
    inertiaDebt: 0.35,
  });

  // 1차 연결 (12명)
  const innerNames = [
    "Juan", "Maria", "Kim", "Pedro", "Alex",
    "Liza", "Park", "Tanaka", "Carlo", "Lee",
    "Ana", "Choi"
  ];

  innerNames.forEach((name, i) => {
    const nodeId = `inner_${i}`;
    nodes.push({
      id: nodeId,
      label: name,
      tier: "INNER",
      stabilityScore: 0.5 + Math.random() * 0.4,
      inertiaDebt: Math.random() * 0.3,
    });

    edges.push({
      from: centerUserId,
      to: nodeId,
      weight: 0.6 + Math.random() * 0.4,
    });
  });

  // 2차 연결 (각 inner당 12명)
  innerNames.forEach((_, innerIdx) => {
    const innerId = `inner_${innerIdx}`;
    const outerCount = Math.floor(8 + Math.random() * 4); // 8~12명

    for (let j = 0; j < outerCount; j++) {
      const outerId = `outer_${innerIdx}_${j}`;
      nodes.push({
        id: outerId,
        label: `C${innerIdx}-${j}`,
        tier: "OUTER",
        stabilityScore: 0.3 + Math.random() * 0.4,
        inertiaDebt: Math.random() * 0.2,
      });

      edges.push({
        from: innerId,
        to: outerId,
        weight: 0.3 + Math.random() * 0.4,
      });
    }
  });

  return { nodes, edges };
}

export default RelationshipGraph;
