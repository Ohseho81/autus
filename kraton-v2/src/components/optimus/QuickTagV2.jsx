/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ⚡ Quick Tag V2 - Optimus Console
 * 현장 데이터 벡터화 인터페이스
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, memo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const EMOTION_OPTIONS = [
  { value: 20, emoji: '😊', label: '매우 좋음', color: 'emerald', bg: 'bg-emerald-600/30', border: 'border-emerald-500' },
  { value: 10, emoji: '🙂', label: '좋음', color: 'green', bg: 'bg-green-600/30', border: 'border-green-500' },
  { value: -10, emoji: '😐', label: '보통', color: 'yellow', bg: 'bg-yellow-600/30', border: 'border-yellow-500' },
  { value: -20, emoji: '😟', label: '우려', color: 'red', bg: 'bg-red-600/30', border: 'border-red-500' },
];

const BOND_OPTIONS = [
  { value: 'strong', emoji: '🔗', label: '강함', color: 'emerald' },
  { value: 'normal', emoji: '⛓️', label: '보통', color: 'gray' },
  { value: 'cold', emoji: '🧊', label: '차가움', color: 'blue' },
];

const ISSUE_TRIGGERS = [
  { value: 'academic', emoji: '📚', label: '학업' },
  { value: 'financial', emoji: '💰', label: '비용' },
  { value: 'career', emoji: '🎯', label: '진로' },
  { value: 'attitude', emoji: '😤', label: '태도' },
  { value: 'schedule', emoji: '📅', label: '일정' },
  { value: 'competition', emoji: '🏆', label: '경쟁' },
];

// Mock 학생 데이터
const MOCK_STUDENTS = [
  { id: 's1', name: '김민수', s_index: 75, avatar: '👦', grade: '중2' },
  { id: 's2', name: '이서연', s_index: 82, avatar: '👧', grade: '고1' },
  { id: 's3', name: '박지훈', s_index: 45, avatar: '👦', grade: '중3' },
  { id: 's4', name: '최유진', s_index: 68, avatar: '👧', grade: '고2' },
  { id: 's5', name: '정현우', s_index: 35, avatar: '👦', grade: '중1' },
  { id: 's6', name: '강수아', s_index: 90, avatar: '👧', grade: '고3' },
  { id: 's7', name: '윤재민', s_index: 55, avatar: '👦', grade: '중2' },
  { id: 's8', name: '한소희', s_index: 72, avatar: '👧', grade: '고1' },
];

// 학생 카드 컴포넌트
const StudentCard = memo(function StudentCard({ student, isSelected, onClick }) {
  const sColor = student.s_index >= 70 ? 'emerald' : student.s_index >= 40 ? 'yellow' : 'red';
  
  return (
    <button
      onClick={onClick}
      className={`
        p-3 rounded-xl text-center transition-all
        ${isSelected
          ? 'bg-cyan-600/30 border-2 border-cyan-500 scale-105'
          : 'bg-gray-800/50 border border-gray-700 hover:border-gray-600'}
      `}
    >
      <div className="text-2xl mb-1">{student.avatar}</div>
      <p className="text-sm text-white truncate font-medium">{student.name}</p>
      <p className="text-xs text-gray-500">{student.grade}</p>
      <div className={`text-xs mt-1 text-${sColor}-400 font-mono`}>
        {student.s_index}%
      </div>
    </button>
  );
});

// 결과 표시 컴포넌트
const ResultDisplay = memo(function ResultDisplay({ result, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`
        p-4 rounded-xl
        ${result.success
          ? 'bg-emerald-900/30 border border-emerald-500/50'
          : 'bg-red-900/30 border border-red-500/50'}
      `}
    >
      {result.success ? (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-emerald-400 font-medium">✅ 태그 저장 완료</p>
            <button onClick={onClose} className="text-gray-500 hover:text-white">✕</button>
          </div>
          
          {result.new_s_index !== null && (
            <p className="text-cyan-400 text-sm">
              📊 새 s-index: {result.new_s_index}%
            </p>
          )}
          
          {result.risk_triggered && (
            <p className="text-orange-400 text-sm mt-1">
              ⚠️ 위험 신호 감지 → Risk Queue에 추가됨
            </p>
          )}
          
          {result.ai_analysis && (
            <div className="mt-2 p-2 bg-gray-900/50 rounded-lg">
              <p className="text-cyan-400 text-sm flex items-center gap-2">
                <span>🤖</span>
                <span>AI 분석: {result.ai_analysis.sentiment}</span>
                <span className="text-gray-500">
                  ({Math.round(result.ai_analysis.confidence * 100)}%)
                </span>
              </p>
              {result.ai_analysis.flags?.length > 0 && (
                <div className="flex gap-1 mt-1">
                  {result.ai_analysis.flags.map((flag, i) => (
                    <span key={i} className="px-2 py-0.5 bg-yellow-900/30 text-yellow-400 text-xs rounded">
                      {flag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <p className="text-red-400">❌ 저장 실패: {result.error}</p>
          <button onClick={onClose} className="text-gray-500 hover:text-white">✕</button>
        </div>
      )}
    </motion.div>
  );
});

// 메인 컴포넌트
export default function QuickTagV2({ orgId = 'demo', taggerId = 'user1' }) {
  const [students, setStudents] = useState(MOCK_STUDENTS);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [emotionDelta, setEmotionDelta] = useState(null);
  const [bondStrength, setBondStrength] = useState(null);
  const [issueTriggers, setIssueTriggers] = useState([]);
  const [voiceInsight, setVoiceInsight] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [recentTags, setRecentTags] = useState([]);

  // 최근 태그 조회
  useEffect(() => {
    // Mock 데이터
    setRecentTags([
      { id: 1, target: '김민수', emotion: 10, time: '10분 전' },
      { id: 2, target: '박지훈', emotion: -15, time: '25분 전' },
      { id: 3, target: '이서연', emotion: 20, time: '1시간 전' },
    ]);
  }, []);

  const handleToggleTrigger = useCallback((trigger) => {
    setIssueTriggers(prev =>
      prev.includes(trigger)
        ? prev.filter(t => t !== trigger)
        : [...prev, trigger]
    );
  }, []);

  const handleSubmit = async () => {
    if (!selectedStudent || emotionDelta === null || !bondStrength) return;

    setIsSubmitting(true);
    
    try {
      // Mock API 호출
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const mockResult = {
        success: true,
        log_id: 'log_' + Date.now(),
        new_s_index: Math.min(100, Math.max(0, selectedStudent.s_index + emotionDelta)),
        risk_triggered: emotionDelta <= -15 || bondStrength === 'cold',
        ai_analysis: voiceInsight ? {
          sentiment: emotionDelta > 0 ? 'positive' : emotionDelta < 0 ? 'negative' : 'neutral',
          confidence: 0.85,
          flags: emotionDelta < -10 ? ['주의 필요'] : [],
          risk_signals: bondStrength === 'cold' ? ['유대 관계 냉각'] : [],
        } : null,
      };
      
      setResult(mockResult);
      
      // 학생 s_index 업데이트
      setStudents(prev => prev.map(s => 
        s.id === selectedStudent.id
          ? { ...s, s_index: mockResult.new_s_index }
          : s
      ));
      
      // 최근 태그에 추가
      setRecentTags(prev => [{
        id: Date.now(),
        target: selectedStudent.name,
        emotion: emotionDelta,
        time: '방금 전',
      }, ...prev.slice(0, 4)]);

      // 3초 후 폼 리셋
      setTimeout(() => {
        setSelectedStudent(null);
        setEmotionDelta(null);
        setBondStrength(null);
        setIssueTriggers([]);
        setVoiceInsight('');
        setResult(null);
      }, 3000);
      
    } catch (error) {
      setResult({ success: false, error: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVoiceRecord = () => {
    setIsRecording(!isRecording);
    if (!isRecording) {
      // 녹음 시작 시뮬레이션
      setTimeout(() => {
        setVoiceInsight('학부모님께서 최근 성적 하락에 대해 걱정하고 계심. 다른 학원 알아보고 있다고 언급.');
        setIsRecording(false);
      }, 2000);
    }
  };

  const canSubmit = selectedStudent && emotionDelta !== null && bondStrength && !isSubmitting;

  return (
    <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            ⚡ Quick Tag
            <span className="text-xs text-gray-500 font-normal">Optimus Console</span>
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            s(t) = 만족도 지수 | 실시간 벡터 태깅
          </p>
        </div>
        
        <div className="text-right">
          <p className="text-2xl font-bold text-cyan-400">{recentTags.filter(t => t.time.includes('분')).length}</p>
          <p className="text-xs text-gray-500">tags/hour</p>
        </div>
      </div>

      {/* Step 1: 대상 선택 */}
      <div className="mb-6">
        <h3 className="text-sm text-gray-400 mb-3 flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-cyan-600/30 text-cyan-400 flex items-center justify-center text-xs">1</span>
          대상 선택
        </h3>
        <div className="grid grid-cols-4 gap-2">
          {students.map(student => (
            <StudentCard
              key={student.id}
              student={student}
              isSelected={selectedStudent?.id === student.id}
              onClick={() => setSelectedStudent(student)}
            />
          ))}
        </div>
      </div>

      {/* Step 2: 상태 태깅 */}
      <AnimatePresence>
        {selectedStudent && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6"
          >
            <h3 className="text-sm text-gray-400 mb-3 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-purple-600/30 text-purple-400 flex items-center justify-center text-xs">2</span>
              상태 태깅
              <span className="text-cyan-400 ml-2">{selectedStudent.name}</span>
            </h3>
            
            {/* 감정 상태 */}
            <div className="mb-4">
              <p className="text-xs text-gray-500 mb-2">감정 상태 (Δs)</p>
              <div className="flex gap-2">
                {EMOTION_OPTIONS.map(option => (
                  <button
                    key={option.value}
                    onClick={() => setEmotionDelta(option.value)}
                    className={`
                      flex-1 py-3 rounded-xl text-center transition-all
                      ${emotionDelta === option.value
                        ? `${option.bg} border-2 ${option.border}`
                        : 'bg-gray-800/50 border border-gray-700 hover:border-gray-600'}
                    `}
                  >
                    <span className="text-2xl">{option.emoji}</span>
                    <p className={`text-xs mt-1 ${emotionDelta === option.value ? `text-${option.color}-400` : 'text-gray-400'}`}>
                      {option.value > 0 ? '+' : ''}{option.value}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* 유대 강도 */}
            <div className="mb-4">
              <p className="text-xs text-gray-500 mb-2">유대 강도 (Bond)</p>
              <div className="flex gap-2">
                {BOND_OPTIONS.map(option => (
                  <button
                    key={option.value}
                    onClick={() => setBondStrength(option.value)}
                    className={`
                      flex-1 py-3 rounded-xl text-center transition-all
                      ${bondStrength === option.value
                        ? 'bg-purple-600/30 border-2 border-purple-500'
                        : 'bg-gray-800/50 border border-gray-700 hover:border-gray-600'}
                    `}
                  >
                    <span className="text-2xl">{option.emoji}</span>
                    <p className="text-xs text-gray-400 mt-1">{option.label}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* 이슈 트리거 */}
            <div className="mb-4">
              <p className="text-xs text-gray-500 mb-2">이슈 트리거</p>
              <div className="flex flex-wrap gap-2">
                {ISSUE_TRIGGERS.map(trigger => (
                  <button
                    key={trigger.value}
                    onClick={() => handleToggleTrigger(trigger.value)}
                    className={`
                      px-3 py-2 rounded-lg text-sm transition-all
                      ${issueTriggers.includes(trigger.value)
                        ? 'bg-orange-600/30 border border-orange-500 text-orange-300'
                        : 'bg-gray-800/50 border border-gray-700 text-gray-400 hover:border-gray-600'}
                    `}
                  >
                    {trigger.emoji} {trigger.label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Step 3: Voice-to-Insight */}
      <AnimatePresence>
        {selectedStudent && emotionDelta !== null && bondStrength && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6"
          >
            <h3 className="text-sm text-gray-400 mb-3 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-600/30 text-emerald-400 flex items-center justify-center text-xs">3</span>
              Voice-to-Insight
              <span className="text-xs text-gray-600">(선택)</span>
            </h3>
            <div className="relative">
              <textarea
                value={voiceInsight}
                onChange={(e) => setVoiceInsight(e.target.value)}
                placeholder="상담 내용을 입력하거나 음성으로 녹음하세요..."
                className="w-full h-24 p-4 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 resize-none focus:outline-none focus:border-cyan-500"
              />
              <button
                onClick={handleVoiceRecord}
                className={`
                  absolute right-3 bottom-3 p-2 rounded-lg transition-all
                  ${isRecording
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}
                `}
              >
                🎙️
              </button>
            </div>
            {isRecording && (
              <p className="text-red-400 text-sm mt-2 animate-pulse">
                🔴 녹음 중...
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 제출 버튼 */}
      <button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className={`
          w-full py-4 rounded-xl font-bold text-lg transition-all
          ${canSubmit
            ? 'bg-gradient-to-r from-cyan-600 to-purple-600 text-white hover:opacity-90'
            : 'bg-gray-800 text-gray-600 cursor-not-allowed'}
        `}
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center gap-2">
            <span className="animate-spin">⏳</span> 벡터화 중...
          </span>
        ) : (
          <span>👁️ 인지 데이터 저장</span>
        )}
      </button>

      {/* 결과 표시 */}
      <AnimatePresence>
        {result && (
          <div className="mt-4">
            <ResultDisplay result={result} onClose={() => setResult(null)} />
          </div>
        )}
      </AnimatePresence>

      {/* 최근 태그 */}
      <div className="mt-6 pt-6 border-t border-gray-700/50">
        <h3 className="text-sm text-gray-400 mb-3">📜 최근 태그</h3>
        <div className="space-y-2">
          {recentTags.map((tag) => (
            <div
              key={tag.id}
              className="flex items-center justify-between p-2 bg-gray-800/30 rounded-lg text-sm"
            >
              <div className="flex items-center gap-2">
                <span>{tag.emotion > 0 ? '😊' : tag.emotion < 0 ? '😟' : '😐'}</span>
                <span className="text-white">{tag.target}</span>
                <span className={`px-2 py-0.5 rounded text-xs ${
                  tag.emotion > 0 ? 'bg-emerald-900/30 text-emerald-400' :
                  tag.emotion < 0 ? 'bg-red-900/30 text-red-400' :
                  'bg-gray-900/30 text-gray-400'
                }`}>
                  {tag.emotion > 0 ? '+' : ''}{tag.emotion}
                </span>
              </div>
              <span className="text-gray-600 text-xs">{tag.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
