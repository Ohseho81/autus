/**
 * AUTUS Physics Map - Simple SVG Version
 * 의존성 최소화 버전
 * 
 * #transform 연동: useEnvironmentStore로 데이터 전달
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useEnvironmentStore } from '../../store/useEnvironmentStore';

// ============================================================
// Mock Data
// ============================================================

const NODES = [
  { id: 'USA', name: 'USA', x: 180, y: 180, value: 25e12, m2c: 2.4, color: '#10b981' },
  { id: 'CHN', name: 'China', x: 680, y: 200, value: 18e12, m2c: 2.1, color: '#10b981' },
  { id: 'JPN', name: 'Japan', x: 750, y: 190, value: 4.9e12, m2c: 1.9, color: '#06b6d4' },
  { id: 'DEU', name: 'Germany', x: 420, y: 150, value: 4.3e12, m2c: 1.8, color: '#06b6d4' },
  { id: 'GBR', name: 'UK', x: 380, y: 140, value: 3.1e12, m2c: 1.6, color: '#06b6d4' },
  { id: 'FRA', name: 'France', x: 400, y: 160, value: 2.9e12, m2c: 1.5, color: '#06b6d4' },
  { id: 'KOR', name: 'Korea', x: 720, y: 195, value: 1.8e12, m2c: 2.2, color: '#10b981' },
  { id: 'IND', name: 'India', x: 600, y: 260, value: 3.5e12, m2c: 1.3, color: '#f59e0b' },
  { id: 'BRA', name: 'Brazil', x: 280, y: 340, value: 2.1e12, m2c: 1.1, color: '#f59e0b' },
  { id: 'RUS', name: 'Russia', x: 550, y: 120, value: 1.8e12, m2c: 0.9, color: '#ef4444' },
  { id: 'AUS', name: 'Australia', x: 740, y: 380, value: 1.6e12, m2c: 1.7, color: '#06b6d4' },
  { id: 'CAN', name: 'Canada', x: 200, y: 130, value: 2e12, m2c: 1.4, color: '#f59e0b' },
];

const FLOWS = [
  { source: 'USA', target: 'CHN', amount: 150 },
  { source: 'CHN', target: 'USA', amount: 120 },
  { source: 'USA', target: 'DEU', amount: 85 },
  { source: 'DEU', target: 'CHN', amount: 95 },
  { source: 'JPN', target: 'USA', amount: 75 },
  { source: 'KOR', target: 'CHN', amount: 60 },
  { source: 'GBR', target: 'USA', amount: 55 },
  { source: 'AUS', target: 'CHN', amount: 35 },
  { source: 'CAN', target: 'USA', amount: 65 },
  { source: 'BRA', target: 'CHN', amount: 30 },
];

function formatUSD(value: number): string {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(1)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(0)}B`;
  return `$${value.toFixed(0)}`;
}

// ============================================================
// Main Component
// ============================================================

export function PhysicsMap() {
  const [selectedNode, setSelectedNode] = useState<(typeof NODES)[0] | null>(null);
  const [animationProgress, setAnimationProgress] = useState(0);
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, width: 900, height: 500 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Environment Store 연동
  const { updateFromPhysicsMap, setSelectedRegion } = useEnvironmentStore();

  // Animation
  useEffect(() => {
    const animate = () => {
      setAnimationProgress((prev) => (prev + 0.005) % 1);
    };
    const interval = setInterval(animate, 16);
    return () => clearInterval(interval);
  }, []);

  // Flow paths with animation
  const flowPaths = useMemo(() => {
    return FLOWS.map((flow) => {
      const source = NODES.find((n) => n.id === flow.source);
      const target = NODES.find((n) => n.id === flow.target);
      if (!source || !target) return null;

      const midX = (source.x + target.x) / 2;
      const midY = Math.min(source.y, target.y) - 30;

      // Quadratic bezier curve
      const path = `M ${source.x} ${source.y} Q ${midX} ${midY} ${target.x} ${target.y}`;

      // Particle position
      const t = animationProgress;
      const particleX =
        Math.pow(1 - t, 2) * source.x + 2 * (1 - t) * t * midX + Math.pow(t, 2) * target.x;
      const particleY =
        Math.pow(1 - t, 2) * source.y + 2 * (1 - t) * t * midY + Math.pow(t, 2) * target.y;

      return { ...flow, source, target, path, particleX, particleY };
    }).filter(Boolean);
  }, [animationProgress]);

  // Zoom
  const handleZoom = useCallback((delta: number) => {
    setViewBox((prev) => {
      const factor = delta > 0 ? 0.9 : 1.1;
      const newWidth = prev.width * factor;
      const newHeight = prev.height * factor;
      const dx = (prev.width - newWidth) / 2;
      const dy = (prev.height - newHeight) / 2;
      return {
        x: prev.x + dx,
        y: prev.y + dy,
        width: Math.max(200, Math.min(1800, newWidth)),
        height: Math.max(100, Math.min(1000, newHeight)),
      };
    });
  }, []);

  // Pan
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsPanning(true);
    setPanStart({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isPanning) return;
      const dx = (e.clientX - panStart.x) * (viewBox.width / 900);
      const dy = (e.clientY - panStart.y) * (viewBox.height / 500);
      setViewBox((prev) => ({ ...prev, x: prev.x - dx, y: prev.y - dy }));
      setPanStart({ x: e.clientX, y: e.clientY });
    },
    [isPanning, panStart, viewBox]
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleReset = useCallback(() => {
    setViewBox({ x: 0, y: 0, width: 900, height: 500 });
    setSelectedNode(null);
  }, []);

  // Stats
  const stats = useMemo(() => {
    const totalValue = NODES.reduce((sum, n) => sum + n.value, 0);
    const totalFlow = FLOWS.reduce((sum, f) => sum + f.amount, 0);
    const avgM2C = NODES.reduce((sum, n) => sum + n.m2c, 0) / NODES.length;
    
    // 유입/유출 계산
    const usaInflow = FLOWS.filter(f => f.target === 'USA').reduce((s, f) => s + f.amount, 0);
    const usaOutflow = FLOWS.filter(f => f.source === 'USA').reduce((s, f) => s + f.amount, 0);
    const inflowRatio = usaInflow / (usaInflow + usaOutflow);
    
    return { totalValue, totalFlow, avgM2C, inflowRatio };
  }, []);

  // #transform 연동: 환경 데이터 업데이트
  useEffect(() => {
    // 시뮬레이션된 시장 변동성 (실제로는 외부 API에서 가져옴)
    const volatility = 0.2 + Math.random() * 0.3;
    const pressure = (stats.avgM2C - 1.5) / 1.5; // M2C 기준 압력
    const momentum = stats.inflowRatio - 0.5; // 유입 비율 기준 모멘텀
    
    updateFromPhysicsMap({
      marketVolatility: volatility,
      externalPressure: Math.max(-1, Math.min(1, pressure)),
      globalM2C: stats.avgM2C,
      totalFlow: stats.totalFlow,
      inflowRatio: stats.inflowRatio,
      flowMomentum: Math.max(-1, Math.min(1, momentum * 2)),
    });
  }, [stats, updateFromPhysicsMap]);

  // 노드 선택 시 지역 데이터 업데이트
  useEffect(() => {
    if (selectedNode) {
      setSelectedRegion(
        selectedNode.name,
        selectedNode.value,
        selectedNode.m2c
      );
    } else {
      setSelectedRegion(null, 0, 0);
    }
  }, [selectedNode, setSelectedRegion]);

  return (
    <div className="w-full h-full flex bg-slate-900 text-white">
      {/* Sidebar */}
      <aside className="w-72 h-full bg-slate-900 border-r border-slate-700 flex flex-col">
        <div className="p-4 border-b border-slate-700">
          <h2 className="font-bold text-sm flex items-center gap-2">
            <span className="text-cyan-400">⚡</span>
            M2C Scoreboard
          </h2>
          <p className="text-[10px] text-slate-500 mt-1">Motion to Capital Ratio</p>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {[...NODES]
            .sort((a, b) => b.m2c - a.m2c)
            .map((node, idx) => (
              <div
                key={node.id}
                onClick={() => setSelectedNode(node)}
                className={`p-3 rounded-lg cursor-pointer transition-all ${
                  selectedNode?.id === node.id
                    ? 'bg-cyan-900/50 border border-cyan-500/50'
                    : 'bg-slate-800/50 hover:bg-slate-800 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      idx === 0
                        ? 'bg-amber-500 text-black'
                        : idx === 1
                        ? 'bg-slate-400 text-black'
                        : idx === 2
                        ? 'bg-amber-700 text-white'
                        : 'bg-slate-700 text-white'
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <span className="font-semibold text-sm">{node.name}</span>
                  <span
                    className="ml-auto text-sm font-bold font-mono"
                    style={{ color: node.color }}
                  >
                    {node.m2c.toFixed(2)}x
                  </span>
                </div>
                <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min((node.m2c / 3) * 100, 100)}%`,
                      backgroundColor: node.color,
                    }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-[10px] text-slate-500">
                  <span>Rank: #{idx + 1}</span>
                  <span>{formatUSD(node.value)}</span>
                </div>
              </div>
            ))}
        </div>

        <div className="p-3 border-t border-slate-700">
          <div className="flex gap-2">
            <div className="flex-1 text-center p-2 bg-slate-800 rounded-lg">
              <div className="text-[10px] text-slate-500">평균 M2C</div>
              <div className="text-lg font-bold text-cyan-400">{stats.avgM2C.toFixed(2)}x</div>
            </div>
            <div className="flex-1 text-center p-2 bg-slate-800 rounded-lg">
              <div className="text-[10px] text-slate-500">총 가치</div>
              <div className="text-lg font-bold text-emerald-400">{formatUSD(stats.totalValue)}</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Map */}
      <main className="flex-1 relative overflow-hidden">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 h-14 bg-slate-900/90 backdrop-blur-md border-b border-slate-700 flex items-center justify-between px-4 z-10">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center font-bold shadow-lg"
              style={{ background: 'linear-gradient(135deg, #10b981, #06b6d4, #8b5cf6)' }}
            >
              A
            </div>
            <div>
              <h1 className="text-sm font-bold">AUTUS Physics Map</h1>
              <p className="text-[10px] text-slate-500">Motion is Money</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1">
              <button
                onClick={() => handleZoom(-1)}
                className="w-7 h-7 flex items-center justify-center hover:bg-slate-700 rounded"
              >
                −
              </button>
              <span className="px-2 text-xs font-mono w-14 text-center">
                {(900 / viewBox.width).toFixed(1)}x
              </span>
              <button
                onClick={() => handleZoom(1)}
                className="w-7 h-7 flex items-center justify-center hover:bg-slate-700 rounded"
              >
                +
              </button>
            </div>

            <button
              onClick={handleReset}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs"
            >
              Reset
            </button>

            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-900/30 border border-emerald-500/30 rounded-full">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-xs text-emerald-400">LIVE</span>
            </div>
          </div>
        </div>

        {/* SVG Map */}
        <svg
          className="w-full h-full"
          viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
          style={{ background: '#0f172a', cursor: isPanning ? 'grabbing' : 'grab' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={(e) => handleZoom(e.deltaY < 0 ? 1 : -1)}
        >
          {/* Grid */}
          <defs>
            <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#1e293b" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect x="-200" y="-100" width="1400" height="800" fill="url(#grid)" />

          {/* Flows */}
          {flowPaths.map((flow: any, i) => (
            <g key={i}>
              <path
                d={flow.path}
                fill="none"
                stroke={flow.amount >= 100 ? '#ffd700' : flow.amount >= 50 ? '#ff6464' : '#64c8ff'}
                strokeWidth={Math.max(1, flow.amount / 50)}
                strokeOpacity={0.4}
              />
              <circle
                cx={flow.particleX}
                cy={flow.particleY}
                r={3}
                fill="white"
                opacity={0.9}
              />
            </g>
          ))}

          {/* Nodes */}
          {NODES.map((node) => (
            <g
              key={node.id}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedNode(node);
              }}
              style={{ cursor: 'pointer' }}
            >
              <circle
                cx={node.x}
                cy={node.y}
                r={Math.sqrt(node.value / 1e11) + 10}
                fill={node.color}
                fillOpacity={0.8}
                stroke={selectedNode?.id === node.id ? 'white' : node.color}
                strokeWidth={selectedNode?.id === node.id ? 3 : 1}
              />
              <text
                x={node.x}
                y={node.y + 4}
                textAnchor="middle"
                fill="white"
                fontSize="10"
                fontWeight="bold"
              >
                {node.name}
              </text>
              <text
                x={node.x}
                y={node.y + Math.sqrt(node.value / 1e11) + 22}
                textAnchor="middle"
                fill={node.color}
                fontSize="9"
                fontWeight="bold"
              >
                {node.m2c.toFixed(2)}x
              </text>
            </g>
          ))}
        </svg>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-slate-900/90 backdrop-blur-md border border-slate-700 rounded-xl p-3 z-10">
          <div className="text-[9px] text-slate-400 tracking-widest mb-2">M2C RATIO</div>
          <div className="space-y-1">
            {[
              { color: '#10b981', label: '≥2.0x (Excellent)' },
              { color: '#06b6d4', label: '≥1.5x (Good)' },
              { color: '#f59e0b', label: '≥1.0x (Warning)' },
              { color: '#ef4444', label: '<1.0x (Critical)' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-[10px] text-slate-400">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Node Info */}
        {selectedNode && (
          <div className="absolute top-20 right-4 w-72 bg-slate-900/95 backdrop-blur border border-slate-600 rounded-2xl shadow-2xl z-20 overflow-hidden">
            <div
              className="p-4 border-b border-slate-700"
              style={{ background: `linear-gradient(135deg, ${selectedNode.color}30, transparent)` }}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold"
                    style={{ backgroundColor: selectedNode.color }}
                  >
                    {selectedNode.name.substring(0, 2)}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{selectedNode.name}</h3>
                    <p className="text-xs text-slate-400">M2C: {selectedNode.m2c.toFixed(2)}x</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-800/50 rounded-xl">
                  <div className="text-[10px] text-slate-500 uppercase">Value</div>
                  <div className="text-xl font-bold text-emerald-400 font-mono">
                    {formatUSD(selectedNode.value)}
                  </div>
                </div>
                <div className="p-3 bg-slate-800/50 rounded-xl">
                  <div className="text-[10px] text-slate-500 uppercase">M2C Ratio</div>
                  <div
                    className="text-xl font-bold font-mono"
                    style={{ color: selectedNode.color }}
                  >
                    {selectedNode.m2c.toFixed(2)}x
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Controls Help */}
        <div className="absolute bottom-4 right-4 bg-slate-900/70 backdrop-blur border border-slate-700/50 rounded-lg px-3 py-2 z-10">
          <div className="text-[10px] text-slate-500 space-y-1">
            <div>🖱️ Scroll: Zoom</div>
            <div>👆 Drag: Pan</div>
            <div>👆 Click: Node Info</div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default PhysicsMap;
