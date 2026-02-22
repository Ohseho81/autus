/**
 * AdminDashboard - Dashboard for administrators
 * Shows pending tasks, inquiries, schedule management
 */

import React from 'react';
import { styles, getPriorityColor, getStatusColor } from './styles';
import type { PendingTask, Inquiry } from './types';

export const AdminDashboard: React.FC = () => {
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
    <div style={styles.contentWrapper}>
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

      {/* Quick Action Buttons */}
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

      {/* Pending Tasks & Recent Inquiries */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '24px', marginBottom: '40px' }}>
        {/* Pending Tasks */}
        <div style={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
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
                  borderLeft: `4px solid ${getPriorityColor(task.priority)}`,
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

        {/* Recent Inquiries */}
        <div style={styles.card}>
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
                      color: getStatusColor(inquiry.status),
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

      {/* Today's Schedule Calendar View */}
      <div style={styles.card}>
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
