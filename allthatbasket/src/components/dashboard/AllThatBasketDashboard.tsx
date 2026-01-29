import React, { useState } from 'react';

// Types
interface Role {
  id: 'owner' | 'director' | 'admin' | 'coach';
  name: string;
  icon: string;
  color: string;
}

interface Branch {
  name: string;
  revenue: number;
  students: number;
  growth: number;
  status: 'excellent' | 'good' | 'warning';
}

interface TodayClass {
  time: string;
  name: string;
  coach: string;
  students: number;
  room: string;
}

interface Coach {
  name: string;
  classes: number;
  rating: number;
  status: 'active' | 'break';
}

interface PendingTask {
  type: 'register' | 'payment' | 'inquiry' | 'schedule';
  title: string;
  name: string;
  time: string;
  priority: 'high' | 'medium' | 'low';
}

interface Inquiry {
  channel: string;
  message: string;
  time: string;
  status: 'new' | 'pending' | 'resolved';
}

interface MyClass {
  time: string;
  name: string;
  students: number;
  attended: number;
  status: 'upcoming' | 'active' | 'completed';
}

interface Student {
  name: string;
  level: '초급' | '중급' | '상급';
  attendance: number;
  progress: number;
  note: string;
}

interface Alert {
  type: 'success' | 'warning' | 'info';
  message: string;
  time: string;
}

interface Action {
  icon: string;
  label: string;
}

// ═══════════════════════════════════════════════════════════════
// 올댓바스켓 아카데미 역할별 대시보드 UI/UX
// Dribbble 영감 + Tesla-grade 디자인 언어 + KRATON Design System
// ═══════════════════════════════════════════════════════════════

const AllThatBasketDashboard: React.FC = () => {
  const [activeRole, setActiveRole] = useState<Role['id']>('owner');

  const roles: Role[] = [
    { id: 'owner', name: '오너', icon: '👑', color: '#FF6B00' },
    { id: 'director', name: '원장', icon: '🏢', color: '#00D4AA' },
    { id: 'admin', name: '관리자', icon: '📋', color: '#7C5CFF' },
    { id: 'coach', name: '강사', icon: '🏀', color: '#FF4757' },
  ];

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0D0D0D 0%, #1A1A2E 50%, #0D0D0D 100%)',
        fontFamily: "'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif",
        color: '#FFFFFF',
        overflow: 'hidden',
      }}
    >
      {/* 배경 농구 코트 패턴 */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0.03,
          background: `
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 50px,
              rgba(255, 107, 0, 0.5) 50px,
              rgba(255, 107, 0, 0.5) 51px
            ),
            repeating-linear-gradient(
              90deg,
              transparent,
              transparent 50px,
              rgba(255, 107, 0, 0.5) 50px,
              rgba(255, 107, 0, 0.5) 51px
            )
          `,
          pointerEvents: 'none',
        }}
      />

      {/* 역할 선택 탭 (상단 네비게이션) */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: '70px',
          background: 'rgba(13, 13, 13, 0.95)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255, 107, 0, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 40px',
          zIndex: 1000,
        }}
      >
        {/* 로고 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              background: 'linear-gradient(135deg, #FF6B00 0%, #FF8C42 100%)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              boxShadow: '0 4px 20px rgba(255, 107, 0, 0.4)',
            }}
          >
            🏀
          </div>
          <div>
            <div
              style={{
                fontSize: '20px',
                fontWeight: 800,
                background: 'linear-gradient(90deg, #FF6B00, #FFB347)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                letterSpacing: '-0.5px',
              }}
            >
              ALL THAT BASKET
            </div>
            <div style={{ fontSize: '11px', color: '#888', letterSpacing: '2px' }}>
              ACADEMY MANAGEMENT SYSTEM
            </div>
          </div>
        </div>

        {/* 역할 탭 */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            background: 'rgba(255, 255, 255, 0.05)',
            padding: '6px',
            borderRadius: '16px',
          }}
        >
          {roles.map((role) => (
            <button
              key={role.id}
              onClick={() => setActiveRole(role.id)}
              style={{
                padding: '12px 24px',
                background:
                  activeRole === role.id
                    ? `linear-gradient(135deg, ${role.color}20, ${role.color}40)`
                    : 'transparent',
                border:
                  activeRole === role.id
                    ? `1px solid ${role.color}`
                    : '1px solid transparent',
                borderRadius: '12px',
                color: activeRole === role.id ? role.color : '#888',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                fontWeight: 600,
                transition: 'all 0.3s ease',
              }}
            >
              <span style={{ fontSize: '18px' }}>{role.icon}</span>
              {role.name}
            </button>
          ))}
        </div>

        {/* 사용자 정보 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              background: 'linear-gradient(135deg, #FF6B00, #FF8C42)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              fontWeight: 700,
            }}
          >
            SH
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div style={{ paddingTop: '70px', minHeight: 'calc(100vh - 70px)' }}>
        {activeRole === 'owner' && <OwnerDashboard />}
        {activeRole === 'director' && <DirectorDashboard />}
        {activeRole === 'admin' && <AdminDashboard />}
        {activeRole === 'coach' && <CoachDashboard />}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// 오너 대시보드 - 전체 사업 현황, 재무, 다중 지점 관리
// ═══════════════════════════════════════════════════════════════
const OwnerDashboard: React.FC = () => {
  const branches: Branch[] = [
    { name: '강남본점', revenue: 4850, students: 156, growth: 12.5, status: 'excellent' },
    { name: '송파점', revenue: 3200, students: 98, growth: 8.2, status: 'good' },
    { name: '분당점', revenue: 2800, students: 87, growth: -2.1, status: 'warning' },
    { name: '일산점', revenue: 2100, students: 65, growth: 15.3, status: 'excellent' },
  ];

  return (
    <div style={{ padding: '40px', maxWidth: '1600px', margin: '0 auto' }}>
      {/* 헤더 */}
      <div style={{ marginBottom: '40px' }}>
        <h1
          style={{
            fontSize: '32px',
            fontWeight: 800,
            marginBottom: '8px',
            background: 'linear-gradient(90deg, #FFFFFF, #888)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          사업 총괄 대시보드
        </h1>
        <p style={{ color: '#888', fontSize: '14px' }}>
          2025년 1월 29일 기준 · 실시간 업데이트
        </p>
      </div>

      {/* 핵심 지표 카드 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '24px',
          marginBottom: '40px',
        }}
      >
        <MetricCard
          title="총 매출"
          value="₩12,950만"
          change="+18.5%"
          positive={true}
          icon="💰"
          color="#FF6B00"
        />
        <MetricCard
          title="총 수강생"
          value="406명"
          change="+24명"
          positive={true}
          icon="👥"
          color="#00D4AA"
        />
        <MetricCard
          title="운영 지점"
          value="4개"
          change="1개 오픈 예정"
          positive={true}
          icon="🏢"
          color="#7C5CFF"
        />
        <MetricCard
          title="V-Index 평균"
          value="87.4"
          change="+5.2"
          positive={true}
          icon="📊"
          color="#FF4757"
        />
      </div>

      {/* 지점별 현황 + 차트 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gap: '24px',
          marginBottom: '40px',
        }}
      >
        {/* 지점별 현황 */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '24px',
            padding: '32px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px',
            }}
          >
            <h2 style={{ fontSize: '18px', fontWeight: 700 }}>지점별 실적</h2>
            <select
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 16px',
                color: '#FFF',
                fontSize: '13px',
              }}
            >
              <option>이번 달</option>
              <option>지난 달</option>
              <option>분기</option>
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {branches.map((branch, i) => (
              <div
                key={i}
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: '16px',
                  padding: '20px 24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  transition: 'all 0.3s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      background:
                        branch.status === 'excellent'
                          ? 'linear-gradient(135deg, #00D4AA20, #00D4AA40)'
                          : branch.status === 'good'
                          ? 'linear-gradient(135deg, #7C5CFF20, #7C5CFF40)'
                          : 'linear-gradient(135deg, #FF475720, #FF475740)',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '20px',
                    }}
                  >
                    🏀
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: '4px' }}>{branch.name}</div>
                    <div style={{ fontSize: '13px', color: '#888' }}>{branch.students}명 수강</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>
                    ₩{branch.revenue.toLocaleString()}만
                  </div>
                  <div
                    style={{
                      fontSize: '13px',
                      color: branch.growth > 0 ? '#00D4AA' : '#FF4757',
                      fontWeight: 600,
                    }}
                  >
                    {branch.growth > 0 ? '↑' : '↓'} {Math.abs(branch.growth)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 매출 차트 */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '24px',
            padding: '32px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '24px' }}>
            월별 매출 추이
          </h2>
          <div style={{ height: '280px', position: 'relative' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
                height: '100%',
                gap: '12px',
                paddingBottom: '30px',
              }}
            >
              {[65, 72, 80, 85, 78, 92, 95, 88, 96, 100, 105, 112].map((val, i) => (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      height: `${val * 2}px`,
                      background:
                        i === 11
                          ? 'linear-gradient(180deg, #FF6B00, #FF8C42)'
                          : 'linear-gradient(180deg, rgba(255, 107, 0, 0.3), rgba(255, 107, 0, 0.1))',
                      borderRadius: '6px 6px 0 0',
                      transition: 'all 0.3s ease',
                    }}
                  />
                  <span style={{ fontSize: '10px', color: '#666' }}>{i + 1}월</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 알림 & 액션 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '24px',
        }}
      >
        <AlertPanel
          title="주요 알림"
          alerts={[
            { type: 'success', message: '일산점 이번 달 목표 150% 달성!', time: '2시간 전' },
            { type: 'warning', message: '분당점 강사 충원 필요 (수업 포화)', time: '5시간 전' },
            { type: 'info', message: '판교점 오픈 D-30', time: '1일 전' },
          ]}
        />
        <QuickActions
          title="빠른 실행"
          actions={[
            { icon: '📊', label: '전체 리포트 다운로드' },
            { icon: '💳', label: '정산 현황 확인' },
            { icon: '📈', label: 'V-Index 분석' },
            { icon: '🎯', label: '목표 설정' },
          ]}
        />
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// 원장 대시보드 - 지점 운영, 학생/강사 관리, 일일 운영
// ═══════════════════════════════════════════════════════════════
const DirectorDashboard: React.FC = () => {
  const todayClasses: TodayClass[] = [
    { time: '14:00', name: '유아반 A', coach: '김코치', students: 8, room: '1코트' },
    { time: '15:30', name: '초등 기초반', coach: '이코치', students: 12, room: '2코트' },
    { time: '17:00', name: '초등 심화반', coach: '박코치', students: 10, room: '1코트' },
    { time: '18:30', name: '중등반', coach: '김코치', students: 15, room: '전체' },
    { time: '20:00', name: '성인 취미반', coach: '이코치', students: 8, room: '1코트' },
  ];

  const coaches: Coach[] = [
    { name: '김민수', classes: 24, rating: 4.9, status: 'active' },
    { name: '이영희', classes: 20, rating: 4.8, status: 'active' },
    { name: '박준혁', classes: 18, rating: 4.7, status: 'break' },
  ];

  return (
    <div style={{ padding: '40px', maxWidth: '1600px', margin: '0 auto' }}>
      <div style={{ marginBottom: '40px' }}>
        <div
          style={{
            display: 'inline-block',
            padding: '8px 16px',
            background: 'rgba(0, 212, 170, 0.2)',
            borderRadius: '8px',
            color: '#00D4AA',
            fontSize: '13px',
            fontWeight: 600,
            marginBottom: '16px',
          }}
        >
          강남본점 원장
        </div>
        <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px' }}>
          오늘의 운영 현황
        </h1>
        <p style={{ color: '#888', fontSize: '14px' }}>2025년 1월 29일 수요일</p>
      </div>

      {/* 오늘 현황 요약 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '16px',
          marginBottom: '40px',
        }}
      >
        <MiniCard title="오늘 수업" value="5개" icon="📚" />
        <MiniCard title="출석 예정" value="53명" icon="✅" />
        <MiniCard title="강사 출근" value="3/3" icon="👨‍🏫" />
        <MiniCard title="시설 예약" value="92%" icon="🏟️" />
        <MiniCard title="미수금" value="₩45만" icon="💸" alert />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.5fr 1fr',
          gap: '24px',
          marginBottom: '40px',
        }}
      >
        {/* 오늘의 수업 시간표 */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '24px',
            padding: '32px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px',
            }}
          >
            <h2 style={{ fontSize: '18px', fontWeight: 700 }}>📅 오늘의 수업</h2>
            <button
              style={{
                background: 'linear-gradient(135deg, #00D4AA, #00B894)',
                border: 'none',
                borderRadius: '10px',
                padding: '10px 20px',
                color: '#FFF',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              + 수업 추가
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {todayClasses.map((cls, i) => (
              <div
                key={i}
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: '16px',
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  borderLeft: '4px solid #00D4AA',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div
                    style={{
                      background: 'rgba(0, 212, 170, 0.2)',
                      padding: '8px 14px',
                      borderRadius: '8px',
                      fontWeight: 700,
                      color: '#00D4AA',
                      fontSize: '14px',
                      fontFamily: 'monospace',
                    }}
                  >
                    {cls.time}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: '4px' }}>{cls.name}</div>
                    <div style={{ fontSize: '13px', color: '#888' }}>
                      {cls.coach} · {cls.room}
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                >
                  {cls.students}명
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 강사 현황 */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '24px',
            padding: '32px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '24px' }}>
            👨‍🏫 강사 현황
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {coaches.map((coach, i) => (
              <div
                key={i}
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: '16px',
                  padding: '20px',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '12px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        background: 'linear-gradient(135deg, #00D4AA, #00B894)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '14px',
                      }}
                    >
                      {coach.name[0]}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600 }}>{coach.name} 코치</div>
                      <div style={{ fontSize: '12px', color: '#888' }}>
                        이번 달 {coach.classes}회 수업
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      padding: '6px 12px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: 600,
                      background:
                        coach.status === 'active'
                          ? 'rgba(0, 212, 170, 0.2)'
                          : 'rgba(255, 193, 7, 0.2)',
                      color: coach.status === 'active' ? '#00D4AA' : '#FFC107',
                    }}
                  >
                    {coach.status === 'active' ? '근무중' : '휴식중'}
                  </div>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    color: '#FFD700',
                    fontSize: '13px',
                  }}
                >
                  {'★'.repeat(5)}{' '}
                  <span style={{ color: '#888', marginLeft: '8px' }}>{coach.rating}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 학생 관리 & 재정 현황 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '24px',
            padding: '32px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '24px' }}>
            🎓 학생 현황
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            <StatBlock label="총 등록" value="156명" />
            <StatBlock label="신규 (이번달)" value="12명" positive />
            <StatBlock label="휴원" value="8명" warning />
            <StatBlock label="재등록률" value="87%" />
          </div>
        </div>
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '24px',
            padding: '32px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '24px' }}>
            💰 이번 달 재정
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            <StatBlock label="수강료 수입" value="₩4,850만" />
            <StatBlock label="운영비 지출" value="₩2,100만" />
            <StatBlock label="순이익" value="₩2,750만" positive />
            <StatBlock label="목표 달성" value="115%" positive />
          </div>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// 관리자 대시보드 - 일정, 등록, 고객 서비스
// ═══════════════════════════════════════════════════════════════
const AdminDashboard: React.FC = () => {
  const pendingTasks: PendingTask[] = [
    { type: 'register', title: '신규 등록 상담', name: '김하늘 (초4)', time: '14:30', priority: 'high' },
    { type: 'payment', title: '수강료 결제 확인', name: '이서준 (중1)', time: '오늘', priority: 'medium' },
    { type: 'inquiry', title: '문의 전화 콜백', name: '박진우 학부모', time: '15:00', priority: 'high' },
    { type: 'schedule', title: '보강 수업 일정 조정', name: '초등 기초반', time: '내일', priority: 'low' },
  ];

  const recentInquiries: Inquiry[] = [
    { channel: '카카오톡', message: '주말반 수업 시간 문의드립니다', time: '10분 전', status: 'new' },
    { channel: '전화', message: '레벨 테스트 예약 문의', time: '30분 전', status: 'pending' },
    { channel: '홈페이지', message: '수강료 할인 문의', time: '1시간 전', status: 'resolved' },
  ];

  return (
    <div style={{ padding: '40px', maxWidth: '1600px', margin: '0 auto' }}>
      <div style={{ marginBottom: '40px' }}>
        <div
          style={{
            display: 'inline-block',
            padding: '8px 16px',
            background: 'rgba(124, 92, 255, 0.2)',
            borderRadius: '8px',
            color: '#7C5CFF',
            fontSize: '13px',
            fontWeight: 600,
            marginBottom: '16px',
          }}
        >
          강남본점 관리자
        </div>
        <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px' }}>업무 관리</h1>
        <p style={{ color: '#888', fontSize: '14px' }}>
          오늘 처리할 업무 4건 · 미확인 문의 2건
        </p>
      </div>

      {/* 빠른 액션 버튼 */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '40px', flexWrap: 'wrap' }}>
        {[
          { icon: '📝', label: '신규 등록', color: '#7C5CFF' },
          { icon: '💳', label: '결제 처리', color: '#00D4AA' },
          { icon: '📅', label: '수업 일정', color: '#FF6B00' },
          { icon: '📞', label: '상담 예약', color: '#FF4757' },
          { icon: '📨', label: '문자 발송', color: '#00B4D8' },
        ].map((action, i) => (
          <button
            key={i}
            style={{
              background: `linear-gradient(135deg, ${action.color}20, ${action.color}10)`,
              border: `1px solid ${action.color}40`,
              borderRadius: '12px',
              padding: '14px 24px',
              color: '#FFF',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '14px',
              fontWeight: 600,
              transition: 'all 0.3s ease',
            }}
          >
            <span style={{ fontSize: '18px' }}>{action.icon}</span>
            {action.label}
          </button>
        ))}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.5fr 1fr',
          gap: '24px',
          marginBottom: '40px',
        }}
      >
        {/* 대기 업무 */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '24px',
            padding: '32px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px',
            }}
          >
            <h2 style={{ fontSize: '18px', fontWeight: 700 }}>📋 대기 업무</h2>
            <div
              style={{
                background: 'rgba(255, 71, 87, 0.2)',
                color: '#FF4757',
                padding: '6px 14px',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              4건 대기중
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {pendingTasks.map((task, i) => (
              <div
                key={i}
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: '16px',
                  padding: '20px',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  borderLeft: `4px solid ${
                    task.priority === 'high'
                      ? '#FF4757'
                      : task.priority === 'medium'
                      ? '#FFC107'
                      : '#7C5CFF'
                  }`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div
                      style={{
                        fontSize: '11px',
                        color: '#888',
                        marginBottom: '4px',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                      }}
                    >
                      {task.type === 'register'
                        ? '신규 등록'
                        : task.type === 'payment'
                        ? '결제'
                        : task.type === 'inquiry'
                        ? '문의'
                        : '일정'}
                    </div>
                    <div style={{ fontWeight: 600, marginBottom: '4px' }}>{task.title}</div>
                    <div style={{ fontSize: '13px', color: '#888' }}>{task.name}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div
                      style={{
                        fontSize: '13px',
                        color: task.priority === 'high' ? '#FF4757' : '#888',
                        fontWeight: 600,
                      }}
                    >
                      {task.time}
                    </div>
                    <button
                      style={{
                        marginTop: '8px',
                        background: 'rgba(124, 92, 255, 0.2)',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '6px 14px',
                        color: '#7C5CFF',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      처리하기
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 최근 문의 */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '24px',
            padding: '32px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '24px' }}>
            💬 최근 문의
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recentInquiries.map((inquiry, i) => (
              <div
                key={i}
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: '16px',
                  padding: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px',
                  }}
                >
                  <span
                    style={{
                      background: 'rgba(124, 92, 255, 0.2)',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#7C5CFF',
                    }}
                  >
                    {inquiry.channel}
                  </span>
                  <span
                    style={{
                      fontSize: '11px',
                      color:
                        inquiry.status === 'new'
                          ? '#FF4757'
                          : inquiry.status === 'pending'
                          ? '#FFC107'
                          : '#00D4AA',
                      fontWeight: 600,
                    }}
                  >
                    {inquiry.status === 'new'
                      ? '🔴 새 문의'
                      : inquiry.status === 'pending'
                      ? '🟡 대기중'
                      : '🟢 완료'}
                  </span>
                </div>
                <div style={{ fontSize: '14px', marginBottom: '8px' }}>{inquiry.message}</div>
                <div style={{ fontSize: '12px', color: '#666' }}>{inquiry.time}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 오늘의 일정 캘린더 뷰 */}
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.03)',
          borderRadius: '24px',
          padding: '32px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '24px' }}>
          📆 오늘의 일정
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '8px' }}>
          {['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'].map(
            (time, i) => (
              <div
                key={i}
                style={{
                  textAlign: 'center',
                  padding: '16px',
                  background:
                    i === 5 ? 'rgba(124, 92, 255, 0.2)' : 'rgba(255, 255, 255, 0.02)',
                  borderRadius: '12px',
                  border:
                    i === 5 ? '1px solid #7C5CFF' : '1px solid rgba(255, 255, 255, 0.05)',
                }}
              >
                <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>{time}</div>
                {i === 5 && (
                  <div style={{ fontSize: '11px', color: '#7C5CFF', fontWeight: 600 }}>
                    상담예약
                  </div>
                )}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// 강사 대시보드 - 수업 관리, 출석, 학생 진도
// ═══════════════════════════════════════════════════════════════
const CoachDashboard: React.FC = () => {
  const myClasses: MyClass[] = [
    { time: '14:00-15:00', name: '유아반 A', students: 8, attended: 0, status: 'upcoming' },
    { time: '17:00-18:30', name: '초등 심화반', students: 10, attended: 0, status: 'upcoming' },
    { time: '18:30-20:00', name: '중등반', students: 15, attended: 0, status: 'upcoming' },
  ];

  const students: Student[] = [
    { name: '김서준', level: '초급', attendance: 95, progress: 78, note: '드리블 집중' },
    { name: '이지우', level: '중급', attendance: 88, progress: 85, note: '슈팅 폼 개선' },
    { name: '박예린', level: '초급', attendance: 100, progress: 65, note: '기초 강화' },
    { name: '최민준', level: '중급', attendance: 92, progress: 90, note: '수비 훈련' },
    { name: '정하윤', level: '상급', attendance: 96, progress: 95, note: '경기 감각' },
  ];

  return (
    <div style={{ padding: '40px', maxWidth: '1600px', margin: '0 auto' }}>
      <div style={{ marginBottom: '40px' }}>
        <div
          style={{
            display: 'inline-block',
            padding: '8px 16px',
            background: 'rgba(255, 71, 87, 0.2)',
            borderRadius: '8px',
            color: '#FF4757',
            fontSize: '13px',
            fontWeight: 600,
            marginBottom: '16px',
          }}
        >
          김민수 코치
        </div>
        <h1 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px' }}>오늘의 수업</h1>
        <p style={{ color: '#888', fontSize: '14px' }}>
          2025년 1월 29일 수요일 · 3개 수업 예정
        </p>
      </div>

      {/* 오늘 나의 통계 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '16px',
          marginBottom: '40px',
        }}
      >
        <MiniCard title="오늘 수업" value="3개" icon="🏀" />
        <MiniCard title="담당 학생" value="33명" icon="👥" />
        <MiniCard title="이번 달 수업" value="24회" icon="📚" />
        <MiniCard title="평균 만족도" value="4.9" icon="⭐" />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1.5fr',
          gap: '24px',
          marginBottom: '40px',
        }}
      >
        {/* 오늘의 수업 목록 */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '24px',
            padding: '32px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '24px' }}>
            🏀 오늘의 수업
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {myClasses.map((cls, i) => (
              <div
                key={i}
                style={{
                  background: 'linear-gradient(135deg, rgba(255, 71, 87, 0.1), rgba(255, 71, 87, 0.05))',
                  borderRadius: '20px',
                  padding: '24px',
                  border: '1px solid rgba(255, 71, 87, 0.3)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '16px',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '20px', fontWeight: 700, marginBottom: '4px' }}>
                      {cls.name}
                    </div>
                    <div
                      style={{
                        fontSize: '14px',
                        color: '#FF4757',
                        fontWeight: 600,
                        fontFamily: 'monospace',
                      }}
                    >
                      {cls.time}
                    </div>
                  </div>
                  <div
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      padding: '8px 16px',
                      borderRadius: '12px',
                      fontSize: '14px',
                      fontWeight: 600,
                    }}
                  >
                    {cls.students}명
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    style={{
                      flex: 1,
                      background: 'linear-gradient(135deg, #FF4757, #FF6B7A)',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '12px',
                      color: '#FFF',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontSize: '14px',
                    }}
                  >
                    출석 체크
                  </button>
                  <button
                    style={{
                      flex: 1,
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '12px',
                      padding: '12px',
                      color: '#FFF',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontSize: '14px',
                    }}
                  >
                    수업 노트
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 학생 진도 현황 */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '24px',
            padding: '32px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px',
            }}
          >
            <h2 style={{ fontSize: '18px', fontWeight: 700 }}>📊 학생 진도</h2>
            <input
              placeholder="학생 검색..."
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '10px',
                padding: '10px 16px',
                color: '#FFF',
                fontSize: '13px',
                width: '180px',
              }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {students.map((student, i) => (
              <div
                key={i}
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  borderRadius: '16px',
                  padding: '16px 20px',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      background: 'linear-gradient(135deg, #FF4757, #FF6B7A)',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '14px',
                    }}
                  >
                    {student.name[0]}
                  </div>
                  <div>
                    <div
                      style={{
                        fontWeight: 600,
                        marginBottom: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}
                    >
                      {student.name}
                      <span
                        style={{
                          fontSize: '10px',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          background:
                            student.level === '상급'
                              ? 'rgba(255, 107, 0, 0.2)'
                              : student.level === '중급'
                              ? 'rgba(124, 92, 255, 0.2)'
                              : 'rgba(0, 212, 170, 0.2)',
                          color:
                            student.level === '상급'
                              ? '#FF6B00'
                              : student.level === '중급'
                              ? '#7C5CFF'
                              : '#00D4AA',
                        }}
                      >
                        {student.level}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#888' }}>📝 {student.note}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '11px', color: '#888' }}>출석</span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#00D4AA' }}>
                      {student.attendance}%
                    </span>
                  </div>
                  <div
                    style={{
                      width: '100px',
                      height: '6px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '3px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${student.progress}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #FF4757, #FF6B7A)',
                        borderRadius: '3px',
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 수업 노트 & 피드백 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '24px',
            padding: '32px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '24px' }}>
            📝 최근 수업 노트
          </h2>
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.02)',
              borderRadius: '16px',
              padding: '20px',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontWeight: 600 }}>초등 심화반</span>
              <span style={{ fontSize: '12px', color: '#888' }}>어제</span>
            </div>
            <p style={{ fontSize: '14px', color: '#AAA', lineHeight: 1.6 }}>
              전체적으로 패스 연습 집중. 김서준 학생 드리블 자세 교정 필요. 다음 수업에서 2:2 미니 게임 진행 예정.
            </p>
          </div>
          <button
            style={{
              width: '100%',
              background: 'rgba(255, 71, 87, 0.1)',
              border: '1px solid rgba(255, 71, 87, 0.3)',
              borderRadius: '12px',
              padding: '14px',
              color: '#FF4757',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            + 새 노트 작성
          </button>
        </div>
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '24px',
            padding: '32px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '24px' }}>
            ⭐ 최근 피드백
          </h2>
          {[
            { parent: '김서준 학부모', rating: 5, comment: '아이가 농구를 정말 좋아하게 됐어요!' },
            { parent: '이지우 학부모', rating: 5, comment: '체계적인 수업 감사합니다.' },
          ].map((fb, i) => (
            <div
              key={i}
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                borderRadius: '16px',
                padding: '16px',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                marginBottom: '12px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px',
                }}
              >
                <span style={{ fontWeight: 600, fontSize: '14px' }}>{fb.parent}</span>
                <span style={{ color: '#FFD700' }}>{'★'.repeat(fb.rating)}</span>
              </div>
              <p style={{ fontSize: '13px', color: '#AAA' }}>{fb.comment}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// 공통 컴포넌트
// ═══════════════════════════════════════════════════════════════

interface MetricCardProps {
  title: string;
  value: string;
  change: string;
  positive: boolean;
  icon: string;
  color: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, change, positive, icon, color }) => (
  <div
    style={{
      background: `linear-gradient(135deg, ${color}10, ${color}05)`,
      borderRadius: '24px',
      padding: '28px',
      border: `1px solid ${color}30`,
      position: 'relative',
      overflow: 'hidden',
    }}
  >
    <div
      style={{
        position: 'absolute',
        right: '-20px',
        top: '-20px',
        fontSize: '80px',
        opacity: 0.1,
      }}
    >
      {icon}
    </div>
    <div style={{ fontSize: '14px', color: '#888', marginBottom: '8px' }}>{title}</div>
    <div style={{ fontSize: '32px', fontWeight: 800, marginBottom: '8px' }}>{value}</div>
    <div
      style={{
        fontSize: '13px',
        color: positive ? '#00D4AA' : '#FF4757',
        fontWeight: 600,
      }}
    >
      {positive ? '↑' : '↓'} {change}
    </div>
  </div>
);

interface MiniCardProps {
  title: string;
  value: string;
  icon: string;
  alert?: boolean;
}

const MiniCard: React.FC<MiniCardProps> = ({ title, value, icon, alert }) => (
  <div
    style={{
      background: alert ? 'rgba(255, 71, 87, 0.1)' : 'rgba(255, 255, 255, 0.03)',
      borderRadius: '16px',
      padding: '20px',
      border: alert ? '1px solid rgba(255, 71, 87, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
      textAlign: 'center',
    }}
  >
    <div style={{ fontSize: '24px', marginBottom: '8px' }}>{icon}</div>
    <div
      style={{
        fontSize: '24px',
        fontWeight: 700,
        marginBottom: '4px',
        color: alert ? '#FF4757' : '#FFF',
      }}
    >
      {value}
    </div>
    <div style={{ fontSize: '12px', color: '#888' }}>{title}</div>
  </div>
);

interface StatBlockProps {
  label: string;
  value: string;
  positive?: boolean;
  warning?: boolean;
}

const StatBlock: React.FC<StatBlockProps> = ({ label, value, positive, warning }) => (
  <div
    style={{
      background: 'rgba(255, 255, 255, 0.02)',
      borderRadius: '12px',
      padding: '16px',
      border: '1px solid rgba(255, 255, 255, 0.05)',
    }}
  >
    <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>{label}</div>
    <div
      style={{
        fontSize: '20px',
        fontWeight: 700,
        color: positive ? '#00D4AA' : warning ? '#FFC107' : '#FFF',
      }}
    >
      {value}
    </div>
  </div>
);

interface AlertPanelProps {
  title: string;
  alerts: Alert[];
}

const AlertPanel: React.FC<AlertPanelProps> = ({ title, alerts }) => (
  <div
    style={{
      background: 'rgba(255, 255, 255, 0.03)',
      borderRadius: '24px',
      padding: '32px',
      border: '1px solid rgba(255, 255, 255, 0.08)',
    }}
  >
    <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '24px' }}>{title}</h2>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {alerts.map((alert, i) => (
        <div
          key={i}
          style={{
            background: 'rgba(255, 255, 255, 0.02)',
            borderRadius: '12px',
            padding: '16px',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderLeft: `4px solid ${
              alert.type === 'success' ? '#00D4AA' : alert.type === 'warning' ? '#FFC107' : '#7C5CFF'
            }`,
          }}
        >
          <div style={{ fontSize: '14px', marginBottom: '4px' }}>{alert.message}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>{alert.time}</div>
        </div>
      ))}
    </div>
  </div>
);

interface QuickActionsProps {
  title: string;
  actions: Action[];
}

const QuickActions: React.FC<QuickActionsProps> = ({ title, actions }) => (
  <div
    style={{
      background: 'rgba(255, 255, 255, 0.03)',
      borderRadius: '24px',
      padding: '32px',
      border: '1px solid rgba(255, 255, 255, 0.08)',
    }}
  >
    <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '24px' }}>{title}</h2>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
      {actions.map((action, i) => (
        <button
          key={i}
          style={{
            background: 'rgba(255, 107, 0, 0.1)',
            border: '1px solid rgba(255, 107, 0, 0.3)',
            borderRadius: '12px',
            padding: '16px',
            color: '#FFF',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '13px',
            fontWeight: 600,
            transition: 'all 0.3s ease',
          }}
        >
          <span style={{ fontSize: '20px' }}>{action.icon}</span>
          {action.label}
        </button>
      ))}
    </div>
  </div>
);

export default AllThatBasketDashboard;
