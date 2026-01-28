/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🌤️ KratonForecast - 예보 뷰
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { COLORS, MOCK_DATA } from '../../design-system';
import { GlassCard, ForecastCard, ECGLine } from '../index';

interface KratonForecastProps {
  onNavigate?: (view: string, params?: any) => void;
}

export const KratonForecast: React.FC<KratonForecastProps> = ({ onNavigate }) => {
  const data = MOCK_DATA;
  
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button 
          onClick={() => onNavigate?.('cockpit')}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
        >
          <ChevronLeft size={20} color={COLORS.text} />
        </button>
        <h1 className="text-xl font-bold text-white">예보</h1>
      </div>
      
      {/* Charts Grid */}
      <div className="grid grid-cols-2 gap-6">
        <ForecastCard data={data.forecast} />
        
        <GlassCard className="p-5" hover={false}>
          <h3 className="text-white font-semibold mb-4">σ 추이</h3>
          <div className="h-48">
            <ECGLine 
              data={data.forecast.map(d => d.sigma * 100)} 
              color={COLORS.success.primary}
              height={180}
              animated={false}
            />
          </div>
        </GlassCard>
      </div>
      
      {/* Weekly Events */}
      <GlassCard className="p-5" hover={false}>
        <h3 className="text-white font-semibold mb-4">이번 주 주요 이벤트</h3>
        <div className="grid grid-cols-3 gap-4">
          {[
            { day: '수', event: '중간고사 시작', type: 'warning' },
            { day: '목', event: '학부모 상담 주간', type: 'info' },
            { day: '금', event: '성적표 발송', type: 'success' },
          ].map((item, i) => (
            <GlassCard key={i} className="p-4">
              <p className="text-sm" style={{ color: COLORS.textMuted }}>{item.day}요일</p>
              <p className="text-white font-medium mt-1">{item.event}</p>
            </GlassCard>
          ))}
        </div>
      </GlassCard>
      
      {/* AI Prediction */}
      <GlassCard className="p-5" hover={false}>
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          🤖 AI 예측
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div 
            className="p-4 rounded-lg"
            style={{ background: COLORS.caution.bg, border: `1px solid ${COLORS.caution.primary}30` }}
          >
            <p className="text-sm" style={{ color: COLORS.caution.primary }}>주의 예상</p>
            <p className="text-white font-medium mt-1">
              중간고사 후 이탈 위험 학생 3명 예상
            </p>
          </div>
          <div 
            className="p-4 rounded-lg"
            style={{ background: COLORS.success.bg, border: `1px solid ${COLORS.success.primary}30` }}
          >
            <p className="text-sm" style={{ color: COLORS.success.primary }}>긍정 신호</p>
            <p className="text-white font-medium mt-1">
              전체 σ 지수 상승 추세 유지 중
            </p>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};

export default KratonForecast;
