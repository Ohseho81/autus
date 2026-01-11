/**
 * AUTUS Trinity - TrendChart Component
 * =====================================
 * 
 * 주가 스타일 추세선 차트
 * - 기본: ±6개월
 * - 줌: 1주일 ~ 10년
 * - 미래 예측 (최선/최악 시나리오)
 */

import React, { memo, useState, useCallback, useMemo, useRef, useEffect } from 'react';

// ═══════════════════════════════════════════════════════════════════════════
// 타입
// ═══════════════════════════════════════════════════════════════════════════

interface DataPoint {
  date: Date;
  value: number;
  predicted?: boolean;
}

interface TrendChartProps {
  currentValue: number;
  targetValue: number;
  historicalData?: DataPoint[];
  predictions?: {
    best: DataPoint[];
    expected: DataPoint[];
    worst: DataPoint[];
  };
  onZoomChange?: (range: TimeRange) => void;
}

type TimeRange = '1W' | '1M' | '3M' | '6M' | '1Y' | '3Y' | '5Y' | '10Y';

const TIME_RANGES: { id: TimeRange; label: string; days: number }[] = [
  { id: '1W', label: '1주', days: 7 },
  { id: '1M', label: '1개월', days: 30 },
  { id: '3M', label: '3개월', days: 90 },
  { id: '6M', label: '6개월', days: 180 },
  { id: '1Y', label: '1년', days: 365 },
  { id: '3Y', label: '3년', days: 1095 },
  { id: '5Y', label: '5년', days: 1825 },
  { id: '10Y', label: '10년', days: 3650 },
];

// ═══════════════════════════════════════════════════════════════════════════
// Mock 데이터 생성
// ═══════════════════════════════════════════════════════════════════════════

function generateHistoricalData(days: number, currentValue: number): DataPoint[] {
  const data: DataPoint[] = [];
  const now = new Date();
  let value = currentValue * 0.7; // 과거 시작점
  
  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    // 랜덤 변동 + 상승 트렌드
    const trend = (days - i) / days * (currentValue - value);
    const noise = (Math.random() - 0.5) * currentValue * 0.05;
    value = value + trend / days + noise;
    
    data.push({ date, value: Math.max(0, value), predicted: false });
  }
  
  return data;
}

function generatePredictions(days: number, currentValue: number, targetValue: number): {
  best: DataPoint[];
  expected: DataPoint[];
  worst: DataPoint[];
} {
  const best: DataPoint[] = [];
  const expected: DataPoint[] = [];
  const worst: DataPoint[] = [];
  const now = new Date();
  
  for (let i = 1; i <= days; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() + i);
    const progress = i / days;
    
    // 최선: 목표 초과 달성
    best.push({
      date,
      value: currentValue + (targetValue * 1.3 - currentValue) * progress * (1 + Math.random() * 0.1),
      predicted: true
    });
    
    // 예상: 목표 달성
    expected.push({
      date,
      value: currentValue + (targetValue - currentValue) * progress * (1 + (Math.random() - 0.5) * 0.1),
      predicted: true
    });
    
    // 최악: 하락
    worst.push({
      date,
      value: currentValue * (1 - progress * 0.3) * (1 + (Math.random() - 0.5) * 0.1),
      predicted: true
    });
  }
  
  return { best, expected, worst };
}

// ═══════════════════════════════════════════════════════════════════════════
// 메인 컴포넌트
// ═══════════════════════════════════════════════════════════════════════════

const TrendChart = memo(function TrendChart({
  currentValue,
  targetValue,
  historicalData,
  predictions,
  onZoomChange
}: TrendChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('6M');
  const [hoveredPoint, setHoveredPoint] = useState<DataPoint | null>(null);
  const [showPredictions, setShowPredictions] = useState(true);
  const svgRef = useRef<SVGSVGElement>(null);
  
  const selectedRange = TIME_RANGES.find(r => r.id === timeRange)!;
  
  // 데이터 생성/필터링
  const { history, future } = useMemo(() => {
    const days = selectedRange.days;
    const history = historicalData || generateHistoricalData(Math.floor(days / 2), currentValue);
    const future = predictions || generatePredictions(Math.floor(days / 2), currentValue, targetValue);
    return { history, future };
  }, [selectedRange, currentValue, targetValue, historicalData, predictions]);
  
  // 차트 계산
  const chartData = useMemo(() => {
    const allValues = [
      ...history.map(d => d.value),
      ...future.best.map(d => d.value),
      ...future.worst.map(d => d.value),
      targetValue
    ];
    
    const minValue = Math.min(...allValues) * 0.9;
    const maxValue = Math.max(...allValues) * 1.1;
    const valueRange = maxValue - minValue;
    
    const allDates = [
      ...history.map(d => d.date),
      ...future.expected.map(d => d.date)
    ];
    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
    const dateRange = maxDate.getTime() - minDate.getTime();
    
    const width = 100;
    const height = 100;
    const padding = { top: 10, right: 5, bottom: 20, left: 5 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    const getX = (date: Date) => 
      padding.left + (date.getTime() - minDate.getTime()) / dateRange * chartWidth;
    const getY = (value: number) => 
      padding.top + (1 - (value - minValue) / valueRange) * chartHeight;
    
    // 경로 생성
    const historyPath = history.map((d, i) => 
      `${i === 0 ? 'M' : 'L'}${getX(d.date)},${getY(d.value)}`
    ).join(' ');
    
    const bestPath = future.best.map((d, i) => 
      `${i === 0 ? `M${getX(history[history.length-1].date)},${getY(history[history.length-1].value)} L` : 'L'}${getX(d.date)},${getY(d.value)}`
    ).join(' ');
    
    const expectedPath = future.expected.map((d, i) => 
      `${i === 0 ? `M${getX(history[history.length-1].date)},${getY(history[history.length-1].value)} L` : 'L'}${getX(d.date)},${getY(d.value)}`
    ).join(' ');
    
    const worstPath = future.worst.map((d, i) => 
      `${i === 0 ? `M${getX(history[history.length-1].date)},${getY(history[history.length-1].value)} L` : 'L'}${getX(d.date)},${getY(d.value)}`
    ).join(' ');
    
    // 예측 영역 (최선-최악 사이)
    const areaPath = showPredictions ? [
      `M${getX(history[history.length-1].date)},${getY(history[history.length-1].value)}`,
      ...future.best.map(d => `L${getX(d.date)},${getY(d.value)}`),
      ...future.worst.slice().reverse().map(d => `L${getX(d.date)},${getY(d.value)}`),
      'Z'
    ].join(' ') : '';
    
    const targetY = getY(targetValue);
    const currentX = getX(history[history.length - 1].date);
    const currentY = getY(currentValue);
    
    return {
      historyPath,
      bestPath,
      expectedPath,
      worstPath,
      areaPath,
      targetY,
      currentX,
      currentY,
      getX,
      getY,
      minValue,
      maxValue,
      padding,
      chartHeight
    };
  }, [history, future, targetValue, currentValue, showPredictions]);
  
  // 스크롤 줌
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const currentIndex = TIME_RANGES.findIndex(r => r.id === timeRange);
    
    if (e.deltaY < 0 && currentIndex > 0) {
      const newRange = TIME_RANGES[currentIndex - 1].id;
      setTimeRange(newRange);
      onZoomChange?.(newRange);
    } else if (e.deltaY > 0 && currentIndex < TIME_RANGES.length - 1) {
      const newRange = TIME_RANGES[currentIndex + 1].id;
      setTimeRange(newRange);
      onZoomChange?.(newRange);
    }
  }, [timeRange, onZoomChange]);
  
  // 변화율 계산
  const changePercent = ((currentValue - history[0]?.value) / history[0]?.value * 100) || 0;
  const isPositive = changePercent >= 0;

  return (
    <div className="bg-black/40 backdrop-blur-xl rounded-xl border border-white/5 p-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-white/40">📈 추세</span>
          <span className={`text-sm font-bold ${isPositive ? 'text-[#4ade80]' : 'text-[#f87171]'}`}>
            {isPositive ? '+' : ''}{changePercent.toFixed(1)}%
          </span>
        </div>
        
        {/* 기간 선택 */}
        <div className="flex gap-1">
          {TIME_RANGES.slice(0, 5).map(range => (
            <button
              key={range.id}
              onClick={() => {
                setTimeRange(range.id);
                onZoomChange?.(range.id);
              }}
              className={`px-2 py-1 text-[9px] rounded transition-all ${
                timeRange === range.id
                  ? 'bg-[#a78bfa] text-white'
                  : 'bg-white/5 text-white/40 hover:bg-white/10'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* 차트 */}
      <div 
        className="relative h-[120px] cursor-crosshair"
        onWheel={handleWheel}
      >
        <svg 
          ref={svgRef}
          viewBox="0 0 100 100" 
          preserveAspectRatio="none"
          className="w-full h-full"
        >
          <defs>
            {/* 그라디언트 */}
            <linearGradient id="historyGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#a78bfa" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="predictionGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0" />
            </linearGradient>
          </defs>
          
          {/* 그리드 라인 */}
          {[0.25, 0.5, 0.75].map(ratio => (
            <line
              key={ratio}
              x1={chartData.padding.left}
              y1={chartData.padding.top + chartData.chartHeight * ratio}
              x2={100 - chartData.padding.right}
              y2={chartData.padding.top + chartData.chartHeight * ratio}
              stroke="rgba(255,255,255,0.05)"
              strokeDasharray="2 2"
            />
          ))}
          
          {/* 목표선 */}
          <line
            x1={chartData.padding.left}
            y1={chartData.targetY}
            x2={100 - chartData.padding.right}
            y2={chartData.targetY}
            stroke="#fbbf24"
            strokeWidth="0.5"
            strokeDasharray="3 2"
          />
          <text
            x={100 - chartData.padding.right - 1}
            y={chartData.targetY - 2}
            fill="#fbbf24"
            fontSize="3"
            textAnchor="end"
          >
            목표
          </text>
          
          {/* 예측 영역 */}
          {showPredictions && chartData.areaPath && (
            <path
              d={chartData.areaPath}
              fill="url(#predictionGrad)"
            />
          )}
          
          {/* 히스토리 라인 */}
          <path
            d={chartData.historyPath}
            fill="none"
            stroke="#a78bfa"
            strokeWidth="1"
          />
          
          {/* 예측 라인들 */}
          {showPredictions && (
            <>
              <path
                d={chartData.bestPath}
                fill="none"
                stroke="#4ade80"
                strokeWidth="0.5"
                strokeDasharray="2 1"
                opacity="0.7"
              />
              <path
                d={chartData.expectedPath}
                fill="none"
                stroke="#06b6d4"
                strokeWidth="0.8"
                strokeDasharray="2 1"
              />
              <path
                d={chartData.worstPath}
                fill="none"
                stroke="#f87171"
                strokeWidth="0.5"
                strokeDasharray="2 1"
                opacity="0.7"
              />
            </>
          )}
          
          {/* 현재 위치 점 */}
          <circle
            cx={chartData.currentX}
            cy={chartData.currentY}
            r="2"
            fill="#a78bfa"
            stroke="white"
            strokeWidth="0.5"
          />
          
          {/* 현재 / 과거 구분선 */}
          <line
            x1={chartData.currentX}
            y1={chartData.padding.top}
            x2={chartData.currentX}
            y2={100 - chartData.padding.bottom}
            stroke="rgba(255,255,255,0.2)"
            strokeDasharray="1 1"
          />
          <text
            x={chartData.currentX}
            y={100 - chartData.padding.bottom + 8}
            fill="rgba(255,255,255,0.4)"
            fontSize="3"
            textAnchor="middle"
          >
            현재
          </text>
        </svg>
        
        {/* 범례 */}
        <div className="absolute bottom-0 right-0 flex gap-3 text-[8px]">
          <span className="flex items-center gap-1">
            <span className="w-3 h-[2px] bg-[#4ade80]" /> 최선
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-[2px] bg-[#06b6d4]" /> 예상
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-[2px] bg-[#f87171]" /> 최악
          </span>
        </div>
      </div>
      
      {/* 예측 토글 */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
        <button
          onClick={() => setShowPredictions(!showPredictions)}
          className={`text-[9px] px-2 py-1 rounded transition-all ${
            showPredictions 
              ? 'bg-[rgba(6,182,212,0.2)] text-[#06b6d4]' 
              : 'bg-white/5 text-white/40'
          }`}
        >
          {showPredictions ? '🔮 예측 ON' : '🔮 예측 OFF'}
        </button>
        <span className="text-[8px] text-white/30">스크롤로 줌인/아웃</span>
      </div>
    </div>
  );
});

export default TrendChart;
