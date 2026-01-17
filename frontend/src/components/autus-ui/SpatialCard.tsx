/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SpatialCard - 3D 깊이감 있는 카드
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { cn } from '../../styles/autus-design-system';

interface SpatialCardProps {
  children: React.ReactNode;
  className?: string;
  depth?: number;  // 0-1
  perspective?: number;
  glowColor?: string;
}

export function SpatialCard({ 
  children, 
  className,
  depth = 0.5, 
  perspective = 1000,
  glowColor = 'rgba(34,211,238,0.1)'
}: SpatialCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  
  // 마우스 위치
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  // 스무스한 이동
  const smoothX = useSpring(mouseX, { stiffness: 150, damping: 20 });
  const smoothY = useSpring(mouseY, { stiffness: 150, damping: 20 });
  
  // 회전 변환
  const rotateX = useTransform(smoothY, [-0.5, 0.5], [10 * depth, -10 * depth]);
  const rotateY = useTransform(smoothX, [-0.5, 0.5], [-10 * depth, 10 * depth]);
  
  // 그림자 위치
  const shadowX = useTransform(smoothX, [-0.5, 0.5], [-20, 20]);
  const shadowY = useTransform(smoothY, [-0.5, 0.5], [-20, 20]);
  
  // 하이라이트 위치
  const highlightX = useTransform(smoothX, [-0.5, 0.5], ['0%', '100%']);
  const highlightY = useTransform(smoothY, [-0.5, 0.5], ['0%', '100%']);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <motion.div
      ref={cardRef}
      className={cn("relative rounded-3xl cursor-pointer", className)}
      style={{
        perspective: `${perspective}px`,
        transformStyle: 'preserve-3d',
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <motion.div
        className="relative bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-3xl overflow-hidden"
        style={{
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d',
        }}
      >
        {/* 레이어 1: 배경 글로우 */}
        <motion.div
          className="absolute inset-0 rounded-3xl pointer-events-none"
          style={{
            background: `radial-gradient(circle at center, ${glowColor}, transparent)`,
            x: shadowX,
            y: shadowY,
            filter: 'blur(40px)',
            transform: 'translateZ(-50px)',
          }}
        />
        
        {/* 레이어 2: 컨텐츠 */}
        <div className="relative" style={{ transform: 'translateZ(0px)' }}>
          {children}
        </div>
        
        {/* 레이어 3: 동적 하이라이트 */}
        <motion.div
          className="absolute inset-0 rounded-3xl pointer-events-none opacity-50"
          style={{
            background: `radial-gradient(circle at ${highlightX} ${highlightY}, rgba(255,255,255,0.1), transparent 50%)`,
            transform: 'translateZ(20px)',
          }}
        />
        
        {/* 상단 하이라이트 */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      </motion.div>
    </motion.div>
  );
}

// 심플 버전 (호버만)
export function SpatialCardSimple({ 
  children, 
  className,
  hoverScale = 1.02,
  hoverY = -4 
}: { 
  children: React.ReactNode; 
  className?: string;
  hoverScale?: number;
  hoverY?: number;
}) {
  return (
    <motion.div
      className={cn(
        "relative rounded-3xl overflow-hidden",
        "bg-white/[0.03] backdrop-blur-xl",
        "border border-white/[0.08]",
        "shadow-[0_8px_32px_rgba(0,0,0,0.12)]",
        className
      )}
      whileHover={{ 
        scale: hoverScale, 
        y: hoverY,
        boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      {/* 그라디언트 오버레이 */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/[0.05] to-transparent pointer-events-none" />
      
      {/* 상단 하이라이트 */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      
      {children}
    </motion.div>
  );
}

export default SpatialCard;
