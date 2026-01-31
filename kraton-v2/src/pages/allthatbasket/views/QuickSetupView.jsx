/**
 * 🏀 올댓바스켓 - 빠른 초기 설정
 * 학원에서 바로 사용할 수 있도록 데이터 입력 UI
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, BookOpen, Settings, Check, ChevronRight,
  Upload, Download, Plus, Trash2, Save, AlertCircle
} from 'lucide-react';

// ============================================
// 단계별 설정 컴포넌트
// ============================================
const STEPS = [
  { id: 'classes', title: '수업 등록', icon: BookOpen, description: '반 이름, 요일, 시간, 수강료 설정' },
  { id: 'students', title: '선수 등록', icon: Users, description: '선수 정보 일괄 등록' },
  { id: 'complete', title: '설정 완료', icon: Check, description: '시작할 준비 완료!' },
];

// ============================================
// 수업 등록 단계
// ============================================
const ClassesStep = ({ classes, setClasses, onNext }) => {
  const [newClass, setNewClass] = useState({
    name: '',
    schedule_days: '',
    schedule_time: '',
    sessions_per_week: 2,
    monthly_fee: 350000,
    max_students: 15,
  });

  const addNewClass = () => {
    if (!newClass.name) return;
    setClasses([...classes, { ...newClass, id: crypto.randomUUID() }]);
    setNewClass({
      name: '',
      schedule_days: '',
      schedule_time: '',
      sessions_per_week: 2,
      monthly_fee: 350000,
      max_students: 15,
    });
  };

  const removeClass = (id) => {
    setClasses(classes.filter(c => c.id !== id));
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">수업 등록</h2>
        <p className="text-gray-400">학원에서 운영하는 수업(반)을 등록하세요</p>
      </div>

      {/* 등록된 수업 목록 */}
      {classes.length > 0 && (
        <div className="space-y-3 mb-6">
          {classes.map((cls) => (
            <div
              key={cls.id}
              className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10"
            >
              <div>
                <p className="text-white font-medium">{cls.name}</p>
                <p className="text-sm text-gray-400">
                  {cls.schedule_days} {cls.schedule_time} • 주 {cls.sessions_per_week}회 • {cls.monthly_fee.toLocaleString()}원/월
                </p>
              </div>
              <button
                onClick={() => removeClass(cls.id)}
                className="p-2 rounded-lg hover:bg-red-500/20 text-red-400"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 새 수업 추가 폼 */}
      <div className="p-6 rounded-xl bg-white/5 border border-white/10 space-y-4">
        <h3 className="text-white font-medium mb-4">새 수업 추가</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">수업(반) 이름 *</label>
            <input
              type="text"
              value={newClass.name}
              onChange={(e) => setNewClass({ ...newClass, name: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-white"
              placeholder="예: A반 (주니어)"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">수업 요일</label>
            <input
              type="text"
              value={newClass.schedule_days}
              onChange={(e) => setNewClass({ ...newClass, schedule_days: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-white"
              placeholder="예: 월,수,금"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">수업 시간</label>
            <input
              type="time"
              value={newClass.schedule_time}
              onChange={(e) => setNewClass({ ...newClass, schedule_time: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-white"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">주 수업 횟수</label>
            <input
              type="number"
              value={newClass.sessions_per_week}
              onChange={(e) => setNewClass({ ...newClass, sessions_per_week: parseInt(e.target.value) })}
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-white"
              min={1}
              max={7}
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">월 수강료</label>
            <input
              type="number"
              value={newClass.monthly_fee}
              onChange={(e) => setNewClass({ ...newClass, monthly_fee: parseInt(e.target.value) })}
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-white"
              step={10000}
            />
          </div>
        </div>

        <button
          onClick={addNewClass}
          disabled={!newClass.name}
          className="w-full py-3 rounded-xl bg-orange-500/20 text-orange-400 font-medium flex items-center justify-center gap-2 hover:bg-orange-500/30 disabled:opacity-50"
        >
          <Plus size={18} />
          수업 추가
        </button>
      </div>

      <button
        onClick={onNext}
        disabled={classes.length === 0}
        className="w-full py-4 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50"
      >
        다음 단계
        <ChevronRight size={20} />
      </button>
    </div>
  );
};

// ============================================
// 선수 일괄 등록 단계
// ============================================
const StudentsStep = ({ students, setStudents, classes, onNext, onBack }) => {
  const [newStudent, setNewStudent] = useState({
    name: '',
    parent_phone: '',
    grade: '',
    class_id: classes[0]?.id || '',
    class_name: classes[0]?.name || '',
  });

  const addNewStudent = () => {
    if (!newStudent.name || !newStudent.parent_phone) return;
    const selectedClass = classes.find(c => c.id === newStudent.class_id);
    setStudents([...students, {
      ...newStudent,
      id: crypto.randomUUID(),
      class_name: selectedClass?.name || '',
      monthly_fee: selectedClass?.monthly_fee || 350000,
      schedule_days: selectedClass?.schedule_days || '',
      schedule_time: selectedClass?.schedule_time || '',
      sessions_per_week: selectedClass?.sessions_per_week || 2,
    }]);
    setNewStudent({
      name: '',
      parent_phone: '',
      grade: '',
      class_id: classes[0]?.id || '',
      class_name: classes[0]?.name || '',
    });
  };

  const removeStudent = (id) => {
    setStudents(students.filter(s => s.id !== id));
  };

  const grades = ['초1', '초2', '초3', '초4', '초5', '초6', '중1', '중2', '중3'];

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">선수 등록</h2>
        <p className="text-gray-400">현재 재원생을 등록하세요</p>
      </div>

      {/* 등록된 선수 목록 */}
      {students.length > 0 && (
        <div className="max-h-60 overflow-y-auto space-y-2 mb-6">
          {students.map((student) => (
            <div
              key={student.id}
              className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10"
            >
              <div>
                <p className="text-white font-medium">{student.name}</p>
                <p className="text-xs text-gray-400">
                  {student.class_name} • {student.grade} • {student.parent_phone}
                </p>
              </div>
              <button
                onClick={() => removeStudent(student.id)}
                className="p-2 rounded-lg hover:bg-red-500/20 text-red-400"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 새 선수 추가 폼 */}
      <div className="p-6 rounded-xl bg-white/5 border border-white/10 space-y-4">
        <h3 className="text-white font-medium">새 선수 추가 ({students.length}명 등록됨)</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">이름 *</label>
            <input
              type="text"
              value={newStudent.name}
              onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-white"
              placeholder="홍길동"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">학부모 연락처 *</label>
            <input
              type="tel"
              value={newStudent.parent_phone}
              onChange={(e) => setNewStudent({ ...newStudent, parent_phone: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-white"
              placeholder="010-0000-0000"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">학년</label>
            <select
              value={newStudent.grade}
              onChange={(e) => setNewStudent({ ...newStudent, grade: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-white"
            >
              <option value="">선택</option>
              {grades.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">수업(반)</label>
            <select
              value={newStudent.class_id}
              onChange={(e) => setNewStudent({ ...newStudent, class_id: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/10 text-white"
            >
              {classes.map(cls => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={addNewStudent}
          disabled={!newStudent.name || !newStudent.parent_phone}
          className="w-full py-3 rounded-xl bg-blue-500/20 text-blue-400 font-medium flex items-center justify-center gap-2 hover:bg-blue-500/30 disabled:opacity-50"
        >
          <Plus size={18} />
          선수 추가
        </button>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-4 rounded-xl bg-white/10 text-gray-400 font-medium"
        >
          이전
        </button>
        <button
          onClick={onNext}
          disabled={students.length === 0}
          className="flex-1 py-4 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50"
        >
          완료
          <Check size={20} />
        </button>
      </div>
    </div>
  );
};

// ============================================
// 완료 단계
// ============================================
const CompleteStep = ({ classes, students, onFinish }) => {
  return (
    <div className="text-center space-y-8">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center"
      >
        <Check size={48} className="text-white" />
      </motion.div>

      <div>
        <h2 className="text-2xl font-bold text-white mb-2">설정 완료!</h2>
        <p className="text-gray-400">올댓바스켓을 사용할 준비가 되었습니다</p>
      </div>

      <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto">
        <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
          <p className="text-3xl font-bold text-orange-400">{classes.length}</p>
          <p className="text-sm text-gray-400">등록된 수업</p>
        </div>
        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
          <p className="text-3xl font-bold text-blue-400">{students.length}</p>
          <p className="text-sm text-gray-400">등록된 선수</p>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-sm text-gray-500">이제 다음 기능을 사용할 수 있습니다:</p>
        <div className="text-left max-w-xs mx-auto space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <Check size={16} className="text-green-400" />
            선수 관리 (추가/수정/삭제)
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <Check size={16} className="text-green-400" />
            QR 출석 체크
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <Check size={16} className="text-green-400" />
            수납 관리 및 미수금 알림
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <Check size={16} className="text-green-400" />
            학부모 앱 연동
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <Check size={16} className="text-green-400" />
            V-Index 기반 성장 분석
          </div>
        </div>
      </div>

      <button
        onClick={onFinish}
        className="w-full max-w-xs mx-auto py-4 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold flex items-center justify-center gap-2"
      >
        시작하기 🏀
      </button>
    </div>
  );
};

// ============================================
// 메인 컴포넌트
// ============================================
export default function QuickSetupView({ onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);

  const handleFinish = async () => {
    // TODO: Save to Supabase
    console.log('Setup complete:', { classes, students });
    if (onComplete) {
      onComplete({ classes, students });
    }
  };

  return (
    <div className="min-h-screen p-6" style={{ background: 'linear-gradient(180deg, #0A0A1A 0%, #1A1A2E 100%)' }}>
      {/* 진행 표시 */}
      <div className="max-w-md mx-auto mb-8">
        <div className="flex items-center justify-between mb-4">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  index <= currentStep
                    ? 'bg-orange-500 text-white'
                    : 'bg-white/10 text-gray-500'
                }`}
              >
                {index < currentStep ? <Check size={18} /> : <step.icon size={18} />}
              </div>
              {index < STEPS.length - 1 && (
                <div className={`w-16 h-1 mx-2 rounded ${
                  index < currentStep ? 'bg-orange-500' : 'bg-white/10'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 단계별 컨텐츠 */}
      <div className="max-w-lg mx-auto">
        <AnimatePresence mode="wait">
          {currentStep === 0 && (
            <motion.div
              key="classes"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <ClassesStep
                classes={classes}
                setClasses={setClasses}
                onNext={() => setCurrentStep(1)}
              />
            </motion.div>
          )}
          {currentStep === 1 && (
            <motion.div
              key="students"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <StudentsStep
                students={students}
                setStudents={setStudents}
                classes={classes}
                onNext={() => setCurrentStep(2)}
                onBack={() => setCurrentStep(0)}
              />
            </motion.div>
          )}
          {currentStep === 2 && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
            >
              <CompleteStep
                classes={classes}
                students={students}
                onFinish={handleFinish}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
