// ═══════════════════════════════════════════════════════════════════════════════
// AUTUS Fog of War UI - R1-Simulation 결과 은폐
// ═══════════════════════════════════════════════════════════════════════════════
//
// 원칙: 결과만 남기고 경로는 숨긴다
//
// 사용자가 보는 것은 오직:
//   ⟨ 결정, 비용, 책임, Lock ⟩
//
// Reasoning을 보여주면:
// - 재량이 생김
// - 협상이 시작됨
// - 책임이 흐려짐
//
// AUTUS UI의 목적:
// - 이해시키는 것 ❌
// - 결정하게 만드는 것 ❌
// - 되돌릴 수 없게 만드는 것 ✅
//
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { DecisionVector, GateResult, AuthorityLevel } from './gate';
import { KScale, SCALE_CONFIGS } from '../schema';

// ═══════════════════════════════════════════════════════════════════════════════
// 1. Black-Box Rendering
// ═══════════════════════════════════════════════════════════════════════════════

interface SimulationResult {
  // R1/NVIDIA에서 받은 원본 (숨김)
  _hidden: {
    candidateScenarios: unknown[];
    treeExpansion: unknown;
    pruningLog: unknown[];
    optimalPath: unknown;
    confidenceBreakdown: unknown;
  };
  
  // 사용자에게 보이는 요약만
  summary: {
    failureProbability: number;     // "실패 확률 12%"
    maxLoss: number;                // "최대 손실 4.3억"
    legalRisk: 0 | 1;               // "법 위반 가능성 0"
    timeToImpact: number;           // 영향 발현 시간 (hours)
  };
}

/**
 * Black-Box 요약 컴포넌트
 * R1 결과를 수치 요약으로만 표현
 */
export function BlackBoxSummary({ 
  result,
  authorityLevel 
}: { 
  result: SimulationResult;
  authorityLevel: AuthorityLevel;
}) {
  const { summary } = result;
  
  return (
    <div className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-white/70">시스템 분석 결과</span>
        <span className="text-xs text-white/30">Black-Box Output</span>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <MetricBox
          label="실패 확률"
          value={`${Math.round(summary.failureProbability * 100)}%`}
          color={summary.failureProbability > 0.3 ? 'red' : summary.failureProbability > 0.1 ? 'amber' : 'green'}
        />
        <MetricBox
          label="최대 손실"
          value={formatMoney(summary.maxLoss)}
          color={summary.maxLoss > 1_000_000_000 ? 'red' : 'white'}
        />
        <MetricBox
          label="법적 리스크"
          value={summary.legalRisk === 0 ? '없음' : '있음'}
          color={summary.legalRisk === 0 ? 'green' : 'red'}
        />
        <MetricBox
          label="영향 발현"
          value={formatTime(summary.timeToImpact)}
          color="white"
        />
      </div>
      
      {/* 상세 경로는 숨김 */}
      <div className="text-center py-2 text-xs text-white/20">
        ─ 추론 경로 비공개 ─
      </div>
    </div>
  );
}

function MetricBox({ 
  label, 
  value, 
  color 
}: { 
  label: string; 
  value: string; 
  color: 'red' | 'amber' | 'green' | 'white' 
}) {
  const colors = {
    red: 'text-red-400',
    amber: 'text-amber-400',
    green: 'text-green-400',
    white: 'text-white',
  };
  
  return (
    <div className="p-3 bg-black/30 rounded-lg">
      <div className="text-xs text-white/40 mb-1">{label}</div>
      <div className={`text-lg font-bold font-mono ${colors[color]}`}>{value}</div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. Fog of War (인지적 안개)
// ═══════════════════════════════════════════════════════════════════════════════

interface FogOfWarProps {
  children: React.ReactNode;
  userAuthority: AuthorityLevel;
  requiredAuthority: KScale;
  intensity?: 'light' | 'medium' | 'heavy';
}

/**
 * 권한 미달 시 쉐이더 처리
 * 접근 불가 영역은 흐림/왜곡
 */
export function FogOfWar({ 
  children, 
  userAuthority, 
  requiredAuthority,
  intensity = 'medium'
}: FogOfWarProps) {
  const hasAccess = userAuthority >= requiredAuthority;
  
  const blurValues = {
    light: 4,
    medium: 8,
    heavy: 16,
  };
  
  if (hasAccess) {
    return <>{children}</>;
  }
  
  return (
    <div className="relative">
      {/* 흐린 콘텐츠 */}
      <div
        style={{
          filter: `blur(${blurValues[intensity]}px)`,
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        {children}
      </div>
      
      {/* 오버레이 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm rounded-xl"
      >
        <div className="text-center p-6">
          <div className="text-4xl mb-3">🔒</div>
          <div className="text-sm font-semibold text-white/80">
            접근 권한 부족
          </div>
          <div className="text-xs text-white/50 mt-1">
            K{requiredAuthority} 이상 권한 필요
          </div>
          <div className="text-xs text-white/30 mt-2">
            현재: K{userAuthority}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. Gravity UI (중력 연출)
// ═══════════════════════════════════════════════════════════════════════════════

interface GravityContainerProps {
  children: React.ReactNode;
  decision: DecisionVector;
  className?: string;
}

/**
 * 비용·비가역성 ↑ → UI 자동 Zoom-out
 * 사용자는 중요해질수록 덜 만지게 된다
 */
export function GravityContainer({ 
  children, 
  decision, 
  className = '' 
}: GravityContainerProps) {
  const config = SCALE_CONFIGS[decision.K];
  
  // 중력 강도 계산
  const gravity = useMemo(() => {
    // K-Scale + 비가역성 + 비용 기반 중력
    const kWeight = decision.K / 10;
    const iWeight = decision.I / 100;
    const cWeight = Math.min(1, Math.log10(decision.Cm / 1_000_000 + 1) / 5);
    
    return (kWeight * 0.4) + (iWeight * 0.4) + (cWeight * 0.2);
  }, [decision]);
  
  // 중력에 따른 스케일 (높을수록 작아짐 = 멀어짐)
  const scale = 1 - (gravity * 0.3);
  
  // 중력에 따른 투명도 (높을수록 흐려짐)
  const opacity = 1 - (gravity * 0.4);
  
  // 중력에 따른 블러
  const blur = gravity * config.ui.blur;
  
  return (
    <motion.div
      initial={{ scale: 1, opacity: 1 }}
      animate={{ 
        scale, 
        opacity,
        filter: `blur(${blur}px)`,
      }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={`transition-all ${className}`}
      style={{
        // 색온도 필터
        backgroundColor: `${config.ui.color}10`,
        borderColor: `${config.ui.color}30`,
      }}
    >
      {children}
      
      {/* 중력 표시기 */}
      {gravity > 0.5 && (
        <div className="absolute bottom-2 right-2 text-xs text-white/30">
          중력: {Math.round(gravity * 100)}%
        </div>
      )}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. 결정 요약 뷰 (유일하게 보이는 것)
// ═══════════════════════════════════════════════════════════════════════════════

interface DecisionSummaryProps {
  result: GateResult;
}

/**
 * 사용자가 보는 유일한 결과
 * ⟨ 결정, 비용, 책임, Lock ⟩
 */
export function DecisionSummary({ result }: DecisionSummaryProps) {
  const { vector, closed, reason, liability, hash, timestamp } = result;
  const config = SCALE_CONFIGS[vector.K];
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        p-6 rounded-2xl border-2
        ${closed ? 'bg-green-500/10 border-green-500/30' : 'bg-amber-500/10 border-amber-500/30'}
      `}
    >
      {/* 상태 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{closed ? '🔒' : '⏳'}</span>
          <div>
            <div className={`font-bold ${closed ? 'text-green-400' : 'text-amber-400'}`}>
              {closed ? '결정 봉인됨' : '결정 대기중'}
            </div>
            <div className="text-xs text-white/50">{reason}</div>
          </div>
        </div>
        <div 
          className="px-3 py-1 rounded-full text-sm font-mono"
          style={{ 
            backgroundColor: `${config.ui.color}20`,
            color: config.ui.color,
          }}
        >
          K{vector.K}
        </div>
      </div>
      
      {/* 핵심 수치만 표시 */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="p-3 bg-black/30 rounded-xl">
          <div className="text-xs text-white/40">비용</div>
          <div className="text-lg font-bold text-white">{formatMoney(vector.Cm)}</div>
        </div>
        <div className="p-3 bg-black/30 rounded-xl">
          <div className="text-xs text-white/40">비가역성</div>
          <div className="text-lg font-bold text-white">{vector.I}%</div>
        </div>
        <div className="p-3 bg-black/30 rounded-xl">
          <div className="text-xs text-white/40">책임자</div>
          <div className="text-lg font-bold text-white">K{liability}</div>
        </div>
        <div className="p-3 bg-black/30 rounded-xl">
          <div className="text-xs text-white/40">시간 영향</div>
          <div className="text-lg font-bold text-white">{formatTime(vector.Ct)}</div>
        </div>
      </div>
      
      {/* 봉인 증명 */}
      {closed && (
        <div className="p-3 bg-black/50 rounded-lg border border-white/10">
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/40">봉인 해시</span>
            <span className="font-mono text-green-400">{hash}</span>
          </div>
          <div className="flex items-center justify-between text-xs mt-1">
            <span className="text-white/40">봉인 시각</span>
            <span className="text-white/60">{timestamp.toISOString()}</span>
          </div>
        </div>
      )}
      
      {/* 숨겨진 것들 안내 (의도적) */}
      <div className="mt-4 text-center text-xs text-white/20">
        추론 경로 · 후보 시나리오 · 시뮬레이션 로그 ─ 비공개
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. 유틸리티
// ═══════════════════════════════════════════════════════════════════════════════

function formatMoney(value: number): string {
  if (value >= 1_000_000_000_000) {
    return `${(value / 1_000_000_000_000).toFixed(1)}조`;
  }
  if (value >= 100_000_000) {
    return `${(value / 100_000_000).toFixed(1)}억`;
  }
  if (value >= 10_000) {
    return `${(value / 10_000).toFixed(0)}만`;
  }
  return `${value}원`;
}

function formatTime(hours: number): string {
  if (hours >= 8760) {
    return `${(hours / 8760).toFixed(1)}년`;
  }
  if (hours >= 720) {
    return `${(hours / 720).toFixed(0)}개월`;
  }
  if (hours >= 168) {
    return `${(hours / 168).toFixed(0)}주`;
  }
  if (hours >= 24) {
    return `${(hours / 24).toFixed(0)}일`;
  }
  return `${hours}시간`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Export
// ═══════════════════════════════════════════════════════════════════════════════

export default {
  BlackBoxSummary,
  FogOfWar,
  GravityContainer,
  DecisionSummary,
};
