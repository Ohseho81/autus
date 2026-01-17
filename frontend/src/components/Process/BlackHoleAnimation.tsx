/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS 블랙홀 삭제 애니메이션
 * Black Hole Absorption Animation Component
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * 삭제 메타포:
 * - 업무가 블랙홀로 빨려 들어감
 * - 파티클 흩어짐
 * - 완전 소멸
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

interface BlackHoleProps {
  isActive: boolean;
  centerX?: number;
  centerY?: number;
  onAbsorbComplete?: () => void;
  absorbingItems?: Array<{
    id: string;
    name: string;
    x: number;
    y: number;
    color: string;
  }>;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  delay: number;
  duration: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Black Hole Component
// ═══════════════════════════════════════════════════════════════════════════════

export function BlackHoleAnimation({
  isActive,
  centerX = 400,
  centerY = 300,
  onAbsorbComplete,
  absorbingItems = [],
}: BlackHoleProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [phase, setPhase] = useState<'idle' | 'forming' | 'absorbing' | 'collapsing'>('idle');

  // 애니메이션 시작
  useEffect(() => {
    if (isActive) {
      setPhase('forming');
      
      // 파티클 생성
      const newParticles: Particle[] = [];
      for (let i = 0; i < 50; i++) {
        newParticles.push({
          id: i,
          x: Math.random() * 800,
          y: Math.random() * 600,
          size: 2 + Math.random() * 4,
          color: ['#8b5cf6', '#a855f7', '#d946ef', '#ec4899'][Math.floor(Math.random() * 4)],
          delay: Math.random() * 1,
          duration: 1 + Math.random() * 1.5,
        });
      }
      setParticles(newParticles);

      // 흡수 단계
      setTimeout(() => setPhase('absorbing'), 500);
      
      // 붕괴 단계
      setTimeout(() => setPhase('collapsing'), 2500);
      
      // 완료
      setTimeout(() => {
        setPhase('idle');
        setParticles([]);
        onAbsorbComplete?.();
      }, 3500);
    }
  }, [isActive, onAbsorbComplete]);

  if (!isActive && phase === 'idle') return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* 배경 어둡게 */}
      <motion.div
        className="absolute inset-0 bg-black"
        initial={{ opacity: 0 }}
        animate={{ opacity: phase !== 'idle' ? 0.5 : 0 }}
        exit={{ opacity: 0 }}
      />

      {/* 블랙홀 SVG */}
      <svg className="absolute inset-0 w-full h-full">
        <defs>
          {/* 블랙홀 그라디언트 */}
          <radialGradient id="blackHoleGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#000000" />
            <stop offset="30%" stopColor="#1f1f1f" />
            <stop offset="60%" stopColor="#4c1d95" stopOpacity={0.6} />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>

          {/* 이벤트 호라이즌 글로우 */}
          <filter id="glowFilter" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* 회오리 패턴 */}
          <pattern id="spiralPattern" patternUnits="userSpaceOnUse" width="100" height="100">
            <path
              d="M50,50 Q75,25 100,50 Q75,75 50,100 Q25,75 0,50 Q25,25 50,0 Q75,25 100,50"
              fill="none"
              stroke="#8b5cf6"
              strokeWidth="0.5"
              opacity="0.3"
            />
          </pattern>
        </defs>

        {/* 외부 광륜 */}
        <AnimatePresence>
          {phase !== 'idle' && (
            <motion.circle
              cx={centerX}
              cy={centerY}
              initial={{ r: 0, opacity: 0 }}
              animate={{
                r: phase === 'collapsing' ? 0 : [100, 120, 100],
                opacity: phase === 'collapsing' ? 0 : [0.3, 0.6, 0.3],
              }}
              transition={{
                r: { duration: 1.5, repeat: phase === 'collapsing' ? 0 : Infinity },
                opacity: { duration: 1.5, repeat: phase === 'collapsing' ? 0 : Infinity },
              }}
              fill="url(#blackHoleGrad)"
            />
          )}
        </AnimatePresence>

        {/* 중심 블랙홀 */}
        <motion.circle
          cx={centerX}
          cy={centerY}
          initial={{ r: 0 }}
          animate={{
            r: phase === 'forming' ? 40 : phase === 'absorbing' ? 50 : phase === 'collapsing' ? 0 : 0,
          }}
          transition={{ duration: phase === 'collapsing' ? 0.5 : 0.5 }}
          fill="#000000"
        />

        {/* 이벤트 호라이즌 (회전 링) */}
        <motion.circle
          cx={centerX}
          cy={centerY}
          initial={{ r: 0 }}
          animate={{
            r: phase === 'collapsing' ? 0 : 55,
          }}
          fill="none"
          stroke="#8b5cf6"
          strokeWidth={3}
          filter="url(#glowFilter)"
          style={{ transformOrigin: `${centerX}px ${centerY}px` }}
        >
          <animateTransform
            attributeName="transform"
            type="rotate"
            from={`0 ${centerX} ${centerY}`}
            to={`360 ${centerX} ${centerY}`}
            dur="3s"
            repeatCount="indefinite"
          />
        </motion.circle>

        {/* 내부 링 (반대 회전) */}
        <motion.circle
          cx={centerX}
          cy={centerY}
          initial={{ r: 0 }}
          animate={{
            r: phase === 'collapsing' ? 0 : 45,
          }}
          fill="none"
          stroke="#d946ef"
          strokeWidth={1}
          strokeDasharray="10,5"
          opacity={0.6}
        >
          <animateTransform
            attributeName="transform"
            type="rotate"
            from={`360 ${centerX} ${centerY}`}
            to={`0 ${centerX} ${centerY}`}
            dur="2s"
            repeatCount="indefinite"
          />
        </motion.circle>

        {/* 흡수되는 아이템들 */}
        <AnimatePresence>
          {phase === 'absorbing' && absorbingItems.map(item => (
            <motion.g key={item.id}>
              <motion.circle
                cx={item.x}
                cy={item.y}
                r={15}
                fill={item.color}
                initial={{ scale: 1, opacity: 1 }}
                animate={{
                  cx: centerX,
                  cy: centerY,
                  scale: 0,
                  opacity: 0,
                }}
                transition={{ duration: 1.5, ease: 'easeIn' }}
              />
              <motion.text
                x={item.x}
                y={item.y - 25}
                textAnchor="middle"
                fill="#fff"
                fontSize={10}
                initial={{ opacity: 1 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
              >
                {item.name}
              </motion.text>
            </motion.g>
          ))}
        </AnimatePresence>
      </svg>

      {/* 파티클들 */}
      <AnimatePresence>
        {phase !== 'idle' && particles.map(particle => (
          <motion.div
            key={particle.id}
            className="absolute rounded-full"
            style={{
              width: particle.size,
              height: particle.size,
              backgroundColor: particle.color,
              left: particle.x,
              top: particle.y,
              boxShadow: `0 0 ${particle.size * 2}px ${particle.color}`,
            }}
            initial={{ opacity: 1, scale: 1 }}
            animate={{
              x: centerX - particle.x,
              y: centerY - particle.y,
              opacity: 0,
              scale: 0,
            }}
            transition={{
              duration: particle.duration,
              delay: particle.delay,
              ease: 'easeIn',
            }}
          />
        ))}
      </AnimatePresence>

      {/* 중앙 텍스트 */}
      <AnimatePresence>
        {phase === 'absorbing' && (
          <motion.div
            className="absolute text-center"
            style={{ left: centerX - 100, top: centerY + 80, width: 200 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <div className="text-purple-400 text-lg font-bold">🌀 흡수 중...</div>
            <div className="text-slate-400 text-sm">{absorbingItems.length}개 업무 삭제</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 완료 이펙트 */}
      <AnimatePresence>
        {phase === 'collapsing' && (
          <motion.div
            className="absolute"
            style={{ left: centerX - 100, top: centerY - 100, width: 200, height: 200 }}
            initial={{ scale: 1, opacity: 1 }}
            animate={{ scale: 3, opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="w-full h-full rounded-full bg-gradient-to-r from-purple-600 to-pink-600 opacity-50" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Standalone Demo Component
// ═══════════════════════════════════════════════════════════════════════════════

export function BlackHoleDemo() {
  const [isActive, setIsActive] = useState(false);

  const mockItems = [
    { id: '1', name: '송장 자동생성', x: 200, y: 150, color: '#10b981' },
    { id: '2', name: '정기 송장', x: 600, y: 200, color: '#10b981' },
    { id: '3', name: '자동 결제', x: 300, y: 400, color: '#22c55e' },
  ];

  return (
    <div className="relative w-full h-screen bg-slate-900">
      <button
        onClick={() => setIsActive(true)}
        disabled={isActive}
        className="absolute top-4 left-4 z-10 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg text-white font-bold disabled:opacity-50"
      >
        🌀 블랙홀 흡수 시작
      </button>

      {/* 업무 노드들 (삭제 전) */}
      {!isActive && mockItems.map(item => (
        <div
          key={item.id}
          className="absolute flex flex-col items-center"
          style={{ left: item.x - 40, top: item.y - 40 }}
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold"
            style={{ backgroundColor: item.color }}
          >
            98%
          </div>
          <span className="mt-2 text-white text-sm">{item.name}</span>
        </div>
      ))}

      <BlackHoleAnimation
        isActive={isActive}
        centerX={400}
        centerY={300}
        absorbingItems={mockItems}
        onAbsorbComplete={() => {
          setIsActive(false);
          console.log('흡수 완료!');
        }}
      />
    </div>
  );
}

export default BlackHoleAnimation;
