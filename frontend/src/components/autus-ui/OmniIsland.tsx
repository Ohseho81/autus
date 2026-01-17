/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OmniIsland - 플로팅 액션 허브 (모바일/태블릿)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { 
  Home, Globe, TrendingUp, Zap, Bell, 
  ChevronUp, ChevronDown, Sparkles, MessageCircle, Settings, Maximize2
} from 'lucide-react';
import { cn } from '../../styles/autus-design-system';
import { springs } from '../../lib/animations/framer-presets';

type IslandMode = 'compact' | 'expanded' | 'fullscreen' | 'mini';

interface OmniIslandProps {
  kIndex?: number;
  iIndex?: number;
  currentPath?: string;
  alerts?: number;
  automationProgress?: number;
  onNavigate?: (path: string) => void;
}

const navItems = [
  { id: 'home', icon: Home, label: '홈', path: '/' },
  { id: 'galaxy', icon: Globe, label: '은하계', path: '/galaxy' },
  { id: 'trajectory', icon: TrendingUp, label: '궤적', path: '/trajectory' },
  { id: 'automation', icon: Zap, label: '자동화', path: '/automation' },
  { id: 'alerts', icon: Bell, label: '경고', path: '/alerts' },
];

export function OmniIsland({ 
  kIndex = 0.45,
  iIndex = 0.62,
  currentPath = '/', 
  alerts = 0, 
  automationProgress = 0,
  onNavigate 
}: OmniIslandProps) {
  const [mode, setMode] = useState<IslandMode>('compact');
  const [activeContext, setActiveContext] = useState<'nav' | 'ai' | 'alert' | 'stats'>('nav');
  const ref = useRef<HTMLDivElement>(null);
  
  // 스크롤에 따른 축소
  const scrollY = useMotionValue(0);
  useEffect(() => {
    const handleScroll = () => scrollY.set(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [scrollY]);
  
  const islandScale = useTransform(scrollY, [0, 100], [1, 0.85]);

  const handleItemClick = (path: string) => {
    onNavigate?.(path);
  };

  return (
    <motion.div
      ref={ref}
      className="fixed bottom-6 left-1/2 z-50"
      style={{ x: '-50%', scale: islandScale }}
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={springs.default}
    >
      <AnimatePresence mode="wait">
        {mode === 'compact' && (
          <CompactIsland
            kIndex={kIndex}
            iIndex={iIndex}
            currentPath={currentPath}
            alerts={alerts}
            automationProgress={automationProgress}
            onExpand={() => setMode('expanded')}
            onNavigate={handleItemClick}
            onContextChange={setActiveContext}
          />
        )}
        
        {mode === 'expanded' && (
          <ExpandedIsland
            kIndex={kIndex}
            iIndex={iIndex}
            alerts={alerts}
            activeContext={activeContext}
            onCollapse={() => setMode('compact')}
            onFullscreen={() => setMode('fullscreen')}
            onContextChange={setActiveContext}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Compact 모드
function CompactIsland({ 
  kIndex, iIndex, currentPath, alerts, automationProgress,
  onExpand, onNavigate, onContextChange 
}: {
  kIndex: number;
  iIndex: number;
  currentPath: string;
  alerts: number;
  automationProgress: number;
  onExpand: () => void;
  onNavigate: (path: string) => void;
  onContextChange: (context: 'nav' | 'ai' | 'alert' | 'stats') => void;
}) {
  const [aiMode, setAiMode] = useState(false);

  return (
    <motion.div
      className="flex items-center gap-2 px-3 py-2 bg-black/90 backdrop-blur-2xl rounded-full border border-white/10 shadow-2xl"
      initial={{ width: 200, opacity: 0 }}
      animate={{ width: 'auto', opacity: 1 }}
      exit={{ width: 100, opacity: 0, y: 50 }}
      layout
    >
      <AnimatePresence mode="wait">
        {!aiMode ? (
          <motion.div
            className="flex items-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* K/I 미니 표시 */}
            <div className="flex items-center gap-3 px-2">
              <MiniMetric label="K" value={kIndex} />
              <div className="w-px h-6 bg-white/10" />
              <MiniMetric label="I" value={iIndex} />
            </div>
            
            <div className="w-px h-8 bg-white/10 mx-1" />
            
            {/* 네비게이션 */}
            <div className="flex items-center gap-1">
              {navItems.map((item) => (
                <IconButton
                  key={item.id}
                  icon={item.icon}
                  isActive={currentPath === item.path}
                  badge={item.id === 'alerts' ? alerts : item.id === 'automation' ? automationProgress : undefined}
                  onClick={() => onNavigate(item.path)}
                />
              ))}
            </div>
            
            {/* 확장 버튼 */}
            <motion.button
              className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-white/10 transition-colors"
              onClick={onExpand}
              whileTap={{ scale: 0.9 }}
            >
              <ChevronUp className="w-4 h-4 text-white/60" />
            </motion.button>
            
            <div className="w-px h-8 bg-white/10 mx-1" />
            
            {/* AI 버튼 */}
            <motion.button
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 hover:border-cyan-500/50 transition-colors"
              onClick={() => setAiMode(true)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span className="text-sm text-cyan-300">AI</span>
            </motion.button>
          </motion.div>
        ) : (
          <motion.div
            className="flex items-center gap-3 w-80"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              onClick={() => setAiMode(false)}
              className="p-2 rounded-full hover:bg-white/10"
            >
              <ChevronDown className="w-4 h-4 text-white/60 -rotate-90" />
            </button>
            
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="무엇이든 물어보세요..."
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-full text-white placeholder:text-white/30 focus:outline-none focus:border-cyan-500/50 text-sm"
                autoFocus
              />
              <Sparkles className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Expanded 모드
function ExpandedIsland({ 
  kIndex, iIndex, alerts, activeContext,
  onCollapse, onFullscreen, onContextChange 
}: {
  kIndex: number;
  iIndex: number;
  alerts: number;
  activeContext: 'nav' | 'ai' | 'alert' | 'stats';
  onCollapse: () => void;
  onFullscreen: () => void;
  onContextChange: (context: 'nav' | 'ai' | 'alert' | 'stats') => void;
}) {
  return (
    <motion.div
      className="w-[380px] bg-black/95 backdrop-blur-2xl rounded-3xl border border-white/10 overflow-hidden shadow-2xl"
      initial={{ width: 200, height: 48, opacity: 0 }}
      animate={{ width: 380, height: 'auto', opacity: 1 }}
      exit={{ width: 200, height: 48, opacity: 0 }}
      layout
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-gradient-to-r from-cyan-500/5 to-purple-500/5">
        <div className="flex items-center gap-4">
          <GaugeRing value={kIndex} label="K" />
          <GaugeRing value={iIndex} label="I" />
        </div>
        
        <div className="flex items-center gap-2">
          <button onClick={onFullscreen} className="p-2 hover:bg-white/5 rounded-lg">
            <Maximize2 className="w-4 h-4 text-white/60" />
          </button>
          <button onClick={onCollapse} className="p-2 hover:bg-white/5 rounded-lg">
            <ChevronDown className="w-4 h-4 text-white/60" />
          </button>
        </div>
      </div>
      
      {/* 컨텐츠 */}
      <div className="p-4">
        {activeContext === 'stats' && <QuickStats kIndex={kIndex} iIndex={iIndex} />}
        {activeContext === 'nav' && <QuickNav />}
        {activeContext === 'ai' && <AIQuickChat />}
      </div>
      
      {/* 탭 바 */}
      <div className="flex border-t border-white/5">
        <ContextTab 
          icon={TrendingUp} 
          label="Stats" 
          active={activeContext === 'stats'} 
          onClick={() => onContextChange('stats')}
        />
        <ContextTab 
          icon={Home} 
          label="Nav" 
          active={activeContext === 'nav'} 
          onClick={() => onContextChange('nav')}
        />
        <ContextTab 
          icon={Sparkles} 
          label="AI" 
          active={activeContext === 'ai'} 
          onClick={() => onContextChange('ai')}
        />
        <ContextTab 
          icon={Bell} 
          label="Alerts" 
          active={activeContext === 'alert'} 
          badge={alerts}
          onClick={() => onContextChange('alert')}
        />
      </div>
    </motion.div>
  );
}

// 미니 메트릭
function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-[10px] text-white/40">{label}</span>
      <span className={cn(
        "text-sm font-mono font-bold",
        value >= 0 ? "text-cyan-400" : "text-purple-400"
      )}>
        {value >= 0 ? '+' : ''}{value.toFixed(2)}
      </span>
    </div>
  );
}

// 아이콘 버튼
function IconButton({ 
  icon: Icon, 
  isActive, 
  badge, 
  onClick 
}: { 
  icon: React.ElementType; 
  isActive?: boolean; 
  badge?: number;
  onClick?: () => void;
}) {
  return (
    <motion.button
      className={cn(
        "relative flex items-center justify-center w-10 h-10 rounded-full transition-colors",
        isActive ? "bg-white/10 text-white" : "text-white/60 hover:text-white hover:bg-white/5"
      )}
      onClick={onClick}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <Icon className="w-5 h-5" />
      {badge !== undefined && badge > 0 && (
        <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[16px] h-4 px-1 text-[10px] font-bold text-white bg-rose-500 rounded-full">
          {badge > 99 ? '99+' : badge}
        </span>
      )}
      {isActive && (
        <motion.div
          className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-cyan-400"
          layoutId="omni-indicator"
        />
      )}
    </motion.button>
  );
}

// 게이지 링
function GaugeRing({ value, label }: { value: number; label: string }) {
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const normalizedValue = (value + 1) / 2;
  const offset = circumference * (1 - normalizedValue);

  return (
    <div className="relative w-12 h-12">
      <svg className="w-full h-full transform -rotate-90">
        <circle
          cx="24"
          cy="24"
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="4"
        />
        <circle
          cx="24"
          cy="24"
          r={radius}
          fill="none"
          stroke={value >= 0 ? '#22d3ee' : '#a855f7'}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[10px] text-white/40">{label}</span>
        <span className="text-xs font-mono font-bold text-white">
          {value >= 0 ? '+' : ''}{value.toFixed(1)}
        </span>
      </div>
    </div>
  );
}

// 컨텍스트 탭
function ContextTab({ 
  icon: Icon, 
  label, 
  active, 
  badge,
  onClick 
}: { 
  icon: React.ElementType; 
  label: string; 
  active: boolean;
  badge?: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 flex flex-col items-center gap-1 py-2 transition-colors",
        active ? "text-cyan-400" : "text-white/40 hover:text-white/60"
      )}
    >
      <div className="relative">
        <Icon className="w-4 h-4" />
        {badge !== undefined && badge > 0 && (
          <span className="absolute -top-1 -right-2 w-3 h-3 rounded-full bg-rose-500 text-[8px] font-bold text-white flex items-center justify-center">
            {badge}
          </span>
        )}
      </div>
      <span className="text-[10px]">{label}</span>
    </button>
  );
}

// 퀵 스탯
function QuickStats({ kIndex, iIndex }: { kIndex: number; iIndex: number }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <StatCard label="K-INDEX" value={`${kIndex >= 0 ? '+' : ''}${kIndex.toFixed(2)}`} delta="+2.1%" />
      <StatCard label="I-INDEX" value={`${iIndex >= 0 ? '+' : ''}${iIndex.toFixed(2)}`} delta="+1.3%" />
      <StatCard label="ENTROPY" value="15%" delta="-3.2%" />
    </div>
  );
}

function StatCard({ label, value, delta }: { label: string; value: string; delta: string }) {
  const isPositive = delta.startsWith('+');
  return (
    <div className="p-3 rounded-xl bg-white/5 border border-white/10">
      <div className="text-[10px] text-white/50 mb-1">{label}</div>
      <div className="text-lg font-bold font-mono text-white">{value}</div>
      <div className={cn("text-xs", isPositive ? "text-emerald-400" : "text-rose-400")}>
        {delta}
      </div>
    </div>
  );
}

// 퀵 내비
function QuickNav() {
  return (
    <div className="grid grid-cols-2 gap-2">
      {navItems.map((item) => (
        <button
          key={item.id}
          className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-left"
        >
          <item.icon className="w-5 h-5 text-cyan-400" />
          <span className="text-sm text-white">{item.label}</span>
        </button>
      ))}
    </div>
  );
}

// AI 퀵챗
function AIQuickChat() {
  return (
    <div className="space-y-3">
      <div className="text-xs text-white/50 text-center">무엇이든 물어보세요</div>
      <div className="grid grid-cols-2 gap-2">
        {['K-지수 분석', '미래 예측', '자동화 제안', '경고 확인'].map((q) => (
          <button
            key={q}
            className="p-2 text-xs text-white/70 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}

export default OmniIsland;
