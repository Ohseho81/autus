/**
 * 🏀 올댓바스켓 - 선수 관리 뷰 (CRUD 완전체)
 * 필드: 이름, 연락처, 학부모이름, 학교, 연생, 학년, 셔틀유무, 수업명,
 *       수업일시, 주 수업 횟수, 유니폼 백넘버, 수납현황, 미수금, 출석률
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Search, Edit2, Trash2, X, Check, ChevronDown,
  User, Phone, School, Calendar, Bus, CreditCard,
  AlertTriangle, TrendingUp, Filter, Download, Upload
} from 'lucide-react';

// ============================================
// 선수 폼 (추가/수정 공용)
// ============================================
const StudentForm = ({ student, classes, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: student?.name || '',
    phone: student?.phone || '',
    parent_name: student?.parent_name || '',
    parent_phone: student?.parent_phone || '',
    school: student?.school || '',
    birth_year: student?.birth_year || new Date().getFullYear() - 10,
    grade: student?.grade || '',
    shuttle_required: student?.shuttle_required || false,
    class_id: student?.class_id || '',
    class_name: student?.class_name || '',
    schedule_days: student?.schedule_days || '',
    schedule_time: student?.schedule_time || '',
    sessions_per_week: student?.sessions_per_week || 2,
    uniform_number: student?.uniform_number || '',
    position: student?.position || 'PG',
    monthly_fee: student?.monthly_fee || 350000,
    notes: student?.notes || '',
  });

  const [errors, setErrors] = useState({});

  const positions = ['PG', 'SG', 'SF', 'PF', 'C'];
  const grades = ['초1', '초2', '초3', '초4', '초5', '초6', '중1', '중2', '중3', '고1', '고2', '고3'];

  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = '이름을 입력하세요';
    if (!formData.parent_phone.trim()) errs.parent_phone = '학부모 연락처를 입력하세요';
    if (!formData.class_name && !formData.class_id) errs.class_name = '수업을 선택하세요';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSave(formData);
    }
  };

  const handleClassSelect = (cls) => {
    setFormData({
      ...formData,
      class_id: cls.id,
      class_name: cls.name,
      schedule_days: cls.schedule_days,
      schedule_time: cls.schedule_time,
      sessions_per_week: cls.sessions_per_week,
      monthly_fee: cls.monthly_fee,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.8)' }}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl p-6"
        style={{ background: '#1A1A2E' }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">
            {student ? '선수 정보 수정' : '새 선수 등록'}
          </h2>
          <button onClick={onCancel} className="p-2 rounded-lg hover:bg-white/10">
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 기본 정보 */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <User size={14} /> 기본 정보
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">이름 *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg bg-white/5 border text-white text-sm ${
                    errors.name ? 'border-red-500' : 'border-white/10'
                  }`}
                  placeholder="홍길동"
                />
                {errors.name && <p className="text-xs text-red-400 mt-1">{errors.name}</p>}
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">연락처</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm"
                  placeholder="010-0000-0000"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">학부모 이름</label>
                <input
                  type="text"
                  value={formData.parent_name}
                  onChange={(e) => setFormData({ ...formData, parent_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm"
                  placeholder="학부모 성함"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">학부모 연락처 *</label>
                <input
                  type="tel"
                  value={formData.parent_phone}
                  onChange={(e) => setFormData({ ...formData, parent_phone: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg bg-white/5 border text-white text-sm ${
                    errors.parent_phone ? 'border-red-500' : 'border-white/10'
                  }`}
                  placeholder="010-0000-0000"
                />
                {errors.parent_phone && <p className="text-xs text-red-400 mt-1">{errors.parent_phone}</p>}
              </div>
            </div>
          </div>

          {/* 학교 정보 */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <School size={14} /> 학교 정보
            </h3>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">학교</label>
                <input
                  type="text"
                  value={formData.school}
                  onChange={(e) => setFormData({ ...formData, school: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm"
                  placeholder="학교명"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">출생년도</label>
                <input
                  type="number"
                  value={formData.birth_year}
                  onChange={(e) => setFormData({ ...formData, birth_year: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm"
                  min={2000}
                  max={2025}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">학년</label>
                <select
                  value={formData.grade}
                  onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm"
                >
                  <option value="">선택</option>
                  {grades.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 수업 정보 */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-400 flex items-center gap-2">
              <Calendar size={14} /> 수업 정보
            </h3>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">수업 선택 *</label>
              <div className="grid grid-cols-1 gap-2">
                {classes.map(cls => (
                  <button
                    key={cls.id}
                    type="button"
                    onClick={() => handleClassSelect(cls)}
                    className={`p-3 rounded-lg text-left transition-all ${
                      formData.class_id === cls.id
                        ? 'bg-orange-500/20 border-orange-500'
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    } border`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="text-white font-medium">{cls.name}</span>
                      <span className="text-orange-400 text-sm">{cls.monthly_fee?.toLocaleString()}원/월</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      {cls.schedule_days} {cls.schedule_time} (주 {cls.sessions_per_week}회)
                    </p>
                  </button>
                ))}
              </div>
              {errors.class_name && <p className="text-xs text-red-400 mt-1">{errors.class_name}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">포지션</label>
                <select
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm"
                >
                  {positions.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">유니폼 백넘버</label>
                <input
                  type="number"
                  value={formData.uniform_number}
                  onChange={(e) => setFormData({ ...formData, uniform_number: parseInt(e.target.value) || '' })}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm"
                  placeholder="00"
                  min={0}
                  max={99}
                />
              </div>
            </div>
          </div>

          {/* 셔틀 */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
            <div className="flex items-center gap-2">
              <Bus size={16} className="text-gray-400" />
              <span className="text-white text-sm">셔틀 이용</span>
            </div>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, shuttle_required: !formData.shuttle_required })}
              className={`w-12 h-6 rounded-full transition-all ${
                formData.shuttle_required ? 'bg-orange-500' : 'bg-gray-600'
              }`}
            >
              <motion.div
                className="w-5 h-5 rounded-full bg-white shadow-md"
                animate={{ x: formData.shuttle_required ? 26 : 2 }}
              />
            </button>
          </div>

          {/* 메모 */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">메모</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm resize-none"
              rows={2}
              placeholder="특이사항..."
            />
          </div>

          {/* 버튼 */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-3 rounded-xl bg-white/10 text-gray-400 font-medium hover:bg-white/20"
            >
              취소
            </button>
            <button
              type="submit"
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-medium"
            >
              {student ? '수정 완료' : '등록하기'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

// ============================================
// 선수 상세 모달
// ============================================
const StudentDetailModal = ({ student, onClose, onEdit }) => {
  if (!student) return null;

  const paymentStatus = {
    paid: { label: '완납', color: 'text-green-400', bg: 'bg-green-500/20' },
    partial: { label: '부분납', color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
    overdue: { label: '미납', color: 'text-red-400', bg: 'bg-red-500/20' },
    pending: { label: '대기', color: 'text-gray-400', bg: 'bg-gray-500/20' },
  };

  const status = paymentStatus[student.payment_status] || paymentStatus.pending;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.8)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="w-full max-w-md rounded-2xl p-6"
        style={{ background: '#1A1A2E' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center">
              <span className="text-xl">🏀</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{student.name}</h2>
              <p className="text-sm text-gray-400">{student.class_name} • #{student.uniform_number}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10">
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <div className="space-y-4">
          {/* V-Index & Risk */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
              <p className="text-xs text-gray-400">V-Index</p>
              <p className="text-2xl font-bold text-cyan-400">
                {student.vIndexResult?.v_index?.toLocaleString() || 0}
              </p>
            </div>
            <div className={`p-4 rounded-xl ${
              student.riskResult?.risk_level === 'HIGH' ? 'bg-red-500/10 border-red-500/30' :
              student.riskResult?.risk_level === 'MEDIUM' ? 'bg-yellow-500/10 border-yellow-500/30' :
              'bg-green-500/10 border-green-500/30'
            } border`}>
              <p className="text-xs text-gray-400">이탈 위험도</p>
              <p className={`text-2xl font-bold ${
                student.riskResult?.risk_level === 'HIGH' ? 'text-red-400' :
                student.riskResult?.risk_level === 'MEDIUM' ? 'text-yellow-400' :
                'text-green-400'
              }`}>
                {student.riskResult?.risk_level || 'LOW'}
              </p>
            </div>
          </div>

          {/* 기본 정보 */}
          <div className="space-y-2">
            <InfoRow label="학부모" value={`${student.parent_name || '-'} (${student.parent_phone || '-'})`} />
            <InfoRow label="학교" value={`${student.school || '-'} ${student.grade || ''}`} />
            <InfoRow label="출생년도" value={student.birth_year || '-'} />
            <InfoRow label="수업" value={`${student.class_name} (${student.schedule_days} ${student.schedule_time})`} />
            <InfoRow label="주 수업" value={`${student.sessions_per_week}회`} />
            <InfoRow label="셔틀" value={student.shuttle_required ? '이용' : '미이용'} />
          </div>

          {/* 수납/출석 */}
          <div className="p-4 rounded-xl bg-white/5 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">수납 현황</span>
              <span className={`px-2 py-1 rounded-full text-xs ${status.bg} ${status.color}`}>
                {status.label}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">월 수업료</span>
              <span className="text-white font-medium">{student.monthly_fee?.toLocaleString()}원</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">미수금</span>
              <span className={`font-medium ${student.total_outstanding > 0 ? 'text-red-400' : 'text-green-400'}`}>
                {student.total_outstanding?.toLocaleString() || 0}원
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">분기 출석률</span>
              <span className="text-white font-medium">{student.quarterly_attendance_rate || 0}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">누적 일별매출</span>
              <span className="text-cyan-400 font-medium">{student.total_daily_revenue?.toLocaleString() || 0}원</span>
            </div>
          </div>

          {/* 버튼 */}
          <div className="flex gap-3">
            <button
              onClick={() => onEdit(student)}
              className="flex-1 py-3 rounded-xl bg-white/10 text-white font-medium hover:bg-white/20 flex items-center justify-center gap-2"
            >
              <Edit2 size={16} />
              수정
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-medium"
            >
              확인
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const InfoRow = ({ label, value }) => (
  <div className="flex justify-between text-sm">
    <span className="text-gray-500">{label}</span>
    <span className="text-white">{value}</span>
  </div>
);

// ============================================
// 선수 카드 (리스트용)
// ============================================
const StudentListCard = ({ student, onClick, onEdit, onDelete }) => {
  const paymentStatus = {
    paid: { label: '완납', color: 'bg-green-500' },
    partial: { label: '부분납', color: 'bg-yellow-500' },
    overdue: { label: '미납', color: 'bg-red-500' },
    pending: { label: '대기', color: 'bg-gray-500' },
  };

  const status = paymentStatus[student.payment_status] || paymentStatus.pending;

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      className="p-4 rounded-xl cursor-pointer group"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div className="flex items-center gap-4" onClick={onClick}>
        {/* 백넘버 */}
        <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center shrink-0">
          <span className="text-orange-400 font-bold text-lg">#{student.uniform_number || '-'}</span>
        </div>

        {/* 정보 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white">{student.name}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">
              {student.position}
            </span>
            <span className={`w-2 h-2 rounded-full ${status.color}`} title={status.label} />
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
            <span>{student.class_name}</span>
            <span>•</span>
            <span>{student.grade}</span>
            <span>•</span>
            <span>출석 {student.attendance_rate}%</span>
          </div>
          <div className="flex items-center gap-3 mt-2 text-xs">
            <span className="text-gray-500">
              🏫 {student.school || '-'}
            </span>
            {student.shuttle_required && (
              <span className="text-purple-400">🚌 셔틀</span>
            )}
            {student.total_outstanding > 0 && (
              <span className="text-red-400">💰 {student.total_outstanding.toLocaleString()}원 미수</span>
            )}
          </div>
        </div>

        {/* V-Index */}
        <div className="text-right shrink-0">
          <p className="text-xs text-gray-500">V-Index</p>
          <p className="text-lg font-bold text-cyan-400">
            {student.vIndexResult?.v_index?.toLocaleString() || 0}
          </p>
        </div>
      </div>

      {/* 액션 버튼 (호버 시 표시) */}
      <div className="flex gap-2 mt-3 pt-3 border-t border-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(student); }}
          className="flex-1 py-2 rounded-lg bg-white/5 text-gray-400 text-sm hover:bg-white/10 flex items-center justify-center gap-1"
        >
          <Edit2 size={14} />
          수정
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(student); }}
          className="py-2 px-4 rounded-lg bg-red-500/10 text-red-400 text-sm hover:bg-red-500/20 flex items-center justify-center gap-1"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </motion.div>
  );
};

// ============================================
// 메인 컴포넌트
// ============================================
export default function StudentsView({ data }) {
  const { students, classes, addStudent, updateStudent } = data;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [showForm, setShowForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // 필터링 & 정렬
  const filteredStudents = useMemo(() => {
    let result = [...students];

    // 검색
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s =>
        s.name?.toLowerCase().includes(q) ||
        s.parent_name?.toLowerCase().includes(q) ||
        s.school?.toLowerCase().includes(q) ||
        s.parent_phone?.includes(q)
      );
    }

    // 반 필터
    if (selectedClass !== 'all') {
      result = result.filter(s => s.class_name === selectedClass);
    }

    // 정렬
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name': return a.name.localeCompare(b.name);
        case 'vindex': return (b.vIndexResult?.v_index || 0) - (a.vIndexResult?.v_index || 0);
        case 'risk': return (b.riskResult?.risk_score || 0) - (a.riskResult?.risk_score || 0);
        case 'attendance': return (b.attendance_rate || 0) - (a.attendance_rate || 0);
        case 'outstanding': return (b.total_outstanding || 0) - (a.total_outstanding || 0);
        default: return 0;
      }
    });

    return result;
  }, [students, searchQuery, selectedClass, sortBy]);

  // 통계
  const stats = useMemo(() => {
    const total = students.length;
    const withOutstanding = students.filter(s => s.total_outstanding > 0).length;
    const totalOutstanding = students.reduce((sum, s) => sum + (s.total_outstanding || 0), 0);
    const avgAttendance = total > 0
      ? Math.round(students.reduce((sum, s) => sum + (s.attendance_rate || 0), 0) / total)
      : 0;
    return { total, withOutstanding, totalOutstanding, avgAttendance };
  }, [students]);

  // 저장 핸들러
  const handleSave = async (formData) => {
    if (editingStudent) {
      await updateStudent(editingStudent.id, formData);
    } else {
      await addStudent(formData);
    }
    setShowForm(false);
    setEditingStudent(null);
  };

  // 삭제 핸들러 (실제로는 soft delete 권장)
  const handleDelete = async (student) => {
    // TODO: Implement delete with confirmation
    setDeleteConfirm(null);
  };

  const uniqueClasses = [...new Set(students.map(s => s.class_name).filter(Boolean))];

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">선수 관리</h1>
          <p className="text-gray-400 text-sm mt-1">
            총 {stats.total}명 • 평균 출석률 {stats.avgAttendance}%
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => { setEditingStudent(null); setShowForm(true); }}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-medium flex items-center gap-2"
        >
          <Plus size={18} />
          새 선수 등록
        </motion.button>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <p className="text-xs text-gray-500">총 재원생</p>
          <p className="text-xl font-bold text-white">{stats.total}명</p>
        </div>
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <p className="text-xs text-gray-500">미수금 학생</p>
          <p className="text-xl font-bold text-yellow-400">{stats.withOutstanding}명</p>
        </div>
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <p className="text-xs text-gray-500">총 미수금</p>
          <p className="text-xl font-bold text-red-400">{stats.totalOutstanding.toLocaleString()}원</p>
        </div>
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <p className="text-xs text-gray-500">평균 출석률</p>
          <p className="text-xl font-bold text-green-400">{stats.avgAttendance}%</p>
        </div>
      </div>

      {/* 검색 & 필터 */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px] relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="이름, 학부모, 학교, 연락처 검색..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm"
          />
        </div>
        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm"
        >
          <option value="all">전체 반</option>
          {uniqueClasses.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm"
        >
          <option value="name">이름순</option>
          <option value="vindex">V-Index순</option>
          <option value="risk">위험도순</option>
          <option value="attendance">출석률순</option>
          <option value="outstanding">미수금순</option>
        </select>
      </div>

      {/* 선수 목록 */}
      <div className="space-y-3">
        {filteredStudents.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            {searchQuery ? '검색 결과가 없습니다' : '등록된 선수가 없습니다'}
          </div>
        ) : (
          filteredStudents.map(student => (
            <StudentListCard
              key={student.id}
              student={student}
              onClick={() => setSelectedStudent(student)}
              onEdit={(s) => { setEditingStudent(s); setShowForm(true); }}
              onDelete={(s) => setDeleteConfirm(s)}
            />
          ))
        )}
      </div>

      {/* 폼 모달 */}
      <AnimatePresence>
        {showForm && (
          <StudentForm
            student={editingStudent}
            classes={classes}
            onSave={handleSave}
            onCancel={() => { setShowForm(false); setEditingStudent(null); }}
          />
        )}
      </AnimatePresence>

      {/* 상세 모달 */}
      <AnimatePresence>
        {selectedStudent && (
          <StudentDetailModal
            student={selectedStudent}
            onClose={() => setSelectedStudent(null)}
            onEdit={(s) => {
              setSelectedStudent(null);
              setEditingStudent(s);
              setShowForm(true);
            }}
          />
        )}
      </AnimatePresence>

      {/* 삭제 확인 */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.8)' }}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="w-full max-w-sm rounded-2xl p-6 text-center"
              style={{ background: '#1A1A2E' }}
            >
              <AlertTriangle size={48} className="text-red-400 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">선수 삭제</h3>
              <p className="text-gray-400 mb-6">
                <strong>{deleteConfirm.name}</strong> 선수를 정말 삭제하시겠습니까?<br />
                이 작업은 되돌릴 수 없습니다.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 py-3 rounded-xl bg-white/10 text-gray-400 font-medium"
                >
                  취소
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  className="flex-1 py-3 rounded-xl bg-red-500 text-white font-medium"
                >
                  삭제
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
