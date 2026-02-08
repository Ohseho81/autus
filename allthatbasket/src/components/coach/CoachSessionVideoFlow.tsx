/**
 * 온리쌤 - 강사 세션 + 영상 통합 플로우
 *
 * 핵심 컨셉:
 * 1. QR 출석 = 세션 시작 = 영상 업로드 활성화
 * 2. 개인별 영상 → 개인에게 직접 전달 (팀 무관)
 * 3. 실시간 학부모 알림
 */

import React, { useState, useEffect } from 'react';

// ─────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────

interface Student {
  id: string;
  name: string;
  profileImage?: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'pro';
  hasVideo?: boolean;
  videoCount?: number;
}

interface Session {
  id: string;
  programName: string;
  courtName: string;
  startedAt: Date;
  expectedStudents: Student[];
  attendedStudents: Student[];
  videosUploaded: number;
  status: 'active' | 'completed';
}

interface VideoUpload {
  studentId: string;
  studentName: string;
  videoUrl: string;
  thumbnailUrl?: string;
  title: string;
  skillTags: string[];
  rating?: number;
  feedback?: string;
}

type FlowStep = 'idle' | 'qr_scan' | 'session_active' | 'video_record' | 'video_review' | 'session_end';

// ─────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    background: '#0D0D0D',
    color: '#FFFFFF',
    fontFamily: 'Pretendard, -apple-system, sans-serif',
  },
  header: {
    padding: '16px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: '18px',
    fontWeight: 600,
  },
  sessionBadge: {
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  content: {
    padding: '20px',
  },

  // QR Scan Screen
  qrContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '70vh',
    gap: '24px',
  },
  qrButton: {
    width: '200px',
    height: '200px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #FF4757, #FF6B7A)',
    border: 'none',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    cursor: 'pointer',
    boxShadow: '0 0 60px rgba(255, 71, 87, 0.4)',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  qrIcon: {
    fontSize: '48px',
  },
  qrText: {
    fontSize: '18px',
    fontWeight: 600,
    color: 'white',
  },

  // Session Active Screen
  sessionHeader: {
    background: 'rgba(255, 71, 87, 0.1)',
    border: '1px solid rgba(255, 71, 87, 0.3)',
    borderRadius: '16px',
    padding: '20px',
    marginBottom: '20px',
  },
  sessionInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  sessionTime: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#FF4757',
  },
  sessionStats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
  },
  statBox: {
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '12px',
    padding: '12px',
    textAlign: 'center' as const,
  },
  statValue: {
    fontSize: '24px',
    fontWeight: 700,
  },
  statLabel: {
    fontSize: '11px',
    color: '#8B949E',
    marginTop: '4px',
  },

  // Student List
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 600,
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  studentGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
    marginBottom: '24px',
  },
  studentCard: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '16px',
    padding: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  studentAvatar: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #FF4757, #FF6B7A)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    fontWeight: 600,
    position: 'relative' as const,
  },
  videoIndicator: {
    position: 'absolute' as const,
    bottom: '-2px',
    right: '-2px',
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    background: '#00D4AA',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '10px',
    border: '2px solid #0D0D0D',
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: '14px',
    fontWeight: 500,
    marginBottom: '4px',
  },
  studentLevel: {
    fontSize: '11px',
    padding: '2px 8px',
    borderRadius: '10px',
    display: 'inline-block',
  },
  recordButton: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: '#FF4757',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },

  // Video Recording Modal
  modal: {
    position: 'fixed' as const,
    inset: 0,
    background: 'rgba(0,0,0,0.95)',
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column' as const,
  },
  modalHeader: {
    padding: '16px 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
  },
  modalContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    padding: '20px',
  },
  videoPreview: {
    flex: 1,
    background: '#1A1A2E',
    borderRadius: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '20px',
    position: 'relative' as const,
  },
  recordingIndicator: {
    position: 'absolute' as const,
    top: '16px',
    left: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    background: 'rgba(255, 71, 87, 0.9)',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 600,
  },
  recordingDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#FFF',
    animation: 'pulse 1s infinite',
  },
  videoControls: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    marginBottom: '20px',
  },
  controlButton: {
    padding: '16px 32px',
    borderRadius: '12px',
    border: 'none',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },

  // Skill Tags
  skillTagsSection: {
    marginBottom: '20px',
  },
  skillTags: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '8px',
  },
  skillTag: {
    padding: '8px 16px',
    borderRadius: '20px',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },

  // End Session Button
  endSessionButton: {
    width: '100%',
    padding: '16px',
    borderRadius: '12px',
    border: '1px solid rgba(255, 71, 87, 0.5)',
    background: 'transparent',
    color: '#FF4757',
    fontSize: '16px',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },

  // Session Complete
  completeContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '70vh',
    gap: '24px',
    textAlign: 'center' as const,
  },
  completeIcon: {
    width: '100px',
    height: '100px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #00D4AA, #00F5C4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '48px',
  },
  completeTitle: {
    fontSize: '24px',
    fontWeight: 700,
  },
  completeSummary: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
    width: '100%',
    maxWidth: '300px',
  },
};

// ─────────────────────────────────────────────────────
// Level Colors
// ─────────────────────────────────────────────────────

const levelColors: { [key: string]: { bg: string; text: string } } = {
  beginner: { bg: 'rgba(0, 212, 170, 0.15)', text: '#00D4AA' },
  intermediate: { bg: 'rgba(124, 92, 255, 0.15)', text: '#7C5CFF' },
  advanced: { bg: 'rgba(255, 107, 0, 0.15)', text: '#FF6B00' },
  pro: { bg: 'rgba(255, 215, 0, 0.15)', text: '#FFD700' },
};

const levelNames: { [key: string]: string } = {
  beginner: '초급',
  intermediate: '중급',
  advanced: '상급',
  pro: '프로',
};

// ─────────────────────────────────────────────────────
// Skill Options
// ─────────────────────────────────────────────────────

const skillOptions = [
  { id: 'dribble', name: '드리블', emoji: '⛹️' },
  { id: 'shooting', name: '슈팅', emoji: '🏀' },
  { id: 'passing', name: '패스', emoji: '🤝' },
  { id: 'defense', name: '수비', emoji: '🛡️' },
  { id: 'rebounding', name: '리바운드', emoji: '📈' },
  { id: 'teamwork', name: '팀워크', emoji: '👥' },
  { id: 'stamina', name: '체력', emoji: '💪' },
  { id: 'speed', name: '스피드', emoji: '⚡' },
];

// ─────────────────────────────────────────────────────
// Mock Data
// ─────────────────────────────────────────────────────

const mockStudents: Student[] = [
  { id: '1', name: '김민준', level: 'intermediate', hasVideo: true, videoCount: 2 },
  { id: '2', name: '이서연', level: 'beginner', hasVideo: false },
  { id: '3', name: '박지호', level: 'advanced', hasVideo: true, videoCount: 1 },
  { id: '4', name: '최예은', level: 'beginner', hasVideo: false },
  { id: '5', name: '정도윤', level: 'intermediate', hasVideo: false },
  { id: '6', name: '강하준', level: 'pro', hasVideo: true, videoCount: 3 },
];

// ─────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────

const CoachSessionVideoFlow: React.FC = () => {
  const [flowStep, setFlowStep] = useState<FlowStep>('idle');
  const [session, setSession] = useState<Session | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [elapsedTime, setElapsedTime] = useState(0);

  // Timer for session duration
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (session?.status === 'active') {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [session?.status]);

  // Timer for recording
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // QR Scan (Start Session)
  const handleQRScan = () => {
    setFlowStep('qr_scan');
    // Simulate QR scan
    setTimeout(() => {
      const newSession: Session = {
        id: 'session-1',
        programName: '주니어 드리블 기초반',
        courtName: 'A코트',
        startedAt: new Date(),
        expectedStudents: mockStudents,
        attendedStudents: mockStudents,
        videosUploaded: 0,
        status: 'active',
      };
      setSession(newSession);
      setFlowStep('session_active');
    }, 1500);
  };

  // Select student for video
  const handleSelectStudent = (student: Student) => {
    setSelectedStudent(student);
    setSelectedSkills([]);
    setRecordingTime(0);
    setFlowStep('video_record');
  };

  // Start recording
  const handleStartRecording = () => {
    setIsRecording(true);
  };

  // Stop recording
  const handleStopRecording = () => {
    setIsRecording(false);
    setFlowStep('video_review');
  };

  // Toggle skill tag
  const handleToggleSkill = (skillId: string) => {
    setSelectedSkills(prev =>
      prev.includes(skillId)
        ? prev.filter(s => s !== skillId)
        : [...prev, skillId]
    );
  };

  // Save video
  const handleSaveVideo = () => {
    if (session && selectedStudent) {
      // Update session video count
      setSession({
        ...session,
        videosUploaded: session.videosUploaded + 1,
      });

      // Update student video status
      const updatedStudents = session.attendedStudents.map(s =>
        s.id === selectedStudent.id
          ? { ...s, hasVideo: true, videoCount: (s.videoCount || 0) + 1 }
          : s
      );
      setSession({
        ...session,
        attendedStudents: updatedStudents,
        videosUploaded: session.videosUploaded + 1,
      });
    }

    setSelectedStudent(null);
    setFlowStep('session_active');
  };

  // End session
  const handleEndSession = () => {
    if (session) {
      setSession({
        ...session,
        status: 'completed',
      });
      setFlowStep('session_end');
    }
  };

  // Close modal
  const handleCloseModal = () => {
    setSelectedStudent(null);
    setIsRecording(false);
    setRecordingTime(0);
    setFlowStep('session_active');
  };

  // ─────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <h1 style={styles.headerTitle}>온리쌤</h1>
        {session && session.status === 'active' && (
          <div style={{
            ...styles.sessionBadge,
            background: 'rgba(255, 71, 87, 0.15)',
            color: '#FF4757',
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#FF4757',
            }} />
            세션 진행중
          </div>
        )}
      </header>

      <main style={styles.content}>
        {/* Idle / QR Scan Screen */}
        {(flowStep === 'idle' || flowStep === 'qr_scan') && (
          <div style={styles.qrContainer}>
            <button
              style={styles.qrButton}
              onClick={handleQRScan}
              disabled={flowStep === 'qr_scan'}
            >
              {flowStep === 'qr_scan' ? (
                <>
                  <span style={styles.qrIcon}>⏳</span>
                  <span style={styles.qrText}>스캔 중...</span>
                </>
              ) : (
                <>
                  <span style={styles.qrIcon}>📱</span>
                  <span style={styles.qrText}>QR 출근</span>
                </>
              )}
            </button>
            <p style={{ color: '#8B949E', textAlign: 'center' }}>
              QR 코드를 스캔하여<br />세션을 시작하세요
            </p>
          </div>
        )}

        {/* Session Active Screen */}
        {flowStep === 'session_active' && session && (
          <>
            {/* Session Header */}
            <div style={styles.sessionHeader}>
              <div style={styles.sessionInfo}>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '4px' }}>
                    {session.programName}
                  </h2>
                  <p style={{ fontSize: '13px', color: '#8B949E' }}>
                    {session.courtName}
                  </p>
                </div>
                <div style={styles.sessionTime}>
                  <span>⏱️</span>
                  <span>{formatTime(elapsedTime)}</span>
                </div>
              </div>
              <div style={styles.sessionStats}>
                <div style={styles.statBox}>
                  <div style={{ ...styles.statValue, color: '#00D4AA' }}>
                    {session.attendedStudents.length}
                  </div>
                  <div style={styles.statLabel}>출석 학생</div>
                </div>
                <div style={styles.statBox}>
                  <div style={{ ...styles.statValue, color: '#FF4757' }}>
                    {session.videosUploaded}
                  </div>
                  <div style={styles.statLabel}>업로드 영상</div>
                </div>
                <div style={styles.statBox}>
                  <div style={{ ...styles.statValue, color: '#7C5CFF' }}>
                    {session.attendedStudents.filter(s => s.hasVideo).length}
                  </div>
                  <div style={styles.statLabel}>영상 완료</div>
                </div>
              </div>
            </div>

            {/* Student List */}
            <h3 style={styles.sectionTitle}>
              <span>👥</span> 학생 목록 (영상 촬영)
            </h3>
            <div style={styles.studentGrid}>
              {session.attendedStudents.map(student => (
                <div
                  key={student.id}
                  style={{
                    ...styles.studentCard,
                    borderColor: student.hasVideo ? 'rgba(0, 212, 170, 0.3)' : undefined,
                  }}
                  onClick={() => handleSelectStudent(student)}
                >
                  <div style={styles.studentAvatar}>
                    {student.name[0]}
                    {student.hasVideo && (
                      <div style={styles.videoIndicator}>
                        {student.videoCount}
                      </div>
                    )}
                  </div>
                  <div style={styles.studentInfo}>
                    <div style={styles.studentName}>{student.name}</div>
                    <span style={{
                      ...styles.studentLevel,
                      background: levelColors[student.level].bg,
                      color: levelColors[student.level].text,
                    }}>
                      {levelNames[student.level]}
                    </span>
                  </div>
                  <button style={styles.recordButton}>
                    📹
                  </button>
                </div>
              ))}
            </div>

            {/* End Session Button */}
            <button style={styles.endSessionButton} onClick={handleEndSession}>
              <span>⏹️</span>
              세션 종료 (QR 퇴근)
            </button>
          </>
        )}

        {/* Video Recording Modal */}
        {(flowStep === 'video_record' || flowStep === 'video_review') && selectedStudent && (
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h2 style={{ fontSize: '16px', fontWeight: 600 }}>
                📹 {selectedStudent.name} 영상 촬영
              </h2>
              <button
                onClick={handleCloseModal}
                style={{ background: 'none', border: 'none', color: 'white', fontSize: '24px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
            <div style={styles.modalContent}>
              {/* Video Preview */}
              <div style={styles.videoPreview}>
                {isRecording && (
                  <div style={styles.recordingIndicator}>
                    <span style={styles.recordingDot} />
                    REC {formatTime(recordingTime)}
                  </div>
                )}
                <span style={{ fontSize: '64px', opacity: 0.3 }}>🎬</span>
              </div>

              {/* Recording Controls */}
              {flowStep === 'video_record' && (
                <div style={styles.videoControls}>
                  {!isRecording ? (
                    <button
                      style={{
                        ...styles.controlButton,
                        background: '#FF4757',
                        color: 'white',
                      }}
                      onClick={handleStartRecording}
                    >
                      ⏺️ 촬영 시작
                    </button>
                  ) : (
                    <button
                      style={{
                        ...styles.controlButton,
                        background: '#333',
                        color: 'white',
                      }}
                      onClick={handleStopRecording}
                    >
                      ⏹️ 촬영 완료
                    </button>
                  )}
                </div>
              )}

              {/* Review & Skill Tags */}
              {flowStep === 'video_review' && (
                <>
                  <div style={styles.skillTagsSection}>
                    <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>
                      🏷️ 스킬 태그 선택
                    </h4>
                    <div style={styles.skillTags}>
                      {skillOptions.map(skill => (
                        <button
                          key={skill.id}
                          onClick={() => handleToggleSkill(skill.id)}
                          style={{
                            ...styles.skillTag,
                            background: selectedSkills.includes(skill.id)
                              ? 'rgba(255, 71, 87, 0.3)'
                              : 'rgba(255,255,255,0.05)',
                            border: selectedSkills.includes(skill.id)
                              ? '1px solid #FF4757'
                              : '1px solid rgba(255,255,255,0.1)',
                            color: selectedSkills.includes(skill.id)
                              ? '#FF4757'
                              : '#8B949E',
                          }}
                        >
                          {skill.emoji} {skill.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={styles.videoControls}>
                    <button
                      style={{
                        ...styles.controlButton,
                        background: 'transparent',
                        border: '1px solid #666',
                        color: '#999',
                      }}
                      onClick={() => {
                        setFlowStep('video_record');
                        setRecordingTime(0);
                      }}
                    >
                      🔄 다시 촬영
                    </button>
                    <button
                      style={{
                        ...styles.controlButton,
                        background: 'linear-gradient(135deg, #00D4AA, #00F5C4)',
                        color: '#0D0D0D',
                      }}
                      onClick={handleSaveVideo}
                    >
                      ✅ 저장 & 전송
                    </button>
                  </div>

                  <p style={{ textAlign: 'center', fontSize: '13px', color: '#8B949E', marginTop: '12px' }}>
                    💬 저장 시 {selectedStudent.name} 학부모에게 자동 알림이 전송됩니다
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {/* Session Complete Screen */}
        {flowStep === 'session_end' && session && (
          <div style={styles.completeContainer}>
            <div style={styles.completeIcon}>✓</div>
            <h2 style={styles.completeTitle}>세션 완료!</h2>
            <p style={{ color: '#8B949E' }}>
              오늘도 수고하셨습니다 💪
            </p>
            <div style={styles.completeSummary}>
              <div style={styles.statBox}>
                <div style={{ ...styles.statValue, color: '#00D4AA' }}>
                  {formatTime(elapsedTime)}
                </div>
                <div style={styles.statLabel}>총 근무시간</div>
              </div>
              <div style={styles.statBox}>
                <div style={{ ...styles.statValue, color: '#FF4757' }}>
                  {session.videosUploaded}
                </div>
                <div style={styles.statLabel}>업로드 영상</div>
              </div>
              <div style={styles.statBox}>
                <div style={{ ...styles.statValue, color: '#7C5CFF' }}>
                  {session.attendedStudents.length}
                </div>
                <div style={styles.statLabel}>레슨 학생</div>
              </div>
              <div style={styles.statBox}>
                <div style={{ ...styles.statValue, color: '#FFD700' }}>
                  ₩{Math.round(elapsedTime / 3600 * 35000 + session.attendedStudents.length * 500).toLocaleString()}
                </div>
                <div style={styles.statLabel}>예상 급여</div>
              </div>
            </div>
            <button
              onClick={() => {
                setFlowStep('idle');
                setSession(null);
                setElapsedTime(0);
              }}
              style={{
                ...styles.controlButton,
                background: '#FF4757',
                color: 'white',
                marginTop: '24px',
              }}
            >
              🏠 홈으로
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default CoachSessionVideoFlow;
