/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🏛️ AUTUS GATE FEEDBACK UI — Physical Sensation Layer
 * 승인/차단을 "느낌"으로 전달
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * 목적:
 * - 승인/차단을 "느낌"으로 전달
 * - Alert/Modal/Text Warning 금지
 * 
 * 구성요소:
 * [A] Interaction Modifier - Click Latency, Drag Resistance
 * [B] Visual Distortion - Chromatic Aberration, Blur, Elasticity
 * [C] State Driver - GateState Observer
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

type GateState = 'OBSERVE' | 'RING' | 'LOCK';

interface GateFeedbackProps {
  children: React.ReactNode;
  wsUrl?: string;
}

interface GateConfig {
  clickLatency: number;      // ms
  dragResistance: number;    // 0-1
  blur: number;              // px
  chromaticShift: number;    // px
  elasticity: number;        // 0-1
  saturation: number;        // 0-1
  brightness: number;        // 0-1
}

// ═══════════════════════════════════════════════════════════════════════════════
// GATE CONFIGS (Immutable)
// ═══════════════════════════════════════════════════════════════════════════════

const GATE_CONFIGS: Record<GateState, GateConfig> = {
  OBSERVE: {
    clickLatency: 0,
    dragResistance: 0,
    blur: 0,
    chromaticShift: 0,
    elasticity: 0,
    saturation: 1,
    brightness: 1,
  },
  RING: {
    clickLatency: 150,
    dragResistance: 0.3,
    blur: 1,
    chromaticShift: 1,
    elasticity: 0.2,
    saturation: 0.9,
    brightness: 0.95,
  },
  LOCK: {
    clickLatency: 500,
    dragResistance: 0.8,
    blur: 4,
    chromaticShift: 3,
    elasticity: 0.5,
    saturation: 0.5,
    brightness: 0.7,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// GATE FEEDBACK COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export const GateFeedback: React.FC<GateFeedbackProps> = ({ 
  children, 
  wsUrl = 'ws://localhost:8000/stream/gate' 
}) => {
  const [gateState, setGateState] = useState<GateState>('OBSERVE');
  const [config, setConfig] = useState<GateConfig>(GATE_CONFIGS.OBSERVE);
  const containerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // ─────────────────────────────────────────────────────────────────────────────
  // [C] State Driver - GateState Observer
  // ─────────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const connect = () => {
      try {
        wsRef.current = new WebSocket(wsUrl);
        
        wsRef.current.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.state) {
            setGateState(data.state as GateState);
            setConfig(GATE_CONFIGS[data.state as GateState]);
          }
        };

        wsRef.current.onclose = () => {
          // Reconnect after 3s
          setTimeout(connect, 3000);
        };
      } catch (e) {
        // Fallback: poll API
        pollGateState();
      }
    };

    connect();

    return () => {
      wsRef.current?.close();
    };
  }, [wsUrl]);

  const pollGateState = async () => {
    try {
      const res = await fetch('http://localhost:8000/gate/state');
      const data = await res.json();
      setGateState(data.state as GateState);
      setConfig(GATE_CONFIGS[data.state as GateState]);
    } catch (e) {
      // Silent fail
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // [A] Interaction Modifier
  // ─────────────────────────────────────────────────────────────────────────────

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (config.clickLatency > 0) {
      e.preventDefault();
      e.stopPropagation();
      
      // Delay click propagation
      setTimeout(() => {
        const target = e.target as HTMLElement;
        target.click();
      }, config.clickLatency);
    }
  }, [config.clickLatency]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    if (config.dragResistance > 0) {
      // Apply drag resistance
      const resistance = config.dragResistance;
      if (Math.random() < resistance) {
        e.preventDefault();
      }
    }
  }, [config.dragResistance]);

  // ─────────────────────────────────────────────────────────────────────────────
  // [B] Visual Distortion - CSS Filters
  // ─────────────────────────────────────────────────────────────────────────────

  const getFilterStyle = (): React.CSSProperties => {
    const filters: string[] = [];
    
    if (config.blur > 0) {
      filters.push(`blur(${config.blur}px)`);
    }
    if (config.saturation !== 1) {
      filters.push(`saturate(${config.saturation})`);
    }
    if (config.brightness !== 1) {
      filters.push(`brightness(${config.brightness})`);
    }

    return {
      filter: filters.length > 0 ? filters.join(' ') : 'none',
      transition: 'filter 0.5s ease-in-out',
    };
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // [B] Visual Distortion - Chromatic Aberration Overlay
  // ─────────────────────────────────────────────────────────────────────────────

  const ChromaticOverlay = () => {
    if (config.chromaticShift === 0) return null;

    const shift = config.chromaticShift;
    
    return (
      <>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            mixBlendMode: 'screen',
            opacity: 0.3,
            transform: `translate(${shift}px, 0)`,
            background: 'radial-gradient(circle, rgba(255,0,0,0.1) 0%, transparent 70%)',
            zIndex: 9998,
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            mixBlendMode: 'screen',
            opacity: 0.3,
            transform: `translate(-${shift}px, 0)`,
            background: 'radial-gradient(circle, rgba(0,0,255,0.1) 0%, transparent 70%)',
            zIndex: 9998,
          }}
        />
      </>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // [B] Visual Distortion - Screen Elasticity
  // ─────────────────────────────────────────────────────────────────────────────

  const getElasticityStyle = (): React.CSSProperties => {
    if (config.elasticity === 0) return {};

    return {
      transform: `scale(${1 - config.elasticity * 0.02})`,
      transition: 'transform 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    };
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div
      ref={containerRef}
      onClick={config.clickLatency > 0 ? handleClick : undefined}
      onDragStart={handleDrag}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        ...getFilterStyle(),
        ...getElasticityStyle(),
      }}
      data-gate-state={gateState}
    >
      {children}
      <ChromaticOverlay />
      
      {/* Gate State Indicator (Debug) */}
      {process.env.NODE_ENV === 'development' && (
        <div
          style={{
            position: 'fixed',
            bottom: 10,
            left: 10,
            padding: '4px 8px',
            background: gateState === 'LOCK' ? '#ef4444' : 
                       gateState === 'RING' ? '#f59e0b' : '#10b981',
            color: 'white',
            fontSize: 10,
            borderRadius: 4,
            zIndex: 9999,
            fontFamily: 'monospace',
          }}
        >
          GATE: {gateState}
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK: useGateFeedback
// ═══════════════════════════════════════════════════════════════════════════════

export const useGateFeedback = () => {
  const [gateState, setGateState] = useState<GateState>('OBSERVE');

  useEffect(() => {
    const fetchState = async () => {
      try {
        const res = await fetch('http://localhost:8000/gate/state');
        const data = await res.json();
        setGateState(data.state as GateState);
      } catch (e) {
        // Silent
      }
    };

    fetchState();
    const interval = setInterval(fetchState, 1000);
    
    return () => clearInterval(interval);
  }, []);

  return {
    gateState,
    config: GATE_CONFIGS[gateState],
    isLocked: gateState === 'LOCK',
    isRing: gateState === 'RING',
    isObserve: gateState === 'OBSERVE',
  };
};

export default GateFeedback;
