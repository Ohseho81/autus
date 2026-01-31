/**
 * 🏀 올댓바스켓 - 출석 관리 뷰
 * QR 체크인, 출결 현황, 분기/횟수별 출석률
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, Check, X, Clock, QrCode, Users,
  ChevronLeft, ChevronRight, Filter, Download,
  AlertCircle, TrendingUp, TrendingDown
} from 'lucide-react';

// ============================================
// 날짜 유틸
// ============================================
const getWeekDates = (date) => {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
};

const formatDate = (date) => {
  const d = new Date(date);
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

const formatDateFull = (date) => {
  const d = new Date(date);
  return d.toISOString().split('T')[0];
};

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

// ============================================
// 출석 상태 버튼
// ============================================
const AttendanceButton = ({ status, onClick, size = 'md' }) => {
  const config = {
    present: { icon: Check, color: 'bg-green-500', label: '출석' },
    absent: { icon: X, color: 'bg-red-500', label: '결석' },
    late: { icon: Clock, color: 'bg-yellow-500', label: '지각' },
    null: { icon: null, color: 'bg-gray-600', label: '-' },
  };

  const { icon: Icon, color, label } = config[status] || config.null;
  const sizes = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  };

  return (
    <button
      onClick={onClick}
      className={`${sizes[size]} rounded-lg ${color} flex items-center justify-center transition-all hover:opacity-80`}
      title={label}
    >
      {Icon ? <Icon size={size === 'sm' ? 12 : 16} className="text-white" /> : null}
    </button>
  );
};

// ============================================
// 학생 출석 행
// ============================================
const StudentAttendanceRow = ({ student, weekDates, attendanceData, onToggle }) => {
  const getAttendanceStatus = (date) => {
    const dateStr = formatDateFull(date);
    return attendanceData[student.id]?.[dateStr] || null;
  };

  const cycleStatus = (currentStatus) => {
    const cycle = [null, 'present', 'absent', 'late'];
    const currentIndex = cycle.indexOf(currentStatus);
    return cycle[(currentIndex + 1) % cycle.length];
  };

  return (
    <div className="flex items-center gap-2 p-3 rounded-xl bg-white/3 hover:bg-white/5">
      {/* 학생 정보 */}
      <div className="w-24 shrink-0">
        <p className="text-white font-medium text-sm truncate">{student.name}</p>
        <p className="text-xs text-gray-500">{student.class_name}</p>
      </div>

      {/* 출석률 */}
      <div className="w-16 shrink-0 text-center">
        <p className={`text-sm font-bold ${
          student.attendance_rate >= 90 ? 'text-green-400' :
          student.attendance_rate >= 70 ? 'text-yellow-400' : 'text-red-400'
        }`}>
          {student.attendance_rate || 0}%
        </p>
      </div>

      {/* 주간 출석 */}
      <div className="flex-1 flex justify-between gap-1">
        {weekDates.map(date => {
          const status = getAttendanceStatus(date);
          const dayNum = date.getDay();
          const scheduleDays = student.schedule_days?.split(',').map(d => d.trim()) || [];
          const isScheduled = scheduleDays.some(d =>
            DAY_NAMES.indexOf(d) === dayNum || d === DAY_NAMES[dayNum]
          );

          return (
            <div key={date.toISOString()} className="flex flex-col items-center gap-1">
              {isScheduled ? (
                <AttendanceButton
                  status={status}
                  onClick={() => onToggle(student.id, date, cycleStatus(status))}
                  size="sm"
                />
              ) : (
                <div className="w-6 h-6 rounded-lg bg-gray-800 opacity-30" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============================================
// 오늘 출석 체크 카드
// ============================================
const TodayCheckCard = ({ students, classes, onRecord }) => {
  const [selectedClass, setSelectedClass] = useState(classes[0]?.id || '');
  const today = new Date();
  const dayName = DAY_NAMES[today.getDay()];

  const classStudents = students.filter(s => {
    const cls = classes.find(c => c.id === selectedClass);
    if (!cls) return false;
    return s.class_name === cls.name && s.schedule_days?.includes(dayName);
  });

  return (
    <div className="p-6 rounded-2xl bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/20">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <QrCode size={20} className="text-orange-400" />
            오늘 출석 체크
          </h3>
          <p className="text-sm text-gray-400">
            {today.getMonth() + 1}월 {today.getDate()}일 ({dayName})
          </p>
        </div>
        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          className="px-3 py-2 rounded-lg bg-white/10 text-white text-sm border border-white/10"
        >
          {classes.map(cls => (
            <option key={cls.id} value={cls.id}>{cls.name}</option>
          ))}
        </select>
      </div>

      {classStudents.length === 0 ? (
        <p className="text-gray-500 text-center py-8">오늘 수업이 없습니다</p>
      ) : (
        <div className="space-y-2">
          {classStudents.map(student => (
            <div
              key={student.id}
              className="flex items-center justify-between p-3 rounded-xl bg-white/5"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center">
                  <span className="text-orange-400 font-bold text-sm">
                    #{student.uniform_number || '-'}
                  </span>
                </div>
                <div>
                  <p className="text-white font-medium">{student.name}</p>
                  <p className="text-xs text-gray-500">{student.position}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onRecord(student.id, selectedClass, 'present')}
                  className="px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 text-sm hover:bg-green-500/30"
                >
                  출석
                </button>
                <button
                  onClick={() => onRecord(student.id, selectedClass, 'late')}
                  className="px-3 py-1.5 rounded-lg bg-yellow-500/20 text-yellow-400 text-sm hover:bg-yellow-500/30"
                >
                  지각
                </button>
                <button
                  onClick={() => onRecord(student.id, selectedClass, 'absent')}
                  className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-sm hover:bg-red-500/30"
                >
                  결석
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================
// 메인 컴포넌트
// ============================================
export default function AttendanceView({ data }) {
  const { students, classes, recordAttendance } = data;

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedClass, setSelectedClass] = useState('all');
  const [attendanceData, setAttendanceData] = useState({});

  const weekDates = useMemo(() => getWeekDates(currentDate), [currentDate]);

  // 필터링된 학생
  const filteredStudents = useMemo(() => {
    if (selectedClass === 'all') return students;
    return students.filter(s => s.class_name === selectedClass);
  }, [students, selectedClass]);

  // 주간 통계
  const weekStats = useMemo(() => {
    let total = 0, present = 0, absent = 0, late = 0;

    Object.values(attendanceData).forEach(studentData => {
      Object.entries(studentData).forEach(([dateStr, status]) => {
        const date = new Date(dateStr);
        if (weekDates.some(d => formatDateFull(d) === dateStr)) {
          total++;
          if (status === 'present') present++;
          if (status === 'absent') absent++;
          if (status === 'late') late++;
        }
      });
    });

    return { total, present, absent, late };
  }, [attendanceData, weekDates]);

  // 출석 토글
  const handleToggle = (studentId, date, newStatus) => {
    const dateStr = formatDateFull(date);
    setAttendanceData(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [dateStr]: newStatus,
      },
    }));

    // Ledger에 기록
    if (newStatus) {
      recordAttendance(studentId, '', newStatus);
    }
  };

  // 출석 기록
  const handleRecord = async (studentId, classId, status) => {
    const result = await recordAttendance(studentId, classId, status);
    if (result.success) {
      const today = formatDateFull(new Date());
      setAttendanceData(prev => ({
        ...prev,
        [studentId]: {
          ...prev[studentId],
          [today]: status,
        },
      }));
    }
  };

  // 주 이동
  const goToPrevWeek = () => {
    const prev = new Date(currentDate);
    prev.setDate(prev.getDate() - 7);
    setCurrentDate(prev);
  };

  const goToNextWeek = () => {
    const next = new Date(currentDate);
    next.setDate(next.getDate() + 7);
    setCurrentDate(next);
  };

  const uniqueClasses = [...new Set(students.map(s => s.class_name).filter(Boolean))];

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-white">출석 관리</h1>
        <p className="text-gray-400 text-sm mt-1">
          V-Index에 반영되는 출결 기록 시스템
        </p>
      </div>

      {/* 오늘 출석 체크 */}
      <TodayCheckCard
        students={students}
        classes={classes}
        onRecord={handleRecord}
      />

      {/* 통계 */}
      <div className="grid grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <p className="text-xs text-gray-500">이번주 총 세션</p>
          <p className="text-xl font-bold text-white">{weekStats.total || '-'}</p>
        </div>
        <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
          <p className="text-xs text-gray-500">출석</p>
          <p className="text-xl font-bold text-green-400">{weekStats.present}</p>
        </div>
        <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
          <p className="text-xs text-gray-500">지각</p>
          <p className="text-xl font-bold text-yellow-400">{weekStats.late}</p>
        </div>
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
          <p className="text-xs text-gray-500">결석</p>
          <p className="text-xl font-bold text-red-400">{weekStats.absent}</p>
        </div>
      </div>

      {/* 주간 캘린더 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={goToPrevWeek}
            className="p-2 rounded-lg hover:bg-white/10"
          >
            <ChevronLeft size={20} className="text-white" />
          </button>
          <h3 className="text-lg font-semibold text-white">
            {currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월
          </h3>
          <button
            onClick={goToNextWeek}
            className="p-2 rounded-lg hover:bg-white/10"
          >
            <ChevronRight size={20} className="text-white" />
          </button>
        </div>
        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          className="px-4 py-2 rounded-lg bg-white/10 text-white text-sm border border-white/10"
        >
          <option value="all">전체 반</option>
          {uniqueClasses.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* 주간 출석표 */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)' }}>
        {/* 헤더 */}
        <div className="flex items-center gap-2 p-3 border-b border-white/10">
          <div className="w-24 shrink-0 text-xs text-gray-500 font-medium">선수</div>
          <div className="w-16 shrink-0 text-xs text-gray-500 font-medium text-center">출석률</div>
          <div className="flex-1 flex justify-between gap-1">
            {weekDates.map(date => (
              <div key={date.toISOString()} className="flex-1 text-center">
                <p className="text-xs text-gray-400">{DAY_NAMES[date.getDay()]}</p>
                <p className={`text-sm font-medium ${
                  formatDateFull(date) === formatDateFull(new Date())
                    ? 'text-orange-400'
                    : 'text-white'
                }`}>
                  {date.getDate()}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* 학생 행 */}
        <div className="divide-y divide-white/5">
          {filteredStudents.length === 0 ? (
            <p className="text-gray-500 text-center py-8">학생이 없습니다</p>
          ) : (
            filteredStudents.map(student => (
              <StudentAttendanceRow
                key={student.id}
                student={student}
                weekDates={weekDates}
                attendanceData={attendanceData}
                onToggle={handleToggle}
              />
            ))
          )}
        </div>
      </div>

      {/* 범례 */}
      <div className="flex items-center gap-6 justify-center text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-green-500" />
          <span className="text-gray-400">출석</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-yellow-500" />
          <span className="text-gray-400">지각</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-red-500" />
          <span className="text-gray-400">결석</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-gray-600" />
          <span className="text-gray-400">미입력</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-gray-800 opacity-30" />
          <span className="text-gray-400">수업 없음</span>
        </div>
      </div>
    </div>
  );
}
