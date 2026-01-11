/**
 * AUTUS 인터랙티브 온보딩 튜토리얼
 * ================================
 * 
 * 처음 방문 시 AUTUS 사용법을 단계별로 안내
 * - 스포트라이트 하이라이트
 * - 단계별 설명
 * - 진행 상황 표시
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  ChevronRight, ChevronLeft, X, Sparkles, 
  Target, BarChart3, Zap, Brain, Check
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════
// 튜토리얼 단계 정의
// ═══════════════════════════════════════════════════════════════════════════

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  highlight?: string; // CSS 선택자
  position?: 'center' | 'top' | 'bottom' | 'left' | 'right';
  action?: string; // 사용자가 해야 할 행동
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'welcome',
    title: '🎉 AUTUS에 오신 것을 환영합니다!',
    description: 'AUTUS는 당신의 삶을 9개 영역으로 나누어 관리하는 개인 AI 운영체제입니다. 간단한 튜토리얼로 사용법을 알아볼까요?',
    icon: <Sparkles className="text-cyan-400" size={32} />,
    position: 'center'
  },
  {
    id: 'self-score',
    title: '🎯 SELF 점수란?',
    description: '화면 상단의 큰 숫자가 당신의 전체 삶 균형 점수입니다. 생존(SURVIVE), 성장(GROW), 연결(CONNECT) 세 영역의 조합으로 계산됩니다.',
    icon: <Target className="text-emerald-400" size={32} />,
    position: 'center'
  },
  {
    id: 'three-domains',
    title: '🌳 3대 도메인',
    description: `
      • 🛡️ SURVIVE (생존): 건강, 재정, 안전
      • 🌱 GROW (성장): 경력, 학습, 창작
      • 🤝 CONNECT (연결): 가족, 사회, 유산
      
      각 도메인 아래 3개씩, 총 9개 노드가 있습니다.
    `,
    icon: <BarChart3 className="text-purple-400" size={32} />,
    position: 'center'
  },
  {
    id: 'evidence-gate',
    title: '🚦 Evidence Gate란?',
    description: '데이터가 부족하면 잘못된 판단을 막기 위해 액션을 차단합니다. 노드가 흐릿하거나 "⚠️"가 표시되면 더 많은 기록이 필요하다는 뜻입니다.',
    icon: <Zap className="text-amber-400" size={32} />,
    position: 'center'
  },
  {
    id: 'how-to-use',
    title: '📝 어떻게 사용하나요?',
    description: `
      1. 연결된 서비스에서 활동이 자동으로 감지됩니다
      2. AUTUS가 자동으로 해당 노드 값을 업데이트합니다
      3. 데이터가 쌓이면 더 정확한 분석을 제공합니다
      4. "오늘의 과제"에서 관찰된 흐름을 확인합니다
    `,
    icon: <Brain className="text-pink-400" size={32} />,
    position: 'center'
  },
  {
    id: 'tips',
    title: '💡 팁: 용어가 어려우면?',
    description: '화면의 어떤 용어든 마우스를 올리면 설명이 나타납니다. SELF, M2C, Reliability 같은 전문 용어도 걱정 마세요!',
    icon: <Sparkles className="text-cyan-400" size={32} />,
    position: 'center'
  },
  {
    id: 'complete',
    title: '✅ 준비 완료!',
    description: '이제 AUTUS가 당신의 흐름을 관찰할 준비가 되었습니다. 궁금한 점이 있으면 언제든 도움말을 확인할 수 있습니다.',
    icon: <Check className="text-emerald-400" size={32} />,
    position: 'center'
  }
];

// ═══════════════════════════════════════════════════════════════════════════
// 로컬 스토리지 키
// ═══════════════════════════════════════════════════════════════════════════

const ONBOARDING_KEY = 'autus_onboarding_completed';
const ONBOARDING_VERSION = '1.0.0';

// ═══════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════

interface OnboardingTutorialProps {
  onComplete?: () => void;
  forceShow?: boolean;
}

export const OnboardingTutorial: React.FC<OnboardingTutorialProps> = ({
  onComplete,
  forceShow = false
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // 온보딩 완료 여부 확인
  useEffect(() => {
    if (forceShow) {
      setIsVisible(true);
      return;
    }
    
    try {
      const saved = localStorage.getItem(ONBOARDING_KEY);
      if (!saved) {
        setIsVisible(true);
      } else {
        const parsed = JSON.parse(saved);
        // 버전이 다르면 다시 표시
        if (parsed.version !== ONBOARDING_VERSION) {
          setIsVisible(true);
        }
      }
    } catch {
      setIsVisible(true);
    }
  }, [forceShow]);
  
  // 온보딩 완료 처리
  const completeOnboarding = useCallback(() => {
    try {
      localStorage.setItem(ONBOARDING_KEY, JSON.stringify({
        completed: true,
        version: ONBOARDING_VERSION,
        timestamp: new Date().toISOString()
      }));
    } catch (e) {
      console.warn('Failed to save onboarding state:', e);
    }
    setIsVisible(false);
    onComplete?.();
  }, [onComplete]);
  
  // 다음 단계
  const nextStep = useCallback(() => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(prev => prev + 1);
        setIsAnimating(false);
      }, 200);
    } else {
      completeOnboarding();
    }
  }, [currentStep, completeOnboarding]);
  
  // 이전 단계
  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(prev => prev - 1);
        setIsAnimating(false);
      }, 200);
    }
  }, [currentStep]);
  
  // 건너뛰기
  const skip = useCallback(() => {
    completeOnboarding();
  }, [completeOnboarding]);
  
  // 키보드 네비게이션
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isVisible) return;
      if (e.key === 'ArrowRight' || e.key === 'Enter') nextStep();
      if (e.key === 'ArrowLeft') prevStep();
      if (e.key === 'Escape') skip();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, nextStep, prevStep, skip]);
  
  if (!isVisible) return null;
  
  const step = TUTORIAL_STEPS[currentStep];
  const progress = ((currentStep + 1) / TUTORIAL_STEPS.length) * 100;
  
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* 배경 오버레이 */}
      <div 
        className="absolute inset-0 bg-slate-900/95 backdrop-blur-md"
        onClick={skip}
      />
      
      {/* 메인 카드 */}
      <div 
        className={`relative bg-slate-800 border border-slate-600 rounded-2xl shadow-2xl 
                   max-w-xl w-full mx-4 overflow-hidden transition-all duration-300
                   ${isAnimating ? 'opacity-50 scale-95' : 'opacity-100 scale-100'}`}
      >
        {/* 진행 바 */}
        <div className="h-1 bg-slate-700">
          <div 
            className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        
        {/* 헤더 */}
        <div className="p-6 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <span>{currentStep + 1}</span>
            <span>/</span>
            <span>{TUTORIAL_STEPS.length}</span>
          </div>
          <button
            onClick={skip}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* 콘텐츠 */}
        <div className="px-6 pb-6">
          {/* 아이콘 */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-2xl bg-slate-700/50 flex items-center justify-center">
              {step.icon}
            </div>
          </div>
          
          {/* 제목 */}
          <h2 className="text-2xl font-bold text-center mb-4">
            {step.title}
          </h2>
          
          {/* 설명 */}
          <div className="text-slate-300 text-center whitespace-pre-line leading-relaxed">
            {step.description}
          </div>
        </div>
        
        {/* 푸터 - 네비게이션 */}
        <div className="p-6 pt-4 border-t border-slate-700 flex items-center justify-between">
          {/* 이전 버튼 */}
          <button
            onClick={prevStep}
            disabled={currentStep === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all
                       ${currentStep === 0 
                         ? 'text-slate-600 cursor-not-allowed' 
                         : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
          >
            <ChevronLeft size={20} />
            이전
          </button>
          
          {/* 건너뛰기 */}
          <button
            onClick={skip}
            className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
          >
            건너뛰기
          </button>
          
          {/* 다음/완료 버튼 */}
          <button
            onClick={nextStep}
            className="flex items-center gap-2 px-6 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-purple-600 
                      text-white font-medium hover:brightness-110 transition-all"
          >
            {currentStep === TUTORIAL_STEPS.length - 1 ? '시작하기' : '다음'}
            <ChevronRight size={20} />
          </button>
        </div>
        
        {/* 진행 점들 */}
        <div className="pb-6 flex justify-center gap-2">
          {TUTORIAL_STEPS.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentStep(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentStep 
                  ? 'w-6 bg-cyan-400' 
                  : index < currentStep 
                    ? 'bg-slate-500' 
                    : 'bg-slate-700'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// 도움말 버튼 (다시 보기용)
// ═══════════════════════════════════════════════════════════════════════════

interface HelpButtonProps {
  onClick: () => void;
}

export const HelpButton: React.FC<HelpButtonProps> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-4 left-4 z-40 p-3 bg-slate-800 border border-slate-600 
                rounded-full shadow-lg hover:bg-slate-700 transition-all group"
      title="도움말 다시 보기"
    >
      <span className="text-lg">❓</span>
      <span className="absolute left-full ml-2 px-2 py-1 bg-slate-800 border border-slate-600 
                      rounded text-xs text-slate-300 whitespace-nowrap opacity-0 
                      group-hover:opacity-100 transition-opacity">
        도움말 다시 보기
      </span>
    </button>
  );
};

export default OnboardingTutorial;