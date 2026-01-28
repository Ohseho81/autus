/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS Teacher Student List Page
 * 강사의 담당 학생 목록 및 관리
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useReducedMotion } from '../../../hooks/useAccessibility';
import { useBreakpoint } from '../../../hooks/useResponsive';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Student {
  id: string;
  name: string;
  grade: string;
  className: string;
  temperature: number;
  status: 'danger' | 'warning' | 'good';
  metrics: {
    attendance: number;
    homework: number;
    gradeChange: number;
  };
  riskFactors: string[];
  lastActivity: string;
  parentName: string;
  phone: string;
  notes?: string;
}

type SortField = 'temperature' | 'name' | 'lastActivity' | 'grade';
type FilterStatus = 'all' | 'danger' | 'warning' | 'good';

// ─────────────────────────────────────────────────────────────────────────────
// Mock Data
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_STUDENTS: Student[] = [
  {
    id: '1',
    name: '김민수',
    grade: '중3',
    className: '수학 A반',
    temperature: 32,
    status: 'danger',
    metrics: { attendance: 85, homework: 60, gradeChange: -15 },
    riskFactors: ['성적 하락', '출석 불량', '숙제 미제출'],
    lastActivity: '3일 전',
    parentName: '김영희',
    phone: '010-1234-5678',
    notes: '최근 집중력 저하, 가정 상담 필요'
  },
  {
    id: '2',
    name: '이서연',
    grade: '중2',
    className: '영어 B반',
    temperature: 45,
    status: 'warning',
    metrics: { attendance: 92, homework: 75, gradeChange: -5 },
    riskFactors: ['숙제 지연'],
    lastActivity: '1일 전',
    parentName: '이철수',
    phone: '010-2345-6789',
  },
  {
    id: '3',
    name: '박준호',
    grade: '중3',
    className: '수학 A반',
    temperature: 78,
    status: 'good',
    metrics: { attendance: 98, homework: 95, gradeChange: 12 },
    riskFactors: [],
    lastActivity: '오늘',
    parentName: '박미영',
    phone: '010-3456-7890',
  },
  {
    id: '4',
    name: '최유진',
    grade: '중1',
    className: '영어 A반',
    temperature: 65,
    status: 'good',
    metrics: { attendance: 95, homework: 88, gradeChange: 8 },
    riskFactors: [],
    lastActivity: '오늘',
    parentName: '최동원',
    phone: '010-4567-8901',
  },
  {
    id: '5',
    name: '정하늘',
    grade: '중2',
    className: '수학 B반',
    temperature: 38,
    status: 'warning',
    metrics: { attendance: 88, homework: 70, gradeChange: -8 },
    riskFactors: ['비용 민감', '성적 정체'],
    lastActivity: '2일 전',
    parentName: '정수민',
    phone: '010-5678-9012',
    notes: '학원비 부담 언급'
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Student Card Component
// ─────────────────────────────────────────────────────────────────────────────

function StudentCard({ 
  student, 
  onSelect,
  isSelected 
}: { 
  student: Student; 
  onSelect: () => void;
  isSelected: boolean;
}) {
  const reducedMotion = useReducedMotion();
  
  const statusColors = {
    danger: 'border-red-400 bg-red-50',
    warning: 'border-amber-400 bg-amber-50',
    good: 'border-green-400 bg-green-50',
  };

  const temperatureColor = student.temperature < 40 
    ? 'text-red-600' 
    : student.temperature < 60 
      ? 'text-amber-600' 
      : 'text-green-600';

  return (
    <motion.button
      onClick={onSelect}
      className={`
        w-full text-left p-4 rounded-xl border-2 transition-all
        ${statusColors[student.status]}
        ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
        hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500
      `}
      whileHover={reducedMotion ? {} : { scale: 1.01 }}
      whileTap={reducedMotion ? {} : { scale: 0.99 }}
      aria-pressed={isSelected}
      aria-label={`${student.name} 학생, 온도 ${student.temperature}도, ${student.status === 'danger' ? '위험' : student.status === 'warning' ? '주의' : '양호'} 상태`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left: Student Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-slate-800">{student.name}</span>
            <span className="text-sm text-slate-500">{student.grade}</span>
            <span className="text-xs px-2 py-0.5 bg-slate-200 rounded-full text-slate-600">
              {student.className}
            </span>
          </div>
          
          {/* Metrics */}
          <div className="flex items-center gap-4 text-sm text-slate-600 mb-2">
            <span>📚 출석 {student.metrics.attendance}%</span>
            <span>📝 숙제 {student.metrics.homework}%</span>
            <span className={student.metrics.gradeChange >= 0 ? 'text-green-600' : 'text-red-600'}>
              📈 {student.metrics.gradeChange > 0 ? '+' : ''}{student.metrics.gradeChange}점
            </span>
          </div>
          
          {/* Risk Factors */}
          {student.riskFactors.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {student.riskFactors.map((factor, idx) => (
                <span 
                  key={idx}
                  className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full"
                >
                  {factor}
                </span>
              ))}
            </div>
          )}
        </div>
        
        {/* Right: Temperature */}
        <div className="text-right flex-shrink-0">
          <div className={`text-2xl font-bold ${temperatureColor}`}>
            {student.temperature}°
          </div>
          <div className="text-xs text-slate-500">
            {student.lastActivity}
          </div>
        </div>
      </div>
    </motion.button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Student Detail Modal
// ─────────────────────────────────────────────────────────────────────────────

function StudentDetailModal({ 
  student, 
  onClose 
}: { 
  student: Student; 
  onClose: () => void;
}) {
  const reducedMotion = useReducedMotion();
  const [activeTab, setActiveTab] = useState<'info' | 'history' | 'notes'>('info');

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      initial={reducedMotion ? {} : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={reducedMotion ? {} : { opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden shadow-2xl"
        initial={reducedMotion ? {} : { scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={reducedMotion ? {} : { scale: 0.9, y: 20 }}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="student-detail-title"
      >
        {/* Header */}
        <div className="p-4 border-b bg-slate-50">
          <div className="flex items-start justify-between">
            <div>
              <h2 id="student-detail-title" className="text-xl font-bold text-slate-800">
                {student.name}
              </h2>
              <p className="text-sm text-slate-500">
                {student.grade} · {student.className}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
              aria-label="닫기"
            >
              ✕
            </button>
          </div>
          
          {/* Tabs */}
          <div className="flex gap-1 mt-4" role="tablist">
            {(['info', 'history', 'notes'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium transition-colors
                  ${activeTab === tab 
                    ? 'bg-blue-500 text-white' 
                    : 'text-slate-600 hover:bg-slate-200'
                  }
                `}
                role="tab"
                aria-selected={activeTab === tab}
              >
                {tab === 'info' ? '📊 정보' : tab === 'history' ? '📅 활동' : '📝 메모'}
              </button>
            ))}
          </div>
        </div>
        
        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[50vh]">
          {activeTab === 'info' && (
            <div className="space-y-4">
              {/* Temperature Gauge */}
              <div className="p-4 bg-slate-50 rounded-xl">
                <div className="text-sm text-slate-500 mb-2">학생 온도</div>
                <div className="flex items-end gap-2">
                  <span className={`text-4xl font-bold ${
                    student.temperature < 40 ? 'text-red-500' :
                    student.temperature < 60 ? 'text-amber-500' : 'text-green-500'
                  }`}>
                    {student.temperature}°
                  </span>
                  <span className="text-sm text-slate-500 mb-1">
                    {student.status === 'danger' ? '위험' : 
                     student.status === 'warning' ? '주의' : '양호'}
                  </span>
                </div>
                <div className="mt-2 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${
                      student.temperature < 40 ? 'bg-red-500' :
                      student.temperature < 60 ? 'bg-amber-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${student.temperature}%` }}
                  />
                </div>
              </div>
              
              {/* Metrics */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-blue-50 rounded-xl text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {student.metrics.attendance}%
                  </div>
                  <div className="text-xs text-slate-500">출석률</div>
                </div>
                <div className="p-3 bg-purple-50 rounded-xl text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {student.metrics.homework}%
                  </div>
                  <div className="text-xs text-slate-500">숙제 완료</div>
                </div>
                <div className={`p-3 rounded-xl text-center ${
                  student.metrics.gradeChange >= 0 ? 'bg-green-50' : 'bg-red-50'
                }`}>
                  <div className={`text-2xl font-bold ${
                    student.metrics.gradeChange >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {student.metrics.gradeChange > 0 ? '+' : ''}{student.metrics.gradeChange}
                  </div>
                  <div className="text-xs text-slate-500">성적 변화</div>
                </div>
              </div>
              
              {/* Risk Factors */}
              {student.riskFactors.length > 0 && (
                <div className="p-4 bg-red-50 rounded-xl">
                  <div className="text-sm font-medium text-red-700 mb-2">⚠️ 위험 요소</div>
                  <div className="flex flex-wrap gap-2">
                    {student.riskFactors.map((factor, idx) => (
                      <span key={idx} className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm">
                        {factor}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Contact */}
              <div className="p-4 bg-slate-50 rounded-xl">
                <div className="text-sm font-medium text-slate-700 mb-2">👨‍👩‍👧 학부모 정보</div>
                <div className="text-sm text-slate-600">
                  <div>{student.parentName}</div>
                  <div>{student.phone}</div>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'history' && (
            <div className="space-y-3">
              <div className="text-sm text-slate-500 text-center py-8">
                최근 활동 내역이 여기에 표시됩니다
              </div>
            </div>
          )}
          
          {activeTab === 'notes' && (
            <div className="space-y-3">
              {student.notes ? (
                <div className="p-4 bg-yellow-50 rounded-xl">
                  <div className="text-sm text-slate-700">{student.notes}</div>
                </div>
              ) : (
                <div className="text-sm text-slate-500 text-center py-8">
                  메모가 없습니다
                </div>
              )}
              <textarea
                className="w-full p-3 border rounded-xl resize-none h-24 text-sm"
                placeholder="새 메모 추가..."
              />
            </div>
          )}
        </div>
        
        {/* Actions */}
        <div className="p-4 border-t bg-slate-50 flex gap-2">
          <button className="flex-1 py-2 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition-colors">
            📞 상담 예약
          </button>
          <button className="flex-1 py-2 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-colors">
            💬 메시지
          </button>
          <button className="py-2 px-4 bg-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-300 transition-colors">
            📝 기록
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export function TeacherStudentListPage() {
  const { isMobile } = useBreakpoint();
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [sortField, setSortField] = useState<SortField>('temperature');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  
  // Filter and sort students
  const filteredStudents = useMemo(() => {
    let result = [...MOCK_STUDENTS];
    
    // Filter by status
    if (filterStatus !== 'all') {
      result = result.filter(s => s.status === filterStatus);
    }
    
    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(s => 
        s.name.toLowerCase().includes(query) ||
        s.grade.toLowerCase().includes(query) ||
        s.className.toLowerCase().includes(query)
      );
    }
    
    // Sort
    result.sort((a, b) => {
      switch (sortField) {
        case 'temperature':
          return a.temperature - b.temperature; // Low first (danger)
        case 'name':
          return a.name.localeCompare(b.name);
        case 'grade':
          return a.grade.localeCompare(b.grade);
        default:
          return 0;
      }
    });
    
    return result;
  }, [filterStatus, sortField, searchQuery]);
  
  const statusCounts = useMemo(() => ({
    all: MOCK_STUDENTS.length,
    danger: MOCK_STUDENTS.filter(s => s.status === 'danger').length,
    warning: MOCK_STUDENTS.filter(s => s.status === 'warning').length,
    good: MOCK_STUDENTS.filter(s => s.status === 'good').length,
  }), []);

  return (
    <div className="min-h-screen bg-slate-100 pb-20">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto p-4">
          <h1 className="text-xl font-bold text-slate-800 mb-4">👥 내 학생 관리</h1>
          
          {/* Search */}
          <div className="relative mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="학생 이름, 학년, 반으로 검색..."
              className="w-full pl-10 pr-4 py-3 border rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-label="학생 검색"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              🔍
            </span>
          </div>
          
          {/* Filter Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2" role="tablist">
            {([
              { id: 'all', label: '전체', icon: '👥' },
              { id: 'danger', label: '위험', icon: '🔴' },
              { id: 'warning', label: '주의', icon: '🟡' },
              { id: 'good', label: '양호', icon: '🟢' },
            ] as const).map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap
                  transition-colors text-sm font-medium
                  ${filterStatus === tab.id
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }
                `}
                role="tab"
                aria-selected={filterStatus === tab.id}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                <span className={`
                  px-2 py-0.5 rounded-full text-xs
                  ${filterStatus === tab.id ? 'bg-white/20' : 'bg-slate-200'}
                `}>
                  {statusCounts[tab.id]}
                </span>
              </button>
            ))}
          </div>
          
          {/* Sort */}
          <div className="flex items-center gap-2 mt-3">
            <span className="text-sm text-slate-500">정렬:</span>
            <select
              value={sortField}
              onChange={e => setSortField(e.target.value as SortField)}
              className="text-sm px-3 py-1.5 border rounded-lg bg-white"
              aria-label="정렬 기준"
            >
              <option value="temperature">온도순 (낮은순)</option>
              <option value="name">이름순</option>
              <option value="grade">학년순</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Student List */}
      <div className="max-w-4xl mx-auto p-4">
        <div className="space-y-3">
          {filteredStudents.map(student => (
            <StudentCard
              key={student.id}
              student={student}
              onSelect={() => setSelectedStudent(student)}
              isSelected={selectedStudent?.id === student.id}
            />
          ))}
          
          {filteredStudents.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <div className="text-4xl mb-2">🔍</div>
              <div>검색 결과가 없습니다</div>
            </div>
          )}
        </div>
      </div>
      
      {/* Student Detail Modal */}
      <AnimatePresence>
        {selectedStudent && (
          <StudentDetailModal
            student={selectedStudent}
            onClose={() => setSelectedStudent(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default TeacherStudentListPage;
