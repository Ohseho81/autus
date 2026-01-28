// ═══════════════════════════════════════════════════════════════════════════════
// 🔬 현미경 뷰 (Microscope View)
// 개별 고객 딥다이브 - "자세히 보면?"
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { microscopeApi, type TemperatureZone } from '@/api/views';

interface CustomerData {
  customer: {
    id: string;
    name: string;
    photo?: string;
    grade?: string;
    class?: string;
    tenure: number;
    stage: string;
    executor?: { id: string; name: string };
    payer?: { id: string; name: string; phone?: string };
  };
  temperature: {
    current: number;
    zone: TemperatureZone;
    trend: string;
    trendValue: number;
  };
  churnPrediction: {
    probability: number;
    predictedDate: string;
    confidence: number;
  };
}

const ZONE_COLORS: Record<TemperatureZone, { bg: string; text: string; ring: string }> = {
  critical: { bg: 'bg-red-500', text: 'text-red-500', ring: 'ring-red-500' },
  warning: { bg: 'bg-yellow-500', text: 'text-yellow-500', ring: 'ring-yellow-500' },
  normal: { bg: 'bg-gray-400', text: 'text-gray-500', ring: 'ring-gray-400' },
  good: { bg: 'bg-blue-500', text: 'text-blue-500', ring: 'ring-blue-500' },
  excellent: { bg: 'bg-purple-500', text: 'text-purple-500', ring: 'ring-purple-500' },
};

export function MicroscopeView() {
  const [customerId, setCustomerId] = useState<string>('demo-customer-1');
  const [data, setData] = useState<CustomerData | null>(null);
  const [tsel, setTsel] = useState<any>(null);
  const [recommendation, setRecommendation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'tsel' | 'action'>('overview');

  useEffect(() => {
    loadData();
  }, [customerId]);

  async function loadData() {
    setLoading(true);
    try {
      const [customerData, tselData, recommendData] = await Promise.all([
        microscopeApi.getCustomer(customerId),
        microscopeApi.getTSEL(customerId),
        microscopeApi.getRecommend(customerId),
      ]);
      // Transform API response to component format
      const raw = customerData as any;
      setData({
        customer: {
          id: raw.id,
          name: raw.name,
          grade: raw.grade,
          class: raw.class,
          tenure: raw.tenure,
          stage: 'active',
          executor: raw.executor,
          payer: raw.payer,
        },
        temperature: {
          current: raw.temperature?.current || 50,
          zone: (raw.temperature?.zone || 'normal') as TemperatureZone,
          trend: raw.temperature?.trend || 'stable',
          trendValue: raw.temperature?.trendValue || 0,
        },
        churnPrediction: {
          probability: raw.churnPrediction?.probability || 0,
          predictedDate: raw.churnPrediction?.predictedDate || '',
          confidence: 0.8,
        },
      });
      setTsel(tselData);
      setRecommendation(recommendData);
    } catch (error) {
      console.error('Microscope load error:', error);
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

  if (!data) return null;

  const { customer, temperature, churnPrediction } = data;
  const zoneStyle = ZONE_COLORS[temperature.zone];

  return (
    <div className="space-y-6 p-6">
      {/* 헤더 - 고객 프로필 */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg"
      >
        <div className="flex items-center gap-6">
          {/* 프로필 사진 */}
          <div className={`w-20 h-20 rounded-full ${zoneStyle.bg} flex items-center justify-center text-white text-3xl font-bold ring-4 ${zoneStyle.ring}`}>
            {customer.name.charAt(0)}
          </div>
          
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{customer.name}</h1>
            <div className="flex items-center gap-4 mt-1 text-gray-500">
              {customer.grade && <span>{customer.grade}</span>}
              {customer.class && <span>{customer.class}</span>}
              <span>재원 {customer.tenure}개월</span>
              <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-sm">
                {customer.stage}
              </span>
            </div>
            {customer.executor && (
              <div className="text-sm text-gray-500 mt-2">
                담임: {customer.executor.name}
              </div>
            )}
          </div>

          {/* 온도 게이지 */}
          <div className="text-center">
            <div className={`text-5xl font-bold ${zoneStyle.text}`}>
              {temperature.current}°
            </div>
            <div className="flex items-center justify-center gap-1 mt-1">
              <span className={temperature.trend === 'improving' ? 'text-green-500' : temperature.trend === 'declining' ? 'text-red-500' : 'text-gray-500'}>
                {temperature.trend === 'improving' ? '↑' : temperature.trend === 'declining' ? '↓' : '→'}
                {temperature.trendValue > 0 ? '+' : ''}{temperature.trendValue.toFixed(1)}
              </span>
            </div>
          </div>

          {/* 이탈 예측 */}
          <div className={`text-center p-4 rounded-xl ${
            churnPrediction.probability > 0.4 ? 'bg-red-50 dark:bg-red-900/20' :
            churnPrediction.probability > 0.2 ? 'bg-yellow-50 dark:bg-yellow-900/20' :
            'bg-green-50 dark:bg-green-900/20'
          }`}>
            <div className="text-sm text-gray-500">이탈 확률</div>
            <div className={`text-3xl font-bold ${
              churnPrediction.probability > 0.4 ? 'text-red-500' :
              churnPrediction.probability > 0.2 ? 'text-yellow-500' :
              'text-green-500'
            }`}>
              {(churnPrediction.probability * 100).toFixed(0)}%
            </div>
          </div>
        </div>
      </motion.div>

      {/* 탭 */}
      <div className="flex gap-2 border-b dark:border-gray-700">
        {[
          { id: 'overview', label: '📊 개요' },
          { id: 'tsel', label: '💎 TSEL' },
          { id: 'action', label: '⚡ 추천 액션' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-blue-500 border-b-2 border-blue-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 탭 컨텐츠 */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 결제자 정보 */}
          {customer.payer && (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow"
            >
              <h3 className="font-semibold mb-3">👨‍👩‍👧 결제자 (학부모)</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">이름</span>
                  <span>{customer.payer.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">연락처</span>
                  <span>{customer.payer.phone}</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* 예측 시나리오 */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow"
          >
            <h3 className="font-semibold mb-3">🔮 예측 시나리오</h3>
            <div className="space-y-2">
              {[
                { scenario: '조치 없음', temp: 35, churn: churnPrediction.probability, color: 'bg-red-100 text-red-700' },
                { scenario: '일반 케어', temp: 55, churn: churnPrediction.probability * 0.7, color: 'bg-yellow-100 text-yellow-700' },
                { scenario: '집중 케어', temp: 75, churn: churnPrediction.probability * 0.4, color: 'bg-green-100 text-green-700' },
              ].map((s, i) => (
                <div key={i} className={`p-2 rounded ${s.color}`}>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{s.scenario}</span>
                    <div className="text-right">
                      <span className="font-bold">{s.temp}°</span>
                      <span className="text-xs ml-2">이탈 {(s.churn * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      )}

      {activeTab === 'tsel' && tsel && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          {['trust', 'satisfaction', 'engagement', 'loyalty'].map((key, index) => {
            const score = tsel.tsel[key as keyof typeof tsel.tsel];
            const labels = {
              trust: { icon: '🤝', name: 'Trust', nameKo: '신뢰' },
              satisfaction: { icon: '😊', name: 'Satisfaction', nameKo: '만족' },
              engagement: { icon: '🎯', name: 'Engagement', nameKo: '참여' },
              loyalty: { icon: '💎', name: 'Loyalty', nameKo: '충성' },
            };
            const label = labels[key as keyof typeof labels];
            const zoneColor = ZONE_COLORS[score.zone as TemperatureZone];
            
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`bg-white dark:bg-gray-800 rounded-xl p-4 shadow ring-2 ${zoneColor.ring}`}
              >
                <div className="text-center">
                  <div className="text-3xl mb-2">{label.icon}</div>
                  <div className="font-medium">{label.nameKo}</div>
                  <div className={`text-4xl font-bold mt-2 ${zoneColor.text}`}>
                    {score.score.toFixed(0)}
                  </div>
                </div>
                <div className="mt-4 space-y-1">
                  {score.factors.map((f: any, i: number) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span className="text-gray-500">{f.name}</span>
                      <span className={
                        f.status === 'good' ? 'text-green-500' :
                        f.status === 'bad' ? 'text-red-500' : 'text-gray-500'
                      }>
                        {f.score.toFixed(0)}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}
          
          {/* R-Index */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="col-span-2 md:col-span-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl p-6 text-white"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm opacity-80">종합 관계지수 (R-Index)</div>
                <div className="text-4xl font-bold mt-1">{tsel.rIndex.toFixed(1)}</div>
              </div>
              <div className="text-6xl opacity-50">💎</div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {activeTab === 'action' && recommendation && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-6"
        >
          {/* AI 추천 */}
          <div className="bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl p-6 text-white">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">🤖</span>
              <div>
                <div className="text-sm opacity-80">AI 추천 전략</div>
                <div className="text-xl font-bold">{recommendation.recommendation.strategyName}</div>
              </div>
            </div>
            <p className="opacity-90">{recommendation.recommendation.reasoning}</p>
            
            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-white/20">
              <div>
                <div className="text-sm opacity-70">예상 온도 상승</div>
                <div className="text-2xl font-bold">+{recommendation.recommendation.expectedEffect.temperatureChange}°</div>
              </div>
              <div>
                <div className="text-sm opacity-70">이탈 감소</div>
                <div className="text-2xl font-bold">-{(recommendation.recommendation.expectedEffect.churnReduction * 100).toFixed(0)}%</div>
              </div>
            </div>
          </div>

          {/* 팁 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow">
            <h3 className="font-semibold mb-3">💡 상담 팁</h3>
            <ul className="space-y-2">
              {recommendation.recommendation.tips.map((tip: string, i: number) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-blue-500">•</span>
                  <span className="text-sm">{tip}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 액션 버튼 */}
          <div className="flex gap-3">
            {recommendation.actions.map((action: any, i: number) => (
              <button
                key={i}
                className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                  action.suggested
                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                    : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {action.label}
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default MicroscopeView;
