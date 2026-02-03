/**
 * 🏀 AUTUS × 올댓바스켓
 *
 * 핵심 가치 교환:
 * - 학부모 → 💰 돈 (결제)
 * - 코치 → 📹 훈련영상
 * - 관리자 → 📅 스케줄
 * - 원장님 → ✅ 승인/결정
 */

import React, { useState, useCallback } from 'react';

// ============================================
// 색상
// ============================================
const COLORS = {
  owner: '#1F2937',
  admin: '#3B82F6',
  coach: '#F97316',
  parent: '#10B981',
  bg: '#F8FAFC',
};

// ============================================
// 초기 데이터
// ============================================
const INITIAL_DATA = {
  // 학부모 → 결제
  payments: [
    { id: 1, parent: '김민준 학부모', amount: 150000, month: '3월', status: 'pending' },
    { id: 2, parent: '박지훈 학부모', amount: 150000, month: '3월', status: 'pending' },
  ],

  // 코치 → 훈련영상
  videos: [
    { id: 1, coach: '박코치', title: '드리블 훈련', student: '김민준', date: '2024-03-15', status: 'uploaded' },
  ],

  // 관리자 → 스케줄
  schedules: [
    { id: 1, class: '초급반', time: '월/수/금 16:00', coach: '박코치', students: 5 },
    { id: 2, class: '중급반', time: '화/목 17:00', coach: '김코치', students: 4 },
  ],

  // 학생 목록
  students: [
    { id: 1, name: '김민준', class: '초급반' },
    { id: 2, name: '박지훈', class: '초급반' },
    { id: 3, name: '이서연', class: '중급반' },
  ],
};

// ============================================
// 메인 컴포넌트
// ============================================
export default function AUTUSFinal() {
  const [data, setData] = useState(INITIAL_DATA);
  const [recording, setRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [lastAction, setLastAction] = useState(null);

  // 원장님: 결제 승인
  const handlePaymentApproval = useCallback((paymentId, decision) => {
    setData(prev => ({
      ...prev,
      payments: prev.payments.map(p =>
        p.id === paymentId ? { ...p, status: decision } : p
      ),
    }));
    setLastAction(`원장님: 결제 ${decision === 'approved' ? '승인' : '거절'}`);
  }, []);

  // 코치: 영상 촬영
  const handleStartRecording = useCallback(() => {
    setRecording(true);
    setRecordTime(0);
    const interval = setInterval(() => {
      setRecordTime(prev => prev + 1);
    }, 1000);

    // 5초 후 자동 종료 (데모용)
    setTimeout(() => {
      clearInterval(interval);
      setRecording(false);
      setData(prev => ({
        ...prev,
        videos: [
          { id: Date.now(), coach: '박코치', title: '새 훈련영상', student: '전체', date: new Date().toLocaleDateString(), status: 'uploaded' },
          ...prev.videos,
        ],
      }));
      setLastAction('코치: 훈련영상 업로드 완료');
    }, 5000);
  }, []);

  // 관리자: 스케줄 추가
  const handleAddSchedule = useCallback(() => {
    setData(prev => ({
      ...prev,
      schedules: [
        ...prev.schedules,
        { id: Date.now(), class: '신규반', time: '토 10:00', coach: '미정', students: 0 },
      ],
    }));
    setLastAction('관리자: 새 스케줄 추가');
  }, []);

  // 통계
  const stats = {
    pendingPayments: data.payments.filter(p => p.status === 'pending').length,
    totalVideos: data.videos.length,
    totalSchedules: data.schedules.length,
    totalStudents: data.students.length,
  };

  return (
    <div style={styles.container}>
      {/* 촬영 오버레이 */}
      {recording && (
        <div style={styles.recordingOverlay}>
          <div style={styles.recordingDot}>●</div>
          <div style={styles.recordingTime}>{recordTime}초</div>
          <div style={styles.recordingText}>촬영 중...</div>
        </div>
      )}

      {/* 헤더 */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.logo}>🏀</span>
          <div>
            <h1 style={styles.title}>올댓바스켓 × AUTUS</h1>
            <p style={styles.subtitle}>역할별 가치 교환</p>
          </div>
        </div>
        <button onClick={() => window.location.hash = '#hub'} style={styles.hubBtn}>
          ← Hub
        </button>
      </header>

      <main style={styles.main}>

        {/* ========== 학부모: 돈을 준다 ========== */}
        <section style={styles.customerSection}>
          <div style={styles.customerCard}>
            <div style={styles.customerHeader}>
              <span style={styles.emoji}>👨‍👩‍👧</span>
              <span style={styles.customerTitle}>학부모</span>
              <span style={styles.tag}>고객</span>
            </div>
            <div style={styles.valueBox}>
              <span style={styles.valueIcon}>💰</span>
              <span style={styles.valueText}>돈을 준다</span>
            </div>
            <div style={styles.paymentList}>
              {data.payments.filter(p => p.status === 'pending').map(p => (
                <div key={p.id} style={styles.paymentItem}>
                  <span>{p.parent}</span>
                  <span style={styles.amount}>{p.amount.toLocaleString()}원</span>
                </div>
              ))}
              {stats.pendingPayments === 0 && (
                <div style={styles.emptyText}>결제 대기 없음</div>
              )}
            </div>
          </div>
          <div style={styles.arrow}>↓ 결제</div>
        </section>

        {/* ========== 3역할 그리드 ========== */}
        <div style={styles.rolesGrid}>

          {/* 원장님: 승인 */}
          <div style={{...styles.roleCard, backgroundColor: COLORS.owner}}>
            <div style={styles.roleHeader}>
              <span>👔</span>
              <span>원장님</span>
            </div>
            <div style={styles.valueBoxDark}>
              <span>✅</span>
              <span>승인/결정</span>
            </div>

            {/* 결제 승인 */}
            <div style={styles.section}>
              <div style={styles.sectionTitle}>💰 결제 승인 ({stats.pendingPayments})</div>
              {data.payments.filter(p => p.status === 'pending').slice(0, 2).map(p => (
                <div key={p.id} style={styles.approvalCard}>
                  <div style={styles.approvalInfo}>
                    <div>{p.parent}</div>
                    <div style={styles.approvalAmount}>{p.amount.toLocaleString()}원</div>
                  </div>
                  <div style={styles.approvalBtns}>
                    <button
                      onClick={() => handlePaymentApproval(p.id, 'approved')}
                      style={styles.approveBtn}
                    >
                      승인
                    </button>
                    <button
                      onClick={() => handlePaymentApproval(p.id, 'rejected')}
                      style={styles.rejectBtn}
                    >
                      거절
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* 영상 확인 */}
            <div style={styles.section}>
              <div style={styles.sectionTitle}>📹 영상 확인 ({stats.totalVideos})</div>
              {data.videos.slice(0, 2).map(v => (
                <div key={v.id} style={styles.videoItem}>
                  <span>🎬 {v.title}</span>
                  <span style={styles.videoMeta}>{v.coach}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 관리자: 스케줄 */}
          <div style={{...styles.roleCard, backgroundColor: COLORS.admin}}>
            <div style={styles.roleHeader}>
              <span>💼</span>
              <span>관리자</span>
            </div>
            <div style={styles.valueBoxLight}>
              <span>📅</span>
              <span>스케줄 정리</span>
            </div>

            {/* 스케줄 목록 */}
            <div style={styles.section}>
              <div style={styles.sectionTitle}>📅 스케줄 ({stats.totalSchedules})</div>
              {data.schedules.map(s => (
                <div key={s.id} style={styles.scheduleItem}>
                  <div style={styles.scheduleName}>{s.class}</div>
                  <div style={styles.scheduleDetail}>
                    <span>{s.time}</span>
                    <span>{s.coach} · {s.students}명</span>
                  </div>
                </div>
              ))}
              <button onClick={handleAddSchedule} style={styles.addBtn}>
                + 스케줄 추가
              </button>
            </div>
          </div>

          {/* 코치: 훈련영상 */}
          <div style={{...styles.roleCard, backgroundColor: COLORS.coach}}>
            <div style={styles.roleHeader}>
              <span>🏃</span>
              <span>코치</span>
            </div>
            <div style={styles.valueBoxLight}>
              <span>📹</span>
              <span>훈련영상</span>
            </div>

            {/* 영상 촬영 */}
            <button
              onClick={handleStartRecording}
              disabled={recording}
              style={{
                ...styles.recordBtn,
                opacity: recording ? 0.5 : 1,
              }}
            >
              <span style={styles.recordIcon}>🔴</span>
              <span>{recording ? '촬영 중...' : '영상 촬영 시작'}</span>
            </button>

            {/* 업로드된 영상 */}
            <div style={styles.section}>
              <div style={styles.sectionTitle}>🎬 업로드된 영상</div>
              {data.videos.map(v => (
                <div key={v.id} style={styles.uploadedVideo}>
                  <span>📹 {v.title}</span>
                  <span style={styles.videoDate}>{v.date}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* 액션 로그 */}
        {lastAction && (
          <div style={styles.actionLog}>
            ⚡ {lastAction}
          </div>
        )}

        {/* 통계 */}
        <div style={styles.statsBar}>
          <div style={{...styles.statItem, backgroundColor: COLORS.parent}}>
            <div style={styles.statNum}>{stats.pendingPayments}</div>
            <div style={styles.statLabel}>결제 대기</div>
          </div>
          <div style={{...styles.statItem, backgroundColor: COLORS.coach}}>
            <div style={styles.statNum}>{stats.totalVideos}</div>
            <div style={styles.statLabel}>훈련영상</div>
          </div>
          <div style={{...styles.statItem, backgroundColor: COLORS.admin}}>
            <div style={styles.statNum}>{stats.totalSchedules}</div>
            <div style={styles.statLabel}>스케줄</div>
          </div>
          <div style={{...styles.statItem, backgroundColor: COLORS.owner}}>
            <div style={styles.statNum}>{stats.totalStudents}</div>
            <div style={styles.statLabel}>학생</div>
          </div>
        </div>

        {/* 가치 흐름 요약 */}
        <div style={styles.flowSummary}>
          <div style={styles.flowItem}>
            <span style={{color: COLORS.parent}}>👨‍👩‍👧 학부모</span>
            <span>→ 💰 돈</span>
          </div>
          <div style={styles.flowItem}>
            <span style={{color: COLORS.coach}}>🏃 코치</span>
            <span>→ 📹 영상</span>
          </div>
          <div style={styles.flowItem}>
            <span style={{color: COLORS.admin}}>💼 관리자</span>
            <span>→ 📅 스케줄</span>
          </div>
          <div style={styles.flowItem}>
            <span style={{color: COLORS.owner}}>👔 원장님</span>
            <span>→ ✅ 승인</span>
          </div>
        </div>

      </main>

      <footer style={styles.footer}>
        <span style={styles.footerBrand}>AUTUS × AllThatBasket</span>
        <span style={styles.footerSub}>Brand OS Factory</span>
      </footer>
    </div>
  );
}

// ============================================
// 스타일
// ============================================
const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: COLORS.bg,
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },

  // 촬영 오버레이
  recordingOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.9)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  recordingDot: {
    fontSize: '80px',
    color: '#EF4444',
    animation: 'pulse 1s infinite',
  },
  recordingTime: {
    fontSize: '48px',
    color: 'white',
    fontFamily: 'monospace',
    marginTop: '16px',
  },
  recordingText: {
    color: 'rgba(255,255,255,0.6)',
    marginTop: '8px',
  },

  // 헤더
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 24px',
    backgroundColor: 'white',
    borderBottom: '1px solid #E5E7EB',
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: '12px' },
  logo: { fontSize: '32px' },
  title: { fontSize: '20px', fontWeight: 700, color: '#1F2937', margin: 0 },
  subtitle: { fontSize: '13px', color: '#6B7280', margin: 0 },
  hubBtn: {
    padding: '8px 16px',
    backgroundColor: '#F3F4F6',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },

  // 메인
  main: { padding: '24px', maxWidth: '1100px', margin: '0 auto' },

  // 고객 섹션
  customerSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '20px',
  },
  customerCard: {
    backgroundColor: 'white',
    border: `3px solid ${COLORS.parent}`,
    borderRadius: '16px',
    padding: '16px 24px',
    width: '300px',
  },
  customerHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
  },
  emoji: { fontSize: '24px' },
  customerTitle: { fontSize: '20px', fontWeight: 700, color: COLORS.parent },
  tag: {
    marginLeft: 'auto',
    padding: '2px 10px',
    backgroundColor: COLORS.parent,
    color: 'white',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: 600,
  },
  valueBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px',
    backgroundColor: '#F0FDF4',
    borderRadius: '8px',
    marginBottom: '12px',
  },
  valueIcon: { fontSize: '24px' },
  valueText: { fontSize: '16px', fontWeight: 600, color: '#166534' },
  paymentList: { display: 'flex', flexDirection: 'column', gap: '8px' },
  paymentItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 12px',
    backgroundColor: '#F9FAFB',
    borderRadius: '6px',
    fontSize: '13px',
  },
  amount: { fontWeight: 600, color: COLORS.parent },
  emptyText: { textAlign: 'center', color: '#9CA3AF', fontSize: '13px', padding: '8px' },
  arrow: {
    marginTop: '12px',
    color: COLORS.parent,
    fontWeight: 600,
    fontSize: '14px',
  },

  // 역할 그리드
  rolesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
    marginBottom: '20px',
  },
  roleCard: {
    borderRadius: '16px',
    padding: '16px',
    color: 'white',
  },
  roleHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '18px',
    fontWeight: 700,
    marginBottom: '12px',
  },
  valueBoxDark: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: '8px',
    marginBottom: '12px',
    fontSize: '14px',
    fontWeight: 600,
  },
  valueBoxLight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: '8px',
    marginBottom: '12px',
    fontSize: '14px',
    fontWeight: 600,
  },
  section: { marginTop: '8px' },
  sectionTitle: {
    fontSize: '12px',
    opacity: 0.8,
    marginBottom: '8px',
  },
  approvalCard: {
    backgroundColor: 'white',
    color: '#374151',
    borderRadius: '8px',
    padding: '10px',
    marginBottom: '8px',
  },
  approvalInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
    fontSize: '13px',
  },
  approvalAmount: { fontWeight: 700 },
  approvalBtns: { display: 'flex', gap: '6px' },
  approveBtn: {
    flex: 1,
    padding: '6px',
    backgroundColor: '#10B981',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  rejectBtn: {
    flex: 1,
    padding: '6px',
    backgroundColor: '#EF4444',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  videoItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: '6px',
    marginBottom: '4px',
    fontSize: '12px',
  },
  videoMeta: { opacity: 0.7 },
  scheduleItem: {
    backgroundColor: 'white',
    color: '#374151',
    borderRadius: '8px',
    padding: '10px',
    marginBottom: '8px',
  },
  scheduleName: { fontWeight: 600, marginBottom: '4px' },
  scheduleDetail: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    color: '#6B7280',
  },
  addBtn: {
    width: '100%',
    padding: '8px',
    backgroundColor: 'rgba(255,255,255,0.2)',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '13px',
  },
  recordBtn: {
    width: '100%',
    padding: '16px',
    backgroundColor: '#DC2626',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontSize: '16px',
    fontWeight: 600,
    marginBottom: '12px',
  },
  recordIcon: { fontSize: '20px' },
  uploadedVideo: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: '6px',
    marginBottom: '4px',
    fontSize: '12px',
  },
  videoDate: { opacity: 0.7 },

  // 액션 로그
  actionLog: {
    padding: '12px 16px',
    backgroundColor: '#EEF2FF',
    borderRadius: '8px',
    marginBottom: '16px',
    fontSize: '14px',
    color: '#4F46E5',
    textAlign: 'center',
  },

  // 통계
  statsBar: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '12px',
    marginBottom: '16px',
  },
  statItem: {
    borderRadius: '12px',
    padding: '16px',
    color: 'white',
    textAlign: 'center',
  },
  statNum: { fontSize: '28px', fontWeight: 700 },
  statLabel: { fontSize: '12px', opacity: 0.85 },

  // 가치 흐름 요약
  flowSummary: {
    display: 'flex',
    justifyContent: 'center',
    gap: '24px',
    padding: '16px',
    backgroundColor: 'white',
    borderRadius: '12px',
    flexWrap: 'wrap',
  },
  flowItem: {
    display: 'flex',
    gap: '8px',
    fontSize: '14px',
    fontWeight: 500,
  },

  // 푸터
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '16px 24px',
    backgroundColor: 'white',
    borderTop: '1px solid #E5E7EB',
  },
  footerBrand: { fontSize: '13px', fontWeight: 600, color: COLORS.coach },
  footerSub: { fontSize: '12px', color: '#9CA3AF' },
};
