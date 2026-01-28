/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🗺️ KratonMap - 지역 지도 뷰
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React from 'react';
import { ChevronLeft, Map, MapPin, Users } from 'lucide-react';
import { COLORS, MOCK_DATA, getTemperatureColor } from '../../design-system';
import { GlassCard, MiniHeatmap } from '../index';

interface KratonMapProps {
  onNavigate?: (view: string, params?: any) => void;
}

export const KratonMap: React.FC<KratonMapProps> = ({ onNavigate }) => {
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
        <h1 className="text-xl font-bold text-white">지역 지도</h1>
      </div>
      
      {/* Map Placeholder */}
      <GlassCard className="p-6 h-80" hover={false}>
        <div className="w-full h-full flex items-center justify-center relative">
          {/* Visual Map Representation */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div 
              className="relative w-64 h-64 rounded-full"
              style={{ 
                background: `radial-gradient(circle, ${COLORS.surface} 0%, ${COLORS.background} 100%)`,
                border: `1px solid ${COLORS.border}`,
              }}
            >
              {/* Region Points */}
              {data.heatmapData.map((region, i) => {
                const angle = (i / data.heatmapData.length) * Math.PI * 2 - Math.PI / 2;
                const distance = 80 + (region.value / 100) * 40;
                const x = Math.cos(angle) * distance;
                const y = Math.sin(angle) * distance;
                const color = getTemperatureColor(region.value);
                
                return (
                  <div
                    key={region.id}
                    className="absolute flex flex-col items-center cursor-pointer hover:scale-110 transition-transform"
                    style={{
                      left: `calc(50% + ${x}px - 20px)`,
                      top: `calc(50% + ${y}px - 20px)`,
                    }}
                  >
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center"
                      style={{ 
                        background: color.bg,
                        border: `2px solid ${color.primary}`,
                        boxShadow: `0 0 15px ${color.glow}`,
                      }}
                    >
                      <MapPin size={16} color={color.primary} />
                    </div>
                    <span 
                      className="text-xs mt-1 whitespace-nowrap"
                      style={{ color: COLORS.textMuted }}
                    >
                      {region.name}
                    </span>
                  </div>
                );
              })}
              
              {/* Center Point */}
              <div 
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full flex items-center justify-center"
                style={{ 
                  background: COLORS.safe.bg,
                  border: `2px solid ${COLORS.safe.primary}`,
                  boxShadow: `0 0 20px ${COLORS.safe.glow}`,
                }}
              >
                <span className="text-xl">🏫</span>
              </div>
            </div>
          </div>
          
          {/* Info Text */}
          <div 
            className="absolute bottom-4 text-center"
            style={{ color: COLORS.textDim }}
          >
            <p className="text-sm">지도에서 지역을 클릭하면 상세 정보를 확인할 수 있습니다</p>
          </div>
        </div>
      </GlassCard>
      
      {/* Heatmap */}
      <MiniHeatmap data={data.heatmapData} />
      
      {/* Region Stats */}
      <div className="grid grid-cols-2 gap-4">
        <GlassCard className="p-4" hover={false}>
          <div className="flex items-center gap-2 mb-2">
            <Users size={16} color={COLORS.safe.primary} />
            <span style={{ color: COLORS.textMuted }}>총 학생 수</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {data.heatmapData.reduce((sum, r) => sum + r.students, 0)}명
          </p>
        </GlassCard>
        <GlassCard className="p-4" hover={false}>
          <div className="flex items-center gap-2 mb-2">
            <Map size={16} color={COLORS.caution.primary} />
            <span style={{ color: COLORS.textMuted }}>커버리지 지역</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {data.heatmapData.length}개
          </p>
        </GlassCard>
      </div>
    </div>
  );
};

export default KratonMap;
