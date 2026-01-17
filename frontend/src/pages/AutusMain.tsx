// ═══════════════════════════════════════════════════════════════════════════════
// AUTUS v4.0 - Main Application (Full Integration)
// ═══════════════════════════════════════════════════════════════════════════════
//
// Step 1~5 통합:
// - The Soul: 데이터 스키마 (schema.ts)
// - The World: 물리 엔진 (altitudeEngine.ts)
// - The Body: 고도별 UI (LOD 기반)
// - The Mind: Gravity System (gravitySystem.ts)
// - The Skin: 시각적 완성도 (CommandCenterV2)
//
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import {
  KScale,
  SCALE_CONFIGS,
  AutusTask,
  createTask,
} from '../core/schema';

import {
  useAltitude,
  isInScaleRange,
} from '../core/altitudeEngine';

import {
  useGravitySystem,
  GravityAlert,
  UserPermissions,
} from '../core/gravitySystem';

// ═══════════════════════════════════════════════════════════════════════════════
// 타입
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULT_USER_PERMISSIONS: UserPermissions = {
  userId: 'user-001',
  maxScale: 7,
  authorities: ['individual', 'site_manager', 'middle_manager', 'executive', 'board'],
  canOverride: false,
  overrideLog: [],
};

// ═══════════════════════════════════════════════════════════════════════════════
// UI 컴포넌트: 알림 토스트
// ═══════════════════════════════════════════════════════════════════════════════

function AlertToast({ alerts }: { alerts: GravityAlert[] }) {
  return (
    <div className="fixed top-20 right-6 z-50 space-y-2 max-w-sm">
      <AnimatePresence>
        {alerts.map((alert) => (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            className={`
              px-4 py-3 rounded-xl border backdrop-blur-lg
              ${alert.type === 'critical' ? 'bg-red-500/20 border-red-500/40' : ''}
              ${alert.type === 'warning' ? 'bg-amber-500/20 border-amber-500/40' : ''}
              ${alert.type === 'info' ? 'bg-blue-500/20 border-blue-500/40' : ''}
            `}
          >
            <div className="flex items-start gap-2">
              <span className="text-lg">
                {alert.type === 'critical' && '🚨'}
                {alert.type === 'warning' && '⚠️'}
                {alert.type === 'info' && 'ℹ️'}
              </span>
              <div>
                <div className={`
                  text-sm font-semibold
                  ${alert.type === 'critical' ? 'text-red-400' : ''}
                  ${alert.type === 'warning' ? 'text-amber-400' : ''}
                  ${alert.type === 'info' ? 'text-blue-400' : ''}
                `}>
                  K{alert.scale} 트리거
                </div>
                <div className="text-xs text-white/70 mt-1">{alert.message}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// UI 컴포넌트: K-Scale 표시기
// ═══════════════════════════════════════════════════════════════════════════════

function ScaleIndicator({ 
  currentScale, 
  maxScale, 
  isLocked 
}: { 
  currentScale: KScale; 
  maxScale: KScale;
  isLocked: boolean;
}) {
  const config = SCALE_CONFIGS[currentScale];
  
  return (
    <div className="flex items-center gap-4">
      {/* 현재 스케일 */}
      <motion.div
        key={currentScale}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex items-center gap-3"
      >
        <div 
          className="w-16 h-16 rounded-2xl flex items-center justify-center font-bold text-2xl font-mono"
          style={{
            backgroundColor: `${config.ui.color}20`,
            border: `2px solid ${config.ui.color}`,
            color: config.ui.color,
            boxShadow: `0 0 30px ${config.ui.glowColor}`,
          }}
        >
          K{currentScale}
        </div>
        <div>
          <div className="text-lg font-semibold text-white">{config.nameKo}</div>
          <div className="text-sm text-white/50">
            {config.authorityKo} · {config.failureTimeKo}
          </div>
        </div>
      </motion.div>
      
      {/* 잠금 표시 */}
      {isLocked && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="px-3 py-1.5 bg-red-500/20 border border-red-500/40 rounded-full flex items-center gap-2"
        >
          <span>🔒</span>
          <span className="text-xs text-red-400 font-semibold">고도 잠금</span>
        </motion.div>
      )}
      
      {/* 최대 스케일 표시 */}
      <div className="text-xs text-white/30">
        최대: K{maxScale}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// UI 컴포넌트: 줌 슬라이더
// ═══════════════════════════════════════════════════════════════════════════════

function ZoomSlider({ 
  zoomLevel, 
  onChange,
  maxScale,
}: { 
  zoomLevel: number; 
  onChange: (level: number) => void;
  maxScale: KScale;
}) {
  const maxZoom = (maxScale - 1) / 9; // K1=0, K10=1
  
  return (
    <div className="w-48">
      <div className="flex justify-between text-xs text-white/40 mb-1">
        <span>K1</span>
        <span>K{maxScale}</span>
      </div>
      <input
        type="range"
        min={0}
        max={maxZoom}
        step={0.01}
        value={Math.min(zoomLevel, maxZoom)}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-4
          [&::-webkit-slider-thumb]:h-4
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-amber-400
          [&::-webkit-slider-thumb]:cursor-pointer
          [&::-webkit-slider-thumb]:shadow-lg
          [&::-webkit-slider-thumb]:shadow-amber-500/50
        "
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// UI 컴포넌트: K1~K3 (Tactical UI)
// ═══════════════════════════════════════════════════════════════════════════════

function TacticalUI({ tasks }: { tasks: AutusTask[] }) {
  return (
    <div className="p-6 space-y-4">
      <h2 className="text-xl font-bold text-white flex items-center gap-2">
        <span className="text-2xl">📋</span>
        실행 대기 작업
      </h2>
      
      <div className="grid gap-3">
        {tasks.filter(t => t.scale.value <= 3).slice(0, 5).map((task) => (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-white">{task.name}</h3>
                <p className="text-sm text-white/50">{task.domain}</p>
              </div>
              <div 
                className="px-2 py-1 rounded text-xs font-mono"
                style={{
                  backgroundColor: `${SCALE_CONFIGS[task.scale.value].ui.color}20`,
                  color: SCALE_CONFIGS[task.scale.value].ui.color,
                }}
              >
                K{task.scale.value}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// UI 컴포넌트: K4~K6 (Strategic UI)
// ═══════════════════════════════════════════════════════════════════════════════

function StrategicUI({ tasks }: { tasks: AutusTask[] }) {
  return (
    <div className="p-6 space-y-4">
      <h2 className="text-xl font-bold text-white flex items-center gap-2">
        <span className="text-2xl">🎯</span>
        전략적 결정
      </h2>
      
      <div className="grid grid-cols-2 gap-4">
        {tasks.filter(t => t.scale.value >= 4 && t.scale.value <= 6).slice(0, 4).map((task) => {
          const config = SCALE_CONFIGS[task.scale.value];
          return (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-5 rounded-2xl border"
              style={{
                backgroundColor: `${config.ui.color}10`,
                borderColor: `${config.ui.color}30`,
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <div 
                  className="px-2 py-1 rounded text-xs font-mono font-bold"
                  style={{ backgroundColor: `${config.ui.color}30`, color: config.ui.color }}
                >
                  K{task.scale.value}
                </div>
                <span className="text-xs text-white/40">{config.authorityKo}</span>
              </div>
              
              <h3 className="font-semibold text-white mb-2">{task.name}</h3>
              
              <div className="flex items-center gap-2">
                <div className="text-xs px-2 py-1 bg-black/30 rounded text-white/60">
                  비가역성: {Math.round(task.irreversibility.omega * 100)}%
                </div>
                <div className="text-xs px-2 py-1 bg-black/30 rounded text-white/60">
                  확인: {task.irreversibility.confirmSteps}단계
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// UI 컴포넌트: K7~K10 (Universal UI)
// ═══════════════════════════════════════════════════════════════════════════════

function UniversalUI({ tasks }: { tasks: AutusTask[] }) {
  return (
    <div className="p-6 space-y-4">
      <h2 className="text-xl font-bold text-white flex items-center gap-2">
        <span className="text-2xl">🌌</span>
        문명급 의사결정
      </h2>
      
      <div className="text-center py-12">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
          className="w-32 h-32 mx-auto mb-6 rounded-full flex items-center justify-center"
          style={{
            background: 'radial-gradient(circle, rgba(255,215,0,0.3) 0%, transparent 70%)',
            boxShadow: '0 0 60px rgba(255, 215, 0, 0.3)',
          }}
        >
          <span className="text-5xl">🏛️</span>
        </motion.div>
        
        <h3 className="text-2xl font-bold text-amber-400 mb-2">헌법 수준의 결정</h3>
        <p className="text-white/50 max-w-md mx-auto">
          이 고도에서의 결정은 문명 단위의 영향을 미칩니다.
          최고 수준의 승인이 필요합니다.
        </p>
        
        <div className="mt-6 inline-block px-4 py-2 bg-red-500/20 border border-red-500/40 rounded-full">
          <span className="text-red-400 text-sm">
            ⚠️ 비가역성 100% - 창시자/헌법 승인 필요
          </span>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 메인 애플리케이션
// ═══════════════════════════════════════════════════════════════════════════════

export function AutusMain() {
  // 고도 엔진
  const {
    state: altitudeState,
    goToScale,
    setZoomLevel,
    handleWheel,
    setMaxAllowedScale,
  } = useAltitude();
  
  // 중력 시스템
  const {
    state: gravityState,
    alerts,
    analyzeTask,
    forceScaleUp,
  } = useGravitySystem(DEFAULT_USER_PERMISSIONS);
  
  // 샘플 태스크
  const [tasks, setTasks] = useState<AutusTask[]>([]);
  
  // 초기화
  useEffect(() => {
    setMaxAllowedScale(DEFAULT_USER_PERMISSIONS.maxScale as KScale);
    
    // 샘플 태스크 생성
    const sampleTasks: AutusTask[] = [
      createTask({ name: '이메일 답장', domain: 'service' }),
      createTask({ name: '팀 미팅 일정 조율', domain: 'hr' }),
      createTask({ name: '분기 예산 검토', domain: 'finance', scale: { value: 4, isAutoDetected: false } }),
      createTask({ name: '신규 사업 투자 검토', domain: 'strategy', scale: { value: 5, isAutoDetected: false }, failureCost: { time: { value: 3, unit: 'months' }, money: { value: 500_000_000, currency: 'KRW' } } }),
      createTask({ name: '해외 법인 설립', domain: 'legal', scale: { value: 7, isAutoDetected: false } }),
    ];
    
    setTasks(sampleTasks);
  }, []);
  
  // 휠 이벤트
  useEffect(() => {
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      handleWheel(e);
    };
    
    window.addEventListener('wheel', handler, { passive: false });
    return () => window.removeEventListener('wheel', handler);
  }, [handleWheel]);
  
  // 현재 고도에 맞는 UI 렌더링
  const renderLODUI = () => {
    const scale = altitudeState.currentScale;
    
    if (scale <= 3) return <TacticalUI tasks={tasks} />;
    if (scale <= 6) return <StrategicUI tasks={tasks} />;
    return <UniversalUI tasks={tasks} />;
  };
  
  const currentConfig = SCALE_CONFIGS[altitudeState.currentScale];
  
  return (
    <div 
      className="min-h-screen bg-[#0a0a0f] text-white overflow-hidden"
      style={{
        // 색온도 필터
        filter: currentConfig.ui.temperature < 5000 
          ? 'sepia(0.1)' 
          : currentConfig.ui.temperature > 8000 
            ? 'hue-rotate(5deg) saturate(0.9)' 
            : 'none',
      }}
    >
      {/* 배경 */}
      <div 
        className="fixed inset-0 transition-all duration-1000"
        style={{
          background: `radial-gradient(ellipse at center, ${currentConfig.ui.color}10 0%, #0a0a0f 70%)`,
          backdropFilter: `blur(${currentConfig.ui.blur}px)`,
        }}
      />
      
      {/* 헤더 */}
      <header className="relative z-10 p-6 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
            className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-600 rounded-xl flex items-center justify-center text-2xl shadow-lg shadow-amber-500/30"
          >
            🏛️
          </motion.div>
          <div>
            <h1 className="text-xl font-bold">AUTUS v4.0</h1>
            <p className="text-xs text-white/50">Decision Safety Interface</p>
          </div>
        </div>
        
        <ScaleIndicator 
          currentScale={altitudeState.currentScale}
          maxScale={altitudeState.maxAllowedScale}
          isLocked={gravityState.lockedScale !== null}
        />
        
        <ZoomSlider
          zoomLevel={altitudeState.zoomLevel}
          onChange={setZoomLevel}
          maxScale={altitudeState.maxAllowedScale}
        />
      </header>
      
      {/* 메인 콘텐츠 */}
      <main className="relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={altitudeState.currentScale <= 3 ? 'tactical' : altitudeState.currentScale <= 6 ? 'strategic' : 'universal'}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {renderLODUI()}
          </motion.div>
        </AnimatePresence>
      </main>
      
      {/* 알림 */}
      <AlertToast alerts={alerts} />
      
      {/* 하단 상태 바 */}
      <footer className="fixed bottom-0 left-0 right-0 z-10 p-4 bg-black/50 backdrop-blur-md border-t border-white/10">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-6 text-sm text-white/50">
            <span>비가역성: <span className="text-amber-400">{Math.round(altitudeState.zoomLevel * 100)}%</span></span>
            <span>확인 단계: <span className="text-blue-400">{currentConfig.ui.confirmSteps}</span></span>
            <span>Ritual: <span className={currentConfig.ui.ritualRequired ? 'text-red-400' : 'text-green-400'}>
              {currentConfig.ui.ritualRequired ? '필요' : '불필요'}
            </span></span>
          </div>
          
          <div className="flex items-center gap-2 text-xs text-white/30">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span>System Online</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default AutusMain;
