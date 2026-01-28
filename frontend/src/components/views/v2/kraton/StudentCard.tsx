/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 👤 StudentCard - 학생 프로필 카드 (Cycle 7)
 * 온도 및 시그마 시각화
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React from 'react';
import { Thermometer, TrendingUp, TrendingDown } from 'lucide-react';
import { COLORS, getTemperatureColor, getSigmaColor } from '../design-system';
import { GlassCard } from './GlassCard';

interface Student {
  id: number;
  name: string;
  grade: string;
  subject: string;
  temperature: number;
  sigma: number;
  trend: number;
  status: string;
  avatar: string;
}

interface StudentCardProps {
  student: Student;
  onClick?: () => void;
}

export const StudentCard: React.FC<StudentCardProps> = ({ student, onClick }) => {
  const tempColor = getTemperatureColor(student.temperature);
  const sigmaColor = getSigmaColor(student.sigma);
  
  return (
    <GlassCard onClick={onClick} className="p-4">
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div 
          className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
          style={{ 
            background: `linear-gradient(135deg, ${tempColor.bg} 0%, ${sigmaColor.bg} 100%)`,
            border: `2px solid ${tempColor.primary}`,
          }}
        >
          {student.avatar}
        </div>
        
        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-white font-semibold">{student.name}</span>
            <span 
              className="px-2 py-0.5 rounded text-xs"
              style={{ background: tempColor.bg, color: tempColor.primary }}
            >
              {student.grade}
            </span>
          </div>
          <p className="text-sm mt-0.5" style={{ color: COLORS.textMuted }}>
            {student.subject}
          </p>
        </div>
        
        {/* Metrics */}
        <div className="text-right">
          <div className="flex items-center justify-end gap-1">
            <Thermometer size={14} color={tempColor.primary} />
            <span style={{ color: tempColor.primary, fontWeight: 600 }}>
              {student.temperature}°
            </span>
          </div>
          <div className="flex items-center justify-end gap-1 mt-1">
            {student.trend > 0 ? (
              <TrendingUp size={12} color={COLORS.success.primary} />
            ) : (
              <TrendingDown size={12} color={COLORS.danger.primary} />
            )}
            <span 
              className="text-xs"
              style={{ color: student.trend > 0 ? COLORS.success.primary : COLORS.danger.primary }}
            >
              {student.trend > 0 ? '+' : ''}{student.trend}%
            </span>
          </div>
        </div>
      </div>
      
      {/* Sigma Bar */}
      <div className="mt-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs" style={{ color: COLORS.textDim }}>관계지수 σ</span>
          <span className="text-xs font-semibold" style={{ color: sigmaColor.primary }}>
            {student.sigma.toFixed(2)}
          </span>
        </div>
        <div 
          className="h-1.5 rounded-full overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.1)' }}
        >
          <div 
            className="h-full rounded-full transition-all duration-500"
            style={{ 
              width: `${student.sigma * 100}%`,
              background: sigmaColor.gradient,
              boxShadow: `0 0 10px ${sigmaColor.glow}`,
            }}
          />
        </div>
      </div>
    </GlassCard>
  );
};

export default StudentCard;
