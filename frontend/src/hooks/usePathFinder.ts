// ═══════════════════════════════════════════════════════════════════════════
// AUTUS PathFinder Hook
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Position {
  lat: number;
  lng: number;
}

interface PathNode {
  id: string;
  name: string;
  position: Position;
  value: number;
  type: string;
}

interface PathEdge {
  from_node: string;
  to_node: string;
  weight: number;
  flow_volume: number;
  flow_type: string;
}

interface ShortestPathResult {
  path: PathNode[];
  edges: PathEdge[];
  total_distance: number;
  total_flow: number;
  bottlenecks: string[];
  estimated_time: number;
  path_ids: string[];
}

interface AlternativePath {
  path: string[];
  total_weight: number;
  via: string;
  nodes: string[];
  length: number;
}

interface NetworkStats {
  total_nodes: number;
  total_edges: number;
  total_flow_volume: number;
  average_edge_weight: number;
  hub_nodes: { id: string; name: string; connections: number }[];
  density: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function usePathFinder() {
  const [nodes, setNodes] = useState<PathNode[]>([]);
  const [edges, setEdges] = useState<PathEdge[]>([]);
  const [fromNode, setFromNode] = useState<string>('');
  const [toNode, setToNode] = useState<string>('');
  const [shortestPath, setShortestPath] = useState<ShortestPathResult | null>(null);
  const [alternatives, setAlternatives] = useState<AlternativePath[]>([]);
  const [networkStats, setNetworkStats] = useState<NetworkStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 노드 목록 로드
  useEffect(() => {
    const fetchNodes = async () => {
      try {
        const [nodesRes, edgesRes, statsRes] = await Promise.all([
          axios.get(`${API_BASE}/api/pathfinder/nodes`),
          axios.get(`${API_BASE}/api/pathfinder/edges`),
          axios.get(`${API_BASE}/api/pathfinder/network-stats`),
        ]);
        
        setNodes(nodesRes.data.nodes);
        setEdges(edgesRes.data.edges);
        setNetworkStats(statsRes.data);
      } catch (err) {
        console.error('Failed to fetch pathfinder data:', err);
        // 기본 데이터 설정
        setNodes([
          { id: "node_01", name: "대치동 농구", position: { lat: 37.4947, lng: 127.0573 }, value: 12500000, type: "sports" },
          { id: "node_02", name: "삼성동 PT", position: { lat: 37.5088, lng: 127.0632 }, value: 8700000, type: "fitness" },
          { id: "node_03", name: "역삼동 필라테스", position: { lat: 37.4995, lng: 127.0365 }, value: 6300000, type: "fitness" },
          { id: "node_04", name: "청담동 요가", position: { lat: 37.5198, lng: 127.0474 }, value: 5100000, type: "wellness" },
          { id: "node_05", name: "논현동 크로스핏", position: { lat: 37.5108, lng: 127.0252 }, value: 4200000, type: "fitness" },
        ]);
      }
    };
    
    fetchNodes();
  }, []);

  // 최단 경로 찾기
  const findPath = useCallback(async (from: string, to: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const res = await axios.get(`${API_BASE}/api/pathfinder/shortest`, {
        params: { from_node: from, to_node: to },
      });
      setShortestPath(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to find path');
      setShortestPath(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // 대안 경로 찾기
  const findAlternatives = useCallback(async (from: string, to: string) => {
    try {
      const res = await axios.get(`${API_BASE}/api/pathfinder/alternatives`, {
        params: { from_node: from, to_node: to, max_paths: 5 },
      });
      setAlternatives(res.data.alternatives || []);
    } catch (err) {
      setAlternatives([]);
    }
  }, []);

  // 노드 교환
  const swapNodes = useCallback(() => {
    const temp = fromNode;
    setFromNode(toNode);
    setToNode(temp);
  }, [fromNode, toNode]);

  // 초기화
  const reset = useCallback(() => {
    setFromNode('');
    setToNode('');
    setShortestPath(null);
    setAlternatives([]);
    setError(null);
  }, []);

  return {
    nodes,
    edges,
    fromNode,
    toNode,
    setFromNode,
    setToNode,
    shortestPath,
    alternatives,
    networkStats,
    loading,
    error,
    findPath,
    findAlternatives,
    swapNodes,
    reset,
  };
}

export default usePathFinder;
