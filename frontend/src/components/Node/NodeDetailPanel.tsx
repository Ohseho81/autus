// ═══════════════════════════════════════════════════════════════════════════
// Node Detail Panel - 노드 상세 정보 패널
// ═══════════════════════════════════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import { X, ChevronDown, ChevronUp, AlertTriangle, ExternalLink } from 'lucide-react';
import type { ScaleNode, Flow } from '../../types';
import { scaleApi, flowApi, keymanApi } from '../../api/client';
import { NodeStats } from './NodeStats';
import { NodeConnections } from './NodeConnections';

interface Props {
  node: ScaleNode;
  onClose: () => void;
  onNavigate?: (nodeId: string) => void;
}

export function NodeDetailPanel({ node, onClose, onNavigate }: Props) {
  const [expanded, setExpanded] = useState(true);
  const [children, setChildren] = useState<ScaleNode[]>([]);
  const [parent, setParent] = useState<ScaleNode | null>(null);
  const [flows, setFlows] = useState<{ inflows: Flow[]; outflows: Flow[] }>({
    inflows: [],
    outflows: [],
  });
  const [impact, setImpact] = useState<{ impact: number; affected_flows: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      setLoading(true);
      try {
        const [childrenData, parentData, flowsData, impactData] = await Promise.all([
          scaleApi.getChildren(node.id).catch(() => []),
          scaleApi.getParent(node.id).catch(() => null),
          flowApi.getNodeFlows(node.id).catch(() => ({ inflows: [], outflows: [] })),
          keymanApi.getImpact(node.id).catch(() => null),
        ]);

        setChildren(childrenData);
        setParent(parentData);
        setFlows(flowsData);
        if (impactData) {
          const impactNum = parseFloat(impactData.network_impact_percentage?.replace('%', '') || '0');
          setImpact({ impact: impactNum / 100, affected_flows: impactData.removed_flows_count || 0 });
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [node.id]);

  const getRankColor = (rank?: string) => {
    const colors: Record<string, string> = {
      'Sovereign': 'bg-yellow-500',
      'Archon': 'bg-gray-400',
      'Validator': 'bg-amber-600',
      'Operator': 'bg-blue-500',
      'Terminal': 'bg-gray-600',
    };
    return colors[rank || 'Terminal'];
  };

  return (
    <div className="absolute right-4 top-20 w-96 panel overflow-hidden animate-slide-in max-h-[calc(100vh-120px)] overflow-y-auto">
      {/* 헤더 */}
      <div className="p-4 bg-gray-800/50 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className={`w-4 h-4 rounded-full ${getRankColor(node.rank)}`} />
          <div>
            <h2 className="font-bold text-lg">{node.name}</h2>
            <p className="text-sm text-gray-400">
              {node.level} • {node.rank || 'Terminal'}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-700 rounded transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      {/* KI 점수 */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Keyman Index</span>
          <span className="text-2xl font-bold text-cyan-400">
            {node.ki_score?.toFixed(4) || '0.0000'}
          </span>
        </div>

        {/* Keyman 유형 뱃지 */}
        {node.keyman_types && node.keyman_types.length > 0 && (
          <div className="flex gap-2 mt-2 flex-wrap">
            {node.keyman_types.map((type) => (
              <span
                key={type}
                className="px-2 py-1 text-xs bg-cyan-900/50 text-cyan-300 rounded"
              >
                {type}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 영향도 경고 */}
      {impact && impact.impact > 0.3 && (
        <div className="p-3 bg-red-900/30 flex items-center gap-2 border-b border-gray-700">
          <AlertTriangle className="text-red-400 flex-shrink-0" size={18} />
          <span className="text-sm">
            제거 시 <span className="font-bold text-red-400">{(impact.impact * 100).toFixed(1)}%</span> 네트워크 영향
          </span>
        </div>
      )}

      {/* 통계 */}
      <NodeStats
        totalMass={node.total_mass}
        totalFlow={node.total_flow}
        inflows={flows.inflows}
        outflows={flows.outflows}
      />

      {/* 계층 네비게이션 */}
      <div className="p-4 border-t border-gray-700">
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-400 text-sm">Hierarchy</span>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 hover:bg-gray-700 rounded"
          >
            {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
        </div>

        {expanded && !loading && (
          <div className="space-y-2">
            {/* 상위 */}
            {parent && (
              <button
                onClick={() => onNavigate?.(parent.id)}
                className="w-full p-2 text-left bg-gray-800/50 rounded hover:bg-gray-700 flex items-center gap-2 transition-colors"
              >
                <ChevronUp size={14} className="text-gray-500" />
                <span className="text-sm">{parent.name}</span>
                <span className="text-xs text-gray-500 ml-auto">{parent.level}</span>
                <ExternalLink size={12} className="text-gray-600" />
              </button>
            )}

            {/* 하위 */}
            {children.length > 0 && (
              <div className="ml-4 space-y-1">
                {children.slice(0, 5).map((child) => (
                  <button
                    key={child.id}
                    onClick={() => onNavigate?.(child.id)}
                    className="w-full p-2 text-left bg-gray-800/50 rounded hover:bg-gray-700 flex items-center gap-2 transition-colors"
                  >
                    <ChevronDown size={14} className="text-gray-500" />
                    <span className="text-sm">{child.name}</span>
                    <span className="text-xs text-cyan-400 ml-auto">
                      KI: {child.ki_score?.toFixed(2) || '0.00'}
                    </span>
                  </button>
                ))}
                {children.length > 5 && (
                  <p className="text-xs text-gray-500 pl-2">+{children.length - 5} more</p>
                )}
              </div>
            )}

            {!parent && children.length === 0 && (
              <p className="text-xs text-gray-500 text-center py-2">
                계층 정보 없음
              </p>
            )}
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-4">
            <div className="spinner w-6 h-6" />
          </div>
        )}
      </div>

      {/* 연결 */}
      <NodeConnections inflows={flows.inflows} outflows={flows.outflows} />
    </div>
  );
}

