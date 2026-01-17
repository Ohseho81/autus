/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🏛️ AUTUS AUTHORITY BOUNDARY UI — Visibility Control Layer
 * 권한 밖 세계 차단
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * 목적:
 * - 권한 밖 세계 차단
 * - 데이터에 접근 ❌
 * - 시야만 차단
 * - 권한 밖 정보 "존재 자체" 제거
 * 
 * 구성요소:
 * [A] LOD Controller - Resolution Dropper, Detail Culling
 * [B] Fog of War - Quantum Fog Shader, Distance-Based Obfuscation
 * [C] Access Gate - Scale Lock Enforcer
 * 
 * 금지:
 * - Bypass ❌
 * - Request Access Button ❌
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

type KScale = 2 | 4 | 5 | 6 | 10;

interface AuthorityBoundaryProps {
  children: React.ReactNode;
  currentScale: KScale;
  requiredScale?: KScale;
}

interface FogConfig {
  intensity: number;      // 0-1
  blur: number;           // px
  noise: number;          // 0-1
  visibility: number;     // 0-1
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCALE PERMISSIONS
// ═══════════════════════════════════════════════════════════════════════════════

const SCALE_VISIBILITY: Record<KScale, {
  canSee: KScale[];
  fogConfig: FogConfig;
}> = {
  2: {
    canSee: [2],
    fogConfig: { intensity: 0.8, blur: 8, noise: 0.3, visibility: 0.2 },
  },
  4: {
    canSee: [2, 4],
    fogConfig: { intensity: 0.6, blur: 5, noise: 0.2, visibility: 0.4 },
  },
  5: {
    canSee: [2, 4, 5],
    fogConfig: { intensity: 0.4, blur: 3, noise: 0.1, visibility: 0.6 },
  },
  6: {
    canSee: [2, 4, 5, 6],
    fogConfig: { intensity: 0.2, blur: 1, noise: 0.05, visibility: 0.8 },
  },
  10: {
    canSee: [2, 4, 5, 6, 10],
    fogConfig: { intensity: 0, blur: 0, noise: 0, visibility: 1 },
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// AUTHORITY BOUNDARY COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export const AuthorityBoundary: React.FC<AuthorityBoundaryProps> = ({
  children,
  currentScale,
  requiredScale,
}) => {
  const [fogOpacity, setFogOpacity] = useState(0);

  // ─────────────────────────────────────────────────────────────────────────────
  // [C] Access Gate - Scale Lock Enforcer
  // ─────────────────────────────────────────────────────────────────────────────

  const hasAccess = useMemo(() => {
    if (!requiredScale) return true;
    return SCALE_VISIBILITY[currentScale].canSee.includes(requiredScale);
  }, [currentScale, requiredScale]);

  const fogConfig = useMemo(() => {
    if (hasAccess) {
      return { intensity: 0, blur: 0, noise: 0, visibility: 1 };
    }
    return SCALE_VISIBILITY[currentScale].fogConfig;
  }, [currentScale, hasAccess]);

  // ─────────────────────────────────────────────────────────────────────────────
  // [B] Fog of War - Quantum Fog Shader
  // ─────────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!hasAccess) {
      // Animate fog in
      const animate = () => {
        setFogOpacity(prev => {
          const target = fogConfig.intensity;
          const diff = target - prev;
          if (Math.abs(diff) < 0.01) return target;
          return prev + diff * 0.1;
        });
      };
      
      const interval = setInterval(animate, 16);
      return () => clearInterval(interval);
    } else {
      setFogOpacity(0);
    }
  }, [hasAccess, fogConfig.intensity]);

  // ─────────────────────────────────────────────────────────────────────────────
  // [A] LOD Controller - Resolution Dropper
  // ─────────────────────────────────────────────────────────────────────────────

  const getContentStyle = useCallback((): React.CSSProperties => {
    if (hasAccess) return {};

    return {
      filter: `blur(${fogConfig.blur}px)`,
      opacity: fogConfig.visibility,
      pointerEvents: 'none' as const,
      userSelect: 'none' as const,
      transition: 'filter 0.5s, opacity 0.5s',
    };
  }, [hasAccess, fogConfig]);

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  // If no access and not K10, completely hide content
  if (!hasAccess && currentScale < 10) {
    return (
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        {/* Fog Layer */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `rgba(5, 5, 8, ${fogOpacity})`,
            backdropFilter: `blur(${fogConfig.blur}px)`,
            zIndex: 100,
            pointerEvents: 'none',
          }}
        />
        
        {/* Noise Overlay */}
        {fogConfig.noise > 0 && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%' height='100%' filter='url(%23noise)'/%3E%3C/svg%3E")`,
              opacity: fogConfig.noise,
              mixBlendMode: 'overlay',
              zIndex: 101,
              pointerEvents: 'none',
            }}
          />
        )}
        
        {/* Content (blurred) */}
        <div style={getContentStyle()}>
          {children}
        </div>
        
        {/* Scale Lock Indicator */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            padding: '20px 40px',
            background: 'rgba(0, 0, 0, 0.9)',
            border: '1px solid rgba(100, 150, 200, 0.2)',
            borderRadius: 12,
            zIndex: 102,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: 24,
              fontWeight: 700,
              fontFamily: "'Courier New', monospace",
              color: '#ef4444',
              marginBottom: 8,
            }}
          >
            K{requiredScale}
          </div>
          <div
            style={{
              fontSize: 10,
              letterSpacing: 2,
              color: '#4b5563',
            }}
          >
            SCALE LOCKED
          </div>
          <div
            style={{
              fontSize: 9,
              color: '#374151',
              marginTop: 8,
            }}
          >
            Current: K{currentScale}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {children}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK: useAuthorityBoundary
// ═══════════════════════════════════════════════════════════════════════════════

export const useAuthorityBoundary = (currentScale: KScale) => {
  const canAccess = useCallback((requiredScale: KScale) => {
    return SCALE_VISIBILITY[currentScale].canSee.includes(requiredScale);
  }, [currentScale]);

  const getFogConfig = useCallback((targetScale: KScale): FogConfig => {
    if (canAccess(targetScale)) {
      return { intensity: 0, blur: 0, noise: 0, visibility: 1 };
    }
    return SCALE_VISIBILITY[currentScale].fogConfig;
  }, [currentScale, canAccess]);

  return {
    currentScale,
    canAccess,
    getFogConfig,
    canSeeK2: canAccess(2),
    canSeeK4: canAccess(4),
    canSeeK5: canAccess(5),
    canSeeK6: canAccess(6),
    canSeeK10: canAccess(10),
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
// FOG OF WAR - Quantum Fog Shader (CSS)
// ═══════════════════════════════════════════════════════════════════════════════

export const QuantumFog: React.FC<{
  intensity: number;
  children?: React.ReactNode;
}> = ({ intensity, children }) => {
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
      }}
    >
      {children}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `
            radial-gradient(ellipse at 30% 40%, rgba(5, 5, 8, ${intensity * 0.3}) 0%, transparent 50%),
            radial-gradient(ellipse at 70% 60%, rgba(5, 5, 8, ${intensity * 0.4}) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 50%, rgba(5, 5, 8, ${intensity * 0.5}) 0%, transparent 70%)
          `,
          pointerEvents: 'none',
          animation: intensity > 0.5 ? 'fogPulse 4s ease-in-out infinite' : 'none',
        }}
      />
      <style>{`
        @keyframes fogPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  );
};

export default AuthorityBoundary;
