/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 💓 KratonPulse - 맥박 분석 뷰
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { COLORS, MOCK_DATA } from '../../design-system';
import { GlassCard, ECGLine, StudentCard } from '../index';

interface KratonPulseProps {
  onNavigate?: (view: string, params?: any) => void;
}

export const KratonPulse: React.FC<KratonPulseProps> = ({ onNavigate }) => {
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
        <h1 className="text-xl font-bold text-white">맥박 분석</h1>
      </div>
      
      {/* Main ECG */}
      <GlassCard className="p-6" hover={false}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold">전체 맥박</h3>
          <div className="flex items-center gap-2">
            <span 
              className="w-3 h-3 rounded-full animate-pulse"
              style={{ background: COLORS.caution.primary }}
            />
            <span style={{ color: COLORS.caution.primary }}>LIVE</span>
          </div>
        </div>
        <ECGLine 
          data={data.ecgData} 
          color={COLORS.caution.primary}
          height={150}
        />
      </GlassCard>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4">
        <GlassCard className="p-4" hover={false}>
          <p className="text-sm" style={{ color: COLORS.textMuted }}>평균 온도</p>
          <p className="text-2xl font-bold mt-1" style={{ color: COLORS.caution.primary }}>
            68.5°
          </p>
        </GlassCard>
        <GlassCard className="p-4" hover={false}>
          <p className="text-sm" style={{ color: COLORS.textMuted }}>변동성</p>
          <p className="text-2xl font-bold mt-1" style={{ color: COLORS.safe.primary }}>
            ±3.2%
          </p>
        </GlassCard>
        <GlassCard className="p-4" hover={false}>
          <p className="text-sm" style={{ color: COLORS.textMuted }}>위험 감지</p>
          <p className="text-2xl font-bold mt-1" style={{ color: COLORS.danger.primary }}>
            3건
          </p>
        </GlassCard>
      </div>
      
      {/* Risk Students */}
      <div>
        <h3 className="text-white font-semibold mb-4">위험 감지 학생</h3>
        <div className="grid grid-cols-2 gap-4">
          {data.students.filter(s => s.status !== 'safe').map((student) => (
            <StudentCard 
              key={student.id} 
              student={student}
              onClick={() => onNavigate?.('microscope', { studentId: student.id })}
            />
          ))}
        </div>
      </div>
      
      {/* Trend Analysis */}
      <GlassCard className="p-5" hover={false}>
        <h3 className="text-white font-semibold mb-4">추세 분석</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span style={{ color: COLORS.textMuted }}>상승 추세</span>
            <span className="text-white">12명</span>
          </div>
          <div className="flex items-center justify-between">
            <span style={{ color: COLORS.textMuted }}>하락 추세</span>
            <span style={{ color: COLORS.danger.primary }}>5명</span>
          </div>
          <div className="flex items-center justify-between">
            <span style={{ color: COLORS.textMuted }}>안정</span>
            <span style={{ color: COLORS.success.primary }}>115명</span>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};

export default KratonPulse;
