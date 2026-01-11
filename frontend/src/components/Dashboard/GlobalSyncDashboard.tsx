/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🌍 AUTUS Global Sync Dashboard (글로벌 싱크 대시보드)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 80억 인류의 집단지성이 36개 노드로 수렴되는 과정을 실시간 모니터링
 *
 * "원기옥이 모이는 현장을 목격하라"
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Types
interface StrategicNode {
  id: string;
  field: string;
  type: 'archetype' | 'dynamics' | 'equilibrium';
  name: string;
  name_en: string;
  physics: string;
  value: number;
  energy: number;
  entropy: number;
  veteran_count: number;
  contributions: number;
  resonance: number;
}

interface GlobalResonance {
  global_resonance: number;
  by_field: Record<string, number>;
  by_physics: Record<string, number>;
  harmony_index: number;
}

interface InjectionEvent {
  id: string;
  timestamp: string;
  target_node: string;
  poc_score: number;
  resonance_delta: number;
  status: 'injected' | 'filtered' | 'failed';
}

interface DashboardStats {
  total_nodes: number;
  total_fields: number;
  physics_dimensions: number;
  value_avg: number;
  energy_avg: number;
  entropy_avg: number;
  veteran_contributions: number;
  total_contributions: number;
}

// Constants
const PHYSICS_COLORS: Record<string, string> = {
  BIO: '#10B981',          // 녹색 (생체)
  CAPITAL: '#F59E0B',      // 금색 (자본)
  COGNITION: '#8B5CF6',    // 보라 (인지)
  RELATION: '#EC4899',     // 분홍 (관계)
  ENVIRONMENT: '#06B6D4',  // 청록 (환경)
  LEGACY: '#6366F1',       // 남색 (유산)
};

const NODE_TYPE_LABELS: Record<string, string> = {
  archetype: '원형',
  dynamics: '동력',
  equilibrium: '평형',
};

// ═══════════════════════════════════════════════════════════════════════════════
// 메인 컴포넌트
// ═══════════════════════════════════════════════════════════════════════════════

interface GlobalSyncDashboardProps {
  refreshInterval?: number;
}

export const GlobalSyncDashboard: React.FC<GlobalSyncDashboardProps> = ({
  refreshInterval = 5000,
}) => {
  // State
  const [nodes, setNodes] = useState<StrategicNode[]>([]);
  const [resonance, setResonance] = useState<GlobalResonance | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentInjections, setRecentInjections] = useState<InjectionEvent[]>([]);
  const [selectedPhysics, setSelectedPhysics] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(true);

  // Mock data for demonstration
  useEffect(() => {
    const generateMockData = () => {
      // Generate 36 nodes
      const mockNodes: StrategicNode[] = [];
      const fields = ['HEALTH', 'FITNESS', 'INCOME', 'WEALTH', 'LEARNING', 'MASTERY',
                      'FAMILY', 'NETWORK', 'DWELLING', 'WORKPLACE', 'PURPOSE', 'IMPACT'];
      const physics = ['BIO', 'BIO', 'CAPITAL', 'CAPITAL', 'COGNITION', 'COGNITION',
                       'RELATION', 'RELATION', 'ENVIRONMENT', 'ENVIRONMENT', 'LEGACY', 'LEGACY'];
      const types: ('archetype' | 'dynamics' | 'equilibrium')[] = ['archetype', 'dynamics', 'equilibrium'];

      for (let i = 0; i < 36; i++) {
        const fieldIdx = Math.floor(i / 3);
        const typeIdx = i % 3;
        mockNodes.push({
          id: `n${String(i + 1).padStart(2, '0')}`,
          field: `F${String(fieldIdx + 1).padStart(2, '0')}_${fields[fieldIdx]}`,
          type: types[typeIdx],
          name: `노드 ${i + 1}`,
          name_en: `Node ${i + 1}`,
          physics: physics[fieldIdx],
          value: 0.3 + Math.random() * 0.5,
          energy: 0.5 + Math.random() * 0.5,
          entropy: 0.2 + Math.random() * 0.3,
          veteran_count: Math.floor(Math.random() * 50),
          contributions: Math.floor(Math.random() * 500),
          resonance: 0.4 + Math.random() * 0.5,
        });
      }
      setNodes(mockNodes);

      // Mock resonance
      setResonance({
        global_resonance: 0.65 + Math.random() * 0.2,
        by_field: Object.fromEntries(fields.map(f => [f, 0.5 + Math.random() * 0.4])),
        by_physics: Object.fromEntries(['BIO', 'CAPITAL', 'COGNITION', 'RELATION', 'ENVIRONMENT', 'LEGACY']
          .map(p => [p, 0.5 + Math.random() * 0.4])),
        harmony_index: 0.7 + Math.random() * 0.2,
      });

      // Mock stats
      setStats({
        total_nodes: 36,
        total_fields: 12,
        physics_dimensions: 6,
        value_avg: 0.55 + Math.random() * 0.1,
        energy_avg: 0.75 + Math.random() * 0.1,
        entropy_avg: 0.35 + Math.random() * 0.1,
        veteran_contributions: Math.floor(Math.random() * 1000) + 500,
        total_contributions: Math.floor(Math.random() * 10000) + 5000,
      });

      // Mock recent injections
      const newInjection: InjectionEvent = {
        id: `inj_${Date.now()}`,
        timestamp: new Date().toISOString(),
        target_node: mockNodes[Math.floor(Math.random() * 36)].id,
        poc_score: Math.random() * 0.5,
        resonance_delta: (Math.random() - 0.5) * 0.1,
        status: Math.random() > 0.1 ? 'injected' : Math.random() > 0.5 ? 'filtered' : 'failed',
      };
      setRecentInjections(prev => [newInjection, ...prev.slice(0, 9)]);
    };

    generateMockData();

    if (isLive) {
      const interval = setInterval(generateMockData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval, isLive]);

  // Filtered nodes
  const filteredNodes = useMemo(() => {
    if (!selectedPhysics) return nodes;
    return nodes.filter(n => n.physics === selectedPhysics);
  }, [nodes, selectedPhysics]);

  // Group nodes by physics
  const nodesByPhysics = useMemo(() => {
    const groups: Record<string, StrategicNode[]> = {};
    nodes.forEach(node => {
      if (!groups[node.physics]) {
        groups[node.physics] = [];
      }
      groups[node.physics].push(node);
    });
    return groups;
  }, [nodes]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-6">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-orange-500">
              🌍 AUTUS Global Sync Dashboard
            </h1>
            <p className="text-gray-400 mt-1">80억 인류의 집단지성 실시간 모니터링</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsLive(!isLive)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                isLive
                  ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                  : 'bg-gray-700 text-gray-400'
              }`}
            >
              {isLive ? '🟢 LIVE' : '⏸️ PAUSED'}
            </button>
          </div>
        </div>
      </header>

      {/* Stats Overview */}
      {stats && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8"
        >
          <StatCard
            label="전체 노드"
            value={stats.total_nodes}
            icon="🔢"
          />
          <StatCard
            label="베테랑 기여"
            value={stats.veteran_contributions}
            icon="👨‍🏫"
            trend={+12}
          />
          <StatCard
            label="총 기여"
            value={stats.total_contributions.toLocaleString()}
            icon="📊"
            trend={+156}
          />
          <StatCard
            label="평균 값"
            value={`${(stats.value_avg * 100).toFixed(1)}%`}
            icon="📈"
          />
          <StatCard
            label="평균 에너지"
            value={`${(stats.energy_avg * 100).toFixed(1)}%`}
            icon="⚡"
          />
          <StatCard
            label="평균 엔트로피"
            value={`${(stats.entropy_avg * 100).toFixed(1)}%`}
            icon="🌀"
          />
        </motion.div>
      )}

      {/* Global Resonance */}
      {resonance && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800/50 rounded-2xl p-6 mb-8 border border-gray-700"
        >
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            🌐 글로벌 공명 지수
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Main Resonance */}
            <div className="flex flex-col items-center justify-center">
              <div className="relative w-32 h-32">
                <svg className="w-full h-full -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-gray-700"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    fill="none"
                    stroke="url(#resonanceGradient)"
                    strokeWidth="8"
                    strokeDasharray={`${resonance.global_resonance * 352} 352`}
                    strokeLinecap="round"
                  />
                  <defs>
                    <linearGradient id="resonanceGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#F59E0B" />
                      <stop offset="100%" stopColor="#EF4444" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold">
                    {(resonance.global_resonance * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
              <p className="mt-2 text-gray-400">전체 공명률</p>
            </div>

            {/* Physics Resonance */}
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-3">물리 차원별</h3>
              <div className="space-y-2">
                {Object.entries(resonance.by_physics).map(([physics, value]) => (
                  <div key={physics} className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: PHYSICS_COLORS[physics] }}
                    />
                    <span className="text-sm flex-1">{physics}</span>
                    <div className="w-24 bg-gray-700 rounded-full h-2">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: PHYSICS_COLORS[physics] }}
                        initial={{ width: 0 }}
                        animate={{ width: `${value * 100}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-400 w-12 text-right">
                      {(value * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Harmony Index */}
            <div className="flex flex-col items-center justify-center">
              <div className="text-5xl mb-2">
                {resonance.harmony_index > 0.8 ? '🎵' : resonance.harmony_index > 0.6 ? '🎶' : '🔊'}
              </div>
              <div className="text-3xl font-bold text-yellow-400">
                {(resonance.harmony_index * 100).toFixed(1)}%
              </div>
              <p className="text-gray-400">조화 지수</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Physics Filter */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedPhysics(null)}
          className={`px-4 py-2 rounded-lg whitespace-nowrap transition-all ${
            selectedPhysics === null
              ? 'bg-white text-gray-900 font-medium'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          전체
        </button>
        {Object.keys(PHYSICS_COLORS).map(physics => (
          <button
            key={physics}
            onClick={() => setSelectedPhysics(physics)}
            className={`px-4 py-2 rounded-lg whitespace-nowrap transition-all flex items-center gap-2 ${
              selectedPhysics === physics
                ? 'font-medium'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
            style={selectedPhysics === physics ? {
              backgroundColor: PHYSICS_COLORS[physics] + '30',
              color: PHYSICS_COLORS[physics],
              borderColor: PHYSICS_COLORS[physics],
            } : {}}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: PHYSICS_COLORS[physics] }}
            />
            {physics}
          </button>
        ))}
      </div>

      {/* Node Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
        <AnimatePresence mode="popLayout">
          {filteredNodes.map(node => (
            <NodeCard key={node.id} node={node} />
          ))}
        </AnimatePresence>
      </div>

      {/* Recent Injections */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700"
      >
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          🚀 실시간 주입 피드
        </h2>
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {recentInjections.map(injection => (
              <InjectionFeedItem key={injection.id} injection={injection} />
            ))}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 서브 컴포넌트
// ═══════════════════════════════════════════════════════════════════════════════

interface StatCardProps {
  label: string;
  value: string | number;
  icon: string;
  trend?: number;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon, trend }) => (
  <motion.div
    whileHover={{ scale: 1.02 }}
    className="bg-gray-800/50 rounded-xl p-4 border border-gray-700"
  >
    <div className="flex items-center justify-between mb-2">
      <span className="text-2xl">{icon}</span>
      {trend !== undefined && (
        <span className={`text-xs ${trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
          {trend > 0 ? '+' : ''}{trend}
        </span>
      )}
    </div>
    <div className="text-2xl font-bold">{value}</div>
    <div className="text-sm text-gray-400">{label}</div>
  </motion.div>
);

interface NodeCardProps {
  node: StrategicNode;
}

const NodeCard: React.FC<NodeCardProps> = ({ node }) => {
  const color = PHYSICS_COLORS[node.physics] || '#6B7280';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ scale: 1.05 }}
      className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 cursor-pointer transition-all hover:border-opacity-100"
      style={{ borderColor: color + '50' }}
    >
      <div className="flex items-center justify-between mb-2">
        <span
          className="text-xs px-2 py-0.5 rounded-full"
          style={{ backgroundColor: color + '30', color }}
        >
          {node.id}
        </span>
        <span className="text-xs text-gray-500">{NODE_TYPE_LABELS[node.type]}</span>
      </div>
      <h3 className="font-medium mb-2 truncate">{node.name}</h3>
      
      {/* Value Bar */}
      <div className="mb-2">
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>값</span>
          <span>{(node.value * 100).toFixed(0)}%</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-1.5">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: color }}
            initial={{ width: 0 }}
            animate={{ width: `${node.value * 100}%` }}
          />
        </div>
      </div>

      {/* Resonance */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-400">공명</span>
        <span style={{ color }}>
          {(node.resonance * 100).toFixed(0)}%
        </span>
      </div>

      {/* Contributions */}
      <div className="mt-2 pt-2 border-t border-gray-700 flex justify-between text-xs text-gray-500">
        <span>👨‍🏫 {node.veteran_count}</span>
        <span>📊 {node.contributions}</span>
      </div>
    </motion.div>
  );
};

interface InjectionFeedItemProps {
  injection: InjectionEvent;
}

const InjectionFeedItem: React.FC<InjectionFeedItemProps> = ({ injection }) => {
  const statusConfig = {
    injected: { color: 'text-green-400', bg: 'bg-green-400/10', icon: '✅' },
    filtered: { color: 'text-yellow-400', bg: 'bg-yellow-400/10', icon: '🔶' },
    failed: { color: 'text-red-400', bg: 'bg-red-400/10', icon: '❌' },
  };

  const config = statusConfig[injection.status];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className={`flex items-center justify-between p-3 rounded-lg ${config.bg}`}
    >
      <div className="flex items-center gap-3">
        <span>{config.icon}</span>
        <div>
          <span className="font-medium">{injection.target_node}</span>
          <span className="text-gray-400 text-sm ml-2">
            {new Date(injection.timestamp).toLocaleTimeString()}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-4 text-sm">
        <span className="text-gray-400">
          PoC: <span className="text-white">{injection.poc_score.toFixed(3)}</span>
        </span>
        <span className={injection.resonance_delta > 0 ? 'text-green-400' : 'text-red-400'}>
          {injection.resonance_delta > 0 ? '+' : ''}{(injection.resonance_delta * 100).toFixed(2)}%
        </span>
      </div>
    </motion.div>
  );
};

export default GlobalSyncDashboard;
