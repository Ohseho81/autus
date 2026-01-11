/**
 * AUTUS Node Detail Modal
 * =======================
 * 
 * 노드 클릭 시 표시되는 상세 정보 모달
 * "이게 뭔지, 어떤 상태인지, 뭘 해야 하는지"를 한눈에
 */

import React, { useEffect } from 'react';
import { 
  X, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, 
  Clock, Activity, Target, Zap, Info, ChevronRight 
} from 'lucide-react';
import { Tooltip, AUTUS_GLOSSARY } from './Tooltip';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════
interface NodeData {
  id: string;
  name: string;
  value: number;
  confidence: number;
  log_count: number;
  uncertainty_level: 'range' | 'estimate' | 'confirmed';
  actionable: boolean;
  is_warning?: boolean;
  display?: {
    min: number;
    max: number;
  };
  // 진단 정보 (있으면)
  diagnosis?: {
    status_report: string;
    primary_issue: string;
    recommended_action: string;
    logs_needed: number;
    health_status: 'healthy' | 'warning' | 'critical';
    urgency_level: number;
  };
}

interface NodeDetailModalProps {
  node: NodeData | null;
  domain?: string;
  onClose: () => void;
  onLogActivity?: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════════════
const formatPercent = (value: number) => `${Math.round(value * 100)}%`;

const getStatusColor = (value: number): string => {
  if (value >= 0.7) return '#10B981'; // green
  if (value >= 0.5) return '#FBBF24'; // yellow
  if (value >= 0.3) return '#F97316'; // orange
  return '#EF4444'; // red
};

const getHealthIcon = (status?: string) => {
  switch (status) {
    case 'healthy':
      return <CheckCircle className="text-emerald-400" size={20} />;
    case 'warning':
      return <AlertTriangle className="text-amber-400" size={20} />;
    case 'critical':
      return <AlertTriangle className="text-red-400" size={20} />;
    default:
      return <Activity className="text-slate-400" size={20} />;
  }
};

const getUncertaintyLabel = (level: string) => {
  switch (level) {
    case 'confirmed':
      return { label: '확정됨', color: 'text-emerald-400', bg: 'bg-emerald-900/30' };
    case 'estimate':
      return { label: '추정', color: 'text-amber-400', bg: 'bg-amber-900/30' };
    case 'range':
    default:
      return { label: '범위', color: 'text-slate-400', bg: 'bg-slate-800' };
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════
export const NodeDetailModal: React.FC<NodeDetailModalProps> = ({
  node,
  domain,
  onClose,
  onLogActivity
}) => {
  // ESC 키로 닫기
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!node) return null;

  const glossaryEntry = AUTUS_GLOSSARY[node.id as keyof typeof AUTUS_GLOSSARY];
  const uncertaintyInfo = getUncertaintyLabel(node.uncertainty_level);
  const statusColor = getStatusColor(node.value);

  return (
    <>
      {/* 배경 오버레이 */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
        onClick={onClose}
      />
      
      {/* 모달 */}
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div 
          className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 헤더 */}
          <div 
            className="p-5 border-b border-slate-700"
            style={{ 
              background: `linear-gradient(135deg, ${statusColor}15, transparent)` 
            }}
          >
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                {/* 아이콘 */}
                <div 
                  className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl"
                  style={{ backgroundColor: `${statusColor}20`, border: `2px solid ${statusColor}50` }}
                >
                  {glossaryEntry?.emoji || '📊'}
                </div>
                
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    {node.name}
                    {node.is_warning && (
                      <span className="text-amber-400 text-sm">⚠️</span>
                    )}
                  </h2>
                  <p className="text-sm text-slate-400">
                    {glossaryEntry?.title || node.id}
                  </p>
                </div>
              </div>
              
              <button 
                onClick={onClose}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X size={20} className="text-slate-400" />
              </button>
            </div>
          </div>

          {/* 내용 */}
          <div className="p-5 space-y-5 overflow-y-auto max-h-[60vh]">
            
            {/* 노드 설명 */}
            {glossaryEntry && (
              <div className="p-4 bg-slate-800/50 rounded-xl">
                <div className="flex items-start gap-2">
                  <Info size={16} className="text-cyan-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-slate-300">
                      {glossaryEntry.description}
                    </p>
                    {glossaryEntry.example && (
                      <p className="text-xs text-slate-500 mt-2">
                        예: {glossaryEntry.example}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 현재 상태 */}
            <div className="grid grid-cols-2 gap-4">
              {/* 값 */}
              <div className="p-4 bg-slate-800/50 rounded-xl">
                <div className="text-xs text-slate-500 mb-1">현재 값</div>
                <div className="flex items-baseline gap-2">
                  <span 
                    className="text-3xl font-bold"
                    style={{ color: statusColor }}
                  >
                    {formatPercent(node.value)}
                  </span>
                  {node.display && node.uncertainty_level === 'range' && (
                    <span className="text-xs text-slate-500">
                      ({formatPercent(node.display.min)} ~ {formatPercent(node.display.max)})
                    </span>
                  )}
                </div>
                <div className={`text-xs mt-2 px-2 py-1 rounded inline-block ${uncertaintyInfo.bg} ${uncertaintyInfo.color}`}>
                  {uncertaintyInfo.label}
                </div>
              </div>
              
              {/* 신뢰도 */}
              <div className="p-4 bg-slate-800/50 rounded-xl">
                <div className="text-xs text-slate-500 mb-1">데이터 신뢰도</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-blue-400">
                    {formatPercent(node.confidence)}
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-2">
                  {node.log_count}개 로그 기록됨
                </div>
              </div>
            </div>

            {/* 자기 진단 보고서 (있으면) */}
            {node.diagnosis && (
              <div className="p-4 bg-slate-800/30 border border-slate-700 rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                  {getHealthIcon(node.diagnosis.health_status)}
                  <span className="font-semibold">노드 자가 진단</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    node.diagnosis.health_status === 'healthy' ? 'bg-emerald-900/30 text-emerald-400' :
                    node.diagnosis.health_status === 'warning' ? 'bg-amber-900/30 text-amber-400' :
                    'bg-red-900/30 text-red-400'
                  }`}>
                    긴급도 {node.diagnosis.urgency_level}/10
                  </span>
                </div>
                
                {/* 상태 보고서 */}
                <div className="p-3 bg-slate-900/50 rounded-lg mb-3">
                  <p className="text-sm italic text-slate-300">
                    "{node.diagnosis.status_report}"
                  </p>
                </div>
                
                {/* 주요 문제 */}
                {node.diagnosis.primary_issue !== '특별한 문제 없음' && (
                  <div className="flex items-center gap-2 text-sm text-amber-400 mb-2">
                    <AlertTriangle size={14} />
                    <span>{node.diagnosis.primary_issue}</span>
                  </div>
                )}
              </div>
            )}

            {/* 권장 행동 */}
            <div className={`p-4 rounded-xl border ${
              node.actionable 
                ? 'bg-emerald-900/20 border-emerald-500/30' 
                : 'bg-slate-800/30 border-slate-700'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <Zap size={16} className={node.actionable ? 'text-emerald-400' : 'text-slate-500'} />
                <span className="font-semibold text-sm">
                  {node.actionable ? '권장 행동' : '데이터 수집 필요'}
                </span>
              </div>
              
              <p className="text-sm text-slate-300">
                {node.diagnosis?.recommended_action || 
                  (node.actionable 
                    ? '이 노드는 충분한 데이터가 있어 신뢰할 수 있습니다.'
                    : `더 정확한 분석을 위해 ${node.diagnosis?.logs_needed || '더 많은'} 기록이 필요합니다.`
                  )
                }
              </p>
              
              {/* 서비스 연결 버튼 */}
              {onLogActivity && (
                <button
                  onClick={onLogActivity}
                  className={`mt-3 w-full py-2 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                    node.actionable
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      : 'bg-slate-700 hover:bg-slate-600 text-white'
                  }`}
                >
                  <Target size={16} />
                  {node.name} 서비스 연결
                  <ChevronRight size={16} />
                </button>
              )}
            </div>

            {/* 도메인 정보 */}
            {domain && (
              <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-800">
                <span>도메인: {domain}</span>
                <span>ID: {node.id}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default NodeDetailModal;
