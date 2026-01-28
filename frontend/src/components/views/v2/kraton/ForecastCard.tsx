/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🌤️ ForecastCard - 예보 카드 (Cycle 6)
 * 시간 기반 그라데이션 바 차트
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React from 'react';
import { CloudRain } from 'lucide-react';
import { COLORS, getTemperatureColor } from '../design-system';
import { GlassCard } from './GlassCard';

interface ForecastDay {
  day: string;
  temp: number;
  sigma: number;
}

interface ForecastCardProps {
  data: ForecastDay[];
}

export const ForecastCard: React.FC<ForecastCardProps> = ({ data }) => {
  const maxTemp = Math.max(...data.map(d => d.temp));
  
  return (
    <GlassCard className="p-5" hover={false}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <CloudRain size={18} color={COLORS.safe.primary} />
          주간 예보
        </h3>
        <span className="text-xs" style={{ color: COLORS.textDim }}>
          다음 7일
        </span>
      </div>
      
      <div className="flex justify-between items-end gap-2">
        {data.map((day, i) => {
          const height = (day.temp / maxTemp) * 80;
          const color = getTemperatureColor(day.temp);
          const isToday = i === 2;
          
          return (
            <div key={day.day} className="flex flex-col items-center gap-2">
              {/* Temperature */}
              <span 
                className="text-xs font-semibold"
                style={{ color: color.primary }}
              >
                {day.temp}°
              </span>
              
              {/* Bar */}
              <div 
                className="w-8 rounded-t-lg transition-all duration-500 relative overflow-hidden"
                style={{ 
                  height: height,
                  background: `linear-gradient(180deg, ${color.primary} 0%, ${color.bg} 100%)`,
                  boxShadow: isToday ? `0 0 15px ${color.glow}` : 'none',
                }}
              >
                {/* Shimmer Effect */}
                <div 
                  className="absolute inset-0"
                  style={{
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.3) 0%, transparent 50%)',
                  }}
                />
              </div>
              
              {/* Day Label */}
              <span 
                className={`text-xs ${isToday ? 'font-bold' : ''}`}
                style={{ color: isToday ? COLORS.text : COLORS.textMuted }}
              >
                {day.day}
              </span>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
};

export default ForecastCard;
