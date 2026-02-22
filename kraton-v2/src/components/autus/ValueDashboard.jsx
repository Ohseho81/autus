/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🏛️ AUTUS v1.0 - Value Dashboard
 * 
 * V = P × Λ × e^(σt)
 * "META가 연결을 팔았다면, AUTUS는 시간을 증식한다"
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVEngine, useAutusNodes } from '../../hooks/useSupabaseData';

// ═══════════════════════════════════════════════════════════════════════════
// Mock Data
// ═══════════════════════════════════════════════════════════════════════════

const MOCK_DATA = {
  overview: {
    total_value_stu: 2847.52,
    total_value_krw: 78806760,
    node_count: 11,
    relation_count: 7,
    omega: 27674,
  },
  averages: {
    lambda: 1.76,
    sigma: 0.143,
    density: 0.536,
  },
  top_nodes: [
    { node_id: 'owner-1', name: '김원장', role: 'owner', lambda: 5.0, total_value_stu: 456.32, relation_count: 2 },
    { node_id: 'teacher-3', name: '최강사', role: 'senior_teacher', lambda: 3.0, total_value_stu: 412.18, relation_count: 1 },
    { node_id: 'teacher-1', name: '박강사', role: 'teacher', lambda: 2.0, total_value_stu: 387.45, relation_count: 3 },
    { node_id: 'teacher-2', name: '이강사', role: 'teacher', lambda: 2.0, total_value_stu: 298.67, relation_count: 2 },
    { node_id: 'student-5', name: '학생E', role: 'student', lambda: 1.0, total_value_stu: 234.89, relation_count: 1 },
  ],
  top_relations: [
    { node_a_name: '최강사', node_b_name: '학생E', value_stu: 469.78, value_krw: 13001234, components: { sigma: 0.30, density: 0.80, synergy_multiplier: 4.12 } },
    { node_a_name: '박강사', node_b_name: '학생A', value_stu: 398.45, value_krw: 11025678, components: { sigma: 0.25, density: 0.72, synergy_multiplier: 3.32 } },
    { node_a_name: '이강사', node_b_name: '학생D', value_stu: 356.23, value_krw: 9856789, components: { sigma: 0.20, density: 0.65, synergy_multiplier: 2.89 } },
    { node_a_name: '박강사', node_b_name: '학생B', value_stu: 287.34, value_krw: 7950123, components: { sigma: 0.15, density: 0.55, synergy_multiplier: 1.82 } },
    { node_a_name: '김원장', node_b_name: '학부모A', value_stu: 198.67, value_krw: 5498765, components: { sigma: 0.30, density: 0.35, synergy_multiplier: 4.12 } },
  ],
  risk_relations: [
    { node_a_name: '이강사', node_b_name: '학생C', value_stu: 89.45, value_krw: 2475123, components: { sigma: -0.10, density: 0.40, synergy_multiplier: 0.55 } },
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// Components
// ═══════════════════════════════════════════════════════════════════════════

const COLORS = {
  emerald: '#10B981',
  purple: '#8B5CF6',
  cyan: '#06B6D4',
  red: '#EF4444',
  amber: '#F59E0B',
  gray: '#6B7280',
};

function formatNumber(num, decimals = 0) {
  if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
  if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
  if (num >= 1e4) return (num / 1e4).toFixed(1) + '만';
  return num.toLocaleString(undefined, { maximumFractionDigits: decimals });
}

function MetricCard({ label, value, subValue, icon, color = COLORS.emerald, trend }) {
  return (
    <motion.div
      className="bg-gray-800/50 rounded-xl border border-gray-700 p-5"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-2xl">{icon}</span>
        {trend && (
          <span className={`text-xs px-2 py-1 rounded ${trend > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      <p className="text-gray-400 text-sm mb-1">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
      {subValue && <p className="text-sm mt-1" style={{ color }}>{subValue}</p>}
    </motion.div>
  );
}

function SigmaBar({ sigma }) {
  const width = Math.abs(sigma) * 100;
  const isPositive = sigma >= 0;
  
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-2 bg-gray-700 rounded-full overflow-hidden flex">
        {!isPositive && (
          <div
            className="h-full bg-red-500 ml-auto"
            style={{ width: `${width}%` }}
          />
        )}
        {isPositive && (
          <div
            className="h-full bg-emerald-500"
            style={{ width: `${width}%` }}
          />
        )}
      </div>
      <span className={`text-xs font-mono ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
        {isPositive ? '+' : ''}{sigma.toFixed(2)}
      </span>
    </div>
  );
}

function NodeRank({ nodes }) {
  return (
    <div className="space-y-3">
      {nodes.map((node, i) => (
        <motion.div
          key={node.node_id}
          className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1 }}
        >
          <div className="flex items-center gap-3">
            <span className="text-gray-500 font-mono w-6 text-right">{i + 1}</span>
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg" style={{
              background: node.role === 'owner' ? 'linear-gradient(135deg, #FFD700, #FFA500)' :
                         node.role === 'senior_teacher' ? 'linear-gradient(135deg, #8B5CF6, #6366F1)' :
                         node.role === 'teacher' ? 'linear-gradient(135deg, #10B981, #059669)' :
                         'linear-gradient(135deg, #6B7280, #4B5563)'
            }}>
              {node.name.charAt(0)}
            </div>
            <div>
              <p className="text-white font-medium">{node.name}</p>
              <p className="text-gray-500 text-xs">λ = {node.lambda} · {node.relation_count} relations</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-emerald-400 font-mono font-bold">{node.total_value_stu.toFixed(1)}</p>
            <p className="text-gray-500 text-xs">STU</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function RelationList({ relations, type = 'top' }) {
  const isRisk = type === 'risk';
  
  return (
    <div className="space-y-3">
      {relations.map((rel, i) => (
        <motion.div
          key={`${rel.node_a_name}-${rel.node_b_name}`}
          className={`p-4 rounded-lg border ${isRisk ? 'bg-red-900/20 border-red-500/30' : 'bg-gray-800/30 border-gray-700'}`}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1 }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-white font-medium">{rel.node_a_name}</span>
              <span className="text-gray-500">↔</span>
              <span className="text-white font-medium">{rel.node_b_name}</span>
            </div>
            <span className={`font-mono font-bold ${isRisk ? 'text-red-400' : 'text-emerald-400'}`}>
              {rel.value_stu.toFixed(1)} STU
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span>P = {rel.components.density.toFixed(2)}</span>
            <SigmaBar sigma={rel.components.sigma} />
            <span>×{rel.components.synergy_multiplier.toFixed(2)}</span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function FormulaDisplay() {
  return (
    <motion.div
      className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl border border-gray-700 p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <h3 className="text-white font-bold mb-4">AUTUS 마스터 방정식</h3>
      <div className="flex flex-wrap items-center gap-6 text-center">
        <div className="flex-1 min-w-[200px]">
          <p className="text-3xl font-mono text-emerald-400 mb-2">V = P × Λ × e^(σt)</p>
          <p className="text-gray-500 text-sm">Full Version</p>
        </div>
        <div className="w-px h-16 bg-gray-700 hidden md:block" />
        <div className="flex-1 min-w-[200px]">
          <p className="text-2xl font-mono text-cyan-400 mb-2">V = λ × T × P</p>
          <p className="text-gray-500 text-sm">MVP Version</p>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 text-sm">
        <div className="bg-gray-800/50 rounded-lg p-3">
          <p className="text-purple-400 font-mono">λ</p>
          <p className="text-white">노드 시간상수</p>
          <p className="text-gray-500 text-xs">0.5 ~ 10.0</p>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-3">
          <p className="text-emerald-400 font-mono">σ</p>
          <p className="text-white">시너지 계수</p>
          <p className="text-gray-500 text-xs">-1.0 ~ +1.0</p>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-3">
          <p className="text-cyan-400 font-mono">P</p>
          <p className="text-white">관계 밀도</p>
          <p className="text-gray-500 text-xs">0 ~ 1</p>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-3">
          <p className="text-amber-400 font-mono">ω</p>
          <p className="text-white">시간 단가</p>
          <p className="text-gray-500 text-xs">₩/STU</p>
        </div>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Dashboard
// ═══════════════════════════════════════════════════════════════════════════

export default function ValueDashboard({ orgId = 'demo' }) {
  const [activeTab, setActiveTab] = useState('overview');

  // Supabase hooks
  const { data: vEngineData, loading: vLoading, isLive: vLive } = useVEngine();
  const { nodes: liveNodes, relationships: liveRelationships, loading: nodesLoading, isLive: nodesLive } = useAutusNodes();

  const isLoading = vLoading || nodesLoading;
  const isLive = vLive || nodesLive;

  // Build data from Supabase or fallback to MOCK_DATA
  const data = useMemo(() => {
    const hasVEngine = vEngineData && vEngineData.total_value !== undefined;
    const hasNodes = liveNodes && liveNodes.length > 0;
    const hasRelations = liveRelationships && liveRelationships.length > 0;

    return {
      overview: hasVEngine ? {
        total_value_stu: (vEngineData.total_value || 0) / 27674,
        total_value_krw: vEngineData.total_value || 0,
        node_count: hasNodes ? liveNodes.length : MOCK_DATA.overview.node_count,
        relation_count: hasRelations ? liveRelationships.length : MOCK_DATA.overview.relation_count,
        omega: 27674,
      } : MOCK_DATA.overview,
      averages: hasNodes ? {
        lambda: liveNodes.reduce((sum, n) => sum + (n.lambda || 0), 0) / (liveNodes.length || 1),
        sigma: hasRelations
          ? liveRelationships.reduce((sum, r) => sum + (r.sigma || 0), 0) / (liveRelationships.length || 1)
          : MOCK_DATA.averages.sigma,
        density: hasRelations
          ? liveRelationships.reduce((sum, r) => sum + (r.density || 0), 0) / (liveRelationships.length || 1)
          : MOCK_DATA.averages.density,
      } : MOCK_DATA.averages,
      top_nodes: hasNodes
        ? liveNodes
            .sort((a, b) => (b.total_value_stu || 0) - (a.total_value_stu || 0))
            .slice(0, 5)
            .map(n => ({
              node_id: n.id || n.node_id,
              name: n.name || 'Unknown',
              role: n.role || 'student',
              lambda: n.lambda || 1.0,
              total_value_stu: n.total_value_stu || 0,
              relation_count: n.relation_count || 0,
            }))
        : MOCK_DATA.top_nodes,
      top_relations: hasRelations
        ? liveRelationships
            .filter(r => (r.sigma || 0) >= 0)
            .sort((a, b) => (b.value_stu || 0) - (a.value_stu || 0))
            .slice(0, 5)
            .map(r => ({
              node_a_name: r.node_a_name || 'Node A',
              node_b_name: r.node_b_name || 'Node B',
              value_stu: r.value_stu || 0,
              value_krw: r.value_krw || 0,
              components: {
                sigma: r.sigma || 0,
                density: r.density || 0,
                synergy_multiplier: r.synergy_multiplier || 1.0,
              },
            }))
        : MOCK_DATA.top_relations,
      risk_relations: hasRelations
        ? liveRelationships
            .filter(r => (r.sigma || 0) < 0)
            .sort((a, b) => (a.sigma || 0) - (b.sigma || 0))
            .slice(0, 5)
            .map(r => ({
              node_a_name: r.node_a_name || 'Node A',
              node_b_name: r.node_b_name || 'Node B',
              value_stu: r.value_stu || 0,
              value_krw: r.value_krw || 0,
              components: {
                sigma: r.sigma || 0,
                density: r.density || 0,
                synergy_multiplier: r.synergy_multiplier || 1.0,
              },
            }))
        : MOCK_DATA.risk_relations,
    };
  }, [vEngineData, liveNodes, liveRelationships]);
  
  const tabs = [
    { id: 'overview', label: '개요', icon: '📊' },
    { id: 'nodes', label: '노드 λ', icon: '👤' },
    { id: 'relations', label: '관계 σ', icon: '🔗' },
    { id: 'formula', label: '수식', icon: '📐' },
  ];
  
  if (isLoading && !vEngineData && (!liveNodes || liveNodes.length === 0)) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <motion.span
            className="text-6xl block mb-4"
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            🏛️
          </motion.span>
          <p className="text-gray-500">Loading AUTUS...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-950 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            🏛️ AUTUS Value
            {isLive && <span className="text-xs font-normal bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded-full">🟢 LIVE</span>}
          </h1>
          <p className="text-gray-500 mt-1 font-mono text-sm">
            V = P × Λ × e^(σt)
          </p>
        </div>
        <div className="text-right">
          <p className="text-gray-500 text-sm">시간 단가</p>
          <p className="text-amber-400 font-mono text-lg">ω = ₩{formatNumber(data.overview.omega)}/STU</p>
        </div>
      </div>
      
      {/* Total Value Banner */}
      <motion.div
        className="bg-gradient-to-br from-emerald-900/30 to-cyan-900/30 rounded-2xl border border-emerald-500/30 p-8 mb-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-gray-400 text-sm mb-1">Total Relationship Value</p>
            <div className="flex items-baseline gap-3">
              <span className="text-5xl font-black text-white">
                {formatNumber(data.overview.total_value_stu, 1)}
              </span>
              <span className="text-2xl text-gray-400">STU</span>
            </div>
            <p className="text-emerald-400 text-xl mt-2">
              ₩{formatNumber(data.overview.total_value_krw)}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="bg-gray-800/50 rounded-lg px-6 py-3">
              <p className="text-2xl font-bold text-white">{data.overview.node_count}</p>
              <p className="text-gray-500 text-sm">Nodes</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg px-6 py-3">
              <p className="text-2xl font-bold text-white">{data.overview.relation_count}</p>
              <p className="text-gray-500 text-sm">Relations</p>
            </div>
          </div>
        </div>
      </motion.div>
      
      {/* Averages */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <MetricCard
          icon="λ"
          label="평균 Lambda"
          value={data.averages.lambda.toFixed(2)}
          subValue="노드 시간상수"
          color={COLORS.purple}
        />
        <MetricCard
          icon="σ"
          label="평균 Sigma"
          value={data.averages.sigma > 0 ? `+${data.averages.sigma.toFixed(3)}` : data.averages.sigma.toFixed(3)}
          subValue={data.averages.sigma > 0 ? '양의 시너지' : data.averages.sigma < 0 ? '음의 시너지' : '중립'}
          color={data.averages.sigma > 0 ? COLORS.emerald : data.averages.sigma < 0 ? COLORS.red : COLORS.gray}
        />
        <MetricCard
          icon="P"
          label="평균 Density"
          value={`${(data.averages.density * 100).toFixed(1)}%`}
          subValue="관계 밀도"
          color={COLORS.cyan}
        />
      </div>
      
      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-gray-800/50 text-gray-400 border border-transparent hover:bg-gray-700/50'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
      
      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="grid lg:grid-cols-2 gap-6"
          >
            {/* Top Nodes */}
            <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                🏆 Top Value Nodes
              </h3>
              <NodeRank nodes={data.top_nodes} />
            </div>
            
            {/* Top Relations */}
            <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                🔗 Top Value Relations
              </h3>
              <RelationList relations={data.top_relations} type="top" />
            </div>
          </motion.div>
        )}
        
        {activeTab === 'nodes' && (
          <motion.div
            key="nodes"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6 mb-6">
              <h3 className="text-white font-bold mb-2">λ (Lambda) - 노드 시간상수</h3>
              <p className="text-gray-400 text-sm mb-4">λ = λ_base × (1/R) × I × E × N</p>
              <div className="grid md:grid-cols-4 gap-4 text-sm">
                <div className="bg-gray-700/50 rounded-lg p-3">
                  <p className="text-purple-400">R</p>
                  <p className="text-white">대체 가능성</p>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-3">
                  <p className="text-purple-400">I</p>
                  <p className="text-white">영향력</p>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-3">
                  <p className="text-purple-400">E</p>
                  <p className="text-white">전문성</p>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-3">
                  <p className="text-purple-400">N</p>
                  <p className="text-white">네트워크 위치</p>
                </div>
              </div>
            </div>
            <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
              <h3 className="text-white font-bold mb-4">전체 노드 λ 순위</h3>
              <NodeRank nodes={data.top_nodes} />
            </div>
          </motion.div>
        )}
        
        {activeTab === 'relations' && (
          <motion.div
            key="relations"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
            <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
              <h3 className="text-white font-bold mb-2">σ (Sigma) - 시너지 계수</h3>
              <p className="text-gray-400 text-sm mb-4">σ = w₁C + w₂G + w₃V + w₄R</p>
              <div className="grid md:grid-cols-4 gap-4 text-sm mb-6">
                <div className="bg-gray-700/50 rounded-lg p-3">
                  <p className="text-emerald-400">C (0.3)</p>
                  <p className="text-white">스타일 호환</p>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-3">
                  <p className="text-emerald-400">G (0.3)</p>
                  <p className="text-white">목표 일치</p>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-3">
                  <p className="text-emerald-400">V (0.2)</p>
                  <p className="text-white">가치관 일치</p>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-3">
                  <p className="text-emerald-400">R (0.2)</p>
                  <p className="text-white">리듬 동기화</p>
                </div>
              </div>
              <div className="grid md:grid-cols-5 gap-2 text-center text-xs">
                <div className="bg-emerald-500/20 text-emerald-400 rounded p-2">σ ≥ 0.2<br/>탁월한 매칭</div>
                <div className="bg-emerald-500/10 text-emerald-400/80 rounded p-2">σ ≥ 0.1<br/>좋은 매칭</div>
                <div className="bg-gray-700/50 text-gray-400 rounded p-2">σ ≈ 0<br/>중립</div>
                <div className="bg-red-500/10 text-red-400/80 rounded p-2">σ ≤ -0.1<br/>나쁜 매칭</div>
                <div className="bg-red-500/20 text-red-400 rounded p-2">σ ≤ -0.2<br/>독성 관계</div>
              </div>
            </div>
            
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6">
                <h3 className="text-emerald-400 font-bold mb-4 flex items-center gap-2">
                  ✨ Top Synergy Relations
                </h3>
                <RelationList relations={data.top_relations} type="top" />
              </div>
              
              {data.risk_relations.length > 0 && (
                <div className="bg-red-900/20 rounded-xl border border-red-500/30 p-6">
                  <h3 className="text-red-400 font-bold mb-4 flex items-center gap-2">
                    ⚠️ Risk Relations (σ {'<'} 0)
                  </h3>
                  <RelationList relations={data.risk_relations} type="risk" />
                </div>
              )}
            </div>
          </motion.div>
        )}
        
        {activeTab === 'formula' && (
          <motion.div
            key="formula"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            <FormulaDisplay />
            
            {/* σ Effect Table */}
            <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-6 mt-6">
              <h3 className="text-white font-bold mb-4">σ 시너지 효과 (12개월 기준)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-gray-400 border-b border-gray-700">
                      <th className="text-left p-3">σ</th>
                      <th className="text-left p-3">12개월 배율</th>
                      <th className="text-left p-3">해석</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-800"><td className="p-3 text-emerald-400">+0.3</td><td className="p-3">×36.6</td><td className="p-3 text-emerald-400">탁월한 매칭</td></tr>
                    <tr className="border-b border-gray-800"><td className="p-3 text-emerald-400">+0.2</td><td className="p-3">×11.0</td><td className="p-3 text-emerald-400">좋은 매칭</td></tr>
                    <tr className="border-b border-gray-800"><td className="p-3 text-emerald-400">+0.1</td><td className="p-3">×3.3</td><td className="p-3 text-emerald-400">보통 매칭</td></tr>
                    <tr className="border-b border-gray-800"><td className="p-3 text-gray-400">0</td><td className="p-3">×1.0</td><td className="p-3 text-gray-400">중립</td></tr>
                    <tr className="border-b border-gray-800"><td className="p-3 text-red-400">-0.1</td><td className="p-3">×0.3</td><td className="p-3 text-red-400">나쁜 매칭</td></tr>
                    <tr><td className="p-3 text-red-400">-0.2</td><td className="p-3">×0.09</td><td className="p-3 text-red-400">독성 관계</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Axioms */}
            <div className="bg-gradient-to-br from-purple-900/20 to-cyan-900/20 rounded-xl border border-purple-500/30 p-6 mt-6">
              <h3 className="text-white font-bold mb-4">AUTUS 3대 공리</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">📜</span>
                  <div>
                    <p className="text-purple-400 font-bold">제1공리: 가치의 본질</p>
                    <p className="text-gray-300">모든 가치는 시간이다 (All Value is Time)</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-2xl">⏱️</span>
                  <div>
                    <p className="text-cyan-400 font-bold">제2공리: 시간의 상대성</p>
                    <p className="text-gray-300">동일한 시간도 노드마다 가치가 다르다 (t_STU = t_real × λ)</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="text-2xl">🚀</span>
                  <div>
                    <p className="text-emerald-400 font-bold">제3공리: 시너지의 지수성</p>
                    <p className="text-gray-300">관계의 시너지는 시간에 지수로 작용한다 (V ∝ e^(σt))</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Footer */}
      <div className="mt-8 text-center">
        <p className="text-gray-600 text-sm font-mono">
          "META가 연결을 팔았다면, AUTUS는 시간을 증식한다" — Build on the Rock. 🏛️
        </p>
      </div>
    </div>
  );
}
