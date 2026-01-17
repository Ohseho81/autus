/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS Elimination Effects (Framer Motion)
 * 노드 합치기 및 증발(Elimination) 애니메이션
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  delay: number;
  duration: number;
  angle: number;
  distance: number;
}

interface EliminationTarget {
  id: string;
  name: string;
  x: number;
  y: number;
  color: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Particle System
// ═══════════════════════════════════════════════════════════════════════════════

function generateParticles(
  centerX: number,
  centerY: number,
  count: number = 20,
  color: string = '#22d3ee'
): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: centerX,
    y: centerY,
    size: Math.random() * 6 + 2,
    color,
    delay: Math.random() * 0.3,
    duration: Math.random() * 0.5 + 0.5,
    angle: (Math.PI * 2 * i) / count + Math.random() * 0.5,
    distance: Math.random() * 100 + 50,
  }));
}

// ═══════════════════════════════════════════════════════════════════════════════
// Evaporation Effect (증발)
// ═══════════════════════════════════════════════════════════════════════════════

interface EvaporationEffectProps {
  active: boolean;
  x: number;
  y: number;
  color?: string;
  onComplete?: () => void;
}

export function EvaporationEffect({ active, x, y, color = '#22d3ee', onComplete }: EvaporationEffectProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [phase, setPhase] = useState<'idle' | 'shrink' | 'explode' | 'fade'>('idle');
  
  useEffect(() => {
    if (active) {
      setPhase('shrink');
      
      // Phase 1: Shrink (0.3s)
      setTimeout(() => {
        setPhase('explode');
        setParticles(generateParticles(x, y, 30, color));
      }, 300);
      
      // Phase 2: Explode (0.5s)
      setTimeout(() => {
        setPhase('fade');
      }, 800);
      
      // Phase 3: Fade (0.3s)
      setTimeout(() => {
        setPhase('idle');
        setParticles([]);
        onComplete?.();
      }, 1100);
    }
  }, [active, x, y, color, onComplete]);
  
  if (!active && phase === 'idle') return null;
  
  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      <svg className="w-full h-full">
        {/* Shrinking circle */}
        <AnimatePresence>
          {phase === 'shrink' && (
            <motion.circle
              cx={x}
              cy={y}
              r={40}
              fill={color}
              initial={{ r: 40, opacity: 1 }}
              animate={{ r: 5, opacity: 0.8 }}
              exit={{ r: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeIn' }}
            />
          )}
        </AnimatePresence>
        
        {/* Explosion particles */}
        <AnimatePresence>
          {(phase === 'explode' || phase === 'fade') && particles.map(particle => (
            <motion.circle
              key={particle.id}
              cx={particle.x}
              cy={particle.y}
              r={particle.size}
              fill={particle.color}
              initial={{ 
                cx: particle.x, 
                cy: particle.y, 
                opacity: 1,
                r: particle.size,
              }}
              animate={{ 
                cx: particle.x + Math.cos(particle.angle) * particle.distance,
                cy: particle.y + Math.sin(particle.angle) * particle.distance,
                opacity: 0,
                r: 0,
              }}
              transition={{ 
                duration: particle.duration,
                delay: particle.delay,
                ease: 'easeOut',
              }}
            />
          ))}
        </AnimatePresence>
        
        {/* Flash */}
        <AnimatePresence>
          {phase === 'explode' && (
            <motion.circle
              cx={x}
              cy={y}
              r={10}
              fill="white"
              initial={{ r: 10, opacity: 1 }}
              animate={{ r: 80, opacity: 0 }}
              transition={{ duration: 0.3 }}
            />
          )}
        </AnimatePresence>
      </svg>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Merge Effect (병합)
// ═══════════════════════════════════════════════════════════════════════════════

interface MergeEffectProps {
  active: boolean;
  sources: Array<{ x: number; y: number; color: string }>;
  target: { x: number; y: number };
  onComplete?: () => void;
}

export function MergeEffect({ active, sources, target, onComplete }: MergeEffectProps) {
  const [phase, setPhase] = useState<'idle' | 'converge' | 'merge' | 'pulse'>('idle');
  
  useEffect(() => {
    if (active && sources.length > 0) {
      setPhase('converge');
      
      // Phase 1: Converge (0.5s)
      setTimeout(() => setPhase('merge'), 500);
      
      // Phase 2: Merge (0.3s)
      setTimeout(() => setPhase('pulse'), 800);
      
      // Phase 3: Pulse (0.4s)
      setTimeout(() => {
        setPhase('idle');
        onComplete?.();
      }, 1200);
    }
  }, [active, sources, onComplete]);
  
  if (!active && phase === 'idle') return null;
  
  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      <svg className="w-full h-full">
        {/* Converging nodes */}
        <AnimatePresence>
          {(phase === 'converge' || phase === 'merge') && sources.map((source, i) => (
            <motion.g key={i}>
              {/* Trail line */}
              <motion.line
                x1={source.x}
                y1={source.y}
                x2={source.x}
                y2={source.y}
                stroke={source.color}
                strokeWidth={2}
                initial={{ x2: source.x, y2: source.y, opacity: 0.5 }}
                animate={{ x2: target.x, y2: target.y, opacity: 0 }}
                transition={{ duration: 0.5, ease: 'easeIn' }}
              />
              
              {/* Moving circle */}
              <motion.circle
                cx={source.x}
                cy={source.y}
                r={15}
                fill={source.color}
                initial={{ cx: source.x, cy: source.y, r: 15, opacity: 1 }}
                animate={{ 
                  cx: target.x, 
                  cy: target.y, 
                  r: phase === 'merge' ? 0 : 15,
                  opacity: phase === 'merge' ? 0 : 1,
                }}
                transition={{ duration: 0.5, ease: 'easeIn' }}
              />
            </motion.g>
          ))}
        </AnimatePresence>
        
        {/* Target pulse */}
        <AnimatePresence>
          {phase === 'pulse' && (
            <>
              <motion.circle
                cx={target.x}
                cy={target.y}
                r={20}
                fill="#8b5cf6"
                initial={{ r: 20, opacity: 1 }}
                animate={{ r: 40, opacity: 0 }}
                transition={{ duration: 0.4 }}
              />
              <motion.circle
                cx={target.x}
                cy={target.y}
                r={25}
                fill="#8b5cf6"
                initial={{ r: 25, opacity: 0.8 }}
                animate={{ r: 60, opacity: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
              />
            </>
          )}
        </AnimatePresence>
      </svg>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Black Hole Absorption (블랙홀 흡수)
// ═══════════════════════════════════════════════════════════════════════════════

interface BlackHoleAbsorptionProps {
  active: boolean;
  targets: EliminationTarget[];
  blackHoleCenter: { x: number; y: number };
  onComplete?: () => void;
}

export function BlackHoleAbsorption({ 
  active, 
  targets, 
  blackHoleCenter,
  onComplete 
}: BlackHoleAbsorptionProps) {
  const [phase, setPhase] = useState<'idle' | 'forming' | 'absorbing' | 'collapse'>('idle');
  const [absorbedCount, setAbsorbedCount] = useState(0);
  
  useEffect(() => {
    if (active && targets.length > 0) {
      setPhase('forming');
      setAbsorbedCount(0);
      
      // Phase 1: Form black hole (0.5s)
      setTimeout(() => setPhase('absorbing'), 500);
      
      // Phase 2: Absorb each target
      const totalAbsorbTime = targets.length * 200;
      targets.forEach((_, i) => {
        setTimeout(() => setAbsorbedCount(i + 1), 500 + i * 200);
      });
      
      // Phase 3: Collapse (0.3s)
      setTimeout(() => setPhase('collapse'), 500 + totalAbsorbTime);
      
      // Complete
      setTimeout(() => {
        setPhase('idle');
        onComplete?.();
      }, 800 + totalAbsorbTime);
    }
  }, [active, targets, onComplete]);
  
  if (!active && phase === 'idle') return null;
  
  const cx = blackHoleCenter.x;
  const cy = blackHoleCenter.y;
  
  return (
    <div className="fixed inset-0 pointer-events-none z-50 bg-black/30">
      <svg className="w-full h-full">
        <defs>
          <radialGradient id="blackhole-gradient">
            <stop offset="0%" stopColor="#000000" />
            <stop offset="50%" stopColor="#1e1b4b" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>
        </defs>
        
        {/* Black hole core */}
        <AnimatePresence>
          {(phase === 'forming' || phase === 'absorbing' || phase === 'collapse') && (
            <motion.g>
              {/* Outer glow */}
              <motion.circle
                cx={cx}
                cy={cy}
                r={50}
                fill="url(#blackhole-gradient)"
                initial={{ r: 0, opacity: 0 }}
                animate={{ 
                  r: phase === 'collapse' ? 0 : 100,
                  opacity: phase === 'collapse' ? 0 : 0.8,
                }}
                transition={{ duration: phase === 'collapse' ? 0.3 : 0.5 }}
              />
              
              {/* Event horizon */}
              <motion.circle
                cx={cx}
                cy={cy}
                r={30}
                fill="#000000"
                stroke="#8b5cf6"
                strokeWidth={3}
                initial={{ r: 0 }}
                animate={{ 
                  r: phase === 'collapse' ? 0 : 30,
                  rotate: 360,
                }}
                transition={{ 
                  r: { duration: 0.5 },
                  rotate: { duration: 3, repeat: Infinity, ease: 'linear' },
                }}
              />
              
              {/* Accretion disk */}
              <motion.ellipse
                cx={cx}
                cy={cy}
                rx={60}
                ry={15}
                fill="none"
                stroke="#a855f7"
                strokeWidth={2}
                initial={{ rx: 0, ry: 0, opacity: 0 }}
                animate={{ 
                  rx: phase === 'collapse' ? 0 : 60,
                  ry: phase === 'collapse' ? 0 : 15,
                  opacity: phase === 'collapse' ? 0 : 0.6,
                  rotate: 360,
                }}
                transition={{
                  rx: { duration: 0.5 },
                  ry: { duration: 0.5 },
                  opacity: { duration: 0.3 },
                  rotate: { duration: 2, repeat: Infinity, ease: 'linear' },
                }}
              />
            </motion.g>
          )}
        </AnimatePresence>
        
        {/* Absorbing targets */}
        {phase === 'absorbing' && targets.map((target, i) => {
          const isAbsorbed = i < absorbedCount;
          
          return (
            <motion.g key={target.id}>
              {/* Spiral path */}
              <motion.circle
                cx={target.x}
                cy={target.y}
                r={12}
                fill={target.color}
                initial={{ cx: target.x, cy: target.y, r: 12, opacity: 1 }}
                animate={isAbsorbed ? {
                  cx: cx,
                  cy: cy,
                  r: 0,
                  opacity: 0,
                } : {}}
                transition={{ duration: 0.3, ease: 'easeIn' }}
              />
              
              {/* Label */}
              {!isAbsorbed && (
                <motion.text
                  x={target.x}
                  y={target.y - 20}
                  textAnchor="middle"
                  fill="#fff"
                  fontSize={10}
                  initial={{ opacity: 1 }}
                  animate={{ opacity: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.2 }}
                >
                  {target.name}
                </motion.text>
              )}
            </motion.g>
          );
        })}
        
        {/* Absorbed count */}
        {phase === 'absorbing' && (
          <motion.text
            x={cx}
            y={cy + 5}
            textAnchor="middle"
            fill="#fff"
            fontSize={14}
            fontWeight="bold"
          >
            {absorbedCount}/{targets.length}
          </motion.text>
        )}
      </svg>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Demo Component
// ═══════════════════════════════════════════════════════════════════════════════

export function EliminationEffectsDemo() {
  const [evaporationActive, setEvaporationActive] = useState(false);
  const [mergeActive, setMergeActive] = useState(false);
  const [blackHoleActive, setBlackHoleActive] = useState(false);
  
  const demoTargets: EliminationTarget[] = [
    { id: '1', name: 'FIN.AR', x: 200, y: 200, color: '#22c55e' },
    { id: '2', name: 'FIN.AP', x: 350, y: 150, color: '#3b82f6' },
    { id: '3', name: 'HR.PAY', x: 500, y: 250, color: '#f59e0b' },
  ];
  
  return (
    <div className="w-full h-screen bg-slate-900 p-8">
      <h1 className="text-white text-2xl font-bold mb-8">Elimination Effects Demo</h1>
      
      <div className="flex gap-4 mb-8">
        <button
          onClick={() => setEvaporationActive(true)}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded text-white"
        >
          💨 Evaporation
        </button>
        <button
          onClick={() => setMergeActive(true)}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded text-white"
        >
          🔗 Merge
        </button>
        <button
          onClick={() => setBlackHoleActive(true)}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-white"
        >
          🌀 Black Hole
        </button>
      </div>
      
      {/* Demo targets visualization */}
      <div className="relative w-full h-96 bg-slate-800 rounded-xl">
        {demoTargets.map(target => (
          <div
            key={target.id}
            className="absolute w-16 h-16 rounded-full flex items-center justify-center text-white text-xs font-bold"
            style={{ 
              left: target.x - 32, 
              top: target.y - 32,
              backgroundColor: target.color,
            }}
          >
            {target.name}
          </div>
        ))}
      </div>
      
      {/* Effects */}
      <EvaporationEffect
        active={evaporationActive}
        x={300}
        y={300}
        color="#22d3ee"
        onComplete={() => setEvaporationActive(false)}
      />
      
      <MergeEffect
        active={mergeActive}
        sources={[
          { x: 200, y: 200, color: '#22c55e' },
          { x: 350, y: 150, color: '#3b82f6' },
        ]}
        target={{ x: 400, y: 300 }}
        onComplete={() => setMergeActive(false)}
      />
      
      <BlackHoleAbsorption
        active={blackHoleActive}
        targets={demoTargets}
        blackHoleCenter={{ x: 400, y: 300 }}
        onComplete={() => setBlackHoleActive(false)}
      />
    </div>
  );
}

export default EliminationEffectsDemo;
