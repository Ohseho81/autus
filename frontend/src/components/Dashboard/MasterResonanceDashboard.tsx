/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🏛️ AUTUS Master Resonance Dashboard v2.0.0
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 144,000 마스터 → 8억 배포 → 80억 앰비언트 시각화
 *
 * 기능:
 * - 36개 노드의 실시간 공명 상태
 * - 도메인별 마스터 충전율
 * - 글로벌 합의(Consensus) 시각화
 * - FSD 처리 통계
 *
 * "80억 명의 지성이 머무를 '방' 번호를 확정하는 대시보드"
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// 상수 & 타입
// ============================================

const TOTAL_MASTERS = 144000;
const DOMAINS = 12;
const NODES_PER_DOMAIN = 3;

interface DomainInfo {
  id: number;
  code: string;
  name_en: string;
  name_kr: string;
  color: string;
  filled: number;
  total: number;
  fill_rate: number;
}

interface NodeInfo {
  id: string;
  global_id: number;
  name: string;
  name_kr: string;
  type: 'archetype' | 'dynamics' | 'equilibrium';
  resonance: number;
  energy: number;
  entropy: number;
}

interface SystemStats {
  total_filled: number;
  fill_rate: number;
  average_resonance: number;
  total_processed: number;
}

// 12개 도메인 정의
const DOMAIN_CONFIG: Record<string, { color: string; icon: string }> = {
  CAP: { color: '#FFD700', icon: '💰' },
  COG: { color: '#4169E1', icon: '🧠' },
  BIO: { color: '#32CD32', icon: '🌿' },
  SOC: { color: '#FF6B6B', icon: '👥' },
  TEM: { color: '#9B59B6', icon: '⏰' },
  SPA: { color: '#1ABC9C', icon: '🗺️' },
  CRE: { color: '#E74C3C', icon: '✨' },
  STR: { color: '#3498DB', icon: '🎯' },
  EMO: { color: '#E91E63', icon: '💗' },
  ETH: { color: '#795548', icon: '⚖️' },
  RES: { color: '#FF9800', icon: '💪' },
  TRN: { color: '#9C27B0', icon: '🚀' },
};

const formatNumber = (num: number): string => {
  if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toLocaleString();
};

// ============================================
// 시뮬레이터 훅 (API 연동 전)
// ============================================

const useDistributionSimulator = () => {
  const [stats, setStats] = useState<SystemStats>({
    total_filled: 0,
    fill_rate: 0,
    average_resonance: 0,
    total_processed: 0,
  });

  const [domains, setDomains] = useState<DomainInfo[]>([]);
  const [nodes, setNodes] = useState<NodeInfo[]>([]);

  useEffect(() => {
    // 초기 시뮬레이션 데이터
    const domainCodes = Object.keys(DOMAIN_CONFIG);
    const domainNames = [
      'Capital & Resource', 'Cognition & Intelligence', 'Bio-Vibrational Energy',
      'Social Dynamics', 'Temporal Mastery', 'Spatial Awareness',
      'Creative Genesis', 'Strategic Foresight', 'Emotional Intelligence',
      'Ethical Foundation', 'Resilience Core', 'Transcendence Gateway',
    ];
    const domainNamesKr = [
      '자본과 자원', '인지와 지성', '생체 진동 에너지',
      '사회적 역학', '시간의 지배', '공간의 인식',
      '창조의 기원', '전략적 선견', '감정의 지성',
      '윤리적 기반', '회복탄력성 핵심', '초월의 관문',
    ];

    // 도메인 데이터 초기화
    const initialDomains: DomainInfo[] = domainCodes.map((code, idx) => ({
      id: idx,
      code,
      name_en: domainNames[idx],
      name_kr: domainNamesKr[idx],
      color: DOMAIN_CONFIG[code].color,
      filled: Math.floor(Math.random() * 5000),
      total: 12000,
      fill_rate: 0,
    }));
    initialDomains.forEach(d => d.fill_rate = (d.filled / d.total) * 100);
    setDomains(initialDomains);

    // 노드 데이터 초기화
    const nodeTypes: ('archetype' | 'dynamics' | 'equilibrium')[] = ['archetype', 'dynamics', 'equilibrium'];
    const initialNodes: NodeInfo[] = [];
    for (let d = 0; d < DOMAINS; d++) {
      for (let n = 0; n < NODES_PER_DOMAIN; n++) {
        const globalId = d * 3 + n + 1;
        initialNodes.push({
          id: `n${globalId.toString().padStart(2, '0')}`,
          global_id: globalId,
          name: `Node ${globalId}`,
          name_kr: `노드 ${globalId}`,
          type: nodeTypes[n],
          resonance: 0.5 + Math.random() * 0.5,
          energy: 0.7 + Math.random() * 0.3,
          entropy: Math.random() * 0.3,
        });
      }
    }
    setNodes(initialNodes);

    // 실시간 업데이트
    const interval = setInterval(() => {
      setStats(prev => ({
        total_filled: prev.total_filled + Math.floor(Math.random() * 10),
        fill_rate: ((prev.total_filled + 10) / TOTAL_MASTERS) * 100,
        average_resonance: 0.7 + Math.sin(Date.now() / 5000) * 0.2,
        total_processed: prev.total_processed + Math.floor(Math.random() * 100),
      }));

      setDomains(prev => prev.map(d => ({
        ...d,
        filled: d.filled + Math.floor(Math.random() * 3),
        fill_rate: ((d.filled + 3) / d.total) * 100,
      })));

      setNodes(prev => prev.map(n => ({
        ...n,
        resonance: Math.max(0.3, Math.min(1, n.resonance + (Math.random() - 0.5) * 0.1)),
        energy: Math.max(0.5, Math.min(1, n.energy + (Math.random() - 0.5) * 0.05)),
        entropy: Math.max(0, Math.min(0.5, n.entropy + (Math.random() - 0.5) * 0.02)),
      })));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return { stats, domains, nodes };
};

// ============================================
// 컴포넌트: 핵심 지표
// ============================================

interface StatCardProps {
  label: string;
  value: string | number;
  suffix?: string;
  color?: string;
  icon?: string;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, suffix = '', color = '#fff', icon }) => (
  <motion.div
    whileHover={{ scale: 1.02 }}
    className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50"
  >
    <div className="flex items-center gap-2 mb-2">
      {icon && <span className="text-xl">{icon}</span>}
      <span className="text-slate-400 text-sm">{label}</span>
    </div>
    <div className="text-2xl font-bold font-mono" style={{ color }}>
      {typeof value === 'number' ? formatNumber(value) : value}{suffix}
    </div>
  </motion.div>
);

// ============================================
// 컴포넌트: 도메인 그리드
// ============================================

const DomainGrid: React.FC<{ domains: DomainInfo[] }> = ({ domains }) => (
  <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
    {domains.map(domain => {
      const config = DOMAIN_CONFIG[domain.code] || { color: '#888', icon: '📦' };
      return (
        <motion.div
          key={domain.code}
          whileHover={{ scale: 1.05 }}
          className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/30"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">{config.icon}</span>
            <span className="text-white/80 text-xs font-medium">{domain.code}</span>
          </div>
          <div className="text-white/60 text-xs mb-2 truncate" title={domain.name_kr}>
            {domain.name_kr}
          </div>
          <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(domain.fill_rate, 100)}%` }}
              transition={{ duration: 1 }}
              className="h-full rounded-full"
              style={{ backgroundColor: config.color }}
            />
          </div>
          <div className="text-white/40 text-xs mt-1 text-right">
            {domain.fill_rate.toFixed(1)}%
          </div>
        </motion.div>
      );
    })}
  </div>
);

// ============================================
// 컴포넌트: 노드 공명 맵
// ============================================

const NodeResonanceMap: React.FC<{ nodes: NodeInfo[] }> = ({ nodes }) => {
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'archetype': return '#FFD700';
      case 'dynamics': return '#00AAFF';
      case 'equilibrium': return '#00CC66';
      default: return '#888';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'archetype': return '⭐';
      case 'dynamics': return '🔄';
      case 'equilibrium': return '⚖️';
      default: return '📍';
    }
  };

  return (
    <div className="grid grid-cols-6 md:grid-cols-9 lg:grid-cols-12 gap-2">
      {nodes.map(node => (
        <motion.div
          key={node.id}
          whileHover={{ scale: 1.1, zIndex: 10 }}
          className="relative aspect-square"
          title={`${node.id}: ${node.name_kr}`}
        >
          {/* 공명 배경 */}
          <motion.div
            className="absolute inset-0 rounded-lg opacity-30"
            animate={{
              boxShadow: `0 0 ${node.resonance * 20}px ${getTypeColor(node.type)}`,
            }}
            style={{ backgroundColor: getTypeColor(node.type) }}
          />
          
          {/* 노드 본체 */}
          <div
            className="relative w-full h-full rounded-lg flex flex-col items-center justify-center border"
            style={{
              borderColor: getTypeColor(node.type),
              backgroundColor: `${getTypeColor(node.type)}22`,
            }}
          >
            <span className="text-xs">{getTypeIcon(node.type)}</span>
            <span className="text-white/60 text-[10px]">{node.id}</span>
          </div>
          
          {/* 에너지 바 */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-900/50 rounded-b-lg overflow-hidden">
            <div
              className="h-full transition-all duration-500"
              style={{
                width: `${node.energy * 100}%`,
                backgroundColor: getTypeColor(node.type),
              }}
            />
          </div>
        </motion.div>
      ))}
    </div>
  );
};

// ============================================
// 컴포넌트: 글로벌 공명 게이지
// ============================================

const GlobalResonanceGauge: React.FC<{ value: number }> = ({ value }) => {
  const percentage = Math.round(value * 100);
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const getColor = (v: number) => {
    if (v >= 80) return '#00CC66';
    if (v >= 60) return '#FFD700';
    return '#FF6B6B';
  };

  return (
    <div className="flex flex-col items-center">
      <svg width="120" height="120" className="transform -rotate-90">
        <circle
          cx="60"
          cy="60"
          r="45"
          stroke="#1e293b"
          strokeWidth="10"
          fill="none"
        />
        <motion.circle
          cx="60"
          cy="60"
          r="45"
          stroke={getColor(percentage)}
          strokeWidth="10"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1 }}
        />
      </svg>
      <div className="absolute mt-10 text-center">
        <div className="text-3xl font-bold text-white">{percentage}%</div>
        <div className="text-xs text-slate-400">Global Resonance</div>
      </div>
    </div>
  );
};

// ============================================
// 메인 대시보드
// ============================================

const MasterResonanceDashboard: React.FC = () => {
  const { stats, domains, nodes } = useDistributionSimulator();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* 헤더 */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-white mb-2">
            🏛️ AUTUS Master Resonance
          </h1>
          <p className="text-white/60">
            144,000 마스터 → 8억 배포 → 80억 앰비언트
          </p>
        </motion.div>

        {/* 핵심 지표 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="마스터 슬롯"
            value={stats.total_filled}
            suffix={` / ${formatNumber(TOTAL_MASTERS)}`}
            color="#FFD700"
            icon="🏛️"
          />
          <StatCard
            label="충전율"
            value={stats.fill_rate.toFixed(2)}
            suffix="%"
            color="#4ECDC4"
            icon="📊"
          />
          <StatCard
            label="평균 공명"
            value={(stats.average_resonance * 100).toFixed(1)}
            suffix="%"
            color="#00CC66"
            icon="🌊"
          />
          <StatCard
            label="처리된 요청"
            value={stats.total_processed}
            color="#9B59B6"
            icon="⚡"
          />
        </div>

        {/* 2열 레이아웃 */}
        <div className="grid md:grid-cols-3 gap-6">
          
          {/* 도메인 그리드 (2열) */}
          <div className="md:col-span-2 bg-slate-800/30 rounded-2xl p-6 border border-slate-700/30">
            <h2 className="text-white/80 font-medium mb-4 flex items-center gap-2">
              📦 12 도메인 충전 현황
            </h2>
            <DomainGrid domains={domains} />
          </div>

          {/* 공명 게이지 (1열) */}
          <div className="bg-slate-800/30 rounded-2xl p-6 border border-slate-700/30 flex flex-col items-center justify-center">
            <h2 className="text-white/80 font-medium mb-4">🌊 글로벌 공명 지수</h2>
            <div className="relative">
              <GlobalResonanceGauge value={stats.average_resonance} />
            </div>
            <div className="mt-6 text-center">
              <p className="text-white/40 text-sm">
                {stats.average_resonance >= 0.8 
                  ? '🟢 인류 지성이 고도로 정렬됨'
                  : stats.average_resonance >= 0.6
                  ? '🟡 정렬 진행 중'
                  : '🔴 더 많은 마스터 필요'}
              </p>
            </div>
          </div>
        </div>

        {/* 36 노드 공명 맵 */}
        <div className="bg-slate-800/30 rounded-2xl p-6 border border-slate-700/30">
          <h2 className="text-white/80 font-medium mb-4 flex items-center gap-2">
            📍 36 노드 공명 맵
            <span className="text-white/40 text-sm ml-auto">
              ⭐ Archetype | 🔄 Dynamics | ⚖️ Equilibrium
            </span>
          </h2>
          <NodeResonanceMap nodes={nodes} />
        </div>

        {/* 푸터 */}
        <div className="text-center text-white/30 text-sm pt-4">
          AUTUS v2.0.0 • 지능의 주소록 • 1:12:144 프랙탈 구조
        </div>
      </div>
    </div>
  );
};

export default MasterResonanceDashboard;
