/**
 * CoachDashboard - Dashboard for coaches
 * Shows class schedule, attendance, student progress tracking
 */

import React from 'react';
import { MiniCard } from './SharedComponents';
import { styles, getLevelColor } from './styles';
import type { MyClass, Student } from './types';

export const CoachDashboard: React.FC = () => {
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
    <div style={styles.contentWrapper}>
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

      {/* Today's Statistics */}
      <div style={{ ...styles.gridFourColumns, marginBottom: '40px' }}>
        <MiniCard title="오늘 수업" value="3개" icon="🏀" />
        <MiniCard title="담당 학생" value="33명" icon="👥" />
        <MiniCard title="이번 달 수업" value="24회" icon="📚" />
        <MiniCard title="평균 만족도" value="4.9" icon="⭐" />
      </div>

      {/* Today's Classes & Student Progress */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '24px', marginBottom: '40px' }}>
        {/* Today's Classes */}
        <div style={styles.card}>
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

        {/* Student Progress */}
        <div style={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
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
            {students.map((student, i) => {
              const levelColors = getLevelColor(student.level);
              return (
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
                            background: levelColors.bg,
                            color: levelColors.text,
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
              );
            })}
          </div>
        </div>
      </div>

      {/* Class Notes & Feedback */}
      <div style={styles.gridTwoColumns}>
        <div style={styles.card}>
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
        <div style={styles.card}>
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
