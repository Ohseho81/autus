// ═══════════════════════════════════════════════════════════════════════════════
// 📊 퍼널 뷰 (Funnel View)
// 전환 분석 - "어디서 빠지나?"
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { funnelApi } from '@/api/views';

interface FunnelStage {
  id: string;
  name: string;
  count: number;
  percentage: number;
  conversionRate?: number;
  dropoffRate?: number;
}

interface Conversion {
  from: string;
  to: string;
  rate: number;
  benchmark: number;
  status: string;
  gap: number;
}

export function FunnelView() {
  const [stages, setStages] = useState<FunnelStage[]>([]);
  const [summary, setSummary] = useState<{ totalConversion: number; bottleneck: string; bottleneckDropoff: number } | null>(null);
  const [conversions, setConversions] = useState<Conversion[]>([]);
  const [benchmark, setBenchmark] = useState<any>(null);
  const [funnelType, setFunnelType] = useState<'acquisition' | 'retention'>('acquisition');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [funnelType]);

  async function loadData() {
    setLoading(true);
    try {
      const [stagesData, conversionData, benchmarkData] = await Promise.all([
        funnelApi.getStages(),
        funnelApi.getConversion(),
        funnelApi.getBenchmark(),
      ]);
      // Transform API response to component format
      const rawStages = stagesData?.stages || [];
      const processedStages = rawStages.map((s: any, i: number, arr: any[]) => ({
        id: `stage-${i}`,
        name: s.name,
        count: s.count,
        percentage: s.rate,
        conversionRate: i > 0 ? Math.round((s.count / arr[i-1].count) * 100) : 100,
        dropoffRate: i > 0 ? Math.round(100 - (s.count / arr[i-1].count) * 100) : 0,
      }));
      setStages(processedStages);
      
      // Find bottleneck (highest dropoff)
      const bottleneckStage = processedStages.reduce((max: any, s: any) => 
        (s.dropoffRate || 0) > (max?.dropoffRate || 0) ? s : max, processedStages[0]);
      
      setSummary({
        totalConversion: processedStages.length > 0 ? processedStages[processedStages.length - 1].percentage : 0,
        bottleneck: bottleneckStage?.name || '',
        bottleneckDropoff: bottleneckStage?.dropoffRate || 0,
      });
      
      // Generate conversions
      const conversionsArr = processedStages.slice(1).map((s: any, i: number) => ({
        from: processedStages[i].name,
        to: s.name,
        rate: s.conversionRate || 0,
        benchmark: 50,
        status: (s.conversionRate || 0) >= 50 ? 'good' : 'warning',
        gap: (s.conversionRate || 0) - 50,
      }));
      setConversions(conversionsArr);
      setBenchmark(benchmarkData);
    } catch (error) {
      console.error('Funnel load error:', error);
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
          <span>📊</span> 퍼널
        </h1>
        
        {/* 타입 선택 */}
        <div className="flex gap-2">
          {[
            { id: 'acquisition', label: '획득' },
            { id: 'retention', label: '유지' },
          ].map(type => (
            <button
              key={type.id}
              onClick={() => setFunnelType(type.id as any)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                funnelType === type.id 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200'
              }`}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* 요약 카드 */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-4 text-white"
          >
            <div className="text-sm opacity-80">전체 전환율</div>
            <div className="text-4xl font-bold">{summary.totalConversion}%</div>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-r from-red-500 to-red-600 rounded-xl p-4 text-white"
          >
            <div className="text-sm opacity-80">병목 단계</div>
            <div className="text-2xl font-bold">{summary.bottleneck}</div>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-4 text-white"
          >
            <div className="text-sm opacity-80">병목 이탈률</div>
            <div className="text-4xl font-bold">{summary.bottleneckDropoff}%</div>
          </motion.div>
        </div>
      )}

      {/* 퍼널 시각화 */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg"
      >
        <div className="flex flex-col items-center space-y-2">
          {stages.map((stage, index) => {
            const widthPercent = Math.max(30, stage.percentage);
            const isBottleneck = summary?.bottleneck === stage.name;
            
            return (
              <motion.div
                key={stage.id}
                initial={{ opacity: 0, scaleX: 0 }}
                animate={{ opacity: 1, scaleX: 1 }}
                transition={{ delay: index * 0.1 }}
                className="w-full"
              >
                <div className="flex items-center gap-4">
                  {/* 단계명 */}
                  <div className="w-24 text-right text-sm font-medium">
                    {stage.name}
                  </div>
                  
                  {/* 바 */}
                  <div className="flex-1 relative">
                    <div 
                      className={`h-12 rounded-lg flex items-center justify-center text-white font-bold transition-all ${
                        isBottleneck ? 'bg-red-500 ring-4 ring-red-300' : 'bg-blue-500'
                      }`}
                      style={{ width: `${widthPercent}%` }}
                    >
                      {stage.count}명
                    </div>
                  </div>
                  
                  {/* 퍼센트 */}
                  <div className="w-16 text-sm text-gray-500">
                    {stage.percentage}%
                  </div>
                  
                  {/* 이탈률 */}
                  {stage.dropoffRate !== undefined && stage.dropoffRate > 0 && (
                    <div className={`w-20 text-sm ${
                      stage.dropoffRate > 30 ? 'text-red-500 font-bold' :
                      stage.dropoffRate > 20 ? 'text-orange-500' : 'text-gray-500'
                    }`}>
                      ↓{stage.dropoffRate}%
                    </div>
                  )}
                </div>
                
                {/* 화살표 */}
                {index < stages.length - 1 && (
                  <div className="flex justify-center my-1">
                    <div className="text-gray-300 text-2xl">▼</div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* 전환율 상세 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 단계별 전환율 */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg"
        >
          <h3 className="font-semibold mb-4">📈 단계별 전환율</h3>
          <div className="space-y-3">
            {conversions.map((conv, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-sm">
                    <span>{conv.from}</span>
                    <span className="text-gray-400">→</span>
                    <span>{conv.to}</span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full mt-1 overflow-hidden">
                    <div 
                      className={`h-full transition-all ${
                        conv.status === 'above' ? 'bg-green-500' :
                        conv.status === 'below' ? 'bg-red-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${conv.rate}%` }}
                    />
                  </div>
                </div>
                <div className="text-right w-20">
                  <div className="font-bold">{conv.rate}%</div>
                  <div className={`text-xs ${
                    conv.gap > 0 ? 'text-green-500' : conv.gap < 0 ? 'text-red-500' : 'text-gray-500'
                  }`}>
                    {conv.gap > 0 ? '+' : ''}{conv.gap}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* 벤치마크 비교 */}
        {benchmark && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg"
          >
            <h3 className="font-semibold mb-4">🎯 업계 벤치마크</h3>
            <div className="space-y-4">
              {benchmark.comparisons.map((comp: any, index: number) => (
                <div key={index}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm">{comp.metric}</span>
                    <span className="text-xs text-gray-500">
                      상위 {comp.percentile}%
                    </span>
                  </div>
                  <div className="relative h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    {/* 업계 평균 마커 */}
                    <div 
                      className="absolute top-0 bottom-0 w-0.5 bg-yellow-500"
                      style={{ left: `${comp.industryAvg}%` }}
                    />
                    {/* Top 마커 */}
                    <div 
                      className="absolute top-0 bottom-0 w-0.5 bg-green-500"
                      style={{ left: `${comp.topPerformer}%` }}
                    />
                    {/* 우리 값 */}
                    <div 
                      className={`h-full transition-all ${
                        comp.ourValue >= comp.industryAvg ? 'bg-blue-500' : 'bg-orange-500'
                      }`}
                      style={{ width: `${comp.ourValue}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs mt-1 text-gray-500">
                    <span>우리: {comp.ourValue.toFixed(1)}%</span>
                    <span>평균: {comp.industryAvg}%</span>
                    <span>Top: {comp.topPerformer}%</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default FunnelView;
