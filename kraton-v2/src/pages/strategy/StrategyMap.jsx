/**
 * StrategyMap.jsx
 * 전략 지도 - Force-Directed 네트워크 시각화
 * 
 * 경쟁사, 시장, 내부 연결 관계를 시각화
 * Truth Mode: 점유율%, 경쟁 점수 표시
 */

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import GlassCard from '../../components/ui/GlassCard';
import TruthModeToggle from '../../components/ui/TruthModeToggle';

// Mock 데이터
const MOCK_NODES = [
  { id: 'academy', type: 'self', name: '우리 학원', x: 400, y: 300, size: 80, marketShare: 15, score: 847 },
  { id: 'comp1', type: 'competitor', name: '대치메가', x: 200, y: 200, size: 60, marketShare: 25, score: 720 },
  { id: 'comp2', type: 'competitor', name: '강남대성', x: 600, y: 200, size: 55, marketShare: 20, score: 680 },
  { id: 'comp3', type: 'competitor', name: '청담어학', x: 300, y: 450, size: 45, marketShare: 12, score: 540 },
  { id: 'zone1', type: 'market', name: '대치동', x: 150, y: 350, size: 40, potential: 85 },
  { id: 'zone2', type: 'market', name: '개포동', x: 500, y: 450, size: 35, potential: 72 },
  { id: 'zone3', type: 'market', name: '역삼동', x: 650, y: 350, size: 38, potential: 68 },
];

const MOCK_EDGES = [
  { source: 'academy', target: 'zone1', strength: 0.8 },
  { source: 'academy', target: 'zone2', strength: 0.6 },
  { source: 'comp1', target: 'zone1', strength: 0.9 },
  { source: 'comp2', target: 'zone3', strength: 0.7 },
  { source: 'comp3', target: 'zone2', strength: 0.5 },
];

const NODE_COLORS = {
  self: { fill: '#8b5cf6', stroke: '#a78bfa', glow: 'purple' },
  competitor: { fill: '#ef4444', stroke: '#f87171', glow: 'red' },
  market: { fill: '#22c55e', stroke: '#4ade80', glow: 'emerald' },
};

export default function StrategyMap() {
  const [truthMode, setTruthMode] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [nodes, setNodes] = useState(MOCK_NODES);
  const [hoveredNode, setHoveredNode] = useState(null);
  const canvasRef = useRef(null);

  // Canvas 렌더링
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = 800 * dpr;
    canvas.height = 600 * dpr;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, 800, 600);

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x < 800; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 600);
      ctx.stroke();
    }
    for (let y = 0; y < 600; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(800, y);
      ctx.stroke();
    }

    // Edges
    MOCK_EDGES.forEach(edge => {
      const source = nodes.find(n => n.id === edge.source);
      const target = nodes.find(n => n.id === edge.target);
      if (!source || !target) return;

      const gradient = ctx.createLinearGradient(source.x, source.y, target.x, target.y);
      gradient.addColorStop(0, NODE_COLORS[source.type].fill + '80');
      gradient.addColorStop(1, NODE_COLORS[target.type].fill + '80');

      ctx.beginPath();
      ctx.moveTo(source.x, source.y);
      ctx.lineTo(target.x, target.y);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = edge.strength * 4;
      ctx.stroke();

      // Arrow
      const angle = Math.atan2(target.y - source.y, target.x - source.x);
      const midX = (source.x + target.x) / 2;
      const midY = (source.y + target.y) / 2;
      
      ctx.beginPath();
      ctx.moveTo(midX, midY);
      ctx.lineTo(midX - 10 * Math.cos(angle - 0.5), midY - 10 * Math.sin(angle - 0.5));
      ctx.lineTo(midX - 10 * Math.cos(angle + 0.5), midY - 10 * Math.sin(angle + 0.5));
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();
    });

    // Nodes
    nodes.forEach(node => {
      const colors = NODE_COLORS[node.type];
      const isHovered = hoveredNode === node.id;
      const isSelected = selectedNode === node.id;
      const scale = isHovered || isSelected ? 1.2 : 1;

      // Glow
      const glowRadius = node.size * scale * 1.5;
      const glowGradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, glowRadius);
      glowGradient.addColorStop(0, colors.fill + '40');
      glowGradient.addColorStop(1, 'transparent');
      ctx.fillStyle = glowGradient;
      ctx.beginPath();
      ctx.arc(node.x, node.y, glowRadius, 0, Math.PI * 2);
      ctx.fill();

      // Node
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.size / 2 * scale, 0, Math.PI * 2);
      ctx.fillStyle = colors.fill;
      ctx.fill();
      ctx.strokeStyle = colors.stroke;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Label
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(node.name, node.x, node.y + node.size / 2 + 20);

      // Value (Truth Mode)
      if (truthMode) {
        ctx.fillStyle = colors.stroke;
        ctx.font = 'bold 14px monospace';
        ctx.fillText(
          node.type === 'market' ? `${node.potential}%` : `${node.marketShare || node.score}`,
          node.x, node.y + 5
        );
      }
    });

  }, [nodes, truthMode, hoveredNode, selectedNode]);

  // 마우스 이벤트
  const handleCanvasClick = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const clicked = nodes.find(n => 
      Math.sqrt(Math.pow(n.x - x, 2) + Math.pow(n.y - y, 2)) < n.size / 2
    );

    setSelectedNode(clicked?.id || null);
  };

  const handleCanvasMove = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const hovered = nodes.find(n => 
      Math.sqrt(Math.pow(n.x - x, 2) + Math.pow(n.y - y, 2)) < n.size / 2
    );

    setHoveredNode(hovered?.id || null);
  };

  const selectedNodeData = nodes.find(n => n.id === selectedNode);

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
            전략 지도
          </h1>
          <p className="text-gray-500 mt-1">시장 경쟁 현황 시각화</p>
        </div>
        <TruthModeToggle enabled={truthMode} onToggle={() => setTruthMode(!truthMode)} />
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Map */}
        <div className="col-span-2">
          <GlassCard className="p-4">
            <canvas
              ref={canvasRef}
              width={800}
              height={600}
              style={{ width: '100%', height: 'auto' }}
              className="rounded-lg cursor-pointer"
              onClick={handleCanvasClick}
              onMouseMove={handleCanvasMove}
            />
            
            {/* Legend */}
            <div className="flex items-center justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-purple-500" />
                <span className="text-sm text-gray-400">우리 학원</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-red-500" />
                <span className="text-sm text-gray-400">경쟁사</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-emerald-500" />
                <span className="text-sm text-gray-400">시장 (지역)</span>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Detail Panel */}
        <div className="space-y-4">
          {/* Selected Node Info */}
          {selectedNodeData ? (
            <GlassCard 
              className="p-5" 
              glowColor={NODE_COLORS[selectedNodeData.type].glow}
            >
              <h3 className="text-xl font-bold mb-4">{selectedNodeData.name}</h3>
              
              {selectedNodeData.type === 'self' && (
                <>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-gray-500">V-Index</p>
                      {truthMode ? (
                        <p className="text-2xl font-mono text-purple-400">{selectedNodeData.score}</p>
                      ) : (
                        <p className="text-lg">🚀 성장 경로</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">시장 점유율</p>
                      {truthMode ? (
                        <p className="text-xl font-mono text-purple-400">{selectedNodeData.marketShare}%</p>
                      ) : (
                        <div className="h-2 bg-gray-800 rounded-full overflow-hidden mt-1">
                          <div className="h-full bg-purple-500" style={{ width: `${selectedNodeData.marketShare}%` }} />
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {selectedNodeData.type === 'competitor' && (
                <>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-gray-500">경쟁 점수</p>
                      {truthMode ? (
                        <p className="text-2xl font-mono text-red-400">{selectedNodeData.score}</p>
                      ) : (
                        <p className="text-lg">{selectedNodeData.score > 700 ? '🔥 강력' : '📊 보통'}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">시장 점유율</p>
                      {truthMode ? (
                        <p className="text-xl font-mono text-red-400">{selectedNodeData.marketShare}%</p>
                      ) : (
                        <div className="h-2 bg-gray-800 rounded-full overflow-hidden mt-1">
                          <div className="h-full bg-red-500" style={{ width: `${selectedNodeData.marketShare}%` }} />
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {selectedNodeData.type === 'market' && (
                <div>
                  <p className="text-xs text-gray-500">성장 잠재력</p>
                  {truthMode ? (
                    <p className="text-2xl font-mono text-emerald-400">{selectedNodeData.potential}%</p>
                  ) : (
                    <p className="text-lg">
                      {selectedNodeData.potential >= 80 ? '🌟 매우 높음' : 
                       selectedNodeData.potential >= 60 ? '📈 높음' : '📊 보통'}
                    </p>
                  )}
                </div>
              )}
            </GlassCard>
          ) : (
            <GlassCard className="p-5">
              <p className="text-gray-500 text-center">
                노드를 클릭하여 상세 정보를 확인하세요
              </p>
            </GlassCard>
          )}

          {/* Quick Stats */}
          <GlassCard className="p-4">
            <h4 className="font-bold mb-3">시장 요약</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">총 경쟁사</span>
                <span>{nodes.filter(n => n.type === 'competitor').length}곳</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">커버 지역</span>
                <span>{nodes.filter(n => n.type === 'market').length}곳</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">평균 점유율</span>
                {truthMode ? (
                  <span className="text-purple-400">15%</span>
                ) : (
                  <span>📊 중위권</span>
                )}
              </div>
            </div>
          </GlassCard>

          {/* Actions */}
          <GlassCard className="p-4">
            <h4 className="font-bold mb-3">추천 전략</h4>
            <div className="space-y-2">
              <button className="w-full py-2 bg-purple-600/30 hover:bg-purple-600/50 rounded-lg text-sm text-left px-3 transition-all">
                🎯 대치동 집중 공략
              </button>
              <button className="w-full py-2 bg-emerald-600/30 hover:bg-emerald-600/50 rounded-lg text-sm text-left px-3 transition-all">
                📈 개포동 확장 검토
              </button>
              <button className="w-full py-2 bg-yellow-600/30 hover:bg-yellow-600/50 rounded-lg text-sm text-left px-3 transition-all">
                ⚡ 대치메가 대응 전략
              </button>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
