/**
 * VSpiralGraph.jsx
 * V 나선 그래프 - Recharts + Canvas 하이브리드 버전 (GPU 최적화)
 * 
 * V = (T × M × s)^t 공식의 시각적 표현
 * - Truth Mode OFF: 감성적 표현 (이모지 + 메시지)
 * - Truth Mode ON: 정확한 숫자 표시
 */

import { useState, useEffect, useRef, memo, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
  ResponsiveContainer,
} from 'recharts';

// ============================================
// RECHARTS 버전 (애니메이션 + 인터랙션) - memo 최적화
// ============================================
const VSpiralGraph = memo(function VSpiralGraph({
  currentV,
  prevV,
  maxV = 10000,
  size = 300,
  truthMode = false,
}) {
  const [animatedV, setAnimatedV] = useState(currentV);
  const [glowTrigger, setGlowTrigger] = useState(0);

  useEffect(() => {
    if (currentV !== animatedV) {
      setAnimatedV(currentV);
      if (currentV > (prevV || 0)) {
        setGlowTrigger((prev) => prev + 1);
      }
    }
  }, [currentV, animatedV, prevV]);

  // 메모이제이션으로 불필요한 재계산 방지
  const percentage = useMemo(() => 
    Math.min((animatedV / maxV) * 100, 100), 
    [animatedV, maxV]
  );

  const data = useMemo(() => [{
    name: 'V',
    value: percentage,
    fill: 'url(#vGradient)',
  }], [percentage]);

  // 감성 레이블 결정 - 메모이제이션
  const feeling = useMemo(() => {
    if (animatedV > maxV * 0.8) return { emoji: '🚀', text: '폭발 성장 중', color: 'text-emerald-400' };
    if (animatedV > maxV * 0.5) return { emoji: '📈', text: '성장 경로', color: 'text-blue-400' };
    if (animatedV > maxV * 0.3) return { emoji: '🌱', text: '시작 단계', color: 'text-cyan-400' };
    return { emoji: '🌿', text: '준비 중', color: 'text-gray-400' };
  }, [animatedV, maxV]);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* 빛 퍼짐 효과 */}
      <AnimatePresence>
        {glowTrigger > 0 && (
          <motion.div
            key={glowTrigger}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1.8, opacity: [0, 0.6, 0] }}
            transition={{ duration: 1.8 }}
            className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-500/40 to-purple-500/40 pointer-events-none"
          />
        )}
      </AnimatePresence>

      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          cx="50%"
          cy="50%"
          innerRadius="40%"
          outerRadius="80%"
          barSize={30}
          data={data}
          startAngle={90}
          endAngle={-270}
        >
          <defs>
            <radialGradient id="vGradient" cx="50%" cy="50%" r="80%">
              <stop offset="0%" stopColor="#00f0ff" stopOpacity={1} />
              <stop offset="100%" stopColor="#b44aff" stopOpacity={0.8} />
            </radialGradient>
          </defs>

          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />

          <RadialBar
            minAngle={15}
            background={{ fill: 'rgba(255,255,255,0.05)' }}
            clockWise
            dataKey="value"
            cornerRadius={20}
          />
        </RadialBarChart>
      </ResponsiveContainer>

      {/* 중앙 텍스트 */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <motion.div
          key={animatedV}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="text-center"
        >
          {truthMode ? (
            <>
              <p className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
                {Math.round(animatedV).toLocaleString()}
              </p>
              <p className="text-sm text-gray-400 mt-2 font-medium">
                V Score
              </p>
            </>
          ) : (
            <>
              <p className="text-5xl">{feeling.emoji}</p>
              <p className={`text-sm mt-2 font-medium ${feeling.color}`}>
                {feeling.text}
              </p>
            </>
          )}
        </motion.div>

        {/* 변화 방향 표시 */}
        {prevV !== undefined && currentV !== prevV && (
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className={`text-sm font-medium mt-2 ${
              currentV > prevV ? 'text-green-400' : 'text-red-400'
            }`}
          >
            {truthMode 
              ? (currentV > prevV ? `+${((currentV - prevV) / prevV * 100).toFixed(1)}%` : `${((currentV - prevV) / prevV * 100).toFixed(1)}%`)
              : (currentV > prevV ? '↑ 성장 중' : '↓ 조정 필요')
            }
          </motion.p>
        )}
      </div>

      {/* 장식 효과 - 회전 링 (CSS 애니메이션으로 GPU 가속) */}
      <div
        className="absolute inset-0 pointer-events-none animate-spin-slow"
        style={{ animationDuration: '30s' }}
      >
        <div className="absolute inset-0 border-2 border-cyan-500/20 rounded-full" />
      </div>
      
      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow linear infinite;
        }
      `}</style>
    </div>
  );
});

export default VSpiralGraph;

// ============================================
// CANVAS 버전 (경량, 고성능) - memo 최적화
// ============================================
export const VCanvasSpiral = memo(function VCanvasSpiral({
  vHistory,
  currentV,
  truthMode = false,
  size = 320,
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const width = size;
    const height = size;
    const centerX = width / 2;
    const centerY = height / 2;

    // Clear
    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, width, height);

    // Draw background rings
    for (let r = 30; r <= 150; r += 30) {
      ctx.strokeStyle = `rgba(255,255,255,${0.03 + (r / 500)})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Draw V spiral path
    if (vHistory && vHistory.length > 1) {
      const maxV = Math.max(...vHistory, currentV);
      const minV = Math.min(...vHistory, currentV);
      const range = maxV - minV || 1;

      // Gradient
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, '#3b82f6');
      gradient.addColorStop(0.3, '#8b5cf6');
      gradient.addColorStop(0.6, '#06b6d4');
      gradient.addColorStop(1, '#22c55e');

      ctx.beginPath();
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 3;
      ctx.shadowColor = '#3b82f6';
      ctx.shadowBlur = 10;

      vHistory.forEach((v, i) => {
        const angle = (i / vHistory.length) * Math.PI * 4;
        const normalizedV = (v - minV) / range;
        const radius = 30 + normalizedV * 120;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });

      ctx.stroke();
      ctx.shadowBlur = 0;

      // Current position (glowing dot)
      const lastAngle = Math.PI * 4;
      const lastNormalized = (currentV - minV) / range;
      const lastRadius = 30 + lastNormalized * 120;
      const lastX = centerX + Math.cos(lastAngle) * lastRadius;
      const lastY = centerY + Math.sin(lastAngle) * lastRadius;

      // Glow
      const glowGradient = ctx.createRadialGradient(lastX, lastY, 0, lastX, lastY, 25);
      glowGradient.addColorStop(0, '#22c55e');
      glowGradient.addColorStop(0.5, 'rgba(34,197,94,0.3)');
      glowGradient.addColorStop(1, 'transparent');
      ctx.fillStyle = glowGradient;
      ctx.beginPath();
      ctx.arc(lastX, lastY, 25, 0, Math.PI * 2);
      ctx.fill();

      // Dot
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(lastX, lastY, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Center display
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (truthMode) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 32px ui-monospace, monospace';
      ctx.fillText(currentV.toFixed(1), centerX, centerY - 5);
      ctx.fillStyle = '#6b7280';
      ctx.font = '12px system-ui, sans-serif';
      ctx.fillText('V-INDEX', centerX, centerY + 20);
    } else {
      ctx.font = '40px system-ui, sans-serif';
      ctx.fillText(
        currentV > 800 ? '🚀' : currentV > 500 ? '📈' : '🌱',
        centerX,
        centerY - 5
      );
      ctx.fillStyle = '#9ca3af';
      ctx.font = '11px system-ui, sans-serif';
      ctx.fillText(
        currentV > 800 ? '폭발 성장 중' : currentV > 500 ? '성장 경로' : '시작 단계',
        centerX,
        centerY + 25
      );
    }
  }, [vHistory, currentV, truthMode, size]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size }}
      className="rounded-xl"
    />
  );
});

// ============================================
// 미니 스파크라인 버전 (HUD용) - memo 최적화
// ============================================
export const VMiniSparkline = memo(function VMiniSparkline({ history = [], currentV, size = 80 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = (size / 2) * dpr;
    ctx.scale(dpr, dpr);

    const width = size;
    const height = size / 2;

    ctx.clearRect(0, 0, width, height);

    if (history.length < 2) return;

    const max = Math.max(...history);
    const min = Math.min(...history);
    const range = max - min || 1;

    // Gradient fill
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, 'rgba(34, 211, 238, 0.3)');
    gradient.addColorStop(1, 'transparent');

    ctx.beginPath();
    ctx.moveTo(0, height);
    
    history.forEach((v, i) => {
      const x = (i / (history.length - 1)) * width;
      const y = height - ((v - min) / range) * height * 0.8;
      ctx.lineTo(x, y);
    });

    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Line
    ctx.beginPath();
    history.forEach((v, i) => {
      const x = (i / (history.length - 1)) * width;
      const y = height - ((v - min) / range) * height * 0.8;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Current dot
    const lastY = height - ((currentV - min) / range) * height * 0.8;
    ctx.beginPath();
    ctx.arc(width - 2, lastY, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#22d3ee';
    ctx.fill();

  }, [history, currentV, size]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size / 2 }}
      className="rounded"
    />
  );
});
