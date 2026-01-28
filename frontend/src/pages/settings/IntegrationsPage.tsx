// ═══════════════════════════════════════════════════════════════════════════════
//
//                     AUTUS OAuth 프론트엔드
//                     
//                     Part 5: React 연동 관리 컴포넌트
//
// ═══════════════════════════════════════════════════════════════════════════════

'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  useQuery, 
  useMutation, 
  useQueryClient 
} from '@tanstack/react-query';
import { API_BASE } from '@/config/api';

// ═══════════════════════════════════════════════════════════════════════════════
// 타입 정의
// ═══════════════════════════════════════════════════════════════════════════════

type DataSourceType = 'gmail' | 'calendar' | 'slack' | 'github' | 'notion';

interface DataSourceStatus {
  source_type: DataSourceType;
  is_connected: boolean;
  last_sync: string | null;
  last_status: string | null;
  node_mappings: Record<string, number>;
  error: string | null;
}

interface SyncResult {
  source_type: string;
  status: 'SUCCESS' | 'FAILED';
  items_collected: number;
  node_contributions: Record<string, number>;
  slot_candidates: number;
  duration_seconds: number;
}

interface DataSourceConfig {
  type: DataSourceType;
  name: string;
  description: string;
  icon: string;
  color: string;
  nodes: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// 설정
// ═══════════════════════════════════════════════════════════════════════════════

const DATA_SOURCES: DataSourceConfig[] = [
  {
    type: 'gmail',
    name: 'Gmail',
    description: '이메일 활동, 응답 시간, 네트워크 분석',
    icon: '📧',
    color: 'from-red-500/20 to-red-600/10 border-red-500/30',
    nodes: ['TIME_D', 'TIME_E', 'NET_A', 'NET_D', 'WORK_D'],
  },
  {
    type: 'calendar',
    name: 'Google Calendar',
    description: '일정 관리, 회의 시간, 가용성 분석',
    icon: '📅',
    color: 'from-blue-500/20 to-blue-600/10 border-blue-500/30',
    nodes: ['TIME_A', 'TIME_D', 'TIME_E', 'WORK_A', 'NET_A'],
  },
  {
    type: 'slack',
    name: 'Slack',
    description: '팀 커뮤니케이션, 채널 활동, 협업 분석',
    icon: '💬',
    color: 'from-purple-500/20 to-purple-600/10 border-purple-500/30',
    nodes: ['NET_A', 'NET_D', 'NET_E', 'TEAM_A', 'TEAM_D'],
  },
  {
    type: 'github',
    name: 'GitHub',
    description: '코드 커밋, PR, 이슈 활동',
    icon: '🐙',
    color: 'from-gray-500/20 to-gray-600/10 border-gray-500/30',
    nodes: ['WORK_A', 'WORK_D', 'WORK_E', 'SKILL_D'],
  },
  {
    type: 'notion',
    name: 'Notion',
    description: '문서, 데이터베이스, 지식 관리',
    icon: '📝',
    color: 'from-amber-500/20 to-amber-600/10 border-amber-500/30',
    nodes: ['KNOW_A', 'KNOW_D', 'WORK_A'],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// API 함수
// ═══════════════════════════════════════════════════════════════════════════════

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `API Error: ${response.status}`);
  }

  return response.json();
}

// ═══════════════════════════════════════════════════════════════════════════════
// React Query 훅
// ═══════════════════════════════════════════════════════════════════════════════

const oauthQueryKeys = {
  status: () => ['oauth', 'status'] as const,
};

function useDataSourceStatus() {
  return useQuery({
    queryKey: oauthQueryKeys.status(),
    queryFn: () => fetchAPI<DataSourceStatus[]>('/api/oauth/status'),
    staleTime: 30 * 1000,
  });
}

function useConnectSource() {
  return useMutation({
    mutationFn: async (sourceType: DataSourceType) => {
      const result = await fetchAPI<{ auth_url: string; state: string }>(
        `/api/oauth/connect/${sourceType}`
      );
      // OAuth URL로 리다이렉트
      window.location.href = result.auth_url;
      return result;
    },
  });
}

function useDisconnectSource() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (sourceType: DataSourceType) =>
      fetchAPI(`/api/oauth/disconnect/${sourceType}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: oauthQueryKeys.status() });
    },
  });
}

function useSyncSource() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ sourceType, sinceDays = 7 }: { sourceType: DataSourceType; sinceDays?: number }) =>
      fetchAPI<SyncResult>('/api/oauth/sync', {
        method: 'POST',
        body: JSON.stringify({ source_type: sourceType, since_days: sinceDays }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: oauthQueryKeys.status() });
    },
  });
}

function useSyncAll() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (sinceDays: number = 7) =>
      fetchAPI<{ synced: number; results: SyncResult[] }>(
        `/api/oauth/sync-all?since_days=${sinceDays}`,
        { method: 'POST' }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: oauthQueryKeys.status() });
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 컴포넌트
// ═══════════════════════════════════════════════════════════════════════════════

interface DataSourceCardProps {
  config: DataSourceConfig;
  status?: DataSourceStatus;
  onConnect: () => void;
  onDisconnect: () => void;
  onSync: () => void;
  isSyncing: boolean;
}

function DataSourceCard({
  config,
  status,
  onConnect,
  onDisconnect,
  onSync,
  isSyncing,
}: DataSourceCardProps) {
  const isConnected = status?.is_connected ?? false;
  
  return (
    <motion.div
      className={`bg-gradient-to-br ${config.color} border rounded-2xl p-6 
        transition-all hover:scale-[1.02]`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
    >
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{config.icon}</span>
          <div>
            <h3 className="text-white font-semibold">{config.name}</h3>
            <p className="text-white/40 text-sm">{config.description}</p>
          </div>
        </div>
        
        {/* 상태 표시 */}
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs
          ${isConnected 
            ? 'bg-emerald-500/20 text-emerald-400' 
            : 'bg-white/10 text-white/40'}`}
        >
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-white/30'}`} />
          {isConnected ? 'Connected' : 'Not Connected'}
        </div>
      </div>
      
      {/* 연결된 노드 */}
      <div className="mb-4">
        <p className="text-white/40 text-xs mb-2">Affects Nodes:</p>
        <div className="flex flex-wrap gap-1">
          {config.nodes.map((node) => (
            <span 
              key={node}
              className="px-2 py-0.5 bg-white/10 rounded text-xs text-white/60"
            >
              {node}
            </span>
          ))}
        </div>
      </div>
      
      {/* 마지막 동기화 */}
      {isConnected && status?.node_mappings && (
        <div className="mb-4 p-3 bg-black/20 rounded-xl">
          <p className="text-white/40 text-xs mb-2">Latest Contributions:</p>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(status.node_mappings).slice(0, 4).map(([node, value]) => (
              <div key={node} className="flex items-center justify-between">
                <span className="text-white/60 text-xs">{node}</span>
                <span className={`text-xs ${(value as number) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {(value as number) >= 0 ? '+' : ''}{((value as number) * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* 액션 버튼 */}
      <div className="flex gap-2">
        {isConnected ? (
          <>
            <button
              onClick={onSync}
              disabled={isSyncing}
              className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 
                rounded-xl text-white text-sm transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSyncing ? (
                <span className="flex items-center justify-center gap-2">
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                  >
                    ↻
                  </motion.span>
                  Syncing...
                </span>
              ) : (
                'Sync Now'
              )}
            </button>
            <button
              onClick={onDisconnect}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 
                rounded-xl text-red-400 text-sm transition-colors"
            >
              Disconnect
            </button>
          </>
        ) : (
          <button
            onClick={onConnect}
            className="flex-1 px-4 py-2 bg-white/20 hover:bg-white/30 
              rounded-xl text-white text-sm font-medium transition-colors"
          >
            Connect
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 메인 페이지 컴포넌트
// ═══════════════════════════════════════════════════════════════════════════════

export function IntegrationsPage() {
  const { data: statuses, isLoading, isError, refetch } = useDataSourceStatus();
  const connectMutation = useConnectSource();
  const disconnectMutation = useDisconnectSource();
  const syncMutation = useSyncSource();
  const syncAllMutation = useSyncAll();
  
  const [syncingSource, setSyncingSource] = useState<DataSourceType | null>(null);
  
  // URL에서 연결 결과 확인
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get('connected');
    const error = params.get('error');
    
    if (connected) {
      // 성공 토스트
      console.log(`Successfully connected ${connected}`);
      refetch();
      // URL 정리
      window.history.replaceState({}, '', window.location.pathname);
    }
    
    if (error) {
      // 에러 토스트
      console.error(`Connection failed: ${error}`);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [refetch]);
  
  const handleConnect = (sourceType: DataSourceType) => {
    connectMutation.mutate(sourceType);
  };
  
  const handleDisconnect = (sourceType: DataSourceType) => {
    if (confirm(`Disconnect ${sourceType}? This will remove all synced data.`)) {
      disconnectMutation.mutate(sourceType);
    }
  };
  
  const handleSync = async (sourceType: DataSourceType) => {
    setSyncingSource(sourceType);
    try {
      await syncMutation.mutateAsync({ sourceType, sinceDays: 7 });
    } finally {
      setSyncingSource(null);
    }
  };
  
  const handleSyncAll = async () => {
    await syncAllMutation.mutateAsync(7);
  };
  
  // 상태 맵 생성
  const statusMap = (statuses || []).reduce((acc, s) => {
    acc[s.source_type] = s;
    return acc;
  }, {} as Record<DataSourceType, DataSourceStatus>);
  
  const connectedCount = statuses?.filter(s => s.is_connected).length ?? 0;
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] p-8">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-12 bg-white/5 rounded-xl w-64" />
            <div className="grid grid-cols-2 gap-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-64 bg-white/5 rounded-2xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-[#0a0a0f] p-8">
      <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Data Integrations</h1>
            <p className="text-white/40">
              Connect your tools to power K/I calculations
            </p>
          </div>
          
          {connectedCount > 0 && (
            <button
              onClick={handleSyncAll}
              disabled={syncAllMutation.isPending}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 
                rounded-xl text-white text-sm transition-colors
                disabled:opacity-50"
            >
              {syncAllMutation.isPending ? 'Syncing All...' : `Sync All (${connectedCount})`}
            </button>
          )}
        </div>
        
        {/* 요약 카드 */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white/[0.03] rounded-xl p-4 border border-white/10">
            <div className="text-white/40 text-sm">Connected</div>
            <div className="text-2xl font-bold text-white">{connectedCount}</div>
          </div>
          <div className="bg-white/[0.03] rounded-xl p-4 border border-white/10">
            <div className="text-white/40 text-sm">Available</div>
            <div className="text-2xl font-bold text-white">{DATA_SOURCES.length}</div>
          </div>
          <div className="bg-white/[0.03] rounded-xl p-4 border border-white/10">
            <div className="text-white/40 text-sm">Nodes Affected</div>
            <div className="text-2xl font-bold text-white">
              {new Set(DATA_SOURCES.filter(d => statusMap[d.type]?.is_connected).flatMap(d => d.nodes)).size}
            </div>
          </div>
        </div>
        
        {/* 데이터 소스 그리드 */}
        <div className="grid grid-cols-2 gap-6">
          {DATA_SOURCES.map((config) => (
            <DataSourceCard
              key={config.type}
              config={config}
              status={statusMap[config.type]}
              onConnect={() => handleConnect(config.type)}
              onDisconnect={() => handleDisconnect(config.type)}
              onSync={() => handleSync(config.type)}
              isSyncing={syncingSource === config.type}
            />
          ))}
        </div>
        
        {/* 안내 */}
        <div className="mt-8 p-4 bg-white/[0.02] rounded-xl border border-white/5">
          <h4 className="text-white/60 text-sm font-medium mb-2">📌 How it works</h4>
          <ul className="text-white/40 text-sm space-y-1">
            <li>• Connect your tools to allow AUTUS to analyze your activity</li>
            <li>• Data is synced periodically to update your K/I indices</li>
            <li>• Each source contributes to specific nodes in your 48-node model</li>
            <li>• You can disconnect anytime - we don't store your raw data</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Export
// ═══════════════════════════════════════════════════════════════════════════════

export default IntegrationsPage;
export { useDataSourceStatus, useSyncSource, useSyncAll };
