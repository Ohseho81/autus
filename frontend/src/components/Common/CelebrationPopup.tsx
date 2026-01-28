/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🎉 CelebrationPopup - 축하 팝업
 * 
 * 도파민 트리거: 즉각적인 보상 피드백
 * - 레벨업, 뱃지 획득, 미션 완료 등에서 사용
 * - 애니메이션 효과로 쾌감 극대화
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useEffect, useState } from 'react';

export interface CelebrationData {
  icon: string;
  title: string;
  description: string;
}

interface CelebrationPopupProps {
  data: CelebrationData;
  isVisible: boolean;
  onClose?: () => void;
  autoHideDelay?: number;
}

export default function CelebrationPopup({
  data,
  isVisible,
  onClose,
  autoHideDelay = 2500,
}: CelebrationPopupProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setIsAnimating(true);
      
      if (autoHideDelay > 0) {
        const timer = setTimeout(() => {
          setIsAnimating(false);
          setTimeout(() => onClose?.(), 200);
        }, autoHideDelay);
        
        return () => clearTimeout(timer);
      }
    }
  }, [isVisible, autoHideDelay, onClose]);

  if (!isVisible) return null;

  return (
    <div 
      className={`fixed inset-0 flex items-center justify-center z-50 bg-black/70 transition-opacity duration-200 ${
        isAnimating ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={onClose}
    >
      <div 
        className={`
          bg-gradient-to-br from-purple-900 to-pink-900 
          p-8 rounded-2xl border border-purple-500/50 
          max-w-sm mx-4 
          transform transition-all duration-400
          ${isAnimating ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}
        `}
        onClick={e => e.stopPropagation()}
        style={{
          animation: isAnimating ? 'bounceIn 0.4s ease-out' : undefined,
        }}
      >
        {/* 아이콘 */}
        <div className="text-6xl text-center mb-4 animate-bounce">
          {data.icon}
        </div>
        
        {/* 타이틀 */}
        <h2 className="text-2xl font-bold text-center mb-2 text-white">
          {data.title}
        </h2>
        
        {/* 설명 */}
        <p className="text-center text-purple-200">
          {data.description}
        </p>
        
        {/* 닫기 버튼 */}
        {autoHideDelay <= 0 && (
          <button
            onClick={onClose}
            className="mt-4 w-full py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors"
          >
            닫기
          </button>
        )}
      </div>

      <style>{`
        @keyframes bounceIn {
          0% { transform: scale(0.5); opacity: 0; }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Hook for easy usage
// ═══════════════════════════════════════════════════════════════════════════════

export function useCelebration() {
  const [celebration, setCelebration] = useState<{
    isVisible: boolean;
    data: CelebrationData;
  }>({
    isVisible: false,
    data: { icon: '🎉', title: '', description: '' },
  });

  const celebrate = (icon: string, title: string, description: string) => {
    setCelebration({
      isVisible: true,
      data: { icon, title, description },
    });
  };

  const close = () => {
    setCelebration(prev => ({ ...prev, isVisible: false }));
  };

  return {
    celebration,
    celebrate,
    close,
    CelebrationComponent: () => (
      <CelebrationPopup
        data={celebration.data}
        isVisible={celebration.isVisible}
        onClose={close}
      />
    ),
  };
}
