/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AuroraBackground - K/I 지수 기반 동적 오로라 배경
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface AuroraBackgroundProps {
  kIndex: number;
  iIndex?: number;
  intensity?: number;
  variant?: 'canvas' | 'css';
}

// CSS 버전 (성능 우선)
export function AuroraBackground({ 
  kIndex, 
  iIndex = 0,
  intensity = 0.5,
  variant = 'css' 
}: AuroraBackgroundProps) {
  if (variant === 'canvas') {
    return <AuroraBackgroundCanvas kIndex={kIndex} iIndex={iIndex} intensity={intensity} />;
  }

  return <AuroraBackgroundCSS kIndex={kIndex} iIndex={iIndex} intensity={intensity} />;
}

// CSS 버전 (기본 - 성능 좋음)
function AuroraBackgroundCSS({ kIndex, iIndex, intensity }: AuroraBackgroundProps) {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
      {/* 메인 오로라 블롭 - K 기반 */}
      <motion.div
        className="absolute w-[800px] h-[800px] rounded-full"
        style={{
          background: kIndex >= 0
            ? `radial-gradient(circle, rgba(34,211,238,${0.4 * intensity}) 0%, transparent 70%)`
            : `radial-gradient(circle, rgba(168,85,247,${0.4 * intensity}) 0%, transparent 70%)`,
          filter: 'blur(60px)',
          left: '10%',
          top: '-10%',
        }}
        animate={{
          x: [0, 100, -50, 0],
          y: [0, -50, 100, 0],
          scale: [1, 1.1, 0.9, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      
      {/* 보조 블롭 - I 기반 */}
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full"
        style={{
          background: iIndex >= 0
            ? `radial-gradient(circle, rgba(59,130,246,${0.3 * intensity}) 0%, transparent 70%)`
            : `radial-gradient(circle, rgba(236,72,153,${0.3 * intensity}) 0%, transparent 70%)`,
          filter: 'blur(80px)',
          right: '-5%',
          top: '20%',
        }}
        animate={{
          x: [0, -80, 40, 0],
          y: [0, 80, -40, 0],
          scale: [1, 0.9, 1.1, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      
      {/* 중간 블롭 */}
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full"
        style={{
          background: `radial-gradient(circle, rgba(139,92,246,${0.25 * intensity}) 0%, transparent 70%)`,
          filter: 'blur(70px)',
          left: '30%',
          bottom: '-20%',
        }}
        animate={{
          x: [0, 60, -30, 0],
          y: [0, -60, 30, 0],
          scale: [1, 1.05, 0.95, 1],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 2,
        }}
      />
      
      {/* 노이즈 오버레이 */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
      
      {/* 그리드 오버레이 */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }}
      />
    </div>
  );
}

// Canvas 버전 (고급 효과)
function AuroraBackgroundCanvas({ kIndex, iIndex = 0, intensity = 0.5 }: AuroraBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    let animationId: number;
    let time = 0;

    // K/I 값에 따른 색상 결정
    const kColor = kIndex >= 0 
      ? { h: 180, s: 70, l: 50 }
      : { h: 270, s: 60, l: 40 };
    
    const iColor = iIndex >= 0
      ? { h: 200, s: 80, l: 60 }
      : { h: 320, s: 50, l: 45 };

    const animate = () => {
      time += 0.002;

      // 그라디언트 생성
      const gradient = ctx.createRadialGradient(
        canvas.width * 0.5 + Math.sin(time) * 200,
        canvas.height * 0.3 + Math.cos(time) * 100,
        0,
        canvas.width * 0.5,
        canvas.height * 0.5,
        canvas.width * 0.8
      );

      gradient.addColorStop(0, `hsla(${kColor.h}, ${kColor.s}%, ${kColor.l}%, ${0.3 * intensity})`);
      gradient.addColorStop(0.5, `hsla(${iColor.h}, ${iColor.s}%, ${iColor.l}%, ${0.2 * intensity})`);
      gradient.addColorStop(1, 'transparent');

      // 이전 프레임 희미하게
      ctx.fillStyle = 'rgba(0, 0, 0, 0.03)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 새 오로라 그리기
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, [kIndex, iIndex, intensity]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none -z-10"
      style={{ mixBlendMode: 'screen' }}
    />
  );
}

export default AuroraBackground;
