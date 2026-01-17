/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS BPMN Viewer with Real-time Overlay
 * bpmn-js + 실시간 데이터 오버레이
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * 2026 글로벌 트렌드: Camunda Cockpit 스타일
 * - Task 위: automation-level % 원형 배지
 * - Gateway 위: 결정 확률
 * - Sequence Flow 위: 평균 지연 시간
 * - 삭제 대상: 붉은 테두리 + "Delete Pending"
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface BPMNElement {
  id: string;
  type: 'task' | 'gateway' | 'event' | 'flow';
  name: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  // 실시간 메트릭
  automationLevel?: number;
  kValue?: number;
  avgDuration?: number;
  successRate?: number;
  status?: 'active' | 'pending_delete' | 'high_risk' | 'completed';
  // Flow 전용
  sourceId?: string;
  targetId?: string;
}

export interface OverlayConfig {
  showAutomationBadge: boolean;
  showDurationOverlay: boolean;
  showStatusIndicator: boolean;
  showHeatmap: boolean;
  pulseOnHighAutomation: boolean;
}

interface BPMNViewerProps {
  elements: BPMNElement[];
  onElementClick?: (element: BPMNElement) => void;
  onDeleteTrigger?: (elementIds: string[]) => void;
  overlayConfig?: OverlayConfig;
  realTimeData?: Record<string, Partial<BPMNElement>>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Default Config
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULT_OVERLAY_CONFIG: OverlayConfig = {
  showAutomationBadge: true,
  showDurationOverlay: true,
  showStatusIndicator: true,
  showHeatmap: true,
  pulseOnHighAutomation: true,
};

// ═══════════════════════════════════════════════════════════════════════════════
// Color Utilities
// ═══════════════════════════════════════════════════════════════════════════════

const getAutomationColor = (level: number): string => {
  if (level >= 0.98) return '#10b981'; // 삭제 대상 (녹색)
  if (level >= 0.8) return '#22c55e';
  if (level >= 0.6) return '#84cc16';
  if (level >= 0.4) return '#eab308';
  if (level >= 0.2) return '#f97316';
  return '#ef4444';
};

const getStatusColor = (status?: string): string => {
  switch (status) {
    case 'pending_delete': return '#ef4444';
    case 'high_risk': return '#f97316';
    case 'completed': return '#6b7280';
    default: return '#3b82f6';
  }
};

const getDurationColor = (ms: number): string => {
  if (ms > 60000) return '#ef4444'; // > 1분: 빨강
  if (ms > 30000) return '#f97316'; // > 30초: 주황
  if (ms > 10000) return '#eab308'; // > 10초: 노랑
  return '#22c55e'; // 정상: 녹색
};

// ═══════════════════════════════════════════════════════════════════════════════
// BPMN Element Components
// ═══════════════════════════════════════════════════════════════════════════════

interface TaskNodeProps {
  element: BPMNElement;
  config: OverlayConfig;
  onClick?: () => void;
  isSelected: boolean;
}

const TaskNode: React.FC<TaskNodeProps> = ({ element, config, onClick, isSelected }) => {
  const automationLevel = element.automationLevel ?? 0;
  const isPendingDelete = element.status === 'pending_delete' || automationLevel >= 0.98;
  const isHighRisk = element.status === 'high_risk' || (element.kValue && element.kValue < 1.0);
  
  return (
    <motion.g
      onClick={onClick}
      style={{ cursor: 'pointer' }}
      whileHover={{ scale: 1.02 }}
    >
      {/* Task Rectangle */}
      <motion.rect
        x={element.x}
        y={element.y}
        width={element.width || 120}
        height={element.height || 60}
        rx={8}
        fill="#1e293b"
        stroke={isPendingDelete ? '#ef4444' : isHighRisk ? '#f97316' : isSelected ? '#3b82f6' : '#475569'}
        strokeWidth={isPendingDelete || isHighRisk || isSelected ? 3 : 1.5}
        animate={isPendingDelete && config.pulseOnHighAutomation ? {
          strokeOpacity: [1, 0.5, 1],
        } : {}}
        transition={{ duration: 1.5, repeat: Infinity }}
      />
      
      {/* Task Name */}
      <text
        x={(element.x || 0) + (element.width || 120) / 2}
        y={(element.y || 0) + 25}
        textAnchor="middle"
        fill="#e2e8f0"
        fontSize={11}
        fontWeight={500}
      >
        {element.name.length > 15 ? element.name.slice(0, 15) + '...' : element.name}
      </text>
      
      {/* Automation Badge (오버레이) */}
      {config.showAutomationBadge && (
        <g>
          <motion.circle
            cx={(element.x || 0) + (element.width || 120) - 10}
            cy={(element.y || 0) + 10}
            r={16}
            fill={getAutomationColor(automationLevel)}
            animate={automationLevel >= 0.9 && config.pulseOnHighAutomation ? {
              scale: [1, 1.1, 1],
              opacity: [1, 0.8, 1],
            } : {}}
            transition={{ duration: 1, repeat: Infinity }}
          />
          <text
            x={(element.x || 0) + (element.width || 120) - 10}
            y={(element.y || 0) + 14}
            textAnchor="middle"
            fill="#fff"
            fontSize={9}
            fontWeight="bold"
          >
            {Math.round(automationLevel * 100)}%
          </text>
        </g>
      )}
      
      {/* K-Value Badge */}
      {element.kValue !== undefined && (
        <g>
          <rect
            x={(element.x || 0) + 5}
            y={(element.y || 0) + (element.height || 60) - 20}
            width={35}
            height={16}
            rx={3}
            fill={element.kValue >= 1.0 ? '#22c55e' : '#ef4444'}
            opacity={0.9}
          />
          <text
            x={(element.x || 0) + 22}
            y={(element.y || 0) + (element.height || 60) - 8}
            textAnchor="middle"
            fill="#fff"
            fontSize={8}
            fontWeight="bold"
          >
            K:{element.kValue.toFixed(1)}
          </text>
        </g>
      )}
      
      {/* Status Indicator */}
      {config.showStatusIndicator && isPendingDelete && (
        <motion.g
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <rect
            x={(element.x || 0) + (element.width || 120) / 2 - 40}
            y={(element.y || 0) - 25}
            width={80}
            height={20}
            rx={4}
            fill="#ef4444"
          />
          <text
            x={(element.x || 0) + (element.width || 120) / 2}
            y={(element.y || 0) - 11}
            textAnchor="middle"
            fill="#fff"
            fontSize={9}
            fontWeight="bold"
          >
            DELETE PENDING
          </text>
        </motion.g>
      )}
      
      {/* Duration Overlay */}
      {config.showDurationOverlay && element.avgDuration !== undefined && (
        <g>
          <rect
            x={(element.x || 0) + (element.width || 120) - 45}
            y={(element.y || 0) + (element.height || 60) - 20}
            width={40}
            height={16}
            rx={3}
            fill={getDurationColor(element.avgDuration)}
            opacity={0.9}
          />
          <text
            x={(element.x || 0) + (element.width || 120) - 25}
            y={(element.y || 0) + (element.height || 60) - 8}
            textAnchor="middle"
            fill="#fff"
            fontSize={8}
          >
            {element.avgDuration < 1000 ? `${element.avgDuration}ms` : `${(element.avgDuration / 1000).toFixed(1)}s`}
          </text>
        </g>
      )}
    </motion.g>
  );
};

// Gateway Node
const GatewayNode: React.FC<TaskNodeProps> = ({ element, config, onClick, isSelected }) => {
  const successRate = element.successRate ?? 0.75;
  
  return (
    <motion.g onClick={onClick} style={{ cursor: 'pointer' }}>
      {/* Diamond Shape */}
      <motion.polygon
        points={`
          ${(element.x || 0) + 25},${element.y || 0}
          ${(element.x || 0) + 50},${(element.y || 0) + 25}
          ${(element.x || 0) + 25},${(element.y || 0) + 50}
          ${element.x || 0},${(element.y || 0) + 25}
        `}
        fill="#1e293b"
        stroke={isSelected ? '#3b82f6' : '#fbbf24'}
        strokeWidth={2}
      />
      
      {/* X or + inside */}
      <text
        x={(element.x || 0) + 25}
        y={(element.y || 0) + 30}
        textAnchor="middle"
        fill="#fbbf24"
        fontSize={18}
        fontWeight="bold"
      >
        ×
      </text>
      
      {/* Decision Rate Overlay */}
      <g>
        <rect
          x={(element.x || 0) + 50}
          y={(element.y || 0) - 5}
          width={50}
          height={20}
          rx={4}
          fill="#8b5cf6"
          opacity={0.9}
        />
        <text
          x={(element.x || 0) + 75}
          y={(element.y || 0) + 9}
          textAnchor="middle"
          fill="#fff"
          fontSize={9}
          fontWeight="bold"
        >
          {Math.round(successRate * 100)}% Auto
        </text>
      </g>
    </motion.g>
  );
};

// Event Node (Start/End)
const EventNode: React.FC<TaskNodeProps & { eventType: 'start' | 'end' }> = ({ element, config, onClick, isSelected, eventType }) => {
  const isDeleted = element.status === 'completed';
  
  return (
    <motion.g onClick={onClick} style={{ cursor: 'pointer' }}>
      <motion.circle
        cx={(element.x || 0) + 20}
        cy={(element.y || 0) + 20}
        r={20}
        fill={eventType === 'start' ? '#22c55e' : isDeleted ? '#6b7280' : '#ef4444'}
        stroke={isSelected ? '#3b82f6' : eventType === 'start' ? '#16a34a' : '#dc2626'}
        strokeWidth={eventType === 'end' ? 4 : 2}
        animate={isDeleted ? { opacity: [1, 0.5, 1] } : {}}
        transition={{ duration: 2, repeat: Infinity }}
      />
      
      {isDeleted && (
        <text
          x={(element.x || 0) + 20}
          y={(element.y || 0) + 50}
          textAnchor="middle"
          fill="#6b7280"
          fontSize={10}
        >
          Deleted
        </text>
      )}
    </motion.g>
  );
};

// Sequence Flow (Arrow)
const SequenceFlow: React.FC<{
  flow: BPMNElement;
  elements: BPMNElement[];
  config: OverlayConfig;
}> = ({ flow, elements, config }) => {
  const source = elements.find(e => e.id === flow.sourceId);
  const target = elements.find(e => e.id === flow.targetId);
  
  if (!source || !target) return null;
  
  const sourceX = (source.x || 0) + (source.width || 50) / 2;
  const sourceY = (source.y || 0) + (source.height || 50) / 2;
  const targetX = (target.x || 0) + (target.width || 50) / 2;
  const targetY = (target.y || 0) + (target.height || 50) / 2;
  
  const midX = (sourceX + targetX) / 2;
  const midY = (sourceY + targetY) / 2;
  
  return (
    <g>
      <defs>
        <marker
          id={`arrow-${flow.id}`}
          markerWidth="10"
          markerHeight="10"
          refX="9"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0,0 L0,6 L9,3 z" fill="#64748b" />
        </marker>
      </defs>
      
      <line
        x1={sourceX}
        y1={sourceY}
        x2={targetX}
        y2={targetY}
        stroke="#64748b"
        strokeWidth={1.5}
        markerEnd={`url(#arrow-${flow.id})`}
      />
      
      {/* Duration Overlay on Flow */}
      {config.showDurationOverlay && flow.avgDuration !== undefined && (
        <g>
          <rect
            x={midX - 25}
            y={midY - 10}
            width={50}
            height={18}
            rx={4}
            fill={getDurationColor(flow.avgDuration)}
            opacity={0.85}
          />
          <text
            x={midX}
            y={midY + 3}
            textAnchor="middle"
            fill="#fff"
            fontSize={9}
          >
            {flow.avgDuration < 1000 ? `${flow.avgDuration}ms` : `${(flow.avgDuration / 1000).toFixed(1)}s`}
          </text>
        </g>
      )}
    </g>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// Main BPMN Viewer Component
// ═══════════════════════════════════════════════════════════════════════════════

export function BPMNViewer({
  elements,
  onElementClick,
  onDeleteTrigger,
  overlayConfig = DEFAULT_OVERLAY_CONFIG,
  realTimeData = {},
}: BPMNViewerProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [mergedElements, setMergedElements] = useState<BPMNElement[]>(elements);
  
  // 실시간 데이터 병합
  useEffect(() => {
    const updated = elements.map(el => ({
      ...el,
      ...(realTimeData[el.id] || {}),
    }));
    setMergedElements(updated);
  }, [elements, realTimeData]);
  
  const handleElementClick = useCallback((element: BPMNElement) => {
    setSelectedElement(element.id);
    onElementClick?.(element);
  }, [onElementClick]);
  
  // 삭제 대상 일괄 처리
  const handleBatchDelete = useCallback(() => {
    const deleteIds = mergedElements
      .filter(el => el.status === 'pending_delete' || (el.automationLevel && el.automationLevel >= 0.98))
      .map(el => el.id);
    
    if (deleteIds.length > 0) {
      onDeleteTrigger?.(deleteIds);
    }
  }, [mergedElements, onDeleteTrigger]);
  
  // Flows와 Nodes 분리
  const flows = mergedElements.filter(el => el.type === 'flow');
  const nodes = mergedElements.filter(el => el.type !== 'flow');
  
  return (
    <div className="relative w-full h-full bg-slate-900 rounded-xl overflow-hidden">
      {/* Toolbar */}
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        <button
          onClick={handleBatchDelete}
          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded text-white text-sm font-medium transition-colors"
        >
          🗑️ 삭제 대상 처리
        </button>
        <button
          onClick={() => setSelectedElement(null)}
          className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded text-white text-sm"
        >
          선택 해제
        </button>
      </div>
      
      {/* Legend */}
      <div className="absolute top-4 right-4 z-10 bg-slate-800/90 rounded-lg p-3 text-xs">
        <div className="text-slate-400 mb-2 font-medium">오버레이 범례</div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-slate-300">90%+ 자동화</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-slate-300">삭제 대상</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500" />
            <span className="text-slate-300">고위험 (K&lt;1.0)</span>
          </div>
        </div>
      </div>
      
      {/* BPMN Canvas */}
      <svg ref={svgRef} className="w-full h-full" viewBox="0 0 900 600">
        {/* Background Grid */}
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#334155" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
        
        {/* Heatmap Overlay (선택적) */}
        {overlayConfig.showHeatmap && (
          <g opacity={0.15}>
            {nodes.filter(n => n.automationLevel && n.automationLevel > 0.5).map(node => (
              <circle
                key={`heatmap-${node.id}`}
                cx={(node.x || 0) + (node.width || 60) / 2}
                cy={(node.y || 0) + (node.height || 60) / 2}
                r={80}
                fill={getAutomationColor(node.automationLevel || 0)}
                style={{ filter: 'blur(30px)' }}
              />
            ))}
          </g>
        )}
        
        {/* Sequence Flows */}
        {flows.map(flow => (
          <SequenceFlow
            key={flow.id}
            flow={flow}
            elements={nodes}
            config={overlayConfig}
          />
        ))}
        
        {/* Nodes */}
        {nodes.map(element => {
          if (element.type === 'task') {
            return (
              <TaskNode
                key={element.id}
                element={element}
                config={overlayConfig}
                onClick={() => handleElementClick(element)}
                isSelected={selectedElement === element.id}
              />
            );
          }
          if (element.type === 'gateway') {
            return (
              <GatewayNode
                key={element.id}
                element={element}
                config={overlayConfig}
                onClick={() => handleElementClick(element)}
                isSelected={selectedElement === element.id}
              />
            );
          }
          if (element.type === 'event') {
            return (
              <EventNode
                key={element.id}
                element={element}
                config={overlayConfig}
                onClick={() => handleElementClick(element)}
                isSelected={selectedElement === element.id}
                eventType={element.name.includes('Start') ? 'start' : 'end'}
              />
            );
          }
          return null;
        })}
      </svg>
      
      {/* Selected Element Panel */}
      <AnimatePresence>
        {selectedElement && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="absolute bottom-4 right-4 bg-slate-800 rounded-lg p-4 w-64 shadow-xl border border-slate-700"
          >
            {(() => {
              const el = mergedElements.find(e => e.id === selectedElement);
              if (!el) return null;
              return (
                <>
                  <h3 className="text-white font-bold mb-2">{el.name}</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">자동화</span>
                      <span className="text-green-400 font-mono">
                        {Math.round((el.automationLevel || 0) * 100)}%
                      </span>
                    </div>
                    {el.kValue !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">K-Value</span>
                        <span className={`font-mono ${el.kValue >= 1.0 ? 'text-green-400' : 'text-red-400'}`}>
                          {el.kValue.toFixed(2)}
                        </span>
                      </div>
                    )}
                    {el.avgDuration !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">평균 시간</span>
                        <span className="text-blue-400 font-mono">
                          {el.avgDuration < 1000 ? `${el.avgDuration}ms` : `${(el.avgDuration / 1000).toFixed(1)}s`}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-400">상태</span>
                      <span className={`font-medium ${
                        el.status === 'pending_delete' ? 'text-red-400' :
                        el.status === 'high_risk' ? 'text-orange-400' : 'text-blue-400'
                      }`}>
                        {el.status || 'active'}
                      </span>
                    </div>
                  </div>
                </>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default BPMNViewer;
