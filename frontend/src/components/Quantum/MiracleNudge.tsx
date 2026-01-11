// ═══════════════════════════════════════════════════════════════════════════
// AUTUS Miracle Nudge - 존재의 기적 명상 시스템
// "사소한 한 번의 모션이 144개 노드 끝에서 거대한 자본이 됩니다"
// ═══════════════════════════════════════════════════════════════════════════

import React, { useState, useEffect, useCallback } from 'react';

/**
 * 명상 문구 데이터베이스
 */
const MEDITATION_QUOTES = [
  {
    id: 1,
    quote: "당신이 보고 있는 데이터는 당신의 관찰로 인해 확정된 현실입니다. 더 나은 미래를 관찰하십시오.",
    category: 'observation',
    mood: 'inspiring',
  },
  {
    id: 2,
    quote: "오늘의 낮은 효율에 낙담하지 마십시오. 그것은 단지 우연의 파도가 잠시 비켜갔을 뿐입니다. 당신의 중심 12노드는 여전히 유효합니다.",
    category: 'resilience',
    mood: 'comforting',
  },
  {
    id: 3,
    quote: "사소한 한 번의 모션(Motion)이 144개 노드 끝에서 거대한 자본(Capital)이 됩니다. 지금 이 순간의 측정에 집중하십시오.",
    category: 'motivation',
    mood: 'empowering',
  },
  {
    id: 4,
    quote: "모든 결과가 당신의 노력 때문만은 아닙니다. 우주는 복잡하고, 당신은 그 안에서 최선을 다했습니다.",
    category: 'humility',
    mood: 'comforting',
  },
  {
    id: 5,
    quote: "지금 이 순간, 80억 개의 노드가 조화롭게 작동하고 있습니다. 당신은 그 거대한 네트워크의 중심입니다.",
    category: 'connection',
    mood: 'awe',
  },
  {
    id: 6,
    quote: "실패는 단지 양자 상태가 다른 방향으로 붕괴했을 뿐입니다. 다음 관찰에서 새로운 가능성이 열립니다.",
    category: 'failure',
    mood: 'hopeful',
  },
  {
    id: 7,
    quote: "당신의 존재 자체가 10억 분의 1의 확률을 뚫고 이루어진 기적입니다. 오늘 하루도 그 기적을 관리하십시오.",
    category: 'existence',
    mood: 'profound',
  },
  {
    id: 8,
    quote: "통제할 수 없는 것에 에너지를 낭비하지 마십시오. 12개의 핵심 노드에만 집중하면 됩니다.",
    category: 'focus',
    mood: 'practical',
  },
  {
    id: 9,
    quote: "운이 좋았다고 자만하지 말고, 운이 나빴다고 자책하지 마십시오. 둘 다 파도일 뿐입니다.",
    category: 'balance',
    mood: 'wise',
  },
  {
    id: 10,
    quote: "당신이 관찰하지 않는 동안에도, 가능성의 구름은 당신을 기다리고 있습니다.",
    category: 'quantum',
    mood: 'mystical',
  },
  {
    id: 11,
    quote: "작은 습관 노드의 변화가 나비 효과를 일으켜 전체 시스템을 바꿀 수 있습니다. 오늘의 1%가 내일의 100%입니다.",
    category: 'butterfly',
    mood: 'inspiring',
  },
  {
    id: 12,
    quote: "M2C가 낮다고 해서 당신의 가치가 낮은 것이 아닙니다. 숫자는 현상일 뿐, 본질은 변하지 않습니다.",
    category: 'selfworth',
    mood: 'reassuring',
  },
];

/**
 * 상황별 메시지 생성
 */
function getContextualMessage(
  m2c: number,
  luckFactor: number,
  miracleProbability: number
): string {
  // 낮은 M2C + 불운
  if (m2c < 1.2 && luckFactor < -0.3) {
    return `시스템 분석 결과, 현재 아웃풋 저하의 ${Math.abs(luckFactor * 100).toFixed(0)}%는 외부 환경의 급변에 의한 우연입니다. 당신의 핵심 노드는 여전히 견고합니다. 파도가 지나가길 기다리세요.`;
  }
  
  // 높은 M2C + 행운
  if (m2c > 2.0 && luckFactor > 0.3) {
    return `훌륭한 결과입니다! 다만, 현재 성과의 ${(luckFactor * 100).toFixed(0)}%는 유리한 외부 환경 덕분입니다. 이 행운의 시기를 활용해 기반을 다지세요.`;
  }
  
  // 매우 낮은 기적 확률
  if (miracleProbability < 0.0000001) {
    return `지금 이 순간, 당신의 ${Math.floor(1 / miracleProbability).toExponential(1)}개의 노드가 조화롭게 작동하고 있습니다. AUTUS가 이 기적을 관찰하고 있습니다.`;
  }
  
  // 기본 메시지
  return MEDITATION_QUOTES[Math.floor(Math.random() * MEDITATION_QUOTES.length)].quote;
}

interface MiracleNudgeProps {
  isVisible: boolean;
  onClose: () => void;
  miracleProbability?: number;
  m2c?: number;
  luckFactor?: number;
}

/**
 * 기적 알림 팝업 컴포넌트
 */
export function MiracleNudge({ 
  isVisible, 
  onClose, 
  miracleProbability = 0,
  m2c = 1.5,
  luckFactor = 0,
}: MiracleNudgeProps) {
  const [quote, setQuote] = useState(MEDITATION_QUOTES[0]);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setIsAnimating(true);
      // 상황에 맞는 메시지 선택
      const contextualMessage = getContextualMessage(m2c, luckFactor, miracleProbability);
      setQuote({
        id: 0,
        quote: contextualMessage,
        category: 'contextual',
        mood: 'personalized',
      });
    }
  }, [isVisible, m2c, luckFactor, miracleProbability]);

  if (!isVisible) return null;

  return (
    <div 
      className={`
        fixed inset-0 z-50 flex items-center justify-center p-4
        bg-black/60 backdrop-blur-sm
        transition-opacity duration-500
        ${isAnimating ? 'opacity-100' : 'opacity-0'}
      `}
      onClick={onClose}
    >
      <div 
        className={`
          max-w-lg w-full bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900
          border border-purple-500/30 rounded-2xl p-8
          shadow-2xl shadow-purple-500/20
          transform transition-all duration-500
          ${isAnimating ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}
        `}
        onClick={e => e.stopPropagation()}
      >
        {/* 아이콘 */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center animate-pulse">
            <span className="text-4xl">🔮</span>
          </div>
        </div>

        {/* 제목 */}
        <h2 className="text-center text-xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
          존재의 기적
        </h2>

        {/* 기적 확률 */}
        {miracleProbability > 0 && (
          <div className="text-center mb-6">
            <div className="text-sm text-slate-400 mb-1">현재 상태가 유지될 확률</div>
            <div className="text-2xl font-bold font-mono text-purple-400">
              1 / {(1 / miracleProbability).toExponential(2)}
            </div>
          </div>
        )}

        {/* 명상 문구 */}
        <div className="p-6 bg-slate-800/50 rounded-xl border border-slate-700 mb-6">
          <p className="text-lg leading-relaxed text-slate-200 text-center italic">
            "{quote.quote}"
          </p>
        </div>

        {/* 버튼 */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl text-sm transition-all"
          >
            닫기
          </button>
          <button
            onClick={() => {
              setQuote(MEDITATION_QUOTES[Math.floor(Math.random() * MEDITATION_QUOTES.length)]);
            }}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl text-sm font-medium transition-all"
          >
            다른 메시지 ✨
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * 일상 명상 알림 컴포넌트 (토스트 형태)
 */
export function DailyNudgeToast({ onDismiss }: { onDismiss: () => void }) {
  const [quote] = useState(() => 
    MEDITATION_QUOTES[Math.floor(Math.random() * MEDITATION_QUOTES.length)]
  );
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onDismiss, 300);
    }, 10000); // 10초 후 자동 닫힘

    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div 
      className={`
        fixed bottom-6 right-6 max-w-sm
        bg-slate-900/95 backdrop-blur border border-slate-700 rounded-xl p-4
        shadow-lg shadow-purple-500/10
        transform transition-all duration-300
        ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}
      `}
    >
      <div className="flex gap-3">
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
          <span className="text-xl">🌟</span>
        </div>
        <div className="flex-1">
          <div className="text-[10px] text-purple-400 mb-1">오늘의 메시지</div>
          <p className="text-sm text-slate-300 leading-relaxed">
            {quote.quote}
          </p>
        </div>
        <button 
          onClick={() => {
            setIsVisible(false);
            setTimeout(onDismiss, 300);
          }}
          className="flex-shrink-0 p-1 hover:bg-slate-800 rounded transition-colors"
        >
          <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

/**
 * 명상 문구 매니저 Hook
 */
export function useMeditationNudge() {
  const [showNudge, setShowNudge] = useState(false);
  const [nudgeType, setNudgeType] = useState<'miracle' | 'daily'>('daily');
  const [context, setContext] = useState({ m2c: 1.5, luckFactor: 0, miracleProbability: 0 });

  const triggerMiracleNudge = useCallback((
    miracleProbability: number,
    m2c?: number,
    luckFactor?: number
  ) => {
    setContext({
      miracleProbability,
      m2c: m2c || 1.5,
      luckFactor: luckFactor || 0,
    });
    setNudgeType('miracle');
    setShowNudge(true);
  }, []);

  const triggerDailyNudge = useCallback(() => {
    setNudgeType('daily');
    setShowNudge(true);
  }, []);

  const dismiss = useCallback(() => {
    setShowNudge(false);
  }, []);

  return {
    showNudge,
    nudgeType,
    context,
    triggerMiracleNudge,
    triggerDailyNudge,
    dismiss,
  };
}

export default MiracleNudge;
