// ═══════════════════════════════════════════════════════════════════════════════
// 🌐 네트워크 뷰 (Network View)
// 관계망 분석 - "누가 누구와?"
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { networkApi, type TemperatureZone, type CustomerBrief } from '@/api/views';

interface NetworkNode {
  id: string;
  name: string;
  temperature: number;
  temperatureZone: TemperatureZone;
  referralCount: number;
  isInfluencer: boolean;
  size: number;
}

interface Influencer {
  id: string;
  name: string;
  referralCount: number;
  temperature: number;
  temperatureZone: TemperatureZone;
  connectedCustomers: CustomerBrief[];
  riskLevel: string;
  cascadeRisk: number;
}

interface Cluster {
  id: string;
  name: string;
  memberCount: number;
  avgTemperature: number;
  healthStatus: string;
  keyMembers: CustomerBrief[];
}

const ZONE_COLORS: Record<TemperatureZone, string> = {
  critical: '#ef4444',
  warning: '#f59e0b',
  normal: '#9ca3af',
  good: '#3b82f6',
  excellent: '#8b5cf6',
};

export function NetworkView() {
  const [nodes, setNodes] = useState<NetworkNode[]>([]);
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [riskData, setRiskData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'graph' | 'influencers' | 'risk'>('graph');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [graphData, influencersData, clustersData, riskDataRes] = await Promise.all([
        networkApi.getGraph(),
        networkApi.getInfluencers(),
        networkApi.getClusters(),
        networkApi.getRisk(),
      ]);
      // Transform API response to component format
      const rawNodes = graphData?.nodes || [];
      setNodes(rawNodes.map((n: any) => ({
        id: n.id,
        name: n.name,
        temperature: n.temp || 50,
        temperatureZone: (n.zone || 'normal') as TemperatureZone,
        referralCount: 0,
        isInfluencer: false,
        size: 1,
      })));
      
      const rawInfluencers = Array.isArray(influencersData) ? influencersData : [];
      setInfluencers(rawInfluencers.map((inf: any) => ({
        id: inf.id || inf.name,
        name: inf.name,
        referralCount: inf.referrals || 0,
        temperature: inf.temp || 70,
        temperatureZone: (inf.temp > 60 ? 'good' : 'warning') as TemperatureZone,
        connectedCustomers: [],
        riskLevel: inf.temp > 60 ? 'low' : 'high',
        cascadeRisk: inf.temp > 60 ? 0.1 : 0.5,
      })));
      
      const rawClusters = Array.isArray(clustersData) ? clustersData : [];
      setClusters(rawClusters.map((c: any) => ({
        id: c.name,
        name: c.name,
        memberCount: c.count || 0,
        avgTemperature: c.avgTemp || 50,
        healthStatus: c.avgTemp > 60 ? 'healthy' : 'at_risk',
        keyMembers: [],
      })));
      
      setRiskData(riskDataRes);
    } catch (error) {
      console.error('Network load error:', error);
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

  // 통계 계산
  const totalInfluencers = influencers.length;
  const atRiskInfluencers = influencers.filter(i => i.riskLevel === 'critical' || i.riskLevel === 'high').length;

  return (
    <div className="space-y-6 p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <span>🌐</span> 네트워크
        </h1>
        
        <div className="flex gap-2 text-sm">
          <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
            노드 {nodes.length}
          </span>
          <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full">
            영향력자 {totalInfluencers}
          </span>
        </div>
      </div>

      {/* 탭 */}
      <div className="flex gap-2 border-b dark:border-gray-700">
        {[
          { id: 'graph', label: '🕸️ 그래프' },
          { id: 'influencers', label: '⭐ 영향력자' },
          { id: 'risk', label: '⚠️ 연쇄 위험' },
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

      {activeTab === 'graph' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 네트워크 시각화 */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="lg:col-span-2 bg-gray-50 dark:bg-gray-800 rounded-xl p-6 min-h-[400px] relative"
          >
            {/* 간단한 네트워크 시각화 */}
            <div className="absolute inset-0 flex items-center justify-center">
              {nodes.slice(0, 20).map((node, i) => {
                const angle = (i / 20) * Math.PI * 2;
                const radius = 35 + (node.isInfluencer ? 0 : 10);
                const x = 50 + Math.cos(angle) * radius;
                const y = 50 + Math.sin(angle) * radius;
                
                return (
                  <motion.div
                    key={node.id}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="absolute cursor-pointer group"
                    style={{
                      left: `${x}%`,
                      top: `${y}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                  >
                    <div 
                      className="rounded-full transition-transform hover:scale-150"
                      style={{
                        width: `${node.size}px`,
                        height: `${node.size}px`,
                        backgroundColor: ZONE_COLORS[node.temperatureZone],
                        boxShadow: node.isInfluencer ? `0 0 10px ${ZONE_COLORS[node.temperatureZone]}` : 'none',
                      }}
                    />
                    <div className="absolute left-1/2 transform -translate-x-1/2 -bottom-6 text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity bg-white dark:bg-gray-700 px-2 py-1 rounded shadow">
                      {node.name} ({node.referralCount}추천)
                    </div>
                  </motion.div>
                );
              })}
              
              {/* 중앙 */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-4xl">
                🏫
              </div>
            </div>
            
            {/* 범례 */}
            <div className="absolute bottom-4 left-4 flex gap-4 text-xs">
              {(['excellent', 'good', 'normal', 'warning', 'critical'] as TemperatureZone[]).map(zone => (
                <div key={zone} className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ZONE_COLORS[zone] }} />
                  <span className="capitalize">{zone}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* 클러스터 */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            <h3 className="font-semibold">📦 클러스터</h3>
            {clusters.map((cluster, index) => (
              <motion.div
                key={cluster.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`p-4 rounded-xl ${
                  cluster.healthStatus === 'healthy' ? 'bg-green-50 dark:bg-green-900/20' :
                  cluster.healthStatus === 'at_risk' ? 'bg-yellow-50 dark:bg-yellow-900/20' :
                  'bg-red-50 dark:bg-red-900/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-medium">{cluster.name}</div>
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    cluster.healthStatus === 'healthy' ? 'bg-green-200 text-green-800' :
                    cluster.healthStatus === 'at_risk' ? 'bg-yellow-200 text-yellow-800' :
                    'bg-red-200 text-red-800'
                  }`}>
                    {cluster.healthStatus === 'healthy' ? '건강' :
                     cluster.healthStatus === 'at_risk' ? '주의' : '위험'}
                  </span>
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  {cluster.memberCount}명 · 평균 {cluster.avgTemperature.toFixed(0)}°
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      )}

      {activeTab === 'influencers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {influencers.map((inf, index) => (
            <motion.div
              key={inf.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center gap-3">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: ZONE_COLORS[inf.temperatureZone] }}
                >
                  {inf.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="font-semibold">{inf.name}</div>
                  <div className="text-sm text-gray-500">
                    {inf.referralCount}명 추천 · {inf.temperature}°
                  </div>
                </div>
                <div className="text-2xl">⭐</div>
              </div>
              
              <div className="mt-4 pt-4 border-t dark:border-gray-700">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">연결 고객</span>
                  <span>{inf.connectedCustomers.length}명</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-500">연쇄 위험</span>
                  <span className={
                    inf.riskLevel === 'critical' ? 'text-red-500 font-bold' :
                    inf.riskLevel === 'high' ? 'text-orange-500' : 'text-gray-500'
                  }>
                    {inf.cascadeRisk}명
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {activeTab === 'risk' && riskData && (
        <div className="space-y-6">
          {/* 요약 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4">
              <div className="text-sm text-red-600 dark:text-red-400">위험 영향력자</div>
              <div className="text-3xl font-bold text-red-500">{riskData.atRiskInfluencers.length}명</div>
            </div>
            <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-4">
              <div className="text-sm text-orange-600 dark:text-orange-400">연쇄 이탈 위험</div>
              <div className="text-3xl font-bold text-orange-500">{riskData.summary.totalCascadeRisk}명</div>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4">
              <div className="text-sm text-purple-600 dark:text-purple-400">예상 손실</div>
              <div className="text-3xl font-bold text-purple-500">
                {(riskData.summary.estimatedTotalLoss / 1000000).toFixed(1)}M
              </div>
            </div>
          </div>

          {/* 위험 영향력자 목록 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow">
            <h3 className="font-semibold mb-4">🚨 위험 영향력자</h3>
            <div className="space-y-4">
              {riskData.atRiskInfluencers.map((item: any, index: number) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{item.influencer.name}</div>
                      <div className="text-sm text-gray-500">
                        온도 {item.temperature}° · 이탈확률 {(item.churnProbability * 100).toFixed(0)}%
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-red-500">+{item.totalCascadeRisk}</div>
                      <div className="text-xs text-gray-500">연쇄 위험</div>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {item.connectedAtRisk.slice(0, 5).map((customer: CustomerBrief, i: number) => (
                      <span key={i} className="px-2 py-0.5 bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200 text-xs rounded">
                        {customer.name}
                      </span>
                    ))}
                    {item.connectedAtRisk.length > 5 && (
                      <span className="text-xs text-gray-500">+{item.connectedAtRisk.length - 5}명</span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* 고립 노드 */}
          {riskData.isolatedNodes.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow">
              <h3 className="font-semibold mb-4">🏝️ 고립 고객 (관계 형성 필요)</h3>
              <div className="flex flex-wrap gap-2">
                {riskData.isolatedNodes.map((node: CustomerBrief, i: number) => (
                  <span key={i} className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-sm">
                    {node.name} ({node.temperature}°)
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default NetworkView;
