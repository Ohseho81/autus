'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSystemState } from '../providers/StateProvider';

export default function SolarPage() {
  const router = useRouter();
  const { state, refreshState } = useSystemState();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [autoTransition, setAutoTransition] = useState(3);

  // ═══════════════════════════════════════════════════════════════════════════════
  // 상태 기반 자동 전이
  // ═══════════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (state.canNavigateToAction && state.risk >= 60 && state.gate !== 'RED') {
      const timer = setInterval(() => {
        setAutoTransition(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            router.push('/action');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(timer);
    } else {
      setAutoTransition(3);
    }
  }, [state.canNavigateToAction, state.risk, state.gate, router]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // SOLAR 렌더링 (Canvas)
  // ═══════════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let startTime = Date.now();

    function resize() {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    function render() {
      if (!ctx || !canvas) return;
      
      const elapsed = (Date.now() - startTime) / 1000;
      
      // 배경
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const baseRadius = Math.min(canvas.width, canvas.height) * 0.35;

      // 태양 (중심) - 상태에 따라 색상 변화
      const sunColor = state.gate === 'RED' ? '#ff4444' :
                       state.gate === 'AMBER' || state.gate === 'YELLOW' ? '#ffaa00' : '#FFD700';
      
      // 태양 글로우
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, 80);
      gradient.addColorStop(0, sunColor);
      gradient.addColorStop(0.5, sunColor + '88');
      gradient.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(cx, cy, 80, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // 태양 코어
      ctx.beginPath();
      ctx.arc(cx, cy, 40, 0, Math.PI * 2);
      ctx.fillStyle = sunColor;
      ctx.fill();

      // 행성 데이터
      const planets = [
        { name: 'Recovery', r: baseRadius * 0.35, speed: 0.5, color: '#4ECDC4', size: 8 },
        { name: 'Stability', r: baseRadius * 0.45, speed: 0.4, color: '#45B7D1', size: 7 },
        { name: 'Cohesion', r: baseRadius * 0.55, speed: 0.3, color: '#96CEB4', size: 9 },
        { name: 'Shock', r: baseRadius * 0.65, speed: 0.25, color: '#FF6B6B', size: 8 },
        { name: 'Friction', r: baseRadius * 0.75, speed: 0.2, color: '#FFEAA7', size: 7 },
        { name: 'Transfer', r: baseRadius * 0.85, speed: 0.15, color: '#DDA0DD', size: 8 },
        { name: 'Time', r: baseRadius * 0.92, speed: 0.12, color: '#87CEEB', size: 6 },
        { name: 'Quality', r: baseRadius * 0.97, speed: 0.1, color: '#98FB98', size: 6 },
        { name: 'Output', r: baseRadius * 1.02, speed: 0.08, color: '#FFB6C1', size: 7 },
      ];

      // RED 상태에서는 진동
      const vibration = state.gate === 'RED' ? Math.sin(elapsed * 20) * 3 : 0;

      planets.forEach((planet, i) => {
        const speedMod = state.gate === 'RED' ? 0.1 : 1;
        const angle = elapsed * planet.speed * speedMod + (i * Math.PI / 4.5);
        const x = cx + Math.cos(angle) * planet.r + vibration;
        const y = cy + Math.sin(angle) * planet.r;

        // 궤도
        ctx.beginPath();
        ctx.arc(cx, cy, planet.r, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // 행성 글로우
        const planetGlow = ctx.createRadialGradient(x, y, 0, x, y, planet.size * 2);
        planetGlow.addColorStop(0, planet.color);
        planetGlow.addColorStop(1, 'transparent');
        ctx.beginPath();
        ctx.arc(x, y, planet.size * 2, 0, Math.PI * 2);
        ctx.fillStyle = planetGlow;
        ctx.fill();

        // 행성 코어
        ctx.beginPath();
        ctx.arc(x, y, planet.size, 0, Math.PI * 2);
        ctx.fillStyle = planet.color;
        ctx.fill();
      });

      animationId = requestAnimationFrame(render);
    }

    resize();
    render();

    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
    };
  }, [state.gate]);

  // ═══════════════════════════════════════════════════════════════════════════════
  // UI
  // ═══════════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* Canvas */}
      <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0 }} />

      {/* Header */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        padding: '16px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'linear-gradient(rgba(0,0,0,0.9), transparent)',
        zIndex: 10,
      }}>
        <div style={{
          padding: '8px 20px',
          borderRadius: 6,
          fontWeight: 800,
          fontSize: 14,
          letterSpacing: 1,
          background: state.gate === 'GREEN' ? '#00ff88' :
                      state.gate === 'AMBER' || state.gate === 'YELLOW' ? '#ffaa00' : '#ff4444',
          color: state.gate === 'RED' ? '#fff' : '#000',
        }}>
          {state.gate}
        </div>
        
        <div style={{ 
          display: 'flex', 
          gap: 24, 
          color: 'rgba(255,255,255,0.6)', 
          fontSize: 13,
          fontFamily: 'monospace',
        }}>
          <span>RISK: {state.risk}%</span>
          <span>SURVIVAL: {state.survivalDays}d</span>
        </div>
      </div>

      {/* Bottom Action Panel (조건부) */}
      {state.canNavigateToAction && (
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '48px 32px 32px',
          background: 'linear-gradient(transparent, rgba(0,0,0,0.98))',
          textAlign: 'center',
          zIndex: 10,
        }}>
          {/* Impact */}
          <div style={{ 
            fontSize: 48, 
            fontWeight: 800, 
            color: '#00ff88', 
            marginBottom: 8,
            textShadow: '0 0 40px rgba(0,255,136,0.5)',
          }}>
            -{state.risk}%
          </div>
          
          <div style={{ 
            fontSize: 14, 
            color: 'rgba(255,255,255,0.5)', 
            marginBottom: 24,
          }}>
            즉시 행동하지 않으면 손실 확정
          </div>

          {/* CTA Button */}
          <button
            onClick={() => router.push('/action')}
            style={{
              width: '100%',
              maxWidth: 400,
              padding: '20px 48px',
              fontSize: 18,
              fontWeight: 800,
              letterSpacing: 1,
              background: '#00ff88',
              color: '#000',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            지금 조치
          </button>
          
          {/* Auto-transition countdown */}
          <div style={{ 
            marginTop: 16, 
            color: 'rgba(255,255,255,0.25)', 
            fontSize: 12,
            fontFamily: 'monospace',
          }}>
            자동 전이 {autoTransition}초
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {state.isLoading && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
        }}>
          <div style={{ color: '#00ff88', fontSize: 18 }}>
            Loading SOLAR...
          </div>
        </div>
      )}
    </div>
  );
}
