import React, { useState, useEffect, useRef, useCallback } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════════════════

interface DashboardEvent {
  event_type: 'customer_lookup' | 'vip_alert' | 'caution_alert' | 'stats_update';
  timestamp: string;
  data: {
    phone?: string;
    name?: string;
    biz_type?: string;
    station_id?: string;
    guide?: {
      message?: string;
      bg_color?: string;
      alert_level?: string;
      tags?: Array<{ emoji: string; label: string }>;
    };
    alert_level?: string;
    message?: string;
  };
}

interface Stats {
  total_lookups: number;
  vip_alerts: number;
  caution_alerts: number;
  active_stations: number;
  active_connections: number;
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
// WebSocket Hook
// ═══════════════════════════════════════════════════════════════════════════════════════════

const useWebSocket = (url: string) => {
  const [isConnected, setIsConnected] = useState(false);
  const [events, setEvents] = useState<DashboardEvent[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(url);

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.event_type) {
            setEvents((prev) => [data, ...prev.slice(0, 49)]);
          }
        } catch (e) {
          // ping/pong 메시지 처리
          if (event.data === 'ping') {
            ws.send('pong');
          }
        }
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        // 재연결 시도
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to connect:', error);
    }
  }, [url]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return { isConnected, events };
};

// ═══════════════════════════════════════════════════════════════════════════════════════════
// Components
// ═══════════════════════════════════════════════════════════════════════════════════════════

// 통계 카드
const StatCard: React.FC<{
  title: string;
  value: number;
  icon: string;
  color: string;
}> = ({ title, value, icon, color }) => (
  <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-slate-400 text-sm">{title}</p>
        <p className={`text-3xl font-bold ${color}`}>{value.toLocaleString()}</p>
      </div>
      <span className="text-3xl">{icon}</span>
    </div>
  </div>
);

// 이벤트 카드
const EventCard: React.FC<{ event: DashboardEvent }> = ({ event }) => {
  const getAlertStyle = () => {
    switch (event.data.alert_level) {
      case 'urgent':
        return 'border-yellow-500 bg-yellow-500/10';
      case 'caution':
        return 'border-red-500 bg-red-500/10';
      default:
        return 'border-slate-600 bg-slate-800';
    }
  };

  const getAlertIcon = () => {
    switch (event.event_type) {
      case 'vip_alert':
        return '👑';
      case 'caution_alert':
        return '⚠️';
      default:
        return '📋';
    }
  };

  const getBizIcon = () => {
    switch (event.data.biz_type) {
      case 'ACADEMY':
        return '🎓';
      case 'RESTAURANT':
        return '🍽️';
      case 'SPORTS':
        return '🏋️';
      case 'CAFE':
        return '☕';
      default:
        return '📦';
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className={`rounded-lg border p-3 mb-2 transition-all ${getAlertStyle()}`}>
      <div className="flex items-start gap-3">
        {/* 아이콘 */}
        <div className="text-2xl">{getAlertIcon()}</div>

        {/* 내용 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{getBizIcon()}</span>
            <span className="font-semibold text-white">
              {event.data.name || '고객'}
            </span>
            <span className="text-slate-400 text-sm">
              ****{event.data.phone}
            </span>
          </div>

          {/* 메시지 */}
          {event.data.guide?.message && (
            <p className="text-slate-300 text-sm truncate">
              {event.data.guide.message}
            </p>
          )}

          {/* 태그 */}
          {event.data.guide?.tags && event.data.guide.tags.length > 0 && (
            <div className="flex gap-1 mt-1">
              {event.data.guide.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-700 rounded text-xs"
                >
                  {tag.emoji} {tag.label}
                </span>
              ))}
            </div>
          )}

          {/* 메타 정보 */}
          <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
            <span>{event.data.station_id}</span>
            <span>•</span>
            <span>{formatTime(event.timestamp)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// 연결 상태 표시
const ConnectionStatus: React.FC<{ isConnected: boolean }> = ({ isConnected }) => (
  <div className="flex items-center gap-2">
    <span
      className={`w-2 h-2 rounded-full ${
        isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
      }`}
    />
    <span className={`text-sm ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
      {isConnected ? '실시간 연결됨' : '연결 끊김'}
    </span>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════════════════
// Main Dashboard
// ═══════════════════════════════════════════════════════════════════════════════════════════

const BridgeDashboard: React.FC = () => {
  const clientId = `dashboard_${Date.now()}`;
  const wsUrl = `ws://localhost:8000/api/v1/ws/dashboard/${clientId}`;

  const { isConnected, events } = useWebSocket(wsUrl);
  const [stats, setStats] = useState<Stats>({
    total_lookups: 0,
    vip_alerts: 0,
    caution_alerts: 0,
    active_stations: 0,
    active_connections: 0,
  });

  // 이벤트에서 통계 계산
  useEffect(() => {
    const vipCount = events.filter(
      (e) => e.event_type === 'vip_alert' || e.data.alert_level === 'urgent'
    ).length;
    const cautionCount = events.filter(
      (e) => e.event_type === 'caution_alert' || e.data.alert_level === 'caution'
    ).length;
    const stations = new Set(events.map((e) => e.data.station_id).filter(Boolean));

    setStats({
      total_lookups: events.length,
      vip_alerts: vipCount,
      caution_alerts: cautionCount,
      active_stations: stations.size,
      active_connections: isConnected ? 1 : 0,
    });
  }, [events, isConnected]);

  // VIP/주의 이벤트 필터
  const vipEvents = events.filter(
    (e) => e.event_type === 'vip_alert' || e.data.alert_level === 'urgent'
  );
  const cautionEvents = events.filter(
    (e) => e.event_type === 'caution_alert' || e.data.alert_level === 'caution'
  );

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-amber-400">
            🌉 AUTUS Bridge 실시간 대시보드
          </h1>
          <p className="text-slate-400 text-sm">10개 매장 통합 모니터링</p>
        </div>
        <ConnectionStatus isConnected={isConnected} />
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="총 조회"
          value={stats.total_lookups}
          icon="📊"
          color="text-white"
        />
        <StatCard
          title="VIP 알림"
          value={stats.vip_alerts}
          icon="👑"
          color="text-yellow-400"
        />
        <StatCard
          title="주의 알림"
          value={stats.caution_alerts}
          icon="⚠️"
          color="text-red-400"
        />
        <StatCard
          title="활성 스테이션"
          value={stats.active_stations}
          icon="📡"
          color="text-green-400"
        />
      </div>

      {/* 3열 레이아웃 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* VIP 알림 */}
        <div className="bg-slate-800/50 rounded-xl p-4 border border-yellow-500/30">
          <h2 className="text-lg font-bold text-yellow-400 mb-3 flex items-center gap-2">
            👑 VIP 알림
            <span className="bg-yellow-500/20 text-yellow-300 text-xs px-2 py-0.5 rounded">
              {vipEvents.length}
            </span>
          </h2>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {vipEvents.length > 0 ? (
              vipEvents.slice(0, 10).map((event, idx) => (
                <EventCard key={`vip-${idx}`} event={event} />
              ))
            ) : (
              <p className="text-slate-500 text-center py-8">VIP 알림 없음</p>
            )}
          </div>
        </div>

        {/* 전체 이벤트 */}
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-600">
          <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
            📋 실시간 피드
            <span className="bg-slate-600 text-slate-300 text-xs px-2 py-0.5 rounded">
              {events.length}
            </span>
          </h2>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {events.length > 0 ? (
              events.slice(0, 20).map((event, idx) => (
                <EventCard key={`event-${idx}`} event={event} />
              ))
            ) : (
              <p className="text-slate-500 text-center py-8">
                Bridge 클라이언트에서 데이터를 수집하면
                <br />
                여기에 표시됩니다.
              </p>
            )}
          </div>
        </div>

        {/* 주의 알림 */}
        <div className="bg-slate-800/50 rounded-xl p-4 border border-red-500/30">
          <h2 className="text-lg font-bold text-red-400 mb-3 flex items-center gap-2">
            ⚠️ 주의 알림
            <span className="bg-red-500/20 text-red-300 text-xs px-2 py-0.5 rounded">
              {cautionEvents.length}
            </span>
          </h2>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {cautionEvents.length > 0 ? (
              cautionEvents.slice(0, 10).map((event, idx) => (
                <EventCard key={`caution-${idx}`} event={event} />
              ))
            ) : (
              <p className="text-slate-500 text-center py-8">주의 알림 없음</p>
            )}
          </div>
        </div>
      </div>

      {/* 푸터 */}
      <div className="mt-6 text-center text-slate-500 text-sm">
        AUTUS-TRINITY v3.1 | 10개 사업장 독점 제국 운영체제
      </div>
    </div>
  );
};

export default BridgeDashboard;
