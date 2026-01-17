// ═══════════════════════════════════════════════════════════════════════════════
// AUTUS v4.0 - Galaxy Dashboard (Glassmorphism Bento Grid)
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGalaxyStore } from './useGalaxyStore';
import { GALAXY_CLUSTERS } from './constants';
import type { TaskNode, GalaxyCluster } from './types';

// 글래스 카드 컴포넌트
interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

function GlassCard({ children, className = '', delay = 0 }: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={`
        backdrop-blur-lg bg-white/5 
        border border-white/10 
        rounded-2xl p-4
        shadow-2xl shadow-black/20
        ${className}
      `}
    >
      {children}
    </motion.div>
  );
}

// 메트릭 게이지
interface MetricGaugeProps {
  label: string;
  value: number;
  max: number;
  color: string;
  format?: (v: number) => string;
}

function MetricGauge({ label, value, max, color, format }: MetricGaugeProps) {
  const percentage = Math.min(100, (value / max) * 100);
  const displayValue = format ? format(value) : value.toFixed(2);
  
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-white/60">{label}</span>
        <span className="font-mono" style={{ color }}>{displayValue}</span>
      </div>
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
    </div>
  );
}

// 시스템 상태 카드
function SystemStatusCard() {
  const { systemState } = useGalaxyStore();
  
  return (
    <GlassCard className="col-span-2" delay={0}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white/80 font-semibold flex items-center gap-2">
          <span className="text-2xl">🏛️</span>
          시스템 상태
        </h3>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-green-400">실행 중</span>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center p-3 bg-white/5 rounded-xl">
          <div className="text-3xl font-bold text-amber-400 font-mono">
            {systemState.totalNodes}
          </div>
          <div className="text-xs text-white/50 mt-1">총 노드</div>
        </div>
        <div className="text-center p-3 bg-white/5 rounded-xl">
          <div className="text-3xl font-bold text-green-400 font-mono">
            {systemState.activeNodes}
          </div>
          <div className="text-xs text-white/50 mt-1">활성 노드</div>
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-white/10">
        <div className="flex justify-between text-xs text-white/50">
          <span>마지막 업데이트</span>
          <span className="font-mono">{new Date().toLocaleTimeString('ko-KR')}</span>
        </div>
      </div>
    </GlassCard>
  );
}

// K·I·Ω·r 메트릭 카드
function MetricsCard() {
  const { systemState } = useGalaxyStore();
  
  return (
    <GlassCard delay={0.1}>
      <h3 className="text-white/80 font-semibold mb-4 flex items-center gap-2">
        <span className="text-xl">📊</span>
        K·I·Ω·r 메트릭
      </h3>
      
      <MetricGauge
        label="K (효율성)"
        value={systemState.avgK}
        max={3}
        color="#FFD700"
      />
      <MetricGauge
        label="I (상호작용)"
        value={(systemState.avgI + 1) / 2}
        max={1}
        color="#00AAFF"
        format={(v) => ((v * 2) - 1).toFixed(2)}
      />
      <MetricGauge
        label="Ω (엔트로피)"
        value={systemState.avgOmega}
        max={1}
        color="#FF6B35"
      />
      <MetricGauge
        label="r (성장률)"
        value={Math.abs(systemState.avgR)}
        max={0.5}
        color="#10B981"
        format={(v) => `${systemState.avgR >= 0 ? '+' : '-'}${v.toFixed(2)}`}
      />
    </GlassCard>
  );
}

// User Node 카드
function UserNodeCard() {
  const { systemState } = useGalaxyStore();
  const { userNode } = systemState;
  
  const tierColors = {
    1: '#FFD700',
    12: '#00AAFF',
    144: '#10B981',
  };
  
  return (
    <GlassCard delay={0.2}>
      <h3 className="text-white/80 font-semibold mb-4 flex items-center gap-2">
        <span className="text-xl">👑</span>
        User Node
      </h3>
      
      <div className="text-center mb-4">
        <div 
          className="inline-block px-4 py-2 rounded-full font-bold"
          style={{ 
            backgroundColor: `${tierColors[userNode.hierarchyLevel]}20`,
            color: tierColors[userNode.hierarchyLevel],
            border: `1px solid ${tierColors[userNode.hierarchyLevel]}40`,
          }}
        >
          Tier {userNode.hierarchyLevel} · {userNode.tierName}
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-white/50">K 값</span>
          <span className="font-mono text-amber-400">{userNode.kValue.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-white/50">중력 점수</span>
          <span className="font-mono text-blue-400">{userNode.gravityScore.toFixed(2)}</span>
        </div>
      </div>
    </GlassCard>
  );
}

// 클러스터 리스트
function ClusterListCard() {
  const { clusters, hoveredCluster, setHoveredCluster } = useGalaxyStore();
  
  return (
    <GlassCard className="col-span-2" delay={0.3}>
      <h3 className="text-white/80 font-semibold mb-4 flex items-center gap-2">
        <span className="text-xl">🌌</span>
        8개 Galaxy Cluster
      </h3>
      
      <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto">
        {clusters.map((cluster) => (
          <motion.div
            key={cluster.id}
            whileHover={{ scale: 1.02 }}
            onHoverStart={() => setHoveredCluster(cluster.id)}
            onHoverEnd={() => setHoveredCluster(null)}
            className={`
              p-3 rounded-xl cursor-pointer transition-all
              ${hoveredCluster === cluster.id 
                ? 'bg-white/10' 
                : 'bg-white/5 hover:bg-white/8'}
            `}
            style={{
              borderLeft: `3px solid ${cluster.color}`,
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-white/80">
                {cluster.nameKo}
              </span>
              <span 
                className="text-xs font-mono px-2 py-0.5 rounded"
                style={{ 
                  backgroundColor: `${cluster.color}20`,
                  color: cluster.color,
                }}
              >
                {cluster.activeNodes}/{cluster.totalNodes}
              </span>
            </div>
            <div className="flex gap-2 mt-1 text-xs text-white/40">
              <span>K={cluster.avgK.toFixed(1)}</span>
              <span>I={cluster.avgI.toFixed(1)}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </GlassCard>
  );
}

// 소멸 대기열 카드
function ExtinctionQueueCard() {
  const { systemState, nodes, triggerExtinction } = useGalaxyStore();
  
  // 소멸 후보 (K < 0.5 또는 Ω > 0.8)
  const extinctionCandidates = nodes
    .filter(n => n.kEfficiency < 0.5 || n.omegaEntropy > 0.8)
    .slice(0, 5);
  
  return (
    <GlassCard delay={0.4}>
      <h3 className="text-white/80 font-semibold mb-4 flex items-center gap-2">
        <span className="text-xl">🗑️</span>
        자연 소멸 대기
        <span className="ml-auto text-xs px-2 py-0.5 rounded bg-red-500/20 text-red-400">
          {systemState.pendingExtinction}
        </span>
      </h3>
      
      <div className="space-y-2 max-h-[150px] overflow-y-auto">
        {extinctionCandidates.map((node) => (
          <motion.div
            key={node.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="flex items-center gap-2 p-2 bg-red-500/10 rounded-lg border border-red-500/20"
          >
            <div className="flex-1 min-w-0">
              <div className="text-sm text-white/80 truncate">{node.name}</div>
              <div className="text-xs text-white/40">
                K={node.kEfficiency.toFixed(2)} | Ω={node.omegaEntropy.toFixed(2)}
              </div>
            </div>
            <button
              onClick={() => triggerExtinction(node.id)}
              className="text-xs px-2 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded transition-colors"
            >
              삭제
            </button>
          </motion.div>
        ))}
        
        {extinctionCandidates.length === 0 && (
          <div className="text-center text-white/40 text-sm py-4">
            소멸 대상 없음 ✨
          </div>
        )}
      </div>
    </GlassCard>
  );
}

// 컨트롤 패널
function ControlPanel() {
  const { 
    isPaused, 
    togglePause, 
    showConnections, 
    toggleConnections,
    showLabels,
    toggleLabels,
  } = useGalaxyStore();
  
  return (
    <GlassCard delay={0.5}>
      <h3 className="text-white/80 font-semibold mb-4 flex items-center gap-2">
        <span className="text-xl">⚙️</span>
        컨트롤
      </h3>
      
      <div className="space-y-3">
        <button
          onClick={togglePause}
          className={`
            w-full py-2 rounded-lg text-sm font-medium transition-all
            ${isPaused 
              ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' 
              : 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'}
          `}
        >
          {isPaused ? '▶️ 재생' : '⏸️ 일시정지'}
        </button>
        
        <div className="flex gap-2">
          <button
            onClick={toggleConnections}
            className={`
              flex-1 py-2 rounded-lg text-xs font-medium transition-all
              ${showConnections 
                ? 'bg-blue-500/20 text-blue-400' 
                : 'bg-white/5 text-white/40'}
            `}
          >
            연결선
          </button>
          <button
            onClick={toggleLabels}
            className={`
              flex-1 py-2 rounded-lg text-xs font-medium transition-all
              ${showLabels 
                ? 'bg-purple-500/20 text-purple-400' 
                : 'bg-white/5 text-white/40'}
            `}
          >
            레이블
          </button>
        </div>
      </div>
    </GlassCard>
  );
}

// 선택된 노드 상세
function SelectedNodePanel() {
  const { selectedNode, setSelectedNode } = useGalaxyStore();
  
  if (!selectedNode.node) return null;
  
  const node = selectedNode.node;
  const cluster = selectedNode.cluster;
  
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="absolute bottom-4 left-4 w-80"
    >
      <GlassCard>
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-white font-semibold">{node.name}</h3>
            <p className="text-xs text-white/50">{cluster?.nameKo}</p>
          </div>
          <button
            onClick={() => setSelectedNode(null, null)}
            className="text-white/40 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="text-center p-2 bg-white/5 rounded-lg">
            <div className="text-lg font-mono text-amber-400">{node.kEfficiency.toFixed(2)}</div>
            <div className="text-xs text-white/40">K</div>
          </div>
          <div className="text-center p-2 bg-white/5 rounded-lg">
            <div className="text-lg font-mono text-blue-400">{node.iInteraction.toFixed(2)}</div>
            <div className="text-xs text-white/40">I</div>
          </div>
          <div className="text-center p-2 bg-white/5 rounded-lg">
            <div className="text-lg font-mono text-orange-400">{node.omegaEntropy.toFixed(2)}</div>
            <div className="text-xs text-white/40">Ω</div>
          </div>
          <div className="text-center p-2 bg-white/5 rounded-lg">
            <div className="text-lg font-mono text-green-400">{node.rGrowth.toFixed(2)}</div>
            <div className="text-xs text-white/40">r</div>
          </div>
        </div>
        
        <div className="text-xs text-white/40 space-y-1">
          <div className="flex justify-between">
            <span>상태</span>
            <span className={`
              ${node.status === 'active' ? 'text-green-400' : ''}
              ${node.status === 'warning' ? 'text-yellow-400' : ''}
              ${node.status === 'critical' ? 'text-red-400' : ''}
            `}>
              {node.status}
            </span>
          </div>
          <div className="flex justify-between">
            <span>실행 횟수</span>
            <span className="font-mono">{node.executionCount.toLocaleString()}</span>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}

// 메인 대시보드
interface GalaxyDashboardProps {
  className?: string;
}

export function GalaxyDashboard({ className = '' }: GalaxyDashboardProps) {
  return (
    <div className={`absolute top-4 right-4 w-80 space-y-3 ${className}`}>
      {/* 벤토 그리드 레이아웃 */}
      <div className="grid grid-cols-2 gap-3">
        <SystemStatusCard />
        <MetricsCard />
        <UserNodeCard />
        <ClusterListCard />
        <ExtinctionQueueCard />
        <ControlPanel />
      </div>
    </div>
  );
}

// 선택된 노드 패널 (별도 export)
export { SelectedNodePanel };
