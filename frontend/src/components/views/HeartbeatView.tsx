// ═══════════════════════════════════════════════════════════════════════════════
// 💓 심전도 뷰 (Heartbeat View)
// 여론/Voice 리듬 감지 - "심장이 정상인가?"
// ═══════════════════════════════════════════════════════════════════════════════

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { heartbeatApi, type HeartbeatRhythm } from '@/api/views';

interface HeartbeatData {
  rhythm: HeartbeatRhythm;
  rhythmLabel: string;
  timeline: Array<{ timestamp: string; intensity: number }>;
  keywords: Array<{ keyword: string; count: number; trend: string; sentiment: number }>;
}

interface Resonance {
  id: string;
  externalKeyword: string;
  internalKeyword: string;
  correlation: number;
  severity: string;
  suggestedAction?: string;
}

const RHYTHM_STYLES: Record<HeartbeatRhythm, { color: string; bg: string; label: string }> = {
  normal: { color: 'text-green-500', bg: 'bg-green-500', label: '정상' },
  elevated: { color: 'text-yellow-500', bg: 'bg-yellow-500', label: '상승' },
  warning: { color: 'text-orange-500', bg: 'bg-orange-500', label: '주의' },
  spike: { color: 'text-orange-500', bg: 'bg-orange-500', label: '급등' },
  critical: { color: 'text-red-500', bg: 'bg-red-500', label: '위기' },
};

export function HeartbeatView() {
  const [external, setExternal] = useState<HeartbeatData | null>(null);
  const [voice, setVoice] = useState<any>(null);
  const [resonances, setResonances] = useState<Resonance[]>([]);
  const [hasResonance, setHasResonance] = useState(false);
  const [resonanceAlert, setResonanceAlert] = useState<string | null>(null);
  const [period, setPeriod] = useState<'1d' | '7d' | '30d'>('7d');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [period]);

  async function loadData() {
    setLoading(true);
    try {
      const [externalData, voiceData, resonanceData] = await Promise.all([
        heartbeatApi.getExternal(),
        heartbeatApi.getVoice(),
        heartbeatApi.getResonance(),
      ]);
      // Transform API response to component format
      const externalKeywords = Array.isArray(externalData) ? externalData : [];
      setExternal({
        rhythm: externalKeywords.some((k: any) => k.trend === 'rising') ? 'elevated' : 'normal',
        rhythmLabel: externalKeywords.some((k: any) => k.trend === 'rising') ? '상승' : '정상',
        timeline: [],
        keywords: externalKeywords.map((k: any) => ({ keyword: k.word, count: k.count, trend: k.trend, sentiment: 0 })),
      });
      setVoice(voiceData);
      setResonances(resonanceData.resonances || []);
      setHasResonance(resonanceData.hasResonance || false);
      setResonanceAlert(resonanceData.resonanceAlert || null);
    } catch (error) {
      console.error('Heartbeat load error:', error);
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
          <motion.span
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            💓
          </motion.span>
          심전도
        </h1>
        
        {/* 기간 선택 */}
        <div className="flex gap-2">
          {(['1d', '7d', '30d'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                period === p 
                  ? 'bg-red-500 text-white' 
                  : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200'
              }`}
            >
              {p === '1d' ? '24시간' : p === '7d' ? '7일' : '30일'}
            </button>
          ))}
        </div>
      </div>

      {/* 공명 알림 */}
      {hasResonance && resonanceAlert && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-4"
        >
          <div className="flex items-center gap-3">
            <motion.span
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 0.5, repeat: Infinity }}
              className="text-2xl"
            >
              🔴
            </motion.span>
            <div>
              <div className="font-bold text-red-700 dark:text-red-300">공명 감지!</div>
              <div className="text-sm text-red-600 dark:text-red-400">{resonanceAlert}</div>
            </div>
          </div>
        </motion.div>
      )}

      {/* 심전도 그래프 영역 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 외부 여론 */}
        {external && (
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">🌍 외부 여론</h2>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${RHYTHM_STYLES[external.rhythm].bg} text-white`}>
                {external.rhythmLabel}
              </span>
            </div>

            {/* 심전도 라인 */}
            <div className="h-32 flex items-center overflow-hidden bg-gray-900 rounded-lg p-4">
              <svg viewBox="0 0 400 100" className="w-full h-full">
                <polyline
                  fill="none"
                  stroke={external.rhythm === 'critical' ? '#ef4444' : 
                          external.rhythm === 'spike' ? '#f97316' :
                          external.rhythm === 'elevated' ? '#eab308' : '#22c55e'}
                  strokeWidth="2"
                  points={external.timeline.slice(-50).map((t, i) => 
                    `${i * 8},${100 - t.intensity}`
                  ).join(' ')}
                />
              </svg>
            </div>

            {/* 키워드 */}
            <div className="mt-4">
              <div className="text-sm text-gray-500 mb-2">급상승 키워드</div>
              <div className="flex flex-wrap gap-2">
                {external.keywords.slice(0, 5).map((kw, i) => (
                  <span 
                    key={i}
                    className={`px-3 py-1 rounded-full text-sm ${
                      kw.sentiment < -0.3 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                      kw.sentiment > 0.3 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                      'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {kw.keyword} ({kw.count})
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* 내부 Voice */}
        {voice && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">🏠 내부 Voice</h2>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${RHYTHM_STYLES[voice.rhythm as HeartbeatRhythm].bg} text-white`}>
                {voice.rhythmLabel}
              </span>
            </div>

            {/* 심전도 라인 */}
            <div className="h-32 flex items-center overflow-hidden bg-gray-900 rounded-lg p-4">
              <svg viewBox="0 0 400 100" className="w-full h-full">
                <polyline
                  fill="none"
                  stroke={voice.rhythm === 'critical' ? '#ef4444' : 
                          voice.rhythm === 'spike' ? '#f97316' :
                          voice.rhythm === 'elevated' ? '#eab308' : '#22c55e'}
                  strokeWidth="2"
                  points={voice.timeline.slice(-50).map((t: any, i: number) => 
                    `${i * 8},${100 - t.intensity}`
                  ).join(' ')}
                />
              </svg>
            </div>

            {/* Voice 단계별 */}
            <div className="mt-4">
              <div className="text-sm text-gray-500 mb-2">Voice 단계</div>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { key: 'request', icon: '🙏', label: '요청', color: 'bg-blue-100 text-blue-700' },
                  { key: 'wish', icon: '💭', label: '바람', color: 'bg-purple-100 text-purple-700' },
                  { key: 'complaint', icon: '😟', label: '불만', color: 'bg-yellow-100 text-yellow-700' },
                  { key: 'churn_signal', icon: '🚨', label: '이탈', color: 'bg-red-100 text-red-700' },
                ].map(stage => (
                  <div key={stage.key} className={`p-2 rounded-lg text-center ${stage.color}`}>
                    <div className="text-lg">{stage.icon}</div>
                    <div className="text-xs font-medium">{stage.label}</div>
                    <div className="text-lg font-bold">{voice.byStage[stage.key]}</div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* 공명 분석 */}
      {resonances.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg"
        >
          <h2 className="text-lg font-semibold mb-4">🔗 외부-내부 공명</h2>
          
          <div className="space-y-3">
            {resonances.map((res, index) => (
              <motion.div
                key={res.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`p-4 rounded-lg border-l-4 ${
                  res.severity === 'critical' ? 'border-red-500 bg-red-50 dark:bg-red-900/20' :
                  res.severity === 'warning' ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20' :
                  'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="px-3 py-1 bg-gray-200 dark:bg-gray-600 rounded">
                      {res.externalKeyword}
                    </span>
                    <span className="text-gray-400">↔️</span>
                    <span className="px-3 py-1 bg-gray-200 dark:bg-gray-600 rounded">
                      {res.internalKeyword}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">{(res.correlation * 100).toFixed(0)}%</div>
                    <div className="text-xs text-gray-500">상관도</div>
                  </div>
                </div>
                {res.suggestedAction && (
                  <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    💡 {res.suggestedAction}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default HeartbeatView;
