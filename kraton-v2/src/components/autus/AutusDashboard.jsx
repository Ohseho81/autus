/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🏛️ AUTUS Dashboard - A = T^σ
 * 
 * 핵심 공식 기반 통합 대시보드
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useMemo, memo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// 상수
// ============================================
const SIGMA_GRADES = {
  critical: { min: 0, max: 0.7, color: '#000000', bg: 'bg-black', label: '⚫ 위험' },
  at_risk: { min: 0.7, max: 1.0, color: '#ef4444', bg: 'bg-red-500', label: '🔴 주의' },
  neutral: { min: 1.0, max: 1.3, color: '#eab308', bg: 'bg-yellow-500', label: '🟡 보통' },
  good: { min: 1.3, max: 1.6, color: '#22c55e', bg: 'bg-emerald-500', label: '🟢 양호' },
  loyal: { min: 1.6, max: 2.0, color: '#3b82f6', bg: 'bg-blue-500', label: '🔵 충성' },
  advocate: { min: 2.0, max: 3.0, color: '#a855f7', bg: 'bg-purple-500', label: '💜 팬' },
};

const NODE_LAMBDA = {
  OWNER: 5.0,
  MANAGER: 3.0,
  STAFF: 2.0,
  STUDENT: 1.0,
  PARENT: 1.2,
};

// ============================================
// 핵심 계산 함수
// ============================================
const calculateA = (t, lambda, sigma) => {
  const T = lambda * t;
  if (T <= 0) return 0;
  return Math.pow(T, sigma);
};

const calculateOmega = (relationships) => {
  return relationships.reduce((sum, rel) => sum + rel.aValue, 0);
};

const getSigmaGrade = (sigma) => {
  if (sigma < 0.7) return 'critical';
  if (sigma < 1.0) return 'at_risk';
  if (sigma < 1.3) return 'neutral';
  if (sigma < 1.6) return 'good';
  if (sigma < 2.0) return 'loyal';
  return 'advocate';
};

const formatValue = (v) => {
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return v.toFixed(0);
};

// ============================================
// Mock 데이터 생성
// ============================================
const generateMockData = () => {
  const nodes = [];
  const relationships = [];
  
  // 노드 생성
  for (let i = 0; i < 50; i++) {
    const types = ['STUDENT', 'PARENT', 'STAFF'];
    const type = types[Math.floor(Math.random() * types.length)];
    nodes.push({
      id: `node-${i}`,
      type,
      name: `${type} ${i}`,
      lambda: NODE_LAMBDA[type] * (0.8 + Math.random() * 0.4),
    });
  }
  
  // 관계 생성
  for (let i = 0; i < 80; i++) {
    const nodeA = nodes[Math.floor(Math.random() * nodes.length)];
    const nodeB = nodes[Math.floor(Math.random() * nodes.length)];
    if (nodeA.id === nodeB.id) continue;
    
    const sigma = 0.6 + Math.random() * 1.8;
    const tTotal = 100 + Math.random() * 1000;
    const lambdaAvg = (nodeA.lambda + nodeB.lambda) / 2;
    const T = lambdaAvg * tTotal;
    const aValue = Math.pow(T, sigma);
    
    relationships.push({
      id: `rel-${i}`,
      nodeAId: nodeA.id,
      nodeBId: nodeB.id,
      nodeA,
      nodeB,
      sigma,
      tTotal,
      lambdaAvg,
      aValue,
      sigmaTrend: (Math.random() - 0.3) * 0.1,
    });
  }
  
  const omega = calculateOmega(relationships);
  const avgSigma = relationships.reduce((s, r) => s + r.sigma, 0) / relationships.length;
  
  return { nodes, relationships, omega, avgSigma };
};

// ============================================
// 컴포넌트: 공식 디스플레이
// ============================================
const FormulaDisplay = memo(function FormulaDisplay({ t, lambda, sigma, A }) {
  const T = lambda * t;
  return (
    <div className="p-4 bg-gray-900/50 rounded-xl border border-gray-800">
      <div className="text-center">
        <p className="text-gray-500 text-xs mb-2">핵심 공식</p>
        <div className="text-2xl font-mono text-white">
          <span className="text-purple-400">A</span>
          <span className="text-gray-500"> = </span>
          <span className="text-cyan-400">T</span>
          <sup className="text-yellow-400">σ</sup>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2 text-xs">
          <div className="p-2 bg-gray-800/50 rounded">
            <p className="text-gray-500">t</p>
            <p className="text-white font-mono">{t.toFixed(0)}</p>
          </div>
          <div className="p-2 bg-gray-800/50 rounded">
            <p className="text-gray-500">λ</p>
            <p className="text-white font-mono">{lambda.toFixed(2)}</p>
          </div>
          <div className="p-2 bg-cyan-500/20 rounded border border-cyan-500/30">
            <p className="text-cyan-400">T</p>
            <p className="text-white font-mono">{T.toFixed(0)}</p>
          </div>
          <div className="p-2 bg-yellow-500/20 rounded border border-yellow-500/30">
            <p className="text-yellow-400">σ</p>
            <p className="text-white font-mono">{sigma.toFixed(2)}</p>
          </div>
        </div>
        <div className="mt-3 p-3 bg-purple-500/20 rounded-lg border border-purple-500/30">
          <p className="text-purple-400 text-xs">A (가치)</p>
          <p className="text-white text-xl font-bold">{formatValue(A)}</p>
        </div>
      </div>
    </div>
  );
});

// ============================================
// 컴포넌트: Ω 게이지
// ============================================
const OmegaGauge = memo(function OmegaGauge({ omega, change }) {
  return (
    <div className="p-6 bg-gradient-to-br from-purple-500/10 to-cyan-500/10 rounded-xl border border-purple-500/30">
      <div className="text-center">
        <p className="text-gray-400 text-sm">조직 가치</p>
        <p className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400 mt-2">
          Ω {formatValue(omega)}
        </p>
        <p className={`text-sm mt-2 ${change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {change >= 0 ? '▲' : '▼'} {Math.abs(change * 100).toFixed(1)}%
        </p>
      </div>
    </div>
  );
});

// ============================================
// 컴포넌트: σ 분포 바
// ============================================
const SigmaDistributionBar = memo(function SigmaDistributionBar({ relationships }) {
  const distribution = useMemo(() => {
    const dist = { critical: 0, at_risk: 0, neutral: 0, good: 0, loyal: 0, advocate: 0 };
    relationships.forEach(r => {
      const grade = getSigmaGrade(r.sigma);
      dist[grade]++;
    });
    return dist;
  }, [relationships]);
  
  const total = relationships.length;
  
  return (
    <div className="p-4 bg-gray-800/30 rounded-xl">
      <div className="flex items-center justify-between mb-2">
        <span className="text-white text-sm font-medium">σ 분포</span>
        <span className="text-gray-500 text-xs">{total}개 관계</span>
      </div>
      
      {/* 분포 바 */}
      <div className="h-4 rounded-full overflow-hidden flex">
        {Object.entries(SIGMA_GRADES).map(([grade, config]) => {
          const count = distribution[grade];
          const pct = (count / total) * 100;
          if (pct === 0) return null;
          return (
            <div
              key={grade}
              className="h-full"
              style={{ width: `${pct}%`, backgroundColor: config.color }}
              title={`${config.label}: ${count} (${pct.toFixed(1)}%)`}
            />
          );
        })}
      </div>
      
      {/* 범례 */}
      <div className="mt-3 grid grid-cols-6 gap-1 text-xs">
        {Object.entries(SIGMA_GRADES).map(([grade, config]) => {
          const count = distribution[grade];
          const pct = ((count / total) * 100).toFixed(0);
          return (
            <div key={grade} className="text-center">
              <div 
                className="w-3 h-3 rounded-full mx-auto mb-1"
                style={{ backgroundColor: config.color }}
              />
              <p className="text-gray-500">{pct}%</p>
            </div>
          );
        })}
      </div>
    </div>
  );
});

// ============================================
// 컴포넌트: KPI 카드
// ============================================
const KPICard = memo(function KPICard({ title, value, change, icon, color = 'cyan' }) {
  return (
    <div className={`p-4 bg-gray-800/30 rounded-xl border border-${color}-500/20`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-500 text-xs">{title}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
          {change !== undefined && (
            <p className={`text-xs mt-1 ${change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {change >= 0 ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%
            </p>
          )}
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  );
});

// ============================================
// 컴포넌트: 관계 테이블
// ============================================
const RelationshipTable = memo(function RelationshipTable({ relationships, limit = 10 }) {
  const sorted = useMemo(() => {
    return [...relationships]
      .sort((a, b) => a.sigma - b.sigma)  // 위험한 관계 우선
      .slice(0, limit);
  }, [relationships, limit]);
  
  return (
    <div className="bg-gray-800/30 rounded-xl overflow-hidden">
      <div className="p-3 border-b border-gray-700 flex justify-between items-center">
        <span className="text-white font-medium text-sm">관계 현황</span>
        <span className="text-gray-500 text-xs">σ 낮은 순</span>
      </div>
      <div className="divide-y divide-gray-800">
        {sorted.map(rel => {
          const grade = getSigmaGrade(rel.sigma);
          const config = SIGMA_GRADES[grade];
          return (
            <div key={rel.id} className="p-3 flex items-center justify-between hover:bg-gray-800/30">
              <div className="flex items-center gap-3">
                <div 
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: config.color }}
                />
                <div>
                  <p className="text-white text-sm">{rel.nodeA.name} ↔ {rel.nodeB.name}</p>
                  <p className="text-gray-500 text-xs">T={rel.tTotal.toFixed(0)} · A={formatValue(rel.aValue)}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-mono text-sm" style={{ color: config.color }}>
                  σ {rel.sigma.toFixed(2)}
                </p>
                <p className={`text-xs ${rel.sigmaTrend >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {rel.sigmaTrend >= 0 ? '↑' : '↓'} {Math.abs(rel.sigmaTrend * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

// ============================================
// 컴포넌트: 실시간 피드
// ============================================
const RealtimeFeed = memo(function RealtimeFeed({ events }) {
  return (
    <div className="bg-gray-800/30 rounded-xl">
      <div className="p-3 border-b border-gray-700 flex items-center justify-between">
        <span className="text-white font-medium text-sm">📡 실시간</span>
        <motion.div
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-2 h-2 bg-emerald-500 rounded-full"
        />
      </div>
      <div className="p-3 space-y-2 max-h-48 overflow-y-auto">
        {events.map((event, i) => (
          <div key={i} className="text-xs">
            <span className="text-gray-500">{event.time}</span>
            <span className="text-gray-400 ml-2">{event.text}</span>
            <span className={`ml-2 ${event.sigma >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              σ{event.sigma >= 0 ? '+' : ''}{event.sigma.toFixed(2)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
});

// ============================================
// 컴포넌트: 행동 기록 버튼
// ============================================
const QuickActions = memo(function QuickActions({ onRecord }) {
  const behaviors = [
    { type: 'ATTENDANCE', icon: '✅', label: '출결' },
    { type: 'COMMUNICATION', icon: '💬', label: '소통' },
    { type: 'CLASS_PARTICIPATION', icon: '🙋', label: '참여' },
    { type: 'POSITIVE_FEEDBACK', icon: '👍', label: '긍정' },
    { type: 'COMPLAINT', icon: '⚠️', label: '불만' },
  ];
  
  return (
    <div className="bg-gray-800/30 rounded-xl p-4">
      <p className="text-white text-sm font-medium mb-3">빠른 기록</p>
      <div className="flex gap-2 flex-wrap">
        {behaviors.map(b => (
          <button
            key={b.type}
            onClick={() => onRecord(b.type)}
            className="px-3 py-2 bg-gray-700/50 hover:bg-gray-700 rounded-lg text-sm flex items-center gap-2"
          >
            <span>{b.icon}</span>
            <span className="text-gray-300">{b.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
});

// ============================================
// 메인 컴포넌트
// ============================================
export default function AutusDashboard({ role = 'OWNER' }) {
  const [data, setData] = useState(null);
  const [events, setEvents] = useState([]);
  const [selectedRelationship, setSelectedRelationship] = useState(null);
  
  // 초기 데이터 로드
  useEffect(() => {
    const mockData = generateMockData();
    setData(mockData);
    
    // 초기 이벤트
    setEvents([
      { time: '10:32', text: '김학생 출석', sigma: 0.05 },
      { time: '10:28', text: '박학부모 메시지 확인', sigma: 0.03 },
      { time: '10:15', text: '이학생 과제 제출', sigma: 0.05 },
    ]);
  }, []);
  
  // API에서 데이터 로드 (실패 시 시뮬레이션)
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/autus/dashboard?role=' + role);
        const result = await response.json();
        if (result.success && result.data) {
          // API 데이터 변환
          const apiData = result.data;
          setData({
            nodes: apiData.nodes || data?.nodes || [],
            relationships: apiData.relationships || data?.relationships || [],
            omega: apiData.kpis?.omega || data?.omega || 0,
            avgSigma: apiData.kpis?.avgSigma || data?.avgSigma || 1.0,
          });
          return;
        }
      } catch (error) {
        console.log('API fallback to simulation:', error);
      }
      // Fallback: 시뮬레이션
      if (!data) return;
      setData(prev => ({
        ...prev,
        omega: prev.omega * (1 + (Math.random() - 0.4) * 0.001),
        relationships: prev.relationships.map(r => ({
          ...r,
          sigma: Math.max(0.5, Math.min(3, r.sigma + (Math.random() - 0.5) * 0.01)),
          aValue: calculateA(r.tTotal, r.lambdaAvg, r.sigma),
        })),
      }));
    };
    
    fetchData();
    const interval = setInterval(fetchData, 10000);
    
    return () => clearInterval(interval);
  }, [role]);
  
  // 이벤트 추가 시뮬레이션
  useEffect(() => {
    const interval = setInterval(() => {
      const newEvent = {
        time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
        text: ['출석 완료', '상담 종료', '과제 제출', '메시지 확인'][Math.floor(Math.random() * 4)],
        sigma: (Math.random() - 0.3) * 0.2,
      };
      setEvents(prev => [newEvent, ...prev.slice(0, 9)]);
    }, 8000);
    
    return () => clearInterval(interval);
  }, []);
  
  const handleRecord = useCallback((type) => {
    console.log('Record behavior:', type);
    const sigmaMap = {
      ATTENDANCE: 0.05,
      COMMUNICATION: 0.03,
      CLASS_PARTICIPATION: 0.05,
      POSITIVE_FEEDBACK: 0.1,
      COMPLAINT: -0.1,
    };
    const newEvent = {
      time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
      text: `${type} 기록됨`,
      sigma: sigmaMap[type] || 0,
    };
    setEvents(prev => [newEvent, ...prev.slice(0, 9)]);
  }, []);
  
  if (!data) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }
  
  const avgSigma = data.relationships.reduce((s, r) => s + r.sigma, 0) / data.relationships.length;
  const churnRisk = data.relationships.filter(r => r.sigma < 1.0).length;
  const avgT = data.relationships.reduce((s, r) => s + r.tTotal, 0) / data.relationships.length;
  const avgLambda = data.relationships.reduce((s, r) => s + r.lambdaAvg, 0) / data.relationships.length;
  
  return (
    <div className="min-h-screen bg-gray-900 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">🏛️ AUTUS</h1>
            <p className="text-gray-500 text-sm">A = T<sup>σ</sup> · 가치의 법칙</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-gray-800 text-gray-400 rounded-full text-sm">{role}</span>
          </div>
        </div>
        
        {/* Main Grid */}
        <div className="grid grid-cols-12 gap-4">
          {/* Left Column: Ω + KPIs */}
          <div className="col-span-12 lg:col-span-4 space-y-4">
            <OmegaGauge omega={data.omega} change={0.032} />
            
            <div className="grid grid-cols-2 gap-4">
              <KPICard title="평균 σ" value={avgSigma.toFixed(2)} change={2.1} icon="📈" />
              <KPICard title="노드 수" value={data.nodes.length} change={3} icon="👥" />
              <KPICard title="관계 수" value={data.relationships.length} icon="🔗" />
              <KPICard title="이탈 위험" value={churnRisk} change={-2} icon="⚠️" color="red" />
            </div>
            
            <FormulaDisplay 
              t={avgT}
              lambda={avgLambda}
              sigma={avgSigma}
              A={calculateA(avgT, avgLambda, avgSigma)}
            />
          </div>
          
          {/* Center Column: Distribution + Table */}
          <div className="col-span-12 lg:col-span-5 space-y-4">
            <SigmaDistributionBar relationships={data.relationships} />
            <RelationshipTable relationships={data.relationships} limit={8} />
          </div>
          
          {/* Right Column: Feed + Actions */}
          <div className="col-span-12 lg:col-span-3 space-y-4">
            <RealtimeFeed events={events} />
            <QuickActions onRecord={handleRecord} />
            
            {/* σ 등급 범례 */}
            <div className="bg-gray-800/30 rounded-xl p-4">
              <p className="text-white text-sm font-medium mb-3">σ 등급</p>
              <div className="space-y-2">
                {Object.entries(SIGMA_GRADES).map(([grade, config]) => (
                  <div key={grade} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: config.color }}
                      />
                      <span className="text-gray-400">{config.label}</span>
                    </div>
                    <span className="text-gray-500 font-mono">{config.min}~{config.max}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
