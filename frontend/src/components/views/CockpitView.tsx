// ═══════════════════════════════════════════════════════════════════════════════
// 🎛️ 조종석 뷰 (Cockpit View)
// 전체 상황 종합 - "전체 상황은?"
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { cockpitApi, type Alert, type Action, type StatusLevel } from '@/api/views';

interface CockpitSummary {
  status: { level: StatusLevel; label: string; updatedAt: string };
  internal: {
    customerCount: number;
    avgTemperature: number;
    riskCount: number;
    warningCount: number;
    healthyCount: number;
    pendingConsultations: number;
    unresolvedVoices: number;
    pendingTasks: number;
  };
  external: {
    sigma: number;
    weatherForecast: string;
    weatherLabel: string;
    threatCount: number;
    opportunityCount: number;
    competitionScore: string;
    marketTrend: number;
    heartbeatAlert: boolean;
    heartbeatKeyword?: string;
  };
  alertSummary: { critical: number; warning: number; info: number };
}

const STATUS_COLORS: Record<StatusLevel, string> = {
  green: 'bg-green-500',
  yellow: 'bg-yellow-500',
  red: 'bg-red-500',
  critical: 'bg-red-600',
};

const WEATHER_ICONS: Record<string, string> = {
  sunny: '☀️',
  cloudy: '☁️',
  partly_cloudy: '⛅',
  rainy: '🌧️',
  storm: '⛈️',
};

export function CockpitView() {
  const [summary, setSummary] = useState<CockpitSummary | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [summaryData, alertsData, actionsData] = await Promise.all([
        cockpitApi.getSummary(),
        cockpitApi.getAlerts('all', 5),
        cockpitApi.getActions('pending', 5),
      ]);
      setSummary(summaryData);
      setAlerts(alertsData.alerts);
      setActions(actionsData.actions);
    } catch (error) {
      console.error('Cockpit load error:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="space-y-6 p-6">
      {/* 헤더 - 상태 표시 */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <div className={`w-4 h-4 rounded-full ${STATUS_COLORS[summary.status.level]} animate-pulse`} />
          <h1 className="text-2xl font-bold">{summary.status.label}</h1>
        </div>
        <span className="text-sm text-gray-500">
          {new Date(summary.status.updatedAt).toLocaleString('ko-KR')}
        </span>
      </motion.div>

      {/* 메인 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Internal 게이지 */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg"
        >
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span>🏠</span> Internal
          </h2>
          
          <div className="space-y-4">
            <MetricRow 
              label="재원수" 
              value={summary.internal.customerCount} 
              unit="명"
            />
            <MetricRow 
              label="평균 온도" 
              value={summary.internal.avgTemperature.toFixed(1)} 
              unit="°"
              color={summary.internal.avgTemperature > 60 ? 'text-green-500' : summary.internal.avgTemperature > 40 ? 'text-yellow-500' : 'text-red-500'}
            />
            
            <div className="flex gap-2 mt-4">
              <StatusBadge count={summary.internal.riskCount} label="위험" color="bg-red-100 text-red-700" />
              <StatusBadge count={summary.internal.warningCount} label="주의" color="bg-yellow-100 text-yellow-700" />
              <StatusBadge count={summary.internal.healthyCount} label="양호" color="bg-green-100 text-green-700" />
            </div>
            
            <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t">
              <MiniStat label="상담 대기" value={summary.internal.pendingConsultations} />
              <MiniStat label="미해결 Voice" value={summary.internal.unresolvedVoices} />
              <MiniStat label="태스크" value={summary.internal.pendingTasks} />
            </div>
          </div>
        </motion.div>

        {/* External 게이지 */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg"
        >
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span>🌍</span> External
          </h2>
          
          <div className="space-y-4">
            <MetricRow 
              label="σ (환경)" 
              value={summary.external.sigma.toFixed(2)} 
              color={summary.external.sigma > 0.8 ? 'text-green-500' : summary.external.sigma > 0.6 ? 'text-yellow-500' : 'text-red-500'}
            />
            
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">날씨 예보</span>
              <span className="flex items-center gap-2">
                <span className="text-2xl">{WEATHER_ICONS[summary.external.weatherForecast] || '🌤️'}</span>
                <span className="font-medium">{summary.external.weatherLabel}</span>
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">경쟁 스코어</span>
              <span className="font-bold text-lg">{summary.external.competitionScore}</span>
            </div>
            
            <div className="flex gap-2 mt-4">
              <StatusBadge count={summary.external.threatCount} label="위협" color="bg-red-100 text-red-700" />
              <StatusBadge count={summary.external.opportunityCount} label="기회" color="bg-blue-100 text-blue-700" />
            </div>
            
            {summary.external.heartbeatAlert && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center gap-2">
                <span className="animate-pulse">💓</span>
                <span className="text-red-700 dark:text-red-300 text-sm">
                  여론 급등: "{summary.external.heartbeatKeyword}"
                </span>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* 알림 & 액션 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 긴급 알림 */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg"
        >
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span>🔔</span> 알림
            <div className="flex gap-1 ml-auto">
              {summary.alertSummary.critical > 0 && (
                <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">{summary.alertSummary.critical}</span>
              )}
              {summary.alertSummary.warning > 0 && (
                <span className="px-2 py-0.5 bg-yellow-500 text-white text-xs rounded-full">{summary.alertSummary.warning}</span>
              )}
            </div>
          </h2>
          
          <div className="space-y-2">
            {alerts.map((alert, index) => (
              <AlertItem key={alert.id} alert={alert} index={index} />
            ))}
          </div>
        </motion.div>

        {/* 우선 액션 */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg"
        >
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span>⚡</span> 우선 액션
          </h2>
          
          <div className="space-y-2">
            {actions.map((action, index) => (
              <ActionItem key={action.id} action={action} index={index} />
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Sub Components
// ─────────────────────────────────────────────────────────────────────

function MetricRow({ label, value, unit = '', color = '' }: { label: string; value: string | number; unit?: string; color?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-600 dark:text-gray-400">{label}</span>
      <span className={`font-bold text-xl ${color}`}>
        {value}{unit}
      </span>
    </div>
  );
}

function StatusBadge({ count, label, color }: { count: number; label: string; color: string }) {
  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium ${color}`}>
      {label} {count}
    </span>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <div className="text-xl font-bold">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}

function AlertItem({ alert, index }: { alert: Alert; index: number }) {
  const levelColors = {
    critical: 'border-l-red-500 bg-red-50 dark:bg-red-900/20',
    warning: 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/20',
    info: 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/20',
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`p-3 rounded-lg border-l-4 ${levelColors[alert.level]}`}
    >
      <div className="font-medium text-sm">{alert.title}</div>
      <div className="text-xs text-gray-500 mt-1">{alert.description}</div>
    </motion.div>
  );
}

function ActionItem({ action, index }: { action: Action; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors"
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium text-sm flex items-center gap-2">
            {action.aiRecommended && <span className="text-purple-500">🤖</span>}
            {action.title}
          </div>
          <div className="text-xs text-gray-500 mt-1">{action.context}</div>
        </div>
        <span className="text-lg font-bold text-gray-300">#{action.priority}</span>
      </div>
    </motion.div>
  );
}

export default CockpitView;
