// ═══════════════════════════════════════════════════════════════════════════
// Map Data Hook - 지도 데이터 로드 (뷰포트 기반)
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import axios from 'axios';
import { scaleApi, flowApi } from '../api/client';
import type { ScaleNode, Flow, ScaleLevel, MapViewState } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ═══════════════════════════════════════════════════════════════════════════
// Mock 데이터 (백엔드 없이도 데모 가능) - M2C 기반 경제 모델 포함
// ═══════════════════════════════════════════════════════════════════════════
const MOCK_NODES: ScaleNode[] = [
  // L0: Global Nodes - M2C Ratio가 높을수록 효율적
  { id: 'USA', name: 'United States', lat: 38.0, lng: -97.0, value: 25e12, ki_score: 0.95, rank: 'Sovereign', type: 'nation', sector: 'Americas', active: true, m2c: 2.4, roi: 85 },
  { id: 'CHN', name: 'China', lat: 35.0, lng: 105.0, value: 18e12, ki_score: 0.92, rank: 'Sovereign', type: 'nation', sector: 'Asia', active: true, m2c: 2.1, roi: 72 },
  { id: 'JPN', name: 'Japan', lat: 36.0, lng: 138.0, value: 4.9e12, ki_score: 0.85, rank: 'Archon', type: 'nation', sector: 'Asia', active: true, m2c: 1.9, roi: 65 },
  { id: 'DEU', name: 'Germany', lat: 51.0, lng: 10.0, value: 4.3e12, ki_score: 0.82, rank: 'Archon', type: 'nation', sector: 'Europe', active: true, m2c: 1.8, roi: 58 },
  { id: 'GBR', name: 'United Kingdom', lat: 54.0, lng: -2.0, value: 3.1e12, ki_score: 0.78, rank: 'Archon', type: 'nation', sector: 'Europe', active: true, m2c: 1.6, roi: 52 },
  { id: 'FRA', name: 'France', lat: 46.0, lng: 2.0, value: 2.9e12, ki_score: 0.75, rank: 'Validator', type: 'nation', sector: 'Europe', active: true, m2c: 1.5, roi: 45 },
  { id: 'KOR', name: 'South Korea', lat: 36.5, lng: 127.5, value: 1.8e12, ki_score: 0.72, rank: 'Validator', type: 'nation', sector: 'Asia', active: true, m2c: 2.2, roi: 78 },
  { id: 'IND', name: 'India', lat: 20.0, lng: 77.0, value: 3.5e12, ki_score: 0.70, rank: 'Validator', type: 'nation', sector: 'Asia', active: true, m2c: 1.3, roi: 38 },
  { id: 'BRA', name: 'Brazil', lat: -14.0, lng: -51.0, value: 2.1e12, ki_score: 0.65, rank: 'Operator', type: 'nation', sector: 'Americas', active: true, m2c: 1.1, roi: 28 },
  { id: 'RUS', name: 'Russia', lat: 60.0, lng: 100.0, value: 1.8e12, ki_score: 0.60, rank: 'Operator', type: 'nation', sector: 'Europe', active: true, m2c: 0.9, roi: 15 },
  { id: 'AUS', name: 'Australia', lat: -25.0, lng: 135.0, value: 1.6e12, ki_score: 0.58, rank: 'Operator', type: 'nation', sector: 'Oceania', active: true, m2c: 1.7, roi: 55 },
  { id: 'CAN', name: 'Canada', lat: 56.0, lng: -106.0, value: 2.0e12, ki_score: 0.62, rank: 'Operator', type: 'nation', sector: 'Americas', active: true, m2c: 1.4, roi: 42 },
];

const MOCK_FLOWS: Flow[] = [
  { id: 'f1', source_id: 'USA', target_id: 'CHN', source_lat: 38.0, source_lng: -97.0, target_lat: 35.0, target_lng: 105.0, amount: 150000000000, type: 'trade', active: true },
  { id: 'f2', source_id: 'CHN', target_id: 'USA', source_lat: 35.0, source_lng: 105.0, target_lat: 38.0, target_lng: -97.0, amount: 120000000000, type: 'trade', active: true },
  { id: 'f3', source_id: 'USA', target_id: 'DEU', source_lat: 38.0, source_lng: -97.0, target_lat: 51.0, target_lng: 10.0, amount: 85000000000, type: 'trade', active: true },
  { id: 'f4', source_id: 'DEU', target_id: 'CHN', source_lat: 51.0, source_lng: 10.0, target_lat: 35.0, target_lng: 105.0, amount: 95000000000, type: 'trade', active: true },
  { id: 'f5', source_id: 'JPN', target_id: 'USA', source_lat: 36.0, source_lng: 138.0, target_lat: 38.0, target_lng: -97.0, amount: 75000000000, type: 'trade', active: true },
  { id: 'f6', source_id: 'KOR', target_id: 'CHN', source_lat: 36.5, source_lng: 127.5, target_lat: 35.0, target_lng: 105.0, amount: 60000000000, type: 'trade', active: true },
  { id: 'f7', source_id: 'GBR', target_id: 'USA', source_lat: 54.0, source_lng: -2.0, target_lat: 38.0, target_lng: -97.0, amount: 55000000000, type: 'trade', active: true },
  { id: 'f8', source_id: 'FRA', target_id: 'DEU', source_lat: 46.0, source_lng: 2.0, target_lat: 51.0, target_lng: 10.0, amount: 45000000000, type: 'trade', active: true },
  { id: 'f9', source_id: 'IND', target_id: 'USA', source_lat: 20.0, source_lng: 77.0, target_lat: 38.0, target_lng: -97.0, amount: 40000000000, type: 'trade', active: true },
  { id: 'f10', source_id: 'AUS', target_id: 'CHN', source_lat: -25.0, source_lng: 135.0, target_lat: 35.0, target_lng: 105.0, amount: 35000000000, type: 'trade', active: true },
  { id: 'f11', source_id: 'BRA', target_id: 'CHN', source_lat: -14.0, source_lng: -51.0, target_lat: 35.0, target_lng: 105.0, amount: 30000000000, type: 'trade', active: true },
  { id: 'f12', source_id: 'CAN', target_id: 'USA', source_lat: 56.0, source_lng: -106.0, target_lat: 38.0, target_lng: -97.0, amount: 65000000000, type: 'trade', active: true },
];

interface UseMapDataResult {
  nodes: ScaleNode[];
  flows: Flow[];
  activeNodes: ScaleNode[];
  activeFlows: Flow[];
  loading: boolean;
  error: string | null;
  currentLevel: string;
  stats: {
    totalNodes: number;
    activeNodes: number;
    totalFlows: number;
    activeFlows: number;
  };
  refresh: () => void;
}

/**
 * 지도 데이터 로드 훅 (뷰포트 기반 활성화)
 */
export function useMapData(level: ScaleLevel, viewState: MapViewState): UseMapDataResult {
  // 바로 Mock 데이터로 초기화 (API 없이도 즉시 표시)
  const [nodes, setNodes] = useState<ScaleNode[]>(MOCK_NODES);
  const [flows, setFlows] = useState<Flow[]>(MOCK_FLOWS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentLevel, setCurrentLevel] = useState<string>('L0');
  
  const lastFetchRef = useRef<string>('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 뷰포트 기반 데이터 로드
  const fetchViewportData = useCallback(async () => {
    const bounds = calculateBounds(viewState);
    
    // 중복 요청 방지 (소수점 1자리까지만 비교)
    const fetchKey = `${viewState.zoom.toFixed(1)}-${bounds.join(',')}`;
    if (fetchKey === lastFetchRef.current) return;
    lastFetchRef.current = fetchKey;

    setLoading(true);
    setError(null);

    try {
      // Viewport API 호출
      const response = await axios.get(`${API_BASE}/api/viewport/data`, {
        params: {
          zoom: viewState.zoom,
          sw_lat: bounds[0],
          sw_lng: bounds[1],
          ne_lat: bounds[2],
          ne_lng: bounds[3],
        },
      });

      const data = response.data;
      
      // 노드 데이터 변환
      const transformedNodes: ScaleNode[] = data.nodes.data.map((n: any) => ({
        id: n.id,
        name: n.name,
        lat: n.lat,
        lng: n.lng,
        value: n.value,
        ki_score: n.ki_score || n.ki,
        rank: n.rank,
        type: n.type,
        sector: n.sector,
        active: n.active,
      }));

      // Flow 데이터 변환
      const transformedFlows: Flow[] = data.motions.data.map((m: any) => ({
        id: m.id,
        source_id: m.source_id,
        target_id: m.target_id,
        source_lat: m.source_lat,
        source_lng: m.source_lng,
        target_lat: m.target_lat,
        target_lng: m.target_lng,
        amount: m.amount,
        type: m.flow_type,
        active: m.active,
      }));

      setNodes(transformedNodes);
      setFlows(transformedFlows);
      setCurrentLevel(data.level);
    } catch (err) {
      console.error('Failed to fetch viewport data:', err);
      // 폴백: Mock 데이터 사용
      await fallbackToMock(viewState);
    } finally {
      setLoading(false);
    }
  }, [level, viewState.zoom, viewState.latitude, viewState.longitude]);

  // Mock 데이터 폴백 - 항상 모든 노드를 active로 설정
  const fallbackToMock = useCallback(async (viewState: MapViewState) => {
    console.log('🔄 Using mock data - 12 nodes, 12 flows');
    
    // 모든 노드를 active로 설정 (줌 레벨에 상관없이)
    const nodesWithActive = MOCK_NODES.map(n => ({
      ...n,
      active: true,  // 항상 활성화
    }));
    
    // 모든 플로우도 active로 설정
    const flowsWithActive = MOCK_FLOWS.map(f => ({
      ...f,
      active: true,  // 항상 활성화
    }));
    
    console.log(`📊 Loaded: ${nodesWithActive.length} nodes, ${flowsWithActive.length} flows`);
    
    setNodes(nodesWithActive);
    setFlows(flowsWithActive);
    setCurrentLevel(viewState.zoom < 4 ? 'L0' : viewState.zoom < 7 ? 'L1' : 'L2');
  }, []);

  // 폴백 데이터 로드 (기존 API)
  const fallbackFetch = async (level: ScaleLevel, viewState: MapViewState) => {
    try {
      const bounds = calculateBounds(viewState);
      const [nodesData, flowsData] = await Promise.all([
        scaleApi.getNodesAtLevel(level, bounds).catch(() => []),
        flowApi.getFlowsForLevel(level).catch(() => []),
      ]);

      // API 응답이 비어있으면 Mock 데이터 사용
      if (!nodesData.length) {
        await fallbackToMock(viewState);
        return;
      }

      const enrichedFlows = enrichFlowsWithCoordinates(flowsData, nodesData);
      
      // active 플래그 추가
      const nodesWithActive = nodesData.map(n => ({
        ...n,
        active: isInViewport(n.lat, n.lng, bounds),
      }));

      setNodes(nodesWithActive);
      setFlows(enrichedFlows.map(f => ({ ...f, active: true })));
    } catch (err) {
      // 에러 시 Mock 데이터 사용
      await fallbackToMock(viewState);
    }
  };

  // 초기 로드 시 바로 Mock 데이터 사용 (빠른 렌더링)
  useEffect(() => {
    // 첫 로드 시에만 Mock 데이터 설정
    if (nodes.length === 0 || nodes === MOCK_NODES) {
      console.log('🚀 Initial load: Using mock data immediately');
      fallbackToMock(viewState);
    }
  }, []); // 최초 1회만 실행

  // 디바운스된 데이터 로드 (API 사용 가능 시)
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      // API가 있으면 시도, 없으면 Mock 유지
      fetchViewportData();
    }, 300); // 300ms 디바운스

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [fetchViewportData]);

  // 활성 노드/플로우 필터링
  const activeNodes = useMemo(() => 
    nodes.filter(n => n.active !== false), 
    [nodes]
  );

  const activeFlows = useMemo(() => 
    flows.filter(f => f.active !== false),
    [flows]
  );

  // 통계
  const stats = useMemo(() => ({
    totalNodes: nodes.length,
    activeNodes: activeNodes.length,
    totalFlows: flows.length,
    activeFlows: activeFlows.length,
  }), [nodes, flows, activeNodes, activeFlows]);

  return { 
    nodes, 
    flows,
    activeNodes,
    activeFlows,
    loading, 
    error,
    currentLevel,
    stats,
    refresh: fetchViewportData,
  };
}

/**
 * 뷰포트 내 여부 확인
 */
function isInViewport(lat: number, lng: number, bounds: number[]): boolean {
  return (
    lat >= bounds[0] && lat <= bounds[2] &&
    lng >= bounds[1] && lng <= bounds[3]
  );
}

/**
 * 뷰포트 bounds 계산
 */
function calculateBounds(viewState: MapViewState): number[] {
  // 줌 레벨에 따른 범위 계산
  const latRange = 180 / Math.pow(2, viewState.zoom);
  const lngRange = 360 / Math.pow(2, viewState.zoom);

  return [
    viewState.latitude - latRange / 2,  // sw_lat
    viewState.longitude - lngRange / 2, // sw_lng
    viewState.latitude + latRange / 2,  // ne_lat
    viewState.longitude + lngRange / 2, // ne_lng
  ];
}

/**
 * Flow에 좌표 정보 추가
 */
function enrichFlowsWithCoordinates(flows: Flow[], nodes: ScaleNode[]): Flow[] {
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  return flows.map(flow => {
    const source = nodeMap.get(flow.source_id);
    const target = nodeMap.get(flow.target_id);

    return {
      ...flow,
      source_lat: source?.lat ?? flow.source_lat ?? 0,
      source_lng: source?.lng ?? flow.source_lng ?? 0,
      target_lat: target?.lat ?? flow.target_lat ?? 0,
      target_lng: target?.lng ?? flow.target_lng ?? 0,
    };
  }).filter(f => f.source_lat !== 0 && f.target_lat !== 0);
}

/**
 * 특정 노드의 상세 데이터 로드
 */
export function useNodeDetails(nodeId: string | null) {
  const [children, setChildren] = useState<ScaleNode[]>([]);
  const [parent, setParent] = useState<ScaleNode | null>(null);
  const [flows, setFlows] = useState<{ inflows: Flow[]; outflows: Flow[] }>({ 
    inflows: [], 
    outflows: [] 
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!nodeId) {
      setChildren([]);
      setParent(null);
      setFlows({ inflows: [], outflows: [] });
      return;
    }

    const fetchDetails = async () => {
      setLoading(true);
      try {
        const [childrenData, parentData, flowsData] = await Promise.all([
          scaleApi.getChildren(nodeId).catch(() => []),
          scaleApi.getParent(nodeId).catch(() => null),
          flowApi.getNodeFlows(nodeId).catch(() => ({ inflows: [], outflows: [] })),
        ]);

        setChildren(childrenData);
        setParent(parentData);
        setFlows(flowsData);
      } catch (err) {
        console.error('Failed to fetch node details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [nodeId]);

  return { children, parent, flows, loading };
}

