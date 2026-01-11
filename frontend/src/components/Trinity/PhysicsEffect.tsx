/**
 * AUTUS Trinity - Physics Effect System
 * 물리법칙 기반 과제 효과 계산
 * 
 * 모든 행동에는 반작용이 있다 (뉴턴 제3법칙)
 * - 사람 투입 → 인건비 발생
 * - 도전 선택 → 리스크 발생
 * - 과제 누적 → 시간 지연 발생
 */

import React, { memo, useMemo } from 'react';
import { Task } from './types';

// 물리 상수
const PHYSICS_CONSTANTS = {
  // 인건비 계수 (사람 1명 = 월 400만원)
  LABOR_COST_PER_PERSON: 4000000,
  // 시간 감쇠 계수 (과제 1개당 10% 지연)
  TIME_DECAY_RATE: 0.1,
  // 리스크 증폭 계수
  RISK_AMPLIFIER: 1.5,
  // 성공 확률 기본값
  BASE_SUCCESS_RATE: 0.7,
};

export interface PhysicsEffect {
  // 비용 (양수 = 지출, 음수 = 수입)
  cost: number;
  costLabel: string;
  // 시간 (일 단위)
  time: number;
  timeLabel: string;
  // 리스크 (0-100%)
  risk: number;
  riskLabel: string;
  // 최악의 시나리오
  worstCase: {
    cost: number;
    time: number;
    description: string;
  };
  // 최선의 시나리오
  bestCase: {
    cost: number;
    time: number;
    description: string;
  };
  // 예상 ROI
  expectedROI: number;
}

// 과제 유형별 물리 효과 계산
export function calculatePhysicsEffect(task: Task, totalActiveTasks: number): PhysicsEffect {
  const { type, progress = 0 } = task;
  
  // 기본 계산
  let baseCost = 0;
  let baseTime = 7; // 기본 7일
  let baseRisk = 20; // 기본 20%
  
  // 유형별 효과
  switch (type) {
    case '사람':
      // 사람을 쓰면 인건비 발생
      baseCost = PHYSICS_CONSTANTS.LABOR_COST_PER_PERSON * 0.5; // 2주치
      baseTime = 14;
      baseRisk = 15; // 사람은 리스크 낮음
      break;
      
    case '자동화':
      // 자동화는 초기 비용 높지만 시간 절약
      baseCost = 500000; // 개발/설정 비용
      baseTime = 3;
      baseRisk = 25;
      break;
      
    case '물리삭제':
      // 직접 행동은 비용 낮지만 시간 소요
      baseCost = 50000; // 교통비, 서류비 등
      baseTime = 7;
      baseRisk = 10;
      break;
      
    case '전략':
      // 전략은 비용 없지만 시간과 리스크 높음
      baseCost = 0;
      baseTime = 30;
      baseRisk = 40;
      break;
      
    case '모니터링':
      // 모니터링은 지속적 비용
      baseCost = 100000; // 월 구독료 등
      baseTime = 0; // 즉시
      baseRisk = 5;
      break;
      
    case '위임':
      // 위임은 인건비 + 관리 비용
      baseCost = PHYSICS_CONSTANTS.LABOR_COST_PER_PERSON * 0.3;
      baseTime = 10;
      baseRisk = 30; // 위임은 리스크 있음
      break;
      
    default:
      baseCost = 200000;
      baseTime = 7;
      baseRisk = 20;
  }
  
  // 시간 지연 효과 (뉴턴의 관성 법칙)
  // 과제가 많을수록 각 과제의 완료 시간이 늘어남
  const timeDelayMultiplier = 1 + (totalActiveTasks * PHYSICS_CONSTANTS.TIME_DECAY_RATE);
  const adjustedTime = Math.ceil(baseTime * timeDelayMultiplier);
  
  // 리스크 증폭 (에너지 보존)
  // 빠르게 하려면 리스크가 증가
  const adjustedRisk = Math.min(95, baseRisk * (progress < 50 ? PHYSICS_CONSTANTS.RISK_AMPLIFIER : 1));
  
  // 최악/최선 시나리오 계산
  const worstCase = {
    cost: Math.ceil(baseCost * 2.5),
    time: Math.ceil(adjustedTime * 2),
    description: getWorstCaseDescription(type)
  };
  
  const bestCase = {
    cost: Math.ceil(baseCost * 0.7),
    time: Math.ceil(adjustedTime * 0.5),
    description: getBestCaseDescription(type)
  };
  
  // 예상 ROI (투자 대비 기대 가치)
  const successRate = PHYSICS_CONSTANTS.BASE_SUCCESS_RATE - (adjustedRisk / 200);
  const expectedValue = 10000000 * successRate; // 가정: 성공 시 1000만원 가치
  const expectedROI = ((expectedValue - baseCost) / Math.max(baseCost, 1)) * 100;
  
  return {
    cost: baseCost,
    costLabel: formatCurrency(baseCost),
    time: adjustedTime,
    timeLabel: formatTime(adjustedTime),
    risk: Math.round(adjustedRisk),
    riskLabel: getRiskLabel(adjustedRisk),
    worstCase,
    bestCase,
    expectedROI: Math.round(expectedROI)
  };
}

function getWorstCaseDescription(type: string): string {
  switch (type) {
    case '사람': return '인력 이탈, 재교육 필요';
    case '자동화': return '시스템 장애, 수동 복구';
    case '물리삭제': return '서류 반려, 재방문';
    case '전략': return '시장 변화, 전략 재수립';
    case '모니터링': return '이상 감지 실패';
    case '위임': return '위임자 실수, 직접 수행';
    default: return '예상치 못한 문제 발생';
  }
}

function getBestCaseDescription(type: string): string {
  switch (type) {
    case '사람': return '빠른 적응, 시너지 효과';
    case '자동화': return '완벽 자동화, 추가 기회';
    case '물리삭제': return '즉시 승인, 추가 혜택';
    case '전략': return '시장 선점, 경쟁 우위';
    case '모니터링': return '사전 감지, 손실 방지';
    case '위임': return '능력자 발견, 권한 위임';
    default: return '예상보다 좋은 결과';
  }
}

function formatCurrency(amount: number): string {
  if (amount === 0) return '₩0';
  if (amount >= 1000000) return `₩${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `₩${(amount / 1000).toFixed(0)}K`;
  return `₩${amount}`;
}

function formatTime(days: number): string {
  if (days === 0) return '즉시';
  if (days === 1) return '1일';
  if (days < 7) return `${days}일`;
  if (days < 30) return `${Math.ceil(days / 7)}주`;
  return `${Math.ceil(days / 30)}개월`;
}

function getRiskLabel(risk: number): string {
  if (risk < 15) return '매우 낮음';
  if (risk < 30) return '낮음';
  if (risk < 50) return '보통';
  if (risk < 70) return '높음';
  return '매우 높음';
}

// 물리 효과 표시 컴포넌트
interface PhysicsEffectDisplayProps {
  effect: PhysicsEffect;
  showDetails?: boolean;
}

export const PhysicsEffectDisplay = memo(function PhysicsEffectDisplay({ 
  effect, 
  showDetails = false 
}: PhysicsEffectDisplayProps) {
  const costColor = effect.cost > 0 ? '#f87171' : '#4ade80';
  const riskColor = effect.risk < 30 ? '#4ade80' : effect.risk < 60 ? '#fbbf24' : '#f87171';
  const roiColor = effect.expectedROI > 100 ? '#4ade80' : effect.expectedROI > 0 ? '#fbbf24' : '#f87171';
  
  return (
    <div className="bg-black/40 rounded-xl p-4 border border-white/5">
      {/* 핵심 지표 */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {/* 비용 */}
        <div className="text-center">
          <div className="text-[9px] text-white/40 mb-1">💰 비용</div>
          <div className="text-sm font-bold" style={{ color: costColor }}>
            {effect.cost > 0 ? '-' : '+'}{effect.costLabel}
          </div>
        </div>
        
        {/* 시간 */}
        <div className="text-center">
          <div className="text-[9px] text-white/40 mb-1">⏱️ 소요</div>
          <div className="text-sm font-bold text-[#06b6d4]">
            {effect.timeLabel}
          </div>
        </div>
        
        {/* 리스크 */}
        <div className="text-center">
          <div className="text-[9px] text-white/40 mb-1">⚠️ 리스크</div>
          <div className="text-sm font-bold" style={{ color: riskColor }}>
            {effect.risk}%
          </div>
        </div>
      </div>
      
      {/* 기대 ROI */}
      <div className="flex items-center justify-between p-2 bg-white/[0.02] rounded-lg mb-3">
        <span className="text-[10px] text-white/50">📈 기대 ROI</span>
        <span className="text-xs font-bold" style={{ color: roiColor }}>
          {effect.expectedROI > 0 ? '+' : ''}{effect.expectedROI}%
        </span>
      </div>
      
      {/* 상세 시나리오 */}
      {showDetails && (
        <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/5">
          {/* 최악 */}
          <div className="p-2 bg-[rgba(248,113,113,0.1)] rounded-lg border border-[rgba(248,113,113,0.2)]">
            <div className="text-[8px] text-[#f87171] mb-1">😰 최악의 경우</div>
            <div className="text-[10px] text-white/70">{effect.worstCase.description}</div>
            <div className="text-[9px] text-[#f87171] mt-1">
              -{formatCurrency(effect.worstCase.cost)} / {formatTime(effect.worstCase.time)}
            </div>
          </div>
          
          {/* 최선 */}
          <div className="p-2 bg-[rgba(74,222,128,0.1)] rounded-lg border border-[rgba(74,222,128,0.2)]">
            <div className="text-[8px] text-[#4ade80] mb-1">🎉 최선의 경우</div>
            <div className="text-[10px] text-white/70">{effect.bestCase.description}</div>
            <div className="text-[9px] text-[#4ade80] mt-1">
              -{formatCurrency(effect.bestCase.cost)} / {formatTime(effect.bestCase.time)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

// 전체 과제 물리 효과 요약
interface TotalPhysicsEffectProps {
  tasks: Task[];
}

export const TotalPhysicsEffect = memo(function TotalPhysicsEffect({ tasks }: TotalPhysicsEffectProps) {
  const activeTasks = tasks.filter(t => (t.progress ?? 0) < 100);
  
  const totals = useMemo(() => {
    let totalCost = 0;
    let totalTime = 0;
    let avgRisk = 0;
    
    activeTasks.forEach(task => {
      const effect = calculatePhysicsEffect(task, activeTasks.length);
      totalCost += effect.cost;
      totalTime = Math.max(totalTime, effect.time); // 병렬 작업 가정
      avgRisk += effect.risk;
    });
    
    avgRisk = activeTasks.length > 0 ? avgRisk / activeTasks.length : 0;
    
    // 과제 누적 시 추가 시간 지연 (물리: 마찰력)
    const frictionDelay = Math.floor(activeTasks.length * 2);
    totalTime += frictionDelay;
    
    return {
      cost: totalCost,
      time: totalTime,
      risk: Math.round(avgRisk),
      taskCount: activeTasks.length,
      frictionDelay
    };
  }, [activeTasks]);
  
  if (activeTasks.length === 0) {
    return (
      <div className="p-4 bg-[rgba(74,222,128,0.1)] rounded-xl border border-[rgba(74,222,128,0.2)] text-center">
        <span className="text-[#4ade80] text-sm">✨ 모든 과제 완료!</span>
      </div>
    );
  }
  
  return (
    <div className="p-4 bg-black/40 rounded-xl border border-white/5">
      <div className="text-[10px] text-white/50 mb-3">⚡ 물리 법칙 요약 ({totals.taskCount}개 과제)</div>
      
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center">
          <div className="text-lg font-bold text-[#f87171]">-{formatCurrency(totals.cost)}</div>
          <div className="text-[9px] text-white/40">총 예상 비용</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-[#06b6d4]">{formatTime(totals.time)}</div>
          <div className="text-[9px] text-white/40">예상 완료</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-[#fbbf24]">{totals.risk}%</div>
          <div className="text-[9px] text-white/40">평균 리스크</div>
        </div>
      </div>
      
      {totals.frictionDelay > 0 && (
        <div className="mt-3 pt-3 border-t border-white/5 text-center">
          <span className="text-[9px] text-[#f87171]">
            ⚠️ 과제 {totals.taskCount}개 동시 진행으로 +{totals.frictionDelay}일 지연 예상
          </span>
        </div>
      )}
    </div>
  );
});

export default PhysicsEffectDisplay;
