/**
 * Physics UI Components
 */

import React, { useMemo } from 'react';
import { transformPhysicsToUI, NodeData, usePhysicsStyle } from './PhysicsUIBridge';

// ════════════════════════════════════════════════════════════════════════════════
// Physics Self Orb
// ════════════════════════════════════════════════════════════════════════════════

interface PhysicsSelfOrbProps {
  value: number;
  confidence: number;
  delta?: number;
}

export function PhysicsSelfOrb({ value, confidence, delta = 0 }: PhysicsSelfOrbProps) {
  const style = usePhysicsStyle({ value, confidence, delta });
  
  return (
    <div 
      className="relative rounded-full bg-gradient-to-br from-blue-500 to-purple-600"
      style={{
        ...style,
        animation: 'pulse 2s ease-in-out infinite',
      }}
    >
      <div className="absolute inset-0 flex items-center justify-center text-white font-bold text-lg">
        {(value * 100).toFixed(0)}%
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// Physics Node Card
// ════════════════════════════════════════════════════════════════════════════════

interface PhysicsNodeCardProps {
  name: string;
  data: NodeData;
  color?: string;
}

export function PhysicsNodeCard({ name, data, color = '#3b82f6' }: PhysicsNodeCardProps) {
  const ui = transformPhysicsToUI(data);
  
  return (
    <div 
      className="rounded-xl p-4 backdrop-blur border transition-all"
      style={{
        backgroundColor: `${color}20`,
        borderColor: `${color}50`,
        filter: `blur(${ui.blur}px)`,
        transition: `all ${ui.transitionDuration}s ease-out`,
      }}
    >
      <div className="flex justify-between items-center mb-2">
        <span className="text-white font-medium">{name}</span>
        <span 
          className="text-sm px-2 py-0.5 rounded"
          style={{ backgroundColor: color }}
        >
          {(data.value * 100).toFixed(0)}%
        </span>
      </div>
      <div className="text-xs text-slate-400">
        신뢰도: {(data.confidence * 100).toFixed(0)}%
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// Physics Node Grid
// ════════════════════════════════════════════════════════════════════════════════

interface PhysicsNodeGridProps {
  nodes: Array<{ name: string; data: NodeData; color?: string }>;
}

export function PhysicsNodeGrid({ nodes }: PhysicsNodeGridProps) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {nodes.map((node, i) => (
        <PhysicsNodeCard 
          key={i}
          name={node.name}
          data={node.data}
          color={node.color}
        />
      ))}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// Physics Gate Signal
// ════════════════════════════════════════════════════════════════════════════════

interface PhysicsGateSignalProps {
  status: 'enabled' | 'uncertain' | 'disabled';
  confidence: number;
}

export function PhysicsGateSignal({ status, confidence }: PhysicsGateSignalProps) {
  const colors = {
    enabled: '#22c55e',
    uncertain: '#f59e0b',
    disabled: '#ef4444',
  };
  
  const color = colors[status];
  const transitionDuration = 0.3 + confidence * 1.2;
  
  return (
    <div 
      className="flex items-center gap-2"
      style={{ transition: `all ${transitionDuration}s ease-out` }}
    >
      <div 
        className="w-3 h-3 rounded-full animate-pulse"
        style={{ backgroundColor: color }}
      />
      <span className="text-sm text-slate-300 capitalize">{status}</span>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// Physics Action Card
// ════════════════════════════════════════════════════════════════════════════════

interface PhysicsActionCardProps {
  action: string;
  impact: number;
  confidence: number;
}

export function PhysicsActionCard({ action, impact, confidence }: PhysicsActionCardProps) {
  const glowRadius = impact * 40;
  const transitionDuration = 0.3 + confidence * 1.2;
  
  return (
    <div 
      className="bg-slate-800/80 rounded-lg p-3 border border-slate-700"
      style={{
        boxShadow: `0 0 ${glowRadius}px rgba(59, 130, 246, 0.3)`,
        transition: `all ${transitionDuration}s ease-out`,
      }}
    >
      <div className="text-white text-sm">{action}</div>
      <div className="flex justify-between mt-2 text-xs text-slate-400">
        <span>영향: {(impact * 100).toFixed(0)}%</span>
        <span>신뢰: {(confidence * 100).toFixed(0)}%</span>
      </div>
    </div>
  );
}

