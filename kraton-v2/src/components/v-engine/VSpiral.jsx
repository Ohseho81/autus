// ═══════════════════════════════════════════════════════════════════════════════
// 🏛️ AUTUS V-Spiral Component
// 실시간 V 지수 시각화
// ═══════════════════════════════════════════════════════════════════════════════

import { useRef, useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// TIER COLORS
// ============================================

const TIER_COLORS = {
  T1: { primary: '#FFD700', secondary: '#FFA500', glow: 'rgba(255, 215, 0, 0.5)' },
  T2: { primary: '#00AAFF', secondary: '#0066CC', glow: 'rgba(0, 170, 255, 0.5)' },
  T3: { primary: '#00CC66', secondary: '#009944', glow: 'rgba(0, 204, 102, 0.5)' },
  T4: { primary: '#888888', secondary: '#555555', glow: 'rgba(136, 136, 136, 0.3)' },
  Ghost: { primary: '#333333', secondary: '#1a1a1a', glow: 'rgba(50, 50, 50, 0.2)' },
};

// ============================================
// V-SPIRAL COMPONENT
// ============================================

export function VSpiral({ 
  nodes = [], 
  metrics = {},
  size = 400,
  showLabels = true,
  onNodeClick,
  className = ''
}) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [selectedTier, setSelectedTier] = useState(null);

  // 노드를 티어별로 그룹화
  const nodesByTier = useMemo(() => {
    const grouped = { T1: [], T2: [], T3: [], T4: [], Ghost: [] };
    nodes.forEach(node => {
      if (grouped[node.tier]) {
        grouped[node.tier].push(node);
      }
    });
    return grouped;
  }, [nodes]);

  // Canvas 애니메이션
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const centerX = size / 2;
    const centerY = size / 2;
    let rotation = 0;

    const draw = () => {
      ctx.clearRect(0, 0, size, size);

      // 배경 그라데이션
      const bgGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, size / 2);
      bgGradient.addColorStop(0, 'rgba(20, 30, 50, 0.8)');
      bgGradient.addColorStop(1, 'rgba(10, 15, 25, 0.95)');
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, size, size);

      // 스파이럴 그리드
      ctx.strokeStyle = 'rgba(50, 80, 120, 0.2)';
      ctx.lineWidth = 1;
      for (let r = 50; r < size / 2; r += 50) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
        ctx.stroke();
      }

      // 티어별 노드 그리기
      const tiers = ['Ghost', 'T4', 'T3', 'T2', 'T1'];
      const tierRadii = { Ghost: 180, T4: 150, T3: 110, T2: 70, T1: 30 };

      tiers.forEach(tier => {
        const tierNodes = nodesByTier[tier] || [];
        const radius = tierRadii[tier];
        const color = TIER_COLORS[tier];
        const angleStep = (Math.PI * 2) / Math.max(tierNodes.length, 1);

        tierNodes.forEach((node, i) => {
          const angle = angleStep * i + rotation * (tier === 'T1' ? 2 : tier === 'T2' ? 1.5 : 1);
          const x = centerX + Math.cos(angle) * radius;
          const y = centerY + Math.sin(angle) * radius;
          const nodeSize = tier === 'T1' ? 8 : tier === 'T2' ? 6 : tier === 'T3' ? 4 : 3;

          // 노드 글로우
          const gradient = ctx.createRadialGradient(x, y, 0, x, y, nodeSize * 2);
          gradient.addColorStop(0, color.glow);
          gradient.addColorStop(1, 'transparent');
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(x, y, nodeSize * 2, 0, Math.PI * 2);
          ctx.fill();

          // 노드 본체
          ctx.fillStyle = color.primary;
          ctx.beginPath();
          ctx.arc(x, y, nodeSize, 0, Math.PI * 2);
          ctx.fill();

          // 모멘텀 표시 (활성 노드)
          if (node.momentum && node.momentum !== 0) {
            ctx.strokeStyle = node.momentum > 0 ? '#00FF88' : '#FF4444';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(x, y, nodeSize + 3, 0, Math.PI * 2);
            ctx.stroke();
          }
        });
      });

      // 중앙 V 지수 표시
      const vIndex = metrics.totalVIndex || 0;
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 24px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(vIndex.toFixed(0), centerX, centerY - 10);
      
      ctx.fillStyle = '#888888';
      ctx.font = '12px system-ui';
      ctx.fillText('Total V', centerX, centerY + 15);

      rotation += 0.002;
      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [nodesByTier, metrics, size]);

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className="rounded-2xl"
        style={{ background: 'transparent' }}
      />
      
      {/* 티어 레전드 */}
      {showLabels && (
        <div className="absolute bottom-4 left-4 flex gap-2">
          {['T1', 'T2', 'T3', 'T4', 'Ghost'].map(tier => (
            <button
              key={tier}
              onClick={() => setSelectedTier(selectedTier === tier ? null : tier)}
              className={`
                px-2 py-1 rounded text-xs font-medium transition-all
                ${selectedTier === tier ? 'ring-2 ring-white' : ''}
              `}
              style={{ 
                backgroundColor: TIER_COLORS[tier].primary + '33',
                color: TIER_COLORS[tier].primary,
              }}
            >
              {tier} ({nodesByTier[tier]?.length || 0})
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// V-METRICS PANEL
// ============================================

export function VMetricsPanel({ metrics, className = '' }) {
  const {
    totalVIndex = 0,
    totalMint = 0,
    totalBurn = 0,
    sqValue = 0,
    activeNodes = 0,
    ghostNodes = 0,
    flowRate = 0,
    tierDistribution = {},
  } = metrics;

  const netFlow = totalMint - totalBurn;
  const isPositive = netFlow >= 0;

  return (
    <div className={`bg-gray-900/80 rounded-2xl p-6 border border-gray-800 ${className}`}>
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <span className="text-cyan-400">⚡</span>
        V-Engine Metrics
      </h3>

      {/* 주요 지표 */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-800/50 rounded-xl p-4">
          <div className="text-gray-500 text-xs mb-1">Total V-Index</div>
          <div className="text-2xl font-bold text-white">
            {totalVIndex.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </div>
        </div>
        
        <div className="bg-gray-800/50 rounded-xl p-4">
          <div className="text-gray-500 text-xs mb-1">SQ Value</div>
          <div className={`text-2xl font-bold ${sqValue >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {sqValue >= 0 ? '+' : ''}{sqValue.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Mint/Burn 플로우 */}
      <div className="mb-6">
        <div className="flex justify-between text-xs text-gray-500 mb-2">
          <span>Mint</span>
          <span>Burn</span>
        </div>
        <div className="h-3 bg-gray-800 rounded-full overflow-hidden flex">
          <div 
            className="bg-emerald-500 transition-all duration-500"
            style={{ width: `${(totalMint / (totalMint + totalBurn || 1)) * 100}%` }}
          />
          <div 
            className="bg-red-500 transition-all duration-500"
            style={{ width: `${(totalBurn / (totalMint + totalBurn || 1)) * 100}%` }}
          />
        </div>
        <div className="flex justify-between text-xs mt-1">
          <span className="text-emerald-400">+{totalMint.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          <span className={`font-medium ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
            Net: {isPositive ? '+' : ''}{netFlow.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
          <span className="text-red-400">-{totalBurn.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
        </div>
      </div>

      {/* 티어 분포 */}
      <div className="mb-4">
        <div className="text-gray-500 text-xs mb-2">Tier Distribution</div>
        <div className="flex gap-1 h-8">
          {['T1', 'T2', 'T3', 'T4', 'Ghost'].map(tier => {
            const count = tierDistribution[tier] || 0;
            const total = Object.values(tierDistribution).reduce((a, b) => a + b, 0) || 1;
            const percentage = (count / total) * 100;
            
            return (
              <div
                key={tier}
                className="rounded transition-all duration-500 flex items-end justify-center"
                style={{
                  width: `${Math.max(percentage, 5)}%`,
                  backgroundColor: TIER_COLORS[tier].primary + '33',
                  borderBottom: `3px solid ${TIER_COLORS[tier].primary}`,
                }}
              >
                <span className="text-[10px] text-gray-400 pb-1">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 실시간 지표 */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-gray-800/30 rounded-lg py-2">
          <div className="text-emerald-400 font-semibold">{activeNodes}</div>
          <div className="text-gray-600 text-[10px]">Active</div>
        </div>
        <div className="bg-gray-800/30 rounded-lg py-2">
          <div className="text-gray-500 font-semibold">{ghostNodes}</div>
          <div className="text-gray-600 text-[10px]">Ghost</div>
        </div>
        <div className="bg-gray-800/30 rounded-lg py-2">
          <div className="text-cyan-400 font-semibold">{flowRate}/m</div>
          <div className="text-gray-600 text-[10px]">Flow Rate</div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// V-FLOW ACTIVITY
// ============================================

export function VFlowActivity({ flows = [], maxItems = 10, className = '' }) {
  return (
    <div className={`bg-gray-900/80 rounded-2xl p-4 border border-gray-800 ${className}`}>
      <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
        <span className="text-purple-400">📊</span>
        Recent Flows
        <span className="ml-auto text-xs text-gray-500">{flows.length} total</span>
      </h3>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {flows.slice(0, maxItems).map((flow, i) => (
            <motion.div
              key={flow.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: i * 0.05 }}
              className={`
                flex items-center gap-2 p-2 rounded-lg text-xs
                ${flow.flow_type === 'mint' ? 'bg-emerald-500/10' : 
                  flow.flow_type === 'burn' ? 'bg-red-500/10' : 'bg-gray-800/50'}
              `}
            >
              <span className={`
                w-6 h-6 rounded-full flex items-center justify-center text-sm
                ${flow.flow_type === 'mint' ? 'bg-emerald-500/20 text-emerald-400' :
                  flow.flow_type === 'burn' ? 'bg-red-500/20 text-red-400' :
                  flow.flow_type === 'transfer' ? 'bg-blue-500/20 text-blue-400' :
                  'bg-yellow-500/20 text-yellow-400'}
              `}>
                {flow.flow_type === 'mint' ? '↑' :
                 flow.flow_type === 'burn' ? '↓' :
                 flow.flow_type === 'transfer' ? '↔' : '★'}
              </span>
              
              <div className="flex-1 min-w-0">
                <div className="text-gray-300 truncate">
                  {flow.flow_type.charAt(0).toUpperCase() + flow.flow_type.slice(1)}
                </div>
                <div className="text-gray-600 text-[10px]">
                  {new Date(flow.timestamp).toLocaleTimeString()}
                </div>
              </div>
              
              <div className={`
                font-mono font-medium
                ${flow.flow_type === 'mint' ? 'text-emerald-400' :
                  flow.flow_type === 'burn' ? 'text-red-400' : 'text-gray-400'}
              `}>
                {flow.flow_type === 'burn' ? '-' : '+'}
                {flow.amount.toFixed(1)}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {flows.length === 0 && (
          <div className="text-center text-gray-600 py-8">
            No recent flows
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// V-TOP NODES
// ============================================

export function VTopNodes({ nodes = [], maxItems = 5, className = '' }) {
  return (
    <div className={`bg-gray-900/80 rounded-2xl p-4 border border-gray-800 ${className}`}>
      <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
        <span className="text-yellow-400">🏆</span>
        Top V-Nodes
      </h3>

      <div className="space-y-2">
        {nodes.slice(0, maxItems).map((node, i) => (
          <div
            key={node.id}
            className="flex items-center gap-3 p-2 rounded-lg bg-gray-800/30 hover:bg-gray-800/50 transition-colors"
          >
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
              style={{
                backgroundColor: TIER_COLORS[node.tier]?.primary + '33',
                color: TIER_COLORS[node.tier]?.primary,
              }}
            >
              {i + 1}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="text-gray-200 text-sm truncate">{node.name || `Node ${node.id.slice(-4)}`}</div>
              <div className="flex items-center gap-2 text-[10px]">
                <span 
                  className="px-1.5 py-0.5 rounded"
                  style={{
                    backgroundColor: TIER_COLORS[node.tier]?.primary + '22',
                    color: TIER_COLORS[node.tier]?.primary,
                  }}
                >
                  {node.tier}
                </span>
                <span className="text-gray-600">{node.node_type}</span>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-white font-mono font-medium">
                {node.v_index.toFixed(0)}
              </div>
              <div className="text-gray-600 text-[10px]">V-Index</div>
            </div>
          </div>
        ))}

        {nodes.length === 0 && (
          <div className="text-center text-gray-600 py-8">
            No nodes found
          </div>
        )}
      </div>
    </div>
  );
}

export default VSpiral;
