/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🏛️ AUTUS Universe v3.0 Dashboard
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * 48노드 = 4 메타 × 4 도메인 × 3 노드타입
 * 6 Core + 3 Role = 42가지 인간 유형
 * 
 * "이해할 수 없으면 변화할 수 없다" - AUTUS
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ═══════════════════════════════════════════════════════════════════════════════
// 타입 정의
// ═══════════════════════════════════════════════════════════════════════════════

interface MetaCategory {
  id: string;
  name: string;
  emoji: string;
  domains: string[];
  pressure: number;
}

interface Domain {
  id: string;
  name: string;
  meta: string;
  nodes: string[];
  pressure: number;
  state: string;
}

interface Node {
  id: string;
  domain: string;
  domainName: string;
  meta: string;
  type: string;
  typeName: string;
  typeEmoji: string;
  pressure: number;
  state: string;
  stateLabel: string;
  stateColor: string;
}

interface Region {
  id: string;
  name: string;
  flag: string;
  synced: number;
  active: number;
  syncRate: number;
  isAwake: boolean;
}

interface GlobalStats {
  totalSynced: number;
  activeNow: number;
  resonance: number;
  syncPerSecond: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 상수
// ═══════════════════════════════════════════════════════════════════════════════

const META_CATEGORIES: Record<string, { name: string; emoji: string; domains: string[] }> = {
  MAT: { name: '물질', emoji: '💎', domains: ['CASH', 'ASSET', 'BODY', 'SPACE'] },
  MEN: { name: '정신', emoji: '🧠', domains: ['COGNI', 'EMOTE', 'WILL', 'RELATE'] },
  DYN: { name: '동적', emoji: '⚡', domains: ['TIME', 'WORK', 'GROW', 'CHANGE'] },
  TRS: { name: '초월', emoji: '🌟', domains: ['MEANING', 'LEGACY', 'IMPACT', 'SELF'] },
};

const DOMAINS: Record<string, { name: string; meta: string }> = {
  CASH: { name: '현금', meta: 'MAT' },
  ASSET: { name: '자산', meta: 'MAT' },
  BODY: { name: '신체', meta: 'MAT' },
  SPACE: { name: '공간', meta: 'MAT' },
  COGNI: { name: '인지', meta: 'MEN' },
  EMOTE: { name: '감정', meta: 'MEN' },
  WILL: { name: '의지', meta: 'MEN' },
  RELATE: { name: '관계', meta: 'MEN' },
  TIME: { name: '시간', meta: 'DYN' },
  WORK: { name: '업무', meta: 'DYN' },
  GROW: { name: '성장', meta: 'DYN' },
  CHANGE: { name: '변화', meta: 'DYN' },
  MEANING: { name: '의미', meta: 'TRS' },
  LEGACY: { name: '유산', meta: 'TRS' },
  IMPACT: { name: '영향', meta: 'TRS' },
  SELF: { name: '자아', meta: 'TRS' },
};

const META_COLORS: Record<string, string> = {
  MAT: '#3B82F6',
  MEN: '#8B5CF6',
  DYN: '#F59E0B',
  TRS: '#10B981',
};

const STATE_COLORS: Record<string, string> = {
  STABLE: '#22C55E',
  MONITORING: '#EAB308',
  PRESSURING: '#F97316',
  IRREVERSIBLE: '#EF4444',
  CRITICAL: '#18181B',
};

// ═══════════════════════════════════════════════════════════════════════════════
// 유틸리티
// ═══════════════════════════════════════════════════════════════════════════════

const formatNumber = (num: number): string => {
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(2) + 'B';
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
  return num.toLocaleString();
};

const getPressureState = (pressure: number): { state: string; label: string; color: string } => {
  if (pressure < 0.3) return { state: 'STABLE', label: '안정', color: STATE_COLORS.STABLE };
  if (pressure < 0.5) return { state: 'MONITORING', label: '관찰', color: STATE_COLORS.MONITORING };
  if (pressure < 0.78) return { state: 'PRESSURING', label: '압박', color: STATE_COLORS.PRESSURING };
  if (pressure < 0.9) return { state: 'IRREVERSIBLE', label: '위험', color: STATE_COLORS.IRREVERSIBLE };
  return { state: 'CRITICAL', label: '위기', color: STATE_COLORS.CRITICAL };
};

// ═══════════════════════════════════════════════════════════════════════════════
// 훅: 시뮬레이터 데이터
// ═══════════════════════════════════════════════════════════════════════════════

const useSimulatorV3 = () => {
  const [stats, setStats] = useState<GlobalStats>({
    totalSynced: 12847293,
    activeNow: 1541675,
    resonance: 87,
    syncPerSecond: 0.8,
  });

  const [nodes, setNodes] = useState<Node[]>([]);

  useEffect(() => {
    // 초기 노드 생성
    const initialNodes: Node[] = [];
    const domainKeys = Object.keys(DOMAINS);
    const types = [
      { key: 'A', name: '본질', emoji: '⭐' },
      { key: 'D', name: '흐름', emoji: '🔄' },
      { key: 'E', name: '균형', emoji: '⚖️' },
    ];

    for (let i = 0; i < 48; i++) {
      const domainIndex = Math.floor(i / 3);
      const typeIndex = i % 3;
      const domain = domainKeys[domainIndex];
      const type = types[typeIndex];
      const pressure = 0.3 + Math.random() * 0.4;
      const state = getPressureState(pressure);

      initialNodes.push({
        id: `n${String(i + 1).padStart(2, '0')}`,
        domain,
        domainName: DOMAINS[domain].name,
        meta: DOMAINS[domain].meta,
        type: type.key,
        typeName: type.name,
        typeEmoji: type.emoji,
        pressure,
        ...state,
      } as any);
    }
    setNodes(initialNodes);

    // 실시간 업데이트
    const interval = setInterval(() => {
      setStats(prev => ({
        totalSynced: prev.totalSynced + Math.floor(Math.random() * 3),
        activeNow: Math.floor(prev.totalSynced * (0.1 + Math.random() * 0.05)),
        resonance: Math.floor(70 + Math.random() * 25),
        syncPerSecond: 0.5 + Math.random() * 0.8,
      }));

      setNodes(prev => prev.map(node => {
        const change = (Math.random() - 0.5) * 0.05;
        const newPressure = Math.max(0, Math.min(1, node.pressure + change));
        const state = getPressureState(newPressure);
        return { ...node, pressure: newPressure, ...state };
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return { stats, nodes };
};

// ═══════════════════════════════════════════════════════════════════════════════
// 컴포넌트: 글로벌 스탯
// ═══════════════════════════════════════════════════════════════════════════════

const GlobalStatsBar: React.FC<{ stats: GlobalStats }> = ({ stats }) => (
  <div className="grid grid-cols-4 gap-4 mb-6">
    {[
      { label: '총 동기화', value: stats.totalSynced, format: formatNumber, color: '#3B82F6' },
      { label: '현재 활성', value: stats.activeNow, format: formatNumber, color: '#22C55E' },
      { label: '공명 지수', value: stats.resonance, format: (v: number) => `${v}%`, color: '#F59E0B' },
      { label: '초당 동기화', value: stats.syncPerSecond, format: (v: number) => v.toFixed(1), color: '#8B5CF6' },
    ].map(stat => (
      <motion.div
        key={stat.label}
        className="bg-gray-900 rounded-xl p-4 border border-gray-800"
        whileHover={{ scale: 1.02 }}
      >
        <div className="text-xs text-gray-500 mb-1">{stat.label}</div>
        <div className="text-2xl font-bold" style={{ color: stat.color }}>
          {stat.format(stat.value)}
        </div>
        <div className="w-full h-1 bg-gray-800 rounded mt-2 overflow-hidden">
          <motion.div
            className="h-full rounded"
            style={{ backgroundColor: stat.color }}
            initial={{ width: 0 }}
            animate={{ width: '70%' }}
            transition={{ duration: 1 }}
          />
        </div>
      </motion.div>
    ))}
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// 컴포넌트: 메타 카테고리
// ═══════════════════════════════════════════════════════════════════════════════

const MetaCategoryCard: React.FC<{ 
  metaKey: string; 
  nodes: Node[];
  isExpanded: boolean;
  onToggle: () => void;
}> = ({ metaKey, nodes, isExpanded, onToggle }) => {
  const meta = META_CATEGORIES[metaKey];
  const metaNodes = nodes.filter(n => n.meta === metaKey);
  const avgPressure = metaNodes.length > 0
    ? metaNodes.reduce((sum, n) => sum + n.pressure, 0) / metaNodes.length
    : 0.5;
  const state = getPressureState(avgPressure);

  return (
    <motion.div
      className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden"
      layout
    >
      <motion.div
        className="p-4 cursor-pointer flex items-center justify-between"
        onClick={onToggle}
        whileHover={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{meta.emoji}</span>
          <div>
            <div className="font-semibold" style={{ color: META_COLORS[metaKey] }}>
              {meta.name}
            </div>
            <div className="text-xs text-gray-500">
              {meta.domains.map(d => DOMAINS[d].name).join(' · ')}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm px-2 py-1 rounded" style={{ backgroundColor: state.color + '20', color: state.color }}>
            {state.label}
          </div>
          <div className="text-lg text-gray-400">
            {isExpanded ? '−' : '+'}
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 pb-4"
          >
            <div className="grid grid-cols-4 gap-2">
              {meta.domains.map(domainKey => {
                const domainNodes = metaNodes.filter(n => n.domain === domainKey);
                return (
                  <div key={domainKey} className="bg-gray-800/50 rounded-lg p-3">
                    <div className="text-sm font-medium mb-2" style={{ color: META_COLORS[metaKey] }}>
                      {DOMAINS[domainKey].name}
                    </div>
                    <div className="space-y-1">
                      {domainNodes.map(node => (
                        <div
                          key={node.id}
                          className="flex items-center justify-between text-xs"
                        >
                          <span className="text-gray-400">
                            {node.typeEmoji} {node.typeName}
                          </span>
                          <span
                            className="px-1.5 py-0.5 rounded text-[10px]"
                            style={{
                              backgroundColor: node.stateColor + '20',
                              color: node.stateColor,
                            }}
                          >
                            {(node.pressure * 100).toFixed(0)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 컴포넌트: 48노드 그리드
// ═══════════════════════════════════════════════════════════════════════════════

const Node48Grid: React.FC<{ nodes: Node[] }> = ({ nodes }) => (
  <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
    <div className="text-sm font-semibold text-gray-400 mb-4 flex items-center gap-2">
      <span>📊</span>
      <span>48 노드 그리드</span>
      <span className="text-xs text-gray-600">(4 메타 × 4 도메인 × 3 타입)</span>
    </div>
    
    <div className="grid grid-cols-12 gap-1">
      {nodes.map(node => (
        <motion.div
          key={node.id}
          className="aspect-square rounded flex items-center justify-center text-[10px] font-medium cursor-pointer"
          style={{
            backgroundColor: node.stateColor + '20',
            color: node.stateColor,
            borderLeft: `2px solid ${META_COLORS[node.meta]}`,
          }}
          whileHover={{ scale: 1.2, zIndex: 10 }}
          title={`${node.domainName} ${node.typeName} (${(node.pressure * 100).toFixed(0)}%)`}
        >
          {node.typeEmoji}
        </motion.div>
      ))}
    </div>

    <div className="flex items-center justify-center gap-6 mt-4 text-xs">
      {Object.entries(META_CATEGORIES).map(([key, meta]) => (
        <div key={key} className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: META_COLORS[key] }} />
          <span className="text-gray-500">{meta.emoji} {meta.name}</span>
        </div>
      ))}
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// 컴포넌트: 공명 게이지
// ═══════════════════════════════════════════════════════════════════════════════

const ResonanceGauge: React.FC<{ resonance: number }> = ({ resonance }) => {
  const angle = (resonance / 100) * 180 - 90;
  
  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
      <div className="text-sm font-semibold text-gray-400 mb-4">🌊 글로벌 공명</div>
      
      <div className="relative h-32 flex items-end justify-center">
        <svg viewBox="0 0 100 50" className="w-48">
          {/* 배경 아크 */}
          <path
            d="M 10 50 A 40 40 0 0 1 90 50"
            fill="none"
            stroke="#374151"
            strokeWidth="8"
            strokeLinecap="round"
          />
          {/* 활성 아크 */}
          <path
            d="M 10 50 A 40 40 0 0 1 90 50"
            fill="none"
            stroke={resonance > 70 ? '#22C55E' : resonance > 40 ? '#F59E0B' : '#EF4444'}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${resonance * 1.26} 126`}
          />
          {/* 바늘 */}
          <line
            x1="50"
            y1="50"
            x2={50 + 30 * Math.cos((angle * Math.PI) / 180)}
            y2={50 + 30 * Math.sin((angle * Math.PI) / 180)}
            stroke="#fff"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="50" cy="50" r="4" fill="#fff" />
        </svg>
        
        <div className="absolute bottom-0 text-center">
          <div className="text-3xl font-bold text-white">{resonance}%</div>
          <div className="text-xs text-gray-500">
            {resonance > 80 ? '최적 공명' : resonance > 60 ? '양호' : '조정 필요'}
          </div>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// 메인 컴포넌트
// ═══════════════════════════════════════════════════════════════════════════════

export const AutusUniverseV3: React.FC = () => {
  const { stats, nodes } = useSimulatorV3();
  const [expandedMeta, setExpandedMeta] = useState<string | null>('MAT');

  return (
    <div className="min-h-screen bg-black text-white p-6">
      {/* 헤더 */}
      <div className="text-center mb-8">
        <motion.h1
          className="text-4xl font-bold mb-2"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          🏛️ AUTUS Universe v3.0
        </motion.h1>
        <p className="text-gray-500">
          48노드 = 4 메타 × 4 도메인 × 3 타입 | 42가지 인간 유형
        </p>
        <p className="text-xs text-gray-600 mt-1">
          "이해할 수 없으면 변화할 수 없다"
        </p>
      </div>

      {/* 글로벌 스탯 */}
      <GlobalStatsBar stats={stats} />

      <div className="grid grid-cols-3 gap-6">
        {/* 메타 카테고리 (2열) */}
        <div className="col-span-2 space-y-4">
          {Object.keys(META_CATEGORIES).map(metaKey => (
            <MetaCategoryCard
              key={metaKey}
              metaKey={metaKey}
              nodes={nodes}
              isExpanded={expandedMeta === metaKey}
              onToggle={() => setExpandedMeta(expandedMeta === metaKey ? null : metaKey)}
            />
          ))}
        </div>

        {/* 사이드바 (1열) */}
        <div className="space-y-4">
          <ResonanceGauge resonance={stats.resonance} />
          <Node48Grid nodes={nodes} />
        </div>
      </div>

      {/* 푸터 */}
      <div className="mt-8 text-center text-xs text-gray-600">
        <p>48개 노드는 인간이 이해한다 🧘</p>
        <p className="text-gray-700 mt-1">AUTUS v3.0.0 | 2026</p>
      </div>
    </div>
  );
};

export default AutusUniverseV3;
