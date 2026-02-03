/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS Operations Dashboard
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 시범 운영용 통합 대시보드
 * - 실제 Runtime 연결
 * - 실시간 데이터
 * - Pain Signal 처리
 * - V 추적
 */

import React, { useState, useEffect, useCallback } from 'react';
import { AUTUSRuntime, useAUTUS } from '../../core/AUTUSRuntime';
import { EventBus, EventTypes } from '../../core/EventBus';
import AUTUSNav from '../../components/AUTUSNav';

// ═══════════════════════════════════════════════════════════════════════════════
// Components
// ═══════════════════════════════════════════════════════════════════════════════

// 상태 뱃지
function StatusBadge({ status, size = 'md' }) {
  const colors = {
    running: 'bg-emerald-500',
    stopped: 'bg-red-500',
    pending: 'bg-amber-500',
    pain: 'bg-red-500',
    request: 'bg-blue-500',
    noise: 'bg-gray-400',
    resolved: 'bg-emerald-500',
  };

  const sizes = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  return (
    <span className={`${sizes[size]} ${colors[status] || 'bg-gray-400'} rounded-full inline-block`} />
  );
}

// 메트릭 카드
function MetricCard({ title, value, subtitle, trend, icon, color = 'blue' }) {
  const colors = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-emerald-500 to-emerald-600',
    orange: 'from-orange-500 to-orange-600',
    red: 'from-red-500 to-red-600',
    purple: 'from-purple-500 to-purple-600',
  };

  return (
    <div className={`bg-gradient-to-br ${colors[color]} rounded-2xl p-4 text-white`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
        {trend && (
          <span className={`text-xs px-2 py-1 rounded-full ${
            trend > 0 ? 'bg-white/20' : 'bg-black/20'
          }`}>
            {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className="text-3xl font-bold">{value}</div>
      <div className="text-sm opacity-80">{title}</div>
      {subtitle && <div className="text-xs opacity-60 mt-1">{subtitle}</div>}
    </div>
  );
}

// Pain Signal 카드
function PainCard({ pain, onResolve }) {
  const [resolving, setResolving] = useState(false);
  const [vAmount, setVAmount] = useState('');

  const handleResolve = async () => {
    if (!vAmount) return;
    setResolving(true);
    try {
      await onResolve(pain._id || pain.id, {
        vCreated: parseInt(vAmount, 10),
        resolvedBy: 'operator',
      });
    } finally {
      setResolving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl p-4 border-l-4 border-red-500 shadow-sm">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="flex items-center gap-2">
            <StatusBadge status="pain" />
            <span className="font-medium text-gray-900">
              {pain.input?.text || pain.input?.message || 'Pain Signal'}
            </span>
          </div>
          <div className="text-sm text-gray-500 mt-1">
            점수: {(pain.score * 100).toFixed(0)}% |
            {pain.userId ? ` 사용자: ${pain.userId}` : ' 익명'}
          </div>
        </div>
        <span className="text-xs text-gray-400">
          {new Date(pain.timestamp).toLocaleTimeString()}
        </span>
      </div>

      {pain.status === 'pending' && (
        <div className="flex items-center gap-2 mt-3">
          <input
            type="number"
            placeholder="창출 V (원)"
            value={vAmount}
            onChange={(e) => setVAmount(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
          />
          <button
            onClick={handleResolve}
            disabled={resolving || !vAmount}
            className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {resolving ? '처리중...' : '해결'}
          </button>
        </div>
      )}

      {pain.status === 'resolved' && (
        <div className="mt-2 px-3 py-2 bg-emerald-50 rounded-lg text-sm text-emerald-700">
          ✓ 해결됨 - V {pain.resolution?.vCreated?.toLocaleString()}원 창출
        </div>
      )}
    </div>
  );
}

// Request 카드
function RequestCard({ request }) {
  return (
    <div className="bg-white rounded-xl p-4 border-l-4 border-blue-500 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <StatusBadge status="request" />
            <span className="font-medium text-gray-900">
              {request.input?.text || request.input?.message || 'Request'}
            </span>
          </div>
          <div className="text-sm text-gray-500 mt-1">
            점수: {(request.score * 100).toFixed(0)}%
          </div>
        </div>
        <span className="text-xs text-gray-400">
          {new Date(request.timestamp).toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}

// 시스템 상태 패널
function SystemStatusPanel({ data }) {
  return (
    <div className="bg-slate-800 rounded-xl p-4 text-white">
      <h3 className="text-sm font-medium text-slate-400 mb-3">시스템 상태</h3>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm">Runtime</span>
          <div className="flex items-center gap-2">
            <StatusBadge status={data.runtime?.isRunning ? 'running' : 'stopped'} />
            <span className="text-sm">{data.runtime?.isRunning ? '실행중' : '중지됨'}</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm">Persistence</span>
          <span className="text-sm">
            {data.persistence?.isOnline ? '온라인' : '오프라인'}
            {data.persistence?.pendingSyncCount > 0 && ` (${data.persistence.pendingSyncCount}개 대기)`}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm">이벤트 처리</span>
          <span className="text-sm">{data.runtime?.eventsProcessed || 0}건</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm">헌법 검사</span>
          <span className="text-sm">
            {data.constitution?.passRate || 'N/A'} 통과율
          </span>
        </div>

        {data.constitution?.violations > 0 && (
          <div className="flex items-center justify-between text-red-400">
            <span className="text-sm">헌법 위반</span>
            <span className="text-sm">{data.constitution.violations}건</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Pain Signal 통계 패널
function PainSignalPanel({ stats }) {
  return (
    <div className="bg-white rounded-xl p-4 border border-gray-100">
      <h3 className="text-sm font-medium text-gray-500 mb-3">Pain Signal 분류</h3>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusBadge status="pain" />
            <span className="text-sm">PAIN (V 창출)</span>
          </div>
          <span className="font-medium">{stats?.pain || 0}건</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusBadge status="request" />
            <span className="text-sm">REQUEST (검토)</span>
          </div>
          <span className="font-medium">{stats?.request || 0}건</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusBadge status="noise" />
            <span className="text-sm">NOISE (폐기)</span>
          </div>
          <span className="font-medium">{stats?.noise || 0}건</span>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">필터율</span>
          <span className="font-medium">{stats?.noiseRate || 'N/A'}</span>
        </div>
        <div className="flex items-center justify-between text-sm mt-1">
          <span className="text-gray-500">목표</span>
          <span className="text-gray-400">{stats?.filterTarget || '90%'}</span>
        </div>
      </div>
    </div>
  );
}

// 입력 테스트 패널
function InputTestPanel({ onSubmit }) {
  const [text, setText] = useState('');
  const [userId, setUserId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;

    setSubmitting(true);
    try {
      await onSubmit({ text: text.trim() }, userId || null);
      setText('');
    } finally {
      setSubmitting(false);
    }
  };

  // 샘플 입력들
  const samples = [
    { text: '환불 요청합니다 급함', label: '환불 (PAIN)' },
    { text: '결제가 안됩니다 오류 발생', label: '결제오류 (PAIN)' },
    { text: '수업 시간 문의드립니다', label: '문의 (REQUEST)' },
    { text: '오늘 날씨 좋네요', label: '잡담 (NOISE)' },
  ];

  return (
    <div className="bg-white rounded-xl p-4 border border-gray-100">
      <h3 className="text-sm font-medium text-gray-500 mb-3">입력 테스트</h3>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          placeholder="사용자 ID (선택)"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
        />
        <textarea
          placeholder="사용자 입력 시뮬레이션..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none"
          rows={2}
        />
        <button
          type="submit"
          disabled={submitting || !text.trim()}
          className="w-full py-2 bg-slate-800 text-white rounded-lg text-sm font-medium disabled:opacity-50"
        >
          {submitting ? '처리중...' : '입력 전송'}
        </button>
      </form>

      <div className="mt-3 pt-3 border-t border-gray-100">
        <div className="text-xs text-gray-400 mb-2">샘플:</div>
        <div className="flex flex-wrap gap-2">
          {samples.map((sample, i) => (
            <button
              key={i}
              onClick={async () => {
                setSubmitting(true);
                try {
                  await onSubmit({ text: sample.text }, userId || null);
                } finally {
                  setSubmitting(false);
                }
              }}
              disabled={submitting}
              className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs hover:bg-gray-200 disabled:opacity-50"
            >
              {sample.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════════

export default function AUTUSOperations() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [dashboardData, setDashboardData] = useState({});
  const [painQueue, setPainQueue] = useState([]);
  const [requestQueue, setRequestQueue] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');

  const { processInput, resolvePain, getDashboardData, getPainQueue, getRequestQueue } = useAUTUS();

  // 초기화
  useEffect(() => {
    const init = async () => {
      await AUTUSRuntime.init({
        appName: '올댓바스켓',
        industry: 'education',
        vTarget: { monthly: 10000000, margin: 0.3 },
      });
      setIsInitialized(true);
    };

    init();
  }, []);

  // 실시간 데이터 업데이트
  useEffect(() => {
    if (!isInitialized) return;

    const updateData = async () => {
      setDashboardData(AUTUSRuntime.getDashboardData());
      setPainQueue(await AUTUSRuntime.getPainQueue());
      setRequestQueue(await AUTUSRuntime.getRequestQueue());
    };

    updateData();
    const interval = setInterval(updateData, 2000);

    return () => clearInterval(interval);
  }, [isInitialized]);

  // 이벤트 구독
  useEffect(() => {
    if (!isInitialized) return;

    const unsubscribes = [
      EventBus.on(EventTypes.PAIN_CLASSIFIED, async () => {
        setPainQueue(await AUTUSRuntime.getPainQueue());
        setRequestQueue(await AUTUSRuntime.getRequestQueue());
      }),
      EventBus.on(EventTypes.V_CREATED, () => {
        setDashboardData(AUTUSRuntime.getDashboardData());
      }),
    ];

    return () => unsubscribes.forEach(fn => fn());
  }, [isInitialized]);

  // 입력 처리
  const handleInput = useCallback(async (input, userId) => {
    await AUTUSRuntime.processInput(input, userId);
  }, []);

  // Pain 해결
  const handleResolvePain = useCallback(async (painId, resolution) => {
    await AUTUSRuntime.resolvePain(painId, resolution);
    setPainQueue(await AUTUSRuntime.getPainQueue());
    setDashboardData(AUTUSRuntime.getDashboardData());
  }, []);

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">AUTUS 초기화 중...</p>
        </div>
      </div>
    );
  }

  const { v, painSignal, runtime } = dashboardData;

  return (
    <div className="min-h-screen bg-slate-100">
      {/* AUTUS Navigation */}
      <AUTUSNav currentHash="#ops" />

      {/* Header */}
      <header className="bg-slate-900 text-white px-4 py-4 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-xl">
              🏀
            </div>
            <div>
              <h1 className="font-bold">올댓바스켓 × AUTUS</h1>
              <p className="text-xs text-slate-400">시범 운영 대시보드</p>
            </div>
          </div>

          {/* Quick Nav */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-1">
              {[
                { hash: '#vfactory', icon: '🏭', label: 'V-Factory' },
                { hash: '#producer', icon: '🔧', label: '워크플로우' },
                { hash: '#live', icon: '📡', label: '라이브' },
              ].map(item => (
                <a
                  key={item.hash}
                  href={item.hash}
                  className="px-2 py-1 text-xs text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
                >
                  {item.icon} {item.label}
                </a>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={runtime?.isRunning ? 'running' : 'stopped'} size="lg" />
              <span className="text-sm">{runtime?.isRunning ? '운영중' : '중지됨'}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-16 z-10">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex gap-1">
            {[
              { id: 'overview', label: '개요', icon: '📊' },
              { id: 'pain', label: 'Pain 처리', icon: '🔥', badge: painQueue.length },
              { id: 'requests', label: 'Requests', icon: '📋', badge: requestQueue.length },
              { id: 'test', label: '테스트', icon: '🧪' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors relative ${
                  activeTab === tab.id
                    ? 'border-emerald-500 text-emerald-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.icon} {tab.label}
                {tab.badge > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Overview */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <MetricCard
                icon="💰"
                title="오늘 V 창출"
                value={`${((v?.current?.daily || 0) / 10000).toFixed(1)}만`}
                subtitle="원"
                color="green"
              />
              <MetricCard
                icon="🎯"
                title="목표 달성률"
                value={v?.efficiency?.current || '0%'}
                subtitle={`목표: ${((v?.target?.monthly || 0) / 10000000).toFixed(0)}천만/월`}
                color="blue"
              />
              <MetricCard
                icon="🔥"
                title="Pain 대기"
                value={painQueue.length}
                subtitle="건"
                color="red"
              />
              <MetricCard
                icon="📊"
                title="이벤트 처리"
                value={runtime?.eventsProcessed || 0}
                subtitle="건"
                color="purple"
              />
            </div>

            {/* Panels */}
            <div className="grid md:grid-cols-3 gap-4">
              <SystemStatusPanel data={dashboardData} />
              <PainSignalPanel stats={painSignal} />
              <InputTestPanel onSubmit={handleInput} />
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl p-4 border border-gray-100">
              <h3 className="text-sm font-medium text-gray-500 mb-3">최근 Pain Signal</h3>
              {painQueue.length > 0 ? (
                <div className="space-y-3">
                  {painQueue.slice(0, 3).map((pain, i) => (
                    <PainCard key={pain._id || i} pain={pain} onResolve={handleResolvePain} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  대기 중인 Pain Signal이 없습니다
                </div>
              )}
            </div>
          </div>
        )}

        {/* Pain Queue */}
        {activeTab === 'pain' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Pain 처리 대기열</h2>
              <span className="text-sm text-gray-500">{painQueue.length}건 대기</span>
            </div>

            {painQueue.length > 0 ? (
              <div className="space-y-3">
                {painQueue.map((pain, i) => (
                  <PainCard key={pain._id || i} pain={pain} onResolve={handleResolvePain} />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl p-8 text-center text-gray-400">
                🎉 모든 Pain Signal이 처리되었습니다
              </div>
            )}
          </div>
        )}

        {/* Requests */}
        {activeTab === 'requests' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Request 목록</h2>
              <span className="text-sm text-gray-500">{requestQueue.length}건</span>
            </div>

            {requestQueue.length > 0 ? (
              <div className="space-y-3">
                {requestQueue.map((request, i) => (
                  <RequestCard key={request._id || i} request={request} />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl p-8 text-center text-gray-400">
                처리할 Request가 없습니다
              </div>
            )}
          </div>
        )}

        {/* Test */}
        {activeTab === 'test' && (
          <div className="max-w-md mx-auto space-y-4">
            <h2 className="text-lg font-bold text-gray-900 text-center">입력 테스트</h2>
            <InputTestPanel onSubmit={handleInput} />

            <div className="bg-slate-800 rounded-xl p-4 text-white">
              <h3 className="text-sm font-medium text-slate-400 mb-3">Pain Signal 통계</h3>
              <pre className="text-xs overflow-auto">
                {JSON.stringify(painSignal, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 px-4 py-3 mt-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-sm text-gray-500">
          <span>AUTUS v1.0 시범운영</span>
          <span>Uptime: {Math.floor((runtime?.uptime || 0) / 60000)}분</span>
        </div>
      </footer>
    </div>
  );
}
