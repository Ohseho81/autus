// ═══════════════════════════════════════════════════════════════════════════════
// 🌊 조류 뷰 (Tide View)
// 트렌드 분석 - "흐름이 어디로?"
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { tideApi, type MarketTrend } from '@/api/views';

interface TideData {
  trend: MarketTrend;
  trendLabel: string;
  changePercent: number;
  data: Array<{ date: string; value: number }>;
  causes: Array<{ factor: string; impact: number; isPositive?: boolean }>;
}

interface InternalTide {
  trend: MarketTrend;
  trendLabel: string;
  changePercent: number;
  vsMarket: { status: string; message: string };
  data: Array<{ date: string; ourValue: number; marketValue: number }>;
  causes: Array<{ factor: string; impact: number; isPositive?: boolean }>;
}

const TREND_ICONS: Record<MarketTrend, { icon: string; color: string }> = {
  '밀물': { icon: '📈', color: 'text-green-500' },
  '썰물': { icon: '📉', color: 'text-red-500' },
  '정체': { icon: '➡️', color: 'text-gray-500' },
  '역류': { icon: '🔄', color: 'text-purple-500' },
  rising: { icon: '📈', color: 'text-green-500' },
  falling: { icon: '📉', color: 'text-red-500' },
};

export function TideView() {
  const [market, setMarket] = useState<TideData | null>(null);
  const [internal, setInternal] = useState<InternalTide | null>(null);
  const [competitors, setCompetitors] = useState<any[]>([]);
  const [period, setPeriod] = useState<'3m' | '6m' | '1y'>('6m');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [period]);

  async function loadData() {
    setLoading(true);
    try {
      const [marketData, internalData, compData] = await Promise.all([
        tideApi.getMarket(),
        tideApi.getInternal(),
        tideApi.getCompetitors(),
      ]);
      // Transform API response to component format
      const marketTrend = (marketData?.trend || '썰물') as MarketTrend;
      setMarket({
        trend: marketTrend,
        trendLabel: marketTrend,
        changePercent: marketData?.change || 0,
        data: [],
        causes: [{ factor: '시장 변화', impact: marketData?.change || 0, isPositive: (marketData?.change || 0) > 0 }],
      });
      
      const internalTrend = (internalData?.trend || '역류') as MarketTrend;
      setInternal({
        trend: internalTrend,
        trendLabel: internalTrend,
        changePercent: internalData?.change || 0,
        vsMarket: { status: (internalData?.change || 0) > (marketData?.change || 0) ? '우위' : '열세', message: '시장 대비' },
        data: [],
        causes: [{ factor: '내부 성과', impact: internalData?.change || 0, isPositive: (internalData?.change || 0) > 0 }],
      });
      
      const rawComps = Array.isArray(compData) ? compData : [];
      setCompetitors(rawComps);
    } catch (error) {
      console.error('Tide load error:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <span>🌊</span> 조류
        </h1>
        
        {/* 기간 선택 */}
        <div className="flex gap-2">
          {(['3m', '6m', '1y'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                period === p 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200'
              }`}
            >
              {p === '3m' ? '3개월' : p === '6m' ? '6개월' : '1년'}
            </button>
          ))}
        </div>
      </div>

      {/* 메인 트렌드 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 시장 트렌드 */}
        {market && (
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg"
          >
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              🌍 시장 트렌드
            </h2>
            
            <div className="flex items-center gap-4 mb-4">
              <span className="text-5xl">{TREND_ICONS[market.trend].icon}</span>
              <div>
                <div className={`text-3xl font-bold ${TREND_ICONS[market.trend].color}`}>
                  {market.changePercent > 0 ? '+' : ''}{market.changePercent.toFixed(1)}%
                </div>
                <div className="text-lg text-gray-600 dark:text-gray-400">
                  {market.trendLabel}
                </div>
              </div>
            </div>

            {/* 간단한 차트 (바 형태) */}
            <div className="flex items-end gap-1 h-20 mt-4">
              {market.data.slice(-12).map((d, i) => (
                <div 
                  key={i}
                  className={`flex-1 rounded-t transition-all ${
                    d.value > market.data[0].value ? 'bg-green-400' : 'bg-red-400'
                  }`}
                  style={{ height: `${(d.value / 120) * 100}%` }}
                />
              ))}
            </div>

            {/* 원인 */}
            <div className="mt-4 pt-4 border-t dark:border-gray-700">
              <div className="text-sm text-gray-500 mb-2">주요 원인</div>
              <div className="space-y-1">
                {market.causes.slice(0, 3).map((cause, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span>{cause.factor}</span>
                    <span className={cause.impact < 0 ? 'text-red-500' : 'text-green-500'}>
                      {cause.impact > 0 ? '+' : ''}{cause.impact.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* 내부 트렌드 */}
        {internal && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg"
          >
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              🏠 우리 트렌드
            </h2>
            
            <div className="flex items-center gap-4 mb-4">
              <span className="text-5xl">{TREND_ICONS[internal.trend].icon}</span>
              <div>
                <div className={`text-3xl font-bold ${TREND_ICONS[internal.trend].color}`}>
                  {internal.changePercent > 0 ? '+' : ''}{internal.changePercent.toFixed(1)}%
                </div>
                <div className="text-lg text-gray-600 dark:text-gray-400">
                  {internal.trendLabel}
                </div>
              </div>
            </div>

            {/* 시장 대비 */}
            {internal.vsMarket && (
              <div className={`p-3 rounded-lg mb-4 ${
                internal.vsMarket.status === 'outperforming' 
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                  : internal.vsMarket.status === 'underperforming'
                  ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                  : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}>
                <div className="text-sm font-medium">
                  {internal.vsMarket.status === 'outperforming' ? '🚀 시장 대비 우수' :
                   internal.vsMarket.status === 'underperforming' ? '⚠️ 시장 대비 부진' :
                   '➡️ 시장과 동일'}
                </div>
                <div className="text-xs mt-1 opacity-80">{internal.vsMarket.message}</div>
              </div>
            )}

            {/* 간단한 차트 */}
            <div className="flex items-end gap-1 h-20">
              {internal.data.slice(-12).map((d, i) => (
                <div 
                  key={i}
                  className={`flex-1 rounded-t transition-all ${
                    d.ourValue > internal.data[0].ourValue ? 'bg-blue-400' : 'bg-purple-400'
                  }`}
                  style={{ height: `${(d.ourValue / 120) * 100}%` }}
                />
              ))}
            </div>

            {/* 성공 요인 */}
            <div className="mt-4 pt-4 border-t dark:border-gray-700">
              <div className="text-sm text-gray-500 mb-2">성공 요인</div>
              <div className="space-y-1">
                {internal.causes.filter(c => c.isPositive).slice(0, 3).map((cause, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span>{cause.factor}</span>
                    <span className="text-green-500">+{cause.impact.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* 경쟁사 트렌드 */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg"
      >
        <h2 className="text-lg font-semibold mb-4">⚔️ 경쟁사 트렌드</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {competitors.map((comp, index) => (
            <motion.div
              key={comp.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 * index }}
              className={`p-4 rounded-lg ${
                comp.trend === 'rising' ? 'bg-green-50 dark:bg-green-900/20' :
                comp.trend === 'falling' ? 'bg-red-50 dark:bg-red-900/20' :
                'bg-gray-50 dark:bg-gray-700'
              }`}
            >
              <div className="font-medium">{comp.name}</div>
              <div className={`text-2xl font-bold mt-2 ${TREND_ICONS[comp.trend as MarketTrend].color}`}>
                {comp.changePercent > 0 ? '+' : ''}{comp.changePercent.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-500 mt-1">{comp.insight}</div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

export default TideView;
