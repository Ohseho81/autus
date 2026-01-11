// ═══════════════════════════════════════════════════════════════════════════
// Clusters Hook - 클러스터/섹터 데이터 로드
// ═══════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import type { MapViewState } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface Cluster {
  id: string;
  name: string;
  polygon: number[][];
  center: [number, number];
  color: [number, number, number, number];
  border_color: [number, number, number, number];
  active: boolean;
  stats: {
    node_count: number;
    total_value: number;
    avg_ki: number;
  };
}

interface UseClustersResult {
  clusters: Cluster[];
  loading: boolean;
  error: string | null;
  currentLevel: string;
  parentSector: string;
  selectedCluster: Cluster | null;
  selectCluster: (id: string | null) => void;
  refresh: () => void;
}

/**
 * 클러스터 데이터 로드 훅
 */
export function useClusters(viewState: MapViewState): UseClustersResult {
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentLevel, setCurrentLevel] = useState('L0');
  const [parentSector, setParentSector] = useState('global');
  const [selectedCluster, setSelectedCluster] = useState<Cluster | null>(null);
  
  const lastFetchRef = useRef<string>('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 뷰포트 bounds 계산
  const calculateBounds = useCallback((vs: MapViewState) => {
    const latRange = 180 / Math.pow(2, vs.zoom);
    const lngRange = 360 / Math.pow(2, vs.zoom);
    return {
      sw_lat: vs.latitude - latRange / 2,
      sw_lng: vs.longitude - lngRange / 2,
      ne_lat: vs.latitude + latRange / 2,
      ne_lng: vs.longitude + lngRange / 2,
    };
  }, []);

  // 클러스터 데이터 로드
  const fetchClusters = useCallback(async () => {
    const bounds = calculateBounds(viewState);
    const fetchKey = `${viewState.zoom.toFixed(0)}-${bounds.sw_lat.toFixed(1)}-${bounds.ne_lat.toFixed(1)}`;
    
    if (fetchKey === lastFetchRef.current) return;
    lastFetchRef.current = fetchKey;

    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`${API_BASE}/api/viewport/clusters`, {
        params: {
          zoom: viewState.zoom,
          ...bounds,
        },
      });

      const data = response.data;
      setClusters(data.clusters || []);
      setCurrentLevel(data.level);
      setParentSector(data.parent_sector);
    } catch (err) {
      console.error('Failed to fetch clusters:', err);
      setError('클러스터 로드 실패');
      setClusters([]);
    } finally {
      setLoading(false);
    }
  }, [viewState.zoom, viewState.latitude, viewState.longitude, calculateBounds]);

  // 디바운스된 데이터 로드
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      fetchClusters();
    }, 200);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [fetchClusters]);

  // 클러스터 선택
  const selectCluster = useCallback((id: string | null) => {
    if (!id) {
      setSelectedCluster(null);
      return;
    }
    const cluster = clusters.find(c => c.id === id);
    setSelectedCluster(cluster || null);
  }, [clusters]);

  return {
    clusters,
    loading,
    error,
    currentLevel,
    parentSector,
    selectedCluster,
    selectCluster,
    refresh: fetchClusters,
  };
}

export default useClusters;
