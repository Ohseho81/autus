/**
 * AUTUS FSD 네비게이션 컴포넌트
 * Full Self-Driving 스타일 목표 경로 시각화
 * 
 * 기능:
 * - 성공 확률 게이지
 * - 마찰/시너지 노드 표시
 * - 예측 분포 시각화
 * - 애니메이션 효과
 */

import { useState, useEffect } from "react";

interface NavigationNode {
  name: string;
  score: number;
  reason?: string;
}

interface FSDNavigationProps {
  goal: string;
  successProbability: number;
  uncertainty?: number;
  frictionNodes: NavigationNode[];
  synergyNodes: NavigationNode[];
  forecast?: number[];
  className?: string;
}

export function FSDNavigation({
  goal,
  successProbability,
  uncertainty = 0.1,
  frictionNodes,
  synergyNodes,
  forecast = [],
  className = "",
}: FSDNavigationProps) {
  const [animatedProb, setAnimatedProb] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  // 성공 확률 애니메이션
  useEffect(() => {
    setIsVisible(true);
    const duration = 1500;
    const startTime = Date.now();
    const startValue = animatedProb;
    const endValue = successProbability * 100;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startValue + (endValue - startValue) * eased;
      
      setAnimatedProb(current);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [successProbability]);

  // 확률에 따른 색상
  const getProbabilityColor = (prob: number) => {
    if (prob >= 70) return "from-emerald-400 to-cyan-400";
    if (prob >= 50) return "from-amber-400 to-orange-400";
    return "from-rose-400 to-red-500";
  };

  const getProbabilityGlow = (prob: number) => {
    if (prob >= 70) return "shadow-emerald-500/30";
    if (prob >= 50) return "shadow-amber-500/30";
    return "shadow-rose-500/30";
  };

  return (
    <div
      className={`
        relative overflow-hidden rounded-2xl
        bg-gradient-to-br from-slate-900/90 via-indigo-950/80 to-purple-950/70
        border border-white/10
        backdrop-blur-xl
        ${className}
      `}
    >
      {/* 배경 그라데이션 애니메이션 */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* 콘텐츠 */}
      <div className="relative z-10 p-6 sm:p-8">
        {/* 헤더 */}
        <div className="mb-6">
          <h3 className="text-lg sm:text-xl font-semibold text-white/90">
            FSD 네비게이션
          </h3>
          <p className="text-sm text-white/60 mt-1 line-clamp-1">
            목표: {goal}
          </p>
        </div>

        {/* 중앙 성공 확률 */}
        <div
          className={`
            flex flex-col items-center justify-center
            py-8 sm:py-12
            transition-all duration-500
            ${isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"}
          `}
        >
          {/* 원형 게이지 배경 */}
          <div className="relative">
            {/* 글로우 효과 */}
            <div
              className={`
                absolute inset-0 rounded-full blur-2xl
                bg-gradient-to-r ${getProbabilityColor(animatedProb)}
                opacity-40 scale-110
              `}
            />

            {/* 메인 원 */}
            <div
              className={`
                relative w-40 h-40 sm:w-48 sm:h-48
                rounded-full
                bg-black/40
                border-4 border-white/10
                flex items-center justify-center
                shadow-2xl ${getProbabilityGlow(animatedProb)}
              `}
            >
              {/* SVG 프로그레스 링 */}
              <svg
                className="absolute inset-0 w-full h-full -rotate-90"
                viewBox="0 0 100 100"
              >
                {/* 배경 원 */}
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="8"
                />
                {/* 프로그레스 */}
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="url(#progressGradient)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${animatedProb * 2.83} 283`}
                  className="transition-all duration-300"
                />
                <defs>
                  <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#22d3ee" />
                    <stop offset="100%" stopColor="#a855f7" />
                  </linearGradient>
                </defs>
              </svg>

              {/* 확률 텍스트 */}
              <div className="text-center">
                <span
                  className={`
                    text-4xl sm:text-5xl font-bold
                    bg-gradient-to-r ${getProbabilityColor(animatedProb)} bg-clip-text text-transparent
                  `}
                >
                  {animatedProb.toFixed(1)}
                </span>
                <span className="text-xl sm:text-2xl text-white/60 ml-1">%</span>
                <p className="text-xs sm:text-sm text-white/50 mt-1">성공 확률</p>
              </div>
            </div>
          </div>

          {/* 불확실성 */}
          {uncertainty > 0 && (
            <p className="text-xs text-white/40 mt-4">
              σ = ±{(uncertainty * 100).toFixed(1)}%
            </p>
          )}
        </div>

        {/* 마찰/시너지 노드 그리드 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mt-6">
          {/* 마찰 노드 */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-rose-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              마찰 노드
            </h4>
            <div className="space-y-2">
              {frictionNodes.length === 0 ? (
                <p className="text-xs text-white/40">마찰 노드 없음</p>
              ) : (
                frictionNodes.map((node, i) => (
                  <div
                    key={i}
                    className={`
                      p-3 rounded-lg
                      bg-rose-950/30 border border-rose-500/20
                      transition-all duration-300 delay-${i * 100}
                      ${isVisible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"}
                    `}
                  >
                    <p className="text-sm text-rose-100">{node.name}</p>
                    {node.reason && (
                      <p className="text-xs text-rose-300/60 mt-1">{node.reason}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 시너지 노드 */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-emerald-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              시너지 노드
            </h4>
            <div className="space-y-2">
              {synergyNodes.length === 0 ? (
                <p className="text-xs text-white/40">시너지 노드 없음</p>
              ) : (
                synergyNodes.map((node, i) => (
                  <div
                    key={i}
                    className={`
                      p-3 rounded-lg
                      bg-emerald-950/30 border border-emerald-500/20
                      transition-all duration-300 delay-${i * 100}
                      ${isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4"}
                    `}
                  >
                    <p className="text-sm text-emerald-100">{node.name}</p>
                    {node.reason && (
                      <p className="text-xs text-emerald-300/60 mt-1">{node.reason}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* 7일 예측 차트 */}
        {forecast.length > 0 && (
          <div className="mt-6 pt-6 border-t border-white/10">
            <h4 className="text-sm font-medium text-white/70 mb-4">7일 예측</h4>
            <div className="flex items-end justify-between h-16 gap-1">
              {forecast.map((value, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className={`
                      w-full rounded-t
                      bg-gradient-to-t from-cyan-500/50 to-purple-500/50
                      transition-all duration-500
                    `}
                    style={{
                      height: `${value * 100}%`,
                      transitionDelay: `${i * 50}ms`,
                    }}
                  />
                  <span className="text-[10px] text-white/40">D{i + 1}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default FSDNavigation;
