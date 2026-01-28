/**
 * AUTUS 시스템 대시보드
 * 전체 시스템 상태 통합 뷰
 */

import { useState, useEffect, useCallback } from 'react';
import { systemApi, autusApi, edgeApi, auditApi, refApi } from '../api/autus';

interface SystemHealth {
  status: string;
  version: string;
  components: Record<string, boolean>;
}

interface ApiStatus {
  name: string;
  status: 'online' | 'offline' | 'loading';
  latency?: number;
  data?: unknown;
}

export function SystemDashboard() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [apiStatuses, setApiStatuses] = useState<ApiStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSystemStatus = useCallback(async () => {
    setLoading(true);

    // Health Check
    try {
      const healthData = await systemApi.health();
      setHealth(healthData);
    } catch {
      setHealth({ status: 'offline', version: 'unknown', components: {} });
    }

    // API Status Checks
    const checks: ApiStatus[] = [
      { name: 'System Info', status: 'loading' },
      { name: 'AUTUS Nodes', status: 'loading' },
      { name: 'Edge Functions', status: 'loading' },
      { name: 'Audit Dashboard', status: 'loading' },
      { name: '48 Nodes Reference', status: 'loading' },
    ];

    setApiStatuses([...checks]);

    const apiCalls = [
      { fn: systemApi.getInfo, idx: 0 },
      { fn: autusApi.getNodes, idx: 1 },
      { fn: edgeApi.getFunctions, idx: 2 },
      { fn: auditApi.getDashboard, idx: 3 },
      { fn: refApi.getNodes48, idx: 4 },
    ];

    for (const { fn, idx } of apiCalls) {
      const start = Date.now();
      try {
        const data = await fn();
        checks[idx] = {
          ...checks[idx],
          status: 'online',
          latency: Date.now() - start,
          data,
        };
      } catch {
        checks[idx] = { ...checks[idx], status: 'offline' };
      }
      setApiStatuses([...checks]);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadSystemStatus();
  }, [loadSystemStatus]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
      case 'healthy':
        return 'bg-green-500';
      case 'degraded':
        return 'bg-yellow-500';
      case 'offline':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">AUTUS System Dashboard</h1>
        <p className="text-gray-400">Universal Engine for 8 Billion Humans</p>
      </header>

      {/* Health Status */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">System Health</h2>
        <div className="bg-gray-800 rounded-lg p-6">
          {health ? (
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded-full ${getStatusColor(health.status)}`} />
                <span className="text-lg font-medium capitalize">{health.status}</span>
              </div>
              <div className="text-gray-400">Version: {health.version}</div>
              <div className="flex gap-4 ml-auto">
                {Object.entries(health.components || {}).map(([name, active]) => (
                  <div key={name} className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${active ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-sm text-gray-400">{name}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-gray-500">Loading...</div>
          )}
        </div>
      </section>

      {/* API Status Grid */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">API Endpoints</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {apiStatuses.map((api, idx) => (
            <div key={idx} className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{api.name}</span>
                <div className="flex items-center gap-2">
                  {api.latency && (
                    <span className="text-xs text-gray-500">{api.latency}ms</span>
                  )}
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(api.status)}`} />
                </div>
              </div>
              {api.data && (
                <pre className="text-xs text-gray-500 overflow-hidden max-h-20">
                  {JSON.stringify(api.data, null, 2).slice(0, 200)}...
                </pre>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Quick Stats */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Quick Stats</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard title="API Endpoints" value="285" />
          <StatCard title="Tasks Defined" value="570" />
          <StatCard title="Physics Nodes" value="48" />
          <StatCard title="Relation Slots" value="144" />
        </div>
      </section>

      {/* Actions */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="flex gap-4">
          <button
            onClick={loadSystemStatus}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Refresh Status'}
          </button>
          <a
            href="http://localhost:8000/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
          >
            API Documentation
          </a>
        </div>
      </section>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-gray-800 rounded-lg p-4 text-center">
      <div className="text-3xl font-bold text-blue-400">{value}</div>
      <div className="text-sm text-gray-400 mt-1">{title}</div>
    </div>
  );
}

export default SystemDashboard;
