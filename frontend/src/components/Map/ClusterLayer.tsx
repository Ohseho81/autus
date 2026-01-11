// ═══════════════════════════════════════════════════════════════════════════
// Cluster Layer - 클러스터/섹터 경계 시각화
// ═══════════════════════════════════════════════════════════════════════════

import React, { useMemo } from 'react';
import { PolygonLayer, TextLayer } from '@deck.gl/layers';
import type { Cluster } from '../../hooks/useClusters';

interface Props {
  clusters: Cluster[];
  selectedClusterId: string | null;
  onClusterClick?: (cluster: Cluster) => void;
  showLabels?: boolean;
  showStats?: boolean;
}

/**
 * 클러스터 경계 레이어 생성
 */
export function useClusterLayers({
  clusters,
  selectedClusterId,
  onClusterClick,
  showLabels = true,
  showStats = true,
}: Props) {
  // 안전한 클러스터 데이터 (빈 배열이면 빈 배열 사용)
  const safeData = clusters && clusters.length > 0 ? clusters : [];

  // 폴리곤 레이어 (경계)
  const polygonLayer = useMemo(() => {
    if (safeData.length === 0) return null;
    
    return new PolygonLayer({
    id: 'cluster-boundaries',
    data: safeData,
    pickable: true,
    stroked: true,
    filled: true,
    extruded: false,
    wireframe: true,
    lineWidthMinPixels: 2,
    getPolygon: (d: Cluster) => {
      // [lat, lng] -> [lng, lat] 변환 및 폴리곤 닫기
      const coords = d.polygon.map(p => [p[1], p[0]]);
      if (coords.length > 0) {
        coords.push(coords[0]); // 폴리곤 닫기
      }
      return coords;
    },
    getFillColor: (d: Cluster) => {
      const color = d.color || [100, 100, 100, 40];
      // 선택된 클러스터는 더 밝게
      if (d.id === selectedClusterId) {
        return [color[0], color[1], color[2], Math.min(255, color[3] * 2)] as [number, number, number, number];
      }
      return color as [number, number, number, number];
    },
    getLineColor: (d: Cluster) => {
      const color = d.border_color || [150, 150, 150, 150];
      if (d.id === selectedClusterId) {
        return [255, 255, 255, 255] as [number, number, number, number];
      }
      return color as [number, number, number, number];
    },
    getLineWidth: (d: Cluster) => d.id === selectedClusterId ? 3 : 1,
    onClick: ({ object }) => object && onClusterClick?.(object),
    updateTriggers: {
      getFillColor: [selectedClusterId],
      getLineColor: [selectedClusterId],
      getLineWidth: [selectedClusterId],
    },
  });
  }, [safeData, selectedClusterId, onClusterClick]);

  // 텍스트 레이어 (라벨)
  const labelLayer = useMemo(() => {
    if (!showLabels || safeData.length === 0) return null;
    
    return new TextLayer({
      id: 'cluster-labels',
      data: safeData,
      pickable: false,
      getPosition: (d: Cluster) => [d.center[1], d.center[0], 0], // [lng, lat, altitude]
      getText: (d: Cluster) => d.name,
      getSize: (d: Cluster) => d.id === selectedClusterId ? 16 : 14,
      getColor: (d: Cluster) => {
        if (d.id === selectedClusterId) {
          return [255, 255, 255, 255];
        }
        return [200, 200, 200, 200];
      },
      getTextAnchor: 'middle',
      getAlignmentBaseline: 'center',
      fontFamily: 'Arial, sans-serif',
      fontWeight: 'bold',
      outlineWidth: 2,
      outlineColor: [0, 0, 0, 200],
      updateTriggers: {
        getSize: [selectedClusterId],
        getColor: [selectedClusterId],
      },
    });
  }, [safeData, selectedClusterId, showLabels]);

  // 통계 레이어 (노드 수 표시)
  const statsLayer = useMemo(() => {
    if (!showStats || safeData.length === 0) return null;
    
    return new TextLayer({
      id: 'cluster-stats',
      data: safeData,
      pickable: false,
      getPosition: (d: Cluster) => [d.center[1], d.center[0] - 0.02, 0],
      getText: (d: Cluster) => {
        const value = d.stats.total_value;
        if (value >= 1e12) return `${(value / 1e12).toFixed(1)}T`;
        if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
        if (value >= 1e6) return `${(value / 1e6).toFixed(0)}M`;
        return `${value.toLocaleString()}`;
      },
      getSize: 11,
      getColor: [0, 255, 200, 200],
      getTextAnchor: 'middle',
      getAlignmentBaseline: 'center',
      fontFamily: 'monospace',
      outlineWidth: 1,
      outlineColor: [0, 0, 0, 150],
    });
  }, [safeData, showStats]);

  return [polygonLayer, labelLayer, statsLayer].filter(Boolean);
}

/**
 * 클러스터 정보 패널
 */
export function ClusterInfoPanel({ cluster }: { cluster: Cluster | null }) {
  if (!cluster) return null;

  const formatValue = (value: number) => {
    if (value >= 1e12) return `₩${(value / 1e12).toFixed(1)}T`;
    if (value >= 1e9) return `₩${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `₩${(value / 1e6).toFixed(0)}M`;
    return `₩${value.toLocaleString()}`;
  };

  return (
    <div className="absolute bottom-24 left-4 bg-gray-900/95 backdrop-blur border border-gray-700 rounded-xl p-4 min-w-64 z-20">
      <div className="flex items-center gap-3 mb-3">
        <div 
          className="w-4 h-4 rounded"
          style={{ backgroundColor: `rgba(${cluster.color.join(',')})` }}
        />
        <h3 className="font-bold text-lg">{cluster.name}</h3>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div className="p-2 bg-gray-800/50 rounded-lg">
          <div className="text-[10px] text-gray-500 uppercase">노드 수</div>
          <div className="text-xl font-bold text-cyan-400">{cluster.stats.node_count}</div>
        </div>
        <div className="p-2 bg-gray-800/50 rounded-lg">
          <div className="text-[10px] text-gray-500 uppercase">총 가치</div>
          <div className="text-xl font-bold text-emerald-400">{formatValue(cluster.stats.total_value)}</div>
        </div>
        <div className="p-2 bg-gray-800/50 rounded-lg col-span-2">
          <div className="text-[10px] text-gray-500 uppercase">평균 KI</div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full"
                style={{ width: `${cluster.stats.avg_ki * 100}%` }}
              />
            </div>
            <span className="text-sm font-mono text-purple-400">{(cluster.stats.avg_ki * 100).toFixed(0)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default useClusterLayers;
