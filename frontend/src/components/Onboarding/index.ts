/**
 * Onboarding 컴포넌트 export
 */

import React from 'react';

// OnboardingTutorial 컴포넌트
export function OnboardingTutorial({ 
  forceShow = false, 
  onComplete 
}: { 
  forceShow?: boolean; 
  onComplete?: () => void; 
}) {
  // 간소화된 온보딩 - 실제 구현 시 확장
  if (!forceShow) return null;
  
  return React.createElement('div', {
    className: 'fixed inset-0 bg-black/80 z-50 flex items-center justify-center',
    onClick: onComplete
  }, 
    React.createElement('div', {
      className: 'bg-slate-800 rounded-xl p-8 max-w-md text-white'
    },
      React.createElement('h2', { className: 'text-2xl font-bold mb-4' }, 'AUTUS에 오신 것을 환영합니다'),
      React.createElement('p', { className: 'text-slate-300 mb-4' }, '클릭하여 시작하세요.'),
      React.createElement('button', {
        className: 'px-4 py-2 bg-blue-600 rounded-lg',
        onClick: onComplete
      }, '시작하기')
    )
  );
}

// HelpButton 컴포넌트
export function HelpButton({ onClick }: { onClick?: () => void }) {
  return React.createElement('button', {
    onClick,
    className: 'fixed bottom-4 left-4 z-40 w-10 h-10 bg-slate-700 hover:bg-slate-600 rounded-full flex items-center justify-center text-white transition-colors',
    title: '도움말'
  }, '?');
}

