/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ✨ GrowthAnimation — V 복리 성장 애니메이션
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * 결정 수락 시 V 증가를 시각적으로 표현
 * 
 * Features:
 * - 숫자 카운팅 애니메이션
 * - 파티클 효과
 * - 펄스 링
 * - 성장률 표시
 */
import React, { useEffect, useState, useRef } from 'react';

interface GrowthAnimationProps {
  fromV: number;
  toV: number;
  delta: number;
  synergy: number;
  duration?: number;
  onComplete?: () => void;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

export const GrowthAnimation: React.FC<GrowthAnimationProps> = ({
  fromV,
  toV,
  delta,
  synergy,
  duration = 1500,
  onComplete,
}) => {
  const [currentV, setCurrentV] = useState(fromV);
  const [showDelta, setShowDelta] = useState(false);
  const [pulseScale, setPulseScale] = useState(1);
  const [particles, setParticles] = useState<Particle[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();

  // 숫자 카운팅 애니메이션
  useEffect(() => {
    const startTime = performance.now();
    
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutExpo(progress);
      
      const current = Math.round(fromV + (toV - fromV) * eased);
      setCurrentV(current);
      
      // 펄스 효과
      if (progress < 0.3) {
        setPulseScale(1 + Math.sin(progress * Math.PI * 10) * 0.1);
      } else {
        setPulseScale(1);
      }
      
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setShowDelta(true);
        onComplete?.();
      }
    };
    
    // 파티클 생성
    createParticles();
    
    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [fromV, toV, duration, onComplete]);

  // 파티클 생성
  const createParticles = () => {
    const newParticles: Particle[] = [];
    const colors = ['#10b981', '#06b6d4', '#34d399', '#22d3ee'];
    
    for (let i = 0; i < 20; i++) {
      const angle = (Math.PI * 2 * i) / 20;
      const speed = 2 + Math.random() * 3;
      
      newParticles.push({
        id: i,
        x: 0,
        y: 0,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: 1,
        size: 4 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
    
    setParticles(newParticles);
    
    // 파티클 애니메이션
    const animateParticles = () => {
      setParticles(prev => {
        const updated = prev.map(p => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          vy: p.vy + 0.1, // 중력
          life: p.life - 0.02,
        })).filter(p => p.life > 0);
        
        if (updated.length > 0) {
          requestAnimationFrame(animateParticles);
        }
        
        return updated;
      });
    };
    
    requestAnimationFrame(animateParticles);
  };

  const growthRate = fromV > 0 ? ((toV - fromV) / fromV * 100).toFixed(1) : '0';

  return (
    <div ref={containerRef} style={styles.container}>
      {/* 펄스 링 */}
      <div 
        style={{
          ...styles.pulseRing,
          transform: `scale(${pulseScale})`,
          opacity: pulseScale > 1 ? 0.5 : 0,
        }}
      />
      <div 
        style={{
          ...styles.pulseRing,
          ...styles.pulseRing2,
          transform: `scale(${pulseScale * 1.2})`,
          opacity: pulseScale > 1 ? 0.3 : 0,
        }}
      />
      
      {/* 메인 V 디스플레이 */}
      <div style={styles.vDisplay}>
        <span 
          style={{
            ...styles.vValue,
            transform: `scale(${pulseScale})`,
          }}
        >
          {currentV}
        </span>
        <span style={styles.vLabel}>V</span>
      </div>
      
      {/* 델타 표시 */}
      <div 
        style={{
          ...styles.delta,
          opacity: showDelta ? 1 : 0,
          transform: showDelta ? 'translateY(0)' : 'translateY(10px)',
        }}
      >
        +{delta}
      </div>
      
      {/* 성장률 */}
      <div style={styles.growthRate}>
        <span style={styles.growthIcon}>📈</span>
        <span>+{growthRate}%</span>
      </div>
      
      {/* Synergy 표시 */}
      <div style={styles.synergy}>
        Synergy: {(synergy * 100).toFixed(1)}%
      </div>
      
      {/* 파티클 */}
      <div style={styles.particleContainer}>
        {particles.map(p => (
          <div
            key={p.id}
            style={{
              ...styles.particle,
              left: `calc(50% + ${p.x}px)`,
              top: `calc(50% + ${p.y}px)`,
              width: p.size,
              height: p.size,
              background: p.color,
              opacity: p.life,
              transform: `scale(${p.life})`,
            }}
          />
        ))}
      </div>
      
      {/* 복리 공식 */}
      <div style={styles.formula}>
        V = (M - T) × (1 + s)<sup>t</sup>
      </div>
    </div>
  );
};

// Easing
function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

// Styles
const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '300px',
    background: 'linear-gradient(180deg, rgba(16,185,129,0.1) 0%, transparent 100%)',
    borderRadius: '24px',
    padding: '40px',
    overflow: 'hidden',
  },
  pulseRing: {
    position: 'absolute',
    width: '200px',
    height: '200px',
    borderRadius: '50%',
    border: '2px solid rgba(16, 185, 129, 0.5)',
    transition: 'all 0.1s',
  },
  pulseRing2: {
    border: '1px solid rgba(6, 182, 212, 0.3)',
  },
  vDisplay: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '8px',
    zIndex: 1,
  },
  vValue: {
    fontSize: '72px',
    fontWeight: 800,
    background: 'linear-gradient(135deg, #10b981, #06b6d4)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    transition: 'transform 0.1s',
  },
  vLabel: {
    fontSize: '24px',
    color: '#6b7280',
    fontWeight: 600,
  },
  delta: {
    position: 'absolute',
    top: '30%',
    right: '20%',
    fontSize: '24px',
    fontWeight: 700,
    color: '#10b981',
    transition: 'all 0.3s',
  },
  growthRate: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '16px',
    padding: '8px 16px',
    background: 'rgba(16, 185, 129, 0.1)',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: 600,
    color: '#10b981',
  },
  growthIcon: {
    fontSize: '16px',
  },
  synergy: {
    marginTop: '12px',
    fontSize: '13px',
    color: '#9ca3af',
  },
  particleContainer: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
  },
  particle: {
    position: 'absolute',
    borderRadius: '50%',
    transition: 'opacity 0.1s',
  },
  formula: {
    position: 'absolute',
    bottom: '20px',
    fontSize: '12px',
    color: '#4b5563',
    fontFamily: 'monospace',
  },
};

export default GrowthAnimation;
