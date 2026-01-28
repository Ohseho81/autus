/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 👑 OwnerDashboard - 오너(원장) 대시보드
 * 
 * 핵심 질문: "앞으로 어떻게 될까요?"
 * 
 * First View 우선순위:
 * 1️⃣ 목표 달성률 게이지
 * 2️⃣ 30일 예측 그래프
 * 3️⃣ 결정 필요 항목
 * 4️⃣ 매출 현황/예상
 * 
 * AUTUS 연동:
 * - σ 예측 → 30일 예측 그래프
 * - 의사결정 기록 → 결정 성공률
 * - 장기 데이터 → 유산 섹션
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// 타입
// ═══════════════════════════════════════════════════════════════════════════════

export interface Goal {
  id: string;
  title: string;
  current: number;
  target: number;
  unit: string;
  prediction: string;
  trend: 'up' | 'down';
  hasWarning?: boolean;
}

export interface Decision {
  id: string;
  title: string;
  positiveOutcome: string;
  negativeOutcome: string;
  recommendation: string;
  createdAt?: Date;
}

export interface PastDecision {
  id: string;
  title: string;
  date: string;
  result: string;
  isSuccess: boolean;
}

export interface Legacy {
  totalStudents: number;
  skyAdmissions: number;
  medicalAdmissions: number;
  recommendationRate: number;
}

interface OwnerDashboardProps {
  decisionSuccessRate?: number;
  goals?: Goal[];
  decisions?: Decision[];
  pastDecisions?: PastDecision[];
  legacy?: Legacy;
  onDecision?: (decisionId: string, approved: boolean) => void;
  onCelebrate?: (icon: string, title: string, description: string) => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 샘플 데이터
// ═══════════════════════════════════════════════════════════════════════════════

const SAMPLE_GOALS: Goal[] = [
  { id: '1', title: '재원 150명', current: 132, target: 150, unit: '명', prediction: '2월 중순 달성 가능', trend: 'up' },
  { id: '2', title: '이탈률 5%', current: 8, target: 5, unit: '%', prediction: '현 추세면 6% (목표 미달)', trend: 'down', hasWarning: true },
  { id: '3', title: '평균 온도 80°', current: 78, target: 80, unit: '°', prediction: '다음 달 81° (목표 달성)', trend: 'up' },
];

const SAMPLE_DECISIONS: Decision[] = [
  { 
    id: '1', 
    title: '수강료 10% 인상', 
    positiveOutcome: '매출 +12%', 
    negativeOutcome: '이탈 8명 (6%)', 
    recommendation: '신규만 인상 권장' 
  },
];

const SAMPLE_PAST: PastDecision[] = [
  { id: '1', title: '신규 반 개설', date: '12월', result: '18명 등록, +₩720만', isSuccess: true },
  { id: '2', title: '수강료 5% 인상', date: '11월', result: '이탈 2명, +₩180만', isSuccess: true },
];

const SAMPLE_LEGACY: Legacy = {
  totalStudents: 1247,
  skyAdmissions: 89,
  medicalAdmissions: 23,
  recommendationRate: 78,
};

// ═══════════════════════════════════════════════════════════════════════════════
// 컴포넌트
// ═══════════════════════════════════════════════════════════════════════════════

export default function OwnerDashboard({
  decisionSuccessRate = 87,
  goals = SAMPLE_GOALS,
  decisions = SAMPLE_DECISIONS,
  pastDecisions = SAMPLE_PAST,
  legacy = SAMPLE_LEGACY,
  onDecision,
  onCelebrate,
}: OwnerDashboardProps) {

  const handleDecision = (decisionId: string, approved: boolean) => {
    onDecision?.(decisionId, approved);
    onCelebrate?.(
      approved ? '✅' : '❌', 
      approved ? '승인 완료!' : '거부됨', 
      '결정이 기록되었습니다'
    );
  };

  return (
    <div className="p-4 pb-24">
      {/* 헤더 */}
      <header className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">👑 원장님, 좋은 아침입니다</h1>
            <p className="text-slate-400 text-sm">
              {new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })}
            </p>
          </div>
          <div className="px-3 py-2 bg-purple-500/20 rounded-xl border border-purple-500/30">
            <div className="text-xs text-slate-400">결정 성공률</div>
            <div className="text-lg font-bold text-purple-400">{decisionSuccessRate}%</div>
          </div>
        </div>
      </header>

      {/* 목표 달성률 */}
      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-3">🎯 1분기 목표</h2>
        <div className="space-y-3">
          {goals.map((goal) => {
            const percentage = Math.min((goal.current / goal.target) * 100, 100);
            return (
              <div 
                key={goal.id} 
                className={`p-3 rounded-xl border ${
                  goal.hasWarning 
                    ? 'bg-orange-500/10 border-orange-500/30' 
                    : 'bg-slate-800/50 border-slate-700/50'
                }`}
              >
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-400">{goal.title}</span>
                  {goal.hasWarning && <span className="text-orange-400">⚠️</span>}
                </div>
                
                {/* 프로그레스 바 */}
                <div className="h-3 bg-slate-700 rounded-full overflow-hidden mb-2">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      goal.hasWarning 
                        ? 'bg-orange-500' 
                        : 'bg-gradient-to-r from-blue-500 to-cyan-400'
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="font-medium">
                    {goal.current}{goal.unit}
                  </span>
                  <span className="text-slate-400">목표 {goal.target}{goal.unit}</span>
                </div>
                
                <div className={`text-xs mt-1 ${goal.trend === 'up' ? 'text-blue-400' : 'text-orange-400'}`}>
                  {goal.trend === 'up' ? '📈' : '📉'} {goal.prediction}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 결정 필요 */}
      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-3">⚖️ 결정 필요</h2>
        {decisions.length === 0 ? (
          <div className="p-6 bg-slate-800/50 rounded-xl text-center border border-slate-700/50">
            <span className="text-4xl">✨</span>
            <p className="text-slate-400 mt-2">결정할 사항이 없습니다</p>
          </div>
        ) : (
          decisions.map((decision) => (
            <div 
              key={decision.id} 
              className="p-4 bg-slate-800/50 rounded-xl border border-purple-500/30 mb-3"
            >
              <h3 className="font-medium mb-2">📋 {decision.title}</h3>
              
              {/* 시뮬레이션 결과 */}
              <div className="p-3 bg-slate-700/50 rounded-lg mb-3 text-sm space-y-1">
                <div className="text-green-400">• 예상 긍정: {decision.positiveOutcome}</div>
                <div className="text-red-400">• 예상 부정: {decision.negativeOutcome}</div>
                <div className="text-blue-400 mt-2">💡 AI 권장: {decision.recommendation}</div>
              </div>
              
              {/* 액션 버튼 */}
              <div className="flex gap-2">
                <button 
                  onClick={() => handleDecision(decision.id, true)}
                  className="flex-1 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-medium transition-colors"
                >
                  ✅ 승인
                </button>
                <button 
                  onClick={() => handleDecision(decision.id, false)}
                  className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium transition-colors"
                >
                  ❌ 거부
                </button>
                <button 
                  className="py-2 px-4 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-medium transition-colors"
                >
                  📊 상세
                </button>
              </div>
            </div>
          ))
        )}
      </section>

      {/* 지난 결정 결과 */}
      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-3">✅ 지난 결정 결과</h2>
        <div className="space-y-2">
          {pastDecisions.map((decision) => (
            <div 
              key={decision.id} 
              className={`p-3 rounded-xl border ${
                decision.isSuccess 
                  ? 'bg-green-500/5 border-green-500/30' 
                  : 'bg-red-500/5 border-red-500/30'
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-sm text-slate-400">{decision.date}</span>
                  <span className="ml-2">"{decision.title}"</span>
                </div>
                <span className={decision.isSuccess ? 'text-green-400' : 'text-red-400'}>
                  {decision.isSuccess ? '🎯 좋은 결정!' : '📉 아쉬운 결정'}
                </span>
              </div>
              <div className="text-sm text-slate-300 mt-1">→ {decision.result}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 유산 (도파민: 자기 효능감 + 레거시) */}
      <section className="p-4 bg-gradient-to-br from-purple-900/30 to-pink-900/30 rounded-xl border border-purple-500/30">
        <h3 className="text-sm text-purple-300 mb-3 text-center">🏛️ 원장님이 만든 것</h3>
        
        <div className="text-center mb-4">
          <div className="text-4xl font-bold">{legacy.totalStudents.toLocaleString()}명</div>
          <div className="text-purple-300 text-sm">배출한 학생</div>
        </div>
        
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 bg-slate-800/50 rounded-lg">
            <div className="text-lg font-bold text-blue-400">{legacy.skyAdmissions}명</div>
            <div className="text-xs text-slate-400">SKY 진학</div>
          </div>
          <div className="p-2 bg-slate-800/50 rounded-lg">
            <div className="text-lg font-bold text-green-400">{legacy.medicalAdmissions}명</div>
            <div className="text-xs text-slate-400">의대 진학</div>
          </div>
          <div className="p-2 bg-slate-800/50 rounded-lg">
            <div className="text-lg font-bold text-pink-400">{legacy.recommendationRate}%</div>
            <div className="text-xs text-slate-400">추천율</div>
          </div>
        </div>
        
        <div className="text-center text-purple-300 text-xs mt-4">
          ✨ "내가 만든 것이 지속된다"
        </div>
      </section>
    </div>
  );
}
