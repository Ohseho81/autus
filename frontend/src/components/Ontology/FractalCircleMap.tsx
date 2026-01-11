/**
 * Fractal Circle Map
 * AUTUS 프랙탈 서클 맵
 */

import React from 'react';

interface FractalCircleMapProps {
  selfValue?: number;
  domains?: Array<{
    id: string;
    name: string;
    nameKo?: string;
    emoji?: string;
    color: string;
    nodes: string[];
    value?: number;
  }>;
  nodes?: Array<{
    id: string;
    name: string;
    nameKo?: string;
    emoji?: string;
    value: number;
    confidence?: number;
    log_count?: number;
    logs_needed?: number;
    actionable?: boolean;
    is_warning?: boolean;
  }>;
  onNodeClick?: (nodeId: string) => void;
}

export function FractalCircleMap({ 
  selfValue = 0.5, 
  domains = [], 
  nodes = [],
  onNodeClick 
}: FractalCircleMapProps) {
  // 도메인별 색상으로 원 그리기
  const domainAngles = domains.map((_, i) => (i * 360) / Math.max(domains.length, 1));
  
  return (
    <div className="w-full h-full flex items-center justify-center p-8">
      <div className="relative">
        {/* 외곽 원 - 도메인들 */}
        <div className="w-[400px] h-[400px] rounded-full border-2 border-slate-700 relative">
          {domains.map((domain, i) => {
            const angle = (domainAngles[i] - 90) * (Math.PI / 180);
            const radius = 180;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            
            return (
              <div
                key={domain.id}
                className="absolute w-16 h-16 rounded-full flex items-center justify-center cursor-pointer transition-transform hover:scale-110"
                style={{
                  left: `calc(50% + ${x}px - 32px)`,
                  top: `calc(50% + ${y}px - 32px)`,
                  backgroundColor: `${domain.color}30`,
                  border: `2px solid ${domain.color}`,
                }}
                onClick={() => domain.nodes[0] && onNodeClick?.(domain.nodes[0])}
              >
                <span className="text-2xl">{domain.emoji || '📊'}</span>
              </div>
            );
          })}
          
          {/* 중간 원 */}
          <div className="absolute inset-[80px] rounded-full border-2 border-slate-600/50">
            {/* 노드들 */}
            {nodes.slice(0, 6).map((node, i) => {
              const angle = ((i * 60) - 90) * (Math.PI / 180);
              const radius = 70;
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;
              
              const nodeColor = node.value >= 0.7 ? '#22c55e' : 
                               node.value >= 0.4 ? '#f59e0b' : '#ef4444';
              
              return (
                <div
                  key={node.id}
                  className="absolute w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition-transform hover:scale-110"
                  style={{
                    left: `calc(50% + ${x}px - 20px)`,
                    top: `calc(50% + ${y}px - 20px)`,
                    backgroundColor: `${nodeColor}30`,
                    border: `2px solid ${nodeColor}`,
                  }}
                  onClick={() => onNodeClick?.(node.id)}
                  title={`${node.nameKo || node.name}: ${(node.value * 100).toFixed(0)}%`}
                >
                  <span className="text-sm">{node.emoji || '●'}</span>
                </div>
              );
            })}
          </div>
          
          {/* 중심 - Self Value */}
          <div 
            className="absolute inset-[150px] rounded-full flex items-center justify-center"
            style={{
              background: `conic-gradient(
                from 0deg,
                ${selfValue >= 0.7 ? '#22c55e' : selfValue >= 0.4 ? '#f59e0b' : '#ef4444'} ${selfValue * 360}deg,
                #1e293b ${selfValue * 360}deg
              )`,
            }}
          >
            <div className="w-20 h-20 rounded-full bg-slate-900 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-white">
                {(selfValue * 100).toFixed(0)}%
              </span>
              <span className="text-[10px] text-slate-400">Self</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FractalCircleMap;
