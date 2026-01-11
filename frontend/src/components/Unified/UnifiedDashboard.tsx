/**
 * AUTUS Unified Dashboard v2.0
 * ============================
 * 
 * Single Source of Truth 백엔드와 연동
 * 
 * 구조:
 * - Mode 전환: Kernel(6노드) / UI(9포트) / Map(지도)
 * - 실시간 API 연동
 * - 통일된 디자인 시스템
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { 
  Atom, Grid3X3, Map, Activity, 
  Zap, Eye, Settings, RefreshCw, AlertCircle, Loader2
} from 'lucide-react';
import { colors, getValueColor, cn } from '../../styles/design-system';
import * as PhysicsAPI from '../../api/physics';

// ════════════════════════════════════════════════════════════════════════════════
// Types
// ════════════════════════════════════════════════════════════════════════════════

type ViewMode = 'kernel' | 'ui' | 'map';

interface KernelNode {
  id: number;
  name: string;
  energy: number;
  decay_rate: number;
  half_life: number;
  inertia: number;
  color: string;
  motion_count: number;
}

interface UIPort {
  id: string;
  name: string;
  nameKo: string;
  value: number;
  color: string;
}

interface Motion {
  timestamp: number;
  node: number;
  node_name: string;
  delta: number;
  friction: number;
  source: string;
}

// ════════════════════════════════════════════════════════════════════════════════
// Constants
// ════════════════════════════════════════════════════════════════════════════════

const UI_PORT_NAMES_KO: Record<string, string> = {
  HEALTH: '건강',
  WEALTH: '재정',
  CAREER: '커리어',
  SOCIAL: '사회',
  FAMILY: '가족',
  LEARNING: '학습',
  SECURITY: '안전',
  LEISURE: '여가',
  VALUES: '가치',
};

const UI_PORT_COLORS: Record<string, string> = {
  HEALTH: colors.ui.HEALTH,
  WEALTH: colors.ui.WEALTH,
  CAREER: colors.ui.CAREER,
  SOCIAL: colors.ui.SOCIAL,
  FAMILY: colors.ui.FAMILY,
  LEARNING: colors.ui.LEARNING,
  SECURITY: colors.ui.SECURITY,
  LEISURE: colors.ui.LEISURE,
  VALUES: colors.ui.VALUES,
};

const MODE_CONFIG = {
  kernel: { label: 'Kernel', icon: Atom, description: '6노드 물리 엔진' },
  ui: { label: 'UI', icon: Grid3X3, description: '9포트 Projection' },
  map: { label: 'Map', icon: Map, description: '지도 시각화' },
} as const;

// ════════════════════════════════════════════════════════════════════════════════
// Sub Components
// ════════════════════════════════════════════════════════════════════════════════

// SELF 중앙 오브
const SelfOrb: React.FC<{ value: number; loading?: boolean }> = ({ value, loading }) => {
  const size = 100 + value * 60;
  const color = getValueColor(value);
  const glowIntensity = value * 40;
  
  return (
    <div className="flex flex-col items-center">
      <div
        className={cn(
          "rounded-full flex items-center justify-center transition-all duration-700",
          loading && "animate-pulse"
        )}
        style={{
          width: size,
          height: size,
          background: `radial-gradient(circle, ${color}44, ${color})`,
          boxShadow: `0 0 ${glowIntensity}px ${color}66`,
        }}
      >
        {loading ? (
          <Loader2 className="w-8 h-8 text-white animate-spin" />
        ) : (
          <span className="text-3xl font-bold text-white">
            {Math.round(value * 100)}
          </span>
        )}
      </div>
      <span className="text-slate-400 mt-2 text-sm tracking-wider">SELF</span>
    </div>
  );
};

// Kernel 노드 카드
const KernelNodeCard: React.FC<{ 
  node: KernelNode; 
  onMotion: (node: number, delta: number) => void;
}> = ({ node, onMotion }) => {
  const opacity = 0.5 + node.energy * 0.5;
  
  return (
    <div
      className="p-3 rounded-lg border border-slate-700 transition-all duration-300 hover:border-slate-600 group"
      style={{ 
        backgroundColor: `${node.color}15`,
        opacity,
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-white">{node.name}</span>
        <span 
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: node.color }}
        />
      </div>
      <div className="text-2xl font-bold text-white">
        {Math.round(node.energy * 100)}
      </div>
      <div className="mt-2 h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div 
          className="h-full rounded-full transition-all duration-500"
          style={{ 
            width: `${node.energy * 100}%`,
            backgroundColor: node.color,
          }}
        />
      </div>
      <div className="flex justify-between mt-2 text-xs text-slate-500">
        <span>λ: {node.decay_rate.toFixed(4)}</span>
        <span>{node.half_life}일</span>
      </div>
      
      {/* Quick Motion Buttons */}
      <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onMotion(node.id, 0.05)}
          className="flex-1 px-2 py-1 text-xs bg-green-600/20 hover:bg-green-600/40 rounded text-green-400"
        >
          +5%
        </button>
        <button
          onClick={() => onMotion(node.id, -0.05)}
          className="flex-1 px-2 py-1 text-xs bg-red-600/20 hover:bg-red-600/40 rounded text-red-400"
        >
          -5%
        </button>
      </div>
    </div>
  );
};

// UI 포트 카드
const UIPortCard: React.FC<{ port: UIPort }> = ({ port }) => {
  const opacity = 0.6 + port.value * 0.4;
  
  return (
    <div
      className="p-3 rounded-lg transition-all duration-300 hover:scale-105 cursor-pointer border-2"
      style={{ 
        backgroundColor: `${port.color}20`,
        borderColor: `${port.color}40`,
        opacity,
      }}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-slate-400">{port.nameKo}</span>
        <span 
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: port.color }}
        />
      </div>
      <div className="text-xl font-bold text-white">
        {Math.round(port.value * 100)}
      </div>
    </div>
  );
};

// 모드 선택기
const ModeSelector: React.FC<{
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}> = ({ mode, onChange }) => {
  return (
    <div className="flex bg-slate-800 rounded-lg p-1 gap-1">
      {(Object.keys(MODE_CONFIG) as ViewMode[]).map((m) => {
        const config = MODE_CONFIG[m];
        const Icon = config.icon;
        const isActive = mode === m;
        
        return (
          <button
            key={m}
            onClick={() => onChange(m)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-md transition-all duration-200",
              isActive 
                ? "bg-cyan-600 text-white" 
                : "text-slate-400 hover:text-white hover:bg-slate-700"
            )}
          >
            <Icon className="w-4 h-4" />
            <span className="text-sm font-medium">{config.label}</span>
          </button>
        );
      })}
    </div>
  );
};

// 물리 법칙 패널
const PhysicsLawsPanel: React.FC = () => {
  return (
    <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
      <h3 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
        <Zap className="w-4 h-4" />
        물리 법칙
      </h3>
      <div className="space-y-2 text-xs font-mono">
        <div className="flex justify-between text-slate-500">
          <span>감쇠</span>
          <span className="text-slate-400">E × e⁻λΔt</span>
        </div>
        <div className="flex justify-between text-slate-500">
          <span>마찰</span>
          <span className="text-slate-400">E × (1-R)</span>
        </div>
        <div className="flex justify-between text-slate-500">
          <span>관성</span>
          <span className="text-slate-400">Δ × (1-I)</span>
        </div>
      </div>
    </div>
  );
};

// Motion 로그
const MotionLog: React.FC<{ motions: Motion[] }> = ({ motions }) => {
  return (
    <div className="space-y-2 max-h-40 overflow-y-auto">
      {motions.length === 0 ? (
        <p className="text-xs text-slate-600 text-center py-4">
          Motion 없음
        </p>
      ) : (
        motions.map((m, i) => (
          <div key={i} className="text-xs bg-slate-900 rounded p-2">
            <div className="flex justify-between">
              <span className="text-slate-300">{m.node_name}</span>
              <span className={m.delta > 0 ? "text-green-400" : "text-red-400"}>
                {m.delta > 0 ? '+' : ''}{(m.delta * 100).toFixed(1)}%
              </span>
            </div>
            <div className="text-slate-600 mt-0.5">
              {m.source} • {new Date(m.timestamp).toLocaleTimeString()}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════════
// Main Component
// ════════════════════════════════════════════════════════════════════════════════

export const UnifiedDashboard: React.FC = () => {
  const [mode, setMode] = useState<ViewMode>('kernel');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State from API
  const [kernelNodes, setKernelNodes] = useState<KernelNode[]>([]);
  const [uiPorts, setUiPorts] = useState<UIPort[]>([]);
  const [selfValue, setSelfValue] = useState(0.5);
  const [motionCount, setMotionCount] = useState(0);
  const [recentMotions, setRecentMotions] = useState<Motion[]>([]);
  
  // Fetch state from API
  const fetchState = useCallback(async () => {
    try {
      setError(null);
      
      // Try to fetch from Kernel API
      const kernelRes = await fetch('http://localhost:8000/api/kernel/nodes');
      
      if (kernelRes.ok) {
        const kernelData = await kernelRes.json();
        
        // Map kernel data to our format
        const nodes: KernelNode[] = kernelData.map((n: any) => ({
          id: n.id,
          name: n.name,
          energy: n.value,
          decay_rate: 0.01,
          half_life: 30,
          inertia: 0.3,
          color: colors.kernel[n.name as keyof typeof colors.kernel] || '#666',
          motion_count: n.motion_count || 0,
        }));
        setKernelNodes(nodes);
        
        // Calculate self value from average
        const avg = nodes.reduce((sum: number, n: KernelNode) => sum + n.energy, 0) / nodes.length;
        setSelfValue(avg);
        setMotionCount(nodes.reduce((sum: number, n: KernelNode) => sum + n.motion_count, 0));
        
        // Mock UI ports from kernel data
        const portNames = Object.keys(UI_PORT_NAMES_KO);
        const ports: UIPort[] = portNames.map((name, i) => ({
          id: name,
          name,
          nameKo: UI_PORT_NAMES_KO[name] || name,
          value: nodes[i % nodes.length]?.energy || 0.5,
          color: UI_PORT_COLORS[name] || '#666',
        }));
        setUiPorts(ports);
        
        // Fetch motion log
        try {
          const logRes = await fetch('http://localhost:8000/api/kernel/log?limit=10');
          if (logRes.ok) {
            const logData = await logRes.json();
            setRecentMotions(logData.map((m: any) => ({
              timestamp: m.timestamp * 1000,
              node: 0,
              node_name: m.to || m.from || 'UNKNOWN',
              delta: m.delta,
              friction: m.friction,
              source: m.motion,
            })));
          }
        } catch {
          setRecentMotions([]);
        }
        
      } else {
        throw new Error('API not available');
      }
      
    } catch (err) {
      console.error('Failed to fetch state:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch state');
      
      // Fallback to mock data
      setKernelNodes([
        { id: 0, name: 'BIO', energy: 0.65, decay_rate: 0.231, half_life: 3, inertia: 0.1, color: colors.kernel.BIO, motion_count: 0 },
        { id: 1, name: 'CAPITAL', energy: 0.52, decay_rate: 0.0019, half_life: 365, inertia: 0.6, color: colors.kernel.CAPITAL, motion_count: 0 },
        { id: 2, name: 'COGNITION', energy: 0.58, decay_rate: 0.0495, half_life: 14, inertia: 0.3, color: colors.kernel.COGNITION, motion_count: 0 },
        { id: 3, name: 'RELATION', energy: 0.71, decay_rate: 0.0231, half_life: 30, inertia: 0.4, color: colors.kernel.RELATION, motion_count: 0 },
        { id: 4, name: 'ENVIRONMENT', energy: 0.45, decay_rate: 0.0077, half_life: 90, inertia: 0.7, color: colors.kernel.ENVIRONMENT, motion_count: 0 },
        { id: 5, name: 'SECURITY', energy: 0.55, decay_rate: 0.00019, half_life: 3650, inertia: 0.9, color: colors.kernel.SECURITY, motion_count: 0 },
      ]);
      
      const portNames = Object.keys(UI_PORT_NAMES_KO);
      setUiPorts(portNames.map((name) => ({
        id: name,
        name,
        nameKo: UI_PORT_NAMES_KO[name] || name,
        value: 0.5 + Math.random() * 0.3,
        color: UI_PORT_COLORS[name] || '#666',
      })));
      
      setSelfValue(0.54);
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Initial fetch
  useEffect(() => {
    fetchState();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchState, 30000);
    return () => clearInterval(interval);
  }, [fetchState]);
  
  // Apply motion
  const handleMotion = useCallback(async (nodeIndex: number, delta: number) => {
    try {
      await PhysicsAPI.applyMotion({ 
        physics: nodeIndex, 
        motion: delta > 0 ? 0 : 1, // 0=INPUT, 1=OUTPUT
        delta: Math.abs(delta), 
        friction: 0.1, 
        source: 'dashboard' 
      });
      await fetchState();
    } catch (err) {
      console.error('Failed to apply motion:', err);
    }
  }, [fetchState]);
  
  return (
    <div className="min-h-full h-full bg-slate-900 text-white">
      {/* Header */}
      <header className="border-b border-slate-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Atom className="w-6 h-6 text-cyan-400" />
              AUTUS
            </h1>
            <ModeSelector mode={mode} onChange={setMode} />
          </div>
          
          <div className="flex items-center gap-3">
            {error && (
              <div className="flex items-center gap-2 text-yellow-400 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>오프라인 모드</span>
              </div>
            )}
            <button 
              onClick={fetchState}
              className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 transition-colors"
              disabled={loading}
            >
              <RefreshCw className={cn("w-5 h-5", loading && "animate-spin")} />
            </button>
            <button className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 transition-colors">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <p className="text-sm text-slate-500 mt-1">
          {MODE_CONFIG[mode].description} • {motionCount} motions
        </p>
      </header>
      
      {/* Main Content */}
      <main className="p-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Left Panel - SELF */}
          <div className="col-span-12 lg:col-span-3">
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <SelfOrb value={selfValue} loading={loading} />
              
              <div className="mt-6">
                <PhysicsLawsPanel />
              </div>
              
              {/* Recent Motions */}
              <div className="mt-4">
                <h3 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  최근 Motion
                </h3>
                <MotionLog motions={recentMotions} />
              </div>
            </div>
          </div>
          
          {/* Center Panel - Nodes/Ports */}
          <div className="col-span-12 lg:col-span-6">
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                {mode === 'kernel' ? (
                  <>
                    <Atom className="w-5 h-5 text-cyan-400" />
                    Kernel Layer (6 Physics Nodes)
                  </>
                ) : mode === 'ui' ? (
                  <>
                    <Grid3X3 className="w-5 h-5 text-violet-400" />
                    Projection Layer (9 UI Ports)
                  </>
                ) : (
                  <>
                    <Map className="w-5 h-5 text-emerald-400" />
                    Map View
                  </>
                )}
              </h2>
              
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                </div>
              ) : mode === 'kernel' ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {kernelNodes.map(node => (
                    <KernelNodeCard 
                      key={node.id} 
                      node={node} 
                      onMotion={handleMotion}
                    />
                  ))}
                </div>
              ) : mode === 'ui' ? (
                <div className="grid grid-cols-3 gap-3">
                  {uiPorts.map(port => (
                    <UIPortCard key={port.id} port={port} />
                  ))}
                </div>
              ) : (
                <div className="h-96 bg-slate-900 rounded-lg flex items-center justify-center text-slate-500">
                  <div className="text-center">
                    <Map className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>지도 뷰</p>
                    <p className="text-xs text-slate-600 mt-1">별도 Map 컴포넌트 연동</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Layer Connection Diagram */}
            {mode === 'ui' && (
              <div className="mt-4 bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <h3 className="text-sm font-medium text-slate-400 mb-3">
                  Kernel → Projection 매핑
                </h3>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="text-slate-500">HEALTH ← BIO</div>
                  <div className="text-slate-500">WEALTH ← CAPITAL</div>
                  <div className="text-slate-500">CAREER ← COG+REL</div>
                  <div className="text-slate-500">SOCIAL ← RELATION</div>
                  <div className="text-slate-500">FAMILY ← REL+BIO</div>
                  <div className="text-slate-500">LEARNING ← COGNITION</div>
                  <div className="text-slate-500">SECURITY ← CAP+ENV</div>
                  <div className="text-slate-500">LEISURE ← BIO×COG</div>
                  <div className="text-slate-500">VALUES ← LEGACY</div>
                </div>
              </div>
            )}
          </div>
          
          {/* Right Panel - Stats & Actions */}
          <div className="col-span-12 lg:col-span-3">
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Eye className="w-5 h-5 text-slate-400" />
                상태 요약
              </h3>
              
              {/* Summary Stats */}
              <div className="space-y-4">
                <div className="bg-slate-900 rounded-lg p-3">
                  <div className="text-xs text-slate-500 mb-1">SELF 평균</div>
                  <div className="text-2xl font-bold" style={{ color: getValueColor(selfValue) }}>
                    {Math.round(selfValue * 100)}%
                  </div>
                </div>
                
                <div className="bg-slate-900 rounded-lg p-3">
                  <div className="text-xs text-slate-500 mb-1">활성 노드</div>
                  <div className="text-2xl font-bold text-white">
                    {kernelNodes.filter(n => n.energy > 0.5).length}
                    <span className="text-slate-500 text-sm font-normal">/6</span>
                  </div>
                </div>
                
                <div className="bg-slate-900 rounded-lg p-3">
                  <div className="text-xs text-slate-500 mb-1">총 Motion</div>
                  <div className="text-2xl font-bold text-white">
                    {motionCount}
                  </div>
                </div>
              </div>
              
              {/* Quick Actions */}
              <div className="mt-6">
                <h4 className="text-sm font-medium text-slate-400 mb-3">빠른 Motion</h4>
                <div className="grid grid-cols-2 gap-2">
                  {kernelNodes.slice(0, 4).map(node => (
                    <button
                      key={node.id}
                      onClick={() => handleMotion(node.id, 0.05)}
                      className="px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-medium transition-colors"
                      style={{ borderLeft: `3px solid ${node.color}` }}
                    >
                      +{node.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="border-t border-slate-800 px-6 py-3">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>AUTUS PhysicsEngine v1.0 — Single Source of Truth</span>
          <span>관찰자 모드 활성</span>
        </div>
      </footer>
    </div>
  );
};

export default UnifiedDashboard;