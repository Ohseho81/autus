/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🏛️ AUTUS SIMULATION UI — Causal Replay Layer
 * 인과 재현, "만약" 금지
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * 목적:
 * - 인과 재현
 * - "만약" 금지
 * 
 * 구성요소:
 * [A] Replay Canvas - Deterministic Frame Player, Timeline Cursor
 * [B] Meta Strip - Timestamp, Location Code, Replay Hash
 * [C] Playback Controls - Replay, Pause, Speed Control
 * 
 * 금지:
 * - Annotation ❌
 * - Branching ❌
 * - Export ❌
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface ReplayFrame {
  timestamp: number;
  nodes: Array<{
    id: string;
    lat: number;
    lng: number;
    gate: 'OBSERVE' | 'RING' | 'LOCK';
    waveRadius: number;
  }>;
}

interface ReplayMeta {
  hash: string;
  locationCode: string;
  startTime: string;
  endTime: string;
  frameCount: number;
}

type PlaybackSpeed = 0.5 | 1 | 2 | 4;

// ═══════════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════════

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100%',
    background: '#0a0a0f',
    color: '#9ca3af',
    fontFamily: "'Pretendard', -apple-system, sans-serif",
  },
  canvas: {
    flex: 1,
    position: 'relative' as const,
    background: '#050508',
    borderRadius: 8,
    margin: 16,
    overflow: 'hidden',
  },
  metaStrip: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    background: 'rgba(15, 20, 30, 0.95)',
    borderTop: '1px solid rgba(100, 150, 200, 0.15)',
    fontSize: 11,
    fontFamily: "'Courier New', monospace",
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: '16px',
    background: 'rgba(15, 20, 30, 0.95)',
    borderTop: '1px solid rgba(100, 150, 200, 0.15)',
  },
  button: {
    padding: '10px 20px',
    border: '1px solid rgba(100, 150, 200, 0.3)',
    borderRadius: 8,
    background: 'transparent',
    color: '#9ca3af',
    cursor: 'pointer',
    fontSize: 12,
    letterSpacing: 1,
    transition: 'all 0.2s',
  },
  buttonActive: {
    background: 'rgba(59, 130, 246, 0.2)',
    borderColor: '#3b82f6',
    color: '#3b82f6',
  },
  timeline: {
    flex: 1,
    height: 4,
    background: 'rgba(100, 150, 200, 0.2)',
    borderRadius: 2,
    cursor: 'pointer',
    position: 'relative' as const,
  },
  timelineProgress: {
    height: '100%',
    background: '#3b82f6',
    borderRadius: 2,
    transition: 'width 0.1s linear',
  },
  timelineCursor: {
    position: 'absolute' as const,
    top: -4,
    width: 12,
    height: 12,
    background: '#3b82f6',
    borderRadius: '50%',
    transform: 'translateX(-50%)',
    boxShadow: '0 0 10px #3b82f6',
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// SIMULATION REPLAY COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface SimulationReplayProps {
  replayHash?: string;
}

export const SimulationReplay: React.FC<SimulationReplayProps> = ({ 
  replayHash = 'demo' 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [frames, setFrames] = useState<ReplayFrame[]>([]);
  const [meta, setMeta] = useState<ReplayMeta | null>(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<PlaybackSpeed>(1);
  const animationRef = useRef<number>();

  // ─────────────────────────────────────────────────────────────────────────────
  // Load Replay Data
  // ─────────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const loadReplay = async () => {
      // Demo data (실제로는 API 호출)
      const demoFrames: ReplayFrame[] = Array.from({ length: 100 }, (_, i) => ({
        timestamp: Date.now() + i * 100,
        nodes: [
          { id: 'hq', lat: 37.5665, lng: 126.9780, gate: 'OBSERVE' as const, waveRadius: i * 5 },
          { id: 'gangnam', lat: 37.4979, lng: 127.0276, gate: i > 50 ? 'RING' as const : 'OBSERVE' as const, waveRadius: Math.max(0, (i - 20) * 4) },
          { id: 'pangyo', lat: 37.3947, lng: 127.1119, gate: i > 80 ? 'LOCK' as const : 'OBSERVE' as const, waveRadius: Math.max(0, (i - 40) * 3) },
        ]
      }));

      setFrames(demoFrames);
      setMeta({
        hash: replayHash,
        locationCode: 'KR-SEOUL-GN',
        startTime: new Date(demoFrames[0].timestamp).toISOString(),
        endTime: new Date(demoFrames[demoFrames.length - 1].timestamp).toISOString(),
        frameCount: demoFrames.length,
      });
    };

    loadReplay();
  }, [replayHash]);

  // ─────────────────────────────────────────────────────────────────────────────
  // [A] Replay Canvas - Deterministic Frame Player
  // ─────────────────────────────────────────────────────────────────────────────

  const drawFrame = useCallback((frameIndex: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !frames[frameIndex]) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const frame = frames[frameIndex];
    const width = canvas.width;
    const height = canvas.height;

    // Clear
    ctx.fillStyle = '#050508';
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = 'rgba(100, 150, 200, 0.1)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Draw nodes and waves
    frame.nodes.forEach((node, i) => {
      const x = 100 + i * 150;
      const y = height / 2;

      // Draw wave
      if (node.waveRadius > 0) {
        ctx.beginPath();
        ctx.arc(x, y, node.waveRadius, 0, Math.PI * 2);
        ctx.strokeStyle = node.gate === 'LOCK' ? 'rgba(239, 68, 68, 0.3)' :
                          node.gate === 'RING' ? 'rgba(59, 130, 246, 0.3)' :
                          'rgba(16, 185, 129, 0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Draw node
      const color = node.gate === 'LOCK' ? '#ef4444' :
                    node.gate === 'RING' ? '#3b82f6' : '#10b981';
      
      ctx.beginPath();
      ctx.arc(x, y, 15, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.shadowColor = color;
      ctx.shadowBlur = 15;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Draw label
      ctx.fillStyle = '#9ca3af';
      ctx.font = '10px Courier New';
      ctx.textAlign = 'center';
      ctx.fillText(node.id.toUpperCase(), x, y + 30);
    });

    // Draw frame number
    ctx.fillStyle = '#4b5563';
    ctx.font = '10px Courier New';
    ctx.textAlign = 'right';
    ctx.fillText(`FRAME ${frameIndex + 1}/${frames.length}`, width - 10, 20);
  }, [frames]);

  // ─────────────────────────────────────────────────────────────────────────────
  // [C] Playback Controls
  // ─────────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (isPlaying && frames.length > 0) {
      const interval = 100 / speed;
      
      const animate = () => {
        setCurrentFrame(prev => {
          if (prev >= frames.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      };

      animationRef.current = window.setInterval(animate, interval);
      
      return () => {
        if (animationRef.current) {
          clearInterval(animationRef.current);
        }
      };
    }
  }, [isPlaying, speed, frames.length]);

  useEffect(() => {
    drawFrame(currentFrame);
  }, [currentFrame, drawFrame]);

  // Canvas resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
        drawFrame(currentFrame);
      }
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [currentFrame, drawFrame]);

  const handlePlay = () => setIsPlaying(true);
  const handlePause = () => setIsPlaying(false);
  const handleRestart = () => {
    setCurrentFrame(0);
    setIsPlaying(true);
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = x / rect.width;
    const frame = Math.floor(percent * frames.length);
    setCurrentFrame(Math.max(0, Math.min(frame, frames.length - 1)));
  };

  const progress = frames.length > 0 ? (currentFrame / (frames.length - 1)) * 100 : 0;

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div style={styles.container}>
      {/* [A] Replay Canvas */}
      <div style={styles.canvas}>
        <canvas ref={canvasRef} />
      </div>

      {/* Timeline */}
      <div style={{ padding: '0 16px 16px' }}>
        <div style={styles.timeline} onClick={handleTimelineClick}>
          <div style={{ ...styles.timelineProgress, width: `${progress}%` }} />
          <div style={{ ...styles.timelineCursor, left: `${progress}%` }} />
        </div>
      </div>

      {/* [B] Meta Strip */}
      {meta && (
        <div style={styles.metaStrip}>
          <span>HASH: {meta.hash}</span>
          <span>LOC: {meta.locationCode}</span>
          <span>{new Date(frames[currentFrame]?.timestamp || 0).toISOString()}</span>
        </div>
      )}

      {/* [C] Playback Controls */}
      <div style={styles.controls}>
        <button
          style={styles.button}
          onClick={handleRestart}
        >
          ⟲ RESTART
        </button>
        
        {isPlaying ? (
          <button
            style={{ ...styles.button, ...styles.buttonActive }}
            onClick={handlePause}
          >
            ⏸ PAUSE
          </button>
        ) : (
          <button
            style={{ ...styles.button, ...styles.buttonActive }}
            onClick={handlePlay}
          >
            ▶ REPLAY
          </button>
        )}

        {/* Speed Controls */}
        {([0.5, 1, 2, 4] as PlaybackSpeed[]).map(s => (
          <button
            key={s}
            style={{
              ...styles.button,
              ...(speed === s ? styles.buttonActive : {}),
              padding: '8px 12px',
            }}
            onClick={() => setSpeed(s)}
          >
            {s}x
          </button>
        ))}
      </div>
    </div>
  );
};

export default SimulationReplay;
