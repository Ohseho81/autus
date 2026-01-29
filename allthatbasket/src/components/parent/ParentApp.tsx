/**
 * 올댓바스켓 학부모 앱 - 대치동 스타일
 *
 * 디자인 시스템:
 * - Primary Gradient: #667eea → #764ba2
 * - Background: #F5F6F8
 * - Card: #FFFFFF with shadow
 * - Success: #10B981
 * - Warning: #F59E0B
 * - Danger: #EF4444
 */

import React, { useState, useRef, useEffect } from 'react';

// ============================================
// Types
// ============================================
interface Child {
  id: string;
  name: string;
  grade: string;
  avatar: string;
  program: string;
  level: string;
}

interface ScheduleItem {
  id: string;
  date: string;
  dayOfWeek: string;
  time: string;
  program: string;
  coach: string;
  court: string;
  status: 'scheduled' | 'completed' | 'cancelled';
}

interface PaymentInfo {
  currentMonth: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
  paidAt?: string;
  qrStatus: 'active' | 'inactive';
  qrExpiresAt?: string;
  lessonsRemaining: number;
  lessonsTotal: number;
}

interface VideoItem {
  id: string;
  thumbnailUrl: string;
  title: string;
  coach: string;
  date: string;
  duration: string;
  skillTags: string[];
  viewed: boolean;
}

interface ChatMessage {
  id: string;
  type: 'bot' | 'user';
  content: string;
  timestamp: string;
  quickReplies?: string[];
}

// ============================================
// Design Tokens
// ============================================
const colors = {
  primary: '#667eea',
  primaryDark: '#764ba2',
  background: '#F5F6F8',
  white: '#FFFFFF',
  text: '#1F2937',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  border: '#E5E7EB',
};

const gradients = {
  primary: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  success: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
};

// ============================================
// Mock Data
// ============================================
const mockChildren: Child[] = [
  {
    id: '1',
    name: '김민준',
    grade: '초3',
    avatar: '🏀',
    program: '주니어 드리블 마스터',
    level: '중급',
  },
  {
    id: '2',
    name: '김서연',
    grade: '초1',
    avatar: '⛹️',
    program: '키즈 농구 기초',
    level: '초급',
  },
];

const mockSchedule: ScheduleItem[] = [
  {
    id: '1',
    date: '2026-01-29',
    dayOfWeek: '목',
    time: '16:00 - 17:30',
    program: '주니어 드리블 마스터',
    coach: '박코치',
    court: 'A코트',
    status: 'scheduled',
  },
  {
    id: '2',
    date: '2026-01-31',
    dayOfWeek: '토',
    time: '10:00 - 11:30',
    program: '주니어 드리블 마스터',
    coach: '박코치',
    court: 'B코트',
    status: 'scheduled',
  },
  {
    id: '3',
    date: '2026-02-03',
    dayOfWeek: '화',
    time: '16:00 - 17:30',
    program: '주니어 드리블 마스터',
    coach: '박코치',
    court: 'A코트',
    status: 'scheduled',
  },
];

const mockPayment: PaymentInfo = {
  currentMonth: '2026년 2월',
  amount: 320000,
  status: 'paid',
  paidAt: '2026-01-25',
  qrStatus: 'active',
  qrExpiresAt: '2026-02-28',
  lessonsRemaining: 8,
  lessonsTotal: 8,
};

const mockVideos: VideoItem[] = [
  {
    id: '1',
    thumbnailUrl: '',
    title: '크로스오버 드리블 연습',
    coach: '박코치',
    date: '2026-01-27',
    duration: '0:45',
    skillTags: ['드리블', '크로스오버'],
    viewed: false,
  },
  {
    id: '2',
    thumbnailUrl: '',
    title: '레이업 슛 기초',
    coach: '박코치',
    date: '2026-01-24',
    duration: '1:12',
    skillTags: ['슈팅', '레이업'],
    viewed: true,
  },
  {
    id: '3',
    thumbnailUrl: '',
    title: '수비 자세 교정',
    coach: '김코치',
    date: '2026-01-22',
    duration: '0:38',
    skillTags: ['수비', '풋워크'],
    viewed: true,
  },
];

const mockChatHistory: ChatMessage[] = [
  {
    id: '1',
    type: 'bot',
    content: '안녕하세요! 올댓바스켓 몰트봇입니다 🏀\n무엇을 도와드릴까요?',
    timestamp: '10:00',
    quickReplies: ['수업 일정 확인', '결제 상태', '코치 상담 요청', '영상 보기'],
  },
];

// ============================================
// Styles
// ============================================
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    backgroundColor: colors.background,
    minHeight: '100vh',
    maxWidth: '480px',
    margin: '0 auto',
    position: 'relative',
    paddingBottom: '80px',
  },
  header: {
    background: gradients.primary,
    padding: '20px',
    paddingTop: '48px',
    color: colors.white,
  },
  headerTitle: {
    fontSize: '20px',
    fontWeight: '700',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  childSelector: {
    display: 'flex',
    gap: '12px',
    overflowX: 'auto',
    paddingBottom: '8px',
  },
  childCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: '16px',
    padding: '12px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    cursor: 'pointer',
    minWidth: '180px',
    transition: 'all 0.2s ease',
  },
  childCardActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.35)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
  },
  childAvatar: {
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    backgroundColor: colors.white,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
  },
  childInfo: {
    flex: 1,
  },
  childName: {
    fontSize: '16px',
    fontWeight: '600',
    color: colors.white,
  },
  childGrade: {
    fontSize: '13px',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  tabContainer: {
    display: 'flex',
    backgroundColor: colors.white,
    borderBottom: `1px solid ${colors.border}`,
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  tab: {
    flex: 1,
    padding: '14px',
    textAlign: 'center' as const,
    fontSize: '14px',
    fontWeight: '500',
    color: colors.textSecondary,
    cursor: 'pointer',
    borderBottom: '2px solid transparent',
    transition: 'all 0.2s ease',
  },
  tabActive: {
    color: colors.primary,
    borderBottomColor: colors.primary,
    fontWeight: '600',
  },
  content: {
    padding: '16px',
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: '16px',
    padding: '16px',
    marginBottom: '12px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: colors.text,
    marginBottom: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  alertBanner: {
    background: gradients.success,
    borderRadius: '12px',
    padding: '14px 16px',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    color: colors.white,
  },
  alertText: {
    fontSize: '14px',
    fontWeight: '500',
  },
  alertBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: '20px',
    padding: '4px 12px',
    fontSize: '13px',
    fontWeight: '600',
  },
  scheduleItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 0',
    borderBottom: `1px solid ${colors.border}`,
  },
  scheduleDate: {
    width: '60px',
    textAlign: 'center' as const,
  },
  scheduleDateDay: {
    fontSize: '24px',
    fontWeight: '700',
    color: colors.primary,
  },
  scheduleDateWeek: {
    fontSize: '12px',
    color: colors.textSecondary,
  },
  scheduleInfo: {
    flex: 1,
    marginLeft: '16px',
  },
  scheduleTime: {
    fontSize: '15px',
    fontWeight: '600',
    color: colors.text,
  },
  scheduleProgram: {
    fontSize: '13px',
    color: colors.textSecondary,
    marginTop: '2px',
  },
  scheduleCoach: {
    fontSize: '12px',
    color: colors.textMuted,
    marginTop: '2px',
  },
  qrBanner: {
    background: gradients.primary,
    borderRadius: '16px',
    padding: '20px',
    marginBottom: '16px',
    color: colors.white,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  qrInfo: {
    flex: 1,
  },
  qrTitle: {
    fontSize: '14px',
    opacity: 0.9,
    marginBottom: '4px',
  },
  qrStatus: {
    fontSize: '18px',
    fontWeight: '700',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  qrExpiry: {
    fontSize: '12px',
    opacity: 0.8,
    marginTop: '4px',
  },
  qrIcon: {
    width: '64px',
    height: '64px',
    backgroundColor: colors.white,
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '32px',
  },
  paymentRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 0',
    borderBottom: `1px solid ${colors.border}`,
  },
  paymentLabel: {
    fontSize: '14px',
    color: colors.textSecondary,
  },
  paymentValue: {
    fontSize: '15px',
    fontWeight: '600',
    color: colors.text,
  },
  paymentBadge: {
    padding: '4px 10px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600',
  },
  paymentBadgePaid: {
    backgroundColor: '#D1FAE5',
    color: '#059669',
  },
  videoGrid: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  videoCard: {
    display: 'flex',
    gap: '12px',
    padding: '12px',
    backgroundColor: colors.white,
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
    position: 'relative' as const,
  },
  videoThumbnail: {
    width: '100px',
    height: '75px',
    borderRadius: '8px',
    backgroundColor: '#E5E7EB',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '28px',
    position: 'relative' as const,
  },
  videoDuration: {
    position: 'absolute' as const,
    bottom: '4px',
    right: '4px',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    color: colors.white,
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '11px',
  },
  videoInfo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'center',
  },
  videoTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: colors.text,
    marginBottom: '4px',
  },
  videoMeta: {
    fontSize: '12px',
    color: colors.textSecondary,
    marginBottom: '6px',
  },
  videoTags: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap' as const,
  },
  videoTag: {
    padding: '2px 8px',
    backgroundColor: '#EEF2FF',
    color: colors.primary,
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: '500',
  },
  newBadge: {
    position: 'absolute' as const,
    top: '-4px',
    right: '-4px',
    backgroundColor: colors.danger,
    color: colors.white,
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '10px',
    fontWeight: '700',
  },
  chatContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: 'calc(100vh - 280px)',
    backgroundColor: colors.white,
    borderRadius: '16px',
    overflow: 'hidden',
  },
  chatMessages: {
    flex: 1,
    padding: '16px',
    overflowY: 'auto' as const,
  },
  chatMessage: {
    maxWidth: '85%',
    marginBottom: '12px',
  },
  chatBubble: {
    padding: '12px 16px',
    borderRadius: '18px',
    fontSize: '14px',
    lineHeight: '1.5',
  },
  chatBubbleBot: {
    backgroundColor: '#F3F4F6',
    color: colors.text,
    borderBottomLeftRadius: '4px',
  },
  chatBubbleUser: {
    backgroundColor: colors.primary,
    color: colors.white,
    borderBottomRightRadius: '4px',
    marginLeft: 'auto',
  },
  chatTime: {
    fontSize: '11px',
    color: colors.textMuted,
    marginTop: '4px',
  },
  quickReplies: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '8px',
    marginTop: '12px',
  },
  quickReply: {
    padding: '8px 14px',
    backgroundColor: colors.white,
    border: `1px solid ${colors.primary}`,
    borderRadius: '20px',
    color: colors.primary,
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  chatInput: {
    display: 'flex',
    gap: '8px',
    padding: '12px 16px',
    borderTop: `1px solid ${colors.border}`,
    backgroundColor: colors.white,
  },
  chatInputField: {
    flex: 1,
    padding: '10px 16px',
    border: `1px solid ${colors.border}`,
    borderRadius: '24px',
    fontSize: '14px',
    outline: 'none',
  },
  chatSendBtn: {
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    background: gradients.primary,
    border: 'none',
    color: colors.white,
    fontSize: '18px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomNav: {
    position: 'fixed' as const,
    bottom: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    width: '100%',
    maxWidth: '480px',
    backgroundColor: colors.white,
    borderTop: `1px solid ${colors.border}`,
    display: 'flex',
    justifyContent: 'space-around',
    padding: '8px 0',
    paddingBottom: '24px',
    zIndex: 100,
  },
  navItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '4px',
    padding: '8px 16px',
    cursor: 'pointer',
    color: colors.textMuted,
    fontSize: '20px',
  },
  navItemActive: {
    color: colors.primary,
  },
  navLabel: {
    fontSize: '11px',
    fontWeight: '500',
  },
  miniCalendar: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '16px',
  },
  miniCalendarDay: {
    flex: 1,
    textAlign: 'center' as const,
    padding: '8px 4px',
    cursor: 'pointer',
  },
  miniCalendarDayName: {
    fontSize: '12px',
    color: colors.textMuted,
    marginBottom: '4px',
  },
  miniCalendarDayNumber: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto',
    fontSize: '14px',
    fontWeight: '500',
    color: colors.text,
  },
  miniCalendarDayActive: {
    background: gradients.primary,
    color: colors.white,
  },
  miniCalendarDayHasEvent: {
    position: 'relative' as const,
  },
  miniCalendarDot: {
    position: 'absolute' as const,
    bottom: '-4px',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '4px',
    height: '4px',
    borderRadius: '50%',
    backgroundColor: colors.primary,
  },
  progressBar: {
    height: '8px',
    backgroundColor: '#E5E7EB',
    borderRadius: '4px',
    overflow: 'hidden',
    marginTop: '8px',
  },
  progressFill: {
    height: '100%',
    background: gradients.primary,
    borderRadius: '4px',
    transition: 'width 0.3s ease',
  },
};

// ============================================
// Sub Components
// ============================================
const ChildSelector: React.FC<{
  children: Child[];
  selected: string;
  onSelect: (id: string) => void;
}> = ({ children, selected, onSelect }) => (
  <div style={styles.childSelector}>
    {children.map((child) => (
      <div
        key={child.id}
        style={{
          ...styles.childCard,
          ...(child.id === selected ? styles.childCardActive : {}),
        }}
        onClick={() => onSelect(child.id)}
      >
        <div style={styles.childAvatar}>{child.avatar}</div>
        <div style={styles.childInfo}>
          <div style={styles.childName}>{child.name}</div>
          <div style={styles.childGrade}>{child.grade} · {child.level}</div>
        </div>
      </div>
    ))}
  </div>
);

const MiniCalendar: React.FC<{
  selectedDate: string;
  onSelect: (date: string) => void;
  events: string[];
}> = ({ selectedDate, onSelect, events }) => {
  const days = ['월', '화', '수', '목', '금', '토', '일'];
  const dates = ['27', '28', '29', '30', '31', '01', '02'];
  const fullDates = ['2026-01-27', '2026-01-28', '2026-01-29', '2026-01-30', '2026-01-31', '2026-02-01', '2026-02-02'];

  return (
    <div style={styles.miniCalendar}>
      {days.map((day, idx) => {
        const date = fullDates[idx];
        const isActive = date === selectedDate;
        const hasEvent = events.includes(date);

        return (
          <div
            key={day}
            style={styles.miniCalendarDay}
            onClick={() => onSelect(date)}
          >
            <div style={styles.miniCalendarDayName}>{day}</div>
            <div
              style={{
                ...styles.miniCalendarDayNumber,
                ...(isActive ? styles.miniCalendarDayActive : {}),
                ...(hasEvent ? styles.miniCalendarDayHasEvent : {}),
              }}
            >
              {dates[idx]}
              {hasEvent && !isActive && <div style={styles.miniCalendarDot} />}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const ScheduleTab: React.FC<{
  schedule: ScheduleItem[];
}> = ({ schedule }) => {
  const [selectedDate, setSelectedDate] = useState('2026-01-29');
  const eventDates = schedule.map(s => s.date);

  return (
    <div style={styles.content}>
      <div style={styles.card}>
        <div style={styles.cardTitle}>📅 1월 5주차</div>
        <MiniCalendar
          selectedDate={selectedDate}
          onSelect={setSelectedDate}
          events={eventDates}
        />
      </div>

      <div style={styles.card}>
        <div style={styles.cardTitle}>🏀 다가오는 수업</div>
        {schedule.map((item, idx) => (
          <div
            key={item.id}
            style={{
              ...styles.scheduleItem,
              borderBottom: idx === schedule.length - 1 ? 'none' : styles.scheduleItem.borderBottom,
            }}
          >
            <div style={styles.scheduleDate}>
              <div style={styles.scheduleDateDay}>{item.date.split('-')[2]}</div>
              <div style={styles.scheduleDateWeek}>{item.dayOfWeek}</div>
            </div>
            <div style={styles.scheduleInfo}>
              <div style={styles.scheduleTime}>{item.time}</div>
              <div style={styles.scheduleProgram}>{item.program}</div>
              <div style={styles.scheduleCoach}>{item.coach} · {item.court}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const PaymentTab: React.FC<{
  payment: PaymentInfo;
}> = ({ payment }) => (
  <div style={styles.content}>
    <div style={styles.qrBanner}>
      <div style={styles.qrInfo}>
        <div style={styles.qrTitle}>출석 QR 상태</div>
        <div style={styles.qrStatus}>
          <span style={{ color: payment.qrStatus === 'active' ? '#4ADE80' : '#FCD34D' }}>●</span>
          {payment.qrStatus === 'active' ? '활성화됨' : '비활성화'}
        </div>
        <div style={styles.qrExpiry}>
          {payment.qrExpiresAt}까지 유효
        </div>
      </div>
      <div style={styles.qrIcon}>📱</div>
    </div>

    <div style={styles.card}>
      <div style={styles.cardTitle}>💳 {payment.currentMonth} 수강료</div>

      <div style={styles.paymentRow}>
        <span style={styles.paymentLabel}>결제 금액</span>
        <span style={styles.paymentValue}>
          {payment.amount.toLocaleString()}원
        </span>
      </div>

      <div style={styles.paymentRow}>
        <span style={styles.paymentLabel}>결제 상태</span>
        <span style={{ ...styles.paymentBadge, ...styles.paymentBadgePaid }}>
          결제 완료
        </span>
      </div>

      <div style={styles.paymentRow}>
        <span style={styles.paymentLabel}>결제일</span>
        <span style={styles.paymentValue}>{payment.paidAt}</span>
      </div>

      <div style={{ ...styles.paymentRow, borderBottom: 'none' }}>
        <span style={styles.paymentLabel}>남은 수업</span>
        <span style={styles.paymentValue}>
          {payment.lessonsRemaining} / {payment.lessonsTotal}회
        </span>
      </div>

      <div style={styles.progressBar}>
        <div
          style={{
            ...styles.progressFill,
            width: `${(payment.lessonsRemaining / payment.lessonsTotal) * 100}%`,
          }}
        />
      </div>
    </div>

    <div style={styles.card}>
      <div style={styles.cardTitle}>📋 결제 내역</div>
      <div style={{ fontSize: '14px', color: colors.textSecondary, padding: '12px 0' }}>
        최근 3개월 결제 내역이 표시됩니다.
      </div>
    </div>
  </div>
);

const VideosTab: React.FC<{
  videos: VideoItem[];
}> = ({ videos }) => {
  const unwatchedCount = videos.filter(v => !v.viewed).length;

  return (
    <div style={styles.content}>
      {unwatchedCount > 0 && (
        <div style={styles.alertBanner}>
          <span style={styles.alertText}>
            🎬 새로운 연습 영상이 도착했어요!
          </span>
          <span style={styles.alertBadge}>{unwatchedCount}개</span>
        </div>
      )}

      <div style={styles.videoGrid}>
        {videos.map((video) => (
          <div key={video.id} style={styles.videoCard}>
            {!video.viewed && <div style={styles.newBadge}>NEW</div>}
            <div style={styles.videoThumbnail}>
              🎬
              <div style={styles.videoDuration}>{video.duration}</div>
            </div>
            <div style={styles.videoInfo}>
              <div style={styles.videoTitle}>{video.title}</div>
              <div style={styles.videoMeta}>{video.coach} · {video.date}</div>
              <div style={styles.videoTags}>
                {video.skillTags.map((tag, idx) => (
                  <span key={idx} style={styles.videoTag}>{tag}</span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ChatTab: React.FC<{
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
}> = ({ messages, onSendMessage }) => {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (inputValue.trim()) {
      onSendMessage(inputValue.trim());
      setInputValue('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={styles.content}>
      <div style={styles.chatContainer}>
        <div style={styles.chatMessages}>
          {messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                ...styles.chatMessage,
                textAlign: msg.type === 'user' ? 'right' : 'left',
              }}
            >
              <div
                style={{
                  ...styles.chatBubble,
                  ...(msg.type === 'bot' ? styles.chatBubbleBot : styles.chatBubbleUser),
                }}
              >
                {msg.content.split('\n').map((line, idx) => (
                  <React.Fragment key={idx}>
                    {line}
                    {idx < msg.content.split('\n').length - 1 && <br />}
                  </React.Fragment>
                ))}
              </div>
              <div style={styles.chatTime}>{msg.timestamp}</div>

              {msg.quickReplies && (
                <div style={styles.quickReplies}>
                  {msg.quickReplies.map((reply, idx) => (
                    <button
                      key={idx}
                      style={styles.quickReply}
                      onClick={() => onSendMessage(reply)}
                    >
                      {reply}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div style={styles.chatInput}>
          <input
            type="text"
            placeholder="메시지를 입력하세요..."
            style={styles.chatInputField}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          <button style={styles.chatSendBtn} onClick={handleSend}>
            ➤
          </button>
        </div>
      </div>
    </div>
  );
};

const BottomNavigation: React.FC<{
  activeTab: string;
  onTabChange: (tab: string) => void;
}> = ({ activeTab, onTabChange }) => {
  const navItems = [
    { id: 'home', icon: '🏠', label: '홈' },
    { id: 'schedule', icon: '📅', label: '일정' },
    { id: 'chat', icon: '💬', label: '상담' },
    { id: 'profile', icon: '👤', label: '내정보' },
  ];

  return (
    <div style={styles.bottomNav}>
      {navItems.map((item) => (
        <div
          key={item.id}
          style={{
            ...styles.navItem,
            ...(activeTab === item.id ? styles.navItemActive : {}),
          }}
          onClick={() => onTabChange(item.id)}
        >
          <span>{item.icon}</span>
          <span style={styles.navLabel}>{item.label}</span>
        </div>
      ))}
    </div>
  );
};

// ============================================
// Main Component
// ============================================
const ParentApp: React.FC = () => {
  const [selectedChild, setSelectedChild] = useState(mockChildren[0].id);
  const [activeTab, setActiveTab] = useState<'schedule' | 'payment' | 'videos' | 'chat'>('schedule');
  const [activeBottomNav, setActiveBottomNav] = useState('home');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(mockChatHistory);

  const selectedChildData = mockChildren.find(c => c.id === selectedChild);

  const handleSendMessage = (message: string) => {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: message,
      timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages(prev => [...prev, userMessage]);

    // Simulate bot response
    setTimeout(() => {
      let botResponse: ChatMessage;

      if (message.includes('일정') || message.includes('수업')) {
        botResponse = {
          id: (Date.now() + 1).toString(),
          type: 'bot',
          content: `${selectedChildData?.name} 학생의 다가오는 수업 일정입니다:\n\n📅 1/29(목) 16:00-17:30\n🏀 주니어 드리블 마스터\n👨‍🏫 박코치 · A코트`,
          timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
        };
      } else if (message.includes('결제') || message.includes('상태')) {
        botResponse = {
          id: (Date.now() + 1).toString(),
          type: 'bot',
          content: '✅ 2월 수강료가 정상 결제되었습니다!\n\n💳 결제금액: 320,000원\n📅 결제일: 2026-01-25\n🎫 QR 상태: 활성화됨\n\n남은 수업: 8회',
          timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
        };
      } else if (message.includes('상담') || message.includes('코치')) {
        botResponse = {
          id: (Date.now() + 1).toString(),
          type: 'bot',
          content: '코치 상담을 원하시는군요! 📞\n\n상담 가능 시간:\n- 평일 14:00-16:00\n- 토요일 12:00-13:00\n\n상담권을 사용하시겠습니까?',
          timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
          quickReplies: ['상담 예약하기', '나중에 하기'],
        };
      } else if (message.includes('영상')) {
        const unwatchedCount = mockVideos.filter(v => !v.viewed).length;
        botResponse = {
          id: (Date.now() + 1).toString(),
          type: 'bot',
          content: `🎬 ${selectedChildData?.name} 학생의 연습 영상입니다!\n\n새 영상: ${unwatchedCount}개\n전체 영상: ${mockVideos.length}개\n\n'영상' 탭에서 확인하실 수 있습니다.`,
          timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
        };
      } else {
        botResponse = {
          id: (Date.now() + 1).toString(),
          type: 'bot',
          content: '네, 알겠습니다! 더 도움이 필요하시면 말씀해주세요 😊',
          timestamp: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
          quickReplies: ['수업 일정 확인', '결제 상태', '코치 상담 요청'],
        };
      }

      setChatMessages(prev => [...prev, botResponse]);
    }, 800);
  };

  const tabs = [
    { id: 'schedule', label: '📅 일정' },
    { id: 'payment', label: '💳 결제' },
    { id: 'videos', label: '🎬 영상' },
    { id: 'chat', label: '💬 채팅' },
  ];

  const unwatchedVideos = mockVideos.filter(v => !v.viewed).length;

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerTitle}>
          🏀 올댓바스켓
        </div>
        <ChildSelector
          children={mockChildren}
          selected={selectedChild}
          onSelect={setSelectedChild}
        />
      </div>

      {/* Tabs */}
      <div style={styles.tabContainer}>
        {tabs.map((tab) => (
          <div
            key={tab.id}
            style={{
              ...styles.tab,
              ...(activeTab === tab.id ? styles.tabActive : {}),
              position: 'relative',
            }}
            onClick={() => setActiveTab(tab.id as any)}
          >
            {tab.label}
            {tab.id === 'videos' && unwatchedVideos > 0 && (
              <span style={{
                position: 'absolute',
                top: '8px',
                right: '16px',
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                backgroundColor: colors.danger,
                color: colors.white,
                fontSize: '11px',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {unwatchedVideos}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'schedule' && <ScheduleTab schedule={mockSchedule} />}
      {activeTab === 'payment' && <PaymentTab payment={mockPayment} />}
      {activeTab === 'videos' && <VideosTab videos={mockVideos} />}
      {activeTab === 'chat' && (
        <ChatTab messages={chatMessages} onSendMessage={handleSendMessage} />
      )}

      {/* Bottom Navigation */}
      <BottomNavigation
        activeTab={activeBottomNav}
        onTabChange={setActiveBottomNav}
      />
    </div>
  );
};

export default ParentApp;
