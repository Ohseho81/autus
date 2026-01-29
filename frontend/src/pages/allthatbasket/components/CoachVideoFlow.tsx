/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 🏀 강사 세션 비디오 플로우 - 출석체크 + 영상 업로드 통합
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * 플로우: QR 스캔 → 세션 시작 → 영상 촬영 → 개별 전송
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  QrCode, Video, Camera, Upload, Check, Clock,
  Users, ChevronRight, Play, Pause, X, Send,
  CheckCircle, AlertCircle, RefreshCw
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

type FlowStep = 'idle' | 'qr_scan' | 'session_active' | 'video_record' | 'video_review' | 'session_end';

interface Student {
  id: string;
  name: string;
  avatar: string;
  hasVideo: boolean;
  videoUrl?: string;
  attendanceTime?: string;
}

interface SessionInfo {
  id: string;
  program: string;
  court: string;
  startTime: string;
  duration: number; // seconds
  students: Student[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// Mock Data
// ═══════════════════════════════════════════════════════════════════════════════

const mockStudents: Student[] = [
  { id: '1', name: '김민준', avatar: '🏀', hasVideo: false },
  { id: '2', name: '이서연', avatar: '⛹️', hasVideo: false },
  { id: '3', name: '박지훈', avatar: '🏀', hasVideo: false },
  { id: '4', name: '최예린', avatar: '⛹️', hasVideo: false },
  { id: '5', name: '정우성', avatar: '🏀', hasVideo: false },
];

const skillTags = [
  '드리블', '슈팅', '패스', '수비', '리바운드',
  '풋워크', '크로스오버', '레이업', '자세교정', '체력'
];

// ═══════════════════════════════════════════════════════════════════════════════
// Components
// ═══════════════════════════════════════════════════════════════════════════════

interface CoachVideoFlowProps {
  onBack?: () => void;
}

const CoachVideoFlow: React.FC<CoachVideoFlowProps> = ({ onBack }) => {
  const [currentStep, setCurrentStep] = useState<FlowStep>('idle');
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [students, setStudents] = useState<Student[]>(mockStudents);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [sessionTimer, setSessionTimer] = useState(0);

  // Session timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (currentStep === 'session_active' && session) {
      interval = setInterval(() => {
        setSessionTimer(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [currentStep, session]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleQRScan = () => {
    setCurrentStep('qr_scan');
    // Simulate QR scan
    setTimeout(() => {
      setSession({
        id: 'session-001',
        program: '주니어 드리블 마스터',
        court: 'A코트',
        startTime: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
        duration: 0,
        students: mockStudents,
      });
      setCurrentStep('session_active');
    }, 1500);
  };

  const handleStartRecording = (student: Student) => {
    setSelectedStudent(student);
    setSelectedTags([]);
    setCurrentStep('video_record');
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    setCurrentStep('video_review');
  };

  const handleSaveVideo = () => {
    if (selectedStudent) {
      setStudents(prev =>
        prev.map(s =>
          s.id === selectedStudent.id
            ? { ...s, hasVideo: true, attendanceTime: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) }
            : s
        )
      );
    }
    setSelectedStudent(null);
    setSelectedTags([]);
    setCurrentStep('session_active');
  };

  const handleEndSession = () => {
    setCurrentStep('session_end');
  };

  const completedCount = students.filter(s => s.hasVideo).length;
  const totalCount = students.length;

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-lg border-b border-white/10 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏀</span>
            <div>
              <h1 className="font-bold text-lg">강사 세션</h1>
              {session && (
                <p className="text-xs text-gray-400">{session.program} · {session.court}</p>
              )}
            </div>
          </div>
          {currentStep === 'session_active' && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 rounded-full">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-green-400 font-mono text-sm">{formatTime(sessionTimer)}</span>
            </div>
          )}
        </div>
      </header>

      <main className="p-4 pb-24">
        <AnimatePresence mode="wait">
          {/* Idle State */}
          {currentStep === 'idle' && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center justify-center min-h-[60vh] text-center"
            >
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center mb-6 shadow-lg shadow-orange-500/30">
                <QrCode size={64} className="text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-2">세션 시작하기</h2>
              <p className="text-gray-400 mb-8">QR 코드를 스캔하여 출석체크와<br />영상 촬영을 시작하세요</p>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleQRScan}
                className="px-8 py-4 rounded-2xl font-semibold text-lg"
                style={{ background: 'linear-gradient(135deg, #FF6B35 0%, #F7931E 100%)' }}
              >
                QR 스캔 시작
              </motion.button>
            </motion.div>
          )}

          {/* QR Scanning */}
          {currentStep === 'qr_scan' && (
            <motion.div
              key="qr_scan"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center min-h-[60vh]"
            >
              <div className="relative w-64 h-64 border-4 border-orange-500 rounded-3xl mb-6">
                <div className="absolute inset-0 flex items-center justify-center">
                  <RefreshCw size={48} className="text-orange-400 animate-spin" />
                </div>
                {/* Scanning animation */}
                <motion.div
                  className="absolute left-2 right-2 h-1 bg-orange-500 rounded-full"
                  animate={{ top: ['10%', '90%', '10%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                />
              </div>
              <p className="text-gray-400">QR 코드를 인식하는 중...</p>
            </motion.div>
          )}

          {/* Session Active */}
          {currentStep === 'session_active' && session && (
            <motion.div
              key="session_active"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {/* Session Info Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-500/20 to-red-600/10 border border-orange-500/30">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold">{session.program}</h3>
                    <p className="text-sm text-gray-400">{session.court} · {session.startTime} 시작</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-orange-400">{completedCount}/{totalCount}</div>
                    <p className="text-xs text-gray-400">영상 완료</p>
                  </div>
                </div>
                {/* Progress */}
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-orange-500 to-red-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${(completedCount / totalCount) * 100}%` }}
                  />
                </div>
              </div>

              {/* Students Grid */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Users size={20} className="text-orange-400" />
                  오늘의 선수들
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {students.map(student => (
                    <motion.button
                      key={student.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => !student.hasVideo && handleStartRecording(student)}
                      className={`p-4 rounded-xl text-left transition-all ${
                        student.hasVideo
                          ? 'bg-green-500/20 border border-green-500/30'
                          : 'bg-white/5 border border-white/10 hover:border-orange-500/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-2xl relative">
                          {student.avatar}
                          {student.hasVideo && (
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                              <Check size={12} className="text-white" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{student.name}</div>
                          {student.hasVideo ? (
                            <div className="text-xs text-green-400 flex items-center gap-1">
                              <Video size={12} /> 영상 완료
                            </div>
                          ) : (
                            <div className="text-xs text-gray-400">탭하여 촬영</div>
                          )}
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* End Session Button */}
              {completedCount === totalCount && (
                <motion.button
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleEndSession}
                  className="w-full py-4 rounded-2xl font-semibold text-lg bg-gradient-to-r from-green-500 to-emerald-600"
                >
                  세션 종료 및 전송
                </motion.button>
              )}
            </motion.div>
          )}

          {/* Video Recording */}
          {currentStep === 'video_record' && selectedStudent && (
            <motion.div
              key="video_record"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              {/* Camera Preview */}
              <div className="relative aspect-[9/16] bg-black rounded-2xl overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-slate-800 to-slate-900">
                  <Camera size={64} className="text-gray-600" />
                </div>
                {/* Student Info Overlay */}
                <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                  <div className="px-3 py-1.5 bg-black/50 rounded-full flex items-center gap-2">
                    <span className="text-lg">{selectedStudent.avatar}</span>
                    <span className="font-medium">{selectedStudent.name}</span>
                  </div>
                  {isRecording && (
                    <div className="px-3 py-1.5 bg-red-500/80 rounded-full flex items-center gap-2 animate-pulse">
                      <div className="w-2 h-2 bg-white rounded-full" />
                      <span className="text-sm font-medium">REC</span>
                    </div>
                  )}
                </div>
                {/* Close Button */}
                <button
                  onClick={() => {
                    setSelectedStudent(null);
                    setCurrentStep('session_active');
                  }}
                  className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/50 flex items-center justify-center"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Skill Tags */}
              <div>
                <h4 className="text-sm text-gray-400 mb-2">스킬 태그 선택</h4>
                <div className="flex flex-wrap gap-2">
                  {skillTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => setSelectedTags(prev =>
                        prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
                      )}
                      className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                        selectedTags.includes(tag)
                          ? 'bg-orange-500 text-white'
                          : 'bg-white/10 text-gray-300 hover:bg-white/20'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Record Button */}
              <div className="flex justify-center pt-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    if (!isRecording) {
                      setIsRecording(true);
                      // Simulate recording for 3 seconds
                      setTimeout(() => handleStopRecording(), 3000);
                    }
                  }}
                  className={`w-20 h-20 rounded-full flex items-center justify-center ${
                    isRecording
                      ? 'bg-red-500'
                      : 'bg-white border-4 border-gray-300'
                  }`}
                >
                  {isRecording ? (
                    <Pause size={32} className="text-white" />
                  ) : (
                    <div className="w-12 h-12 bg-red-500 rounded-full" />
                  )}
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* Video Review */}
          {currentStep === 'video_review' && selectedStudent && (
            <motion.div
              key="video_review"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-4"
            >
              <div className="relative aspect-[9/16] bg-black rounded-2xl overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-slate-800 to-slate-900">
                  <div className="text-center">
                    <Play size={64} className="text-white/50 mx-auto mb-2" />
                    <p className="text-gray-400">미리보기</p>
                  </div>
                </div>
                <div className="absolute top-4 left-4 px-3 py-1.5 bg-black/50 rounded-full flex items-center gap-2">
                  <span className="text-lg">{selectedStudent.avatar}</span>
                  <span className="font-medium">{selectedStudent.name}</span>
                </div>
              </div>

              {/* Selected Tags */}
              {selectedTags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedTags.map(tag => (
                    <span key={tag} className="px-3 py-1.5 bg-orange-500/20 text-orange-300 rounded-full text-sm">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setCurrentStep('video_record')}
                  className="py-4 rounded-xl bg-white/10 font-medium flex items-center justify-center gap-2"
                >
                  <RefreshCw size={20} />
                  다시 촬영
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSaveVideo}
                  className="py-4 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 font-medium flex items-center justify-center gap-2"
                >
                  <Check size={20} />
                  저장 및 전송
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* Session End */}
          {currentStep === 'session_end' && (
            <motion.div
              key="session_end"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center min-h-[60vh] text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.2 }}
                className="w-24 h-24 rounded-full bg-green-500 flex items-center justify-center mb-6"
              >
                <CheckCircle size={48} className="text-white" />
              </motion.div>
              <h2 className="text-2xl font-bold mb-2">세션 완료!</h2>
              <p className="text-gray-400 mb-6">
                {completedCount}명의 학생에게<br />영상이 전송되었습니다
              </p>
              <div className="bg-white/5 rounded-2xl p-4 w-full max-w-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400">세션 시간</span>
                  <span className="font-mono">{formatTime(sessionTimer)}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400">영상 촬영</span>
                  <span>{completedCount}개</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">전송 상태</span>
                  <span className="text-green-400 flex items-center gap-1">
                    <CheckCircle size={14} /> 완료
                  </span>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setCurrentStep('idle');
                  setSession(null);
                  setStudents(mockStudents.map(s => ({ ...s, hasVideo: false })));
                  setSessionTimer(0);
                }}
                className="mt-8 px-8 py-3 rounded-xl bg-white/10 font-medium"
              >
                새 세션 시작
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default CoachVideoFlow;
