/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 📋 ATTENDANCE PAGE - 출결 관리
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// DESIGN TOKENS
// ============================================
const TOKENS = {
  type: {
    h1: 'text-3xl font-bold tracking-tight',
    h2: 'text-xl font-semibold tracking-tight',
    body: 'text-sm font-medium',
    meta: 'text-xs text-gray-500',
  },
};

// ============================================
// ATTENDANCE STATUS
// ============================================
const ATTENDANCE_STATUS = {
  present: { label: '출석', color: 'emerald', icon: '✅' },
  absent: { label: '결석', color: 'red', icon: '❌' },
  late: { label: '지각', color: 'yellow', icon: '⏰' },
  excused: { label: '사유결석', color: 'blue', icon: '📋' },
  early: { label: '조퇴', color: 'orange', icon: '🚶' },
};

// ============================================
// MOCK DATA
// ============================================
const MOCK_STUDENTS = [
  { id: 1, name: '김민수', class: 'A반', status: 'present', time: '14:02', state: 2 },
  { id: 2, name: '이지은', class: 'A반', status: 'present', time: '13:58', state: 3 },
  { id: 3, name: '박서준', class: 'A반', status: 'late', time: '14:15', state: 4 },
  { id: 4, name: '최예린', class: 'A반', status: 'absent', time: null, state: 5 },
  { id: 5, name: '정우성', class: 'B반', status: 'present', time: '13:55', state: 2 },
  { id: 6, name: '송지효', class: 'B반', status: 'present', time: '13:59', state: 1 },
  { id: 7, name: '강다니엘', class: 'B반', status: 'excused', time: null, state: 3, reason: '병원' },
  { id: 8, name: '임나영', class: 'B반', status: 'present', time: '14:01', state: 2 },
];

const MOCK_CLASSES = ['전체', 'A반', 'B반', 'C반'];

// ============================================
// STATS CARDS
// ============================================
const StatsCards = memo(function StatsCards({ students }) {
  const stats = useMemo(() => {
    const total = students.length;
    const present = students.filter(s => s.status === 'present').length;
    const absent = students.filter(s => s.status === 'absent').length;
    const late = students.filter(s => s.status === 'late').length;
    const rate = total > 0 ? ((present / total) * 100).toFixed(1) : 0;
    
    return { total, present, absent, late, rate };
  }, [students]);
  
  return (
    <div className="grid grid-cols-5 gap-4 mb-6">
      {[
        { label: '전체', value: stats.total, color: 'gray', suffix: '명' },
        { label: '출석', value: stats.present, color: 'emerald', suffix: '명' },
        { label: '결석', value: stats.absent, color: 'red', suffix: '명' },
        { label: '지각', value: stats.late, color: 'yellow', suffix: '명' },
        { label: '출석률', value: stats.rate, color: 'cyan', suffix: '%' },
      ].map((stat, idx) => (
        <div key={idx} className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
          <p className="text-gray-400 text-sm mb-1">{stat.label}</p>
          <p className={`text-2xl font-bold text-${stat.color}-400`}>
            {stat.value}<span className="text-sm text-gray-500">{stat.suffix}</span>
          </p>
        </div>
      ))}
    </div>
  );
});

// ============================================
// QR CHECK-IN
// ============================================
const QRCheckIn = memo(function QRCheckIn({ onCheckIn }) {
  const [showQR, setShowQR] = useState(false);
  
  return (
    <div className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 rounded-2xl p-6 border border-cyan-500/20 mb-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">📱 QR 출석 체크</h3>
          <p className="text-gray-400 text-sm">QR 코드를 스캔하여 출석을 체크합니다</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowQR(true)}
            className="px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg font-medium hover:bg-cyan-500/30 transition-colors"
          >
            📷 QR 스캔
          </button>
          <button
            onClick={onCheckIn}
            className="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg font-medium hover:bg-purple-500/30 transition-colors"
          >
            ✋ 수동 체크
          </button>
        </div>
      </div>
      
      {showQR && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="mt-4 p-4 bg-gray-900/50 rounded-xl text-center"
        >
          <div className="w-48 h-48 mx-auto bg-white rounded-xl flex items-center justify-center mb-3">
            <span className="text-6xl">📱</span>
          </div>
          <p className="text-gray-400 text-sm">QR 코드를 카메라에 비춰주세요</p>
          <button
            onClick={() => setShowQR(false)}
            className="mt-3 text-sm text-gray-500 hover:text-white"
          >
            닫기
          </button>
        </motion.div>
      )}
    </div>
  );
});

// ============================================
// STUDENT ROW
// ============================================
const StudentRow = memo(function StudentRow({ student, onStatusChange }) {
  const status = ATTENDANCE_STATUS[student.status];
  
  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="border-b border-gray-700/50 hover:bg-gray-800/30"
    >
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg bg-gray-700 flex items-center justify-center text-sm`}>
            {student.name[0]}
          </div>
          <div>
            <p className="text-white font-medium">{student.name}</p>
            <p className="text-gray-500 text-xs">{student.class}</p>
          </div>
        </div>
      </td>
      <td className="py-3 px-4">
        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-${status.color}-500/20 text-${status.color}-400`}>
          {status.icon} {status.label}
        </span>
      </td>
      <td className="py-3 px-4 text-gray-400">
        {student.time || '-'}
      </td>
      <td className="py-3 px-4">
        <span className={`px-2 py-1 rounded text-xs ${
          student.state <= 2 ? 'bg-emerald-500/20 text-emerald-400' :
          student.state <= 4 ? 'bg-yellow-500/20 text-yellow-400' :
          'bg-red-500/20 text-red-400'
        }`}>
          State {student.state}
        </span>
      </td>
      <td className="py-3 px-4">
        <div className="flex gap-2">
          {Object.entries(ATTENDANCE_STATUS).slice(0, 3).map(([key, { icon }]) => (
            <button
              key={key}
              onClick={() => onStatusChange(student.id, key)}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                student.status === key
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'bg-gray-800 text-gray-500 hover:text-white'
              }`}
            >
              {icon}
            </button>
          ))}
        </div>
      </td>
    </motion.tr>
  );
});

// ============================================
// ATTENDANCE TABLE
// ============================================
const AttendanceTable = memo(function AttendanceTable({ students, onStatusChange }) {
  return (
    <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-700/50 text-left">
            <th className="py-3 px-4 text-gray-400 font-medium">학생</th>
            <th className="py-3 px-4 text-gray-400 font-medium">출결</th>
            <th className="py-3 px-4 text-gray-400 font-medium">체크인 시간</th>
            <th className="py-3 px-4 text-gray-400 font-medium">State</th>
            <th className="py-3 px-4 text-gray-400 font-medium">변경</th>
          </tr>
        </thead>
        <tbody>
          {students.map((student) => (
            <StudentRow
              key={student.id}
              student={student}
              onStatusChange={onStatusChange}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
});

// ============================================
// ATTENDANCE HISTORY
// ============================================
const AttendanceHistory = memo(function AttendanceHistory() {
  const history = [
    { date: '2024-01-24', present: 35, absent: 2, late: 1, rate: 92.1 },
    { date: '2024-01-23', present: 37, absent: 1, late: 0, rate: 97.4 },
    { date: '2024-01-22', present: 36, absent: 1, late: 1, rate: 94.7 },
    { date: '2024-01-19', present: 38, absent: 0, late: 0, rate: 100 },
    { date: '2024-01-18', present: 35, absent: 3, late: 0, rate: 92.1 },
  ];
  
  return (
    <div className="bg-gray-800/50 rounded-2xl p-6 border border-gray-700/50">
      <h3 className={`${TOKENS.type.h2} text-white mb-4`}>📊 출결 이력</h3>
      
      <div className="space-y-3">
        {history.map((day, idx) => (
          <div key={idx} className="flex items-center gap-4 p-3 bg-gray-900/50 rounded-xl">
            <span className="text-gray-400 w-24">{day.date.slice(5)}</span>
            <div className="flex-1">
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden flex">
                <div 
                  className="bg-emerald-500" 
                  style={{ width: `${(day.present / 38) * 100}%` }}
                />
                <div 
                  className="bg-red-500" 
                  style={{ width: `${(day.absent / 38) * 100}%` }}
                />
                <div 
                  className="bg-yellow-500" 
                  style={{ width: `${(day.late / 38) * 100}%` }}
                />
              </div>
            </div>
            <span className={`w-16 text-right font-medium ${
              day.rate >= 95 ? 'text-emerald-400' : day.rate >= 90 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {day.rate}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
});

// ============================================
// MAIN ATTENDANCE PAGE
// ============================================
export default function AttendancePage() {
  const [students, setStudents] = useState(MOCK_STUDENTS);
  const [selectedClass, setSelectedClass] = useState('전체');
  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredStudents = useMemo(() => {
    let result = students;
    
    if (selectedClass !== '전체') {
      result = result.filter(s => s.class === selectedClass);
    }
    
    if (searchQuery) {
      result = result.filter(s => 
        s.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return result;
  }, [students, selectedClass, searchQuery]);
  
  const handleStatusChange = (studentId, newStatus) => {
    setStudents(students.map(s => 
      s.id === studentId 
        ? { ...s, status: newStatus, time: newStatus === 'present' ? new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : s.time }
        : s
    ));
  };
  
  const handleManualCheckIn = () => {
    // TODO: Open manual check-in modal
    alert('수동 체크인 모달');
  };
  
  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className={`${TOKENS.type.h1} text-white`}>📋 출결 관리</h1>
          <p className="text-gray-500 mt-1">
            {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
          </p>
        </div>
        <button className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg font-medium">
          📤 내보내기
        </button>
      </div>
      
      {/* Stats */}
      <StatsCards students={filteredStudents} />
      
      {/* QR Check-in */}
      <QRCheckIn onCheckIn={handleManualCheckIn} />
      
      {/* Filters */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex gap-2">
          {MOCK_CLASSES.map((cls) => (
            <button
              key={cls}
              onClick={() => setSelectedClass(cls)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedClass === cls
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {cls}
            </button>
          ))}
        </div>
        
        <div className="flex-1" />
        
        <input
          type="text"
          placeholder="🔍 학생 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-cyan-500 focus:outline-none w-64"
        />
      </div>
      
      {/* Main Content */}
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2">
          <AttendanceTable
            students={filteredStudents}
            onStatusChange={handleStatusChange}
          />
        </div>
        <div>
          <AttendanceHistory />
        </div>
      </div>
    </div>
  );
}
