// ═══════════════════════════════════════════════════════════════════════════════
// AUTUS v4.0 - Scale-Aware UI Components
// ═══════════════════════════════════════════════════════════════════════════════
//
// "판단 정확도 > 사용 편의성"
// K단계에 따라 UI 제한, 확인 단계, 시각적 경고가 달라짐
//
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  SCALE_DEFINITIONS, 
  KScale, 
  getScaleLevel,
  getDragCoefficient,
  requiresRitual,
} from './scaleDefinitions';

// ═══════════════════════════════════════════════════════════════════════════════
// Context
// ═══════════════════════════════════════════════════════════════════════════════

interface ScaleContextType {
  currentScale: KScale;
  setScale: (scale: KScale) => void;
  userMaxScale: KScale;  // 사용자 최대 허용 단계
}

const ScaleContext = React.createContext<ScaleContextType>({
  currentScale: 'K1',
  setScale: () => {},
  userMaxScale: 'K5',
});

export function ScaleProvider({ 
  children, 
  initialScale = 'K1',
  userMaxScale = 'K5',
}: { 
  children: React.ReactNode;
  initialScale?: KScale;
  userMaxScale?: KScale;
}) {
  const [currentScale, setCurrentScale] = useState<KScale>(initialScale);
  
  const setScale = useCallback((scale: KScale) => {
    const targetLevel = getScaleLevel(scale);
    const maxLevel = getScaleLevel(userMaxScale);
    
    if (targetLevel <= maxLevel) {
      setCurrentScale(scale);
    } else {
      console.warn(`[Scale] 권한 부족: ${scale} 접근 불가 (최대: ${userMaxScale})`);
    }
  }, [userMaxScale]);
  
  return (
    <ScaleContext.Provider value={{ currentScale, setScale, userMaxScale }}>
      {children}
    </ScaleContext.Provider>
  );
}

export function useScale() {
  return React.useContext(ScaleContext);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Scale Indicator (현재 K단계 표시)
// ═══════════════════════════════════════════════════════════════════════════════

interface ScaleIndicatorProps {
  scale?: KScale;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function ScaleIndicator({ 
  scale, 
  size = 'md',
  showLabel = true,
}: ScaleIndicatorProps) {
  const { currentScale } = useScale();
  const activeScale = scale || currentScale;
  const def = SCALE_DEFINITIONS[activeScale];
  
  const sizes = {
    sm: { badge: 'w-8 h-8 text-xs', label: 'text-xs' },
    md: { badge: 'w-12 h-12 text-sm', label: 'text-sm' },
    lg: { badge: 'w-16 h-16 text-lg', label: 'text-base' },
  };
  
  return (
    <div className="flex items-center gap-2">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className={`
          ${sizes[size].badge} rounded-full flex items-center justify-center
          font-bold font-mono border-2
        `}
        style={{
          backgroundColor: `${def.color.primary}20`,
          borderColor: def.color.primary,
          color: def.color.primary,
          boxShadow: `0 0 ${def.level * 2}px ${def.color.glow}`,
        }}
      >
        {activeScale}
      </motion.div>
      
      {showLabel && (
        <div>
          <div className={`${sizes[size].label} font-semibold text-white`}>
            {def.nameKo}
          </div>
          <div className="text-xs text-white/50">
            {def.approvalAuthorityKo} · {def.failureCostTimeKo}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Scale Selector (K단계 선택기)
// ═══════════════════════════════════════════════════════════════════════════════

interface ScaleSelectorProps {
  onSelect?: (scale: KScale) => void;
}

export function ScaleSelector({ onSelect }: ScaleSelectorProps) {
  const { currentScale, setScale, userMaxScale } = useScale();
  const maxLevel = getScaleLevel(userMaxScale);
  
  const scales: KScale[] = ['K1', 'K2', 'K3', 'K4', 'K5', 'K6', 'K7', 'K8', 'K9', 'K10'];
  
  const handleSelect = (scale: KScale) => {
    setScale(scale);
    onSelect?.(scale);
  };
  
  return (
    <div className="flex flex-wrap gap-2">
      {scales.map((scale) => {
        const def = SCALE_DEFINITIONS[scale];
        const isLocked = def.level > maxLevel;
        const isActive = scale === currentScale;
        
        return (
          <motion.button
            key={scale}
            whileHover={!isLocked ? { scale: 1.05 } : {}}
            whileTap={!isLocked ? { scale: 0.95 } : {}}
            onClick={() => !isLocked && handleSelect(scale)}
            disabled={isLocked}
            className={`
              relative px-3 py-2 rounded-lg font-mono text-sm
              transition-all duration-200
              ${isActive 
                ? 'ring-2 ring-offset-2 ring-offset-black' 
                : 'hover:bg-white/5'}
              ${isLocked 
                ? 'opacity-30 cursor-not-allowed' 
                : 'cursor-pointer'}
            `}
            style={{
              backgroundColor: isActive ? `${def.color.primary}30` : 'rgba(255,255,255,0.05)',
              borderColor: def.color.primary,
              color: isActive ? def.color.primary : 'rgba(255,255,255,0.7)',
            }}
          >
            <span className="font-bold">{scale}</span>
            
            {/* 잠금 아이콘 */}
            {isLocked && (
              <span className="absolute -top-1 -right-1 text-xs">🔒</span>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Scale-Aware Container (K단계에 따른 컨테이너)
// ═══════════════════════════════════════════════════════════════════════════════

interface ScaleContainerProps {
  scale?: KScale;
  children: React.ReactNode;
  className?: string;
}

export function ScaleContainer({ scale, children, className = '' }: ScaleContainerProps) {
  const { currentScale } = useScale();
  const activeScale = scale || currentScale;
  const def = SCALE_DEFINITIONS[activeScale];
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`relative ${className}`}
      style={{
        // 배경 흐림
        backdropFilter: `blur(${def.ui.blur}px)`,
        
        // 색온도 필터
        filter: def.color.temperature < 5000 
          ? 'sepia(0.15)' 
          : def.color.temperature > 8000 
            ? 'hue-rotate(5deg)' 
            : 'none',
      }}
    >
      {/* K단계 표시 경계선 */}
      <div 
        className="absolute inset-0 rounded-xl pointer-events-none"
        style={{
          border: `1px solid ${def.color.primary}30`,
          boxShadow: `inset 0 0 ${def.level * 3}px ${def.color.glow}10`,
        }}
      />
      
      {children}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Ritual Gate (의식적 진입 게이트)
// ═══════════════════════════════════════════════════════════════════════════════

interface RitualGateProps {
  scale: KScale;
  onPass: () => void;
  onCancel: () => void;
}

export function RitualGate({ scale, onPass, onCancel }: RitualGateProps) {
  const def = SCALE_DEFINITIONS[scale];
  const [step, setStep] = useState(0);
  const [inputValue, setInputValue] = useState('');
  
  const steps = useMemo(() => {
    const baseSteps = [
      {
        title: '책임 확인',
        description: `이 결정은 ${def.approvalAuthorityKo}의 승인이 필요합니다.`,
        action: 'continue',
      },
      {
        title: '비가역성 인지',
        description: `실패 시 ${def.failureCostTimeKo} 단위의 비용이 발생합니다.`,
        action: 'continue',
      },
    ];
    
    if (def.level >= 6) {
      baseSteps.push({
        title: '최종 확인',
        description: `"${scale} 결정을 진행합니다"를 입력하세요.`,
        action: 'input',
      });
    }
    
    return baseSteps;
  }, [def, scale]);
  
  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      // 최종 단계
      if (steps[step].action === 'input') {
        if (inputValue === `${scale} 결정을 진행합니다`) {
          onPass();
        }
      } else {
        onPass();
      }
    }
  };
  
  const currentStep = steps[step];
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="w-full max-w-md p-6 rounded-2xl"
        style={{
          backgroundColor: `${def.color.primary}10`,
          border: `2px solid ${def.color.primary}`,
          boxShadow: `0 0 60px ${def.color.glow}30`,
        }}
      >
        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-6">
          <ScaleIndicator scale={scale} size="lg" showLabel={false} />
          <div>
            <h2 className="text-xl font-bold text-white">{def.nameKo} 진입</h2>
            <p className="text-sm text-white/50">
              단계 {step + 1} / {steps.length}
            </p>
          </div>
        </div>
        
        {/* 현재 단계 */}
        <div className="mb-6">
          <h3 
            className="text-lg font-semibold mb-2"
            style={{ color: def.color.primary }}
          >
            {currentStep.title}
          </h3>
          <p className="text-white/70">{currentStep.description}</p>
          
          {currentStep.action === 'input' && (
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={`${scale} 결정을 진행합니다`}
              className="w-full mt-4 px-4 py-3 bg-black/50 border border-white/20 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-amber-400"
            />
          )}
        </div>
        
        {/* 진행 바 */}
        <div className="h-1 bg-white/10 rounded-full mb-6 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${((step + 1) / steps.length) * 100}%` }}
            className="h-full rounded-full"
            style={{ backgroundColor: def.color.primary }}
          />
        </div>
        
        {/* 버튼 */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-lg bg-white/10 text-white/70 hover:bg-white/20 transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleNext}
            className="flex-1 py-3 rounded-lg font-semibold transition-colors"
            style={{
              backgroundColor: def.color.primary,
              color: def.level >= 8 ? '#000' : '#fff',
            }}
          >
            {step < steps.length - 1 ? '다음' : '진행'}
          </button>
        </div>
        
        {/* 경고 */}
        <p className="mt-4 text-xs text-center text-white/40">
          ⚠️ 최종 책임은 승인자에게 있습니다
        </p>
      </motion.div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Scale-Aware Button (K단계 인식 버튼)
// ═══════════════════════════════════════════════════════════════════════════════

interface ScaleButtonProps {
  scale: KScale;
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

export function ScaleButton({ 
  scale, 
  children, 
  onClick, 
  disabled,
  className = '',
}: ScaleButtonProps) {
  const { userMaxScale } = useScale();
  const [showRitual, setShowRitual] = useState(false);
  
  const def = SCALE_DEFINITIONS[scale];
  const maxLevel = getScaleLevel(userMaxScale);
  const isLocked = def.level > maxLevel;
  const needsRitual = requiresRitual(scale);
  
  const dragCoeff = getDragCoefficient(scale);
  
  const handleClick = () => {
    if (isLocked || disabled) return;
    
    if (needsRitual) {
      setShowRitual(true);
    } else {
      onClick();
    }
  };
  
  return (
    <>
      <motion.button
        whileHover={!isLocked ? { scale: 1.02 } : {}}
        whileTap={!isLocked ? { scale: 0.98 } : {}}
        drag={def.level >= 4}
        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
        dragElastic={1 - dragCoeff}
        onClick={handleClick}
        disabled={isLocked || disabled}
        className={`
          relative px-6 py-3 rounded-xl font-semibold
          transition-all duration-300
          ${isLocked ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
          ${className}
        `}
        style={{
          backgroundColor: def.color.primary,
          color: def.level >= 8 ? '#000' : '#fff',
          boxShadow: `0 0 ${def.level * 4}px ${def.color.glow}50`,
        }}
      >
        <span className="flex items-center gap-2">
          <span className="text-xs font-mono opacity-70">{scale}</span>
          {children}
        </span>
        
        {/* 잠금 오버레이 */}
        {isLocked && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl">
            🔒
          </div>
        )}
      </motion.button>
      
      {/* Ritual Gate */}
      <AnimatePresence>
        {showRitual && (
          <RitualGate
            scale={scale}
            onPass={() => {
              setShowRitual(false);
              onClick();
            }}
            onCancel={() => setShowRitual(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Export
// ═══════════════════════════════════════════════════════════════════════════════

export { SCALE_DEFINITIONS };
export type { KScale };
