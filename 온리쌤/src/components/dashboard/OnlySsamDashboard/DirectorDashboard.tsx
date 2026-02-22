/**
 * DirectorDashboard - Dashboard for branch directors
 * Shows daily operations, class schedule, coach management, student & financial status
 */

import React from 'react';
import { MiniCard, StatBlock } from './SharedComponents';
import { styles } from './styles';
import type { TodayClass, Coach } from './types';

export const DirectorDashboard: React.FC = () => {
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
    <div style={styles.contentWrapper}>
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

      {/* Today's Summary */}
      <div style={{ ...styles.gridFiveColumns, marginBottom: '40px' }}>
        <MiniCard title="오늘 수업" value="5개" icon="📚" />
        <MiniCard title="출석 예정" value="53명" icon="✅" />
        <MiniCard title="강사 출근" value="3/3" icon="👨‍🏫" />
        <MiniCard title="시설 예약" value="92%" icon="🏟️" />
        <MiniCard title="미수금" value="₩45만" icon="💸" alert />
      </div>

      {/* Today's Classes & Coach Status */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '24px', marginBottom: '40px' }}>
        {/* Today's Class Schedule */}
        <div style={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
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

        {/* Coach Status */}
        <div style={styles.card}>
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

      {/* Student Management & Financial Status */}
      <div style={styles.gridTwoColumns}>
        <div style={styles.card}>
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
        <div style={styles.card}>
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
