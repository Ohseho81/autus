/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🔬 KratonMicroscope - 고객 현미경 뷰
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState } from 'react';
import { ChevronLeft, Search, Filter } from 'lucide-react';
import { COLORS, MOCK_DATA } from '../../design-system';
import { GlassCard, StudentCard } from '../index';

interface KratonMicroscopeProps {
  onNavigate?: (view: string, params?: any) => void;
  params?: { filter?: string; studentId?: number };
}

export const KratonMicroscope: React.FC<KratonMicroscopeProps> = ({ onNavigate, params }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(params?.filter || 'all');
  const data = MOCK_DATA;
  
  const filteredStudents = data.students.filter(s => {
    const matchesSearch = s.name.includes(searchTerm) || s.grade.includes(searchTerm);
    const matchesFilter = statusFilter === 'all' || s.status === statusFilter;
    return matchesSearch && matchesFilter;
  });
  
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
        <h1 className="text-xl font-bold text-white">고객 현미경</h1>
      </div>
      
      {/* Search & Filter */}
      <GlassCard className="p-4" hover={false}>
        <div className="flex items-center gap-3">
          <Search size={20} color={COLORS.textMuted} />
          <input
            type="text"
            placeholder="학생 이름, 학년 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 bg-transparent outline-none text-white placeholder-gray-500"
          />
          <button className="p-2 rounded-lg hover:bg-white/10">
            <Filter size={18} color={COLORS.textMuted} />
          </button>
        </div>
      </GlassCard>
      
      {/* Filter Tabs */}
      <div className="flex gap-2">
        {[
          { id: 'all', label: '전체', count: data.students.length },
          { id: 'safe', label: '양호', count: data.stats.good },
          { id: 'caution', label: '주의', count: data.stats.caution },
          { id: 'danger', label: '위험', count: data.stats.danger },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${statusFilter === tab.id ? 'scale-105' : 'hover:bg-white/5'}
            `}
            style={{
              background: statusFilter === tab.id 
                ? tab.id === 'danger' ? COLORS.danger.bg 
                : tab.id === 'caution' ? COLORS.caution.bg 
                : tab.id === 'safe' ? COLORS.success.bg 
                : 'rgba(255,255,255,0.1)'
                : 'transparent',
              color: statusFilter === tab.id 
                ? tab.id === 'danger' ? COLORS.danger.primary 
                : tab.id === 'caution' ? COLORS.caution.primary 
                : tab.id === 'safe' ? COLORS.success.primary 
                : COLORS.text
                : COLORS.textMuted,
              border: `1px solid ${statusFilter === tab.id ? 'rgba(255,255,255,0.1)' : 'transparent'}`,
            }}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>
      
      {/* Student List */}
      <div className="space-y-3">
        {filteredStudents.map((student) => (
          <StudentCard 
            key={student.id} 
            student={student}
            onClick={() => {/* 상세 모달 오픈 */}}
          />
        ))}
      </div>
      
      {/* Empty State */}
      {filteredStudents.length === 0 && (
        <div className="text-center py-12">
          <p style={{ color: COLORS.textMuted }}>검색 결과가 없습니다</p>
        </div>
      )}
    </div>
  );
};

export default KratonMicroscope;
