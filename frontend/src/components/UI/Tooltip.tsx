/**
 * AUTUS Tooltip System
 * ====================
 * 
 * "이게 뭐지?" → 마우스 올리면 3초 안에 이해
 * 
 * 사용법:
 * <Tooltip term="M2C">
 *   <span>2.4x</span>
 * </Tooltip>
 */

import React, { useState, useRef, useEffect } from 'react';
import { Info, HelpCircle } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════
// AUTUS 용어 사전 - 모든 전문 용어를 여기에 정의
// ═══════════════════════════════════════════════════════════════════════════
export const AUTUS_GLOSSARY: Record<string, {
  title: string;
  description: string;
  example?: string;
  emoji?: string;
}> = {
  // ═══════ 핵심 개념 ═══════
  SELF: {
    title: "SELF (자아 점수)",
    description: "당신의 전체적인 삶의 균형 점수. 생존(SURVIVE), 성장(GROW), 연결(CONNECT) 세 영역의 가중 평균입니다.",
    example: "70% = 균형 잡힌 상태",
    emoji: "🎯"
  },
  
  M2C: {
    title: "M2C (Motion to Capital)",
    description: "행동 대비 자본 효율. 1.0 이상이면 투입한 것보다 더 많이 얻고 있다는 뜻입니다.",
    example: "2.4x = 1의 노력으로 2.4의 가치 창출",
    emoji: "⚡"
  },
  
  // ═══════ 3대 도메인 ═══════
  SURVIVE: {
    title: "SURVIVE (생존)",
    description: "기본적인 생존과 안정을 위한 영역. 건강, 재정, 안전을 포함합니다.",
    example: "건강검진, 급여, 보험",
    emoji: "🛡️"
  },
  
  GROW: {
    title: "GROW (성장)",
    description: "개인의 발전과 성취를 위한 영역. 경력, 학습, 창작을 포함합니다.",
    example: "승진, 자격증, 사이드 프로젝트",
    emoji: "🌱"
  },
  
  CONNECT: {
    title: "CONNECT (연결)",
    description: "타인과의 관계와 사회적 영향력 영역. 가족, 사회, 유산을 포함합니다.",
    example: "가족 식사, 모임, 멘토링",
    emoji: "🤝"
  },
  
  // ═══════ 9개 노드 ═══════
  HEALTH: {
    title: "건강 (HEALTH)",
    description: "신체적, 정신적 건강 상태. 운동, 수면, 식습관 등이 영향을 줍니다.",
    emoji: "❤️"
  },
  
  WEALTH: {
    title: "재정 (WEALTH)",
    description: "경제적 상태와 자산 관리. 수입, 지출, 저축, 투자 등이 영향을 줍니다.",
    emoji: "💰"
  },
  
  SECURITY: {
    title: "안전 (SECURITY)",
    description: "장기적 안정성. 보험, 비상금, 주거 안정 등이 영향을 줍니다.",
    emoji: "🔒"
  },
  
  CAREER: {
    title: "경력 (CAREER)",
    description: "직업적 성과와 발전. 업무 성과, 승진, 평판 등이 영향을 줍니다.",
    emoji: "💼"
  },
  
  LEARNING: {
    title: "학습 (LEARNING)",
    description: "지식과 기술 습득. 강의, 독서, 자격증 등이 영향을 줍니다.",
    emoji: "📚"
  },
  
  CREATION: {
    title: "창작 (CREATION)",
    description: "새로운 것을 만들어내는 활동. 프로젝트, 콘텐츠, 아이디어 등이 영향을 줍니다.",
    emoji: "💡"
  },
  
  FAMILY: {
    title: "가족 (FAMILY)",
    description: "가족 및 친밀한 관계. 가족 활동, 돌봄, 소통 등이 영향을 줍니다.",
    emoji: "👨‍👩‍👧‍👦"
  },
  
  SOCIAL: {
    title: "사회 (SOCIAL)",
    description: "사회적 관계와 네트워크. 친구, 커뮤니티, 봉사 등이 영향을 줍니다.",
    emoji: "🌐"
  },
  
  LEGACY: {
    title: "유산 (LEGACY)",
    description: "남기는 영향력과 가치. 멘토링, 공헌, 창작물 등이 영향을 줍니다.",
    emoji: "🏆"
  },
  
  // ═══════ Evidence Gate ═══════
  Reliability: {
    title: "신뢰도 (Reliability)",
    description: "데이터가 충분히 쌓였는지 나타냅니다. 로그 수와 일관성으로 계산됩니다.",
    example: "70% 이상 = 신뢰할 수 있음",
    emoji: "📊"
  },
  
  Freshness: {
    title: "신선도 (Freshness)",
    description: "데이터가 최신인지 나타냅니다. 마지막 업데이트로부터 시간이 지나면 감소합니다.",
    example: "오늘 업데이트 = 100%",
    emoji: "🕐"
  },
  
  Confidence: {
    title: "확신도 (Confidence)",
    description: "이 값을 얼마나 믿을 수 있는지 나타냅니다. 신뢰도와 신선도의 조합입니다.",
    example: "높을수록 정확한 값",
    emoji: "✅"
  },
  
  EvidenceGate: {
    title: "Evidence Gate",
    description: "데이터가 충분하지 않으면 잘못된 판단을 막기 위해 액션을 차단합니다.",
    example: "⚠️ = 데이터 더 필요",
    emoji: "🚦"
  },
  
  // ═══════ 상태 ═══════
  range: {
    title: "범위 (Range)",
    description: "데이터가 매우 부족하여 넓은 범위로만 추정 가능합니다. 더 많은 기록이 필요합니다.",
    emoji: "🔍"
  },
  
  estimate: {
    title: "추정 (Estimate)",
    description: "어느 정도 데이터가 관찰되었지만 아직 확정하기 어렵습니다. 참고용으로만 활용됩니다.",
    emoji: "📐"
  },
  
  confirmed: {
    title: "확정 (Confirmed)",
    description: "충분한 데이터로 신뢰할 수 있는 값입니다. 이 값을 기반으로 판단해도 됩니다.",
    emoji: "✓"
  },
  
  // ═══════ 기타 ═══════
  Actionable: {
    title: "액션 가능",
    description: "충분한 데이터가 있어서 이 노드에 대한 제안을 실행해도 됩니다.",
    emoji: "✅"
  },
  
  Warning: {
    title: "경고 상태",
    description: "데이터 수집 중입니다. 연결된 서비스에서 더 많은 흐름이 감지되면 정확도가 높아집니다.",
    emoji: "⚠️"
  },
  
  Bottleneck: {
    title: "병목 구간",
    description: "데이터 흐름이 약해진 구간입니다. 연결된 노드에 더 많은 기록이 필요합니다.",
    emoji: "🚧"
  },
  
  KI: {
    title: "Keyman Index",
    description: "이 노드가 전체 시스템에 미치는 영향력. 높을수록 중요한 노드입니다.",
    emoji: "👑"
  },
  
  ROI: {
    title: "ROI (투자수익률)",
    description: "투입 대비 얻은 수익의 비율. 높을수록 효율적입니다.",
    example: "85% = 투입의 1.85배 회수",
    emoji: "📈"
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// Tooltip Component
// ═══════════════════════════════════════════════════════════════════════════

interface TooltipProps {
  /** 용어 키 (AUTUS_GLOSSARY에서 찾음) */
  term?: keyof typeof AUTUS_GLOSSARY;
  /** 커스텀 제목 */
  title?: string;
  /** 커스텀 설명 */
  description?: string;
  /** 아이콘 표시 여부 */
  showIcon?: boolean;
  /** 아이콘 크기 */
  iconSize?: number;
  /** 위치 */
  position?: 'top' | 'bottom' | 'left' | 'right';
  /** 자식 요소 */
  children: React.ReactNode;
}

export const Tooltip: React.FC<TooltipProps> = ({
  term,
  title,
  description,
  showIcon = false,
  iconSize = 14,
  position = 'top',
  children
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  
  // 용어 사전에서 정보 가져오기
  const glossaryEntry = term ? AUTUS_GLOSSARY[term] : null;
  const displayTitle = title || glossaryEntry?.title || term || '';
  const displayDescription = description || glossaryEntry?.description || '';
  const displayExample = glossaryEntry?.example;
  const displayEmoji = glossaryEntry?.emoji;
  
  // 위치 계산
  useEffect(() => {
    if (isVisible && triggerRef.current && tooltipRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      
      let x = 0, y = 0;
      
      switch (position) {
        case 'top':
          x = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
          y = triggerRect.top - tooltipRect.height - 8;
          break;
        case 'bottom':
          x = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
          y = triggerRect.bottom + 8;
          break;
        case 'left':
          x = triggerRect.left - tooltipRect.width - 8;
          y = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
          break;
        case 'right':
          x = triggerRect.right + 8;
          y = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
          break;
      }
      
      // 화면 밖으로 나가지 않도록 조정
      x = Math.max(8, Math.min(x, window.innerWidth - tooltipRect.width - 8));
      y = Math.max(8, Math.min(y, window.innerHeight - tooltipRect.height - 8));
      
      setCoords({ x, y });
    }
  }, [isVisible, position]);
  
  return (
    <div className="inline-flex items-center gap-1">
      <div
        ref={triggerRef}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className="cursor-help"
      >
        {children}
      </div>
      
      {showIcon && (
        <HelpCircle 
          size={iconSize} 
          className="text-slate-500 hover:text-slate-300 cursor-help"
          onMouseEnter={() => setIsVisible(true)}
          onMouseLeave={() => setIsVisible(false)}
        />
      )}
      
      {/* Tooltip Portal */}
      {isVisible && (
        <div
          ref={tooltipRef}
          className="fixed z-[9999] max-w-xs animate-in fade-in-0 zoom-in-95 duration-200"
          style={{ 
            left: coords.x, 
            top: coords.y,
            pointerEvents: 'none'
          }}
        >
          <div className="bg-slate-800 border border-slate-600 rounded-xl shadow-2xl p-3">
            {/* 제목 */}
            <div className="flex items-center gap-2 mb-2">
              {displayEmoji && <span className="text-lg">{displayEmoji}</span>}
              <span className="font-bold text-white text-sm">{displayTitle}</span>
            </div>
            
            {/* 설명 */}
            <p className="text-slate-300 text-xs leading-relaxed">
              {displayDescription}
            </p>
            
            {/* 예시 */}
            {displayExample && (
              <div className="mt-2 pt-2 border-t border-slate-700">
                <span className="text-[10px] text-slate-500">예: </span>
                <span className="text-[10px] text-cyan-400">{displayExample}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// InfoBadge - 작은 정보 아이콘 + 툴팁
// ═══════════════════════════════════════════════════════════════════════════

interface InfoBadgeProps {
  term: keyof typeof AUTUS_GLOSSARY;
  size?: number;
}

export const InfoBadge: React.FC<InfoBadgeProps> = ({ term, size = 14 }) => {
  return (
    <Tooltip term={term} position="top">
      <Info 
        size={size} 
        className="text-slate-500 hover:text-cyan-400 transition-colors cursor-help"
      />
    </Tooltip>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// TermHighlight - 용어 강조 + 툴팁
// ═══════════════════════════════════════════════════════════════════════════

interface TermHighlightProps {
  term: keyof typeof AUTUS_GLOSSARY;
  children?: React.ReactNode;
}

export const TermHighlight: React.FC<TermHighlightProps> = ({ term, children }) => {
  const entry = AUTUS_GLOSSARY[term];
  
  return (
    <Tooltip term={term} position="top">
      <span className="text-cyan-400 border-b border-dotted border-cyan-400/50 cursor-help">
        {children || entry?.title || term}
      </span>
    </Tooltip>
  );
};

export default Tooltip;