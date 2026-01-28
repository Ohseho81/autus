// ═══════════════════════════════════════════════════════════════════════════════
// 🌤️ 날씨 뷰 (Weather View)
// 시간 예측 - "언제 비 오나?"
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { weatherApi, type WeatherType } from '@/api/views';

interface WeatherDay {
  date: string;
  dayOfWeek: string;
  weather: WeatherType;
  sigma: number;
  sigmaChange: number;
  events: Array<{ id: string; name: string; category: string; sigmaImpact: number }>;
  affectedCount: number;
}

interface WeekSummary {
  avgSigma: number;
  worstDay: string;
  eventCount: number;
}

const WEATHER_ICONS: Record<WeatherType, { icon: string; label: string; color: string }> = {
  sunny: { icon: '☀️', label: '맑음', color: 'text-yellow-500' },
  cloudy: { icon: '☁️', label: '흐림', color: 'text-gray-500' },
  partly_cloudy: { icon: '⛅', label: '구름 조금', color: 'text-blue-400' },
  rainy: { icon: '🌧️', label: '비', color: 'text-blue-600' },
  storm: { icon: '⛈️', label: '폭풍', color: 'text-purple-600' },
};

export function WeatherView() {
  const [forecast, setForecast] = useState<WeatherDay[]>([]);
  const [summary, setSummary] = useState<WeekSummary | null>(null);
  const [range, setRange] = useState<'7d' | '14d' | '30d'>('7d');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [range]);

  async function loadData() {
    setLoading(true);
    try {
      const data = await weatherApi.getForecast();
      // Transform API response to component format
      const rawDays = Array.isArray(data) ? data : [];
      const days = rawDays.map((d: any) => ({
        date: d.date,
        dayOfWeek: d.day,
        weather: (d.weather || 'sunny') as WeatherType,
        sigma: d.sigma,
        sigmaChange: 0,
        events: d.event ? [{ id: '1', name: d.event, category: 'academic', sigmaImpact: -0.1 }] : [],
        affectedCount: 0,
      }));
      setForecast(days);
      
      // Calculate summary
      const avgSigma = days.length > 0 ? days.reduce((s, d) => s + d.sigma, 0) / days.length : 0;
      const worstDay = days.length > 0 ? days.reduce((min, d) => d.sigma < min.sigma ? d : min, days[0]) : null;
      setSummary({
        avgSigma: Math.round(avgSigma * 100) / 100,
        worstDay: worstDay?.date || '',
        eventCount: days.filter(d => d.events.length > 0).length,
      });
    } catch (error) {
      console.error('Weather load error:', error);
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
          <span>🌤️</span> 날씨 예보
        </h1>
        
        {/* 기간 선택 */}
        <div className="flex gap-2">
          {(['7d', '14d', '30d'] as const).map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                range === r 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200'
              }`}
            >
              {r === '7d' ? '1주' : r === '14d' ? '2주' : '1개월'}
            </button>
          ))}
        </div>
      </div>

      {/* 요약 카드 */}
      {summary && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-4 text-white">
            <div className="text-sm opacity-80">평균 σ</div>
            <div className="text-3xl font-bold">{summary.avgSigma.toFixed(2)}</div>
          </div>
          <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-xl p-4 text-white">
            <div className="text-sm opacity-80">주의 필요일</div>
            <div className="text-3xl font-bold">
              {new Date(summary.worstDay).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}
            </div>
          </div>
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-4 text-white">
            <div className="text-sm opacity-80">이벤트</div>
            <div className="text-3xl font-bold">{summary.eventCount}건</div>
          </div>
        </motion.div>
      )}

      {/* 주간 예보 */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg"
      >
        <h2 className="text-lg font-semibold mb-4">📅 일별 예보</h2>
        
        <div className="grid grid-cols-7 gap-2">
          {forecast.slice(0, 7).map((day, index) => {
            const weatherInfo = WEATHER_ICONS[day.weather];
            const isToday = index === 0;
            
            return (
              <motion.div
                key={day.date}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`text-center p-4 rounded-xl transition-all hover:shadow-md cursor-pointer ${
                  isToday 
                    ? 'bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500' 
                    : 'bg-gray-50 dark:bg-gray-700/50'
                }`}
              >
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {isToday ? '오늘' : day.dayOfWeek}
                </div>
                <div className="text-sm font-medium mt-1">
                  {new Date(day.date).getDate()}일
                </div>
                <div className={`text-4xl my-3 ${weatherInfo.color}`}>
                  {weatherInfo.icon}
                </div>
                <div className="text-xs text-gray-500">{weatherInfo.label}</div>
                <div className={`mt-2 text-sm font-bold ${
                  day.sigma > 0.8 ? 'text-green-500' : 
                  day.sigma > 0.6 ? 'text-yellow-500' : 'text-red-500'
                }`}>
                  σ {day.sigma.toFixed(2)}
                </div>
                {day.sigmaChange !== 0 && (
                  <div className={`text-xs ${day.sigmaChange > 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {day.sigmaChange > 0 ? '↑' : '↓'} {Math.abs(day.sigmaChange).toFixed(2)}
                  </div>
                )}
                {day.events.length > 0 && (
                  <div className="mt-2">
                    <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs rounded-full">
                      {day.events.length} 이벤트
                    </span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* 이벤트 목록 */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg"
      >
        <h2 className="text-lg font-semibold mb-4">📌 예정 이벤트</h2>
        
        <div className="space-y-3">
          {forecast
            .flatMap(day => day.events.map(event => ({ ...event, date: day.date })))
            .slice(0, 5)
            .map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`p-4 rounded-lg border-l-4 ${
                  event.sigmaImpact < -0.1 ? 'border-red-500 bg-red-50 dark:bg-red-900/20' :
                  event.sigmaImpact > 0.05 ? 'border-green-500 bg-green-50 dark:bg-green-900/20' :
                  'border-gray-300 bg-gray-50 dark:bg-gray-700/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{event.name}</div>
                    <div className="text-sm text-gray-500 mt-1">
                      {new Date(event.date).toLocaleDateString('ko-KR', { 
                        month: 'long', 
                        day: 'numeric', 
                        weekday: 'short' 
                      })}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-bold ${
                      event.sigmaImpact < 0 ? 'text-red-500' : 'text-green-500'
                    }`}>
                      {event.sigmaImpact > 0 ? '+' : ''}{event.sigmaImpact.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500">σ 영향</div>
                  </div>
                </div>
              </motion.div>
            ))}
        </div>
      </motion.div>
    </div>
  );
}

export default WeatherView;
