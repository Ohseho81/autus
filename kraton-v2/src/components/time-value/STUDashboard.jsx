/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ⏱️ STU Dashboard - AUTUS 시간 측정 체계 대시보드
 * 
 * V = P × Λ × e^(σt)
 * NRV = P × (T₃ - T₁ + T₂) × e^(σt)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Mock 데이터 (실제로는 API에서 가져옴)
const MOCK_DASHBOARD_DATA = {
  org_id: 'org-1',
  omega: 32500,
  total_t1: 1250,
  total_t2: 380,
  total_t3: 2100,
  org_ntv: 1230,
  org_ntv_money: 39975000,
  total_relationship_value: 8500,
  total_relationship_value_money: 276250000,
  efficiency_score: 78,
  node_count: 45,
  relationship_count: 156,
  avg_lambda: 2.1,
  top_lambda_nodes: [
    { id: '1', name: '김원장', role: 'c_level', lambda: 5.2 },
    { id: '2', name: '박팀장', role: 'fsd', lambda: 3.4 },
    { id: '3', name: '이선생', role: 'senior_teacher', lambda: 2.8 },
    { id: '4', name: '최선생', role: 'teacher', lambda: 2.3 },
    { id: '5', name: '정선생', role: 'teacher', lambda: 2.1 },
  ],
  strongest_relationships: [
    { node_a: '김원장', node_b: '박팀장', sigma: 0.42, value: 850 },
    { node_a: '이선생', node_b: '학생A', sigma: 0.38, value: 620 },
    { node_a: '박팀장', node_b: '이선생', sigma: 0.35, value: 580 },
    { node_a: '최선생', node_b: '학생B', sigma: 0.32, value: 520 },
    { node_a: '김원장', node_b: '학부모C', sigma: 0.28, value: 480 },
  ],
  weakest_relationships: [
    { node_a: '신입선생', node_b: '학생D', sigma: -0.15, value: 45 },
    { node_a: '학생E', node_b: '학부모E', sigma: -0.12, value: 52 },
    { node_a: '정선생', node_b: '학생F', sigma: -0.08, value: 68 },
    { node_a: '최선생', node_b: '학부모G', sigma: -0.05, value: 85 },
    { node_a: '이선생', node_b: '학생H', sigma: 0.02, value: 120 },
  ],
};

// 색상 팔레트
const COLORS = {
  t1: '#ef4444',      // 투입 - 빨강
  t2: '#22c55e',      // 절약 - 초록
  t3: '#3b82f6',      // 창출 - 파랑
  ntv: '#a855f7',     // NTV - 보라
  lambda: '#f59e0b',  // λ - 주황
  sigma: '#06b6d4',   // σ - 청록
  density: '#ec4899', // P - 핑크
};

// 원형 게이지 컴포넌트
function CircularGauge({ value, max, label, color, size = 120 }) {
  const percentage = Math.min(100, (value / max) * 100);
  const strokeWidth = size * 0.08;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* 배경 원 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={strokeWidth}
        />
        {/* 진행 원 */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1, ease: 'easeOut' }}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-white">{Math.round(percentage)}%</span>
        <span className="text-xs text-gray-400">{label}</span>
      </div>
    </div>
  );
}

// 막대 차트 컴포넌트
function BarChart({ data, height = 200 }) {
  const maxValue = Math.max(...data.map(d => d.value));
  
  return (
    <div className="flex items-end justify-around gap-2" style={{ height }}>
      {data.map((item, index) => {
        const barHeight = (item.value / maxValue) * (height - 40);
        return (
          <div key={index} className="flex flex-col items-center gap-1">
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: barHeight }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              className="w-8 rounded-t"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-xs text-gray-400">{item.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// λ 순위 카드
function LambdaRankCard({ node, rank }) {
  const roleEmoji = {
    c_level: '👑',
    fsd: '🎯',
    optimus: '⚡',
    senior_teacher: '🌟',
    teacher: '📚',
    student: '📖',
    parent: '👪',
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: rank * 0.1 }}
      className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-xl"
    >
      <span className="text-lg font-bold text-gray-500 w-6">#{rank + 1}</span>
      <span className="text-xl">{roleEmoji[node.role] || '👤'}</span>
      <div className="flex-1">
        <p className="text-white font-medium">{node.name}</p>
        <p className="text-xs text-gray-500">{node.role}</p>
      </div>
      <div className="text-right">
        <p className="text-lg font-bold text-amber-400">λ {node.lambda.toFixed(1)}</p>
        <p className="text-xs text-gray-500">{node.lambda.toFixed(1)} STU/h</p>
      </div>
    </motion.div>
  );
}

// 관계 카드
function RelationshipCard({ rel, type }) {
  const isStrong = type === 'strong';
  
  return (
    <div className={`
      p-3 rounded-xl border-l-4 bg-gray-800/50
      ${isStrong ? 'border-l-emerald-500' : 'border-l-red-500'}
    `}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-white">{rel.node_a}</span>
          <span className="text-gray-500">↔</span>
          <span className="text-sm text-white">{rel.node_b}</span>
        </div>
        <div className="text-right">
          <span className={`text-sm font-bold ${isStrong ? 'text-emerald-400' : 'text-red-400'}`}>
            σ {rel.sigma > 0 ? '+' : ''}{rel.sigma.toFixed(2)}
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between mt-1">
        <span className="text-xs text-gray-500">시너지 배율: {Math.exp(rel.sigma).toFixed(2)}x/년</span>
        <span className="text-xs text-cyan-400">{rel.value.toLocaleString()} STU</span>
      </div>
    </div>
  );
}

// 수식 표시 컴포넌트
function FormulaDisplay({ formula, description }) {
  return (
    <div className="p-3 bg-gray-900/50 rounded-xl border border-gray-700/50">
      <code className="text-cyan-400 font-mono text-sm">{formula}</code>
      <p className="text-xs text-gray-500 mt-1">{description}</p>
    </div>
  );
}

// 메인 대시보드
export default function STUDashboard({ orgId }) {
  const [data, setData] = useState(MOCK_DASHBOARD_DATA);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // API 호출 (Fallback: Mock 데이터)
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/time-value?org_id=${orgId}&action=dashboard`);
        const result = await response.json();
        if (result.success && result.data) {
          setData(result.data);
        } else {
          // API 실패 시 Mock 데이터 사용
          setData(MOCK_DASHBOARD_DATA);
        }
      } catch (error) {
        console.error('Failed to fetch time value data:', error);
        // 에러 시 Mock 데이터 사용
        setData(MOCK_DASHBOARD_DATA);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 60000); // 1분마다 갱신
    return () => clearInterval(interval);
  }, [orgId]);

  // 시간 흐름 데이터
  const timeFlowData = useMemo(() => [
    { label: 'T₁', value: data.total_t1, color: COLORS.t1 },
    { label: 'T₂', value: data.total_t2, color: COLORS.t2 },
    { label: 'T₃', value: data.total_t3, color: COLORS.t3 },
    { label: 'NTV', value: Math.max(0, data.org_ntv), color: COLORS.ntv },
  ], [data]);

  const tabs = [
    { id: 'overview', label: '개요', icon: '📊' },
    { id: 'nodes', label: '노드 λ', icon: '👥' },
    { id: 'relationships', label: '관계 σ', icon: '🔗' },
    { id: 'formulas', label: '수식', icon: '🔬' },
  ];

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      {/* 헤더 */}
      <div className="mb-6">
        <h1 className="text-3xl font-black text-white flex items-center gap-3">
          ⏱️ STU Dashboard
          <span className="text-sm font-normal text-gray-500">AUTUS 시간 측정 체계</span>
        </h1>
        <p className="text-gray-500 mt-1">
          모든 가치는 시간이다 · All Value is Time
        </p>
      </div>

      {/* 핵심 지표 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {/* ω (시간 단가) */}
        <div className="bg-gradient-to-br from-amber-900/30 to-amber-600/10 rounded-2xl border border-amber-500/30 p-4">
          <p className="text-amber-400 text-sm mb-1">ω (시간 단가)</p>
          <p className="text-3xl font-bold text-white">
            ₩{data.omega.toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-1">per STU</p>
        </div>

        {/* 평균 λ */}
        <div className="bg-gradient-to-br from-orange-900/30 to-orange-600/10 rounded-2xl border border-orange-500/30 p-4">
          <p className="text-orange-400 text-sm mb-1">평균 λ</p>
          <p className="text-3xl font-bold text-white">
            {data.avg_lambda.toFixed(2)}
          </p>
          <p className="text-xs text-gray-500 mt-1">{data.node_count}개 노드</p>
        </div>

        {/* 효율성 점수 */}
        <div className="bg-gradient-to-br from-emerald-900/30 to-emerald-600/10 rounded-2xl border border-emerald-500/30 p-4">
          <p className="text-emerald-400 text-sm mb-1">효율성</p>
          <p className="text-3xl font-bold text-white">
            {data.efficiency_score}%
          </p>
          <p className="text-xs text-gray-500 mt-1">(T₂+T₃)/T₁ 기반</p>
        </div>

        {/* 관계 가치 */}
        <div className="bg-gradient-to-br from-purple-900/30 to-purple-600/10 rounded-2xl border border-purple-500/30 p-4">
          <p className="text-purple-400 text-sm mb-1">총 관계 가치</p>
          <p className="text-3xl font-bold text-white">
            {(data.total_relationship_value / 1000).toFixed(1)}K
          </p>
          <p className="text-xs text-gray-500 mt-1">{data.relationship_count}개 관계</p>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all
              ${activeTab === tab.id
                ? 'bg-cyan-600/30 text-cyan-400 border border-cyan-500/50'
                : 'bg-gray-800/50 text-gray-400 border border-gray-700 hover:border-gray-600'}
            `}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* 탭 콘텐츠 */}
      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid md:grid-cols-2 gap-6"
          >
            {/* 시간 흐름 */}
            <div className="bg-gray-800/50 rounded-2xl border border-gray-700 p-6">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                📈 시간 흐름 (STU)
              </h3>
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center">
                  <p className="text-red-400 text-sm">T₁ 투입</p>
                  <p className="text-2xl font-bold text-white">{data.total_t1.toLocaleString()}</p>
                </div>
                <div className="text-center">
                  <p className="text-green-400 text-sm">T₂ 절약</p>
                  <p className="text-2xl font-bold text-white">{data.total_t2.toLocaleString()}</p>
                </div>
                <div className="text-center">
                  <p className="text-blue-400 text-sm">T₃ 창출</p>
                  <p className="text-2xl font-bold text-white">{data.total_t3.toLocaleString()}</p>
                </div>
              </div>
              <BarChart data={timeFlowData} height={150} />
              <div className="mt-4 p-3 bg-purple-900/30 rounded-xl border border-purple-500/30">
                <p className="text-purple-400 text-sm">NTV = T₃ - T₁ + T₂</p>
                <p className="text-2xl font-bold text-white">
                  {data.org_ntv.toLocaleString()} STU
                  <span className="text-sm text-gray-500 ml-2">
                    (₩{data.org_ntv_money.toLocaleString()})
                  </span>
                </p>
              </div>
            </div>

            {/* 게이지 */}
            <div className="bg-gray-800/50 rounded-2xl border border-gray-700 p-6">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                🎯 핵심 지표
              </h3>
              <div className="flex justify-around items-center">
                <CircularGauge
                  value={data.efficiency_score}
                  max={100}
                  label="효율성"
                  color={COLORS.t2}
                />
                <CircularGauge
                  value={data.avg_lambda * 20}
                  max={100}
                  label="평균 λ"
                  color={COLORS.lambda}
                />
                <CircularGauge
                  value={data.relationship_count}
                  max={200}
                  label="관계 수"
                  color={COLORS.sigma}
                />
              </div>
              <div className="mt-6 p-3 bg-gray-900/50 rounded-xl">
                <p className="text-gray-400 text-sm text-center">
                  총 관계 가치: <span className="text-cyan-400 font-bold">
                    ₩{data.total_relationship_value_money.toLocaleString()}
                  </span>
                </p>
              </div>
            </div>

            {/* 상위 λ 노드 */}
            <div className="bg-gray-800/50 rounded-2xl border border-gray-700 p-6">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                🏆 상위 λ 노드
              </h3>
              <div className="space-y-2">
                {data.top_lambda_nodes.map((node, i) => (
                  <LambdaRankCard key={node.id} node={node} rank={i} />
                ))}
              </div>
            </div>

            {/* 시너지 관계 */}
            <div className="bg-gray-800/50 rounded-2xl border border-gray-700 p-6">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                🔗 시너지 관계
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-emerald-400 text-sm mb-2">💚 최고 시너지</p>
                  <div className="space-y-2">
                    {data.strongest_relationships.slice(0, 3).map((rel, i) => (
                      <RelationshipCard key={i} rel={rel} type="strong" />
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-red-400 text-sm mb-2">❤️ 개선 필요</p>
                  <div className="space-y-2">
                    {data.weakest_relationships.slice(0, 2).map((rel, i) => (
                      <RelationshipCard key={i} rel={rel} type="weak" />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'nodes' && (
          <motion.div
            key="nodes"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-gray-800/50 rounded-2xl border border-gray-700 p-6"
          >
            <h3 className="text-white font-bold mb-4">
              👥 노드별 λ (시간상수)
            </h3>
            <div className="mb-4 p-4 bg-amber-900/20 rounded-xl border border-amber-500/30">
              <code className="text-amber-400 font-mono">λ = (1/R) × I × E × N × k</code>
              <p className="text-xs text-gray-400 mt-2">
                R: 대체가능성 | I: 영향력 | E: 전문성 | N: 네트워크 | k: 산업상수
              </p>
            </div>
            <div className="space-y-2">
              {data.top_lambda_nodes.map((node, i) => (
                <LambdaRankCard key={node.id} node={node} rank={i} />
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'relationships' && (
          <motion.div
            key="relationships"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-gray-800/50 rounded-2xl border border-gray-700 p-6"
          >
            <h3 className="text-white font-bold mb-4">
              🔗 관계별 σ (시너지 계수)
            </h3>
            <div className="mb-4 p-4 bg-cyan-900/20 rounded-xl border border-cyan-500/30">
              <code className="text-cyan-400 font-mono">σ = w₁C + w₂G + w₃V + w₄R</code>
              <p className="text-xs text-gray-400 mt-2">
                C: 호환성 | G: 목표일치 | V: 가치관일치 | R: 리듬동기화
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-emerald-400 text-sm mb-2">💚 최고 시너지 (σ &gt; 0)</p>
                <div className="space-y-2">
                  {data.strongest_relationships.map((rel, i) => (
                    <RelationshipCard key={i} rel={rel} type="strong" />
                  ))}
                </div>
              </div>
              <div>
                <p className="text-red-400 text-sm mb-2">❤️ 개선 필요 (σ &lt; 0)</p>
                <div className="space-y-2">
                  {data.weakest_relationships.map((rel, i) => (
                    <RelationshipCard key={i} rel={rel} type="weak" />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'formulas' && (
          <motion.div
            key="formulas"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-gray-800/50 rounded-2xl border border-gray-700 p-6"
          >
            <h3 className="text-white font-bold mb-6">
              🔬 AUTUS 시간 측정 공식
            </h3>
            
            <div className="grid md:grid-cols-2 gap-4">
              {/* 공리 */}
              <div className="md:col-span-2 p-4 bg-gradient-to-r from-purple-900/30 to-cyan-900/30 rounded-xl border border-purple-500/30">
                <h4 className="text-purple-400 font-bold mb-3">📜 3대 공리</h4>
                <div className="space-y-2 text-sm">
                  <p className="text-white">1. <span className="text-cyan-400">모든 가치는 시간이다</span> (All Value is Time)</p>
                  <p className="text-white">2. <span className="text-cyan-400">동일한 시간도 노드마다 가치가 다르다</span> (t_표준 = t_실제 × λ)</p>
                  <p className="text-white">3. <span className="text-cyan-400">관계의 시너지는 시간에 지수로 작용한다</span> (V ∝ e^(σt))</p>
                </div>
              </div>

              <FormulaDisplay
                formula="λ = (1/R) × I × E × N × k"
                description="노드 시간상수: 대체가능성, 영향력, 전문성, 네트워크, 산업상수"
              />
              
              <FormulaDisplay
                formula="σ = w₁C + w₂G + w₃V + w₄R"
                description="시너지 계수: 호환성, 목표일치, 가치관일치, 리듬동기화"
              />
              
              <FormulaDisplay
                formula="P = F × Q × D"
                description="관계 밀도: 접촉빈도, 상호작용품질, 관계깊이"
              />
              
              <FormulaDisplay
                formula="t_STU = t_real × λ"
                description="실제 시간 → 표준 시간 변환"
              />
              
              <FormulaDisplay
                formula="V_₩ = t_STU × ω"
                description="표준 시간 → 화폐 가치 변환"
              />
              
              <FormulaDisplay
                formula="NTV = T₃ - T₁ + T₂"
                description="순시간가치: 창출 - 투입 + 절약"
              />
              
              <div className="md:col-span-2 p-4 bg-gradient-to-r from-cyan-900/30 to-purple-900/30 rounded-xl border border-cyan-500/30">
                <h4 className="text-cyan-400 font-bold mb-2">🏛️ 최종 공식</h4>
                <code className="text-2xl text-white font-mono">V = P × Λ × e^(σt)</code>
                <p className="text-gray-400 text-sm mt-2">
                  관계 가치 = 밀도 × 상호시간가치 × 시너지복리
                </p>
              </div>
              
              <div className="md:col-span-2 p-4 bg-gradient-to-r from-emerald-900/30 to-cyan-900/30 rounded-xl border border-emerald-500/30">
                <h4 className="text-emerald-400 font-bold mb-2">💎 순관계가치</h4>
                <code className="text-xl text-white font-mono">NRV = P × (T₃ - T₁ + T₂) × e^(σt)</code>
                <p className="text-gray-400 text-sm mt-2">
                  순관계가치 = 밀도 × 순시간가치 × 시너지복리
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 하단 정보 */}
      <div className="mt-6 text-center text-gray-600 text-sm">
        <p>"측정할 수 없으면 관리할 수 없다" - 피터 드러커</p>
        <p className="mt-1">AUTUS Time Value Engine v2.0</p>
      </div>
    </div>
  );
}
