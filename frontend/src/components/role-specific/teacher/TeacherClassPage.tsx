/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * AUTUS Teacher Class Page
 * 강사 수업 관리 페이지
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useReducedMotion } from '../../../hooks/useAccessibility';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ClassSession {
  id: string;
  title: string;
  time: string;
  endTime: string;
  room: string;
  students: ClassStudent[];
  status: 'upcoming' | 'ongoing' | 'completed';
  materials?: string[];
  notes?: string;
}

interface ClassStudent {
  id: string;
  name: string;
  attended: boolean | null; // null = not marked yet
  temperature: number;
  isAtRisk: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock Data
// ─────────────────────────────────────────────────────────────────────────────

const TODAY_CLASSES: ClassSession[] = [
  {
    id: '1',
    title: '수학 A반',
    time: '14:00',
    endTime: '15:30',
    room: '201호',
    status: 'completed',
    students: [
      { id: 's1', name: '김민수', attended: true, temperature: 32, isAtRisk: true },
      { id: 's2', name: '박준호', attended: true, temperature: 78, isAtRisk: false },
      { id: 's3', name: '이서연', attended: false, temperature: 45, isAtRisk: false },
    ],
    materials: ['방정식 워크시트', '문제풀이 영상'],
    notes: '이서연 결석 - 학부모 연락 완료',
  },
  {
    id: '2',
    title: '수학 B반',
    time: '16:00',
    endTime: '17:30',
    room: '201호',
    status: 'ongoing',
    students: [
      { id: 's4', name: '최유진', attended: true, temperature: 65, isAtRisk: false },
      { id: 's5', name: '정하늘', attended: true, temperature: 38, isAtRisk: true },
      { id: 's6', name: '강예은', attended: null, temperature: 72, isAtRisk: false },
    ],
    materials: ['기초 연산 프린트'],
  },
  {
    id: '3',
    title: '심화반 특강',
    time: '18:00',
    endTime: '19:30',
    room: '301호',
    status: 'upcoming',
    students: [
      { id: 's7', name: '오지훈', attended: null, temperature: 85, isAtRisk: false },
      { id: 's8', name: '신미래', attended: null, temperature: 90, isAtRisk: false },
    ],
    materials: ['경시대회 기출문제'],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Class Card Component
// ─────────────────────────────────────────────────────────────────────────────

function ClassCard({ 
  session, 
  onSelect,
  isSelected 
}: { 
  session: ClassSession;
  onSelect: () => void;
  isSelected: boolean;
}) {
  const reducedMotion = useReducedMotion();
  
  const statusStyles = {
    upcoming: { bg: 'bg-slate-50', border: 'border-slate-200', badge: 'bg-slate-200 text-slate-600' },
    ongoing: { bg: 'bg-green-50', border: 'border-green-300', badge: 'bg-green-500 text-white' },
    completed: { bg: 'bg-blue-50', border: 'border-blue-200', badge: 'bg-blue-200 text-blue-700' },
  };
  
  const style = statusStyles[session.status];
  const atRiskCount = session.students.filter(s => s.isAtRisk).length;
  const attendedCount = session.students.filter(s => s.attended === true).length;

  return (
    <motion.button
      onClick={onSelect}
      className={`
        w-full text-left p-4 rounded-xl border-2 transition-all
        ${style.bg} ${style.border}
        ${isSelected ? 'ring-2 ring-blue-500' : ''}
      `}
      whileHover={reducedMotion ? {} : { scale: 1.01 }}
      whileTap={reducedMotion ? {} : { scale: 0.99 }}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-slate-800">{session.title}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${style.badge}`}>
              {session.status === 'ongoing' ? '🔴 진행중' : 
               session.status === 'completed' ? '완료' : '예정'}
            </span>
          </div>
          <div className="text-sm text-slate-500">
            {session.time} - {session.endTime} · {session.room}
          </div>
        </div>
        
        <div className="text-right text-sm">
          <div className="text-slate-600">
            👥 {attendedCount}/{session.students.length}명
          </div>
          {atRiskCount > 0 && (
            <div className="text-red-500 text-xs">⚠️ 위험 {atRiskCount}명</div>
          )}
        </div>
      </div>
    </motion.button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Class Detail Panel
// ─────────────────────────────────────────────────────────────────────────────

function ClassDetailPanel({ 
  session, 
  onClose,
  onUpdateAttendance 
}: { 
  session: ClassSession;
  onClose: () => void;
  onUpdateAttendance: (studentId: string, attended: boolean) => void;
}) {
  const [notes, setNotes] = useState(session.notes || '');
  const [activeTab, setActiveTab] = useState<'attendance' | 'materials' | 'notes'>('attendance');

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
      {/* Header */}
      <div className={`p-4 ${
        session.status === 'ongoing' ? 'bg-green-500' : 
        session.status === 'completed' ? 'bg-blue-500' : 'bg-slate-500'
      } text-white`}>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold">{session.title}</h2>
            <p className="text-white/80 text-sm">
              {session.time} - {session.endTime} · {session.room}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg"
          >
            ✕
          </button>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="flex border-b">
        {[
          { id: 'attendance', label: '📋 출석', icon: '📋' },
          { id: 'materials', label: '📚 자료', icon: '📚' },
          { id: 'notes', label: '📝 메모', icon: '📝' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`
              flex-1 py-3 text-sm font-medium transition-colors
              ${activeTab === tab.id
                ? 'text-blue-600 border-b-2 border-blue-500'
                : 'text-slate-500 hover:text-slate-700'
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>
      
      {/* Content */}
      <div className="p-4 max-h-[400px] overflow-y-auto">
        {activeTab === 'attendance' && (
          <div className="space-y-2">
            {session.students.map(student => (
              <div 
                key={student.id}
                className={`
                  flex items-center justify-between p-3 rounded-xl
                  ${student.isAtRisk ? 'bg-red-50 border border-red-200' : 'bg-slate-50'}
                `}
              >
                <div className="flex items-center gap-3">
                  <div>
                    <div className="font-medium text-slate-800">
                      {student.name}
                      {student.isAtRisk && <span className="text-red-500 ml-1">⚠️</span>}
                    </div>
                    <div className={`text-xs ${
                      student.temperature < 40 ? 'text-red-500' :
                      student.temperature < 60 ? 'text-amber-500' : 'text-green-500'
                    }`}>
                      온도 {student.temperature}°
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => onUpdateAttendance(student.id, true)}
                    className={`
                      px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                      ${student.attended === true
                        ? 'bg-green-500 text-white'
                        : 'bg-slate-200 text-slate-600 hover:bg-green-100'
                      }
                    `}
                  >
                    ✓ 출석
                  </button>
                  <button
                    onClick={() => onUpdateAttendance(student.id, false)}
                    className={`
                      px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                      ${student.attended === false
                        ? 'bg-red-500 text-white'
                        : 'bg-slate-200 text-slate-600 hover:bg-red-100'
                      }
                    `}
                  >
                    ✕ 결석
                  </button>
                </div>
              </div>
            ))}
            
            {/* Quick Actions */}
            <div className="flex gap-2 mt-4 pt-4 border-t">
              <button className="flex-1 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
                ✓ 전체 출석
              </button>
              <button className="flex-1 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium">
                🔔 결석 학부모 알림
              </button>
            </div>
          </div>
        )}
        
        {activeTab === 'materials' && (
          <div className="space-y-3">
            {session.materials?.map((material, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-2">
                  <span>📄</span>
                  <span className="text-sm">{material}</span>
                </div>
                <button className="text-blue-500 text-sm">열기</button>
              </div>
            )) || (
              <div className="text-center py-8 text-slate-500">
                등록된 자료가 없습니다
              </div>
            )}
            
            <button className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 hover:border-blue-400 hover:text-blue-500 transition-colors">
              + 자료 추가
            </button>
          </div>
        )}
        
        {activeTab === 'notes' && (
          <div className="space-y-3">
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full p-3 border rounded-xl resize-none h-32 text-sm"
              placeholder="수업 메모를 입력하세요..."
            />
            <div className="flex gap-2">
              <button className="flex-1 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium">
                저장
              </button>
              <button className="py-2 px-4 bg-slate-100 text-slate-600 rounded-lg text-sm">
                🎤 음성 입력
              </button>
            </div>
            
            {/* Quick Note Templates */}
            <div className="pt-3 border-t">
              <div className="text-xs text-slate-500 mb-2">빠른 메모</div>
              <div className="flex flex-wrap gap-2">
                {['집중력 좋음', '복습 필요', '숙제 확인', '상담 필요'].map(template => (
                  <button
                    key={template}
                    onClick={() => setNotes(prev => prev + (prev ? '\n' : '') + template)}
                    className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs hover:bg-slate-200"
                  >
                    {template}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Footer Actions */}
      {session.status === 'ongoing' && (
        <div className="p-4 bg-slate-50 border-t">
          <button className="w-full py-3 bg-blue-500 text-white rounded-xl font-medium">
            수업 완료
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export function TeacherClassPage() {
  const [classes, setClasses] = useState(TODAY_CLASSES);
  const [selectedClass, setSelectedClass] = useState<ClassSession | null>(null);
  
  const handleUpdateAttendance = (studentId: string, attended: boolean) => {
    setClasses(prev => prev.map(cls => ({
      ...cls,
      students: cls.students.map(s => 
        s.id === studentId ? { ...s, attended } : s
      )
    })));
    
    // Update selected class too
    if (selectedClass) {
      setSelectedClass({
        ...selectedClass,
        students: selectedClass.students.map(s =>
          s.id === studentId ? { ...s, attended } : s
        )
      });
    }
  };
  
  const ongoingClass = classes.find(c => c.status === 'ongoing');
  const upcomingClasses = classes.filter(c => c.status === 'upcoming');
  const completedClasses = classes.filter(c => c.status === 'completed');

  return (
    <div className="min-h-screen bg-slate-100 pb-20">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto p-4">
          <h1 className="text-xl font-bold text-slate-800">📚 오늘의 수업</h1>
          <p className="text-sm text-slate-500">
            {new Date().toLocaleDateString('ko-KR', { 
              month: 'long', 
              day: 'numeric', 
              weekday: 'long' 
            })}
          </p>
        </div>
      </div>
      
      <div className="max-w-4xl mx-auto p-4">
        <div className="grid md:grid-cols-2 gap-4">
          {/* Left: Class List */}
          <div className="space-y-4">
            {/* Ongoing Class */}
            {ongoingClass && (
              <div>
                <h2 className="text-sm font-medium text-slate-500 mb-2">🔴 진행중</h2>
                <ClassCard
                  session={ongoingClass}
                  onSelect={() => setSelectedClass(ongoingClass)}
                  isSelected={selectedClass?.id === ongoingClass.id}
                />
              </div>
            )}
            
            {/* Upcoming Classes */}
            {upcomingClasses.length > 0 && (
              <div>
                <h2 className="text-sm font-medium text-slate-500 mb-2">⏰ 예정된 수업</h2>
                <div className="space-y-2">
                  {upcomingClasses.map(cls => (
                    <ClassCard
                      key={cls.id}
                      session={cls}
                      onSelect={() => setSelectedClass(cls)}
                      isSelected={selectedClass?.id === cls.id}
                    />
                  ))}
                </div>
              </div>
            )}
            
            {/* Completed Classes */}
            {completedClasses.length > 0 && (
              <div>
                <h2 className="text-sm font-medium text-slate-500 mb-2">✅ 완료된 수업</h2>
                <div className="space-y-2">
                  {completedClasses.map(cls => (
                    <ClassCard
                      key={cls.id}
                      session={cls}
                      onSelect={() => setSelectedClass(cls)}
                      isSelected={selectedClass?.id === cls.id}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Right: Detail Panel */}
          <div className="md:sticky md:top-24 md:self-start">
            <AnimatePresence mode="wait">
              {selectedClass ? (
                <motion.div
                  key={selectedClass.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <ClassDetailPanel
                    session={selectedClass}
                    onClose={() => setSelectedClass(null)}
                    onUpdateAttendance={handleUpdateAttendance}
                  />
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-white rounded-2xl p-8 text-center text-slate-400"
                >
                  <div className="text-4xl mb-2">👆</div>
                  <div>수업을 선택하세요</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TeacherClassPage;
