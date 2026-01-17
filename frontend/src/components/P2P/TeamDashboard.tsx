/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * 👥 TeamDashboard — 팀 대시보드
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * 1-12-144 네트워크의 팀 전체 V 현황:
 * - 핵심 12인 V 합계
 * - 팀 Synergy 평균
 * - 활성 멤버 상태
 * - 위임 통계
 */
import React, { useMemo } from 'react';

interface TeamMember {
  id: string;
  name: string;
  V: number;
  synergy: number;
  todayDecisions: number;
  lastActive: string;
  isOnline: boolean;
  tier: 'core' | 'extended' | 'observer';
}

interface TeamDashboardProps {
  members: TeamMember[];
  myV: number;
  teamGoal?: number;
  onMemberClick?: (member: TeamMember) => void;
}

export const TeamDashboard: React.FC<TeamDashboardProps> = ({
  members,
  myV,
  teamGoal,
  onMemberClick,
}) => {
  // 통계 계산
  const stats = useMemo(() => {
    const coreMembers = members.filter(m => m.tier === 'core');
    const totalV = members.reduce((sum, m) => sum + m.V, 0) + myV;
    const avgSynergy = members.length > 0
      ? members.reduce((sum, m) => sum + m.synergy, 0) / members.length
      : 0;
    const activeCount = members.filter(m => m.isOnline).length;
    const todayTotal = members.reduce((sum, m) => sum + m.todayDecisions, 0);

    return {
      totalV,
      avgSynergy,
      activeCount,
      todayTotal,
      coreCount: coreMembers.length,
      memberCount: members.length,
    };
  }, [members, myV]);

  // 티어별 색상
  const tierColors: Record<string, string> = {
    core: '#10b981',
    extended: '#06b6d4',
    observer: '#6b7280',
  };

  // 상위 멤버 (V 순)
  const topMembers = useMemo(() => {
    return [...members]
      .sort((a, b) => b.V - a.V)
      .slice(0, 5);
  }, [members]);

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.title}>👥 Team Dashboard</h2>
        <div style={styles.networkBadge}>
          1-{stats.coreCount}-{stats.memberCount}
        </div>
      </div>

      {/* Summary Cards */}
      <div style={styles.summaryGrid}>
        <div style={styles.summaryCard}>
          <div style={styles.summaryValue}>{stats.totalV}</div>
          <div style={styles.summaryLabel}>Total V</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryValue}>{(stats.avgSynergy * 100).toFixed(1)}%</div>
          <div style={styles.summaryLabel}>Avg Synergy</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryValue}>
            <span style={{ color: '#10b981' }}>{stats.activeCount}</span>
            /{stats.memberCount}
          </div>
          <div style={styles.summaryLabel}>Online</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.summaryValue}>{stats.todayTotal}</div>
          <div style={styles.summaryLabel}>Today</div>
        </div>
      </div>

      {/* Goal Progress */}
      {teamGoal && (
        <div style={styles.goalSection}>
          <div style={styles.goalHeader}>
            <span>팀 목표</span>
            <span>{stats.totalV} / {teamGoal} V</span>
          </div>
          <div style={styles.goalBar}>
            <div 
              style={{
                ...styles.goalFill,
                width: `${Math.min(100, (stats.totalV / teamGoal) * 100)}%`,
              }}
            />
          </div>
          <div style={styles.goalPercent}>
            {((stats.totalV / teamGoal) * 100).toFixed(1)}% 달성
          </div>
        </div>
      )}

      {/* Leaderboard */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>🏆 Top Contributors</div>
        <div style={styles.leaderboard}>
          {topMembers.map((member, idx) => (
            <button
              key={member.id}
              style={styles.leaderItem}
              onClick={() => onMemberClick?.(member)}
            >
              <div style={styles.leaderRank}>{idx + 1}</div>
              <div 
                style={{
                  ...styles.leaderAvatar,
                  borderColor: tierColors[member.tier],
                }}
              >
                {member.isOnline && <div style={styles.onlineDot} />}
                👤
              </div>
              <div style={styles.leaderInfo}>
                <div style={styles.leaderName}>{member.name}</div>
                <div style={styles.leaderMeta}>
                  s: {(member.synergy * 100).toFixed(0)}% · 오늘 {member.todayDecisions}건
                </div>
              </div>
              <div style={styles.leaderV}>{member.V}V</div>
            </button>
          ))}
        </div>
      </div>

      {/* Member Grid */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>👥 All Members</div>
        <div style={styles.memberGrid}>
          {members.map(member => (
            <button
              key={member.id}
              style={{
                ...styles.memberCard,
                borderColor: member.isOnline ? tierColors[member.tier] : 'transparent',
                opacity: member.isOnline ? 1 : 0.6,
              }}
              onClick={() => onMemberClick?.(member)}
            >
              <div style={styles.memberAvatar}>
                {member.isOnline && <div style={styles.onlineDot} />}
                👤
              </div>
              <div style={styles.memberName}>{member.name}</div>
              <div style={styles.memberV}>{member.V}V</div>
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div style={styles.legend}>
        <div style={styles.legendItem}>
          <div style={{ ...styles.legendDot, background: '#10b981' }} />
          <span>Core (12)</span>
        </div>
        <div style={styles.legendItem}>
          <div style={{ ...styles.legendDot, background: '#06b6d4' }} />
          <span>Extended</span>
        </div>
        <div style={styles.legendItem}>
          <div style={{ ...styles.legendDot, background: '#6b7280' }} />
          <span>Observer</span>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: '#0a0f1a',
    borderRadius: '20px',
    padding: '20px',
    maxWidth: '500px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  title: {
    fontSize: '18px',
    fontWeight: 600,
    margin: 0,
  },
  networkBadge: {
    fontSize: '12px',
    padding: '6px 12px',
    background: 'rgba(16, 185, 129, 0.1)',
    color: '#10b981',
    borderRadius: '16px',
    fontWeight: 600,
    fontFamily: 'monospace',
  },
  summaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '12px',
    marginBottom: '20px',
  },
  summaryCard: {
    background: '#111827',
    borderRadius: '12px',
    padding: '16px 12px',
    textAlign: 'center',
  },
  summaryValue: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#f3f4f6',
    marginBottom: '4px',
  },
  summaryLabel: {
    fontSize: '10px',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  goalSection: {
    background: '#111827',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '20px',
  },
  goalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '13px',
    color: '#9ca3af',
    marginBottom: '12px',
  },
  goalBar: {
    height: '8px',
    background: '#1f2937',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '8px',
  },
  goalFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #10b981, #06b6d4)',
    borderRadius: '4px',
    transition: 'width 0.5s',
  },
  goalPercent: {
    fontSize: '12px',
    color: '#10b981',
    textAlign: 'right',
  },
  section: {
    marginBottom: '20px',
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#9ca3af',
    marginBottom: '12px',
  },
  leaderboard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  leaderItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    background: '#111827',
    borderRadius: '12px',
    border: 'none',
    cursor: 'pointer',
    width: '100%',
    textAlign: 'left',
  },
  leaderRank: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    background: '#1f2937',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 700,
    color: '#9ca3af',
  },
  leaderAvatar: {
    position: 'relative',
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: '#1f2937',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '2px solid',
    fontSize: '18px',
  },
  leaderInfo: {
    flex: 1,
  },
  leaderName: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#f3f4f6',
  },
  leaderMeta: {
    fontSize: '11px',
    color: '#6b7280',
    marginTop: '2px',
  },
  leaderV: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#10b981',
  },
  memberGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '8px',
  },
  memberCard: {
    background: '#111827',
    borderRadius: '12px',
    padding: '12px',
    textAlign: 'center',
    border: '2px solid transparent',
    cursor: 'pointer',
  },
  memberAvatar: {
    position: 'relative',
    fontSize: '24px',
    marginBottom: '4px',
    display: 'inline-block',
  },
  onlineDot: {
    position: 'absolute',
    top: '-2px',
    right: '-2px',
    width: '8px',
    height: '8px',
    background: '#10b981',
    borderRadius: '50%',
    border: '2px solid #0a0f1a',
  },
  memberName: {
    fontSize: '11px',
    color: '#9ca3af',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  memberV: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#10b981',
    marginTop: '4px',
  },
  legend: {
    display: 'flex',
    justifyContent: 'center',
    gap: '20px',
    paddingTop: '16px',
    borderTop: '1px solid rgba(255,255,255,0.05)',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '11px',
    color: '#6b7280',
  },
  legendDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
};

export default TeamDashboard;
