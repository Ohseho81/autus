/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 📈 VGraph — V 복리 성장 그래프
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * V = (M - T) × (1 + s)^t 복리 성장 시각화
 * 
 * Features:
 * - 실시간 V 곡선
 * - 예측 영역 (신뢰 구간)
 * - 마일스톤 마커
 * - 터치 인터랙션
 */
import React, { useEffect, useRef, useState, useMemo } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

interface DataPoint {
  t: number;      // 시간 (월)
  V: number;      // 가치
  date?: string;  // 날짜 라벨
  type?: 'actual' | 'predicted';
}

interface VGraphProps {
  data: DataPoint[];
  predictedData?: DataPoint[];
  currentV: number;
  targetV?: number;
  synergy: number;
  width?: number;
  height?: number;
  showPrediction?: boolean;
  showMilestones?: boolean;
  onPointClick?: (point: DataPoint) => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════════════════════

const COLORS = {
  primary: '#10b981',
  primaryLight: 'rgba(16, 185, 129, 0.2)',
  secondary: '#06b6d4',
  prediction: 'rgba(6, 182, 212, 0.3)',
  grid: 'rgba(255, 255, 255, 0.08)',
  text: '#9ca3af',
  milestone: '#f59e0b',
  bg: '#0a0f1a',
};

// ═══════════════════════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════════════════════

export const VGraph: React.FC<VGraphProps> = ({
  data,
  predictedData = [],
  currentV,
  targetV,
  synergy,
  width = 350,
  height = 200,
  showPrediction = true,
  showMilestones = true,
  onPointClick,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredPoint, setHoveredPoint] = useState<DataPoint | null>(null);
  const [animationProgress, setAnimationProgress] = useState(0);

  // 모든 데이터 결합
  const allData = useMemo(() => {
    const actual = data.map(d => ({ ...d, type: 'actual' as const }));
    const predicted = predictedData.map(d => ({ ...d, type: 'predicted' as const }));
    return [...actual, ...predicted];
  }, [data, predictedData]);

  // 스케일 계산
  const scales = useMemo(() => {
    if (allData.length === 0) return { minV: 0, maxV: 100, minT: 0, maxT: 12 };
    
    const vValues = allData.map(d => d.V);
    const tValues = allData.map(d => d.t);
    
    const minV = 0;
    const maxV = Math.max(...vValues, targetV || 0) * 1.2;
    const minT = Math.min(...tValues);
    const maxT = Math.max(...tValues);
    
    return { minV, maxV, minT, maxT };
  }, [allData, targetV]);

  // 좌표 변환
  const toCanvas = (t: number, V: number): [number, number] => {
    const padding = 40;
    const x = padding + ((t - scales.minT) / (scales.maxT - scales.minT)) * (width - padding * 2);
    const y = height - padding - ((V - scales.minV) / (scales.maxV - scales.minV)) * (height - padding * 2);
    return [x, y];
  };

  // 애니메이션
  useEffect(() => {
    let frame: number;
    const start = performance.now();
    const duration = 1000;

    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      setAnimationProgress(easeOutCubic(progress));
      
      if (progress < 1) {
        frame = requestAnimationFrame(animate);
      }
    };

    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [data]);

  // 캔버스 렌더링
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 고해상도 지원
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // 배경
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, width, height);

    // 그리드
    drawGrid(ctx, width, height, scales);

    // 예측 영역
    if (showPrediction && predictedData.length > 0) {
      drawPredictionArea(ctx, predictedData, scales, toCanvas, animationProgress);
    }

    // 실제 데이터 곡선
    if (data.length > 0) {
      drawCurve(ctx, data, toCanvas, animationProgress, COLORS.primary, 3);
    }

    // 예측 곡선 (점선)
    if (showPrediction && predictedData.length > 0) {
      drawCurve(ctx, predictedData, toCanvas, animationProgress, COLORS.secondary, 2, true);
    }

    // 데이터 포인트
    drawPoints(ctx, data, toCanvas, animationProgress, COLORS.primary);

    // 목표선
    if (targetV) {
      drawTargetLine(ctx, targetV, width, height, scales, toCanvas);
    }

    // 마일스톤
    if (showMilestones) {
      drawMilestones(ctx, data, toCanvas, animationProgress);
    }

    // 호버 포인트
    if (hoveredPoint) {
      const [x, y] = toCanvas(hoveredPoint.t, hoveredPoint.V);
      drawHoverPoint(ctx, x, y, hoveredPoint);
    }

  }, [data, predictedData, scales, animationProgress, hoveredPoint, targetV, showPrediction, showMilestones, width, height]);

  // 마우스 이벤트
  const handleMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // 가장 가까운 포인트 찾기
    let closest: DataPoint | null = null;
    let minDist = Infinity;

    allData.forEach(point => {
      const [px, py] = toCanvas(point.t, point.V);
      const dist = Math.sqrt((x - px) ** 2 + (y - py) ** 2);
      if (dist < minDist && dist < 30) {
        minDist = dist;
        closest = point;
      }
    });

    setHoveredPoint(closest);
  };

  const handleClick = () => {
    if (hoveredPoint && onPointClick) {
      onPointClick(hoveredPoint);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.currentV}>
          <span style={styles.vValue}>{currentV}</span>
          <span style={styles.vLabel}>V</span>
        </div>
        <div style={styles.synergy}>
          Synergy: {(synergy * 100).toFixed(1)}%
        </div>
      </div>
      
      <canvas
        ref={canvasRef}
        style={{ ...styles.canvas, width, height }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredPoint(null)}
        onClick={handleClick}
      />

      {hoveredPoint && (
        <div style={styles.tooltip}>
          <div style={styles.tooltipV}>V: {hoveredPoint.V.toFixed(0)}</div>
          <div style={styles.tooltipT}>Month {hoveredPoint.t}</div>
          {hoveredPoint.type === 'predicted' && (
            <div style={styles.tooltipPredicted}>예측값</div>
          )}
        </div>
      )}

      <div style={styles.legend}>
        <div style={styles.legendItem}>
          <div style={{ ...styles.legendDot, background: COLORS.primary }} />
          <span>실제</span>
        </div>
        {showPrediction && (
          <div style={styles.legendItem}>
            <div style={{ ...styles.legendDot, background: COLORS.secondary }} />
            <span>예측</span>
          </div>
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// Drawing Functions
// ═══════════════════════════════════════════════════════════════════════════════

function drawGrid(
  ctx: CanvasRenderingContext2D, 
  width: number, 
  height: number,
  scales: { minV: number; maxV: number; minT: number; maxT: number }
) {
  const padding = 40;
  
  ctx.strokeStyle = COLORS.grid;
  ctx.lineWidth = 1;
  ctx.font = '10px system-ui';
  ctx.fillStyle = COLORS.text;

  // 가로선 (V)
  const vStep = (scales.maxV - scales.minV) / 5;
  for (let i = 0; i <= 5; i++) {
    const v = scales.minV + vStep * i;
    const y = height - padding - (i / 5) * (height - padding * 2);
    
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(width - padding, y);
    ctx.stroke();
    
    ctx.fillText(v.toFixed(0), 5, y + 4);
  }

  // 세로선 (t)
  const tRange = scales.maxT - scales.minT;
  const tStep = Math.ceil(tRange / 6);
  for (let t = scales.minT; t <= scales.maxT; t += tStep) {
    const x = padding + ((t - scales.minT) / tRange) * (width - padding * 2);
    
    ctx.beginPath();
    ctx.moveTo(x, padding);
    ctx.lineTo(x, height - padding);
    ctx.stroke();
    
    ctx.fillText(`${t}월`, x - 10, height - 10);
  }
}

function drawCurve(
  ctx: CanvasRenderingContext2D,
  data: DataPoint[],
  toCanvas: (t: number, V: number) => [number, number],
  progress: number,
  color: string,
  lineWidth: number,
  dashed: boolean = false
) {
  if (data.length < 2) return;

  const animatedLength = Math.floor(data.length * progress);
  if (animatedLength < 2) return;

  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  if (dashed) {
    ctx.setLineDash([8, 4]);
  } else {
    ctx.setLineDash([]);
  }

  ctx.beginPath();
  
  for (let i = 0; i < animatedLength; i++) {
    const [x, y] = toCanvas(data[i].t, data[i].V);
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      // 부드러운 곡선
      const prev = data[i - 1];
      const [px, py] = toCanvas(prev.t, prev.V);
      const cpx = (px + x) / 2;
      ctx.quadraticCurveTo(px, py, cpx, (py + y) / 2);
    }
  }
  
  const last = data[animatedLength - 1];
  const [lx, ly] = toCanvas(last.t, last.V);
  ctx.lineTo(lx, ly);
  
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawPoints(
  ctx: CanvasRenderingContext2D,
  data: DataPoint[],
  toCanvas: (t: number, V: number) => [number, number],
  progress: number,
  color: string
) {
  const animatedLength = Math.floor(data.length * progress);
  
  for (let i = 0; i < animatedLength; i++) {
    const [x, y] = toCanvas(data[i].t, data[i].V);
    
    // 글로우
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, 12);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, 12, 0, Math.PI * 2);
    ctx.fill();
    
    // 점
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
    
    // 흰색 중심
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x, y, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPredictionArea(
  ctx: CanvasRenderingContext2D,
  data: DataPoint[],
  scales: { minV: number; maxV: number; minT: number; maxT: number },
  toCanvas: (t: number, V: number) => [number, number],
  progress: number
) {
  if (data.length < 2) return;

  const uncertainty = 0.15; // ±15%
  
  ctx.fillStyle = COLORS.prediction;
  ctx.beginPath();
  
  // 상단 경계
  for (let i = 0; i < data.length; i++) {
    const [x, y] = toCanvas(data[i].t, data[i].V * (1 + uncertainty));
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  
  // 하단 경계 (역순)
  for (let i = data.length - 1; i >= 0; i--) {
    const [x, y] = toCanvas(data[i].t, data[i].V * (1 - uncertainty));
    ctx.lineTo(x, y);
  }
  
  ctx.closePath();
  ctx.globalAlpha = progress;
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawTargetLine(
  ctx: CanvasRenderingContext2D,
  targetV: number,
  width: number,
  height: number,
  scales: { minV: number; maxV: number },
  toCanvas: (t: number, V: number) => [number, number]
) {
  const [, y] = toCanvas(0, targetV);
  
  ctx.strokeStyle = COLORS.milestone;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  
  ctx.beginPath();
  ctx.moveTo(40, y);
  ctx.lineTo(width - 40, y);
  ctx.stroke();
  
  ctx.setLineDash([]);
  ctx.fillStyle = COLORS.milestone;
  ctx.font = '10px system-ui';
  ctx.fillText(`목표: ${targetV}`, width - 80, y - 5);
}

function drawMilestones(
  ctx: CanvasRenderingContext2D,
  data: DataPoint[],
  toCanvas: (t: number, V: number) => [number, number],
  progress: number
) {
  // 마일스톤 감지 (10%, 50%, 100% 성장)
  if (data.length < 2) return;
  
  const startV = data[0].V;
  const milestones = [
    { threshold: 1.1, label: '+10%' },
    { threshold: 1.5, label: '+50%' },
    { threshold: 2.0, label: '2x' },
  ];
  
  milestones.forEach(({ threshold, label }) => {
    const targetV = startV * threshold;
    const point = data.find(d => d.V >= targetV);
    
    if (point) {
      const [x, y] = toCanvas(point.t, point.V);
      
      // 마커
      ctx.fillStyle = COLORS.milestone;
      ctx.beginPath();
      ctx.arc(x, y - 20, 8, 0, Math.PI * 2);
      ctx.fill();
      
      // 라벨
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 8px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(label, x, y - 17);
    }
  });
}

function drawHoverPoint(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  point: DataPoint
) {
  // 큰 원
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, 8, 0, Math.PI * 2);
  ctx.stroke();
}

// Easing
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════════════════════════

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: '#0a0f1a',
    borderRadius: '16px',
    padding: '16px',
    position: 'relative',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: '12px',
  },
  currentV: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '4px',
  },
  vValue: {
    fontSize: '32px',
    fontWeight: 800,
    background: 'linear-gradient(135deg, #10b981, #06b6d4)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  vLabel: {
    fontSize: '14px',
    color: '#6b7280',
    fontWeight: 600,
  },
  synergy: {
    fontSize: '12px',
    color: '#9ca3af',
  },
  canvas: {
    display: 'block',
    cursor: 'crosshair',
  },
  tooltip: {
    position: 'absolute',
    top: '60px',
    right: '16px',
    background: 'rgba(31, 41, 55, 0.95)',
    borderRadius: '8px',
    padding: '8px 12px',
    fontSize: '12px',
  },
  tooltipV: {
    fontWeight: 600,
    color: '#10b981',
  },
  tooltipT: {
    color: '#9ca3af',
  },
  tooltipPredicted: {
    color: '#06b6d4',
    fontSize: '10px',
    marginTop: '4px',
  },
  legend: {
    display: 'flex',
    gap: '16px',
    justifyContent: 'center',
    marginTop: '12px',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '11px',
    color: '#9ca3af',
  },
  legendDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
};

export default VGraph;
