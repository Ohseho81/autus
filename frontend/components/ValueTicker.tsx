/**
 * AUTUS Real-time Value Ticker
 * ============================
 * 
 * 실시간 가치 변화를 표시하는 티커 컴포넌트
 * 
 * Features:
 * - 50ms 실시간 업데이트
 * - 가치 델타 애니메이션
 * - 시너지 변화 알림
 * - 골든 볼륨 카운터
 * - 시간 절약 추적
 * 
 * Version: 1.0.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { create } from 'zustand';

// ================================================================
// TYPES
// ================================================================

interface ValueDelta {
  type: 'positive' | 'negative' | 'neutral';
  amount: number;
  percentage: number;
  source: string;
  timestamp: Date;
}

interface TickerState {
  // 핵심 지표
  totalValue: number;
  savedTimeHours: number;
  connectionStrength: number;
  goldenCount: number;
  entropyLevel: number;
  
  // 델타 추적
  valueDelta: number;
  timeDelta: number;
  recentChanges: ValueDelta[];
  
  // WebSocket 상태
  connected: boolean;
  lastUpdate: Date | null;
  
  // 액션
  setTotalValue: (value: number) => void;
  addDelta: (delta: ValueDelta) => void;
  setConnected: (status: boolean) => void;
  updateFromServer: (data: any) => void;
}

// ================================================================
// ZUSTAND STORE
// ================================================================

export const useValueTickerStore = create<TickerState>((set, get) => ({
  // 초기값
  totalValue: 0,
  savedTimeHours: 0,
  connectionStrength: 0,
  goldenCount: 0,
  entropyLevel: 0,
  
  valueDelta: 0,
  timeDelta: 0,
  recentChanges: [],
  
  connected: false,
  lastUpdate: null,
  
  // 액션
  setTotalValue: (value) => set({ totalValue: value }),
  
  addDelta: (delta) => set((state) => ({
    recentChanges: [delta, ...state.recentChanges].slice(0, 10),
    valueDelta: state.valueDelta + delta.amount,
  })),
  
  setConnected: (status) => set({ connected: status }),
  
  updateFromServer: (data) => {
    const current = get();
    const valueDiff = data.total_value - current.totalValue;
    const timeDiff = data.saved_time - current.savedTimeHours;
    
    set({
      totalValue: data.total_value || 0,
      savedTimeHours: data.saved_time || 0,
      connectionStrength: data.connection_strength || 0,
      goldenCount: data.golden_count || 0,
      entropyLevel: data.entropy || 0,
      valueDelta: valueDiff,
      timeDelta: timeDiff,
      lastUpdate: new Date(),
    });
    
    // 델타가 있으면 기록
    if (Math.abs(valueDiff) > 0) {
      get().addDelta({
        type: valueDiff > 0 ? 'positive' : 'negative',
        amount: valueDiff,
        percentage: (valueDiff / current.totalValue) * 100,
        source: data.source || 'system',
        timestamp: new Date(),
      });
    }
  },
}));

// ================================================================
// WEBSOCKET HOOK
// ================================================================

export function useRealtimeValueTicker(wsUrl: string = 'ws://localhost:8000/ws/updates') {
  const { setConnected, updateFromServer } = useValueTickerStore();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    
    ws.onopen = () => {
      console.log('[ValueTicker] Connected');
      setConnected(true);
    };
    
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        if (message.type === 'init' || message.type === 'map_update') {
          updateFromServer(message.data);
        }
        
        if (message.type === 'value_delta') {
          updateFromServer({
            ...message.data,
            source: message.source,
          });
        }
      } catch (e) {
        console.error('[ValueTicker] Parse error:', e);
      }
    };
    
    ws.onclose = () => {
      console.log('[ValueTicker] Disconnected');
      setConnected(false);
      
      // 자동 재연결 (5초 후)
      reconnectTimeoutRef.current = setTimeout(connect, 5000);
    };
    
    ws.onerror = (error) => {
      console.error('[ValueTicker] Error:', error);
    };
  }, [wsUrl, setConnected, updateFromServer]);
  
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    wsRef.current?.close();
  }, []);
  
  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);
  
  return { connect, disconnect };
}

// ================================================================
// UTILITY FUNCTIONS
// ================================================================

function formatNumber(num: number): string {
  if (Math.abs(num) >= 1e9) {
    return (num / 1e9).toFixed(1) + 'B';
  }
  if (Math.abs(num) >= 1e6) {
    return (num / 1e6).toFixed(1) + 'M';
  }
  if (Math.abs(num) >= 1e3) {
    return (num / 1e3).toFixed(1) + 'K';
  }
  return num.toLocaleString();
}

function formatDelta(num: number): string {
  const prefix = num > 0 ? '+' : '';
  return prefix + formatNumber(num);
}

function formatTime(hours: number): string {
  if (hours >= 24) {
    return `${Math.floor(hours / 24)}일 ${Math.round(hours % 24)}시간`;
  }
  return `${hours.toFixed(1)}시간`;
}

// ================================================================
// COMPONENTS
// ================================================================

// 개별 지표 카드
interface MetricCardProps {
  label: string;
  value: string | number;
  delta?: number;
  icon: string;
  color: 'green' | 'blue' | 'yellow' | 'red' | 'purple';
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  label, 
  value, 
  delta, 
  icon, 
  color 
}) => {
  const colorClasses = {
    green: 'bg-green-50 border-green-200 text-green-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
  };
  
  return (
    <div className={`p-4 rounded-xl border ${colorClasses[color]} transition-all duration-300`}>
      <div className="flex items-center justify-between">
        <span className="text-2xl">{icon}</span>
        {delta !== undefined && delta !== 0 && (
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
            delta > 0 ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'
          }`}>
            {formatDelta(delta)}
          </span>
        )}
      </div>
      <div className="mt-2">
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-sm opacity-70">{label}</div>
      </div>
    </div>
  );
};

// 실시간 델타 알림
interface DeltaNotificationProps {
  delta: ValueDelta;
}

const DeltaNotification: React.FC<DeltaNotificationProps> = ({ delta }) => {
  const [visible, setVisible] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 3000);
    return () => clearTimeout(timer);
  }, []);
  
  if (!visible) return null;
  
  return (
    <div className={`
      animate-slide-in px-4 py-2 rounded-lg shadow-lg
      ${delta.type === 'positive' 
        ? 'bg-green-500 text-white' 
        : 'bg-red-500 text-white'}
    `}>
      <div className="flex items-center gap-2">
        <span>{delta.type === 'positive' ? '📈' : '📉'}</span>
        <span className="font-bold">{formatDelta(delta.amount)}</span>
        <span className="text-sm opacity-80">({delta.percentage.toFixed(1)}%)</span>
      </div>
      <div className="text-xs opacity-70">{delta.source}</div>
    </div>
  );
};

// 메인 티커 컴포넌트
export const ValueTicker: React.FC = () => {
  const {
    totalValue,
    savedTimeHours,
    connectionStrength,
    goldenCount,
    entropyLevel,
    valueDelta,
    timeDelta,
    recentChanges,
    connected,
    lastUpdate,
  } = useValueTickerStore();
  
  useRealtimeValueTicker();
  
  return (
    <div className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-b shadow-sm z-50">
      {/* 연결 상태 표시 */}
      <div className={`h-1 ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
      
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* 로고 & 상태 */}
          <div className="flex items-center gap-3">
            <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              AUTUS
            </div>
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          </div>
          
          {/* 핵심 지표 */}
          <div className="flex items-center gap-6">
            {/* 총 가치 */}
            <div className="text-center">
              <div className="text-2xl font-bold">
                ₩{formatNumber(totalValue)}
                {valueDelta !== 0 && (
                  <span className={`ml-2 text-sm ${valueDelta > 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {formatDelta(valueDelta)}
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-500">총 가치</div>
            </div>
            
            {/* 구분선 */}
            <div className="w-px h-10 bg-gray-200" />
            
            {/* 절약 시간 */}
            <div className="text-center">
              <div className="text-xl font-bold text-blue-600">
                {formatTime(savedTimeHours)}
                {timeDelta !== 0 && (
                  <span className="ml-1 text-sm text-green-500">+{timeDelta.toFixed(1)}h</span>
                )}
              </div>
              <div className="text-xs text-gray-500">절약 시간</div>
            </div>
            
            {/* 구분선 */}
            <div className="w-px h-10 bg-gray-200" />
            
            {/* 골든 볼륨 */}
            <div className="text-center">
              <div className="text-xl font-bold text-yellow-500">
                {goldenCount}명
              </div>
              <div className="text-xs text-gray-500">골든 볼륨</div>
            </div>
            
            {/* 구분선 */}
            <div className="w-px h-10 bg-gray-200" />
            
            {/* 연결 강도 */}
            <div className="text-center">
              <div className="text-xl font-bold text-purple-600">
                {connectionStrength.toFixed(0)}%
              </div>
              <div className="text-xs text-gray-500">연결 강도</div>
            </div>
            
            {/* 구분선 */}
            <div className="w-px h-10 bg-gray-200" />
            
            {/* 엔트로피 */}
            <div className="text-center">
              <div className={`text-xl font-bold ${entropyLevel < 1 ? 'text-green-600' : entropyLevel < 3 ? 'text-yellow-600' : 'text-red-600'}`}>
                {entropyLevel.toFixed(2)}
              </div>
              <div className="text-xs text-gray-500">엔트로피</div>
            </div>
          </div>
          
          {/* 마지막 업데이트 */}
          <div className="text-xs text-gray-400">
            {lastUpdate ? `${Math.round((Date.now() - lastUpdate.getTime()) / 1000)}초 전` : '대기 중'}
          </div>
        </div>
      </div>
      
      {/* 실시간 델타 알림 */}
      <div className="fixed top-20 right-4 space-y-2">
        {recentChanges.slice(0, 3).map((delta, i) => (
          <DeltaNotification key={i} delta={delta} />
        ))}
      </div>
    </div>
  );
};

// 대시보드 통합 컴포넌트
export const ValueDashboard: React.FC = () => {
  const {
    totalValue,
    savedTimeHours,
    connectionStrength,
    goldenCount,
    entropyLevel,
  } = useValueTickerStore();
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4">
      <MetricCard
        icon="💰"
        label="총 가치"
        value={`₩${formatNumber(totalValue)}`}
        color="green"
      />
      <MetricCard
        icon="⏰"
        label="절약 시간"
        value={formatTime(savedTimeHours)}
        color="blue"
      />
      <MetricCard
        icon="⭐"
        label="골든 볼륨"
        value={`${goldenCount}명`}
        color="yellow"
      />
      <MetricCard
        icon="🔗"
        label="연결 강도"
        value={`${connectionStrength.toFixed(0)}%`}
        color="purple"
      />
      <MetricCard
        icon="🌀"
        label="엔트로피"
        value={entropyLevel.toFixed(2)}
        color={entropyLevel < 1 ? 'green' : entropyLevel < 3 ? 'yellow' : 'red'}
      />
    </div>
  );
};

export default ValueTicker;
