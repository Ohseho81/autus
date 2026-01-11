/**
 * AUTUS Priority Alert
 * ====================
 * 
 * "오늘 가장 먼저 해결해야 할 것"을 자동으로 표시
 * 화면 상단에 고정되어 주의를 끔
 */

import React, { useState, useEffect } from 'react';
import { AlertTriangle, ChevronRight, X, Zap, Clock, Target } from 'lucide-react';
import { Tooltip, AUTUS_GLOSSARY } from './Tooltip';
import { colors, statusColors } from '../../styles/colors';

// 값 기반 상태 색상
const getStatusColor = (value: number): string => {
  if (value >= 0.7) return statusColors.success;
  if (value >= 0.4) return statusColors.warning;
  return statusColors.error;
};

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

interface NodeSummary {
  value: number;
  confidence: number;
  log_count: number;
  is_warning?: boolean;
  actionable?: boolean;
  uncertainty_level: string;
}

interface PriorityAlertProps {
  nodes: Record<string, NodeSummary>;
  onNodeClick?: (nodeId: string) => void;
  onDismiss?: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// 우선순위 계산
// ═══════════════════════════════════════════════════════════════════════════

interface PriorityNode extends NodeSummary {
  id: string;
  name: string;
  priority: number;
  reason: string;
  urgency: 'critical' | 'high' | 'medium';
}

function calculatePriority(id: string, node: NodeSummary): PriorityNode | null {
  let priority = 0;
  let reason = '';
  let urgency: 'critical' | 'high' | 'medium' = 'medium';
  
  // 1. 데이터 부족 (가장 중요)
  if (node.log_count === 0) {
    priority += 100;
    reason = '데이터 없음 - 서비스 연결 대기 중';
    urgency = 'critical';
  } else if (node.log_count < 3) {
    priority += 70;
    reason = `데이터 수집 중 (${node.log_count}건) - 관찰 진행 중`;
    urgency = 'high';
  }
  
  // 2. 경고 상태
  if (node.is_warning) {
    priority += 50;
    if (!reason) {
      reason = '신뢰도 경고 - 데이터가 불안정합니다';
      urgency = 'high';
    }
  }
  
  // 3. 값 저하
  if (node.value < 0.3) {
    priority += 40;
    if (!reason) {
      reason = `값 저하 (${Math.round(node.value * 100)}%) - 주의가 필요합니다`;
      urgency = 'high';
    }
  } else if (node.value < 0.5) {
    priority += 20;
    if (!reason) {
      reason = `평균 이하 (${Math.round(node.value * 100)}%) - 개선 여지 있음`;
      urgency = 'medium';
    }
  }
  
  // 4. 낮은 신뢰도
  if (node.confidence < 0.3 && !reason) {
    priority += 30;
    reason = '신뢰도 낮음 - 데이터가 더 필요합니다';
    urgency = 'medium';
  }
  
  // 우선순위가 없으면 null 반환
  if (priority === 0) return null;
  
  return {
    ...node,
    id,
    name: id,
    priority,
    reason,
    urgency
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════

export const PriorityAlert: React.FC<PriorityAlertProps> = ({
  nodes,
  onNodeClick,
  onDismiss
}) => {
  const [dismissed, setDismissed] = useState(false);
  const [expanded, setExpanded] = useState(true);
  
  // 우선순위 노드 계산
  const priorityNodes = Object.entries(nodes)
    .map(([id, node]) => calculatePriority(id, node))
    .filter((n): n is PriorityNode => n !== null)
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 3); // 상위 3개만
  
  // 우선순위 노드가 없으면 표시 안함
  if (priorityNodes.length === 0 || dismissed) {
    return null;
  }
  
  const topNode = priorityNodes[0];
  const glossaryEntry = AUTUS_GLOSSARY[topNode.id as keyof typeof AUTUS_GLOSSARY];
  
  const urgencyColors = {
    critical: { bg: 'bg-red-900/30', border: 'border-red-500/50', text: 'text-red-400', icon: '🚨' },
    high: { bg: 'bg-amber-900/30', border: 'border-amber-500/50', text: 'text-amber-400', icon: '⚠️' },
    medium: { bg: 'bg-blue-900/30', border: 'border-blue-500/50', text: 'text-blue-400', icon: '💡' }
  };
  
  const urgencyStyle = urgencyColors[topNode.urgency];
  
  return (
    <div className={`mb-4 rounded-xl border ${urgencyStyle.border} ${urgencyStyle.bg} overflow-hidden transition-all duration-300`}>
      {/* 헤더 - 항상 표시 */}
      <div 
        className="p-4 cursor-pointer flex items-center justify-between"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{urgencyStyle.icon}</span>
          <div>
            <div className="flex items-center gap-2">
              <span className={`font-bold ${urgencyStyle.text}`}>오늘의 과제</span>
              <span className="text-xs text-slate-500">
                {priorityNodes.length}개 항목
              </span>
            </div>
            <p className="text-sm text-slate-400">
              {topNode.name}: {topNode.reason}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setDismissed(true);
              onDismiss?.();
            }}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            title="오늘 하루 숨기기"
          >
            <X size={16} className="text-slate-500" />
          </button>
          <ChevronRight 
            size={20} 
            className={`text-slate-400 transition-transform ${expanded ? 'rotate-90' : ''}`}
          />
        </div>
      </div>
      
      {/* 확장 내용 */}
      {expanded && (
        <div className="px-4 pb-4 space-y-2">
          {priorityNodes.map((node, index) => {
            const nodeGlossary = AUTUS_GLOSSARY[node.id as keyof typeof AUTUS_GLOSSARY];
            const nodeUrgencyStyle = urgencyColors[node.urgency];
            
            return (
              <div
                key={node.id}
                onClick={() => onNodeClick?.(node.id)}
                className={`p-3 rounded-lg border ${nodeUrgencyStyle.border} bg-slate-800/50 
                           cursor-pointer hover:bg-slate-700/50 transition-all
                           flex items-center justify-between group`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{nodeGlossary?.emoji || '📊'}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{node.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${nodeUrgencyStyle.bg} ${nodeUrgencyStyle.text}`}>
                        #{index + 1}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">{node.reason}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-sm font-mono" style={{ color: getStatusColor(node.value) }}>
                      {Math.round(node.value * 100)}%
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {node.log_count}개 기록
                    </div>
                  </div>
                  <ChevronRight 
                    size={16} 
                    className="text-slate-500 group-hover:text-white transition-colors"
                  />
                </div>
              </div>
            );
          })}
          
          {/* 빠른 액션 버튼 */}
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => onNodeClick?.(topNode.id)}
              className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium 
                         ${urgencyStyle.bg} ${urgencyStyle.text} border ${urgencyStyle.border}
                         hover:brightness-110 transition-all flex items-center justify-center gap-2`}
            >
              <Target size={16} />
              {topNode.name} 서비스 연결
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PriorityAlert;