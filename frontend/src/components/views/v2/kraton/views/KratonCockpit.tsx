/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🎛️ KratonCockpit - 조종석 뷰 (메인 대시보드)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React from 'react';
import { Users, Bell, TrendingUp, TrendingDown, AlertTriangle, RefreshCw, Zap, CloudRain, Activity, ChevronRight } from 'lucide-react';
import { COLORS, getSigmaColor, MOCK_DATA } from '../../design-system';
import { NeonGauge3D, GlassCard, AlertCard, QuickActionButton } from '../index';

interface KratonCockpitProps {
  onNavigate?: (view: string, params?: any) => void;
}

export const KratonCockpit: React.FC<KratonCockpitProps> = ({ onNavigate }) => {
  const data = MOCK_DATA;
  
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm" style={{ color: COLORS.textMuted }}>
            원장님, 오늘의 현황입니다
          </p>
        </div>
        <select 
          className="px-3 py-2 rounded-lg text-sm"
          style={{ 
            background: COLORS.surface, 
            color: COLORS.text,
            border: `1px solid ${COLORS.border}`,
          }}
        >
          <option>원장 (Owner)</option>
        </select>
      </div>
      
      {/* Main Grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left Panel - Stats */}
        <div className="col-span-3 space-y-4">
          <GlassCard className="p-5" hover={false}>
            <p className="text-sm flex items-center justify-between" style={{ color: COLORS.textMuted }}>
              전체 재원
              <Users size={16} />
            </p>
            <p className="text-4xl font-bold text-white mt-2">
              {data.organization.totalStudents}명
            </p>
            <p className="text-sm mt-1" style={{ color: COLORS.success.primary }}>
              <TrendingUp size={14} className="inline mr-1" />
              {data.organization.trend}
            </p>
          </GlassCard>
          
          <GlassCard className="p-5" hover={false}>
            <p className="text-sm flex items-center justify-between" style={{ color: COLORS.textMuted }}>
              환경지수 σ
              <RefreshCw size={16} />
            </p>
            <p 
              className="text-4xl font-bold mt-2"
              style={{ color: getSigmaColor(data.organization.sigma).primary }}
            >
              {data.organization.sigma.toFixed(2)}
            </p>
            <p className="text-sm mt-1" style={{ color: COLORS.textDim }}>
              중간고사 {data.organization.reportDue}
            </p>
          </GlassCard>
          
          <GlassCard 
            className="p-5" 
            glow={COLORS.danger.glow}
            onClick={() => onNavigate?.('pulse')}
          >
            <p className="text-sm flex items-center justify-between" style={{ color: COLORS.textMuted }}>
              위험 신호
              <AlertTriangle size={16} color={COLORS.danger.primary} />
            </p>
            <p 
              className="text-4xl font-bold mt-2"
              style={{ color: COLORS.danger.primary }}
            >
              {data.stats.danger}건
            </p>
            <p className="text-sm mt-1" style={{ color: COLORS.danger.primary }}>
              <TrendingDown size={14} className="inline mr-1" />
              -2
            </p>
          </GlassCard>
        </div>
        
        {/* Center - Main Gauge */}
        <div className="col-span-5 flex flex-col items-center justify-center">
          <NeonGauge3D 
            value={data.organization.temperature} 
            label="전체 온도"
            status={data.organization.temperature > 70 ? "주의 필요" : "안정"}
          />
          
          {/* Stats Row */}
          <div className="flex gap-8 mt-6">
            <div 
              className="text-center cursor-pointer hover:scale-105 transition-transform"
              onClick={() => onNavigate?.('microscope', { filter: 'good' })}
            >
              <p 
                className="text-3xl font-bold"
                style={{ color: COLORS.success.primary }}
              >
                {data.stats.good}
              </p>
              <p className="text-sm" style={{ color: COLORS.textMuted }}>양호</p>
            </div>
            <div 
              className="text-center cursor-pointer hover:scale-105 transition-transform"
              onClick={() => onNavigate?.('microscope', { filter: 'caution' })}
            >
              <p 
                className="text-3xl font-bold"
                style={{ color: COLORS.caution.primary }}
              >
                {data.stats.caution}
              </p>
              <p className="text-sm" style={{ color: COLORS.textMuted }}>주의</p>
            </div>
            <div 
              className="text-center cursor-pointer hover:scale-105 transition-transform"
              onClick={() => onNavigate?.('microscope', { filter: 'danger' })}
            >
              <p 
                className="text-3xl font-bold"
                style={{ color: COLORS.danger.primary }}
              >
                {data.stats.danger}
              </p>
              <p className="text-sm" style={{ color: COLORS.textMuted }}>위험</p>
            </div>
          </div>
        </div>
        
        {/* Right Panel - Alerts */}
        <div className="col-span-4">
          <GlassCard className="p-5 h-full" hover={false}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <Bell size={18} />
                알림
              </h3>
              <span 
                className="px-2 py-0.5 rounded-full text-xs font-semibold"
                style={{ background: COLORS.danger.bg, color: COLORS.danger.primary }}
              >
                {data.alerts.length}
              </span>
            </div>
            
            <div className="space-y-3">
              {data.alerts.map((alert) => (
                <AlertCard 
                  key={alert.id} 
                  alert={alert}
                  onClick={() => onNavigate?.('microscope', { student: alert.student })}
                />
              ))}
            </div>
            
            <button 
              className="w-full mt-4 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors hover:bg-white/10"
              style={{ color: COLORS.textMuted }}
              onClick={() => onNavigate?.('pulse')}
            >
              전체 보기 <ChevronRight size={16} />
            </button>
          </GlassCard>
        </div>
      </div>
      
      {/* Quick Actions */}
      <div className="grid grid-cols-4 gap-4">
        <QuickActionButton 
          icon={Zap} 
          label="오늘의 액션" 
          color={COLORS.caution}
          onClick={() => onNavigate?.('actions')}
        />
        <QuickActionButton 
          icon={CloudRain} 
          label="예보 확인" 
          color={COLORS.safe}
          onClick={() => onNavigate?.('forecast')}
        />
        <QuickActionButton 
          icon={Activity} 
          label="맥박 분석" 
          color={COLORS.danger}
          onClick={() => onNavigate?.('pulse')}
        />
        <QuickActionButton 
          icon={Users} 
          label="고객 현미경" 
          color={COLORS.success}
          onClick={() => onNavigate?.('microscope')}
        />
      </div>
    </div>
  );
};

export default KratonCockpit;
