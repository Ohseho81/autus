/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS Trinity Dashboard (M23)
 * Gravity + Solutions + Modules 통합 실시간 대시보드
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useCallback } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

interface GravityState {
  active_decisions: number;
  pending_approvals: number;
  k_distribution: Record<number, number>;
  recent_events: GravityEvent[];
  ritual_in_progress: boolean;
  audit_count: number;
  chain_valid: boolean;
}

interface GravityEvent {
  id: string;
  type: string;
  decision_id: string;
  k_level: number;
  actor: string;
  timestamp: string;
  status: 'allowed' | 'blocked' | 'pending' | 'ritual';
}

interface SystemHealth {
  api: 'healthy' | 'degraded' | 'down';
  database: 'healthy' | 'degraded' | 'down';
  llm: 'healthy' | 'degraded' | 'down';
  websocket: 'healthy' | 'degraded' | 'down';
}

interface ModuleStatus {
  id: string;
  name: string;
  status: 'active' | 'pending' | 'error';
  last_run?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Mock Data (실제로는 WebSocket/API에서 가져옴)
// ═══════════════════════════════════════════════════════════════════════════════

const MOCK_GRAVITY_STATE: GravityState = {
  active_decisions: 12,
  pending_approvals: 3,
  k_distribution: { 1: 45, 2: 28, 3: 15, 4: 8, 5: 3, 6: 1, 7: 0, 8: 0, 9: 0, 10: 0 },
  recent_events: [
    { id: 'e1', type: 'EVALUATE', decision_id: 'D-2026-0042', k_level: 2, actor: 'Kim', timestamp: '2026-01-13T10:30:00Z', status: 'allowed' },
    { id: 'e2', type: 'EVALUATE', decision_id: 'D-2026-0041', k_level: 6, actor: 'Lee', timestamp: '2026-01-13T10:28:00Z', status: 'pending' },
    { id: 'e3', type: 'OVERRIDE', decision_id: 'D-2026-0040', k_level: 5, actor: 'Park', timestamp: '2026-01-13T10:25:00Z', status: 'allowed' },
    { id: 'e4', type: 'GATE_BLOCKED', decision_id: 'D-2026-0039', k_level: 4, actor: 'Choi', timestamp: '2026-01-13T10:20:00Z', status: 'blocked' },
    { id: 'e5', type: 'RITUAL_ENTER', decision_id: 'D-2026-0038', k_level: 10, actor: 'CEO', timestamp: '2026-01-13T10:15:00Z', status: 'ritual' },
  ],
  ritual_in_progress: true,
  audit_count: 1247,
  chain_valid: true,
};

const MOCK_SYSTEM_HEALTH: SystemHealth = {
  api: 'healthy',
  database: 'healthy',
  llm: 'degraded',
  websocket: 'healthy',
};

const MOCK_MODULES: ModuleStatus[] = [
  { id: 'M13', name: 'Monthly Tech Update', status: 'active', last_run: '2026-01-01T00:00:00Z' },
  { id: 'M19', name: 'Self-Evolution Loop', status: 'active', last_run: '2026-01-13T09:00:00Z' },
  { id: 'M22', name: 'Integration Health', status: 'active', last_run: '2026-01-13T10:00:00Z' },
  { id: 'M23', name: 'Trinity Dashboard', status: 'active' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════════

const K_COLORS: Record<number, string> = {
  1: '#22C55E', 2: '#84CC16', 3: '#EAB308', 4: '#F97316',
  5: '#F59E0B', 6: '#EF4444', 7: '#DC2626', 8: '#B91C1C',
  9: '#991B1B', 10: '#7F1D1D',
};

const STATUS_COLORS = {
  allowed: '#22C55E',
  blocked: '#EF4444',
  pending: '#F59E0B',
  ritual: '#8B5CF6',
};

const HEALTH_COLORS = {
  healthy: '#22C55E',
  degraded: '#F59E0B',
  down: '#EF4444',
};

// ═══════════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════════

export function TrinityDashboard() {
  const [gravityState, setGravityState] = useState<GravityState>(MOCK_GRAVITY_STATE);
  const [systemHealth, setSystemHealth] = useState<SystemHealth>(MOCK_SYSTEM_HEALTH);
  const [modules, setModules] = useState<ModuleStatus[]>(MOCK_MODULES);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [connected, setConnected] = useState(true);

  // WebSocket 시뮬레이션 (실제로는 Socket.io 연결)
  useEffect(() => {
    const interval = setInterval(() => {
      setLastUpdate(new Date());
      // 실제로는 WebSocket에서 데이터 수신
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  // K 분포 총합
  const totalDecisions = Object.values(gravityState.k_distribution).reduce((a, b) => a + b, 0);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">🏛️ Trinity Dashboard</h1>
          <p className="text-gray-400 text-sm">Gravity · Solutions · Modules 통합 관측</p>
        </div>
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${connected ? 'bg-green-900/30' : 'bg-red-900/30'}`}>
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-sm">{connected ? 'Connected' : 'Disconnected'}</span>
          </div>
          <span className="text-xs text-gray-500">
            Last: {lastUpdate.toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
        <StatCard
          icon="📊"
          label="Active Decisions"
          value={gravityState.active_decisions}
          color="#3B82F6"
        />
        <StatCard
          icon="⏳"
          label="Pending Approvals"
          value={gravityState.pending_approvals}
          color="#F59E0B"
          alert={gravityState.pending_approvals > 5}
        />
        <StatCard
          icon="📝"
          label="Audit Records"
          value={gravityState.audit_count}
          color="#8B5CF6"
        />
        <StatCard
          icon="🔗"
          label="Chain Valid"
          value={gravityState.chain_valid ? '✓' : '✗'}
          color={gravityState.chain_valid ? '#22C55E' : '#EF4444'}
        />
        <StatCard
          icon="🏛️"
          label="Ritual Active"
          value={gravityState.ritual_in_progress ? 'YES' : 'NO'}
          color={gravityState.ritual_in_progress ? '#EF4444' : '#6B7280'}
          alert={gravityState.ritual_in_progress}
        />
        <StatCard
          icon="📈"
          label="Total Decisions"
          value={totalDecisions}
          color="#10B981"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* K Level Distribution */}
        <div className="bg-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">K Level Distribution</h2>
          <div className="space-y-2">
            {Object.entries(gravityState.k_distribution).map(([k, count]) => {
              const kNum = parseInt(k);
              const percentage = totalDecisions > 0 ? (count / totalDecisions) * 100 : 0;
              
              return (
                <div key={k} className="flex items-center gap-3">
                  <span 
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
                    style={{ backgroundColor: `${K_COLORS[kNum]}30`, color: K_COLORS[kNum] }}
                  >
                    K{k}
                  </span>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ 
                          width: `${percentage}%`, 
                          backgroundColor: K_COLORS[kNum],
                        }}
                      />
                    </div>
                  </div>
                  <span className="text-sm text-gray-400 w-12 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Events */}
        <div className="bg-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Events</h2>
          <div className="space-y-3 max-h-80 overflow-auto">
            {gravityState.recent_events.map(event => (
              <div 
                key={event.id}
                className="p-3 bg-gray-700 rounded-lg"
                style={{ borderLeft: `4px solid ${STATUS_COLORS[event.status]}` }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-400">{event.type}</span>
                  <span 
                    className="px-2 py-0.5 rounded text-xs"
                    style={{ 
                      backgroundColor: `${STATUS_COLORS[event.status]}20`,
                      color: STATUS_COLORS[event.status],
                    }}
                  >
                    {event.status.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm">{event.decision_id}</span>
                  <span 
                    className="px-2 py-0.5 rounded text-xs font-bold"
                    style={{ backgroundColor: `${K_COLORS[event.k_level]}30`, color: K_COLORS[event.k_level] }}
                  >
                    K{event.k_level}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1 text-xs text-gray-500">
                  <span>{event.actor}</span>
                  <span>{new Date(event.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Health & Modules */}
        <div className="space-y-6">
          {/* System Health */}
          <div className="bg-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">System Health</h2>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(systemHealth).map(([service, status]) => (
                <div 
                  key={service}
                  className="p-3 bg-gray-700 rounded-lg flex items-center gap-3"
                >
                  <span 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: HEALTH_COLORS[status as keyof typeof HEALTH_COLORS] }}
                  />
                  <div>
                    <p className="text-sm font-medium capitalize">{service}</p>
                    <p className="text-xs text-gray-400 capitalize">{status}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Active Modules */}
          <div className="bg-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">Active Modules</h2>
            <div className="space-y-2">
              {modules.map(module => (
                <div 
                  key={module.id}
                  className="p-3 bg-gray-700 rounded-lg flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span 
                      className="w-2 h-2 rounded-full"
                      style={{ 
                        backgroundColor: module.status === 'active' ? '#22C55E' : 
                          module.status === 'pending' ? '#F59E0B' : '#EF4444' 
                      }}
                    />
                    <span className="text-xs text-gray-400">{module.id}</span>
                    <span className="text-sm">{module.name}</span>
                  </div>
                  {module.last_run && (
                    <span className="text-xs text-gray-500">
                      {new Date(module.last_run).toLocaleDateString()}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Gravity Formula Reference */}
      <div className="mt-6 p-4 bg-gray-800 rounded-xl">
        <div className="flex items-center justify-between">
          <div>
            <span className="font-mono text-gray-400">Gravity: </span>
            <span className="font-mono text-blue-400">Ω = (M × I × R) / T → K</span>
          </div>
          <div className="text-xs text-gray-500">
            Event Override: CONTRACT/REGULATORY → min K6 | CONSTITUTION → K10
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Sub-components
// ═══════════════════════════════════════════════════════════════════════════════

interface StatCardProps {
  icon: string;
  label: string;
  value: string | number;
  color: string;
  alert?: boolean;
}

function StatCard({ icon, label, value, color, alert }: StatCardProps) {
  return (
    <div 
      className={`bg-gray-800 rounded-xl p-4 ${alert ? 'ring-2 ring-red-500 animate-pulse' : ''}`}
      style={{ borderLeft: `4px solid ${color}` }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xl">{icon}</span>
        <span className="text-xs text-gray-400">{label}</span>
      </div>
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
    </div>
  );
}

export default TrinityDashboard;
