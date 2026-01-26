/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚗️ KRATON Chemistry Matching
 * 실무자-고객 최적 매칭 시스템 - 상성 데이터 분석
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, memo, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================
// MOCK DATA
// ============================================

const TEACHER_STYLES = {
  strict: { label: '엄격 관리형', icon: '📏', color: 'red', traits: ['규칙 중시', '명확한 피드백', '목표 지향'] },
  caring: { label: '칭찬 격려형', icon: '💝', color: 'pink', traits: ['긍정적 강화', '감정 케어', '신뢰 구축'] },
  analytical: { label: '분석 코칭형', icon: '📊', color: 'blue', traits: ['데이터 기반', '약점 분석', '전략적 접근'] },
  flexible: { label: '유연 적응형', icon: '🌊', color: 'cyan', traits: ['상황 대응', '학생 맞춤', '창의적 방법'] },
  mentor: { label: '멘토 상담형', icon: '🎓', color: 'purple', traits: ['진로 상담', '인생 조언', '롤모델'] },
};

const STUDENT_PERSONALITIES = {
  confident: { label: '자기주도형', icon: '🦁', color: 'orange', traits: ['자발적 학습', '목표 의식', '자기 관리'], bestMatch: ['strict', 'analytical'] },
  anxious: { label: '불안 예민형', icon: '🐰', color: 'pink', traits: ['걱정 많음', '완벽주의', '피드백 민감'], bestMatch: ['caring', 'flexible'] },
  passive: { label: '소극 수동형', icon: '🐢', color: 'green', traits: ['수동적', '동기 부족', '의존적'], bestMatch: ['caring', 'mentor'] },
  diligent: { label: '성실 노력형', icon: '🐝', color: 'yellow', traits: ['꾸준함', '책임감', '인내심'], bestMatch: ['strict', 'analytical'] },
  creative: { label: '창의 탐구형', icon: '🦋', color: 'purple', traits: ['호기심', '창의적', '비전통적'], bestMatch: ['flexible', 'mentor'] },
  rebellious: { label: '반항 독립형', icon: '🐺', color: 'gray', traits: ['독립심', '권위 도전', '자기 주장'], bestMatch: ['flexible', 'mentor'] },
};

const generateMockTeachers = () => [
  { id: 't1', name: '김선생', style: 'strict', experience: 8, rating: 4.5, activeStudents: 12, successRate: 0.82, avgSIndexDelta: 0.15, vCreated: 28500000 },
  { id: 't2', name: '이선생', style: 'caring', experience: 5, rating: 4.8, activeStudents: 15, successRate: 0.88, avgSIndexDelta: 0.22, vCreated: 34200000 },
  { id: 't3', name: '박선생', style: 'analytical', experience: 6, rating: 4.3, activeStudents: 10, successRate: 0.75, avgSIndexDelta: 0.12, vCreated: 21800000 },
  { id: 't4', name: '최선생', style: 'flexible', experience: 4, rating: 4.6, activeStudents: 8, successRate: 0.85, avgSIndexDelta: 0.18, vCreated: 19500000 },
  { id: 't5', name: '정선생', style: 'mentor', experience: 12, rating: 4.9, activeStudents: 6, successRate: 0.92, avgSIndexDelta: 0.25, vCreated: 42000000 },
];

const generateMockStudents = () => [
  { id: 's1', name: '오연우', personality: 'anxious', grade: '중2', currentTeacher: 't1', sIndex: 0.32, mScore: 45, status: 'at_risk' },
  { id: 's2', name: '김철수', personality: 'confident', grade: '중2', currentTeacher: 't1', sIndex: 0.78, mScore: 82, status: 'healthy' },
  { id: 's3', name: '이영희', personality: 'diligent', grade: '중3', currentTeacher: 't2', sIndex: 0.85, mScore: 88, status: 'healthy' },
  { id: 's4', name: '박민수', personality: 'passive', grade: '고1', currentTeacher: 't3', sIndex: 0.41, mScore: 52, status: 'warning' },
  { id: 's5', name: '최수진', personality: 'creative', grade: '중1', currentTeacher: 't4', sIndex: 0.68, mScore: 72, status: 'healthy' },
  { id: 's6', name: '한지민', personality: 'rebellious', grade: '고2', currentTeacher: null, sIndex: 0.55, mScore: 60, status: 'unassigned' },
];

const generateMatchHistory = () => [
  { teacher: '김선생 (엄격형)', student: '김철수 (자기주도형)', chemistry: 0.85, vCreated: 2450000, duration: '8개월', result: 'success' },
  { teacher: '이선생 (칭찬형)', student: '이영희 (성실형)', chemistry: 0.92, vCreated: 3120000, duration: '12개월', result: 'success' },
  { teacher: '김선생 (엄격형)', student: '오연우 (불안형)', chemistry: -0.35, vCreated: -180000, duration: '3개월', result: 'failed' },
  { teacher: '박선생 (분석형)', student: '박민수 (소극형)', chemistry: 0.28, vCreated: 450000, duration: '6개월', result: 'ongoing' },
  { teacher: '최선생 (유연형)', student: '최수진 (창의형)', chemistry: 0.78, vCreated: 1850000, duration: '5개월', result: 'success' },
  { teacher: '정선생 (멘토형)', student: '고3 진로상담', chemistry: 0.95, vCreated: 5200000, duration: '18개월', result: 'success' },
];

// ============================================
// UTILITY FUNCTIONS
// ============================================

const calculateChemistry = (teacherStyle, studentPersonality) => {
  const personality = STUDENT_PERSONALITIES[studentPersonality];
  if (!personality) return 0;
  
  const isOptimal = personality.bestMatch.includes(teacherStyle);
  const baseScore = isOptimal ? 0.7 : 0.3;
  const variance = (Math.random() - 0.5) * 0.3;
  
  return Math.max(-1, Math.min(1, baseScore + variance));
};

const predictVCreation = (chemistry, teacherVCreated, studentSIndex) => {
  const baseV = teacherVCreated / 10;
  const chemistryMultiplier = 1 + chemistry;
  const sIndexMultiplier = studentSIndex;
  
  return Math.round(baseV * chemistryMultiplier * sIndexMultiplier);
};

const formatCurrency = (value) => {
  if (value >= 1e6) return `₩${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `₩${(value / 1e3).toFixed(0)}K`;
  return `₩${value.toLocaleString()}`;
};

const getChemistryColor = (score) => {
  if (score >= 0.7) return 'text-emerald-400';
  if (score >= 0.4) return 'text-cyan-400';
  if (score >= 0) return 'text-yellow-400';
  return 'text-red-400';
};

const getChemistryBg = (score) => {
  if (score >= 0.7) return 'bg-emerald-500/20 border-emerald-500/50';
  if (score >= 0.4) return 'bg-cyan-500/20 border-cyan-500/50';
  if (score >= 0) return 'bg-yellow-500/20 border-yellow-500/50';
  return 'bg-red-500/20 border-red-500/50';
};

// ============================================
// SUB COMPONENTS
// ============================================

// Chemistry 게이지
const ChemistryGauge = memo(function ChemistryGauge({ score, size = 'normal' }) {
  const percentage = ((score + 1) / 2) * 100;
  const displayScore = (score * 100).toFixed(0);
  
  const sizeClasses = size === 'large' 
    ? 'w-32 h-32 text-2xl' 
    : 'w-20 h-20 text-lg';

  return (
    <div className={`relative ${sizeClasses} mx-auto`}>
      <svg className="w-full h-full transform -rotate-90">
        <circle
          cx="50%"
          cy="50%"
          r="45%"
          fill="none"
          stroke="#1f2937"
          strokeWidth="8"
        />
        <motion.circle
          cx="50%"
          cy="50%"
          r="45%"
          fill="none"
          stroke={score >= 0.7 ? '#10b981' : score >= 0.4 ? '#06b6d4' : score >= 0 ? '#eab308' : '#ef4444'}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${percentage * 2.83} 283`}
          initial={{ strokeDasharray: '0 283' }}
          animate={{ strokeDasharray: `${percentage * 2.83} 283` }}
          transition={{ duration: 1, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`font-bold ${getChemistryColor(score)}`}>
          {score > 0 ? '+' : ''}{displayScore}%
        </span>
      </div>
    </div>
  );
});

// Teacher 카드
const TeacherCard = memo(function TeacherCard({ teacher, selected, onClick }) {
  const style = TEACHER_STYLES[teacher.style];
  
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
        selected
          ? 'bg-blue-500/20 border-blue-500/50'
          : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
      }`}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center text-2xl">
          {style.icon}
        </div>
        <div>
          <h4 className="text-white font-medium">{teacher.name}</h4>
          <p className="text-gray-500 text-xs">{style.label}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 mb-3">
        {style.traits.map((trait, idx) => (
          <span key={idx} className="px-2 py-0.5 bg-gray-700/50 rounded text-[10px] text-gray-400">
            {trait}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 text-center text-xs">
        <div className="p-2 bg-gray-900/50 rounded-lg">
          <p className="text-emerald-400 font-mono">{(teacher.successRate * 100).toFixed(0)}%</p>
          <p className="text-gray-600">성공률</p>
        </div>
        <div className="p-2 bg-gray-900/50 rounded-lg">
          <p className="text-cyan-400 font-mono">+{(teacher.avgSIndexDelta * 100).toFixed(0)}%</p>
          <p className="text-gray-600">Δs 평균</p>
        </div>
      </div>
    </motion.div>
  );
});

// Student 카드
const StudentCard = memo(function StudentCard({ student, selected, onClick }) {
  const personality = STUDENT_PERSONALITIES[student.personality];
  const statusColors = {
    healthy: 'bg-emerald-500',
    warning: 'bg-yellow-500',
    at_risk: 'bg-red-500',
    unassigned: 'bg-gray-500',
  };
  
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
        selected
          ? 'bg-emerald-500/20 border-emerald-500/50'
          : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
      }`}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-2xl">
          {personality.icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="text-white font-medium">{student.name}</h4>
            <span className={`w-2 h-2 rounded-full ${statusColors[student.status]}`} />
          </div>
          <p className="text-gray-500 text-xs">{student.grade} · {personality.label}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 mb-3">
        {personality.traits.map((trait, idx) => (
          <span key={idx} className="px-2 py-0.5 bg-gray-700/50 rounded text-[10px] text-gray-400">
            {trait}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 text-center text-xs">
        <div className="p-2 bg-gray-900/50 rounded-lg">
          <p className={`font-mono ${student.sIndex < 0.5 ? 'text-red-400' : 'text-emerald-400'}`}>
            {(student.sIndex * 100).toFixed(0)}%
          </p>
          <p className="text-gray-600">s-Index</p>
        </div>
        <div className="p-2 bg-gray-900/50 rounded-lg">
          <p className="text-cyan-400 font-mono">{student.mScore}</p>
          <p className="text-gray-600">m-Score</p>
        </div>
      </div>

      <div className="mt-2 text-[10px] text-gray-500">
        Best Match: {personality.bestMatch.map(s => TEACHER_STYLES[s]?.label).join(', ')}
      </div>
    </motion.div>
  );
});

// Chemistry Matrix
const ChemistryMatrix = memo(function ChemistryMatrix({ teachers, students, onCellClick }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="p-2 text-left text-gray-500">학생 \ 선생님</th>
            {teachers.map(t => (
              <th key={t.id} className="p-2 text-center text-blue-400">
                {t.name}
                <div className="text-[9px] text-gray-500">{TEACHER_STYLES[t.style]?.label}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {students.map(s => (
            <tr key={s.id} className="border-t border-gray-800">
              <td className="p-2">
                <div className="text-white">{s.name}</div>
                <div className="text-[9px] text-gray-500">{STUDENT_PERSONALITIES[s.personality]?.label}</div>
              </td>
              {teachers.map(t => {
                const chemistry = calculateChemistry(t.style, s.personality);
                const isCurrentMatch = s.currentTeacher === t.id;
                
                return (
                  <td 
                    key={t.id} 
                    className="p-2 text-center cursor-pointer hover:bg-gray-800/50"
                    onClick={() => onCellClick(t, s, chemistry)}
                  >
                    <div className={`
                      inline-block px-2 py-1 rounded-lg text-xs font-mono
                      ${getChemistryBg(chemistry)}
                      ${isCurrentMatch ? 'ring-2 ring-white/30' : ''}
                    `}>
                      <span className={getChemistryColor(chemistry)}>
                        {chemistry > 0 ? '+' : ''}{(chemistry * 100).toFixed(0)}%
                      </span>
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});

// Match Recommendation
const MatchRecommendation = memo(function MatchRecommendation({ teacher, student, chemistry }) {
  if (!teacher || !student) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500">
        <div className="text-center">
          <span className="text-4xl">⚗️</span>
          <p className="mt-2">선생님과 학생을 선택하여<br/>Chemistry를 분석하세요</p>
        </div>
      </div>
    );
  }

  const teacherStyle = TEACHER_STYLES[teacher.style];
  const studentPersonality = STUDENT_PERSONALITIES[student.personality];
  const isOptimalMatch = studentPersonality.bestMatch.includes(teacher.style);
  const predictedV = predictVCreation(chemistry, teacher.vCreated, student.sIndex);
  const predictedSIndexDelta = teacher.avgSIndexDelta * (1 + chemistry);

  return (
    <div className="space-y-6">
      {/* Match Header */}
      <div className={`p-4 rounded-xl border ${getChemistryBg(chemistry)}`}>
        <div className="flex items-center justify-between mb-4">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            isOptimalMatch ? 'bg-emerald-500/30 text-emerald-400' : 'bg-yellow-500/30 text-yellow-400'
          }`}>
            {isOptimalMatch ? '✨ 최적 매칭' : '⚠️ 주의 필요'}
          </span>
          <ChemistryGauge score={chemistry} size="large" />
        </div>

        <div className="flex items-center justify-center gap-4">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center text-3xl mx-auto mb-2">
              {teacherStyle.icon}
            </div>
            <p className="text-white font-medium">{teacher.name}</p>
            <p className="text-gray-500 text-xs">{teacherStyle.label}</p>
          </div>
          
          <div className="flex flex-col items-center">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className={`text-2xl ${chemistry >= 0.5 ? '' : 'grayscale'}`}
            >
              {chemistry >= 0.7 ? '💕' : chemistry >= 0.4 ? '🤝' : chemistry >= 0 ? '😐' : '💔'}
            </motion.div>
            <div className={`mt-1 text-xs ${getChemistryColor(chemistry)}`}>
              Chemistry
            </div>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center text-3xl mx-auto mb-2">
              {studentPersonality.icon}
            </div>
            <p className="text-white font-medium">{student.name}</p>
            <p className="text-gray-500 text-xs">{studentPersonality.label}</p>
          </div>
        </div>
      </div>

      {/* Predictions */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
          <p className="text-gray-400 text-sm mb-2">예상 V 창출 (월)</p>
          <p className={`text-2xl font-bold ${predictedV > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {predictedV > 0 ? '+' : ''}{formatCurrency(predictedV)}
          </p>
        </div>
        <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
          <p className="text-gray-400 text-sm mb-2">예상 Δs-Index</p>
          <p className={`text-2xl font-bold ${predictedSIndexDelta > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {predictedSIndexDelta > 0 ? '+' : ''}{(predictedSIndexDelta * 100).toFixed(0)}%
          </p>
        </div>
      </div>

      {/* Analysis */}
      <div className="space-y-3">
        <h4 className="text-white font-medium flex items-center gap-2">
          <span className="text-purple-400">🤖</span>
          AI 분석
        </h4>
        
        <div className="p-3 bg-gray-800/50 rounded-lg">
          <p className="text-gray-400 text-sm mb-2">강점 시너지</p>
          {isOptimalMatch ? (
            <ul className="space-y-1 text-sm text-emerald-400">
              <li>• {teacherStyle.traits[0]}와 {studentPersonality.traits[0]} 조합 우수</li>
              <li>• 학생 성향에 맞는 교수 스타일</li>
              <li>• 장기 관계 유지 가능성 높음</li>
            </ul>
          ) : (
            <ul className="space-y-1 text-sm text-yellow-400">
              <li>• 스타일 불일치로 초기 적응 기간 필요</li>
              <li>• 추가 케어 리소스 투입 권장</li>
              <li>• 대체 선생님 검토 필요</li>
            </ul>
          )}
        </div>

        {chemistry < 0.5 && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-red-400 text-sm font-medium mb-2">⚠️ 위험 요소</p>
            <ul className="space-y-1 text-sm text-red-300">
              {chemistry < 0 && <li>• 높은 이탈 확률 (Churn Risk)</li>}
              <li>• 만족도 저하 가능성</li>
              <li>• 성과 목표 달성 어려움 예상</li>
            </ul>
          </div>
        )}

        {/* Alternative Recommendations */}
        <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
          <p className="text-purple-400 text-sm font-medium mb-2">💡 추천 대안</p>
          <p className="text-gray-300 text-sm">
            {student.name} 학생에게 최적의 선생님: <span className="text-cyan-400">
              {studentPersonality.bestMatch.map(s => TEACHER_STYLES[s]?.label).join(' 또는 ')}
            </span>
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button className="py-3 bg-cyan-500/20 text-cyan-400 rounded-xl text-sm font-medium hover:bg-cyan-500/30 transition-colors border border-cyan-500/30">
          시뮬레이션 저장
        </button>
        <button className="py-3 bg-emerald-500/20 text-emerald-400 rounded-xl text-sm font-medium hover:bg-emerald-500/30 transition-colors border border-emerald-500/30">
          매칭 실행
        </button>
      </div>
    </div>
  );
});

// Match History Table
const MatchHistoryTable = memo(function MatchHistoryTable({ history }) {
  return (
    <div className="space-y-2">
      {history.map((match, idx) => (
        <div 
          key={idx}
          className={`p-3 rounded-lg border ${
            match.result === 'success' ? 'bg-emerald-500/10 border-emerald-500/30' :
            match.result === 'failed' ? 'bg-red-500/10 border-red-500/30' :
            'bg-gray-800/50 border-gray-700/50'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-blue-400 text-sm">{match.teacher}</span>
              <span className="text-gray-600">↔</span>
              <span className="text-emerald-400 text-sm">{match.student}</span>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded ${
              match.result === 'success' ? 'bg-emerald-500/20 text-emerald-400' :
              match.result === 'failed' ? 'bg-red-500/20 text-red-400' :
              'bg-yellow-500/20 text-yellow-400'
            }`}>
              {match.result === 'success' ? '성공' : match.result === 'failed' ? '실패' : '진행중'}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Chemistry: <span className={getChemistryColor(match.chemistry)}>
              {match.chemistry > 0 ? '+' : ''}{(match.chemistry * 100).toFixed(0)}%
            </span></span>
            <span>기간: {match.duration}</span>
            <span className={match.vCreated > 0 ? 'text-emerald-400' : 'text-red-400'}>
              V: {match.vCreated > 0 ? '+' : ''}{formatCurrency(match.vCreated)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
});

// ============================================
// MAIN COMPONENT
// ============================================

export default function ChemistryMatching() {
  const [teachers] = useState(generateMockTeachers);
  const [students] = useState(generateMockStudents);
  const [matchHistory] = useState(generateMatchHistory);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [chemistry, setChemistry] = useState(null);
  const [viewMode, setViewMode] = useState('cards'); // cards, matrix

  // 매칭 분석
  const handleMatch = useCallback((teacher, student, chem = null) => {
    setSelectedTeacher(teacher);
    setSelectedStudent(student);
    const calculatedChemistry = chem ?? calculateChemistry(teacher.style, student.personality);
    setChemistry(calculatedChemistry);
  }, []);

  // 통계
  const stats = useMemo(() => ({
    totalMatches: matchHistory.length,
    successRate: matchHistory.filter(m => m.result === 'success').length / matchHistory.length,
    avgChemistry: matchHistory.reduce((acc, m) => acc + m.chemistry, 0) / matchHistory.length,
    totalVCreated: matchHistory.reduce((acc, m) => acc + m.vCreated, 0),
  }), [matchHistory]);

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <span className="text-3xl">⚗️</span>
              Chemistry Matching
            </h1>
            <p className="text-gray-400 mt-1">
              실무자-고객 최적 매칭 시스템 · 상성 데이터 분석
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                viewMode === 'cards'
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                  : 'bg-gray-800 text-gray-400 border border-gray-700'
              }`}
            >
              카드 뷰
            </button>
            <button
              onClick={() => setViewMode('matrix')}
              className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                viewMode === 'matrix'
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                  : 'bg-gray-800 text-gray-400 border border-gray-700'
              }`}
            >
              매트릭스 뷰
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
            <p className="text-gray-400 text-sm mb-2">총 매칭 이력</p>
            <p className="text-2xl font-bold text-white">{stats.totalMatches}</p>
          </div>
          <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
            <p className="text-gray-400 text-sm mb-2">평균 성공률</p>
            <p className="text-2xl font-bold text-emerald-400">{(stats.successRate * 100).toFixed(0)}%</p>
          </div>
          <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
            <p className="text-gray-400 text-sm mb-2">평균 Chemistry</p>
            <p className={`text-2xl font-bold ${getChemistryColor(stats.avgChemistry)}`}>
              {stats.avgChemistry > 0 ? '+' : ''}{(stats.avgChemistry * 100).toFixed(0)}%
            </p>
          </div>
          <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
            <p className="text-gray-400 text-sm mb-2">총 V 창출</p>
            <p className="text-2xl font-bold text-cyan-400">{formatCurrency(stats.totalVCreated)}</p>
          </div>
        </div>

        {/* Main Content */}
        {viewMode === 'matrix' ? (
          <div className="bg-gray-800/30 rounded-xl border border-gray-700/50 p-4">
            <h3 className="text-white font-medium mb-4">Chemistry Matrix</h3>
            <ChemistryMatrix 
              teachers={teachers} 
              students={students}
              onCellClick={(t, s, c) => handleMatch(t, s, c)}
            />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-6">
            {/* Teachers */}
            <div className="space-y-4">
              <h3 className="text-white font-medium flex items-center gap-2">
                <span className="text-blue-400">👨‍🏫</span>
                선생님 ({teachers.length})
              </h3>
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {teachers.map(teacher => (
                  <TeacherCard
                    key={teacher.id}
                    teacher={teacher}
                    selected={selectedTeacher?.id === teacher.id}
                    onClick={() => {
                      setSelectedTeacher(teacher);
                      if (selectedStudent) {
                        handleMatch(teacher, selectedStudent);
                      }
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Students */}
            <div className="space-y-4">
              <h3 className="text-white font-medium flex items-center gap-2">
                <span className="text-emerald-400">👨‍🎓</span>
                학생 ({students.length})
              </h3>
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {students.map(student => (
                  <StudentCard
                    key={student.id}
                    student={student}
                    selected={selectedStudent?.id === student.id}
                    onClick={() => {
                      setSelectedStudent(student);
                      if (selectedTeacher) {
                        handleMatch(selectedTeacher, student);
                      }
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Match Result */}
            <div className="bg-gray-800/30 rounded-xl border border-gray-700/50 p-4">
              <MatchRecommendation
                teacher={selectedTeacher}
                student={selectedStudent}
                chemistry={chemistry}
              />
            </div>
          </div>
        )}

        {/* Match History */}
        <div className="bg-gray-800/30 rounded-xl border border-gray-700/50 p-4">
          <h3 className="text-white font-medium mb-4 flex items-center gap-2">
            <span className="text-purple-400">📜</span>
            매칭 히스토리
          </h3>
          <MatchHistoryTable history={matchHistory} />
        </div>
      </div>
    </div>
  );
}
