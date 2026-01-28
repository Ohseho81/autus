/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🚀 OnboardingFlow - 온보딩 플로우
 * 
 * 역할별 맞춤형 온보딩 경험
 * - 핵심 가치 전달
 * - 첫 행동 유도
 * - 도파민 설계 적용
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState } from 'react';
import type { MotivationRole } from '../../core/motivation';

// ═══════════════════════════════════════════════════════════════════════════════
// 타입
// ═══════════════════════════════════════════════════════════════════════════════

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  illustration?: string;
  actionLabel?: string;
  actionType?: 'next' | 'action' | 'skip';
  highlight?: string;
}

export interface OnboardingConfig {
  role: MotivationRole;
  welcomeMessage: string;
  steps: OnboardingStep[];
  firstAction: {
    label: string;
    url: string;
    description: string;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 역할별 온보딩 설정
// ═══════════════════════════════════════════════════════════════════════════════

export const ONBOARDING_CONFIGS: Record<MotivationRole, OnboardingConfig> = {
  // 🔨 선생님 온보딩
  EXECUTOR: {
    role: 'EXECUTOR',
    welcomeMessage: '선생님, 환영해요! 👋',
    steps: [
      {
        id: 'intro',
        title: 'AUTUS가 뭔가요?',
        description: '학생들의 "온도"를 측정해서 이탈 위험을 미리 알려드려요. 선생님의 직감 + 데이터 = 완벽한 케어!',
        icon: '🌡️',
        highlight: '온도 = 학생 상태',
      },
      {
        id: 'core_action',
        title: '핵심은 딱 하나!',
        description: '수업 후 30초만 투자해서 학생 상태를 기록하면 끝! 나머지는 AUTUS가 알아서 해요.',
        icon: '✏️',
        highlight: '30초 기록 = 이탈 방지',
      },
      {
        id: 'value',
        title: '선생님 효과 확인',
        description: '선생님이 챙긴 학생들이 어떻게 변했는지 매주 알려드려요. 보람을 느껴보세요! 💪',
        icon: '📈',
        highlight: '내 행동 → 결과 확인',
      },
      {
        id: 'streak',
        title: '연속 기록 도전!',
        description: '매일 기록하면 🔥 연속 기록이 쌓여요. 15일 연속부터 선생님은 베테랑!',
        icon: '🔥',
        highlight: '꾸준함 = 실력',
      },
    ],
    firstAction: {
      label: '첫 번째 기록하기',
      url: '/quick-tag',
      description: '지금 바로 첫 기록을 남겨보세요!',
    },
  },

  // ⚙️ 실장 온보딩
  OPERATOR: {
    role: 'OPERATOR',
    welcomeMessage: '실장님, 환영합니다! 👋',
    steps: [
      {
        id: 'intro',
        title: 'AUTUS가 뭔가요?',
        description: '학원 전체 학생들의 상태를 한눈에 파악하고, 문제가 생기기 전에 미리 대응하세요.',
        icon: '📊',
        highlight: '예측 → 예방',
      },
      {
        id: 'dashboard',
        title: '한눈에 보기',
        description: '전체 학생 수, 관심 필요 학생, 평균 온도, 이탈 현황을 실시간으로 확인해요.',
        icon: '🎯',
        highlight: 'KPI 4개로 끝',
      },
      {
        id: 'risk_queue',
        title: '관심 필요 = 먼저 챙기기',
        description: '🥶 온도가 낮은 학생이 자동으로 리스트업 돼요. 하나씩 해결하면 이탈 0!',
        icon: '🚨',
        highlight: '리스트 → 조치 → 완료',
      },
      {
        id: 'value',
        title: '내가 막은 이탈',
        description: '매주 실장님이 방어 성공한 학생과 금액을 알려드려요. 실장님 없으면 학원이 안 돌아가요!',
        icon: '🛡️',
        highlight: '가치 = 숫자로 증명',
      },
    ],
    firstAction: {
      label: '대시보드 보기',
      url: '/dashboard',
      description: '지금 전체 현황을 확인해보세요!',
    },
  },

  // 👑 원장 온보딩
  OWNER: {
    role: 'OWNER',
    welcomeMessage: '원장님, 환영합니다! 👋',
    steps: [
      {
        id: 'intro',
        title: 'AUTUS가 뭔가요?',
        description: '학원의 미래를 예측하고, 데이터 기반 의사결정을 도와드려요. 직관 + 데이터 = 최고의 결정!',
        icon: '🔮',
        highlight: '예측 = 준비',
      },
      {
        id: 'goal',
        title: '목표 달성률',
        description: '분기/연간 목표 달성률을 실시간으로 확인하고, 달성 예측까지 받아보세요.',
        icon: '🎯',
        highlight: '목표 → 현재 → 예측',
      },
      {
        id: 'decision',
        title: '결정 지원',
        description: '중요한 결정 전에 시뮬레이션 결과를 확인하세요. AI가 예상 결과를 알려드려요.',
        icon: '⚖️',
        highlight: '결정 → 기록 → 검증',
      },
      {
        id: 'legacy',
        title: '원장님의 유산',
        description: '지금까지 배출한 학생, 성과, 추천율을 확인하세요. 원장님이 만든 것이 지속됩니다.',
        icon: '🏛️',
        highlight: '레거시 = 의미',
      },
    ],
    firstAction: {
      label: '목표 현황 보기',
      url: '/goals',
      description: '지금 목표 달성률을 확인해보세요!',
    },
  },

  // 👨‍👩‍👧 학부모 온보딩
  PARENT: {
    role: 'PARENT',
    welcomeMessage: '학부모님, 환영합니다! 👋',
    steps: [
      {
        id: 'intro',
        title: '우리 아이 성장 기록',
        description: 'AUTUS에서 우리 아이의 성장을 그래프로 확인하고, 선생님 메시지도 받아보세요.',
        icon: '📈',
        highlight: '성장 = 시각화',
      },
      {
        id: 'growth',
        title: '성장 곡선',
        description: '과거부터 현재, 그리고 예상되는 미래까지! 우리 아이가 어디쯤 있는지 한눈에 봐요.',
        icon: '📊',
        highlight: '과거 → 현재 → 미래',
      },
      {
        id: 'praise',
        title: '선생님 칭찬',
        description: '선생님이 보내는 칭찬 메시지를 받아보세요. 아이가 학원에서 어떻게 하는지 알 수 있어요.',
        icon: '💬',
        highlight: '칭찬 = 안심',
      },
      {
        id: 'report',
        title: '주간 리포트',
        description: '매주 금요일, 이번 주 아이의 출석/숙제/성적을 한 번에 받아보세요.',
        icon: '📋',
        highlight: '리포트 = 신뢰',
      },
    ],
    firstAction: {
      label: '성장 곡선 보기',
      url: '/growth',
      description: '지금 우리 아이 성장을 확인해보세요!',
    },
  },

  // 🎒 학생 온보딩
  STUDENT: {
    role: 'STUDENT',
    welcomeMessage: '안녕! 반가워! 👋',
    steps: [
      {
        id: 'intro',
        title: 'AUTUS가 뭐야?',
        description: '공부하면서 경험치(XP)를 모으고 레벨업 하는 거야! 게임처럼 재미있게 공부하자!',
        icon: '🎮',
        highlight: '공부 = 게임',
      },
      {
        id: 'xp_level',
        title: 'XP와 레벨',
        description: '숙제 하고, 수업 듣고, 열심히 하면 XP가 쌓여. 레벨이 오르면 뱃지도 받아!',
        icon: '⭐',
        highlight: 'XP → 레벨업 → 뱃지',
      },
      {
        id: 'streak',
        title: '연속 기록',
        description: '매일 출석하면 🔥 연속 기록이 쌓여! 30일 연속이면 "한 달의 기적" 뱃지!',
        icon: '🔥',
        highlight: '매일 = 습관',
      },
      {
        id: 'dream',
        title: '꿈 로드맵',
        description: '네 꿈을 설정하면, 지금 하는 공부가 그 꿈에 어떻게 연결되는지 보여줄게!',
        icon: '🌟',
        highlight: '지금 = 미래',
      },
    ],
    firstAction: {
      label: '오늘의 미션 보기',
      url: '/mission',
      description: '오늘 할 일을 확인하고 XP 받자!',
    },
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// 온보딩 UI 컴포넌트
// ═══════════════════════════════════════════════════════════════════════════════

interface OnboardingFlowProps {
  role: MotivationRole;
  userName?: string;
  onComplete: () => void;
  onSkip?: () => void;
}

export default function OnboardingFlow({
  role,
  userName,
  onComplete,
  onSkip,
}: OnboardingFlowProps) {
  const config = ONBOARDING_CONFIGS[role];
  const [currentStep, setCurrentStep] = useState(0);
  const totalSteps = config.steps.length;

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const step = config.steps[currentStep];
  const isLastStep = currentStep === totalSteps - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900">
      {/* 배경 장식 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md mx-4">
        {/* 스텝 인디케이터 (상단) */}
        <div className="absolute -top-8 left-0 right-0 text-center text-sm text-slate-400">
          {currentStep + 1} / {totalSteps}
        </div>

        {/* 스킵 버튼 (상단 우측 고정) */}
        {onSkip && (
          <button
            onClick={onSkip}
            className="absolute -top-8 right-0 text-sm text-slate-500 hover:text-white transition-colors"
          >
            건너뛰기 →
          </button>
        )}

        {/* 카드 - 고정 높이 */}
        <div className="bg-slate-800/80 backdrop-blur-xl rounded-2xl border border-slate-700/50 overflow-hidden shadow-2xl h-[480px] flex flex-col">
          {/* 프로그레스 바 */}
          <div className="h-1 bg-slate-700 flex-shrink-0">
            <div 
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
              style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
            />
          </div>

          {/* 콘텐츠 - flex-grow로 남은 공간 채우기 */}
          <div className="p-8 flex-1 flex flex-col justify-center">
            {/* 스텝 아이콘 */}
            <div className="text-6xl text-center mb-6 animate-bounce">
              {step.icon}
            </div>

            {/* 스텝 제목 */}
            <h2 className="text-xl font-bold text-white text-center mb-3">
              {step.title}
            </h2>

            {/* 스텝 설명 - 고정 높이 영역 */}
            <div className="h-20 flex items-center justify-center">
              <p className="text-slate-300 text-center leading-relaxed">
                {step.description}
              </p>
            </div>

            {/* 하이라이트 - 고정 높이 영역 */}
            <div className="h-12 flex items-center justify-center mt-2">
              {step.highlight && (
                <span className="inline-block px-4 py-2 bg-purple-500/20 border border-purple-500/30 rounded-full text-purple-300 text-sm">
                  💡 {step.highlight}
                </span>
              )}
            </div>
          </div>

          {/* 네비게이션 - 하단 고정 */}
          <div className="p-6 pt-0 flex-shrink-0">
            {/* 버튼 영역 - 항상 동일한 레이아웃 */}
            <div className="flex gap-3">
              {/* 이전 버튼 - 항상 공간 차지, 첫 스텝에서는 투명 */}
              <button
                onClick={handlePrev}
                disabled={currentStep === 0}
                className={`flex-1 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-1 ${
                  currentStep === 0
                    ? 'bg-transparent text-transparent cursor-default'
                    : 'bg-slate-700 hover:bg-slate-600 text-white'
                }`}
              >
                <span>←</span> 이전
              </button>
              
              {/* 건너뛰기 버튼 - 중간에 고정 (마지막 스텝 제외) */}
              {!isLastStep && onSkip && (
                <button
                  onClick={onSkip}
                  className="px-4 py-3 text-slate-400 hover:text-white text-sm transition-colors"
                >
                  건너뛰기
                </button>
              )}
              
              {/* 다음/시작하기 버튼 */}
              <button
                onClick={handleNext}
                className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 rounded-xl font-bold transition-all flex items-center justify-center gap-1"
              >
                {isLastStep ? '시작하기' : '다음'} <span>→</span>
              </button>
            </div>

            {/* 페이지 인디케이터 */}
            <div className="flex justify-center gap-2 mt-4">
              {config.steps.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentStep(idx)}
                  className={`h-2 rounded-full transition-all ${
                    idx === currentStep 
                      ? 'w-6 bg-purple-500' 
                      : 'w-2 bg-slate-600 hover:bg-slate-500'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
