/**
 * AUTUS Macro Page
 * ==================
 * 거시흐름 - 국제/국내/산업별 정세
 */

import React, { useState } from 'react';

// ============================================
// Types
// ============================================

interface MacroIndicator {
  id: string;
  name: string;
  value: number;
  unit: string;
  change: number;
  trend: 'up' | 'down' | 'stable';
  lastUpdated: string;
  source: string;
  impact: 'positive' | 'negative' | 'neutral';
  relevance: number; // 0-100, 내 사업 관련도
}

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  date: string;
  category: 'global' | 'national' | 'industry';
  sentiment: 'positive' | 'negative' | 'neutral';
  impact: number; // 1-10
}

interface Sector {
  id: string;
  name: string;
  indicators: MacroIndicator[];
}

// ============================================
// Mock Data
// ============================================

const GLOBAL_INDICATORS: MacroIndicator[] = [
  {
    id: 'fed-rate',
    name: '미국 기준금리',
    value: 4.5,
    unit: '%',
    change: 0,
    trend: 'stable',
    lastUpdated: '2026-01-08',
    source: 'FRED',
    impact: 'neutral',
    relevance: 60,
  },
  {
    id: 'usd-krw',
    name: '달러/원 환율',
    value: 1380,
    unit: '원',
    change: -1.2,
    trend: 'down',
    lastUpdated: '2026-01-08',
    source: 'ECOS',
    impact: 'positive',
    relevance: 75,
  },
  {
    id: 'sp500',
    name: 'S&P 500',
    value: 5850,
    unit: 'pt',
    change: 0.8,
    trend: 'up',
    lastUpdated: '2026-01-08',
    source: 'Yahoo Finance',
    impact: 'positive',
    relevance: 30,
  },
  {
    id: 'oil-price',
    name: '국제유가 (WTI)',
    value: 72.5,
    unit: 'USD',
    change: -2.1,
    trend: 'down',
    lastUpdated: '2026-01-08',
    source: 'Bloomberg',
    impact: 'positive',
    relevance: 45,
  },
];

const NATIONAL_INDICATORS: MacroIndicator[] = [
  {
    id: 'bok-rate',
    name: '한국 기준금리',
    value: 3.0,
    unit: '%',
    change: -0.25,
    trend: 'down',
    lastUpdated: '2026-01-08',
    source: '한국은행',
    impact: 'positive',
    relevance: 85,
  },
  {
    id: 'kospi',
    name: 'KOSPI',
    value: 2650,
    unit: 'pt',
    change: 0.5,
    trend: 'up',
    lastUpdated: '2026-01-08',
    source: 'KRX',
    impact: 'positive',
    relevance: 40,
  },
  {
    id: 'cpi',
    name: '소비자물가지수',
    value: 2.3,
    unit: '%',
    change: -0.2,
    trend: 'down',
    lastUpdated: '2026-01-08',
    source: '통계청',
    impact: 'positive',
    relevance: 70,
  },
  {
    id: 'unemployment',
    name: '실업률',
    value: 2.9,
    unit: '%',
    change: 0.1,
    trend: 'up',
    lastUpdated: '2026-01-08',
    source: '통계청',
    impact: 'negative',
    relevance: 55,
  },
];

const INDUSTRY_SECTORS: Sector[] = [
  {
    id: 'tech',
    name: '기술/IT',
    indicators: [
      { id: 'tech-1', name: 'IT 서비스 성장률', value: 8.5, unit: '%', change: 1.2, trend: 'up', lastUpdated: '2026-01', source: 'IDC', impact: 'positive', relevance: 95 },
      { id: 'tech-2', name: 'SaaS 시장 규모', value: 4.2, unit: '조원', change: 15, trend: 'up', lastUpdated: '2026-01', source: 'Gartner', impact: 'positive', relevance: 90 },
      { id: 'tech-3', name: 'AI 투자 증가율', value: 42, unit: '%', change: 8, trend: 'up', lastUpdated: '2026-01', source: 'CB Insights', impact: 'positive', relevance: 80 },
    ],
  },
  {
    id: 'service',
    name: '서비스업',
    indicators: [
      { id: 'srv-1', name: '서비스업 생산지수', value: 115.2, unit: 'pt', change: 0.8, trend: 'up', lastUpdated: '2026-01', source: '통계청', impact: 'positive', relevance: 60 },
      { id: 'srv-2', name: '소상공인 창업률', value: 5.2, unit: '%', change: -0.3, trend: 'down', lastUpdated: '2026-01', source: '중기부', impact: 'neutral', relevance: 50 },
    ],
  },
  {
    id: 'finance',
    name: '금융',
    indicators: [
      { id: 'fin-1', name: '가계부채 증가율', value: 3.1, unit: '%', change: -1.2, trend: 'down', lastUpdated: '2026-01', source: '한국은행', impact: 'positive', relevance: 40 },
      { id: 'fin-2', name: 'VC 투자금액', value: 6.8, unit: '조원', change: 12, trend: 'up', lastUpdated: '2026-01', source: 'KVCA', impact: 'positive', relevance: 75 },
    ],
  },
];

const NEWS_ITEMS: NewsItem[] = [
  {
    id: 'n1',
    title: 'Fed, 금리 동결 결정… 인플레 완화에 신중 접근',
    summary: '연준이 기준금리를 4.5%로 동결했다. 인플레이션 압력이 완화되고 있으나 추가 인하에는 신중한 입장.',
    source: 'Bloomberg',
    date: '2026-01-08',
    category: 'global',
    sentiment: 'neutral',
    impact: 6,
  },
  {
    id: 'n2',
    title: '한국은행, 기준금리 0.25%p 인하… 3.0% 시대',
    summary: '한은이 경기 부양을 위해 금리를 인하했다. 대출 이자 부담 감소 예상.',
    source: '한국경제',
    date: '2026-01-07',
    category: 'national',
    sentiment: 'positive',
    impact: 8,
  },
  {
    id: 'n3',
    title: 'AI 스타트업 투자 열풍 지속… 2025년 사상 최대',
    summary: 'AI 관련 스타트업 투자가 전년 대비 40% 증가. 국내 AI 기업들도 해외 투자 유치 활발.',
    source: 'TechCrunch',
    date: '2026-01-06',
    category: 'industry',
    sentiment: 'positive',
    impact: 7,
  },
  {
    id: 'n4',
    title: '중국 경제 둔화 우려… 글로벌 공급망 영향 주시',
    summary: '중국의 경기 둔화가 지속되면서 글로벌 공급망에 미치는 영향에 대한 우려가 커지고 있다.',
    source: 'Reuters',
    date: '2026-01-05',
    category: 'global',
    sentiment: 'negative',
    impact: 5,
  },
];

// ============================================
// Components
// ============================================

const IndicatorCard = ({ indicator }: { indicator: MacroIndicator }) => {
  const trendIcon = indicator.trend === 'up' ? '↑' : indicator.trend === 'down' ? '↓' : '→';
  const trendColor = 
    indicator.impact === 'positive' ? 'text-green-400' :
    indicator.impact === 'negative' ? 'text-red-400' : 'text-slate-400';
  
  return (
    <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700 hover:border-slate-500 transition-all">
      <div className="flex items-start justify-between mb-2">
        <span className="text-sm text-slate-400">{indicator.name}</span>
        <span className={`text-xs px-2 py-0.5 rounded ${
          indicator.relevance >= 70 ? 'bg-blue-500/20 text-blue-400' :
          indicator.relevance >= 40 ? 'bg-slate-600 text-slate-300' : 'bg-slate-700 text-slate-500'
        }`}>
          관련도 {indicator.relevance}%
        </span>
      </div>
      
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-2xl font-bold text-white">
          {indicator.value.toLocaleString()}
        </span>
        <span className="text-sm text-slate-400">{indicator.unit}</span>
        <span className={`text-sm ${trendColor} ml-auto`}>
          {trendIcon} {indicator.change >= 0 ? '+' : ''}{indicator.change}%
        </span>
      </div>
      
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{indicator.source}</span>
        <span>{indicator.lastUpdated}</span>
      </div>
    </div>
  );
};

const NewsCard = ({ news }: { news: NewsItem }) => {
  const categoryConfig = {
    global: { label: '국제', color: 'bg-blue-500' },
    national: { label: '국내', color: 'bg-green-500' },
    industry: { label: '산업', color: 'bg-purple-500' },
  };
  
  const sentimentConfig = {
    positive: { label: '긍정', color: 'text-green-400', icon: '📈' },
    negative: { label: '부정', color: 'text-red-400', icon: '📉' },
    neutral: { label: '중립', color: 'text-slate-400', icon: '➡️' },
  };
  
  return (
    <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700 hover:border-slate-500 transition-all">
      <div className="flex items-center gap-2 mb-2">
        <span className={`px-2 py-0.5 rounded text-xs text-white ${categoryConfig[news.category].color}`}>
          {categoryConfig[news.category].label}
        </span>
        <span className={`text-sm ${sentimentConfig[news.sentiment].color}`}>
          {sentimentConfig[news.sentiment].icon}
        </span>
        <span className="text-xs text-slate-500 ml-auto">{news.date}</span>
      </div>
      
      <h3 className="text-white font-medium mb-2">{news.title}</h3>
      <p className="text-sm text-slate-400 mb-3">{news.summary}</p>
      
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500">{news.source}</span>
        <div className="flex items-center gap-1">
          <span className="text-xs text-slate-400">영향도:</span>
          <div className="flex gap-0.5">
            {[...Array(10)].map((_, i) => (
              <div 
                key={i}
                className={`w-2 h-2 rounded-full ${
                  i < news.impact ? 'bg-yellow-400' : 'bg-slate-700'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const SectorPanel = ({ sector }: { sector: Sector }) => {
  return (
    <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700">
      <h3 className="text-white font-medium mb-4">{sector.name}</h3>
      
      <div className="space-y-3">
        {sector.indicators.map((indicator) => (
          <div key={indicator.id} className="flex items-center justify-between p-2 bg-slate-700/50 rounded-lg">
            <div>
              <div className="text-sm text-white">{indicator.name}</div>
              <div className="text-xs text-slate-400">{indicator.source}</div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-white">
                {indicator.value}{indicator.unit === '%' ? '%' : ` ${indicator.unit}`}
              </div>
              <div className={`text-xs ${indicator.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {indicator.change >= 0 ? '+' : ''}{indicator.change}%
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ImpactSummary = ({ indicators }: { indicators: MacroIndicator[] }) => {
  const positive = indicators.filter(i => i.impact === 'positive').length;
  const negative = indicators.filter(i => i.impact === 'negative').length;
  const neutral = indicators.filter(i => i.impact === 'neutral').length;
  
  const total = indicators.length;
  const score = ((positive * 1 + neutral * 0 + negative * -1) / total + 1) * 50;
  
  return (
    <div className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl p-6 border border-blue-500/30">
      <h2 className="text-lg font-bold text-white mb-4">🎯 내 사업 영향 분석</h2>
      
      <div className="flex items-center justify-center gap-8">
        <div className="relative w-32 h-32">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="64" cy="64" r="56"
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="12"
            />
            <circle
              cx="64" cy="64" r="56"
              fill="none"
              stroke={score >= 60 ? '#22c55e' : score >= 40 ? '#f59e0b' : '#ef4444'}
              strokeWidth="12"
              strokeDasharray={`${score * 3.52} 352`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center flex-col">
            <span className="text-3xl font-bold text-white">{Math.round(score)}</span>
            <span className="text-xs text-slate-400">점</span>
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-slate-400">긍정</span>
            <span className="text-white font-bold ml-auto">{positive}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-slate-500" />
            <span className="text-slate-400">중립</span>
            <span className="text-white font-bold ml-auto">{neutral}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-slate-400">부정</span>
            <span className="text-white font-bold ml-auto">{negative}</span>
          </div>
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-white/10 text-center">
        <span className={`text-sm ${score >= 60 ? 'text-green-400' : score >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
          {score >= 60 ? '🟢 전반적으로 유리한 환경' : 
           score >= 40 ? '🟡 주의가 필요한 환경' : '🔴 도전적인 환경'}
        </span>
      </div>
    </div>
  );
};

// ============================================
// Main Component
// ============================================

export default function MacroPage() {
  const [activeTab, setActiveTab] = useState<'global' | 'national' | 'industry'>('global');
  const [showNews, setShowNews] = useState(true);
  
  const allIndicators = [...GLOBAL_INDICATORS, ...NATIONAL_INDICATORS, 
    ...INDUSTRY_SECTORS.flatMap(s => s.indicators)];
  
  return (
    <div className="min-h-full bg-slate-900 text-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">🌍 거시흐름</h1>
          <p className="text-slate-400 mt-1">
            국제, 국내, 산업별 정세가 내 사업에 미치는 영향을 파악하세요
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNews(!showNews)}
            className={`px-4 py-2 rounded-lg text-sm ${
              showNews ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-400'
            }`}
          >
            📰 뉴스
          </button>
        </div>
      </div>
      
      {/* Impact Summary */}
      <div className="mb-6">
        <ImpactSummary indicators={allIndicators} />
      </div>
      
      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {(['global', 'national', 'industry'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-blue-500 text-white'
                : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
            }`}
          >
            {tab === 'global' ? '🌍 국제정세' : 
             tab === 'national' ? '🇰🇷 국내정세' : '🏭 산업별정세'}
          </button>
        ))}
      </div>
      
      {/* Main Grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Indicators */}
        <div className={showNews ? 'col-span-8' : 'col-span-12'}>
          {activeTab === 'global' && (
            <div className="grid grid-cols-2 gap-4">
              {GLOBAL_INDICATORS.map((indicator) => (
                <IndicatorCard key={indicator.id} indicator={indicator} />
              ))}
            </div>
          )}
          
          {activeTab === 'national' && (
            <div className="grid grid-cols-2 gap-4">
              {NATIONAL_INDICATORS.map((indicator) => (
                <IndicatorCard key={indicator.id} indicator={indicator} />
              ))}
            </div>
          )}
          
          {activeTab === 'industry' && (
            <div className="grid grid-cols-2 gap-4">
              {INDUSTRY_SECTORS.map((sector) => (
                <SectorPanel key={sector.id} sector={sector} />
              ))}
            </div>
          )}
        </div>
        
        {/* News Sidebar */}
        {showNews && (
          <div className="col-span-4 space-y-4">
            <h2 className="text-lg font-bold text-white">📰 관련 뉴스</h2>
            {NEWS_ITEMS
              .filter(n => activeTab === 'global' ? true : 
                          activeTab === 'national' ? n.category !== 'global' :
                          n.category === 'industry')
              .slice(0, 4)
              .map((news) => (
                <NewsCard key={news.id} news={news} />
              ))}
          </div>
        )}
      </div>
      
      {/* Data Sources */}
      <div className="mt-8 pt-6 border-t border-slate-700">
        <div className="text-xs text-slate-500 text-center">
          데이터 소스: FRED, 한국은행 ECOS, 통계청 KOSIS, World Bank, Bloomberg, Reuters
          <br />
          마지막 업데이트: 2026-01-08 09:00 KST
        </div>
      </div>
    </div>
  );
}
