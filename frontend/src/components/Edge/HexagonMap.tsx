/**
 * Arbutus Edge Hexagon Map
 * 
 * 백만 건 로그에서 추출한 이상 징후를 6개 Physics 헥사곤에 실시간 시각화
 */

import React, { useState, useEffect, useMemo, useCallback, memo, useRef } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ============================================================
// 상수
// ============================================================

const PHYSICS = [
  { id: 0, name: 'FINANCIAL', label: '재무', angle: 90, color: '#3b82f6' },
  { id: 1, name: 'CAPITAL', label: '자본', angle: 30, color: '#ef4444' },
  { id: 2, name: 'COMPLIANCE', label: '규정', angle: -30, color: '#10b981' },
  { id: 3, name: 'CONTROL', label: '통제', angle: -90, color: '#f59e0b' },
  { id: 4, name: 'REPUTATION', label: '평판', angle: -150, color: '#8b5cf6' },
  { id: 5, name: 'STAKEHOLDER', label: '이해관계자', angle: 150, color: '#ec4899' },
];

const RISK_COLORS = {
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  MEDIUM: '#eab308',
  LOW: '#22c55e',
  NORMAL: '#6b7280',
};

const ANOMALY_COLORS = {
  duplicate: '#ef4444',
  outlier: '#f59e0b',
  benford: '#8b5cf6',
  gap: '#3b82f6',
};

// 헥사곤 꼭짓점 계산
const getHexagonPoints = (cx: number, cy: number, radius: number) => {
  const points = [];
  for (let i = 0; i < 6; i++) {
    const angle = (60 * i - 30) * Math.PI / 180;
    points.push({
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle)
    });
  }
  return points.map(p => `${p.x},${p.y}`).join(' ');
};

// ============================================================
// 컴포넌트
// ============================================================

const Hexagon = memo(({ physics, region, isSelected, onClick }: any) => {
  const { angle, color, label } = physics;
  const angleRad = angle * Math.PI / 180;
  const cx = Math.cos(angleRad) * 120;
  const cy = -Math.sin(angleRad) * 120;
  const radius = 80;
  
  const riskColor = RISK_COLORS[region?.risk_level as keyof typeof RISK_COLORS] || RISK_COLORS.NORMAL;
  const opacity = region?.anomaly_count > 0 ? 0.3 + (region.avg_severity || 0) * 0.5 : 0.1;
  
  return (
    <g 
      onClick={() => onClick(physics)}
      style={{ cursor: 'pointer' }}
      className="transition-all duration-300"
    >
      <polygon
        points={getHexagonPoints(cx, cy, radius)}
        fill={riskColor}
        fillOpacity={opacity}
        stroke={isSelected ? '#fff' : riskColor}
        strokeWidth={isSelected ? 3 : 1.5}
        className="transition-all duration-300"
      />
      <polygon
        points={getHexagonPoints(cx, cy, radius * 0.7)}
        fill="none"
        stroke={color}
        strokeWidth={1}
        strokeOpacity={0.5}
        strokeDasharray="4,4"
      />
      <text
        x={cx}
        y={cy - radius - 15}
        textAnchor="middle"
        fill="#e2e8f0"
        fontSize="12"
        fontWeight="bold"
      >
        {label}
      </text>
      {region?.anomaly_count > 0 && (
        <>
          <text
            x={cx}
            y={cy + 5}
            textAnchor="middle"
            fill="#fff"
            fontSize="24"
            fontWeight="bold"
          >
            {region.anomaly_count}
          </text>
          <text
            x={cx}
            y={cy + 25}
            textAnchor="middle"
            fill={riskColor}
            fontSize="10"
            fontWeight="bold"
          >
            {region.risk_level}
          </text>
        </>
      )}
    </g>
  );
});

const AnomalyDot = memo(({ anomaly, isHighlighted, onClick }: any) => {
  const color = ANOMALY_COLORS[anomaly.type as keyof typeof ANOMALY_COLORS] || '#fff';
  const size = 2 + anomaly.severity * 6;
  
  return (
    <circle
      cx={anomaly.x}
      cy={anomaly.y}
      r={isHighlighted ? size * 1.5 : size}
      fill={color}
      fillOpacity={isHighlighted ? 1 : 0.7}
      stroke={isHighlighted ? '#fff' : 'none'}
      strokeWidth={2}
      onClick={() => onClick(anomaly)}
      style={{ cursor: 'pointer' }}
      className="transition-all duration-200"
    >
      {anomaly.severity > 0.8 && (
        <animate
          attributeName="r"
          values={`${size};${size * 1.3};${size}`}
          dur="1.5s"
          repeatCount="indefinite"
        />
      )}
    </circle>
  );
});

const StatsPanel = memo(({ data }: { data: any }) => {
  if (!data) return null;
  
  const { stats, risk_summary } = data;
  
  return (
    <div className="bg-slate-800/90 rounded-xl p-4 backdrop-blur">
      <h3 className="text-lg font-bold mb-3 text-white">📊 실시간 분석</h3>
      
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-slate-700/50 rounded p-2">
          <div className="text-xs text-slate-400">총 이상 징후</div>
          <div className="text-2xl font-bold text-red-400">{stats.total}</div>
        </div>
        <div className="bg-slate-700/50 rounded p-2">
          <div className="text-xs text-slate-400">처리 시간</div>
          <div className="text-2xl font-bold text-green-400">{stats.processing_ms}ms</div>
        </div>
      </div>
      
      <div className="mb-4">
        <div className="text-xs text-slate-400 mb-2">유형별 분포</div>
        {Object.entries(stats.by_type).map(([type, count]: [string, any]) => (
          <div key={type} className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: ANOMALY_COLORS[type as keyof typeof ANOMALY_COLORS] }}
              />
              <span className="text-sm text-slate-300">{type}</span>
            </div>
            <span className="text-sm font-bold text-white">{count}</span>
          </div>
        ))}
      </div>
      
      <div>
        <div className="text-xs text-slate-400 mb-2">Physics 리스크</div>
        <div className="grid grid-cols-2 gap-1">
          {Object.entries(risk_summary).map(([physics, level]: [string, any]) => (
            <div 
              key={physics}
              className="flex items-center gap-1 text-xs"
            >
              <div 
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: RISK_COLORS[level as keyof typeof RISK_COLORS] }}
              />
              <span className="text-slate-400">{physics.slice(0, 4)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

const DetailPanel = memo(({ selectedAnomaly, onClose }: any) => {
  if (!selectedAnomaly) return null;
  
  return (
    <div className="bg-slate-800/90 rounded-xl p-4 backdrop-blur">
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-bold text-white">🔍 상세 정보</h3>
        <button 
          onClick={onClose}
          className="text-slate-400 hover:text-white"
        >
          ✕
        </button>
      </div>
      
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-400">ID</span>
          <span className="text-white font-mono">{selectedAnomaly.id}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">유형</span>
          <span 
            className="font-bold"
            style={{ color: ANOMALY_COLORS[selectedAnomaly.type as keyof typeof ANOMALY_COLORS] }}
          >
            {selectedAnomaly.type}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">심각도</span>
          <span className="text-white">{(selectedAnomaly.severity * 100).toFixed(0)}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Physics</span>
          <span className="text-white">{selectedAnomaly.physics}</span>
        </div>
        {selectedAnomaly.z_score && (
          <div className="flex justify-between">
            <span className="text-slate-400">Z-Score</span>
            <span className="text-yellow-400">{selectedAnomaly.z_score.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-slate-400">값</span>
          <span className="text-white">
            {selectedAnomaly.type === 'outlier' 
              ? `$${selectedAnomaly.value.toLocaleString()}`
              : selectedAnomaly.value.toFixed(1)
            }
          </span>
        </div>
      </div>
    </div>
  );
});

// ============================================================
// 메인 컴포넌트
// ============================================================

export default function HexagonMap() {
  const [data, setData] = useState<any>(null);
  const [selectedPhysics, setSelectedPhysics] = useState<any>(null);
  const [selectedAnomaly, setSelectedAnomaly] = useState<any>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [visibleAnomalies, setVisibleAnomalies] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const animationRef = useRef<any>(null);
  
  // 데이터 로드
  const loadData = useCallback(async () => {
    try {
      setIsProcessing(true);
      
      // 처리 요청
      await axios.post(`${API_BASE}/api/edge/process`, {
        record_count: 100000,
        anomaly_rate: 0.01
      });
      
      // 헥사곤 데이터 가져오기
      const response = await axios.get(`${API_BASE}/api/edge/hexagon`);
      setData(response.data);
    } catch (error) {
      console.error('Failed to load data:', error);
      // 폴백: 시뮬레이션 데이터
      setData(generateSimulationData());
    } finally {
      setIsProcessing(false);
    }
  }, []);
  
  useEffect(() => {
    loadData();
  }, [loadData]);
  
  // 이상 징후 애니메이션
  useEffect(() => {
    if (!data || isAnimating) return;
    
    setIsAnimating(true);
    setVisibleAnomalies([]);
    
    let index = 0;
    const batchSize = 20;
    
    const animate = () => {
      if (index >= data.anomalies.length) {
        setIsAnimating(false);
        return;
      }
      
      const batch = data.anomalies.slice(index, index + batchSize);
      setVisibleAnomalies(prev => [...prev, ...batch]);
      index += batchSize;
      
      animationRef.current = setTimeout(animate, 50);
    };
    
    animate();
    
    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    };
  }, [data]);
  
  // 필터링된 이상 징후
  const filteredAnomalies = useMemo(() => {
    if (!selectedPhysics) return visibleAnomalies;
    return visibleAnomalies.filter((a: any) => a.physics === selectedPhysics.name);
  }, [visibleAnomalies, selectedPhysics]);
  
  const handlePhysicsClick = useCallback((physics: any) => {
    setSelectedPhysics((prev: any) => prev?.id === physics.id ? null : physics);
    setSelectedAnomaly(null);
  }, []);
  
  const handleAnomalyClick = useCallback((anomaly: any) => {
    setSelectedAnomaly((prev: any) => prev?.id === anomaly.id ? null : anomaly);
  }, []);
  
  if (!data) {
    return (
      <div className="min-h-full bg-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }
  
  return (
    <div className="min-h-full bg-slate-900 text-white p-6">
      <header className="mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          Arbutus Edge → Hexagon Map
        </h1>
        <p className="text-slate-400 mt-1">
          100,000 레코드 → {data.stats.total} 이상 징후 → 6 Physics 매핑
        </p>
        <button
          onClick={loadData}
          disabled={isProcessing}
          className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
        >
          {isProcessing ? '처리 중...' : '다시 처리'}
        </button>
      </header>
      
      <div className="flex gap-6">
        <div className="flex-1 bg-slate-800/50 rounded-2xl p-6">
          <svg 
            viewBox="-250 -250 500 500" 
            className="w-full max-w-2xl mx-auto"
          >
            <defs>
              <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#334155" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect x="-250" y="-250" width="500" height="500" fill="url(#grid)" />
            
            <circle cx="0" cy="0" r="30" fill="#1e293b" stroke="#475569" strokeWidth="2" />
            <text x="0" y="5" textAnchor="middle" fill="#94a3b8" fontSize="10">CORE</text>
            
            {PHYSICS.map(p => {
              const angleRad = p.angle * Math.PI / 180;
              const x = Math.cos(angleRad) * 120;
              const y = -Math.sin(angleRad) * 120;
              return (
                <line 
                  key={`line-${p.id}`}
                  x1="0" y1="0" x2={x} y2={y}
                  stroke="#334155" strokeWidth="1" strokeDasharray="4,4"
                />
              );
            })}
            
            {PHYSICS.map(p => {
              const region = data.regions.find((r: any) => r.physics === p.name);
              return (
                <Hexagon 
                  key={p.id}
                  physics={p}
                  region={region}
                  isSelected={selectedPhysics?.id === p.id}
                  onClick={handlePhysicsClick}
                />
              );
            })}
            
            {filteredAnomalies.map((anomaly: any) => (
              <AnomalyDot
                key={anomaly.id}
                anomaly={anomaly}
                isHighlighted={selectedAnomaly?.id === anomaly.id}
                onClick={handleAnomalyClick}
              />
            ))}
          </svg>
          
          {isAnimating && (
            <div className="text-center mt-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600/20 rounded-full">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                <span className="text-sm text-blue-400">
                  Loading anomalies... {visibleAnomalies.length}/{data.anomalies.length}
                </span>
              </div>
            </div>
          )}
          
          <div className="flex justify-center gap-6 mt-6">
            {Object.entries(ANOMALY_COLORS).map(([type, color]) => (
              <div key={type} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="text-xs text-slate-400">{type}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="w-72 space-y-4">
          <StatsPanel data={data} />
          <DetailPanel 
            selectedAnomaly={selectedAnomaly}
            onClose={() => setSelectedAnomaly(null)}
          />
        </div>
      </div>
    </div>
  );
}

// 시뮬레이션 데이터 생성 함수
function generateSimulationData() {
  const anomalies: any[] = [];
  const types = ['duplicate', 'outlier', 'benford'];
  
  for (let i = 0; i < 363; i++) {
    const type = i < 83 ? 'duplicate' : i < 359 ? 'outlier' : 'benford';
    const physics = type === 'benford' ? 0 : 1;
    const severity = 0.5 + Math.random() * 0.5;
    
    const physicsData = PHYSICS[physics];
    const angleRad = physicsData.angle * Math.PI / 180;
    const baseX = Math.cos(angleRad) * 120;
    const baseY = -Math.sin(angleRad) * 120;
    
    const spread = (1 - severity) * 50;
    const offsetAngle = Math.random() * Math.PI * 2;
    const offsetDist = Math.random() * spread;
    
    anomalies.push({
      id: `ANO-${i}`,
      type,
      severity,
      physics: physicsData.name,
      physics_id: physics,
      x: baseX + Math.cos(offsetAngle) * offsetDist,
      y: baseY + Math.sin(offsetAngle) * offsetDist,
      value: type === 'outlier' ? Math.random() * 500000 : Math.random() * 10,
      z_score: type === 'outlier' ? 3 + Math.random() * 5 : null,
    });
  }
  
  return {
    timestamp: Date.now(),
    radius: 200,
    regions: PHYSICS.map(p => ({
      physics: p.name,
      physics_id: p.id,
      center: {
        x: Math.cos(p.angle * Math.PI / 180) * 120,
        y: -Math.sin(p.angle * Math.PI / 180) * 120
      },
      anomaly_count: p.id === 0 ? 4 : p.id === 1 ? 359 : 0,
      avg_severity: p.id <= 1 ? 0.8 : 0,
      max_severity: p.id <= 1 ? 0.95 : 0,
      risk_level: p.id <= 1 ? 'CRITICAL' : 'NORMAL'
    })),
    anomalies,
    stats: {
      total: 363,
      by_type: { duplicate: 83, outlier: 276, benford: 4 },
      by_physics: { FINANCIAL: 4, CAPITAL: 359 },
      processing_ms: 1.6
    },
    risk_summary: {
      FINANCIAL: 'CRITICAL',
      CAPITAL: 'CRITICAL',
      COMPLIANCE: 'NORMAL',
      CONTROL: 'NORMAL',
      REPUTATION: 'NORMAL',
      STAKEHOLDER: 'NORMAL'
    }
  };
}

