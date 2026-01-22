'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, Activity, AlertTriangle, TrendingUp, Settings,
  Eye, EyeOff, RotateCcw, Maximize2, Minimize2, GripVertical,
  Plus, Trash2, ArrowLeft
} from 'lucide-react';

// ============================================
// Types
// ============================================

type PanelId = 'overview' | 'riskQueue' | 'analytics';

interface PanelConfig {
  id: PanelId;
  title: string;
  icon: React.ReactNode;
  visible: boolean;
  defaultSize: number;
  minSize: number;
}

interface GlobalState {
  state: string;
  confidence: number;
  mode: string;
  dataFreshness: number;
}

interface RiskStudent {
  id: string;
  name: string;
  riskScore: number;
  riskBand: 'critical' | 'high' | 'medium' | 'low';
  signals: string[];
  slaHours: number;
}

// ============================================
// Local Storage Hook
// ============================================

function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      return initialValue;
    }
  });

  const setValue = (value: T) => {
    try {
      setStoredValue(value);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  };

  return [storedValue, setValue];
}

// ============================================
// Resize Handle Component
// ============================================

const ResizeHandle = ({ className = '', id }: { className?: string; id?: string }) => (
  <Separator 
    className={`group relative flex items-center justify-center ${className}`}
    id={id}
  >
    <div className="w-1 h-16 bg-gray-700 rounded-full group-hover:bg-cyan-500 group-active:bg-cyan-400 transition-colors flex items-center justify-center cursor-col-resize">
      <GripVertical className="w-3 h-3 text-gray-500 group-hover:text-cyan-300 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  </Separator>
);

// ============================================
// Overview Panel Content
// ============================================

interface OverviewPanelProps {
  globalState: GlobalState;
}

const OverviewPanel: React.FC<OverviewPanelProps> = ({ globalState }) => (
  <div className="h-full p-4 overflow-y-auto">
    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
      <Building2 className="w-5 h-5 text-cyan-400" />
      Owner Overview
    </h3>
    
    {/* Summary Cards */}
    <div className="grid grid-cols-2 gap-3 mb-4">
      <div className="bg-gradient-to-br from-cyan-900/50 to-blue-900/50 border border-cyan-500/30 rounded-xl p-4">
        <p className="text-xs text-cyan-300 mb-1">이달 매출</p>
        <p className="text-2xl font-black text-white">₩127.5M</p>
        <p className="text-xs text-green-400 mt-1">+12.3% ▲</p>
      </div>
      <div className="bg-gradient-to-br from-purple-900/50 to-pink-900/50 border border-purple-500/30 rounded-xl p-4">
        <p className="text-xs text-purple-300 mb-1">재등록률</p>
        <p className="text-2xl font-black text-white">89.2%</p>
        <p className="text-xs text-green-400 mt-1">+2.1% ▲</p>
      </div>
      <div className="bg-gradient-to-br from-orange-900/50 to-red-900/50 border border-orange-500/30 rounded-xl p-4">
        <p className="text-xs text-orange-300 mb-1">위험 학생</p>
        <p className="text-2xl font-black text-white">5</p>
        <p className="text-xs text-red-400 mt-1">즉시 개입 필요</p>
      </div>
      <div className="bg-gradient-to-br from-green-900/50 to-emerald-900/50 border border-green-500/30 rounded-xl p-4">
        <p className="text-xs text-green-300 mb-1">V 점수</p>
        <p className="text-2xl font-black text-white">87.5</p>
        <p className="text-xs text-green-400 mt-1">상위 15%</p>
      </div>
    </div>

    {/* System Status */}
    <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-4">
      <h4 className="text-sm font-semibold text-gray-400 mb-3">시스템 상태</h4>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">AI 모드</span>
          <span className="text-sm text-white font-semibold">{globalState.mode.toUpperCase()}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">신뢰도</span>
          <span className={`text-sm font-semibold ${globalState.confidence > 0.7 ? 'text-green-400' : 'text-yellow-400'}`}>
            {Math.round(globalState.confidence * 100)}%
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">데이터 최신성</span>
          <span className="text-sm text-white font-semibold">{globalState.dataFreshness}초 전</span>
        </div>
      </div>
    </div>
  </div>
);

// ============================================
// Risk Queue Panel Content
// ============================================

interface RiskQueuePanelProps {
  students: RiskStudent[];
}

const RiskQueuePanel: React.FC<RiskQueuePanelProps> = ({ students }) => {
  const getRiskColor = (band: string) => {
    switch (band) {
      case 'critical': return 'bg-red-900/30 border-red-500/50 text-red-400';
      case 'high': return 'bg-orange-900/30 border-orange-500/50 text-orange-400';
      case 'medium': return 'bg-yellow-900/30 border-yellow-500/50 text-yellow-400';
      default: return 'bg-green-900/30 border-green-500/50 text-green-400';
    }
  };

  return (
    <div className="h-full p-4 overflow-y-auto">
      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-red-400" />
        Risk Queue
      </h3>

      <div className="space-y-2">
        {students.slice(0, 8).map((student, idx) => (
          <motion.div
            key={student.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            className={`p-3 rounded-lg border cursor-pointer transition-all hover:scale-[1.02] ${getRiskColor(student.riskBand)}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-white">{student.name}</p>
                <p className="text-xs opacity-70">{student.signals.join(', ')}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-lg">{student.riskScore}</p>
                <p className="text-xs opacity-50">{student.slaHours}h SLA</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// ============================================
// Analytics Panel Content
// ============================================

const AnalyticsPanel: React.FC = () => (
  <div className="h-full p-4 overflow-y-auto">
    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
      <TrendingUp className="w-5 h-5 text-green-400" />
      Live Analytics
    </h3>

    {/* Trend Chart Placeholder */}
    <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-4 mb-4">
      <h4 className="text-sm font-semibold text-gray-400 mb-3">매출 트렌드</h4>
      <div className="h-32 flex items-end justify-around gap-1">
        {[65, 72, 68, 85, 90, 88, 95, 92, 98, 105, 110, 115].map((value, idx) => (
          <div
            key={idx}
            className="bg-gradient-to-t from-cyan-600 to-cyan-400 rounded-t w-full"
            style={{ height: `${(value / 120) * 100}%` }}
          />
        ))}
      </div>
      <div className="flex justify-between mt-2 text-xs text-gray-500">
        <span>1월</span>
        <span>6월</span>
        <span>12월</span>
      </div>
    </div>

    {/* Key Metrics */}
    <div className="space-y-3">
      <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">신규 등록</span>
          <span className="text-sm font-semibold text-green-400">+23명 (이번 달)</span>
        </div>
      </div>
      <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">수업 진행률</span>
          <span className="text-sm font-semibold text-cyan-400">92.3%</span>
        </div>
      </div>
      <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">미납금 회수율</span>
          <span className="text-sm font-semibold text-yellow-400">78.5%</span>
        </div>
      </div>
    </div>
  </div>
);

// ============================================
// Panel Settings Popover
// ============================================

interface PanelSettingsProps {
  panels: PanelConfig[];
  onTogglePanel: (id: PanelId) => void;
  onReset: () => void;
}

const PanelSettings: React.FC<PanelSettingsProps> = ({ panels, onTogglePanel, onReset }) => {
  const [isOpen, setIsOpen] = useState(false);
  const visibleCount = panels.filter(p => p.visible).length;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors relative"
      >
        <Settings className="w-5 h-5 text-gray-400" />
        {/* Badge showing visible panel count */}
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-cyan-500 rounded-full text-[10px] font-bold text-black flex items-center justify-center">
          {visibleCount}
        </span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />
            
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute right-0 mt-2 w-72 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden"
            >
              {/* Header */}
              <div className="p-4 border-b border-gray-800 bg-black/40">
                <h4 className="text-sm font-bold text-white">패널 설정</h4>
                <p className="text-xs text-gray-500 mt-1">{visibleCount}개 패널 활성화됨</p>
              </div>
              
              {/* Panel List */}
              <div className="p-3 space-y-2">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Available Panels</p>
                {panels.map(panel => (
                  <button
                    key={panel.id}
                    onClick={() => onTogglePanel(panel.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg transition-all
                      ${panel.visible 
                        ? 'bg-cyan-500/20 border border-cyan-500/30 text-white' 
                        : 'bg-gray-800/50 border border-transparent text-gray-400 hover:bg-gray-800'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={panel.visible ? 'opacity-100' : 'opacity-50'}>
                        {panel.icon}
                      </span>
                      <span className="text-sm font-medium">{panel.title}</span>
                    </div>
                    <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors
                      ${panel.visible ? 'bg-cyan-500 text-black' : 'bg-gray-700 text-gray-500'}`}
                    >
                      {panel.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    </div>
                  </button>
                ))}
              </div>

              {/* Footer */}
              <div className="p-3 border-t border-gray-800 flex gap-2">
                <button
                  onClick={() => {
                    onReset();
                    setIsOpen(false);
                  }}
                  className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs font-semibold text-gray-300 flex items-center justify-center gap-2 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="flex-1 py-2.5 bg-cyan-500 hover:bg-cyan-400 rounded-lg text-xs font-bold text-black flex items-center justify-center gap-2 transition-colors"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================
// Main Multi-Panel Dashboard
// ============================================

interface MultiPanelDashboardProps {
  globalState: GlobalState;
  students: RiskStudent[];
  onClose?: () => void;
}

export const MultiPanelDashboard: React.FC<MultiPanelDashboardProps> = ({ 
  globalState, 
  students,
  onClose 
}) => {
  const defaultPanels: PanelConfig[] = [
    { 
      id: 'overview', 
      title: 'Overview', 
      icon: <Building2 className="w-4 h-4 text-cyan-400" />,
      visible: true, 
      defaultSize: 33, 
      minSize: 20 
    },
    { 
      id: 'riskQueue', 
      title: 'Risk Queue', 
      icon: <AlertTriangle className="w-4 h-4 text-red-400" />,
      visible: true, 
      defaultSize: 34, 
      minSize: 20 
    },
    { 
      id: 'analytics', 
      title: 'Analytics', 
      icon: <TrendingUp className="w-4 h-4 text-green-400" />,
      visible: true, 
      defaultSize: 33, 
      minSize: 20 
    },
  ];

  const [panels, setPanels] = useLocalStorage<PanelConfig[]>('autus-panel-config', defaultPanels);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const visiblePanels = panels.filter(p => p.visible);

  const togglePanel = (id: PanelId) => {
    setPanels(panels.map(p => 
      p.id === id ? { ...p, visible: !p.visible } : p
    ));
  };

  const resetPanels = () => {
    setPanels(defaultPanels);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <div className="h-screen bg-[#05050a] flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-3 md:px-6 py-3 md:py-4 bg-black/60 backdrop-blur-xl border-b border-gray-800/50">
        <div className="flex items-center gap-2 md:gap-4">
          {/* Logo & Title */}
          <div className="flex items-center gap-2">
            <span className="text-xl">🖥️</span>
            <div>
              <h2 className="text-sm md:text-lg font-bold text-white tracking-tight">Multi-Panel Dashboard</h2>
              <p className="text-[10px] md:text-xs text-gray-500 hidden sm:block">{visiblePanels.length}개 패널 활성</p>
            </div>
          </div>

          {/* Quick Toggles - Desktop Only */}
          <div className="hidden lg:flex items-center gap-1 ml-4 pl-4 border-l border-gray-700">
            {panels.map(panel => (
              <button
                key={panel.id}
                onClick={() => togglePanel(panel.id)}
                className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all
                  ${panel.visible 
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' 
                    : 'bg-gray-800/50 text-gray-500 hover:text-gray-300 border border-transparent'
                  }`}
              >
                {panel.title}
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex items-center gap-1.5 md:gap-2">
          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="p-2 bg-gray-800/50 hover:bg-gray-700 rounded-lg transition-colors"
            title={isFullscreen ? '전체화면 해제' : '전체화면'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4 md:w-5 md:h-5 text-gray-400" />
            ) : (
              <Maximize2 className="w-4 h-4 md:w-5 md:h-5 text-gray-400" />
            )}
          </button>
          
          {/* Settings */}
          <PanelSettings
            panels={panels}
            onTogglePanel={togglePanel}
            onReset={resetPanels}
          />

          {/* Close/Back Button */}
          {onClose && (
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-2 bg-gray-800/50 hover:bg-gray-700 rounded-lg text-xs md:text-sm font-semibold text-gray-300 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">단일 뷰로 전환</span>
            </button>
          )}
        </div>
      </header>

      {/* Panel Area */}
      {visiblePanels.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <EyeOff className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p>표시할 패널이 없습니다</p>
            <button
              onClick={resetPanels}
              className="mt-4 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-white text-sm"
            >
              기본 레이아웃 복원
            </button>
          </div>
        </div>
      ) : (
        <Group orientation="horizontal" className="flex-1">
          {visiblePanels.map((panel, index) => (
            <React.Fragment key={panel.id}>
              <Panel 
                defaultSize={panel.defaultSize} 
                minSize={panel.minSize}
                className="bg-gray-900/50 border border-gray-800 rounded-xl m-2 overflow-hidden"
              >
                {panel.id === 'overview' && <OverviewPanel globalState={globalState} />}
                {panel.id === 'riskQueue' && <RiskQueuePanel students={students} />}
                {panel.id === 'analytics' && <AnalyticsPanel />}
              </Panel>
              
              {index < visiblePanels.length - 1 && (
                <ResizeHandle id={`resize-${panel.id}`} />
              )}
            </React.Fragment>
          ))}
        </Group>
      )}
    </div>
  );
};

export default MultiPanelDashboard;
