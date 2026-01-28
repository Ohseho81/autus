/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ❓ Quick Help - 빠른 도움말 패널
 * MVP 단계 역할별 기능 안내
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState } from 'react';

interface QuickHelpProps {
  currentRole?: string;
}

const ROLE_HELP = {
  DECIDER: {
    name: '👑 결정자 (C-Level)',
    color: 'amber',
    description: '결정만 한다. 과정·설계·자동화는 보이지 않는다.',
    tabs: [
      { name: 'Monopoly', icon: '👑', desc: '3대 독점 체제 모니터링' },
      { name: '결정', icon: '⚖️', desc: '승인/보류/거부 결정' },
      { name: '자산화', icon: '📊', desc: '570개 업무 자산화 현황' },
      { name: '시나리오', icon: '🔮', desc: 'AI 기반 미래 예측' },
    ],
    formula: 'V-Index = (M - T) × (1 + s)^t',
  },
  OPERATOR: {
    name: '⚙️ 운영자 (FSD)',
    color: 'blue',
    description: '관리의 기준을 설명에서 증거로 바꾼다.',
    tabs: [
      { name: 'Risk Queue', icon: '🚨', desc: '이탈 위험 학생 관리' },
      { name: '이탈 알림', icon: '⚠️', desc: '이탈 예측 및 방어' },
      { name: '충돌', icon: '⚡', desc: '업무 충돌 감지/해결' },
      { name: '압력맵', icon: '🔥', desc: '영역별 압력 히트맵' },
    ],
    formula: 'R(t) = Σ(wᵢ × ΔMᵢ) / s(t)^α',
  },
  EXECUTOR: {
    name: '🔨 실행자 (Optimus)',
    color: 'green',
    description: '생각하지 않게 한다. 다음 행동만 보여준다.',
    tabs: [
      { name: 'Quick Tag', icon: '⚡', desc: '현장 데이터 즉시 입력' },
      { name: '작업', icon: '📋', desc: '다음 수행할 작업' },
      { name: '보고서', icon: '📄', desc: 'AI 자동 생성 보고서' },
    ],
    formula: 'Score = (완료/전체) × 자동화율',
  },
  CONSUMER: {
    name: '🛒 소비자 (Consumer)',
    color: 'purple',
    description: '신뢰와 에너지를 공급받는다.',
    tabs: [
      { name: 'V-포인트', icon: '🎁', desc: '포인트 적립/교환' },
      { name: '품질증명', icon: '✓', desc: '서비스 품질 확인' },
      { name: '진행현황', icon: '📊', desc: '프로젝트 진행 단계' },
    ],
    formula: '등급: 브론즈 → 실버 → 골드 → 플래티넘',
  },
  APPROVER: {
    name: '✅ 승인자 (Regulatory)',
    color: 'orange',
    description: '책임 없는 승인을 가능하게 한다.',
    tabs: [
      { name: '승인 패키지', icon: '📦', desc: '승인 요청 검토' },
      { name: '감사 로그', icon: '📋', desc: '시스템 활동 기록' },
    ],
    formula: '',
  },
};

export default function QuickHelp({ currentRole = 'EXECUTOR' }: QuickHelpProps) {
  const [isOpen, setIsOpen] = useState(false);
  const roleHelp = ROLE_HELP[currentRole as keyof typeof ROLE_HELP] || ROLE_HELP.EXECUTOR;

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 z-40 w-12 h-12 rounded-full bg-slate-700 hover:bg-slate-600 text-white shadow-lg flex items-center justify-center transition-all"
        title="도움말"
      >
        ❓
      </button>
    );
  }

  return (
    <div className="fixed bottom-20 right-4 z-40 w-80 bg-slate-800 rounded-xl border border-slate-700 shadow-2xl overflow-hidden">
      {/* Header */}
      <div className={`p-4 bg-${roleHelp.color}-500/20 border-b border-slate-700`}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-white">{roleHelp.name}</h3>
          <button
            onClick={() => setIsOpen(false)}
            className="text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>
        <p className="text-sm text-slate-400 mt-1">{roleHelp.description}</p>
      </div>

      {/* Tabs */}
      <div className="p-4 space-y-2">
        <h4 className="text-xs font-medium text-slate-500 uppercase">사용 가능한 탭</h4>
        {roleHelp.tabs.map((tab, i) => (
          <div key={i} className="flex items-center gap-3 p-2 bg-slate-700/50 rounded-lg">
            <span className="text-lg">{tab.icon}</span>
            <div>
              <div className="text-sm font-medium text-white">{tab.name}</div>
              <div className="text-xs text-slate-400">{tab.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Formula */}
      {roleHelp.formula && (
        <div className="px-4 pb-4">
          <div className="p-3 bg-slate-700/50 rounded-lg">
            <div className="text-xs text-slate-500 mb-1">핵심 공식</div>
            <code className="text-sm text-amber-400">{roleHelp.formula}</code>
          </div>
        </div>
      )}

      {/* Links */}
      <div className="p-4 border-t border-slate-700 flex gap-2">
        <a
          href="/docs/USER_GUIDE.md"
          target="_blank"
          className="flex-1 py-2 text-center bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-slate-300"
        >
          📖 전체 가이드
        </a>
        <button
          onClick={() => setIsOpen(false)}
          className="flex-1 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-sm text-white"
        >
          확인
        </button>
      </div>
    </div>
  );
}
