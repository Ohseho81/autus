/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🗺️ MiniHeatmap - 지역 히트맵 (Cycle 10)
 * 지역별 분포 시각화
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React from 'react';
import { Map, ChevronRight } from 'lucide-react';
import { COLORS, getTemperatureColor } from '../design-system';
import { GlassCard } from './GlassCard';

interface Region {
  id: number;
  name: string;
  value: number;
  students: number;
}

interface MiniHeatmapProps {
  data: Region[];
  onClick?: () => void;
}

export const MiniHeatmap: React.FC<MiniHeatmapProps> = ({ data, onClick }) => {
  return (
    <GlassCard className="p-5" hover={false} onClick={onClick}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <Map size={18} color={COLORS.caution.primary} />
          지역 분포
        </h3>
        <ChevronRight size={16} color={COLORS.textDim} />
      </div>
      
      <div className="space-y-3">
        {data.slice(0, 4).map((region) => {
          const color = getTemperatureColor(region.value);
          
          return (
            <div key={region.id}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-white">{region.name}</span>
                <span 
                  className="text-xs font-semibold"
                  style={{ color: color.primary }}
                >
                  {region.students}명
                </span>
              </div>
              <div 
                className="h-2 rounded-full overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.1)' }}
              >
                <div 
                  className="h-full rounded-full transition-all duration-500"
                  style={{ 
                    width: `${region.value}%`,
                    background: color.gradient,
                    boxShadow: `0 0 10px ${color.glow}`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
};

export default MiniHeatmap;
