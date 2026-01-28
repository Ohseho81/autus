// ═══════════════════════════════════════════════════════════════════════════════
// 🗺️ 지도 뷰 (Map View)
// 공간 분석 - "어디서 싸우나?"
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { mapApi, type TemperatureZone } from '@/api/views';

interface MapCustomer {
  id: string;
  name: string;
  lat: number;
  lng: number;
  temperature: number;
  temperatureZone: TemperatureZone;
  distanceMeters: number;
}

interface MapCompetitor {
  id: string;
  name: string;
  distanceMeters: number;
  threatLevel: string;
  affectedCustomers: number;
}

interface MapZone {
  id: string;
  type: 'threat' | 'opportunity' | 'neutral';
  name: string;
  customerCount: number;
  avgTemperature: number;
}

interface MarketData {
  marketSize: number;
  ourCustomers: number;
  marketShare: number;
  marketShareTrend: number;
}

const ZONE_COLORS: Record<TemperatureZone, string> = {
  critical: 'bg-red-500',
  warning: 'bg-yellow-500',
  normal: 'bg-gray-400',
  good: 'bg-blue-500',
  excellent: 'bg-purple-500',
};

export function MapView() {
  const [customers, setCustomers] = useState<MapCustomer[]>([]);
  const [competitors, setCompetitors] = useState<MapCompetitor[]>([]);
  const [zones, setZones] = useState<MapZone[]>([]);
  const [market, setMarket] = useState<MarketData | null>(null);
  const [radius, setRadius] = useState(1500);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [radius]);

  async function loadData() {
    setLoading(true);
    try {
      const [customersData, competitorsData, zonesData, marketData] = await Promise.all([
        mapApi.getCustomers(),
        mapApi.getCompetitors(),
        mapApi.getZones(),
        mapApi.getMarket(),
      ]);
      // Transform API response to component format
      const rawCustomers = customersData.customers || [];
      setCustomers(rawCustomers.map((c: any) => ({
        id: c.id,
        name: c.name,
        lat: c.lat,
        lng: c.lng,
        temperature: c.temp || c.temperature || 50,
        temperatureZone: c.zone || 'normal',
        distanceMeters: 500,
      })));
      const rawCompetitors = competitorsData.competitors || [];
      setCompetitors(rawCompetitors.map((c: any) => ({
        id: c.id,
        name: c.name,
        distanceMeters: 1000,
        threatLevel: c.threat || 'medium',
        affectedCustomers: 5,
      })));
      setZones(zonesData.zones || []);
      setMarket(marketData.market || { marketSize: 10000, ourCustomers: 132, marketShare: 1.32, marketShareTrend: 0.1 });
    } catch (error) {
      console.error('Map load error:', error);
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

  // 고객 온도별 집계
  const tempGroups = customers.reduce((acc, c) => {
    acc[c.temperatureZone] = (acc[c.temperatureZone] || 0) + 1;
    return acc;
  }, {} as Record<TemperatureZone, number>);

  return (
    <div className="space-y-6 p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <span>🗺️</span> 지도
        </h1>
        
        {/* 반경 선택 */}
        <div className="flex gap-2">
          {[500, 1000, 1500, 3000].map(r => (
            <button
              key={r}
              onClick={() => setRadius(r)}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                radius === r 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200'
              }`}
            >
              {r >= 1000 ? `${r/1000}km` : `${r}m`}
            </button>
          ))}
        </div>
      </div>

      {/* 메인 그리드 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 지도 영역 (가상) */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="lg:col-span-2 bg-gradient-to-br from-blue-50 to-green-50 dark:from-gray-800 dark:to-gray-700 rounded-xl p-6 min-h-[400px] relative"
        >
          {/* 가상 지도 */}
          <div className="absolute inset-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center">
            <div className="text-center text-gray-500">
              <div className="text-6xl mb-4">🗺️</div>
              <p>지도 영역</p>
              <p className="text-sm">반경 {radius >= 1000 ? `${radius/1000}km` : `${radius}m`}</p>
            </div>
          </div>
          
          {/* 고객 마커 (상징적) */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white shadow-lg">
              📍
            </div>
            <div className="text-xs text-center mt-1 font-medium">우리 학원</div>
          </div>
          
          {/* 경쟁사 마커 */}
          {competitors.slice(0, 4).map((comp, i) => {
            const positions = [
              { top: '30%', left: '70%' },
              { top: '60%', left: '25%' },
              { top: '75%', left: '65%' },
              { top: '20%', left: '35%' },
            ];
            return (
              <div 
                key={comp.id}
                className="absolute"
                style={positions[i]}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white shadow ${
                  comp.threatLevel === 'high' ? 'bg-red-500' : comp.threatLevel === 'medium' ? 'bg-yellow-500' : 'bg-gray-400'
                }`}>
                  ⚔️
                </div>
                <div className="text-xs text-center mt-1">{comp.name}</div>
              </div>
            );
          })}
        </motion.div>

        {/* 사이드바 */}
        <div className="space-y-4">
          {/* 시장 점유율 */}
          {market && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow"
            >
              <h3 className="font-semibold mb-3">📊 시장 점유율</h3>
              <div className="text-3xl font-bold text-blue-500">{market.marketShare.toFixed(1)}%</div>
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <span>{market.ourCustomers}</span>
                <span>/</span>
                <span>{market.marketSize}명</span>
                <span className={market.marketShareTrend > 0 ? 'text-green-500' : 'text-red-500'}>
                  ({market.marketShareTrend > 0 ? '+' : ''}{market.marketShareTrend.toFixed(1)}%)
                </span>
              </div>
            </motion.div>
          )}

          {/* 고객 분포 */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow"
          >
            <h3 className="font-semibold mb-3">👥 고객 분포</h3>
            <div className="space-y-2">
              {(['excellent', 'good', 'normal', 'warning', 'critical'] as TemperatureZone[]).map(zone => (
                <div key={zone} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${ZONE_COLORS[zone]}`} />
                  <span className="text-sm flex-1 capitalize">{zone}</span>
                  <span className="font-medium">{tempGroups[zone] || 0}명</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* 경쟁사 */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow"
          >
            <h3 className="font-semibold mb-3">⚔️ 경쟁사 ({competitors.length})</h3>
            <div className="space-y-2">
              {competitors.slice(0, 5).map(comp => (
                <div key={comp.id} className="flex items-center justify-between text-sm">
                  <span>{comp.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">{comp.distanceMeters}m</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      comp.threatLevel === 'high' ? 'bg-red-100 text-red-700' :
                      comp.threatLevel === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      영향 {comp.affectedCustomers}명
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* 지역 분석 */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow"
          >
            <h3 className="font-semibold mb-3">🎯 지역 분석</h3>
            <div className="space-y-2">
              {zones.map(zone => (
                <div 
                  key={zone.id} 
                  className={`p-2 rounded-lg text-sm ${
                    zone.type === 'threat' ? 'bg-red-50 dark:bg-red-900/20' :
                    zone.type === 'opportunity' ? 'bg-green-50 dark:bg-green-900/20' :
                    'bg-gray-50 dark:bg-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{zone.name}</span>
                    <span className={
                      zone.type === 'threat' ? 'text-red-500' :
                      zone.type === 'opportunity' ? 'text-green-500' :
                      'text-gray-500'
                    }>
                      {zone.type === 'threat' ? '⚠️' : zone.type === 'opportunity' ? '✨' : '•'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {zone.customerCount}명 · 평균 {zone.avgTemperature.toFixed(0)}°
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default MapView;
