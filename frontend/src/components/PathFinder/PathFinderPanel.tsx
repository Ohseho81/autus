// ═══════════════════════════════════════════════════════════════════════════
// AUTUS PathFinder Panel - 경로 탐색 UI
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useCallback } from 'react';
import { 
  Route, MapPin, ArrowRight, Search, Zap, 
  AlertTriangle, Clock, DollarSign, RefreshCw,
  ChevronDown, ChevronUp, Navigation
} from 'lucide-react';
import { usePathFinder } from '../../hooks/usePathFinder';

interface Props {
  onPathSelect?: (pathIds: string[]) => void;
  onNodeHighlight?: (nodeId: string | null) => void;
}

export function PathFinderPanel({ onPathSelect, onNodeHighlight }: Props) {
  const {
    nodes,
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
  } = usePathFinder();

  const [showAlternatives, setShowAlternatives] = useState(false);
  const [selectedPathIndex, setSelectedPathIndex] = useState(0);

  const handleFindPath = useCallback(() => {
    if (fromNode && toNode) {
      findPath(fromNode, toNode);
      findAlternatives(fromNode, toNode);
    }
  }, [fromNode, toNode, findPath, findAlternatives]);

  const handlePathSelect = useCallback((pathIds: string[], index: number) => {
    setSelectedPathIndex(index);
    onPathSelect?.(pathIds);
  }, [onPathSelect]);

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800/50 bg-gradient-to-r from-purple-900/20 to-cyan-900/20">
        <Route size={18} className="text-purple-400" />
        <h3 className="font-bold">경로 탐색</h3>
        {loading && <RefreshCw size={14} className="text-cyan-400 animate-spin ml-auto" />}
      </div>

      {/* Node Selection */}
      <div className="p-4 space-y-3">
        {/* From Node */}
        <div className="relative">
          <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 block">출발</label>
          <div className="relative">
            <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400" />
            <select
              value={fromNode}
              onChange={(e) => setFromNode(e.target.value)}
              onFocus={() => onNodeHighlight?.(fromNode)}
              className="w-full pl-9 pr-4 py-2.5 bg-gray-900 border border-gray-800 rounded-lg text-sm focus:outline-none focus:border-emerald-500/50 appearance-none cursor-pointer"
            >
              <option value="">출발지 선택</option>
              {nodes.map(node => (
                <option key={node.id} value={node.id}>{node.name}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          </div>
        </div>

        {/* Swap Button */}
        <div className="flex justify-center">
          <button
            onClick={swapNodes}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors group"
            title="출발/도착 교환"
          >
            <div className="flex flex-col items-center gap-0.5">
              <ChevronUp size={12} className="text-gray-500 group-hover:text-cyan-400" />
              <ChevronDown size={12} className="text-gray-500 group-hover:text-cyan-400" />
            </div>
          </button>
        </div>

        {/* To Node */}
        <div className="relative">
          <label className="text-[10px] text-gray-500 uppercase tracking-wider mb-1 block">도착</label>
          <div className="relative">
            <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-red-400" />
            <select
              value={toNode}
              onChange={(e) => setToNode(e.target.value)}
              onFocus={() => onNodeHighlight?.(toNode)}
              className="w-full pl-9 pr-4 py-2.5 bg-gray-900 border border-gray-800 rounded-lg text-sm focus:outline-none focus:border-red-500/50 appearance-none cursor-pointer"
            >
              <option value="">도착지 선택</option>
              {nodes.filter(n => n.id !== fromNode).map(node => (
                <option key={node.id} value={node.id}>{node.name}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          </div>
        </div>

        {/* Search Button */}
        <button
          onClick={handleFindPath}
          disabled={!fromNode || !toNode || loading}
          className="w-full py-3 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 disabled:from-gray-700 disabled:to-gray-700 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all"
        >
          <Search size={16} />
          경로 찾기
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-4 mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {/* Shortest Path Result */}
      {shortestPath && (
        <div className="border-t border-gray-800/50">
          <div className="p-4">
            <h4 className="text-sm font-bold mb-3 flex items-center gap-2">
              <Navigation size={14} className="text-cyan-400" />
              최적 경로
            </h4>

            {/* Path Visualization */}
            <div className="flex items-center flex-wrap gap-1 mb-4">
              {shortestPath.path.map((node, i) => (
                <React.Fragment key={node.id}>
                  <button
                    onClick={() => onNodeHighlight?.(node.id)}
                    className={`px-2 py-1 rounded text-xs transition-all ${
                      i === 0 ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-500/50' :
                      i === shortestPath.path.length - 1 ? 'bg-red-900/50 text-red-400 border border-red-500/50' :
                      shortestPath.bottlenecks.includes(node.id) ? 'bg-amber-900/50 text-amber-400 border border-amber-500/50' :
                      'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {node.name}
                  </button>
                  {i < shortestPath.path.length - 1 && (
                    <ArrowRight size={12} className="text-gray-600" />
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="p-2 bg-gray-900/50 rounded-lg text-center">
                <Clock size={12} className="mx-auto mb-1 text-cyan-400" />
                <p className="text-lg font-bold">{shortestPath.estimated_time}</p>
                <p className="text-[10px] text-gray-500">예상 시간(분)</p>
              </div>
              <div className="p-2 bg-gray-900/50 rounded-lg text-center">
                <Route size={12} className="mx-auto mb-1 text-purple-400" />
                <p className="text-lg font-bold">{shortestPath.total_distance}</p>
                <p className="text-[10px] text-gray-500">거리</p>
              </div>
              <div className="p-2 bg-gray-900/50 rounded-lg text-center">
                <DollarSign size={12} className="mx-auto mb-1 text-emerald-400" />
                <p className="text-lg font-bold">₩{(shortestPath.total_flow / 1000000).toFixed(1)}M</p>
                <p className="text-[10px] text-gray-500">Flow량</p>
              </div>
            </div>

            {/* Bottlenecks */}
            {shortestPath.bottlenecks.length > 0 && (
              <div className="p-3 bg-amber-900/10 border border-amber-500/30 rounded-lg mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={14} className="text-amber-400" />
                  <span className="text-xs font-bold text-amber-400">병목 감지</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {shortestPath.bottlenecks.map(nodeId => {
                    const node = shortestPath.path.find(n => n.id === nodeId);
                    return (
                      <span key={nodeId} className="px-2 py-0.5 bg-amber-900/30 text-amber-400 rounded text-xs">
                        {node?.name || nodeId}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Apply Path Button */}
            <button
              onClick={() => handlePathSelect(shortestPath.path_ids, 0)}
              className={`w-full py-2 rounded-lg text-sm font-medium transition-all ${
                selectedPathIndex === 0
                  ? 'bg-cyan-900/50 text-cyan-400 border border-cyan-500/50'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <Zap size={14} className="inline mr-2" />
              맵에 표시
            </button>
          </div>

          {/* Alternatives Toggle */}
          {alternatives.length > 0 && (
            <div className="border-t border-gray-800/50">
              <button
                onClick={() => setShowAlternatives(!showAlternatives)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-800/30 transition-colors"
              >
                <span className="text-xs font-bold">대안 경로 ({alternatives.length})</span>
                {showAlternatives ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {showAlternatives && (
                <div className="px-4 pb-4 space-y-2">
                  {alternatives.map((alt, i) => (
                    <button
                      key={i}
                      onClick={() => handlePathSelect(alt.path, i + 1)}
                      className={`w-full p-3 rounded-lg text-left transition-all ${
                        selectedPathIndex === i + 1
                          ? 'bg-purple-900/30 border border-purple-500/50'
                          : 'bg-gray-900/30 hover:bg-gray-800/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-500">경유: {alt.via}</span>
                        <span className="text-xs font-mono text-purple-400">{alt.total_weight}</span>
                      </div>
                      <div className="flex items-center gap-1 flex-wrap">
                        {alt.nodes.map((name, j) => (
                          <React.Fragment key={j}>
                            <span className="text-[10px] text-gray-400">{name}</span>
                            {j < alt.nodes.length - 1 && (
                              <ArrowRight size={8} className="text-gray-600" />
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Network Stats */}
      {networkStats && (
        <div className="border-t border-gray-800/50 p-4">
          <h4 className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">네트워크 현황</h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-gray-500">노드:</span>
              <span className="ml-1 font-mono">{networkStats.total_nodes}</span>
            </div>
            <div>
              <span className="text-gray-500">연결:</span>
              <span className="ml-1 font-mono">{networkStats.total_edges}</span>
            </div>
            <div>
              <span className="text-gray-500">밀도:</span>
              <span className="ml-1 font-mono">{networkStats.density}</span>
            </div>
            <div>
              <span className="text-gray-500">총 Flow:</span>
              <span className="ml-1 font-mono text-emerald-400">
                ₩{(networkStats.total_flow_volume / 1000000).toFixed(1)}M
              </span>
            </div>
          </div>
          
          {networkStats.hub_nodes && (
            <div className="mt-3">
              <span className="text-[10px] text-gray-500">허브 노드:</span>
              <div className="flex gap-1 mt-1">
                {networkStats.hub_nodes.map((hub: any) => (
                  <span 
                    key={hub.id}
                    className="px-2 py-0.5 bg-amber-900/30 text-amber-400 rounded text-[10px]"
                  >
                    {hub.name} ({hub.connections})
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default PathFinderPanel;
