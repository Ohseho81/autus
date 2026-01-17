// ═══════════════════════════════════════════════════════════════════════════════
// AUTUS v4.0 - Galactic Command Center (Main Page)
// ═══════════════════════════════════════════════════════════════════════════════

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GalaxyScene } from './GalaxyScene';
import { GalaxyDashboard, SelectedNodePanel } from './GalaxyDashboard';
import { useGalaxyStore } from './useGalaxyStore';

// 헤더 컴포넌트
function Header() {
  const { systemState } = useGalaxyStore();
  
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="absolute top-0 left-0 right-0 z-10 px-6 py-4"
    >
      <div className="flex items-center justify-between">
        {/* 로고 */}
        <div className="flex items-center gap-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-600 rounded-xl flex items-center justify-center text-2xl shadow-lg shadow-amber-500/30"
          >
            🏛️
          </motion.div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-wide">
              AUTUS <span className="text-amber-400">v4.0</span>
            </h1>
            <p className="text-xs text-white/50 font-mono tracking-widest">
              GALACTIC COMMAND CENTER
            </p>
          </div>
        </div>
        
        {/* 상태 인디케이터 */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 px-4 py-2 bg-black/30 backdrop-blur-sm rounded-full border border-white/10">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-white/70 font-mono">
              {systemState.pipelineStatus === 'running' ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>
          
          <div className="text-right">
            <div className="text-2xl font-bold text-amber-400 font-mono">
              {systemState.totalNodes}
            </div>
            <div className="text-xs text-white/40">ACTIVE NODES</div>
          </div>
        </div>
      </div>
    </motion.header>
  );
}

// 하단 상태 바
function StatusBar() {
  const { systemState, nodes } = useGalaxyStore();
  
  // 실시간 통계 계산
  const activePercent = (systemState.activeNodes / systemState.totalNodes * 100).toFixed(1);
  const healthScore = ((systemState.avgK / 3) * 100).toFixed(0);
  
  return (
    <motion.footer
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="absolute bottom-0 left-0 right-0 z-10"
    >
      <div className="px-6 py-3 bg-black/40 backdrop-blur-md border-t border-white/10">
        <div className="flex items-center justify-between">
          {/* 왼쪽: 시스템 메트릭 */}
          <div className="flex items-center gap-8">
            <MetricPill label="K" value={systemState.avgK.toFixed(2)} color="amber" />
            <MetricPill label="I" value={systemState.avgI.toFixed(2)} color="blue" />
            <MetricPill label="Ω" value={systemState.avgOmega.toFixed(2)} color="orange" />
            <MetricPill label="r" value={systemState.avgR.toFixed(2)} color="green" />
          </div>
          
          {/* 중앙: 건강도 */}
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-xs text-white/40 mb-1">SYSTEM HEALTH</div>
              <div className="flex items-center gap-2">
                <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${healthScore}%` }}
                    transition={{ duration: 1 }}
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full"
                  />
                </div>
                <span className="text-sm font-mono text-green-400">{healthScore}%</span>
              </div>
            </div>
          </div>
          
          {/* 오른쪽: 추가 정보 */}
          <div className="flex items-center gap-6 text-xs text-white/50">
            <div>
              <span className="text-white/30">활성률</span>
              <span className="ml-2 font-mono text-white/70">{activePercent}%</span>
            </div>
            <div>
              <span className="text-white/30">소멸 대기</span>
              <span className="ml-2 font-mono text-red-400">{systemState.pendingExtinction}</span>
            </div>
            <div>
              <span className="text-white/30">총 보상</span>
              <span className="ml-2 font-mono text-amber-400">
                ₩{(systemState.totalReward / 1000).toFixed(0)}K
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.footer>
  );
}

// 메트릭 알약
interface MetricPillProps {
  label: string;
  value: string;
  color: 'amber' | 'blue' | 'orange' | 'green';
}

function MetricPill({ label, value, color }: MetricPillProps) {
  const colors = {
    amber: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    blue: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    orange: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
    green: 'text-green-400 bg-green-400/10 border-green-400/20',
  };
  
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${colors[color]}`}>
      <span className="text-xs text-white/50">{label}</span>
      <span className="text-sm font-mono font-bold">{value}</span>
    </div>
  );
}

// 키보드 단축키 도움말
function KeyboardHelp() {
  const [show, setShow] = useState(false);
  
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '?') setShow(s => !s);
      if (e.key === 'Escape') setShow(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);
  
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setShow(false)}
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.9 }}
            className="bg-gray-900/90 border border-white/10 rounded-2xl p-6 max-w-md"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-white mb-4">⌨️ 키보드 단축키</h2>
            <div className="space-y-2 text-sm">
              <KeyboardRow keys={['드래그']} desc="카메라 회전" />
              <KeyboardRow keys={['스크롤']} desc="줌 인/아웃" />
              <KeyboardRow keys={['클릭']} desc="노드 선택" />
              <KeyboardRow keys={['?']} desc="도움말 표시/숨기기" />
              <KeyboardRow keys={['ESC']} desc="선택 해제" />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function KeyboardRow({ keys, desc }: { keys: string[]; desc: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex gap-1">
        {keys.map((key, i) => (
          <kbd
            key={i}
            className="px-2 py-1 bg-white/10 rounded text-xs font-mono text-white/80"
          >
            {key}
          </kbd>
        ))}
      </div>
      <span className="text-white/50">{desc}</span>
    </div>
  );
}

// 메인 컴포넌트
export function GalaxyCommandCenter() {
  const { initializeNodes, nodes } = useGalaxyStore();
  
  // 초기화
  useEffect(() => {
    if (nodes.length === 0) {
      initializeNodes();
    }
  }, [nodes.length, initializeNodes]);
  
  return (
    <div className="relative w-full h-screen bg-[#0a0a0f] overflow-hidden">
      {/* 3D 씬 */}
      <GalaxyScene className="absolute inset-0" />
      
      {/* UI 오버레이 */}
      <Header />
      <GalaxyDashboard />
      <SelectedNodePanel />
      <StatusBar />
      
      {/* 키보드 도움말 */}
      <KeyboardHelp />
      
      {/* 도움말 힌트 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        className="absolute bottom-20 left-1/2 -translate-x-1/2 text-white/30 text-xs"
      >
        ? 키를 눌러 단축키 확인
      </motion.div>
    </div>
  );
}

// useState import 추가
import { useState } from 'react';

export default GalaxyCommandCenter;
