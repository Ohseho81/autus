/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🎯 FSD DASHBOARD - Judgment & Allocation Lead
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * 자동화율: 80%
 * 
 * 흡수된 모듈:
 * - Ecosystem Observer → Market & Ecosystem Judgment Module
 * - Capital & Pressure Enabler → Investor & Capital Judgment Module
 */

import React, { useState, memo, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// DESIGN TOKENS
// ============================================
const TOKENS = {
  type: {
    h1: 'text-3xl font-bold tracking-tight',
    h2: 'text-xl font-semibold tracking-tight',
    h3: 'text-lg font-medium',
  },
  colors: {
    fsd: '#00AAFF',
    positive: '#10B981',
    negative: '#EF4444',
    neutral: '#6B7280',
    warning: '#F59E0B',
  },
};

// ============================================
// MOCK DATA
// ============================================
const MOCK_MARKET_DATA = {
  competitors: [
    { id: 1, name: '경쟁사 A', threat: 72, trend: 'up', recentAction: '신규 AI 기능 출시', recommendation: 'absorb' },
    { id: 2, name: '경쟁사 B', threat: 45, trend: 'stable', recentAction: '가격 인하 캠페인', recommendation: 'ignore' },
    { id: 3, name: '신규 진입자 C', threat: 89, trend: 'up', recentAction: '시리즈 A 투자 유치', recommendation: 'fight' },
  ],
  industryTrends: [
    { id: 1, topic: 'AI 자동화', sentiment: 0.82, volume: 12400, change: +23 },
    { id: 2, topic: '비용 절감', sentiment: 0.65, volume: 8900, change: +12 },
    { id: 3, topic: '규제 강화', sentiment: -0.45, volume: 5600, change: +45 },
    { id: 4, topic: '원격 근무', sentiment: 0.55, volume: 7200, change: -8 },
  ],
  communitySignals: [
    { platform: 'X/Twitter', mentions: 2340, sentiment: 0.72 },
    { platform: 'LinkedIn', mentions: 890, sentiment: 0.85 },
    { platform: 'Reddit', mentions: 1560, sentiment: 0.48 },
    { platform: 'News', mentions: 234, sentiment: 0.62 },
  ],
};

const MOCK_INVESTOR_DATA = {
  pressureIndex: 67,
  trend: 'increasing',
  investors: [
    { id: 1, name: 'VC Fund Alpha', stake: 15, pressure: 'high', demand: '분기 성장률 20% 요구', dueDate: '2024-03' },
    { id: 2, name: 'Strategic Partner B', stake: 8, pressure: 'medium', demand: '신규 시장 진출 계획', dueDate: '2024-04' },
    { id: 3, name: 'Angel Investor C', stake: 5, pressure: 'low', demand: '제품 로드맵 공유', dueDate: '2024-06' },
  ],
  capitalFlow: {
    runway: 18, // months
    burnRate: 45, // million won
    nextRound: { target: 500, probability: 72 },
  },
};

const MOCK_RISK_DATA = {
  overall: 42,
  categories: [
    { id: 'churn', name: '고객 이탈', score: 35, trend: 'down', prediction: '3명 이탈 예상 (7일 내)' },
    { id: 'turnover', name: '직원 이직', score: 28, trend: 'stable', prediction: '안정적' },
    { id: 'financial', name: '재무 리스크', score: 52, trend: 'up', prediction: '현금 흐름 주의 필요' },
    { id: 'operational', name: '운영 리스크', score: 45, trend: 'stable', prediction: '시스템 과부하 가능성' },
    { id: 'regulatory', name: '규제 리스크', score: 61, trend: 'up', prediction: '신규 규제 대응 필요' },
  ],
  alerts: [
    { id: 1, type: 'churn', severity: 'high', message: '학생 김OO 3주 연속 출석률 저하', action: 'Optimus에 자동 케어 지시' },
    { id: 2, type: 'financial', severity: 'medium', message: '미수금 3건 (총 450만원) 30일 초과', action: '자동 알림 발송 예정' },
  ],
};

const MOCK_ALLOCATION_DATA = {
  pendingDecisions: [
    { id: 1, type: 'resource', title: '마케팅 예산 재배분', options: ['A안: SNS 집중', 'B안: 컨텐츠 마케팅', 'C안: 현행 유지'], aiRecommendation: 'A안 (확률 78%)' },
    { id: 2, type: 'staffing', title: '신규 프로젝트 인력 배정', options: ['팀A 2명', '팀B 1명 + 외주', '전담 TF 구성'], aiRecommendation: '전담 TF (확률 65%)' },
    { id: 3, type: 'priority', title: '분기 목표 우선순위', options: ['매출 성장', '고객 만족', '비용 절감'], aiRecommendation: '고객 만족 (확률 82%)' },
  ],
  recentDecisions: [
    { id: 1, title: '강사 추가 채용', decision: '승인', timestamp: '2시간 전', impact: '+12% 수용력' },
    { id: 2, title: '시스템 업그레이드', decision: '보류', timestamp: '1일 전', impact: '다음 분기 검토' },
  ],
};

// ============================================
// MARKET JUDGMENT MODULE
// ============================================
const MarketJudgmentModule = memo(function MarketJudgmentModule({ data }) {
  const [selectedCompetitor, setSelectedCompetitor] = useState(null);
  
  const getThreatColor = (threat) => {
    if (threat >= 70) return 'text-red-400';
    if (threat >= 50) return 'text-yellow-400';
    return 'text-emerald-400';
  };
  
  const getRecommendationStyle = (rec) => {
    switch (rec) {
      case 'fight': return 'bg-red-500/20 text-red-400';
      case 'absorb': return 'bg-cyan-500/20 text-cyan-400';
      default: return 'bg-gray-700 text-gray-400';
    }
  };
  
  return (
    <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className={`${TOKENS.type.h2} text-white flex items-center gap-2`}>
            🌐 Market & Ecosystem Judgment
          </h2>
          <p className="text-gray-400 text-sm mt-1">흡수: Ecosystem Observer</p>
        </div>
        <span className="px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded-full text-sm">
          실시간 분석
        </span>
      </div>
      
      {/* Competitors */}
      <div className="mb-6">
        <h3 className="text-gray-300 font-medium mb-3">🎯 경쟁사 위협 분석</h3>
        <div className="space-y-2">
          {data.competitors.map((comp) => (
            <div 
              key={comp.id}
              className="p-3 bg-gray-900/50 rounded-xl border border-gray-700/50 cursor-pointer hover:border-cyan-500/30 transition-colors"
              onClick={() => setSelectedCompetitor(comp)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`text-2xl font-bold ${getThreatColor(comp.threat)}`}>
                    {comp.threat}
                  </div>
                  <div>
                    <p className="text-white font-medium">{comp.name}</p>
                    <p className="text-gray-500 text-sm">{comp.recentAction}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs ${comp.trend === 'up' ? 'text-red-400' : 'text-gray-500'}`}>
                    {comp.trend === 'up' ? '↑ 상승' : '→ 유지'}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs ${getRecommendationStyle(comp.recommendation)}`}>
                    {comp.recommendation === 'fight' ? '⚔️ Fight' : 
                     comp.recommendation === 'absorb' ? '🔄 Absorb' : '➖ Ignore'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Industry Trends */}
      <div className="mb-6">
        <h3 className="text-gray-300 font-medium mb-3">📈 업계 트렌드</h3>
        <div className="grid grid-cols-2 gap-3">
          {data.industryTrends.map((trend) => (
            <div key={trend.id} className="p-3 bg-gray-900/30 rounded-xl">
              <div className="flex items-center justify-between mb-1">
                <span className="text-white">{trend.topic}</span>
                <span className={`text-xs ${trend.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {trend.change >= 0 ? '+' : ''}{trend.change}%
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">{trend.volume.toLocaleString()} 언급</span>
                <span className={trend.sentiment >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                  감성 {(trend.sentiment * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Community Signals */}
      <div>
        <h3 className="text-gray-300 font-medium mb-3">💬 커뮤니티 시그널</h3>
        <div className="flex gap-2">
          {data.communitySignals.map((signal) => (
            <div key={signal.platform} className="flex-1 p-3 bg-gray-900/30 rounded-xl text-center">
              <p className="text-xs text-gray-500 mb-1">{signal.platform}</p>
              <p className="text-white font-medium">{signal.mentions.toLocaleString()}</p>
              <div className="mt-1 h-1 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${signal.sentiment >= 0.6 ? 'bg-emerald-500' : signal.sentiment >= 0.4 ? 'bg-yellow-500' : 'bg-red-500'}`}
                  style={{ width: `${signal.sentiment * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

// ============================================
// INVESTOR JUDGMENT MODULE
// ============================================
const InvestorJudgmentModule = memo(function InvestorJudgmentModule({ data }) {
  const getPressureColor = (pressure) => {
    switch (pressure) {
      case 'high': return 'text-red-400 bg-red-500/20';
      case 'medium': return 'text-yellow-400 bg-yellow-500/20';
      default: return 'text-emerald-400 bg-emerald-500/20';
    }
  };
  
  return (
    <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className={`${TOKENS.type.h2} text-white flex items-center gap-2`}>
            💰 Investor & Capital Judgment
          </h2>
          <p className="text-gray-400 text-sm mt-1">흡수: Capital & Pressure Enabler</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Pressure Index</p>
          <p className={`text-2xl font-bold ${data.pressureIndex >= 70 ? 'text-red-400' : data.pressureIndex >= 50 ? 'text-yellow-400' : 'text-emerald-400'}`}>
            {data.pressureIndex}
          </p>
        </div>
      </div>
      
      {/* Capital Flow */}
      <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-gradient-to-r from-purple-500/10 to-cyan-500/10 rounded-xl">
        <div className="text-center">
          <p className="text-xs text-gray-400">Runway</p>
          <p className="text-2xl font-bold text-white">{data.capitalFlow.runway}<span className="text-sm text-gray-500">개월</span></p>
        </div>
        <div className="text-center border-x border-gray-700">
          <p className="text-xs text-gray-400">Burn Rate</p>
          <p className="text-2xl font-bold text-white">{data.capitalFlow.burnRate}<span className="text-sm text-gray-500">M₩</span></p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-400">다음 라운드</p>
          <p className="text-lg font-bold text-cyan-400">{data.capitalFlow.nextRound.probability}%</p>
          <p className="text-xs text-gray-500">{data.capitalFlow.nextRound.target}M 목표</p>
        </div>
      </div>
      
      {/* Investors */}
      <div>
        <h3 className="text-gray-300 font-medium mb-3">👥 투자자 요구사항</h3>
        <div className="space-y-2">
          {data.investors.map((inv) => (
            <div key={inv.id} className="p-3 bg-gray-900/50 rounded-xl border border-gray-700/50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium">{inv.name}</span>
                  <span className="text-xs text-gray-500">({inv.stake}% 지분)</span>
                </div>
                <span className={`px-2 py-0.5 rounded text-xs ${getPressureColor(inv.pressure)}`}>
                  {inv.pressure} pressure
                </span>
              </div>
              <p className="text-gray-400 text-sm">{inv.demand}</p>
              <p className="text-xs text-gray-600 mt-1">마감: {inv.dueDate}</p>
            </div>
          ))}
        </div>
        
        <button className="w-full mt-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors">
          📊 IR 전략 리포트 생성 → Optimus
        </button>
      </div>
    </div>
  );
});

// ============================================
// RISK PREDICTION MODULE
// ============================================
const RiskPredictionModule = memo(function RiskPredictionModule({ data }) {
  const getRiskColor = (score) => {
    if (score >= 60) return { bg: 'bg-red-500', text: 'text-red-400' };
    if (score >= 40) return { bg: 'bg-yellow-500', text: 'text-yellow-400' };
    return { bg: 'bg-emerald-500', text: 'text-emerald-400' };
  };
  
  return (
    <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
      <div className="flex items-center justify-between mb-4">
        <h2 className={`${TOKENS.type.h2} text-white`}>⚠️ Risk Prediction</h2>
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-sm">Overall Risk</span>
          <span className={`text-2xl font-bold ${getRiskColor(data.overall).text}`}>
            {data.overall}
          </span>
        </div>
      </div>
      
      {/* Risk Categories */}
      <div className="space-y-3 mb-6">
        {data.categories.map((cat) => {
          const colors = getRiskColor(cat.score);
          return (
            <div key={cat.id} className="p-3 bg-gray-900/30 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white">{cat.name}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-xs ${cat.trend === 'up' ? 'text-red-400' : cat.trend === 'down' ? 'text-emerald-400' : 'text-gray-500'}`}>
                    {cat.trend === 'up' ? '↑' : cat.trend === 'down' ? '↓' : '→'}
                  </span>
                  <span className={`font-bold ${colors.text}`}>{cat.score}</span>
                </div>
              </div>
              <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${colors.bg}`} style={{ width: `${cat.score}%` }} />
              </div>
              <p className="text-xs text-gray-500 mt-1">{cat.prediction}</p>
            </div>
          );
        })}
      </div>
      
      {/* Active Alerts */}
      {data.alerts.length > 0 && (
        <div>
          <h3 className="text-gray-300 font-medium mb-3">🚨 활성 알림</h3>
          <div className="space-y-2">
            {data.alerts.map((alert) => (
              <div 
                key={alert.id}
                className={`p-3 rounded-xl border ${
                  alert.severity === 'high' 
                    ? 'bg-red-500/10 border-red-500/30' 
                    : 'bg-yellow-500/10 border-yellow-500/30'
                }`}
              >
                <p className={`text-sm ${alert.severity === 'high' ? 'text-red-400' : 'text-yellow-400'}`}>
                  {alert.message}
                </p>
                <p className="text-xs text-gray-500 mt-1">→ {alert.action}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

// ============================================
// ALLOCATION DECISIONS
// ============================================
const AllocationDecisions = memo(function AllocationDecisions({ data }) {
  const [decisions, setDecisions] = useState({});
  
  const handleDecision = (id, option) => {
    setDecisions({ ...decisions, [id]: option });
  };
  
  return (
    <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
      <div className="flex items-center justify-between mb-4">
        <h2 className={`${TOKENS.type.h2} text-white`}>📋 Allocation Decisions</h2>
        <span className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded-full text-sm">
          {data.pendingDecisions.length}개 대기
        </span>
      </div>
      
      {/* Pending Decisions */}
      <div className="space-y-4 mb-6">
        {data.pendingDecisions.map((item) => (
          <div key={item.id} className="p-4 bg-gray-900/50 rounded-xl border border-gray-700/50">
            <div className="flex items-start justify-between mb-3">
              <div>
                <span className="text-xs text-cyan-400 uppercase">{item.type}</span>
                <h4 className="text-white font-medium mt-1">{item.title}</h4>
              </div>
              <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded text-xs">
                AI: {item.aiRecommendation}
              </span>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              {item.options.map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleDecision(item.id, opt)}
                  className={`p-2 rounded-lg text-sm transition-colors ${
                    decisions[item.id] === opt
                      ? 'bg-cyan-500/30 text-cyan-400 border border-cyan-500/50'
                      : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-600'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
            
            {decisions[item.id] && (
              <button className="w-full mt-3 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors">
                ⚡ Optimus에 실행 지시
              </button>
            )}
          </div>
        ))}
      </div>
      
      {/* Recent Decisions */}
      <div>
        <h3 className="text-gray-300 font-medium mb-3">📜 최근 결정</h3>
        <div className="space-y-2">
          {data.recentDecisions.map((dec) => (
            <div key={dec.id} className="flex items-center justify-between p-3 bg-gray-900/30 rounded-xl">
              <div>
                <p className="text-white text-sm">{dec.title}</p>
                <p className="text-xs text-gray-500">{dec.timestamp}</p>
              </div>
              <div className="text-right">
                <span className={`px-2 py-1 rounded text-xs ${
                  dec.decision === '승인' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {dec.decision}
                </span>
                <p className="text-xs text-gray-500 mt-1">{dec.impact}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

// ============================================
// MAIN FSD DASHBOARD
// ============================================
export default function FSDDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  
  const tabs = [
    { id: 'overview', label: '전체 현황', icon: '📊' },
    { id: 'market', label: 'Market Judgment', icon: '🌐' },
    { id: 'investor', label: 'Investor Judgment', icon: '💰' },
    { id: 'risk', label: 'Risk Prediction', icon: '⚠️' },
  ];
  
  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`${TOKENS.type.h1} text-white flex items-center gap-3`}>
            <span className="text-4xl">🎯</span>
            FSD Dashboard
          </h1>
          <p className="text-gray-400 mt-1">Judgment & Allocation Lead · 80% 자동화</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-xl font-medium">
            🔄 Auto-Analysis Active
          </span>
        </div>
      </div>
      
      {/* Tab Navigation */}
      <div className="flex gap-2 p-1 bg-gray-800/50 rounded-xl w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-cyan-500/20 text-cyan-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>
      
      {/* Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-2 gap-6">
          <MarketJudgmentModule data={MOCK_MARKET_DATA} />
          <InvestorJudgmentModule data={MOCK_INVESTOR_DATA} />
          <RiskPredictionModule data={MOCK_RISK_DATA} />
          <AllocationDecisions data={MOCK_ALLOCATION_DATA} />
        </div>
      )}
      
      {activeTab === 'market' && (
        <div className="max-w-4xl">
          <MarketJudgmentModule data={MOCK_MARKET_DATA} />
        </div>
      )}
      
      {activeTab === 'investor' && (
        <div className="max-w-4xl">
          <InvestorJudgmentModule data={MOCK_INVESTOR_DATA} />
        </div>
      )}
      
      {activeTab === 'risk' && (
        <div className="grid grid-cols-2 gap-6">
          <RiskPredictionModule data={MOCK_RISK_DATA} />
          <AllocationDecisions data={MOCK_ALLOCATION_DATA} />
        </div>
      )}
      
      {/* Status Bar */}
      <div className="flex items-center justify-between p-4 bg-gray-800/30 rounded-xl border border-gray-700/30">
        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="text-xs text-gray-500">판단 대기</p>
            <p className="text-lg font-bold text-orange-400">5</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">오늘 처리</p>
            <p className="text-lg font-bold text-emerald-400">23</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500">자동화율</p>
            <p className="text-lg font-bold text-cyan-400">82%</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors">
            👑 C-Level 보고
          </button>
          <button className="px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors">
            ⚡ Optimus 지시
          </button>
        </div>
      </div>
    </div>
  );
}
