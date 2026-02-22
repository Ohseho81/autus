/**
 * OwnerDashboard - Dashboard for business owners
 * Shows overall business metrics, multi-branch management, and financial overview
 */

import React from 'react';
import { MetricCard, AlertPanel, QuickActions } from './SharedComponents';
import { styles, getBarChartStyle } from './styles';
import type { Branch, Alert, Action } from './types';

export const OwnerDashboard: React.FC = () => {
  const branches: Branch[] = [
    { name: '강남본점', revenue: 4850, students: 156, growth: 12.5, status: 'excellent' },
    { name: '송파점', revenue: 3200, students: 98, growth: 8.2, status: 'good' },
    { name: '분당점', revenue: 2800, students: 87, growth: -2.1, status: 'warning' },
    { name: '일산점', revenue: 2100, students: 65, growth: 15.3, status: 'excellent' },
  ];

  const alerts: Alert[] = [
    { type: 'success', message: '일산점 이번 달 목표 150% 달성!', time: '2시간 전' },
    { type: 'warning', message: '분당점 강사 충원 필요 (수업 포화)', time: '5시간 전' },
    { type: 'info', message: '판교점 오픈 D-30', time: '1일 전' },
  ];

  const actions: Action[] = [
    { icon: '📊', label: '전체 리포트 다운로드' },
    { icon: '💳', label: '정산 현황 확인' },
    { icon: '📈', label: 'V-Index 분석' },
    { icon: '🎯', label: '목표 설정' },
  ];

  return (
    <div style={styles.contentWrapper}>
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

      {/* Key Metrics */}
      <div style={{ ...styles.gridFourColumns, marginBottom: '40px' }}>
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

      {/* Branch Performance & Revenue Chart */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '40px' }}>
        {/* Branch Performance */}
        <div style={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
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

        {/* Revenue Chart */}
        <div style={styles.card}>
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
                  <div style={getBarChartStyle(val, i === 11)} />
                  <span style={{ fontSize: '10px', color: '#666' }}>{i + 1}월</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Alerts & Quick Actions */}
      <div style={styles.gridTwoColumns}>
        <AlertPanel title="주요 알림" alerts={alerts} />
        <QuickActions title="빠른 실행" actions={actions} />
      </div>
    </div>
  );
};
