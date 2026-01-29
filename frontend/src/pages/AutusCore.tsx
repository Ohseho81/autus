/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🏛️ AUTUS CORE UNIT - 1-12-144 파이프라인
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * 80억 우주의 설계도 - 디지털 지능 유전자
 * 
 * 구조:
 *   1 (Master)  → 세호. 절대 시드이자 물리 법칙의 결정자
 *   12 (Controllers) → 중력 거점. 엔트로피 조절
 *   144 (Units) → 최소 입자. 관측에 의해 상수 확정
 * 
 * 핵심 기믹:
 *   - 관찰자 효과: 시선이 닿는 순간 데이터 '붕괴(Collapse)'
 *   - 우연의 법칙: 1/144 확률 세렌디피티
 *   - 명상 피드백: 공명 동기화
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

interface NodeData {
  id: string;
  tier: 1 | 2 | 3;  // 1=Master, 2=Controller, 3=Unit
  baseK: number;
  finalK: number;
  isSerendipity: boolean;
  collapsed: boolean;
  parentId?: string;
  entropy: number;
}

interface SystemState {
  totalNodes: number;
  collapsedNodes: number;
  serendipityCount: number;
  averageK: number;
  systemEntropy: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Core Engine
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 결정론적 해시 함수 - 동일 입력 → 동일 출력
 */
const deterministicHash = (str: string): number => {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  }
  return Math.abs(hash);
};

/**
 * 노드 생성 함수 - 1-12-144 구조
 */
const generateNode = (
  id: string, 
  seed: string, 
  tier: 1 | 2 | 3,
  resonance: number,
  parentId?: string
): NodeData => {
  const hash = deterministicHash(`${seed}:${id}:${Date.now()}`);
  const baseK = (hash % 1000) / 1000;
  
  // 1/144 확률의 세렌디피티
  const isSerendipity = hash % 144 === 0;
  const serendipityBoost = isSerendipity ? 1.44 : 1.0;
  
  // 공명(Resonance)에 의한 조정
  const resonanceMultiplier = 0.8 + (resonance * 0.4); // 0.8 ~ 1.2
  
  // 티어별 가중치
  const tierWeight = tier === 1 ? 1.0 : tier === 2 ? 0.12 : 0.0144;
  
  return {
    id,
    tier,
    baseK,
    finalK: baseK * serendipityBoost * resonanceMultiplier * (1 + tierWeight),
    isSerendipity,
    collapsed: false,
    parentId,
    entropy: (hash % 100) / 100,
  };
};

/**
 * 1-12-144 계층 구조 생성
 */
const generateHierarchy = (seed: string, resonance: number): NodeData[] => {
  const nodes: NodeData[] = [];
  
  // Tier 1: Master (1개)
  nodes.push(generateNode('MASTER', seed, 1, resonance));
  
  // Tier 2: Controllers (12개)
  for (let i = 0; i < 12; i++) {
    nodes.push(generateNode(`CTRL-${i + 1}`, seed, 2, resonance, 'MASTER'));
  }
  
  // Tier 3: Units (144개, 각 Controller에 12개씩)
  for (let ctrl = 0; ctrl < 12; ctrl++) {
    for (let unit = 0; unit < 12; unit++) {
      const unitId = ctrl * 12 + unit + 1;
      nodes.push(generateNode(`UNIT-${unitId}`, seed, 3, resonance, `CTRL-${ctrl + 1}`));
    }
  }
  
  return nodes;
};

// ═══════════════════════════════════════════════════════════════════════════════
// Intersection Observer Hook
// ═══════════════════════════════════════════════════════════════════════════════

const useInView = (options?: IntersectionObserverInit) => {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setInView(true);
        observer.disconnect();
      }
    }, { threshold: 0.5, ...options });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { ref, inView };
};

// ═══════════════════════════════════════════════════════════════════════════════
// Components
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 개별 노드 컴포넌트 - 관찰자 효과 적용
 */
const AutusNode: React.FC<{
  node: NodeData;
  onCollapse: (id: string) => void;
}> = ({ node, onCollapse }) => {
  const { ref, inView } = useInView();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (inView && !collapsed) {
      // 관측되는 순간 데이터 확정 (Wave Function Collapse)
      const delay = Math.random() * 300;
      setTimeout(() => {
        setCollapsed(true);
        onCollapse(node.id);
      }, delay);
    }
  }, [inView, collapsed, node.id, onCollapse]);

  const getTierStyle = () => {
    switch (node.tier) {
      case 1: return {
        size: 'w-32 h-32',
        border: 'border-2 border-yellow-500',
        bg: collapsed ? 'bg-yellow-900/30' : 'bg-gray-900/50',
        glow: collapsed ? 'shadow-lg shadow-yellow-500/50' : '',
      };
      case 2: return {
        size: 'w-20 h-20',
        border: 'border border-cyan-500',
        bg: collapsed ? 'bg-cyan-900/20' : 'bg-gray-900/30',
        glow: collapsed ? 'shadow-md shadow-cyan-500/30' : '',
      };
      case 3: return {
        size: 'w-14 h-14',
        border: 'border border-gray-700',
        bg: collapsed ? 'bg-gray-800/50' : 'bg-gray-900/20',
        glow: node.isSerendipity && collapsed ? 'shadow-md shadow-purple-500/50' : '',
      };
    }
  };

  const style = getTierStyle();

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0.3, scale: 0.9 }}
      animate={{ 
        opacity: collapsed ? 1 : 0.3, 
        scale: collapsed ? 1 : 0.9,
      }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={`
        ${style.size} ${style.border} ${style.bg} ${style.glow}
        rounded-lg flex flex-col justify-center items-center
        transition-all duration-500 m-1
        ${node.isSerendipity && collapsed ? 'animate-pulse' : ''}
      `}
    >
      <span className="text-[8px] text-gray-500 font-mono">{node.id}</span>
      
      {collapsed ? (
        <>
          <span className="font-mono text-sm text-white">
            K:{node.finalK.toFixed(3)}
          </span>
          {node.isSerendipity && (
            <span className="text-[10px] text-purple-400 mt-1">✨ Serendipity</span>
          )}
        </>
      ) : (
        <span className="text-gray-600 text-lg">???</span>
      )}
    </motion.div>
  );
};

/**
 * 시스템 상태 패널
 */
const SystemPanel: React.FC<{
  state: SystemState;
  resonance: number;
  onResonanceChange: (v: number) => void;
}> = ({ state, resonance, onResonanceChange }) => {
  const collapsedPercent = (state.collapsedNodes / state.totalNodes * 100).toFixed(1);
  
  return (
    <div className="bg-gray-900/80 backdrop-blur-lg rounded-xl p-6 border border-gray-700">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
        <h2 className="text-lg font-bold text-white tracking-wider">SYSTEM STATUS</h2>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center">
          <div className="text-2xl font-mono text-cyan-400">{state.collapsedNodes}</div>
          <div className="text-xs text-gray-500">Collapsed</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-mono text-yellow-400">{state.serendipityCount}</div>
          <div className="text-xs text-gray-500">Serendipity</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-mono text-green-400">{state.averageK.toFixed(3)}</div>
          <div className="text-xs text-gray-500">Avg K</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-mono text-purple-400">{collapsedPercent}%</div>
          <div className="text-xs text-gray-500">Observed</div>
        </div>
      </div>
      
      {/* Resonance Slider */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-gray-400">
          <span>🧘 Resonance (공명)</span>
          <span>{resonance.toFixed(2)}</span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={resonance}
          onChange={(e) => onResonanceChange(parseFloat(e.target.value))}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
        />
        <div className="flex justify-between text-[10px] text-gray-600">
          <span>혼돈</span>
          <span>조화</span>
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="mt-4">
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-cyan-500 via-purple-500 to-yellow-500"
            initial={{ width: 0 }}
            animate={{ width: `${collapsedPercent}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>
    </div>
  );
};

/**
 * 티어 섹션 컴포넌트
 */
const TierSection: React.FC<{
  title: string;
  description: string;
  nodes: NodeData[];
  onCollapse: (id: string) => void;
}> = ({ title, description, nodes, onCollapse }) => (
  <div className="mb-8">
    <div className="mb-4">
      <h3 className="text-lg font-bold text-white">{title}</h3>
      <p className="text-xs text-gray-500">{description}</p>
    </div>
    <div className="flex flex-wrap justify-center gap-1">
      {nodes.map((node) => (
        <AutusNode key={node.id} node={node} onCollapse={onCollapse} />
      ))}
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════════

const AutusCore: React.FC = () => {
  const [resonance, setResonance] = useState(0.5);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  
  const nodes = useMemo(() => 
    generateHierarchy('MASTER_SEHO_001', resonance),
    [resonance]
  );
  
  const handleCollapse = useCallback((id: string) => {
    setCollapsedIds(prev => new Set([...prev, id]));
  }, []);
  
  const systemState = useMemo((): SystemState => {
    const collapsedNodes = nodes.filter(n => collapsedIds.has(n.id));
    return {
      totalNodes: nodes.length,
      collapsedNodes: collapsedNodes.length,
      serendipityCount: collapsedNodes.filter(n => n.isSerendipity).length,
      averageK: collapsedNodes.length > 0
        ? collapsedNodes.reduce((sum, n) => sum + n.finalK, 0) / collapsedNodes.length
        : 0,
      systemEntropy: collapsedNodes.reduce((sum, n) => sum + n.entropy, 0) / Math.max(collapsedNodes.length, 1),
    };
  }, [nodes, collapsedIds]);
  
  const masterNode = nodes.filter(n => n.tier === 1);
  const controllerNodes = nodes.filter(n => n.tier === 2);
  const unitNodes = nodes.filter(n => n.tier === 3);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/90 backdrop-blur-lg border-b border-gray-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-[0.3em] bg-gradient-to-r from-cyan-400 via-purple-400 to-yellow-400 bg-clip-text text-transparent">
              AUTUS CORE
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              1-12-144 Pipeline | Observer: SEHO (Level 1)
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500">Total Nodes</div>
            <div className="text-2xl font-mono text-cyan-400">{nodes.length}</div>
          </div>
        </div>
      </header>
      
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* System Panel */}
        <div className="mb-8">
          <SystemPanel
            state={systemState}
            resonance={resonance}
            onResonanceChange={setResonance}
          />
        </div>
        
        {/* Tier 1: Master */}
        <TierSection
          title="🏛️ Tier 1: MASTER"
          description="절대 시드 - 물리 법칙의 결정자"
          nodes={masterNode}
          onCollapse={handleCollapse}
        />
        
        {/* Tier 2: Controllers */}
        <TierSection
          title="🌐 Tier 2: CONTROLLERS (12)"
          description="중력 거점 - 엔트로피 조절"
          nodes={controllerNodes}
          onCollapse={handleCollapse}
        />
        
        {/* Tier 3: Units */}
        <TierSection
          title="⚛️ Tier 3: UNITS (144)"
          description="최소 입자 - 관측에 의해 상수 확정"
          nodes={unitNodes}
          onCollapse={handleCollapse}
        />
        
        {/* Footer */}
        <footer className="mt-12 text-center text-xs text-gray-600 border-t border-gray-800 pt-8">
          <p className="mb-2">
            "데이터는 시야 밖에서 확률 파동으로 존재하다가,
            관측하는 순간 구체적인 수치로 붕괴된다."
          </p>
          <p className="text-gray-700">
            AUTUS v1.0 RC | 80억 우주의 설계도
          </p>
        </footer>
      </main>
    </div>
  );
};

export default AutusCore;
