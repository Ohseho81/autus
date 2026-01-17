/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS OperatorCard - 운영자(K3~K5) 전용 카드
 * "관리의 기준을 설명에서 증거로 바꾼다."
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState } from 'react';
import { 
  BaseCard, 
  CardInfoRow, 
  CardAlert, 
  CardActions, 
  CardButton,
} from './BaseCard';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface Conflict {
  id: string;
  source: string;       // "A공정 지연"
  target: string;       // "B공정 대기"
  impact: string;       // "일정 +3일"
  severity: 'low' | 'medium' | 'high';
  recommendations: Array<{
    id: string;
    action: string;
    effort: 'low' | 'medium' | 'high';
  }>;
}

interface OperatorCardProps {
  conflict: Conflict;
  onPrepare: (conflictId: string, recommendationId: string) => void;
  onEscalate?: (conflictId: string) => void;
  onDismiss?: (conflictId: string) => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ConflictCard - 충돌 감지 카드 (ENGINE B)
// ═══════════════════════════════════════════════════════════════════════════════

export function ConflictCard({
  conflict,
  onPrepare,
  onEscalate,
  onDismiss,
}: OperatorCardProps) {
  const [selectedRec, setSelectedRec] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const severityColors = {
    low: 'border-yellow-500/30 bg-yellow-500/10',
    medium: 'border-orange-500/30 bg-orange-500/10',
    high: 'border-red-500/30 bg-red-500/10',
  };

  const effortLabels = {
    low: { text: '소', color: 'text-green-400' },
    medium: { text: '중', color: 'text-amber-400' },
    high: { text: '대', color: 'text-red-400' },
  };

  const handlePrepare = async () => {
    if (!selectedRec) return;
    setIsLoading(true);
    try {
      await onPrepare(conflict.id, selectedRec);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <BaseCard 
      type="conflict"
      priority={conflict.severity === 'high' ? 'high' : 'normal'}
    >
      {/* 충돌 설명 */}
      <div className={`p-4 rounded-xl border ${severityColors[conflict.severity]}`}>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-orange-400 font-medium">{conflict.source}</span>
          <span className="text-gray-500">→</span>
          <span className="text-orange-400 font-medium">{conflict.target}</span>
        </div>
      </div>

      {/* 영향 */}
      <CardInfoRow 
        label="영향" 
        value={conflict.impact} 
        highlight 
      />

      {/* 권고 준비안 */}
      <div className="space-y-2">
        <p className="text-sm text-gray-400">권고 준비안:</p>
        {conflict.recommendations.map((rec) => (
          <button
            key={rec.id}
            onClick={() => setSelectedRec(rec.id)}
            className={`
              w-full p-3 rounded-lg text-left transition-all
              ${selectedRec === rec.id 
                ? 'bg-blue-500/20 border-2 border-blue-500' 
                : 'bg-gray-700/30 border border-gray-600 hover:border-gray-500'
              }
            `}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-white">• {rec.action}</span>
              <span className={`text-xs ${effortLabels[rec.effort].color}`}>
                노력: {effortLabels[rec.effort].text}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* 액션 버튼 */}
      <CardActions variant="vertical">
        <CardButton 
          variant="primary" 
          onClick={handlePrepare}
          disabled={!selectedRec}
          loading={isLoading}
          fullWidth
        >
          조치 준비 완료
        </CardButton>
        
        {onEscalate && (
          <CardButton 
            variant="ghost" 
            onClick={() => onEscalate(conflict.id)}
          >
            상위 결정자에게 전달
          </CardButton>
        )}
      </CardActions>
    </BaseCard>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TaskRedefinitionCard - 업무 재정의 매트릭스 카드 (ENGINE A)
// ═══════════════════════════════════════════════════════════════════════════════

interface TaskModule {
  id: string;
  name: string;
  taskCount: number;
  status: 'manual' | 'semi_auto' | 'auto' | 'deleted';
  recommendation?: 'unify' | 'delete' | 'automate';
}

interface TaskRedefinitionCardProps {
  totalTasks: number;
  modules: TaskModule[];
  onUnify: (moduleId: string) => void;
  onDelete: (moduleId: string) => void;
  onAutomate: (moduleId: string) => void;
}

export function TaskRedefinitionCard({
  totalTasks,
  modules,
  onUnify,
  onDelete,
  onAutomate,
}: TaskRedefinitionCardProps) {
  const statusColors = {
    manual: 'bg-red-500/20 text-red-400',
    semi_auto: 'bg-amber-500/20 text-amber-400',
    auto: 'bg-green-500/20 text-green-400',
    deleted: 'bg-gray-500/20 text-gray-400',
  };

  const statusLabels = {
    manual: '수동',
    semi_auto: '반자동',
    auto: '자동',
    deleted: '삭제됨',
  };

  const recActions = {
    unify: { label: '일원화', action: onUnify, color: 'text-blue-400' },
    delete: { label: '삭제', action: onDelete, color: 'text-red-400' },
    automate: { label: '자동화', action: onAutomate, color: 'text-green-400' },
  };

  return (
    <BaseCard 
      type="info"
      title="업무 재정의 현황"
      subtitle={`${totalTasks}개 업무 → ${modules.length}개 모듈`}
    >
      <div className="space-y-3 max-h-80 overflow-y-auto">
        {modules.map((module) => (
          <div 
            key={module.id}
            className="p-3 bg-gray-700/30 rounded-lg"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-white">{module.name}</span>
              <span className={`px-2 py-0.5 rounded text-xs ${statusColors[module.status]}`}>
                {statusLabels[module.status]}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">{module.taskCount}개 업무</span>
              
              {module.recommendation && (
                <button
                  onClick={() => recActions[module.recommendation!].action(module.id)}
                  className={`text-xs ${recActions[module.recommendation].color} hover:underline`}
                >
                  → {recActions[module.recommendation].label} 추천
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </BaseCard>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PressureHeatmapCard - 압력 히트맵 카드 (ENGINE B)
// ═══════════════════════════════════════════════════════════════════════════════

interface PressurePoint {
  id: string;
  area: string;
  type: 'schedule' | 'resource' | 'personnel';
  pressure: number;  // 0-100
}

interface PressureHeatmapCardProps {
  points: PressurePoint[];
  criticalThreshold?: number;
  onPointClick?: (pointId: string) => void;
}

export function PressureHeatmapCard({
  points,
  criticalThreshold = 80,
  onPointClick,
}: PressureHeatmapCardProps) {
  const typeLabels = {
    schedule: { label: '일정', icon: '📅' },
    resource: { label: '자원', icon: '📦' },
    personnel: { label: '인력', icon: '👥' },
  };

  const getPressureColor = (pressure: number) => {
    if (pressure >= 80) return 'bg-red-500';
    if (pressure >= 60) return 'bg-orange-500';
    if (pressure >= 40) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const criticalPoints = points.filter(p => p.pressure >= criticalThreshold);

  return (
    <BaseCard 
      type={criticalPoints.length > 0 ? 'warning' : 'info'}
      title="압력 히트맵"
      subtitle={criticalPoints.length > 0 
        ? `⚠️ ${criticalPoints.length}개 위험 구간` 
        : '정상 범위'
      }
    >
      <div className="space-y-2">
        {points.map((point) => (
          <button
            key={point.id}
            onClick={() => onPointClick?.(point.id)}
            className="w-full p-3 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span>{typeLabels[point.type].icon}</span>
                <span className="text-sm text-white">{point.area}</span>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded ${
                point.pressure >= criticalThreshold ? 'bg-red-500/20 text-red-400' : 'text-gray-400'
              }`}>
                {point.pressure}%
              </span>
            </div>
            
            {/* 압력 바 */}
            <div className="h-2 bg-gray-600 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 ${getPressureColor(point.pressure)}`}
                style={{ width: `${point.pressure}%` }}
              />
            </div>
          </button>
        ))}
      </div>
    </BaseCard>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PlanRealityCard - Plan vs Reality 비교 카드
// ═══════════════════════════════════════════════════════════════════════════════

interface PlanRealityComparison {
  metric: string;
  planned: string | number;
  actual: string | number;
  variance: number;  // 백분율 (-100 ~ +100)
}

interface PlanRealityCardProps {
  comparisons: PlanRealityComparison[];
  period: string;
}

export function PlanRealityCard({ comparisons, period }: PlanRealityCardProps) {
  return (
    <BaseCard 
      type="info"
      title="Plan vs Reality"
      subtitle={period}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 border-b border-gray-700">
              <th className="py-2 text-left">항목</th>
              <th className="py-2 text-right">계획</th>
              <th className="py-2 text-right">실제</th>
              <th className="py-2 text-right">차이</th>
            </tr>
          </thead>
          <tbody>
            {comparisons.map((row, idx) => (
              <tr key={idx} className="border-b border-gray-700/30">
                <td className="py-2 text-white">{row.metric}</td>
                <td className="py-2 text-right text-gray-400">{row.planned}</td>
                <td className="py-2 text-right text-white">{row.actual}</td>
                <td className={`py-2 text-right font-medium ${
                  row.variance > 0 ? 'text-red-400' : 
                  row.variance < 0 ? 'text-green-400' : 'text-gray-400'
                }`}>
                  {row.variance > 0 ? '+' : ''}{row.variance}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </BaseCard>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ApprovalAutomationCard - 행정 승인 자동화 상태 카드
// ═══════════════════════════════════════════════════════════════════════════════

interface ApprovalAutomation {
  documentType: string;
  status: 'pending' | 'generating' | 'ready' | 'submitted';
  generatedAt?: string;
}

interface ApprovalAutomationCardProps {
  automations: ApprovalAutomation[];
  onViewDocument?: (docType: string) => void;
}

export function ApprovalAutomationCard({ 
  automations, 
  onViewDocument 
}: ApprovalAutomationCardProps) {
  const statusConfig = {
    pending: { label: '대기', color: 'text-gray-400', icon: '⏳' },
    generating: { label: '생성 중', color: 'text-blue-400', icon: '⚙️' },
    ready: { label: '준비 완료', color: 'text-green-400', icon: '✅' },
    submitted: { label: '제출됨', color: 'text-purple-400', icon: '📤' },
  };

  const allReady = automations.every(a => a.status === 'ready' || a.status === 'submitted');

  return (
    <BaseCard 
      type={allReady ? 'success' : 'info'}
      title="행정 승인 자동화"
      subtitle={allReady ? '모든 서류 준비 완료' : '서류 생성 중...'}
    >
      <div className="space-y-2">
        {automations.map((auto, idx) => {
          const config = statusConfig[auto.status];
          return (
            <div 
              key={idx}
              className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg"
            >
              <div className="flex items-center gap-2">
                <span>{config.icon}</span>
                <span className="text-sm text-white">{auto.documentType}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs ${config.color}`}>{config.label}</span>
                {auto.status === 'ready' && onViewDocument && (
                  <button
                    onClick={() => onViewDocument(auto.documentType)}
                    className="text-xs text-blue-400 hover:underline"
                  >
                    보기
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </BaseCard>
  );
}

export default ConflictCard;
