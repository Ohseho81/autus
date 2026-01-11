/**
 * AUTUS Logs Page
 * =================
 * 내 로그 확인 - 72⁴ 이벤트 로그 뷰어
 */

import React, { useState, useMemo } from 'react';

// ============================================
// Types
// ============================================

interface LogEntry {
  id: string;
  timestamp: string;
  coordinate: string;  // n01.m37.w12.t45
  node: string;
  motion: string;
  work: string;
  time: string;
  value: number;
  source: 'manual' | 'auto' | 'api' | 'webhook';
  category: string;
  metadata?: Record<string, any>;
}

// ============================================
// Mock Data
// ============================================

const NODE_NAMES: Record<string, string> = {
  'n01': 'Cash (현금)',
  'n05': 'Revenue (수입)',
  'n06': 'Expense (지출)',
  'n09': 'Customers (고객)',
  'n17': 'GrowthRate (성장률)',
  'n18': 'ChurnRate (이탈률)',
  'n33': 'Satisfaction (만족도)',
  'n37': 'Momentum (모멘텀)',
  'n60': 'Risk (위험)',
  'n70': 'Dependency (의존도)',
  'n72': 'Potential (잠재력)',
};

const MOTION_NAMES: Record<string, string> = {
  'm01': 'Increase (증가)',
  'm02': 'Decrease (감소)',
  'm13': 'Transfer (이동)',
  'm25': 'Grow (성장)',
  'm33': 'Stabilize (안정)',
  'm37': 'Accelerate (가속)',
};

const generateMockLogs = (): LogEntry[] => {
  const logs: LogEntry[] = [];
  const now = new Date();
  
  const nodes = ['n01', 'n05', 'n06', 'n09', 'n37', 'n60'];
  const motions = ['m01', 'm02', 'm25', 'm33'];
  const sources: LogEntry['source'][] = ['manual', 'auto', 'api'];
  
  for (let i = 0; i < 100; i++) {
    const date = new Date(now);
    date.setMinutes(date.getMinutes() - i * 30);
    
    const node = nodes[Math.floor(Math.random() * nodes.length)];
    const motion = motions[Math.floor(Math.random() * motions.length)];
    
    logs.push({
      id: `log-${i}`,
      timestamp: date.toISOString(),
      coordinate: `${node}.${motion}.w01.t13`,
      node,
      motion,
      work: 'w01',
      time: 't13',
      value: Math.round(Math.random() * 10000000),
      source: sources[Math.floor(Math.random() * sources.length)],
      category: node.startsWith('n0') ? 'Financial' : 'Operational',
    });
  }
  
  return logs.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
};

const MOCK_LOGS = generateMockLogs();

// ============================================
// Components
// ============================================

const LogCard = ({ log }: { log: LogEntry }) => {
  const nodeName = NODE_NAMES[log.node] || log.node;
  const motionName = MOTION_NAMES[log.motion] || log.motion;
  const time = new Date(log.timestamp);
  
  const sourceConfig = {
    manual: { color: 'bg-blue-500', label: '수동' },
    auto: { color: 'bg-green-500', label: '자동' },
    api: { color: 'bg-purple-500', label: 'API' },
    webhook: { color: 'bg-yellow-500', label: 'Webhook' },
  };
  
  return (
    <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700 hover:border-slate-500 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${sourceConfig[log.source].color}`} />
          <span className="text-xs text-slate-400">{sourceConfig[log.source].label}</span>
          <span className="text-xs text-slate-500">•</span>
          <span className="text-xs text-slate-500">
            {time.toLocaleDateString('ko-KR')} {time.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <span className="text-xs font-mono bg-slate-700 px-2 py-1 rounded text-slate-300">
          {log.coordinate}
        </span>
      </div>
      
      <div className="flex items-center gap-3 mb-3">
        <span className="text-lg font-bold text-white">
          {log.value >= 1000000 
            ? `₩${(log.value / 1000000).toFixed(1)}M`
            : log.value >= 1000
              ? `₩${(log.value / 1000).toFixed(0)}K`
              : log.value
          }
        </span>
        <span className={`text-sm ${log.motion.includes('01') || log.motion.includes('25') ? 'text-green-400' : 'text-red-400'}`}>
          {log.motion.includes('01') || log.motion.includes('25') ? '↑' : '↓'}
        </span>
      </div>
      
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded">{nodeName}</span>
        <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded">{motionName}</span>
        <span className="px-2 py-1 bg-slate-600 text-slate-300 rounded">{log.category}</span>
      </div>
    </div>
  );
};

const LogTable = ({ logs }: { logs: LogEntry[] }) => {
  return (
    <div className="bg-slate-800/80 rounded-xl border border-slate-700 overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-700 bg-slate-700/50">
            <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">시간</th>
            <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">좌표</th>
            <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">노드</th>
            <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">변화</th>
            <th className="text-right py-3 px-4 text-slate-400 font-medium text-sm">값</th>
            <th className="text-center py-3 px-4 text-slate-400 font-medium text-sm">소스</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => {
            const time = new Date(log.timestamp);
            const sourceConfig = {
              manual: { color: 'bg-blue-500', label: '수동' },
              auto: { color: 'bg-green-500', label: '자동' },
              api: { color: 'bg-purple-500', label: 'API' },
              webhook: { color: 'bg-yellow-500', label: 'Webhook' },
            };
            
            return (
              <tr key={log.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                <td className="py-3 px-4 text-sm text-slate-400">
                  {time.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                </td>
                <td className="py-3 px-4">
                  <span className="font-mono text-xs bg-slate-700 px-2 py-0.5 rounded text-slate-300">
                    {log.coordinate}
                  </span>
                </td>
                <td className="py-3 px-4 text-sm text-white">
                  {NODE_NAMES[log.node] || log.node}
                </td>
                <td className="py-3 px-4 text-sm">
                  <span className={log.motion.includes('01') || log.motion.includes('25') ? 'text-green-400' : 'text-red-400'}>
                    {MOTION_NAMES[log.motion] || log.motion}
                  </span>
                </td>
                <td className="py-3 px-4 text-sm text-right text-white font-medium">
                  {log.value.toLocaleString()}
                </td>
                <td className="py-3 px-4 text-center">
                  <span className={`inline-flex w-2 h-2 rounded-full ${sourceConfig[log.source].color}`} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const LogStats = ({ logs }: { logs: LogEntry[] }) => {
  const stats = useMemo(() => {
    const nodeCount: Record<string, number> = {};
    const sourceCount: Record<string, number> = {};
    
    logs.forEach((log) => {
      nodeCount[log.node] = (nodeCount[log.node] || 0) + 1;
      sourceCount[log.source] = (sourceCount[log.source] || 0) + 1;
    });
    
    return { nodeCount, sourceCount, total: logs.length };
  }, [logs]);
  
  return (
    <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700">
      <h3 className="text-white font-medium mb-4">📊 로그 통계</h3>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-slate-700/50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-blue-400">{stats.total}</div>
          <div className="text-xs text-slate-400">총 로그</div>
        </div>
        <div className="bg-slate-700/50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-green-400">
            {Object.keys(stats.nodeCount).length}
          </div>
          <div className="text-xs text-slate-400">활성 노드</div>
        </div>
      </div>
      
      <div className="space-y-3">
        <div className="text-sm text-slate-400 font-medium">노드별</div>
        {Object.entries(stats.nodeCount)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([node, count]) => (
            <div key={node} className="flex items-center justify-between">
              <span className="text-sm text-slate-300">{NODE_NAMES[node] || node}</span>
              <div className="flex items-center gap-2">
                <div className="w-20 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500"
                    style={{ width: `${(count / stats.total) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-slate-400 w-8">{count}</span>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};

const Timeline = ({ logs }: { logs: LogEntry[] }) => {
  // 시간별 그룹화
  const grouped = useMemo(() => {
    const groups: Record<string, LogEntry[]> = {};
    
    logs.forEach((log) => {
      const date = new Date(log.timestamp).toLocaleDateString('ko-KR');
      if (!groups[date]) groups[date] = [];
      groups[date].push(log);
    });
    
    return Object.entries(groups).slice(0, 7);
  }, [logs]);
  
  return (
    <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700">
      <h3 className="text-white font-medium mb-4">📅 타임라인</h3>
      
      <div className="space-y-4">
        {grouped.map(([date, dayLogs]) => (
          <div key={date}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span className="text-sm font-medium text-white">{date}</span>
              <span className="text-xs text-slate-400">({dayLogs.length}건)</span>
            </div>
            <div className="ml-6 pl-4 border-l border-slate-700 space-y-1">
              {dayLogs.slice(0, 3).map((log) => (
                <div key={log.id} className="text-sm text-slate-400">
                  <span className="text-slate-300">{NODE_NAMES[log.node]?.split('(')[0] || log.node}</span>
                  <span className="mx-2">→</span>
                  <span className={log.motion.includes('01') ? 'text-green-400' : 'text-red-400'}>
                    {log.value.toLocaleString()}
                  </span>
                </div>
              ))}
              {dayLogs.length > 3 && (
                <div className="text-xs text-slate-500">+{dayLogs.length - 3}건 더</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================
// Main Component
// ============================================

export default function LogsPage() {
  const [logs] = useState<LogEntry[]>(MOCK_LOGS);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('table');
  const [filterNode, setFilterNode] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (filterNode !== 'all' && log.node !== filterNode) return false;
      if (filterSource !== 'all' && log.source !== filterSource) return false;
      if (searchTerm && !log.coordinate.includes(searchTerm)) return false;
      return true;
    });
  }, [logs, filterNode, filterSource, searchTerm]);
  
  const uniqueNodes = [...new Set(logs.map(l => l.node))];
  
  return (
    <div className="min-h-full bg-slate-900 text-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">📋 내 로그</h1>
          <p className="text-slate-400 mt-1">72⁴ 이벤트 로그를 확인하세요</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setViewMode(viewMode === 'card' ? 'table' : 'card')}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm"
          >
            {viewMode === 'card' ? '📊 테이블 뷰' : '🃏 카드 뷰'}
          </button>
          <button className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-sm">
            📥 내보내기
          </button>
        </div>
      </div>
      
      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <input
          type="text"
          placeholder="좌표 검색 (예: n01)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white w-64"
        />
        
        <select
          value={filterNode}
          onChange={(e) => setFilterNode(e.target.value)}
          className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
        >
          <option value="all">모든 노드</option>
          {uniqueNodes.map((node) => (
            <option key={node} value={node}>{NODE_NAMES[node] || node}</option>
          ))}
        </select>
        
        <select
          value={filterSource}
          onChange={(e) => setFilterSource(e.target.value)}
          className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-white"
        >
          <option value="all">모든 소스</option>
          <option value="manual">수동</option>
          <option value="auto">자동</option>
          <option value="api">API</option>
        </select>
        
        <span className="text-slate-400 text-sm ml-auto">
          {filteredLogs.length}건 표시
        </span>
      </div>
      
      {/* Main Grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Logs */}
        <div className="col-span-8">
          {viewMode === 'table' ? (
            <LogTable logs={filteredLogs.slice(0, 20)} />
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {filteredLogs.slice(0, 10).map((log) => (
                <LogCard key={log.id} log={log} />
              ))}
            </div>
          )}
          
          {filteredLogs.length > 20 && (
            <div className="text-center mt-4">
              <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm">
                더 보기 ({filteredLogs.length - 20}건)
              </button>
            </div>
          )}
        </div>
        
        {/* Sidebar */}
        <div className="col-span-4 space-y-6">
          <LogStats logs={logs} />
          <Timeline logs={logs} />
        </div>
      </div>
    </div>
  );
}
