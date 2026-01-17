/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * KIGaugeCluster - K/I 지수 게이지 클러스터
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useEffect, useState } from 'react';
import { motion, useSpring, useTransform, animate } from 'framer-motion';
import { kIndexSpectrum, iIndexSpectrum, formatKValue, formatDelta } from '../../styles/autus-design-system';
import { springs } from '../../lib/animations/framer-presets';

interface KIGaugeClusterProps {
  k: number;
  i: number;
  dk: number;
  di: number;
  omega: number;
  entityType?: string;
  previousK?: number;
}

export function KIGaugeCluster({ 
  k, i, dk, di, omega, 
  entityType = 'INDIVIDUAL',
  previousK = 0 
}: KIGaugeClusterProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* K-지수 메인 게이지 */}
      <AnimatedCircularGauge
        value={k}
        previousValue={previousK}
        label="K-INDEX"
        subtitle="질량 지수"
        delta={dk}
        type="k"
        size="large"
      />

      {/* I-지수 메인 게이지 */}
      <CircularGauge
        value={i}
        label="I-INDEX"
        subtitle="궤도 지수"
        delta={di}
        type="i"
        size="large"
      />

      {/* 속도 벡터 */}
      <VelocityVector dk={dk} di={di} />

      {/* 엔트로피 */}
      <EntropyMeter omega={omega} />
    </div>
  );
}

// 애니메이션 원형 게이지 (K-지수용)
interface AnimatedCircularGaugeProps {
  value: number;
  previousValue: number;
  label: string;
  subtitle: string;
  delta: number;
  type: 'k' | 'i';
  size?: 'medium' | 'large';
}

function AnimatedCircularGauge({ 
  value, previousValue, label, subtitle, delta, type, size = 'medium' 
}: AnimatedCircularGaugeProps) {
  const [displayValue, setDisplayValue] = useState(previousValue);
  const springValue = useSpring(previousValue, springs.kChange(value - previousValue));
  
  const color = useTransform(
    springValue,
    [-1, 0, 1],
    ['rgb(168, 85, 247)', 'rgb(148, 163, 184)', 'rgb(34, 211, 238)']
  );

  useEffect(() => {
    const controls = animate(previousValue, value, {
      duration: 1,
      ease: 'easeOut',
      onUpdate: (latest) => setDisplayValue(latest),
    });
    springValue.set(value);
    return controls.stop;
  }, [value, previousValue, springValue]);

  const radius = size === 'large' ? 80 : 60;
  const strokeWidth = size === 'large' ? 8 : 6;
  const circumference = 2 * Math.PI * radius;
  const normalizedValue = (displayValue + 1) / 2;
  const strokeDashoffset = circumference * (1 - normalizedValue);

  return (
    <div className="flex flex-col items-center p-4 rounded-2xl bg-white/5">
      <div className="relative">
        {/* 글로우 효과 */}
        <motion.div
          className="absolute inset-0 rounded-full blur-2xl"
          style={{
            backgroundColor: color,
            opacity: 0.3,
          }}
        />
        
        <svg
          width={radius * 2 + strokeWidth * 2}
          height={radius * 2 + strokeWidth * 2}
          className="transform -rotate-90"
        >
          <circle
            cx={radius + strokeWidth}
            cy={radius + strokeWidth}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-white/10"
          />
          <motion.circle
            cx={radius + strokeWidth}
            cy={radius + strokeWidth}
            r={radius}
            fill="none"
            stroke={kIndexSpectrum.getColor(displayValue)}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{
              filter: `drop-shadow(0 0 10px ${kIndexSpectrum.getColor(displayValue)})`,
            }}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="text-3xl font-bold font-mono"
            style={{ color }}
          >
            {formatKValue(displayValue)}
          </motion.span>
          <span className={`text-sm font-mono ${delta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatDelta(delta)}
          </span>
        </div>
      </div>

      <div className="mt-3 text-center">
        <div className="text-xs text-white/50 uppercase tracking-wider">{label}</div>
        <div className="text-sm text-white/30">{subtitle}</div>
      </div>
    </div>
  );
}

// 일반 원형 게이지
interface CircularGaugeProps {
  value: number;
  label: string;
  subtitle: string;
  delta: number;
  type: 'k' | 'i';
  size?: 'medium' | 'large';
}

function CircularGauge({ value, label, subtitle, delta, type, size = 'medium' }: CircularGaugeProps) {
  const radius = size === 'large' ? 80 : 60;
  const strokeWidth = size === 'large' ? 8 : 6;
  const circumference = 2 * Math.PI * radius;
  const normalizedValue = (value + 1) / 2;
  const strokeDashoffset = circumference * (1 - normalizedValue);
  
  const getColorValue = () => {
    return type === 'k' ? kIndexSpectrum.getColor(value) : iIndexSpectrum.getColor(value);
  };

  return (
    <div className="flex flex-col items-center p-4 rounded-2xl bg-white/5">
      <div className="relative">
        <svg
          width={radius * 2 + strokeWidth * 2}
          height={radius * 2 + strokeWidth * 2}
          className="transform -rotate-90"
        >
          <circle
            cx={radius + strokeWidth}
            cy={radius + strokeWidth}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-white/10"
          />
          <motion.circle
            cx={radius + strokeWidth}
            cy={radius + strokeWidth}
            r={radius}
            fill="none"
            stroke={getColorValue()}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={springs.default}
            style={{ filter: `drop-shadow(0 0 10px ${getColorValue()})` }}
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold font-mono" style={{ color: getColorValue() }}>
            {formatKValue(value)}
          </span>
          <span className={`text-sm font-mono ${delta >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatDelta(delta)}
          </span>
        </div>
      </div>

      <div className="mt-3 text-center">
        <div className="text-xs text-white/50 uppercase tracking-wider">{label}</div>
        <div className="text-sm text-white/30">{subtitle}</div>
      </div>
    </div>
  );
}

// 속도 벡터
function VelocityVector({ dk, di }: { dk: number; di: number }) {
  const magnitude = Math.sqrt(dk * dk + di * di);
  const angle = Math.atan2(di, dk) * (180 / Math.PI);

  return (
    <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white/5">
      <div className="relative w-24 h-24">
        <svg className="absolute inset-0 w-full h-full text-white/10">
          <line x1="50%" y1="0" x2="50%" y2="100%" stroke="currentColor" />
          <line x1="0" y1="50%" x2="100%" y2="50%" stroke="currentColor" />
          <circle cx="50%" cy="50%" r="30%" fill="none" stroke="currentColor" strokeDasharray="4 4" />
        </svg>

        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          animate={{ rotate: angle }}
          transition={springs.default}
        >
          <div
            className="h-1 bg-gradient-to-r from-transparent via-cyan-400 to-cyan-300 rounded-full origin-left"
            style={{ width: `${Math.min(magnitude * 500, 80)}%` }}
          />
        </motion.div>
        
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full" />
      </div>

      <div className="mt-2 text-center">
        <div className="text-xs text-white/50 uppercase tracking-wider">VELOCITY</div>
        <div className="text-sm font-mono text-cyan-400">
          |v| = {(magnitude * 100).toFixed(2)}%/day
        </div>
      </div>
    </div>
  );
}

// 엔트로피 미터
function EntropyMeter({ omega }: { omega: number }) {
  const bars = 20;
  const filledBars = Math.floor(omega * bars);

  return (
    <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white/5">
      <div className="flex gap-0.5 h-20 items-end">
        {Array.from({ length: bars }).map((_, i) => (
          <motion.div
            key={i}
            className="w-2 rounded-full"
            initial={{ height: '10%', opacity: 0.2 }}
            animate={{
              height: i < filledBars ? `${30 + Math.random() * 70}%` : '10%',
              opacity: i < filledBars ? 1 : 0.2,
              backgroundColor: i < filledBars
                ? omega > 0.7 ? '#f43f5e' : omega > 0.4 ? '#f59e0b' : '#22c55e'
                : 'rgba(255,255,255,0.1)',
            }}
            transition={{ duration: 0.5, delay: i * 0.02 }}
          />
        ))}
      </div>

      <div className="mt-2 text-center">
        <div className="text-xs text-white/50 uppercase tracking-wider">ENTROPY Ω</div>
        <div className={`text-sm font-mono ${
          omega > 0.7 ? 'text-rose-400' : omega > 0.4 ? 'text-amber-400' : 'text-emerald-400'
        }`}>
          {(omega * 100).toFixed(1)}%
        </div>
      </div>
    </div>
  );
}

export default KIGaugeCluster;
