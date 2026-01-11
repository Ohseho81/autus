// ═══════════════════════════════════════════════════════════════════════════
// Path Result - 경로 탐색 결과
// ═══════════════════════════════════════════════════════════════════════════

import React from 'react';
import { ArrowRight, AlertTriangle, Route, Trash2 } from 'lucide-react';
import { formatAmount } from '../../hooks/useFlow';

interface PathNode {
  id?: string;
  name?: string;
}

interface Props {
  result: {
    nodes: (string | PathNode)[];
    flows: unknown[];
    totalAmount: number;
    bottleneck?: {
      nodeId: string;
      nodeName: string;
      flowAmount: number;
    };
  };
  onClear: () => void;
}

export function PathResult({ result, onClear }: Props) {
  // 노드 이름 추출 헬퍼
  const getNodeName = (node: string | PathNode): string => {
    if (typeof node === 'string') return node;
    return node.name || node.id || 'Unknown';
  };

  const getNodeId = (node: string | PathNode): string => {
    if (typeof node === 'string') return node;
    return node.id || '';
  };

  return (
    <div className="border-t border-gray-700">
      {/* 경로 헤더 */}
      <div className="p-3 bg-gray-800/30 flex items-center gap-2">
        <Route size={16} className="text-cyan-400" />
        <span className="text-sm font-medium">탐색 결과</span>
        <span className="text-xs text-gray-500 ml-auto">
          {result.nodes.length} 노드
        </span>
      </div>

      {/* 경로 시각화 */}
      <div className="p-4">
        <div className="flex items-center gap-1 flex-wrap">
          {result.nodes.map((node, idx) => {
            const nodeId = getNodeId(node);
            const nodeName = getNodeName(node);
            const isBottleneck = result.bottleneck?.nodeId === nodeId;

            return (
              <React.Fragment key={nodeId || idx}>
                <span
                  className={`px-2 py-1 rounded text-sm ${
                    isBottleneck
                      ? 'bg-red-600 text-white'
                      : idx === 0
                      ? 'bg-green-600 text-white'
                      : idx === result.nodes.length - 1
                      ? 'bg-cyan-600 text-white'
                      : 'bg-gray-700 text-gray-300'
                  }`}
                >
                  {nodeName}
                </span>
                {idx < result.nodes.length - 1 && (
                  <ArrowRight size={14} className="text-gray-500 flex-shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* 통계 */}
      <div className="p-4 bg-gray-800/30 space-y-2">
        <div className="flex justify-between">
          <span className="text-gray-400 text-sm">경로 길이</span>
          <span className="font-medium">{result.nodes.length} 노드</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400 text-sm">총 흐름</span>
          <span className="text-cyan-400 font-bold">
            {formatAmount(result.totalAmount)}
          </span>
        </div>
      </div>

      {/* 병목 경고 */}
      {result.bottleneck && (
        <div className="p-3 bg-red-900/20 border-t border-red-900/50 flex items-start gap-2">
          <AlertTriangle className="text-red-400 flex-shrink-0 mt-0.5" size={16} />
          <div className="text-sm">
            <p className="text-red-400 font-bold">병목 구간 감지</p>
            <p className="text-gray-300 mt-1">
              <span className="text-white">{result.bottleneck.nodeName}</span>
              <span className="text-gray-500 ml-2">
                최소 유량: {formatAmount(result.bottleneck.flowAmount)}
              </span>
            </p>
          </div>
        </div>
      )}

      {/* 클리어 버튼 */}
      <div className="p-3 border-t border-gray-700">
        <button
          onClick={onClear}
          className="w-full p-2 bg-gray-700 hover:bg-gray-600 rounded text-sm flex items-center justify-center gap-2 transition-colors"
        >
          <Trash2 size={14} />
          경로 지우기
        </button>
      </div>
    </div>
  );
}

