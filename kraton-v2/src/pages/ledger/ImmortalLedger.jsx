import React, { useState, useEffect } from 'react';
import { ACTION_ICONS, ACTION_LABELS } from '../../lib/ledger/types';
import useLedger from '../../lib/ledger/useLedger';

// ============================================
// KRATON IMMORTAL LEDGER
// "당신의 흔적은 사라지지 않습니다"
// ============================================

const TOKENS = {
  type: {
    h1: 'text-3xl font-bold tracking-tight',
    h2: 'text-xl font-semibold tracking-tight',
    body: 'text-sm font-medium',
    meta: 'text-xs text-gray-500',
    number: 'font-mono tabular-nums tracking-wide',
  },
  motion: {
    base: 'transition-all duration-300 ease-out',
    fast: 'transition-all duration-150 ease-out',
  },
};

// ============================================
// LEDGER STATS
// ============================================
const LedgerStats = ({ stats, repStats }) => {
  const statCards = [
    { label: '총 기록', value: stats.total, unit: '건', color: 'blue' },
    { label: '긍정 기여', value: stats.positive_delta_v, unit: '건', color: 'emerald' },
    { label: '부정 기여', value: stats.negative_delta_v, unit: '건', color: 'red' },
    { label: '총 ΔV', value: stats.total_delta_v.toFixed(1), unit: '', color: stats.total_delta_v >= 0 ? 'emerald' : 'red' },
    { label: '표준화 제안', value: repStats.proposed, unit: '건', color: 'cyan' },
    { label: '고빈도 패턴', value: repStats.high_frequency, unit: '건', color: 'purple' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
      {statCards.map((card, idx) => (
        <div key={idx} className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
          <p className={TOKENS.type.meta}>{card.label}</p>
          <p className={`text-2xl font-bold text-${card.color}-400 ${TOKENS.type.number}`}>
            {card.value}
            {card.unit && <span className="text-sm text-gray-500 ml-1">{card.unit}</span>}
          </p>
        </div>
      ))}
    </div>
  );
};

// ============================================
// LEDGER TIMELINE
// ============================================
const LedgerTimeline = ({ events, filter, setFilter }) => {
  const formatTime = (iso) => {
    const d = new Date(iso);
    return d.toLocaleString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className={TOKENS.type.h2}>📜 나의 타임라인</h2>
        <div className="flex items-center gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm"
          >
            <option value="all">전체</option>
            <option value="risk_detected">위험 감지</option>
            <option value="message_sent">메시지 발송</option>
            <option value="approval_granted">승인</option>
            <option value="feedback_received">피드백</option>
            <option value="standard_created">표준화</option>
          </select>
          <span className={TOKENS.type.meta}>{events.length}건</span>
        </div>
      </div>

      <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
        {events.map((item, idx) => {
          const icon = ACTION_ICONS[item.action_type] || ACTION_ICONS.default;
          const deltaV = item.outcome_delta_v || 0;
          const isPositive = deltaV > 0;
          const isNegative = deltaV < 0;

          return (
            <div key={item.id} className="relative pl-8 pb-4 border-l-2 border-gray-800 last:border-l-0">
              <div className="absolute left-[-9px] top-0 w-4 h-4 bg-gray-800 rounded-full border-2 border-gray-700 flex items-center justify-center text-[10px]">
                {icon}
              </div>

              <div className={`bg-gray-800/50 rounded-xl p-4 border border-gray-700/50 hover:border-gray-600 ${TOKENS.motion.base}`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="text-sm font-semibold text-white">
                      {ACTION_LABELS[item.action_type] || item.action_type.replace(/_/g, ' ')}
                    </span>
                    {item.entity_type && (
                      <span className={`${TOKENS.type.meta} ml-2`}>/ {item.entity_type}</span>
                    )}
                  </div>
                  <span className={TOKENS.type.meta}>{formatTime(item.created_at)}</span>
                </div>

                <p className="text-sm text-gray-300 mb-3">{item.content_redacted}</p>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600 font-mono">
                    hash: {item.semantic_hash.slice(0, 12)}…
                  </span>
                  <span className={`font-bold ${isPositive ? 'text-emerald-400' : isNegative ? 'text-red-400' : 'text-gray-500'}`}>
                    ΔV: {isPositive ? '+' : ''}{deltaV}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {events.length === 0 && (
          <div className="text-center py-12">
            <span className="text-4xl mb-4 block">📭</span>
            <p className="text-gray-500">아직 기록된 이벤트가 없습니다.</p>
            <p className="text-gray-600 text-sm mt-2">행동이 실행되면 여기에 영원히 남습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================
// REPETITION PANEL
// ============================================
const RepetitionPanel = ({ candidates, onStandardize }) => {
  const [actionLoading, setActionLoading] = useState(null);

  const handleStandardize = async (candidateId, action) => {
    setActionLoading(candidateId);
    await onStandardize(candidateId, action);
    setActionLoading(null);
  };

  const formatTime = (iso) => {
    return new Date(iso).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className={TOKENS.type.h2}>🔄 자기반복 후보</h2>
          <p className={`${TOKENS.type.meta} mt-1`}>두 번은 없습니다</p>
        </div>
        <span className={TOKENS.type.meta}>{candidates.length}건</span>
      </div>

      <div className="space-y-3 max-h-[500px] overflow-y-auto">
        {candidates.map((item) => {
          const isProposed = item.status === 'proposed';
          const isHighFrequency = item.seen_count >= 5;

          return (
            <div
              key={item.id}
              className={`p-4 rounded-xl border ${TOKENS.motion.base} ${
                isProposed ? 'bg-cyan-900/20 border-cyan-500/30' : 'bg-gray-800/50 border-gray-700/50'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold">
                    {ACTION_LABELS[item.meta?.action_type] || item.meta?.action_type?.replace(/_/g, ' ') || 'action'}
                  </span>
                  {isProposed && (
                    <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 text-xs rounded-full">제안됨</span>
                  )}
                  {isHighFrequency && (
                    <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-xs rounded-full">고빈도</span>
                  )}
                </div>
                <span className="text-lg font-bold text-gray-400">×{item.seen_count}</span>
              </div>

              <div className={`${TOKENS.type.meta} space-y-1 mb-3`}>
                <div>hash: {item.semantic_hash.slice(0, 16)}…</div>
                <div>최초: {formatTime(item.first_seen_at)} → 최근: {formatTime(item.last_seen_at)}</div>
              </div>

              {isProposed && (
                <>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleStandardize(item.id, 'approve')}
                      disabled={actionLoading === item.id}
                      className={`flex-1 py-2 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-sm font-medium hover:bg-emerald-600/30 ${TOKENS.motion.base} disabled:opacity-50`}
                    >
                      {actionLoading === item.id ? '처리 중...' : '✓ 표준화 승인'}
                    </button>
                    <button
                      onClick={() => handleStandardize(item.id, 'dismiss')}
                      disabled={actionLoading === item.id}
                      className={`flex-1 py-2 bg-gray-700/50 text-gray-400 border border-gray-600/30 rounded-lg text-sm font-medium hover:bg-gray-700 ${TOKENS.motion.base} disabled:opacity-50`}
                    >
                      ✗ 거절
                    </button>
                  </div>
                  <p className="text-xs text-cyan-400/70 mt-3">
                    💡 이 작업은 {item.seen_count}번 반복되었습니다. 표준으로 고정할까요?
                  </p>
                </>
              )}
            </div>
          );
        })}

        {candidates.length === 0 && (
          <div className="text-center py-12">
            <span className="text-4xl mb-4 block">✨</span>
            <p className="text-gray-500">반복 후보가 없습니다.</p>
            <p className="text-gray-600 text-sm mt-2">동일한 작업이 2번 이상 발생하면 여기에 표시됩니다.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================
// MAIN IMMORTAL LEDGER
// ============================================
const ImmortalLedger = () => {
  const [events, setEvents] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [stats, setStats] = useState({ total: 0, positive_delta_v: 0, negative_delta_v: 0, total_delta_v: 0 });
  const [repStats, setRepStats] = useState({ total: 0, proposed: 0, candidate: 0, high_frequency: 0 });
  const [filter, setFilter] = useState('all');

  // 데모 org/user
  const org_id = 'demo-org-001';
  const user_id = 'demo-user-001';
  const role = 'owner';

  const { getTimeline, getCandidates, standardize } = useLedger({ org_id, user_id, role });

  // 데이터 로드
  useEffect(() => {
    let canceled = false;

    const load = async () => {
      const timeline = await getTimeline(50);
      const filtered = filter === 'all'
        ? timeline
        : timeline.filter((item) => item.action_type === filter);

      const total = filtered.length;
      const positive = filtered.filter((item) => (item.outcome_delta_v || 0) > 0).length;
      const negative = filtered.filter((item) => (item.outcome_delta_v || 0) < 0).length;
      const totalDelta = filtered.reduce((sum, item) => sum + (item.outcome_delta_v || 0), 0);

      const repItems = await getCandidates('proposed');
      const highFrequency = repItems.filter((item) => item.seen_count >= 5).length;

      if (canceled) return;
      setEvents(filtered);
      setStats({
        total,
        positive_delta_v: positive,
        negative_delta_v: negative,
        total_delta_v: totalDelta,
      });
      setCandidates(repItems);
      setRepStats({
        total: repItems.length,
        proposed: repItems.filter((item) => item.status === 'proposed').length,
        candidate: repItems.filter((item) => item.status === 'candidate').length,
        high_frequency: highFrequency,
      });
    };

    load();
    return () => { canceled = true; };
  }, [filter, getTimeline, getCandidates]);

  const handleStandardize = async (candidateId, action) => {
    const standardName = action === 'approve' ? 'approved' : 'dismissed';
    await standardize(candidateId, standardName);

    // 새로고침
    const repItems = await getCandidates('proposed');
    setCandidates(repItems);
    setRepStats({
      total: repItems.length,
      proposed: repItems.filter((item) => item.status === 'proposed').length,
      candidate: repItems.filter((item) => item.status === 'candidate').length,
      high_frequency: repItems.filter((item) => item.seen_count >= 5).length,
    });
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-end justify-between">
          <div>
            <h1 className={`${TOKENS.type.h1} flex items-center gap-3`}>
              <span>🏛️</span>
              <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                Immortal Ledger
              </span>
            </h1>
            <p className="text-gray-500 mt-1">당신의 흔적은 사라지지 않습니다</p>
          </div>
          <div className={TOKENS.type.meta}>Owner Console / Ledger</div>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-7xl mx-auto">
        <LedgerStats stats={stats} repStats={repStats} />
      </div>

      {/* Main Grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <LedgerTimeline events={events} filter={filter} setFilter={setFilter} />
        </div>
        <div className="lg:col-span-4">
          <RepetitionPanel candidates={candidates} onStandardize={handleStandardize} />
        </div>
      </div>

      {/* Quote */}
      <div className="max-w-7xl mx-auto mt-8 text-center">
        <p className="text-gray-600 text-sm italic">
          "기억의 불멸 + 자기반복 종말 = 무한 성장"
        </p>
      </div>
    </div>
  );
};

export default ImmortalLedger;
