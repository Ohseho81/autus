/**
 * AUTUS IOO Trace Viewer Page
 * ============================
 * IOO (Input-Operation-Output) 트레이스 뷰어
 * 왜 이 알림이 발송됐는가? — trace_id별 추적
 */

import React, { useState, useMemo } from 'react';

// ============================================
// Types
// ============================================

type Phase = 'INPUT' | 'OPERATION' | 'OUTPUT';
type Result = 'pending' | 'success' | 'failure' | 'skipped';

interface IOOTraceEntry {
  id: string;
  trace_id: string;
  phase: Phase;
  actor: string;
  action: string;
  target_type: string;
  target_id: string;
  payload: Record<string, unknown>;
  result: Result;
  error_message: string | null;
  duration_ms: number;
  created_at: string;
}

interface TraceGroup {
  trace_id: string;
  entries: IOOTraceEntry[];
  earliest: string;
  latest: string;
  overall_result: Result;
  total_duration_ms: number;
}

// ============================================
// Constants
// ============================================

const PHASE_COLORS: Record<Phase, { bg: string; text: string; border: string }> = {
  INPUT: { bg: 'bg-blue-500', text: 'text-blue-400', border: 'border-blue-500' },
  OPERATION: { bg: 'bg-purple-500', text: 'text-purple-400', border: 'border-purple-500' },
  OUTPUT: { bg: 'bg-green-500', text: 'text-green-400', border: 'border-green-500' },
};

const RESULT_COLORS: Record<Result, string> = {
  success: 'text-green-400',
  failure: 'text-red-400',
  pending: 'text-yellow-400',
  skipped: 'text-slate-400',
};

const RESULT_BG: Record<Result, string> = {
  success: 'bg-green-500/20 text-green-400',
  failure: 'bg-red-500/20 text-red-400',
  pending: 'bg-yellow-500/20 text-yellow-400',
  skipped: 'bg-slate-500/20 text-slate-400',
};

const MOCK_ACTIONS = [
  'record_presence',
  'enqueue_absence_notification',
  'send_kakao_alimtalk',
  'update_encounter_count',
];

const MOCK_ACTORS = [
  'coach:\uBC15\uCF54\uCE58',
  'system:encounter-service',
  'cron:action-queue-worker',
];

const MOCK_TARGET_TYPES = [
  'presence',
  'action_queue',
  'kakao_message',
  'encounter',
];

const PHASE_ORDER: Phase[] = ['INPUT', 'OPERATION', 'OUTPUT'];

// ============================================
// Mock Data Generator
// ============================================

const generateUUID = (): string => {
  const hex = '0123456789abcdef';
  const segments = [8, 4, 4, 4, 12];
  return segments
    .map((len) =>
      Array.from({ length: len }, () => hex[Math.floor(Math.random() * 16)]).join('')
    )
    .join('-');
};

const generateMockTraces = (): IOOTraceEntry[] => {
  const entries: IOOTraceEntry[] = [];
  const now = new Date();

  for (let g = 0; g < 30; g++) {
    const traceId = generateUUID();
    const baseTime = new Date(now);
    baseTime.setMinutes(baseTime.getMinutes() - g * 45);

    const action = MOCK_ACTIONS[Math.floor(Math.random() * MOCK_ACTIONS.length)];
    const hasAllPhases = Math.random() > 0.2;
    const phases: Phase[] = hasAllPhases
      ? ['INPUT', 'OPERATION', 'OUTPUT']
      : ['INPUT', 'OPERATION'];

    const traceFailure = Math.random() < 0.15;
    const failPhaseIdx = traceFailure
      ? Math.floor(Math.random() * phases.length)
      : -1;

    phases.forEach((phase, idx) => {
      const phaseTime = new Date(baseTime);
      phaseTime.setSeconds(phaseTime.getSeconds() + idx * 2);

      const isFailed = idx === failPhaseIdx;
      const isSkipped = traceFailure && idx > failPhaseIdx;
      const isPending = !traceFailure && Math.random() < 0.05 && idx === phases.length - 1;

      let result: Result = 'success';
      if (isFailed) result = 'failure';
      else if (isSkipped) result = 'skipped';
      else if (isPending) result = 'pending';

      const actorMap: Record<Phase, string> = {
        INPUT: MOCK_ACTORS[0],
        OPERATION: MOCK_ACTORS[1],
        OUTPUT: MOCK_ACTORS[2],
      };

      const targetTypeMap: Record<Phase, string> = {
        INPUT: MOCK_TARGET_TYPES[0],
        OPERATION: MOCK_TARGET_TYPES[1],
        OUTPUT: MOCK_TARGET_TYPES[2],
      };

      const payloadMap: Record<Phase, Record<string, unknown>> = {
        INPUT: {
          student_id: generateUUID(),
          class_date: baseTime.toISOString().split('T')[0],
          status: 'absent',
        },
        OPERATION: {
          queue_name: 'absence_notification',
          priority: 'normal',
          retry_count: 0,
          scheduled_at: phaseTime.toISOString(),
        },
        OUTPUT: {
          template_code: 'ABSENCE_ALERT_V2',
          recipient_phone: '010-****-' + String(Math.floor(Math.random() * 10000)).padStart(4, '0'),
          message_id: generateUUID(),
          kakao_result_code: isFailed ? 'E4001' : 'S0000',
        },
      };

      entries.push({
        id: generateUUID(),
        trace_id: traceId,
        phase,
        actor: actorMap[phase],
        action,
        target_type: targetTypeMap[phase],
        target_id: generateUUID(),
        payload: payloadMap[phase],
        result,
        error_message: isFailed
          ? 'KakaoAlimtalk API timeout: connection refused after 5000ms'
          : null,
        duration_ms: Math.floor(Math.random() * 800) + (phase === 'OUTPUT' ? 200 : 50),
        created_at: phaseTime.toISOString(),
      });
    });
  }

  return entries.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
};

const MOCK_ENTRIES = generateMockTraces();

// ============================================
// Helpers
// ============================================

const groupByTraceId = (entries: IOOTraceEntry[]): TraceGroup[] => {
  const map = new Map<string, IOOTraceEntry[]>();

  entries.forEach((entry) => {
    const list = map.get(entry.trace_id) || [];
    list.push(entry);
    map.set(entry.trace_id, list);
  });

  const groups: TraceGroup[] = [];

  map.forEach((groupEntries, traceId) => {
    const sorted = [...groupEntries].sort(
      (a, b) =>
        PHASE_ORDER.indexOf(a.phase) - PHASE_ORDER.indexOf(b.phase)
    );

    const timestamps = sorted.map((e) => new Date(e.created_at).getTime());
    const earliest = new Date(Math.min(...timestamps)).toISOString();
    const latest = new Date(Math.max(...timestamps)).toISOString();

    const hasFailure = sorted.some((e) => e.result === 'failure');
    const hasPending = sorted.some((e) => e.result === 'pending');
    const allSuccess = sorted.every((e) => e.result === 'success');

    let overall_result: Result = 'success';
    if (hasFailure) overall_result = 'failure';
    else if (hasPending) overall_result = 'pending';
    else if (!allSuccess) overall_result = 'skipped';

    const total_duration_ms = sorted.reduce((sum, e) => sum + e.duration_ms, 0);

    groups.push({
      trace_id: traceId,
      entries: sorted,
      earliest,
      latest,
      overall_result,
      total_duration_ms,
    });
  });

  return groups.sort(
    (a, b) => new Date(b.earliest).getTime() - new Date(a.earliest).getTime()
  );
};

const formatTime = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleDateString('ko-KR');
};

const truncateUUID = (uuid: string): string => uuid.slice(0, 8);

// ============================================
// Components
// ============================================

const PhaseNode = ({
  entry,
  isLast,
  isExpanded,
  onToggle,
}: {
  entry: IOOTraceEntry;
  isLast: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}) => {
  const phaseColor = PHASE_COLORS[entry.phase];
  const resultColor = RESULT_COLORS[entry.result];
  const resultBg = RESULT_BG[entry.result];

  return (
    <div className="relative flex gap-3">
      {/* Timeline connector */}
      <div className="flex flex-col items-center">
        <div className={`w-3 h-3 rounded-full ${phaseColor.bg} ring-2 ring-slate-800 z-10 mt-1.5 flex-shrink-0`} />
        {!isLast && (
          <div className="w-0.5 flex-1 bg-slate-600 min-h-[24px]" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 pb-4">
        <div
          className="bg-slate-700/50 rounded-lg p-3 border border-slate-600 hover:border-slate-500 transition-all cursor-pointer"
          onClick={onToggle}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2 py-0.5 text-xs font-bold rounded ${phaseColor.bg} text-white`}>
                {entry.phase}
              </span>
              <span className="text-sm text-white font-medium">{entry.action}</span>
              <span className={`px-2 py-0.5 text-xs rounded ${resultBg}`}>
                {entry.result}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400">{entry.duration_ms}ms</span>
              <span className="text-xs text-slate-500">
                {isExpanded ? '\u25B2' : '\u25BC'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-400">
            <span>actor: <span className="text-slate-300">{entry.actor}</span></span>
            <span>target: <span className="text-slate-300">{entry.target_type}</span></span>
            <span>{formatTime(entry.created_at)}</span>
          </div>

          {entry.error_message && (
            <div className="mt-2 text-xs text-red-400 bg-red-500/10 rounded px-2 py-1">
              {entry.error_message}
            </div>
          )}

          {isExpanded && (
            <div className="mt-3 border-t border-slate-600 pt-3">
              <div className="text-xs text-slate-400 mb-1 font-medium">Payload</div>
              <pre className="text-xs text-slate-300 bg-slate-800 rounded p-3 overflow-x-auto max-h-48 overflow-y-auto">
                {JSON.stringify(entry.payload, null, 2)}
              </pre>
              <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
                <span>id: {truncateUUID(entry.id)}</span>
                <span>target_id: {truncateUUID(entry.target_id)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const TraceCard = ({ group }: { group: TraceGroup }) => {
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const [isCollapsed, setIsCollapsed] = useState(false);

  const togglePhase = (entryId: string) => {
    setExpandedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(entryId)) {
        next.delete(entryId);
      } else {
        next.add(entryId);
      }
      return next;
    });
  };

  const overallBg = RESULT_BG[group.overall_result];
  const phaseCount = group.entries.length;
  const hasAllPhases = phaseCount === 3;

  return (
    <div className="bg-slate-800/80 rounded-xl border border-slate-700 hover:border-slate-600 transition-all overflow-hidden">
      {/* Card Header */}
      <div
        className="p-4 cursor-pointer flex items-center justify-between"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold text-white bg-slate-700 px-2.5 py-1 rounded">
              {truncateUUID(group.trace_id)}
            </span>
            <span className={`px-2 py-0.5 text-xs rounded font-medium ${overallBg}`}>
              {group.overall_result}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {PHASE_ORDER.map((phase) => {
              const hasPhase = group.entries.some((e) => e.phase === phase);
              return (
                <div
                  key={phase}
                  className={`w-2 h-2 rounded-full ${
                    hasPhase ? PHASE_COLORS[phase].bg : 'bg-slate-600'
                  }`}
                  title={phase}
                />
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-400">
          <span>{formatDate(group.earliest)}</span>
          <span>
            {formatTime(group.earliest)} \u2192 {formatTime(group.latest)}
          </span>
          <span className="text-slate-300 font-medium">{group.total_duration_ms}ms</span>
          <span className="text-slate-500">{isCollapsed ? '\u25BC' : '\u25B2'}</span>
        </div>
      </div>

      {/* Timeline Content */}
      {!isCollapsed && (
        <div className="px-4 pb-4 border-t border-slate-700/50 pt-3">
          {group.entries.map((entry, idx) => (
            <PhaseNode
              key={entry.id}
              entry={entry}
              isLast={idx === group.entries.length - 1}
              isExpanded={expandedPhases.has(entry.id)}
              onToggle={() => togglePhase(entry.id)}
            />
          ))}
          {!hasAllPhases && (
            <div className="text-xs text-slate-500 pl-6 mt-1">
              * {3 - phaseCount}\uAC1C \uD398\uC774\uC988 \uB204\uB77D (trace \uBBF8\uC644\uB8CC)
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const TraceStats = ({ groups }: { groups: TraceGroup[] }) => {
  const stats = useMemo(() => {
    const total = groups.length;
    const successCount = groups.filter((g) => g.overall_result === 'success').length;
    const failureCount = groups.filter((g) => g.overall_result === 'failure').length;
    const successRate = total > 0 ? Math.round((successCount / total) * 100) : 0;

    const totalDurations = groups.map((g) => g.total_duration_ms);
    const avgDuration =
      totalDurations.length > 0
        ? Math.round(totalDurations.reduce((a, b) => a + b, 0) / totalDurations.length)
        : 0;

    const actionCount: Record<string, number> = {};
    groups.forEach((g) => {
      g.entries.forEach((e) => {
        actionCount[e.action] = (actionCount[e.action] || 0) + 1;
      });
    });

    const topActions = Object.entries(actionCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const maxActionCount = topActions.length > 0 ? topActions[0][1] : 1;

    return { total, successCount, failureCount, successRate, avgDuration, topActions, maxActionCount };
  }, [groups]);

  return (
    <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700">
      <h3 className="text-white font-medium mb-4">Trace \uD1B5\uACC4</h3>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-slate-700/50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-blue-400">{stats.total}</div>
          <div className="text-xs text-slate-400">\uCD1D \uD2B8\uB808\uC774\uC2A4</div>
        </div>
        <div className="bg-slate-700/50 rounded-lg p-3 text-center">
          <div className={`text-2xl font-bold ${stats.successRate >= 80 ? 'text-green-400' : stats.successRate >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
            {stats.successRate}%
          </div>
          <div className="text-xs text-slate-400">\uC131\uACF5\uB960</div>
        </div>
        <div className="bg-slate-700/50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-purple-400">{stats.avgDuration}</div>
          <div className="text-xs text-slate-400">\uD3C9\uADE0 ms</div>
        </div>
        <div className="bg-slate-700/50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-red-400">{stats.failureCount}</div>
          <div className="text-xs text-slate-400">\uC2E4\uD328</div>
        </div>
      </div>

      {/* Success/Failure bar */}
      <div className="mb-5">
        <div className="text-sm text-slate-400 font-medium mb-2">\uACB0\uACFC \uBD84\uD3EC</div>
        <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden flex">
          <div
            className="h-full bg-green-500"
            style={{ width: `${stats.successRate}%` }}
          />
          <div
            className="h-full bg-red-500"
            style={{ width: `${stats.total > 0 ? Math.round((stats.failureCount / stats.total) * 100) : 0}%` }}
          />
        </div>
        <div className="flex justify-between mt-1 text-xs text-slate-500">
          <span>{stats.successCount} \uC131\uACF5</span>
          <span>{stats.failureCount} \uC2E4\uD328</span>
        </div>
      </div>

      {/* Top Actions */}
      <div className="space-y-3">
        <div className="text-sm text-slate-400 font-medium">Top Actions</div>
        {stats.topActions.map(([action, count]) => (
          <div key={action} className="flex items-center justify-between">
            <span className="text-sm text-slate-300 truncate mr-2">{action}</span>
            <div className="flex items-center gap-2">
              <div className="w-20 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500"
                  style={{ width: `${(count / stats.maxActionCount) * 100}%` }}
                />
              </div>
              <span className="text-xs text-slate-400 w-8 text-right">{count}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const PhaseBreakdown = ({ groups }: { groups: TraceGroup[] }) => {
  const breakdown = useMemo(() => {
    const phaseStats: Record<Phase, { total: number; success: number; avgMs: number }> = {
      INPUT: { total: 0, success: 0, avgMs: 0 },
      OPERATION: { total: 0, success: 0, avgMs: 0 },
      OUTPUT: { total: 0, success: 0, avgMs: 0 },
    };

    const phaseDurations: Record<Phase, number[]> = {
      INPUT: [],
      OPERATION: [],
      OUTPUT: [],
    };

    groups.forEach((g) => {
      g.entries.forEach((e) => {
        phaseStats[e.phase].total += 1;
        if (e.result === 'success') phaseStats[e.phase].success += 1;
        phaseDurations[e.phase].push(e.duration_ms);
      });
    });

    PHASE_ORDER.forEach((phase) => {
      const durations = phaseDurations[phase];
      phaseStats[phase].avgMs =
        durations.length > 0
          ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
          : 0;
    });

    return phaseStats;
  }, [groups]);

  return (
    <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700">
      <h3 className="text-white font-medium mb-4">\uD398\uC774\uC988\uBCC4 \uBD84\uC11D</h3>

      <div className="space-y-4">
        {PHASE_ORDER.map((phase) => {
          const stat = breakdown[phase];
          const rate = stat.total > 0 ? Math.round((stat.success / stat.total) * 100) : 0;
          const phaseColor = PHASE_COLORS[phase];

          return (
            <div key={phase} className="bg-slate-700/30 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${phaseColor.bg}`} />
                  <span className="text-sm font-medium text-white">{phase}</span>
                </div>
                <span className="text-xs text-slate-400">{stat.total}\uAC74</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className={rate >= 80 ? 'text-green-400' : rate >= 50 ? 'text-yellow-400' : 'text-red-400'}>
                  {rate}% \uC131\uACF5
                </span>
                <span className="text-slate-400">\uD3C9\uADE0 {stat.avgMs}ms</span>
              </div>
              <div className="w-full h-1.5 bg-slate-600 rounded-full overflow-hidden mt-2">
                <div
                  className={`h-full ${phaseColor.bg}`}
                  style={{ width: `${rate}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============================================
// Main Component
// ============================================

export default function TraceViewerPage() {
  const [entries] = useState<IOOTraceEntry[]>(MOCK_ENTRIES);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterResult, setFilterResult] = useState<string>('all');
  const [filterPhase, setFilterPhase] = useState<string>('all');

  const allGroups = useMemo(() => groupByTraceId(entries), [entries]);

  const filteredGroups = useMemo(() => {
    return allGroups.filter((group) => {
      // Search filter: match trace_id or any action in the group
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesTraceId = group.trace_id.toLowerCase().includes(term);
        const matchesAction = group.entries.some((e) =>
          e.action.toLowerCase().includes(term)
        );
        if (!matchesTraceId && !matchesAction) return false;
      }

      // Result filter: applies to overall group result
      if (filterResult !== 'all' && group.overall_result !== filterResult) return false;

      // Phase filter: group must contain at least one entry with this phase
      if (filterPhase !== 'all' && !group.entries.some((e) => e.phase === filterPhase)) {
        return false;
      }

      return true;
    });
  }, [allGroups, searchTerm, filterResult, filterPhase]);

  const [displayCount, setDisplayCount] = useState(10);
  const displayedGroups = filteredGroups.slice(0, displayCount);

  return (
    <div className="min-h-full bg-slate-900 text-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">IOO Trace Viewer</h1>
          <p className="text-slate-400 mt-1">\uC65C \uC774 \uC54C\uB9BC\uC774 \uBC1C\uC1A1\uB410\uB294\uAC00?</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <div className="w-2 h-2 rounded-full bg-blue-500" /> INPUT
            <div className="w-2 h-2 rounded-full bg-purple-500 ml-2" /> OPERATION
            <div className="w-2 h-2 rounded-full bg-green-500 ml-2" /> OUTPUT
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <input
          type="text"
          placeholder="trace_id \uB610\uB294 action \uAC80\uC0C9..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setDisplayCount(10);
          }}
          className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white w-72 placeholder-slate-500 focus:outline-none focus:border-slate-400"
        />

        <select
          value={filterResult}
          onChange={(e) => {
            setFilterResult(e.target.value);
            setDisplayCount(10);
          }}
          className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-slate-400"
        >
          <option value="all">\uBAA8\uB4E0 \uACB0\uACFC</option>
          <option value="success">Success</option>
          <option value="failure">Failure</option>
          <option value="pending">Pending</option>
          <option value="skipped">Skipped</option>
        </select>

        <select
          value={filterPhase}
          onChange={(e) => {
            setFilterPhase(e.target.value);
            setDisplayCount(10);
          }}
          className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-slate-400"
        >
          <option value="all">\uBAA8\uB4E0 \uD398\uC774\uC988</option>
          <option value="INPUT">INPUT</option>
          <option value="OPERATION">OPERATION</option>
          <option value="OUTPUT">OUTPUT</option>
        </select>

        <span className="text-slate-400 text-sm ml-auto">
          {filteredGroups.length}\uAC74 \uD2B8\uB808\uC774\uC2A4 \uD45C\uC2DC
        </span>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Trace Timeline */}
        <div className="col-span-8">
          <div className="space-y-4">
            {displayedGroups.length === 0 ? (
              <div className="bg-slate-800/80 rounded-xl p-12 border border-slate-700 text-center">
                <div className="text-slate-500 text-lg mb-2">\uAC80\uC0C9 \uACB0\uACFC \uC5C6\uC74C</div>
                <div className="text-slate-600 text-sm">\uD544\uD130 \uC870\uAC74\uC744 \uBCC0\uACBD\uD574\uBCF4\uC138\uC694</div>
              </div>
            ) : (
              displayedGroups.map((group) => (
                <TraceCard key={group.trace_id} group={group} />
              ))
            )}
          </div>

          {filteredGroups.length > displayCount && (
            <div className="text-center mt-4">
              <button
                onClick={() => setDisplayCount((prev) => prev + 10)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition-colors"
              >
                \uB354 \uBCF4\uAE30 ({filteredGroups.length - displayCount}\uAC74 \uB0A8\uC74C)
              </button>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="col-span-4 space-y-6">
          <TraceStats groups={allGroups} />
          <PhaseBreakdown groups={allGroups} />
        </div>
      </div>
    </div>
  );
}
